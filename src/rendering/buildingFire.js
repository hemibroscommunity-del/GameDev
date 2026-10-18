/* ═══ v2.3.3230: A BUILDING YOU KEEP HITTING CATCHES FIRE ═══
 *
 * Owner, 2026-10-14: "When attacking buildings add flame effects on the
 * building after getting hit a while in the location where the building is
 * getting struck and make the flames grow higher the closer it gets to falling
 * apart. Keep the flames going as the building in pieces."
 *
 * On your screen only, like the hits it follows (src/game/wheelBreak.js: the
 * worker knows nothing of the Wheel's objects).  Only BroTown's buildings burn.
 *
 *   WHERE    every hit lands at a point on the building's picture (the
 *            arrow's, the bolt's, the blade's -- wheelBreak's `hit` event);
 *            hits within MERGE_R of each other are one SPOT, up to MAX_SPOTS
 *            a building, the next hits joining the nearest.
 *   WHEN     it SMOULDERS -- thin smoke from its spots -- from SMOULDER of the
 *            way to breaking, and its spots CATCH at IGNITE: the 6th of a
 *            building's 24 hits, the 8th of the Town Hall's 30.
 *   HOW BIG  the nearer it is to falling apart, the higher.  A spot's fire is
 *            a cluster of the campfire's own pixel flames (campfireArt.js),
 *            more of them, taller and climbing the wall as the damage grows:
 *            one flame ~30 px tall when it catches, seven flames reaching
 *            ~140 px up the wall at the last hit.  The spot hit most burns
 *            hottest.  Sparks and smoke with it, darker as it grows, its light
 *            on the wall, and the building darkening with soot.
 *   COOLING  left alone, its fires sink from COOL_START and are out when the
 *            count is forgotten (wheelBreak HEAL_MS, its 'heal' event).
 *   THE FALL at the break the fire flares, the pieces nearest each spot -- and
 *            the biggest -- fall burning (wheelShatter.js), charred, and burn
 *            on where they lie, the blaze settling from the collapse's flare to
 *            a steady fire, until the mending: they go out as the heap fades.
 *
 * Nothing new to load or make: the flames, sparks, smoke and glow are the
 * campfire's atlas, minted with the renderer (campfireFx.js) -- the preloading
 * law kept, and no memory.  Sprites are pooled per fire, drawn (and its sparks
 * and smoke moved) only while the building is near the screen, and destroyed
 * with it; leaving the Wheel takes them all (WheelObjects.destroy).
 *
 * DEPTH: a fire rides what it burns on, as a building's moving pieces ride it
 * (worldLife.js): in its layer, on its ground line, a quarter step after it
 * (depthSort.applyGroundSort `_ridesOn`) -- so a fire on the building's face
 * is over the building and under you standing in front of it, and a burning
 * piece of rubble sorts where that piece lies.
 *
 * `?nobuildingfire` turns it off.  QA: window.__btBuildingFire.
 */
import { Container, Sprite } from 'pixi.js';
import { campfireAtlas, CAMPFIRE_PIX, CAMPFIRE_FLAME_MS } from './campfireFx.js';
import * as ART from './campfireArt.js';
import { HEAL_MS } from '../game/wheelBreak.js';
import { cueAt } from '../game/eventSounds.js'; /* v2.3.3343: a building heard catching */

const qs = (() => { try { return new URLSearchParams(window.location.search); } catch (e) { return null; } })();
/** Does this page draw buildings burning?  (`?nobuildingfire`: no) */
export function buildingFireOn() { return !(qs && qs.has('nobuildingfire')); }

const PIX = CAMPFIRE_PIX;            /* world px per flame art px: the campfire's own grid */
const FLAME_MS = CAMPFIRE_FLAME_MS;
const SMOULDER = 0.12;               /* of the way to breaking: it smokes */
const IGNITE = 0.25;                 /* ...and its spots catch */
const MERGE_R = 40;                  /* world px: a hit this near a spot is that spot's */
const MAX_SPOTS = 5;
const H0 = 28, H1 = 124;             /* a spot's tallest flame, world px, as it catches and at the break */
const SPREAD0 = 8, SPREAD1 = 60;     /* ...and how far its flames reach round it */
const U_MIN = 0.8 * PIX, U_MAX = 1.8 * PIX;   /* how big a flame's art px may be drawn */
const COOL_START = Math.min(12000, HEAL_MS * 0.4);   /* ms without a hit before it sinks (out at HEAL_MS) */
const SOOT = 0.16;                   /* the building this much darker at the break */
const RUBBLE_FIRES = 9;              /* pieces that fall burning */
const SETTLE_MS = 14000;             /* the rubble's blaze settling from the flare... */
const RUBBLE_LOW = 0.32, RUBBLE_HIGH = 0.68;   /* ...to a steady heat in this range, each its own */
const OUT_MS = 900;                  /* going out */
const GONE_MS = 4200;                /* ...and gone, its last smoke with it, at most this long after */
const EMBER_CAP = 64, SMOKE_CAP = 60;          /* a building's face */
const R_EMBER_CAP = 10, R_SMOKE_CAP = 8;       /* each burning piece */
const VIEW_PAD = 160;                /* world px round the view a fire is drawn in */

const rnd = Math.random;
const gauss = () => (rnd() + rnd() + rnd() - 1.5);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* One sky: every fire's smoke leans the same way, the wind turning slowly. */
const WIND_SIGN = rnd() < 0.5 ? -1 : 1;
const windAt = (now) => WIND_SIGN * (9 + 7 * Math.sin(now / 5300));

/* The campfire's flame at size `si` is this many art px tall: its main tongue
   (17.5 art px at size 1, campfireArt TONGUES) and the licks off its tip. */
const artH = (si) => 17.5 * ART.FLAME_SIZES[si] + 3;
/* the size and the scale that draw a flame H world px tall */
function flameFor(H) {
  let si = 0;
  for (let k = ART.FLAME_SIZES.length - 1; k >= 0; k--) if (artH(k) * PIX <= H * 1.04) { si = k; break; }
  return { si, u: Math.max(U_MIN, Math.min(U_MAX, H / artH(si))) };
}

/* A spot's flames, laid out once.  Each row: from what heat it is there (`a`),
   where it stands -- across and UP, shares of the spread, both a range -- and
   how tall (a share of the tallest).  The first five spread along where it was
   struck; the rest CLIMB the wall above it as the damage grows, smaller the
   higher, so the nearer the building is to falling the higher its fire
   reaches: the owner's ask.  Each its own place in the flame's loop, mirrored
   or not. */
const TONGUE_ROWS = [
  /* a      across        up             tall */
  [0,     [0, 0],       [0, 0],         [1, 1]],
  [0.13,  [0.45, 0.8],  [0, 0.25],      [0.65, 0.85]],
  [0.26,  [0.45, 0.8],  [0, 0.25],      [0.65, 0.85]],
  [0.36,  [0.8, 1.1],   [-0.05, 0.15],  [0.5, 0.7]],
  [0.46,  [0.8, 1.1],   [-0.05, 0.15],  [0.5, 0.7]],
  [0.52,  [0.15, 0.6],  [0.7, 1.0],     [0.6, 0.8]],
  [0.6,   [0.15, 0.6],  [0.7, 1.0],     [0.6, 0.8]],
  [0.7,   [0.1, 0.5],   [1.3, 1.7],     [0.5, 0.7]],
  [0.8,   [0.1, 0.5],   [1.3, 1.7],     [0.5, 0.7]],
  [0.9,   [0, 0.15],    [2.0, 2.3],     [0.45, 0.6]],
];
const TONGUES = TONGUE_ROWS.length;  /* flames a spot grows to */
const span = (r) => r[0] + rnd() * (r[1] - r[0]);
function layoutTongues() {
  const side0 = rnd() < 0.5 ? -1 : 1;
  return TONGUE_ROWS.map(([a, across, up, tall], k) => ({
    a, dx: (k % 2 ? side0 : -side0) * span(across), dy: -span(up), w: span(tall),
    ph: (rnd() * ART.FLAME_FRAMES * FLAME_MS) | 0,
    flip: rnd() < 0.5,
  }));
}
/* The bed a spot's flames stand in: glowing coals strewn along its base, a
   ragged edge where the flames' own art ends in a straight line (the
   campfire hides that line behind its front log). */
const COALS = 14;
function layoutCoals() {
  const out = [];
  for (let i = 0; i < COALS; i++) out.push({ dx: (rnd() * 2 - 1) * 0.9, dy: rnd() * 5 - 1.5, big: rnd() < 0.3, ph: rnd() * 6.28, f: 0.6 + rnd() * 0.8 });
  return out;
}
function newSpot(x, y, rows) {
  const tongues = layoutTongues();
  return { x, y, n: 1, heat: 0, smoulder: 0, seed: rnd() * 100, tongues: rows ? tongues.slice(0, rows) : tongues, coals: layoutCoals(),
    emberAcc: rnd(), smokeAcc: rnd(), rate: 1 };
}
/* a piece of rubble burns where it lies: its flames spread, but do not climb
   a wall it no longer has (the first seven rows) */
const RUBBLE_ROWS = 7;

/* smoke's grey: light while it smoulders, darker the hotter it burns */
function smokeTint(dark) {
  const v = (lo, hi) => Math.round(hi + (lo - hi) * dark + gauss() * 6);
  const c = (x) => Math.max(0, Math.min(255, x));
  return (c(v(0x3c, 0xb0)) << 16) | (c(v(0x38, 0xb2)) << 8) | c(v(0x36, 0xb5));
}
const SOOT_TINT = (k) => {
  const r = Math.round(255 * (1 - SOOT * k)), g = Math.round(255 * (1 - SOOT * 1.15 * k)), b = Math.round(255 * (1 - SOOT * 1.3 * k));
  return (r << 16) | (g << 8) | b;
};

class Pool {
  constructor(parent, ax, ay, blend) { this.parent = parent; this.ax = ax; this.ay = ay; this.blend = blend || null; this.list = []; this.n = 0; }
  take(tex) {
    let sp = this.list[this.n];
    if (!sp || sp.destroyed) {
      sp = new Sprite(tex);
      sp.anchor.set(this.ax, this.ay);
      if (this.blend) sp.blendMode = this.blend;
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

/* ── one drawn fire: a Container of flames, light, sparks and smoke for its
   spots, in its own coordinates (a building's foot, or a piece of rubble) ── */
class Blaze {
  constructor(capE, capS) {
    this.root = new Container();
    this.root.label = 'buildingFire';
    const halo = new Container(), coal = new Container(), flame = new Container(), ember = new Container(), smoke = new Container();
    this.root.addChild(halo, coal, flame, ember, smoke);
    this.halos = new Pool(halo, 0.5, 0.5, 'add');
    this.coals = new Pool(coal, 0.5, 0.5);
    this.flames = new Pool(flame, 0.5, 1);
    this.emberP = new Pool(ember, 0.5, 0.5);
    this.smokeP = new Pool(smoke, 0.5, 0.5);
    this.embers = []; this.smoke = [];
    this.capE = capE; this.capS = capS;
    this.drawn = { flames: 0, tallest: 0, top: 0 };
  }

  _ember(sp, fl, burst) {
    if (this.embers.length >= this.capE) this.embers.shift();
    const spread = SPREAD0 + (SPREAD1 - SPREAD0) * fl, H = H0 + (H1 - H0) * fl;
    this.embers.push({
      x: sp.x + gauss() * spread * 0.55, y: sp.y - rnd() * H * 0.6,
      vx: gauss() * (burst ? 70 : 22), vy: -((burst ? 90 : 45) + rnd() * (burst ? 120 : 70)) * (0.6 + 0.4 * fl),
      age: 0, life: 0.6 + rnd() * (burst ? 1.6 : 1.2), big: rnd() < 0.18, ph: rnd() * 6.28,
    });
  }

  _puff(sp, fl, sm, big) {
    if (this.smoke.length >= this.capS) this.smoke.shift();
    const H = H0 + (H1 - H0) * fl;
    const burning = fl > 0.001;
    this.smoke.push({
      x: sp.x + gauss() * (4 + 14 * fl), y: burning ? sp.y - H * (0.7 + 0.5 * fl) : sp.y - 6,
      vx: gauss() * 5, vy: -(22 + rnd() * 18) * (burning ? 1 : 0.6),
      age: 0, life: (burning ? 3.4 : 2.4) + rnd() * (burning ? 1.8 : 1.6), r0: rnd() < 0.5 ? 0 : 1,
      k: (big || 1) * (burning ? 1 + 1.6 * fl : 0.75 + 0.25 * sm),
      tint: smokeTint(big ? 0.5 : burning ? 0.35 + 0.65 * fl : 0), ph: rnd() * 6.28, faint: burning ? 1 : 0.7,
    });
  }

  /* a burst: the collapse's sparks and smoke */
  burst(sp, nEmbers, nPuffs) {
    for (let i = 0; i < nEmbers; i++) this._ember(sp, 1, true);
    for (let i = 0; i < nPuffs; i++) this._puff(sp, 1, 1, 1.4);
  }

  /**
   * Spawn, move and draw.  `spots`: [{ x, y (its own coordinates), heat
   * (0..1: its flames), smoulder (0..1: smoke before it catches), tongues,
   * emberAcc, smokeAcc, seed, rate }]; `feed` false: no new sparks or smoke
   * (going out).  `clampY`: no flame stands below it (the building's foot).
   */
  step(spots, now, dt, wind, alpha, feed, clampY, clampX, ceilY) {
    const T = campfireAtlas();
    if (feed) {
      for (const sp of spots) {
        const fl = sp.heat, sm = Math.max(sp.smoulder, fl);
        if (fl > 0.001) {
          sp.emberAcc += (1.5 + 8 * fl) * dt * sp.rate;
          while (sp.emberAcc >= 1) { sp.emberAcc -= 1; this._ember(sp, fl, false); }
        }
        if (sm > 0.001) {
          sp.smokeAcc += (fl > 0.001 ? 1.2 + 4 * fl : 0.4 + 1.6 * sm) * dt * sp.rate;
          while (sp.smokeAcc >= 1) { sp.smokeAcc -= 1; this._puff(sp, fl, sm, 1); }
        }
      }
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.age += dt;
      if (e.age >= e.life) { this.embers.splice(i, 1); continue; }
      e.vx += (Math.sin(e.age * 7 + e.ph) * 26 + wind * 1.6) * dt;
      e.vx *= 1 - 1.2 * dt; e.vy *= 1 - 0.5 * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.age += dt;
      if (p.age >= p.life) { this.smoke.splice(i, 1); continue; }
      p.vx += (Math.sin(p.age * 1.3 + p.ph) * 4 + (wind - p.vx) * 0.45) * dt;
      p.vy *= 1 - 0.08 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    /* the flames, the coals they stand in, and their light on what they burn */
    this.halos.begin(); this.coals.begin(); this.flames.begin();
    let n = 0, tallest = 0, top = Infinity;
    for (const sp of spots) {
      const h = sp.heat;
      if (h <= 0.001) continue;
      const spread = SPREAD0 + (SPREAD1 - SPREAD0) * h, Hb = H0 + (H1 - H0) * h;
      const nc = Math.min(sp.coals.length, 4 + Math.round(10 * h));
      for (let c = 0; c < nc; c++) {
        const q = sp.coals[c];
        const cs = this.coals.take(T.sq);
        /* each glowing and dimming on its own, orange to the red of a dying coal */
        cs.tint = ART.emberColor(0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now / 170 * q.f + q.ph)));
        let cy = sp.y + q.dy;
        if (clampY != null && cy > clampY + 2) cy = clampY + 2;
        cs.x = Math.round((sp.x + q.dx * spread) / PIX) * PIX; cs.y = Math.round(cy / PIX) * PIX;
        cs.scale.set(PIX * (q.big ? 2 : 1));
        cs.alpha = alpha;
      }
      for (const t of sp.tongues) {
        if (h < t.a) continue;
        const grow = Math.min(1, (h - t.a) / 0.08);
        const H = Hb * t.w * (0.4 + 0.6 * grow);
        if (H < 4) continue;
        let x = sp.x + t.dx * spread, y = sp.y + t.dy * spread;
        if (clampX != null) x = Math.max(-clampX, Math.min(clampX, x));
        if (clampY != null && y > clampY) y = clampY;
        /* never licking past the top of its picture: a flame that would is
           cut down to fit, or left out */
        let Hc = H;
        if (ceilY != null && y - Hc < ceilY) { Hc = y - ceilY; if (Hc < 10) continue; }
        const { si, u } = flameFor(Hc);
        const frame = Math.floor((now + t.ph) / FLAME_MS) % ART.FLAME_FRAMES;
        const s = this.flames.take(T.flame[si][frame]);
        s.x = Math.round(x); s.y = Math.round(y);
        s.scale.set(t.flip ? -u : u, u);
        s.alpha = alpha;
        n++;
        const drawnH = artH(si) * u;
        if (drawnH > tallest) tallest = drawnH;
        if (y - drawnH < top) top = y - drawnH;
      }
      const flick = 0.8 + 0.12 * Math.sin(now / 97 + sp.seed) + 0.08 * Math.sin(now / 41 + sp.seed * 1.7);
      const hs = this.halos.take(T.halo);
      hs.tint = 0xff9440;
      hs.x = sp.x; hs.y = sp.y - Hb * 0.35;
      hs.scale.set(PIX * (1.3 + 3.2 * h));
      hs.alpha = 0.26 * flick * (0.45 + 0.55 * h) * alpha;
      /* ...and the campfire's pool of light, at the flames' feet */
      const gs = this.halos.take(T.glow);
      gs.tint = 0xff8a30;
      gs.x = sp.x; gs.y = sp.y + 1;
      gs.scale.set(PIX * (0.5 + 1.1 * h) * Math.max(1, spread / 40), PIX * (0.5 + 1.1 * h));
      gs.alpha = 0.34 * flick * (0.4 + 0.6 * h) * alpha;
    }
    this.halos.end(); this.coals.end(); this.flames.end();
    this.emberP.begin();
    for (const e of this.embers) {
      const k = e.age / e.life;
      const sp = this.emberP.take(T.sq);
      sp.tint = ART.emberColor(k);
      sp.x = Math.round(e.x / PIX) * PIX; sp.y = Math.round(e.y / PIX) * PIX;
      sp.scale.set(PIX * (e.big && k < 0.5 ? 2 : 1));
      /* the last tenth of a spark's life flickers out, as the campfire's */
      sp.alpha = k > 0.9 && ((now / 60 + e.ph) | 0) % 2 ? 0 : alpha;
    }
    this.emberP.end();
    this.smokeP.begin();
    for (const p of this.smoke) {
      const k = p.age / p.life;
      const pi = Math.min(ART.PUFF_R.length - 1, Math.floor(k * (ART.PUFF_R.length - 0.2)) + p.r0);
      const sp = this.smokeP.take(T.puff[pi]);
      const u = PIX * p.k * (1 + 0.9 * k);
      sp.tint = p.tint;
      sp.x = Math.round(p.x / PIX) * PIX; sp.y = Math.round(p.y / PIX) * PIX;
      sp.scale.set(u);
      /* stepped, not smooth, as the campfire's smoke thins */
      sp.alpha = (k < 0.22 ? 0.6 : k < 0.48 ? 0.46 : k < 0.74 ? 0.3 : 0.14) * p.faint * Math.min(1, alpha * 1.4);
    }
    this.smokeP.end();
    this.drawn.flames = n; this.drawn.tallest = Math.round(tallest); this.drawn.top = Number.isFinite(top) ? Math.round(top) : 0;
  }

  /* nothing drawn, nothing moving: off the screen */
  hide() { if (this.root.visible) this.root.visible = false; }

  /* nothing left to draw */
  spent() { return !this.embers.length && !this.smoke.length; }

  destroy() {
    const r = this.root;
    if (r && !r.destroyed) { if (r.parent) r.parent.removeChild(r); r.destroy({ children: true }); }
  }
}

/* Put fire `b` on `host` -- the building's picture or a piece of rubble: in
   its layer, on its ground line, a quarter step after it (depthSort `_ridesOn`,
   as worldLife.js's riders). */
function ride(b, host) {
  const r = b.root;
  if (!host.parent) { b.hide(); return false; }
  if (r.parent !== host.parent) host.parent.addChild(r);
  r.x = host.x; r.y = host.y;
  r._groundDy = host._groundDy || 0;
  if (r._ridesOn !== host) r._ridesOn = host;
  if (!r.visible) r.visible = true;
  return true;
}

/* ── one building's fire, from its first hit to its last smoke ── */
class BuildingFire {
  constructor(oi, x, y, w, h) {
    this.oi = oi;
    this.x = x; this.y = y;          /* its foot */
    this.w = w; this.h = h;          /* its picture, world px */
    this.spots = [];                 /* on its face, from its foot */
    this.frac = 0;                   /* of the way to breaking (wheelBreak) */
    this.lastHit = 0;
    this.mode = 'face';              /* 'face' | 'rubble' | 'out' */
    this.fellAt = 0; this.outAt = 0;
    this.face = null;                /* its Blaze while it stands */
    this.rubble = [];                /* { blaze, shard (wheelShatter's), spot, low, ph, period, x, y } */
    this.sooted = null;              /* the picture we darkened, to give it back */
    this.lastT = 0;
  }

  hit(ev, now) {
    if (this.mode !== 'face') return;
    this.frac = Number.isFinite(ev.frac) ? ev.frac : this.frac;
    this.lastHit = now;
    if (!Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return;
    /* on its picture, above its foot */
    const dx = Math.max(-this.w * 0.45, Math.min(this.w * 0.45, ev.x - this.x));
    const dy = Math.min(-8, Math.max(-this.h * 0.92, ev.y - this.y));
    let best = null, bd = Infinity;
    for (const s of this.spots) {
      const d = Math.hypot(s.x - dx, s.y - dy);
      if (d < bd) { bd = d; best = s; }
    }
    if (best && (bd <= MERGE_R || this.spots.length >= MAX_SPOTS)) {
      best.n++;
      /* a spot drifts toward where it keeps being hit */
      if (bd <= MERGE_R) { best.x += (dx - best.x) / (best.n + 1); best.y += (dy - best.y) / (best.n + 1); }
    } else this.spots.push(newSpot(dx, dy));
  }

  /* the heat each spot wants now: none below IGNITE, the most-hit spot the
     hottest, sinking after COOL_START without a hit */
  _faceTargets(now, dt) {
    const since = now - this.lastHit;
    const cool = clamp01((since - COOL_START) / Math.max(1, HEAL_MS - COOL_START));
    const g = clamp01((this.frac - IGNITE) / (1 - IGNITE));
    /* (smoke you can see from its first hit past SMOULDER, thickening) */
    const sm = this.frac >= SMOULDER ? (0.45 + 0.55 * clamp01((this.frac - SMOULDER) / (IGNITE - SMOULDER))) * (1 - cool) : 0;
    let maxN = 1;
    for (const s of this.spots) if (s.n > maxN) maxN = s.n;
    for (const s of this.spots) {
      const share = s.n / maxN;
      let want = this.frac >= IGNITE ? (0.06 + 0.94 * g) * (0.5 + 0.5 * share) * (1 - cool) : 0;
      if (want < 0.012) want = 0;
      /* catches quickly, sinks slowly */
      s.heat += (want - s.heat) * Math.min(1, dt * (want > s.heat ? 3.5 : 1.2));
      if (Math.abs(want - s.heat) < 0.002) s.heat = want;
      s.smoulder += (sm - s.smoulder) * Math.min(1, dt * 2);
    }
  }

  /* the soot: the building darker as its fire grows, given back as it goes */
  _soot(host) {
    let hot = 0;
    for (const s of this.spots) if (s.heat > hot) hot = s.heat;
    const k = this.mode === 'face' ? hot : 0;
    if (!host || host.destroyed) { this.sooted = null; return; }
    if (k <= 0.002) {
      if (this.sooted === host && host.tint !== 0xffffff) host.tint = 0xffffff;
      this.sooted = null;
      return;
    }
    const t = SOOT_TINT(k);
    if (host.tint !== t) host.tint = t;
    this.sooted = host;
  }

  /**
   * Its heap has just been made (wheelShatter.add): the fire flares, and the
   * pieces nearest each spot, then the biggest, fall burning.  `heap` may be
   * null (the picture was not in): then it burns on the ground where it stood.
   */
  collapse(heap, now) {
    this.mode = 'rubble';
    this.fellAt = now;
    /* the flare: the face's last sparks and smoke, thrown up as it falls */
    if (this.face) {
      for (const s of this.spots) this.face.burst(s, 16, 1);
    }
    const shards = heap && heap.shards ? heap.shards.filter((s) => s && s.spr && !s.spr.destroyed) : [];
    const used = new Set();
    const pick = (wx, wy) => {
      let best = null, bd = Infinity;
      for (const s of shards) {
        if (used.has(s)) continue;
        const d = Math.hypot(s.x - wx, (s.gy - s.z) - wy);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    };
    const chosen = [];
    /* the pieces nearest each spot, the most-hit first */
    for (const sp of [...this.spots].sort((a, b) => b.n - a.n)) {
      if (chosen.length >= RUBBLE_FIRES) break;
      const s = pick(this.x + sp.x, this.y + sp.y);
      if (s) { used.add(s); chosen.push(s); }
    }
    /* ...then the biggest */
    const area = (s) => { const f = s.spr.texture && s.spr.texture.frame; return f ? f.width * f.height : 0; };
    for (const s of [...shards].sort((a, b) => area(b) - area(a))) {
      if (chosen.length >= RUBBLE_FIRES) break;
      if (!used.has(s)) { used.add(s); chosen.push(s); }
    }
    for (const s of chosen) {
      s.burnt = true;   /* wheelShatter: it lies charred */
      this.rubble.push(this._rubbleFire(s, 0, 0));
    }
    /* no picture to break: it burns on the ground where it stood */
    if (!chosen.length) {
      for (let i = 0; i < 4; i++) this.rubble.push(this._rubbleFire(null, this.x + (rnd() * 2 - 1) * this.w * 0.3, this.y - rnd() * 30));
    }
  }

  _rubbleFire(shard, x, y) {
    const sp = newSpot(0, 0, RUBBLE_ROWS);
    sp.heat = 1;
    sp.rate = 0.7;
    return { blaze: new Blaze(R_EMBER_CAP, R_SMOKE_CAP), shard, spot: sp,
      low: RUBBLE_LOW + rnd() * (RUBBLE_HIGH - RUBBLE_LOW), ph: rnd() * 6.28, period: 3000 + rnd() * 4000, x, y };
  }

  /** It goes out: the building mended, or its count forgotten. */
  out(now) {
    if (this.mode === 'out') return;
    this.mode = 'out';
    this.outAt = now;
  }

  /**
   * One frame.  `host`: the WheelObjects drawing the Wheel's objects; `view`:
   * { x0, y0, x1, y1 }, world px.  Returns false once it has nothing left to
   * draw.
   */
  step(host, now, view) {
    const dt = this.lastT ? Math.min(0.1, Math.max(0, (now - this.lastT) / 1000)) : 1 / 60;
    this.lastT = now;
    const wind = windAt(now);
    const seen = !(this.x + this.w * 0.6 + VIEW_PAD < view.x0 || this.x - this.w * 0.6 - VIEW_PAD > view.x1
      || this.y + VIEW_PAD < view.y0 || this.y - this.h - 2 * VIEW_PAD > view.y1);
    /* never left burning: a count wheelBreak forgot without its 'heal' (a new
       worker answer clears it whole) still puts the fire out */
    if (this.mode === 'face' && now - this.lastHit > HEAL_MS + 3000) this.out(now);
    const outK = this.mode === 'out' ? clamp01((now - this.outAt) / OUT_MS) : 0;
    if (this.mode === 'out' && now - this.outAt > GONE_MS) return false;

    /* ── standing: the fire on its face ── */
    if (this.mode === 'face' || (this.mode === 'out' && !this.fellAt)) {
      if (this.mode === 'face') this._faceTargets(now, dt);
      else for (const s of this.spots) { s.heat *= 1 - outK; s.smoulder *= 1 - outK; }
      const pic = host.sprites.get(this.oi);
      this._soot(pic && !pic.destroyed ? pic : null);
      let any = false;
      for (const s of this.spots) if (s.heat > 0.001 || s.smoulder > 0.001) { any = true; break; }
      if (!pic || pic.destroyed || !seen) { if (this.face) this.face.hide(); }
      else if (any || (this.face && !this.face.spent())) {
        if (!this.face) this.face = new Blaze(EMBER_CAP, SMOKE_CAP);
        if (ride(this.face, pic)) this.face.step(this.spots, now, dt, wind, 1, this.mode === 'face', -2, this.w * 0.47, -this.h * 0.86);
      } else if (this.face) this.face.hide();
      /* going out: until its flames are down and its last smoke has gone
         (never past GONE_MS, above: unseen, its smoke never moves) */
      if (this.mode === 'out') return any || !!(this.face && !this.face.spent());
      return true;
    }

    /* ── in pieces: the face's last sparks and smoke, then the rubble ── */
    if (this.face) {
      if (!this.face.spent() && seen) {
        /* where it stood: the heap's own place on the ground */
        this.face.root.visible = true;
        this.face.step([], now, dt, wind, 1, false, null, null);
      } else { this.face.destroy(); this.face = null; }
    }
    const heap = host.shatter && host.shatter.heaps ? host.shatter.heaps.get(this.oi) : null;
    if (this.mode === 'rubble' && (!heap || heap.fadeAt)) {
      /* the heap went (mended early, or past wheelShatter's HEAP_PX): so do its fires */
      this.out(now);
    }
    const since = now - this.fellAt;
    const settle = clamp01(since / SETTLE_MS);
    const ease = settle * settle * (3 - 2 * settle);
    let alive = !!this.face;
    for (const r of this.rubble) {
      const sp = r.spot;
      if (this.mode === 'rubble') {
        const breathe = 0.1 * Math.sin(now / r.period * 6.283 + r.ph);
        sp.heat = since < 500 ? 1 : Math.max(0.05, 1 + (r.low - 1) * ease + breathe * ease);
      } else sp.heat = Math.max(0, sp.heat * (1 - outK));
      if (outK >= 1) sp.heat = 0;
      const shard = r.shard && r.shard.spr && !r.shard.spr.destroyed ? r.shard : null;
      if (!seen) { r.blaze.hide(); if (!r.blaze.spent() || sp.heat > 0) alive = true; continue; }
      if (shard) {
        if (!ride(r.blaze, shard.spr)) { if (sp.heat > 0) alive = true; continue; }
        r.x = shard.spr.x; r.y = shard.spr.y;
      } else {
        /* its piece is gone (or there never was one): where it lay */
        const root = r.blaze.root;
        if (!root.parent && host.layer) host.layer.addChild(root);
        root.x = r.x; root.y = r.y; root._groundDy = 0; root._ridesOn = null;
        root.visible = true;
      }
      r.blaze.step([sp], now, dt, wind, 1, this.mode === 'rubble', null, null);
      if (sp.heat > 0.001 || !r.blaze.spent()) alive = true;
    }
    if (this.mode === 'out' && !alive) return false;
    return true;
  }

  probe(host) {
    const pic = host && host.sprites ? host.sprites.get(this.oi) : null;
    const face = this.face;
    const fr = face && face.root;
    let heat = 0;
    for (const s of this.spots) if (s.heat > heat) heat = s.heat;
    const rub = this.rubble.map((r) => {
      const root = r.blaze.root;
      const sh = r.shard && r.shard.spr && !r.shard.spr.destroyed ? r.shard : null;
      return { heat: +r.spot.heat.toFixed(3), flames: r.blaze.drawn.flames, tallest: r.blaze.drawn.tallest,
        onShard: !!sh, landed: !!(sh && sh.landed), burnt: !!(sh && sh.burnt),
        x: Math.round(root.x), y: Math.round(root.y), layer: root.parent ? root.parent.label || '?' : null,
        hostLayer: sh && sh.spr.parent ? sh.spr.parent.label || '?' : null,
        dz: sh && root.parent === sh.spr.parent ? +(root.zIndex - sh.spr.zIndex).toFixed(2) : null,
        visible: !!root.visible, embers: r.blaze.embers.length, smoke: r.blaze.smoke.length };
    });
    return {
      oi: this.oi, mode: this.mode, frac: +this.frac.toFixed(3), x: Math.round(this.x), y: Math.round(this.y),
      heat: +heat.toFixed(3),
      spots: this.spots.map((s) => ({ x: Math.round(this.x + s.x), y: Math.round(this.y + s.y), n: s.n, heat: +s.heat.toFixed(3), smoulder: +s.smoulder.toFixed(3) })),
      flames: face ? face.drawn.flames : 0, tallest: face ? face.drawn.tallest : 0,
      top: face && face.drawn.flames ? Math.round(this.y + face.drawn.top) : null,
      embers: face ? face.embers.length : 0, smoke: face ? face.smoke.length : 0,
      visible: !!(fr && fr.visible), layer: fr && fr.parent ? fr.parent.label || '?' : null,
      hostLayer: pic && pic.parent ? pic.parent.label || '?' : null,
      dz: fr && pic && fr.parent === pic.parent ? +(fr.zIndex - pic.zIndex).toFixed(2) : null,
      tint: pic && !pic.destroyed ? pic.tint : null,
      rubble: rub,
    };
  }

  destroy() {
    if (this.sooted && !this.sooted.destroyed) { try { this.sooted.tint = 0xffffff; } catch (e) { /* gone */ } }
    this.sooted = null;
    if (this.face) { this.face.destroy(); this.face = null; }
    for (const r of this.rubble) r.blaze.destroy();
    this.rubble.length = 0;
  }
}

/* ── every building's fire, owned by WheelObjects ── */
export class BuildingFires {
  constructor(layer) {
    this.layer = layer;
    this.fires = new Map();     /* object index -> BuildingFire, standing or in pieces */
    this.going = [];            /* fires going out */
    this.stats = { caught: 0, fell: 0, out: 0, live: 0 };
    _liveFires = this;
  }

  /**
   * One of wheelBreak's events, for a building (WheelObjects decides that):
   * after WheelObjects has handled it, so a break's heap is already made.
   * `ix`: its index (where the building stands, its size).
   */
  event(ev, ix, host, now) {
    const i = ev.oi;
    if (ev.type === 'hit') {
      let f = this.fires.get(i);
      if (!f) {
        /* v2.3.3409: its picture's size is kept once a PIECE since v2.3.3315
           (wheelObjects.js, "Read as ix.w[ix.pk[i]]"), and read here at the
           object's own number it was some other picture's -- the Hotel took a
           40 px one's: every spot was held within 18 px of its middle, arrows
           at either end merged into one fire there, and the flames' height
           was held to that picture's (mp-buildingfire) */
        const pk = ix.pk[i];
        f = new BuildingFire(i, ix.o.x[i], ix.o.y[i], ix.w[pk], ix.h[pk]);
        this.fires.set(i, f);
      }
      const was = f.frac;
      f.hit(ev, now);
      if (was < IGNITE && f.frac >= IGNITE) {
        this.stats.caught++;
        /* v2.3.3343: catching is heard -- a whoomp of air and a hiss, by
           distance (it caught in silence; SOUND-GAPS).  The burning itself
           has no loop yet: a real crackle needs a new recording. */
        try {
          const S = typeof window !== 'undefined' && window._gameState ? window._gameState.current : null;
          if (S) cueAt(S, 'fireCatch', ix.o.x[i], ix.o.y[i]);
        } catch (e) { /* sound only */ }
      }
      return;
    }
    const f = this.fires.get(i);
    if (!f) return;
    if (ev.type === 'break') {
      const heap = host.shatter && host.shatter.heaps ? host.shatter.heaps.get(i) : null;
      /* never caught (a volley of specials, a peer's): no fire in the pieces */
      if (f.frac < IGNITE && !f.spots.some((s) => s.heat > 0.01)) { this._end(i, f, now); return; }
      f.frac = 1;
      f.collapse(heap, now);
      this.stats.fell++;
      return;
    }
    if (ev.type === 'repair' || ev.type === 'heal') this._end(i, f, now);
  }

  _end(i, f, now) {
    f.out(now);
    this.fires.delete(i);
    this.going.push(f);
    this.stats.out++;
  }

  /** Once a frame, after the shards have moved (WheelObjects.update). */
  update(host, now, view) {
    for (const [i, f] of this.fires) {
      if (!f.step(host, now, view)) { f.destroy(); this.fires.delete(i); }
    }
    for (let k = this.going.length - 1; k >= 0; k--) {
      const f = this.going[k];
      if (!f.step(host, now, view)) { f.destroy(); this.going.splice(k, 1); }
    }
    this.stats.live = this.fires.size + this.going.length;
  }

  probe(host) {
    const out = [];
    for (const f of this.fires.values()) out.push(f.probe(host));
    for (const f of this.going) out.push(f.probe(host));
    return out;
  }

  destroy() {
    for (const f of this.fires.values()) f.destroy();
    for (const f of this.going) f.destroy();
    this.fires.clear();
    this.going.length = 0;
    this.stats.live = 0;
    if (_liveFires === this) _liveFires = null;
  }
}
let _liveFires = null;

/* ═══ v2.3.3462: WHERE SOMETHING BURNS, FOR ITS CRACKLE ═══
   game/ambientBeds.js plays the owner's fire-crackle recording by the
   nearest fire: each burning building (standing, in pieces, or going out) as
   its foot and its hottest spot's heat, 0..1.  A plain list made on asking,
   nothing kept. */
export function burningNow() {
  const out = [];
  const L = _liveFires;
  if (!L) return out;
  const add = (f) => {
    let heat = 0;
    for (const s of f.spots) if (s.heat > heat) heat = s.heat;
    for (const r of f.rubble) if (r.spot && r.spot.heat > heat) heat = r.spot.heat;
    if (heat > 0.02) out.push({ x: f.x, y: f.y, heat: Math.min(1, heat) });
  };
  for (const f of L.fires.values()) add(f);
  for (const f of L.going) add(f);
  return out;
}

/* QA probe, house style (mp-buildingfire).  `fires()` needs the live
   WheelObjects, which wheelObjects.js hands it (`__btWheelObjects.fires`). */
if (typeof window !== 'undefined') {
  window.__btBuildingFire = {
    on: buildingFireOn(),
    rules: { SMOULDER, IGNITE, MERGE_R, MAX_SPOTS, TONGUES, H0, H1, COOL_START, HEAL_MS, RUBBLE_FIRES, SETTLE_MS, OUT_MS, SOOT },
    stats: () => (_liveFires ? { ..._liveFires.stats } : null),
    /* the campfire atlas's own picture: every fire sprite draws from it */
    atlas: () => { try { return campfireAtlas().base.source.uid; } catch (e) { return null; } },
  };
}
