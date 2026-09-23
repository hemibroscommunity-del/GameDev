/* ═══ v2.3.2703: YOU CRUMBLE, AND THEN YOUR BONES FALL ═══
 *
 * Owner: "I also wonder if you can make a better death animation (the
 * character turning into a crumbling skeleton) with simple physics after
 * turning into a pile of bones."
 *
 * What it replaces: death-v1.png, a 21-frame strip of ONE bald base body
 * bursting into a skeleton that sits down.  Whatever you were wearing --
 * hair, armour, a cape, a monkey's fur -- the corpse was that stranger.
 * And it had no weight: the pile it ends on is painted, not fallen.
 *
 * THREE BEATS:
 *   1. YOU crumble.  The body is photographed as it stood on its last living
 *      frame (renderer.generateTexture of the player's own display, so every
 *      worn layer is in it) and cut into flakes.  The flakes let go from the
 *      crown down, drop, and the breeze takes them (timeOfDay.windAt -- the
 *      same wind the dust and motes blow on).
 *   2. The skeleton is what they uncover: thirteen bones, each its own
 *      sprite, standing in your place.
 *   3. It falls.  Knees first, skull last.  Every bone is a small body with
 *      gravity, a bounce, spin, and ground friction; long bones tip over to
 *      lie flat, the skull rolls.  Each impact kicks a little dust.  Where
 *      they come to rest is decided by the physics, not by a frame -- no two
 *      deaths leave the same pile.
 *
 * The pixel-art bones are minted in worldFxTextures.js in the death sheet's
 * own palette.  If anything here is unavailable (no renderer, no bone art)
 * `corpse()` returns null and entityRenderer plays death-v1.png exactly as
 * before -- the old strip stays loaded as the fallback, not deleted.
 *
 * WHERE IT LIVES: a child container of the player's own display, so it
 * inherits the display's position, zone scale and depth sort for free, and
 * is listed in the corpse's keep-set so the hide-everything-else pass
 * (entityRenderer _hideExceptDeep) leaves it on screen.  Removed on the first
 * frame nobody asks for it (sweep) -- which is the respawn.
 */
import { Container, Sprite, Rectangle, Texture, Point } from 'pixi.js';
import { fxTex, BONE_ART } from './worldFxTextures.js';
import { windAt } from '@/game/timeOfDay.js';

/* The standing skeleton, in art pixels, feet at (0,0), +y down.  52 art px
   tall; scaled to the body it replaces. */
const POSE = [
  /* key,   art,     x,     y,    rot,  delay (ms after the collapse starts) */
  ['shinL',  'shin',  -3,   -5.5,  0,    0],
  ['shinR',  'shin',   3,   -5.5,  0,    10],
  ['femL',   'femur', -3,  -18,    0,    40],
  ['femR',   'femur',  3,  -18,    0,    55],
  ['pelvis', 'pelvis', 0,  -27,    0,    90],
  ['handL',  'hand',  -9.5,-18,    0,    60],
  ['handR',  'hand',   9.5,-18,    0,    70],
  ['forL',   'arm',   -9,  -25,    0.12, 80],
  ['forR',   'arm',    9,  -25,   -0.12, 95],
  ['armL',   'arm',   -8,  -35,    0.18, 120],
  ['armR',   'arm',    8,  -35,   -0.18, 130],
  ['ribs',   'ribs',   0,  -35,    0,    150],
  ['skull',  'skull',  0,  -46.5,  0,    260],
];
const SKELETON_H = 52;

const CRUMBLE_AT = 90;      /* the first flakes let go */
const CRUMBLE_SPAN = 700;   /* crown to heel */
const REVEAL_SPAN = 420;    /* the skeleton fades up under them */
const COLLAPSE_AT = 980;    /* the bones let go */
const FLAKE = 4;            /* flake size, display px */
const MAX_FLAKES = 150;
const G_BONE = 900, G_FLAKE = 340;
const ASH = [0x7c, 0x6a, 0x5c];

/* ═══ v2.3.2705: OR YOU EXPLODE ═══
   Owner: "I think it would be comical if when the character died he was
   exploded bones across the screen with maybe a screen shake effect.  Just
   making it absurd and dramatic.  I'm not totally sure though so show me both
   ways."
   So both ship, behind one switch, until the owner picks:
     crumble  -- the flesh flakes away, the skeleton stands, then folds
     explode  -- the body swells for a beat, then BOOM: flesh, every bone and a
                 handful of spares fly across the screen, spinning, bouncing
                 and skidding; the screen kicks, and kicks again as the big
                 pieces land.
   Chosen by `?death=explode` in the URL or window.__btDeathStyle; crumble is
   the default.  Same bones, same physics, same pile at the end -- only the
   launch differs, so either can become the only one by changing a default. */
export function deathStyle() {
  if (typeof window === 'undefined') return 'crumble';
  if (window.__btDeathStyle === 'explode' || window.__btDeathStyle === 'crumble') return window.__btDeathStyle;
  if (deathStyle._url === undefined) {
    deathStyle._url = null;
    try { const m = /[?&]death=(explode|crumble)\b/.exec(window.location.search); if (m) deathStyle._url = m[1]; } catch (e) { /* no location */ }
  }
  return deathStyle._url || 'crumble';
}
const BOOM_AT = 170;        /* explode: the swell before the bang */
const SPARES = ['arm', 'shin', 'femur', 'hand', 'arm', 'ribs', 'hand', 'shin', 'femur', 'arm', 'hand', 'shin'];
let _shake = 0;             /* screen kick owed to the local camera, taken by entityRenderer */

const rand = (a, b) => a + Math.random() * (b - a);
const lerpTint = (t) => {
  const k = Math.max(0, Math.min(1, t));
  const c = (i) => Math.round(255 + (ASH[i] - 255) * k);
  return (c(0) << 16) | (c(1) << 8) | c(2);
};

class DeathCrumble {
  constructor() {
    this._renderer = null;
    this._c = new Map();
  }

  setRenderer(r) { this._renderer = r; }

  count() { return this._c.size; }

  /** The screen kick an exploding corpse owes the camera since last asked
   *  (entityRenderer adds it to S.screenShake).  Zero for a crumble. */
  takeShake() { const v = _shake; _shake = 0; return v; }

  /** Draw (or keep drawing) the corpse for `key` in `display`.  Returns the
   *  container to keep visible, or null when the fallback strip should play. */
  corpse(key, display, startTs, now) {
    if (!display || !fxTex('bone_skull')) return null;
    now = now || Date.now();
    let c = this._c.get(key);
    if (c && (c.start !== startTs || c.display !== display || c.root.destroyed)) { this._dispose(c); this._c.delete(key); c = null; }
    if (!c) {
      c = this._create(display, startTs, now, key);
      if (!c) return null;
      this._c.set(key, c);
    }
    c.touched = now;
    this._step(c, now);
    return c.root;
  }

  /** Called once a frame after every corpse() call: a corpse nobody asked
   *  for this frame has respawned. */
  sweep(now) {
    for (const [k, c] of this._c) {
      if (now - c.touched > 250 || c.root.destroyed) { this._dispose(c); this._c.delete(k); }
    }
  }

  /* ── setup ── */
  _bodyBox(display) {
    /* the living body's own rectangle, in display space -- the flakes are cut
       from it and the skeleton stands in it */
    const sb = display._spriteBody;
    try {
      if (sb && sb.texture && sb.texture !== Texture.EMPTY) {
        const b = sb.getBounds();
        const p0 = display.toLocal(new Point(b.minX, b.minY));
        const p1 = display.toLocal(new Point(b.maxX, b.maxY));
        const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y);
        const w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
        if (w > 8 && h > 8 && w < 400 && h < 400) return { x, y, w, h };
      }
    } catch (e) { /* fall through */ }
    return { x: -24, y: -60, w: 48, h: 60 };
  }

  _create(display, startTs, now, key) {
    const style = deathStyle();
    const box = this._bodyBox(display);
    const root = new Container();
    root.label = 'death-crumble';
    const bonesC = new Container();
    bonesC.sortableChildren = true;
    bonesC.alpha = 0;
    root.addChild(bonesC);
    const flakesC = new Container();
    root.addChild(flakesC);
    const fx = new Container();
    root.addChild(fx);

    /* 1. photograph the living body BEFORE anything is hidden -- this runs on
       the first dead frame, ahead of the corpse's hide pass */
    let shot = null;
    const flakes = [];
    if (this._renderer) {
      const ui = display._uiLayer;
      const uiVis = ui ? ui.visible : false;
      if (ui) ui.visible = false;
      try {
        shot = this._renderer.generateTexture({
          target: display,
          frame: new Rectangle(box.x, box.y, box.w, box.h),
          resolution: 2,
        });
      } catch (e) { shot = null; }
      if (shot) { try { shot.source.label = 'death-flake'; } catch (e) { /* unnamed is fine */ } }
      if (ui) ui.visible = uiVis;
    }
    /* ═══ MEASURE THE BODY, NOT ITS FRAME ═══
       The sprite's rectangle is its FRAME, and the frame is mostly air: the
       first cut sized the skeleton off it and stood a 1.8x skeleton with its
       feet below the real ones, and cut half its flakes from empty space.
       So the photograph is read back once (a ~100x200 readback, one frame,
       on death) and the body is found where its pixels actually are: the
       opaque rows and columns give the feet line and the height, and a flake
       is only cut where there is something to flake. */
    let opaque = null, cov = null, covW = 0, covH = 0, res = 1;
    if (shot && this._renderer.extract) {
      try {
        const px = this._renderer.extract.pixels(shot);
        const W = px.width, Hh = px.height, data = px.pixels;
        res = W / Math.max(1, box.w);
        let x0 = W, y0 = Hh, x1 = -1, y1 = -1;
        for (let y = 0; y < Hh; y++) {
          for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] > 40) {
              if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        if (x1 >= x0 && y1 >= y0) {
          opaque = { x: box.x + x0 / res, y: box.y + y0 / res, w: (x1 - x0 + 1) / res, h: (y1 - y0 + 1) / res };
          cov = data; covW = W; covH = Hh;
        }
      } catch (e) { opaque = null; }
    }
    const body = opaque || { x: box.x + box.w * 0.25, y: box.y + box.h * 0.2, w: box.w * 0.5, h: box.h * 0.73 };
    const feetY = body.y + body.h - 1;
    const cxm = body.x + body.w / 2;
    /* is there anything in this cell of the photograph? */
    const filled = (lx, ly, lw, lh) => {
      if (!cov) return true;
      const X0 = Math.max(0, Math.floor((lx - box.x) * res)), Y0 = Math.max(0, Math.floor((ly - box.y) * res));
      const X1 = Math.min(covW - 1, Math.ceil((lx + lw - box.x) * res)), Y1 = Math.min(covH, Math.ceil((ly + lh - box.y) * res));
      let n = 0;
      for (let y = Y0; y < Y1; y += 1) {
        for (let x = X0; x <= X1; x += 1) {
          const a = cov[(y * covW + x) * 4 + 3];
          if (a > 40 && ++n > 2) return true;
        }
      }
      return false;
    };

    if (shot) {
      let size = FLAKE;
      while (Math.ceil(body.w / size) * Math.ceil(body.h / size) > MAX_FLAKES) size += 1;
      const tw = shot.width, th = shot.height;
      for (let j = 0; j * size < box.h; j++) {
        for (let i = 0; i * size < box.w; i++) {
          const fw = Math.min(size, tw - i * size), fh = Math.min(size, th - j * size);
          if (fw <= 0 || fh <= 0) continue;
          if (!filled(box.x + i * size, box.y + j * size, fw, fh)) continue;
          const t = new Texture({ source: shot.source, frame: new Rectangle(i * size, j * size, fw, fh) });
          const s = new Sprite(t);
          s.anchor.set(0.5);
          s.label = 'death-flake';
          const sx = box.x + i * size + fw / 2, sy = box.y + j * size + fh / 2;
          s.x = sx; s.y = sy;
          flakesC.addChild(s);
          const gy = feetY + rand(-3, 4);
          flakes.push({
            s, t, x0: sx, y0: sy,
            /* crown first: the top row lets go at CRUMBLE_AT, the feet last */
            delay: CRUMBLE_AT + Math.max(0, (sy - body.y) / body.h) * CRUMBLE_SPAN + rand(0, 90),
            gx: sx, gy, z: gy - sy, vx: 0, vy: 0, vz: 0, landed: 0, spin: rand(-8, 8), free: false,
          });
        }
      }
    }

    /* 2. the skeleton, scaled to the body it replaces */
    const k = Math.max(0.6, Math.min(1.6, (body.h * 0.95) / SKELETON_H));
    const bones = [];
    for (let i = 0; i < POSE.length; i++) {
      const [key, art, ax, ay, rot, delay] = POSE[i];
      const tex = fxTex('bone_' + art);
      if (!tex) continue;
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(k * (style === 'explode' ? 1.25 : 1));
      /* the left arm is the right arm mirrored */
      if (key.endsWith('L') && (art === 'arm' || art === 'hand')) s.scale.x = -s.scale.y;
      bonesC.addChild(s);
      const rows = BONE_ART[art];
      const w = rows[0].length * k, h = rows.length * k;
      const long = h > w * 1.6;
      bones.push({
        key, s, long, skull: key === 'skull',
        r: (long ? w : Math.min(w, h)) / 2 * 0.9,
        gx: cxm + ax * k, gy: 0, z: -ay * k, rot,
        vx: 0, vy: 0, vz: 0, vrot: 0,
        delay: COLLAPSE_AT + delay, free: false, rest: false, order: i,
      });
    }

    /* explode: a handful of spare bones -- nobody counts them mid-air, and
       thirteen is not "bones across the screen" */
    if (style === 'explode') {
      for (let i = 0; i < SPARES.length; i++) {
        const art = SPARES[i];
        const tex = fxTex('bone_' + art);
        if (!tex) continue;
        const sp = new Sprite(tex);
        sp.anchor.set(0.5); sp.scale.set(k * rand(1.0, 1.3));
        bonesC.addChild(sp);
        const rows = BONE_ART[art];
        const w = rows[0].length * k, h = rows.length * k;
        const long = h > w * 1.6;
        bones.push({
          key: 'spare' + i, s: sp, long, skull: false, spare: true,
          r: (long ? w : Math.min(w, h)) / 2 * 0.9,
          gx: cxm + rand(-6, 6) * k, gy: 0, z: rand(14, 40) * k, rot: rand(0, Math.PI * 2),
          vx: 0, vy: 0, vz: 0, vrot: 0, delay: BOOM_AT, free: false, rest: false, order: POSE.length + i,
        });
      }
    }
    display.addChild(root);
    /* named on the display like every other layer, so a probe that lists a
       corpse's children by field (mp-deathshield) can name this one too */
    display._deathCrumble = root;
    const gxs = bones.map((b) => b.gx);
    const spread0 = gxs.length ? Math.max(...gxs) - Math.min(...gxs) : 0;
    const height0 = bones.length ? Math.max(...bones.map((b) => b.z)) : 0;
    const c = { display, root, bonesC, flakesC, fx, shot, flakes, bones, feetY, cxm, spread0, height0, style, key, midY: feetY - body.h * 0.5, start: startTs || now, last: now, touched: now, puffs: [], landedN: 0 };
    /* Arriving at a death already over (you walked up to a corpse, or the tab
       woke): skip to the pile rather than replaying the fall for a stranger. */
    const age = now - c.start;
    if (age > COLLAPSE_AT + 2200) {
      for (const f of flakes) { f.s.visible = false; }
      bonesC.alpha = 1;
      let t = c.start + COLLAPSE_AT;
      while (t < now && t < c.start + COLLAPSE_AT + 4000) { t += 16; this._stepBones(c, t, 0.016, true); }
      c.last = now;
    }
    return c;
  }

  /* ── per frame ── */
  _step(c, wallNow) {
    /* QA slow motion (window.__btDeathSlow = 8): screenshots in the headless
       harness take ~2s each, so the fall is photographed in slow time or not
       at all.  The corpse keeps its own clock (c.clock) so the factor can
       change mid-death without a jump. */
    const slow = (typeof window !== 'undefined' && window.__btDeathSlow > 1) ? window.__btDeathSlow : 1;
    const wdt = Math.max(0, wallNow - (c.wall || wallNow));
    c.wall = wallNow;
    c.clock = (c.clock == null ? wallNow : c.clock + wdt / slow);
    const now = c.clock;
    const dt = Math.min(0.05, Math.max(0, (now - c.last) / 1000));
    c.last = now;
    const t = now - c.start;
    if (c.style === 'explode') {
      /* nothing to reveal: the skeleton is never seen standing, only flying */
      c.bonesC.alpha = t >= BOOM_AT ? 1 : 0;
      if (!c.boomed && t >= BOOM_AT) {
        c.boomed = true;
        _shake = Math.max(_shake, c.key === 'self' ? 26 : 9);
        for (let i = 0; i < 6; i++) this._puff(c, c.cxm + rand(-6, 6), rand(-4, 4), 420, rand(-1, 1) * 160, rand(-1, 1) * 90);
      }
    } else {
      c.bonesC.alpha = Math.max(0, Math.min(1, (t - CRUMBLE_AT - 60) / REVEAL_SPAN));
      if (!c.flakes.length) c.bonesC.alpha = Math.max(c.bonesC.alpha, t > 60 ? 1 : 0);
    }
    this._stepFlakes(c, now, t, dt);
    this._stepBones(c, now, dt, false);
    this._stepPuffs(c, now, dt);
  }

  _stepFlakes(c, now, t, dt) {
    const wind = windAt(now);
    for (let i = 0; i < c.flakes.length; i++) {
      const f = c.flakes[i];
      if (!f.s.visible) continue;
      if (!f.free) {
        if (c.style === 'explode') {
          if (t < BOOM_AT) {
            /* the swell: the whole body strains outward and shivers */
            const sw = Math.pow(t / BOOM_AT, 2) * 0.16;
            f.s.x = f.x0 + (f.x0 - c.cxm) * sw + rand(-0.8, 0.8) * sw * 8;
            f.s.y = f.y0 + (f.y0 - c.midY) * sw + rand(-0.8, 0.8) * sw * 8;
            continue;
          }
          f.free = true;
          const a = Math.atan2(f.y0 - c.midY, f.x0 - c.cxm) + rand(-0.5, 0.5);
          const sp = rand(80, 300);
          f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp * 0.5;
          f.vz = rand(120, 460);
          f.spin = rand(-20, 20);
        } else {
          if (t < f.delay) continue;
          f.free = true;
          f.vx = wind.x * 0.9 + rand(-28, 28);
          f.vy = rand(-10, 10);
          f.vz = rand(-6, 38);
        }
      }
      if (!f.landed) {
        f.vz -= (c.style === 'explode' ? G_BONE : G_FLAKE) * dt;
        f.gx += f.vx * dt; f.gy += f.vy * dt; f.z += f.vz * dt;
        if (f.z <= 0) { f.z = 0; f.landed = now; }
      } else {
        /* on the ground the breeze has it: it slides away, shrinks, is gone */
        f.gx += wind.x * 1.1 * dt; f.gy += wind.y * 1.1 * dt;
      }
      f.s.x = f.gx; f.s.y = f.gy - f.z;
      f.s.rotation += f.spin * dt * (f.landed ? 0.2 : 1);
      const since = t - (c.style === 'explode' ? BOOM_AT : f.delay);
      f.s.tint = lerpTint(since / 500);
      if (f.landed) {
        const g = (now - f.landed) / 520;
        if (g >= 1) { f.s.visible = false; continue; }
        f.s.alpha = 1 - g;
        f.s.scale.set(1 - g * 0.5);
      }
    }
  }

  _stepBones(c, now, dt, silent) {
    const t = now - c.start;
    const wind = windAt(now);
    for (let i = 0; i < c.bones.length; i++) {
      const b = c.bones[i];
      if (!b.free && c.style === 'explode' && t >= BOOM_AT) {
        b.free = true;
        /* BOOM: out from the middle of the body, hard, spinning; the skull
           goes furthest because of course it does */
        const a = (Math.abs(b.gx - c.cxm) > 1 ? Math.atan2(rand(-1, 1), b.gx - c.cxm) : rand(0, Math.PI * 2)) + rand(-0.9, 0.9);
        /* HIGH, not far: the first cut threw them 1,400px -- three screens --
           and the joke landed off camera.  Big arcs keep them in the air long
           enough to read and bring them down on screen. */
        const sp = b.skull ? rand(120, 190) : rand(45, 170);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp * 0.55;
        b.vz = b.skull ? rand(520, 640) : rand(300, 560);
        b.vrot = rand(-24, 24);
      } else if (!b.free && c.style !== 'explode' && t >= b.delay) {
        b.free = true;
        /* the legs fold out, the rest drops onto them; a breath of the
           breeze in it so the pile leans the way the dust blew */
        /* outward from the spine: a skeleton folds out over its own feet,
           it does not drop straight down its own length */
        const out = b.gx - (c.cxm != null ? c.cxm : b.gx);
        b.vx = rand(-36, 36) + Math.sign(out) * rand(12, 40) + wind.x * 0.6;
        b.vy = rand(-22, 22);
        b.vz = rand(-10, 40);
        b.vrot = rand(-6, 6);
        if (b.skull) { b.vx = rand(-60, 60); b.vz = rand(20, 70); }
      }
      if (b.free && !b.rest) {
        b.vz -= G_BONE * dt;
        b.gx += b.vx * dt; b.gy += b.vy * dt; b.z += b.vz * dt;
        b.rot += b.vrot * dt;
        if (b.z <= b.r) {
          b.z = b.r;
          if (b.vz < -70) {
            /* a bounce: most of the energy goes into the ground */
            const impact = -b.vz;
            b.vz = impact * (b.skull ? 0.42 : 0.3);
            const keep = c.style === 'explode' ? 0.42 : 0.7;
            b.vx *= keep; b.vy *= keep;
            b.vrot = b.vrot * 0.6 + rand(-3, 3);
            if (!silent && impact > 140) this._puff(c, b.gx, b.gy, impact);
            /* explode: every big piece that lands kicks the camera again --
               a little, and not more than every 90ms, so it rumbles rather
               than blurs */
            if (!silent && c.style === 'explode' && impact > 300 && c.key === 'self'
                && now - (c.lastKick || 0) > 90) {
              c.lastKick = now;
              _shake = Math.max(_shake, b.skull ? 9 : 5);
            }
            if (!b.landedAt) { b.landedAt = now; b.landOrder = ++c.landedN; }
          } else {
            b.vz = 0;
            /* friction; the skull rolls rather than slides */
            /* exploded bones skid, then GRIP -- without it they slid off the
               edge of the screen after landing, which is where the first
               cut's pile ended up */
            const f = Math.min(1, (b.skull ? 2.2 : 6) * (c.style === 'explode' ? 1.8 : 1) * dt);
            b.vx -= b.vx * f; b.vy -= b.vy * f;
            if (b.skull) b.vrot = b.vx / Math.max(2, b.r);   /* rolls */
            else b.vrot -= b.vrot * Math.min(1, 7 * dt);
            /* a long bone lies down along its length */
            if (b.long) {
              const target = Math.round((b.rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
              b.rot += (target - b.rot) * Math.min(1, 5 * dt);
            }
            if (Math.abs(b.vx) + Math.abs(b.vy) < 1.5 && Math.abs(b.vrot) < 0.08) b.rest = true;
            if (!b.landedAt) { b.landedAt = now; b.landOrder = ++c.landedN; }
          }
        }
      }
      b.s.x = b.gx;
      b.s.y = c.feetY + b.gy - b.z;
      b.s.rotation = b.rot;
      /* nearer the camera draws in front; among bones on the same line, the
         one that landed later lies on top */
      b.s.zIndex = Math.round((b.gy + (b.free ? 0 : 50)) * 10) + (b.landOrder || 0);
    }
  }

  _puff(c, x, gy, impact, vx, vy) {
    const tex = fxTex('puff');
    if (!tex || c.puffs.length > 18) return;
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.tint = 0xcbbd9c;
    s.x = x; s.y = c.feetY + gy;
    c.fx.addChild(s);
    c.puffs.push({ s, ts: c.last, k: Math.min(1, impact / 400), vx: vx || 0, vy: vy || 0 });
  }

  _stepPuffs(c, now, dt) {
    const wind = windAt(now);
    for (let i = 0; i < c.puffs.length; i++) {
      const p = c.puffs[i];
      if (!p.s.visible) continue;
      const g = (now - p.ts) / 600;
      if (g >= 1) { p.s.visible = false; continue; }
      p.s.x += (wind.x + p.vx * (1 - g)) * dt; p.s.y += (wind.y - 8 + p.vy * (1 - g)) * dt;
      p.s.scale.set((0.25 + g * 0.45) * (0.6 + p.k));
      p.s.alpha = 0.4 * (1 - g);
    }
  }

  _dispose(c) {
    if (c.display && c.display._deathCrumble === c.root) c.display._deathCrumble = null;
    try { if (!c.root.destroyed) c.root.destroy({ children: true }); } catch (e) { /* gone */ }
    for (const f of c.flakes) { try { f.t.destroy(false); } catch (e) { /* gone */ } }
    if (c.shot) { try { c.shot.destroy(true); } catch (e) { /* gone */ } }
  }
}

export const deathCrumble = new DeathCrumble();

if (typeof window !== 'undefined') {
  window.__btDeathCrumble = () => {
    const out = [];
    for (const [k, c] of deathCrumble._c) {
      out.push({
        key: k,
        flakes: c.flakes.length,
        flakesLeft: c.flakes.filter((f) => f.s.visible).length,
        bones: c.bones.length,
        free: c.bones.filter((b) => b.free).length,
        resting: c.bones.filter((b) => b.rest).length,
        skeletonAlpha: +c.bonesC.alpha.toFixed(2),
        /* where the bones ended up, relative to the feet: a pile has spread
           and fallen; a standing skeleton has neither */
        maxZ: +Math.max(0, ...c.bones.map((b) => b.z)).toFixed(1),
        spread: +(Math.max(...c.bones.map((b) => b.gx)) - Math.min(...c.bones.map((b) => b.gx))).toFixed(1),
        standingSpread: +c.spread0.toFixed(1),
        standingZ: +c.height0.toFixed(1),
        feetY: +c.feetY.toFixed(1),
        style: c.style,
        boomed: !!c.boomed,
        shot: !!c.shot,
      });
    }
    return out;
  };
}
