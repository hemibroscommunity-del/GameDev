/* ═══ v2.3.3766: THE RED PIN AND THE BLUE PIN ═══
 *
 * The owner, of the Town Hall's board (data/townBoard.js): "pin drop you can
 * put on the map to go to the one you want (two pins can be active at once -
 * red pin and blue pin)".
 *
 * A pin is the board's ID of a place (a row of BOARD), never a position: the
 * place is found where it stands each time it is drawn (game/mapPinPlaces.js),
 * so a pin follows the game's own data and no coordinate is ever stored.
 *   - "Red pin" on a page puts the red pin THERE, moving it from wherever it
 *     was; the same for blue.  The same press where it already is lifts it.
 *   - Both can be up at once, even on one place.
 *   - They stay until lifted (the orchestrator's recommendation; the owner
 *     can change it), per character: localStorage `bt_pins:<id>`.
 * Read by the board (its tiles wear their pins), the Wheel's minimap
 * (rendering/systems/wheelMinimap.js) and the world map (WorldMapOverlay.jsx).
 *
 * No imports: a node suite reads it (server/test/town-board.test.mjs).  The
 * storage is passed in, so the suite hands it a Map. */

export const PIN_COLORS = Object.freeze({ red: 0xe0453a, blue: 0x3f86e8 });
export const PIN_CSS = Object.freeze({ red: '#E0453A', blue: '#3F86E8' });
export const PIN_KEYS = Object.freeze(['red', 'blue']);

const KEY = 'bt_pins:';
const ID_RE = /^[a-z0-9-]{1,40}$/;

function storeOf(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}
function rd(st, k) { try { return st ? (typeof st.getItem === 'function' ? st.getItem(k) : st.get(k)) : null; } catch (e) { return null; } }
function wr(st, k, v) { try { if (st) { if (typeof st.setItem === 'function') st.setItem(k, v); else st.set(k, v); } } catch (e) { /* private mode: the pins last the visit */ } }

/* the character's pins, kept on S so a frame never reads storage */
function slot(S) {
  if (!S) return null;
  const who = typeof S.myId === 'string' && S.myId ? S.myId : '';
  if (!S._mapPins || S._mapPins.who !== who) S._mapPins = { who, red: null, blue: null, loaded: false, v: 0 };
  return S._mapPins;
}

/** Load the character's pins (once a character; again after a change of id).
 *  `isPlace(id)` says an id is still a row of the board: one that is not is
 *  dropped (a row taken off the board leaves no pin to nowhere). */
export function loadPins(S, storage, isPlace) {
  const p = slot(S);
  if (!p || p.loaded) return p;
  p.loaded = true;
  if (!p.who) return p;
  let o = null;
  try { o = JSON.parse(rd(storeOf(storage), KEY + p.who) || 'null'); } catch (e) { o = null; }
  for (const k of PIN_KEYS) {
    const id = o && typeof o[k] === 'string' && ID_RE.test(o[k]) ? o[k] : null;
    p[k] = id && (!isPlace || isPlace(id)) ? id : null;
  }
  p.v++;
  return p;
}

/** { red, blue }: the place ids the pins are on (null: lifted). */
export function pinsOf(S) {
  const p = slot(S);
  return p ? { red: p.red, blue: p.blue } : { red: null, blue: null };
}

/** A counter that moves at every change (the maps redraw only on a change). */
export function pinsVersion(S) {
  const p = slot(S);
  return p ? p.v : 0;
}

/** Press "Red pin" (or blue) on place `id`: put it there, or lift it if it is
 *  there already.  Returns the pin's place after the press (null: lifted). */
export function togglePin(S, color, id, storage) {
  const p = slot(S);
  if (!p || PIN_KEYS.indexOf(color) < 0 || typeof id !== 'string' || !ID_RE.test(id)) return p ? p[color] || null : null;
  p[color] = p[color] === id ? null : id;
  p.v++;
  if (p.who) wr(storeOf(storage), KEY + p.who, JSON.stringify({ red: p.red, blue: p.blue }));
  return p[color];
}

/** Which pins are on place `id`: [] or ['red'], ['blue'], ['red', 'blue']. */
export function pinsOn(S, id) {
  const p = slot(S);
  return p ? PIN_KEYS.filter((k) => p[k] === id) : [];
}
