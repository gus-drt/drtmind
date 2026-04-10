import { useState, useEffect, useCallback } from 'react';

/**
 * Device type breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1024px
 * - desktop: > 1024px
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceBreakpoints {
  mobile: number;
  tablet: number;
}

const DEFAULT_BREAKPOINTS: DeviceBreakpoints = {
  mobile: 768,
  tablet: 1024,
};

/**
 * Hook that returns the current device type based on window width.
 * Provides more granular control than useIsMobile for adaptive layouts.
 */
export function useDeviceType(breakpoints: DeviceBreakpoints = DEFAULT_BREAKPOINTS): DeviceType {
  const getDeviceType = useCallback((): DeviceType => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < breakpoints.mobile) return 'mobile';
    if (width < breakpoints.tablet) return 'tablet';
    return 'desktop';
  }, [breakpoints.mobile, breakpoints.tablet]);

  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType());

  useEffect(() => {
    const handleResize = () => {
      const newType = getDeviceType();
      setDeviceType((prev) => (prev !== newType ? newType : prev));
    };

    // Set initial value
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [getDeviceType]);

  return deviceType;
}

/**
 * Hook that returns whether the device is considered "desktop" (> tablet breakpoint).
 * Useful for conditionally rendering desktop-specific features.
 */
export function useIsDesktop(breakpoint: number = DEFAULT_BREAKPOINTS.tablet): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= breakpoint;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };

    // Set initial value
    onChange(mql);

    // Modern browsers
    mql.addEventListener('change', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [breakpoint]);

  return isDesktop;
}

/**
 * Hook that returns device capabilities useful for UI decisions.
 */
export function useDeviceCapabilities() {
  const deviceType = useDeviceType();
  
  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    // Touch support detection
    hasTouch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    // Hover support detection
    hasHover: typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
    // Pointer precision detection
    hasFinePointer: typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
  };
}

export default useDeviceType;

