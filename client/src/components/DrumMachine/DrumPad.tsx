import React, { useState, useRef, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { getSampleById } from '@/lib/samples';
import { useIsMobile } from '@/hooks/use-is-mobile';
import * as THREE from 'three';

interface DrumPadProps {
  padId: number;
  keyLabel: string;
  sampleId: string | null;
  position: [number, number];
  isActive: boolean;
  hasActiveTrack: boolean; // Whether this pad has a track in the current pattern
  isMetronomeActive: boolean; // Whether the metronome is active and clicking
  onTrigger: (padId: number) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  padId,
  keyLabel,
  sampleId,
  position,
  isActive,
  hasActiveTrack = false, // Default to false if not provided
  isMetronomeActive = false, // Default to false if not provided
  onTrigger,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [localPressed, setLocalPressed] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const isMobile = useIsMobile();
  
  // Get sample details or assign special colors for pads 12-16
  const sample = getSampleById(sampleId);
  
  // Special colors for pads 12-16
  const specialColors = {
    12: '#e91e63', // Pink
    13: '#9c27b0', // Purple
    14: '#3f51b5', // Indigo
    15: '#009688'  // Teal
  };
  
  // Use special color for pads 12-16, sample color if available, or default gray
  const padColor = padId >= 12 && padId <= 15 ? 
    specialColors[padId as keyof typeof specialColors] : 
    (sample ? sample.color : '#666666');
  
  // Refs for red edge components
  const edgeRef = useRef<THREE.Mesh>(null);
  
  // Animation for pad press/release and edge color changes
  useFrame(({clock}) => {
    if (!meshRef.current || !edgeRef.current) return;
    
    // For 2D pads, we'll use slight scale reduction to show press
    // The pad starts at full size (0.888) and gets smaller when pressed
    const targetScale = isActive || localPressed ? 0.855 : 0.888; // Increased by another 7%
    
    // Apply smooth animation to scale for pad press effect
    meshRef.current.scale.x = THREE.MathUtils.lerp(
      meshRef.current.scale.x,
      targetScale, 
      0.3
    );
    
    meshRef.current.scale.y = THREE.MathUtils.lerp(
      meshRef.current.scale.y,
      targetScale, 
      0.3
    );
    
    // Edge color effects for 2D pads
    if (edgeRef.current.material) {
      const edgeMaterial = edgeRef.current.material as THREE.MeshLambertMaterial;
      
      if (isActive || localPressed) {
        // When pad is pressed, change border to sample color
        edgeMaterial.color.set(padColor);
        edgeMaterial.emissive.set(padColor);
        edgeMaterial.emissiveIntensity = 0.8; // Strong glow when active
      } else if (isMetronomeActive && hasActiveTrack) {
        // When metronome is active on a pad with a track in pattern
        edgeMaterial.color.set(padColor);
        edgeMaterial.emissive.set(padColor);
        edgeMaterial.emissiveIntensity = 0.6; // Medium glow for metronome
      } else {
        // Default state - red border matching background
        edgeMaterial.color.set('#770000');
        edgeMaterial.emissive.set('#550000');
        edgeMaterial.emissiveIntensity = 0.4; // Subtle glow at rest
      }
    }
    
    // Also change the pad color slightly when pressed for better feedback
    if (meshRef.current.material) {
      const padMaterial = meshRef.current.material as THREE.MeshLambertMaterial;
      
      if (isActive || localPressed) {
        // Lighter when pressed for better feedback
        padMaterial.color.set('#444444');
        padMaterial.emissive.set('#222222');
        padMaterial.emissiveIntensity = 0.2; // Slight glow when pressed
      } else {
        // Default dark gray
        padMaterial.color.set('#333333');
        padMaterial.emissive.set('#000000');
        padMaterial.emissiveIntensity = 0; // No glow at rest
      }
    }
  });
  
  // We're no longer using glow intensity since the translucent layer was removed
  // But keep the useEffect to maintain compatibility with the component's state
  useEffect(() => {
    let timeout: number;
    if (isActive) {
      // Keep the state change but we don't render anything with it now
      setGlowIntensity(1);
      timeout = window.setTimeout(() => {
        setGlowIntensity(0);
      }, 150);
    }
    return () => clearTimeout(timeout);
  }, [isActive]);
  
  // Metronome click effect - Only for pads with active tracks
  useEffect(() => {
    // The metronome effect is now handled directly in the mesh material
    // We'll just output debug info when it activates
    if (isMetronomeActive && hasActiveTrack) {
      console.log(`Pad ${padId} metronome flashing (has active track)`); // Debug
    }
  }, [isMetronomeActive, hasActiveTrack, padId]);

  // Handle pointer events
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setLocalPressed(true);
    onTrigger(padId);
  };
  
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setLocalPressed(false);
  };
  
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setLocalPressed(false);
    setHovered(false);
  };
  
  return (
    <group position={[position[0], position[1], 0]}>
      {/* Removed pad base/background layer */}
      
      {/* All glow effects removed - we're using a simpler approach with just the edge color changes */}
      
      {/* Border first - positioned behind the pad with proper depth */}
      <mesh
        ref={edgeRef}
        position={[0, 0, -0.05]} /* Increased separation from pad */
        rotation={[0, 0, 0]}
        scale={[0.92, 0.92, 1]} /* Increased by 7% to match new pad size */
      >
        <planeGeometry args={[1, 1]} />
        <meshLambertMaterial 
          color="#770000"
          emissive="#550000"
          emissiveIntensity={0.4}
          depthWrite={true}
          transparent={false}
        />
      </mesh>
      
      {/* 2D pad on top of border */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[0.888, 0.888, 1]} /* Increased by another 7% as requested */
        userData={{ padId }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerOver={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
        <meshLambertMaterial 
          color={'#333333'}
          emissive={'#000000'}
          emissiveIntensity={0}
          depthWrite={true}
          transparent={false}
          polygonOffset={true}
          polygonOffsetFactor={-1}
        />
      </mesh>
      
      {/* Additional seam removed for better alignment */}
      
      {/* Grid lines removed as requested */}
      
      {/* No text labels as per requirements */}
    </group>
  );
};

export default DrumPad;
