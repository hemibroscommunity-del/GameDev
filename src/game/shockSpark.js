/* ═══ v2.3.3517: A SHOCK'S SPARK, DRAWN ═══
 *
 * The owner's decision 13 (docs/GEM-PLAN.md, Phase 4, "All of that sounds
 * good"): a hit on a monster a storm gem has shocked sparks to the nearest
 * other monster within 150 px, for a quarter of the hit.  The worker does it
 * (server/src/combat.js _shockSpark) and its monster_hit names the monster the
 * spark leapt FROM (`spark`); the number itself is drawn like any other hit
 * (gameEvents.js, in the storm's blue).
 *
 * This draws the leap: a crackle of sparks along a jagged line from the one
 * monster's chest to the other's, into S.hitParticles -- the plain dots the
 * effects renderer already draws every frame (effectsRenderer, "Hit
 * particles"), so there is nothing new to load, make or free.  "A debuff you
 * cannot see is not a mechanic" (elemental.js, fracture).
 *
 * No imports, so a node test can run it. */

export const SPARK_COLOURS = Object.freeze(['#fff7b0', '#9fd8ff', '#ffffff']);
/* how far apart the two ends may be: the worker's 150 px reach, plus what
   each monster walked since; past it the ids are stale and nothing is drawn */
export const SPARK_MAX_PX = 400;
/* how high a monster's chest is over the point it stands on */
export const SPARK_CHEST_DY = 26;

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
  if (!Array.isArray(S.hitParticles)) S.hitParticles = [];
  const parts = S.hitParticles;
  /* one spark every ~9 px, 8 to 18 of them, each pushed off the line to
     alternate sides so the line zigzags like the storm monster's own arcs */
  const n = Math.max(8, Math.min(18, Math.round(L / 9)));
  const nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = (i === 0 || i === n) ? 0 : (i % 2 ? 1 : -1) * (3 + r() * 7);
    parts.push({
      x: fx + dx * t + nx * off, y: fy + dy * t + ny * off,
      vx: (r() - 0.5) * 0.8, vy: -0.4 - r() * 0.5,
      life: 0.45 + r() * 0.2,
      color: SPARK_COLOURS[i % SPARK_COLOURS.length],
      size: 3 + r() * 1.5,
    });
  }
  return n + 1;
}
