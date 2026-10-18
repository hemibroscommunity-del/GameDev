/* ═══ v2.3.3359: A LAYER DRAWS WITH THE WORLD'S OWN CAMERA NUMBERS ═══
 *
 * Pixi draws a render group that sits inside another by pushing a fresh set
 * of the shared uniforms for it -- the camera's matrix, the tint, the target's
 * projection and size -- drawing it, and popping them (RenderGroupPipe
 * _executeDirect).  A push is a new uniform group, so every program the layer
 * draws with uploads the numbers again, and the pop marks the outer set
 * changed, so the next program uploads them once more.
 *
 * Since v2.3.3359 each world layer is a render group of its own (pixiApp.js
 * LAYER_GROUPS), sitting at the world's origin, unscaled and untinted: its
 * numbers ARE the world's, and twenty-odd of them were pushed and popped every
 * frame -- most of them empty (mp-phoneframe: in BroTown 15 of the 22 drew
 * nothing).  So:
 *   - a group with nothing in its list is skipped (nothing would be drawn);
 *   - a group whose push would set exactly what is bound -- the same matrix by
 *     value, the same tint, the same target -- is drawn with what is bound;
 *   - any other is pushed and popped as Pixi does.
 * The same numbers reach the same programs, so the same picture
 * (mp-layergroups draws one held frame both ways and compares the pixels).
 *
 * The group's `inverseParentTextureTransform` is READ ONCE: Pixi's getter
 * clears its dirty bit on the first read and, with no cached-as-texture
 * parent, keeps nothing to give a second one (it returns undefined, and the
 * push would then inherit the parent's matrix).
 *
 * `?layerpush` in the address is Pixi's way, to compare. */
import { RenderGroupPipe, executeInstructions, RendererType } from 'pixi.js';

let _installed = false;
let _all = false;   /* QA: every group pushed as Pixi does, this page (window.__btLayerPushAll) */
let _empty = 0, _shared = 0, _pushed = 0;

function urlOff() {
  try { return /[?&]layerpush(=|&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

function sameMatrix(m, n) {
  return m === n || (!!m && !!n && m.a === n.a && m.b === n.b && m.c === n.c
    && m.d === n.d && m.tx === n.tx && m.ty === n.ty);
}

export function installLayerUniforms() {
  if (_installed || urlOff()) return false;
  const proto = RenderGroupPipe && RenderGroupPipe.prototype;
  if (!proto || typeof proto._executeDirect !== 'function' || typeof executeInstructions !== 'function') return false;
  const direct = proto._executeDirect;
  proto._executeDirect = function layerDirect(renderGroup) {
    const r = this._renderer;
    /* WebGL only: the game's renderer (pixiApp.js); anything else as Pixi does */
    if (!r || r.type !== RendererType.WEBGL || _all) return direct.call(this, renderGroup);
    const set = renderGroup.instructionSet;
    if (set && set.instructionSize === 0) { _empty++; return; }
    const g = r.globalUniforms;
    const cur = g && g.globalUniformData;
    const rt = r.renderTarget;
    const m = renderGroup.inverseParentTextureTransform;   /* once: see above */
    const c = renderGroup.worldColorAlpha;
    /* what GlobalUniformSystem.bind would set: `m || cur's`, `c || cur's`,
       the bound target's projection and size, cur's offset */
    if (cur && rt && rt.renderTarget
      && (!m || sameMatrix(m, cur.worldTransformMatrix))
      && (!c || c === cur.worldColor)
      && cur.projectionMatrix === rt.projectionMatrix
      && cur.resolution === rt.renderTarget.size) {
      _shared++;
      executeInstructions(renderGroup, r.renderPipes);
      return;
    }
    _pushed++;
    g.push({ worldTransformMatrix: m, worldColor: c });
    executeInstructions(renderGroup, r.renderPipes);
    g.pop();
  };
  _installed = true;
  if (typeof window !== 'undefined') {
    /* probe only: groups skipped empty, drawn with the bound numbers, pushed */
    window.__btLayerUniforms = () => ({ on: _installed && !_all, empty: _empty, shared: _shared, pushed: _pushed });
    /* QA: draw a held frame both ways (mp-layergroups) -- nothing is packed
       differently, so no draw list needs rebuilding */
    window.__btLayerPushAll = (v) => { _all = !!v; };
  }
  return true;
}
