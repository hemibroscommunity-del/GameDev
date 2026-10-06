/* ═══ v2.3.3120: THE TRAP, DRAWN IN CODE ═══
 * Plan: docs/PET-TRAPPING-PLAN.md ("The shakes, the snap and the break are
 * drawn in code, with no new pictures").  The game's rules are
 * src/game/trapping.js; this only draws what it holds on S._trap:
 *
 *   the MARK    while a trap is armed on a monster: a brass ring at its feet
 *               whose arc is the time left, and a little box trap over its
 *               health bar (its top is stamped each frame as _popupTopOff,
 *               combatHelpers.monsterPopupY).  Its spot is copied back onto
 *               the mark every frame, so the trap springs where the monster
 *               FELL, not where it was armed.
 *   a SPRING    once the worker has rolled: the box drops onto the spot,
 *               shakes 0-3 times (the worker's count), then SNAPS shut with a
 *               flash and a burst of stars, or BREAKS into planks.  Timed by
 *               trapping.js (springMs), whose popups, sounds and card wait for
 *               the same beats.
 *
 * Graphics only, redrawn each frame, on the monster-UI layer (over the
 * monsters, under the player's own UI).  Nothing is loaded and nothing is
 * kept: a spring is dropped when its animation ends, the whole container when
 * there is nothing left to draw (memory rule: anything made per fight is
 * destroyed when it goes). */
import { Container, Graphics } from 'pixi.js';
import { SHAKE_MS, SHAKE_GAP, DROP_MS, END_MS, springMs } from '../game/trapping.js';
import { PET_BIG_AT } from '../data/trapping.js';   /* v2.3.3123: the Big reveal */

const WOOD = 0x8b5a2b, WOOD_DARK = 0x3b2512, WOOD_LIGHT = 0xb37a43, BRASS = 0xd8aa58, BRASS_HI = 0xeac675;
const AFTER_MS = 900;            /* how long a snap's glow or a break's planks linger */
/* v2.3.3123: THE REVEAL (Phase 4, "Golden and Big pets with a reveal").  A
   golden catch's snap throws up rays of gold that turn and fade, and twice
   the stars, lingering longer; a Big one's snap sends a second, wider ring.
   Still Graphics only, redrawn each frame, nothing loaded or kept. */
const GOLD_AFTER_MS = 1700;
const GOLD = 0xffd86b, GOLD_HI = 0xfff2c4;
const afterOf = (sp) => (sp && sp.pet && sp.pet.gold ? GOLD_AFTER_MS : AFTER_MS);
/* Sized for the phone (mp-trapping's pictures): a bro is ~105 game px tall
   there, and a world px ~0.6 CSS px, so the springing box is ~50 game px
   across (~30 CSS px) and the mark's ring wider than a monster's feet. */
const BOX_S = 1.9;               /* the springing box's scale (26 x 18 at 1) */
const RING_X = 44, RING_Y = 17;  /* the mark's ring at the monster's feet */

export class TrapFx {
  constructor(layer) {
    this.layer = layer;
    this.root = null;
    this.g = null;
  }

  _ensure() {
    if (this.root && !this.root.destroyed) return;
    this.root = new Container();
    this.root.label = 'trapFx';
    this.g = new Graphics();
    this.root.addChild(this.g);
    if (this.layer) this.layer.addChild(this.root);
  }

  destroy() {
    if (this.root && !this.root.destroyed) {
      try { this.root.removeFromParent(); this.root.destroy({ children: true }); } catch (e) { /* gone */ }
    }
    this.root = null; this.g = null;
  }

  /** Draw the mark and every spring in flight; returns how many things it drew. */
  update(S, now) {
    const st = S && S._trap;
    const mark = st && st.mark && st.mark.until > now ? st.mark : null;
    if (st && st.springs.length) st.springs = st.springs.filter((sp) => now - sp.t0 < springMs(sp.shakes) + afterOf(sp));
    const springs = st ? st.springs : [];
    if (!mark && !springs.length) { this.destroy(); return 0; }
    this._ensure();
    const g = this.g;
    g.clear();
    let drawn = 0;

    if (mark) {
      const m = (S.monsters || []).find((x) => x && x.id === mark.monsterId);
      if (m && m.alive) {
        mark.x = m.renderX != null ? m.renderX : m.x;
        mark.y = m.renderY != null ? m.renderY : m.y;
        mark.top = m._popupTopOff != null ? m._popupTopOff : -120;
      }
      const left = Math.max(0, Math.min(1, (mark.until - now) / Math.max(1, mark.ms || 15000)));
      const x = mark.x, y = mark.y;
      /* the ring at its feet: a faint full ellipse, the time left in brass */
      g.ellipse(x, y, RING_X, RING_Y).stroke({ color: BRASS, width: 2.5, alpha: 0.3 });
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * left;
      const steps = Math.max(2, Math.ceil(40 * left));
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        const px = x + Math.cos(a) * RING_X, py = y + Math.sin(a) * RING_Y;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke({ color: BRASS_HI, width: 4, alpha: 0.9 });
      /* the little trap over its bar, bobbing; quicker in the last 3 s */
      const urgent = mark.until - now < 3000;
      const bob = Math.sin(now / (urgent ? 90 : 260)) * 2;
      const hx = x, hy = y + (mark.top || -120) - 14 + bob;
      g.circle(hx, hy - 10, 22).fill({ color: 0x111e23, alpha: 0.75 }).stroke({ color: BRASS, width: 2, alpha: 0.95 });
      const s = 0.85;
      const w = 26 * s, h = 18 * s;
      g.rect(hx - w / 2, hy - h + 1, w, h).fill({ color: WOOD }).stroke({ color: WOOD_DARK, width: 1.6 });
      g.moveTo(hx - w / 2, hy - h + 1).lineTo(hx - w / 2 + 5 * s, hy - h - 11 * s).lineTo(hx + w / 2 + 3 * s, hy - h - 8 * s).lineTo(hx + w / 2, hy - h + 1)
        .fill({ color: WOOD_LIGHT }).stroke({ color: WOOD_DARK, width: 1.4 });
      drawn++;
    }

    for (const sp of springs) {
      const t = now - sp.t0;
      const shakeEnd = DROP_MS + sp.shakes * (SHAKE_MS + SHAKE_GAP);
      let dy = 0, rot = 0, sq = 1, alpha = 1;
      if (t < DROP_MS) {
        const k = t / DROP_MS;
        dy = -56 * (1 - k * k);             /* falls onto the spot */
      } else if (t < shakeEnd) {
        const u = (t - DROP_MS) % (SHAKE_MS + SHAKE_GAP);
        if (u < SHAKE_MS) {
          const k = u / SHAKE_MS;
          rot = Math.sin(k * Math.PI * 2) * 0.32 * Math.sin(k * Math.PI);
          sq = 1 - 0.08 * Math.sin(k * Math.PI);
        }
      }
      const ended = t >= shakeEnd;
      const endK = ended ? Math.min(1, (t - shakeEnd) / END_MS) : 0;
      if (ended && sp.caught) {
        /* SNAP: the door shuts, a flash, stars */
        const gold = !!(sp.pet && sp.pet.gold);
        const big = !!(sp.pet && Number(sp.pet.size) >= PET_BIG_AT);
        const fade = t > shakeEnd + END_MS ? Math.max(0, 1 - (t - shakeEnd - END_MS) / afterOf(sp)) : 1;
        if ((gold || big) && typeof window !== 'undefined' && window.__btProbe) {   /* QA (mp-petsmatter) */
          const qd = window.__btTrapFxDrawn || (window.__btTrapFxDrawn = { gold: 0, big: 0 });
          if (gold) qd.gold++;
          if (big) qd.big++;
        }
        if (gold) {
          /* v2.3.3123: rays of gold, turning, as long as the glow lasts */
          const rk = Math.min(1, (t - shakeEnd) / (END_MS * 1.6));
          const spin = (t - shakeEnd) / 900;
          for (let i = 0; i < 10; i++) {
            const a = spin + i / 10 * Math.PI * 2;
            const r0 = 18, r1 = 30 + 90 * rk;
            const w = 0.09;
            const cx = sp.x, cy = sp.y - 22;
            g.moveTo(cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0 * 0.8)
              .lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8)
              .lineTo(cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0 * 0.8)
              .closePath().fill({ color: i % 2 ? GOLD : GOLD_HI, alpha: 0.55 * fade });
          }
          g.circle(sp.x, sp.y - 22, 26 + 10 * Math.sin(t / 120)).fill({ color: GOLD, alpha: 0.18 * fade });
        }
        if (big) {
          /* v2.3.3123: a second, wider ring for a Big one */
          const bk = Math.min(1, Math.max(0, (t - shakeEnd - 120) / END_MS));
          if (bk > 0 && bk < 1) g.ellipse(sp.x, sp.y - 6, 30 + 120 * bk, 12 + 46 * bk).stroke({ color: 0x7ee0a8, width: 5 * (1 - bk) + 1, alpha: 0.8 * (1 - bk) });
        }
        g.circle(sp.x, sp.y - 20, 16 + 70 * endK).stroke({ color: 0xfff2c4, width: 6 * (1 - endK) + 1.5, alpha: 0.85 * (1 - endK) });
        for (let i = 0; i < (gold ? 12 : 6); i++) {
          const a = i / (gold ? 12 : 6) * Math.PI * 2 + 0.3;
          const r = 22 + (gold && i % 2 ? 90 : 60) * endK;
          const px = sp.x + Math.cos(a) * r, py = sp.y - 20 + Math.sin(a) * r * 0.7 - 14 * endK;
          const z = 7 * (1 - 0.5 * endK);
          g.moveTo(px, py - z).lineTo(px + z * 0.6, py).lineTo(px, py + z).lineTo(px - z * 0.6, py).closePath()
            .fill({ color: gold ? GOLD : BRASS_HI, alpha: fade });
        }
        this._box(g, sp.x, sp.y, BOX_S * (1 + (big ? 0.26 : 0.14) * Math.sin(endK * Math.PI)), true, 0, 1, fade);
      } else if (ended && !sp.caught) {
        /* BREAK: planks fly apart and fall */
        const tt = (t - shakeEnd) / 1000;
        const fade = Math.max(0, 1 - (t - shakeEnd) / (END_MS + AFTER_MS));
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.45;
          const v = 170 + (i % 3) * 55;
          const px = sp.x + Math.cos(a) * v * tt;
          const py = sp.y - 16 + Math.sin(a) * v * tt + 560 * tt * tt;
          const len = 15 + (i % 2) * 6;
          const rr = tt * (i % 2 ? 9 : -7);
          const cx = Math.cos(rr) * len / 2, cy = Math.sin(rr) * len / 2;
          g.moveTo(px - cx, py - cy).lineTo(px + cx, py + cy).stroke({ color: i % 2 ? WOOD : WOOD_LIGHT, width: 5.5, alpha: fade });
        }
        g.circle(sp.x, sp.y - 10, 12 + 34 * endK).fill({ color: 0xcdb89a, alpha: 0.35 * (1 - endK) });
      } else {
        this._box(g, sp.x, sp.y + dy, BOX_S, false, rot, sq, alpha);
      }
      drawn++;
    }
    return drawn;
  }

  /* A box trap drawn at (x, y), tipped by `rot` about its foot. */
  _box(g, x, y, s, shut, rot, sq, alpha) {
    /* rotate the few points by hand: a Graphics per box would be a node a
       frame; one Graphics for everything stays one draw */
    const c = Math.cos(rot), sn = Math.sin(rot);
    const P = (px, py) => [x + px * c - py * sq * sn, y + px * sn + py * sq * c];
    const w = 26 * s, h = 18 * s;
    const poly = (pts, fill, stroke, sw) => {
      const p0 = P(pts[0][0], pts[0][1]);
      g.moveTo(p0[0], p0[1]);
      for (let i = 1; i < pts.length; i++) { const p = P(pts[i][0], pts[i][1]); g.lineTo(p[0], p[1]); }
      g.closePath();
      if (fill != null) g.fill({ color: fill, alpha });
      g.stroke({ color: stroke, width: sw, alpha });
    };
    g.ellipse(x, y + 1, w * 0.6, 4 * s).fill({ color: 0x000000, alpha: 0.22 * alpha });
    poly([[-w / 2, 0], [w / 2, 0], [w / 2, -h], [-w / 2, -h]], WOOD, WOOD_DARK, 2 * s);
    if (shut) poly([[-w / 2 - s, -h + s], [w / 2 + s, -h + s], [w / 2 + s, -h - 4 * s], [-w / 2 - s, -h - 4 * s]], WOOD_LIGHT, WOOD_DARK, 1.6 * s);
    else {
      poly([[-w / 2, -h], [-w / 2 + 6 * s, -h - 13 * s], [w / 2 + 4 * s, -h - 9 * s], [w / 2, -h]], WOOD_LIGHT, WOOD_DARK, 1.6 * s);
      const a = P(2 * s, -h), b = P(5 * s, -h - 11 * s);
      g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ color: WOOD_DARK, width: 1.8 * s, alpha });
    }
    const m0 = P(-w / 2 + 2 * s, -h / 2), m1 = P(w / 2 - 2 * s, -h / 2);
    g.moveTo(m0[0], m0[1]).lineTo(m1[0], m1[1]).stroke({ color: WOOD_DARK, width: 1.2 * s, alpha: alpha * 0.7 });
  }
}

