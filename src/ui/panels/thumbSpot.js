/* ═══ v2.3.6549: A BUTTON'S SPOT ON THE RIGHT THUMB'S ARC (card CT part 16) ═══
 * The two buttons' right side (game/thumbArc.js says where and why), for the
 * buttons to place themselves: { size, right, bottomPx } in the shape the old
 * anchors give (ShieldButton.jsx blockAnchor ...): `right` px from the
 * edge, as every control's, `bottomPx` over the band (ctlBottom).
 * Null off the arc (another mode, a mouse, or `?thumbarc=0`): the caller keeps
 * its old anchor.  The sizes are the play column's, kept (playVw / playVh: no
 * layout read; TRAPS 214).
 */
import { arcSpot, arcOn } from '@/game/thumbArc.js';
import { twoButtonsLive } from '@/game/latch.js';
import { sw } from '@/game/switches.js';
import { playVw, playVh } from '@/ui/mobile/playViewport.js';

export function thumbArcLive() {
  return arcOn(twoButtonsLive(), sw('thumbarc'));
}

export function thumbAnchor(name, isLandscape) {
  if (!thumbArcLive()) return null;
  const s = arcSpot(name, !!isLandscape, playVw(), playVh());
  if (!s) return null;
  return { size: s.size, right: s.right, bottomPx: s.bottom };
}
