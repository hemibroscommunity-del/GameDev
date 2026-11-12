/* ═══ v2.3.4886: OTHER PLAYERS' NAME PLATES, DRAWN AFTER THE FIGURES (?platelayer=1) ═══
 *
 * Measured first (docs/specs/crowd-lanes.md "Name plates in a layer of their
 * own"): 50 players walking on the phone's screen, mp-crowdbots counting the
 * GL calls a frame, with every other player's name plate drawn as now and
 * then not drawn at all (BT_CROWD_HIDE=plates):
 *
 *   draw calls       205 -> 102
 *   program changes  187 -> 84
 *   texture binds    768 -> 499
 *
 * A plate (its box, a Graphics, and its text) is the last part of each
 * player's display, so the chip draws figure, plate, figure, plate...: every
 * plate breaks the figures' batch, and each of those breaks is a draw and,
 * mostly, a change of program, the dearest thing a phone's frame does.
 *
 * Here the plates are drawn AFTER the figures, all together, with Pixi's
 * RenderLayer: a plate stays where it is in the scene (its display's
 * `_uiLayer`, which every system places as before -- the build's counter-scale,
 * emoteFx's plate held still, the HP bar, the skull, the party badge) and is
 * only drawn at the layer's place in the order.  One RenderLayer at the end
 * of each of the two sorted world layers (`entities`, `gatherNodesFront`), so
 * a plate is always drawn by the layer of the render group its figure is in
 * (a change inside the plate marks that group); the depth pass leaves them
 * alone and sorts them last (depthSort.js `_depthLast`).
 *
 * What a player sees change: in its own layer, a plate is now over every
 * figure and prop there, never behind a figure standing in front of its
 * owner.  The players south of you (the front layer) keep theirs over them.
 * Off unless `?platelayer=1` until the owner has seen it.
 *
 * A player drawn as one picture (peerImpostor.js) keeps its plate IN the
 * picture: not attached here while it is one (an attached plate is skipped by
 * the paint and, its figure not drawn, by the layer too).
 */
import { RenderLayer } from 'pixi.js';

const _search = typeof location !== 'undefined' ? (location.search || '') : '';

/** The switch: on only with `?platelayer=1` (`=0` is off too, the off-ramp
    for when it is the default). */
export function plateLayerFromQuery(search) {
  const m = /[?&]platelayer=([01])\b/.exec(search || '');
  return !!(m && m[1] === '1');
}

export class PlateLayers {
  constructor(layers) {
    this.on = plateLayerFromQuery(_search);
    this.rl = new Map();   /* world layer -> its plates' RenderLayer */
    if (!this.on || !layers) return;
    for (const name of ['entities', 'gatherNodesFront']) {
      const L = layers[name];
      if (!L) continue;
      const r = new RenderLayer();
      r.label = 'plates_' + name;
      r._depthLast = true;
      L.addChild(r);
      this.rl.set(L, r);
    }
    if (typeof window !== 'undefined') {
      window.__btPlateLayer = () => {
        let attached = 0;
        for (const r of this.rl.values()) attached += r.renderLayerChildren ? r.renderLayerChildren.length : 0;
        return { on: this.on, layers: this.rl.size, attached };
      };
      /* QA: the same scene both ways (mp-platelayer: a plate drawn by the
         layer and drawn in place are the same picture) */
      window.__btPlateLayerSet = (on) => {
        if (!on) {
          for (const r of this.rl.values()) {
            const kids = (r.renderLayerChildren || []).slice();
            for (const k of kids) r.detach(k);
          }
          this.on = false;
        } else this.on = this.rl.size > 0;
        return this.on;
      };
    }
  }

  /** After the depth pass (every figure in its final layer this frame):
      each other player's plate attached to the plates of the layer its
      figure is in, or to none (a picture, or a layer with no plates: the
      gesture layer a miner or angler is drawn in). */
  update(displays, isPicture) {
    if (!this.on || !displays) return;
    for (const d of displays.values()) {
      if (!d || d.destroyed) continue;
      const ui = d._uiLayer;
      if (!ui || ui.destroyed) continue;
      const want = (isPicture && isPicture(d)) ? null : (this.rl.get(d.parent) || null);
      const was = ui.parentRenderLayer || null;
      if (was === want) continue;
      if (was) was.detach(ui);
      if (want) want.attach(ui);
    }
  }
}
