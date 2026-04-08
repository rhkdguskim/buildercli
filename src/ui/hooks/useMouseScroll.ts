import { useEffect, useRef } from 'react';

/**
 * Enables mouse wheel scrolling in the terminal.
 * Listens for SGR mouse escape sequences on stdin.
 *
 * IMPORTANT: Mouse mode is enabled/disabled in main.tsx ONLY.
 * This hook only listens for events — no escape sequences written here.
 */
export function useMouseScroll(onScroll: (direction: 1 | -1) => void, isActive: boolean = true) {
  const callbackRef = useRef(onScroll);
  callbackRef.current = onScroll;

  useEffect(() => {
    if (!isActive || !process.stdin.isTTY) return;

    const onData = (data: Buffer) => {
      const str = data.toString();

      // SGR mouse format: \x1b[<button;x;yM or \x1b[<button;x;ym
      // Button 64 = scroll up, Button 65 = scroll down
      const sgrMatch = str.match(/\x1b\[<(\d+);\d+;\d+[Mm]/);
      if (sgrMatch) {
        const button = parseInt(sgrMatch[1]!, 10);
        if (button === 64) { callbackRef.current(-1); return; }
        if (button === 65) { callbackRef.current(1); return; }
      }

      // Legacy mouse format
      if (str.startsWith('\x1b[M') && str.length >= 6) {
        const button = str.charCodeAt(3) - 32;
        if (button === 96) { callbackRef.current(-1); return; }
        if (button === 97) { callbackRef.current(1); return; }
      }
    };

    process.stdin.on('data', onData);
    return () => { process.stdin.off('data', onData); };
  }, [isActive]); // Only re-run when isActive changes, NOT on every callback change
}
