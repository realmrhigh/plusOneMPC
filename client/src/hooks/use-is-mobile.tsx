import { useState, useEffect } from 'react';

/**
 * A hook that detects if the current device is a mobile device based on screen width
 * @param breakpoint - The screen width threshold below which a device is considered mobile (default: 768px)
 * @returns A boolean indicating whether the device is considered mobile
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Initial check
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Set initial value
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
