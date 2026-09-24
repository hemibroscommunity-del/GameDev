/* ═══ v2.3.2790: THE DUNES' DEPTH, ON THE SERVER ═══
 *
 * Owner: "can the objects in the game, player, monsters, etc follow a similar
 * perspective changing pattern the more north on the map they get and also
 * slow the movement speed the further north they get to emulate travel
 * distance.  I'm thinking of desert winds zone."
 *
 * Step 1 (v2.3.2745, #720) drew it: the client shrinks everything standing on
 * Wind Dunes (zone `sky`) from full size at the south edge to 0.42 at the
 * north edge, and slows your walk by the same ratio.  It stayed behind a
 * `?depth=1` preview because the server still thought in flat pixels -- a
 * mummy drawn at 0.42 still noticed you from 120px, chased at full pace and
 * hit from its full 72px reach, i.e. from well outside the body you could
 * see.  THIS is step 2: every distance the monster AI measures is multiplied
 * by the same curve, at the monster's own feet.  A far monster notices,
 * walks, reaches and wanders exactly as far as it LOOKS, and the geometry
 * everywhere else is the geometry it has always been (k === 1 exactly, not
 * approximately -- every call site multiplies, so a zone with no `depth`
 * config is byte-for-byte the old behaviour).
 *
 * THE CURVE is a MIRROR of src/data/zones.js `depth` (zoneDepthScale), held
 * in lockstep by test/zonedepth.test.mjs -- the same drift guard zones.test
 * gives the spawn tables.  It lives on the server's own ZONES row (data.js)
 * rather than being imported from the client, because the worker bundles
 * server/ only.
 *
 * KILL SWITCH: `zoneDepth: false` in the `liveflags` storage key turns the
 * scaling off with no deploy AND un-advertises caps.zoneDepth (join.js
 * spreads the live flags over the baked caps), so the client stops drawing
 * the curve in the same breath -- the storeGear pattern (storegear.js
 * _stGearOff).
 *
 * DELIBERATELY NOT SCALED: player-to-player anything (PvP reach, duels),
 * the anti-teleport movement cap (it bounds speed from ABOVE, and depth only
 * ever slows), and damage.  The player's OWN reach followed in the same PR
 * (owner: "Yes fix my reach") -- the client's swing/arrow/orb/dash via
 * zones.js depthK, and on this side the ability circles in abilities.js; see
 * docs/specs/dune-depth.md "Your reach shrinks with you". */
import { ZONES } from './data.js';

/* The curve itself.  1 for every zone without a `depth` row, for any y that
   is not a number, and for anything that is not axis 'y'.  Clamped to
   [far, near] so a monster knocked past the map edge cannot read a scale
   outside the curve. */
export function zoneDepthK(zoneId, y) {
  const z = Object.prototype.hasOwnProperty.call(ZONES, zoneId) ? ZONES[zoneId] : null;
  const d = z && z.depth;
  if (!d || d.axis !== 'y') return 1;
  const H = (z.h || 32) * 32;
  const yy = Number(y);
  if (!Number.isFinite(yy)) return 1;
  const t = Math.max(0, Math.min(1, 1 - yy / H));   /* 0 south .. 1 north */
  const near = d.near != null ? d.near : 1;
  const far = d.far != null ? d.far : 0.5;
  return near + (far - near) * Math.pow(t, d.curve != null ? d.curve : 1);
}

export const depthMethods = {
  /* The one read every monster-AI site goes through, so the kill switch is
     honoured everywhere at once. */
  _depthK(zoneId, y) {
    const f = this._liveFlags;
    if (f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'zoneDepth') && !f.zoneDepth) return 1;
    return zoneDepthK(zoneId, y);
  },
};
