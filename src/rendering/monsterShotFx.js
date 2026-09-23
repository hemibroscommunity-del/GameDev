/* ═══ v2.3.2705: THE MONSTERS' SHOTS, IN FLIGHT AND WHEN THEY LAND ═══
 *
 * Owner: "take another look at the procedurally drawn projectiles from slimes
 * and fire goblins ... I bet you could make better ones.  Just make sure it's
 * colored correctly (green slimes are recolored to blue during game but I
 * might add green ones later)."
 *
 * What a slime's ball or a goblin's fireball was: one still picture, slid along
 * the ground line at the thrower's feet, gone without a trace the moment it
 * arrived.  What it is now (the art is monsterShotArt.js; this file moves it):
 *
 *   A THROW WITH A SHAPE.  The ball leaves the thrower's body, not its feet,
 *   and comes down on the spot it was aimed at -- a lob for goo, a flatter
 *   throw for fire -- with its SHADOW (goo) or the light it casts (fire)
 *   sliding along the ground beneath it.  That ground mark is the ball's true
 *   line: the worker settles the hit at the aim point, and the shadow is
 *   exactly where the ball will land, so it reads MORE honestly than the old
 *   ground-hugging picture, not less.  The lift is drawing only -- the ball's
 *   x/y in S.slimeProjectiles is the ground point, untouched, so every hit
 *   test and prop stop is the one it always was.
 *   A GLOB OF GOO.  A wobbling teardrop in the thrower's colour, lit where the
 *   world is lit, dripping as it flies; drips fall and spot the ground.  On
 *   landing it slaps into a crown of goo, flings droplets, and leaves a small
 *   splat drawn the way the slime's own death puddle is, which fades.
 *   A FIREBALL.  A flickering head with tongues licking back off it, a warm
 *   glow, a trail of embers that rise and cool and a wisp of smoke.  On landing
 *   it flashes, bursts into a fan of flame, throws embers, and scorches the
 *   ground.
 *   DEPTH.  The ball stands at its ground point in the entity layer, so the
 *   ground-line sort (depthSort.js) puts it behind whatever it flies behind --
 *   a monster, a building, you -- and in front of what it passes in front of.
 *   Its trail and its landing are effects and follow the effects rule (the
 *   particles layer, under the player: v2.3.2636).  Ground marks are on the
 *   ground-splatter layer, under everything that stands.
 *
 * PRELOADED, not lazy.  The atlas is minted from code by preloadMonsterShots(),
 * which preloadWorldAnimations() awaits on the loading screen (the animation
 * preloading LAW) -- in small slices, so the bar keeps moving.  Until it
 * exists `ready` is false and effectsRenderer keeps drawing the old pictures,
 * so a failed mint degrades to what shipped before rather than to nothing.
 *
 * NO FILTERS (the iOS grain hazard, v2.3.948).  Glows are additive sprites
 * over one soft minted texture; everything else is crisp nearest-sampled
 * pixels on the slime's own grid, and every sprite comes out of one of two
 * textures, so the whole effect batches.
 */
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import {
  ART_PX, DIRS, GOO_PHASES, FIRE_PHASES, FIRE_BURST_FRAMES, GOO_SPLASH_FRAMES, FIRE_RAMP,
  gooFrame, gooShine, fireFrame, fireBurstFrame, scorchMark, gooPuddle, gooSplashFrame, smallPieces, softGlow,
} from './monsterShotArt.js';
import { MONSTER_VARIANTS } from '@/data/monsterVariants.js';
import { shotStyleOf, gooColorOf, shotPxOf, shotSizesInUse, shotThrowerArch } from '@/data/monsterShots.js';
import { hasRecoloredState } from './monsterRecolor.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* How big the art is for a given on-screen size (world px).  Goo: the old orb
   filled 92% of its frame, so the glob's HEAD is drawn that wide.  Fire: the
   head and tail as fractions of the goblin's projectileScalePx -- 40 gives a
   ~20 px head with ~28 px of flame behind it, a little under half the goblin's
   height, which is what v2.3.2504 asked the 40 for ("a thing you flinch from
   rather than a spark"); the old picture only ever filled ~24 px of its 40. */
const gooR = (px) => Math.round(((px * 0.92) / 2 / ART_PX) * 2) / 2;
const fireRh = (px) => Math.round(px * 0.22 * 2) / 2;
const fireLt = (px) => Math.round(px * 0.62);

/* Where the throw leaves from and how high it arcs, world px above the ground.
   Launch heights are the throwers' body centres (gameSystems monsterBodyOffsetY:
   fodder 23, fireGoblin 28) less a little, so a slime spits from the top of its
   dome and a goblin throws from the shoulder. */
const LAUNCH_H = { goo: 21, fire: 30 };
const ARC_H = { goo: 12, fire: 5 };

const GOO_FRAME_MS = 90;     /* the glob's wobble */
const FIRE_FRAME_MS = 55;    /* the fire's flicker */
const SPLASH_FRAME_MS = 70;
const BURST_FRAME_MS = 60;
const DEPTH = 0.55;          /* ground-plane depth foreshortening (the 3/4 view) */
const MAX_PARTS = 260;
const MAX_MARKS = 16;
const MAX_DOTS = 80;
const MAX_BURSTS = 12;
const MAX_QUEUE = 16;

/* ── the atlas ─────────────────────────────────────────────────────────── */
let _atlas = null;
let _atlasPromise = null;

/* Pack minted images into one canvas (shelf packing, 1px gutters) and cut a
   Texture for each.  Returns a { tex, ax, ay } per image, where ax/ay is the
   image's anchor as a fraction, ready for sprite.anchor. */
function packImages(list, smooth) {
  const W = 1024;
  const order = list.map((it, i) => i).sort((a, b) => list[b].img.h - list[a].img.h);
  const pos = new Array(list.length);
  let x = 0, y = 0, rowH = 0;
  for (const i of order) {
    const im = list[i].img;
    if (x + im.w + 1 > W) { x = 0; y += rowH + 1; rowH = 0; }
    pos[i] = [x, y];
    x += im.w + 1;
    rowH = Math.max(rowH, im.h);
  }
  const H = y + rowH + 1;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Math.max(1, H);
  const ctx = cv.getContext('2d');
  for (let i = 0; i < list.length; i++) {
    const im = list[i].img;
    ctx.putImageData(new ImageData(im.data, im.w, im.h), pos[i][0], pos[i][1]);
  }
  const base = Texture.from(cv);
  if (base.source) {
    try { base.source.scaleMode = smooth ? 'linear' : 'nearest'; } catch (e) { /* older pixi */ }
  }
  return list.map((it, i) => ({
    tex: new Texture({ source: base.source, frame: new Rectangle(pos[i][0], pos[i][1], it.img.w, it.img.h) }),
    ax: it.img.ax / it.img.w,
    ay: it.img.ay / it.img.h,
    w: it.img.w, h: it.img.h,
  }));
}

/** Mint every frame the monsters' shots can use.  Awaited on the loading
 *  screen by preloadWorldAnimations; repeat calls share one promise. */
export function preloadMonsterShots() {
  if (_atlasPromise) return _atlasPromise;
  _atlasPromise = (async () => {
    if (typeof document === 'undefined') return;
    const breathe = () => new Promise((r) => setTimeout(r, 0));
    const list = [];
    const add = (img) => { list.push({ img }); return list.length - 1; };
    const sizes = shotSizesInUse();
    const goo = [];
    for (const px of sizes.goo) {
      const R = gooR(px);
      const e = { px, R, frames: [], shine: add(gooShine(R)), splash: [], puddles: [] };
      for (let d = 0; d < DIRS; d++) {
        const row = [];
        for (let p = 0; p < GOO_PHASES; p++) row.push(add(gooFrame(R, d, p)));
        e.frames.push(row);
        if (d % 4 === 3) await breathe();
      }
      for (let k = 0; k < GOO_SPLASH_FRAMES; k++) e.splash.push(add(gooSplashFrame(R, k)));
      for (let s = 0; s < 3; s++) e.puddles.push(add(gooPuddle(R, s)));
      goo.push(e);
      await breathe();
    }
    const fire = [];
    for (const px of sizes.fire) {
      const Rh = fireRh(px), Lt = fireLt(px);
      const e = { px, Rh, Lt, frames: [], burst: [] };
      for (let d = 0; d < DIRS; d++) {
        const row = [];
        for (let p = 0; p < FIRE_PHASES; p++) row.push(add(fireFrame(Rh, Lt, d, p)));
        e.frames.push(row);
        if (d % 4 === 3) await breathe();
      }
      for (let k = 0; k < FIRE_BURST_FRAMES; k++) e.burst.push(add(fireBurstFrame(Rh * 1.7, k)));
      fire.push(e);
      await breathe();
    }
    const scorch = [0, 1, 2].map((s) => add(scorchMark(Math.max(8, (fire[0] ? fire[0].Rh : 7) * 1.9), s)));
    const pcs = smallPieces();
    const pieces = {};
    for (const k of Object.keys(pcs)) pieces[k] = add(pcs[k]);
    const cut = packImages(list, false);
    const T = (i) => cut[i];
    const glow = packImages([{ img: softGlow(48) }], true)[0];
    _atlas = {
      goo: goo.map((e) => ({
        px: e.px, R: e.R,
        frames: e.frames.map((row) => row.map(T)),
        shine: T(e.shine), splash: e.splash.map(T), puddles: e.puddles.map(T),
      })),
      fire: fire.map((e) => ({ px: e.px, Rh: e.Rh, Lt: e.Lt, frames: e.frames.map((row) => row.map(T)), burst: e.burst.map(T) })),
      scorch: scorch.map(T),
      pieces: Object.fromEntries(Object.keys(pieces).map((k) => [k, T(pieces[k])])),
      glow,
      bytes: 1024 * (cut[0] ? cut[0].tex.source.height : 0) * 4,
    };
  })().catch(() => { _atlas = null; });
  return _atlasPromise;
}

/* the minted set closest to an asked-for size (a variant retuned since load
   still draws, at the nearest size that exists) */
function nearestSet(sets, px) {
  let best = null;
  for (const s of sets || []) if (!best || Math.abs(s.px - px) < Math.abs(best.px - px)) best = s;
  return best;
}

/* deterministic 0..1 from a string -- a ball's wobble phase, so two screens
   watching the same ball see it on the same frame of its wobble */
function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 10007) / 10007;
}

const rnd = Math.random;
const pick = (a) => a[(rnd() * a.length) | 0];

export class MonsterShotFx {
  /** layers: { entities, particles, ground } -- the entity layer the depth
   *  sort owns, the effects layer, and the ground-splatter layer. */
  constructor(layers) {
    this.entityLayer = layers.entities;
    /* our own containers inside the shared layers, so nothing here can be
       mistaken for (or swept up with) another system's sprites */
    this.particleLayer = new Container();
    this.particleLayer.label = 'monsterShotFx';
    if (layers.particles) layers.particles.addChild(this.particleLayer);
    this.groundLayer = new Container();
    this.groundLayer.label = 'monsterShotGround';
    if (layers.ground) layers.ground.addChild(this.groundLayer);
    this._shots = new Map();
    this._parts = [];
    this._spare = [];
    this._marks = [];
    this._bursts = [];
    this._zone = null;
    this._lastNow = 0;
    /* the effect's own clock: real time, times window.__btShotFxRate when a
       QA film asks for slow motion (shot-monstershots) -- 1 otherwise */
    this._t = 0;
    this._dots = [];
    this._impacts = 0;
    this._lastImpact = null;
    if (typeof window !== 'undefined') {
      /* Dev probe, house style: what is flying, what it looks like and what
         colour, and what its landings left behind.  mp-monstershots reads it. */
      window.__btMonsterShots = () => this.probe();
    }
  }

  get ready() { return !!_atlas; }

  /** Is this ball drawn here (true) or by the old picture path (false)? */
  handles(sp) { return !!_atlas && !!sp && sp.kind !== 'snowball'; }

  /* ── flight ──────────────────────────────────────────────────────────── */
  _look(S, sp) {
    const arch = shotThrowerArch(S, sp);
    const style = shotStyleOf(arch, sp.kind);
    const px = shotPxOf(arch, style);
    const v = Object.prototype.hasOwnProperty.call(MONSTER_VARIANTS, arch) ? MONSTER_VARIANTS[arch] : null;
    const ready = !(v && v.recolor) || hasRecoloredState(v, 'idle');
    return { arch, style, px, tint: style === 'goo' ? gooColorOf(arch, ready) : 0xffffff };
  }

  _newShot(S, sp) {
    const look = this._look(S, sp);
    const fire = look.style === 'fire';
    const set = fire ? nearestSet(_atlas.fire, look.px) : nearestSet(_atlas.goo, look.px);
    if (!set) return null;
    const cont = new Container();
    cont.label = 'monsterShot';
    let glow = null, shine = null;
    if (fire) {
      glow = new Sprite(_atlas.glow.tex);
      glow.anchor.set(0.5, 0.5);
      glow.blendMode = 'add';
      glow.tint = 0xff7a1a;
      cont.addChild(glow);
    }
    const body = new Sprite(set.frames[0][0].tex);
    body.scale.set(ART_PX);
    if (!fire) body.tint = look.tint;
    cont.addChild(body);
    if (!fire) {
      shine = new Sprite(set.shine.tex);
      shine.anchor.set(set.shine.ax, set.shine.ay);
      shine.scale.set(ART_PX);
      cont.addChild(shine);
    }
    /* the ground mark under it: a shadow for goo, the fire's light for fire */
    const ground = fire ? new Sprite(_atlas.glow.tex) : new Sprite(_atlas.pieces.shadow.tex);
    ground.anchor.set(0.5, 0.5);
    if (fire) { ground.blendMode = 'add'; ground.tint = 0xff8a1e; } else { ground.tint = 0x000000; }
    this.groundLayer.addChild(ground);
    this.entityLayer.addChild(cont);
    const rec = {
      sp, look, set, cont, body, glow, shine, ground,
      phase0: hashStr(String(sp.ownerId) + ':' + String(sp.ts)) * 4000,
      lastX: null, lastY: null, trail: 0, smoke: 0, dir: 0, lift: 0, frame: null,
    };
    sp._fxLook = look;
    return rec;
  }

  /** Draw every non-snowball ball in `list` (S.slimeProjectiles), and let go
   *  of the ones that have left it. */
  drawShots(S, now, list) {
    if (!_atlas) return;
    const live = new Set();
    for (let i = 0; i < list.length; i++) {
      const sp = list[i];
      if (!sp || sp.kind === 'snowball') continue;
      live.add(sp);
      /* a ball first drawn by the old picture path keeps no second copy */
      if (sp._pixiSprite && !sp._pixiSprite.destroyed && sp._pixiSprite.visible) sp._pixiSprite.visible = false;
      let rec = this._shots.get(sp);
      if (!rec) {
        rec = this._newShot(S, sp);
        if (!rec) continue;
        this._shots.set(sp, rec);
      }
      this._placeShot(rec, this._t || now);
    }
    for (const [sp, rec] of this._shots) {
      if (!live.has(sp)) this._dropShot(sp, rec);
    }
  }

  _dropShot(sp, rec) {
    this._shots.delete(sp);
    for (const s of [rec.cont, rec.ground]) { if (s && !s.destroyed) s.destroy({ children: true }); }
  }

  _placeShot(rec, now) {
    const sp = rec.sp, style = rec.look.style, fire = style === 'fire';
    /* how far along its flight it is: frames flown over the frames the whole
       flight takes (a prop stop cuts `life`, not the flight's length) */
    if (sp._fxLife0 == null) sp._fxLife0 = sp.life;
    const frames = Math.max(1, sp._fxFrames || sp._fxLife0 || 1);
    const f = clamp((sp._fxLife0 - sp.life) / frames, 0, 1);
    const h0 = LAUNCH_H[style], arc = ARC_H[style];
    const lift = h0 * (1 - f) + arc * 4 * f * (1 - f);
    /* the heading the DRAWN ball travels: along the ground, plus the lift
       changing -- a lob points up as it leaves and down as it lands */
    const spd = sp.speed || 0, ca = Math.cos(sp.ang || 0), sa = Math.sin(sp.ang || 0);
    let vx = ca * spd, vy = sa * spd - (-h0 + arc * 4 * (1 - 2 * f)) / frames;
    if (Math.abs(vx) + Math.abs(vy) < 1e-3) { vx = ca; vy = sa; }
    const hd = Math.atan2(vy, vx);
    const dir = ((Math.round(hd / (TAU / DIRS)) % DIRS) + DIRS) % DIRS;
    const phases = fire ? FIRE_PHASES : GOO_PHASES;
    const ph = Math.floor((now + rec.phase0) / (fire ? FIRE_FRAME_MS : GOO_FRAME_MS)) % phases;
    const fr = rec.set.frames[dir][ph];
    if (rec.frame !== fr) {
      rec.frame = fr;
      rec.body.texture = fr.tex;
      rec.body.anchor.set(fr.ax, fr.ay);
    }
    /* the container stands on the GROUND point -- that is its depth key */
    rec.cont.x = sp.x; rec.cont.y = sp.y;
    rec.body.y = -lift;
    if (rec.shine) rec.shine.y = -lift;
    const headW = (fire ? rec.set.Rh : rec.set.R) * 2 * ART_PX;
    if (rec.glow) {
      rec.glow.y = -lift;
      const pulse = 1 + 0.12 * Math.sin((now + rec.phase0) / 70);
      rec.glow.scale.set((headW * 2.6 * pulse) / 48);
      rec.glow.alpha = 0.36;
    }
    rec.ground.x = sp.x; rec.ground.y = sp.y;
    const high = clamp(lift / 40, 0, 1);
    if (fire) {
      rec.ground.scale.set((headW * 3.2) / 48, (headW * 1.3) / 48);
      rec.ground.alpha = 0.3 * (1 - 0.55 * high);
    } else {
      const s = (headW * (1 - 0.3 * high)) / 14;
      rec.ground.scale.set(s, s * 1.1);
      rec.ground.alpha = 0.26 * (1 - 0.5 * high);
    }
    sp._fxLift = lift;
    rec.lift = lift; rec.dir = dir;
    /* the trail, by distance flown, so it is as dense on a slow screen as a fast one */
    const dx = sp.x, dy = sp.y - lift;
    if (rec.lastX != null) {
      const moved = Math.min(40, Math.hypot(dx - rec.lastX, dy - rec.lastY));
      rec.trail += moved; rec.smoke += moved;
      const ux = Math.cos(hd), uy = Math.sin(hd);
      if (fire) {
        while (rec.trail >= 2.6) { rec.trail -= 2.6; this._ember(rec, dx, dy, ux, uy, sp.y); }
        while (rec.smoke >= 10) { rec.smoke -= 10; this._smokeTrail(rec, dx, dy, ux, uy, sp.y); }
      } else {
        while (rec.trail >= 8) { rec.trail -= 8; if (rnd() < 0.75) this._drip(rec, dx, dy, ux, uy, sp.y); }
      }
    }
    rec.lastX = dx; rec.lastY = dy;
  }

  /* ── particles ───────────────────────────────────────────────────────── */
  _part(tex, tint, alpha) {
    if (this._parts.length >= MAX_PARTS) return null;
    let s = this._spare.pop();
    if (!s || s.destroyed) {
      s = new Sprite(tex.tex);
      this.particleLayer.addChild(s);
    } else {
      s.texture = tex.tex;
      s.visible = true;
    }
    s.anchor.set(tex.ax, tex.ay);
    s.scale.set(ART_PX);
    s.tint = tint;
    s.alpha = alpha;
    s.rotation = 0;
    s.blendMode = 'normal';
    const p = { s, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 1, age: 0, life: 1000, kind: '', tint, a0: alpha, bounced: false, grow: 0 };
    this._parts.push(p);
    return p;
  }

  _drip(rec, hx, hy, ux, uy, gy) {
    const P = _atlas.pieces;
    /* off the end of the tail */
    const back = rec.set.R * 1.45 * ART_PX;
    const p = this._part(rnd() < 0.6 ? P.drop2 : P.drop3, rec.look.tint, 1);
    if (!p) return;
    p.kind = 'drop';
    p.x = hx - ux * back + (rnd() - 0.5) * 2;
    p.y = gy;
    p.z = Math.max(0, gy - (hy - uy * back));
    p.vx = -ux * 0.3 + (rnd() - 0.5) * 0.3;
    p.vy = (rnd() - 0.5) * 0.25;
    p.vz = 0.1 + rnd() * 0.4;
    p.g = 0.26;
    p.life = 3000;
  }

  _ember(rec, hx, hy, ux, uy, gy) {
    const P = _atlas.pieces;
    const back = rec.set.Rh * 0.8 * ART_PX, side = rec.set.Rh * 0.9 * ART_PX;
    const p = this._part(rnd() < 0.7 ? P.px1 : P.px2, FIRE_RAMP[0], 1);
    if (!p) return;
    p.kind = 'ember';
    const lat = (rnd() - 0.5) * 2 * side;
    p.x = hx - ux * back - uy * lat;
    p.y = gy;
    p.z = Math.max(0, gy - (hy - uy * back + ux * lat));
    p.vx = -ux * (0.25 + rnd() * 0.45) + (rnd() - 0.5) * 0.3;
    p.vy = (rnd() - 0.5) * 0.2;
    p.vz = 0.25 + rnd() * 0.5;
    p.g = -0.006;
    p.drag = 0.96;
    p.life = 260 + rnd() * 300;
  }

  _smokeTrail(rec, hx, hy, ux, uy, gy) {
    const P = _atlas.pieces;
    const back = (rec.set.Lt * 0.9) * ART_PX;
    const p = this._part(P.smoke, 0x3b3330, 0.24);
    if (!p) return;
    p.kind = 'smoke';
    p.x = hx - ux * back; p.y = gy;
    p.z = Math.max(0, gy - (hy - uy * back));
    p.vx = -ux * 0.15; p.vy = 0; p.vz = 0.3 + rnd() * 0.2;
    p.g = 0; p.drag = 0.97; p.life = 650 + rnd() * 300; p.grow = 1.4;
  }

  _stepParts(dtf, dtms) {
    const list = this._parts;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dtms;
      let dead = p.age >= p.life;
      if (!dead) {
        p.vx *= Math.pow(p.drag, dtf); p.vy *= Math.pow(p.drag, dtf);
        if (p.kind === 'smoke' || p.kind === 'ember') p.vz *= Math.pow(p.drag, dtf);
        p.vz -= p.g * dtf;
        p.x += p.vx * dtf; p.y += p.vy * dtf; p.z += p.vz * dtf;
        if (p.z <= 0 && p.vz < 0) {
          if (p.kind === 'drop') {
            this._mark(_atlas.pieces[rnd() < 0.5 ? 'dot3' : 'dot4'], p.x, p.y, p.tint, 0.95, 0, 700, 500, 0, true);
            dead = true;
          } else if (p.kind === 'ember' && !p.bounced) {
            p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.5; p.vy *= 0.5; p.bounced = true;
          } else {
            p.z = 0; p.vz = 0;
          }
        }
      }
      if (dead) {
        p.s.visible = false;
        this._spare.push(p.s);
        list.splice(i, 1);
        continue;
      }
      const u = p.age / p.life;
      if (p.kind === 'ember') {
        const t = FIRE_RAMP[Math.min(4, (u * 5) | 0)];
        if (p.s.tint !== t) p.s.tint = t;
        p.s.alpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      } else if (p.kind === 'smoke') {
        p.s.alpha = p.a0 * (1 - u);
        p.s.scale.set(ART_PX * (1 + p.grow * u));
      }
      p.s.x = p.x; p.s.y = p.y - p.z;
    }
  }

  /* ── ground marks ────────────────────────────────────────────────────── */
  /* Two lists, so the many small marks (drips landing, ember pixels) can never
     push out the few big ones (a splat, a scorch): a film of two globs landing
     caught 52 drip spots evicting both splats a frame after they formed. */
  _mark(t, x, y, tint, alpha, delay, hold, fade, grow, small) {
    const list = small ? this._dots : this._marks;
    if (list.length >= (small ? MAX_DOTS : MAX_MARKS)) {
      const old = list.shift();
      if (old && old.s && !old.s.destroyed) old.s.destroy();
    }
    const s = new Sprite(t.tex);
    s.anchor.set(t.ax, t.ay);
    s.scale.set(ART_PX);
    s.tint = tint;
    s.alpha = 0;
    s.x = x; s.y = y;
    /* big marks under small ones: a drip spot lands ON a splat, not in it */
    if (small) this.groundLayer.addChild(s); else this.groundLayer.addChildAt(s, Math.min(this.groundLayer.children.length, this._marks.length));
    const m = { s, t0: this._t + (delay || 0), hold, fade, a0: alpha, grow: grow || 0, add: false, ramp: null, x, y, small: !!small };
    list.push(m);
    return m;
  }

  _stepMarks(now) {
    this._stepMarkList(this._marks, now);
    this._stepMarkList(this._dots, now);
  }

  _stepMarkList(list, now) {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const age = now - m.t0;
      if (age < 0) { m.s.alpha = 0; continue; }
      if (age >= m.hold + m.fade || m.s.destroyed) {
        if (!m.s.destroyed) m.s.destroy();
        list.splice(i, 1);
        continue;
      }
      let a = m.a0;
      if (m.grow && age < m.grow) {
        const k = age / m.grow;
        const sc = 0.35 + 0.75 * k - 0.1 * Math.max(0, k - 0.8) * 5;   /* spreads, overshoots a touch, settles */
        m.s.scale.set(ART_PX * sc, ART_PX * sc);
      } else if (m.grow) {
        m.s.scale.set(ART_PX);
      }
      if (m.ramp) {
        const u = Math.min(1, age / (m.hold + m.fade));
        const t = m.ramp[Math.min(4, (u * 5) | 0)];
        if (m.s.tint !== t) m.s.tint = t;
      }
      if (age > m.hold) a *= 1 - (age - m.hold) / m.fade;
      m.s.alpha = a;
    }
  }

  /* ── landings ────────────────────────────────────────────────────────── */
  _burst(frames, x, y, tint, frameMs, layer, blend) {
    if (this._bursts.length >= MAX_BURSTS) {
      const old = this._bursts.shift();
      if (old && old.s && !old.s.destroyed) old.s.destroy();
    }
    const s = new Sprite(frames[0].tex);
    s.anchor.set(frames[0].ax, frames[0].ay);
    s.scale.set(ART_PX);
    s.tint = tint;
    s.x = x; s.y = y;
    if (blend) s.blendMode = blend;
    (layer || this.particleLayer).addChild(s);
    const b = { s, frames, t0: this._t, frameMs, kind: 'frames' };
    this._bursts.push(b);
    return b;
  }

  _flash(x, y, tint, size, ms, alpha, layer, sy) {
    if (this._bursts.length >= MAX_BURSTS) {
      const old = this._bursts.shift();
      if (old && old.s && !old.s.destroyed) old.s.destroy();
    }
    const s = new Sprite(_atlas.glow.tex);
    s.anchor.set(0.5, 0.5);
    s.blendMode = 'add';
    s.tint = tint;
    s.x = x; s.y = y;
    (layer || this.particleLayer).addChild(s);
    const b = { s, t0: this._t, kind: 'flash', size, ms, a0: alpha, sy: sy || 1 };
    this._bursts.push(b);
    return b;
  }

  _stepBursts(now) {
    for (let i = this._bursts.length - 1; i >= 0; i--) {
      const b = this._bursts[i];
      const age = now - b.t0;
      if (b.s.destroyed) { this._bursts.splice(i, 1); continue; }
      if (b.kind === 'frames') {
        const k = Math.floor(age / b.frameMs);
        if (k >= b.frames.length) { b.s.destroy(); this._bursts.splice(i, 1); continue; }
        const fr = b.frames[Math.max(0, k)];
        if (b.s.texture !== fr.tex) { b.s.texture = fr.tex; b.s.anchor.set(fr.ax, fr.ay); }
      } else {
        const u = age / b.ms;
        if (u >= 1) { b.s.destroy(); this._bursts.splice(i, 1); continue; }
        const sc = (b.size * (0.55 + 0.9 * u)) / 48;
        b.s.scale.set(sc, sc * b.sy);
        b.s.alpha = b.a0 * (1 - u) * (1 - u);
      }
    }
  }

  _land(S, e) {
    const look = e.look || this._look(S, e);
    const lift = typeof e.lift === 'number' ? e.lift : 0;
    const x = e.x, gy = e.y, hy = e.y - lift;
    this._impacts++;
    this._lastImpact = { style: look.style, tint: look.tint, x, y: gy, lift, why: e.why || 'land', at: this._t };
    if (look.style === 'fire') {
      const set = nearestSet(_atlas.fire, look.px);
      const headW = set.Rh * 2 * ART_PX;
      this._flash(x, hy, 0xffd27a, headW * 3.4, 140, 0.95);
      this._flash(x, gy, 0xff8a1e, headW * 5, 320, 0.5, this.groundLayer, 0.42);
      this._burst(set.burst, x, hy, 0xffffff, BURST_FRAME_MS);
      for (let i = 0; i < 13; i++) {
        const p = this._part(rnd() < 0.6 ? _atlas.pieces.px1 : _atlas.pieces.px2, FIRE_RAMP[0], 1);
        if (!p) break;
        const a = rnd() * TAU, v = 0.6 + rnd() * 1.6;
        p.kind = 'ember'; p.x = x; p.y = gy; p.z = lift + 2;
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v * DEPTH; p.vz = 1.4 + rnd() * 2;
        p.g = 0.12; p.drag = 0.985; p.life = 480 + rnd() * 420;
      }
      for (let i = 0; i < 3; i++) {
        const p = this._part(_atlas.pieces.smoke, 0x3b3330, 0.3);
        if (!p) break;
        p.kind = 'smoke'; p.x = x + (rnd() - 0.5) * headW; p.y = gy; p.z = lift + 4 + rnd() * 4;
        p.vx = (rnd() - 0.5) * 0.3; p.vy = 0; p.vz = 0.35 + rnd() * 0.3;
        p.drag = 0.97; p.life = 800 + rnd() * 400; p.grow = 1.8;
      }
      this._mark(pick(_atlas.scorch), x, gy, 0xffffff, 0.85, 0, 1900, 900);
      /* cinders left glowing in the burn, cooling through the flame colours */
      for (let i = 0; i < 7; i++) {
        const m = this._mark(rnd() < 0.3 ? _atlas.pieces.px2 : _atlas.pieces.px1,
          x + (rnd() - 0.5) * headW * 1.5, gy + (rnd() - 0.5) * headW * 0.55, FIRE_RAMP[0], 1, 0, 700 + rnd() * 500, 600, 0, true);
        m.ramp = FIRE_RAMP;
      }
      return;
    }
    const set = nearestSet(_atlas.goo, look.px);
    const tint = look.tint;
    this._burst(set.splash, x, hy, tint, SPLASH_FRAME_MS);
    const Rw = set.R * ART_PX;
    const back = (e.ang || 0) + Math.PI;
    for (let i = 0; i < 9; i++) {
      const p = this._part(rnd() < 0.5 ? _atlas.pieces.drop3 : _atlas.pieces.drop2, tint, 1);
      if (!p) break;
      /* a landing sprays all round; a glob that hit something (a rock face,
         you) splashes back the way it came */
      const a = lift > 6 ? back + (rnd() - 0.5) * 2.4 : rnd() * TAU;
      const v = 0.7 + rnd() * 1.5;
      p.kind = 'drop'; p.x = x; p.y = gy; p.z = lift + 2;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v * DEPTH; p.vz = 1.1 + rnd() * 1.7;
      p.g = 0.24; p.life = 3000;
    }
    /* the splat forms when the goo reaches the ground */
    const fall = lift > 3 ? Math.sqrt((2 * lift) / 0.24) * 16.7 : 0;
    this._mark(pick(set.puddles), x, gy, tint, 1, fall, 2300, 800, 150);
    void Rw;
  }

  /* ── the frame ───────────────────────────────────────────────────────── */
  /** Every frame, flying or not: landings from the simulator's queue, and
   *  everything already thrown, dripped, splashed or burning. */
  tick(S, now) {
    let dtms = this._lastNow ? clamp(now - this._lastNow, 0, 100) : 16.7;
    this._lastNow = now;
    const rate = (typeof window !== 'undefined' && typeof window.__btShotFxRate === 'number') ? clamp(window.__btShotFxRate, 0, 4) : 1;
    dtms *= rate;
    this._t += dtms;
    now = this._t;
    const zone = S && S.currentZone;
    if (zone !== this._zone) {
      this._zone = zone;
      this.clear();
    }
    const q = S && S._shotImpacts;
    if (q && q.length) {
      if (_atlas) {
        for (let i = 0; i < q.length && i < MAX_QUEUE; i++) {
          const e = q[i];
          /* a ball that landed as you left the zone does not land in the next one */
          if (e && e.zone === zone) {
            try { this._land(S, e); } catch (err) { if (typeof window !== 'undefined') window.__btShotFxErr = String((err && err.stack) || err); }
          }
        }
      }
      q.length = 0;
    }
    if (!_atlas) return;
    this._stepParts(dtms / 16.7, dtms);
    this._stepMarks(now);
    this._stepBursts(now);
  }

  clear() {
    for (const [sp, rec] of this._shots) this._dropShot(sp, rec);
    for (const p of this._parts) { if (p.s && !p.s.destroyed) { p.s.visible = false; this._spare.push(p.s); } }
    this._parts.length = 0;
    for (const m of this._marks) if (m.s && !m.s.destroyed) m.s.destroy();
    this._marks.length = 0;
    for (const m of this._dots) if (m.s && !m.s.destroyed) m.s.destroy();
    this._dots.length = 0;
    for (const b of this._bursts) if (b.s && !b.s.destroyed) b.s.destroy();
    this._bursts.length = 0;
  }

  /** What the old __btSlimeProj probe reports, for the balls drawn here. */
  probeShots() {
    const out = [];
    for (const rec of this._shots.values()) {
      const fire = rec.look.style === 'fire';
      out.push({
        kind: rec.sp.kind || 'slime', style: rec.look.style,
        px: +(((fire ? rec.set.Rh : rec.set.R) * 2 * ART_PX)).toFixed(1),
        scale: ART_PX, srcPx: null, visible: !!rec.body.visible,
        x: +rec.cont.x.toFixed(1), y: +(rec.cont.y - rec.lift).toFixed(1),
        ownerId: rec.sp.ownerId || null, tint: rec.look.tint,
      });
    }
    return out;
  }

  probe() {
    const counts = { drop: 0, ember: 0, smoke: 0 };
    for (const p of this._parts) counts[p.kind] = (counts[p.kind] || 0) + 1;
    const layerOf = (s) => (s && s.parent ? (s.parent === this.particleLayer ? 'particles' : s.parent === this.groundLayer ? 'ground' : s.parent === this.entityLayer ? 'entities' : (s.parent.label || 'other')) : null);
    return {
      ready: !!_atlas,
      atlasBytes: _atlas ? _atlas.bytes : 0,
      shots: [...this._shots.values()].map((rec) => ({
        ownerId: rec.sp.ownerId || null, arch: rec.look.arch, style: rec.look.style, tint: rec.look.tint,
        px: +(((rec.look.style === 'fire' ? rec.set.Rh : rec.set.R) * 2 * ART_PX)).toFixed(1),
        gx: +rec.cont.x.toFixed(1), gy: +rec.cont.y.toFixed(1), lift: +rec.lift.toFixed(1),
        dir: rec.dir, frame: rec.frame ? rec.set.frames[rec.dir].indexOf(rec.frame) : -1,
        layer: layerOf(rec.cont), bodyTint: rec.body.tint, nearest: rec.body.texture.source.scaleMode,
        ground: { layer: layerOf(rec.ground), alpha: +rec.ground.alpha.toFixed(3) },
        glow: !!rec.glow, shine: !!rec.shine,
      })),
      parts: counts,
      partTints: this._parts.slice(0, 40).map((p) => ({ kind: p.kind, tint: p.s.tint, layer: layerOf(p.s) })),
      marks: this._marks.map((m) => ({ tint: m.s.tint, alpha: +m.s.alpha.toFixed(3), layer: layerOf(m.s), x: +m.x.toFixed(1), y: +m.y.toFixed(1) })),
      dots: this._dots.length,
      bursts: this._bursts.map((b) => ({ kind: b.kind, layer: layerOf(b.s), tint: b.s.tint, blend: b.s.blendMode })),
      impacts: this._impacts,
      lastImpact: this._lastImpact,
    };
  }
}
