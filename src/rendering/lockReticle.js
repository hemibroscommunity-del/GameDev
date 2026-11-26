/* ═══ v2.3.3876: THE LOCK YOU CHOSE WEARS A RETICLE ═══
 *
 * The owner, playtesting on a computer: "Show some kind of lock on reticle
 * if you double click a monster to lock on. Right now it's unclear that your
 * aim is locked on to a monster."
 *
 * Every monster lock already wears the orange chip over its head (the
 * owner's own pick, v2.3.2295, effectsRenderer) -- the AUTOMATIC lock a
 * sword takes on the nearest monster as much as one you chose, so a
 * double-click lock looked no different from no choice at all.  A lock you
 * CHOSE (a click, a double click or a tap: `src: 'tap'`, BroTown) now also
 * wears four corner brackets round the monster's body, following it; the
 * automatic lock does not (it keeps the chip alone).  Phones get it too: a
 * tap on a monster is the same chosen lock.
 *
 * DRAWN ONCE, MOVED EVERY FRAME (TRAPS §218).  Four small Graphics, each an
 * L drawn one time and mirrored by its scale; a frame only moves them.
 * Showing or hiding (`visible`) is the one structural change, and it happens
 * when a chosen lock starts or ends, never per frame.  The L's are redrawn
 * only if the world's zoom changes (their line is sized in screen pixels).
 * The corners are destroyed with the renderer (destroy).
 *
 * ═══ v2.3.3973: THIN, PULSING, AND WHEN A MONSTER IS IN REACH ═══
 * The owner: "Thin the reticle when you lock on target so it's just a thin
 * larger line that grows and shrinks while on target. Right now it's tighter
 * and has a thick border. Whenever a monster first comes in range for melee
 * attack this same reticle should appear too. It'll help you to know when
 * you're within distance for the first melee attack."
 *   - the brackets are a 1 px line (LINE) with a faint half-pixel dark rim
 *     each side (RIM, RIM_A: it still reads on snow and sand, TRAPS §21),
 *     arms a little longer, the box BOX (15%) roomier;
 *   - the whole reticle grows and shrinks slowly (PULSE_MS, PULSE_AMP) by
 *     its root's SCALE: the corners sit round the root's origin, the root on
 *     the monster's body centre -- no redraw and no structural change a frame
 *     (TRAPS §218);
 *   - with a melee weapon in hand and no lock you chose, the same reticle,
 *     softer (REACH_ALPHA), stands on the nearest monster inside your melee
 *     reach for as long as it is (`reachPick`, the reach ring's own sum in
 *     effectsRenderer): it shows the moment your first swing would land.
 */
import { Container, Graphics } from 'pixi.js';
import { AIM, aimFrameBox } from '../game/aimMarks.js';   /* v2.3.6555: the aim's frame and caret (below; card CT part 22) */

const ARM = 14;         /* CSS px, each bracket's arm (v2.3.3973: 11 -> 14, the box is bigger) */
const LINE = 1;         /* CSS px, the bracket's line (v2.3.3973: 2.2 -> 1, "just a thin ... line") */
const RIM = 0.5;        /* CSS px of dark either side of it (TRAPS §21: it lands on sand and snow; v2.3.3973: 1.6 -> 0.5) */
const RIM_A = 0.45;     /* v2.3.3973: and faint (was 0.8) */
const COLOR = 0xF08A2E; /* the chip's resting orange: one colour for "your target" */
export const BOX = 1.15;        /* v2.3.3973: the box this much roomier round the body */
export const PULSE_MS = 1400;   /* v2.3.3973: one slow grow-and-shrink */
export const PULSE_AMP = 0.07;  /* v2.3.3973: +-7% of its size */
export const REACH_ALPHA = 0.6; /* v2.3.3973: the in-reach reticle, softer than a lock you chose */

/* v2.3.3973: the nearest live monster inside your melee reach, or null.
   `reachOf(m)` gives {x, y, r}: the body centre the swing is measured to and
   the reach to it (effectsRenderer: the reach ring's own sum, so what this
   says is what the swing honours). */
export function nearestInMeleeReach(S, reachOf) {
  const p = S && S.player, ms = (S && S.monsters) || [];
  if (!p) return null;
  let best = null, bd = Infinity;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (!m || m.alive === false || (typeof m.curHp === 'number' && m.curHp <= 0)) continue;
    const q = reachOf(m);
    if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= q.r && d < bd) { bd = d; best = m; }
  }
  return best;
}

export class LockReticle {
  constructor(parent) {
    this.parent = parent;
    this.root = null;
    this.corners = null;
    this.k = 0;
    this.shown = false;
    this.last = null;
  }

  _build(k) {
    if (this.root) { try { this.root.parent && this.root.parent.removeChild(this.root); this.root.destroy({ children: true }); } catch (e) { /* gone */ } }
    this.root = new Container();
    this.root.label = 'lockReticle';
    this.corners = [];
    const a = ARM * k, w = LINE * k, rim = (LINE + RIM * 2) * k;
    /* v2.3.3973: the root sits on the body centre; the corners round it */
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      /* an L opening down and right from its corner: the frame's top-left */
      g.moveTo(0, a).lineTo(0, 0).lineTo(a, 0).stroke({ color: 0x14181A, width: rim, alpha: RIM_A, cap: 'square', join: 'miter' });
      g.moveTo(0, a).lineTo(0, 0).lineTo(a, 0).stroke({ color: COLOR, width: w, alpha: 1, cap: 'square', join: 'miter' });
      g.scale.set(i % 2 ? -1 : 1, i >= 2 ? -1 : 1);   /* TL, TR, BL, BR */
      this.root.addChild(g);
      this.corners.push(g);
    }
    this.root.visible = false;
    this.shown = false;
    this.k = k;
    if (this.parent) this.parent.addChild(this.root);
  }

  /**
   * Each frame.  `box(m)` gives the monster's body box in world px:
   * {cx, cy, hw, hh} (effectsRenderer's, from the shared body table).
   * v2.3.3973: `reachPick()`, when given, the monster inside your melee reach
   * to show the softer reticle on when no lock of yours is up (or null).
   * v2.3.6555: `aside` true while the two buttons' aim frame is up (AimFrame
   * below): nothing shows, so one frame at a time (card CT part 22).
   */
  update(S, box, reachPick, aside) {
    const lt = S && S.lockedTarget;
    const chosen = lt && lt.type === 'monster' && lt.src === 'tap' ? lt.ref : null;
    const live = (m) => !!(m && m.alive !== false && !(m.curHp != null && m.curHp <= 0));
    let m = null, mode = null;
    if (S && !S._zoneLoading && aside !== true) {
      if (live(chosen)) { m = chosen; mode = 'lock'; }
      else if (!chosen && typeof reachPick === 'function') {
        const r = reachPick();
        if (live(r)) { m = r; mode = 'reach'; }
      }
    }
    const want = !!m;
    const k = 1 / (S && S._worldScaleX > 0.01 ? S._worldScaleX : 1);
    if (want && (!this.root || Math.abs(k - this.k) > 1e-3)) this._build(k);
    if (!this.root) return;
    const hide = () => {
      if (this.shown) { this.root.visible = false; this.shown = false; }
      this.last = null;
    };
    if (!want) { hide(); return; }
    const b = box(m);
    if (!b || !Number.isFinite(b.cx) || !Number.isFinite(b.cy)) { hide(); return; }
    const hw = b.hw * BOX, hh = b.hh * BOX;
    const c = this.corners;
    c[0].position.set(-hw, -hh);
    c[1].position.set(hw, -hh);
    c[2].position.set(-hw, hh);
    c[3].position.set(hw, hh);
    this.root.position.set(b.cx, b.cy);
    /* the slow grow-and-shrink: a scale, never a redraw */
    const sc = 1 + PULSE_AMP * Math.sin((Date.now() % PULSE_MS) / PULSE_MS * Math.PI * 2);
    this.root.scale.set(sc);
    const al = mode === 'reach' ? REACH_ALPHA : 1;
    if (this.root.alpha !== al) this.root.alpha = al;
    if (!this.shown) { this.root.visible = true; this.shown = true; }
    this.last = { id: m.id != null ? String(m.id) : null, mode, cx: Math.round(b.cx), cy: Math.round(b.cy),
      hw: Math.round(hw), hh: Math.round(hh), scale: +sc.toFixed(3), alpha: al, line: LINE, rim: RIM };
  }

  /** QA (mp-lockreticle): what is drawn now */
  probe() {
    return { shown: !!this.shown, built: !!this.root, ...(this.last || {}) };
  }

  destroy() {
    if (this.root) { try { this.root.parent && this.root.parent.removeChild(this.root); this.root.destroy({ children: true }); } catch (e) { /* gone */ } }
    this.root = null;
    this.corners = null;
    this.shown = false;
    this.last = null;
  }
}

/* ═══ v2.3.6555: THE SAME RETICLE IN A NEW DRESS: THE AIM'S FRAME AND CARET (card CT part 22) ═══
 *
 * The owner, 2026-11-25, in the two buttons (`?manual=5`): "something larger
 * like the old way where it frames the monster enemy in a large but semi
 * transparent square shape reticle.  The frame should be yellow if that
 * monster is in queue for lock on targeting ... after you hit the monster it
 * turns red and locks on", and "a tiny directional Carat out in front of the
 * character".  WHAT shows is src/game/aimMarks.js's (the press's own pick
 * for yellow, the latch for red, the drawn facing or the lock for the
 * caret); these two only draw it.
 *
 * DRAWN ONCE, THEN ONLY MOVED, TURNED, SCALED, TINTED AND FADED (TRAPS §218):
 *   - AimFrame: four L's like LockReticle's, drawn in WHITE over the dark
 *     keyline and tinted (yellow 0xF2C94C or red 0xFF3C3C: the keyline stays
 *     dark under any tint), the box the monster's drawn box x 1.25 and never
 *     under 48 CSS px a side, a 2 px line, the whole at 0.6 alpha, no fill;
 *   - AimCaret: one chevron pointing east, brass on the keyline, turned by
 *     its rotation, 26 CSS px from the feet, 0.75 alpha.
 * `visible` changes only when the mark comes or goes (a change of state);
 * the L's and the chevron are drawn again only when the world's zoom
 * changes (their lines are sized in screen pixels).  Graphics, never a
 * Sprite: they cast no shadow (lightfx/casters.js walks Sprites).  No art
 * file.  Destroyed with the renderer.
 */
const AIM_ARM = 16;   /* CSS px, each bracket's arm: the 48 px box's third */
const AIM_RIM = 1;    /* CSS px of keyline either side of the 2 px line */

function _zoomK(S) { return 1 / (S && S._worldScaleX > 0.01 ? S._worldScaleX : 1); }
function _drop(g) { if (g) { try { g.parent && g.parent.removeChild(g); g.destroy({ children: true }); } catch (e) { /* gone */ } } }

export class AimFrame {
  constructor(parent) {
    this.parent = parent;
    this.root = null;
    this.corners = null;
    this.k = 0;
    this.shown = false;
    this.color = 0;
    this.last = null;
  }

  _build(k) {
    _drop(this.root);
    this.root = new Container();
    this.root.label = 'aimFrame';
    this.root.alpha = AIM.FRAME_ALPHA;
    this.corners = [];
    const a = AIM_ARM * k, w = AIM.LINE * k, rim = (AIM.LINE + AIM_RIM * 2) * k;
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      g.moveTo(0, a).lineTo(0, 0).lineTo(a, 0).stroke({ color: AIM.KEYLINE, width: rim, alpha: 0.8, cap: 'square', join: 'miter' });
      g.moveTo(0, a).lineTo(0, 0).lineTo(a, 0).stroke({ color: 0xFFFFFF, width: w, alpha: 1, cap: 'square', join: 'miter' });
      g.scale.set(i % 2 ? -1 : 1, i >= 2 ? -1 : 1);   /* TL, TR, BL, BR */
      this.root.addChild(g);
      this.corners.push(g);
    }
    this.root.visible = false;
    this.shown = false;
    this.color = 0;
    this.k = k;
    if (this.parent) this.parent.addChild(this.root);
  }

  /** Each frame.  `m` the monster framed (aimMarks' frame) or null, `color`
   *  its tone's, `tone` its name (for the probe), `box(m)` its drawn body
   *  box {cx, cy, hw, hh} in world px (the same box the tap reticle uses). */
  update(S, m, color, tone, box) {
    const k = _zoomK(S);
    if (m && (!this.root || Math.abs(k - this.k) > 1e-3)) this._build(k);
    if (!this.root) return;
    const b = m ? box(m) : null;
    if (!b || !Number.isFinite(b.cx) || !Number.isFinite(b.cy)) {
      if (this.shown) { this.root.visible = false; this.shown = false; }
      this.last = null;
      return;
    }
    const f = aimFrameBox(b, k), c = this.corners;
    c[0].position.set(-f.hw, -f.hh);
    c[1].position.set(f.hw, -f.hh);
    c[2].position.set(-f.hw, f.hh);
    c[3].position.set(f.hw, f.hh);
    this.root.position.set(b.cx, b.cy);
    if (this.color !== color) { for (let i = 0; i < 4; i++) c[i].tint = color; this.color = color; }
    if (!this.shown) { this.root.visible = true; this.shown = true; }
    this.last = { id: m.id != null ? String(m.id) : null, tone, color, cx: Math.round(b.cx), cy: Math.round(b.cy),
      side: Math.round(2 * Math.min(f.hw, f.hh) / k), alpha: this.root.alpha, k: +k.toFixed(4) };
  }

  /** QA (mp-aimmarks): what is drawn now */
  probe() { return { shown: !!this.shown, built: !!this.root, ...(this.last || {}) }; }

  destroy() {
    _drop(this.root);
    this.root = null; this.corners = null; this.shown = false; this.last = null;
  }
}

export class AimCaret {
  constructor(parent) {
    this.parent = parent;
    this.g = null;
    this.k = 0;
    this.shown = false;
    this.last = null;
  }

  _build(k) {
    _drop(this.g);
    const g = new Graphics();
    g.label = 'aimCaret';
    const h = (AIM.CARET_W / 2) * k, d = (AIM.CARET_W * 0.55) * k;
    /* a chevron pointing east (+x); turned by its rotation */
    const path = () => g.moveTo(-d / 2, -h).lineTo(d / 2, 0).lineTo(-d / 2, h);
    path().stroke({ color: AIM.KEYLINE, width: 4 * k, alpha: 0.8, cap: 'round', join: 'round' });
    path().stroke({ color: AIM.BRASS, width: 2 * k, alpha: 1, cap: 'round', join: 'round' });
    g.alpha = AIM.CARET_ALPHA;
    g.visible = false;
    this.g = g;
    this.shown = false;
    this.k = k;
    if (this.parent) this.parent.addChild(g);
  }

  /** Each frame.  `ang` aimMarks' caret (radians) or null; `fx, fy` the
   *  bro's feet in world px. */
  update(S, ang, fx, fy) {
    const want = typeof ang === 'number' && Number.isFinite(ang) && Number.isFinite(fx) && Number.isFinite(fy);
    const k = _zoomK(S);
    if (want && (!this.g || Math.abs(k - this.k) > 1e-3)) this._build(k);
    if (!this.g) return;
    if (!want) {
      if (this.shown) { this.g.visible = false; this.shown = false; }
      this.last = null;
      return;
    }
    const r = AIM.CARET_OUT * k;
    this.g.position.set(fx + Math.cos(ang) * r, fy + Math.sin(ang) * r);
    this.g.rotation = ang;
    if (!this.shown) { this.g.visible = true; this.shown = true; }
    this.last = { ang: +ang.toFixed(4), x: Math.round(this.g.position.x), y: Math.round(this.g.position.y),
      fx: Math.round(fx), fy: Math.round(fy), out: AIM.CARET_OUT, k: +k.toFixed(4) };
  }

  /** QA (mp-aimmarks): what is drawn now */
  probe() { return { shown: !!this.shown, built: !!this.g, ...(this.last || {}) }; }

  destroy() {
    _drop(this.g);
    this.g = null; this.shown = false; this.last = null;
  }
}
