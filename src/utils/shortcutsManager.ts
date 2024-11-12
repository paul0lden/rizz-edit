import { useCallback, useEffect, useMemo, useRef } from "react";
import { Map } from "immutable";
import { useEventBus } from "./useEventbus";

// Define types for better type safety
type ShortcutCallback = () => void;
type ShortcutKeys = {
  key: string;
  mod?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
};

function useShortcutManager() {
  const shortcuts = useRef<Map<string, ShortcutCallback>>(Map());
  const { emit } = useEventBus();

  // Detect OS
  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }, []);

  // normalized modifier key (Command on Mac, Control on others)
  const modKey = isMac ? 'metaKey' : 'ctrlKey';

  const defaultShortcuts = useMemo(
    () => ([
      { keys: { key: 's', mod: true }, callback: () => emit("save", null) },
      { keys: { key: 'z', mod: true }, callback: () => emit("undo", null) },
    ]),
    [emit]
  );

  const createShortcutString = useCallback((keys: ShortcutKeys): string => {
    const parts: string[] = [];
    if (keys.mod) parts.push(isMac ? 'Cmd' : 'Ctrl');
    if (keys.ctrl) parts.push('Ctrl');
    if (keys.alt) parts.push('Alt');
    if (keys.shift) parts.push('Shift');
    parts.push(keys.key.toUpperCase());
    return parts.join('+');
  }, [isMac]);

  const matchesShortcut = useCallback((event: KeyboardEvent, keys: ShortcutKeys): boolean => {
    const matchesMod = keys.mod ? event[modKey] : true;
    const matchesCtrl = keys.ctrl ? event.ctrlKey : !event.ctrlKey;
    const matchesAlt = keys.alt ? event.altKey : !event.altKey;
    const matchesShift = keys.shift ? event.shiftKey : !event.shiftKey;
    const matchesKey = event.key.toLowerCase() === keys.key.toLowerCase();

    return matchesMod && matchesCtrl && matchesAlt && matchesShift && matchesKey;
  }, [modKey]);

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    // Convert the shortcuts Map to an array for iteration
    const shortcutEntries = shortcuts.current.entries();

    for (const [shortcutString, callback] of shortcutEntries) {
      // Parse the shortcut string
      const keys = parseShortcutString(shortcutString);

      if (matchesShortcut(event, keys)) {
        event.preventDefault();
        event.stopPropagation();
        callback();
        return;
      }
    }
  }, [matchesShortcut]);

  const parseShortcutString = (shortcutString: string): ShortcutKeys => {
    const parts = shortcutString.split('+');
    const key = parts.pop()?.toLowerCase() || '';
    return {
      key,
      mod: parts.includes('Cmd') || parts.includes('Ctrl'),
      ctrl: parts.includes('Ctrl'),
      alt: parts.includes('Alt'),
      shift: parts.includes('Shift'),
    };
  };

  const registerShortcut = useCallback((keys: ShortcutKeys, callback: ShortcutCallback) => {
    const shortcutString = createShortcutString(keys);
    shortcuts.current = shortcuts.current.set(shortcutString, callback);
  }, [createShortcutString]);

  const unregisterShortcut = useCallback((keys: ShortcutKeys) => {
    const shortcutString = createShortcutString(keys);
    shortcuts.current = shortcuts.current.delete(shortcutString);
  }, [createShortcutString]);

  useEffect(() => {
    // Register default shortcuts
    defaultShortcuts.forEach(({ keys, callback }) => {
      registerShortcut(keys, callback);
    });

    // Add event listener with 'capture: true' to intercept events before they bubble
    window.addEventListener("keydown", handleKeydown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeydown, { capture: true });
  }, [defaultShortcuts, handleKeydown, registerShortcut]);

  return {
    registerShortcut,
    unregisterShortcut,
    isMac, // Expose this in case consumers need to show different key combinations in UI
  };
}

export default useShortcutManager;
