/* ═══ v2.3.3431: AN EMPTY SHAPE WIPED AGAIN IS NOT A CHANGE ═══
 *
 * Owner, 2026-10-18: "iterate on what best improves framerate without loss of
 * quality (or negligible loss) for phone gameplay (iPhone, android)".
 *
 * Pixi rebuilds a render group's whole draw list (RenderGroupSystem
 * _buildInstructions: the group's tree walked, every sprite re-added to a
 * batch) whenever a small shape in it changes -- GraphicsPipe.validateRenderable
 * answers "rebuild" for any batchable Graphics whose context reported an
 * update, and `clear()` always reports one.  The game keeps ~25 Graphics that
 * it wipes every frame and redraws only while there is something to show (the
 * screen's damage flash, the telegraphs, the smithing sparks, the ground's
 * portal glows...), so on a phone in BroTown the world's and the screen's
 * draw lists were BOTH rebuilt every frame, almost always for shapes that were
 * empty before the wipe and empty after it (mp-phoneframe: 0.8 ms a frame in
 * BroTown, 1.3 at a fight, on this box).
 *
 * So a context that has nothing in it -- no shapes, no path being drawn, its
 * transform at rest -- is left as it is by `clear()`: wiping it changes
 * nothing anyone can see, and saying it changed is what cost the rebuild.  A
 * shape that had something in it is wiped exactly as before, and drawing into
 * an empty one reports its update as before.
 *
 * `?loudclear` in the address is Pixi as it ships, to compare. */
import { GraphicsContext } from 'pixi.js';

let _installed = false;
let _skipped = 0;

function urlOff() {
  try { return /[?&]loudclear(=|&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

export function installQuietClear() {
  if (_installed || urlOff()) return false;
  const proto = GraphicsContext && GraphicsContext.prototype;
  if (!proto || typeof proto.clear !== 'function') return false;
  const clear = proto.clear;
  proto.clear = function quietClear() {
    /* empty: no instructions, no half-drawn path, no transform left set
       (clear() also resets it) -- the three things clear() would change */
    const path = this._activePath, tf = this._transform;
    if (this.instructions && this.instructions.length === 0
      && (!path || !path.instructions || path.instructions.length === 0)
      && (!tf || (typeof tf.isIdentity === 'function' && tf.isIdentity()))) {
      _skipped++;
      return this;
    }
    return clear.call(this);
  };
  _installed = true;
  if (typeof window !== 'undefined') {
    /* probe only: how many wipes of an empty shape were let be */
    window.__btQuietClear = () => ({ on: _installed, skipped: _skipped });
  }
  return true;
}
