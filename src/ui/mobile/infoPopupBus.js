/* Tiny pub/sub for the explainer popup.  Same 13-line shape as
   controlsTutorialBus / heroSectionBus / bagFilterBus -- the house pattern
   for "one overlay, opened from somewhere else in the tree".

   v2.3.2131.  Owner: "get rid of the xp numbers in the 3 combat skills and
   put them as some kind of pop up when you tap on it.  Also more pop ups for
   things users want to learn more about on the character equip menu (labels
   tapped on and such)."

   ONE bus for both, because they are one feature: a player tapping a thing
   they do not understand and being told what it is.  Two overlays with two
   buses would drift in wording, sizing and dismissal the first time either
   was touched. */

let _open = null;   /* { title, body, note, action } | null */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const infoPopupBus = {
  /** open({ title, body, note?, action? }) -- action is { label, run }. */
  open(payload) { _open = payload || null; emit(); },
  close() { _open = null; emit(); },
  current() { return _open; },
  isOpen() { return !!_open; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/* QA handle, in the house style (__btCtlTut, __btCoach): the popup is opened
   from inside a React tree with no URL and no keyboard path, and a scenario
   has to be able to see what it is showing without scraping the card that
   opened it. */
try {
  if (typeof window !== 'undefined') window.__btInfoPopup = infoPopupBus;
} catch (_e) {}
