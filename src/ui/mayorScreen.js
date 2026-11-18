/* ═══ v2.3.4106: WHERE MAYOR BRO IS ON THE PAGE ═══
 * The first steps' second step is "talk to Mayor Bro" (the owner, 2026-11-03),
 * and both the coach's ring (ui/mobile/QuestCoach.jsx, lesson `mayor`) and the
 * big arrow (ui/guideArrow.js) point at him: one sum, here, so the two always
 * agree.  No imports: the DOM and the game state only (v2.3.6280: and the
 * frame's top, framePacer.js, with the `?afterpaint` switch).
 */
import { beforeDraw } from '../game/framePacer.js';
import { AFTER_PAINT } from './afterPaint.js';
/* ═══ v2.3.4470: THE CANVAS'S PLACE ON THE PAGE IS REMEMBERED ═══
   Since v2.3.4360 the Mayor's arrow and the coach's box ask this after EVERY
   frame (ui/afterFrame.js), and each ask searched the page for the canvas and
   measured it: a measurement makes the browser lay the whole page out there
   and then, in the middle of the script, whatever the frame had just changed
   -- and the arrow's own move made it lay it out again at the frame's end
   (the whole-game sweep, docs/specs/held-sweep.md: up to 32 ms in one frame
   of a new player's first minutes).  The canvas only moves when the window
   or the layout does, so its place is kept: measured again when the window
   is resized or turned, when the canvas itself is replaced or changes size,
   and every RECT_MS regardless (a layout change nothing announced). */
const RECT_MS = 500;
let _cv = null, _box = null, _boxAt = 0, _wired = false, _ro = null, _asked = false;
/* ═══ v2.3.6280: ...AND MEASURED AGAIN AT THE TOP OF A FRAME, NOT WHERE IT IS ASKED (card HB2 PR 1; `?afterpaint`) ═══
   Remembered, the box was still measured again where it was asked once it was RECT_MS old (or a resize had
   marked it): in the coach's render, in the commit (QuestCoach's [view] layout effect), after the game had drawn
   its frame (afterFrame.js), and in the coach's own loop (`step > live > canvasBox`, 15.4 ms on budget-android:
   docs/plan/census/HB-holds.md rows 10, 12, 32).  Each one laid the page out there.  Now a box that is old but
   still the canvas's is handed back as it is, and measured again at the top of the game's next frame
   (framePacer.js beforeDraw), where the page the browser has just drawn is laid out and a read costs little: a
   resize reaches the ring a frame later.  The window's size is kept with it (`vw`, `vh`: innerWidth lays the page
   out too).  Only the very first box, with nothing to hand back, is measured where it is asked.
   `?afterpaint=0`: measured where it is asked, as before. */
function canvasBox() {
  const now = Date.now();
  if (_cv && _box && _cv.isConnected && now - _boxAt < RECT_MS) return _box;
  if (AFTER_PAINT && _cv && _box && _cv.isConnected) {
    if (!_asked) {
      _asked = true;
      beforeDraw(function () { _asked = false; if (_cv && _cv.isConnected && Date.now() - _boxAt >= RECT_MS) _measureBox(Date.now()); });
    }
    return _box;
  }
  return _measureBox(now);
}
function _measureBox(now) {
  let c = (_cv && _cv.isConnected) ? _cv : null;
  if (!c) c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!c) { _cv = null; _box = null; return null; }
  if (!_wired && typeof window !== 'undefined' && window.addEventListener) {
    _wired = true;
    const stale = function () { _boxAt = 0; };
    window.addEventListener('resize', stale, true);
    window.addEventListener('orientationchange', stale, true);
  }
  if (c !== _cv) {
    _cv = c;
    try { if (_ro) _ro.disconnect(); } catch (e) { /* gone */ }
    _ro = null;
    try { if (typeof ResizeObserver === 'function') { _ro = new ResizeObserver(function () { _boxAt = 0; }); _ro.observe(c); } } catch (e) { _ro = null; }
  }
  const r = c.getBoundingClientRect();
  _box = { left: r.left, top: r.top, vw: window.innerWidth || 0, vh: window.innerHeight || 0 };
  _boxAt = now;
  return _box;
}
/** v2.3.6280: the canvas's place on the page as remembered above (QuestCoach's `chatTap` ring and its card's
 *  sums read it under `?afterpaint`), or null with no canvas. */
export function canvasPlace() { return canvasBox(); }

/* Mayor Bro's body on the page (CSS px), or null when he is not here or off
   the screen -- the same screen sums as BroTown's npcAtCss */
export function mayorScreenRect(S) {
  const cam = S && S.camera;
  const npcs = S && Array.isArray(S.npcs) ? S.npcs : null;
  if (!cam || !npcs || typeof document === 'undefined') return null;
  const n = npcs.find(function (o) { return o && o.name === 'Mayor Bro' && o.alive !== false; });
  if (!n) return null;
  const cr = canvasBox();
  if (!cr) return null;
  const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  const x = typeof n.renderX === 'number' ? n.renderX : n.x, y = typeof n.renderY === 'number' ? n.renderY : n.y;
  const w = 64 * sx, h = 116 * sy;
  const left = cr.left + (x - cam.x) * sx - w / 2, top = cr.top + (y - cam.y) * sy - h + 14 * sy;
  if (!isFinite(left) || !isFinite(top)) return null;
  const vw = AFTER_PAINT ? cr.vw : (window.innerWidth || 0), vh = AFTER_PAINT ? cr.vh : (window.innerHeight || 0);   /* v2.3.6280: kept with the box */
  if (left + w < 0 || top + h < 0 || left > vw || top > vh) return null;
  return { left: left, top: top, width: w, height: h };
}
