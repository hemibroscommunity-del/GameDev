/* ═══ THE FOUNDRY DOME'S GIANT SLIME SPLITS, ON A PHONE, IN THE WORLD (v2.3.3562, docs/specs/slime-boss.md) ═══
 *
 * The owner's "Yes" to "the Foundry Dome gets the splitting slime boss":
 * mp-slimeboss's whole run at the Foundry Dome, the walker raised to its level
 * (28).  Its boss is a giant Storm Slime, a kind that never bursts on death:
 * it splits as the Goo Grotto's does -- three marks on its bar, the swell,
 * 10, 9 then 8 of the Foundry's own slimes, a step smaller each time, nothing
 * arriving again in a re-push -- and its last form simply dies, the rest pop
 * and the dungeon clears.
 * Pictures: tools/qa/mp/out/foundryboss-{giant,swell,burst,split1,split2,split3,cleared}.png.
 */
import { runAt } from './mp-slimeboss.mjs';

export async function run(ctx) { return runAt(ctx, 'thunder'); }
