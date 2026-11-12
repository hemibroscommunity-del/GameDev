/* ═══ v2.3.4995: OTHER PLAYERS' WEAPONS DRAWN OUT OF THE FIGURES' RUN ═══
 *
 * The rule, and why it changes no pixel, is src/game/weaponHoist.js.  Here:
 * two RenderLayers in each sorted world layer (`entities`,
 * `gatherNodesFront`) -- `weapons_back_*` pinned FIRST (depthSort.js
 * `_depthFirst`) and `weapons_front_*` LAST, before the name plates
 * (`_depthLast`, inserted ahead of plateLayer.js's) -- and, each frame after
 * the depth pass, every other player's weapon container attached to one of
 * them when nothing it would change places with overlaps it on the screen,
 * else left where it is.  A weapon stays in place when its player is drawn
 * as one picture (peerImpostor.js: the weapon is in the picture), in a layer
 * with no weapon layers (the gesture layer), or hidden.
 *
 * The boxes are in the layer's own space: every child's own bounds (Pixi
 * keeps them until a piece changes: getLocalBounds) through its transform --
 * a figure's every drawn piece, its weapon and its plate included -- and the
 * weapon's and its figure's own pieces' the same way.  Off with
 * `?weaponlayer=0`.
 */
import { Matrix, RenderLayer } from 'pixi.js';
import { crowdSwitchOn } from '../game/onePic.js';
import { hoistOf } from '../game/weaponHoist.js';

const _search = typeof location !== 'undefined' ? (location.search || '') : '';

/** On unless `?weaponlayer=0`. */
export function weaponLayerFromQuery(search) {
  return crowdSwitchOn(search, 'weaponlayer');
}

/* a child's own bounds (Pixi keeps them until a piece changes) through a
   transform, as a box [x0, y0, x1, y1]; null when nothing is drawn */
function boxOf(c, m, out) {
  const b = c.getLocalBounds();
  if (!(b.maxX > b.minX && b.maxY > b.minY)) return null;
  const xs = [b.minX, b.maxX], ys = [b.minY, b.maxY];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const x of xs) for (const y of ys) {
    const X = m.a * x + m.c * y + m.tx, Y = m.b * x + m.d * y + m.ty;
    if (X < x0) x0 = X; if (X > x1) x1 = X;
    if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  out[0] = x0; out[1] = y0; out[2] = x1; out[3] = y1;
  return out;
}
const local = (c) => { c.updateLocalTransform(); return c.localTransform; };

export class WeaponLayers {
  constructor(layers) {
    this.on = weaponLayerFromQuery(_search);
    this.back = new Map();    /* world layer -> its first RenderLayer */
    this.front = new Map();   /* world layer -> its last (before the plates) */
    this._stamp = 0;
    this._boxes = [];
    this._own = [];
    this._figs = new Map();   /* display -> its index in the layer, this frame */
    this.stats = { back: 0, front: 0, stay: 0 };
    if (!this.on || !layers) return;
    const ord = (a, b) => (a._btWeaponOrd || 0) - (b._btWeaponOrd || 0);
    for (const name of ['entities', 'gatherNodesFront']) {
      const L = layers[name];
      if (!L) continue;
      const b = new RenderLayer({ sortableChildren: true, sortFunction: ord });
      b.label = 'weapons_back_' + name;
      b._depthFirst = true;
      L.addChildAt(b, 0);
      const f = new RenderLayer({ sortableChildren: true, sortFunction: ord });
      f.label = 'weapons_front_' + name;
      f._depthLast = true;
      /* ahead of the plates' RenderLayer: a plate stays over every weapon */
      let at = L.children.length;
      for (let i = 0; i < L.children.length; i++) if (L.children[i]._depthLast) { at = i; break; }
      L.addChildAt(f, at);
      this.back.set(L, b);
      this.front.set(L, f);
    }
    if (typeof window !== 'undefined') {
      window.__btWeaponLayer = () => ({ on: this.on, layers: this.back.size, ...this.stats });
      /* QA: the same scene both ways (mp-weaponlayer) */
      window.__btWeaponLayerSet = (on) => {
        if (!on) {
          for (const R of [...this.back.values(), ...this.front.values()]) {
            for (const k of (R.renderLayerChildren || []).slice()) R.detach(k);
          }
          this.on = false;
        } else this.on = this.back.size > 0;
        return this.on;
      };
    }
  }

  /** After the depth pass and the plates (pixiRenderer.js). */
  update(displays, isPicture) {
    if (!this.on || !displays) return;
    const stamp = ++this._stamp;
    const st = this.stats;
    st.back = 0; st.front = 0; st.stay = 0;
    const figs = this._figs;
    figs.clear();
    for (const d of displays.values()) if (d && !d.destroyed && d.parent && this.back.has(d.parent)) figs.set(d, -1);
    for (const [L, B] of this.back) {
      const F = this.front.get(L);
      const kids = L.children;
      const boxes = this._boxes;
      boxes.length = kids.length;
      /* every child's box in the layer's own space, in drawing order (the
         figures' joined with their weapons'); boxes reused frame to frame */
      const pool = this._pool || (this._pool = []);
      for (let i = 0; i < kids.length; i++) {
        const c = kids[i];
        boxes[i] = null;
        if (!c || c === B || c === F || c._depthLast || c._depthFirst || !c.visible || c.renderable === false) continue;
        const out = pool[i] || (pool[i] = [0, 0, 0, 0]);
        const bb = boxOf(c, local(c), out);
        if (!bb) continue;
        if (figs.has(c)) figs.set(c, i);
        boxes[i] = bb;
      }
      /* each figure's weapon: first, last, or in place */
      const wm = this._wm || (this._wm = new Matrix());
      const w = this._w || (this._w = [0, 0, 0, 0]);
      for (let i = 0; i < kids.length; i++) {
        const d = kids[i];
        if (!figs.has(d)) continue;
        const wc = d._weaponContainer, sb = d._spriteBody;
        if (!wc || wc.destroyed) continue;
        let want = null;
        if (wc.visible && wc.renderable !== false && boxes[i] && !(isPicture && isPicture(d))) {
          /* the weapon, and below the figure's own pieces, in the layer's space */
          const dm = local(d);
          wm.copyFrom(dm).append(local(wc));
          if (boxOf(wc, wm, w)) {
            const wi = d.getChildIndex(wc), bi = sb ? d.getChildIndex(sb) : wi + 1;
            const behind = wi < bi;
            const own = this._own;
            own.length = 0;
            const from = behind ? 0 : wi + 1, to = behind ? wi : d.children.length;
            const opool = this._opool || (this._opool = []);
            for (let k = from; k < to; k++) {
              const c = d.children[k];
              /* the plate is in its own layer, after both (plateLayer.js) */
              if (!c || !c.visible || c.renderable === false || c.parentRenderLayer) continue;
              const o = opool[own.length] || (opool[own.length] = [0, 0, 0, 0]);
              const pm = this._pm || (this._pm = new Matrix());
              pm.copyFrom(dm).append(local(c));
              if (boxOf(c, pm, o)) own.push(o);
            }
            const where = hoistOf(w, behind, own, boxes, i);
            want = where === 'back' ? B : (where === 'front' ? F : null);
          }
        }
        if (want) { wc._btWeaponOrd = i; wc._weaponStamp = stamp; if (want === B) st.back++; else st.front++; } else st.stay++;
        const was = wc.parentRenderLayer || null;
        if (was === want) continue;
        if (was) was.detach(wc);
        if (want) want.attach(wc);
      }
    }
    /* a weapon whose player left the list or the scene without being
       destroyed with it: let go, never drawn by a layer at its last place
       (plateLayer.js's sweep) */
    for (const R of [...this.back.values(), ...this.front.values()]) {
      const kids = R.renderLayerChildren;
      for (let i = kids.length - 1; i >= 0; i--) {
        const k = kids[i];
        if (k._weaponStamp !== stamp || k.destroyed) R.detach(k);
      }
    }
  }
}
