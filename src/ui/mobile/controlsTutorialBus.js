/* Tiny pub/sub for the controls-tutorial overlay.  open/close + subscribe
   pattern, matches the rest of the bottom-dashboard buses. */

let _open = false;
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const controlsTutorialBus = {
  open()  { _open = true;  emit(); },
  close() { _open = false; emit(); },
  isOpen() { return _open; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
