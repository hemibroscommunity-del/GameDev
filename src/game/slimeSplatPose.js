/**
 * slimeSplatPose.js -- v2.3.4127: the shape of a slime's splat over time
 * (src/rendering/slimeSplat.js draws it; server/test/death-zones.test.mjs
 * reads it).  No imports, so node can test it.
 *
 * The owner: "remove the chunks form the electric slime death (and any other
 * chunks like that from slime deaths - doesn't match the art aesthetic."  The
 * slime opens on the hit's squash (as every death does), flattens about its
 * foot into a splat a third wider and a sixth of its height, and fades.
 */
export const SPLAT_MS = 520;        /* the whole death, fade included */
export const SPLAT_BEAT_MS = 110;   /* the hit's squash, as every death opens */
export const SPLAT_FLAT_MS = 300;   /* flat by here, then it fades */

const ease = (k) => 1 - (1 - k) * (1 - k);

/** The splat at `t` ms: x and y scale against the live body (about its foot)
 *  and alpha. */
export function splatPose(t) {
  if (!(t > 0)) return { sx: 1, sy: 1, a: 1 };
  if (t < SPLAT_BEAT_MS) {
    const k = ease(t / SPLAT_BEAT_MS);
    return { sx: 1 + 0.16 * k, sy: 1 - 0.2 * k, a: 1 };
  }
  if (t < SPLAT_FLAT_MS) {
    const k = ease((t - SPLAT_BEAT_MS) / (SPLAT_FLAT_MS - SPLAT_BEAT_MS));
    return { sx: 1.16 + 0.34 * k, sy: 0.8 - 0.62 * k, a: 1 };
  }
  const k = Math.min(1, (t - SPLAT_FLAT_MS) / (SPLAT_MS - SPLAT_FLAT_MS));
  return { sx: 1.5 + 0.1 * k, sy: 0.18 - 0.04 * k, a: Math.max(0, 1 - k) };
}
