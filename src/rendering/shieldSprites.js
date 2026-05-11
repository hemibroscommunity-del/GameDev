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

const SPRITE_VERSION = '2.1.23';

const SHEETS = {
  front: { url: `/sprites/shields/wood-shield-front.png?v=${SPRITE_VERSION}`, tex: null },
  '3q':  { url: `/sprites/shields/wood-shield-3q.png?v=${SPRITE_VERSION}`,    tex: null },
  side:  { url: `/sprites/shields/wood-shield-side.png?v=${SPRITE_VERSION}`,  tex: null },
};

let loadPromise = null;

async function loadOne(view) {
  const entry = SHEETS[view];
  try {
    const tex = await Assets.load(entry.url);
    if (tex) entry.tex = tex;
  } catch {
    /* missing — caller falls back to the procedural arc */
  }
}

export function loadShieldSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all(Object.keys(SHEETS).map(loadOne));
  return loadPromise;
}

/** Pick a (texture, mirror) pair for the given shield angle (radians,
 *  +x = east, +y = south).  Returns null if no shield textures have
 *  loaded yet — caller falls back to the procedural arc. */
export function getShieldFrame(angle) {
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

export function hasShieldSprites() {
  return !!SHEETS.front.tex;
}
