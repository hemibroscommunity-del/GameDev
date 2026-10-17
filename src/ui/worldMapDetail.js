/* ═══ v2.3.3319: THE WORLD MAP UP CLOSE, FAR FROM YOU ═══
 * (public/tools/world/core/worldblocks.js DETAIL_TILE; tools/world/
 * bake-wheel-world.mjs detailTiles; WorldMapOverlay.jsx draws them)
 *
 * The long Wheel's whole-map picture is a pixel every 16 cells -- 384 game
 * px, so the page holds it at the short Wheel's size (worldblocks.js
 * overviewCells).  Zoomed in on the world map far from you it was a few big
 * soft squares where a coast or a lake should be; round you the blocks' own
 * lands, four times finer, are drawn over it (wheelTrial.js wheelLocalLands).
 * So the long Wheel's lands are baked at that finer detail too, in tiles of
 * DETAIL_TILE pixels in their flat colours, and this brings in the ones the
 * map shows once one coarse pixel would be COARSE_PX CSS px or more on
 * screen -- and only then:
 *   - fetched at their bake's address (`?v=`, kept a year by public/_headers)
 *     and decoded off the main thread (createImageBitmap), LOADING at once;
 *   - held while the map shows them, at most HELD (256 x 256 x 4 bytes, about
 *     a quarter of a MB each), the longest unseen let go first (close());
 *   - every one let go when the map closes (freeMapDetail), and one that
 *     arrives after that let go as it comes.
 * A tile of one colour (open sea) is no file: placed.js names its colour and
 * it is filled with it, so the coarse picture's soft edge never shows through
 * beside a tile that is drawn.
 *
 * Not on the loading screen, on purpose: this is the map's detail coming in
 * over the picture it sharpens, as a map app's does -- nothing waits for it
 * and nothing hitches (the fetch and the decode are off the main thread) --
 * and all of it up front would hold 40 decoded tiles (~10 MB) for a map most
 * visits never zoom.  `?nomapdetail` draws the map as before.
 */
import { wheelMapDetail } from '../game/wheelTrial.js';

/* a coarse pixel this many CSS px on screen or more: the tiles */
export const COARSE_PX = 6;
const HELD = 16;
const LOADING = 4;
/* a tile that failed is asked for again after this long */
const RETRY_MS = 10000;

const _tiles = new Map();   /* 'i-j' -> { bm, used, loading, failedAt } */
let _loading = 0;
let _gen = 0;               /* bumped by freeMapDetail: a load from before it is let go on arrival */
let _frame = 0;             /* the last draw's clock: a tile it drew is never let go */
const _stats = { loads: 0, failed: 0, freed: 0, drawn: 0 };
const OFF = (() => { try { return /[?&]nomapdetail(?:[=&]|$)/.test(location.search); } catch (e) { return false; } })();

function load(D, key) {
  const t = _tiles.get(key) || { bm: null, used: 0, loading: false, failedAt: 0 };
  _tiles.set(key, t);
  t.loading = true;
  _loading++;
  const gen = _gen;
  const done = () => { _loading = Math.max(0, _loading - 1); t.loading = false; };
  fetch(`${D.at}${key}.png?v=${encodeURIComponent(D.v)}`)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
    .then((b) => createImageBitmap(b))
    .then((bm) => {
      done();
      if (gen !== _gen || _tiles.get(key) !== t) { try { bm.close(); } catch (e) { /* gone */ } return; }
      /* as new as the draw that asked for it -- and the cap kept now, not at
         the next draw (a tile come in between two draws held 18 of 16) */
      t.bm = bm;
      t.used = _frame;
      _stats.loads++;
      trim();
    })
    .catch(() => { done(); t.failedAt = performance.now(); _stats.failed++; });   /* the draw's own clock (requestAnimationFrame's) */
}

/* Let go of the longest-unseen tiles past HELD, never one the last draw drew */
function trim() {
  let held = 0;
  for (const t of _tiles.values()) if (t.bm) held++;
  if (held <= HELD) return;
  const old = [..._tiles.entries()].filter(([, t]) => t.bm && t.used < _frame).sort((a, b) => a[1].used - b[1].used);
  for (const [key, t] of old) {
    if (held <= HELD) break;
    try { t.bm.close(); } catch (e) { /* gone */ }
    _tiles.delete(key);
    _stats.freed++;
    held--;
  }
}

/* The tiles for a view of the world -- game px, { x0, y0, x1, y1 } -- when a
   coarse pixel is `coarsePx` CSS px on screen, as [{ x, y, w, h, bm | fill }]
   in game px, the ones not here yet asked for (and missing from the list:
   the coarse picture shows there meanwhile).  null with no detail to draw. */
export function mapDetailFor(view, coarsePx, now) {
  const D = wheelMapDetail();
  /* (`window.__btMapDetailOff`: the QA's way to draw one view both ways,
     tools/qa/mp/mp-mapdetail.mjs) */
  if (OFF || !D || !(coarsePx >= COARSE_PX) || (typeof window !== 'undefined' && window.__btMapDetailOff)) return null;
  _frame = now;
  const T = D.tile * D.px;   /* a tile's side in game px */
  const i0 = Math.max(0, Math.floor(view.x0 / T)), i1 = Math.min(D.cols - 1, Math.floor(view.x1 / T));
  const j0 = Math.max(0, Math.floor(view.y0 / T)), j1 = Math.min(D.rows - 1, Math.floor(view.y1 / T));
  const out = [];
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const w = Math.min(D.tile, D.w - i * D.tile) * D.px, h = Math.min(D.tile, D.h - j * D.tile) * D.px;
      if (w <= 0 || h <= 0) continue;
      const fill = D.fill[j * D.cols + i];
      if (fill) { out.push({ x: i * T, y: j * T, w, h, fill }); continue; }
      const key = i + '-' + j, t = _tiles.get(key);
      if (t && t.bm) { t.used = now; out.push({ x: i * T, y: j * T, w, h, bm: t.bm }); continue; }
      if ((!t || (!t.loading && now - (t.failedAt || 0) >= RETRY_MS)) && _loading < LOADING) load(D, key);
    }
  }
  trim();
  _stats.drawn = out.length;
  return out;
}

/* Let go of every tile: the map closed (WorldMapOverlay.jsx) */
export function freeMapDetail() {
  _gen++;
  for (const t of _tiles.values()) {
    if (t.bm) { try { t.bm.close(); } catch (e) { /* gone */ } _stats.freed++; }
  }
  _tiles.clear();
}

/* QA (tools/qa/mp/mp-mapdetail.mjs): what is held and what was done */
export function mapDetailProbe() {
  let held = 0;
  for (const t of _tiles.values()) if (t.bm) held++;
  const D = wheelMapDetail();
  return { off: OFF, has: !!D, held, loading: _loading, ...(D ? { cols: D.cols, rows: D.rows, files: D.fill.filter((f) => !f).length } : {}), ..._stats };
}
try { if (typeof window !== 'undefined') window.__btMapDetail = mapDetailProbe; } catch (e) { /* no page */ }
