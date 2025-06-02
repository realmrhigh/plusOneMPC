// Sample interface
export interface Sample {
  id: string;
  name: string;
  file?: string; // Optional: URL for full samples, not present for slices
  color: string;
  isSlice?: boolean;    // True if this sample is a derived slice
  originalFileName?: string; // Name of the file this slice came from (if applicable)
}

// Pad interface
export interface Pad {
  id: number;
  keyCode: string;
  keyLabel: string;
  sampleId: string | null;
  position: [number, number]; // For 3D positioning
}

// Step in sequencer
export interface Step {
  id: number;
  active: boolean;
}

// Track in sequencer
export interface Track {
  id: number;
  padId: number;
  steps: Step[];
}

// Pattern containing multiple tracks
export interface Pattern {
  id: number;
  name: string;
  tracks: Track[];
}

// Drum kit preset
export interface DrumKit {
  id: string;
  name: string;
  assignments: Array<{
    padId: number;
    sampleId: string;
  }>;
}

// Sample processor settings
export interface ProcessorSettings {
  padId: number;
  volume: number; // in dB
  pitch: number;  // in semitones
  decay: number;  // in seconds
  sampleStart?: number; // Playback start time in seconds from the beginning of the buffer
  sampleEnd?: number;   // Playback end time in seconds from the beginning of the buffer
  loop?: boolean;       // Whether the sample should loop
  loopStart?: number;   // Loop start time in seconds, relative to the beginning of the buffer
  loopEnd?: number;     // Loop end time in seconds, relative to the beginning of the buffer
}

// Quantization values
export type QuantizationValue = "4n" | "8n" | "16n" | "32n" | "64n";

// Transport settings
export interface TransportSettings {
  tempo: number;
  playing: boolean;
  currentStep: number;
  swing: number;
  quantization: QuantizationValue;
}
