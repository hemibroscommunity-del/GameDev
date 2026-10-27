/* ═══ v2.3.3619: A MONSTER'S ELEMENT, SEEN AS IT WINDS UP ═══
 *
 * The owner, 2026-10-26: "It would be cool if you could telegraph the attacks
 * of each monster (briefly) using code to represent their elements. Maybe a
 * brief snow swirl effect before a snowman throws a snowball for instance.
 * This will promote blocking and more skilled play."
 *
 * WHEN: the worker's own wind-up -- every basic swing and throw (telegraph.js
 * BASIC_WINDUP, 350-600 ms) and every kit's slam, lunge or burst -- which the
 * phone already keeps on the monster as `_tgFrom`/`_tgUntil` (gameEvents.js
 * monster_ability) and throbs the body for (entityRenderer _windupFx).  The
 * look goes with the throb: on for exactly the wind-up, gone the moment the
 * blow comes.  Nothing new on the wire; the worker decides nothing more.
 *
 * WHAT: the monster's ELEMENT (`m.element`, the worker's: what its hit does),
 * a row of data/elemWindup.js, its pieces placed each frame by
 * game/elemWindup.js from the time alone.
 *
 * WHERE: on the projectiles layer, over everything that stands, as an arrow
 * in flight is (pixiApp.js).  A warning has to be seen: the first cut drew on
 * the particles layer, and a monster south of you -- which the depth pass
 * draws in front of you, above that layer (depthSort.js) -- hid its own
 * swirl behind its body.
 *
 * HOW, cheaply (TRAPS §218): POOL sprites made once, in one Container added
 * once to that layer, every one cut from ONE picture drawn in code
 * (elemWindupShapes.js).  A frame only moves
 * pieces, turns them, sizes them and sets their alpha (0 for the ones not
 * used) and their cell of that one picture: nothing is ever added, removed,
 * hidden or re-blended, so the layer's draw list is never rebuilt for it.
 *
 * Only monsters the entity renderer DREW this frame (it stamps `_tgSeen`):
 * one far off screen or whose look is not loaded (the Wheel's, v2.3.2989) is
 * not drawn, and neither is its wind-up.  At most MAX_MONSTERS at once, the
 * nearest to you first.
 *
 * The picture is made on the loading screen (warmElemWindup, in
 * preloadWorldAnimations: the law), 192 x 192 px, ~147 KB, kept for the page
 * (the canvas too, so a rebuilt renderer uploads it again).
 *
 * `?nowindupfx` leaves it out (the throb alone, as before);
 * `window.__btElemWindup()` is the QA probe. */
import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { ELEM_WINDUP, WINDUP_SHAPES, WINDUP_FX } from '@/data/elemWindup.js';
import { windupPieces, seedOfId, windupSizeK, windupStrength } from '@/game/elemWindup.js';
import { SHAPE_DRAW } from './elemWindupShapes.js';
import { monsterTorsoY, monsterMeleeHitRadius } from '@/data/gameSystems.js';
import { monsterDrawScale } from '@/game/combatHelpers.js';

const COLS = 4;
let _cells = null;      /* shape -> Texture, cut from one source */

/** The one picture every piece is cut from.  On the loading screen; made
 *  here on first use only if that never ran (a test page). */
export function warmElemWindup() {
  if (_cells || typeof document === 'undefined') return;
  try {
    const C = WINDUP_FX.CELL;
    const rows = Math.ceil(WINDUP_SHAPES.length / COLS);
    const cv = document.createElement('canvas');
    cv.width = C * COLS; cv.height = C * rows;
    const g = cv.getContext('2d');
    WINDUP_SHAPES.forEach((name, i) => {
      g.save();
      g.translate((i % COLS) * C, Math.floor(i / COLS) * C);
      g.beginPath(); g.rect(0, 0, C, C); g.clip();
      try { SHAPE_DRAW[name](g, C); } catch (e) { /* a shape that cannot draw is an empty cell */ }
      g.restore();
    });
    const base = Texture.from(cv);
    const cells = Object.create(null);
    WINDUP_SHAPES.forEach((name, i) => {
      cells[name] = new Texture({ source: base.source, frame: new Rectangle((i % COLS) * C, Math.floor(i / COLS) * C, C, C) });
    });
    _cells = cells;
  } catch (e) { _cells = null; }
}

function windupOn() {
  try { return !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('nowindupfx')); }
  catch (e) { return true; }
}

export class ElemWindupFx {
  constructor(layer) {
    this.on = windupOn();
    this.layer = layer;
    this.box = null;
    this.pool = [];
    this._lit = 0;
    this._buf = [];
    this._cand = [];
    this._live = [];     /* the probe's: who was drawn this frame */
    this._drawn = Object.create(null);   /* the probe's: frames drawn, by element */
    this._recent = [];   /* the probe's: the last wind-ups drawn, one a wind-up */
    /* the pool now, with the renderer (on the loading screen), never on the
       frame of the first blow */
    this._make();
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btElemWindup = () => ({
        on: self.on, made: !!_cells, pool: self.pool.length, lit: self._lit,
        live: self._live.slice(), drawn: Object.assign({}, self._drawn), recent: self._recent.slice(),
      });
    }
  }

  _make() {
    if (this.box || !this.layer) return !!this.box;
    warmElemWindup();
    if (!_cells) return false;
    const box = new Container();
    box.label = 'elem-windup';
    box.eventMode = 'none';
    const first = _cells[WINDUP_SHAPES[0]];
    for (let i = 0; i < WINDUP_FX.POOL; i++) {
      const sp = new Sprite(first);
      sp.anchor.set(0.5, 0.5);
      sp.alpha = 0;
      box.addChild(sp);
      this.pool.push(sp);
    }
    this.layer.addChild(box);
    this.box = box;
    return true;
  }

  update(S, now) {
    if (!this.on || !S || !S.player) { this._park(0); return; }
    const mons = S.monsters;
    const cand = this._cand;
    cand.length = 0;
    if (mons && mons.length) {
      const view = (S.camera && S._viewW > 0)
        ? { x0: S.camera.x - WINDUP_FX.VIEW_PAD, y0: S.camera.y - WINDUP_FX.VIEW_PAD,
            x1: S.camera.x + S._viewW + WINDUP_FX.VIEW_PAD, y1: S.camera.y + (S._viewH || S._viewW) + WINDUP_FX.VIEW_PAD }
        : null;
      const px = S.player.x, py = S.player.y;
      for (let i = 0; i < mons.length; i++) {
        const m = mons[i];
        if (!m || m.alive === false) continue;
        const until = m._tgUntil || 0;
        if (!(until > now) || m._tgSeen !== now) continue;
        if (!ELEM_WINDUP[m.element]) continue;
        const x = typeof m.renderX === 'number' ? m.renderX : m.x;
        const y = typeof m.renderY === 'number' ? m.renderY : m.y;
        if (view && (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1)) continue;
        m._tgD2 = (x - px) * (x - px) + (y - py) * (y - py);
        cand.push(m);
      }
    }
    if (!cand.length) { this._park(0); return; }
    if (!this._make()) return;
    if (cand.length > WINDUP_FX.MAX_MONSTERS) {
      cand.sort((a, b) => a._tgD2 - b._tgD2);
      cand.length = WINDUP_FX.MAX_MONSTERS;
    }
    const probe = typeof window !== 'undefined' && window.__btProbe;
    if (probe) this._live.length = 0;
    const zone = S.currentZone;
    let used = 0;
    for (const m of cand) {
      const look = ELEM_WINDUP[m.element];
      const x = typeof m.renderX === 'number' ? m.renderX : m.x;
      const y = typeof m.renderY === 'number' ? m.renderY : m.y;
      const shape = m.archetype || m.type;
      const ds = monsterDrawScale(m, zone) || 1;
      const R = Math.max(22, monsterMeleeHitRadius(shape) || 24) * ds;
      const H = Math.max(18, monsterTorsoY(shape) || 0) * ds;
      const k = windupSizeK(ds);
      const from = m._tgFrom || (m._tgUntil - 400);
      const span = Math.max(1, m._tgUntil - from);
      const age = Math.max(0, now - from);
      const t = Math.min(1, age / span);
      const n = windupPieces(look, { R, H, k }, age, t, m._tgSeed != null ? m._tgSeed : (m._tgSeed = seedOfId(m.id)), this._buf);
      const strength = windupStrength(age, t);
      const px = look.size * k / WINDUP_FX.CELL;
      const first = used;
      let aMax = 0;
      for (let q = 0; q < n && used < this.pool.length; q++) {
        const p = this._buf[q];
        const sp = this.pool[used++];
        const tex = _cells[p.shape];
        if (tex && sp.texture !== tex) sp.texture = tex;
        sp.x = x + p.dx;
        sp.y = y + p.dy;
        sp.rotation = p.r;
        sp.scale.set(px * p.s);
        const a = p.a * strength;
        sp.alpha = a;
        if (a > aMax) aMax = a;
      }
      if (probe) {
        this._live.push({ id: m.id, element: m.element, kind: look.kind, pieces: used - first, alphaMax: Math.round(aMax * 100) / 100,
          x: Math.round(x), y: Math.round(y), t: Math.round(t * 100) / 100,
          at: this.pool.slice(first, used).map((s) => [Math.round(s.x), Math.round(s.y)]) });
        this._drawn[m.element] = (this._drawn[m.element] || 0) + 1;
        if (!this._recent.some((r) => r.id === m.id && r.from === from)) {
          this._recent.push({ id: m.id, element: m.element, from, ms: Math.round(span) });
          if (this._recent.length > 24) this._recent.shift();
        }
      }
    }
    this._park(used);
  }

  /* every piece past `from` see-through: never hidden or removed */
  _park(from) {
    for (let i = from; i < this._lit; i++) this.pool[i].alpha = 0;
    this._lit = from;
    if (from === 0 && this._live.length) this._live.length = 0;
  }

  /* a zone change: nothing left drawn at the last zone's places */
  clear() { this._park(0); }
}
