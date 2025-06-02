import * as Tone from 'tone';
import { Sample, ProcessorSettings } from './types'; // Import ProcessorSettings

// Store loaded samples
const loadedSamples: Map<string, Tone.Player> = new Map();
const slicedBufferCache = new Map<string, AudioBuffer>();

export const addSlicedBuffer = (id: string, buffer: AudioBuffer): void => {
  slicedBufferCache.set(id, buffer);
  console.log(`Cached sliced buffer with ID: ${id}\`);
};

// Metronome state
let isMetronomeEnabled = false;
let metronomeHighClick: Tone.Synth | null = null;
let metronomeLowClick: Tone.Synth | null = null;

// Initialize the audio context
export const setupAudioContext = async () => {
  await Tone.start();
  console.log('Audio context started');
  Tone.Transport.bpm.value = 90;
  
  // Create metronome synths
  metronomeHighClick = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  }).toDestination();
  metronomeHighClick.volume.value = -15; // Quieter than regular samples
  
  metronomeLowClick = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  }).toDestination();
  metronomeLowClick.volume.value = -18; // Even quieter for low clicks
  
  // Set up a safer metronome implementation
  // Instead of scheduling, we'll use a callback approach that's more error-resistant
  let metronomeId: number | null = null;
  
  // Helper function to handle metronome clicks safely
  const setupMetronome = () => {
    // Clear any existing metronome schedule
    if (metronomeId !== null) {
      Tone.Transport.clear(metronomeId);
      metronomeId = null;
    }
    
    // Only set up if enabled
    if (isMetronomeEnabled) {
      try {
        metronomeId = Tone.Transport.scheduleRepeat((time) => {
          try {
            // Get current position to determine if it's the first beat of the bar
            const position = Tone.Transport.position.toString().split(':');
            const beat = parseInt(position[1]);
            
            // Play high click on first beat of the bar, low click on others
            if (beat === 0) {
              metronomeHighClick?.triggerAttackRelease('C6', '16n', time);
            } else {
              metronomeLowClick?.triggerAttackRelease('G5', '16n', time);
            }
          } catch (err) {
            console.warn('Metronome tick error:', err);
          }
        }, '4n');
      } catch (err) {
        console.error('Failed to set up metronome:', err);
      }
    }
  };
  
  // Initial setup
  setupMetronome();
  
  // Store the setup function for external use
  setupMetronomeFunc = setupMetronome;
  
  return Tone.getContext().state;
};

// Load a sample file with improved handling for user samples
export const loadSample = async (sample: Sample): Promise<void> => {
  // If it's a slice, its buffer is already managed by addSlicedBuffer. No loading needed here.
  if (sample.isSlice) {
    // console.log(`Sample ${sample.name} is a slice, skipping URL loading.`);
    return;
  }

  // Skip if already loaded in loadedSamples (for URL-based samples)
  if (loadedSamples.has(sample.id)) {
    // console.log(`Sample ${sample.name} already loaded from URL.`);
    return;
  }
  
  // Ensure there's a file path for non-slice samples
  if (!sample.file) {
    console.warn(`Sample ${sample.name} has no file path and is not a slice. Cannot load.`);
    return;
  }

  try {
    // Detect if it's a user sample (from URL.createObjectURL, which starts with blob:)
    // or a pre-defined sample from a relative/absolute URL.
    const isUserFileBlob = sample.file.startsWith('blob:');
    
    console.log(`Loading sample: ${sample.name} from ${isUserFileBlob ? 'blob URL' : 'file path'}`);
      
    const player = new Tone.Player(sample.file).toDestination();
    
    // Store the player once Tone signals it's loaded.
    // Tone.loaded() can be used, or player.loaded
    await Tone.loaded(); // Wait for this specific player to load its data.

    loadedSamples.set(sample.id, player);
    console.log(`Sample ${sample.name} loaded and cached.`);
    
    // Set a special property on the player to track our own loaded state (optional, Tone.Player has 'loaded' property)
    // const playerObj = loadedSamples.get(sample.id);
    // if (playerObj) {
    //   // @ts-ignore - Adding custom property
    //   playerObj._isReady = true; // Or use player.loaded
    // }
  } catch (error) {
    console.error(`Error in loadSample for ${sample.name}:`, error);
    // Fallback: Create a silent Tone.Player if loading fails, to prevent crashes.
    const fallbackPlayer = new Tone.Player(Tone.context.createBuffer(1, 1, Tone.context.sampleRate)).toDestination();
    loadedSamples.set(sample.id, fallbackPlayer);
  }
};

// Play a sample with processing and improved handling for user samples
export const playSample = (sampleId: string, settings: ProcessorSettings): void => {
  let bufferToPlay: AudioBuffer | undefined;

  if (slicedBufferCache.has(sampleId)) {
    bufferToPlay = slicedBufferCache.get(sampleId);
  } else {
    const player = loadedSamples.get(sampleId);
    if (player && player.loaded && player.buffer) {
      bufferToPlay = player.buffer.get() as AudioBuffer; 
    }
  }

  if (bufferToPlay) {
    const context = getAudioContext();
    const source = context.createBufferSource();
    source.buffer = bufferToPlay;

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(Tone.dbToGain(settings.volume), context.currentTime);
    
    source.connect(gainNode).connect(context.destination);
   
    const playbackRate = Math.pow(2, settings.pitch / 12);
    source.playbackRate.value = playbackRate;

    const effectiveSampleStart = settings.sampleStart ?? 0;
    // Ensure sampleEnd is not beyond buffer duration, and if undefined, use buffer duration
    let effectiveSampleEnd = settings.sampleEnd ?? bufferToPlay.duration;
    effectiveSampleEnd = Math.min(effectiveSampleEnd, bufferToPlay.duration);

    // Ensure start is before end
    if (effectiveSampleStart >= effectiveSampleEnd) {
        console.warn("Sample start time is at or after end time. Not playing.");
        return;
    }
    
    let playDuration = (effectiveSampleEnd - effectiveSampleStart) / (playbackRate || 1);
    if (playDuration < 0) playDuration = 0;

    if (settings.loop) {
      source.loop = true;
      const effectiveLoopStart = settings.loopStart ?? effectiveSampleStart;
      const effectiveLoopEnd = settings.loopEnd ?? effectiveSampleEnd;

      source.loopStart = Math.max(0, effectiveLoopStart);
      source.loopEnd = Math.min(bufferToPlay.duration, effectiveLoopEnd);
      
      if (source.loopStart >= source.loopEnd) {
        source.loop = false; 
        console.warn("Loop disabled: loopStart >= loopEnd. Playing as one-shot.");
        // Play as one-shot if loop points invalid
        const audibleDuration = Math.min(playDuration, settings.decay);
        if (audibleDuration <= 0) { console.warn("Audible duration is zero for one-shot after loop disable."); return; }
        gainNode.gain.linearRampToValueAtTime(0.0001, context.currentTime + audibleDuration);
        source.start(context.currentTime, effectiveSampleStart, playDuration);
        source.stop(context.currentTime + audibleDuration + 0.1);
      } else {
        source.start(context.currentTime, effectiveSampleStart); // Loop indefinitely from offset
        // Looping sounds do not automatically decay or stop here; they need explicit stop handling (e.g., pad retrigger)
      }
    } else { // One-shot
      source.loop = false;
      const audibleDuration = Math.min(playDuration, settings.decay);
      if (audibleDuration <= 0) { console.warn("Audible duration is zero for one-shot."); return; }

      gainNode.gain.linearRampToValueAtTime(0.0001, context.currentTime + audibleDuration);
      source.start(context.currentTime, effectiveSampleStart, playDuration); // Play the segment once
      source.stop(context.currentTime + audibleDuration + 0.1); 
    }
    
  } else {
    console.warn(`Sample ID "${sampleId}" not found for immediate playback.`);
  }
};

// Schedule a sample to play at a specific time with improved handling and sequence timing protection
export const scheduleSample = (sampleId: string, time: number, settings: ProcessorSettings): void => {
   let bufferToPlay: AudioBuffer | undefined;

   if (slicedBufferCache.has(sampleId)) {
       bufferToPlay = slicedBufferCache.get(sampleId);
   } else {
       const player = loadedSamples.get(sampleId);
       if (player && player.loaded && player.buffer) {
           bufferToPlay = player.buffer.get() as AudioBuffer;
       }
   }

   if (bufferToPlay) {
       const context = getAudioContext();
       const source = context.createBufferSource();
       source.buffer = bufferToPlay;

       const gainNode = context.createGain();
       gainNode.gain.setValueAtTime(Tone.dbToGain(settings.volume), time);

       source.connect(gainNode).connect(context.destination);
       
       const playbackRate = Math.pow(2, settings.pitch / 12);
       source.playbackRate.value = playbackRate;

       const effectiveSampleStart = settings.sampleStart ?? 0;
       let effectiveSampleEnd = settings.sampleEnd ?? bufferToPlay.duration;
       effectiveSampleEnd = Math.min(effectiveSampleEnd, bufferToPlay.duration);

       if (effectiveSampleStart >= effectiveSampleEnd) {
           // console.warn(`Scheduled sample ${sampleId}: start time is at or after end time. Not playing.`); // Can be noisy
           return;
       }

       let playDuration = (effectiveSampleEnd - effectiveSampleStart) / (playbackRate || 1);
       if (playDuration < 0) playDuration = 0;

       if (settings.loop) {
           source.loop = true;
           const effectiveLoopStart = settings.loopStart ?? effectiveSampleStart;
           const effectiveLoopEnd = settings.loopEnd ?? effectiveSampleEnd;
           source.loopStart = Math.max(0, effectiveLoopStart);
           source.loopEnd = Math.min(bufferToPlay.duration, effectiveLoopEnd);

           if (source.loopStart >= source.loopEnd) {
               source.loop = false; // Play as one-shot if loop points invalid
           }
           
           // For scheduled "loops", we play one iteration of the loop segment as a compromise.
           // True sustained looping would require a note-off mechanism in the sequencer.
           if(source.loop) {
               let loopSegmentDuration = (source.loopEnd - source.loopStart) / (playbackRate || 1);
               if (loopSegmentDuration <= 0) { // Should have been caught by loopStart >= loopEnd, but double check
                  source.loop = false; // Fallback to one-shot logic
               } else {
                  source.start(time, source.loopStart, loopSegmentDuration); // Play one loop segment
                  const audibleDuration = Math.min(loopSegmentDuration, settings.decay);
                  if (audibleDuration <=0) { return; }
                  gainNode.gain.linearRampToValueAtTime(0.0001, time + audibleDuration);
                  source.stop(time + audibleDuration + 0.1);
                  return; // Explicit return after handling scheduled loop segment
               }
           }
       }
       
       // Fallthrough for one-shot (if loop was false initially, or became false due to invalid points)
       source.loop = false;
       const audibleDuration = Math.min(playDuration, settings.decay);
       if (audibleDuration <=0) { /* console.warn(`Scheduled sample ${sampleId} audible duration is zero.`); */ return; }

       gainNode.gain.linearRampToValueAtTime(0.0001, time + audibleDuration);
       source.start(time, effectiveSampleStart, playDuration); // Play the segment once
       source.stop(time + audibleDuration + 0.1);
       
   } else {
       // console.warn(`Scheduled sample ID "${sampleId}" not found.`); // Can be noisy
  }
};

// Start the sequencer playback
export const startSequencer = (): void => {
  Tone.Transport.start();
};

// Stop the sequencer playback
export const stopSequencer = (): void => {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
};

// Set the tempo
export const setTempo = (bpm: number): void => {
  Tone.Transport.bpm.value = bpm;
};

// Set the swing amount (0-1)
export const setSwing = (amount: number): void => {
  Tone.Transport.swing = amount;
  Tone.Transport.swingSubdivision = '16n';
};

// MIDI functionality
// We'll implement a system for MIDI recording and events

// Type definitions for MIDI events
export interface MidiEvent {
  id?: string; // Unique identifier for the event
  type: 'noteOn' | 'noteOff' | 'cc';
  note?: number;
  velocity?: number;
  channel?: number;
  controller?: number;
  value?: number;
  timestamp: number;
  ticks?: number;
  // 16 levels mode information
  levelsMode?: 'off' | 'pitch' | 'volume';
  levelsSamplePadId?: number | null;
  levelsPitch?: number; // Pitch adjustment for 16 levels
  levelsVolume?: number; // Volume adjustment for 16 levels
}

// MIDI recording state
let midiRecording = false;
let midiEvents: MidiEvent[] = [];
let recordStartTime = 0;
let recordStartTicks = 0;
let quantizationValue: '4n' | '8n' | '16n' | '32n' | '64n' = '16n'; // Default quantization

// MIDI event callback
type MidiEventCallback = (event: MidiEvent) => void;
const midiEventListeners: MidiEventCallback[] = [];

// Start MIDI recording
export const startMidiRecording = (): void => {
  // Clear existing events
  midiEvents = [];
  
  // Record start time with high precision
  recordStartTime = Tone.now();
  try {
    recordStartTicks = Tone.Transport.ticks;
  } catch (e) {
    // If Transport isn't started, set to 0
    recordStartTicks = 0;
    console.warn('Transport not started, using ticks=0 for MIDI recording');
  }
  
  // Activate recording flag
  midiRecording = true;
  
  // Broadcast to any listeners that we've started recording
  midiEventListeners.forEach(listener => 
    listener({
      id: `midi-system-start-${Date.now()}`,
      type: 'cc',
      controller: 999, // Special controller number for system events
      value: 1, // 1 = recording started
      timestamp: recordStartTime,
      ticks: 0
    })
  );
  
  console.log('MIDI recording started at', recordStartTime, 'ticks:', recordStartTicks);
};

// Stop MIDI recording and return recorded events
export const stopMidiRecording = (): MidiEvent[] => {
  if (!midiRecording) {
    console.log('MIDI recording was not active');
    return [];
  }
  
  // Stop recording
  midiRecording = false;
  
  // Calculate the stop time and ticks
  const stopTime = Tone.now();
  let stopTicks;
  try {
    stopTicks = Tone.Transport.ticks;
  } catch (e) {
    // If Transport isn't started, use elapsed time
    stopTicks = recordStartTicks + ((stopTime - recordStartTime) * 1000);
  }
  
  // Calculate the total duration
  const recordingDuration = stopTime - recordStartTime;
  const ticksDuration = stopTicks - recordStartTicks;
  
  // Notify listeners that recording has stopped
  midiEventListeners.forEach(listener => 
    listener({
      id: `midi-system-${Date.now()}`,
      type: 'cc',
      controller: 999, // Special controller number for system events
      value: 0, // 0 = recording stopped
      timestamp: stopTime,
      ticks: ticksDuration
    })
  );
  
  console.log(
    `MIDI recording stopped after ${recordingDuration.toFixed(2)}s, ` +
    `${ticksDuration.toFixed(0)} ticks, captured ${midiEvents.length} events`
  );
  
  // Return a copy of the events
  return [...midiEvents];
};

// Set quantization value for MIDI recording
export const setMidiQuantization = (value: '4n' | '8n' | '16n' | '32n' | '64n'): void => {
  quantizationValue = value;
  console.log(`MIDI quantization set to ${value}`);
};

// Record a MIDI event
export const recordMidiEvent = (event: Omit<MidiEvent, 'timestamp' | 'ticks'>): void => {
  if (!midiRecording) {
    console.warn('Attempted to record MIDI event but recording is not active');
    return;
  }
  
  // Calculate current time and tick position
  const now = Tone.now();
  let currentTicks;
  
  try {
    // Try to get ticks from Tone.Transport
    currentTicks = Tone.Transport.ticks;
  } catch (e) {
    // Calculate ticks based on elapsed time if Transport fails
    currentTicks = recordStartTicks + ((now - recordStartTime) * 1000);
  }
  
  // Calculate tick offset from start of recording
  const rawTickOffset = currentTicks - recordStartTicks;
  
  // Optionally quantize the tick position based on current quantization
  let tickOffset = rawTickOffset;
  if (quantizationValue !== '64n') { // Only quantize if not at finest resolution
    const ticksPerBeat = Tone.Ticks('4n').toTicks();
    const ticksPerQuantizeStep = Tone.Ticks(quantizationValue).toTicks();
    const quantizedStep = Math.round(rawTickOffset / ticksPerQuantizeStep);
    tickOffset = quantizedStep * ticksPerQuantizeStep;
  }
  
  // Create a unique ID for the event that includes event type
  const eventType = event.type || 'unknown';
  const eventId = `midi-${Date.now()}-${eventType}-${Math.floor(Math.random() * 10000)}`;
  
  // Create the complete event with timing information
  const completeEvent: MidiEvent = {
    ...event,
    id: eventId, // Add a unique ID to the event
    timestamp: now,
    ticks: tickOffset
  };
  
  // Add to events array
  midiEvents.push(completeEvent);
  
  // Notify listeners
  midiEventListeners.forEach(listener => listener(completeEvent));
  
  console.log(`Recorded MIDI ${event.type} event at ${tickOffset} ticks`);
};

// Register a callback for MIDI events
export const onMidiEvent = (callback: MidiEventCallback): (() => void) => {
  // Add callback to listeners
  midiEventListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = midiEventListeners.indexOf(callback);
    if (index !== -1) {
      midiEventListeners.splice(index, 1);
      console.log('MIDI event listener removed');
    }
  };
};

// Get all current MIDI events
export const getMidiEvents = (): MidiEvent[] => {
  return [...midiEvents]; // Return a copy
};

// Clear all MIDI events
export const clearMidiEvents = (): void => {
  midiEvents = [];
  console.log('MIDI events cleared');
};

// We need to expose the setupMetronome function
let setupMetronomeFunc: (() => void) | null = null;

// Toggle metronome on/off with safer implementation
export const toggleMetronome = (enabled: boolean): void => {
  // Update the state
  isMetronomeEnabled = enabled;
  console.log(`Metronome ${enabled ? 'enabled' : 'disabled'}`);
  
  // Create the metronome sounds if they don't exist
  if (!metronomeHighClick) {
    metronomeHighClick = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    metronomeHighClick.volume.value = -10; // Make it louder
  }
  
  if (!metronomeLowClick) {
    metronomeLowClick = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    metronomeLowClick.volume.value = -12; // Make it louder
  }
  
  // If enabled, play a test click to verify
  if (enabled) {
    metronomeHighClick.triggerAttackRelease('C6', '16n');
  }
  
  // Setup the metronome sequence
  setupNewMetronome();
};

// Create a new dedicated function for setting up the metronome
let metronomeEvent: number | null = null;

const setupNewMetronome = () => {
  // Clear any existing metronome events if they exist
  if (metronomeEvent !== null) {
    Tone.Transport.clear(metronomeEvent);
    metronomeEvent = null;
  }
  
  // Set up a new sequence with proper metronome clicks
  metronomeEvent = Tone.Transport.scheduleRepeat(time => {
    if (isMetronomeEnabled) {
      try {
        // Get current beat position in a safer way
        let beat = 0;
        
        try {
          // Use the safer way of getting position as string
          const positionStr = Tone.Transport.position.toString();
          // Parse the string format "bars:beats:sixteenths"
          const parts = positionStr.split(':');
          if (parts.length > 1) {
            beat = parseInt(parts[1], 10) || 0;
          }
        } catch (e) {
          // If that fails, calculate beat from seconds
          const seconds = Tone.Transport.seconds;
          const bpm = Tone.Transport.bpm.value;
          const beatsPerSecond = bpm / 60;
          const currentBeat = (seconds * beatsPerSecond) % 4;
          beat = Math.floor(currentBeat);
        }
        
        // Play high click on first beat of the bar, low click on others
        if (beat === 0) {
          metronomeHighClick?.triggerAttackRelease('C6', '32n', time);
        } else {
          metronomeLowClick?.triggerAttackRelease('G5', '32n', time);
        }
      } catch (err) {
        // Don't log the error every time to avoid console spam
      }
    }
  }, '4n');
  
  // We don't need to call setupMetronomeFunc here as we're not clearing
  // all Transport events anymore, just updating the metronome
};


// Directly add a pre-loaded user sample to the samples map
export const loadUserSample = (sampleId: string, player: Tone.Player): void => {
  loadedSamples.set(sampleId, player);
  console.log(`User sample ${sampleId} directly loaded into sample map`);
};

// Export the audio engine functions for use in 16 Levels mode
export const getSampleDuration = (sampleId: string): number | null => {
  if (slicedBufferCache.has(sampleId)) {
    return slicedBufferCache.get(sampleId)!.duration;
  }
  const player = loadedSamples.get(sampleId); // loadedSamples stores Tone.Player
  if (player && player.loaded && player.buffer) { // Check player.buffer directly
    return player.buffer.duration;
  }
  console.warn(`Duration not found for sampleId: ${sampleId}\`);
  return null;
};

const audioEngine = {
  loadSample,
  playSample,
  scheduleSample,
  startSequencer,
  stopSequencer,
  setTempo,
  setSwing,
  toggleMetronome,
  loadUserSample,
  addSlicedBuffer, // Export the new function
  getSampleDuration, // Export new function
  // Add MIDI functions to the exported engine
  startMidiRecording,
  stopMidiRecording,
  recordMidiEvent,
  onMidiEvent,
  clearMidiEvents
};

// Make the audio engine accessible globally for 16 Levels mode to use
declare global {
  interface Window {
    audioEngine: typeof audioEngine;
    // Add new globals for 16 levels mode
    sixteenLevelsMode: 'off' | 'pitch' | 'volume';
    sixteenLevelsSourcePad: number | null;
  }
}

// Attach to window object
if (typeof window !== 'undefined') {
  window.audioEngine = audioEngine;
  
  // Initialize 16 levels global variables
  if (window.sixteenLevelsMode === undefined) {
    window.sixteenLevelsMode = 'off';
  }
  
  if (window.sixteenLevelsSourcePad === undefined) {
    window.sixteenLevelsSourcePad = null;
  }
}

export default audioEngine;

export const getAudioContext = (): AudioContext => {
  if (!Tone.context || !Tone.context.rawContext) {
    console.warn("Tone.js context not available. Attempting to start Tone if not already started by user gesture.");
    // Tone.start() should ideally be called once upon user interaction.
    // Calling it here might be too late or fail if no user gesture has occurred.
    // A robust app structure ensures Tone is started early.
    // For this subtask, we'll assume Tone.context is available or throw if not.
    if (Tone.context && Tone.context.rawContext) {
       return Tone.context.rawContext as AudioContext;
    }
    throw new Error("Tone.js AudioContext not available. Ensure audio is initialized via user interaction.");
  }
  return Tone.context.rawContext as AudioContext;
};
