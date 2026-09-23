/* ═══ v2.3.2702: THE GESTURE CUE'S MINI TOOLS, ON THE GATE ═══
 *
 * CLAUDE.md's preloading LAW applied to the harvest cue.  The cue on the right
 * button is a mini sprite of the tool (gesturePose.js GESTURE_CUE_SPRITES): the
 * bag's own pickaxe / axe / rod icons and cell 0 of the pan strip.  They are
 * DOM images (an SVG <image> on the button), not Pixi textures -- exactly the
 * kind of thing a later reader assumes was forgotten, which is why this file
 * exists (levelUpBurstPreload.js and statDemoPreload.js make the same case).
 *
 * Why they would NOT already be warm:
 *   - the icons are drawn by the bag, but only once somebody opens it -- a
 *     player whose first action is chopping a tree has never fetched them;
 *   - the pan strip IS loaded at startup, but by the world renderer through
 *     Pixi, which is not the browser's image cache the <image> reads from.
 * The cue appears at the one moment the player is meant to be looking at it,
 * so a blank frame there is the regression the law names.
 *
 * decode() rather than onload, and the Images are HELD, for the reasons
 * levelUpBurstPreload.js gives: decode() means there is a bitmap to paint, and
 * an unreferenced decoded image is collectable under memory pressure.
 */
import { GESTURE_CUE_SPRITES } from '../game/gesturePose.js';

const _held = [];

function warm(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.push(img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* A failed warm must never fail the gate: the <image> falls back to an
       ordinary fetch when the cue actually shows. */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadGestureCue() {
  const urls = [...new Set(Object.values(GESTURE_CUE_SPRITES).map((s) => s.url))];
  return Promise.all(urls.map(warm));
}
