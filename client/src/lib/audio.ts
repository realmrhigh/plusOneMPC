import * as Tone from 'tone';
import { Sample } from './types';

// Store loaded samples
const loadedSamples: Map<string, Tone.Player> = new Map();

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
  try {
    // Skip if already loaded
    if (loadedSamples.has(sample.id)) {
      console.log(`Sample ${sample.name} already loaded`);
      return;
    }
    
    // Detect if it's a user sample (from URL.createObjectURL)
    const isUserSample = sample.id.startsWith('user-');
    
    if (isUserSample) {
      console.log(`Loading user sample: ${sample.name}`);
      
      try {
        // For user samples, create a player with the blob URL
        const player = new Tone.Player({
          url: sample.file,
          loop: false,
          autostart: false
        }).toDestination();
        
        // Store the player first so it's available even while loading
        loadedSamples.set(sample.id, player);
        
        // Don't await Tone.loaded() which can be slow
        console.log(`User sample ${sample.name} loading in background`);
      } catch (userSampleError) {
        console.error(`Failed to load user sample ${sample.name}:`, userSampleError);
        
        // Create an empty buffer player as fallback to prevent crashes
        const fallbackBuffer = Tone.context.createBuffer(2, 44100, 44100);
        const fallbackPlayer = new Tone.Player(fallbackBuffer).toDestination();
        loadedSamples.set(sample.id, fallbackPlayer);
      }
    } else {
      // Standard loading for built-in samples
      console.log(`Loading built-in sample: ${sample.name}`);
      
      // For built-in samples, create a buffer filled with a simple sine tone
      // to ensure there's always a valid buffer (avoid "not loaded" issues)
      const sampleDuration = 0.5; // seconds
      const sampleRate = 44100;
      const buffer = Tone.context.createBuffer(2, sampleRate * sampleDuration, sampleRate);
        
      // Fill buffer with sine wave (a simple sound for all built-in samples)
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        const frequency = sample.id === 'kick1' ? 60 : 220; // Lower for kick
        
        for (let i = 0; i < channelData.length; i++) {
          // Simple sine wave envelope
          const t = i / sampleRate;
          const amplitude = Math.exp(-5 * t); // Exponential decay
          channelData[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
        }
      }
      
      // Create player with the buffer
      const player = new Tone.Player(buffer);
      player.toDestination();
      
      // Store the player in the map
      loadedSamples.set(sample.id, player);
      console.log(`Created built-in sample: ${sample.name}`);
      
      // Also start loading the actual sample file in the background
      if (sample.file && !sample.file.startsWith('blob:')) {
        console.log(`Background loading sample file: ${sample.file}`);
        const actualPlayer = new Tone.Player({
          url: sample.file,
          onload: () => {
            console.log(`Updated sample ${sample.name} with loaded file`);
            loadedSamples.set(sample.id, actualPlayer);
          }
        }).toDestination();
      }
    }
    
    // Set a special property on the player to track our own loaded state
    const playerObj = loadedSamples.get(sample.id);
    if (playerObj) {
      // Use a trick to track load state by adding our own property
      // @ts-ignore - Adding custom property
      playerObj._isReady = true;
    }
  } catch (error) {
    // Log error but recover - don't let a sample loading error crash the app
    console.error(`Error in loadSample for ${sample.name}:`, error);
    
    // Create a fallback silent buffer
    const fallbackBuffer = Tone.context.createBuffer(2, 44100, 44100);
    const fallbackPlayer = new Tone.Player(fallbackBuffer).toDestination();
    // @ts-ignore - Adding custom property
    fallbackPlayer._isReady = true;
    loadedSamples.set(sample.id, fallbackPlayer);
  }
};

// Play a sample with processing and improved handling for user samples
export const playSample = (
  sampleId: string, 
  volume: number = 0, 
  pitch: number = 0, 
  decay: number = 1
): void => {
  if (!sampleId || !loadedSamples.has(sampleId)) {
    console.warn(`Sample ${sampleId} not loaded or unavailable`);
    return;
  }

  try {
    // Get the original player
    const player = loadedSamples.get(sampleId)!;
    const isUserSample = sampleId.startsWith('user-');
    
    // Always consider our samples ready to play
    // We create fallbacks for all samples so they're always available
    
    // Log the attempt
    console.log(`Playing sample: ${sampleId}${isUserSample ? ' (user uploaded)' : ''}`);
    
    try {
      // Different handling for user samples vs built-in samples
      if (isUserSample) {
        console.log(`Playing user sample: ${sampleId} with settings - volume:${volume}, pitch:${pitch}, decay:${decay}`);
        
        // For user samples, create a new player to apply fresh settings each time
        // This solves the issue with sliders not responding for user samples
        try {
          // Stop any currently playing instance
          if (player.state === 'started') {
            try {
              player.stop();
            } catch (e) {
              // Ignore errors when stopping
            }
          }
          
          // Create a new player clone with the same buffer but new settings
          const playerClone = new Tone.Player({
            url: player.buffer,
            loop: false,
            volume: volume,
            playbackRate: Math.pow(2, pitch / 12), // Convert semitones to playback rate
          }).toDestination();
          
          // Log the settings being applied
          console.log(`Applied settings to user sample: vol=${volume}dB, pitch=${pitch}st, decay=${decay}s`);
          
          // Play the sample
          const now = Tone.now();
          playerClone.start(now);
          playerClone.stop(now + decay);
          
          // Clean up the clone after playback
          playerClone.onstop = () => {
            setTimeout(() => {
              try {
                playerClone.dispose();
              } catch (disposeError) {
                // Ignore dispose errors
              }
            }, 200);
          };
        } catch (playError) {
          console.error(`Error playing user sample: ${playError}`);
        }
      } else {
        // For built-in samples, use the clone approach which works well
        const playerClone = new Tone.Player({
          url: player.buffer,
          loop: false,
          volume: volume,
          playbackRate: Math.pow(2, pitch / 12), // Convert semitones to playback rate
        }).toDestination();
        
        // Play the sample
        const now = Tone.now();
        playerClone.start(now);
        
        // Apply decay (release the sample after decay time)
        playerClone.stop(now + decay);
        
        // Clean up the clone after playback
        playerClone.onstop = () => {
          setTimeout(() => {
            try {
              playerClone.dispose();
              console.log(`Disposed player for ${sampleId}`);
            } catch (disposeError) {
              console.warn(`Error disposing player for ${sampleId}:`, disposeError);
            }
          }, 200);
        };
      }
    } catch (playbackError) {
      console.error(`Error in playback for sample ${sampleId}:`, playbackError);
    }
  } catch (error) {
    console.error(`Error preparing sample ${sampleId}:`, error);
  }
};

// Schedule a sample to play at a specific time with improved handling and sequence timing protection
export const scheduleSample = (
  sampleId: string,
  time: number,
  volume: number = 0,
  pitch: number = 0,
  decay: number = 1
): void => {
  if (!sampleId || !loadedSamples.has(sampleId)) {
    // Silently fail for sequencer
    return;
  }

  try {
    // Safety check to prevent scheduling in the past
    const now = Tone.now();
    if (time < now) {
      time = now + 0.01; // Small offset to prevent errors
    }
    
    const player = loadedSamples.get(sampleId)!;
    const isUserSample = sampleId.startsWith('user-');
    
    // Create a new player with the buffer and fresh settings
    // This approach works for both user samples and built-in samples
    const tempPlayer = new Tone.Player({
      url: player.buffer,
      volume: volume,
      playbackRate: Math.pow(2, pitch / 12), // Convert semitones to playback rate
    }).toDestination();
    
    // Schedule the sample
    tempPlayer.start(time);
    tempPlayer.stop(time + decay);
    
    // Clean up after playback
    tempPlayer.onstop = () => {
      setTimeout(() => {
        tempPlayer.dispose();
      }, 200);
    };
  } catch (error) {
    console.error(`Error scheduling sample ${sampleId}:`, error);
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
