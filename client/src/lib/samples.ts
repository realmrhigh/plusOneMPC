import { Sample } from './types';

// Define all available samples
export const sampleLibrary: Sample[] = [
  {
    id: 'kick1',
    name: 'Kick 1',
    file: '/sounds/drums/kick.mp3',
    color: '#ff5252'
  },
  {
    id: 'snare1',
    name: 'Snare',
    file: '/sounds/drums/snare.mp3',
    color: '#ffb74d'
  },
  {
    id: 'hat-closed',
    name: 'Closed Hat',
    file: '/sounds/drums/hat-closed.mp3',
    color: '#4caf50'
  },
  {
    id: 'hat-open',
    name: 'Open Hat',
    file: '/sounds/drums/hat-open.mp3',
    color: '#81c784'
  },
  {
    id: 'clap',
    name: 'Clap',
    file: '/sounds/drums/clap.mp3', 
    color: '#64b5f6'
  },
  {
    id: 'tom-low',
    name: 'Low Tom',
    file: '/sounds/drums/tom-low.mp3',
    color: '#9575cd'
  },
  {
    id: 'tom-mid',
    name: 'Mid Tom',
    file: '/sounds/drums/tom-mid.mp3',
    color: '#7986cb'
  },
  {
    id: 'tom-high',
    name: 'High Tom',
    file: '/sounds/drums/tom-high.mp3',
    color: '#4db6ac'
  },
  {
    id: 'rim',
    name: 'Rim Shot',
    file: '/sounds/drums/rim.mp3',
    color: '#f06292'
  },
  {
    id: 'shaker',
    name: 'Shaker',
    file: '/sounds/drums/shaker.mp3',
    color: '#ba68c8'
  },
  {
    id: 'percussion',
    name: 'Percussion',
    file: '/sounds/drums/percussion.mp3',
    color: '#e57373'
  },
  {
    id: 'cowbell',
    name: 'Cowbell',
    file: '/sounds/drums/cowbell.mp3',
    color: '#ffee58'
  }
];

// Default pad layout with keyboard mapping
export const defaultPads = [
  { id: 0, keyCode: 'KeyQ', keyLabel: 'Q', sampleId: 'kick1', position: [-1.8, 1.8] as [number, number] },
  { id: 1, keyCode: 'KeyW', keyLabel: 'W', sampleId: 'snare1', position: [-0.6, 1.8] as [number, number] },
  { id: 2, keyCode: 'KeyE', keyLabel: 'E', sampleId: 'hat-closed', position: [0.6, 1.8] as [number, number] },
  { id: 3, keyCode: 'KeyR', keyLabel: 'R', sampleId: 'hat-open', position: [1.8, 1.8] as [number, number] },
  
  { id: 4, keyCode: 'KeyA', keyLabel: 'A', sampleId: 'clap', position: [-1.8, 0.6] as [number, number] },
  { id: 5, keyCode: 'KeyS', keyLabel: 'S', sampleId: 'tom-low', position: [-0.6, 0.6] as [number, number] },
  { id: 6, keyCode: 'KeyD', keyLabel: 'D', sampleId: 'tom-mid', position: [0.6, 0.6] as [number, number] },
  { id: 7, keyCode: 'KeyF', keyLabel: 'F', sampleId: 'tom-high', position: [1.8, 0.6] as [number, number] },
  
  { id: 8, keyCode: 'KeyZ', keyLabel: 'Z', sampleId: 'rim', position: [-1.8, -0.6] as [number, number] },
  { id: 9, keyCode: 'KeyX', keyLabel: 'X', sampleId: 'shaker', position: [-0.6, -0.6] as [number, number] },
  { id: 10, keyCode: 'KeyC', keyLabel: 'C', sampleId: 'percussion', position: [0.6, -0.6] as [number, number] },
  { id: 11, keyCode: 'KeyV', keyLabel: 'V', sampleId: 'cowbell', position: [1.8, -0.6] as [number, number] },
  
  { id: 12, keyCode: 'Digit1', keyLabel: '1', sampleId: null, position: [-1.8, -1.8] as [number, number] },
  { id: 13, keyCode: 'Digit2', keyLabel: '2', sampleId: null, position: [-0.6, -1.8] as [number, number] },
  { id: 14, keyCode: 'Digit3', keyLabel: '3', sampleId: null, position: [0.6, -1.8] as [number, number] },
  { id: 15, keyCode: 'Digit4', keyLabel: '4', sampleId: null, position: [1.8, -1.8] as [number, number] }
];

// Get sample by ID (from either built-in or user-uploaded samples)
export const getSampleById = (id: string | null): Sample | undefined => {
  if (!id) return undefined;
  
  // Check in built-in samples first
  const builtInSample = sampleLibrary.find(sample => sample.id === id);
  if (builtInSample) return builtInSample;
  
  // If not found, look in user samples from the store
  // This pulls directly from the current state of the store
  try {
    // Get the samples from the store
    const { samples } = require('./stores/useDrumMachine').useDrumMachineStore.getState();
    
    // Look for a user sample with the given ID
    const userSample = samples.find((sample: Sample) => sample.id === id);
    return userSample;
  } catch (error) {
    console.error('Error getting user sample:', error);
    return undefined;
  }
};
