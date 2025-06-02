import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Sample, Pad, Track, Pattern, ProcessorSettings, TransportSettings, QuantizationValue } from '../types';
import { defaultPads, sampleLibrary } from '../samples';
import { kitPresets, defaultPatterns, createEmptyPattern } from '../presets';
import audioEngine, { MidiEvent, onMidiEvent, startMidiRecording, stopMidiRecording, recordMidiEvent } from '../audio';
import * as persistence from '../persistence';
import * as Tone from 'tone';

// Define 16 levels mode types
type LevelsMode = 'off' | 'pitch' | 'volume';

interface DrumMachineState {
  // Samples and pads
  samples: Sample[];
  pads: Pad[];
  activePadId: number | null;
  triggerPad: (padId: number) => void;
  
  // Patterns and sequencer
  patterns: Pattern[];
  currentPatternId: number;
  setCurrentPattern: (patternId: number) => void;
  createPattern: () => void;
  updatePattern: (pattern: Pattern) => void;
  toggleStep: (trackId: number, stepId: number) => void;
  
  // Kit presets
  kits: typeof kitPresets;
  currentKitId: string;
  setCurrentKit: (kitId: string) => void;
  assignSampleToPad: (padId: number, sampleId: string | null) => void;
  
  // Audio processing
  processorSettings: ProcessorSettings[];
  updateProcessorSettings: (settings: ProcessorSettings) => void;
  
  // Transport and playback
  transport: TransportSettings;
  startPlayback: () => void;
  stopPlayback: () => void;
  setTempo: (tempo: number) => void;
  setSwing: (swing: number) => void;
  setQuantization: (quantization: QuantizationValue) => void;
  
  // Recording
  isRecording: boolean;
  isOverdubbing: boolean;
  toggleRecording: () => void;
  toggleOverdub: () => void;
  clearPattern: () => void;
  
  // Metronome
  isMetronomeEnabled: boolean;
  toggleMetronome: () => void;
  
  // 16 Levels functionality
  levelsMode: LevelsMode;
  levelsSamplePadId: number | null;
  toggleLevelsMode: () => void;
  setLevelsPad: (padId: number) => void;
  
  // Initialization
  initSamples: () => Promise<void>;
  isInitialized: boolean;
  
  // User uploaded samples
  uploadSample: (file: File) => Promise<string | null>;
  
  // Sample color management
  updateSampleColor: (sampleId: string, color: string) => void;
}

export const useDrumMachineStore = create<DrumMachineState>()(
  subscribeWithSelector((set, get) => {
    // Load saved data or use defaults
    const savedPatterns = persistence.loadPatterns();
    const savedPads = persistence.loadPads();
    const savedCurrentPatternId = persistence.loadCurrentPatternId();
    const savedCurrentKitId = persistence.loadCurrentKitId();
    const savedProcessorSettings = persistence.loadProcessorSettings();
    const savedDrumKits = persistence.loadDrumKits();
    const savedTempo = persistence.loadTempo();
    const savedSwing = persistence.loadSwing();
    const savedQuantization = persistence.loadQuantization();
    
    // Initialize loaded kits or use defaults
    const initialKits = savedDrumKits || kitPresets;
    
    return {
      // Use loaded state or defaults
      samples: sampleLibrary,
      pads: savedPads || defaultPads,
      activePadId: null,
      patterns: savedPatterns || defaultPatterns,
      currentPatternId: savedCurrentPatternId || 1,
      kits: initialKits,
      currentKitId: savedCurrentKitId || 'basic',
      processorSettings: savedProcessorSettings ||
        defaultPads.map(pad => ({
          padId: pad.id,
          volume: 0,
          pitch: 0,
          decay: 0.5
        })),
      transport: {
        tempo: savedTempo || 90,
        playing: false,
        currentStep: 0,
        swing: savedSwing || 0,
        quantization: (savedQuantization as QuantizationValue) || "16n"
      },
      
      // Set quantization value
      setQuantization: (quantization: QuantizationValue) => {
        // Update the transport settings
        set(state => {
          const updatedTransport = {
            ...state.transport,
            quantization
          };
          
          // Save to persistence
          persistence.saveQuantization(quantization);
          
          return { transport: updatedTransport };
        });
        
        // Update the audio engine
        get().stopPlayback();
        setTimeout(() => {
          // Restart sequencer with new quantization 
          if (get().transport.playing) {
            get().startPlayback();
          }
        }, 100);
      },
      
      isRecording: false,
      isOverdubbing: false,
      isMetronomeEnabled: false,
      isInitialized: false,
      
      // 16 Levels feature
      levelsMode: 'off' as LevelsMode,
      levelsSamplePadId: null,
      
      // Load all samples
      initSamples: async () => {
        const { samples } = get();
        
        // Load all samples in parallel
        await Promise.all(
          samples.map(sample => audioEngine.loadSample(sample))
        );
        
        // Track the sequencer event ID
        let sequencerEvent: number | null = null;
        
        // Set up sequencer loop with dynamic quantization
        const setupSequencerLoop = (quantization: QuantizationValue = '16n') => {
          // Clear any existing sequencer event if it exists
          if (sequencerEvent !== null) {
            Tone.Transport.clear(sequencerEvent);
            sequencerEvent = null;
          }
          
          // Create a new sequence with the specified quantization
          sequencerEvent = Tone.Transport.scheduleRepeat((time) => {
            const { 
              transport, 
              patterns, 
              currentPatternId, 
              pads, 
              processorSettings 
            } = get();
            
            if (!transport.playing) return;
            
            // Get current pattern and current step
            const pattern = patterns.find(p => p.id === currentPatternId);
            if (!pattern) return;
            
            // Check which tracks have active steps at the current position
            pattern.tracks.forEach(track => {
              const step = track.steps[transport.currentStep];
              if (step && step.active) {
                // Get pad and sample
                const pad = pads.find(p => p.id === track.padId);
                if (pad && pad.sampleId) {
                  // Get processing settings
                  const settings = processorSettings.find(
                    s => s.padId === pad.id
                  ) || { volume: 0, pitch: 0, decay: 0.5 };
                  
                  // Schedule the sample to play
                  audioEngine.scheduleSample(
                    pad.sampleId,
                    time,
                    settings.volume,
                    settings.pitch,
                    settings.decay
                  );
                  
                  // Set active pad to light it up visually
                  // We do this in a timeout that syncs with the audio timing
                  // Use a small offset to ensure the highlight is in sync with the sound
                  const offsetMs = (time - Tone.now()) * 1000;
                  setTimeout(() => {
                    // Set active pad ID to trigger the visual highlight
                    set({ activePadId: pad.id });
                    
                    // Reset active pad after animation time
                    setTimeout(() => {
                      set(state => {
                        if (state.activePadId === pad.id) {
                          return { activePadId: null };
                        }
                        return {};
                      });
                    }, 150);
                  }, Math.max(0, offsetMs));
                }
              }
            });
            
            // Update current step
            set(state => ({
              transport: {
                ...state.transport,
                currentStep: (state.transport.currentStep + 1) % 16
              }
            }));
          }, quantization); // Use the specified quantization value
        };
        
        // Set up initial sequencer with default quantization from transport settings
        setupSequencerLoop(get().transport.quantization);
        
        // Add a subscription to update sequencer when quantization changes
        const unsubscribe = useDrumMachineStore.subscribe(
          (state) => state.transport.quantization,
          (quantization) => {
            console.log(`Quantization changed to ${quantization}, reconfiguring sequencer`);
            setupSequencerLoop(quantization);
          }
        );
        
        set({ isInitialized: true });
      },
      
      // Trigger a pad (play its sample)
      triggerPad: (padId: number) => {
        // Get all needed state in one go to avoid duplicate declarations
        const { 
          pads, 
          processorSettings, 
          patterns, 
          currentPatternId, 
          transport, 
          levelsMode,
          isRecording,
          isOverdubbing 
        } = get();
        
        const pad = pads.find(p => p.id === padId);
        
        if (pad && pad.sampleId) {
          // Set as active pad
          set({ activePadId: padId });
          
          // In 16 levels mode, when a pad is triggered, set it as the levels sample source
          if (levelsMode !== 'off') {
            set({ levelsSamplePadId: padId });
            console.log(`16 Levels: Set sample source to pad ${padId}`);
          }
          
          // Always record MIDI events if we're in recording mode, regardless of 16 levels mode
          if (isRecording) {
            // Determine current timing position based on transport.currentStep
            const sixteenthNoteValue = Tone.Ticks("16n").toTicks();
            const currentTick = Math.floor(transport.currentStep * sixteenthNoteValue);
            console.log(`Recording MIDI at tick position: ${currentTick} (step ${transport.currentStep})`);
            
            // Calculate MIDI note number (C2 = 36 + pad offset)
            const midiNote = 36 + padId;
            
            // Get processor settings for this pad
            const padSettings = processorSettings.find(s => s.padId === padId) || {
              volume: 0,
              pitch: 0,
              decay: 0.5
            };
            
            // Record a MIDI note-on event with 16 levels information
            const noteOnEvent: Omit<MidiEvent, 'timestamp' | 'ticks'> = {
              type: 'noteOn',
              note: midiNote,
              velocity: 100, // Default velocity
              channel: 0,
              // Add 16 levels information
              levelsMode: levelsMode,
              levelsSamplePadId: get().levelsSamplePadId,
              levelsPitch: padSettings.pitch,
              levelsVolume: padSettings.volume
            };
            recordMidiEvent(noteOnEvent);
            
            // Also record the immediate note-off (with minimal duration)
            const noteOffEvent: Omit<MidiEvent, 'timestamp' | 'ticks'> = {
              type: 'noteOff',
              note: midiNote,
              velocity: 0,
              channel: 0,
              // Add 16 levels information here too
              levelsMode: levelsMode,
              levelsSamplePadId: get().levelsSamplePadId,
              levelsPitch: padSettings.pitch,
              levelsVolume: padSettings.volume
            };
            recordMidiEvent(noteOffEvent);
            
            console.log(`Recorded MIDI events for pad ${padId}, note ${midiNote}, with levels mode: ${levelsMode}`);
          }
          
          // Get processing settings
          const settings = processorSettings.find(s => s.padId === padId) || {
            volume: 0,
            pitch: 0,
            decay: 0.5
          };
          
          // Play the sample
          audioEngine.playSample(
            pad.sampleId, 
            settings.volume, 
            settings.pitch, 
            settings.decay
          );
          
          // Record to pattern if recording or overdubbing is active
          if ((isRecording || isOverdubbing) && transport.playing) {
            const currentPattern = patterns.find(p => p.id === currentPatternId);
            if (currentPattern) {
              // Get the current step from transport timing
              // For more accurate recording, calculate step from Tone.js Transport position
              let currentStep;

              try {
                // Get position as ticks
                const ticks = Tone.Transport.ticks;
                // Convert to 16th note position (assuming 4/4 time)
                const ppq = Tone.Transport.PPQ; // Pulses Per Quarter note
                const ticksPerStep = ppq / 4; // 16th notes are quarter notes / 4
                
                // Calculate step within the pattern (0-15)
                const calculatedStep = Math.floor(ticks / ticksPerStep) % 16;
                
                // Sometimes we need to adjust by 1 to match the audio we're hearing
                currentStep = calculatedStep;
                console.log(`Recording pad ${padId} at calculated step ${currentStep} (transport step: ${transport.currentStep})`);
              } catch (e) {
                // Fallback to transport step if Tone.js calculation fails
                currentStep = transport.currentStep;
                console.log(`Using fallback step ${currentStep} for recording`);
              }
              
              // Check if this pad already has a track in the pattern
              let track = currentPattern.tracks.find(t => t.padId === padId);
              let updatedTracks;
              
              if (track) {
                // Pad has existing track - update it
                updatedTracks = currentPattern.tracks.map(t => {
                  if (t.id === track.id) {
                    const updatedSteps = t.steps.map(s => {
                      if (s.id === currentStep) {
                        return { ...s, active: true };
                      }
                      return s;
                    });
                    return { ...t, steps: updatedSteps };
                  }
                  return t;
                });
              } else {
                // Pad doesn't have a track yet - create a new one
                // Find the next available track ID
                const nextTrackId = Math.max(...currentPattern.tracks.map(t => t.id), -1) + 1;
                console.log(`Creating new track ${nextTrackId} for pad ${padId}`);
                
                // Create all steps with the current step active
                const steps = Array.from({ length: 16 }, (_, stepIndex) => ({
                  id: stepIndex,
                  active: stepIndex === currentStep
                }));
                
                // Add the new track
                const newTrack = {
                  id: nextTrackId,
                  padId: padId, 
                  steps: steps
                };
                
                // Append to existing tracks
                updatedTracks = [...currentPattern.tracks, newTrack];
              }
              
              // Update the pattern
              const updatedPattern = {
                ...currentPattern,
                tracks: updatedTracks
              };
              
              // Update state and save to persistence
              set(state => {
                const updatedPatterns = state.patterns.map(p => 
                  p.id === updatedPattern.id ? updatedPattern : p
                );
                
                // Save to persistence
                persistence.savePatterns(updatedPatterns);
                
                return { patterns: updatedPatterns };
              });
            }
          }
          
          // Reset active pad after animation time
          setTimeout(() => {
            set(state => {
              if (state.activePadId === padId) {
                return { activePadId: null };
              }
              return {};
            });
          }, 150);
        }
      },
      
      // Set current pattern
      setCurrentPattern: (patternId: number) => {
        set({ currentPatternId: patternId });
        // Save to persistence
        persistence.saveCurrentPatternId(patternId);
      },
      
      // Create a new pattern
      createPattern: () => {
        const { patterns } = get();
        const newId = Math.max(...patterns.map(p => p.id), 0) + 1;
        const newPattern = createEmptyPattern(newId, `Pattern ${newId}`);
        
        const updatedPatterns = [...patterns, newPattern];
        set(state => ({
          patterns: updatedPatterns,
          currentPatternId: newId
        }));
        
        // Save to persistence
        persistence.savePatterns(updatedPatterns);
        persistence.saveCurrentPatternId(newId);
      },
      
      // Update a pattern (without auto-saving)
      updatePattern: (pattern: Pattern) => {
        set(state => {
          const updatedPatterns = state.patterns.map(p => 
            p.id === pattern.id ? pattern : p
          );
          
          // Patterns are manually saved, not auto-saved
          // persistence.savePatterns(updatedPatterns);
          
          return { patterns: updatedPatterns };
        });
      },
      
      // Toggle a step in the current pattern (without auto-saving)
      toggleStep: (trackId: number, stepId: number) => {
        const { patterns, currentPatternId } = get();
        const currentPattern = patterns.find(p => p.id === currentPatternId);
        
        if (currentPattern) {
          const updatedTracks = currentPattern.tracks.map(track => {
            if (track.id === trackId) {
              const updatedSteps = track.steps.map(step => {
                if (step.id === stepId) {
                  return { ...step, active: !step.active };
                }
                return step;
              });
              return { ...track, steps: updatedSteps };
            }
            return track;
          });
          
          const updatedPattern = {
            ...currentPattern,
            tracks: updatedTracks
          };
          
          // Update state (without auto-saving)
          set(state => {
            const updatedPatterns = state.patterns.map(p => 
              p.id === updatedPattern.id ? updatedPattern : p
            );
            
            // Patterns are manually saved, not auto-saved
            // persistence.savePatterns(updatedPatterns);
            
            return { patterns: updatedPatterns };
          });
        }
      },
      
      // Set current drum kit
      setCurrentKit: (kitId: string) => {
        const { kits, pads } = get();
        const kit = kits.find(k => k.id === kitId);
        
        if (kit) {
          // Update pad assignments based on kit
          const updatedPads = pads.map(pad => {
            const assignment = kit.assignments.find(a => a.padId === pad.id);
            return {
              ...pad,
              sampleId: assignment ? assignment.sampleId : null
            };
          });
          
          set({
            currentKitId: kitId,
            pads: updatedPads
          });
          
          // Save to persistence
          persistence.saveCurrentKitId(kitId);
          persistence.savePads(updatedPads);
        }
      },
      
      // Assign a sample to a pad
      assignSampleToPad: (padId: number, sampleId: string | null) => {
        // Update the pads state
        set(state => {
          const updatedPads = state.pads.map(pad => 
            pad.id === padId ? { ...pad, sampleId } : pad
          );
          
          // Save to persistence
          persistence.savePads(updatedPads);
          
          return { pads: updatedPads };
        });
      },
      
      // Update processor settings for a pad
      updateProcessorSettings: (settings: ProcessorSettings) => {
        set(state => {
          const updatedSettings = state.processorSettings.map(s => 
            s.padId === settings.padId ? settings : s
          );
          
          // Save to persistence
          persistence.saveProcessorSettings(updatedSettings);
          
          return { processorSettings: updatedSettings };
        });
      },
      
      // Start playback
      startPlayback: () => {
        audioEngine.startSequencer();
        set(state => ({
          transport: {
            ...state.transport,
            playing: true
          }
        }));
      },
      
      // Stop playback
      stopPlayback: () => {
        audioEngine.stopSequencer();
        set(state => ({
          transport: {
            ...state.transport,
            playing: false,
            currentStep: 0
          }
        }));
      },
      
      // Set tempo
      setTempo: (tempo: number) => {
        audioEngine.setTempo(tempo);
        set(state => {
          const updatedTransport = {
            ...state.transport,
            tempo
          };
          
          // Save to persistence
          persistence.saveTempo(tempo);
          
          return { transport: updatedTransport };
        });
      },
      
      // Set swing
      setSwing: (swing: number) => {
        audioEngine.setSwing(swing / 100);
        set(state => {
          const updatedTransport = {
            ...state.transport,
            swing
          };
          
          // Save to persistence
          persistence.saveSwing(swing);
          
          return { transport: updatedTransport };
        });
      },
      
      // Toggle recording mode
      toggleRecording: () => {
        set(state => {
          const newRecordingState = !state.isRecording;
          
          // Also start/stop MIDI recording when 16 levels mode is active
          if (newRecordingState && state.levelsMode !== 'off') {
            // Start MIDI recording
            startMidiRecording();
            console.log('Starting MIDI recording for 16 levels mode');
          } else if (!newRecordingState && state.levelsMode !== 'off') {
            // Stop MIDI recording and get events
            const recordedEvents = stopMidiRecording();
            console.log(`Stopped MIDI recording, captured ${recordedEvents.length} MIDI events`);
            
            // TODO: Process the recorded MIDI events and add to the pattern
            // This could be done in MidiGrid component
          }
          
          return { 
            isRecording: newRecordingState,
            isOverdubbing: false // Turn off overdub when toggling record
          };
        });
      },
      
      // Toggle overdub mode
      toggleOverdub: () => {
        set(state => ({ 
          isOverdubbing: !state.isOverdubbing,
          isRecording: false // Turn off recording when toggling overdub
        }));
      },
      
      // Toggle metronome
      toggleMetronome: () => {
        set(state => {
          const newState = { isMetronomeEnabled: !state.isMetronomeEnabled };
          // Update audio engine
          audioEngine.toggleMetronome(newState.isMetronomeEnabled);
          return newState;
        });
      },
      
      // 16 Levels mode toggle - cycles through off, pitch, volume modes
      toggleLevelsMode: () => {
        set(state => {
          let newMode: LevelsMode;
          
          // Cycle through the modes
          switch (state.levelsMode) {
            case 'off':
              newMode = 'pitch';
              break;
            case 'pitch':
              newMode = 'volume';
              break;
            case 'volume':
              newMode = 'off';
              break;
            default:
              newMode = 'off';
          }
          
          // Set global 16 levels mode for direct access
          if (typeof window !== 'undefined') {
            window.sixteenLevelsMode = newMode;
            console.log(`Global 16 levels mode set to: ${newMode}`);
          }
          
          // If turning off, reset
          if (newMode === 'off') {
            // Reset global level pad too
            if (typeof window !== 'undefined') {
              window.sixteenLevelsSourcePad = null;
            }
            return { levelsMode: newMode, levelsSamplePadId: null };
          }
          
          console.log(`16 Levels mode changed to: ${newMode}`);
          return { levelsMode: newMode };
        });
      },
      
      // Set the pad to use as the sample source for 16 levels
      setLevelsPad: (padId: number) => {
        const { pads, levelsMode } = get();
        const pad = pads.find(p => p.id === padId);
        
        // Only set if the pad has a sample and levels mode is active
        if (pad && pad.sampleId && levelsMode !== 'off') {
          // Update state
          set({ levelsSamplePadId: padId });
          
          // Also update global variable for direct access
          if (typeof window !== 'undefined') {
            window.sixteenLevelsSourcePad = padId;
            console.log(`Global 16 Levels source pad set to ${padId}`);
          }
          
          console.log(`Set 16 Levels sample pad to ${padId}`);
        }
      },
      
      // Upload a user sample
      uploadSample: async (file: File) => {
        try {
          console.log('Starting sample upload process for:', file.name);
          
          // Create a unique ID for the sample
          const timestamp = Date.now();
          const sampleId = `user-${timestamp}`;
          const sampleName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          
          // Determine color based on file type
          const fileType = file.type.split('/')[1];
          let color = '#ff9500'; // Default orange
          
          // Assign different colors based on file type
          if (fileType === 'mp3') color = '#ff6b6b';
          if (fileType === 'wav') color = '#4d96ff';
          if (fileType === 'ogg') color = '#43aa8b';
          
          // Create a URL for the file
          const url = URL.createObjectURL(file);
          
          // Create the sample object
          const newSample: Sample = {
            id: sampleId,
            name: `${sampleName}`,
            file: url,
            color: color
          };
          
          // Add to the store
          set(state => ({
            samples: [...state.samples, newSample]
          }));

          // Load the sample
          await audioEngine.loadSample(newSample);
          
          return sampleId;
        } catch (error) {
          console.error('Error in upload sample process:', error);
          return null;
        }
      },
      
      // Clear the current pattern (without auto-saving)
      clearPattern: () => {
        const { patterns, currentPatternId } = get();
        const currentPattern = patterns.find(p => p.id === currentPatternId);
        
        if (currentPattern) {
          const clearedTracks = currentPattern.tracks.map(track => ({
            ...track,
            steps: track.steps.map(step => ({ ...step, active: false }))
          }));
          
          const clearedPattern = {
            ...currentPattern,
            tracks: clearedTracks
          };
          
          // Update in store (without auto-saving)
          set(state => {
            const updatedPatterns = state.patterns.map(p => 
              p.id === clearedPattern.id ? clearedPattern : p
            );
            
            // Patterns are manually saved, not auto-saved
            // persistence.savePatterns(updatedPatterns);
            
            return { patterns: updatedPatterns };
          });
        }
      },
      
      // Update sample color
      updateSampleColor: (sampleId: string, color: string) => {
        if (!sampleId) return;
        
        // Update color in samples array
        set(state => {
          const updatedSamples = state.samples.map(sample => {
            if (sample.id === sampleId) {
              return { ...sample, color };
            }
            return sample;
          });
          
          // Auto-save the sample colors
          // We're saving the drum kits since they contain the sample associations
          persistence.saveDrumKits(state.kits);
          
          console.log(`Updated color for sample ${sampleId} to ${color}`);
          return { samples: updatedSamples };
        });
      }
    };
  })
);
