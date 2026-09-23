/* ═══ v2.3.2720: AMBIENT LIFE ON THE MAPS ═══
 *
 * Owner: "make subtle effects that appear as animations on the worldview?
 * Lava smoke on the fire mountain maybe shimmering a bit on the lava, winds on
 * the desert wind area, water softly waving, etc. also doing a pass on each of
 * the 4 currently playable zones to see what effect like this can be added
 * (maybe occasional soft snowflakes on snow level, etc)".
 *
 * The maps are single still paintings; this puts a thin layer of motion on
 * them.  WHERE each effect belongs was measured offline from the paintings'
 * own colours (tools/maps/build_ambient_spots.py -> src/data/ambientSpots.js:
 * the lava, the water, the vents, the desert / snow / blossom areas), so the
 * client never reads map pixels.  What plays, per map:
 *
 *   worldview  the volcano smokes from its crater and its lava flows breathe
 *              with a slow glow, a few embers lift off them; the sea and the
 *              western river glint and ripple; wind streaks and blown sand run
 *              across the desert; a few flakes drift over the snowy peaks;
 *              petals fall through the cherry grove.
 *   ember      every lava channel shimmers and the hottest vents smoke.
 *   sky        wind streaks you can see, and dust lifting off the dune crests.
 *   verdant    the pools ripple and glint.
 *   frost      the sea's edge ripples and glints; the ice twinkles.
 * (The spokes' pollen, fireflies, embers, sand and snow are v2.3.2712's
 * worldFx air -- see ZONE_FX below for why this does not repeat them.)
 *
 * SUBTLE, by the owner's word: every effect is low-alpha, slow, and sparse --
 * the point is that the world is alive, not that it is busy.
 *
 * COST.  Everything is a pooled Sprite over one of four textures MINTED here
 * from canvases (a soft dot, a streak, a sparkle, a petal), so the whole layer
 * batches and there is nothing to download -- the preloading LAW is satisfied
 * by construction.  Air particles are capped per map and only spawned inside
 * the camera's view (plus a margin); ground glows exist once per spot but are
 * hidden off-screen.  The v2.3.2331 rule applies: sprites, never per-frame
 * Graphics circles.
 *
 * LAYERS.  Glows and water light lie ON the ground (`groundDetails`, above the
 * map, under everything standing on it); smoke, embers, wind, snow, motes and
 * petals are in the AIR (`foreground`, in front of the characters and under
 * the damage numbers -- v2.3.2655 made that layer for things nearer the camera
 * than the scene, and weather is).
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { ZONES } from '../../data/zones.js';
import { TILE } from '../../data/constants.js';
import { AMBIENT_SPOTS } from '../../data/ambientSpots.js';

/* ── the four minted textures ── */
let _TEX = null;
function tex() {
  if (_TEX) return _TEX;
  const mk = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return Texture.from(c);
  };
  _TEX = {
    /* soft round dot: glows, motes, snow, embers, smoke puffs */
    dot: mk(32, 32, (x) => {
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    }),
    /* a horizontal streak, bright in the middle, tapering to nothing */
    streak: mk(64, 6, (x) => {
      const g = x.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(32, 3, 32, 2.6, 0, 0, Math.PI * 2); x.fill();
    }),
    /* a four-point twinkle */
    sparkle: mk(24, 24, (x) => {
      const arm = (dx, dy) => {
        const g = x.createLinearGradient(12 - dx * 12, 12 - dy * 12, 12 + dx * 12, 12 + dy * 12);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.strokeStyle = g; x.lineWidth = 2;
        x.beginPath(); x.moveTo(12 - dx * 12, 12 - dy * 12); x.lineTo(12 + dx * 12, 12 + dy * 12); x.stroke();
      };
      arm(1, 0); arm(0, 1);
      const g = x.createRadialGradient(12, 12, 0, 12, 12, 5);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 24, 24);
    }),
    /* a petal: a small soft-edged teardrop */
    petal: mk(12, 8, (x) => {
      x.fillStyle = 'rgba(255,255,255,1)';
      x.beginPath(); x.ellipse(6, 4, 5.5, 3, 0, 0, Math.PI * 2); x.fill();
    }),
  };
  return _TEX;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* ═══ WHAT PLAYS WHERE ═══
 * `k` scales every size and speed: the worldview is a vista, 1536 world px for
 * the whole continent, so a snowflake there is a third of one in Frost Ridge.
 * The air emitters are { kind, rate (per second, over the whole map area it
 * covers), cap (alive at once), where }. */
const ZONE_FX = {
  /* v2.3.2720: k 0.55 -> 0.75 after an on/off diff of the real render showed
     the vista's effects under two screen px -- too far for 'subtle' to read */
  worldview: { k: 0.75, glow: 'lava', ripples: true, air: [
    { kind: 'smoke', where: 'vents', rate: 1.6, cap: 12 },
    { kind: 'ember', where: 'lava', rate: 2.5, cap: 10 },
    { kind: 'glint', where: 'water', rate: 5, cap: 14 },
    { kind: 'wind', where: 'desert', rate: 2.2, cap: 7 },
    { kind: 'sand', where: 'desert', rate: 5, cap: 16 },
    { kind: 'snow', where: 'snow', rate: 4, cap: 22 },
    { kind: 'petal', where: 'blossom', rate: 1.2, cap: 8 },
  ] },
  /* ═══ v2.3.2720: WITH worldFx's AIR, NOT ON TOP OF IT ═══
     v2.3.2712 (worldFx.js ZONE_AIR, merged while this was being built) already
     fills the spokes' AIR: pollen and fireflies in verdant, embers in ember,
     blowing sand in the dunes, snow in frost, on one shared breeze.  Doubling
     those would make the air busy, which is the one thing the owner's
     "subtle" rules out -- so in the spokes this file adds only what that one
     does not draw: the lava's shimmer and the vents' smoke, wind you can SEE,
     dust off the dune crests, and the water's light and the ice's twinkle.
     The worldview has no ZONE_AIR entry, so it keeps its whole set above. */
  ember: { k: 1, glow: 'lava', air: [
    { kind: 'smoke', where: 'vents', rate: 2.2, cap: 16 },
  ] },
  sky: { k: 1, air: [
    { kind: 'wind', where: 'view', rate: 5, cap: 14 },
    { kind: 'dust', where: 'dunes', rate: 1.2, cap: 6 },
  ] },
  verdant: { k: 1, ripples: true, air: [
    { kind: 'glint', where: 'water', rate: 2, cap: 6 },
  ] },
  frost: { k: 1, ripples: true, air: [
    { kind: 'glint', where: 'water', rate: 4, cap: 10 },
    { kind: 'twinkle', where: 'ice', rate: 1.5, cap: 5 },
  ] },
};

/* Which particle kinds are drawn with additive light. */
const ADD = { ember: 1, glint: 1, twinkle: 1, mote: 1 };
/* Which kinds lie on the ground rather than in the air. */
const GROUND = { glint: 1, twinkle: 1 };

export class AmbientFx {
  constructor(layers) {
    this.ground = new Container();
    this.ground.label = 'ambientGround';
    this.air = new Container();
    this.air.label = 'ambientAir';
    /* things that GIVE light -- the lava, its embers -- go in `glows`, drawn
       after v2.3.2712's night multiplies the world, so lava still shines in
       the dark (worldFx puts its fireflies there for the same reason) */
    this.glow = new Container();
    this.glow.label = 'ambientGlow';
    if (layers.groundDetails) layers.groundDetails.addChild(this.ground);
    if (layers.foreground) layers.foreground.addChild(this.air);
    (layers.glows || layers.groundDetails || layers.foreground).addChild(this.glow);
    this.zone = null;
    this.cfg = null;
    this.glows = [];      /* persistent ground glows / ripples */
    this.parts = [];      /* live air + ground particles */
    this.free = [];       /* pooled sprites, both layers draw from it */
    this.acc = Object.create(null);
    this.lastT = 0;
  }

  _world(zoneId) {
    const z = ZONES[zoneId];
    return z ? { W: z.w * TILE, H: z.h * TILE } : { W: 1024, H: 1024 };
  }

  _sprite(texture, parent) {
    let sp = this.free.pop();
    if (!sp || sp.destroyed) sp = new Sprite();
    sp.texture = texture;
    sp.anchor.set(0.5, 0.5);
    sp.rotation = 0;
    sp.visible = true;
    if (sp.parent !== parent) parent.addChild(sp);
    return sp;
  }

  _release(sp) {
    sp.visible = false;
    this.free.push(sp);
  }

  /** Called on every zone change (pixiRenderer.onZoneChange). */
  setZone(zoneId) {
    if (zoneId === this.zone) return;
    for (const p of this.parts) this._release(p.sp);
    for (const g of this.glows) this._release(g.sp);
    this.parts = []; this.glows = [];
    this.acc = Object.create(null);
    this.zone = zoneId;
    this.cfg = ZONE_FX[zoneId] || null;
    const spots = AMBIENT_SPOTS[zoneId];
    if (!this.cfg || !spots) return;
    const t = tex(), { W, H } = this._world(zoneId), k = this.cfg.k;
    /* THE LAVA BREATHES: one soft additive glow per lava spot, each on its own
       slow clock, plus a smaller hot core flickering faster -- the shimmer. */
    if (this.cfg.glow && spots[this.cfg.glow]) {
      for (const [u, v] of spots[this.cfg.glow]) {
        const x = u * W, y = v * H;
        const halo = this._sprite(t.dot, this.glow);
        halo.blendMode = 'add'; halo.tint = 0xff6a1a;
        const core = this._sprite(t.dot, this.glow);
        core.blendMode = 'add'; core.tint = 0xffc450;
        this.glows.push({ sp: halo, x, y, s: rnd(2.2, 3.2) * k, ph: rnd(0, 6.28), w: rnd(0.6, 1.2), a0: 0.08, a1: 0.32 });
        this.glows.push({ sp: core, x: x + rnd(-3, 3), y: y + rnd(-2, 2), s: rnd(0.7, 1.1) * k, ph: rnd(0, 6.28), w: rnd(2.2, 3.6), a0: 0.05, a1: 0.42 });
      }
    }
    /* THE WATER WAVES: a faint light line per water spot, sliding gently to
       and fro and breathing -- the surface moving under the light. */
    if (this.cfg.ripples && spots.water) {
      for (const [u, v] of spots.water) {
        const sp = this._sprite(t.streak, this.ground);
        sp.blendMode = 'add'; sp.tint = 0xcff4ff;
        this.glows.push({ sp, x: u * W, y: v * H, s: rnd(0.45, 0.8) * k, sy: 0.6, ph: rnd(0, 6.28), w: rnd(0.5, 0.9), a0: 0.05, a1: 0.3, sway: rnd(3, 7) * k });
      }
    }
  }

  /* One new particle of `kind`, somewhere in `where`, inside the view. */
  _spawn(kind, where, view) {
    const spots = AMBIENT_SPOTS[this.zone] || {};
    const t = tex(), { W, H } = this._world(this.zone), k = this.cfg.k;
    let x, y;
    if (where === 'view') {
      x = rnd(view.x - 40, view.x + view.w + 40); y = rnd(view.y - 40, view.y + view.h + 40);
    } else if (spots[where]) {
      const pt = pick(spots[where]);
      x = pt[0] * W + rnd(-6, 6) * k; y = pt[1] * H + rnd(-4, 4) * k;
    } else if (spots.areas && spots.areas[where]) {
      const b = spots.areas[where];
      x = rnd(b[0], b[2]) * W; y = rnd(b[1], b[3]) * H;
    } else return;
    /* only where someone can see it (with a margin, so things drift IN) */
    const M = 80;
    if (x < view.x - M || x > view.x + view.w + M || y < view.y - M || y > view.y + view.h + M) return;
    const parent = GROUND[kind] ? this.ground : (kind === 'ember' ? this.glow : this.air);
    const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, s0: 1, s1: 1, a: 0.3, sw: 0, ph: rnd(0, 6.28), rot: 0, vr: 0, sx: 1, sy: 1 };
    let sp;
    switch (kind) {
      case 'smoke':
        sp = this._sprite(t.dot, parent); sp.tint = pick([0x4a4440, 0x5a5450, 0x3a3634]);
        p.vx = rnd(6, 14) * k; p.vy = rnd(-26, -16) * k; p.life = rnd(3.5, 5.5);
        p.s0 = rnd(0.7, 1.0) * k; p.s1 = rnd(3.0, 4.2) * k; p.a = rnd(0.22, 0.34); p.sw = 4 * k;
        break;
      case 'ember':
        sp = this._sprite(t.dot, parent); sp.tint = pick([0xffb040, 0xff7a20, 0xffd070]);
        p.vx = rnd(-6, 10) * k; p.vy = rnd(-38, -20) * k; p.life = rnd(1.6, 3.2);
        p.s0 = p.s1 = rnd(0.18, 0.3) * k; p.a = rnd(0.75, 1); p.sw = 8 * k;
        break;
      case 'ash':
        sp = this._sprite(t.dot, parent); sp.tint = 0x8a8078;
        p.vx = rnd(4, 12); p.vy = rnd(4, 12); p.life = rnd(4, 7);
        p.s0 = p.s1 = rnd(0.1, 0.16); p.a = rnd(0.4, 0.6); p.sw = 10;
        break;
      case 'glint':
        sp = this._sprite(t.streak, parent); sp.tint = pick([0xffffff, 0xd8f6ff]);
        p.vx = rnd(-4, 4) * k; p.life = rnd(0.9, 1.8);
        p.sx = rnd(0.28, 0.48) * k; p.sy = 0.6; p.a = rnd(0.55, 0.85);
        break;
      case 'twinkle':
        sp = this._sprite(t.sparkle, parent); sp.tint = 0xf2fbff;
        p.life = rnd(0.7, 1.2); p.s0 = 0.3 * k; p.s1 = 0.8 * k; p.a = 0.9; p.vr = rnd(-0.6, 0.6);
        break;
      case 'wind':
        sp = this._sprite(t.streak, parent); sp.tint = 0xfff4e0;
        p.vx = rnd(170, 260) * k; p.vy = rnd(-8, 8) * k; p.life = rnd(1.0, 1.6);
        p.sx = rnd(2.0, 3.4) * k; p.sy = rnd(0.5, 0.8); p.a = rnd(0.3, 0.44); p.sw = 6 * k;
        x -= 60 * k;   /* start upwind, so it enters rather than appears */
        break;
      case 'sand':
        /* a shade DARKER than the sand it blows over -- the first cut matched
           the ground's own tan and could not be seen against it */
        sp = this._sprite(t.dot, parent); sp.tint = pick([0xa8804c, 0xb89060, 0x9a7444]);
        p.vx = rnd(110, 190) * k; p.vy = rnd(-10, 12) * k; p.life = rnd(1.4, 2.4);
        p.s0 = p.s1 = rnd(0.15, 0.24) * k; p.a = rnd(0.5, 0.75); p.sw = 5 * k;
        break;
      case 'dust':
        sp = this._sprite(t.dot, parent); sp.tint = 0xe2c490;
        p.vx = rnd(40, 70); p.vy = rnd(-12, -5); p.life = rnd(2.4, 3.6);
        p.s0 = 0.8; p.s1 = 3.2; p.a = rnd(0.16, 0.26); p.sw = 3;
        break;
      case 'snow':
        sp = this._sprite(t.dot, parent); sp.tint = 0xffffff;
        p.vx = rnd(-6, 6) * k; p.vy = rnd(16, 32) * k; p.life = rnd(5, 9);
        p.s0 = p.s1 = rnd(0.18, 0.32) * k; p.a = rnd(0.65, 0.95); p.sw = rnd(8, 16) * k;
        break;
      case 'mote':
        sp = this._sprite(t.dot, parent); sp.tint = pick([0xfff2a0, 0xd8ff90, 0xffe070]);
        p.vx = rnd(-8, 8); p.vy = rnd(-8, 4); p.life = rnd(4, 7);
        p.s0 = p.s1 = rnd(0.2, 0.34); p.a = rnd(0.6, 0.95); p.sw = 12;
        break;
      case 'petal':
        sp = this._sprite(t.petal, parent); sp.tint = pick([0xffc4dc, 0xffb0cc, 0xffe0ec]);
        p.vx = rnd(10, 20) * k; p.vy = rnd(10, 18) * k; p.life = rnd(4, 6);
        p.s0 = p.s1 = rnd(0.55, 0.85) * k; p.a = rnd(0.7, 0.95); p.sw = 10 * k; p.vr = rnd(-2, 2);
        break;
      default: return;
    }
    sp.blendMode = ADD[kind] ? 'add' : 'normal';
    p.x = x; p.y = y; p.sp = sp;
    this.parts.push(p);
  }

  /** Per frame.  (cx, cy, viewW, viewH): the camera's world rect. */
  update(S, cx, cy, viewW, viewH, now) {
    const zoneId = S && S.currentZone;
    if (zoneId !== this.zone) this.setZone(zoneId);
    const dt = Math.max(0, Math.min(0.1, ((now - (this.lastT || now)) / 1000)));
    this.lastT = now;
    /* QA / comparison switch: window.__btAmbientOff hides the whole layer. */
    const off = typeof window !== 'undefined' && !!window.__btAmbientOff;
    this.ground.visible = this.air.visible = this.glow.visible = !off;
    if (!this.cfg) return;
    const view = { x: cx, y: cy, w: viewW, h: viewH };
    const tsec = now / 1000;
    const M = 60;
    /* the persistent glows and ripples: breathe, sway, hide off-screen */
    for (const g of this.glows) {
      const on = g.x > view.x - M && g.x < view.x + view.w + M && g.y > view.y - M && g.y < view.y + view.h + M;
      g.sp.visible = on;
      if (!on) continue;
      const b = 0.5 + 0.5 * Math.sin(tsec * g.w + g.ph);
      g.sp.alpha = g.a0 + (g.a1 - g.a0) * b;
      g.sp.x = g.x + (g.sway ? Math.sin(tsec * g.w * 0.7 + g.ph) * g.sway : 0);
      g.sp.y = g.y;
      g.sp.scale.set(g.s, g.sy ? g.s * g.sy : g.s);
    }
    /* spawn, by rate, while under the cap */
    const alive = Object.create(null);
    for (const p of this.parts) alive[p.kind] = (alive[p.kind] || 0) + 1;
    for (const e of this.cfg.air) {
      const key = e.kind + '@' + e.where;
      this.acc[key] = (this.acc[key] || 0) + e.rate * dt;
      while (this.acc[key] >= 1) {
        this.acc[key] -= 1;
        if ((alive[e.kind] || 0) >= e.cap) { this.acc[key] = 0; break; }
        this._spawn(e.kind, e.where, view);
        alive[e.kind] = (alive[e.kind] || 0) + 1;
      }
    }
    /* move, fade, retire */
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      const f = p.t / p.life;
      if (f >= 1) { this._release(p.sp); this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const sp = p.sp;
      sp.x = p.x + (p.sw ? Math.sin(tsec * 1.3 + p.ph) * p.sw : 0);
      sp.y = p.y;
      /* in and out softly, with a full-strength middle: the first cut faded
         over the WHOLE life, so a particle spent most of it at a fraction of
         its alpha and the lot read as nothing on a phone (mp-ambient's
         captures, v2.3.2720). */
      const env = f < 0.15 ? f / 0.15 : (f > 0.7 ? (1 - f) / 0.3 : 1);
      if (p.kind === 'mote' || p.kind === 'twinkle') {
        sp.alpha = p.a * env * (0.55 + 0.45 * Math.sin(tsec * 3 + p.ph));
      } else sp.alpha = p.a * env;
      if (p.kind === 'glint' || p.kind === 'wind') {
        sp.scale.set(p.sx * (0.6 + 0.4 * env), p.sy);
      } else {
        const s = p.s0 + (p.s1 - p.s0) * f;
        sp.scale.set(s, s);
      }
      if (p.vr) sp.rotation += p.vr * dt;
    }
    /* QA probe, house style: what is alive, by kind -- a 2px ember cannot be
       counted off a screenshot. */
    if (typeof window !== 'undefined') {
      this._probeAt = (this._probeAt || 0) + 1;
      if ((this._probeAt & 15) === 0) {
        window.__btAmbient = { zone: this.zone, glows: this.glows.filter((g) => g.sp.visible).length, alive: Object.assign({}, alive),
          view: { x: Math.round(view.x), y: Math.round(view.y), w: Math.round(view.w), h: Math.round(view.h) } };
      }
    }
  }

  clear() {
    for (const p of this.parts) this._release(p.sp);
    this.parts = [];
  }
}
