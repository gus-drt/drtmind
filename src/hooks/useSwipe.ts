import { useEffect, useRef, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // minimum distance to trigger swipe
  edgeWidth?: number; // width of edge area for edge swipes
  edgeOnly?: boolean; // only trigger on edge swipes
}

export const useSwipe = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  edgeWidth = 30,
  edgeOnly = false,
}: SwipeOptions) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    
    // Check if touch started from edge
    isEdgeSwipe.current = touch.clientX <= edgeWidth || 
                          touch.clientX >= window.innerWidth - edgeWidth;
  }, [edgeWidth]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Only trigger if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      // Check edge constraint
      if (edgeOnly && !isEdgeSwipe.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (deltaX > 0 && onSwipeRight) {
        // Swiped right (from left edge opens sidebar)
        if (!edgeOnly || touchStartX.current <= edgeWidth) {
          onSwipeRight();
        }
      } else if (deltaX < 0 && onSwipeLeft) {
        // Swiped left (closes sidebar)
        onSwipeLeft();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [threshold, edgeWidth, edgeOnly, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
};
