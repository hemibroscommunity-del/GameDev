/* ═══ v2.3.3825: NO MAN'S LAND EXPLAINED BEFORE YOU STEP IN, ONCE ═══
 *
 * A judge's pass on a computer: a level-1 bro died reading No man's land's
 * explainer -- the badge's InfoPopup (ui/mobile/NmlBadge.jsx openNmlInfo) is a
 * window over a world that keeps running, and he opened it standing among the
 * first quest's slimes, which stand in No man's land since v2.3.3690.
 *
 * So the explainer comes up BY ITSELF ONCE per character, on the safe ground
 * as you near the line -- the one place nothing can hurt you while you read --
 * and the badge opens it later as before.  And while it is open, a hit closes
 * it (the badge's clock: your HP dropped since it opened), so a player who
 * opens it mid-fight is never left reading behind a window.
 *
 * Where the line is: the plan's rings (data/noMansLandRings.js), the worker's
 * own arithmetic -- No man's land starts at the tier `first` (noMansLand.js
 * nmlFirst: tier 1 against a worker with caps.nmlnear, which is the safe
 * ground's edge, SAFE_R; tier 2 against an older one) and never on the safe
 * ground.  "Near" is NEAR px inside it: a few strides, so it comes up before
 * the step, not after.
 *
 * Once per character: remembered in the browser under the character's id (a
 * second phone may show it once more: a reminder, not a cost), and for the
 * page's life whatever the browser keeps.  It imports only the rings, so node
 * can test it (server/test/nml-explain-once.test.mjs).
 */
import { NML, NML_CENTRES } from '../data/noMansLandRings.js';   /* relative: node reads this file too */

export const NML_EXPLAIN = {
  NEAR: 320,                        /* px inside the line it comes up at */
  KEY: 'bt_nml_told_',              /* + the character's id: told once */
};

/** The radius No man's land starts at, round the Wheel's centre. */
export function nmlLineR(long = 1, first = NML.FIRST_TIER) {
  const L = NML_CENTRES[long] ? long : 1;
  return Math.max(NML.SAFE_R, NML.HUB + (Math.max(1, first) - 1) * NML.TIER * L);
}

/** On the safe ground, within NEAR px of the line? */
export function nearNmlLine(x, y, long = 1, first = NML.FIRST_TIER, near = NML_EXPLAIN.NEAR) {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const C = NML_CENTRES[long] || NML_CENTRES[1];
  const r = Math.hypot(x - C[0], y - C[1]);
  const R = nmlLineR(long, first);
  return r < R && r >= R - near;
}

const _told = new Set();   /* this page's, whatever the browser keeps */
function _store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}
/** Has this character been shown it? */
export function nmlToldAlready(id, store = _store()) {
  if (!id) return true;   /* no character yet: never shown to nobody */
  if (_told.has(String(id))) return true;
  try { return !!(store && store.getItem(NML_EXPLAIN.KEY + id)); } catch (e) { return false; }
}
/** Remember it was shown. */
export function nmlMarkTold(id, store = _store()) {
  if (!id) return;
  _told.add(String(id));
  try { if (store) store.setItem(NML_EXPLAIN.KEY + id, '1'); } catch (e) { /* this page remembers */ }
}

/** Should it come up now?  `w` = { live, inWheel, dying, open, x, y, long, first, id }. */
export function nmlExplainDue(w) {
  if (!w || !w.live || !w.inWheel || w.dying || w.open) return false;
  if (!nearNmlLine(w.x, w.y, w.long, w.first)) return false;
  return !nmlToldAlready(w.id, w.store);
}

/** While it is open: a hit closes it -- your HP below what it was when it opened. */
export function nmlExplainHit(hpAtOpen, hp) {
  return typeof hpAtOpen === 'number' && typeof hp === 'number' && hp < hpAtOpen;
}

/* QA (mp-nmlonce): forget a character's "told", as a new phone would */
export function _nmlForget(id, store = _store()) {
  _told.delete(String(id));
  try { if (store) store.removeItem(NML_EXPLAIN.KEY + id); } catch (e) { /* page only */ }
}
