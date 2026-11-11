/* ═══ v2.3.4800: THE WEAPON FEEL KIT -- the pictures ═══
 *
 * The owner's approved brief (2026-11-11, docs/specs/sword-feel.md): readiness
 * is shown ON THE WEAPON ITSELF, never a gauge or a bar; the release matches
 * what was built; the contact's payoff scales with strength.  This file draws
 * those for every weapon, in a world layer of its OWN ('weaponFeel',
 * pixiApp.js WORLD_LAYER_NAMES: a render group above the night's light, so a
 * glint is never darkened, under the damage numbers).  Whatever changes here
 * each frame -- a spark shown, a streak hidden -- rebuilds only this small
 * layer's draw list, never a big one's (TRAPS §218).
 *
 * PLACEHOLDERS (the combat-feel-pack pattern): three soft pictures minted on a
 * canvas once a renderer (a dot, a streak, a ring), kept on the graphics chip
 * only (gpuOnly.js keepOnGpuOnly), tinted per use -- never live Graphics
 * circles.  Nothing is fetched, so nothing waits on the loading screen.  The
 * owner's own art can replace them by name later (sword-feel.md "Art").
 *
 * ── THE API (for the bow and staff lanes) ──────────────────────────────────
 *
 * Game code never touches this file: it QUEUES effects (weaponFeel.js
 * pushFeelFx(S, ev)) and writes per-frame state on S; this layer drains the
 * queue each frame and calls each registered DRAWER.
 *
 *   events (S._feelFx), every field in world px / radians / ms (Date.now):
 *     { kind: 'arc', at, ang, arc: { dir, width, ms }, k, tier, who: 'self' }
 *         a cut's trail round the player (the arc read live, so it can widen)
 *     { kind: 'burst', at, x, y, ang, k, color }
 *         a contact's sparks, flung in a cone about `ang`, sized by k (0..1.3)
 *     { kind: 'pulse', at, x, y, k, color }
 *         a ring that swells and fades (a perfect strike, a stage landing)
 *     { kind: 'streak', at, x, y, ang, len, k, color }
 *         a flash along a line (a release: the bow's snap, the orb's blast)
 *
 *   drawers: registerFeelDrawer(fn) -- fn(fx, S, entityRenderer, now) is
 *     called each frame (the sword's blade gleam is the first one, below).
 *     Inside, a drawer may call:
 *       fx.glow(key, x, y, size, alpha, color)    one soft dot this frame,
 *                                                 by key (a bow's nock, an
 *                                                 orb); a key not drawn this
 *                                                 frame is hidden
 *       fx.line(key, x0, y0, x1, y1, thick, alpha, color)
 *                                                 one streak between two
 *                                                 points this frame (a blade's
 *                                                 glint, an aim line)
 *       fx.toLayer(displayObject, x, y)           a point in that object's
 *                                                 own space, in this layer's
 *
 *   window.__btWeaponFeelFx()   QA: what is drawn ({ active, glow, line, ... })
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { keepOnGpuOnly } from '../gpuOnly.js';
import { swordFeelOn } from '../../game/swordFeel.js';
import { staffFeelDraw } from './staffFeelFx.js';   /* v2.3.4803: the staff's drawer (the gathering orb, the push back) */

const POOL_MAX = 96;   /* sprites at most, all kinds: a sweep is 9, a burst up to 11 */
const ARC_SEGS = 9;
const ARC_R = 46;      /* the trail's radius round the bro's middle, px */
const BODY_DY = -6;    /* the trail a little over his place (S.player is his body's centre; the blade swings at the chest) */

const _drawers = [];
/** A weapon's per-frame drawer: fn(fx, S, entityRenderer, now). */
export function registerFeelDrawer(fn) { if (typeof fn === 'function' && !_drawers.includes(fn)) _drawers.push(fn); }

function mint(w, h, paint) {
  if (typeof document === 'undefined') return Texture.WHITE;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  paint(g, w, h);
  return Texture.from(cv);
}

export class WeaponFeelFx {
  constructor(layer, renderer) {
    this.layer = layer || null;
    this.renderer = renderer || null;
    this.root = new Container();
    this.root.label = 'weaponFeel';
    if (this.layer) this.layer.addChild(this.root);
    /* the three placeholders: a soft dot, a streak (soft along, hard across),
       a ring -- white, tinted per use */
    this.tex = {
      dot: mint(32, 32, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.65)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, w, h);
      }),
      streak: mint(64, 12, (g, w, h) => {
        const r = g.createLinearGradient(0, 0, w, 0);
        r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2 - 1, 0, 0, Math.PI * 2); g.fill();
      }),
      ring: mint(64, 64, (g, w, h) => {
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4;
        g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 8;
        g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.stroke();
      }),
    };
    /* the memory law: a picture made on a canvas that nothing reads back is
       kept on the graphics chip only */
    for (const k of Object.keys(this.tex)) { try { keepOnGpuOnly(this.renderer, this.tex[k].source); } catch (e) { /* the canvas stays: a few KB */ } }
    this.pool = [];
    this.free = [];
    this.active = [];      /* running effects: { kind, ev, sprites, t0 } */
    this.keyed = new Map(); /* drawer sprites by key: { spr, seen } */
    this._frame = 0;
    this.stats = { arcs: 0, bursts: 0, pulses: 0, streaks: 0, gleamAt: 0, glintDrawn: 0, maxMs: 0 };
  }

  _take(tex) {
    let s = this.free.pop();
    if (!s) {
      if (this.pool.length >= POOL_MAX) return null;
      s = new Sprite(tex);
      s.anchor.set(0.5, 0.5);
      s.blendMode = 'add';   /* light: set once, at birth (a blend change is structural) */
      s.visible = false;
      this.root.addChild(s);
      this.pool.push(s);
    }
    if (s.texture !== tex) s.texture = tex;
    s.visible = true;
    return s;
  }
  _give(s) { if (!s) return; s.visible = false; this.free.push(s); }

  /** A point in `obj`'s own space, in this layer's (null when it cannot). */
  toLayer(obj, x, y, out) {
    try { return this.root.toLocal({ x, y }, obj, out); } catch (e) { return null; }
  }

  _keyed(key, tex) {
    let k = this.keyed.get(key);
    if (!k) { const spr = this._take(tex); if (!spr) return null; k = { spr, seen: 0 }; this.keyed.set(key, k); }
    if (k.spr.texture !== tex) k.spr.texture = tex;
    if (!k.spr.visible) k.spr.visible = true;
    k.seen = this._frame;
    return k.spr;
  }
  /** One soft dot this frame, by key. */
  glow(key, x, y, size, alpha, color) {
    const s = this._keyed(key, this.tex.dot);
    if (!s) return null;
    s.x = x; s.y = y; s.rotation = 0;
    s.scale.set(Math.max(0.01, size / 32));
    s.alpha = alpha; s.tint = color == null ? 0xffffff : color;
    return s;
  }
  /** One streak between two points this frame, by key. */
  line(key, x0, y0, x1, y1, thick, alpha, color) {
    const s = this._keyed(key, this.tex.streak);
    if (!s) return null;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    s.x = (x0 + x1) / 2; s.y = (y0 + y1) / 2;
    s.rotation = Math.atan2(dy, dx);
    s.scale.set(Math.max(0.01, len / 64), Math.max(0.01, thick / 12));
    s.alpha = alpha; s.tint = color == null ? 0xffffff : color;
    return s;
  }

  _start(ev, now) {
    const e = { kind: ev.kind, ev, sprites: [], t0: ev.at || now, seeds: null };
    if (ev.kind === 'arc') {
      for (let i = 0; i < ARC_SEGS; i++) { const s = this._take(this.tex.streak); if (s) { s.alpha = 0; e.sprites.push(s); } }
      this.stats.arcs++;
    } else if (ev.kind === 'burst') {
      const k = Math.max(0.3, Math.min(1.4, ev.k || 1));
      const n = Math.round(4 + 6 * Math.min(1, k));
      e.seeds = [];
      const core = this._take(this.tex.dot);
      if (core) e.sprites.push(core);
      for (let i = 0; i < n; i++) {
        const s = this._take(this.tex.streak);
        if (!s) break;
        const spread = (Math.random() - 0.5) * 2.4;   /* a cone about the cut's way */
        const sp = (120 + Math.random() * 160) * k;
        e.seeds.push({ a: (ev.ang || 0) + spread, sp });
        e.sprites.push(s);
      }
      this.stats.bursts++;
    } else if (ev.kind === 'pulse') {
      const s = this._take(this.tex.ring); if (s) e.sprites.push(s);
      this.stats.pulses++;
    } else if (ev.kind === 'streak') {
      const s = this._take(this.tex.streak); if (s) e.sprites.push(s);
      this.stats.streaks++;
    } else return null;
    return e;
  }

  /* one effect's frame; false when it is over */
  _step(e, S, now) {
    const ev = e.ev, t = now - e.t0;
    if (e.kind === 'arc') {
      const arc = ev.arc || { dir: 1, width: 1.6, ms: 300 };
      const dur = Math.max(60, arc.ms || 300);
      const p = t / dur;
      if (p > 1.6) return false;
      const P = S && S.player;
      if (!P) return false;
      const cx = P.x, cy = P.y + BODY_DY;
      const a0 = ev.ang - arc.dir * arc.width / 2, span = arc.dir * arc.width;
      const k = Math.max(0.4, Math.min(1.3, ev.k || 1));
      const segLen = (ARC_R * arc.width / (ARC_SEGS - 1)) * 1.9;
      const color = ev.tier === 'perfect' ? 0xffe2a0 : ev.tier === 'light' ? 0xdfe8ff : 0xffffff;
      for (let i = 0; i < e.sprites.length; i++) {
        const s = e.sprites[i];
        const f = i / (ARC_SEGS - 1);
        const age = p - f;   /* how long ago the blade's point passed this piece, in sweeps */
        if (age < 0) { s.alpha = 0; continue; }
        const th = a0 + span * f;
        s.x = cx + Math.cos(th) * ARC_R; s.y = cy + Math.sin(th) * ARC_R;
        s.rotation = th + Math.PI / 2;
        s.scale.set(Math.max(0.05, segLen / 64), (0.55 + 0.6 * k) * (1 - Math.min(0.8, age)));
        s.alpha = Math.max(0, (0.85 - age * 1.6)) * (0.55 + 0.35 * k);
        s.tint = color;
      }
      return true;
    }
    if (e.kind === 'burst') {
      const life = 240;
      if (t > life) return false;
      const q = t / life, k = Math.max(0.3, Math.min(1.4, ev.k || 1));
      const core = e.sprites[0];
      if (core) { core.x = ev.x; core.y = ev.y; core.scale.set((0.6 + 1.1 * k) * (1 + q)); core.alpha = (1 - q) * 0.9; core.tint = ev.color == null ? 0xffffff : ev.color; }
      for (let i = 1; i < e.sprites.length; i++) {
        const s = e.sprites[i], sd = e.seeds[i - 1];
        if (!sd) continue;
        const d = sd.sp * (t / 1000);
        s.x = ev.x + Math.cos(sd.a) * d; s.y = ev.y + Math.sin(sd.a) * d + 30 * q * q;   /* a little fall */
        s.rotation = sd.a;
        s.scale.set(0.22 + 0.2 * k, 0.35);
        s.alpha = (1 - q);
        s.tint = ev.color == null ? 0xfff6dc : ev.color;
      }
      return true;
    }
    if (e.kind === 'pulse') {
      const life = 300;
      if (t > life) return false;
      const q = t / life, s = e.sprites[0];
      if (s) { s.x = ev.x; s.y = ev.y; s.scale.set((0.3 + 1.1 * q) * Math.max(0.4, ev.k || 1)); s.alpha = (1 - q) * 0.85; s.tint = ev.color == null ? 0xffffff : ev.color; }
      return true;
    }
    if (e.kind === 'streak') {
      const life = 160;
      if (t > life) return false;
      const q = t / life, s = e.sprites[0];
      if (s) {
        const len = ev.len || 60;
        s.x = ev.x + Math.cos(ev.ang || 0) * len / 2; s.y = ev.y + Math.sin(ev.ang || 0) * len / 2;
        s.rotation = ev.ang || 0;
        s.scale.set(len / 64, (0.5 + 0.7 * Math.min(1.3, ev.k || 1)) * (1 - q));
        s.alpha = 1 - q; s.tint = ev.color == null ? 0xffffff : ev.color;
      }
      return true;
    }
    return false;
  }

  /** Once a frame (pixiRenderer, after the entity and effect passes). */
  frame(S, er, now) {
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    this._frame++;
    /* the queue, drained */
    const q = S && S._feelFx;
    if (q && q.length) {
      for (let i = 0; i < q.length; i++) { const e = this._start(q[i], now); if (e) this.active.push(e); }
      q.length = 0;
    }
    /* each running effect */
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      let alive = false;
      try { alive = this._step(e, S, now); } catch (err) { alive = false; }
      if (!alive) { for (const s of e.sprites) this._give(s); this.active.splice(i, 1); }
    }
    /* the drawers (the sword's gleam first) */
    for (let i = 0; i < _drawers.length; i++) { try { _drawers[i](this, S, er, now); } catch (err) { /* never break a frame */ } }
    /* keyed sprites no drawer asked for this frame: hidden and given back */
    if (this.keyed.size) {
      for (const [key, k] of this.keyed) if (k.seen !== this._frame) { this._give(k.spr); this.keyed.delete(key); }
    }
    if (t0) { const ms = performance.now() - t0; if (ms > this.stats.maxMs) this.stats.maxMs = ms; }
  }

  /** A zone change: what was running stops (its sprites given back). */
  clear() {
    for (const e of this.active) for (const s of e.sprites) this._give(s);
    this.active.length = 0;
    for (const [, k] of this.keyed) this._give(k.spr);
    this.keyed.clear();
  }

  destroy() {
    this.clear();
    try { if (this.root.parent) this.root.parent.removeChild(this.root); } catch (e) { /* gone */ }
    try { this.root.destroy({ children: true }); } catch (e) { /* gone */ }
    for (const k of Object.keys(this.tex)) { try { if (this.tex[k] !== Texture.WHITE) this.tex[k].destroy(true); } catch (e) { /* gone */ } }
    this.pool.length = 0; this.free.length = 0;
    if (_live === this) _live = null;
  }
}

/* ═══ THE SWORD'S DRAWER: the blade refills and glints ═══
   The blade's dullness is its tint (entityRenderer, where its tint is set:
   feelTint by S._sf.view.dim).  Here, in the glint (the perfect strike's
   window), a streak runs from the grip to the point (glintT 0..1), then a
   small star sits at the point to the window's end.  Only while the blade is
   in the hand and drawn (not mid-swing: the swing's own figure is drawn
   then), and only with the sword's feel on. */
const _a = { x: 0, y: 0 }, _b = { x: 0, y: 0 };
function swordGleam(fx, S, er, now) {
  const v = S && S._sf && S._sf.view;
  if (!v || v.phase !== 'glint' || !(v.glintT >= 0) || !swordFeelOn(S)) return;
  if (!S.rpg || (S.rpg.activeSlot || 'melee') !== 'melee' || S._swordSwinging) return;
  const d = er && er.playerDisplay;
  const ws = d && !d.destroyed ? d._weaponSprite : null;
  if (!ws || ws.destroyed || !ws.visible || !ws.texture || !d.visible) return;
  const tw = ws.texture.width, th = ws.texture.height;
  if (!(tw > 0 && th > 0)) return;
  /* the grip is the sprite's anchor (its handle point, handles.json); the
     point is the edge-middle farthest from it */
  const ax = ws.anchor.x * tw, ay = ws.anchor.y * th;
  const cands = [[tw / 2, 0], [tw / 2, th], [0, th / 2], [tw, th / 2]];
  let best = null, bd = -1;
  for (const c of cands) { const dd = (c[0] - ax) * (c[0] - ax) + (c[1] - ay) * (c[1] - ay); if (dd > bd) { bd = dd; best = c; } }
  const grip = fx.toLayer(ws, 0, 0, _a);
  const tip = fx.toLayer(ws, best[0] - ax, best[1] - ay, _b);
  if (!grip || !tip) return;
  const t = v.glintT;
  if (t < 1) {
    /* the streak, running down the edge */
    const x = grip.x + (tip.x - grip.x) * t, y = grip.y + (tip.y - grip.y) * t;
    const ang = Math.atan2(tip.y - grip.y, tip.x - grip.x);
    const L = 10;
    fx.line('sword:glint', x - Math.cos(ang) * L, y - Math.sin(ang) * L, x + Math.cos(ang) * L, y + Math.sin(ang) * L, 7, 0.55 + 0.45 * Math.sin(Math.PI * t), 0xfff4d6);
    fx.glow('sword:glintCore', x, y, 9, 0.8, 0xffffff);
  } else {
    /* the point holds a star to the window's end */
    const tw2 = 0.65 + 0.35 * Math.sin(now / 55);
    fx.glow('sword:tip', tip.x, tip.y, 14 * tw2, 0.85, 0xfff4d6);
    fx.line('sword:tipX', tip.x - 7, tip.y, tip.x + 7, tip.y, 4, 0.7 * tw2, 0xffffff);
  }
  fx.stats.glintDrawn++;
  fx.stats.gleamAt = now;
}
registerFeelDrawer(swordGleam);
registerFeelDrawer(staffFeelDraw);   /* v2.3.4803 */

/* QA: what the layer holds */
let _live = null;
export function setLiveFeelFx(fx) { _live = fx; }
if (typeof window !== 'undefined') {
  window.__btWeaponFeelFx = () => {
    const fx = _live;
    if (!fx) return null;
    return { active: fx.active.map((e) => e.kind), pool: fx.pool.length, free: fx.free.length,
      keyed: [...fx.keyed.keys()], layer: fx.layer ? fx.layer.label : null, stats: Object.assign({}, fx.stats) };
  };
}
