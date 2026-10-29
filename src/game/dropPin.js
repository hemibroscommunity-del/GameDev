/* ═══ v2.3.3879: YOUR OWN PIN ON THE MAP ═══
 *
 * The owner: "It would also be good to add the ability to drop a pin to the
 * map for where you want to go after opening it. It can be confusing trying to
 * remember where a building is but if you had a pin similar to a star that
 * would help. You just need to also have an easy way to remove it afterwards".
 *
 * ONE pin a character, at a PLACE (game px in the Wheel), unlike the Town
 * Hall board's red and blue pins (game/mapPins.js), which name a row of the
 * board.  A tap on open ground in the World map (ui/WorldMapOverlay.jsx) drops
 * it or moves it there; a tap on it, or the map's "Remove pin", lifts it.  The
 * World map and the Wheel's minimap draw it (purple, the board's pin shape),
 * the minimap on its edge when it is off the box.  Kept per character on this
 * device (localStorage `bt_droppin:<id>`), never sent to the worker.
 * `?mappin=0`: no pin, nothing drawn, for one tab.
 *
 * No imports: node can test it (server/test/map-pin.test.mjs); the storage
 * and the page's search are passed in where a test needs them. */
export const DROP_PIN = Object.freeze({
  COLOR: 0xb45cf0, CSS: '#B45CF0',
  /* a tap this close to the pin (CSS px, on the World map) lifts it */
  HIT_PX: 26,
  /* a press that moved more than this, or lasted longer, is a drag, not a tap */
  TAP_MOVE_PX: 8, TAP_MS: 600,
  MAX: 1e6,   /* a place past this is not a place */
});
const KEY = 'bt_droppin:';
function storeOf(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}
function rd(st, k) { try { return st ? (typeof st.getItem === 'function' ? st.getItem(k) : st.get(k)) : null; } catch (e) { return null; } }
function wr(st, k, v) { try { if (st) { if (typeof st.setItem === 'function') st.setItem(k, v); else st.set(k, v); } } catch (e) { /* private mode: the pin lasts the visit */ } }
function rm(st, k) { try { if (st) { if (typeof st.removeItem === 'function') st.removeItem(k); else st.delete(k); } } catch (e) { /* fine */ } }
const okNum = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= DROP_PIN.MAX;

function readOn(s) {
  try { return new URLSearchParams(s || '').get('mappin') !== '0'; } catch (e) { return true; }
}
/* the page's switch, read once (the maps ask every frame) */
const PAGE_ON = readOn(typeof window !== 'undefined' && window.location ? window.location.search : '');
/** Pins are on for this page (`?mappin=0` turns them off); a test passes
    its own `search`. */
export function dropPinOn(search) {
  return search !== undefined ? readOn(search) : PAGE_ON;
}
/* the character's pin, kept on S so a frame never reads storage */
function slot(S, storage) {
  if (!S) return null;
  const who = typeof S.myId === 'string' && S.myId ? S.myId : '';
  if (!S._dropPin || S._dropPin.who !== who) {
    S._dropPin = { who, at: null, v: 0 };
    if (who) {
      let o = null;
      try { o = JSON.parse(rd(storeOf(storage), KEY + who) || 'null'); } catch (e) { o = null; }
      if (o && okNum(o.x) && okNum(o.y)) S._dropPin.at = { x: Math.round(o.x), y: Math.round(o.y) };
    }
  }
  return S._dropPin;
}
/** The pin's place {x, y}, or null. */
export function dropPinAt(S, storage) {
  const p = slot(S, storage);
  return p && p.at ? { x: p.at.x, y: p.at.y } : null;
}
/** A counter that moves at every change (the maps redraw only on a change). */
export function dropPinVersion(S) {
  const p = slot(S);
  return p ? p.v : 0;
}
/** Drop (or move) the pin at (x, y).  Returns its place, or null if refused. */
export function setDropPin(S, x, y, storage) {
  const p = slot(S, storage);
  if (!p || !okNum(x) || !okNum(y)) return null;
  p.at = { x: Math.round(x), y: Math.round(y) };
  p.v++;
  if (p.who) wr(storeOf(storage), KEY + p.who, JSON.stringify(p.at));
  return { x: p.at.x, y: p.at.y };
}
/** Lift the pin.  Returns whether there was one. */
export function clearDropPin(S, storage) {
  const p = slot(S, storage);
  if (!p || !p.at) return false;
  p.at = null;
  p.v++;
  if (p.who) rm(storeOf(storage), KEY + p.who);
  return true;
}
/** Was the press from (x0, y0) to (x1, y1), `ms` long, a tap (not a drag)? */
export function isMapTap(x0, y0, x1, y1, ms) {
  if (![x0, y0, x1, y1, ms].every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  return Math.hypot(x1 - x0, y1 - y0) <= DROP_PIN.TAP_MOVE_PX && ms <= DROP_PIN.TAP_MS;
}

/* QA probe (mp-mappin): the pin as the game holds it, and whether pins are on */
try {
  if (typeof window !== 'undefined') {
    window.__btMapPin = {
      at: () => { const S = window._gameState && window._gameState.current; return S ? dropPinAt(S) : null; },
      on: () => dropPinOn(),
      /* the UI review (states.mjs world-map-pin) places one by the player */
      set: (x, y) => { const S = window._gameState && window._gameState.current; return S ? setDropPin(S, x, y) : null; },
      clear: () => { const S = window._gameState && window._gameState.current; return S ? clearDropPin(S) : false; },
    };
  }
} catch (e) { /* no page */ }
