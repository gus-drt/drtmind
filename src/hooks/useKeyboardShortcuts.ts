import { useEffect, useCallback, useRef } from 'react';

/**
 * Defines a keyboard shortcut configuration.
 */
export interface KeyboardShortcut {
  /** The key to listen for (e.g., 'k', 'n', 'Escape', 'ArrowUp') */
  key: string;
  /** Whether Ctrl/Cmd key must be pressed */
  ctrl?: boolean;
  /** Whether Shift key must be pressed */
  shift?: boolean;
  /** Whether Alt key must be pressed */
  alt?: boolean;
  /** The action to execute when the shortcut is triggered */
  action: (event: KeyboardEvent) => void;
  /** Human-readable description of the shortcut */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether the shortcut should work when an input/textarea is focused */
  allowInInput?: boolean;
}

/**
 * Options for the useKeyboardShortcuts hook.
 */
interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Element to attach listeners to (defaults to document) */
  target?: HTMLElement | Document | null;
}

/**
 * Detects if the user is on macOS
 */
const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Checks if the currently focused element is an input field
 */
const isInputFocused = (): boolean => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    (activeElement as HTMLElement).isContentEditable
  );
};

/**
 * Hook for registering global keyboard shortcuts.
 * Supports Ctrl/Cmd, Shift, and Alt modifiers.
 * Automatically handles Mac vs Windows/Linux differences.
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, action: () => openSearch(), description: 'Open search' },
 *   { key: 'n', ctrl: true, action: () => createNote(), description: 'New note' },
 *   { key: 'Escape', action: () => closeModal(), description: 'Close modal' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true, target = null } = options;
  const shortcutsRef = useRef(shortcuts);
  
  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const currentShortcuts = shortcutsRef.current;
    
    for (const shortcut of currentShortcuts) {
      // Check if key matches (case-insensitive for letters)
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      if (!keyMatches) continue;

      // Check modifier keys
      // On Mac, use metaKey (Cmd) instead of ctrlKey
      const ctrlPressed = isMac() ? event.metaKey : event.ctrlKey;
      const ctrlMatches = shortcut.ctrl ? ctrlPressed : !ctrlPressed;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      if (!ctrlMatches || !shiftMatches || !altMatches) continue;

      // Check if input is focused and shortcut doesn't allow it
      if (isInputFocused() && !shortcut.allowInInput) {
        // Allow Escape key even in inputs by default
        if (shortcut.key.toLowerCase() !== 'escape') continue;
      }

      // Prevent default if specified
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }

      // Execute the action
      shortcut.action(event);
      return;
    }
  }, [enabled]);

  useEffect(() => {
    const targetElement = target || document;
    
    targetElement.addEventListener('keydown', handleKeyDown as EventListener);
    
    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, target]);
}

/**
 * Returns the correct modifier key symbol for the current platform.
 * Useful for displaying keyboard shortcuts in the UI.
 */
export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Formats a shortcut for display in the UI.
 * @example formatShortcut({ key: 'k', ctrl: true }) => '⌘K' on Mac, 'Ctrl+K' on Windows
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'shift' | 'alt'>): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push(getModifierKey());
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push(isMac() ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());
  
  return isMac() ? parts.join('') : parts.join('+');
}

export default useKeyboardShortcuts;

