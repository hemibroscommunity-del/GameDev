/* ═══ v2.3.3152: A FREED PICTURE NO LONGER BREAKS PIXI'S POOLED MASK ═══
 *
 * Owner, 2026-10-11: "Push these to main then continue headless testing to
 * catch memory leaks."  The leak hunt (a phone in the Wheel, every trip four
 * times) caught app.render throwing on the second Great Cave trip:
 *
 *   Cannot read properties of null (reading '0')
 *     at BindGroup.getResource <- MaskFilter set inverse <- AlphaMaskPipe.execute
 *
 * and a trace of who destroyed that bind group named the whole chain:
 *   1. a monster cut in two by its death (monsterDeathFx.js) clips the cut's
 *      keyline with a SPRITE MASK of the monster's own picture;
 *   2. Pixi draws every sprite mask through a MaskFilter it keeps in a global
 *      pool (AlphaMaskPipe: BigPool.get(AlphaMaskEffect) ... BigPool.return),
 *      and a pooled filter keeps the last mask's picture in its bind group;
 *   3. leaving the cave frees its monsters' art (wheelDungeons / rockmonster
 *      unloadBundle -> TextureSource.destroy);
 *   4. a destroyed picture tells every bind group holding it, and Pixi's
 *      BindGroup.onResourceChange answers by DESTROYING ITSELF -- the pooled
 *      filter's own bind group, in a filter nobody destroyed;
 *   5. the next sprite mask anywhere (a hood over the hair, the next cut
 *      monster) takes that filter from the pool, sets `inverse`, reads the
 *      dead bind group, and the frame is not drawn.  One frame for every
 *      poisoned filter in the pool: a flicker, or a black flash, after a big
 *      fight, each time you leave a land or a dungeon.
 *
 * The same shape waits anywhere Pixi keeps a shared shader that was last
 * drawn with a picture the game later frees (the mesh pipe's default shader
 * holds its last mesh's texture the same way).  So the rule is changed in the
 * one place it lives: a bind group whose PICTURE (a TextureSource, or its
 * sampler) is destroyed swaps that one entry for Pixi's empty picture and
 * stays alive.  What draws next sets its own picture, as every user of these
 * groups already does each draw; a shader that really is going is destroyed
 * by its owner, which destroys its groups as before.  Anything else a group
 * holds keeps Pixi's behaviour.  (WebGL keeps nothing on the GPU for a bind
 * group, so a kept one costs a few object fields.)
 *
 * `?bindfix=0` in the address leaves Pixi as it is, to compare
 * (mp-sceneleak's mask check). */
import { BindGroup, Texture, TextureSource, TextureStyle } from 'pixi.js';

let _installed = false;
let _swaps = 0;

function urlOff() {
  try { return /[?&]bindfix=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

/* what stands in for a destroyed picture or sampler: the empty texture's own,
   which nothing ever destroys */
function standIn(resource) {
  const empty = Texture.EMPTY && Texture.EMPTY.source;
  if (!empty || empty.destroyed) return null;
  if (resource instanceof TextureSource) return empty;
  /* a source's sampler goes with it (TextureSource.destroy -> _style.destroy) */
  if (resource instanceof TextureStyle) return empty.style && !empty.style.destroyed ? empty.style : null;
  return null;
}

export function installBindGroupFix() {
  if (_installed || urlOff()) return false;
  const proto = BindGroup && BindGroup.prototype;
  const orig = proto && proto.onResourceChange;
  if (typeof orig !== 'function') return false;
  proto.onResourceChange = function (resource) {
    if (resource && resource.destroyed && this.resources) {
      const swap = standIn(resource);
      if (swap && swap !== resource) {
        let found = false;
        for (const i in this.resources) {
          if (this.resources[i] === resource) { this.setResource(swap, +i); found = true; }
        }
        if (found) { _swaps++; this._dirty = true; return; }
      }
    }
    return orig.call(this, resource);
  };
  _installed = true;
  return true;
}

/* texturePoolTrim.js destroys pooled textures a Pixi bind group may still hold
   (the filter system's keeps its last input): only safe with this on */
export function bindGroupFixOn() { return _installed; }

if (typeof window !== 'undefined') {
  window.__btBindFix = () => ({ installed: _installed, off: urlOff(), swaps: _swaps });   /* QA (mp-sceneleak) */
}
