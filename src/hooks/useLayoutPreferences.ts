import { useState, useEffect, useCallback } from 'react';

/**
 * Layout preferences for the desktop interface.
 */
export interface LayoutPreferences {
  /** Width of the navigation sidebar (in pixels or percentage) */
  navigationWidth: number;
  /** Width of the note list panel (in pixels or percentage) */
  listPanelWidth: number;
  /** Whether the navigation sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Position of the graph panel */
  graphPosition: 'hidden' | 'floating' | 'docked-right' | 'docked-bottom';
  /** Size of the floating graph (width x height in pixels) */
  floatingGraphSize: { width: number; height: number };
  /** Editor display mode */
  editorMode: 'edit' | 'preview' | 'split';
  /** Default editor mode when opening a note */
  defaultEditorMode: 'edit' | 'preview' | 'split';
  /** Whether to show line numbers in editor */
  showLineNumbers: boolean;
  /** Font size for the editor */
  editorFontSize: number;
  /** Persistent state for collapsible sections in NavigationSidebar */
  sidebarSections: {
    quickActions: boolean;
    recent: boolean;
    tags: boolean;
    pinned: boolean;
  };
}

const STORAGE_KEY = 'graphnotes-layout-preferences';

const DEFAULT_PREFERENCES: LayoutPreferences = {
  navigationWidth: 15, // percentage
  listPanelWidth: 20, // percentage
  sidebarCollapsed: false,
  graphPosition: 'floating',
  floatingGraphSize: { width: 320, height: 240 },
  editorMode: 'split',
  defaultEditorMode: 'preview',
  showLineNumbers: false,
  editorFontSize: 14,
  sidebarSections: {
    quickActions: true,
    recent: true,
    tags: true,
    pinned: true,
  },
};

/**
 * Loads preferences from localStorage with fallback to defaults.
 */
function loadPreferences(): LayoutPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    
    const parsed = JSON.parse(stored);
    // Merge with defaults to handle missing properties from older versions
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.warn('Failed to load layout preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Saves preferences to localStorage.
 */
function savePreferences(preferences: LayoutPreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save layout preferences:', error);
  }
}

/**
 * Hook for managing desktop layout preferences with localStorage persistence.
 * 
 * @example
 * ```tsx
 * const { preferences, updatePreferences, resetPreferences } = useLayoutPreferences();
 * 
 * // Update a single preference
 * updatePreferences({ editorMode: 'split' });
 * 
 * // Update multiple preferences
 * updatePreferences({ 
 *   sidebarCollapsed: true,
 *   graphPosition: 'docked-right'
 * });
 * ```
 */
export function useLayoutPreferences() {
  const [preferences, setPreferences] = useState<LayoutPreferences>(() => loadPreferences());

  // Persist changes to localStorage
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const newPrefs = JSON.parse(event.newValue);
          setPreferences({ ...DEFAULT_PREFERENCES, ...newPrefs });
        } catch (error) {
          console.warn('Failed to parse layout preferences from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Update one or more preferences.
   */
  const updatePreferences = useCallback((updates: Partial<LayoutPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Reset all preferences to defaults.
   */
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  /**
   * Toggle sidebar collapsed state.
   */
  const toggleSidebar = useCallback(() => {
    setPreferences((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  /**
   * Cycle through editor modes: edit -> preview -> split -> edit
   */
  const cycleEditorMode = useCallback(() => {
    setPreferences((prev) => {
      const modes: LayoutPreferences['editorMode'][] = ['edit', 'preview', 'split'];
      const currentIndex = modes.indexOf(prev.editorMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...prev, editorMode: modes[nextIndex] };
    });
  }, []);

  /**
   * Cycle through graph positions: hidden -> floating -> docked-right -> docked-bottom -> hidden
   */
  const cycleGraphPosition = useCallback(() => {
    setPreferences((prev) => {
      const positions: LayoutPreferences['graphPosition'][] = ['hidden', 'floating', 'docked-right', 'docked-bottom'];
      const currentIndex = positions.indexOf(prev.graphPosition);
      const nextIndex = (currentIndex + 1) % positions.length;
      return { ...prev, graphPosition: positions[nextIndex] };
    });
  }, []);

  /**
   * Toggle expanded state of a sidebar section
   */
  const toggleSidebarSection = useCallback((section: keyof LayoutPreferences['sidebarSections'], isOpen: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      sidebarSections: {
        ...prev.sidebarSections,
        [section]: isOpen,
      },
    }));
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    toggleSidebar,
    toggleSidebarSection,
    cycleEditorMode,
    cycleGraphPosition,
    defaults: DEFAULT_PREFERENCES,
  };
}

export default useLayoutPreferences;

