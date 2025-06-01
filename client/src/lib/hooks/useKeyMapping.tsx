import { useEffect } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { useIsMobile } from '@/hooks/use-is-mobile';

/**
 * Custom hook for handling keyboard mapping to trigger drum pads
 */
export function useKeyMapping(
  onTriggerPad: (padId: number) => void
) {
  const { pads } = useDrumMachineStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Skip key mapping on mobile devices to improve performance
    if (isMobile) return;
    
    // Handler for key down events
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key repeats
      if (event.repeat) return;
      
      // Find the pad that matches the key code
      const pad = pads.find(p => p.keyCode === event.code);
      
      if (pad) {
        // Prevent default behavior (e.g., scrolling with space)
        event.preventDefault();
        
        // Trigger the pad
        onTriggerPad(pad.id);
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pads, onTriggerPad, isMobile]);
}
