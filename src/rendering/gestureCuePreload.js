/* ═══ v2.3.2760: THE GESTURE CUE'S MINI TOOLS, ON THE GATE ═══
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
import { warmOnce } from './warmOnce.js';   /* v2.3.4652 */

const _held = [];

/* v2.3.4652: once a page, not once a join (warmOnce.js says why); a failed
   warm never fails the gate: the picture fetches at use */
const warm = warmOnce(_held);

export function preloadGestureCue() {
  const urls = [...new Set(Object.values(GESTURE_CUE_SPRITES).map((s) => s.url))];
  return Promise.all(urls.map(warm));
}
