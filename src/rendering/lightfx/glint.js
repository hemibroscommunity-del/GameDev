/* ═══ v2.3.2710: METAL THAT CATCHES THE LIGHT ═══
 *
 * Owner: "adding material-specific textures or shine."
 *
 * WHY METAL NEEDS HELP.  Every metal in the game is ONE steel image drawn with
 * a tint (materialTints.js, v2.3.1757) -- the reason a copper set costs no
 * more memory than a steel one.  But a tint can only multiply, so a copper
 * plate's brightest highlight comes out copper-coloured rather than bright,
 * and highlights are most of what makes metal read as metal.  The glint gives
 * them back for a moment: a narrow band of the metal's own shine colour sweeps
 * across the piece, strongest on its already-bright pixels (so the steel
 * shines and the leather grip barely does).
 *
 * QUALITY IS THE CADENCE.  A normal piece catches the light every few
 * seconds; the better the grade, the more often and the brighter, and a godly
 * piece gleams gold on a short cycle -- the grades are the gear's whole value
 * since v2.3.2664, and this is the first time one is visible on the
 * character rather than only in the bag.  Other players' grades are not on
 * the wire (the relay carries the metal, `wpnMat`, and not the grade), so
 * their gear glints at the normal cadence until one is sent.
 *
 * WHAT GLINTS: metal only, by the rules the tint pipeline already has --
 * swords and greatswords in a metal (weaponMaterial: never a bow or staff),
 * and the plate and greaves art.  Cloth, bows, staffs and bare hands never do.
 *
 * COST.  A filter on a sprite is an extra render pass for that sprite, so the
 * filter is attached ONLY for the half-second a sweep is crossing it and
 * removed after; between sweeps a piece costs nothing.  Each piece's sweep
 * starts at its own offset (a hash of who and which slot), so a room of
 * players does not flash in unison -- which is also what keeps the number of
 * filtered sprites in any one frame small.
 *
 * ═══ v2.3.2863: A SOFT SHINE THAT STAYS (PREVIEW, OFF UNLESS ASKED FOR) ═══
 *
 * Owner: "aside from the glint can you see what adding a permanent soft shine
 * to armor and sword (and other metals) would look like?"
 *
 * The same filter, with a second term that never switches off: the art's own
 * highlights lifted toward the metal's shine colour, a little more on the side
 * of the piece that faces the zone's sun.  It fixes the thing the tint cannot
 * (materialTints.js, v2.3.1761: "a tint MULTIPLIES, so the ceiling is the art
 * itself"): a copper plate's brightest pixel is copper-coloured, never bright.
 * The shader divides the tint back out to find where the steel art was bright,
 * then adds light there, so copper gets real highlights and stays copper.
 *
 *     ?sheen=1   turn it on on this device (remembered)
 *     ?sheen=0   off again
 *
 * THE COST IS WHY IT IS A PREVIEW.  A filter is an extra render pass for the
 * sprite it is on; the glint pays it for half a second every few seconds, the
 * sheen pays it every frame, for every metal piece on screen -- three for a
 * player in plate, greaves and a sword, so a busy plaza of armoured players is
 * dozens of passes a frame.  If the look is wanted, the shipping version
 * should not be a filter: bake one highlight mask per gear sheet (shared by
 * all three metals) and draw it as an additive sprite over the piece, which
 * batches like any other sprite.
 *
 * It also reaches the one piece the glint never did: jogging in a full set of
 * one metal, the armour is drawn as a single knight figure ON THE BODY sprite
 * (entityRenderer _fullsetFrame), and the chest and leg layers are empty.
 */
import { Filter } from 'pixi.js';
import { weaponMaterial } from '../traits/materialTints.js';
import { gearArt, gearMaterial } from '../gearVariants.js';
import { getEquip } from '../gearCatalog.js';

const FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
/* highp to match the vertex stage -- see the note in shadows.js */
uniform highp vec4 uInputSize;
uniform highp vec4 uOutputFrame;
uniform float uProgress;
uniform float uStrength;
uniform vec3 uColor;
uniform float uSheen;
uniform vec2 uSun;
uniform vec3 uTint;

void main()
{
    vec4 c = texture(uTexture, vTextureCoord);
    vec2 p = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
    float t = mix(-0.25, 1.25, uProgress);
    float d = (p.x * 0.75 + (1.0 - p.y) * 0.65) / 1.4 - t;
    float band = exp(-(d * d) / 0.006);
    float lum = c.a > 0.0 ? dot(c.rgb / c.a, vec3(0.299, 0.587, 0.114)) : 0.0;
    float k = band * uStrength * (0.3 + 0.7 * lum);
    /* v2.3.2863: the sheen.  How bright the ART was here, before the metal's
       tint multiplied it down: the drawn colour divided by the tint. */
    vec3 art = c.a > 0.0 ? clamp(c.rgb / c.a / max(uTint, vec3(0.05)), 0.0, 1.0) : vec3(0.0);
    /* only the art's real highlights: a broad mask lifted the midtones too,
       and the metal read as lighter rather than shinier */
    float hi = smoothstep(0.55, 0.96, dot(art, vec3(0.299, 0.587, 0.114)));
    /* the sprite's frame is mostly empty margin around the figure, so the
       gradient is steep enough to swing across the metal itself */
    float side = clamp(0.5 + dot(p - 0.5, uSun) * 3.0, 0.0, 1.0);
    float s = uSheen * hi * (0.35 + 0.65 * side);
    vec3 rgb = min(c.rgb + uColor * ((k + s) * c.a), vec3(c.a));
    finalColor = vec4(rgb, c.a);
}
`;
const VERT = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

function makeGlintFilter() {
  return Filter.from({
    gl: { vertex: VERT, fragment: FRAG, name: 'bt-glint-filter' },
    resources: {
      glintUniforms: {
        uProgress: { value: 0, type: 'f32' },
        uStrength: { value: 0.6, type: 'f32' },
        uColor: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
        uSheen: { value: 0, type: 'f32' },                                   /* v2.3.2863 */
        uSun: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
        uTint: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
      },
    },
    /* at the SCREEN's resolution: the default (1 texel per CSS px) would
       redraw the sword at a third of its sharpness on a 3x phone for the
       length of every sweep -- a glint that blurs the blade is a worse blade */
    resolution: 'inherit',
  });
}

/* The shine colour of each metal: steel white, iron cooler, copper warm. */
export const METAL_SHINE = Object.assign(Object.create(null), {
  steel: [1.0, 1.0, 1.0],
  iron: [0.86, 0.93, 1.0],
  copper: [1.0, 0.80, 0.58],
});
/* Grade -> how often (period), how long (dur) and how bright. */
/* Strength above 1 is allowed: the shader caps each pixel at white, so a
   high strength widens the part of the band that reaches white rather than
   blowing the whole blade out.  First cut had normal at 0.55 and in the
   pictures a normal copper blade's glint could not be seen at phone size. */
/* v2.3.2863: `sheen` is the permanent shine's strength at its brightest
   (the art's highlights, on the sun side) -- it climbs with the grade too, so
   a better piece is shinier all the time, not only more often.
   THE STRONG CUT.  The preview's pictures showed three columns -- off, a soft
   sheen (0.55 for a normal piece) and a stronger one at 1.5x -- and the
   owner's answer was "I do like the strong polish previews", so the strong
   cut is the sheen.  Above 1 is fine: the shader caps each pixel at white, so
   a higher number widens the highlight rather than blowing the piece out. */
export const GRADE_SHINE = Object.assign(Object.create(null), {
  normal: { period: 6500, dur: 560, strength: 0.85, sheen: 0.83 },
  rare: { period: 4600, dur: 560, strength: 1.0, sheen: 0.93 },
  elite: { period: 3300, dur: 600, strength: 1.15, sheen: 1.05 },
  godly: { period: 1900, dur: 680, strength: 1.4, sheen: 1.2, color: [1.0, 0.92, 0.6] },
});

/* ═══ v2.3.2863: THE SHEEN'S SWITCH -- OFF UNLESS THIS DEVICE ASKED ═══ */
const SHEEN_KEY = 'bt-sheen';
let _sheen = null;
export function sheenOn() {
  if (_sheen !== null) return _sheen;
  let v = null;
  try {
    const m = /[?&]sheen=(1|0|on|off)\b/.exec(window.location.search);
    if (m) {
      v = (m[1] === '1' || m[1] === 'on') ? '1' : '0';
      localStorage.setItem(SHEEN_KEY, v);
    } else {
      v = localStorage.getItem(SHEEN_KEY);
    }
  } catch (e) { v = null; }
  _sheen = v === '1';
  return _sheen;
}
export function setSheen(on) {
  _sheen = !!on;
  try { localStorage.setItem(SHEEN_KEY, _sheen ? '1' : '0'); } catch (e) { /* the switch still flips for this page */ }
}

const METAL_ART = { steelplate: 1, steelgreaves: 1 };
/** The metal an armour item is, or null if it is not metal. */
export function armourMetal(item) {
  if (!item || item === 'none') return null;
  const art = gearArt(item);
  return (art && METAL_ART[art]) ? (gearMaterial(item) || 'steel') : null;
}

function hashPhase(s, period) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % period;
}

/* Where each figure keeps its metal pieces: the display's own layers, and
   the stand-in sprites drawn in its place during a swing or a gather. */
const SELF_WEAPON_STAND_INS = ['swordWeaponSprite'];
const SELF_CHEST_STAND_INS = ['swordChestSprite', 'bowChestSprite', 'chopChestSprite', 'cookChestSprite', 'fireChestSprite'];
const SELF_LEGS_STAND_INS = ['swordLegsSprite', 'bowLegsSprite', 'chopLegsSprite', 'cookLegsSprite', 'fireLegsSprite',
  'swordJogLegsGearSprite', 'bowJogLegsGearSprite'];

function pushVisible(list, s) { if (s && s.visible && !s.destroyed) list.push(s); }

export class GlintSystem {
  constructor() {
    this._on = new Map();        /* sprite -> filter currently attached */
    this._pool = [];
    this.force = null;           /* QA/pictures: a fixed sweep progress, 0-1; -1 = no sweep anywhere (v2.3.2863) */
    this.stats = { targets: 0, lit: 0, sheen: 0 };
    this._lastTargets = null;
    this.sheenScale = null;      /* QA/pictures: multiply the sheen, to show a softer or stronger cut */
    this._bodies = new Set();    /* this frame's full-set body sprites, for the probe */
  }

  _filter() { return this._pool.pop() || makeGlintFilter(); }

  _release(spr, f) {
    try {
      if (!spr.destroyed && spr.filters && spr.filters.length === 1 && spr.filters[0] === f) spr.filters = null;
    } catch (e) { /* a destroyed sprite has nothing to release */ }
    this._pool.push(f);
  }

  clear() {
    for (const [spr, f] of this._on) this._release(spr, f);
    this._on.clear();
    this.stats.targets = 0; this.stats.lit = 0; this.stats.sheen = 0;
    this._lastTargets = null;
    this._bodies.clear();
  }

  /* One figure-slot: which sprites show it, what metal, what grade. */
  _slot(out, key, sprites, metal, grade) {
    if (!metal || !sprites.length) return;
    const g = GRADE_SHINE[grade] || GRADE_SHINE.normal;
    out.push({ key, sprites, color: g.color || METAL_SHINE[metal] || METAL_SHINE.steel, g });
  }

  _targets(S, er, fx, zone) {
    const out = [];
    this._bodies.clear();
    const pd = er && er.playerDisplay;
    const rpg = S && S.rpg;
    if (pd && !pd.destroyed && rpg) {
      const melee = (rpg.activeSlot || 'melee') === 'melee';
      const w = melee ? rpg.weapon : null;
      const wm = w ? weaponMaterial(w.type, w.gearBase) : null;
      if (wm) {
        const s = [];
        if (pd.visible) pushVisible(s, pd._weaponSprite);
        if (fx) for (const k of SELF_WEAPON_STAND_INS) pushVisible(s, fx[k]);
        this._slot(out, 'self:w', s, wm, w.quality);
      }
      const cm = armourMetal(getEquip('chest'));
      if (cm) {
        const s = [];
        if (pd.visible) pushVisible(s, pd._gearChest);
        /* v2.3.2863: jogging in a full set, the armour IS the body sprite */
        if (pd.visible && pd._fullsetOn && pd._spriteBody && pd._spriteBody.visible) {
          pushVisible(s, pd._spriteBody);
          this._bodies.add(pd._spriteBody);
        }
        if (fx) for (const k of SELF_CHEST_STAND_INS) pushVisible(s, fx[k]);
        this._slot(out, 'self:c', s, cm, rpg.armor && rpg.armor.quality);
      }
      const lm = armourMetal(getEquip('legs'));
      if (lm) {
        const s = [];
        if (pd.visible) pushVisible(s, pd._gearLegs);
        if (fx) for (const k of SELF_LEGS_STAND_INS) pushVisible(s, fx[k]);
        this._slot(out, 'self:l', s, lm, rpg.legsArmor && rpg.legsArmor.quality);
      }
    }
    const others = (S && S.others) || null;
    if (er && er.otherPlayerDisplays && others) {
      for (const [id, d] of er.otherPlayerDisplays) {
        const o = others[id];
        if (!d || d.destroyed || !o || (o.zone || o.z || 'town') !== zone) continue;
        const sw = fx && fx._remoteSwordSprites && fx._remoteSwordSprites.get(id);
        const wm = weaponMaterial(o.wpnType, o.wpnMat);
        if (wm) {
          const s = [];
          if (d.visible) pushVisible(s, d._weaponSprite);
          if (sw) pushVisible(s, sw.weapon);
          this._slot(out, id + ':w', s, wm, 'normal');
        }
        const cm = armourMetal(o.eqc);
        if (cm) {
          const s = [];
          if (d.visible) pushVisible(s, d._gearChest);
          if (d.visible && d._fullsetOn) pushVisible(s, d._spriteBody);   /* v2.3.2863 */
          if (sw) pushVisible(s, sw.chest);
          this._slot(out, id + ':c', s, cm, 'normal');
        }
        const lm = armourMetal(o.eql);
        if (lm) {
          const s = [];
          if (d.visible) pushVisible(s, d._gearLegs);
          if (sw) pushVisible(s, sw.legs);
          this._slot(out, id + ':l', s, lm, 'normal');
        }
      }
    }
    return out;
  }

  /* `sheen` (v2.3.2863): null when the permanent shine is off, else
     { k, sx, sy } -- how much of it the light allows (0-1) and the direction
     of the sun on screen (a unit vector, or 0,0 in a zone with no sun). */
  update(S, now, er, fx, zone, sheen) {
    const targets = this._targets(S, er, fx, zone);
    const want = new Map();       /* sprite -> { p, strength, color, sheen } */
    const sk = sheen ? (this.sheenScale == null ? 1 : this.sheenScale) * sheen.k : 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      let p = -1;                 /* no sweep crossing it: the band term is off */
      if (this.force != null) p = this.force;   /* QA: pinned; -1 pins "between sweeps" */
      else {
        const phase = hashPhase(t.key, t.g.period);
        const into = (now + phase) % t.g.period;
        if (into < t.g.dur) p = into / t.g.dur;
      }
      if (p < 0 && !(sk > 0)) continue;
      const w = { p, strength: p >= 0 ? t.g.strength : 0, color: t.color, sheen: sk * (t.g.sheen || 0) };
      for (let j = 0; j < t.sprites.length; j++) want.set(t.sprites[j], w);
    }
    /* take the filter off anything whose sweep has passed */
    for (const [spr, f] of this._on) {
      if (!want.has(spr) || spr.destroyed) { this._release(spr, f); this._on.delete(spr); }
    }
    for (const [spr, w] of want) {
      let f = this._on.get(spr);
      if (!f) {
        /* never take over a sprite some other effect is filtering */
        if (spr.filters && spr.filters.length) continue;
        f = this._filter();
        spr.filters = [f];
        this._on.set(spr, f);
      }
      const u = f.resources.glintUniforms.uniforms;
      u.uProgress = w.p < 0 ? 0 : w.p;
      u.uStrength = w.strength;
      u.uColor[0] = w.color[0]; u.uColor[1] = w.color[1]; u.uColor[2] = w.color[2];
      u.uSheen = w.sheen;
      if (w.sheen > 0) {
        u.uSun[0] = sheen.sx; u.uSun[1] = sheen.sy;
        /* the tint this sprite is drawn with, read off the sprite itself, so
           the shader can find where the art was bright under any metal */
        const tn = typeof spr.tint === 'number' ? spr.tint : 0xffffff;
        u.uTint[0] = ((tn >> 16) & 255) / 255; u.uTint[1] = ((tn >> 8) & 255) / 255; u.uTint[2] = (tn & 255) / 255;
      }
    }
    this.stats.targets = targets.length;
    this.stats.lit = this._on.size;
    this.stats.sheen = sk > 0 ? this._on.size : 0;
    this._lastTargets = targets;
  }

  /* QA probe (v2.3.2863): which slots are lit right now, and whether that
     includes a full-set figure on a body sprite.  Worked out here, when asked,
     rather than every frame. */
  probeStats() {
    const t = this._lastTargets || [];
    let body = 0;
    for (const b of this._bodies) if (this._on.has(b)) body++;
    return {
      ...this.stats,
      keys: t.filter((x) => x.sprites.some((q) => this._on.has(q))).map((x) => x.key),
      body,
    };
  }
}
