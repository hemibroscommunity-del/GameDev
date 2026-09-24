/* ═══ v2.3.2712: THE WORLD'S WEATHER -- LIGHT, AIR, DUST AND BLOOD ═══
 *
 * Owner: "Can you make time of day by adding certain effects for that?
 * Maybe also subtle atmospheric effects.  I think soft footprints (as if you
 * were running through light dust) that quickly disappear (as if blown away
 * by a soft breeze) would also look nice.  Additionally, when the character
 * gets hit by a monster, I think directionally aware blood effects would be
 * a good feature."
 *
 * One module for the four, because three of them share a wind and two share
 * the night: the dust your feet kick up blows the same way as the motes in
 * the sun and the shadows of the clouds, and a firefly is both a speck you
 * see and a light the night is lit by.  Split into four files they would
 * each need their own copy of both.
 *
 * ── HOW NIGHT IS DRAWN ──
 * Not as a dark rectangle.  A flat fill makes a DIM screen, and nothing
 * about a dim screen says night -- what says night is that the light is
 * somewhere: round the lantern you carry, round your friend's, on a
 * firefly.  So each frame renders a small LIGHT MAP (a quarter of the screen's
 * CSS size; light is smooth, it does not need the resolution) -- the hour's
 * ambient colour with every light added into it -- and MULTIPLIES the world by
 * it.  Where there is no light the world takes the ambient tint; under a
 * lantern it comes back to full colour.  By day the map is skipped entirely:
 * a multiply by white is a whole-screen pass that changes nothing.
 *
 * ── WHERE IT DRAWS ──
 * The light lives on the `lighting` world layer, directly under the damage
 * numbers and the world overlay (pixiApp.js): it darkens everything that is
 * IN the world -- ground, bodies, trees, the foreground canopy -- and nothing
 * you read.  A number you cannot read at night is a number that cost you the
 * fight.  Dust and blood sit on the ground and particle layers with the rest
 * of the hit effects (under the player, v2.3.2636).
 *
 * ── COST ──
 * Every effect here is a fixed POOL of sprites that hides what it is not
 * using; nothing is allocated per frame.  The light map is one tiny render
 * target and one extra pass, only while the sun is down.  All of it is
 * display only -- no state here is read by combat, and nothing is sent.
 */
import { Container, Sprite, Texture, RenderTexture, NineSliceSprite } from 'pixi.js';
import { dayPhase, lightingAt, windAt, zoneHasSky } from '@/game/timeOfDay.js';
import { fxTex, SOFTBOX_EDGE } from './worldFxTextures.js';
import { zonePlayerScale, ZONES } from '@/data/zones.js';
import { GROUND_GRID, GROUND_COLORS } from '@/data/groundColors.js';   /* v2.3.2825: the ground's own colour, baked */
import { deathCrumble } from './deathCrumble.js';
import { frameBounds } from './gearSheets.js';   /* v2.3.2860: a cropped monster's whole-cell box */

const rgbHex = (r, g, b) => ((Math.max(0, Math.min(255, Math.round(r * 255))) << 16)
  | (Math.max(0, Math.min(255, Math.round(g * 255))) << 8)
  | Math.max(0, Math.min(255, Math.round(b * 255))));

/* ── per-zone character ──
   `dust`: the colour your feet kick up (null = no prints; frost has its own
   snow prints, and the water caves are wet).  `motes`: what hangs in the air.
   `fireflies`: whether the night has them. */
const ZONE_AIR = Object.create(null);
ZONE_AIR.town      = { dust: 0xd8c7a0, motes: 'pollen', fireflies: true };
ZONE_AIR.meadow    = { dust: 0xcdb98a, motes: 'pollen', fireflies: true };
ZONE_AIR.farm_home = { dust: 0xc9a878, motes: 'pollen', fireflies: true };
ZONE_AIR.verdant   = { dust: 0xc4b488, motes: 'pollen', fireflies: true };
ZONE_AIR.mist      = { dust: 0xa6b388, motes: 'spores', fireflies: true };
ZONE_AIR.ember     = { dust: 0x8c817a, motes: 'embers' };
ZONE_AIR.sky       = { dust: 0xe6cf9c, motes: 'sand' };
ZONE_AIR.radiant   = { dust: 0xeee3c4, motes: 'glints' };
ZONE_AIR.frost     = { dust: null,     motes: 'snow' };
ZONE_AIR.thunder   = { dust: 0xaea89e };
ZONE_AIR.hollows   = { dust: 0xb6ab9c };
ZONE_AIR.shadow    = { dust: 0x8a8196 };
ZONE_AIR.worldview = { dust: 0xcdb98a };   /* v2.3.2825: the overworld had no dust at all */
const airOf = (z) => (z && Object.prototype.hasOwnProperty.call(ZONE_AIR, z) ? ZONE_AIR[z] : null);

/* ═══ v2.3.2717: THE PROPS' OWN LIGHTS ═══
   Owner: "light up the props that are in town and in zone areas."  At night
   the lamps, torches, forge fire and lit windows PAINTED into the prop art
   become real lights in the light map, and every prop takes a soft moonlit
   wash so a house or a pine does not sink into the dark.
   Each light is placed where the art draws it, as a fraction of the sprite
   (u across, v down, read off the 512px source images) -- so it follows the
   sprite's real drawn rectangle, flips with a flipped prop, and survives a
   re-scaled prop.  `r` is the reach as a fraction of the prop's height;
   `k` is the kind: a flame flickers, a lamp barely, a window not at all. */
/* v2.3.2811: exported -- worldLife flickers the same flames and lamps by day. */
export const PROP_LIGHTS = Object.create(null);
PROP_LIGHTS['lamp-plaza-w'] = [{ u: 0.48, v: 0.24, k: 'lamp', r: 0.55 }];
PROP_LIGHTS['mayor-house'] = [
  { u: 0.583, v: 0.668, k: 'flame', r: 0.13 }, { u: 0.70, v: 0.668, k: 'flame', r: 0.13 },
  { u: 0.635, v: 0.72, k: 'window', r: 0.12 },
  { u: 0.426, v: 0.845, k: 'lamp', r: 0.1 }, { u: 0.688, v: 0.875, k: 'lamp', r: 0.1 }, { u: 0.86, v: 0.84, k: 'lamp', r: 0.1 },
  { u: 0.195, v: 0.40, k: 'flame', r: 0.1 },
];
PROP_LIGHTS.forge = [
  { u: 0.29, v: 0.62, k: 'flame', r: 0.24 }, { u: 0.30, v: 0.17, k: 'flame', r: 0.1 },
  { u: 0.66, v: 0.40, k: 'window', r: 0.1 }, { u: 0.415, v: 0.43, k: 'window', r: 0.08 },
  { u: 0.55, v: 0.62, k: 'lamp', r: 0.1 }, { u: 0.78, v: 0.55, k: 'lamp', r: 0.1 },
  { u: 0.645, v: 0.645, k: 'window', r: 0.1 },
];
PROP_LIGHTS.bank = [
  { u: 0.08, v: 0.48, k: 'lamp', r: 0.1 }, { u: 0.615, v: 0.595, k: 'lamp', r: 0.1 }, { u: 0.73, v: 0.78, k: 'lamp', r: 0.09 },
  { u: 0.163, v: 0.765, k: 'flame', r: 0.1 },
  { u: 0.23, v: 0.35, k: 'window', r: 0.07 }, { u: 0.785, v: 0.73, k: 'window', r: 0.07 },
];
PROP_LIGHTS['auction-house'] = [
  { u: 0.375, v: 0.595, k: 'flame', r: 0.1 }, { u: 0.51, v: 0.74, k: 'flame', r: 0.1 },
  { u: 0.685, v: 0.48, k: 'flame', r: 0.1 }, { u: 0.31, v: 0.69, k: 'flame', r: 0.1 },
  { u: 0.263, v: 0.45, k: 'window', r: 0.07 }, { u: 0.30, v: 0.52, k: 'window', r: 0.07 },
  { u: 0.17, v: 0.645, k: 'lamp', r: 0.08 }, { u: 0.81, v: 0.48, k: 'lamp', r: 0.08 },
];
PROP_LIGHTS['market-stall'] = [{ u: 0.92, v: 0.38, k: 'lamp', r: 0.22 }, { u: 0.59, v: 0.62, k: 'flame', r: 0.14 }];
const PROP_LIGHT_TINT = { flame: 0xffa65a, lamp: 0xffd27a, window: 0xffd890 };

const MOTE_STYLE = {
  pollen: { n: 16, tint: 0xfff4c8, size: [2.2, 3.6], alpha: [0.25, 0.6], drift: 0.55, rise: -3, add: false },
  spores: { n: 16, tint: 0xc8f08c, size: [2.4, 4.0], alpha: [0.25, 0.55], drift: 0.35, rise: -6, add: false },
  embers: { n: 18, tint: 0xff8a3a, size: [2.0, 3.4], alpha: [0.45, 0.9], drift: 0.45, rise: -22, add: true },
  sand:   { n: 22, tint: 0xf2dcae, size: [1.6, 2.6], alpha: [0.25, 0.5], drift: 2.2, rise: 0, add: false },
  glints: { n: 14, tint: 0xffffff, size: [2.0, 3.2], alpha: [0.2, 0.7], drift: 0.3, rise: -4, add: true },
  snow:   { n: 22, tint: 0xffffff, size: [2.2, 4.2], alpha: [0.45, 0.85], drift: 0.6, rise: 16, add: false },
};

/* Dust prints: a print every STEP px of travel, alternating feet. */
const STEP = 17;
const PRINT_MS = 1300;
const PUFF_MS = 700;
const PUFF_ALPHA = 0.7;   /* v2.3.2825: 0.32 -> 0.55 -- visible, still dust */
const PRINT_POOL = 56;
const PUFF_POOL = 56;   /* v2.3.2825: 28 -> 56, two puffs a step now */

/* Blood.  Tiers by the share of max HP one hit took (owner: "tiny ... 10%
   hp or less, moderate between 11% and 32%, and high if 33% or more"). */
export function bloodTier(frac) {
  const pct = (frac || 0) * 100;
  if (pct <= 10) return 'tiny';
  if (pct < 33) return 'moderate';
  return 'heavy';
}
const BLOOD = {
  tiny:     { drops: 4,  speed: [55, 110],  spread: 0.45, splats: 0.55, pool: false, mist: false },
  moderate: { drops: 11, speed: [80, 175],  spread: 0.6,  splats: 0.5,  pool: false, mist: true },
  heavy:    { drops: 24, speed: [110, 270], spread: 0.85, splats: 0.5,  pool: true,  mist: true },
};
const DROP_POOL = 90;
const SPLAT_POOL = 70;
const SPLAT_MS = 6500;
const GRAV = 900;   /* drops leave from the chest now (~44px up), so they fall faster to land close */

/* ═══ WHERE THE FEET ARE ═══
   A character's position (S.player.y, a peer's renderY -- the display's
   origin) is the middle of the BODY, not the ground under it: the feet stand
   42 world px below it.  Measured, not guessed -- the crumbling corpse reads
   the body's opaque pixels back on death, and in town the lowest opaque row
   sits at +41.7.  The first cut of this file put the dust and the blood's
   landing marks on the origin, and the prints came out at the character's
   waist.  Scaled by the zone's player scale for the one map (worldview) that
   shrinks its figures. */
export const FEET_DY = 42;
const feetDy = (S, x, y) => FEET_DY * (zonePlayerScale(S.currentZone, x, y, 32) || 1);

const rand = (a, b) => a + Math.random() * (b - a);
const shade = (hex, k) => (Math.round(((hex >> 16) & 255) * k) << 16) | (Math.round(((hex >> 8) & 255) * k) << 8) | Math.round((hex & 255) * k);

/* ═══ v2.3.2825: DUST THE COLOUR OF THE GROUND ═══
   Owner: "are there any footstep dust or dirt effect while moving? ... It
   would need to match the color of the terrain though."
   There was dust (v2.3.2703) -- one colour per zone, and faint enough that
   the owner had never noticed it.  The colour now comes from the painted map
   under the feet, baked offline to a grid (tools/maps/build_ground_colors.py
   -> src/data/groundColors.js; the client still never reads map pixels), so
   the sand path kicks up sand and the grass beside it kicks up a greener
   earth.  Decoded once per zone, on first use.
   Returns the raw ground RGB, -1 for water (no dust), or null (no grid). */
const _groundCache = Object.create(null);
function groundColorAt(zone, x, y) {
  if (!zone || !Object.prototype.hasOwnProperty.call(GROUND_COLORS, zone)) return null;
  let g = _groundCache[zone];
  if (!g) {
    try {
      const bin = atob(GROUND_COLORS[zone]);
      g = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) g[i] = bin.charCodeAt(i);
    } catch (e) { g = new Uint8Array(0); }
    _groundCache[zone] = g;
  }
  const Z = ZONES[zone];
  if (!Z || !g.length) return null;
  const gx = Math.max(0, Math.min(GROUND_GRID - 1, Math.floor((x / (Z.w * 32)) * GROUND_GRID)));
  const gy = Math.max(0, Math.min(GROUND_GRID - 1, Math.floor((y / (Z.h * 32)) * GROUND_GRID)));
  const i = (gy * GROUND_GRID + gx) * 3;
  const r = g[i], gg = g[i + 1], b = g[i + 2];
  if (r === 0 && gg === 0 && b === 0) return -1;
  return (r << 16) | (gg << 8) | b;
}
/* What a foot kicks UP off that ground: the ground's own hue, lifted toward a
   pale dust and a little desaturated -- green smoke off grass reads as magic,
   a light green-brown reads as earth. */
const DUST_PALE = [0xd8, 0xcb, 0xb0];
function dustOf(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const m = (a, p) => Math.min(255, Math.round((a * 0.5 + p * 0.5) * 1.16));
  return (m(r, DUST_PALE[0]) << 16) | (m(g, DUST_PALE[1]) << 8) | m(b, DUST_PALE[2]);
}

export class WorldFx {
  constructor(layers, app) {
    this.app = app;
    this.lightLayer = layers.lighting;
    this.groundLayer = layers.groundSplatter;
    this.partLayer = layers.particles;
    this.airLayer = layers.foreground;
    this.glowLayer = layers.glows || layers.foreground;   /* v2.3.2717: emissive, above the night */
    this._last = 0;

    /* night */
    this._rt = null;
    this._rtW = 0; this._rtH = 0;
    this._lightScene = new Container();
    this._lightBg = new Sprite(Texture.WHITE);
    this._lightScene.addChild(this._lightBg);
    this._lights = [];
    this._overlay = new Sprite(Texture.WHITE);
    this._overlay.blendMode = 'multiply';
    this._overlay.visible = false;
    this._overlay.label = 'tod-overlay';

    /* sky: cloud shadows by day, fog at dawn */
    this._clouds = [];
    this._fog = [];
    if (this.lightLayer) {
      for (let i = 0; i < 3; i++) {
        const c = new Sprite(Texture.EMPTY);
        c.anchor.set(0.5); c.blendMode = 'multiply'; c.visible = false;
        c._ox = Math.random(); c._oy = Math.random();
        this.lightLayer.addChild(c); this._clouds.push(c);
      }
      this.lightLayer.addChild(this._overlay);
      for (let i = 0; i < 3; i++) {
        const f = new Sprite(Texture.EMPTY);
        f.anchor.set(0.5); f.visible = false;
        f._ox = Math.random(); f._oy = Math.random();
        this.lightLayer.addChild(f); this._fog.push(f);
      }
    }

    /* air */
    this._motes = [];
    this._moteKind = null;

    /* dust */
    this._prints = []; this._printI = 0;
    this._puffs = []; this._puffI = 0;
    this._walkers = new Map();

    /* blood */
    this._drops = []; this._dropI = 0;
    this._splats = []; this._splatI = 0;
    this._mists = []; this._mistI = 0;

    if (typeof window !== 'undefined') {
      /* where the fireflies are, for a close-up */
      window.__btWorldFxFlies = () => this._motes.filter((m) => m.visible && m._firefly).map((m) => ({ x: m.x, y: m.y }));
      window.__btWorldFx = () => ({
        tod: this._probeTod || null,
        prints: this._prints.filter((p) => p.visible).length,
        puffs: this._puffs.filter((p) => p.visible).length,
        lastDust: this._lastDust || null,   /* v2.3.2825: {ground, puff} of the last step */
        drops: this._drops.filter((p) => p.visible).length,
        splats: this._splats.filter((p) => p.visible).length,
        lastBlood: this._lastBlood || null,
        motes: this._motes.filter((m) => m.visible).length,
        moteKind: this._moteKind,
        lights: this._lights.filter((l) => l.visible).length,
        night: this._probeNight || null,
        bugs: (this._flies || []).filter((f) => f.visible).length,
        corpses: deathCrumble.count(),
      });
    }
  }

  setEntityRenderer(er) { this._er = er; }

  /* ═══ v2.3.2715: WHAT THE NIGHT MUST NOT HIDE ═══
     Owner, on the first night: "I still need the name plates to be legible
     (maybe it's a soft flashlight effect on name plates or just default
     visibility).  It's also more difficult to see monsters at night ... like
     the snowmen preview showed them dark on the dark snow."
     Both are answered IN the light map rather than by pulling things out of
     the night: every visible name plate and monster health bar gets a softbox
     of light the size of it (full daytime colour, a gentle halo round it),
     and every monster gets a cool moonlight glow the size of its body -- so a
     snowman on night snow is lit, but still reads as standing in the dark.
     Found through the entity renderer's own display maps, measured with
     getBounds (screen space, so the zoom and the camera are already in it). */
  _nightTargets() {
    const er = this._er;
    const plates = [], bodies = [];
    if (!er) return { plates, bodies, props: [] };
    const shown = (o) => {
      for (let n = o, d = 0; n && d < 8; n = n.parent, d++) {
        if (n.visible === false || (typeof n.alpha === 'number' && n.alpha <= 0.02)) return false;
      }
      return true;
    };
    const plate = (o) => { if (o && shown(o)) plates.push(o); };
    try {
      if (er.playerDisplay) plate(er.playerDisplay._namePill);
      if (er.otherPlayerDisplays) for (const d of er.otherPlayerDisplays.values()) plate(d && d._namePill);
      if (er.npcDisplays) for (const d of er.npcDisplays.values()) plate(d && d._namePill);
      if (er.monsterDisplays) {
        for (const d of er.monsterDisplays.values()) {
          if (!d) continue;
          /* the monster's whole UI block: plate, level, health bar */
          plate(d._hpUi);
          if (d._spriteBody && shown(d._spriteBody)) bodies.push(d._spriteBody);
        }
      }
    } catch (e) { /* a missing light is a dark plate, never a crash */ }
    const props = [];
    try {
      if (er.propDisplays) {
        for (const [id, spr] of er.propDisplays) {
          if (spr && spr.texture && spr.texture !== Texture.EMPTY && shown(spr)) props.push({ id, spr });
        }
      }
    } catch (e) { /* no props, no prop light */ }
    return { plates, bodies, props };
  }

  update(S, cam, now) {
    const dt = this._last ? Math.min(0.05, Math.max(0, (now - this._last) / 1000)) : 0.016;
    this._last = now;
    if (!S || !cam) return;
    const wind = windAt(now);
    /* QA: the harness turns the drifting air off so pixel tests do not depend
       on where a cloud or a mote happened to be (tools/qa/mp/harness.mjs). */
    this._calm = typeof window !== 'undefined' && window.__btAmbienceOff === true;
    try { this._updateSky(S, cam, now, dt, wind); } catch (e) { this._err('sky', e); }
    try { this._updateAir(S, cam, now, dt, wind); } catch (e) { this._err('air', e); }
    try { this._updateDust(S, now, dt, wind); } catch (e) { this._err('dust', e); }
    try { this._updateBlood(S, now, dt); } catch (e) { this._err('blood', e); }
    try { deathCrumble.sweep(now); } catch (e) { this._err('death', e); }
  }

  _err(what, e) {
    if (!this['_e' + what]) { this['_e' + what] = true; console.error('[worldFx] ' + what + ' threw', e && e.message); }
  }

  /* ─────────────────────────── the sky ─────────────────────────── */
  _updateSky(S, cam, now, dt, wind) {
    const sky = zoneHasSky(S.currentZone, S);
    const L = lightingAt(dayPhase(now));
    this._L = L;
    this._probeTod = { name: L.name, phase: +L.phase.toFixed(3), sky, lamp: +L.lamp.toFixed(2) };
    const ov = this._overlay;
    const { cx, cy, viewW, viewH } = cam;

    const plainDay = L.mul[0] > 0.985 && L.mul[1] > 0.985 && L.mul[2] > 0.985 && L.lamp < 0.01;
    if (!sky || plainDay || !this.lightLayer) {
      ov.visible = false;
      for (let i = 0; i < this._lights.length; i++) this._lights[i].visible = false;
      if (this._plateLights) for (let i = 0; i < this._plateLights.length; i++) this._plateLights[i].visible = false;
      this._drawHalos([]);
    } else if (L.lamp < 0.01) {
      this._drawHalos([]);
      /* golden hour: a tint, no lights to place -- no render target needed */
      for (let i = 0; i < this._lights.length; i++) this._lights[i].visible = false;
      ov.texture = Texture.WHITE;
      ov.tint = rgbHex(L.mul[0], L.mul[1], L.mul[2]);
      ov.x = cx; ov.y = cy; ov.width = viewW; ov.height = viewH;
      ov.visible = true;
    } else {
      this._renderLightMap(S, cam, now, L);
    }

    /* cloud shadows: sky zones, by day, sliding with the wind */
    const glow = this._L;
    const dayK = (sky && !this._calm) ? Math.max(0, 1 - glow.lamp * 1.6) * Math.min(1, (glow.mul[0] + glow.mul[1] + glow.mul[2]) / 3 / 0.9) : 0;
    const air = airOf(S.currentZone);
    for (let i = 0; i < this._clouds.length; i++) {
      const c = this._clouds[i];
      if (dayK < 0.02 || !fxTex('cloud' + i)) { c.visible = false; continue; }
      if (c.texture !== fxTex('cloud' + i)) c.texture = fxTex('cloud' + i);
      const W = viewW * 1.9, H = viewH * 1.9;
      c._ox = (((c._ox + (wind.x * 1.8 * dt) / W) % 1) + 1) % 1;
      c._oy = (((c._oy + (wind.y * 1.8 * dt) / H) % 1) + 1) % 1;
      /* anchored in WORLD space (it slides as you walk under it), wrapped
         round a box centred on the camera so one is always nearby */
      const bx = cx - viewW * 0.45, by = cy - viewH * 0.45;
      c.x = bx + (((c._ox * W + i * W / 3) - (cx % W) + 2 * W) % W);
      c.y = by + (((c._oy * H + i * H / 3) - (cy % H) + 2 * H) % H);
      c.width = viewW * 0.95; c.height = viewW * 0.6;
      c.tint = 0xb8bfcc;
      c.alpha = 0.5 * dayK;
      c.visible = true;
    }
    /* dawn fog: low white drifts, only in the green zones */
    const ph = glow.phase;
    const fogK = (sky && air && air.fireflies && !this._calm)
      ? (ph < 0.14 ? (ph < 0.04 ? 1 : 1 - (ph - 0.04) / 0.10) : (ph > 0.96 ? (ph - 0.96) / 0.04 : 0))
      : 0;
    for (let i = 0; i < this._fog.length; i++) {
      const f = this._fog[i];
      if (fogK < 0.02 || !fxTex('cloud' + ((i + 1) % 3))) { f.visible = false; continue; }
      if (f.texture !== fxTex('cloud' + ((i + 1) % 3))) f.texture = fxTex('cloud' + ((i + 1) % 3));
      const W = viewW * 1.6, H = viewH * 1.6;
      f._ox = (((f._ox + (wind.x * 0.6 * dt) / W) % 1) + 1) % 1;
      const bx = cx - viewW * 0.3, by = cy - viewH * 0.3;
      f.x = bx + (((f._ox * W + i * W / 3) - (cx % W) + 2 * W) % W);
      f.y = by + (((f._oy * H + i * H / 3) - (cy % H) + 2 * H) % H);
      f.width = viewW * 1.1; f.height = viewW * 0.45;
      f.tint = 0xe8eef4;
      f.alpha = 0.22 * fogK;
      f.visible = true;
    }
  }

  _renderLightMap(S, cam, now, L) {
    const renderer = this.app && this.app.renderer;
    if (!renderer) return;
    const { cx, cy, viewW, viewH } = cam;
    /* a quarter of the CSS size: light is smooth, so resolution buys nothing */
    const w = Math.max(16, Math.ceil((cam.cssW || viewW) / 4));
    const h = Math.max(16, Math.ceil((cam.cssH || viewH) / 4));
    if (!this._rt || this._rtW !== w || this._rtH !== h) {
      if (this._rt) { try { this._rt.destroy(true); } catch (e) { /* gone */ } }
      this._rt = RenderTexture.create({ width: w, height: h, resolution: 1 });
      this._rtW = w; this._rtH = h;
    }
    const k = w / viewW;
    const bg = this._lightBg;
    bg.width = w; bg.height = h;
    bg.tint = rgbHex(L.mul[0], L.mul[1], L.mul[2]);

    /* the lights: you, everyone near you, and the fireflies */
    const list = [];
    /* v2.3.2716: lanterns shrink with the figure carrying them -- the world
       map draws its people as specks (zonePlayerScale), and a full-size pool
       of light round a speck would light half the map */
    const ps = (x, y) => zonePlayerScale(S.currentZone, x, y, 32) || 1;
    if (S.player && !(S.rpg && S.rpg.hp <= 0)) list.push({ x: S.player.x, y: S.player.y - 18 * ps(S.player.x, S.player.y), r: 165 * ps(S.player.x, S.player.y), c: 0xffd9a0, a: 1 });
    if (S.others) {
      for (const id in S.others) {
        const o = S.others[id];
        if (!o || o._isDead) continue;
        const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
        if (ox < cx - 200 || ox > cx + viewW + 200 || oy < cy - 200 || oy > cy + viewH + 200) continue;
        list.push({ x: ox, y: oy - 18 * ps(ox, oy), r: 125 * ps(ox, oy), c: 0xffd29a, a: 0.85 });
        if (list.length > 14) break;
      }
    }
    for (let i = 0; i < this._motes.length; i++) {
      const m = this._motes[i];
      if (m.visible && m._firefly) list.push({ x: m.x, y: m.y, r: 36, c: 0xd8ff8a, a: m.alpha * 0.9 });
    }
    /* world-space lights (lanterns, fireflies) into light-map space */
    const lights = [];
    const lampK = 0.35 + 0.65 * L.lamp;
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      lights.push({ tex: 'glow', x: (l.x - cx) * k, y: (l.y - cy) * k, w: l.r * 2 * k, h: l.r * 2 * k, c: l.c, a: Math.min(1, l.a * lampK) });
    }
    /* screen-space ones: plates and monsters, measured where they are drawn */
    const gk = w / Math.max(1, cam.cssW || viewW);
    const { plates, bodies, props } = this._nightTargets();
    const halos = [];
    const sk = viewW / Math.max(1, cam.cssW || viewW);   /* screen px -> world px */
    /* props: a soft moonlit wash over each, then its own painted lights */
    for (let i = 0; i < props.length; i++) {
      const { id, spr } = props[i];
      let b; try { b = spr.getBounds(); } catch (e) { continue; }
      if (!b || b.width < 2) continue;
      const rr = (Math.max(b.width, b.height) * 0.5 / 0.4) * gk;
      lights.push({ tex: 'glowTight', x: (b.x + b.width / 2) * gk, y: (b.y + b.height * 0.55) * gk, w: rr * 2, h: rr * 2, c: 0xc4d4ff, a: 0.24 * lampK });
      const pls = Object.prototype.hasOwnProperty.call(PROP_LIGHTS, id) ? PROP_LIGHTS[id] : null;
      if (!pls) continue;
      const flipped = spr.scale && spr.scale.x < 0;
      for (let j = 0; j < pls.length; j++) {
        const pl = pls[j];
        const u = flipped ? 1 - pl.u : pl.u;
        const r = pl.r * b.height * gk;
        /* a flame breathes; a lamp barely; a window holds still */
        const fl = pl.k === 'flame' ? 0.82 + 0.18 * Math.sin(now / 90 + j * 1.7) * Math.sin(now / 37 + j)
          : pl.k === 'lamp' ? 0.95 + 0.05 * Math.sin(now / 400 + j) : 1;
        lights.push({ tex: 'glow', x: (b.x + u * b.width) * gk, y: (b.y + pl.v * b.height) * gk, w: r * 2, h: r * 2,
          c: PROP_LIGHT_TINT[pl.k] || 0xffd27a, a: Math.min(1, 0.95 * fl * lampK) });
        /* ...and a small halo AT the flame or the lamp glass, drawn above the
           night (the `glows` layer), so the source itself shines rather than
           merely being lit.  Windows light the room behind them, not the air,
           so they get none. */
        if (pl.k !== 'window') {
          halos.push({ x: cam.cx + (b.x + u * b.width) * sk, y: cam.cy + (b.y + pl.v * b.height) * sk,
            r: pl.r * b.height * sk * 0.32, c: PROP_LIGHT_TINT[pl.k], a: 0.42 * fl * L.lamp });
        }
      }
    }
    this._drawHalos(halos);
    for (let i = 0; i < bodies.length; i++) {
      /* v2.3.2860: frameBounds, not getBounds -- a cropped monster frame is
         bounded by its art, and the glow was sized to the whole cell */
      let b; try { b = frameBounds(bodies[i]); } catch (e) { continue; }
      if (!b || b.width < 2) continue;
      /* moonlight: cool, and not full -- lit enough to see, still at night.
         v2.3.2716: the tight-core light, its full part (the inner 40%)
         sized to the body, the tail dispersing well past it */
      const r = (Math.max(b.width, b.height) * 0.55 / 0.4) * gk;
      lights.push({ tex: 'glowTight', x: (b.x + b.width / 2) * gk, y: (b.y + b.height * 0.55) * gk, w: r * 2, h: r * 2, c: 0xc4d4ff, a: 0.6 * lampK });
    }
    /* plates: nine-slice softboxes, their bright middle exactly over the
       plate, full white -- the plate reads as it does by day */
    const pl = this._plateLights || (this._plateLights = []);
    let pn = 0;
    const sb = fxTex('softbox');
    for (let i = 0; i < plates.length && sb; i++) {
      let b; try { b = plates[i].getBounds(); } catch (e) { continue; }
      if (!b || b.width < 2) continue;
      let s = pl[pn];
      if (!s) {
        s = new NineSliceSprite({ texture: sb, leftWidth: SOFTBOX_EDGE, rightWidth: SOFTBOX_EDGE, topHeight: SOFTBOX_EDGE, bottomHeight: SOFTBOX_EDGE });
        s.blendMode = 'add';
        this._lightScene.addChild(s); pl.push(s);
      }
      s.x = b.x * gk - SOFTBOX_EDGE; s.y = b.y * gk - SOFTBOX_EDGE;
      s.width = b.width * gk + SOFTBOX_EDGE * 2; s.height = b.height * gk + SOFTBOX_EDGE * 2;
      s.visible = true;
      pn++;
    }
    for (let i = pn; i < pl.length; i++) pl[i].visible = false;
    this._probeNight = { plates: pn, monsters: bodies.length, props: props.length };
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      let s = this._lights[i];
      if (!s) {
        s = new Sprite(fxTex('glow') || Texture.WHITE);
        s.anchor.set(0.5); s.blendMode = 'add';
        this._lightScene.addChild(s); this._lights.push(s);
      }
      const t = fxTex(l.tex) || fxTex('glow');
      if (t && s.texture !== t) s.texture = t;
      s.x = l.x; s.y = l.y;
      s.width = l.w; s.height = l.h;
      s.tint = l.c;
      s.alpha = l.a;
      s.visible = true;
    }
    for (let i = lights.length; i < this._lights.length; i++) this._lights[i].visible = false;

    renderer.render({ container: this._lightScene, target: this._rt, clear: true });
    const ov = this._overlay;
    if (ov.texture !== this._rt) ov.texture = this._rt;
    ov.tint = 0xffffff;
    ov.x = cx; ov.y = cy; ov.width = viewW; ov.height = viewH;
    ov.visible = true;
  }

  _drawHalos(list) {
    const pool = this._halos || (this._halos = []);
    const tex = fxTex('mote');
    for (let i = 0; i < list.length && tex && this.glowLayer; i++) {
      let h = pool[i];
      if (!h) {
        h = new Sprite(tex);
        h.anchor.set(0.5); h.blendMode = 'add';
        this.glowLayer.addChild(h); pool.push(h);
      }
      const l = list[i];
      h.x = l.x; h.y = l.y; h.width = h.height = Math.max(6, l.r * 2);
      h.tint = l.c; h.alpha = Math.min(1, l.a);
      h.visible = true;
    }
    for (let i = list.length; i < pool.length; i++) pool[i].visible = false;
  }

  /* ─────────────────────────── the air ─────────────────────────── */
  _updateAir(S, cam, now, dt, wind) {
    const air = airOf(S.currentZone);
    const L = this._L || { lamp: 0 };
    const sky = zoneHasSky(S.currentZone, S);
    const night = sky && L.lamp > 0.4;
    let kind = air && air.motes ? air.motes : null;
    /* at night the green zones trade pollen for fireflies */
    if (night && air && air.fireflies) kind = 'fireflies';
    if (!this.airLayer || !fxTex('mote') || this._calm) kind = null;
    const style = kind === 'fireflies'
      ? { n: 14, tint: 0xe6ff9a, size: [2.6, 3.6], alpha: [0.0, 1.0], drift: 0.15, rise: 0, add: true, firefly: true }
      : (kind ? MOTE_STYLE[kind] : null);
    const { cx, cy, viewW, viewH } = cam;
    const n = style ? style.n : 0;
    if (kind !== this._moteKind) {
      /* re-seed across the view so a new zone starts full, not empty */
      this._moteKind = kind;
      for (let i = 0; i < this._motes.length; i++) this._motes[i]._seeded = false;
    }
    for (let i = 0; i < Math.max(n, this._motes.length); i++) {
      let m = this._motes[i];
      if (i >= n) { if (m) m.visible = false; continue; }
      if (!m) {
        m = new Sprite(fxTex('mote'));
        m.anchor.set(0.5);
        this.airLayer.addChild(m); this._motes.push(m);
      }
      /* v2.3.2717: a firefly GIVES light, so it lives above the night; every
         other mote is lit by it like the rest of the world */
      const want = style.firefly ? this.glowLayer : this.airLayer;
      if (m.parent !== want) want.addChild(m);
      if (!m._seeded) {
        m._seeded = true;
        m.x = cx + Math.random() * viewW; m.y = cy + Math.random() * viewH;
        m._ph = Math.random() * Math.PI * 2;
        m._sz = rand(style.size[0], style.size[1]);
        m._sp = 0.6 + Math.random() * 0.8;
        m.tint = style.tint;
        m.blendMode = style.add ? 'add' : 'normal';
        m._firefly = !!style.firefly;
      }
      /* drift with the wind, bob on its own phase */
      m.x += (wind.x * style.drift * m._sp + Math.sin(now / 900 + m._ph) * 6) * dt;
      m.y += (wind.y * style.drift * m._sp + style.rise * m._sp + Math.cos(now / 1100 + m._ph) * 4) * dt;
      /* wrap round the view with a margin, so the field never empties */
      const mx = 40;
      if (m.x < cx - mx) m.x += viewW + mx * 2; else if (m.x > cx + viewW + mx) m.x -= viewW + mx * 2;
      if (m.y < cy - mx) m.y += viewH + mx * 2; else if (m.y > cy + viewH + mx) m.y -= viewH + mx * 2;
      const tw = 0.5 + 0.5 * Math.sin(now / (style.firefly ? 520 : 1400) * m._sp + m._ph);
      m.alpha = style.alpha[0] + (style.alpha[1] - style.alpha[0]) * (style.firefly ? tw * tw : tw);
      if (style.firefly) m.alpha *= Math.min(1, (L.lamp - 0.4) / 0.3);
      /* a firefly is a soft ball of light with the bug at its heart */
      m.width = m.height = m._sz * (style.firefly ? 4.2 : 1.4);
      m.visible = true;
    }
    /* ═══ v2.3.2717: THE FIREFLY IN THE LIGHT ═══
       Owner: "Add little code drawn fireflies in the center of the balls of
       light."  A 7px pixel-art bug (worldFxTextures FLY_ART) rides on every
       firefly's glow, beating its wings and turning to face the way it drifts.
       Drawn over the glow, in the same layer, so its light map pool lights it. */
    const flies = this._flies || (this._flies = []);
    let fn = 0;
    if (kind === 'fireflies' && fxTex('fly0')) {
      for (let i = 0; i < this._motes.length; i++) {
        const m = this._motes[i];
        if (!m.visible || !m._firefly) continue;
        let f = flies[fn];
        if (!f) {
          f = new Sprite(fxTex('fly0'));
          f.anchor.set(0.5);
          this.glowLayer.addChild(f); flies.push(f);
        }
        const beat = Math.floor(now / 45 + m._ph * 10) % 2;
        const tex = fxTex(beat ? 'fly1' : 'fly0');
        if (f.texture !== tex) f.texture = tex;
        const dx = m.x - (m._px != null ? m._px : m.x), dy = m.y - (m._py != null ? m._py : m.y);
        if (dx * dx + dy * dy > 0.0004) m._ang = Math.atan2(dy, dx) + Math.PI / 2;
        m._px = m.x; m._py = m.y;
        f.x = m.x; f.y = m.y;
        f.rotation = m._ang || 0;
        f.scale.set(1.15);
        f.alpha = 1;
        f.visible = true;
        fn++;
      }
    }
    for (let i = fn; i < flies.length; i++) flies[i].visible = false;
  }

  /* ─────────────────────────── dust ─────────────────────────── */
  _updateDust(S, now, dt, wind) {
    const air = airOf(S.currentZone);
    const color = air && air.dust;
    if (color != null && fxTex('print') && this.groundLayer) {
      const seen = this._seenWalkers || (this._seenWalkers = new Set());
      seen.clear();
      if (S.player && !(S.rpg && S.rpg.hp <= 0)) {
        this._walk('me', S.player.x, S.player.y + feetDy(S, S.player.x, S.player.y), color, now, S.currentZone);
        seen.add('me');
      }
      if (S.others) {
        for (const id in S.others) {
          const o = S.others[id];
          if (!o || o._isDead) continue;
          const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
          this._walk(id, ox, oy + feetDy(S, ox, oy), color, now, S.currentZone);
          seen.add(id);
        }
      }
      for (const k of this._walkers.keys()) if (!seen.has(k)) this._walkers.delete(k);
    } else {
      this._walkers.clear();
    }

    for (let i = 0; i < this._prints.length; i++) {
      const p = this._prints[i];
      if (!p.visible) continue;
      const t = (now - p._ts) / PRINT_MS;
      if (t >= 1) { p.visible = false; continue; }
      /* pressed in, holds a beat, then the breeze takes it: it slides
         downwind, spreads and thins -- blown away, not faded out */
      const blow = t < 0.3 ? 0 : (t - 0.3) / 0.7;
      p.x += wind.x * 0.9 * blow * dt;
      p.y += wind.y * 0.9 * blow * dt;
      p.scale.set(p._s * (1 + blow * 0.35), p._s * (1 + blow * 0.2));
      p.alpha = (t < 0.08 ? t / 0.08 : 1) * 0.62 * (1 - blow * blow);
    }
    for (let i = 0; i < this._puffs.length; i++) {
      const p = this._puffs[i];
      if (!p.visible) continue;
      const t = (now - p._ts) / PUFF_MS;
      if (t >= 1) { p.visible = false; continue; }
      p.x += (wind.x * 1.3 + (p._bx || 0) * (1 - t)) * dt;
      p.y += (wind.y * 1.3 - 10 + (p._by || 0) * (1 - t)) * dt;
      p.scale.set(p._s * (0.55 + t * 0.8));
      p.alpha = PUFF_ALPHA * (1 - t) * (1 - t * 0.3);
    }
  }

  _walk(key, x, y, color, now, zone) {
    let w = this._walkers.get(key);
    if (!w) { this._walkers.set(key, { x, y, side: 1 }); return; }
    const dx = x - w.x, dy = y - w.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 90 * 90) { w.x = x; w.y = y; return; }   /* a teleport, not a stride */
    if (d2 < STEP * STEP) return;
    const d = Math.sqrt(d2), ux = dx / d, uy = dy / d;
    w.side = -w.side;
    /* one foot's print, beside the line of travel, toes the way you went */
    const px = w.x - uy * 3.2 * w.side, py = w.y + ux * 3.2 * w.side;
    /* The PRINT is darker than the dust, the PUFF lighter: a foot in light
       dust pushes it aside and shows the ground under it, and what it kicks
       up is the dust itself.  The first cut tinted both with the dust colour
       and on town's warm cobble the prints simply were not there. */
    /* v2.3.2825: the colour of THIS spot of ground (the zone's colour where
       no grid exists); water kicks up nothing. */
    const ground = groundColorAt(zone, w.x, w.y);
    if (ground === -1) { w.x = x; w.y = y; return; }
    const printC = ground != null ? shade(ground, 0.62) : shade(color, 0.58);
    const puffC = ground != null ? dustOf(ground) : color;
    if (key === 'me') this._lastDust = { ground, puff: puffC, x: Math.round(w.x), y: Math.round(w.y) };
    this._spawnPrint(px, py, Math.atan2(dy, dx) + Math.PI / 2, printC, now);
    /* v2.3.2825: a puff off EVERY step (was every other) and two of them,
       thrown back against the direction of travel -- the owner had never
       noticed the old single faint one. */
    this._spawnPuff(w.x - ux * 4 + uy * 3, w.y - uy * 4 - ux * 3, puffC, now, -ux, -uy);
    this._spawnPuff(w.x - ux * 2 - uy * 3, w.y - uy * 2 + ux * 3, puffC, now, -ux, -uy);
    w.x = x; w.y = y;
  }

  _spawnPrint(x, y, rot, color, now) {
    let p = this._prints[this._printI];
    if (!p) {
      p = new Sprite(fxTex('print'));
      p.anchor.set(0.5);
      this.groundLayer.addChild(p);
      this._prints[this._printI] = p;
    }
    this._printI = (this._printI + 1) % PRINT_POOL;
    p.x = x; p.y = y; p.rotation = rot; p.tint = color;
    p._s = 0.8; p.scale.set(p._s);   /* ~13x19 world px: a foot, beside a ~100px body */
    p._ts = now; p.alpha = 0; p.visible = true;
  }

  _spawnPuff(x, y, color, now, bx, by) {
    if (!this.partLayer || !fxTex('puff')) return;
    let p = this._puffs[this._puffI];
    if (!p) {
      p = new Sprite(fxTex('puff'));
      p.anchor.set(0.5);
      this.partLayer.addChild(p);
      this._puffs[this._puffI] = p;
    }
    this._puffI = (this._puffI + 1) % PUFF_POOL;
    p.x = x; p.y = y - 2; p.tint = color;
    /* v2.3.2825: bigger, stronger, and drifting back off the heel */
    p._s = rand(1.0, 1.35); p.scale.set(p._s * 0.55);
    p._bx = (bx || 0) * rand(14, 26); p._by = (by || 0) * rand(8, 16);
    p._ts = now; p.alpha = PUFF_ALPHA; p.visible = true;
  }

  /* ─────────────────────────── blood ─────────────────────────── */
  /* Bursts arrive on S._bloodBursts from the hit handler (gameEvents.js,
     monster_attack): where the victim stood, where the blow came FROM, and
     what share of their max HP it took. */
  _updateBlood(S, now, dt) {
    const q = S._bloodBursts;
    if (q && q.length) {
      for (let i = 0; i < q.length; i++) this._burst(q[i], now);
      q.length = 0;
    }
    for (let i = 0; i < this._drops.length; i++) {
      const d = this._drops[i];
      if (!d.visible) continue;
      d._vz -= GRAV * dt;
      d._gx += d._vx * dt; d._gy += d._vy * dt; d._z += d._vz * dt;
      if (d._z <= 0) {
        d.visible = false;
        if (Math.random() < d._splatP) this._spawnSplat(d._gx, d._gy, rand(0.16, 0.3), now);
        continue;
      }
      d.x = d._gx; d.y = d._gy - d._z;
      /* stretch along the flight, the way a flung drop reads */
      const sp = Math.hypot(d._vx, d._vy - d._vz);
      d.rotation = Math.atan2(d._vy - d._vz, d._vx);
      d.scale.set(d._s * (1 + Math.min(0.9, sp / 300)), d._s * 0.85);
    }
    for (let i = 0; i < this._splats.length; i++) {
      const s = this._splats[i];
      if (!s.visible) continue;
      const age = now - s._ts;
      if (age >= SPLAT_MS) { s.visible = false; continue; }
      /* soaks in: full for the first two thirds, then gone over the rest */
      const t = age / SPLAT_MS;
      s.alpha = s._a * (t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34);
      if (age < 120) { const g = s._s * (0.6 + 0.4 * (age / 120)); s.scale.set(g, g * 0.72); }
      else if (s.scale.x !== s._s) s.scale.set(s._s, s._s * 0.72);
    }
    for (let i = 0; i < this._mists.length; i++) {
      const m = this._mists[i];
      if (!m.visible) continue;
      const t = (now - m._ts) / 380;
      if (t >= 1) { m.visible = false; continue; }
      m.x += m._vx * dt; m.y += m._vy * dt;
      m.scale.set(m._s * (0.6 + t * 0.7));
      m.alpha = 0.75 * (1 - t);
    }
  }

  _burst(b, now) {
    if (!this.partLayer || !fxTex('drop')) return;
    const tier = bloodTier(b.frac);
    const cfg = BLOOD[tier];
    /* AWAY FROM THE BLOW.  The spray leaves the side of the body the hit
       came out of -- a monster to your west throws your blood east.  With no
       attacker (or one standing on you) it falls back to a loose ring. */
    let ax = b.x - (b.fromX != null ? b.fromX : b.x), ay = b.y - (b.fromY != null ? b.fromY : b.y);
    const al = Math.hypot(ax, ay);
    const aimed = al > 2;
    const base = aimed ? Math.atan2(ay, ax) : Math.random() * Math.PI * 2;
    const spread = aimed ? cfg.spread : Math.PI;
    const z0 = b.h || 20;
    this._lastBlood = { tier, frac: +(b.frac || 0).toFixed(3), dir: +base.toFixed(2), aimed, ts: now };
    for (let i = 0; i < cfg.drops; i++) {
      let d = this._drops[this._dropI];
      if (!d) {
        d = new Sprite(fxTex('drop'));
        d.anchor.set(0.5);
        this.partLayer.addChild(d);
        this._drops[this._dropI] = d;
      }
      this._dropI = (this._dropI + 1) % DROP_POOL;
      const a = base + (Math.random() - 0.5) * 2 * spread * (0.4 + Math.random() * 0.6);
      const sp = rand(cfg.speed[0], cfg.speed[1]);
      d._gx = b.x + Math.cos(a) * 4; d._gy = b.y + Math.sin(a) * 2;
      d._vx = Math.cos(a) * sp; d._vy = Math.sin(a) * sp * 0.7;
      d._z = z0 + rand(-5, 5); d._vz = rand(20, 110);
      d._s = rand(0.42, 0.8);
      d._splatP = cfg.splats;
      d.x = d._gx; d.y = d._gy - d._z;
      d.alpha = 1; d.visible = true;
    }
    if (cfg.mist && fxTex('mist')) {
      let m = this._mists[this._mistI];
      if (!m) {
        m = new Sprite(fxTex('mist'));
        m.anchor.set(0.5);
        this.partLayer.addChild(m);
        this._mists[this._mistI] = m;
      }
      this._mistI = (this._mistI + 1) % 8;
      m.x = b.x + Math.cos(base) * 6; m.y = b.y - z0;
      m._vx = Math.cos(base) * 40; m._vy = Math.sin(base) * 25;
      m._s = tier === 'heavy' ? 0.9 : 0.55;
      m._ts = now; m.alpha = 0.75; m.visible = true;
    }
    if (cfg.pool) {
      /* a heavy blow leaves a mark where you stood, just downrange */
      this._spawnSplat(b.x + Math.cos(base) * 8, b.y + Math.sin(base) * 5, rand(0.55, 0.75), now, base);
    }
  }

  _spawnSplat(x, y, s, now, rot) {
    if (!this.groundLayer) return;
    const k = 'splat' + (this._splatI % 3);
    let p = this._splats[this._splatI];
    if (!p) {
      p = new Sprite(fxTex(k) || Texture.EMPTY);
      p.anchor.set(0.5);
      this.groundLayer.addChild(p);
      this._splats[this._splatI] = p;
    }
    this._splatI = (this._splatI + 1) % SPLAT_POOL;
    p.x = x; p.y = y;
    p.rotation = rot != null ? rot : Math.random() * Math.PI * 2;
    p._s = s; p.scale.set(s * 0.6, s * 0.6 * 0.72);   /* lying on the ground: flattened toward the camera */
    p._a = 0.85; p.alpha = 0.85;
    p._ts = now; p.visible = true;
  }
}

/* The hit handler's side of blood: queue a burst for the next frame.  Kept
   here, beside the drawer, so the one rule for what a burst carries lives in
   one file; gameEvents only says where, from where, and how much. */
export function queueBlood(S, x, y, fromX, fromY, frac) {
  if (!S || !(frac > 0)) return;
  if (!S._bloodBursts) S._bloodBursts = [];
  if (S._bloodBursts.length > 24) return;   /* a flood of hits in one frame is one frame of blood */
  /* `y` is the body's middle; the drops leave from there (h above the
     ground) and land on the ground under the feet */
  const fd = feetDy(S, x, y);
  S._bloodBursts.push({ x, y: y + fd, fromX, fromY: fromY != null ? fromY + fd : fromY, frac, h: fd + 2 });
}
