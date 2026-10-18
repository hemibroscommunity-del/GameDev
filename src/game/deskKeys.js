/* ═══ v2.3.3358: A COMPUTER'S KEYS, AND THE LETTERS THAT SHOW THEM ═══
   The owner: "For computer usage if there's a key that makes sense to use for
   a certain action just put the letter next to the icon or action in a
   tasteful way."

   ONE TABLE, READ BY BOTH SIDES.  desktopControls.js binds each key, and the
   button that does the same thing wears its letter -- `data-key` on the
   button, drawn by game.css only under a mouse (`@media (pointer:fine)`), so a
   phone never shows one and a letter can never promise one thing while its
   key does another.  The letter is CSS's generated content, never a text
   node: quest scenarios read the cards' words (QuestOfferPanel's note), and a
   letter in the DOM would have put "J" into them.

   THE LETTERS.  The ones PC games give these places, kept clear of every key
   the game already uses (WASD, Q E R F G T V X C H, Tab, 1-3, Space, Shift,
   Esc): B the bag (the dashboard at rest), P your character, J the quest
   journal, L life skills, K the codex (between those two on the home row), O
   more (options); M the world map.  Each opens its page, and pressed again
   closes it, as games do.  Enter presses a dialogue's own button (Next,
   Accept Quest) -- `data-enter`; Esc a window's ✕ -- `data-esc`.

   NEVER WITH Ctrl, Cmd OR Alt: those are the browser's (Ctrl+P prints, Cmd+L
   is the address bar, Ctrl+J the downloads).  Nothing here imports React:
   NavRail reads NAV_KEYS. */
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { dashMinBus } from '@/ui/mobile/dashMinBus.js';
import { playIsLandscape } from '@/ui/mobile/playViewport.js';

/** The dashboard's six buttons (BottomDashboard RAIL_ITEMS ids) -> a letter. */
export const NAV_KEYS = Object.freeze({
  dashboard: 'B', hero: 'P', quests: 'J', skills: 'L', encyclopedia: 'K', more: 'O',
});
/** The world map (WorldMapOverlay.jsx), from the Wheel's minimap. */
export const MAP_KEY = 'M';

const NAV_BY_CODE = Object.create(null);
Object.keys(NAV_KEYS).forEach(function (id) { NAV_BY_CODE['Key' + NAV_KEYS[id]] = id; });

/** KeyboardEvent.code -> the dashboard destination its key opens, or null. */
export function navIdForCode(code) {
  return (typeof code === 'string' && NAV_BY_CODE[code]) || null;
}

/** A browser's own shortcut (Ctrl, Cmd or Alt held): never the game's. */
export function browserChord(e) {
  return !!(e && (e.ctrlKey || e.metaKey || e.altKey));
}

/**
 * What a destination's key does: what a tap on its button does (NavRail),
 * and pressed with its page already open, closes it (a toggle, as the keys
 * of a game's windows are).  B is the bag: with a page open it goes back to
 * the band at rest -- where the bag is -- and at rest it folds the band away
 * or brings it back (the CLOSE / OPEN pill's job).  Sideways the bag is the
 * side column's 'dashboard' page (NavRail's v2.3.2158 rule).
 */
export function navKey(id) {
  const bus = dashboardPanelBus;
  const open = bus.state.mode === 'expanded';
  if (id === 'dashboard') {
    if (playIsLandscape()) {
      if (open && bus.root() === 'dashboard') bus.toBar();
      else bus.open('dashboard');
      return;
    }
    if (open) { bus.toBar(); dashMinBus.set(false); return; }
    dashMinBus.set(!dashMinBus.min);
    return;
  }
  if (open && bus.root() === id) bus.toBar();
  else bus.open(id);
}

/**
 * The control IN FRONT that matches `sel`: on the screen, and a press at its
 * middle reaches it -- nothing drawn over it (a window over a window hides the
 * one behind's ✕ under its scrim).  The last such in the page's order, which
 * paints over the ones before it.  null when there is none.
 */
export function frontControl(sel, doc) {
  doc = doc || (typeof document !== 'undefined' ? document : null);
  if (!doc || !doc.querySelectorAll) return null;
  const vw = typeof innerWidth === 'number' ? innerWidth : 0;
  const vh = typeof innerHeight === 'number' ? innerHeight : 0;
  let front = null;
  const list = doc.querySelectorAll(sel);
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
    const at = doc.elementFromPoint(x, y);
    if (at && (at === el || el.contains(at))) front = el;
  }
  return front;
}

/**
 * Press `el` as a mouse would.  A click, unless it says `data-esc="up"`: the
 * two ✕s that act on pointerup (ItemDetailPopup, InfoPopup -- a click there
 * does nothing) get the pointer's press and release instead.
 */
export function pressControl(el) {
  if (!el) return false;
  if (el.getAttribute && el.getAttribute('data-esc') === 'up' && typeof PointerEvent === 'function') {
    const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    return true;
  }
  if (typeof el.click === 'function') { el.click(); return true; }
  return false;
}

/** What Esc presses: a window's ✕ (or its "Not now"). */
export const ESC_SEL = '[data-esc], .bt-inspect-close';
/** What Enter presses: a dialogue's own button. */
export const ENTER_SEL = '[data-enter]';
