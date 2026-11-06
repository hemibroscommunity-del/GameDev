/* ═══ v2.3.4343: THE FIRST-TIME TEACHING A NEW COMPUTER PLAYER MISSED ═══
 * The owner watched a new player on a computer (2026-11-05): the dashboard
 * stayed up the whole time; the "press E" for a harvest was never seen (the
 * player waited until hp hit 0 and walked off, no message); the way to the
 * other pine trees was not clear; clicking a monster to attack was not
 * obvious; special attacks and the shield were never tried.
 * This file is the PURE half (no imports, node tests it): what is wanted, how
 * often, and the screen sums.  The drawing is ui/deskTeach.js; the big arrow's
 * new lessons are ui/guideArrow.js's.  Remembered per character in
 * localStorage (inside try/catch), a few showings each, never for ever. */

export const HARVEST_TIMES = 3;   /* the E prompt: this many harvests done (or missed, toast only) */
export const ATTACK_TIMES = 3;    /* "Click the monster to attack": this many encounters */
export const LS_TEACH = 'bt_deskTeach:';

export function loadTeach(id) {
  try { const v = JSON.parse(localStorage.getItem(LS_TEACH + id) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
export function saveTeach(id, v) {
  try { localStorage.setItem(LS_TEACH + id, JSON.stringify(v || {})); } catch (e) { /* private window: taught again next time */ }
}
/** the E prompt (and its arrow at the pad) is owed while fewer than HARVEST_TIMES harvests are done */
export function harvestCoachWanted(id) {
  return !!id && (Number(loadTeach(id).harvest) || 0) < HARVEST_TIMES;
}
/** the harvest's window is open: the gesture is wanted now */
export function gestureWanted(S) {
  const ex = S && S._extraction;
  return !!(ex && ex.status === 'ready');
}
/** has this character killed anything (the worker's count rides rpg._compStats) */
export function killedAny(rpg) {
  const c = rpg && rpg._compStats;
  return !!(c && Number(c.monstersKilled) >= 1);
}

/** Where on the screen's edge (padded) a pointer toward (tx, ty) from the
 *  middle sits, and the way it points (radians, 0 = right).  Null when the
 *  target is on the screen (inside the padding) -- nothing to point at. */
export function edgeArrowSpot(vw, vh, tx, ty, pad) {
  const p = pad == null ? 28 : pad;
  if (!(vw > 0 && vh > 0) || !isFinite(tx) || !isFinite(ty)) return null;
  if (tx >= p && tx <= vw - p && ty >= p && ty <= vh - p) return null;
  const cx = vw / 2, cy = vh / 2, dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return null;
  const sx = dx === 0 ? Infinity : (dx > 0 ? (vw - p - cx) : (p - cx)) / dx;
  const sy = dy === 0 ? Infinity : (dy > 0 ? (vh - p - cy) : (p - cy)) / dy;
  const k = Math.min(sx, sy);
  return { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(dy, dx) };
}

/** Is the pointer (mx, my) over one of `rects` ({x, y, r}: a centre and a radius)? */
export function overAny(mx, my, rects) {
  for (const o of rects || []) {
    if (o && Math.hypot(mx - o.x, my - o.y) <= o.r) return o;
  }
  return null;
}
