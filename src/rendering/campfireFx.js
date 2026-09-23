/* ═══ v2.3.2776: A CAMPFIRE THAT BURNS ═══
 *
 * Owner: "I saw you can create good looking pixel flames.  Instead of the
 * current generated fire (after lighting logs for firewood) ... I want you
 * recreate it better."
 *
 * The fire you light from a log used to be five vector shapes redrawn every
 * frame on nodeGfx (v2.3.853): a flat orange ellipse, a brown rounded
 * rectangle, three curved tongues and a yellow circle, plus a few round dots.
 * Smooth-edged against pixel-art characters, the same size for its whole 45 s,
 * and drawn on one layer, so it sat under a player standing behind it.
 *
 * Now it is pixel art in the characters' own idiom (campfireArt.js mints it
 * into one small nearest-sampled atlas at startup), and it behaves like a fire:
 *   - it TAKES OVER from the fire-lighting strip's flame and settles to full
 *     height, with a spit of sparks;
 *   - it BURNS: a 16-frame flame loop at 12.5 fps, two crossed logs that
 *     blacken from the middle outward, grow glowing cracks and end in ash;
 *     sparks spit up from the bed, cool white -> yellow -> orange -> red, and
 *     now and then a log pops and throws a handful; smoke rises and drifts
 *     with its own slowly turning wind;
 *   - it LIGHTS the ground: a warm pool (additive, in stepped bands) that
 *     flickers with the flame, and a faint halo in the air behind it;
 *   - it DIES DOWN: in its last seconds the flames sink through the sizes it
 *     grew through, the smoke thickens and greys, the flames go out and the
 *     embers glow on, and when the fire is gone the embers fade and the last
 *     smoke thins -- instead of the whole thing dissolving.
 *   - it has DEPTH: logs, flame, sparks and smoke are one Container in the
 *     depth-sorted entity layer (depthSort.js), so walking behind the fire puts
 *     it in front of you and walking in front of it puts you in front.  The
 *     record's (x, y) is the fire's GROUND point -- where the old vector fire
 *     drew its base and where the cook figure plants its feet beside it -- but
 *     the sort compares against YOUR position, which is your hips, not your
 *     boots (standFootDy).  So the Container stands one foot-drop above the
 *     ground point and draws the fire that far below its origin: the fire
 *     comes in front of you exactly when its base is nearer the camera than
 *     your boots.  The ground glow lives on the ground layer, under everything.
 *
 * Nothing about what a campfire IS changed: S._campfire and S._peerCampfires
 * (the cooking station, its fuse, the peer broadcast) are read exactly as the
 * vector fire read them.  This module only draws them.
 */
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { zonePlayerScale } from '@/data/zones.js';
import { TILE } from '@/data/constants.js';
import * as ART from './campfireArt.js';
import { standFootDy } from './systems/entityRenderer.js';

/* World px per art pixel: the size the fire-lighting strip draws ITS pixels at
   (8 source px per art pixel x 154/512 = 2.4) and the size the hit-reaction
   pieces use (hitMaterialFx, 2.53), so the fire, the strip that lights it and
   the debris of a fight beside it are one pixel grid. */
const PIX = 2.53;
const FLAME_MS = 80;                 /* 12.5 fps */
/* catching: [ms since lit, flame size index].  Short on purpose: the
   fire-lighting strip has already played the spark catching and the flame
   rising, so the campfire takes over a fire that is already going -- it only
   settles into its full height, it does not light itself a second time. */
const IGNITE = [[0, 2], [260, 3]];
/* dying down: below [ms left] the flame drops to [size]; under the last step
   the flames are out and only the embers glow */
const BURN_DOWN = [[7000, 2], [4800, 1], [3000, 0], [1600, -1]];
const CHAR_FULL_MS = 40000;          /* the logs are black by the end of a normal burn */
const DYING_MS = 3800;               /* embers and last smoke, after the fire record is gone */
const EMBER_CAP = 40;
const SMOKE_CAP = 16;
/* where the logs' crossing -- the flame's root -- sits above the fire's ground
   point, in art px: the upper log rests on the lower, so the crossing stands
   about a log's thickness off the ground */
const CROSS_LIFT = 4;

const rnd = Math.random;
const gauss = () => (rnd() + rnd() + rnd() - 1.5);

function sizeIndexFor(age, remain) {
  let s = 3;
  for (const [ms, si] of IGNITE) if (age >= ms) s = si;
  if (remain != null) for (const [ms, si] of BURN_DOWN) if (remain < ms) s = Math.min(s, si);
  return s;
}

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

let _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  const { canvas, rects } = ART.mintCampfireAtlas();
  const base = Texture.from(canvas);
  /* NEAREST: a texel is an art pixel and must stay a hard square at any zoom
     -- a smooth fire is what this replaces. */
  base.source.scaleMode = 'nearest';
  const sub = (r) => new Texture({ source: base.source, frame: new Rectangle(r.x, r.y, r.w, r.h) });
  _atlas = {
    base,
    flame: rects.flame.map((row) => row.map(sub)),
    logBack: rects.logBack.map(sub), logFront: rects.logFront.map(sub),
    crackBack: rects.crackBack.map(sub), crackFront: rects.crackFront.map(sub),
    puff: rects.puff.map(sub), glow: sub(rects.glow), halo: sub(rects.halo), sq: sub(rects.sq),
  };
  return _atlas;
}

class Fire {
  constructor(body, ground, key, rec, now) {
    const T = atlas();
    this.key = key;
    this.zone = rec.zone || null;
    this.litAt = rec.litAt || now;
    this.x = rec.x; this.y = rec.y;
    this.phase = (rnd() * ART.FLAME_FRAMES * FLAME_MS) | 0;
    this.wind0 = (rnd() < 0.5 ? -1 : 1) * (1.6 + rnd() * 2.6);
    this.seed = rnd() * 100;
    this.dyingAt = 0;
    this.lastT = now;
    this.embers = [];
    this.smoke = [];
    this.nextPop = now + 1400 + rnd() * 2500;
    this.emberAcc = 0; this.smokeAcc = 0;
    /* the ignition spits a few sparks the moment it catches */
    for (let i = 0; i < 6; i++) this._ember(1, true);

    this.root = new Container();
    this.halo = new Sprite(T.halo); this.halo.anchor.set(0.5, 0.5); this.halo.blendMode = 'add'; this.halo.tint = 0xffa650;
    this.logBack = new Sprite(T.logBack[0]);
    this.crackBack = new Sprite(T.crackBack[0]); this.crackBack.blendMode = 'add';
    this.flame = new Sprite(T.flame[0][0]); this.flame.anchor.set(0.5, 1);
    this.logFront = new Sprite(T.logFront[0]);
    this.crackFront = new Sprite(T.crackFront[0]); this.crackFront.blendMode = 'add';
    this.emberC = new Container();
    this.smokeC = new Container();
    this.root.addChild(this.halo, this.logBack, this.crackBack, this.flame, this.logFront, this.crackFront, this.emberC, this.smokeC);
    this.emberPool = new Pool(this.emberC);
    this.smokePool = new Pool(this.smokeC);
    body.addChild(this.root);
    this.glow = new Sprite(T.glow); this.glow.anchor.set(0.5, 0.5); this.glow.blendMode = 'add'; this.glow.tint = 0xff9a3c;
    ground.addChild(this.glow);
    this.state = { size: 0, stage: 0, frame: 0, flameOn: true };
  }

  /* one spark from the bed.  k: how hot the fire is (0..1); pop: a log
     cracking, which throws harder and higher */
  _ember(k, pop) {
    if (this.embers.length >= EMBER_CAP) this.embers.shift();
    this.embers.push({
      x: gauss() * (pop ? 1.6 : 2.4),
      y: -(1 + rnd() * 5 * (0.4 + 0.6 * k)),
      vx: gauss() * (pop ? 16 : 5),
      vy: -((pop ? 30 : 15) + rnd() * (pop ? 26 : 20)) * (0.55 + 0.45 * k),
      age: 0,
      life: (pop ? 0.45 : 0.6) + rnd() * (pop ? 0.5 : 1.0),
      big: !pop && rnd() < 0.16,
      ph: rnd() * 6.28,
    });
  }

  _puff(topY, grey) {
    if (this.smoke.length >= SMOKE_CAP) this.smoke.shift();
    this.smoke.push({
      x: gauss() * 1.4, y: topY,
      vx: gauss() * 1.2, vy: -(6.5 + rnd() * 4.5),
      age: 0, life: 2.3 + rnd() * 1.3, r0: rnd() < 0.5 ? 0 : 1,
      tint: grey ? (rnd() < 0.5 ? 0x8a8f95 : 0x9ea3a9) : (rnd() < 0.5 ? 0xb4b8bd : 0xc7cacd),
      ph: rnd() * 6.28,
    });
  }

  /* rec: the live record, or null once it is gone (dying) */
  step(rec, now, zoneScale, remainMs) {
    const T = atlas();
    const dt = Math.min(0.1, Math.max(0, (now - this.lastT) / 1000));
    this.lastT = now;
    if (rec) { this.x = rec.x; this.y = rec.y; }
    const dying = !rec;
    if (dying && !this.dyingAt) this.dyingAt = now;
    const dyingK = dying ? Math.min(1, (now - this.dyingAt) / DYING_MS) : 0;
    /* gone once the last spark and puff have, and never later than two
       seconds after the embers have faded */
    if (dying && dyingK >= 1 && ((!this.embers.length && !this.smoke.length) || now - this.dyingAt > DYING_MS + 2000)) return false;

    const age = now - this.litAt;
    const si = dying ? -1 : sizeIndexFor(age, remainMs);
    const flameOn = si >= 0;
    /* heat 0..1: what the sparks, smoke, glow and cracks key off */
    const heat = flameOn ? ART.FLAME_SIZES[si] : dying ? 0.25 * (1 - dyingK) : 0.3;
    const stage = dying ? ART.LOG_STAGES - 1
      : Math.min(ART.LOG_STAGES - 1, Math.floor((age / CHAR_FULL_MS) * (ART.LOG_STAGES - 1) + 0.35));
    const frame = Math.floor((now + this.phase) / FLAME_MS) % ART.FLAME_FRAMES;
    const u = PIX * (zoneScale || 1);
    const wind = this.wind0 + Math.sin(now / 4100 + this.seed) * 1.5;

    /* ── particles ── */
    if (!dying || dyingK < 0.6) {
      const emberRate = age < 600 ? 9 : flameOn ? 3 + 5 * heat : 2.2 * (1 - dyingK);
      this.emberAcc += emberRate * dt;
      while (this.emberAcc >= 1) { this.emberAcc -= 1; this._ember(heat, false); }
      if (flameOn && now >= this.nextPop) {
        const n = 3 + ((rnd() * 4) | 0);
        for (let i = 0; i < n; i++) this._ember(heat, true);
        this.nextPop = now + 1800 + rnd() * 4200;
      }
    }
    {
      /* smoke: a new fire smokes as it catches, a dying one smokes more and greyer */
      const late = !flameOn || (remainMs != null && remainMs < 7000);
      const smokeRate = dying ? (dyingK < 0.5 ? 2.6 * (1 - 2 * dyingK) : 0) : age < 1200 ? 3.4 : late ? 3.2 : 1.7;
      this.smokeAcc += smokeRate * dt;
      const topY = flameOn ? -(ART.FLAME_SIZES[si] * 16 + 2) : -3;
      while (this.smokeAcc >= 1) { this.smokeAcc -= 1; this._puff(topY, late || dying); }
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.age += dt;
      if (e.age >= e.life) { this.embers.splice(i, 1); continue; }
      e.vx += (Math.sin(e.age * 7 + e.ph) * 10 + wind * 0.6) * dt;
      e.vx *= 1 - 1.4 * dt;
      e.vy *= 1 - 0.7 * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.age += dt;
      if (p.age >= p.life) { this.smoke.splice(i, 1); continue; }
      p.vx += (Math.sin(p.age * 1.7 + p.ph) * 1.6 + (wind - p.vx) * 0.5) * dt;
      p.vy *= 1 - 0.12 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    /* ── placement ── */
    const R = this.root;
    /* sort key in the characters' convention (their y is their hips): the
       fire's ground point, less the drop from a character's hips to its boots */
    const foot = standFootDy(zoneScale || 1);
    R.x = this.x; R.y = this.y - foot;
    const fade = dying ? (dyingK < 0.55 ? 1 : dyingK < 0.72 ? 0.66 : dyingK < 0.88 ? 0.33 : 0) : 1;
    const crossX = 0, crossY = foot - CROSS_LIFT * u;
    const lx = crossX - ART.LOG_CROSS.x * u, ly = crossY - ART.LOG_CROSS.y * u;
    for (const [sp, tex] of [[this.logBack, T.logBack[stage]], [this.logFront, T.logFront[stage]],
      [this.crackBack, T.crackBack[stage]], [this.crackFront, T.crackFront[stage]]]) {
      if (sp.texture !== tex) sp.texture = tex;
      sp.x = lx; sp.y = ly; sp.scale.set(u);
    }
    this.logBack.alpha = this.logFront.alpha = fade;
    /* cracks breathe, and show most when the flame is low -- embers glow
       brightest once the flames stop hiding them */
    const pulse = 0.5 + 0.5 * Math.sin(now / 270 + this.seed);
    const crackA = (0.45 + 0.35 * pulse) * (flameOn ? 0.65 + 0.35 * (1 - heat) : 1) * (dying ? 1 - dyingK : 1);
    this.crackBack.alpha = this.crackFront.alpha = crackA;
    this.flame.visible = flameOn;
    if (flameOn) {
      const ft = T.flame[si][frame];
      if (this.flame.texture !== ft) this.flame.texture = ft;
      this.flame.x = crossX; this.flame.y = crossY + 1.5 * u;
      this.flame.scale.set(u);
    }
    const flick = 0.78 + 0.12 * Math.sin(now / 97 + this.seed) + 0.1 * Math.sin(now / 41 + 1.3);
    const light = (flameOn ? 0.45 + 0.55 * heat : 0.3 * (dying ? 1 - dyingK : 1)) * flick;
    this.halo.x = crossX; this.halo.y = crossY - 8 * u * (flameOn ? heat : 0.4);
    this.halo.scale.set(u);
    this.halo.alpha = 0.16 * light;
    this.halo.visible = light > 0.01;
    this.glow.x = this.x; this.glow.y = this.y - 1 * u;
    this.glow.scale.set(u);
    this.glow.alpha = 0.42 * light;
    this.glow.visible = light > 0.01;

    this.emberPool.begin();
    for (const e of this.embers) {
      const sp = this.emberPool.take(T.sq);
      const k = e.age / e.life;
      sp.tint = ART.emberColor(k);
      sp.x = crossX + Math.round(e.x) * u; sp.y = crossY + Math.round(e.y) * u;
      sp.scale.set(u * (e.big && k < 0.5 ? 2 : 1));
      /* the last tenth of a spark's life flickers out rather than fading */
      sp.alpha = k > 0.9 && ((now / 60 + e.ph) | 0) % 2 ? 0 : 1;
    }
    this.emberPool.end();
    this.smokePool.begin();
    for (const p of this.smoke) {
      const k = p.age / p.life;
      const pi = Math.min(ART.PUFF_R.length - 1, Math.floor(k * (ART.PUFF_R.length - 0.2)) + p.r0);
      const sp = this.smokePool.take(T.puff[Math.min(ART.PUFF_R.length - 1, pi)]);
      sp.tint = p.tint;
      sp.x = crossX + Math.round(p.x) * u; sp.y = crossY + Math.round(p.y) * u;
      sp.scale.set(u);
      /* stepped, not smooth: smoke thins in four clear steps */
      sp.alpha = k < 0.22 ? 0.55 : k < 0.48 ? 0.42 : k < 0.74 ? 0.27 : 0.12;
    }
    this.smokePool.end();
    this.state = { size: si, stage, frame, flameOn, heat: +heat.toFixed(2), light: +light.toFixed(2), dying, fade };
    return true;
  }

  destroy() {
    for (const o of [this.root, this.glow]) {
      if (o && !o.destroyed) { if (o.parent) o.parent.removeChild(o); o.destroy({ children: true }); }
    }
  }
}

export class CampfireFx {
  /** @param body the depth-sorted entity layer; @param ground a ground layer under everything */
  constructor(body, ground) {
    this.body = body;
    this.ground = ground || body;
    this.fires = new Map();
    atlas();   /* minted with the renderer, never on the first fire (the preloading LAW) */
  }

  _records(S, now) {
    const out = [];
    const own = S && S._campfire;
    if (own && !(own.expiresAt && now > own.expiresAt)) out.push(['self', own]);
    const peers = S && S._peerCampfires;
    if (peers && peers.size) {
      for (const [id, cf] of peers) {
        if (!cf || (cf.expiresAt && now > cf.expiresAt)) { peers.delete(id); continue; }
        out.push(['p:' + id, cf]);
      }
    }
    return out;
  }

  update(S, now) {
    const zone = S && S.currentZone;
    const seen = new Set();
    for (const [key, cf] of this._records(S, now)) {
      /* v2.3.1748's rule, kept: a fire belongs to the zone it was lit in */
      if (cf.zone && zone && cf.zone !== zone) continue;
      let f = this.fires.get(key);
      /* a new fire under the same key (you lit another) -- the old one dies
         down where it was while the new one catches */
      if (f && cf.litAt && cf.litAt !== f.litAt && !f.dyingAt) {
        this.fires.delete(key);
        this.fires.set(key + '#' + f.litAt, f);
        f = null;
      }
      if (!f) { f = new Fire(this.body, this.ground, key, cf, now); this.fires.set(key, f); }
      seen.add(key);
      const scale = zonePlayerScale(zone, cf.x, cf.y, TILE) || 1;
      f.step(cf, now, scale, cf.expiresAt ? cf.expiresAt - now : null);
    }
    for (const [key, f] of this.fires) {
      if (seen.has(key)) continue;
      /* gone because we LEFT the zone: no embers in the next one */
      if (f.zone && zone && f.zone !== zone) { f.destroy(); this.fires.delete(key); continue; }
      const scale = zonePlayerScale(zone, f.x, f.y, TILE) || 1;
      if (!f.step(null, now, scale, 0)) { f.destroy(); this.fires.delete(key); }
    }
  }

  clear() {
    for (const f of this.fires.values()) f.destroy();
    this.fires.clear();
  }

  /* QA (mp-campfire): what is drawn, per fire -- pooled sprites say nothing
     about which layer a fire sorted into or what stage its logs are at */
  probe() {
    const T = atlas();
    const src = T.base && T.base.source;
    const fires = [];
    for (const [key, f] of this.fires) {
      fires.push({
        key, x: f.x, y: f.y, ...f.state,
        embers: f.embers.length, smoke: f.smoke.length,
        layer: f.root.parent ? (f.root.parent.label || f.root.parent.name || 'layer') : null,
        parentIsBody: f.root.parent === this.body,
        flameH: f.flame.visible ? +(f.flame.height).toFixed(1) : 0,
        glowAlpha: +f.glow.alpha.toFixed(3),
      });
    }
    return {
      fires, pix: PIX,
      nearest: !!(src && (src.scaleMode === 'nearest' || (src.style && src.style.scaleMode === 'nearest'))),
    };
  }
}
