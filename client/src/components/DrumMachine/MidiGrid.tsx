import React, { useState, useEffect, useRef } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sample, Pad, Track, Step, Pattern } from '@/lib/types';
import * as Tone from 'tone';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { MidiEvent, onMidiEvent } from '@/lib/audio'; // Import MIDI types and functions
import { toast } from 'sonner'; // Import toast for notifications

const MIDI_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

// Calculate MIDI note name (e.g. C4, G#5) from MIDI note number
const getMidiNoteName = (noteNumber: number): string => {
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteIndex = noteNumber % 12;
  return `${MIDI_NOTES[noteIndex]}${octave}`;
};

interface MidiGridProps {
  onClose?: () => void;
}

// Interface for note events with timing information
interface NoteEvent {
  id: string;
  padId: number;
  noteNumber: number;
  time: number; // Time in ticks or ms
  duration: number;
  velocity: number;
  offset: number; // Timing offset for micro-timing adjustments
  // 16 levels information
  levelsMode?: 'off' | 'pitch' | 'volume';
  levelsSamplePadId?: number | null;
  levelsPitch?: number; // Pitch adjustment for 16 levels
  levelsVolume?: number; // Volume adjustment for 16 levels
}

const MidiGrid: React.FC<MidiGridProps> = ({ onClose }) => {
  const { 
    pads, 
    assignSampleToPad, 
    samples, 
    processorSettings, 
    updateProcessorSettings,
    levelsMode,
    levelsSamplePadId,
    patterns,
    currentPatternId,
    updatePattern,
    transport
  } = useDrumMachineStore();
  
  // Grid settings
  const [startNote, setStartNote] = useState<number>(36); // MIDI note C2
  const [rows, setRows] = useState<number>(8);
  const [cols, setColumns] = useState<number>(8);
  const [velocityMode, setVelocityMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'midiGrid' | 'timeEditor'>('midiGrid');
  
  // Time editor settings
  const [timeZoom, setTimeZoom] = useState<number>(1); // Zoom level for time editor
  const [selectedNote, setSelectedNote] = useState<NoteEvent | null>(null);
  const [noteEvents, setNoteEvents] = useState<NoteEvent[]>([]);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const timeEditorRef = useRef<HTMLDivElement>(null);
  
  // Number of bars to display
  const [bars, setBars] = useState<number>(2);
  const [subDivisions, setSubDivisions] = useState<number>(4); // 16th notes per beat
  
  // Calculate total grid width based on bars and subdivisions
  const totalSteps = bars * 4 * subDivisions; // 4 beats per bar
  
  // Calculate the MIDI note grid
  const generateMidiGrid = () => {
    const grid: number[][] = [];
    
    for (let row = 0; row < rows; row++) {
      const rowNotes: number[] = [];
      for (let col = 0; col < cols; col++) {
        // Calculate note in reverse order (higher notes at the top)
        const noteNumber = startNote + (rows - 1 - row) * cols + col;
        rowNotes.push(noteNumber);
      }
      grid.push(rowNotes);
    }
    
    return grid;
  };
  
  const midiGrid = generateMidiGrid();
  
  // Find which pad corresponds to which MIDI note (if any)
  const getPadForMidiNote = (noteNumber: number): Pad | undefined => {
    // For basic MIDI setup, map directly from note number to pad ID
    // This assumes MIDI notes start at C2 (36) = Pad 0
    const padId = noteNumber - 36;  // C2 (36) is our first pad (pad 0)
    
    console.log(`Mapping MIDI note ${noteNumber} to pad ID ${padId}`);
    
    if (padId >= 0 && padId < pads.length) {
      return pads.find(p => p.id === padId);
    }
    return undefined;
  };
  
  // Find which sample is assigned to a pad
  const getSampleForPad = (pad: Pad | undefined): Sample | undefined => {
    if (!pad || !pad.sampleId) return undefined;
    return samples.find(s => s.id === pad.sampleId);
  };
  
  // Handle clicking on a MIDI grid cell
  const handleMidiNoteClick = (noteNumber: number) => {
    // Always check global values first
    const globalMode = typeof window !== 'undefined' ? window.sixteenLevelsMode : 'off';
    const globalSourcePad = typeof window !== 'undefined' ? window.sixteenLevelsSourcePad : null;

    // Use global values if set, otherwise fallback to component state
    const effectiveMode = (globalMode !== 'off') ? globalMode : levelsMode;
    const effectiveSourcePad = (globalSourcePad !== null) ? globalSourcePad : levelsSamplePadId;
    
    console.log('Handle MIDI note click with levels info:', { 
      effectiveMode, 
      effectiveSourcePad, 
      globalMode, 
      globalSourcePad,
      componentMode: levelsMode, 
      componentSourcePad: levelsSamplePadId 
    });
    
    // If in 16 levels mode (from any source) and we have a source sample pad
    if (effectiveSourcePad !== null && effectiveMode !== 'off') {
      // Find the source pad and its sample
      const sourcePad = pads.find(p => p.id === effectiveSourcePad);
      if (!sourcePad || !sourcePad.sampleId) {
        console.error(`Source pad ${effectiveSourcePad} not found or has no sample assigned`);
        return;
      }
      
      // Find the pad for this MIDI note
      const targetPad = getPadForMidiNote(noteNumber);
      if (!targetPad) {
        console.error(`No target pad found for MIDI note ${noteNumber}`);
        return;
      }
      
      // Get the base settings for the source pad
      const baseSettings = processorSettings.find(s => s.padId === effectiveSourcePad) || {
        padId: effectiveSourcePad,
        volume: 0, 
        pitch: 0, 
        decay: 0.5
      };
      
      // Calculate modification value based on note difference
      const noteDiff = noteNumber - (startNote + effectiveSourcePad);
      
      // Apply modifications based on 16 levels mode
      const newSettings = {
        padId: targetPad.id,
        volume: effectiveMode === 'volume' ? baseSettings.volume + (noteDiff * 2) : baseSettings.volume,
        pitch: effectiveMode === 'pitch' ? baseSettings.pitch + noteDiff : baseSettings.pitch,
        decay: baseSettings.decay
      };
      
      // Assign the source sample to this pad
      assignSampleToPad(targetPad.id, sourcePad.sampleId);
      // Update the processor settings
      updateProcessorSettings(newSettings);
      
      // Create and add a note event with 16 levels information
      const newNoteEvent: NoteEvent = {
        id: `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        padId: targetPad.id,
        noteNumber: noteNumber,
        time: 0, // Direct clicks don't have a time position yet
        duration: Tone.Ticks("16n").toTicks(),
        velocity: 100,
        offset: 0,
        // Important: Add 16 levels information
        levelsMode: effectiveMode,
        levelsSamplePadId: effectiveSourcePad,
        levelsPitch: newSettings.pitch,
        levelsVolume: newSettings.volume
      };
      
      // Add to note events if not already in time grid
      setNoteEvents(prev => {
        if (!prev.some(e => e.padId === targetPad.id && e.noteNumber === noteNumber)) {
          return [...prev, newNoteEvent];
        }
        return prev;
      });
      
      console.log(`Applied 16 Levels MIDI mapping (using ${globalMode !== 'off' ? 'global' : 'component'} mode): Note ${getMidiNoteName(noteNumber)} -> Pad ${targetPad.id} with modifications:`, newSettings);
    } else {
      // Regular mode - just show the pad mapping
      const pad = getPadForMidiNote(noteNumber);
      const sample = getSampleForPad(pad);
      console.log(`MIDI Note ${getMidiNoteName(noteNumber)} (${noteNumber}) -> ${pad ? `Pad ${pad.id}` : 'No pad'} -> ${sample ? sample.name : 'No sample'}`);
    }
  };
  
  // Initialize note events from pattern data and MIDI events
  useEffect(() => {
    const currentPattern = patterns.find(p => p.id === currentPatternId);
    if (!currentPattern) return;

    // Convert tracks and steps to note events
    const events: NoteEvent[] = [];
    currentPattern.tracks.forEach(track => {
      const pad = pads.find(p => p.id === track.padId);
      if (!pad || !pad.sampleId) return;
      
      // Calculate MIDI note from pad
      const noteNumber = startNote + pad.id;
      
      // Add events for each active step
      track.steps.forEach((step, stepIndex) => {
        if (step.active) {
          events.push({
            id: `${track.id}-${stepIndex}`,
            padId: track.padId,
            noteNumber,
            time: stepIndex * (Tone.Ticks("16n").toTicks() / subDivisions),
            duration: Tone.Ticks("16n").toTicks(),
            velocity: 100,
            offset: 0 // Default offset is 0 (no timing adjustment)
          });
        }
      });
    });
    
    setNoteEvents(events);
  }, [patterns, currentPatternId, pads, startNote, subDivisions]);
  
  // Subscribe to MIDI events from the audio engine
  useEffect(() => {
    // Get global 16 levels settings if available
    const globalLevelsMode = typeof window !== 'undefined' ? window.sixteenLevelsMode : 'off';
    const globalSourcePad = typeof window !== 'undefined' ? window.sixteenLevelsSourcePad : null;
    
    console.log('Setting up MIDI event listener in MidiGrid component', {
      componentLevelsMode: levelsMode,
      globalLevelsMode,
      globalSourcePad
    });
    
    // When a MIDI event is received, add it to our note events
    const unsubscribe = onMidiEvent((midiEvent) => {
      // Only process note-on events
      if (midiEvent.type !== 'noteOn' || midiEvent.note === undefined) return;
      
      console.log('Received MIDI event in MidiGrid:', midiEvent);
      
      // Convert MIDI event to note event
      const noteNumber = midiEvent.note;
      const padId = noteNumber - 36; // Map from MIDI note to pad ID (assuming C2/36 is pad 0)
      
      console.log(`MIDI note ${noteNumber} maps to pad ${padId}`);
      
      // Make sure the pad ID is valid
      if (padId < 0 || padId >= pads.length) {
        console.log(`Invalid pad ID ${padId} from MIDI note ${noteNumber}`);
        return;
      }
      
      // Use the unique ID already assigned to the MIDI event or create one
      const eventId = midiEvent.id || `midi-${Date.now()}-noteOn-${Math.floor(Math.random() * 10000)}`;
      
      // Check for global 16 levels mode first, then event's own info, then component state
      const effectiveLevelsMode = 
        (typeof window !== 'undefined' && window.sixteenLevelsMode !== 'off' && window.sixteenLevelsMode) ? window.sixteenLevelsMode :
        (midiEvent.levelsMode && midiEvent.levelsMode !== 'off') ? midiEvent.levelsMode :
        levelsMode;
      
      // Similarly for source pad
      const effectiveSourcePad =
        (typeof window !== 'undefined' && window.sixteenLevelsSourcePad !== null) ? window.sixteenLevelsSourcePad :
        (midiEvent.levelsSamplePadId !== undefined && midiEvent.levelsSamplePadId !== null) ? midiEvent.levelsSamplePadId :
        levelsSamplePadId;
      
      // Get processor settings if available
      const padSettings = processorSettings.find(s => s.padId === padId) || {
        volume: 0,
        pitch: 0,
        decay: 0.5
      };
      
      // Create a note event with 16 levels information
      const newEvent: NoteEvent = {
        id: eventId,
        padId: padId,
        noteNumber: noteNumber,
        time: midiEvent.ticks || 0,
        duration: Tone.Ticks("16n").toTicks(), // Default to 16th note duration
        velocity: midiEvent.velocity || 100,
        offset: 0, // Start with no offset
        // Store the 16 levels information, prioritizing global values
        levelsMode: effectiveLevelsMode,
        levelsSamplePadId: effectiveSourcePad,
        levelsPitch: midiEvent.levelsPitch || padSettings.pitch,
        levelsVolume: midiEvent.levelsVolume || padSettings.volume
      };
      
      console.log('Created note event with levels info:', 
        newEvent.levelsMode, 
        'sourcePad:', newEvent.levelsSamplePadId, 
        'pitch:', newEvent.levelsPitch, 
        'volume:', newEvent.levelsVolume
      );
      
      // Add to note events state
      setNoteEvents(prev => {
        const newEvents = [...prev, newEvent];
        console.log(`Note events count: ${newEvents.length}`);
        return newEvents;
      });
    });
    
    // Force start MIDI recording when component mounts, regardless of 16 levels mode
    // This ensures all pad triggers are captured for the MIDI grid
    console.log('Auto-starting MIDI recording for MIDI grid');
    window.audioEngine.startMidiRecording();
    
    // If in 16 levels mode, set up additional handling
    if (levelsMode !== 'off') {
      console.log('16 levels mode is active:', levelsMode);
    }
    
    // Cleanup function
    return () => {
      unsubscribe();
      // Always stop MIDI recording when unmounting to clean up
      window.audioEngine.stopMidiRecording();
      console.log('Cleaned up MIDI event listener and stopped recording');
    };
  }, [levelsMode, pads.length]);
  
  
  // When a note's timing is adjusted, update the offset
  const adjustNoteOffset = (noteId: string, newOffset: number) => {
    setNoteEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => {
        if (event.id === noteId) {
          return { ...event, offset: newOffset };
        }
        return event;
      });
      return updatedEvents;
    });
    
    // Todo: Update the pattern data with new timing information
    console.log(`Adjusted note ${noteId} with offset: ${newOffset}ms`);
  };
  
  // Function to convert recorded MIDI events to pattern steps
  const convertMidiEventsToPattern = () => {
    // Always allow conversion if we have MIDI events, regardless of 16 levels mode
    if (noteEvents.length === 0) {
      console.log('No MIDI events to convert');
      toast('No MIDI events to convert - trigger some pads first');
      return;
    }
    
    // Access global 16 levels mode and source pad from window
    const globalLevelsMode = typeof window !== 'undefined' ? window.sixteenLevelsMode : 'off';
    const globalSourcePad = typeof window !== 'undefined' ? window.sixteenLevelsSourcePad : null;
    
    // If global 16 levels mode is active but no events have 16 levels info, add it
    if (globalLevelsMode !== 'off' && globalSourcePad !== null) {
      console.log(`Using global 16 levels mode: ${globalLevelsMode}, source pad: ${globalSourcePad}`);
      
      // Add missing 16 levels information to events that don't have it
      noteEvents.forEach(event => {
        if (!event.levelsMode || event.levelsMode === 'off') {
          event.levelsMode = globalLevelsMode;
          event.levelsSamplePadId = globalSourcePad;
          
          // Get the pad and its processor settings for this event
          const pad = pads.find(p => p.id === event.padId);
          const sourcePad = pads.find(p => p.id === globalSourcePad);
          const settings = processorSettings.find(s => s.padId === event.padId);
          
          if (settings) {
            event.levelsPitch = settings.pitch;
            event.levelsVolume = settings.volume;
            console.log(`Added 16 levels info to event ${event.id}: Mode=${globalLevelsMode}, SourcePad=${globalSourcePad}`);
          }
        }
      });
    }
    
    // Log all event properties to ensure 16 levels data is present
    const noteEventsWithLevelsInfo = noteEvents.filter(event => 
      event.levelsMode && event.levelsMode !== 'off' && event.levelsSamplePadId !== undefined
    );
    
    console.log(`Found ${noteEventsWithLevelsInfo.length} events with 16 levels information:`);
    noteEventsWithLevelsInfo.forEach(event => {
      console.log(`Event ID: ${event.id}, Mode: ${event.levelsMode}, ` +
                  `Source Pad: ${event.levelsSamplePadId}, ` + 
                  `Pitch: ${event.levelsPitch}, Volume: ${event.levelsVolume}`);
    });
    
    // Filter to only include noteOn events that came from MIDI recording
    const midiNoteEvents = noteEvents.filter(event => 
      event.id.startsWith('midi-') && event.id.includes('noteOn')
    );
    
    console.log(`Converting ${midiNoteEvents.length} MIDI note-on events to pattern steps`);
    
    // Get the current pattern
    const currentPattern = patterns.find(p => p.id === currentPatternId);
    if (!currentPattern) {
      console.error('No current pattern found');
      return;
    }
    
    // Create a copy of the current pattern
    const updatedPattern = { ...currentPattern };
    
    // For each MIDI event, add or update the corresponding track and step
    const updatedTracks = [...updatedPattern.tracks];
    
    // Sort events by time to ensure consistent processing
    midiNoteEvents.sort((a, b) => a.time - b.time);
    
    // Process each note event to find positions in the grid
    midiNoteEvents.forEach(event => {
      // Calculate which step this event falls on based on time
      const sixteenthNoteTicks = Tone.Ticks("16n").toTicks();
      const stepsPerBeat = 4; // 4 16th notes per beat
      const totalTicks = sixteenthNoteTicks * stepsPerBeat * 4; // 16 steps total in a bar
      
      // Normalize time to fit within pattern
      const normalizedTime = (event.time % totalTicks);
      
      // Apply any manual offset adjustments
      const adjustedTime = normalizedTime + (event.offset || 0);
      
      // Calculate step index (0-15)
      const ticksPerStep = sixteenthNoteTicks;
      const step = Math.floor(adjustedTime / ticksPerStep) % 16;
      
      console.log(`Event at time ${event.time} ticks maps to step ${step} (pad ${event.padId})`);
      
      // If this is a 16 levels note, log the details
      if (event.levelsMode && event.levelsMode !== 'off') {
        console.log(`16 Levels: ${event.levelsMode} mode, source pad: ${event.levelsSamplePadId},` + 
                    ` pitch: ${event.levelsPitch}, volume: ${event.levelsVolume}`);
      }
      
      // Ensure step is within valid range (0-15)
      if (step < 0 || step >= 16) {
        console.log(`Skipping event at step ${step} (out of range)`);
        return;
      }
      
      // Always check for global values first (guaranteed most up-to-date)  
      const globalMode = typeof window !== 'undefined' ? window.sixteenLevelsMode : 'off';
      const globalSourcePad = typeof window !== 'undefined' ? window.sixteenLevelsSourcePad : null;
      
      // Use either global values, event values, or component state in that order of priority
      const effectiveMode = 
        (globalMode !== 'off') ? globalMode :
        (event.levelsMode && event.levelsMode !== 'off') ? event.levelsMode :
        levelsMode;
        
      const effectiveSourcePad = 
        (globalSourcePad !== null) ? globalSourcePad :
        (event.levelsSamplePadId !== null && event.levelsSamplePadId !== undefined) ? event.levelsSamplePadId :
        levelsSamplePadId;
      
      // If in 16 levels mode from any source, apply the settings
      if (effectiveMode !== 'off' && effectiveSourcePad !== null) {
        console.log(`Processing 16 levels: Mode=${effectiveMode}, SourcePad=${effectiveSourcePad}`);
        
        // Get the source pad that we're basing 16 levels on
        const sourcePad = pads.find(p => p.id === effectiveSourcePad);
        if (sourcePad && sourcePad.sampleId) {
          // This is a 16 levels triggered pad, assign the source sample and settings
          
          // 1. Always assign the source sample to this pad
          assignSampleToPad(event.padId, sourcePad.sampleId);
          console.log(`16 Levels: Assigned sample ${sourcePad.sampleId} from pad ${effectiveSourcePad} to pad ${event.padId}`);
          
          // Get base settings from the event or calculate them
          let pitchValue, volumeValue;
          
          if (event.levelsPitch !== undefined) {
            // Use saved pitch value from event
            pitchValue = event.levelsPitch;
          } else {
            // Calculate pitch based on relative position
            const noteDiff = (event.noteNumber || 36) - (startNote + effectiveSourcePad);
            pitchValue = effectiveMode === 'pitch' ? noteDiff : 0;
          }
          
          if (event.levelsVolume !== undefined) {
            // Use saved volume value from event
            volumeValue = event.levelsVolume;
          } else {
            // Calculate volume based on relative position
            const noteDiff = (event.noteNumber || 36) - (startNote + effectiveSourcePad);
            volumeValue = effectiveMode === 'volume' ? noteDiff * 2 : 0;
          }
          
          // 2. Apply appropriate processor settings based on 16 levels mode
          const newSettings = {
            padId: event.padId,
            volume: effectiveMode === 'volume' ? volumeValue : 0,
            pitch: effectiveMode === 'pitch' ? pitchValue : 0,
            decay: 0.5 // Default decay
          };
          
          updateProcessorSettings(newSettings);
          console.log(`16 Levels: Applied settings to pad ${event.padId}:`, newSettings);
        } else {
          console.error(`16 Levels: Source pad ${effectiveSourcePad} not found or has no sample`);
        }
      }
      
      // Find if there's already a track for this pad
      let track = updatedTracks.find(t => t.padId === event.padId);
      
      if (track) {
        // Update existing track's step
        const updatedTrack = { 
          ...track,
          steps: track.steps.map((s, idx) => {
            if (idx === step) {
              return { ...s, active: true };
            }
            return s;
          })
        };
        
        // Replace the track in tracks array
        const trackIndex = updatedTracks.findIndex(t => t.id === track.id);
        updatedTracks[trackIndex] = updatedTrack;
      } else {
        // Create a new track for this pad
        const nextTrackId = Math.max(...updatedTracks.map(t => t.id), -1) + 1;
        
        // Create all 16 steps with only the current step active
        const steps = Array.from({ length: 16 }, (_, idx) => ({
          id: idx,
          active: idx === step
        }));
        
        // Add the new track
        updatedTracks.push({
          id: nextTrackId,
          padId: event.padId,
          steps
        });
      }
    });
    
    // Create the updated pattern
    const patternWithMidiEvents = {
      ...updatedPattern,
      tracks: updatedTracks
    };
    
    // Update the pattern in the store
    updatePattern(patternWithMidiEvents);
    console.log('Pattern updated with MIDI events');
    
    // Show success message
    toast(`Added ${midiNoteEvents.length} events to pattern ${currentPattern.name}`);
  };
  
  // Handlers for dragging notes in the time editor
  const handleMouseDown = (event: React.MouseEvent, noteId: string) => {
    setDraggingNoteId(noteId);
    setDragStartX(event.clientX);
    event.stopPropagation();
  };
  
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!draggingNoteId) return;
    
    const dx = event.clientX - dragStartX;
    const pixelsPerTick = timeZoom; // Adjust based on zoom level
    const offsetTicks = Math.round(dx / pixelsPerTick);
    
    // Find the dragging note and adjust its offset
    const note = noteEvents.find(n => n.id === draggingNoteId);
    if (note) {
      // Make a local update for visual feedback during dragging
      adjustNoteOffset(draggingNoteId, offsetTicks);
    }
  };
  
  const handleMouseUp = () => {
    if (draggingNoteId) {
      // Finalize the position change
      console.log(`Finalized position for note ${draggingNoteId}`);
      setDraggingNoteId(null);
    }
  };
  
  // Effect to add global mouse handlers for dragging
  useEffect(() => {
    if (draggingNoteId) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!timeEditorRef.current) return;
        
        const rect = timeEditorRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Calculate offset in ticks relative to the grid
        const pixelsPerTick = timeZoom;
        const dx = e.clientX - dragStartX;
        const offsetTicks = Math.round(dx / pixelsPerTick);
        
        // Apply the offset (with constraints if needed)
        const maxOffset = Tone.Ticks("16n").toTicks() / 2; // Max half a 16th note in either direction
        const constrainedOffset = Math.max(-maxOffset, Math.min(maxOffset, offsetTicks));
        
        adjustNoteOffset(draggingNoteId, constrainedOffset);
      };
      
      const handleGlobalMouseUp = () => {
        setDraggingNoteId(null);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggingNoteId, dragStartX, timeZoom]);
  
  // Render the time editor grid
  const renderTimeEditor = () => {
    const stepWidth = 24 * timeZoom; // Width of each grid division in pixels
    const rowHeight = 30; // Height of each note row
    
    // Get all unique note numbers from the events
    const uniqueNotes = Array.from(new Set(noteEvents.map(event => event.noteNumber)));
    uniqueNotes.sort((a, b) => b - a); // Sort high to low
    
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[timeZoom]}
              min={0.5}
              max={4}
              step={0.1}
              onValueChange={values => setTimeZoom(values[0])}
              className="w-40 ml-2 inline-block"
            />
            <span className="text-xs ml-2">{timeZoom.toFixed(1)}x</span>
          </div>
          
          <div>
            <label className="text-sm font-medium mr-2">Precision</label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSubDivisions(prev => Math.min(16, prev * 2))}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-xs mx-2">1/{4 * subDivisions}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSubDivisions(prev => Math.max(1, prev / 2))}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div 
          className="relative border border-gray-300 dark:border-gray-600 overflow-x-auto bg-gray-50 dark:bg-gray-850"
          style={{ 
            height: (uniqueNotes.length * rowHeight) + 30, 
            width: '100%',
            minHeight: 200
          }}
          ref={timeEditorRef}
        >
          {/* Time grid background */}
          <div className="absolute inset-0">
            {/* Beat/bar markers */}
            {Array.from({ length: totalSteps + 1 }).map((_, index) => (
              <div 
                key={`grid-${index}`}
                className={cn(
                  "absolute top-0 bottom-0 border-l",
                  index % (4 * subDivisions) === 0 
                    ? "border-gray-400 dark:border-gray-500" // Bar lines
                    : index % subDivisions === 0
                      ? "border-gray-300 dark:border-gray-600" // Beat lines
                      : "border-gray-200 dark:border-gray-700"  // Subdivision lines
                )}
                style={{ 
                  left: `${index * stepWidth}px`,
                  height: '100%'
                }}
              />
            ))}
            
            {/* Note rows background */}
            {uniqueNotes.map((noteNumber, noteIndex) => (
              <div 
                key={`row-${noteNumber}`}
                className={cn(
                  "absolute left-0 right-0 border-b",
                  noteIndex % 2 === 0 
                    ? "bg-gray-100 dark:bg-gray-800 bg-opacity-50" 
                    : "bg-white dark:bg-gray-900 bg-opacity-50"
                )}
                style={{ 
                  top: `${noteIndex * rowHeight}px`,
                  height: `${rowHeight}px`
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 bg-gray-200 dark:bg-gray-700 p-1 flex items-center">
                  <span className="text-xs font-mono">
                    {getMidiNoteName(noteNumber)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Note events */}
          {noteEvents.map((event) => {
            // Find the row index for this note
            const noteIndex = uniqueNotes.indexOf(event.noteNumber);
            if (noteIndex === -1) return null;
            
            // Get the sample and its color
            const pad = pads.find(p => p.id === event.padId);
            const sample = pad?.sampleId ? samples.find(s => s.id === pad.sampleId) : undefined;
            const color = sample?.color || '#888888';
            
            // Calculate position based on time and offset
            const baseX = (event.time / (Tone.Ticks("16n").toTicks() / subDivisions)) * stepWidth;
            const offsetX = (event.offset / (Tone.Ticks("16n").toTicks() / subDivisions)) * stepWidth;
            const x = baseX + offsetX;
            
            return (
              <div 
                key={event.id}
                className="absolute flex flex-col items-center justify-center rounded-md cursor-pointer shadow-sm hover:shadow-md transition-all z-10 border-2"
                style={{ 
                  top: `${noteIndex * rowHeight + 2}px`,
                  left: `${x}px`,
                  width: `${stepWidth * 0.8}px`,
                  height: `${rowHeight - 4}px`,
                  backgroundColor: `${color}`,
                  borderColor: event.id === draggingNoteId ? 'white' : `${color}`,
                  opacity: event.id === draggingNoteId ? 0.8 : 0.6
                }}
                onMouseDown={(e) => handleMouseDown(e, event.id)}
              >
                <div className="text-xs text-white font-semibold truncate" style={{ maxWidth: '100%' }}>
                  {pad ? `Pad ${pad.id + 1}` : 'Note'}
                </div>
                {event.offset !== 0 && (
                  <div className="text-[9px] text-white opacity-80">
                    {event.offset > 0 ? '+' : ''}{Math.round(event.offset / (Tone.Ticks("16n").toTicks() / subDivisions / 100) * 100) / 100}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-col gap-2 mt-3">
          <div className="text-xs text-gray-500">
            <p>Drag notes horizontally to adjust their timing. Timing offsets maintain grid positions while allowing micro-timing adjustments.</p>
          </div>
          
          {/* Show current state of MIDI recording */}
          <div className="flex items-center justify-between border p-2 rounded-md bg-gray-100 dark:bg-gray-800">
            <div>
              <span className="text-sm font-medium">MIDI Events: </span>
              <span className="text-sm">{noteEvents.filter(e => e.id.startsWith('midi-')).length}</span>
              {levelsMode !== 'off' && (
                <span className="ml-2 text-xs bg-amber-200 dark:bg-amber-800 px-1 rounded">
                  {levelsMode.toUpperCase()} LEVELS MODE
                </span>
              )}
            </div>
            
            {/* Controls for MIDI events */}
            <div className="flex gap-2">
              {/* Clear button for MIDI events */}
              {noteEvents.some(e => e.id.startsWith('midi-')) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteEvents(prev => prev.filter(e => !e.id.startsWith('midi-')))}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  Clear MIDI
                </Button>
              )}
              
              {/* Show Apply button when there are MIDI events, regardless of 16 levels mode */}
              {noteEvents.some(e => e.id.startsWith('midi-')) && (
                <Button 
                  size="sm"
                  variant="default"
                  onClick={convertMidiEventsToPattern}
                >
                  Apply MIDI to Pattern
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4 h-full overflow-y-auto bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold mr-4">MIDI Grid</h2>
        </div>
        
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      
      {/* View mode toggle */}
      <div className="mb-4">
        <div className="flex border rounded-md overflow-hidden divide-x">
          <button 
            className={`px-4 py-2 flex-1 ${viewMode === 'midiGrid' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setViewMode('midiGrid')}
          >
            Grid View
          </button>
          <button 
            className={`px-4 py-2 flex-1 flex items-center justify-center ${viewMode === 'timeEditor' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setViewMode('timeEditor')}
          >
            <Clock className="w-4 h-4 mr-1" />
            Time Editor
          </button>
        </div>
      </div>
      
      {/* Grid View Content */}
      {viewMode === 'midiGrid' && (
        <div>
          <div className="text-sm mb-4">
            <p>Click on MIDI notes to map them to pads. In 16 Levels mode, clicking will apply the source sample with different pitch/volume settings.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* MIDI Grid Section */}
            <div>
              <h3 className="text-lg font-medium mb-2">MIDI Notes</h3>
              <div className="border rounded-md p-2 grid grid-cols-8 gap-1">
                {midiGrid.map((row, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {row.map((noteNumber) => {
                      // Find the pad for this MIDI note (if any)
                      const pad = getPadForMidiNote(noteNumber);
                      const sample = getSampleForPad(pad);
                      
                      // Determine if this note is in 16 levels mode
                      const is16LevelsSource = levelsSamplePadId !== null && pad?.id === levelsSamplePadId;
                      const is16LevelsMode = levelsMode !== 'off';
                      
                      // Base background color
                      let bgColor = 'bg-gray-200 dark:bg-gray-700';
                      let textColor = 'text-gray-700 dark:text-gray-300';
                      
                      // If there's a sample assigned to this note, use its color
                      if (sample) {
                        bgColor = `bg-[${sample.color}] bg-opacity-70 hover:bg-opacity-100`;
                        textColor = 'text-white';
                      }
                      
                      // If this is the source for 16 levels, highlight it
                      if (is16LevelsSource && is16LevelsMode) {
                        bgColor = `bg-amber-500 hover:bg-amber-600`;
                        textColor = 'text-white font-bold';
                      }
                      
                      return (
                        <button
                          key={noteNumber}
                          className={`${bgColor} ${textColor} w-full aspect-square rounded flex flex-col items-center justify-center text-xs transition-colors`}
                          onClick={() => handleMidiNoteClick(noteNumber)}
                        >
                          <span className="font-mono">{getMidiNoteName(noteNumber)}</span>
                          <span className="text-[9px] opacity-80">{noteNumber}</span>
                          {pad && (
                            <span className="mt-1 px-1 bg-black bg-opacity-30 rounded text-[9px]">
                              Pad {pad.id}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* Controls & Info Section */}
            <div>
              <h3 className="text-lg font-medium mb-2">MIDI Controls</h3>
              <div className="border rounded-md p-4 space-y-4">
                {/* MIDI Base Note Setting */}
                <div>
                  <label className="block text-sm mb-1">Base MIDI Note</label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStartNote(prev => Math.max(0, prev - 12))}
                    >
                      -1 Oct
                    </Button>
                    <input 
                      type="number" 
                      value={startNote}
                      onChange={(e) => setStartNote(parseInt(e.target.value) || 0)}
                      className="w-16 border rounded p-1 text-center"
                    />
                    <span className="text-sm">({getMidiNoteName(startNote)})</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStartNote(prev => Math.min(108, prev + 12))}
                    >
                      +1 Oct
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This is the MIDI note that maps to Pad 0.</p>
                </div>
                
                {/* 16 Levels Mode Info */}
                {levelsMode !== 'off' && levelsSamplePadId !== null && (
                  <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded">
                    <h4 className="font-medium">16 Levels Mode: {levelsMode.toUpperCase()}</h4>
                    <p className="text-xs">
                      Source: Pad {levelsSamplePadId} 
                      {samples.find(s => s.id === pads.find(p => p.id === levelsSamplePadId)?.sampleId)?.name ? 
                        ` (${samples.find(s => s.id === pads.find(p => p.id === levelsSamplePadId)?.sampleId)?.name})` : ''}
                    </p>
                    <p className="text-xs mt-1">
                      Click on MIDI notes to apply the source sample with adjusted {levelsMode} settings
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Time Editor Content */}
      {viewMode === 'timeEditor' && renderTimeEditor()}
    </div>
  );
};

export default MidiGrid;
