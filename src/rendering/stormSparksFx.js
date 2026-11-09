/* ═══ v2.3.4356: THE STORM EYE'S ELECTRICITY, DRAWN IN CODE ═══
 *
 * The owner, 2026-11-09: "Also add this electric eyeball monster instead of
 * the stand-in electric slime. You'll use code to make the electric
 * effects".
 *
 * WHAT (data/stormSparks.js; game/stormSparks.js places every piece from the
 * time alone):
 *   aura   arcs jumping over every storm eye the entity renderer drew this
 *          frame (it stamps `_ssSeen`, with where its body is): the nearest
 *          MAX_EYES
 *   zap    lightning thrown off it the moment a blow of its lands -- the end
 *          of the worker's own warning, as the water frog's water is
 *          (waterAttackFx.js): queued once a warning by the entity renderer
 *          (queueStormZap), drawn where it was thrown
 *   ball   the same arcs, small, round each of its shots in flight
 *          (S.slimeProjectiles, by who threw it: monsterShots.js)
 * Nothing new on the wire; the worker decides nothing more.
 *
 * WHERE and HOW: as the element wind-ups and the water attack are: on the
 * projectiles layer, over everything that stands; POOL sprites made once in
 * one Container added once, every one cut from ONE picture drawn in code
 * (stormSparkShapes.js).  A frame only moves pieces, turns them, sizes them
 * and sets their alpha (0 for the ones not used) and their cell of that one
 * picture: nothing is ever added, removed, hidden or re-blended, so the
 * layer's draw list is never rebuilt for it (TRAPS §218).
 *
 * The picture is made on the loading screen (warmStormSparks, in
 * preloadWorldAnimations: the law), 192 x 48 px, ~37 KB, kept for the page as
 * an image of itself (keepAsImage: nothing draws into it again).
 *
 * `?nostormfx` leaves it out (the eye alone); `window.__btStormSparks()` is
 * the QA probe.
 */
import { Container, Sprite, Texture, Rectangle, Cache } from 'pixi.js';
import { keepAsImage } from './keepAsImage.js';
import { STORM_LOOKS, STORM_SHAPES, STORM_FX } from '@/data/stormSparks.js';
import { cracklePieces, zapPieces, zapOver } from '@/game/stormSparks.js';
import { seedOfId, windupSizeK } from '@/game/elemWindup.js';
import { STORM_SHAPE_DRAW } from './stormSparkShapes.js';
import { MONSTER_VARIANTS } from '@/data/monsterVariants.js';
import { shotThrowerArch } from '@/data/monsterShots.js';
import { monsterTorsoY } from '@/data/gameSystems.js';
import { monsterDrawScale } from '@/game/combatHelpers.js';

let _cells = null;      /* shape -> Texture, cut from one source */

/** The one picture every piece is cut from.  On the loading screen; made
 *  here on first use only if that never ran (a test page). */
export function warmStormSparks() {
  if (_cells || typeof document === 'undefined') return;
  try {
    const C = STORM_FX.CELL;
    const cv = document.createElement('canvas');
    cv.width = C * STORM_SHAPES.length; cv.height = C;
    const g = cv.getContext('2d');
    STORM_SHAPES.forEach((name, i) => {
      g.save();
      g.translate(i * C, 0);
      g.beginPath(); g.rect(0, 0, C, C); g.clip();
      try { STORM_SHAPE_DRAW[name](g, C); } catch (e) { /* a shape that cannot draw is an empty cell */ }
      g.restore();
    });
    const base = Texture.from(cv);
    /* made once and never drawn into again: kept as an image of itself
       (keepAsImage.js, TRAPS §253), so a rebuilt renderer has it back */
    if (base && base.source) keepAsImage(base.source, Cache);
    const cells = Object.create(null);
    STORM_SHAPES.forEach((name, i) => { cells[name] = new Texture({ source: base.source, frame: new Rectangle(i * C, 0, C, C) }); });
    _cells = cells;
  } catch (e) { _cells = null; }
}

function stormOn() {
  try { return !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('nostormfx')); }
  catch (e) { return true; }
}

/* a storm eye's body, as it is drawn: its half-width and how high its middle
   floats above the point it stands on (world px) */
function bodyOf(m, zone, lift) {
  const ds = monsterDrawScale(m, zone) || 1;
  const shape = m.archetype || m.type;
  return { R: 30 * ds, H: (monsterTorsoY(shape) || 44) * ds + (lift || 0), k: windupSizeK(ds) };
}

/** A blow of its has landed: remember it for the frames it is drawn over.
 *  Called by the entity renderer, once a blow, for an eye it drew. */
export function queueStormZap(S, m, x, y, at, lift) {
  if (!S || !m) return false;
  const list = S._stormZaps || (S._stormZaps = []);
  /* (never grows: the oldest goes -- a zap lasts a third of a second) */
  if (list.length >= 12) list.shift();
  const b = bodyOf(m, S.currentZone, lift);
  list.push({ id: m.id, at, x, y, R: b.R, H: b.H, k: b.k, reach: STORM_LOOKS.zap.reach * b.k, seed: seedOfId(m.id) ^ (at | 0) });
  return true;
}

export class StormSparksFx {
  constructor(layer) {
    this.on = stormOn();
    this.layer = layer;
    this.box = null;
    this.pool = [];
    this._lit = 0;
    this._buf = [];
    this._cand = [];
    this._shots = [];
    this._live = { eyes: 0, zaps: 0, shots: 0, lit: 0 };   /* the probe's: what was drawn this frame */
    this._drawn = { aura: 0, zap: 0, ball: 0 };            /* the probe's: frames each was drawn */
    this._recent = [];                                     /* the probe's: the last zaps drawn, one a zap */
    /* the pool now, with the renderer (on the loading screen), never on the
       frame of the first eye */
    this._make();
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btStormSparks = () => ({
        on: self.on, made: !!_cells, pool: self.pool.length, lit: self._lit,
        live: Object.assign({}, self._live), drawn: Object.assign({}, self._drawn), recent: self._recent.slice(),
      });
    }
  }

  _make() {
    if (this.box || !this.layer) return !!this.box;
    warmStormSparks();
    if (!_cells) return false;
    const box = new Container();
    box.label = 'storm-sparks';
    box.eventMode = 'none';
    const first = _cells[STORM_SHAPES[0]];
    for (let i = 0; i < STORM_FX.POOL; i++) {
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

  /* the pieces in the buffer, n of them, drawn at (x, y): how many sprites used */
  _draw(used, n, x, y, size) {
    const px = size / STORM_FX.CELL;
    let lit = 0;
    for (let q = 0; q < n && used < this.pool.length; q++) {
      const p = this._buf[q];
      const sp = this.pool[used++];
      const tex = _cells[p.shape];
      if (tex && sp.texture !== tex) sp.texture = tex;
      sp.x = x + p.dx;
      sp.y = y + p.dy;
      sp.rotation = p.r;
      sp.scale.set(px * p.s);
      sp.alpha = p.a;
      if (p.a > 0.05) lit++;
    }
    this._live.lit += lit;
    return used;
  }

  update(S, now) {
    const zaps = S && S._stormZaps;
    /* QA's slow motion (window.__btBlowFxRate, 1 otherwise), as the water
       attack's: a zap is over before a test's picture of it is taken */
    const rate = (typeof window !== 'undefined' && window.__btBlowFxRate > 0) ? window.__btBlowFxRate : 1;
    /* the zaps that are over go, whether drawn or not */
    if (zaps) for (let i = zaps.length - 1; i >= 0; i--) if (zapOver((now - zaps[i].at) * rate)) zaps.splice(i, 1);
    if (!this.on || !S || !S.player) { this._park(0); return; }
    const probe = typeof window !== 'undefined' && window.__btProbe;
    const view = (S.camera && S._viewW > 0)
      ? { x0: S.camera.x - STORM_FX.VIEW_PAD, y0: S.camera.y - STORM_FX.VIEW_PAD,
          x1: S.camera.x + S._viewW + STORM_FX.VIEW_PAD, y1: S.camera.y + (S._viewH || S._viewW) + STORM_FX.VIEW_PAD }
      : null;
    const inView = (x, y) => !view || (x >= view.x0 && x <= view.x1 && y >= view.y0 && y <= view.y1);
    const px = S.player.x, py = S.player.y;
    /* the eyes drawn this frame, the nearest first */
    const cand = this._cand;
    cand.length = 0;
    const mons = S.monsters;
    if (mons) for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || m.alive === false || m._ssSeen !== now) continue;
      const x = typeof m.renderX === 'number' ? m.renderX : m.x;
      const y = typeof m.renderY === 'number' ? m.renderY : m.y;
      if (!inView(x, y)) continue;
      m._ssD2 = (x - px) * (x - px) + (y - py) * (y - py);
      cand.push(m);
    }
    /* its shots in flight */
    const shots = this._shots;
    shots.length = 0;
    const list = S.slimeProjectiles;
    if (list) for (let i = 0; i < list.length && shots.length < STORM_FX.MAX_SHOTS; i++) {
      const sp = list[i];
      if (!sp || sp.kind === 'snowball' || !inView(sp.x, sp.y)) continue;
      if (sp._ssStorm == null) {
        const v = MONSTER_VARIANTS[shotThrowerArch(S, sp)];
        sp._ssStorm = !!(v && v.sparks);
      }
      if (sp._ssStorm) shots.push(sp);
    }
    if (!cand.length && !shots.length && !(zaps && zaps.length)) { this._park(0); return; }
    if (!this._make()) return;
    if (cand.length > STORM_FX.MAX_EYES) { cand.sort((a, b) => a._ssD2 - b._ssD2); cand.length = STORM_FX.MAX_EYES; }
    this._live.eyes = 0; this._live.zaps = 0; this._live.shots = 0; this._live.lit = 0;
    let used = 0;
    const zone = S.currentZone;
    /* the zaps first: a blow is the thing to see */
    if (zaps) {
      let nz = 0;
      for (let i = zaps.length - 1; i >= 0 && nz < STORM_FX.MAX_ZAPS; i--) {
        const z = zaps[i];
        if (!inView(z.x, z.y)) continue;
        const n = zapPieces(z, (now - z.at) * rate, z.seed, this._buf);
        used = this._draw(used, n, z.x, z.y, STORM_LOOKS.zap.size);
        nz++;
        if (probe && !this._recent.some((r) => r.id === z.id && r.at === z.at)) {
          this._recent.push({ id: z.id, at: z.at, x: Math.round(z.x), y: Math.round(z.y), reach: Math.round(z.reach) });
          if (this._recent.length > 24) this._recent.shift();
        }
      }
      this._live.zaps = nz;
      if (nz) this._drawn.zap++;
    }
    for (const m of cand) {
      const x = typeof m.renderX === 'number' ? m.renderX : m.x;
      const y = typeof m.renderY === 'number' ? m.renderY : m.y;
      const n = cracklePieces('aura', bodyOf(m, zone, m._ssLift), now, m._ssSeed != null ? m._ssSeed : (m._ssSeed = seedOfId(m.id)), this._buf);
      used = this._draw(used, n, x, y, STORM_LOOKS.aura.size);
    }
    this._live.eyes = cand.length;
    if (cand.length) this._drawn.aura++;
    for (const sp of shots) {
      if (sp._ssSeed == null) sp._ssSeed = seedOfId(sp.id != null ? sp.id : `${sp.ownerId}:${sp.x | 0}`);
      const n = cracklePieces('ball', { R: 13, H: sp._fxLift || 0, k: 1 }, now, sp._ssSeed, this._buf);
      used = this._draw(used, n, sp.x, sp.y, STORM_LOOKS.ball.size);
    }
    this._live.shots = shots.length;
    if (shots.length) this._drawn.ball++;
    this._park(used);
  }

  /* every piece past `from` see-through: never hidden or removed */
  _park(from) {
    for (let i = from; i < this._lit; i++) this.pool[i].alpha = 0;
    this._lit = from;
    if (from === 0) { this._live.eyes = 0; this._live.zaps = 0; this._live.shots = 0; this._live.lit = 0; }
  }

  /* a zone change: nothing left drawn at the last zone's places */
  clear() { this._park(0); }
}
