/* ═══ v2.3.2705: WHAT A MONSTER'S SHOT LOOKS LIKE, AND WHAT COLOUR ═══
 *
 * Owner: "take another look at the procedurally drawn projectiles from slimes
 * and fire goblins ... Just make sure it's colored correctly (green slimes are
 * recolored to blue during game but I might add green ones later)."
 *
 * THE COLOUR COMES FROM THE THROWER, NOT THE ZONE.  The old renderer picked
 * ONE ball picture per zone from ZONE_VARIANT_MAP, so every slime in a zone
 * threw the zone's colour: fine while Verdant Wilds is all blue, wrong the day
 * a green slime spawns beside a blue one (the owner's "I might add green ones
 * later"), and already wrong in the Misty Bog, whose violet-tinted wisps threw
 * the plain green ball because that branch only knew about recolours.  Now the
 * ball asks who threw it (shotThrowerArch) and takes that monster's colour.
 *
 * THE COLOUR IS DERIVED, NEVER WRITTEN DOWN TWICE.  A slime variant is drawn
 * one of two ways (entityRenderer getSlimeFrame / slimeTintFor), and its goo
 * follows the same rule:
 *   - `recolor` [r,g,b]: a brightness-ratio retint of the green sheets
 *     (monsterRecolor.js).  The sheet's lit green lands on the target within
 *     2% (reference luminance 132.55 on slime-idle-v5), so the target IS the
 *     goo colour.
 *   - `tint`: Pixi's multiply, so the goo is the sheet's green times the same
 *     tint -- the colour those slimes really are on screen.
 *   - neither (the plain slime): the sheet's own lit green, sampled.
 * The same derivation #710's hit debris uses (hitFxTintOf there), so a slime's
 * hit spray, its thrown glob and its body cannot come out different colours.
 *
 * Pure data: no DOM, no Pixi.  server/test/monstershots.test.mjs runs it. */
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from './monsterVariants.js';

/* The slime sheet's lit green (slime-idle-v5.png), which is the white of the
   goo's grey ramp once tinted -- see monsterShotArt.js GOO_GREYS. */
export const SLIME_BODY_GREEN = 0x5ca84c;

/* The on-screen size a ball is drawn at when its variant does not say
   (projectileScalePx).  25.6 is what a plain slime's orb has always drawn at
   (the 128px sheet at 0.2); 40 is the fire goblin's (v2.3.2504). */
export const GOO_DEFAULT_PX = 25.6;
export const FIRE_DEFAULT_PX = 40;

const own = (o, k) => k != null && Object.prototype.hasOwnProperty.call(o, k);
const variantOf = (arch) => (own(MONSTER_VARIANTS, arch) ? MONSTER_VARIANTS[arch] : null);

function mulRgb(a, b) {
  const ch = (s) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** 'goo', 'fire' or 'snowball': how a ball thrown by `arch` is drawn.  The
 *  wire's `kind` decides snowballs (the worker knows a snowman threw it); for
 *  everything else the thrower's variant can ask for a style (`shotStyle`),
 *  and a slime -- the game's default thrower -- throws goo. */
export function shotStyleOf(arch, kind) {
  if (kind === 'snowball') return 'snowball';
  const v = variantOf(arch);
  if (v && (v.shotStyle === 'fire' || v.shotStyle === 'goo')) return v.shotStyle;
  return 'goo';
}

/** The colour a slime's goo is drawn in -- the colour of the slime itself.
 *  `recolorReady` mirrors the body's own fallback: until a variant's
 *  recoloured sheets exist the body draws the base sheet under its `tint`,
 *  and so does the goo. */
export function gooColorOf(arch, recolorReady) {
  const v = variantOf(arch);
  if (v && v.useSlimeSheets) {
    const rc = v.recolor;
    if (recolorReady !== false && Array.isArray(rc) && rc.length === 3) {
      return ((rc[0] & 255) << 16) | ((rc[1] & 255) << 8) | (rc[2] & 255);
    }
    if (typeof v.tint === 'number') return mulRgb(SLIME_BODY_GREEN, v.tint);
  }
  return SLIME_BODY_GREEN;
}

/** On-screen size (world px) of a ball thrown by `arch` in `style`. */
export function shotPxOf(arch, style) {
  const v = variantOf(arch);
  if (v && typeof v.projectileScalePx === 'number' && v.projectileScalePx > 0) return v.projectileScalePx;
  return style === 'fire' ? FIRE_DEFAULT_PX : GOO_DEFAULT_PX;
}

/** Every distinct goo / fire size a variant table can ask for, so the art can
 *  be minted for exactly those at load time and never on first sight. */
export function shotSizesInUse() {
  const goo = new Set([GOO_DEFAULT_PX]);
  const fire = new Set();
  for (const k of Object.keys(MONSTER_VARIANTS)) {
    const v = MONSTER_VARIANTS[k];
    if (!v || v.noProjectile) continue;
    const style = shotStyleOf(k);
    if (style === 'fire') fire.add(shotPxOf(k, 'fire'));
    else if (v.useSlimeSheets) goo.add(shotPxOf(k, 'goo'));
  }
  if (!fire.size) fire.add(FIRE_DEFAULT_PX);
  return { goo: [...goo].sort((a, b) => a - b), fire: [...fire].sort((a, b) => a - b) };
}

/** Who threw this ball, as the archetype its body is drawn with.
 *  1. the arch stamped on it when it was thrown (gameEvents / monsterCombat
 *     both write `shooterArch` from the monster that threw it);
 *  2. the thrower, if it is still standing in S.monsters;
 *  3. the zone's fodder variant -- what every ball was drawn as before --
 *     and plain 'fodder' where the zone has none. */
export function shotThrowerArch(S, proj) {
  if (proj && typeof proj.shooterArch === 'string' && proj.shooterArch) return proj.shooterArch;
  const id = proj && proj.ownerId;
  if (id != null && S && Array.isArray(S.monsters)) {
    for (let i = 0; i < S.monsters.length; i++) {
      const m = S.monsters[i];
      if (m && m.id === id) return m.archetype || m.type || 'fodder';
    }
  }
  const zm = S && own(ZONE_VARIANT_MAP, S.currentZone) ? ZONE_VARIANT_MAP[S.currentZone] : null;
  return (zm && zm.fodder) || 'fodder';
}
