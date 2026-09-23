/* ═══ v2.3.2710: WHICH WAY EACH MAP'S SUN THROWS A SHADOW ═══
 *
 * Owner: "I'm wondering if you can enhance the art in the game just using your
 * code abilities.  Maybe subtle shadowing to make things pop."
 *
 * The one rule this table exists to keep is WORLD-DEPTH-PLAN §15: "A tree
 * should not cast a visual shadow in a completely different direction than a
 * nearby rock."  The ellipse shadows that came out at v2.3.2632 broke it by
 * construction -- a round blob is a shadow for a sun directly overhead, and
 * none of these paintings has one.  So every entry below was READ OFF THE
 * PAINTING, not chosen: which faces of the rocks and cliffs are lit, and which
 * way the fences, pillars and trees darken the ground beside them.
 *
 *   lx, ly  where a point `h` pixels above the ground lands, per pixel of
 *           height: (lx*h, ly*h) on screen from its foot.  ly is the ground
 *           plane foreshortened by the 3/4 view, so it is roughly half lx for
 *           a sun at the painters' usual upper-left.
 *   alpha   how dark the shadow is where it is darkest (0-1).
 *   color   the shade's own colour -- a shadow on warm cobble is a deep brown
 *           and one on snow is blue, never a neutral grey.
 *
 * A zone with NO entry casts no shadow at all, and that is a decision, not an
 * omission: thunder is a night of electric point-lights, hollows a cave lit
 * from its mouth, ember lit from the lava below, and the world view a vista
 * where a figure is a few pixels tall.  A single directional shadow would
 * disagree with every one of them -- the exact failure the ellipse had.
 *
 * Read from (full-resolution crops in the v2.3.2710 PR):
 *   town     rock pillar and fences shade the cobble below-right; every prop
 *            (bank, forge, stall) is lit on its upper-left faces.
 *   meadow   rocks lit upper-left, the big tree's shade falls right.
 *   frost    pines and ice spires shade the snow below-right, blue.
 *   tidal    daylight island, rocks lit upper-left.
 *   sky      hard desert sun: the mesas' right faces are the darkest in the
 *            game, so the longest, darkest shadow.
 *   verdant  canopy light from the upper-left, dappled -- softer.
 *   mist     a swamp under haze: short and faint.
 *   farm     a grotto lit by one shaft of sun through the roof at the TOP of
 *            the map, so shadows run straight down the screen.
 */
export const ZONE_LIGHT = Object.assign(Object.create(null), {
  town:      { lx: 0.50, ly: 0.34, alpha: 0.38, color: 0x2e1c0c },
  meadow:    { lx: 0.50, ly: 0.34, alpha: 0.38, color: 0x13240c },
  frost:     { lx: 0.46, ly: 0.32, alpha: 0.34, color: 0x1a2c52 },
  tidal:     { lx: 0.50, ly: 0.34, alpha: 0.34, color: 0x14282e },
  sky:       { lx: 0.60, ly: 0.38, alpha: 0.42, color: 0x3a220c },
  verdant:   { lx: 0.46, ly: 0.32, alpha: 0.30, color: 0x0e220e },
  mist:      { lx: 0.36, ly: 0.26, alpha: 0.22, color: 0x14200e },
  farm_home: { lx: 0.06, ly: 0.42, alpha: 0.32, color: 0x1e160c },
});

/** The zone's light, or null for a zone that casts no shadow. */
export function zoneLight(zoneId) {
  return (zoneId && ZONE_LIGHT[zoneId]) || null;
}

/* How much of the sun is left, 0-1.  The depth levels of a zone darken the
   whole screen (effectsRenderer _updateAtmosphere: mid .1 ... core .5), and a
   shadow at full strength in a gloom that dark reads as a hole in the floor.
   The night term is the same idea for the day/night overlay, which reads a
   cache nothing writes today -- it costs one comparison and keeps the two
   from disagreeing the day somebody turns the cycle on. */
const DEPTH_FADE = { mid: 0.85, deep: 0.7, abyss: 0.5, core: 0.35 };
export function sunLeft(S) {
  let f = 1;
  const depth = S && S._currentDepth;
  if (depth && S.currentZone !== 'town' && DEPTH_FADE[depth]) f *= DEPTH_FADE[depth];
  const night = S && S._dayNightCache && S._dayNightCache.nightAlpha;
  if (night > 0) f *= Math.max(0, 1 - night * 2);
  return f;
}
