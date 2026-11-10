/* ═══ v2.3.4106: WHERE MAYOR BRO IS ON THE PAGE ═══
 * The first steps' second step is "talk to Mayor Bro" (the owner, 2026-11-03),
 * and both the coach's ring (ui/mobile/QuestCoach.jsx, lesson `mayor`) and the
 * big arrow (ui/guideArrow.js) point at him: one sum, here, so the two always
 * agree.  No imports: the DOM and the game state only.
 */
/* ═══ v2.3.4460: THE CANVAS'S PLACE ON THE PAGE IS REMEMBERED ═══
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
let _cv = null, _box = null, _boxAt = 0, _wired = false, _ro = null;
function canvasBox() {
  const now = Date.now();
  if (_cv && _box && _cv.isConnected && now - _boxAt < RECT_MS) return _box;
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
  _box = { left: r.left, top: r.top };
  _boxAt = now;
  return _box;
}

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
  const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  if (left + w < 0 || top + h < 0 || left > vw || top > vh) return null;
  return { left: left, top: top, width: w, height: h };
}
