/* ═══ WHICH CAPE THIS PLAYER IS WEARING (v2.3.2023) ═══
 *
 * The same shape as headwearCatalog: an active id, persisted, with listeners
 * so the renderer swaps textures on the next frame.
 *
 * A CAPE IS NOT A TRAIT YOU PICK.  Headwear is chosen in the creator and its
 * catalog is the list of everything anyone may wear.  A cape is a PRIZE — the
 * contest in docs/specs/cape-and-contest.md awards one for a 1-in-200 drop —
 * so the list here is what EXISTS, and whether a given player may wear one is
 * a server fact granted to the persistent `bp_` identity, not something this
 * module decides.  Keeping that distinction in a comment now, because the
 * cheap version of this file is a picker, and a picker is how a contest prize
 * ends up on everybody.
 */
const STORAGE_KEY = 'bt_cape';

export const CAPE_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'crimson', name: 'Crimson Cape' },
];

const _listeners = [];
let _active = 'none';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && CAPE_CATALOG.some(c => c.id === saved)) _active = saved;
} catch (e) { /* private mode: default to none */ }

export function getCape() { return _active; }

export function setCape(id) {
  if (id === _active) return;
  if (!CAPE_CATALOG.some(c => c.id === id)) return;   /* unknown id: ignore, never render a missing texture */
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

export function onCapeChange(fn) {
  _listeners.push(fn);
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}
