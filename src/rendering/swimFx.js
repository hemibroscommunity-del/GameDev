/* ═══ v2.3.3003: A SWIMMER IS A HEAD IN THE WATER ═══
 *
 * Owner, 2026-10-03: "I'm thinking you can add swimming and just use the
 * characters head poking out of the water plus code effects to make it look
 * like swimming and change the movement behavior".
 *
 * Run once a frame AFTER the depth pass and BEFORE the lights (pixiRenderer),
 * so a swimmer is sorted where it swims and casts no shadow:
 *   - the figure SINKS until its neck (entityRenderer figureSwimLine) is at
 *     the water's surface -- the ground point it swims at -- and a mask cut
 *     there hides the rest; eased over SINK_MS going in and RISE_MS coming
 *     out, so you wade in and climb out;
 *   - the head BOBS: with each stroke while you swim, slowly while you tread;
 *   - drawn ON the water (groundSplatter, under every figure): the ring of
 *     foam round your neck, whose front arc runs along the cut; ripples from
 *     every stroke; a V of wake and a trail of small rings behind you; and
 *     your body as a dark shape under the surface, trailing behind as you
 *     swim and hanging under you as you tread;
 *   - drawn OVER it (gestureFront, above the figures): each stroke's splash
 *     at one side and then the other -- the arms -- and a burst of drops
 *     going in or coming out.
 * Yours follows game/wheelSwim.js (your walk and the refusals hang on it);
 * another player's is decided here by the same test at their boots
 * (wheelSwim wetProbes/swimNext), so nothing new goes over the wire.  A
 * swimmer carries `_swimK` (how far under, 0-1): lightfx/casters.js and
 * glint.js skip it, as its armour is under the water.  Nothing outside the
 * Wheel; `?noswim` turns it all off with the swimming.
 */
import { Graphics } from 'pixi.js';
import { figureSwimLine } from './systems/entityRenderer.js';
import { isWheelTrialZone } from '../game/worldTrial.js';
import { wheelWaterAt, wheelSwimOn, wheelSwimCell } from '../game/wheelTrial.js';
import { wetProbes, swimNext, isWheelSwimming, STROKE_MS, SWIM_MULT, JUMP_PX } from '../game/wheelSwim.js';

const SINK_MS = 320;          /* wading in: on land to only a head */
const RISE_MS = 240;          /* and climbing out */
const FLIP_MS = 200;          /* another player: never in and out again inside this */
const BOB_SWIM = 1.3;         /* world px, with each stroke */
const BOB_TREAD = 0.9;        /* world px, treading water */
const TREAD_HZ = 0.55;
/* the mask, in the figure's own units: wide enough for any weapon, tall
   enough for the name plate and bars over the head */
const MASK_W = 420, MASK_H = 1100;
/* a figure moving slower than this (world px a second) treads water */
const STILL_PX_S = 14;
/* a walk's speed in world px a second, for another player's stroke clock
   (their swim is SWIM_MULT of it; the clock runs with how near they are) */
const WALK_PX_S = 175;
const FOAM = 0xf2fbff, WAKE = 0xe6f6ff, DEEP = 0x042a36, DROP = 0xd8f2ff;
const MAX_RIPPLES = 90, MAX_DROPS = 160;

export class SwimFx {
  constructor(layers) {
    const L = layers || {};
    this.under = new Graphics();
    this.under.label = 'swimUnder';
    this.over = new Graphics();
    this.over.label = 'swimOver';
    (L.groundSplatter || L.groundDetails || L.tiles).addChild(this.under);
    /* over the swimmer's own head -- the drops and the arms' splashes are
       thrown up in front of it (the `player` layer's order is the order
       things were added, and your figure is added after this) */
    (L.gestureFront || L.particles || L.entities).addChild(this.over);
    this._st = new Map();       /* 'self' | peer id -> one figure's swim */
    this._ripples = [];         /* { x, y, t0, ms, r0, r1, a, w } */
    this._drops = [];           /* { x, y, z, vx, vy, vz, t0, s } */
    this._arcs = [];            /* a stroke's splash: { x, y, t0, side, u } */
    this._last = 0;
    this._drawn = false;
    this._probe = { self: null, peers: 0, swimmers: 0, ripples: 0, drops: 0, ms: 0 };
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btSwimFx = () => self._probe;
      /* QA (mp-wheelswim): at a ground point, is its cell open to swim in,
         and is the ground drawn there water (null: not laid yet) */
      window.__btSwimAt = (x, y) => ({ swim: wheelSwimCell(x, y), water: wheelWaterAt(x, y) });
    }
  }

  /* undo a figure's sink and mask -- left the water, the Wheel, or gone */
  _unsink(d) {
    if (!d || d.destroyed) return;
    if (d._swimY != null && d.y === d._swimY) d.y -= d._swimDy || 0;
    d._swimY = null;
    d._swimDy = 0;
    d._swimK = 0;
    const m = d._swimMask;
    if (m) {
      if (d.mask === m) d.mask = null;
      if (!m.destroyed) {
        if (m.parent) m.parent.removeChild(m);
        m.destroy();
      }
      d._swimMask = null;
    }
  }

  _mask(d) {
    let m = d._swimMask;
    if (m && !m.destroyed && m.parent === d) return m;
    m = new Graphics();
    m.label = 'swimMask';
    m.rect(-MASK_W, -MASK_H, MASK_W * 2, MASK_H).fill(0xffffff);
    d.addChild(m);
    d._swimMask = m;
    return m;
  }

  _stOf(key) {
    let st = this._st.get(key);
    if (!st) {
      st = { on: false, at: 0, k: 0, ph: 0, strokes: -1, side: 1, lx: NaN, ly: NaN, vx: 0, vy: 0, nextRip: 0, d: null, seen: 0 };
      this._st.set(key, st);
    }
    return st;
  }

  update(S, er, now) {
    const t0 = performance.now();
    const dt = this._last ? Math.max(0, Math.min(100, now - this._last)) : 16;
    this._last = now;
    const live = !!(S && S.player && er && isWheelTrialZone(S.currentZone) && wheelSwimOn());
    let swimmers = 0;
    const stamp = now;
    if (live) {
      /* you */
      const pd = er.playerDisplay;
      if (pd && !pd.destroyed) {
        const st = this._stOf('self');
        if (st.d && st.d !== pd) this._unsink(st.d);
        st.d = pd;
        st.seen = stamp;
        const sw = S._wheelSwim;
        swimmers += this._figure(st, pd, isWheelSwimming(S), now, dt, sw || null);
      }
      /* other players in the Wheel with you */
      if (er.otherPlayerDisplays) {
        const others = S.others || null;
        for (const [id, d] of er.otherPlayerDisplays) {
          if (!d || d.destroyed) continue;
          const o = others && others[id];
          const st = this._stOf(id);
          if (st.d && st.d !== d) this._unsink(st.d);
          st.d = d;
          st.seen = stamp;
          if (!o || (o.zone || o.z || 'town') !== S.currentZone || !d.visible) {
            st.k = 0; st.on = false;
            this._unsink(d);
            continue;
          }
          swimmers += this._figure(st, d, this._peerOn(st, d, now), now, dt, null);
        }
      }
    }
    /* whoever was not seen this frame: put back and forget */
    for (const [key, st] of this._st) {
      if (st.seen === stamp) continue;
      this._unsink(st.d);
      this._st.delete(key);
    }
    this._draw(now);
    const self = this._st.get('self');
    const p = this._probe;
    p.self = self && self.d && !self.d.destroyed ? {
      on: self.on, k: +self.k.toFixed(3), cut: self._cut != null ? +self._cut.toFixed(2) : null,
      sink: +(self.d._swimDy || 0).toFixed(2), masked: !!(self.d._swimMask && self.d.mask === self.d._swimMask),
      surface: self._fy != null ? +self._fy.toFixed(1) : null, speed: +Math.sqrt(self.vx * self.vx + self.vy * self.vy).toFixed(1),
      strokes: self.strokes,
    } : null;
    p.peers = 0;
    for (const [key, st] of this._st) if (key !== 'self' && st.k > 0) p.peers++;
    p.swimmers = swimmers;
    p.ripples = this._ripples.length;
    p.drops = this._drops.length;
    p.ms = +(performance.now() - t0).toFixed(3);
  }

  /* another player: the same test as yours (wheelSwim.js), at their boots */
  _peerOn(st, d, now) {
    const line = figureSwimLine(d);
    const base = d._swimY != null && d.y === d._swimY ? d.y - (d._swimDy || 0) : d.y;
    const fy = base + line.feet * d.scale.y;
    const wet = wetProbes(wheelWaterAt, d.x, fy);
    const next = swimNext(st.on, wet);
    /* (a teleport flips at once: see _figure) */
    const jumped = st.lx === st.lx && (Math.abs(d.x - st.lx) > JUMP_PX || Math.abs(fy - st.ly) > JUMP_PX);
    if (next !== st.on && (jumped || now - st.at >= FLIP_MS)) {
      st.on = next;
      st.at = now;
      st.ph = 0;
    }
    return st.on;
  }

  /* One figure, this frame.  Returns 1 while it is in the water at all. */
  _figure(st, d, on, now, dt, sw) {
    /* where it would stand: entityRenderer set d.y this frame, unless it
       left it alone -- then it is still the y this sank it to */
    const base = d._swimY != null && d.y === d._swimY ? d.y - (d._swimDy || 0) : d.y;
    const sy = d.scale.y || 1;
    const line = figureSwimLine(d);
    const fx = d.x, fy = base + line.feet * sy;
    /* a teleport -- a respawn, a way in -- is in or out of the water at once,
       with no splash where it left or where it lands */
    const jumped = st.lx === st.lx && (Math.abs(fx - st.lx) > JUMP_PX || Math.abs(fy - st.ly) > JUMP_PX);
    if (jumped) {
      st.k = on ? 1 : 0;
      st._was = on;
      st.vx = 0;
      st.vy = 0;
    }
    /* how fast it goes, smoothed (world px a second) */
    if (!jumped && st.lx === st.lx && dt > 0) {
      const ivx = (fx - st.lx) * 1000 / dt, ivy = (fy - st.ly) * 1000 / dt;
      /* a jump (a teleport, a respawn) is not a speed */
      if (Math.abs(ivx) < 900 && Math.abs(ivy) < 900) {
        const a = Math.min(1, dt / 120);
        st.vx += (ivx - st.vx) * a;
        st.vy += (ivy - st.vy) * a;
      }
    }
    st.lx = fx; st.ly = fy;
    const wasIn = st.k > 0;
    st.on = on;
    st.k = Math.max(0, Math.min(1, st.k + (on ? dt / SINK_MS : -dt / RISE_MS)));
    if (on && !st._was) this._burst(fx, fy, this._u(line, sy), 'in', st);
    if (!on && st._was) this._burst(fx, fy, this._u(line, sy), 'out', st);
    st._was = on;
    if (st.k <= 0) {
      if (wasIn || d._swimMask) this._unsink(d);
      st._cut = null;
      st._fy = null;
      return 0;
    }
    const speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
    const moving = speed > STILL_PX_S;
    /* the stroke's clock: yours is wheelSwim's, theirs runs here */
    let stroke = false;
    if (sw) {
      st.ph = sw.ph || 0;
      if (st.strokes < 0) st.strokes = sw.strokes;
      else if (sw.strokes !== st.strokes) { st.strokes = sw.strokes; stroke = true; }
    } else if (on && moving) {
      const ph = st.ph + (dt / STROKE_MS) * Math.min(1, speed / (WALK_PX_S * SWIM_MULT));
      st.ph = ph - Math.floor(ph);
      if (ph >= 1) stroke = true;
    }
    const bob = on
      ? (moving ? BOB_SWIM * Math.sin(st.ph * Math.PI * 2) : BOB_TREAD * Math.sin(now / 1000 * Math.PI * 2 * TREAD_HZ))
      : 0;
    /* sink the figure until its neck is at the surface, and cut it there */
    const depth = (line.feet - line.water) * sy;
    const sink = (depth + bob) * st.k;
    d.y = base + sink;
    d._swimY = d.y;
    d._swimDy = sink;
    d._swimK = st.k;
    const m = this._mask(d);
    m.visible = true;    /* the death sweep hides what it does not keep (entityRenderer _hideExceptDeep) */
    const cut = (fy - d.y) / sy;
    m.y = cut;
    if (d.mask !== m) d.mask = m;
    st._cut = cut;
    st._fy = fy;
    if (!d.visible) return 1;
    /* what it leaves on the water */
    const u = this._u(line, sy);
    if (stroke) {
      st.side = -st.side;
      this._stroke(fx, fy, u, st);
    }
    if (on && now >= st.nextRip) {
      if (moving) {
        this._ring(fx, fy, now, 700, 6 * u, 16 * u, 0.5, 1.4);
        st.nextRip = now + 160;
      } else {
        this._ring(fx, fy, now, 1300, 10 * u, 26 * u, 0.55, 1.5);
        st.nextRip = now + 1000;
      }
    }
    st._u = u;
    st._speed = speed;
    return 1;
  }

  /* how big this figure is drawn, against a standing bro on a flat map:
     the crown-to-neck height of the head, ~28 world px there */
  _u(line, sy) {
    return Math.max(0.3, Math.min(2, ((line.water - line.crown) * sy) / 28));
  }

  _ring(x, y, now, ms, r0, r1, a, w) {
    if (this._ripples.length >= MAX_RIPPLES) this._ripples.shift();
    this._ripples.push({ x, y, t0: now, ms, r0, r1, a, w });
  }

  _stroke(fx, fy, u, st) {
    const now = this._last;
    const side = st.side;
    const sp = Math.sqrt(st.vx * st.vx + st.vy * st.vy) || 1;
    const ux = st.vx / sp, uy = st.vy / sp;
    /* the arm comes down beside the head, a little ahead of it */
    const ax = fx + side * 11 * u + ux * 6 * u, ay = fy + uy * 3 * u;
    this._arcs.push({ x: ax, y: ay, t0: now, side, u });
    if (this._arcs.length > 24) this._arcs.shift();
    this._ring(ax, ay, now, 950, 4 * u, 22 * u, 0.7, 1.6);
    const n = 4 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      this._drop(ax, ay, side * (15 + Math.random() * 40) + ux * 25, uy * 12 + (Math.random() - 0.5) * 18,
        55 + Math.random() * 60, 1 + Math.random() * 1.2, now);
    }
  }

  _burst(x, y, u, how, st) {
    const now = this._last;
    const big = how === 'in';
    this._ring(x, y, now, big ? 1100 : 800, 6 * u, (big ? 34 : 20) * u, big ? 0.6 : 0.45, 1.6);
    if (big) this._ring(x, y, now + 140, 900, 4 * u, 22 * u, 0.4, 1.2);
    const n = big ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 35 : 20) + Math.random() * (big ? 55 : 30);
      this._drop(x + Math.cos(ang) * 6 * u, y + Math.sin(ang) * 3 * u, Math.cos(ang) * sp, Math.sin(ang) * sp * 0.5,
        (big ? 80 : 45) + Math.random() * 60, 1.1 + Math.random() * 1.4, now);
    }
    if (st) st.nextRip = now + 300;
  }

  _drop(x, y, vx, vy, vz, s, now) {
    if (this._drops.length >= MAX_DROPS) this._drops.shift();
    this._drops.push({ x, y, z: 2, vx, vy, vz, t0: now, s });
  }

  _draw(now) {
    const g = this.under, o = this.over;
    const any = this._ripples.length || this._drops.length || this._arcs.length;
    let swimming = false;
    for (const st of this._st.values()) if (st.k > 0 && st.d && !st.d.destroyed && st.d.visible) { swimming = true; break; }
    if (!any && !swimming) {
      if (this._drawn) { g.clear(); o.clear(); this._drawn = false; }
      return;
    }
    this._drawn = true;
    g.clear();
    o.clear();
    /* each swimmer's body under the surface, then the wake and its foam */
    for (const st of this._st.values()) {
      if (!(st.k > 0) || !st.d || st.d.destroyed || !st.d.visible || st._fy == null) continue;
      const u = st._u || 1, k = st.k;
      const fx = st.lx, fy = st._fy;
      const sp = st._speed || 0;
      const sk = Math.max(0, Math.min(1, (sp - STILL_PX_S) / 60));
      const wob = Math.sin(now * 0.004 + fx * 0.05) * 0.8 * u;
      /* treading: the body hangs under you, seen through the water */
      if (sk < 1) this._oval(g, fx + wob, fy + 13 * u, 7.5 * u, 14 * u, 0, DEEP, 0.3 * k * (1 - sk));
      if (sk > 0) {
        const ux = st.vx / (sp || 1), uy = st.vy / (sp || 1);
        /* swimming: it trails behind you, flattened by the view */
        const bx = -ux, by = -uy * 0.6;
        const bl = Math.sqrt(bx * bx + by * by) || 1;
        const L = 22 * u;
        this._oval(g, fx + (bx / bl) * (L * 0.55) + wob, fy + 3 * u + (by / bl) * (L * 0.55), L * 0.62, 7 * u,
          Math.atan2(by, bx), DEEP, 0.3 * k * sk);
        /* the V of wake, longer the faster */
        const wl = (10 + 26 * sk) * u;
        for (const s of [-1, 1]) {
          const a = Math.atan2(-uy * 0.55, -ux) + s * 0.5;
          g.moveTo(fx + s * 4 * u * -uy, fy + 1 + s * 2 * u * ux);
          g.lineTo(fx + Math.cos(a) * wl, fy + 1 + Math.sin(a) * wl);
        }
        g.stroke({ color: WAKE, width: 1.6, alpha: 0.6 * sk * k });
      }
      /* the head's own shade on the water, toward the lower right as the
         Wheel's sun falls (lightfx casts nothing for a swimmer) */
      g.ellipse(fx + 3 * u, fy + 2.2 * u, 10 * u, 3.6 * u).fill({ color: DEEP, alpha: 0.22 * k });
      /* the ring round the neck: its back half behind the head, its front
         half along the cut */
      const br = 1 + 0.06 * Math.sin(now * 0.006 + fx);
      g.ellipse(fx, fy, 11.5 * u * br, 4.2 * u * br).fill({ color: FOAM, alpha: 0.28 * k });
      g.ellipse(fx, fy, 11.5 * u * br, 4.2 * u * br).stroke({ color: FOAM, width: 1.7, alpha: 0.9 * k });
    }
    /* ripples: rings that spread and fade */
    const keep = [];
    for (const r of this._ripples) {
      const t = (now - r.t0) / r.ms;
      if (t >= 1) continue;
      keep.push(r);
      if (t < 0) continue;
      const e = 1 - (1 - t) * (1 - t);
      const rr = r.r0 + (r.r1 - r.r0) * e;
      /* a crest and its trough: the light ring alone was lost in the water
         pictures' own white lines, the dark one under it shows on the
         light shallows and the light one on the deep blue */
      if (rr > r.w * 2) g.ellipse(r.x, r.y + 0.6, rr - r.w, (rr - r.w) * 0.38).stroke({ color: DEEP, width: r.w, alpha: r.a * 0.45 * (1 - t) });
      g.ellipse(r.x, r.y, rr, rr * 0.38).stroke({ color: FOAM, width: r.w, alpha: r.a * (1 - t) });
    }
    this._ripples = keep;
    /* each stroke's splash: a crescent of water thrown up at the arm */
    const arcs = [];
    for (const a of this._arcs) {
      const t = (now - a.t0) / 260;
      if (t >= 1) continue;
      arcs.push(a);
      const r = (3 + 5 * t) * a.u;
      o.arc(a.x, a.y - 2 * a.u * (1 - t), r, Math.PI * 1.05, Math.PI * 1.95).stroke({ color: FOAM, width: 1.6, alpha: 0.85 * (1 - t) });
    }
    this._arcs = arcs;
    /* drops: up, and back down into the water */
    const dts = this._dropDt(now);
    const drops = [];
    for (const p of this._drops) {
      p.vz -= 420 * dts;
      p.z += p.vz * dts;
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      if (p.z <= 0 && p.vz < 0) continue;
      drops.push(p);
      o.rect(p.x - p.s / 2, p.y - p.z - p.s / 2, p.s, p.s).fill({ color: DROP, alpha: 0.9 });
    }
    this._drops = drops;
  }

  _dropDt(now) {
    const last = this._dropLast || now;
    this._dropLast = now;
    return Math.max(0, Math.min(0.1, (now - last) / 1000));
  }

  /* an oval at any angle, as a polygon (Graphics' own ellipse is upright) */
  _oval(g, cx, cy, a, b, ang, color, alpha) {
    if (!(alpha > 0.005)) return;
    const pts = [];
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < 18; i++) {
      const t = (i / 18) * Math.PI * 2;
      const x = Math.cos(t) * a, y = Math.sin(t) * b;
      pts.push(cx + x * ca - y * sa, cy + x * sa + y * ca);
    }
    g.poly(pts, true).fill({ color, alpha });
  }
}
