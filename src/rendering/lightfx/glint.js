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

void main()
{
    vec4 c = texture(uTexture, vTextureCoord);
    vec2 p = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
    float t = mix(-0.25, 1.25, uProgress);
    float d = (p.x * 0.75 + (1.0 - p.y) * 0.65) / 1.4 - t;
    float band = exp(-(d * d) / 0.006);
    float lum = c.a > 0.0 ? dot(c.rgb / c.a, vec3(0.299, 0.587, 0.114)) : 0.0;
    float k = band * uStrength * (0.3 + 0.7 * lum);
    vec3 rgb = min(c.rgb + uColor * (k * c.a), vec3(c.a));
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
export const GRADE_SHINE = Object.assign(Object.create(null), {
  normal: { period: 6500, dur: 560, strength: 0.85 },
  rare: { period: 4600, dur: 560, strength: 1.0 },
  elite: { period: 3300, dur: 600, strength: 1.15 },
  godly: { period: 1900, dur: 680, strength: 1.4, color: [1.0, 0.92, 0.6] },
});

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
    this.force = null;           /* QA/pictures: a fixed sweep progress, 0-1 */
    this.stats = { targets: 0, lit: 0 };
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
    this.stats.targets = 0; this.stats.lit = 0;
  }

  /* One figure-slot: which sprites show it, what metal, what grade. */
  _slot(out, key, sprites, metal, grade) {
    if (!metal || !sprites.length) return;
    const g = GRADE_SHINE[grade] || GRADE_SHINE.normal;
    out.push({ key, sprites, color: g.color || METAL_SHINE[metal] || METAL_SHINE.steel, g });
  }

  _targets(S, er, fx, zone) {
    const out = [];
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

  update(S, now, er, fx, zone) {
    const targets = this._targets(S, er, fx, zone);
    const want = new Map();       /* sprite -> { p, strength, color } */
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      let p;
      if (this.force != null) p = this.force;
      else {
        const phase = hashPhase(t.key, t.g.period);
        const into = (now + phase) % t.g.period;
        if (into >= t.g.dur) continue;
        p = into / t.g.dur;
      }
      for (let j = 0; j < t.sprites.length; j++) want.set(t.sprites[j], { p, strength: t.g.strength, color: t.color });
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
      u.uProgress = w.p;
      u.uStrength = w.strength;
      u.uColor[0] = w.color[0]; u.uColor[1] = w.color[1]; u.uColor[2] = w.color[2];
    }
    this.stats.targets = targets.length;
    this.stats.lit = this._on.size;
  }
}
