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

/* v2.3.1803: a QA handle for the one thing that cannot be driven from the
   outside — the overlay is opened from inside a React tree with no URL, no
   keyboard shortcut and no DOM affordance until a menu is already open, and
   mp-ctltut.mjs has to open it to find out whether its steps resolve.  Same
   house pattern as __btWorldProps / __btCoach: a getter on window, no
   behaviour of its own. */
try {
  if (typeof window !== 'undefined') window.__btCtlTut = controlsTutorialBus;
} catch (_e) {}
