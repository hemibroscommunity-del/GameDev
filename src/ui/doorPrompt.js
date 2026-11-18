/* ═══ THE DOOR PROMPT, OVER THE BRO'S HEAD (v2.3.4303; out of BroTown.jsx, v2.3.6244: card HB PR 5) ═══
 * BroTown's door prompt (`button.bt-interact-prompt`) takes placeOverHead(stateRef) as its ref.  Moved here
 * unchanged but for the placing after the paint (`?afterpaint`, below), so BroTown.jsx's lines only fall
 * (tools/guards/four-lines.test.mjs). */
import { playerScreenPoint } from './XpFlyOverlay.jsx';
import { AFTER_PAINT } from './afterPaint.js';   /* v2.3.6280: the switch's one reader (card HB2) */

/* v2.3.4303, the owner: the prompt that appears when you walk near a building's door shows right
   above your character (over the bro's head) so it cannot be missed, in every layout.  The
   camera is on the player, so the head's screen point barely moves while you stand at the door;
   the prompt (a position: fixed button) is placed there when it renders (its ref), measured from
   where fixed 0,0 really is (a computer's #root contains it; a phone's is the window).  The
   world's controls are at the band's edge: nothing over them.  No head point yet: the CSS place. */
/* ═══ v2.3.6244: PLACED AT THE TOP OF THE NEXT FRAME, NOT IN REACT'S COMMIT (card HB PR 5; `?afterpaint=0`) ═══
   placeOverHead is the prompt's ref, made anew at every render of BroTown: React let go of the old one and called
   the new one at EVERY commit while the prompt was up, and each call measured the canvas, the prompt and every
   button on the page (getBoundingClientRect, getComputedStyle), right after React had changed the page: the
   browser laid the whole page out there, in the commit.  That is the debt list's `other: R > J` (J2's find; 39.2
   ms on budget-android at `town`, its line 16: docs/plan/census/HB-holds.md row 11).  Now the ref only asks for
   the placing, once a frame, at the top of the next one (requestAnimationFrame), where the page the browser has
   just drawn is already laid out and the reads cost little.  The prompt is placed a frame later than before:
   the first time it shows it waits hidden for that frame (never a frame at the wrong place), after that it
   keeps its place until the next frame's.  Decided for the owner while away (the planning session, 2026-11-18),
   ON by default; `?afterpaint=0` places it in the commit, as before.  The same switch covers the coach's and the
   band's measures (card HB's next PRs). */
export function placeOverHead(stateRef) {
  return function (el) {
    if (!el) return;
    if (!AFTER_PAINT || typeof requestAnimationFrame !== 'function') { placeOverHeadNow(el, stateRef); return; }
    if (el.__btPlaceRaf) return;   /* one placing a frame, however many commits */
    if (!el.__btPlaced) el.style.visibility = 'hidden';   /* first shown: when placed */
    el.__btPlaceRaf = requestAnimationFrame(function () {
      el.__btPlaceRaf = 0;
      if (!el.isConnected) return;
      placeOverHeadNow(el, stateRef);
      el.__btPlaced = true;
      el.style.visibility = '';
    });
  };
}
function placeOverHeadNow(el, stateRef) {
    try {
      var S = stateRef && stateRef.current;
      var p = playerScreenPoint(S);
      if (!p) return;
      el.style.bottom = 'auto';
      el.style.left = '0px'; el.style.top = '0px'; el.style.maxWidth = 'min(260px, 86%)';
      var r0 = el.getBoundingClientRect();   /* promptPulse animates translateX(-50%) (+ a scale): so the centre is `left`, the bottom edge is top + its own height */
      var ox = r0.left + el.offsetWidth / 2;   /* where fixed 0 is: the animation's translateX(-50%) shifted the box by half its width */
      /* kept inside the screen (a door by the world's edge: the player is off-centre, the prompt is
         wide) ... */
      var half = el.offsetWidth / 2, vw = window.innerWidth || 0;
      var cx = vw > 2 * (half + 8) ? Math.max(8 + half, Math.min(vw - 8 - half, p.x)) : p.x;
      var top = p.y - r0.top - 6 - el.offsetHeight;
      el.style.left = Math.round(cx - ox) + 'px';
      el.style.top = Math.round(top) + 'px';
      /* ... and never over another button (the skateboard's, the weapon pill, the bell): raised
         clear of the highest one it lies over, not above the top bar */
      for (var i = 0; i < 12; i++) {
        var r = el.getBoundingClientRect(), hit = null;
        var bs = document.querySelectorAll('button, [role="button"]');
        for (var j = 0; j < bs.length; j++) {
          var q = bs[j];
          if (q === el || el.contains(q) || q.contains(el)) continue;
          var c = q.getBoundingClientRect();
          if (c.width < 4 || c.height < 4) continue;
          var cs = getComputedStyle(q);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
          if (Math.min(r.right, c.right) - Math.max(r.left, c.left) > 2 && Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) > 2 && (!hit || c.top < hit.top)) hit = c;
        }
        if (!hit) break;
        /* the smallest move that clears it and stays on the screen: aside (the minimap is a column at the
           right edge) or up (not above the top bar) */
        var dxL = r.right - hit.left + 6, dxR = hit.right - r.left + 6, dyU = r.bottom - hit.top + 6;
        var best = null;
        if (r.left - dxL >= 8) best = { k: 'l', d: dxL };
        if (r.right + dxR <= vw - 8 && (!best || dxR < best.d)) best = { k: 'r', d: dxR };
        if (r.top - dyU >= 56 && (!best || dyU < best.d)) best = { k: 'u', d: dyU };
        if (!best) break;
        if (best.k === 'u') top -= best.d; else cx += best.k === 'l' ? -best.d : best.d;
        el.style.left = Math.round(cx - ox) + 'px';
        el.style.top = Math.round(top) + 'px';
      }
    } catch (e) { /* the CSS place stands */ }
}
