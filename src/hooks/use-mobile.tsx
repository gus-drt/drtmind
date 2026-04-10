import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsMediumScreen() {
  const [isMedium, setIsMedium] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Medium screen: > mobile breakpoint and <= 1024px
    const checkMedium = () => window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth <= 1024;
    
    setIsMedium(checkMedium());
    
    const mqlMobile = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const mqlDesktop = window.matchMedia(`(max-width: 1024px)`);
    
    const onChange = () => {
      setIsMedium(checkMedium());
    };
    
    mqlMobile.addEventListener("change", onChange);
    mqlDesktop.addEventListener("change", onChange);
    
    return () => {
      mqlMobile.removeEventListener("change", onChange);
      mqlDesktop.removeEventListener("change", onChange);
    };
  }, []);

  return !!isMedium;
}
