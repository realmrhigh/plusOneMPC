import React, { useEffect, useState, useRef } from 'react';
import audioEngine from '@/lib/audio';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { useThree, useFrame } from '@react-three/fiber';
import DrumPad from './DrumPad';
import { useKeyMapping } from '@/lib/hooks/useKeyMapping';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Text } from '@react-three/drei';

// 16 Levels Button Component
interface SixteenLevelsButtonProps {
  position: [number, number, number];
  levelsMode: 'off' | 'pitch' | 'volume';
  onToggle: () => void;
}

const SixteenLevelsButton: React.FC<SixteenLevelsButtonProps> = ({ position, levelsMode, onToggle }) => {
  // Colors for different modes
  const getButtonColor = () => {
    switch (levelsMode) {
      case 'pitch': return '#ff5500';
      case 'volume': return '#00aaff';
      default: return '#666666';
    }
  };
  
  // Text label based on mode
  const getButtonLabel = () => {
    switch (levelsMode) {
      case 'pitch': return '16 LEVELS: PITCH';
      case 'volume': return '16 LEVELS: VOLUME';
      default: return '16 LEVELS';
    }
  };
  
  return (
    <group position={position}>
      {/* Button base */}
      <mesh 
        position={[0, 0, -0.05]} 
        onClick={onToggle}
      >
        <boxGeometry args={[2.5, 0.6, 0.1]} />
        <meshStandardMaterial color={getButtonColor()} />
      </mesh>
      
      {/* Button text */}
      <Text
        position={[0, 0, 0.05]}
        fontSize={0.18}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {getButtonLabel()}
      </Text>
    </group>
  );
};

const PadGrid: React.FC = () => {
  const { 
    pads, 
    activePadId, 
    triggerPad, 
    patterns, 
    currentPatternId, 
    transport, 
    isMetronomeEnabled,
    levelsMode,
    toggleLevelsMode,
    levelsSamplePadId
  } = useDrumMachineStore();
  const isMobile = useIsMobile();
  const { camera } = useThree();
  
  // State to track metronome beats
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  
  // Adjust camera for mobile and make pads fill the screen edge-to-edge
  useEffect(() => {
    if (isMobile) {
      camera.position.z = 9; // Adjusted for smaller pads on mobile
    } else {
      camera.position.z = 8; // Adjusted for smaller pads on desktop
    }
  }, [isMobile, camera]);
  
  // Set up keyboard mapping
  useKeyMapping(triggerPad);
  
  // Function to check if a pad has an active track in the current pattern
  const padHasActiveTrack = (padId: number) => {
    if (!patterns || !patterns.length) return false;
    const currentPattern = patterns.find(p => p.id === currentPatternId);
    if (!currentPattern) return false;
    
    const hasTrack = currentPattern.tracks.some(track => 
      track.padId === padId && track.steps.some(step => step.active)
    );
    
    // Debug only when a pad has an active track (to reduce console spam)
    if (hasTrack) {
      console.log(`Pad ${padId} has active track in pattern ${currentPatternId}`);
    }
    
    return hasTrack;
  };
  
  // Previous current step to detect changes
  const prevStepRef = useRef<number>(-1);
  const timeoutRef = useRef<number | null>(null);
  
  // Use frame-based animation for more accurate timing
  useFrame(() => {
    if (isMetronomeEnabled && transport.playing) {
      const currentStep = transport.currentStep;
      
      // Only trigger on step change
      if (prevStepRef.current !== currentStep) {
        prevStepRef.current = currentStep;
        
        // Clear any existing timeout
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }
        
        // Pulse on beat
        setIsMetronomeActive(true);
        console.log(`Metronome beat at step ${currentStep} - pads flashing`); // Debug
        
        // Reset after a short delay
        timeoutRef.current = window.setTimeout(() => {
          setIsMetronomeActive(false);
          timeoutRef.current = null;
        }, 150); // Longer duration for more noticeable flash
      }
    }
  });
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Function to handle pad triggering based on levels mode
  const handleTriggerPad = (padId: number) => {
    if (levelsMode === 'off') {
      // Normal mode - trigger pad directly
      triggerPad(padId);
    } else if (levelsSamplePadId !== null) {
      // Levels mode - play source sample with modifications
      const { pads, processorSettings } = useDrumMachineStore.getState();
      const sourcePad = pads.find(p => p.id === levelsSamplePadId);
      
      if (sourcePad && sourcePad.sampleId) {
        // Calculate the amount of modification based on pad position
        // 16 pads (0-15), each has increasing level of modification
        const modificationAmount = (padId / 15) * 2 - 1; // Range: -1 to 1
        
        // Get base processing settings
        const baseSettings = processorSettings.find(s => s.padId === levelsSamplePadId) || { 
          volume: 0, pitch: 0, decay: 0.5 
        };
        
        // Apply modification based on mode
        if (levelsMode === 'pitch') {
          console.log(`16 Levels: Playing pad with pitch mod ${modificationAmount * 12}`);
          // Apply pitch modification (up to ±12 semitones)
          const pitchMod = modificationAmount * 12;
          audioEngine.playSample(
            sourcePad.sampleId,
            baseSettings.volume,
            baseSettings.pitch + pitchMod,
            baseSettings.decay
          );
        } else if (levelsMode === 'volume') {
          console.log(`16 Levels: Playing pad with volume mod ${modificationAmount}`);
          // Apply volume modification (up to ±24dB)
          const volumeMod = modificationAmount * 24;
          audioEngine.playSample(
            sourcePad.sampleId,
            baseSettings.volume + volumeMod,
            baseSettings.pitch,
            baseSettings.decay
          );
        }
        
        // Set active pad for visual feedback
        useDrumMachineStore.setState({ activePadId: padId });
        
        // Reset active pad after animation time
        setTimeout(() => {
          const { activePadId } = useDrumMachineStore.getState();
          if (activePadId === padId) {
            useDrumMachineStore.setState({ activePadId: null });
          }
        }, 150);
      }
    } else {
      // In levels mode but no source pad selected - select this pad as source
      triggerPad(padId);
    }
  };
  
  return (
    <group position={[0, 1, 0]}> {/* Move entire group up by 1 unit (100px) */}
      {/* 16 Levels button */}
      <SixteenLevelsButton 
        position={[0, 2.75, 0]}
        levelsMode={levelsMode}
        onToggle={toggleLevelsMode}
      />
      
      {/* Drum pads arranged in a 4x4 grid */}
      {pads.map((pad) => (
        <DrumPad
          key={pad.id}
          padId={pad.id}
          keyLabel={pad.keyLabel}
          sampleId={pad.sampleId}
          position={pad.position}
          isActive={activePadId === pad.id}
          hasActiveTrack={padHasActiveTrack(pad.id)}
          isMetronomeActive={isMetronomeActive && isMetronomeEnabled} // Passing metronome state
          onTrigger={handleTriggerPad} // Use our new handler
        />
      ))}
      
      {/* Indicator for source pad in 16 levels mode */}
      {levelsMode !== 'off' && levelsSamplePadId !== null && (
        <mesh
          position={[0, 2.3, 0]}
        >
          <planeGeometry args={[3, 0.4]} />
          <meshStandardMaterial color={levelsMode === 'pitch' ? '#ff5500' : '#00aaff'} />
          <Text
            position={[0, 0, 0.1]}
            fontSize={0.18}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {`SOURCE: PAD ${levelsSamplePadId + 1}`}
          </Text>
        </mesh>
      )}
      
      {/* Akai MPC style border and branding */}
      <mesh position={[0, -3.3, -0.15]} rotation={[0, 0, 0]}>
        <planeGeometry args={[6.5, 0.8]} />
        <meshStandardMaterial color="#770000" />
      </mesh>
      
      {/* Metal accent strip */}
      <mesh position={[0, -3.1, -0.12]} rotation={[0, 0, 0]}>
        <planeGeometry args={[6.8, 0.1]} />
        <meshStandardMaterial 
          color="#999999" 
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* MPC branding text */}
      <group position={[0, -3.3, -0.1]}>
        <Text 
          position={[-2, 0, 0.05]}
          fontSize={0.24}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.1}
          font={undefined} // Use default font
          fontWeight="bold"
        >
          MPC
        </Text>
        <Text 
          position={[2, 0, 0.05]}
          fontSize={0.22}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          ONE+
        </Text>
      </group>
    </group>
  );
};

export default PadGrid;
