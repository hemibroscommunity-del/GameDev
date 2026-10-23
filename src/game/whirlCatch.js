/* ═══ v2.3.3577: EVERY MONSTER THE WHIRLWIND WILL CATCH, IN ITS COLOUR ═══
 *
 * The owner: "The indicator that the enemies are within the whirlwind active
 * radius needs to be more obvious.  Maybe change the whole color of the enemy
 * to be in a certain tint of color and make it flash a bit."
 *
 * v2.3.3499 marked each monster the wind-up will catch with rings on the
 * ground at its feet, which the monster's own body stands over.  Now its whole
 * body is drawn in the whirlwind's amber too: the monster's own picture drawn
 * again over it in ONE COLOUR, its light and shade kept (rendering/
 * fillBatch.js), so a caught monster is an amber one you still recognise.  It
 * flashes by BRIGHTNESS -- deep amber to a light, hot amber and back,
 * quicker as the strike comes (a flash every 400 ms as the wind-up starts,
 * every 200 ms at the end: about three and a half in the real one-second
 * wind-up) -- so it is amber at every moment of the flash.
 *
 * NOT A TINT, NOR A FADE.  The first cut multiplied the monster's tint toward
 * the amber, and a tint can only take colour away: a blue slime came out a
 * dark olive and a red fire goblin stayed red (mp-whirltint's pictures).  The
 * second drew a flat amber shape over it, fading from 0.3 to 0.8: at its
 * weakest a blue slime read GREY -- blue mixed toward orange passes through
 * grey -- and at its strongest a flat blob with no shape inside.  Painted in
 * one colour at 0.9, it reads amber in the trough and the peak alike, and the
 * monster's own colours show only a tenth (its hit flash a little more:
 * entityRenderer `_whirlGlow`).
 *
 * effectsRenderer decides who is caught (the worker's own rule: the nearest
 * 16 inside the radius, where they are drawn) and leaves it on the state as
 * S._whirlCatch {ids, t0, until, at}; entityRenderer, which runs first, reads
 * the last frame's answer -- a frame late, a frame never seen.
 *
 * No imports (the server's suites read it). */

/* the whirlwind ring's own amber (effectsRenderer's wind-up, 0xff9a3c): the
   flash's trough */
export const WHIRL_TINT = 0xff9a3c;
/* the flash's peak: a light, hot amber, still saturated (a paler one, the
   ring's own light edge 0xffe0a8, read as beige over a blue slime) */
export const WHIRL_TINT_HI = 0xffcc5c;
/* how much of the monster the amber covers (its own colours show the rest) */
export const WHIRL_GLOW_ALPHA = 0.9;
/* one flash (bright and back) as the wind-up starts, and as it ends */
export const WHIRL_FLASH_START_MS = 400;
export const WHIRL_FLASH_END_MS = 200;

/** How bright the flash is at `now`, 0 (deep amber) .. 1 (light) --
 *  quickening.  1 as the wind-up starts. */
export function whirlFlash01(now, t0, until) {
  const span = Math.max(1, until - t0);
  const a = WHIRL_FLASH_START_MS, b = WHIRL_FLASH_END_MS;
  const el = Math.max(0, now - t0);
  /* the phase is the integral of 1/period over the wind-up, so the flashes
     quicken smoothly instead of jumping as the period shrinks */
  const phase = (b === a) ? el / a : (span / (b - a)) * Math.log((a + (b - a) * Math.min(1, el / span)) / a);
  return 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
}

/** The amber at flash brightness `f` (0..1): WHIRL_TINT to WHIRL_TINT_HI. */
export function whirlTintAt(f) {
  const k = f > 0 ? (f < 1 ? f : 1) : 0;
  const lo = WHIRL_TINT, hi = WHIRL_TINT_HI;
  const ch = (s) => Math.round(((lo >> s) & 255) + (((hi >> s) & 255) - ((lo >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** The flash's brightness over monster `m` (0..1), or -1 when the whirlwind
 *  is not about to catch it.  Only while the wind-up is on (S._whirlWindup,
 *  the effects renderer's own test): never by how long ago the catch was
 *  worked out, since a phone drawing a few frames a second has frames further
 *  apart than any such window. */
export function whirlCatchFlash(S, m, now) {
  const c = S && S._whirlCatch;
  if (!c || !m || !c.ids || !c.ids.has(m.id)) return -1;
  if (!S._whirlWindup || now > c.until + 50) return -1;
  return whirlFlash01(now, c.t0, c.until);
}
