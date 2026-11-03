/* ═══ v2.3.4045: TWO MAP PINS, BLUE AND RED, WITH A LINE TO EACH ═══
 *
 * The owner: "Add a line path when you drop pins on your minimap. When you
 * get near the pin (in game) make a window pop up asking if you want to remove
 * pin. A no just makes it stay up until you drop a new pin and get close to it
 * again. To turn off the pin just tap it on minimap and choose remove pin. If
 * there's already 2 pins on map ask if you want to remove one of the pins
 * (give choice of which to remove - blue or red)."
 *
 * ONE pin store with TWO slots, BLUE and RED.  It replaces the two that were
 * here before: your own purple pin dropped on the World map (game/dropPin.js,
 * v2.3.3879: one place) and the Town Hall board's red and blue pins
 * (game/mapPins.js, v2.3.3766: a row of the board each).  A slot holds EITHER
 *   - a PLACE {x, y} (game px in the Wheel): a tap on open ground in the World
 *     map drops one in a free slot (blue first); with both full the map asks
 *     "Replace which pin?" (ui/PinCards.jsx); or
 *   - a ROW of the board (its id): the board's Red pin / Blue pin buttons put
 *     one in their own colour, found where it stands each time it is drawn
 *     (game/mapPinPlaces.js boardPlaceAt, passed in as `resolve`), so no
 *     coordinate is ever stored for it.
 * The board's API (loadPins, pinsOf, pinsVersion, togglePin, pinsOn and the
 * colours) is kept as it was, re-exported by game/mapPins.js: pinsOf names
 * only the rows, so a board tile wears a pin only for its own row.
 *
 * ARRIVING (pinArrival): within PIN.ARRIVE_PX of a pin, after being seen
 * further than PIN.LEAVE_PX from it (since it was put there, or since the
 * page loaded), the card asks "You reached the blue pin. Remove it?".
 * "Keep" marks it ASKED, stored with it, and it never asks again; a new pin in
 * that slot starts unasked.  Never while you are fighting (pinsFighting: a
 * blow taken or landed in the last PIN.FIGHT_MS), nor over another card (the
 * card's own rule, ui/PinCards.jsx).
 *
 * The ask bus (pinAsk*): which card is up -- {kind: 'arrive' | 'remove',
 * color} -- for the card and its QA probe; one at a time.
 *
 * Kept per character on this device (localStorage `bt_pins:<id>`), never
 * sent to the worker.  The record keeps the old shape's `red` / `blue` row
 * ids (an older page reads its board pins from it as before) and adds `v: 2`,
 * the places (`at`) and the asked marks (`asked`).  A purple pin left from
 * v2.3.3879 (`bt_droppin:<id>`) is read ONCE as the blue pin (the red if the
 * board's blue is up; dropped if both are), then that key goes.
 * The state lives on S._mapPins (as v2.3.3766 had it: `red` and `blue` are
 * still the row ids, mp-townboard reads them), so a frame never reads storage.
 *
 * `?mappin=0` (mapPinsOn): no dropping, no lines, no cards -- the board's
 * row pins are still drawn, as before this version.
 *
 * No imports: node tests it (server/test/map-pin.test.mjs, town-board.test);
 * the storage, the page's search and the resolver are passed in where a test
 * needs them. */

export const PIN = Object.freeze({
  /* within this of a pin (game px) you have reached it */
  ARRIVE_PX: 160,
  /* ...after being seen further than this from it (a pin dropped where you
     stand asks only once you have walked off and come back) */
  LEAVE_PX: 240,
  /* a blow taken or landed this recently is a fight: no card */
  FIGHT_MS: 5000,
  /* a tap this close to a pin's head (CSS px, on the World map) lifts it */
  HIT_PX: 26,
  /* a tap this close to a pin on the minimap (CSS px of the box at 1x) asks to remove it */
  MINI_HIT_PX: 13,
  /* a press that moved more than this, or lasted longer, is a drag, not a tap */
  TAP_MOVE_PX: 8, TAP_MS: 600,
  MAX: 1e6,   /* a place past this is not a place */
});
export const PIN_COLORS = Object.freeze({ red: 0xe0453a, blue: 0x3f86e8 });
export const PIN_CSS = Object.freeze({ red: '#E0453A', blue: '#3F86E8' });
/* the board's order (its buttons read Red pin, Blue pin) */
export const PIN_KEYS = Object.freeze(['red', 'blue']);
/* the order a dropped pin fills them, and the cards list them */
export const PIN_SLOTS = Object.freeze(['blue', 'red']);
export const PIN_NAME = Object.freeze({ blue: 'Blue', red: 'Red' });

const KEY = 'bt_pins:';
const OLD_DROP = 'bt_droppin:';   /* v2.3.3879's purple pin, read once */
const ID_RE = /^[a-z0-9-]{1,40}$/;

function storeOf(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}
function rd(st, k) { try { return st ? (typeof st.getItem === 'function' ? st.getItem(k) : st.get(k)) : null; } catch (e) { return null; } }
function wr(st, k, v) { try { if (st) { if (typeof st.setItem === 'function') st.setItem(k, v); else st.set(k, v); } } catch (e) { /* private mode: the pins last the visit */ } }
function rm(st, k) { try { if (st) { if (typeof st.removeItem === 'function') st.removeItem(k); else st.delete(k); } } catch (e) { /* fine */ } }
const okNum = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= PIN.MAX;
const okColor = (c) => c === 'red' || c === 'blue';
const okPlace = (o) => !!o && typeof o === 'object' && okNum(o.x) && okNum(o.y);

function readOn(s) {
  try { return new URLSearchParams(s || '').get('mappin') !== '0'; } catch (e) { return true; }
}
/* the page's switch, read once (the maps ask every frame) */
const PAGE_ON = readOn(typeof window !== 'undefined' && window.location ? window.location.search : '');
/** Dropping, the lines and the cards are on for this page (`?mappin=0`
    turns them off); a test passes its own `search`. */
export function mapPinsOn(search) {
  return search !== undefined ? readOn(search) : PAGE_ON;
}

/* the character's pins, kept on S so a frame never reads storage */
function slot(S) {
  if (!S) return null;
  const who = typeof S.myId === 'string' && S.myId ? S.myId : '';
  if (!S._mapPins || S._mapPins.who !== who || !S._mapPins.place) {
    S._mapPins = { who, red: null, blue: null, place: { red: null, blue: null }, asked: { red: false, blue: false },
      armed: { red: false, blue: false }, loaded: false, checked: false, v: 0 };
  }
  return S._mapPins;
}
function save(p, storage) {
  if (!p.who) return;
  wr(storeOf(storage), KEY + p.who, JSON.stringify({ v: 2, red: p.red, blue: p.blue,
    at: { red: p.place.red, blue: p.place.blue }, asked: { red: p.asked.red ? 1 : 0, blue: p.asked.blue ? 1 : 0 } }));
}
/* read once a character (again after a change of id) */
function ld(S, storage) {
  const p = slot(S);
  if (!p || p.loaded) return p;
  p.loaded = true;
  p.v++;
  if (!p.who) return p;
  const st = storeOf(storage);
  let o = null;
  try { o = JSON.parse(rd(st, KEY + p.who) || 'null'); } catch (e) { o = null; }
  if (!o || typeof o !== 'object') o = null;
  for (const k of PIN_KEYS) {
    const id = o && typeof o[k] === 'string' && ID_RE.test(o[k]) ? o[k] : null;
    const at = !id && o && o.v === 2 && o.at && okPlace(o.at[k]) ? { x: Math.round(o.at[k].x), y: Math.round(o.at[k].y) } : null;
    p[k] = id;
    p.place[k] = at;
    p.asked[k] = !!((id || at) && o && o.asked && o.asked[k]);
  }
  /* v2.3.3879's purple pin: the blue pin now (the red if the board's blue is
     up), once -- then its key goes */
  const old = rd(st, OLD_DROP + p.who);
  if (old != null) {
    let q = null;
    try { q = JSON.parse(old); } catch (e) { q = null; }
    if (okPlace(q)) {
      const free = PIN_SLOTS.find((k) => !p[k] && !p.place[k]);
      if (free) { p.place[free] = { x: Math.round(q.x), y: Math.round(q.y) }; p.asked[free] = false; }
    }
    save(p, storage);
    rm(st, OLD_DROP + p.who);
  }
  return p;
}

/* ═══ THE BOARD'S API (v2.3.3766, as game/mapPins.js had it) ═══ */

/** Load the character's pins (once a character; again after a change of id).
 *  `isPlace(id)` says an id is still a row of the board: one that is not is
 *  dropped (a row taken off the board leaves no pin to nowhere). */
export function loadPins(S, storage, isPlace) {
  const p = ld(S, storage);
  if (!p || p.checked || !isPlace) return p;
  p.checked = true;
  for (const k of PIN_KEYS) {
    let ok = true;
    if (p[k]) { try { ok = !!isPlace(p[k]); } catch (e) { ok = false; } }
    if (!ok) { p[k] = null; p.asked[k] = false; p.v++; }
  }
  return p;
}

/** { red, blue }: the board rows the pins are on (null: lifted, or a place). */
export function pinsOf(S) {
  const p = ld(S);
  return p ? { red: p.red, blue: p.blue } : { red: null, blue: null };
}

/** A counter that moves at every change (the maps redraw only on a change). */
export function pinsVersion(S) {
  const p = ld(S);
  return p ? p.v : 0;
}

/** Press "Red pin" (or blue) on board row `id`: put it there (whatever that
 *  colour held), or lift it if it is there already.  Returns the pin's row
 *  after the press (null: lifted). */
export function togglePin(S, color, id, storage) {
  const p = ld(S, storage);
  if (!p || !okColor(color) || typeof id !== 'string' || !ID_RE.test(id)) return p && okColor(color) ? p[color] || null : null;
  if (p[color] === id) p[color] = null;
  else { p[color] = id; p.place[color] = null; }
  p.asked[color] = false;
  p.armed[color] = false;
  p.v++;
  save(p, storage);
  return p[color];
}

/** Which pins are on board row `id`: [] or ['red'], ['blue'], ['red', 'blue']. */
export function pinsOn(S, id) {
  const p = ld(S);
  return p ? PIN_KEYS.filter((k) => p[k] === id) : [];
}

/* ═══ THE TWO SLOTS ═══ */

/** The `color` pin: { color, id, at, asked } (`id` a board row or null, `at`
 *  a stored place or null), or null when that slot is free. */
export function pinOf(S, color, storage) {
  const p = ld(S, storage);
  if (!p || !okColor(color) || (!p[color] && !p.place[color])) return null;
  const at = p.place[color];
  return { color, id: p[color] || null, at: at ? { x: at.x, y: at.y } : null, asked: !!p.asked[color] };
}

/** The colours with a pin up, blue first. */
export function pinsUp(S) {
  const p = ld(S);
  return p ? PIN_SLOTS.filter((k) => !!(p[k] || p.place[k])) : [];
}

/** The slot a dropped pin goes in (blue first), or null when both are up. */
export function freePinSlot(S) {
  const p = ld(S);
  if (!p) return null;
  return PIN_SLOTS.find((k) => !p[k] && !p.place[k]) || null;
}

/** Drop the `color` pin at (x, y), in place of whatever it held; it starts
 *  unasked.  Returns its place, or null if refused. */
export function dropPin(S, color, x, y, storage) {
  const p = ld(S, storage);
  if (!p || !okColor(color) || !okNum(x) || !okNum(y)) return null;
  p.place[color] = { x: Math.round(x), y: Math.round(y) };
  p[color] = null;
  p.asked[color] = false;
  p.armed[color] = false;
  p.v++;
  save(p, storage);
  return { x: p.place[color].x, y: p.place[color].y };
}

/** Lift the `color` pin.  Returns whether there was one. */
export function liftPin(S, color, storage) {
  const p = ld(S, storage);
  if (!p || !okColor(color) || (!p[color] && !p.place[color])) return false;
  p[color] = null;
  p.place[color] = null;
  p.asked[color] = false;
  p.armed[color] = false;
  p.v++;
  save(p, storage);
  return true;
}

/** "Keep": the `color` pin stays and never asks again (until a new one). */
export function markPinAsked(S, color, storage) {
  const p = ld(S, storage);
  if (!p || !okColor(color) || (!p[color] && !p.place[color]) || p.asked[color]) return false;
  p.asked[color] = true;
  p.v++;
  save(p, storage);
  return true;
}

/** Where the `color` pin is now ({x, y}, game px), or null: its own place,
 *  or its board row found by `resolve(id)` (mapPinPlaces.js boardPlaceAt). */
export function pinPlace(S, color, resolve) {
  const p = ld(S);
  if (!p || !okColor(color)) return null;
  const at = p.place[color];
  if (at) return { x: at.x, y: at.y };
  if (!p[color] || typeof resolve !== 'function') return null;
  let q = null;
  try { q = resolve(p[color]); } catch (e) { q = null; }
  return q && Number.isFinite(q.x) && Number.isFinite(q.y) ? { x: q.x, y: q.y } : null;
}

/** In a fight: a blow taken (S.lastDamageTaken) or landed (S._dealtAt,
 *  fightFood.js noteDealt), or a pvp hit (S._pvpAt), in the last FIGHT_MS. */
export function pinsFighting(S, now) {
  if (!S) return false;
  const t = typeof now === 'number' ? now : Date.now();
  const last = Math.max(Number(S.lastDamageTaken) || 0, Number(S._dealtAt) || 0, Number(S._pvpAt) || 0);
  return last > 0 && t - last < PIN.FIGHT_MS;
}

/** The pin you have just reached (its colour, blue first), or null.  `me`
 *  your place; read on the card's clock.  A pin is ARMED once you are seen
 *  further than LEAVE_PX from it, and asks only armed, unasked, and within
 *  ARRIVE_PX.  Being near one never disarms it: the card asks, and its
 *  answer (Remove lifts, Keep marks it asked) settles it. */
export function pinArrival(S, me, resolve) {
  const p = ld(S);
  if (!p || !me || !Number.isFinite(me.x) || !Number.isFinite(me.y)) return null;
  let hit = null;
  for (const k of PIN_SLOTS) {
    if ((!p[k] && !p.place[k]) || p.asked[k]) continue;
    const at = pinPlace(S, k, resolve);
    if (!at) continue;
    const d = Math.hypot(at.x - me.x, at.y - me.y);
    if (d > PIN.LEAVE_PX) p.armed[k] = true;
    else if (!hit && p.armed[k] && d <= PIN.ARRIVE_PX) hit = k;
  }
  return hit;
}

/** How far you are from the `color` pin (game px), or Infinity. */
export function pinDistance(S, color, me, resolve) {
  const at = pinPlace(S, color, resolve);
  return at && me ? Math.hypot(at.x - me.x, at.y - me.y) : Infinity;
}

/** Was the press from (x0, y0) to (x1, y1), `ms` long, a tap (not a drag)? */
export function isMapTap(x0, y0, x1, y1, ms) {
  if (![x0, y0, x1, y1, ms].every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  return Math.hypot(x1 - x0, y1 - y0) <= PIN.TAP_MOVE_PX && ms <= PIN.TAP_MS;
}

/** The pin (colour) whose mark is at (x, y) in the minimap's box (CSS px),
 *  given the marks the box drew (wheelMinimap.js: its probe's `mapPins`,
 *  each {color, x, y, edge} with (x, y) the pin's point, a pin standing
 *  above it unless on the edge), at the box's scale `k`; or null. */
export function miniPinAt(marks, x, y, k) {
  if (!Array.isArray(marks) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const K = Number.isFinite(k) && k > 0 ? k : 1;
  let best = null, bd = Infinity;
  for (const m of marks) {
    if (!m || !okColor(m.color) || !Number.isFinite(m.x) || !Number.isFinite(m.y)) continue;
    /* its head: the pin stands 18 px tall over its point (on the edge, centred) */
    const hy = m.edge ? m.y : m.y - 9 * K;
    const d = Math.hypot(x - m.x, y - hy);
    if (d <= PIN.MINI_HIT_PX * K && d < bd) { bd = d; best = m.color; }
  }
  return best;
}

/* ═══ THE ASK BUS: the card that is up (ui/PinCards.jsx) ═══ */
let _ask = null;
const _subs = new Set();
function emit() { for (const fn of [..._subs]) { try { fn(_ask); } catch (e) { /* a listener's own */ } } }
/** The card that is up: { kind: 'arrive' | 'remove', color }, or null. */
export function pinAskNow() { return _ask; }
/** Put a card up (one at a time: a new one takes the old one's place). */
export function pinAskOpen(kind, color) {
  if ((kind !== 'arrive' && kind !== 'remove') || !okColor(color)) return false;
  _ask = { kind, color };
  emit();
  return true;
}
export function pinAskClose() {
  if (!_ask) return;
  _ask = null;
  emit();
}
export function pinAskSubscribe(fn) {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

/* QA probe (mp-mappin, the UI review): the pins as the game holds them */
try {
  if (typeof window !== 'undefined') {
    const gs = () => (window._gameState && window._gameState.current) || null;
    window.__btMapPin = {
      on: () => mapPinsOn(),
      /* both slots: { blue: {id, at, asked} | null, red: ... } */
      slots: () => { const S = gs(); return S ? { blue: pinOf(S, 'blue'), red: pinOf(S, 'red') } : null; },
      /* the first dropped place (blue first), as v2.3.3879's probe had it */
      at: () => { const S = gs(); if (!S) return null; for (const k of PIN_SLOTS) { const q = pinOf(S, k); if (q && q.at) return q.at; } return null; },
      /* drop at (x, y): in `color`, or a free slot (blue when both are up) */
      set: (x, y, color) => { const S = gs(); return S ? dropPin(S, okColor(color) ? color : (freePinSlot(S) || 'blue'), x, y) : null; },
      lift: (color) => { const S = gs(); return S ? liftPin(S, color) : false; },
      clear: () => { const S = gs(); if (!S) return false; let any = false; for (const k of PIN_SLOTS) any = liftPin(S, k) || any; pinAskClose(); return any; },
      ask: () => (_ask ? { ..._ask } : null),
      open: (kind, color) => pinAskOpen(kind, color),
      close: () => pinAskClose(),
    };
  }
} catch (e) { /* no page */ }
