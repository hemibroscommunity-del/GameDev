/* ═══ v2.3.2771: THE STAFF CAST — CHARGE, RELEASE, A LIVING BOLT, A HOT HIT ═══
 *
 * Owner: asked whether an X "pixel-art wizard casting a spell" prompt could
 * improve the basic staff cast ("no animation and a simple ball-like shape"),
 * approved a side-by-side demo of the ideas that fit ("Looks good. I want to
 * see what it would look like built as it looks like for my game").
 *
 * What the cast was: the bolt appeared in front of the body with no
 * wind-up, the staff never moved, the painted bolt's four frames are nearly
 * identical so it read as a still ball, and every element shot the same bolt.
 *
 * What this adds, all of it cosmetic:
 *   CHARGE   light gathers at the staff's crystal while the cooldown refills
 *            (the 0.9 s you already wait between bolts), with sparks that
 *            spiral inward and heat up.  It adds NO wind-up: the bolt still
 *            leaves on the frame it always did, so damage, range and the
 *            worker's cadence checks are untouched.  The gem doubles as a
 *            ready meter.
 *   RELEASE  a three-frame flash at the crystal, sparks thrown forward, and
 *            the bolt drawn leaving the crystal (entityRenderer kicks the
 *            staff forward in the same beat).  DRAWING ONLY: the hit test
 *            still runs on the projectile's own line — see bolt().
 *   BOLT     an element-coloured halo and a trail of sparks that cool as they
 *            fall behind (effectsRenderer adds a breathing additive copy of
 *            the art, the v2.3.2511 pulse precedent).
 *   CRASH    a white flash, sparks that step white → element colour → dark,
 *            a few slow embers, and the two impact rings drawn as pixel rings.
 *
 * WHY SQUARE SPARKS ON A GRID.  The characters are pixel art; round
 * anti-aliased dots next to them read as a different game.  A spark is 1-2
 * of the characters' OWN pixels (3 sheet px x LOCAL_SCALE), snapped to that
 * grid, and its colour steps through a five-colour heat ramp instead of
 * fading — the "palette-index" idea from the prompt.  The bolt and the maps
 * are painted and stay smooth.
 *
 * WHY NOTHING HERE IS A FILTER.  Glows are an additive sprite over one minted
 * soft texture, the rim-light stand-in included: a filter is the documented
 * iOS grain hazard over the WebGL canvas (v2.3.948, v2.3.1236).
 *
 * NOTHING TO PRELOAD.  Both textures are minted from a canvas at
 * construction; there is no asset fetch, so the animation-preloading law has
 * nothing to register.
 *
 * LEAF MODULE on purpose: entityRenderer (staff pose + crystal position) and
 * effectsRenderer (everything else) both import it, and entityRenderer cannot
 * import effectsRenderer (the fxStrips.js precedent). */
import { Container, Sprite, Texture } from 'pixi.js';
import { ELEMENTS } from '@/data/elements.js';
import { zonePlayerScale } from '@/data/zones.js';
import { TILE } from '@/data/constants.js';

/* Centre of the crystal head in the staff icon (Wizard Staff2.png, 64x64),
   measured off its alpha: the white claw spans rows 12-24, cols 40-55.  One
   icon serves every staff tier (weaponSprites.js), so one point serves too. */
export const STAFF_GEM = { x: 48, y: 17 };
/* One art pixel of the character sheets in world px: the sheets are drawn in
   3-sheet-px blocks and the body renders at LOCAL_SCALE 0.421875. */
const PIX = 3 * 0.421875;
const STEP_MS = 1000 / 12;          /* the 12 fps pose/flicker step */
const FLASH_STEP_MS = 55;           /* flash frames */
/* Share of a spark's life spent before each heat step: a brief white-hot
   flash, most of its life in colour, a brief cool-down at the end. */
const HEAT_AT = [0.14, 0.34, 0.6, 0.86];
const KICK_DEG = 14, RAISE_DEG = 6, KICK_IN_MS = 60, KICK_OUT_MS = 280;
/* The glow shows while you are casting: from a cast until one cooldown plus
   this grace has passed, then it fades out.  Stop attacking and the crystal
   goes quiet rather than sitting lit forever. */
const RHYTHM_GRACE_MS = 150, RHYTHM_FADE_MS = 300;
const MAX_SPARKS = 320;
/* The drawn bolt leaves the crystal and is back on its real flight line
   within this many px -- about 120 ms, most of it under the release flash.
   SHORT ON PURPOSE: the hit test is a capsule with a generous reach (a
   skeleton's is ~74 px before Detonation), so a bolt can connect early, and
   the crash (v2.3.2505) must land where the eye last saw the orb.  Past this
   distance the drawn and the real position are the same point; inside it,
   the leftover offset rides the crash record (projectiles.js reads
   _fxResX/_fxResY), so a point-blank hit still bursts at the drawn orb. */
const CONVERGE_PX = 40;
const TIP_FRESH_MS = 250;
/* A launch offset bigger than this means the published crystal is not this
   bolt's (a stale frame, a zone hop) — draw the bolt where it is instead. */
const MAX_LAUNCH_OFFSET = 60;

/* ── heat ramps, hottest first; stop 4 is the element's own colour ── */
const RAMPS = {
  none:  [0xffffff, 0xe2d8ff, 0xc3b0fc, 0xa78bfa, 0x6a58b0],   /* #a78bfa is the orb's no-element colour */
  flame: [0xfff7d6, 0xffd166, 0xff8c42, 0xc0392b, 0x7a2418],
  frost: [0xffffff, 0xd6f0ff, 0x7cc4f5, 0x2980b9, 0x1f5f8c],
  venom: [0xf4ffe0, 0xb8f28c, 0x5fd068, 0x27ae60, 0x1b7a43],
  storm: [0xffffff, 0xe6d4ff, 0xb58af0, 0x8e44ad, 0x5e2d78],
  light: [0xffffff, 0xfff6c2, 0xffe066, 0xf1c40f, 0xa8850a],
};
const _genRamps = new Map();
function _mix(c, t, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const tr = (t >> 16) & 255, tg = (t >> 8) & 255, tb = t & 255;
  return (Math.round(r + (tr - r) * k) << 16) | (Math.round(g + (tg - g) * k) << 8) | Math.round(b + (tb - b) * k);
}
/** The five-step heat ramp for an element key (null = no element). */
export function rampFor(elem) {
  if (!elem) return RAMPS.none;
  if (Object.prototype.hasOwnProperty.call(RAMPS, elem)) return RAMPS[elem];
  let r = _genRamps.get(elem);
  if (r) return r;
  const e = Object.prototype.hasOwnProperty.call(ELEMENTS, elem) ? ELEMENTS[elem] : null;
  if (!e || typeof e.color !== 'string') return RAMPS.none;
  const c = parseInt(e.color.slice(1), 16);
  if (!Number.isFinite(c)) return RAMPS.none;
  r = [0xffffff, _mix(c, 0xffffff, 0.6), _mix(c, 0xffffff, 0.3), c, _mix(c, 0x000000, 0.35)];
  _genRamps.set(elem, r);
  return r;
}
function heatIndex(u) {
  let i = 0;
  while (i < 4 && u >= HEAT_AT[i]) i++;
  return i;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Your crystal's charge (0..1, the cooldown refilling) and rhythm (1 while
 *  you are casting, fading out once a cooldown and a grace have passed with
 *  no bolt).  ONE copy, read by both the staff pose (entityRenderer) and the
 *  glow (below), so the wind-up and the light cannot drift apart. */
const _charge = { charge: 0, rhythm: 0 };   /* reused: read at once by each caller */
export function staffCharge(S, now) {
  const castAt = (S && S._staffCastAt) || 0;
  if (!castAt) { _charge.charge = 0; _charge.rhythm = 0; return _charge; }
  const cad = S._staffCadenceMs || 900;
  _charge.charge = clamp((now - (S.swingTimer || 0)) / cad, 0, 1);
  _charge.rhythm = clamp(1 - (now - castAt - cad - RHYTHM_GRACE_MS) / RHYTHM_FADE_MS, 0, 1);
  return _charge;
}

/* ── the carried staff's pose (entityRenderer) ─────────────────────────── */
/** Rotation (radians) to add to a carried staff sprite.
 *  castAt/castAng: the last basic cast; charge 0..1 and rhythm 0..1 only for
 *  the local player (a peer's cooldown is not on the wire, so a peer gets the
 *  kick without the wind-up).  `mirror` is the sprite's horizontal flip.
 *
 *  THE SIGN IS GEOMETRIC, not per-facing: the kick turns the crystal TOWARD
 *  the cast direction, so it is the sign of cross(head, aim).  The head
 *  direction on screen is the grip→crystal vector with the mirror applied;
 *  rotation is applied after scale in Pixi, so a positive angle is clockwise
 *  on screen whichever way the sprite is flipped.  Written this way because
 *  reasoning about the flip per facing is how the south sword's tilt got its
 *  sign wrong once (v2.3.1821b). */
export function staffCastPose(now, castAt, castAng, charge, rhythm, mirror, pixelSteps) {
  if (!castAt || typeof castAng !== 'number' || !isFinite(castAng)) return 0;
  const hx = (STAFF_GEM.x - 28) * (mirror ? -1 : 1), hy = STAFF_GEM.y - 40;
  const cross = hx * Math.sin(castAng) - hy * Math.cos(castAng);
  const sign = cross >= 0 ? 1 : -1;
  let since = now - castAt;
  if (since < 0) since = 0;
  /* 12 fps poses, sampled late in each step so the kick lands WITH the flash
     rather than one step after it. */
  if (pixelSteps !== false) since = (Math.floor(since / STEP_MS) + 0.72) * STEP_MS;
  let kick = 0;
  if (since < KICK_IN_MS) kick = KICK_DEG * easeOut(since / KICK_IN_MS);
  else if (since < KICK_IN_MS + KICK_OUT_MS) kick = KICK_DEG * (1 - easeInOut((since - KICK_IN_MS) / KICK_OUT_MS));
  const raise = -RAISE_DEG * smoothstep(0.35, 1, charge || 0) * (rhythm || 0);
  return sign * (kick + raise) * Math.PI / 180;
}

const _gp = { x: 0, y: 0 }, _gg = { x: 0, y: 0 }, _gw = { x: 0, y: 0 };
/** World position of the crystal on a placed staff sprite, into `out`.
 *  Pixi's own transform chain does the work, so a mirror, a kick, a jog bob
 *  or the vista's perspective scale on the display cannot be forgotten.
 *  `worldParent` is any container in world space (the display's parent). */
export function staffTipWorld(sprite, worldParent, out) {
  if (!sprite || sprite.destroyed || !worldParent || !sprite.texture) return false;
  const tw = sprite.texture.width || 64, th = sprite.texture.height || 64;
  _gp.x = STAFF_GEM.x * (tw / 64) - sprite.anchor.x * tw;
  _gp.y = STAFF_GEM.y * (th / 64) - sprite.anchor.y * th;
  sprite.toGlobal(_gp, _gg);
  worldParent.toLocal(_gg, undefined, _gw);
  if (!isFinite(_gw.x) || !isFinite(_gw.y)) return false;
  out.x = _gw.x; out.y = _gw.y;
  return true;
}

/* ── minted textures ───────────────────────────────────────────────────── */
let _glowTex = null, _sqTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.72)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.2)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  _glowTex = Texture.from(c);
  return _glowTex;
}
function sqTex() {
  if (_sqTex) return _sqTex;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 8, 8);
  _sqTex = Texture.from(c);
  return _sqTex;
}

/* Index-pooled sprites refilled from zero every frame (the v2.3.1825
   arrowSprites pattern): created on demand, never destroyed mid-fight,
   hidden when this frame did not use them. */
class SpritePool {
  constructor(parent, tex, blend, cap) {
    this.parent = parent; this.tex = tex; this.blend = blend; this.cap = cap;
    this.list = []; this.n = 0;
  }
  take() {
    if (this.n >= this.cap) return null;
    let sp = this.list[this.n];
    if (!sp || sp.destroyed) {
      sp = new Sprite(this.tex);
      sp.anchor.set(0.5, 0.5);
      if (this.blend) sp.blendMode = this.blend;
      this.parent.addChild(sp);
      this.list[this.n] = sp;
    }
    this.n++;
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

const K_SPARK = 1, K_ORBIT = 2;
/* Per-frame scratch, reused (nothing in the frame loop allocates). */
const _tipA = { x: 0, y: 0 }, _tipB = { x: 0, y: 0 };
const _boltOut = { x: 0, y: 0, rot: 0, grow: 1, ramp: null };

export class StaffCastFx {
  /** frontLayer: the `player` layer, kept as its TOP child -- above the body
   *  (the crystal is in front of him for most facings) but below
   *  gatherNodesFront, so a house or a tree he stands behind (v2.3.2633)
   *  hides the crystal's light and the release like it hides him.  Not the
   *  occluder layer itself: applyDepthBuckets re-sorts every child of those
   *  by its y, and a container at y 0 would be filed behind him.
   *  backLayer: under the player (particles, v2.3.2636) — the crash, which
   *  belongs to the monster that was hit. */
  constructor(frontLayer, backLayer) {
    this.front = new Container();
    this.back = new Container();
    this._frontLayer = frontLayer;
    frontLayer.addChild(this.front);
    backLayer.addChild(this.back);
    /* Glows beneath squares inside each layer: a spark reads on top of its
       own light. */
    const fg = new Container(), fs = new Container(), bg = new Container(), bs = new Container();
    this.front.addChild(fg, fs);
    this.back.addChild(bg, bs);
    this.glowF = new SpritePool(fg, glowTex(), 'add', 64);
    this.sqF = new SpritePool(fs, sqTex(), null, 380);
    this.glowB = new SpritePool(bg, glowTex(), 'add', 48);
    this.sqB = new SpritePool(bs, sqTex(), null, 380);
    /* Preallocated spark records, reused — nothing is allocated per spark. */
    this.sparks = new Array(MAX_SPARKS);
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks[i] = { on: false, kind: 0, back: false, x: 0, y: 0, vx: 0, vy: 0, drag: 1, grav: 0,
        age: 0, life: 1, size: 1, pk: 1, ramp: RAMPS.none, rev: false, a0: 0, r0: 0, w: 0 };
    }
    this._si = 0;
    this.flashes = [];
    this._lastCastAt = 0;
    this._peerCastSeen = new Map();   /* keyed by peer id: Map, never {} (proto-safety) */
    this._orbitAcc = 0;
    this._lastNow = 0;
    this._pk = 1;
    this._charge = 0; this._rhythm = 0;
    this._stats = { castN: 0, crashN: 0, lastCast: null, lastCrash: null };
    if (typeof window !== 'undefined') {
      /* Dev probe, house style (cf. __btJetStream): a screenshot cannot say
         whether the crystal is charging or where a crash was spawned, so the
         system reports what it drew.  mp-staffcast reads this. */
      const self = this;
      window.__btStaffFx = () => self.probe();
    }
  }

  begin() {
    /* The body is created after this container and re-parented by some
       paths, so keep ours on top rather than trusting creation order. */
    const L = this._frontLayer;
    if (L && L.children.length && L.children[L.children.length - 1] !== this.front) L.addChild(this.front);
    this.glowF.begin(); this.sqF.begin(); this.glowB.begin(); this.sqB.begin();
  }

  end() {
    this.glowF.end(); this.sqF.end(); this.glowB.end(); this.sqB.end();
  }

  clear() {
    for (const p of this.sparks) p.on = false;
    this.flashes.length = 0;
    this._peerCastSeen.clear();
    this._orbitAcc = 0;
    this.begin();
    this.end();
  }

  _spawn() {
    const a = this.sparks, n = a.length;
    for (let k = 0; k < n; k++) {
      const p = a[this._si];
      this._si = (this._si + 1) % n;
      if (!p.on) { p.on = true; p.age = 0; return p; }
    }
    return null;
  }

  _glow(front, x, y, r, tint, alpha) {
    if (!(alpha > 0) || !(r > 0)) return;
    const sp = (front ? this.glowF : this.glowB).take();
    if (!sp) return;
    sp.x = x; sp.y = y;
    sp.scale.set((r * 2) / 64);
    if (sp.tint !== tint) sp.tint = tint;
    sp.alpha = Math.min(1, alpha);
  }

  /* One square, n art pixels wide, snapped to the art-pixel grid. */
  _sq(front, x, y, n, tint, pk) {
    const sp = (front ? this.sqF : this.sqB).take();
    if (!sp) return;
    const u = PIX * (pk || 1);
    sp.x = Math.round(x / u) * u;
    sp.y = Math.round(y / u) * u;
    sp.scale.set((u * n) / 8);
    if (sp.tint !== tint) sp.tint = tint;
    sp.alpha = 1;
  }

  _cross(front, x, y, armH, armV, tint, pk) {
    const u = PIX * (pk || 1);
    this._sq(front, x, y, 2, tint, pk);
    for (let i = 1; i <= armH; i++) { this._sq(front, x + i * u, y, 1, tint, pk); this._sq(front, x - i * u, y, 1, tint, pk); }
    for (let i = 1; i <= armV; i++) { this._sq(front, x, y + i * u, 1, tint, pk); this._sq(front, x, y - i * u, 1, tint, pk); }
  }

  _pixRing(front, x, y, r, n, tint, pk) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this._sq(front, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, 1, tint, pk);
    }
  }

  /* ── the caster's crystal, and whose it is ── */
  /* Into `out` (scratch); null when that crystal is not live. */
  _tipOf(owner, S, out) {
    if (owner === 'self') {
      if (!(S._staffTipAt && this._lastNow - S._staffTipAt < TIP_FRESH_MS)) return null;
      out.x = S._staffTipX; out.y = S._staffTipY;
      return out;
    }
    const o = S.others && Object.prototype.hasOwnProperty.call(S.others, owner) ? S.others[owner] : null;
    if (!(o && o._staffTipAt && this._lastNow - o._staffTipAt < TIP_FRESH_MS)) return null;
    out.x = o._staffTipX; out.y = o._staffTipY;
    return out;
  }

  /* Is that caster's staff carried behind his body this frame (entityRenderer
     publishes it)?  Then its light is dimmed and its crisp marks skipped, so
     nothing paints over his back. */
  _behind(owner, S) {
    if (owner === 'self') return !!S._staffTipBehind;
    const o = S.others && Object.prototype.hasOwnProperty.call(S.others, owner) ? S.others[owner] : null;
    return !!(o && o._staffTipBehind);
  }

  _onCast(owner, tip, ang, ramp, isSelf, pk, now) {
    this._stats.castN++;
    this._stats.lastCast = { at: now, x: +tip.x.toFixed(1), y: +tip.y.toFixed(1), owner: isSelf ? 'self' : 'peer' };
    this.flashes.push({ kind: 0, t0: now, x: tip.x, y: tip.y, owner, ramp, pk });
    if (isSelf) {
      /* the gathered sparks are spent into the bolt */
      for (const p of this.sparks) if (p.on && p.kind === K_ORBIT) p.on = false;
      this._orbitAcc = 0;
    }
    for (let i = 0; i < 7; i++) {
      const p = this._spawn();
      if (!p) break;
      const a = ang + (Math.random() - 0.5) * 1.8;
      const sp = (1.2 + Math.random() * 2.4) * pk;
      p.kind = K_SPARK; p.back = false; p.rev = false; p.ramp = ramp; p.pk = pk;
      p.x = tip.x; p.y = tip.y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 0.2 * pk;
      p.drag = 0.86; p.grav = 0.03 * pk; p.life = 150 + Math.random() * 150;
      p.size = Math.random() < 0.4 ? 2 : 1;
    }
  }

  _onCrash(x, y, ramp, pk, now) {
    this._stats.crashN++;
    this._stats.lastCrash = { at: now, x: +x.toFixed(1), y: +y.toFixed(1) };
    this.flashes.push({ kind: 1, t0: now, x, y, owner: null, ramp, pk });
    for (let i = 0; i < 20; i++) {
      const p = this._spawn();
      if (!p) break;
      const a = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const sp = (1.6 + Math.random() * 3.6) * pk;
      p.kind = K_SPARK; p.back = true; p.rev = false; p.ramp = ramp; p.pk = pk;
      p.x = x + Math.cos(a) * 3 * pk; p.y = y + Math.sin(a) * 3 * pk;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 0.8 * pk;
      p.drag = 0.9; p.grav = 0.1 * pk; p.life = 240 + Math.random() * 260;
      p.size = Math.random() < 0.35 ? 2 : 1;
    }
    /* Embers: start already coloured (no white flash of their own), drift
       up, cool slowly.  The tail of the hit, so it reads as heat and not a
       spray. */
    const ember = [ramp[1], ramp[2], ramp[3], ramp[3], ramp[4]];
    for (let i = 0; i < 5; i++) {
      const p = this._spawn();
      if (!p) break;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = (0.4 + Math.random() * 1.1) * pk;
      p.kind = K_SPARK; p.back = true; p.rev = false; p.ramp = ember; p.pk = pk;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.drag = 0.97; p.grav = 0.035 * pk; p.life = 520 + Math.random() * 320; p.size = 1;
    }
  }

  /** Where to draw a basic staff bolt this frame (local or a peer's), plus its
   *  halo and trail.  Returns { x, y, rot, grow, ramp }.
   *
   *  THE HIT TEST IS NOT MOVED.  projectiles.js flies the bolt on its own line
   *  and tests hits there; this only draws it leaving the caster's crystal and
   *  easing onto that line within CONVERGE px (or by the predicted hit), so by
   *  the time it can hit anything, what you see is where it is. */
  bolt(p, x, y, ang, pk, now, S) {
    const k1 = pk || 1;
    if (p._fxSeen == null) {
      p._fxSeen = now;
      p._fxOx = 0; p._fxOy = 0; p._fxSpan = 0; p._fxD0 = p.dist || 0;
      const owner = p.ownerId != null ? p.ownerId : 'self';
      const tip = this._tipOf(owner, S, _tipA);
      if (tip && isFinite(x) && isFinite(y)) {
        const ox = tip.x - x, oy = tip.y - y;
        if (ox * ox + oy * oy <= MAX_LAUNCH_OFFSET * MAX_LAUNCH_OFFSET * k1 * k1) {
          p._fxOx = ox; p._fxOy = oy;
          p._fxSpan = CONVERGE_PX * k1;
        }
      }
      p._fxElem = owner === 'self'
        ? (p._projElem || (S.rpg && S.rpg.staffWeapon && S.rpg.staffWeapon.element1) || null)
        : null;
    }
    const k = p._fxSpan > 0 ? 1 - clamp(((p.dist || 0) - p._fxD0) / p._fxSpan, 0, 1) : 0;
    const dx = x + p._fxOx * k, dy = y + p._fxOy * k;
    /* the leftover drawing offset, for a crash that lands before it is gone */
    p._fxResX = dx - x; p._fxResY = dy - y;
    /* Point down the DRAWN path: while easing off the crystal the path is
       d(ground + O*k)/d(dist) = dir - O/span.  WORKED OUT, not measured from
       the frame's motion: a staff bolt rides the caster's CURRENT position
       (projectiles.js), so its on-screen motion includes his -- a backward
       roll would have turned every bolt tail-first. */
    const a0 = ang || 0;
    let rot = a0;
    if (k > 0 && p._fxSpan > 0) rot = Math.atan2(Math.sin(a0) - p._fxOy / p._fxSpan, Math.cos(a0) - p._fxOx / p._fxSpan);
    let moved = 0;
    if (p._fxPx != null) {
      const mx = dx - p._fxPx, my = dy - p._fxPy;
      moved = Math.sqrt(mx * mx + my * my);
    }
    const ramp = rampFor(p._fxElem);
    /* Trail: one spark per ~6 px of flight, laid along the segment, so the
       spacing is the same at 30 fps as at 60. */
    if (p._fxPx != null && moved > 0 && moved < 200) {
      p._fxTrail = (p._fxTrail || 0) + moved / (6 * k1);
      const vx = Math.cos(rot), vy = Math.sin(rot);
      while (p._fxTrail >= 1) {
        p._fxTrail -= 1;
        const s = this._spawn();
        if (!s) break;
        const f = Math.random();
        const j = (Math.random() - 0.5) * 5 * k1;
        const sx = p._fxPx + (dx - p._fxPx) * f, sy = p._fxPy + (dy - p._fxPy) * f;
        const back = 0.2 + Math.random() * 0.6;
        s.kind = K_SPARK; s.back = false; s.rev = false; s.ramp = ramp; s.pk = k1;
        s.x = sx - vx * 7 * k1 - vy * j; s.y = sy - vy * 7 * k1 + vx * j;
        s.vx = (-vx * back + (Math.random() - 0.5) * 0.5) * k1;
        s.vy = (-vy * back + (Math.random() - 0.5) * 0.5 - 0.1) * k1;
        s.drag = 0.92; s.grav = -0.008 * k1; s.life = 180 + Math.random() * 220;
        s.size = Math.random() < 0.25 ? 2 : 1;
      }
    }
    p._fxPx = dx; p._fxPy = dy; p._fxRot = rot;
    /* the real position this frame was drawn from, beside the drawn one, so a
       probe compares like with like (the sim may step again before it reads) */
    p._fxRx = x; p._fxRy = y;
    /* the element halo, under the art */
    this._glow(true, dx, dy, 15 * k1, ramp[2], 0.3);
    _boltOut.x = dx; _boltOut.y = dy; _boltOut.rot = rot; _boltOut.ramp = ramp;
    _boltOut.grow = 0.45 + 0.55 * easeOut(clamp((now - p._fxSeen) / 90, 0, 1));
    return _boltOut;
  }

  /** A staff crash ring (projectiles.js pushes it into S._impactRings with
   *  style 'staff'), drawn as a stepped pixel ring in the element's ramp. */
  ring(r, now, pk) {
    const dur = r.duration || 400;
    const t = now - r.ts - (r.startDelay || 0);
    if (t < 0) return;
    const age = clamp((Math.floor(t / FLASH_STEP_MS) * FLASH_STEP_MS) / dur, 0, 0.999);
    const ramp = rampFor(r.elem);
    const k1 = pk || 1;
    const rad = (r.maxR || 15) * (0.5 + 0.5 * age) * k1;
    const n = Math.max(8, Math.round(rad * 0.9));
    this._pixRing(false, r.x + (r.vdx || 0), r.y + (r.vdy || 0), rad, n, ramp[1 + Math.floor(age * 3)], k1);
  }

  update(S, now, selfCorpse) {
    const dtRaw = this._lastNow ? now - this._lastNow : 16.667;
    const dt = clamp(dtRaw, 0, 50);
    this._lastNow = now;
    const f = dt / 16.667;   /* 60 Hz frame units, so the physics is frame-rate independent */
    const R = S && S.rpg;

    /* ── your crystal: cast detection, charge glow, inward sparks ── */
    const tipLive = !!(S && S._staffTipAt && now - S._staffTipAt < TIP_FRESH_MS);
    const staffOut = !!(R && R.activeSlot === 'staff' && tipLive && !selfCorpse);
    this._charge = 0; this._rhythm = 0;
    if (staffOut) {
      const tip = _tipA;
      tip.x = S._staffTipX; tip.y = S._staffTipY;
      const pk = zonePlayerScale(S.currentZone, tip.x, tip.y, TILE) || 1;
      this._pk = pk;
      const elem = (R.staffWeapon && R.staffWeapon.element1) || null;
      const ramp = rampFor(elem);
      const castAt = S._staffCastAt || 0;
      if (castAt && castAt !== this._lastCastAt) {
        this._lastCastAt = castAt;
        if (now - castAt < 300) this._onCast('self', tip, S._staffCastAng || 0, ramp, true, pk, now);
      }
      const { charge: c, rhythm } = staffCharge(S, now);
      this._charge = c; this._rhythm = rhythm;
      if (rhythm > 0) {
        const behind = !!S._staffTipBehind;
        const vis = behind ? 0.3 : 1;
        const stepN = Math.floor(now / STEP_MS);
        const fl = c > 0.55 ? 0.78 + 0.22 * hash(stepN) : 1;   /* stepped flicker near full */
        this._glow(true, tip.x, tip.y, (5 + 11 * c) * pk, ramp[2], (0.12 + 0.6 * c * c) * fl * rhythm * vis);
        this._glow(true, tip.x, tip.y, (2 + 3.5 * c) * pk, 0xffffff, (0.2 + 0.65 * c) * fl * rhythm * vis);
        if (c > 0.82 && !behind) {
          const big = stepN % 2 === 0;
          this._cross(true, tip.x, tip.y, big ? 3 : 2, big ? 2 : 1, ramp[1], pk);
        }
        if (c > 0.12) {
          this._orbitAcc += ((5 + 28 * c) / 60) * f * rhythm;
          while (this._orbitAcc >= 1) {
            this._orbitAcc -= 1;
            const p = this._spawn();
            if (!p) break;
            p.kind = K_ORBIT; p.back = false; p.rev = true; p.ramp = ramp; p.pk = pk;
            p.a0 = Math.random() * Math.PI * 2; p.r0 = (11 + Math.random() * 12) * pk;
            p.w = 3.2 + Math.random() * 2.6; p.life = 240 + Math.random() * 180;
            p.size = Math.random() < 0.3 ? 2 : 1;
          }
        }
      }
    } else if (S) {
      /* Put away, dead or not holding a staff: remember the stamp so taking
         the staff out later does not replay an old release. */
      this._lastCastAt = S._staffCastAt || 0;
    }

    /* ── other players' casts: the release flash at THEIR crystal ── */
    if (S && S.others) {
      for (const id of Object.keys(S.others)) {
        const o = S.others[id];
        if (!o || !o._staffCastAt) continue;
        if (this._peerCastSeen.get(id) === o._staffCastAt) continue;
        this._peerCastSeen.set(id, o._staffCastAt);
        if (now - o._staffCastAt > 300) continue;
        const tip = this._tipOf(id, S, _tipA);
        if (!tip) continue;
        const pk = zonePlayerScale(S.currentZone, tip.x, tip.y, TILE) || 1;
        this._onCast(id, tip, typeof o._staffCastAng === 'number' ? o._staffCastAng : 0, RAMPS.none, false, pk, now);
      }
      if (this._peerCastSeen.size > 64) {
        for (const id of this._peerCastSeen.keys()) {
          if (!Object.prototype.hasOwnProperty.call(S.others, id)) this._peerCastSeen.delete(id);
        }
      }
    }

    /* ── crashes queued by projectiles.js ── */
    const q = S && S._staffCrashes;
    if (q && q.length) {
      for (let i = 0; i < q.length; i++) {
        const c = q[i];
        if (!c || !isFinite(c.x) || !isFinite(c.y)) continue;
        const cx = c.x + (Number.isFinite(c.vdx) ? c.vdx : 0);
        const cy = c.y + (Number.isFinite(c.vdy) ? c.vdy : 0);
        const pk = zonePlayerScale(S.currentZone, cx, cy, TILE) || 1;
        this._onCrash(cx, cy, rampFor(c.elem), pk, now);
      }
      q.length = 0;
    }

    /* ── sparks: step, then draw ── */
    let tipNow = null;
    if (tipLive) { tipNow = _tipB; tipNow.x = S._staffTipX; tipNow.y = S._staffTipY; }
    for (let i = 0; i < this.sparks.length; i++) {
      const p = this.sparks[i];
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; continue; }
      let x, y;
      const u = p.age / p.life;
      if (p.kind === K_ORBIT) {
        if (!tipNow) { p.on = false; continue; }
        if (S._staffTipBehind) continue;   /* aging, but not drawn over his back */
        const ang = p.a0 + (p.w * p.age) / 1000;
        const rr = p.r0 * (1 - u * u);
        x = tipNow.x + Math.cos(ang) * rr;
        y = tipNow.y + Math.sin(ang) * rr * 0.8;
      } else {
        const dg = Math.pow(p.drag, f);
        p.vx *= dg; p.vy *= dg;
        p.vy += p.grav * f;
        p.x += p.vx * f; p.y += p.vy * f;
        x = p.x; y = p.y;
      }
      const h = heatIndex(u);
      const idx = p.rev ? 4 - h : h;
      /* a hot spark is a pixel bigger, and shrinks as it cools */
      this._sq(!p.back, x, y, p.size + (idx <= 1 ? 1 : 0), p.ramp[idx], p.pk);
    }

    /* ── flashes ── */
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i];
      const fr = Math.floor(Math.max(0, now - fl.t0) / FLASH_STEP_MS);
      const r = fl.ramp, pk = fl.pk || 1;
      if (fl.kind === 0) {
        if (fr >= 3) { this.flashes.splice(i, 1); continue; }
        /* the release rides the crystal as the staff kicks */
        const tip = this._tipOf(fl.owner, S, _tipA) || fl;
        const behind = this._behind(fl.owner, S);
        const vis = behind ? 0.35 : 1;
        if (fr === 0) {
          this._glow(true, tip.x, tip.y, 13 * pk, r[1], 0.95 * vis);
          this._glow(true, tip.x, tip.y, 5 * pk, 0xffffff, vis);
          if (!behind) this._cross(true, tip.x, tip.y, 5, 3, 0xffffff, pk);
        } else if (fr === 1) {
          this._glow(true, tip.x, tip.y, 9 * pk, r[2], 0.55 * vis);
          if (!behind) this._cross(true, tip.x, tip.y, 3, 2, r[1], pk);
        } else if (!behind) {
          this._pixRing(true, tip.x, tip.y, 7 * pk, 8, r[2], pk);
        }
      } else {
        if (fr >= 2) { this.flashes.splice(i, 1); continue; }
        if (fr === 0) {
          this._glow(false, fl.x, fl.y, 20 * pk, r[1], 0.9);
          this._glow(false, fl.x, fl.y, 7 * pk, 0xffffff, 1);
          this._cross(false, fl.x, fl.y, 6, 5, 0xffffff, pk);
        } else {
          this._glow(false, fl.x, fl.y, 14 * pk, r[2], 0.5);
          this._cross(false, fl.x, fl.y, 3, 3, r[1], pk);
        }
      }
    }
  }

  probe() {
    let orbit = 0, front = 0, back = 0;
    for (const p of this.sparks) {
      if (!p.on) continue;
      if (p.kind === K_ORBIT) orbit++;
      else if (p.back) back++;
      else front++;
    }
    const L = this.front.parent;
    return {
      charge: +this._charge.toFixed(3), rhythm: +this._rhythm.toFixed(3),
      /* where the crystal's light is drawn from: the player layer, on top */
      frontLayer: (L && L.label) || null,
      frontOnTop: !!(L && L.children[L.children.length - 1] === this.front),
      sparks: { orbit, front, back },
      drawn: { glowFront: this.glowF.n, sqFront: this.sqF.n, glowBack: this.glowB.n, sqBack: this.sqB.n },
      flashes: this.flashes.length,
      casts: this._stats.castN, crashes: this._stats.crashN,
      lastCast: this._stats.lastCast, lastCrash: this._stats.lastCrash,
    };
  }
}
