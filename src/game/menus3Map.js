/* ═══ v2.3.6867: THE MAP LIGHTS THE TRACKED QUEST WHEN IT OPENS (card MN step 8) ═══
 *
 * The card's "Decided" 7 (docs/design/menus3/DECISIONS.md): "The map lights
 * the tracked quest's pin when it opens."  The World map (WorldMapOverlay.jsx)
 * already draws the quest's gold road to its star -- the tracked quest's
 * first (src/game/questRoute.js) -- at every zoom; under `?menus3` the star is
 * LIT for the first moments the map is open: a gold ring that pulses round it
 * (LIT_MS, a beat every PULSE_MS), and while the star is off the screen the
 * ring stands at the map's edge on the line from the middle toward it, so
 * the eye finds where the road goes.  Then the map is today's.  `?menus3=0`
 * draws nothing new.  The ring rides the map's own 120 ms beat (no frame of
 * its own: the held-page budget).
 *
 * No imports: node's suite reads it (server/test/menus3-codex.test.mjs). */

export const MENUS3_MAP = Object.freeze({
  LIT_MS: 4000,     /* how long the star is lit after the map opens */
  PULSE_MS: 1000,   /* one beat of the ring */
  R0: 12,           /* the ring's radius at the beat's start, CSS px */
  R1: 22,           /* ...and at its end */
  EDGE: 24,         /* the ring's distance from the map's edge while the star is off it */
});

/** The ring now: null once the light is over (or never opened), else
 *  { r, alpha } -- `openedAt` and `now` on the same clock (ms). */
export function mapLit(openedAt, now) {
  const a = Number(openedAt), n = Number(now);
  if (!isFinite(a) || !isFinite(n)) return null;
  const t = n - a;
  if (t < 0 || t >= MENUS3_MAP.LIT_MS) return null;
  const k = (t % MENUS3_MAP.PULSE_MS) / MENUS3_MAP.PULSE_MS;
  const fade = t > MENUS3_MAP.LIT_MS - MENUS3_MAP.PULSE_MS ? (MENUS3_MAP.LIT_MS - t) / MENUS3_MAP.PULSE_MS : 1;
  return { r: MENUS3_MAP.R0 + (MENUS3_MAP.R1 - MENUS3_MAP.R0) * k, alpha: Math.max(0, Math.min(1, (1 - k * 0.7) * fade)) };
}

/** Where the ring stands for a star at (x, y) on a map `w` x `h`: the star
 *  itself while it is on the map (inside `pad`), else the point at `pad`
 *  from the edge on the line from the middle toward it.  { x, y, edge }. */
export function mapEdge(x, y, w, h, pad) {
  const W = Math.max(0, Number(w) || 0), H = Math.max(0, Number(h) || 0);
  const p = Math.max(0, Math.min(Number(pad) || 0, W / 2, H / 2));
  const X = Number(x), Y = Number(y);
  if (!isFinite(X) || !isFinite(Y)) return null;
  if (X >= p && X <= W - p && Y >= p && Y <= H - p) return { x: X, y: Y, edge: false };
  const cx = W / 2, cy = H / 2;
  const dx = X - cx, dy = Y - cy;
  const hx = cx - p, hy = cy - p;
  const s = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity);
  return { x: cx + dx * s, y: cy + dy * s, edge: true };
}
