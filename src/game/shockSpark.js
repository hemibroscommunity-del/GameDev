/* ═══ v2.3.3518: A SHOCK'S SPARK, DRAWN ═══
 *
 * The owner's decision 13 (docs/GEM-PLAN.md, Phase 4, "All of that sounds
 * good"): a hit on a monster a storm gem has shocked sparks to the nearest
 * other monster within 150 px, for a quarter of the hit.  The worker does it
 * (server/src/combat.js _shockSpark) and its monster_hit names the monster the
 * spark leapt FROM (`spark`); the number itself is drawn like any other hit
 * (gameEvents.js, in the storm's blue).
 *
 * This draws the leap from the one monster's chest to the other's: a bolt
 * of lightning for SPARK_ARC_MS -- S._sparkArcs, which the effects renderer
 * strokes every frame with a fresh jag, a pale core over a wide blue glow
 * (effectsRenderer, beside the hit particles; the storm monster's own arc on
 * a player is drawn the same way) -- and a crackle of sparks along it, into
 * S.hitParticles.  Both are drawn in code into the particles layer, so there
 * is nothing new to load, make or free.  "A debuff you cannot see is not a
 * mechanic" (elemental.js, fracture).
 *
 * No imports, so a node test can run it. */

export const SPARK_COLOURS = Object.freeze(['#fff7b0', '#9fd8ff', '#ffffff']);
/* how far apart the two ends may be: the worker's 150 px reach, plus what
   each monster walked since; past it the ids are stale and nothing is drawn */
export const SPARK_MAX_PX = 400;
/* how high a monster's chest is over the point it stands on */
export const SPARK_CHEST_DY = 26;
/* how long the bolt is drawn, and how many bolts may be up at once */
export const SPARK_ARC_MS = 320;
export const SPARK_ARC_MAX = 16;

/* A jagged line from (x0, y0) to (x1, y1): its ends fixed, every point
   between pushed off the line by up to `amp`, one every ~14 px. */
export function sparkZigzag(x0, y0, x1, y1, rnd, amp) {
  const r = typeof rnd === 'function' ? rnd : Math.random;
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.sqrt(dx * dx + dy * dy) || 1;
  const n = Math.max(3, Math.round(L / 14));
  const a = typeof amp === 'number' ? amp : 8;
  const nx = -dy / L, ny = dx / L;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const t = i / n, o = (r() - 0.5) * 2 * a;
    pts.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]);
  }
  pts.push([x1, y1]);
  return pts;
}

const fin = (v) => typeof v === 'number' && isFinite(v);

/* Draw a spark from monster `from` to monster `to` (each {x, y}, the drawn
   renderX/renderY when they have them).  Returns the sparks drawn. */
export function sparkLine(S, from, to, rnd) {
  if (!S || !from || !to) return 0;
  const r = typeof rnd === 'function' ? rnd : Math.random;
  const fx = fin(from.renderX) ? from.renderX : from.x;
  const fy0 = fin(from.renderY) ? from.renderY : from.y;
  const tx = fin(to.renderX) ? to.renderX : to.x;
  const ty0 = fin(to.renderY) ? to.renderY : to.y;
  if (!fin(fx) || !fin(fy0) || !fin(tx) || !fin(ty0)) return 0;
  const fy = fy0 - SPARK_CHEST_DY, ty = ty0 - SPARK_CHEST_DY;
  const dx = tx - fx, dy = ty - fy;
  const L = Math.sqrt(dx * dx + dy * dy);
  if (!(L > 1) || L > SPARK_MAX_PX) return 0;
  /* the bolt, struck from the two chests, its jag drawn fresh each frame */
  if (!Array.isArray(S._sparkArcs)) S._sparkArcs = [];
  S._sparkArcs.push({ x0: fx, y0: fy, x1: tx, y1: ty, ts: Date.now(), dur: SPARK_ARC_MS });
  if (S._sparkArcs.length > SPARK_ARC_MAX) S._sparkArcs.splice(0, S._sparkArcs.length - SPARK_ARC_MAX);
  if (!Array.isArray(S.hitParticles)) S.hitParticles = [];
  const parts = S.hitParticles;
  /* one spark every ~7 px, 10 to 24 of them, each pushed off the line to
     alternate sides so the line zigzags like the storm monster's own arcs;
     4-6 world px and about a third of a second (a dot loses 0.04 of its life
     a frame and shrinks only in its last third), so a phone held at arm's
     length sees the leap, not a speck */
  const n = Math.max(10, Math.min(24, Math.round(L / 7)));
  const nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = (i === 0 || i === n) ? 0 : (i % 2 ? 1 : -1) * (3 + r() * 7);
    parts.push({
      x: fx + dx * t + nx * off, y: fy + dy * t + ny * off,
      vx: (r() - 0.5) * 0.5, vy: -0.3 - r() * 0.3,
      life: 0.7 + r() * 0.2,
      color: SPARK_COLOURS[i % SPARK_COLOURS.length],
      size: 4 + r() * 2,
    });
  }
  return n + 1;
}
