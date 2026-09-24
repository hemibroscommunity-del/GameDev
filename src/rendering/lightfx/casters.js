/* ═══ v2.3.2710: WHO CASTS A SHADOW, AND WHERE THEIR FEET ARE ═══
 *
 * The shadow system (shadows.js) is given a list of figures -- a ground point
 * and the sprites that make up the figure this frame -- and this file is the
 * only place that knows where those live.  Three things make that less
 * obvious than it sounds, and each is handled here rather than by editing
 * the renderers that own the sprites:
 *
 *   1. A PLAYER FIGURE IS ~20 SPRITES in one display container (body regions,
 *      armour layers, hair, hat, cape, weapon, shield), plus a `_uiLayer` of
 *      name plate and bars that must cast nothing.  So a display is walked for
 *      every visible Sprite, skipping that one subtree.
 *   2. DURING A SWING, A BOW SHOT OR A GATHER THE DISPLAY IS HIDDEN and a
 *      stand-in figure is drawn by the effects renderer instead -- loose
 *      sprites in the node / gesture layers.  Following only the display would
 *      blink the shadow off on every attack.  The stand-ins are listed below
 *      by the names the effects renderer gives them; a pose not listed here
 *      falls back to shadows.js's short HOLD instead of a flicker, and
 *      mp-lightfx asserts every listed name still exists.
 *   3. EACH KIND OF FIGURE STANDS ON THE GROUND DIFFERENTLY.  A player body is
 *      centred on its frame with the feet a known offset below the origin
 *      (figureFeetY, entityRenderer); a monster's body sprite and an NPC's
 *      figure are anchored AT their feet (the slime on its base row,
 *      SLIME_BASE_ROW), so their anchor point is the ground point -- the
 *      lesson of the slime shadow the owner had removed for sitting "way
 *      beneath the monster" (v2.3.1704).
 */
import { Sprite } from 'pixi.js';
import { figureFeetY } from '../systems/entityRenderer.js';

/* The local player's stand-in sprites on the effects renderer.  NOT every
   sprite it owns: `slashSprite` is the sword's arc effect, light rather than
   body, and the cue graphics are not sprites at all. */
export const SELF_STAND_IN_FIELDS = [
  'chopSprite', 'gestureToolSprite', 'gestureFoodSprite', 'chopLegsSprite', 'chopShirtSprite', 'chopChestSprite',
  'cookSprite', 'cookLegsSprite', 'cookShirtSprite', 'cookChestSprite',
  'fireSprite', 'fireLegsSprite', 'fireShirtSprite', 'fireChestSprite',
  'swordShieldLo', 'swordJogLegsSprite', 'swordJogLegsGearSprite', 'swordSprite', 'swordChestSprite',
  'swordLegsSprite', 'swordShirtSprite', 'swordWeaponSprite', 'swordShieldHi',
  'bowShieldLo', 'blockOffHandLo', 'bowJogLegsSprite', 'bowJogLegsGearSprite', 'bowSprite', 'bowChestSprite',
  'bowLegsSprite', 'bowShirtSprite', 'bowWeaponSprite', 'bowShieldHi', 'blockOffHandHi',
];
/* ...plus the trait set they share (hair, hat, cape...), and the three
   per-peer stand-in pools, which are id -> nested objects of sprites. */
export const SELF_STAND_IN_SETS = ['skillTraits'];
export const PEER_STAND_IN_MAPS = ['_remoteSwordSprites', '_remoteBowSprites', '_remoteSkillSprites'];
/* v2.3.2749: a prop whose footprint is at least this deep (world px) is a
   BUILDING, and casts column by column (see the props block below): its tall
   parts -- roofs, towers, signs -- stand at the back.  Measured on the town,
   not assumed: the fountain (95) and the market stall (74) were tried that way
   too and lost their shadows, because their tall part stands in the MIDDLE
   (the fountain's spout) and the column model sent it to the back, where the
   prop itself hid it.  They cast as billboards, which pictured right.  The
   shallowest real building is the bank, at 154. */
const DEEP = 120;

/* Every visible Sprite under `node`, skipping the UI layer.  Invisible
   branches are skipped whole -- a hidden stand-in set costs one check. */
function walkDisplay(node, out, skip) {
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (!k.visible || k === skip) continue;
    if (k instanceof Sprite) out.push(k);
    if (k.children && k.children.length) walkDisplay(k, out, skip);
  }
}

/* Sprites held in a plain object tree ({ body, legs, traits: { hair, ... } }),
   the shape the effects renderer keeps its stand-in sets in. */
function walkSet(obj, out, depth) {
  if (!obj || depth > 3) return;
  for (const k in obj) {
    const v = obj[k];
    if (!v || typeof v !== 'object') continue;
    if (v instanceof Sprite) { if (v.visible && !v.destroyed) out.push(v); }
    else if (!v.children) walkSet(v, out, depth + 1);
  }
}

function peerStandIns(fx, id, out) {
  if (!fx) return;
  for (let i = 0; i < PEER_STAND_IN_MAPS.length; i++) {
    const m = fx[PEER_STAND_IN_MAPS[i]];
    if (m && typeof m.get === 'function') walkSet(m.get(id), out, 0);
  }
}

function selfStandIns(fx, out) {
  if (!fx) return;
  for (let i = 0; i < SELF_STAND_IN_FIELDS.length; i++) {
    const s = fx[SELF_STAND_IN_FIELDS[i]];
    if (s && s.visible && !s.destroyed) out.push(s);
  }
  for (let i = 0; i < SELF_STAND_IN_SETS.length; i++) walkSet(fx[SELF_STAND_IN_SETS[i]], out, 0);
}

/* A sprite anchored at its own feet: the ground point is where its origin
   lands in the display's parent space. */
function anchoredFeet(display, spr) {
  return {
    x: display.x + spr.x * display.scale.x,
    y: display.y + spr.y * display.scale.y,
  };
}

/**
 * The figures that cast a shadow this frame.
 * @returns {Array<{key, px, py, sprites, alive}>}
 */
/* QA/pictures (v2.3.2749): props and nodes off, figures on -- how the game
   looked before the world cast, on the same frame, for a fair before/after. */
let _worldCasts = true;
export function setWorldCasts(on) { _worldCasts = !!on; }

export function collectCasters(S, er, fx, zone) {
  const out = [];
  if (!er) return out;

  /* you */
  const pd = er.playerDisplay;
  if (pd && !pd.destroyed && S && S.player) {
    const sprites = [];
    if (pd.visible) walkDisplay(pd, sprites, pd._uiLayer);
    const own = sprites.length;
    selfStandIns(fx, sprites);
    out.push({ key: 'self', px: pd.x, py: figureFeetY(pd), sprites, alive: true, standIns: sprites.length - own });
  }

  /* other players in this zone */
  const others = (S && S.others) || null;
  if (er.otherPlayerDisplays) {
    for (const [id, d] of er.otherPlayerDisplays) {
      if (!d || d.destroyed) continue;
      const o = others && others[id];
      const here = !!(o && (o.zone || o.z || 'town') === zone && !o._isDead);
      const sprites = [];
      if (d.visible) walkDisplay(d, sprites, d._uiLayer);
      peerStandIns(fx, id, sprites);
      if (!sprites.length && !here) continue;
      out.push({ key: 'p:' + id, px: d.x, py: figureFeetY(d), sprites, alive: here });
    }
  }

  /* NPCs: one figure sprite, anchored at the feet */
  if (er.npcDisplays) {
    for (const [id, d] of er.npcDisplays) {
      const f = d && !d.destroyed && d.visible && d._fig;
      if (!f || !f.visible) continue;
      const g = anchoredFeet(d, f);
      out.push({ key: 'n:' + id, px: g.x, py: g.y, sprites: [f], alive: true });
    }
  }

  /* monsters: the body sprite only -- the stun-star ring over a dazed
     monster, the procedural circle and the hp heart are not the monster */
  if (er.monsterDisplays) {
    for (const [id, d] of er.monsterDisplays) {
      const b = d && !d.destroyed && d.visible && d._spriteBody;
      if (!b || !b.visible) continue;
      const g = anchoredFeet(d, b);
      out.push({ key: 'm:' + id, px: g.x, py: g.y, sprites: [b], alive: true });
    }
  }

  /* ═══ v2.3.2749: THE WORLD CASTS TOO ═══
     Owner: "Add shadows to props and monsters."  Listed LAST so the figures
     keep the probe's first slots (stats.list is capped).

     A thin prop -- a lamp, a bench, a rock, a pine -- is a billboard like a
     figure: one projection, pivoted a little behind its base (the middle of
     its shallow footprint), so the top of it falls away from the sun.

     A BUILDING IS NOT A BILLBOARD.  Its picture is a front wall with roofs
     and towers above that stand over ground up to 220 px further back, and
     one pivot for all of it put the auction house's back-left tower's shadow
     on the cobble in front of its SUNLIT left wall (seen in the first
     pictures, v2.3.2749).  Anything with a footprint deeper than DEEP gets
     the column-by-column projection instead (shadows.js placeDepth), once
     its base has been read off its art -- a frame or two after the zone
     loads, and until then it casts nothing rather than cast wrong.

     Gather nodes (trees, ore) pivot on their DRAWN base: their frames carry
     a transparent margin below the art (effectsRenderer NODE_ART_BASE). */
  if (!_worldCasts) return out;
  if (er.propDisplays) {
    for (const [id, spr] of er.propDisplays) {
      if (!spr || spr.destroyed || !spr.visible) continue;
      const g = spr._propGround;
      const fp = g && g.fp;
      if (fp && fp.y1 - fp.y0 >= DEEP) {
        /* v2.3.2817: with the pieces worldLife cut out of it (the signs, the
           flags), which cast through the same columns -- shadows.js
           _placePieces */
        if (g.bottoms) out.push({ key: 'prop:' + id, depth: { spr, g, back: fp.y0, pieces: spr._lifePieces || null }, alive: true });
        continue;
      }
      out.push({ key: 'prop:' + id, px: spr.x, py: fp ? (fp.y0 + fp.y1) / 2 : spr.y, sprites: [spr], alive: true });
    }
  }
  const nodes = S && S.gatherNodes;
  if (nodes && nodes.length) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const s = n && n._pixiSprite;
      if (!s || s.destroyed || !s.visible || !s._groundDy) continue;   /* a fishing hole lies flat: no base, no shadow */
      out.push({ key: 'node:' + (n.id != null ? n.id : i), px: s.x, py: s.y + s._groundDy, sprites: [s], alive: true });
    }
  }
  return out;
}
