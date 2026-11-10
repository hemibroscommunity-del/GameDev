/* Wood shield sprite loader for the player block.  Three source views
 * (front, 3-quarter, side); the renderer picks one + a mirror flag
 * based on the shield's facing angle so we get 8-direction coverage
 * out of three PNGs.
 *
 *   front view → angle near +y (S, "down" toward camera) or -y (N)
 *   side view  → angle near +x (E) or -x (W) (mirrored for W)
 *   3q view    → diagonal angles (mirrored for the western half)
 */

import { Assets } from 'pixi.js';
import { loadSetLater } from './loadSetLater.js';   /* v2.3.4452: a shield view that failed once is asked for again */

const SPRITE_VERSION = '2.3.1875'; /* v2.3.1875: halo peel — bumped so a cached
   shield with the grey rim is not served over the cleaned art (see BlockRing).
   v2.3.1774: pine repaint. */

const SHEETS = {
  front: { url: `/sprites/shields/wood-shield-front.png?v=${SPRITE_VERSION}`, tex: null },
  '3q':  { url: `/sprites/shields/wood-shield-3q.png?v=${SPRITE_VERSION}`,    tex: null },
  side:  { url: `/sprites/shields/wood-shield-side.png?v=${SPRITE_VERSION}`,  tex: null },
};

let loadPromise = null;

/* v2.3.4452: each view was one Assets.load behind a promise kept for the
   page, so one failed or stalled request drew the procedural arc for the
   visit (state-machine sweep VC-1, R8-5).  Now a loadSetLater set: a time
   limit, then retryLooks.js's rounds (ten at most), asked only while a shield
   is drawn (getShieldFrame).  `?shieldretry=0` (or `?retrylooks=0`) is the
   game as it was. */
let _set = null;
const _got = Object.create(null);
export function loadShieldSprites() {
  if (loadPromise) return loadPromise;
  const files = Object.create(null);
  for (const view of Object.keys(SHEETS)) files[view] = SHEETS[view].url;
  _set = loadSetLater({ files, into: _got, load: (u) => Assets.load(u), unload: (u) => Assets.unload(u),
    took: (view, tex) => { if (!SHEETS[view].tex) SHEETS[view].tex = tex; }, switchName: 'shieldretry' });
  loadPromise = _set.start();
  return loadPromise;
}

/** Pick a (texture, mirror) pair for the given shield angle (radians,
 *  +x = east, +y = south).  Returns null if no shield textures have
 *  loaded yet — caller falls back to the procedural arc. */
/** v2.3.1841: which shield art an angle resolves to, as a URL + mirror flag,
 *  for the 2D compositor (characterPortrait).  Deliberately shares the sector
 *  and mirror tables with getShieldFrame below by calling it for the view
 *  choice — the equip screen must show the same shield the world does, and
 *  the "NE and NW use the opposite mirror" rule is exactly the kind of thing
 *  that gets copied wrong. */
export function getShieldArt(angle) {
  const TAU = Math.PI * 2;
  const a = ((angle % TAU) + TAU) % TAU;
  const sector = Math.round(a / (Math.PI / 4)) % 8;
  const view = ['side', '3q', 'front', '3q', 'side', '3q', 'front', '3q'][sector];
  const mirror = [false, false, false, true, true, false, false, true][sector];
  const entry = SHEETS[view];
  return entry ? { url: entry.url, view, mirror } : null;
}

export function getShieldFrame(angle) {
  if (_set) _set.ensure();   /* v2.3.4452 */
  const front = SHEETS.front.tex;
  if (!front) return null;
  const TAU = Math.PI * 2;
  const a = ((angle % TAU) + TAU) % TAU; // 0..2π
  const sector = Math.round(a / (Math.PI / 4)) % 8; // 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE
  /* 4 view buckets — N reuses front because we don't have a back-view
     PNG; the artist gave us only forward-facing wood. */
  const view   = ['side', '3q', 'front', '3q', 'side', '3q', 'front', '3q'][sector];
  // NE (7) and NW (5) use the opposite mirror from SE/SW so up-diagonals
  // don't read as down-diagonals — fixes "facing NE shows the SE sprite".
  const mirror = [false,  false, false,  true,  true,   false, false,  true][sector];
  const tex = SHEETS[view] && SHEETS[view].tex;
  return tex ? { tex, mirror } : null;
}
