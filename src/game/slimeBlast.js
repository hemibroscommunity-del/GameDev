/* ═══ v2.3.3679: WHAT A SLIME'S BLAST LEAVES BEHIND ═══
 *
 * The owner, 2026-10-27: "It would be fun to make the slime explosions destroy
 * any nearby props (trees)" and "It would also be funny if the slime
 * explosions left black soot explosion mark on the ground for a while".
 *
 * Called by the two blasts the worker sends (networking/gameEvents.js): a blue
 * slime's death burst and the Goo Grotto's giant slime splitting -- at the
 * worker's own middle and radius, the ones it hurt players with.  Display
 * only: the soot goes in S._sootQueue for the renderer (rendering/sootMarks.js),
 * and in the Wheel the objects in reach break (game/wheelBreak.js
 * blastWheelObjects), on this screen alone like every break.
 */
import { blastWheelObjects } from './wheelBreak.js';
import { earVol } from './hitSounds.js';

export function slimeBlastAftermath(S, x, y, r) {
  if (!S || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const rad = Math.max(10, Math.min(600, Number(r) || 110));
  if (!S._sootQueue) S._sootQueue = [];
  if (S._sootQueue.length < 8) S._sootQueue.push({ x, y, r: rad, at: Date.now(), zone: S.currentZone });
  if (S.currentZone !== 'wheel') return null;
  try { return blastWheelObjects(S, x, y, rad, { k: earVol(S, x, y) }); } catch (e) { return null; }
}
