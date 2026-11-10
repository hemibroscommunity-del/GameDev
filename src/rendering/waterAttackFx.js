/* ═══ v2.3.4355: THE WATER FROG'S ATTACK, DRAWN IN CODE ═══
 *
 * The owner, 2026-11-09: "I intend for you to draw the water attacks in code
 * actually. Don't use the water in the drawings. (Either cover over it or
 * remove)".
 *
 * WHEN: the moment a blow lands -- the end of the worker's own warning, which
 * the phone already keeps on the monster as `_shootAnimStart`/`_shootAnimEnd`
 * (gameEvents.js monster_ability: a swing's wind-up, and for the frog every
 * special's).  The entity renderer, drawing a monster whose look asks
 * (MONSTER_VARIANTS `blowFx: 'water'`), sees the warning end and queues the
 * blow once (queueWaterBlow): where it stood, which way it faced, what kind.
 * Nothing new on the wire; the worker decides nothing more.
 *
 * WHAT: a row of data/waterAttack.js -- a `spray` out of its mouth the way it
 * faces for an ordinary blow, a `ring` thrown out from under it for a slam --
 * its pieces placed each frame by game/waterAttack.js from the time alone.
 * A blow is drawn where it was thrown, whatever the frog does next.
 *
 * WHERE and HOW: on the projectiles layer, over everything that stands; POOL
 * sprites made once in one Container added once (the element wind-ups' way,
 * elemWindup.js), every one cut from ONE small picture of HARD PIXELS
 * (v2.3.4359, the owner: "avoid marking cartoonish shapes. Make water effects
 * with pixelation similar to how you made the flame effects": the campfire's
 * way, campfireArt.js -- waterAttackShapes.js has the pixels), sampled
 * nearest.  A frame only places pieces on the pixel grid and sets their
 * alpha (0 for the ones not used) and their cell of that one picture: never
 * turned, never scaled off the grid, nothing ever added, removed, hidden or
 * re-blended, so the layer's draw list is never rebuilt for it (TRAPS §218).
 * At most MAX_BLOWS at once, the nearest to you first.
 *
 * The picture is made on the loading screen (warmWaterAttack, in
 * preloadWorldAnimations: the law), about 100 x 11 px (4 KB), kept for the
 * page as an image of itself (keepAsImage: nothing draws into it again).
 *
 * `?nowaterfx` leaves it out (the frog's body alone); `window.
 * __btWaterAttack()` is the QA probe.
 */
import { Container, Sprite, Texture, Rectangle, Cache } from 'pixi.js';
import { keepAsImage } from './keepAsImage.js';
import { WATER_BLOWS, WATER_SHAPES, WATER_FX, FACING_DIR } from '@/data/waterAttack.js';
import { waterPieces, waterBlowOver } from '@/game/waterAttack.js';
import { seedOfId, windupSizeK } from '@/game/elemWindup.js';
import { WATER_RAMP, WATER_PIXELS } from './waterAttackShapes.js';
import { monsterTorsoY, monsterBodyOffsetY } from '@/data/gameSystems.js';
import { monsterDrawScale } from '@/game/combatHelpers.js';

let _cells = null;      /* shape -> Texture, cut from one source */

/** The one picture every piece is cut from: each cell's pixels written one by
 *  one from its map of letters (waterAttackShapes.js), in a row, a clear pixel
 *  between cells -- and sampled NEAREST, so a pixel drawn bigger is a bigger
 *  square, never a smear (campfireFx.js's way).  On the loading screen; made
 *  here on first use only if that never ran (a test page). */
export function warmWaterAttack() {
  if (_cells || typeof document === 'undefined') return;
  try {
    let W = 1, H = 1;
    const at = Object.create(null);
    for (const name of WATER_SHAPES) {
      const rows = WATER_PIXELS[name];
      at[name] = { x: W, w: rows[0].length, h: rows.length };
      W += rows[0].length + 1;
      H = Math.max(H, rows.length + 2);
    }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const img = g.createImageData(W, H);
    for (const name of WATER_SHAPES) {
      const rows = WATER_PIXELS[name], c = at[name];
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
        const ink = WATER_RAMP[rows[y][x]];
        if (!ink) continue;
        const o = ((y + 1) * W + c.x + x) * 4;
        img.data[o] = (ink[0] >> 16) & 255; img.data[o + 1] = (ink[0] >> 8) & 255; img.data[o + 2] = ink[0] & 255; img.data[o + 3] = ink[1];
      }
    }
    g.putImageData(img, 0, 0);
    const base = Texture.from(cv);
    if (base && base.source) {
      base.source.scaleMode = 'nearest';
      /* made once and never drawn into again: kept as an image of itself
         (keepAsImage.js, TRAPS §253), so a rebuilt renderer has it back */
      keepAsImage(base.source, Cache);
    }
    const cells = Object.create(null);
    for (const name of WATER_SHAPES) cells[name] = new Texture({ source: base.source, frame: new Rectangle(at[name].x, 1, at[name].w, at[name].h) });
    _cells = cells;
  } catch (e) { _cells = null; }
}

/* ═══ v2.3.4389: THE POOL IS THE FROG'S -- MADE WITH ITS LOOK, LET GO WITH IT ═══
 *
 * The memory check read the page's JavaScript objects at 37.7 and 38.0 MB at
 * its Flame Fields fight on this branch, over a 37.5 line (it fights fire
 * goblins and never meets a frog).  Measured on one machine, main against
 * the branch: see docs/specs/water-frog.md, Memory.  The pool was made with
 * the renderer, for good: 128 sprites here and 112 for the storm eye's
 * lightning, a few kB of objects each, held in BroTown and in every land for
 * a monster that lives in one.  "Anything made per land is destroyed when it
 * goes" (the memory law).
 *
 * So the pool is made when the frog's look is loaded (as you walk toward the
 * Water Caves: wheelMonsterArt.js, waterFrogSprites.js -- never on the frame
 * of the first blow) and destroyed when the look is let go.  The picture its
 * pieces are cut from is still made on the loading screen (21 kB).  A blow
 * with no look loaded (there is none: a frog not drawn throws no water) makes
 * the pool for as long as it lasts. */
let _wanted = false;
export function wantWaterAttack(on) { _wanted = !!on; }

function waterOn() {
  try { return !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('nowaterfx')); }
  catch (e) { return true; }
}

/** A blow has landed: remember it for the frames it is drawn over.  Called by
 *  the entity renderer, once a blow, for a monster it drew.  `kind` is the
 *  monster's `_blowKind` ('spray' unless its warning was a ring's), `reach`
 *  a ring's radius (world px; 0: the table's). */
export function queueWaterBlow(S, m, facing, x, y, at) {
  if (!S || !m) return false;
  const kind = WATER_BLOWS[m._blowKind] ? m._blowKind : 'spray';
  const d = FACING_DIR[facing] || FACING_DIR.south;
  const shape = m.archetype || m.type;
  const ds = monsterDrawScale(m, S.currentZone) || 1;
  const k = windupSizeK(ds);
  const list = S._waterBlows || (S._waterBlows = []);
  /* (never grows: the oldest goes -- a blow lasts about half a second) */
  if (list.length >= 12) list.shift();
  list.push({
    id: m.id, kind, at, x, y, dx: d[0], dy: d[1], k,
    /* its body, from the numbers its hits already use: about as far to its
       front as its hit circle's centre is high (the frog: 48 of its ~55), its
       mouth a little above the middle a shot is aimed at (62 of its 98 px) */
    R: Math.max(22, (monsterBodyOffsetY(shape) || 30) * 0.8) * ds,
    H: Math.max(18, (monsterTorsoY(shape) || 30) * 1.15) * ds,
    reach: kind === 'ring' && m._blowR > 0 ? m._blowR : WATER_BLOWS[kind].reach * k,
    seed: seedOfId(m.id) ^ (at | 0),
  });
  return true;
}

export class WaterAttackFx {
  constructor(layer) {
    this.on = waterOn();
    this.layer = layer;
    this.box = null;
    this.pool = [];
    this._lit = 0;
    this._buf = [];
    this._live = [];     /* the probe's: what was drawn this frame */
    this._drawn = Object.create(null);   /* the probe's: frames drawn, by kind */
    this._recent = [];   /* the probe's: the last blows drawn, one a blow */
    /* (v2.3.4389: no pool yet -- it comes with the frog's look, update()) */
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btWaterAttack = () => ({
        on: self.on, made: !!_cells, pool: self.pool.length, wanted: _wanted, lit: self._lit,
        live: self._live.slice(), drawn: Object.assign({}, self._drawn), recent: self._recent.slice(),
      });
    }
  }

  _make() {
    if (this.box || !this.layer) return !!this.box;
    warmWaterAttack();
    if (!_cells) return false;
    const box = new Container();
    box.label = 'water-attack';
    box.eventMode = 'none';
    const first = _cells[WATER_SHAPES[0]];
    for (let i = 0; i < WATER_FX.POOL; i++) {
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
    const list = S && S._waterBlows;
    if (!list || !list.length) {
      /* v2.3.4389: nothing to draw -- the pool made if the frog's look has
         come, let go if it has gone */
      if (this.box) { this._park(0); if (!_wanted) this._drop(); }
      else if (_wanted && this.on) this._make();
      return;
    }
    /* QA's slow motion (window.__btBlowFxRate, 1 otherwise): a blow is over in
       half a second, and a test's picture of it takes longer than that to
       take (as monsterShotFx's __btShotFxRate is for its films) */
    const rate = (typeof window !== 'undefined' && window.__btBlowFxRate > 0) ? window.__btBlowFxRate : 1;
    /* the ones that are over go, whether drawn or not */
    for (let i = list.length - 1; i >= 0; i--) if (waterBlowOver(list[i].kind, (now - list[i].at) * rate)) list.splice(i, 1);
    if (!this.on || !S.player || !list.length) { this._park(0); return; }
    if (!this._make()) return;
    const view = (S.camera && S._viewW > 0)
      ? { x0: S.camera.x - WATER_FX.VIEW_PAD, y0: S.camera.y - WATER_FX.VIEW_PAD,
          x1: S.camera.x + S._viewW + WATER_FX.VIEW_PAD, y1: S.camera.y + (S._viewH || S._viewW) + WATER_FX.VIEW_PAD }
      : null;
    let cand = list;
    if (view || list.length > WATER_FX.MAX_BLOWS) {
      const px = S.player.x, py = S.player.y;
      cand = [];
      for (const b of list) {
        if (view && (b.x < view.x0 || b.x > view.x1 || b.y < view.y0 || b.y > view.y1)) continue;
        b._d2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
        cand.push(b);
      }
      if (cand.length > WATER_FX.MAX_BLOWS) { cand.sort((a, b) => a._d2 - b._d2); cand.length = WATER_FX.MAX_BLOWS; }
    }
    const probe = typeof window !== 'undefined' && window.__btProbe;
    if (probe) this._live.length = 0;
    let used = 0;
    for (const b of cand) {
      const age = (now - b.at) * rate;
      const n = waterPieces(b.kind, b, age, b.seed, this._buf);
      /* an art pixel is PX world px, twice that on a big monster (a boss):
         always a whole multiple, and every piece on that grid */
      const px = WATER_FX.PX * Math.max(1, Math.round(b.k));
      const first = used;
      let aMax = 0;
      for (let q = 0; q < n && used < this.pool.length; q++) {
        const p = this._buf[q];
        const sp = this.pool[used++];
        const tex = _cells[p.shape];
        if (tex && sp.texture !== tex) sp.texture = tex;
        /* placed on the grid of its own pixels, never between two of them,
           and never turned (v2.3.4359: hard pixels) */
        sp.x = Math.round((b.x + p.dx) / px) * px;
        sp.y = Math.round((b.y + p.dy) / px) * px;
        if (sp.scale.x !== px) sp.scale.set(px);
        sp.alpha = p.a;
        if (p.a > aMax) aMax = p.a;
      }
      if (probe) {
        this._live.push({ id: b.id, kind: b.kind, pieces: used - first, alphaMax: Math.round(aMax * 100) / 100,
          x: Math.round(b.x), y: Math.round(b.y), age: Math.round(age), dir: [b.dx, b.dy], reach: Math.round(b.reach),
          at: this.pool.slice(first, used).filter((s) => s.alpha > 0.05).map((s) => [Math.round(s.x), Math.round(s.y)]) });
        this._drawn[b.kind] = (this._drawn[b.kind] || 0) + 1;
        if (!this._recent.some((r) => r.id === b.id && r.at === b.at)) {
          this._recent.push({ id: b.id, kind: b.kind, at: b.at, dir: [b.dx, b.dy], reach: Math.round(b.reach) });
          if (this._recent.length > 24) this._recent.shift();
        }
      }
    }
    this._park(used);
  }

  /* every piece past `from` see-through: never hidden or taken out */
  _park(from) {
    for (let i = from; i < this._lit && i < this.pool.length; i++) this.pool[i].alpha = 0;
    this._lit = from;
    if (from === 0 && this._live.length) this._live.length = 0;
  }

  /* v2.3.4389: the frog's look has gone -- the pool with it, whole (its box
     and every sprite destroyed; the picture they were cut from stays, it is
     the loading screen's).  Once, as the land is left: never on a frame of
     play. */
  _drop() {
    const box = this.box;
    if (!box) return;
    this.box = null; this.pool.length = 0; this._lit = 0; this._live.length = 0;
    try { box.destroy({ children: true }); } catch (e) { /* gone with the renderer */ }
  }

  /* a zone change: nothing left drawn at the last zone's places (a blow
     queued there is over, by its own clock, before the next zone is drawn) */
  clear() { this._park(0); }
}
