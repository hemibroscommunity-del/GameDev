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
 */
import { Container, Graphics } from 'pixi.js';

const ARM = 9;          /* CSS px, each bracket's arm */
const LINE = 2.2;       /* CSS px, the bracket's line */
const RIM = 1.6;        /* CSS px of dark either side of it (TRAPS §21: it lands on sand and snow) */
const COLOR = 0xF08A2E; /* the chip's resting orange: one colour for "your target" */

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
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      /* an L opening down and right from its corner: the frame's top-left */
      g.moveTo(0, a).lineTo(0, 0).lineTo(a, 0).stroke({ color: 0x14181A, width: rim, alpha: 0.8, cap: 'square', join: 'miter' });
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
   */
  update(S, box) {
    const lt = S && S.lockedTarget;
    const m = lt && lt.type === 'monster' && lt.src === 'tap' ? lt.ref : null;
    const want = !!(m && m.alive !== false && !(m.curHp != null && m.curHp <= 0) && !S._zoneLoading);
    const k = 1 / (S && S._worldScaleX > 0.01 ? S._worldScaleX : 1);
    if (want && (!this.root || Math.abs(k - this.k) > 1e-3)) this._build(k);
    if (!this.root) return;
    if (!want) {
      if (this.shown) { this.root.visible = false; this.shown = false; }
      this.last = null;
      return;
    }
    const b = box(m);
    if (!b || !Number.isFinite(b.cx) || !Number.isFinite(b.cy)) {
      if (this.shown) { this.root.visible = false; this.shown = false; }
      this.last = null;
      return;
    }
    const c = this.corners;
    c[0].position.set(b.cx - b.hw, b.cy - b.hh);
    c[1].position.set(b.cx + b.hw, b.cy - b.hh);
    c[2].position.set(b.cx - b.hw, b.cy + b.hh);
    c[3].position.set(b.cx + b.hw, b.cy + b.hh);
    if (!this.shown) { this.root.visible = true; this.shown = true; }
    this.last = { id: m.id != null ? String(m.id) : null, cx: Math.round(b.cx), cy: Math.round(b.cy), hw: Math.round(b.hw), hh: Math.round(b.hh) };
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
