/* ═══ v2.3.4106: WHERE MAYOR BRO IS ON THE PAGE ═══
 * The first steps' second step is "talk to Mayor Bro" (the owner, 2026-11-03),
 * and both the coach's ring (ui/mobile/QuestCoach.jsx, lesson `mayor`) and the
 * big arrow (ui/guideArrow.js) point at him: one sum, here, so the two always
 * agree.  No imports: the DOM and the game state only.
 */
/* Mayor Bro's body on the page (CSS px), or null when he is not here or off
   the screen -- the same screen sums as BroTown's npcAtCss */
export function mayorScreenRect(S) {
  const cam = S && S.camera;
  const npcs = S && Array.isArray(S.npcs) ? S.npcs : null;
  if (!cam || !npcs || typeof document === 'undefined') return null;
  const n = npcs.find(function (o) { return o && o.name === 'Mayor Bro' && o.alive !== false; });
  if (!n) return null;
  const c = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!c) return null;
  const cr = c.getBoundingClientRect();
  const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  const x = typeof n.renderX === 'number' ? n.renderX : n.x, y = typeof n.renderY === 'number' ? n.renderY : n.y;
  const w = 64 * sx, h = 116 * sy;
  const left = cr.left + (x - cam.x) * sx - w / 2, top = cr.top + (y - cam.y) * sy - h + 14 * sy;
  if (!isFinite(left) || !isFinite(top)) return null;
  const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  if (left + w < 0 || top + h < 0 || left > vw || top > vh) return null;
  return { left: left, top: top, width: w, height: h };
}
