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
 * ═══ v2.3.2864: A SOFT SHINE THAT STAYS (PREVIEW, OFF UNLESS ASKED FOR) ═══
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
 *
 * ═══ v2.3.2887: ON FOR EVERYONE, ON EVERY ANIMATION ═══
 *
 * Owner, after the previews: "Push the metal shine to main and I'll revert it
 * if I don't like it ... make sure the shine stays on through every armor
 * animation and through different recolors (like copper recolored from the
 * original steel)".
 *
 * So the switch is ON unless a device turns it off (`?sheen=0`, remembered;
 * `?sheen=1` puts it back).  The cost above is the price taken on with it --
 * if phones feel it, the baked mask is the cheaper form of the same look.
 *
 * And it now reaches the three things on OTHER players it missed: their bow
 * shot (its chest and greaves, and the greaves on the running legs under a
 * moving shot), the running legs under their moving sword swing, and their
 * chop / cook / fire figures.  On YOUR figure, the arm and hand re-drawn over
 * a sword are clones of the body, so in a full set they are plate too (see
 * unmaskedArea for why they need their filter pinned).  Every metal is one
 * steel image under a tint,
 * and the filter reads the tint off the sprite it is on, so wherever it is
 * attached copper stays copper and iron stays iron.  mp-sheenall walks every
 * armour animation, yours and another player's, in all three metals and
 * fails on any metal piece drawn without it -- it finds the metal by the art
 * file each sprite is drawing, not by this file's list, so a new stand-in
 * that nobody adds here is caught rather than trusted.
 *
 * ═══ v2.3.2902: SOFTER, AND THE SWEEP IS GONE ═══
 *
 * Owner, with it live: "I think the shine needs to be dialed back just a bit.
 * It also doesn't need the occasionally 10 second flash animation (to show
 * the shine).  I just don't want it to look like white spots (rather than
 * shine) on the armor and it's on the edge of looking like that right now."
 *
 * THE WHITE SPOTS WERE THE CLIP, NOT THE STRENGTH.  The sheen was ADDED to
 * the pixel and capped at white, and on the sun side every steel pixel from
 * about 0.72 up reached the cap -- a flat white patch wherever the art's
 * highlights sit.  Measured on one frozen standing figure (phone, dpr 3):
 * ~1,000 pixels of a steel set pushed to flat white.  Turning the strength
 * down barely moved it -- 55% of the strength still left ~670 -- because the
 * brightest highlights clip at almost any strength.  So the added light now
 * ROLLS OFF toward a ceiling below white (SHEEN_CEIL x the metal's shine
 * colour) instead of clipping: a small lift behaves as before, a big one
 * approaches the ceiling and stops.  Flat-white pixels: 0 in every metal.
 * The mid-tones keep about 60-75% of their old lift, and the would-be-white
 * highlights come out a light metal colour -- bright
 * copper for copper, gold for a godly piece (whose gold used to wash out to
 * white at exactly its brightest points).
 *
 * The periodic sweep (the "flash") is off: AUTO_SWEEP.  The band is still in
 * the shader and `force` still pins it, for pictures and QA.
 */
import { Filter, Rectangle } from 'pixi.js';
import { weaponMaterial } from '../traits/materialTints.js';
import { gearArt, gearMaterial } from '../gearVariants.js';
import { getEquip } from '../gearCatalog.js';
import { Sprite, Texture } from 'pixi.js';   /* v2.3.2904: the loading-screen warm-up (prewarmGlintPipe) */

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

/* v2.3.2902: how far toward the metal's shine colour the sheen may take a
   pixel -- 0.92 of it, so steel tops out at a light grey (235), never white */
const float SHEEN_CEIL = 0.92;

void main()
{
    vec4 c = texture(uTexture, vTextureCoord);
    vec2 p = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
    float t = mix(-0.25, 1.25, uProgress);
    float d = (p.x * 0.75 + (1.0 - p.y) * 0.65) / 1.4 - t;
    float band = exp(-(d * d) / 0.006);
    float lum = c.a > 0.0 ? dot(c.rgb / c.a, vec3(0.299, 0.587, 0.114)) : 0.0;
    float k = band * uStrength * (0.3 + 0.7 * lum);
    /* v2.3.2864: the sheen.  How bright the ART was here, before the metal's
       tint multiplied it down: the drawn colour divided by the tint. */
    vec3 art = c.a > 0.0 ? clamp(c.rgb / c.a / max(uTint, vec3(0.05)), 0.0, 1.0) : vec3(0.0);
    /* only the art's real highlights: a broad mask lifted the midtones too,
       and the metal read as lighter rather than shinier */
    float hi = smoothstep(0.55, 0.96, dot(art, vec3(0.299, 0.587, 0.114)));
    /* the sprite's frame is mostly empty margin around the figure, so the
       gradient is steep enough to swing across the metal itself */
    float side = clamp(0.5 + dot(p - 0.5, uSun) * 3.0, 0.0, 1.0);
    float s = uSheen * hi * (0.35 + 0.65 * side);
    /* v2.3.2902: the sheen ROLLS OFF below white instead of being added and
       clipped.  Per channel, head is the room left under the ceiling; the
       lift is that room x (1 - e^(-added/room)), which is the old added light
       while it is small against the room and approaches the ceiling as it
       grows.  A pixel already above the ceiling (the art's own brightest
       paint) is left exactly as drawn.  Worked in straight colour, not
       premultiplied, so a soft edge pixel rolls off the same way. */
    vec3 col = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
    vec3 head = max(uColor * SHEEN_CEIL - col, vec3(0.0));
    col += head * (vec3(1.0) - exp(-(uColor * s) / max(head, vec3(0.001))));
    /* the sweep's band (only when pinned now -- see AUTO_SWEEP) still adds */
    col = min(col + uColor * k, vec3(1.0));
    finalColor = vec4(col * c.a, c.a);
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
        uSheen: { value: 0, type: 'f32' },                                   /* v2.3.2864 */
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

/* ═══ v2.3.2904: THE SHINE'S SHADER IS BUILT BEHIND THE LOADING SCREEN ═══
 *
 * Owner: "The game still drops in frame rate when you first wear a piece of
 * armor when running the game on my phone (iPhone 14 pro max)."
 *
 * Part of that first-wear hitch was this file.  Since v2.3.2887 the sheen is
 * on for everyone, so the first frame a player wears metal is also the first
 * frame this filter is ever drawn -- and a WebGL program is compiled and
 * linked the first time it is USED, on the main thread, inside that frame
 * (Pixi's GlShaderSystem generateProgram: the link-status read waits for the
 * compile).  Profiled in the sandbox's Chromium: generateProgram was 35 ms of
 * the first sweep's frame at 4x CPU throttle; with this warm-up it is not in
 * that frame at all.  (The sandbox draws WebGL in SOFTWARE, and its first
 * sweep is still a slow frame with or without this -- the software
 * rasteriser's own first-draw work, in another process, which says nothing
 * about a phone's GPU either way.)  On an iPhone, WebKit draws WebGL through
 * ANGLE's Metal backend, which has to turn the program into a Metal shader
 * too, on that same first use -- the kind of first-use hitch the
 * animation-preload law (CLAUDE.md) keeps out of play.
 *
 * So one filtered sprite is drawn here, behind the loading screen, the way
 * prewarmDmgFontPipe warms the damage-number pipe.  Every glint filter is
 * built from the SAME GlProgram (GlProgram.from caches it by its source), so
 * compiling it once compiles it for all of them, and the filter used for the
 * warm-up is kept for the first real shine to take (GlintSystem._filter).
 * Nothing is left on screen: the canvas is under the loading overlay, and the
 * next game frame redraws the whole of it. */
const _warmFilters = [];
const _warmStats = { runs: 0, ok: 0 };
if (typeof window !== 'undefined') window.__btGlintWarm = () => ({ ..._warmStats, pooled: _warmFilters.length });   /* QA */
export function prewarmGlintPipe(renderer) {
  if (!renderer) return false;
  _warmStats.runs++;
  let spr = null, f = null, ok = false;
  try {
    f = makeGlintFilter();
    spr = new Sprite(Texture.WHITE);
    /* small on purpose: the program does not depend on the size, and the
       texture the pass borrows stays in Pixi's pool for good -- 32 px is a
       128x128 texture even at an iPhone's 3x, not a megabyte */
    spr.width = 32; spr.height = 32;
    spr.alpha = 0.001;   /* must actually draw -- alpha 0 is skipped (see prewarmDmgFontPipe) */
    /* both terms on, the sweep and the sheen: one program either way, but a
       pass that exercises the whole shader is the honest warm-up */
    const u = f.resources.glintUniforms.uniforms;
    u.uProgress = 0.5; u.uSheen = 1;
    spr.filters = [f];
    renderer.render({ container: spr });
    ok = true;
  } catch (e) { ok = false; }
  try { if (spr) { spr.filters = null; spr.destroy(); } } catch (e) { /* best-effort */ }
  if (ok) _warmStats.ok++;
  if (ok && f && !_warmFilters.length) _warmFilters.push(f);   /* one is enough; a second loading screen does not stack them */
  else if (f) { try { f.destroy(); } catch (e) { /* best-effort; the shared program is never destroyed with it */ } }
  return ok;
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
/* v2.3.2864: `sheen` is the permanent shine's strength at its brightest
   (the art's highlights, on the sun side) -- it climbs with the grade too, so
   a better piece is shinier all the time, not only more often.
   THE STRONG CUT.  The preview's pictures showed three columns -- off, a soft
   sheen (0.55 for a normal piece) and a stronger one at 1.5x -- and the
   owner's answer was "I do like the strong polish previews", so the strong
   cut is the sheen.  Above 1 is fine: the shader caps each pixel at white, so
   a higher number widens the highlight rather than blowing the piece out. */
/* v2.3.2902: the numbers are unchanged; what they feed changed.  `sheen` is
   the light ADDED before the roll-off (see SHEEN_CEIL in the shader), so it
   no longer reaches white at any value -- a higher grade is still shinier,
   it approaches the ceiling sooner.  period / dur / strength are the sweep's,
   which only runs when pinned (AUTO_SWEEP). */
export const GRADE_SHINE = Object.assign(Object.create(null), {
  normal: { period: 6500, dur: 560, strength: 0.85, sheen: 0.83 },
  rare: { period: 4600, dur: 560, strength: 1.0, sheen: 0.93 },
  elite: { period: 3300, dur: 600, strength: 1.15, sheen: 1.05 },
  godly: { period: 1900, dur: 680, strength: 1.4, sheen: 1.2, color: [1.0, 0.92, 0.6] },
});

/* ═══ v2.3.2902: NO SWEEP UNLESS ASKED FOR ═══
   Owner: "It also doesn't need the occasionally 10 second flash animation (to
   show the shine)."  The periodic band across every metal piece -- by grade,
   every 1.9-6.5 s, v2.3.2710 -- is off; the permanent sheen is the shine now.
   A pinned sweep (`force`, window.__btLightFx.glint) still draws the band, for
   pictures and QA.  true brings the cadence back exactly as it was. */
const AUTO_SWEEP = false;

/* ═══ v2.3.2864: THE SHEEN'S SWITCH -- OFF UNLESS THIS DEVICE ASKED ═══ */
/* v2.3.2887: ...and now ON unless this device turned it off, the way
   lightFxOn reads -- so a storage that cannot be read (private mode) gets the
   game as it ships.  A '1' stored by the preview reads as on, as before. */
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
  _sheen = v !== '0';   /* v2.3.2887: was `v === '1'` */
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

/* ═══ v2.3.2887: A MASKED SPRITE IS LIT ACROSS ITS WHOLE PICTURE ═══
   Pixi 8 shrinks an effect's working area to the mask's box
   (getFastGlobalBounds: a mask's addBounds clips it), and this shader lays
   the sun side and the sweep out across that area (`p`).  So a masked clone
   of the body -- the arm and hand re-drawn over a sword -- was lit across a
   hand-sized box while the body under it was lit across the whole figure:
   the same pixels, two different shines, a seam.  `filterArea` pins the area
   to the box the body's own filter gets instead -- Sprite.updateBounds: the
   WHOLE frame (`orig`, even for a cropped texture; the crop is only the
   drawn quad), placed by the anchor.  Measured on one frozen frame (a steel
   knight jogging east, the sweep pinned across it), counting the pixels the
   arm clone changes by more than 8 a channel: 628 with this, 611 with no
   shine anywhere (the clone's own soft edges drawn twice, since v2.3.200),
   2776 without the pin -- and the first cut, pinned to the crop instead of
   the frame, drew a visibly darker arm.  The mask still clips what is drawn
   -- it runs first (priority 0) and the filter inside it (priority 1). */
function unmaskedArea(spr) {
  const t = spr.texture;
  const o = t && (t.orig || t.frame);
  if (!o) return null;
  const r = spr._btGlintArea || (spr._btGlintArea = new Rectangle());
  const ax = spr.anchor ? spr.anchor.x : 0, ay = spr.anchor ? spr.anchor.y : 0;
  r.x = -ax * o.width;
  r.y = -ay * o.height;
  r.width = o.width;
  r.height = o.height;
  return r;
}

export class GlintSystem {
  constructor() {
    this._on = new Map();        /* sprite -> filter currently attached */
    this._pool = [];
    this.force = null;           /* QA/pictures: a fixed sweep progress, 0-1; -1 = no sweep anywhere (v2.3.2864) */
    this.stats = { targets: 0, lit: 0, sheen: 0, sweeping: 0 };   /* v2.3.2902: + sweeping, the pieces a band is crossing this frame */
    this._lastTargets = null;
    this.sheenScale = null;      /* QA/pictures: multiply the sheen, to show a softer or stronger cut */
    this._bodies = new Set();    /* this frame's full-set body sprites, for the probe */
  }

  _filter() { return this._pool.pop() || _warmFilters.pop() || makeGlintFilter(); }   /* v2.3.2904: the loading screen's filter first */

  _release(spr, f) {
    try {
      if (!spr.destroyed && spr.filters && spr.filters.length === 1 && spr.filters[0] === f) spr.filters = null;
      if (!spr.destroyed && spr._btGlintArea && spr.filterArea === spr._btGlintArea) spr.filterArea = null;   /* v2.3.2887 */
    } catch (e) { /* a destroyed sprite has nothing to release */ }
    this._pool.push(f);
  }

  clear() {
    for (const [spr, f] of this._on) this._release(spr, f);
    this._on.clear();
    this.stats.targets = 0; this.stats.lit = 0; this.stats.sheen = 0; this.stats.sweeping = 0;
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
        /* v2.3.2864: jogging in a full set, the armour IS the body sprite */
        if (pd.visible && pd._fullsetOn && pd._spriteBody && pd._spriteBody.visible) {
          pushVisible(s, pd._spriteBody);
          this._bodies.add(pd._spriteBody);
          /* v2.3.2887: ...and the body's two CLONES.  With a sword out, the
             arm is re-drawn over the slung shield on an east jog and the hand
             over the grip (entityRenderer, v2.3.200 / v2.3.185): each is the
             body sprite's own texture, transform and tint under a mask -- so
             in a full set they are pieces of the knight, and a dull plate arm
             rode across a shining figure on every east jog (mp-sheenall found
             it).  Same slot, same bounds, same tint: the same shine as the
             body under them, pixel for pixel. */
          pushVisible(s, pd._handArmSprite);
          pushVisible(s, pd._handCapSprite);
        }
        if (fx) for (const k of SELF_CHEST_STAND_INS) pushVisible(s, fx[k]);
        /* v2.3.2887: the raised shield's arm wears a sleeve cut from the
           plate (entityRenderer _placeBlockArm) -- drawn only while the bow
           art that normally carries a block has not loaded, but plate all the
           same */
        if (pd.visible && pd._blockArmGroup && pd._blockArmGroup.visible) pushVisible(s, pd._blockArmSleeve);
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
        /* v2.3.2887: their bow shot and their chop / cook / fire figure draw
           the armour on sprites of their own, as the swing does -- the shine
           stopped at the edge of both.  (A bow is never metal, so the bow
           set's weapon sprite stays out.) */
        const bw = fx && fx._remoteBowSprites && fx._remoteBowSprites.get(id);
        const skg = fx && fx._remoteSkillSprites && fx._remoteSkillSprites.get(id);
        const gg = skg && skg.gear;
        const wm = weaponMaterial(o.wpnType, o.wpnMat);
        if (wm) {
          const s = [];
          if (d.visible) pushVisible(s, d._weaponSprite);
          if (sw) pushVisible(s, sw.weapon);
          this._slot(out, id + ':w', s, wm, 'normal');
        }
        /* v2.3.2887: the armour the renderer DRAWS them in -- `equip`, which
           the join frame builds -- not the flat `eqc`/`eql` wire names, which
           only land on the peer with their next track relay (Object.assign in
           wsClient's player_update).  Until then a player who had just walked
           in drew their plate with no shine for up to two seconds. */
        const oe = o.equip || null;
        const cm = armourMetal((oe && oe.chest) || o.eqc);
        if (cm) {
          const s = [];
          if (d.visible) pushVisible(s, d._gearChest);
          if (d.visible && d._fullsetOn) pushVisible(s, d._spriteBody);   /* v2.3.2864 */
          if (sw) pushVisible(s, sw.chest);
          if (bw) pushVisible(s, bw.chest);   /* v2.3.2887 */
          if (gg) pushVisible(s, gg.chest);
          this._slot(out, id + ':c', s, cm, 'normal');
        }
        const lm = armourMetal((oe && oe.legs) || o.eql);
        if (lm) {
          const s = [];
          if (d.visible) pushVisible(s, d._gearLegs);
          if (sw) { pushVisible(s, sw.legs); pushVisible(s, sw.jogLegsGear); }   /* v2.3.2887: + the running legs' greaves */
          if (bw) { pushVisible(s, bw.legs); pushVisible(s, bw.jogLegsGear); }
          if (gg) pushVisible(s, gg.legs);
          this._slot(out, id + ':l', s, lm, 'normal');
        }
      }
    }
    return out;
  }

  /* `sheen` (v2.3.2864): null when the permanent shine is off, else
     { k, sx, sy } -- how much of it the light allows (0-1) and the direction
     of the sun on screen (a unit vector, or 0,0 in a zone with no sun). */
  update(S, now, er, fx, zone, sheen) {
    const targets = this._targets(S, er, fx, zone);
    const want = new Map();       /* sprite -> { p, strength, color, sheen } */
    const sk = sheen ? (this.sheenScale == null ? 1 : this.sheenScale) * sheen.k : 0;
    let sweeping = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      let p = -1;                 /* no sweep crossing it: the band term is off */
      if (this.force != null) p = this.force;   /* QA: pinned; -1 pins "between sweeps" */
      else if (AUTO_SWEEP) {      /* v2.3.2902: off -- see AUTO_SWEEP */
        const phase = hashPhase(t.key, t.g.period);
        const into = (now + phase) % t.g.period;
        if (into < t.g.dur) p = into / t.g.dur;
      }
      if (p >= 0) sweeping++;
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
      /* v2.3.2887: every frame -- the texture, and so the frame's box, changes */
      if (spr.mask) { const a = unmaskedArea(spr); if (a && spr.filterArea !== a) spr.filterArea = a; }
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
    this.stats.sweeping = sweeping;
    this._lastTargets = targets;
  }

  /* QA probe (v2.3.2864): which slots are lit right now, and whether that
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
