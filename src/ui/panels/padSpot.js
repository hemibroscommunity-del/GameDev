/* ═══ v2.3.6640: A CONTROL'S PLACE IN THE CONTROLLER (card PAD) ═══
 * v2.3.6641 (part 3): one shell, its wells (padSkin.js padLayout); `fight`
 * (ShieldButton blockLive: whether Block shows) puts Block in the big well
 * and Jump in the middle one (padSkin.js wellOf).
 * The controller's rules are game/padSkin.js's; this is the glue the
 * buttons call, as thumbSpot.js is the arc's: the play column's kept width
 * (playVw: no layout read; TRAPS 214) and the switch (`?padskin=0`, today's
 * look).  A button hands its anchor of today ({ size, right, bottomPx }) and
 * gets back the same shape, moved to its socket, with `face` (the socket's
 * size, what Skin draws), or today's anchor untouched when the controller is
 * off or the control has no socket (it keeps today's place).
 */
import { padOn, padLayout, padSpot } from '@/game/padSkin.js';
import { sw } from '@/game/switches.js';
import { playVw } from '@/ui/mobile/playViewport.js';

export function padLive() {
  return padOn(sw('padskin'));
}

/** the controller on this screen (padSkin padLayout), or null when off */
export function padNow(isLandscape) {
  if (!padLive()) return null;
  return padLayout(!!isLandscape, playVw());
}

export function padAnchor(name, isLandscape, today, fight) {
  const L = padNow(isLandscape);
  const s = L && padSpot(name, L, today && today.size, fight === true);
  if (!s) return today;
  return { size: s.size, right: s.edge, bottomPx: s.bottom, face: s.face, pad: true, well: s.well };
}
