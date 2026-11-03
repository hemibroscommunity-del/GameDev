/* ═══ v2.3.3953: WHERE A FULL SET'S FIGURE CHANGES FROM TORSO TO GREAVES ═══
 *
 * Jogging in a matched set, the armour is ONE picture on the body sprite
 * (entityRenderer _fullsetFrame) on every facing but north-east / north-west,
 * so the grade's glow (glint.js) cannot tell the torso from the greaves by the
 * sprite it is on.  It is told the waist row instead: the jog frame's own
 * pants-top row (jogWaist.js, authored in 256-space rows, the same row the
 * bow's jog-legs composite cuts at), as a fraction of the frame, which is what
 * the shader's `p.y` measures.  The figure's sheet plays its own frame count
 * on the jog's phase (getGearFramePhased), so the row is looked up by that
 * same phase where the caller has it -- east's figure has 25 frames against
 * the table's 28 -- and by the body's frame otherwise.  Checked against the
 * four figure sheets: the row falls on the top of the chain belt in every
 * facing (the PR's pictures).  No import of the renderer: node can test it.
 */
import { JOG_WAIST } from '../jogWaist.js';

/** The waist of the full-set figure jogging `dir` at this frame, 0-1 down
 *  the frame; 0 when the facing has no row (the caller then draws one grade
 *  over the whole figure, as before v2.3.3953). */
export function fullsetSplitY(dir, frameIdx, phase) {
  const a = JOG_WAIST[dir];
  if (!a || !a.length) return 0;
  let i = (phase != null && Number.isFinite(phase))
    ? Math.floor((((phase % 1) + 1) % 1) * a.length)
    : Math.floor(Number(frameIdx) || 0);
  i = ((i % a.length) + a.length) % a.length;
  return a[i] / 256;
}
