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
import { padOn, padLayout, padSpot, padWidthOf } from '@/game/padSkin.js';
import { sw } from '@/game/switches.js';
import { fineInput } from '@/game/deviceProfile.js';
import { playVw } from '@/ui/mobile/playViewport.js';
import { canvasCssW, watchCanvasCssW } from '@/game/renderRes.js';
import { useState, useEffect, startTransition } from 'react';

export function padLive() {
  return padOn(sw('padskin'), fineInput());   /* v2.3.6641: never on a computer (padSkin.js padOn) */
}

/** the world's width: the canvas's as resize() last gave it, never wider
 *  than the column.  v2.3.6641 (part 4): it was playVw(), the window's
 *  column, and sideways at 844 under the one band the world is 752 between
 *  two 46 px bars, so the shell ran 92 px past the world's right edge and
 *  the right lobe's buttons (placed from that edge) sat 92 px left of the
 *  wells it drew.  Upright the two are the same width. */
export function padWidth() {
  return padWidthOf(playVw(), canvasCssW());
}

/** v2.3.6641 (part 4): a control in the controller redraws when the world's
 *  width moves (a band folded sideways, a turn): called once, unconditionally,
 *  at the top of each control that asks padNow or padAnchor.  The width is
 *  told, never measured (renderRes.js watchCanvasCssW). */
export function usePadWidth() {
  const st = useState(canvasCssW), w = st[0], setW = st[1];
  useEffect(function () {
    /* told at the top of a frame (resize()): the redraw is a transition, never inside it (CLAUDE.md 7) */
    const told = function (nw) { startTransition(function () { setW(nw); }); };
    if (canvasCssW() !== w) told(canvasCssW());   /* moved between the render and this */
    return watchCanvasCssW(told);
  }, []);   /* subscribed once: `w` is only the first reading */
  return w;
}

/** the controller on this screen (padSkin padLayout), or null when off */
export function padNow(isLandscape) {
  if (!padLive()) return null;
  return padLayout(!!isLandscape, padWidth());
}

export function padAnchor(name, isLandscape, today, fight) {
  const L = padNow(isLandscape);
  const s = L && padSpot(name, L, today && today.size, fight === true);
  if (!s) return today;
  return { size: s.size, right: s.edge, bottomPx: s.bottom, face: s.face, pad: true, well: s.well, dy: s.dy };
}
