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
   */
  update(S, box, reachPick) {
    const lt = S && S.lockedTarget;
    const chosen = lt && lt.type === 'monster' && lt.src === 'tap' ? lt.ref : null;
    const live = (m) => !!(m && m.alive !== false && !(m.curHp != null && m.curHp <= 0));
    let m = null, mode = null;
    if (S && !S._zoneLoading) {
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
