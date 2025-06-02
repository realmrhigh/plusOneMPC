import { DrumKit, Pattern } from './types';

// Available kit presets
export const kitPresets: DrumKit[] = [
  {
    id: 'basic',
    name: 'Basic Kit',
    assignments: [
      { padId: 0, sampleId: 'kick1' },
      { padId: 1, sampleId: 'snare1' },
      { padId: 2, sampleId: 'hat-closed' },
      { padId: 3, sampleId: 'hat-open' },
      { padId: 4, sampleId: 'clap' },
      { padId: 5, sampleId: 'tom-low' },
      { padId: 6, sampleId: 'tom-mid' },
      { padId: 7, sampleId: 'tom-high' },
      { padId: 8, sampleId: 'rim' },
      { padId: 9, sampleId: 'shaker' },
      { padId: 10, sampleId: 'percussion' },
      { padId: 11, sampleId: 'cowbell' },
      { padId: 12, sampleId: null },
      { padId: 13, sampleId: null },
      { padId: 14, sampleId: null },
      { padId: 15, sampleId: null }
    ]
  },
  {
    id: 'hiphop',
    name: 'Hip Hop',
    assignments: [
      { padId: 0, sampleId: 'kick1' },
      { padId: 1, sampleId: 'snare1' },
      { padId: 2, sampleId: 'hat-closed' },
      { padId: 3, sampleId: 'hat-open' },
      { padId: 4, sampleId: 'clap' },
      { padId: 5, sampleId: 'tom-low' },
      { padId: 6, sampleId: 'shaker' },
      { padId: 7, sampleId: 'percussion' },
      { padId: 8, sampleId: 'kick1' },
      { padId: 9, sampleId: 'snare1' },
      { padId: 10, sampleId: 'hat-closed' },
      { padId: 11, sampleId: 'cowbell' },
      { padId: 12, sampleId: 'rim' },
      { padId: 13, sampleId: 'tom-mid' },
      { padId: 14, sampleId: 'tom-high' },
      { padId: 15, sampleId: 'hat-open' }
    ]
  },
  {
    id: 'electronic',
    name: 'Electronic',
    assignments: [
      { padId: 0, sampleId: 'kick1' },
      { padId: 1, sampleId: 'snare1' },
      { padId: 2, sampleId: 'hat-closed' },
      { padId: 3, sampleId: 'clap' },
      { padId: 4, sampleId: 'hat-open' },
      { padId: 5, sampleId: 'shaker' },
      { padId: 6, sampleId: 'kick1' },
      { padId: 7, sampleId: 'snare1' },
      { padId: 8, sampleId: 'hat-closed' },
      { padId: 9, sampleId: 'percussion' },
      { padId: 10, sampleId: 'tom-low' },
      { padId: 11, sampleId: 'tom-mid' },
      { padId: 12, sampleId: 'tom-high' },
      { padId: 13, sampleId: 'rim' },
      { padId: 14, sampleId: 'cowbell' },
      { padId: 15, sampleId: 'percussion' }
    ]
  }
];

// Create default empty pattern with 16 steps
export const createEmptyPattern = (id: number, name: string): Pattern => {
  const tracks = Array.from({ length: 16 }, (_, trackIndex) => {
    return {
      id: trackIndex,
      padId: trackIndex,
      steps: Array.from({ length: 16 }, (_, stepIndex) => ({
        id: stepIndex,
        active: false
      }))
    };
  });

  return {
    id,
    name,
    tracks
  };
};

// Some default patterns
export const defaultPatterns: Pattern[] = [
  createEmptyPattern(1, 'Empty Pattern'),
  {
    id: 2,
    name: 'Basic Beat',
    tracks: Array.from({ length: 16 }, (_, trackIndex) => {
      const steps = Array.from({ length: 16 }, (_, stepIndex) => ({
        id: stepIndex,
        active: false
      }));
      
      // Create a basic pattern
      if (trackIndex === 0) { // Kick
        steps[0].active = true;
        steps[8].active = true;
      } else if (trackIndex === 1) { // Snare
        steps[4].active = true;
        steps[12].active = true;
      } else if (trackIndex === 2) { // Closed hat
        steps[0].active = true;
        steps[2].active = true;
        steps[4].active = true;
        steps[6].active = true;
        steps[8].active = true;
        steps[10].active = true;
        steps[12].active = true;
        steps[14].active = true;
      }
      
      return {
        id: trackIndex,
        padId: trackIndex,
        steps
      };
    })
  }
];
