import { Pattern, Pad, ProcessorSettings, DrumKit, Sample, TransportSettings } from './types';

export const MPC_PROJECT_VERSION = '1.0';

export interface ProjectData {
  version: string;
  projectName: string;
  kits: DrumKit[];
  patterns: Pattern[];
  samples: Sample[];
  processorSettings: ProcessorSettings[];
  transport: TransportSettings; // tempo, playing, currentStep, swing, quantization
  isMetronomeEnabled: boolean;
  currentKitId: string;
  currentPatternId: number;
  pads: Pad[];
}

const PROJECT_STORAGE_PREFIX = 'mpcProject_';

export const saveProjectToStorage = (projectName: string, projectData: ProjectData): void => {
  localStorage.setItem(PROJECT_STORAGE_PREFIX + projectName, JSON.stringify(projectData));
};

export const loadProjectFromStorage = (projectName: string): ProjectData | null => {
  const projectString = localStorage.getItem(PROJECT_STORAGE_PREFIX + projectName);
  if (projectString) {
    try {
      const projectData = JSON.parse(projectString) as ProjectData;
      // Basic version check, can be expanded later
      if (projectData.version === MPC_PROJECT_VERSION) {
        return projectData;
      } else {
        console.warn(`Project version mismatch for ${projectName}. Expected ${MPC_PROJECT_VERSION}, got ${projectData.version}`);
        // Handle version migration or rejection here if necessary
        return null; // Or attempt migration
      }
    } catch (error) {
      console.error(`Error loading project ${projectName}:`, error);
      return null;
    }
  }
  return null;
};

export const listProjectsFromStorage = (): string[] => {
  const projectNames: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PROJECT_STORAGE_PREFIX)) {
      projectNames.push(key.replace(PROJECT_STORAGE_PREFIX, ''));
    }
  }
  return projectNames;
};

export const deleteProjectFromStorage = (projectName: string): void => {
  localStorage.removeItem(PROJECT_STORAGE_PREFIX + projectName);
};

// LocalStorage keys
const STORAGE_KEYS = {
  PATTERNS: 'drum-machine-patterns',
  CURRENT_PATTERN: 'drum-machine-current-pattern',
  PADS: 'drum-machine-pads',
  CURRENT_KIT: 'drum-machine-current-kit',
  PROCESSOR_SETTINGS: 'drum-machine-processor-settings',
  DRUM_KITS: 'drum-machine-kits',
  TEMPO: 'drum-machine-tempo',
  SWING: 'drum-machine-swing',
  QUANTIZATION: 'drum-machine-quantization'
};

// Save patterns to localStorage
export const savePatterns = (patterns: Pattern[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PATTERNS, JSON.stringify(patterns));
    console.log(`Saved ${patterns.length} patterns to localStorage`);
  } catch (error) {
    console.error('Error saving patterns:', error);
  }
};

// Load patterns from localStorage
export const loadPatterns = (): Pattern[] | null => {
  try {
    const patternsJson = localStorage.getItem(STORAGE_KEYS.PATTERNS);
    if (patternsJson) {
      const patterns = JSON.parse(patternsJson) as Pattern[];
      console.log(`Loaded ${patterns.length} patterns from localStorage`);
      return patterns;
    }
  } catch (error) {
    console.error('Error loading patterns:', error);
  }
  return null;
};

// Save current pattern ID
export const saveCurrentPatternId = (patternId: number): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PATTERN, patternId.toString());
  } catch (error) {
    console.error('Error saving current pattern ID:', error);
  }
};

// Load current pattern ID
export const loadCurrentPatternId = (): number | null => {
  try {
    const patternIdStr = localStorage.getItem(STORAGE_KEYS.CURRENT_PATTERN);
    if (patternIdStr) {
      return parseInt(patternIdStr, 10);
    }
  } catch (error) {
    console.error('Error loading current pattern ID:', error);
  }
  return null;
};

// Save pads configuration
export const savePads = (pads: Pad[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PADS, JSON.stringify(pads));
    console.log(`Saved ${pads.length} pads to localStorage`);
  } catch (error) {
    console.error('Error saving pads:', error);
  }
};

// Load pads configuration
export const loadPads = (): Pad[] | null => {
  try {
    const padsJson = localStorage.getItem(STORAGE_KEYS.PADS);
    if (padsJson) {
      const pads = JSON.parse(padsJson) as Pad[];
      console.log(`Loaded ${pads.length} pads from localStorage`);
      return pads;
    }
  } catch (error) {
    console.error('Error loading pads:', error);
  }
  return null;
};

// Save current kit ID
export const saveCurrentKitId = (kitId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_KIT, kitId);
  } catch (error) {
    console.error('Error saving current kit ID:', error);
  }
};

// Load current kit ID
export const loadCurrentKitId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_KIT);
  } catch (error) {
    console.error('Error loading current kit ID:', error);
  }
  return null;
};

// Save processor settings
export const saveProcessorSettings = (settings: ProcessorSettings[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROCESSOR_SETTINGS, JSON.stringify(settings));
    console.log(`Saved ${settings.length} processor settings to localStorage`);
  } catch (error) {
    console.error('Error saving processor settings:', error);
  }
};

// Load processor settings
export const loadProcessorSettings = (): ProcessorSettings[] | null => {
  try {
    const settingsJson = localStorage.getItem(STORAGE_KEYS.PROCESSOR_SETTINGS);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson) as ProcessorSettings[];
      console.log(`Loaded ${settings.length} processor settings from localStorage`);
      return settings;
    }
  } catch (error) {
    console.error('Error loading processor settings:', error);
  }
  return null;
};

// Save custom drum kits
export const saveDrumKits = (kits: DrumKit[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DRUM_KITS, JSON.stringify(kits));
    console.log(`Saved ${kits.length} drum kits to localStorage`);
  } catch (error) {
    console.error('Error saving drum kits:', error);
  }
};

// Load custom drum kits
export const loadDrumKits = (): DrumKit[] | null => {
  try {
    const kitsJson = localStorage.getItem(STORAGE_KEYS.DRUM_KITS);
    if (kitsJson) {
      const kits = JSON.parse(kitsJson) as DrumKit[];
      console.log(`Loaded ${kits.length} drum kits from localStorage`);
      return kits;
    }
  } catch (error) {
    console.error('Error loading drum kits:', error);
  }
  return null;
};

// Save tempo
export const saveTempo = (tempo: number): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPO, tempo.toString());
  } catch (error) {
    console.error('Error saving tempo:', error);
  }
};

// Load tempo
export const loadTempo = (): number | null => {
  try {
    const tempoStr = localStorage.getItem(STORAGE_KEYS.TEMPO);
    if (tempoStr) {
      return parseInt(tempoStr, 10);
    }
  } catch (error) {
    console.error('Error loading tempo:', error);
  }
  return null;
};

// Save swing
export const saveSwing = (swing: number): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SWING, swing.toString());
  } catch (error) {
    console.error('Error saving swing:', error);
  }
};

// Load swing
export const loadSwing = (): number | null => {
  try {
    const swingStr = localStorage.getItem(STORAGE_KEYS.SWING);
    if (swingStr) {
      return parseInt(swingStr, 10);
    }
  } catch (error) {
    console.error('Error loading swing:', error);
  }
  return null;
};

// Save quantization
export const saveQuantization = (quantization: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUANTIZATION, quantization);
  } catch (error) {
    console.error('Error saving quantization:', error);
  }
};

// Load quantization
export const loadQuantization = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.QUANTIZATION);
  } catch (error) {
    console.error('Error loading quantization:', error);
  }
  return null;
};

// Check if there's any saved data
export const hasSavedData = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEYS.PATTERNS);
};

// Clear all saved data (for debugging or reset)
export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('Cleared all drum machine data from localStorage');
};
