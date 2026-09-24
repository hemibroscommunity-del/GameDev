/* ═══ v2.3.2803: A MONSTER REACTS LIKE WHAT IT IS MADE OF ═══
 *
 * Owner: "take a fresh look at monster hit reaction material effects.  Right
 * now they're low resolution and don't look great but I do like that they've
 * attempted to be material specific.  I want the materials to act like those
 * materials would in an aesthetic and physics reaction type of way upon
 * getting hit by the impacts from different weapon type (arrow, bolt, sword)
 * so snow effects for snowman, slime for slime, little blood and char from
 * fire goblin, ashy dust from mummy and bone fragments from skeleton".
 *
 * WHAT IT WAS.  HIT_MATERIALS (monsterVariants.js, v2.3.2200) has always named
 * the material, but the five painted debris sheets it was written for were
 * never made, so every hit in the game took the placeholder: seven soft,
 * blurred dots of one tint under a dark rim, the same for every weapon.  That
 * is the "low resolution".  The ground decal beside it was a soft blob too.
 *
 * WHAT IT IS NOW.
 *   CRISP PIXELS.  Every piece is pixel art minted in code on the characters'
 *   own pixel grid (the staffCastFx PIX), shaded, with a dark edge so it reads
 *   on snow, sand and grass alike (TRAPS §21: a mark the colour of the ground
 *   satisfies every count and shows nothing).
 *   PHYSICS.  Pieces fly in three dimensions -- along the ground AND up --
 *   under gravity, with a shadow under anything in the air, and what they do
 *   when they come down IS the material: snow clumps thud, crumble and do not
 *   bounce; slime drops splat flat and wobble; blood spots; bone shards spin,
 *   clatter and skitter; dust and ash billow, hang and settle; char and linen
 *   flutter down.
 *   THE WEAPON SHAPES THE SPRAY.  An arrow punches through: a narrow jet out
 *   of the far side and a small puff back at you.  A bolt blasts: material
 *   thrown all round and up, and heat does what heat does (snow steams, slime
 *   sizzles, the goblin chars and sparks, linen smoulders, bone scorches).  A
 *   sword slices: a flat sheet flung off the edge of the blade.
 *   DEPTH.  A piece behind the monster is drawn behind it (a container in the
 *   telegraphs layer, under the entities); a piece in front is drawn over it
 *   (the particles layer).  Both stay under the player -- the owner's v2.3.2636
 *   rule ("make the character layer in front of the effects").
 *   THE MARK.  What lands stays on the ground for the burst's ~5 s and then
 *   fades, which is the owner's §5.8 ask ("last about 5 s and read clearly")
 *   carried by crisp pieces instead of a blurred decal.
 *
 * UNCHANGED: the hit, the damage, the SOUND (HIT_MATERIALS.kind still picks
 * it; the look reads the new `fx` field), and the queue the four hit sites
 * feed (S._debrisBursts via combatHelpers.spawnHitDebris).
 *
 * NOTHING TO PRELOAD: one atlas minted from a canvas at construction and no
 * fetch, so the animation-preloading law has nothing to register.
 *
 * LEAF MODULE (the staffCastFx / fxStrips precedent): effectsRenderer owns the
 * instance; nothing here imports a renderer. */
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { zonePlayerScale } from '@/data/zones.js';
import { TILE } from '@/data/constants.js';

/* One art pixel of the character sheets in world px (staffCastFx's PIX): the
   sheets are drawn in 3-sheet-px blocks at LOCAL_SCALE 0.421875.  A piece of
   debris is drawn at TWICE that: measured on phone-sized captures, pieces on
   the characters' own grid were crisp and far too small to read (a slime drop
   was ~3 CSS px) -- and at 1.5x still lost against the monster's own art.  A
   chunkier pixel than the sprites, the way pixel-art games draw their debris,
   and about the presence of the old soft dots without their blur. */
const PIX = 3 * 0.421875 * 2;
/* A burst lives this long from the hit: pieces land within the first second
   and the marks hold, then everything fades over the last FADE_MS. */
const BURST_MS = 5400;
const FADE_MS = 1200;
const MIN_GAP_MS = 150;      /* per-monster dedup, the _impactSpawned posture */
const MAX_P = 720;           /* particle records, preallocated */
const MAX_QUEUE = 24;
/* Ground-plane depth is foreshortened in the 3/4 view: a spray that is round
   on the ground is an ellipse on screen. */
const DEPTH = 0.55;

const K_CHUNK = 1, K_DROP = 2, K_DUST = 3, K_FLAKE = 4, K_EMBER = 5, K_GLINT = 6, K_BUBBLE = 7;
const L_STOP = 0, L_BOUNCE = 1, L_SPLAT = 2, L_CRUMBLE = 3;

/* ── palettes ─────────────────────────────────────────────────────────────
   Fixed palettes are drawn untinted.  GREY shapes are tinted per monster
   (slime colours, rock colours), so their lightest value becomes the tint and
   the darker steps shade it; a highlight lighter than the tint is a separate
   untinted pixel (a tint can only darken). */
const SNOW = { W: 0xffffff, A: 0xeef6ff, B: 0xd2e4f7, C: 0xa3bfe2, D: 0x6e8fbc };
/* sampled off the skeleton sheet (run-s.png): warm cream, not white */
const BONE = { W: 0xf8e2ac, B: 0xe6c886, S: 0xc2a26c, O: 0x5c4630 };
const LINEN = { L: 0xefe6cd, E: 0xb3a684, O: 0x6a604c };
const ASHF = { A: 0xcfc7b7, D: 0x8f8778, O: 0x5c564c };
const CHAR = { C: 0x40352f, K: 0x17120f, H: 0x75614f };
const BLOODP = { R: 0xa3221c, D: 0x5e0f0c };
const GREY = { L: 0xffffff, M: 0xc6c6c6, D: 0x8c8c8c, O: 0x3a3a3a };
/* slime shades softer than rock: wet, not faceted -- the darkest step is the
   slime's own shadow colour, not a black keyline */
const GOO = { L: 0xffffff, M: 0xd9d9d9, D: 0xa9a9a9, O: 0x5e5e5e };
const WHITE = { L: 0xffffff, M: 0xdadada };

/* darker than the goblin's own reds (#d02000..#e83000) so it reads as blood, not skin */
const BLOOD = [0x8c1208, 0x6e0c06, 0x9e1c10];
const FIRE = [0xfff3b0, 0xffc451, 0xff7d1c, 0xd23c10, 0x5c1d0b];
const SPARK = [0xffffff, 0xfff6c8, 0xffd36b, 0xb88a3a, 0x5c4a2a];
const STEAM = 0xf4f8ff;

/* ── the pixel art, as text ───────────────────────────────────────────────
   One letter per art pixel, '.' is empty; the letters index the palette the
   shape is minted with.  Written out rather than generated so a reader can
   SEE each piece -- they are tiny and they are the whole look. */
const ART = {
  sq: { pal: WHITE, rows: ['LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL', 'LLLLLLLL'] },
  /* packed snow: bright top-left, blue-grey underside -- the underside is what
     keeps a clump visible against snow ground */
  snowS: { pal: SNOW, rows: ['WA', 'BD'] },
  snowM: { pal: SNOW, rows: ['.WA', 'WAB', 'BCD'] },
  snowL: { pal: SNOW, rows: ['.WW.', 'WAAB', 'ABBC', '.CD.'] },
  snowLump: { pal: SNOW, rows: ['.WA.', 'ABCD'] },
  snowLumpL: { pal: SNOW, rows: ['.WAA.', 'ABBCD'] },
  glint: { pal: WHITE, rows: ['.L.', 'LLL', '.L.'] },
  /* bone shard, four turns of one piece (spun through while it flies) */
  boneS0: { pal: BONE, rows: ['.O.', 'OWO', 'OBO', 'OSO', '.O.'] },
  boneS1: { pal: BONE, rows: ['...O.', '..OWO', '.OBO.', 'OSO..', '.O...'] },
  boneS2: { pal: BONE, rows: ['.OOO.', 'OSBWO', '.OOO.'] },
  boneS3: { pal: BONE, rows: ['.O...', 'OWO..', '.OBO.', '..OSO', '...O.'] },
  /* ...and a bigger fragment with its joint knob, for heavy hits */
  boneL0: { pal: BONE, rows: ['.OO.', 'OWWO', '.OBO', '.OBO', '.OSO', '.OSO', '..O.'] },
  boneL1: { pal: BONE, rows: ['....OO', '...OWO', '..OBO.', '.OBO..', 'OSO...', '.O....'] },
  boneL2: { pal: BONE, rows: ['.....O.', '.OOOOWO', 'OSSBBWO', '.OOOOO.'] },
  boneL3: { pal: BONE, rows: ['OO....', 'OWO...', '.OBO..', '..OBO.', '...OSO', '....O.'] },
  boneChip: { pal: BONE, rows: ['WS', 'SO'] },
  /* linen torn off a mummy: a strip with a frayed edge, four turns */
  linen0: { pal: LINEN, rows: ['.O.', 'OLO', 'OLO', 'OEO', 'OLO', '.O.'] },
  linen1: { pal: LINEN, rows: ['....O', '...OL', '..OLO', '.OEO.', 'OLO..', '.O...'] },
  linen2: { pal: LINEN, rows: ['.OOOO.', 'OLELLO', '.OOOO.'] },
  linen3: { pal: LINEN, rows: ['O....', 'LO...', 'OLO..', '.OEO.', '..OLO', '...O.'] },
  ashA: { pal: ASHF, rows: ['AD'] },
  ashB: { pal: ASHF, rows: ['A.', 'DA'] },
  /* char: a blackened flake with an ember-lit edge; B is A turned over, and a
     flake flutters by flipping between the two */
  charA: { pal: CHAR, rows: ['CK.', 'KKH'] },
  charB: { pal: CHAR, rows: ['.KC', 'HKK'] },
  charS: { pal: CHAR, rows: ['KC', 'CK'] },
  bloodSplat: { pal: BLOODP, rows: ['.R.', 'RDR'] },
  bloodDot: { pal: BLOODP, rows: ['RD'] },
  /* slime, in GREY (tinted per slime): round drops, a stretched drop for fast
     flight in four turns, and the flat splats they become */
  gooS: { pal: GOO, rows: ['LM', 'MD'] },
  gooM: { pal: GOO, rows: ['.LM.', 'LLMD', 'MMDO', '.DO.'] },
  gooL: { pal: GOO, rows: ['.OOO.', 'OLLMO', 'OLMDO', 'OMDDO', '.OOO.'] },
  gooT0: { pal: GOO, rows: ['.O.', 'OLO', 'OLO', 'OMO', 'ODO', '.O.'] },
  gooT1: { pal: GOO, rows: ['...O', '..OL', '.OLO', 'OMO.', 'DO..'] },
  gooT2: { pal: GOO, rows: ['.OOOO.', 'OLLMDO', '.OOOO.'] },
  gooT3: { pal: GOO, rows: ['O...', 'LO..', 'OLO.', '.OMO', '..OD'] },
  gooSplatS: { pal: GOO, rows: ['.OOO.', 'OLMDO', '.OOO.'] },
  gooSplatM: { pal: GOO, rows: ['..OOO..', '.OLLMO.', 'OLMMMDO', '.OOOOO.'] },
  gooSplatL: { pal: GOO, rows: ['...OOOO...', '.OOLLMMOO.', 'OLLMMMMDDO', '.OODDDDOO.', '...OOOO...'] },
  /* rock, in GREY (tinted per rock) */
  stoneS: { pal: GREY, rows: ['LM', 'MO'] },
  stoneM: { pal: GREY, rows: ['.LM', 'LMD', 'MDO'] },
  stoneL: { pal: GREY, rows: ['.LL.', 'LMMD', 'MMDO', '.DO.'] },
  /* a sizzle bubble and its pop */
  bubble: { pal: WHITE, rows: ['.L.', 'L.L', '.L.'] },
  bubblePop: { pal: WHITE, rows: ['L.L', '...', 'L.L'] },
};
/* Dust / powder / smoke / steam: dithered discs, generated (radius 1..7).
   Lit from the top-left like every piece here: a light cap, a mid body, a
   shaded underside, and a checkerboard edge -- the pixel-art way to draw
   something soft without drawing something blurred.  The shading is what
   keeps a pale cloud readable on pale ground (grey ash on desert sand read
   as nothing when the disc was flat -- measured on the v2.3.2803 captures). */
const PUFF = { L: 0xffffff, M: 0xd6d6d6, D: 0xa2a2a2 };
function puffRows(r) {
  const n = r * 2 + 1, out = [];
  for (let y = 0; y < n; y++) {
    let s = '';
    for (let x = 0; x < n; x++) {
      const dx = x - r, dy = y - r;
      const d = Math.hypot(dx, dy);
      if (d > r + 0.35 || (d > r - 0.9 && (x + y) % 2 !== 0)) { s += '.'; continue; }
      /* which way this pixel faces the light (top-left) */
      const lit = -(dx + dy) / Math.max(1, r);
      s += lit > 0.35 ? 'L' : lit > -0.45 ? 'M' : 'D';
    }
    out.push(s);
  }
  return out;
}
for (let r = 1; r <= 7; r++) ART['puff' + r] = { pal: PUFF, rows: puffRows(r) };

/* ── the atlas: every piece on one canvas, so every sprite batches ─────── */
let _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  const names = Object.keys(ART);
  const W = 96;
  let x = 1, y = 1, rowH = 0;
  const place = {};
  for (const k of names) {
    const rows = ART[k].rows, w = rows[0].length, h = rows.length;
    if (x + w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; }
    place[k] = { x, y, w, h };
    x += w + 1;
    rowH = Math.max(rowH, h);
  }
  const H = y + rowH + 1;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (const k of names) {
    const { rows, pal } = ART[k], p = place[k];
    for (let ry = 0; ry < rows.length; ry++) {
      for (let rx = 0; rx < rows[ry].length; rx++) {
        const ch = rows[ry][rx];
        if (ch === '.' || pal[ch] == null) continue;
        g.fillStyle = '#' + pal[ch].toString(16).padStart(6, '0');
        g.fillRect(p.x + rx, p.y + ry, 1, 1);
      }
    }
  }
  const base = Texture.from(c);
  /* NEAREST: a texel is an art pixel, and must stay one at any zoom.  Linear
     filtering would blur the inside of every piece -- the exact complaint. */
  base.source.scaleMode = 'nearest';
  const tex = {};
  for (const k of names) {
    const p = place[k];
    tex[k] = new Texture({ source: base.source, frame: new Rectangle(p.x, p.y, p.w, p.h) });
  }
  _atlas = tex;
  return tex;
}

const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/* roughly normal, sd ~0.5 -- sprays cluster on their line instead of fanning flat */
const gauss = () => (rnd() + rnd() + rnd() - 1.5);
const pick = (arr) => arr[(rnd() * arr.length) | 0];
function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}
/* base * weapon multiplier, the fraction settled by a coin so small counts
   still vary hit to hit */
function cnt(base, P) {
  const v = base * P.n;
  const f = Math.floor(v);
  return f + (rnd() < v - f ? 1 : 0);
}

/* ── how each weapon delivers its energy ───────────────────────────────── */
function profileFor(b) {
  const dir = (typeof b.ang === 'number' && isFinite(b.ang)) ? b.ang : -Math.PI / 2;
  const P = { w: b.weapon || null, dir, n: 1, spd: 1, lift: 1, side: b.side || (rnd() < 0.5 ? -1 : 1), elem: b.elem || null };
  switch (P.w) {
    case 'arrow':  P.n = 0.8; P.spd = 1.25; P.lift = 0.8; break;
    case 'bolt':   P.n = 1.1; P.spd = 1.0;  P.lift = 1.35; break;
    case 'sword':  P.n = 1.0; P.spd = 1.2;  P.lift = 0.95; break;
    case 'splash': P.n = 0.5; P.spd = 0.8;  P.lift = 1.0; break;
    default:       P.n = 0.85; P.spd = 1.0; P.lift = 1.0;
  }
  /* The blade's edge travels one way or the other across the monster; throw
     the sheet to the side that faces the CAMERA.  Material flung away from
     the camera goes behind the body (the depth split below) and a sword hit
     on a snowman read as nothing at all. */
  if (P.w === 'sword') P.side = Math.cos(dir) >= 0 ? 1 : -1;
  if (b.crit) P.n *= 1.4;
  if (b.big) { P.n *= 1.6; P.spd *= 1.15; P.lift *= 1.15; }
  if (b.heavy) { P.n *= 1.2; P.spd *= 0.92; }
  return P;
}
/* The main spray.  ARROW: a narrow jet on, out through the far side.  SWORD:
   a sheet off the blade's edge, to one side of the swing.  BOLT: everywhere,
   leaning away from the caster.  Unknown (a peer's hit): a loose cone. */
function sprayAng(P) {
  switch (P.w) {
    case 'arrow': return P.dir + gauss() * 0.34;
    case 'sword': return P.dir + P.side * (0.3 + rnd() * 1.05) + gauss() * 0.12;
    case 'bolt':
    case 'splash': return towardCamera(rnd() < 0.55 ? P.dir + gauss() * 1.1 : rnd() * Math.PI * 2);
    default: return towardCamera(P.dir + gauss() * 0.9);
  }
}
/* A blast has no side of its own, so lean it toward the camera: about half of
   what would fly off behind the monster (and be hidden by it) is turned to fly
   in front instead.  Left/right stays even.  An arrow's jet is NOT turned --
   out of the far side is the point of it. */
function towardCamera(a) {
  return (Math.sin(a) < -0.25 && rnd() < 0.45) ? -a : a;
}
/* the kick back toward the attacker (an arrow's entry puff) */
const backAng = (P) => P.dir + Math.PI + gauss() * 0.7;

/* Index-pooled sprites, refilled from zero every frame (staffCastFx's pool). */
class Pool {
  constructor(parent) { this.parent = parent; this.list = []; this.n = 0; }
  take(tex) {
    let sp = this.list[this.n];
    if (!sp || sp.destroyed) {
      sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.5);
      this.parent.addChild(sp);
      this.list[this.n] = sp;
    }
    this.n++;
    if (sp.texture !== tex) sp.texture = tex;
    if (!sp.visible) sp.visible = true;
    return sp;
  }
  begin() { this.n = 0; }
  end() {
    for (let i = this.n; i < this.list.length; i++) {
      const sp = this.list[i];
      if (sp && !sp.destroyed && sp.visible) sp.visible = false;
    }
  }
}

/* A side (behind / in front of the monster): shadows under dust under the
   pieces under the sparks, one pool each so the order holds without sorting. */
class Side {
  constructor(layer) {
    this.root = new Container();
    this.root.label = 'hitMaterialFx';
    layer.addChild(this.root);
    const s = new Container(), d = new Container(), b = new Container(), t = new Container();
    this.root.addChild(s, d, b, t);
    this.shadow = new Pool(s); this.dust = new Pool(d); this.body = new Pool(b); this.top = new Pool(t);
  }
  begin() { this.shadow.begin(); this.dust.begin(); this.body.begin(); this.top.begin(); }
  end() { this.shadow.end(); this.dust.end(); this.body.end(); this.top.end(); }
}

export class HitMaterialFx {
  /** frontLayer: `particles` (over the monsters, under the player).
   *  backLayer: `telegraphs` (under the monsters). */
  constructor(frontLayer, backLayer) {
    this.T = atlas();
    this.front = new Side(frontLayer);
    this.back = new Side(backLayer);
    this.P = new Array(MAX_P);
    for (let i = 0; i < MAX_P; i++) this.P[i] = { on: false, b: null };
    this._si = 0;
    this._bursts = [];            /* recent bursts, for the probe */
    this._last = new Map();       /* monster id -> last burst ms (Map: ids are server strings) */
    this._sweep = 0;
    this._lastNow = 0;
    this._stats = { bursts: 0, byFx: Object.create(null), lastBurst: null, splats: 0, crumbles: 0, bounces: 0 };
    this._frames = {
      boneS: ['boneS0', 'boneS1', 'boneS2', 'boneS3'].map((k) => this.T[k]),
      boneL: ['boneL0', 'boneL1', 'boneL2', 'boneL3'].map((k) => this.T[k]),
      linen: ['linen0', 'linen1', 'linen2', 'linen3'].map((k) => this.T[k]),
      gooT: ['gooT0', 'gooT1', 'gooT2', 'gooT3'].map((k) => this.T[k]),
      char: [this.T.charA, this.T.charB],
      ash: [this.T.ashA, this.T.ashB],
      puff: [null, this.T.puff1, this.T.puff2, this.T.puff3, this.T.puff4, this.T.puff5, this.T.puff6, this.T.puff7],
    };
  }

  clear() {
    for (const p of this.P) { p.on = false; p.b = null; }
    this._bursts.length = 0;
    this._last.clear();
    this.front.begin(); this.back.begin();
    this.front.end(); this.back.end();
  }

  /* A free record, or -- when a busy fight has them all -- the next one round
     the ring, which is the oldest-ish.  Evict, never refuse: refusing would
     make the hit you just landed the one with no reaction (v2.3.2504's rule). */
  _take(b, now) {
    const n = this.P.length;
    let p = null;
    for (let k = 0; k < n; k++) {
      const q = this.P[this._si];
      this._si = (this._si + 1) % n;
      if (!q.on) { p = q; break; }
    }
    if (!p) { p = this.P[this._si]; this._si = (this._si + 1) % n; }
    p.on = true; p.b = b; p.t0 = now;
    p.kind = K_CHUNK; p.x = b.ex; p.y = b.ey; p.z = b.ez;
    p.vx = 0; p.vy = 0; p.vz = 0; p.g = 0.3; p.drag = 0.99; p.e = 0; p.fr = 0.8; p.bnc = 0;
    p.tex = null; p.frames = null; p.spin = 0; p.ph = rnd() * 4; p.tint = 0xffffff; p.alpha = 1;
    p.sz = 1; p.land = L_STOP; p.landed = false; p.landAt = 0; p.life = 0;
    p.r0 = 1; p.r1 = 1; p.flut = 0; p.ramp = null; p.hl = false; p.size = 0;
    p.crumb = false; p.splat = null; p.wob = 0; p.shadow = false; p.u = b.u;
    return p;
  }
  /* launch: an angle on the ground, a ground speed, and an upward speed */
  _launch(p, ang, spd, vz) {
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd * DEPTH;
    p.vz = vz;
  }

  /* ════════════════ the materials ════════════════ */

  _snow(b, P, now) {
    const T = this.T;
    const heavyBias = (b.crit || b.big) ? 0.25 : 0;
    const nClump = cnt(9, P);
    for (let i = 0; i < nClump; i++) {
      const p = this._take(b, now);
      const back = P.w === 'arrow' && i < nClump * 0.25;
      const r = rnd() + heavyBias;
      p.size = r < 0.5 ? 0 : r < 0.85 ? 1 : 2;
      p.tex = p.size === 0 ? T.snowS : p.size === 1 ? T.snowM : T.snowL;
      this._launch(p, back ? backAng(P) : sprayAng(P),
        (back ? 0.7 + rnd() * 0.9 : 1.2 + rnd() * 2.4) * P.spd * (P.w === 'arrow' && !back ? 1.25 : 1),
        (1.0 + rnd() * 2.2) * P.lift);
      p.g = 0.3; p.drag = 0.985; p.fr = 0.72; p.land = L_CRUMBLE; p.shadow = true;
    }
    /* the powder a blow knocks loose: a white puff that hangs, spreads, settles */
    const nPow = cnt(P.w === 'bolt' ? 9 : 6, P);
    for (let i = 0; i < nPow; i++) {
      const p = this._take(b, now);
      p.kind = K_DUST;
      const back = P.w === 'arrow' && i < nPow * 0.35;
      this._launch(p, back ? backAng(P) : sprayAng(P), (0.7 + rnd() * 1.8) * P.spd, (0.3 + rnd() * 1.2) * P.lift);
      p.g = 0.01; p.drag = 0.9; p.life = 700 + rnd() * 700;
      p.r0 = 1; p.r1 = 3 + ((rnd() * 3) | 0); p.tint = pick([0xffffff, 0xf2f8ff, 0xe3eefb]); p.alpha = 0.95;
    }
    const nGl = cnt(3, P);
    for (let i = 0; i < nGl; i++) {
      const p = this._take(b, now);
      p.kind = K_GLINT;
      this._launch(p, sprayAng(P), (0.6 + rnd() * 1.6) * P.spd, 0.4 + rnd() * 1.2);
      p.g = 0.02; p.drag = 0.92; p.life = 260 + rnd() * 380; p.tint = pick([0xffffff, 0xdff1ff]);
    }
    if (P.w === 'bolt') {
      /* heat on snow: it steams (a flame bolt most) -- or a frost bolt throws ice glitter */
      if (P.elem === 'frost') {
        for (let i = 0; i < 5; i++) {
          const p = this._take(b, now);
          p.kind = K_GLINT;
          this._launch(p, rnd() * Math.PI * 2, 0.8 + rnd() * 1.8, 0.8 + rnd() * 1.5);
          p.g = 0.015; p.drag = 0.93; p.life = 400 + rnd() * 500; p.tint = pick([0xbfe6ff, 0xffffff]);
        }
      } else {
        const nSt = P.elem === 'flame' ? 5 : 3;
        for (let i = 0; i < nSt; i++) this._steam(b, P, now, STEAM, 0.55);
      }
    }
  }

  _steam(b, P, now, tint, alpha) {
    const p = this._take(b, now);
    p.kind = K_DUST;
    this._launch(p, rnd() * Math.PI * 2, 0.2 + rnd() * 0.5, 0.6 + rnd() * 0.6);
    p.g = -0.018; p.drag = 0.95; p.life = 900 + rnd() * 700; p.flut = 0.25;
    p.r0 = 1; p.r1 = 3 + ((rnd() * 2) | 0); p.tint = tint; p.alpha = alpha;
  }

  _goo(b, P, now) {
    const tint = b.tint || 0x3dd497;
    const n = cnt(10, P);
    for (let i = 0; i < n; i++) {
      const p = this._take(b, now);
      p.kind = K_DROP;
      /* an arrow squirts a jet out of the back and leaves a fat drip at the
         wound; a sword slings an arc with one big glob in it */
      const drip = P.w === 'arrow' && i === 0;
      const glob = (P.w === 'sword' && i === 0) || (b.big && i < 2);
      const r = rnd() + ((b.crit || b.big) ? 0.2 : 0);
      p.size = glob ? 2 : drip ? 1 : (r < 0.4 ? 0 : r < 0.78 ? 1 : 2);
      p.tint = tint;
      const ang = drip ? backAng(P) : sprayAng(P);
      const spd = drip ? 0.3 + rnd() * 0.4 : (1.3 + rnd() * 2.6) * P.spd * (P.w === 'arrow' ? 1.3 : 1) * (glob ? 0.75 : 1);
      this._launch(p, ang, spd, drip ? 0.2 : (0.9 + rnd() * 2.0) * P.lift);
      p.g = 0.28; p.drag = 0.99; p.land = L_SPLAT; p.shadow = true; p.hl = p.size > 0;
    }
    if (P.w === 'bolt') {
      /* the bolt's heat on slime: it sizzles -- bubbles rise off the wound and pop */
      const nb = 3 + ((rnd() * 2) | 0);
      for (let i = 0; i < nb; i++) {
        const p = this._take(b, now);
        p.kind = K_BUBBLE;
        this._launch(p, rnd() * Math.PI * 2, 0.15 + rnd() * 0.5, 0.35 + rnd() * 0.5);
        p.x += gauss() * 6; p.z += gauss() * 5;
        p.g = -0.008; p.drag = 0.96; p.life = 380 + rnd() * 420;
        p.tint = mixHex(tint, 0xffffff, 0.45);
      }
      this._steam(b, P, now, mixHex(tint, 0xffffff, 0.7), 0.35);
    }
  }

  _goblin(b, P, now) {
    const T = this.T;
    /* "a little blood": a few drops, and fewer still off a bolt -- the burn
       seals what it opens */
    const nBlood = cnt(P.w === 'bolt' ? 1.5 : 5, P);
    for (let i = 0; i < nBlood; i++) {
      const p = this._take(b, now);
      p.kind = K_DROP;
      p.size = rnd() < 0.35 ? 1 : 0;
      p.tint = pick(BLOOD);
      this._launch(p, sprayAng(P), (1.5 + rnd() * 2.8) * P.spd * (P.w === 'arrow' ? 1.3 : 1), (0.8 + rnd() * 1.6) * P.lift);
      p.g = 0.32; p.drag = 0.99; p.land = L_SPLAT; p.shadow = true;
    }
    /* char: the scorched skin a fire goblin sheds, fluttering down */
    const nChar = cnt(P.w === 'bolt' ? 9 : 6, P);
    for (let i = 0; i < nChar; i++) {
      const p = this._take(b, now);
      p.kind = K_FLAKE;
      p.frames = rnd() < 0.7 ? this._frames.char : null;
      p.tex = p.frames ? null : T.charS;
      p.spin = 5 + rnd() * 5;
      this._launch(p, P.w === 'arrow' && i < 2 ? backAng(P) : sprayAng(P), (0.8 + rnd() * 2.0) * P.spd, (1.0 + rnd() * 2.0) * P.lift);
      p.g = 0.05; p.drag = 0.93; p.flut = 0.35; p.land = L_STOP; p.fr = 0.6;
    }
    /* and he is on fire: a hit knocks embers loose */
    const nEm = cnt(P.w === 'bolt' ? 8 : 4, P);
    for (let i = 0; i < nEm; i++) this._ember(b, P, now, FIRE, 1);
    const nSmoke = P.w === 'bolt' ? 3 : (rnd() < 0.6 ? 1 : 0);
    for (let i = 0; i < nSmoke; i++) this._steam(b, P, now, pick([0x3a3330, 0x4a423d]), 0.5);
  }

  _ember(b, P, now, ramp, k) {
    const p = this._take(b, now);
    p.kind = K_EMBER;
    this._launch(p, sprayAng(P), (0.8 + rnd() * 2.2) * (k || 1), (1.2 + rnd() * 2.2) * (k || 1));
    p.g = -0.03; p.drag = 0.955; p.life = 420 + rnd() * 600; p.ramp = ramp; p.flut = 0.2;
    p.sz = rnd() < 0.35 ? 2 : 1;
  }

  _ash(b, P, now) {
    const T = this.T;
    /* the dust a mummy is made of: it billows out, hangs, and settles */
    const nDust = cnt(14, P);
    for (let i = 0; i < nDust; i++) {
      const p = this._take(b, now);
      p.kind = K_DUST;
      const back = P.w === 'arrow' && i < nDust * 0.3;
      this._launch(p, back ? backAng(P) : sprayAng(P),
        (back ? 0.6 + rnd() * 1.0 : 1.0 + rnd() * 2.4) * P.spd, (0.2 + rnd() * 1.1) * P.lift);
      p.g = 0.004; p.drag = 0.885; p.life = 1200 + rnd() * 1000; p.flut = 0.12;
      p.r0 = 2; p.r1 = 4 + ((rnd() * 4) | 0);
      /* ash is grey; old linen dust is warm -- a mix, leaning grey and a step
         darker than the sand, which is what keeps it readable on the desert
         the mummy walks on */
      p.tint = pick([0xbab3a7, 0x9d968a, 0x857e73, 0xcac2b2]); p.alpha = 0.95;
    }
    const nFlake = cnt(7, P);
    for (let i = 0; i < nFlake; i++) {
      const p = this._take(b, now);
      p.kind = K_FLAKE;
      p.frames = this._frames.ash; p.spin = 4 + rnd() * 4;
      this._launch(p, sprayAng(P), (0.6 + rnd() * 1.6) * P.spd, (0.9 + rnd() * 1.6) * P.lift);
      p.g = 0.04; p.drag = 0.94; p.flut = 0.3; p.land = L_STOP; p.fr = 0.55;
    }
    /* a strip of linen cut loose (a blade takes more of it) */
    const nLinen = P.w === 'sword' ? 2 : (rnd() < 0.7 * P.n ? 1 : 0);
    for (let i = 0; i < nLinen; i++) {
      const p = this._take(b, now);
      p.kind = K_FLAKE;
      p.frames = this._frames.linen; p.spin = 3 + rnd() * 3;
      this._launch(p, sprayAng(P), (0.7 + rnd() * 1.4) * P.spd, (1.2 + rnd() * 1.4) * P.lift);
      p.g = 0.05; p.drag = 0.95; p.flut = 0.4; p.land = L_STOP; p.fr = 0.55;
    }
    if (P.w === 'bolt') {
      /* old dry linen catches: a few sparks and a thread of smoke */
      for (let i = 0; i < 3; i++) this._ember(b, P, now, FIRE, 0.8);
      this._steam(b, P, now, 0x5a534b, 0.45);
    }
  }

  _bone(b, P, now) {
    const T = this.T;
    const scorch = P.w === 'bolt';
    const nShard = cnt(5, P);
    for (let i = 0; i < nShard; i++) {
      const p = this._take(b, now);
      const big = ((b.crit || b.big || P.w === 'sword') && i === 0) || rnd() < 0.35;
      p.frames = big ? this._frames.boneL : this._frames.boneS;
      p.spin = 10 + rnd() * 10;
      p.tint = scorch && rnd() < 0.35 ? 0xb9a98a : 0xffffff;
      this._launch(p, P.w === 'arrow' && i === 0 ? backAng(P) : sprayAng(P),
        (1.4 + rnd() * 2.6) * P.spd * (big ? 0.8 : 1), (1.4 + rnd() * 2.4) * P.lift);
      /* bone is hard and light: it clatters (bounces twice) and skitters */
      p.g = 0.34; p.drag = 0.995; p.e = 0.38; p.bnc = 2; p.fr = 0.83; p.land = L_BOUNCE; p.shadow = true;
    }
    const nChip = cnt(4, P);
    for (let i = 0; i < nChip; i++) {
      const p = this._take(b, now);
      p.tex = T.boneChip;
      p.tint = scorch && rnd() < 0.35 ? 0xb9a98a : 0xffffff;
      this._launch(p, sprayAng(P), (1.2 + rnd() * 2.4) * P.spd, (1.2 + rnd() * 2.0) * P.lift);
      p.g = 0.34; p.drag = 0.995; p.e = 0.45; p.bnc = 2; p.fr = 0.8; p.land = L_BOUNCE; p.shadow = true;
    }
    const nDust = cnt(2, P);
    for (let i = 0; i < nDust; i++) {
      const p = this._take(b, now);
      p.kind = K_DUST;
      this._launch(p, P.w === 'arrow' ? backAng(P) : sprayAng(P), (0.4 + rnd() * 1.0) * P.spd, 0.3 + rnd() * 0.6);
      p.g = 0.004; p.drag = 0.9; p.life = 500 + rnd() * 500;
      p.r0 = 1; p.r1 = 3 + ((rnd() * 2) | 0); p.tint = scorch ? 0x8a8070 : 0xe6d9b8; p.alpha = 0.85;
    }
  }

  _stone(b, P, now) {
    const T = this.T;
    const tint = b.tint || 0x8a8a8a;
    const nChip = cnt(5, P);
    for (let i = 0; i < nChip; i++) {
      const p = this._take(b, now);
      const r = rnd() + ((b.crit || b.big) ? 0.25 : 0);
      p.tex = r < 0.5 ? T.stoneS : r < 0.85 ? T.stoneM : T.stoneL;
      p.tint = tint;
      this._launch(p, sprayAng(P), (1.3 + rnd() * 2.6) * P.spd, (1.2 + rnd() * 2.2) * P.lift);
      p.g = 0.36; p.drag = 0.995; p.e = 0.42; p.bnc = 2; p.fr = 0.8; p.land = L_BOUNCE; p.shadow = true;
    }
    const nGrav = cnt(4, P);
    for (let i = 0; i < nGrav; i++) {
      const p = this._take(b, now);
      p.sz = 1; p.tint = mixHex(tint, 0x000000, 0.35);
      this._launch(p, sprayAng(P), (1.4 + rnd() * 2.8) * P.spd, (1.0 + rnd() * 2.0) * P.lift);
      p.g = 0.36; p.drag = 0.995; p.e = 0.5; p.bnc = 2; p.fr = 0.8; p.land = L_BOUNCE; p.shadow = true;
    }
    const nDust = cnt(3, P);
    for (let i = 0; i < nDust; i++) {
      const p = this._take(b, now);
      p.kind = K_DUST;
      this._launch(p, sprayAng(P), (0.5 + rnd() * 1.3) * P.spd, 0.3 + rnd() * 0.7);
      p.g = 0.004; p.drag = 0.9; p.life = 600 + rnd() * 600;
      p.r0 = 1; p.r1 = 3 + ((rnd() * 2) | 0); p.tint = mixHex(tint, 0xffffff, 0.35); p.alpha = 0.8;
    }
    /* steel on stone strikes sparks */
    if (P.w === 'sword' || P.w === 'arrow') for (let i = 0; i < 3; i++) this._ember(b, P, now, SPARK, 1.4);
  }

  _emberMat(b, P, now) {
    for (let i = 0; i < cnt(7, P); i++) this._ember(b, P, now, FIRE, 1.1);
    for (let i = 0; i < 2; i++) this._steam(b, P, now, 0x3a3330, 0.5);
    for (let i = 0; i < cnt(3, P); i++) {
      const p = this._take(b, now);
      p.kind = K_FLAKE; p.frames = this._frames.char; p.spin = 6;
      this._launch(p, sprayAng(P), (0.8 + rnd() * 1.6) * P.spd, (1 + rnd() * 1.8) * P.lift);
      p.g = 0.05; p.drag = 0.93; p.flut = 0.35; p.land = L_STOP; p.fr = 0.6;
    }
  }

  /* One hit's burst.  `b` is the queue record (combatHelpers.spawnHitDebris). */
  _burst(b, S, now) {
    const gy = Number.isFinite(b.gy) ? b.gy : (Number.isFinite(b.y) ? b.y + (b.h || 20) : 0);
    const h = Number.isFinite(b.h) ? b.h : Math.max(8, gy - (b.y || gy));
    const dir = (typeof b.ang === 'number' && isFinite(b.ang)) ? b.ang : -Math.PI / 2;
    /* Where the blow lands: the projectile's own contact point when there is
       one, else the side of the body that faces the attacker. */
    const R = clamp(h * 0.9, 12, 28);
    const rec = {
      id: ++this._stats.bursts, t0: now, fx: b.kind || 'goo', gy,
      ex: 0, ey: 0, ez: 0, u: PIX, weapon: b.weapon || null,
      tint: b.tint, ang: dir, side: b.side, crit: !!b.crit, big: !!b.big, heavy: !!b.heavy, elem: b.elem || null,
    };
    if (Number.isFinite(b.hitX) && Number.isFinite(b.hitY)) {
      rec.ex = b.hitX;
      rec.ey = gy + gauss() * 2;
      rec.ez = clamp(gy - b.hitY, 2, h * 1.8);
    } else {
      rec.ex = (Number.isFinite(b.x) ? b.x : 0) - Math.cos(dir) * R * 0.35;
      rec.ey = gy - Math.sin(dir) * R * 0.35 * DEPTH;
      rec.ez = h;
    }
    rec.u = PIX * ((S && zonePlayerScale(S.currentZone, rec.ex, gy, TILE)) || 1);
    const P = profileFor(rec);
    /* v2.3.2803: a PROP's burst (combatHelpers.spawnPropDebris, v2.3.2730) is
       the same material thrown SUBTLY -- a rock is hit far more often than it
       is news: under half the pieces, flung lower and slower.  It rides this
       queue marked `prop` (its `scale`/`parts` were written for the renderer
       this replaced; this is what they meant). */
    if (b.prop) { P.n *= 0.45; P.spd *= 0.85; P.lift *= 0.8; }
    switch (rec.fx) {
      case 'snow': this._snow(rec, P, now); break;
      case 'goblin': this._goblin(rec, P, now); break;
      case 'ash': this._ash(rec, P, now); break;
      case 'bone': this._bone(rec, P, now); break;
      case 'stone': this._stone(rec, P, now); break;
      case 'ember': this._emberMat(rec, P, now); break;
      default: this._goo(rec, P, now);
    }
    /* a sword's sheet leaves the blade along a line, not from one point:
       spread what it threw along the cut */
    if (P.w === 'sword') {
      const px = -Math.sin(dir), py = Math.cos(dir) * DEPTH;
      for (const p of this.P) {
        if (!p.on || p.b !== rec || p.t0 !== now) continue;
        const k = gauss() * 9;
        p.x += px * k; p.y += py * k; p.z += gauss() * h * 0.25;
      }
    }
    /* ═══ v2.3.2804: A BOLT BLASTS ALL ROUND -- IN EVERY BURST ═══
       sprayAng throws 45% of a bolt's pieces all round, each at random, so
       about one piece in six lands back toward the caster ON AVERAGE -- and a
       burst of 9-20 pieces now and then sent none that way at all (3 bursts
       in 20 on slime and rock, measured on the merged v2.3.2803 build).  A
       one-sided bolt reads as an arrow's jet, the difference this system
       exists to show, and it failed mp-hitmat's "a bolt blasts both ways"
       about one run in three.  So when the dice came up short, turn one or two
       of the burst's pieces round: same speed and lift, aimed back past the
       contact point.  Bursts that already threw enough are left exactly as
       drawn.  From TWO pieces up: a fire goblin's bolt sheds only one or two
       drops of blood (the burn seals), and a fat drop that splats throws a
       droplet on from where it landed -- two drops forward made three pieces
       all on the far side (mp-hitmat caught one: all three 20-38 px out). */
    if (P.w === 'bolt' || P.w === 'splash') {
      const cd = Math.cos(dir), sd = Math.sin(dir);
      const mine = [];
      let back = 0;
      for (const p of this.P) {
        if (!p.on || p.b !== rec || p.t0 !== now || (p.kind !== K_CHUNK && p.kind !== K_DROP)) continue;
        const gx = p.vx, gyv = p.vy / DEPTH, sp = Math.hypot(gx, gyv);
        if (sp > 0 && (gx * cd + gyv * sd) < -0.35 * sp) back++;
        else mine.push(p);
      }
      const need = (mine.length + back) >= 2 ? Math.max(1, Math.floor((mine.length + back) * 0.12)) : 0;
      for (let k = 0; back < need && k < mine.length; k++, back++) {
        const p = mine[mine.length - 1 - k];
        const sp = Math.hypot(p.vx, p.vy / DEPTH);
        const a = towardCamera(dir + Math.PI + gauss() * 0.6);
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp * DEPTH;
      }
    }
    this._bursts.push(rec);
    if (this._bursts.length > 32) this._bursts.shift();
    this._stats.byFx[rec.fx] = (this._stats.byFx[rec.fx] || 0) + 1;
    this._stats.lastBurst = { fx: rec.fx, weapon: rec.weapon, at: now };
  }

  /* ════════════════ step + draw ════════════════ */
  update(S, now) {
    const q = S && S._debrisBursts;
    if (q && q.length) {
      for (let i = 0; i < q.length && i < MAX_QUEUE; i++) {
        const b = q[i];
        if (!b) continue;
        const key = b.monsterId != null ? String(b.monsterId) : '';
        const last = this._last.get(key) || 0;
        if (now - last < MIN_GAP_MS) continue;
        this._last.set(key, now);
        this._burst(b, S, now);
      }
      q.length = 0;
      /* forget stamps that can no longer gate anything: monster ids are never
         reused (v2.3.2272's note), so without this the map only grows */
      if (++this._sweep > 200) {
        this._sweep = 0;
        for (const [k, t] of this._last) if (now - t > MIN_GAP_MS * 20) this._last.delete(k);
      }
    }
    const dtRaw = this._lastNow ? now - this._lastNow : 16.667;
    this._lastNow = now;
    const dt = clamp(dtRaw, 0, 50);
    const f = dt / 16.667;   /* 60 Hz frame units: the same physics at 30 fps and 120 */
    const F = this.front, B = this.back, T = this.T, fr = this._frames;
    F.begin(); B.begin();
    for (let i = 0; i < this.P.length; i++) {
      const p = this.P[i];
      if (!p.on) continue;
      const b = p.b;
      const age = now - p.t0;
      const bAge = now - b.t0;
      if (bAge >= BURST_MS || (p.life && age >= p.life)) { p.on = false; p.b = null; continue; }
      /* ── physics ── */
      if (!p.landed) {
        const dg = Math.pow(p.drag, f);
        p.vx *= dg; p.vy *= dg;
        if (p.kind === K_DUST || p.kind === K_FLAKE || p.kind === K_EMBER || p.kind === K_GLINT || p.kind === K_BUBBLE) p.vz *= dg;
        p.vz -= p.g * f;
        p.x += p.vx * f; p.y += p.vy * f; p.z += p.vz * f;
        if (p.flut) p.x += Math.sin(age * 0.011 + p.ph * 1.7) * p.flut * f;
        if (p.z <= 0 && (p.kind === K_CHUNK || p.kind === K_DROP || p.kind === K_FLAKE)) {
          p.z = 0;
          const fall = -p.vz;
          if (p.land === L_BOUNCE && p.bnc > 0 && fall > 1.1) {
            /* a hard light thing clatters: it comes back up, slower, skidding */
            p.vz = fall * p.e; p.vx *= 0.72; p.vy *= 0.72; p.bnc--;
            p.spin *= 0.7;
            this._stats.bounces++;
          } else if (p.land === L_SPLAT) {
            /* a drop hits and spreads flat -- and a fat one throws droplets */
            p.landed = true; p.landAt = now; p.vx = 0; p.vy = 0; p.vz = 0;
            p.wob = now;
            this._stats.splats++;
            if (p.size >= 1 && fall > 1.4) this._satellites(p, now, p.size === 2 ? 2 : 1);
          } else if (p.land === L_CRUMBLE && p.size >= 1 && fall + Math.hypot(p.vx, p.vy) > 2.2) {
            /* packed snow does not bounce -- it breaks: the clump thuds down
               as a lump and knocks a crumb or two skidding off it */
            p.landed = true; p.landAt = now; p.vz = 0; p.vx *= 0.35; p.vy *= 0.35;
            this._crumbs(p, now, p.size === 2 ? 2 : 1);
            this._stats.crumbles++;
          } else {
            p.landed = true; p.landAt = now; p.vz = 0;
            p.vx *= p.kind === K_FLAKE ? 0.2 : 0.55; p.vy *= p.kind === K_FLAKE ? 0.2 : 0.55;
          }
        } else if (p.z < 0) {
          /* dust, sparks and bubbles never land -- but they do not sink
             through the ground either */
          p.z = 0; if (p.vz < 0) p.vz = 0;
        }
      } else if (p.vx !== 0 || p.vy !== 0) {
        /* on the ground: skid to a stop */
        const k = Math.pow(p.fr, f);
        p.vx *= k; p.vy *= k;
        p.x += p.vx * f; p.y += p.vy * f;
        if (Math.abs(p.vx) + Math.abs(p.vy) < 0.04) { p.vx = 0; p.vy = 0; }
      }
      /* ── draw ── */
      const side = p.y >= b.gy ? F : B;
      const u = p.u;
      const sx = Math.round(p.x / u) * u;
      const sy = Math.round((p.y - p.z) / u) * u;
      const fade = bAge > BURST_MS - FADE_MS ? clamp((BURST_MS - bAge) / FADE_MS, 0, 1) : 1;
      if (p.kind === K_DUST) {
        const t = clamp(age / p.life, 0, 1);
        const r = Math.max(1, Math.min(7, Math.round(p.r0 + (p.r1 - p.r0) * Math.sqrt(t))));
        const sp = side.dust.take(fr.puff[r]);
        sp.x = sx; sp.y = sy; sp.scale.set(u); sp.rotation = 0;
        if (sp.tint !== p.tint) sp.tint = p.tint;
        /* stepped fade (quarters), the pixel-art way to thin a cloud */
        sp.alpha = p.alpha * (Math.ceil((1 - t) * 4) / 4) * fade;
        continue;
      }
      if (p.kind === K_EMBER || p.kind === K_GLINT) {
        const t = clamp(age / p.life, 0, 1);
        let tint, n = p.sz;
        if (p.kind === K_EMBER) {
          const ramp = p.ramp || FIRE;
          tint = ramp[Math.min(4, (t * 5) | 0)];
          if (t < 0.2) n += 1;
        } else {
          /* a glint blinks on and off, bright then gone */
          if (((age / 70) | 0) % 3 === 2) continue;
          tint = p.tint;
        }
        const tex = (p.kind === K_GLINT && t < 0.45) ? T.glint : T.sq;
        const sp = side.top.take(tex);
        sp.x = sx; sp.y = sy; sp.rotation = 0;
        sp.scale.set(tex === T.sq ? (u * n) / 8 : u);
        if (sp.tint !== tint) sp.tint = tint;
        sp.alpha = fade;
        continue;
      }
      if (p.kind === K_BUBBLE) {
        const t = clamp(age / p.life, 0, 1);
        const sp = side.top.take(t > 0.8 ? T.bubblePop : T.bubble);
        sp.x = sx; sp.y = sy; sp.rotation = 0; sp.scale.set(u);
        if (sp.tint !== p.tint) sp.tint = p.tint;
        sp.alpha = fade;
        continue;
      }
      /* pieces: a shadow under anything in the air, then the piece */
      if (p.shadow && !p.landed && p.z > 1) {
        const sh = side.shadow.take(T.sq);
        sh.x = sx; sh.y = Math.round(p.y / u) * u; sh.rotation = 0;
        sh.scale.set((u * (p.size >= 1 ? 2 : 1)) / 8);
        if (sh.tint !== 0x000000) sh.tint = 0x000000;
        sh.alpha = 0.3 * clamp(1 - p.z / 60, 0.25, 1) * fade;
      }
      let tex = p.tex, sc = u;
      if (p.kind === K_DROP) {
        if (p.landed) {
          tex = this._splatTex(p);
        } else {
          /* a fast drop stretches along its screen-space motion */
          const mvx = p.vx, mvy = p.vy - p.vz;
          if (p.b.fx !== 'goblin' && mvx * mvx + mvy * mvy > 5) {
            const a = Math.atan2(mvy, mvx) + Math.PI / 2;
            const idx = ((Math.round(a / (Math.PI / 4)) % 4) + 4) % 4;
            tex = fr.gooT[idx];
          } else if (p.b.fx === 'goblin') {
            tex = T.sq; sc = (u * (p.size + 1)) / 8;
          } else {
            tex = p.size === 0 ? T.gooS : p.size === 1 ? T.gooM : T.gooL;
          }
        }
      } else if (p.frames) {
        /* spun through its turns in the air; on the ground it keeps a turn */
        const fi = p.landed ? (p.ph | 0) % p.frames.length
          : ((((age / 1000) * p.spin + p.ph) | 0) % p.frames.length);
        tex = p.frames[fi];
      } else if (!tex) {
        tex = T.sq; sc = (u * p.sz) / 8;
      }
      if (p.b.fx === 'snow' && p.landed && tex !== T.sq) {
        /* a landed clump sits as a lump, and melts smaller as the burst fades */
        tex = (p.size === 2 && fade > 0.5) ? T.snowLumpL : (p.size >= 1 ? T.snowLump : T.snowS);
      }
      const sp = side.body.take(tex);
      sp.x = sx; sp.y = sy; sp.rotation = 0;
      if (p.kind === K_DROP && p.landed && p.wob) {
        /* the splat wobbles once as it spreads */
        const w = clamp((now - p.wob) / 170, 0, 1);
        const k = 1 + 0.35 * (1 - w) * Math.cos(w * Math.PI * 1.5);
        sp.scale.set(sc * k, sc / k);
      } else {
        sp.scale.set(sc);
      }
      /* a landed blood spot is drawn in its own palette (the in-flight drop
         was a tinted pixel); every other piece keeps its tint */
      const tint = (p.kind === K_DROP && p.landed && b.fx === 'goblin') ? 0xffffff : p.tint;
      if (sp.tint !== tint) sp.tint = tint;
      sp.alpha = fade;
      /* a slime drop catches the light: one untinted pixel, top-left */
      if (p.hl && (p.b.fx === 'goo') && !(p.landed && p.size === 0)) {
        const hl = side.top.take(T.sq);
        const off = p.landed ? -u * (p.size === 2 ? 2 : 1) : -u * (p.size === 2 ? 1 : 0.5);
        hl.x = sx + off; hl.y = sy - u * (p.landed ? 0 : 0.5); hl.rotation = 0;
        hl.scale.set(u / 8);
        if (hl.tint !== 0xffffff) hl.tint = 0xffffff;
        hl.alpha = 0.9 * fade;
      }
    }
    F.end(); B.end();
  }

  _splatTex(p) {
    const T = this.T;
    if (p.b.fx === 'goblin') return p.size >= 1 ? T.bloodSplat : T.bloodDot;
    return p.size === 0 ? T.gooSplatS : p.size === 1 ? T.gooSplatM : T.gooSplatL;
  }

  /* droplets thrown off a splat -- tiny, low, short */
  _satellites(src, now, n) {
    for (let i = 0; i < n; i++) {
      const p = this._take(src.b, now);
      p.kind = K_DROP; p.size = 0; p.tint = src.tint;
      p.x = src.x; p.y = src.y; p.z = 0.5;
      this._launch(p, rnd() * Math.PI * 2, 0.6 + rnd() * 1.1, 0.5 + rnd() * 0.7);
      p.g = 0.3; p.drag = 0.99; p.land = L_SPLAT; p.shadow = false; p.hl = false;
    }
  }

  /* crumbs knocked off a snow clump as it lands -- they skid, they do not fly */
  _crumbs(src, now, n) {
    for (let i = 0; i < n; i++) {
      const p = this._take(src.b, now);
      p.tex = this.T.snowS; p.size = 0;
      p.x = src.x; p.y = src.y; p.z = 0.2;
      this._launch(p, Math.atan2(src.vy / DEPTH, src.vx) + gauss() * 1.2, 0.6 + rnd() * 1.0, 0.3 + rnd() * 0.5);
      p.g = 0.3; p.drag = 0.98; p.fr = 0.7; p.land = L_STOP; p.shadow = false;
    }
  }

  /* What is on screen right now, per burst (window.__btDebris; mp-feel and
     mp-hitmat read it).  `parts` counts the pieces that come down (chunks and
     drops); dust, sparks and bubbles are airborne effects and do not land. */
  report(now) {
    const out = [];
    for (const b of this._bursts) {
      const age = now - b.t0;
      if (age >= BURST_MS) continue;
      let parts = 0, landed = 0, dust = 0, flakes = 0, sparks = 0, embers = 0, glints = 0, bubbles = 0, front = 0, back = 0;
      let sx = 0, sy = 0, minDx = Infinity, maxDx = -Infinity;
      for (const p of this.P) {
        if (!p.on || p.b !== b) continue;
        if (p.kind === K_CHUNK || p.kind === K_DROP) {
          parts++; if (p.landed) landed++;
          /* where the pieces went, relative to where the blow landed */
          const dx = p.x - b.ex, dy = p.y - b.ey;
          sx += dx; sy += dy; if (dx < minDx) minDx = dx; if (dx > maxDx) maxDx = dx;
        } else if (p.kind === K_DUST) dust++;
        else if (p.kind === K_FLAKE) flakes++;
        else {
          sparks++;
          if (p.kind === K_EMBER) embers++; else if (p.kind === K_GLINT) glints++; else if (p.kind === K_BUBBLE) bubbles++;
        }
        if (p.y >= b.gy) front++; else back++;
      }
      out.push({
        /* v2.3.2804: + tint, the colour the burst was handed (a blue slime's
           goo must be the blue the slime is drawn in -- mp-hitmat); + atX/atY,
           where on screen the blow landed (ey is its GROUND line and ez its
           height above it) -- inside the body now (mp-shotland) */
        id: b.id, fx: b.fx, weapon: b.weapon, tint: b.tint, age, ms: BURST_MS, sheet: false,
        atX: +b.ex.toFixed(1), atY: +(b.ey - b.ez).toFixed(1),
        parts, landed, dust, flakes, sparks, embers, glints, bubbles, front, back,
        meanDx: parts ? +(sx / parts).toFixed(1) : null, meanDy: parts ? +(sy / parts).toFixed(1) : null,
        minDx: parts ? +minDx.toFixed(1) : null, maxDx: parts ? +maxDx.toFixed(1) : null, dir: +b.ang.toFixed(3),
        alpha: age > BURST_MS - FADE_MS ? +clamp((BURST_MS - age) / FADE_MS, 0, 1).toFixed(3) : 1,
      });
    }
    return out;
  }

  probe() {
    let live = 0;
    for (const p of this.P) if (p.on) live++;
    const src = this.T.sq && this.T.sq.source;
    return { live, bursts: this._stats.bursts, byFx: { ...this._stats.byFx }, lastBurst: this._stats.lastBurst,
      splats: this._stats.splats, crumbles: this._stats.crumbles, bounces: this._stats.bounces,
      /* the atlas must sample NEAREST -- linear would blur every piece, the complaint itself */
      nearest: !!(src && (src.scaleMode === 'nearest' || (src.style && src.style.scaleMode === 'nearest'))),
      pieceScale: +PIX.toFixed(4),
      drawn: { front: this.front.body.n + this.front.dust.n + this.front.top.n, back: this.back.body.n + this.back.dust.n + this.back.top.n } };
  }
}
