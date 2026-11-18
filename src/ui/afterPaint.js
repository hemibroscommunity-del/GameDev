/* ═══ v2.3.6280: `?afterpaint`, READ ONCE FOR EVERY PAGE MEASURE IT MOVES (card HB2 PR 1) ═══
 * Card HB's #2209 (v2.3.6244) moved the door prompt's measures out of React's commit to the top of the next frame
 * behind `?afterpaint` (ON; `=0` the old place).  The same switch covers the quest coach's measures (QuestCoach.jsx,
 * mayorScreen.js) and, as card HB2's next PRs land, the band's and the taps'.  One reader, so the parts can never
 * disagree.  The switch's row: tools/guards/lib/switches.mjs `?afterpaint`. */
import { sw } from '../game/switches.js';   /* the page's one reader of its switches */

export const AFTER_PAINT = (function () { try { return !sw('afterpaint'); } catch (e) { return true; } })();
