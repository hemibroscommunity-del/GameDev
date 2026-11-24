/* v2.3.6524 (card WL PR 5): the restart sweep's reach, in card BK's words
   (#2281, chaos-restart §7, tag 6461): "the sweep made from VALUE_PAUSE,
   crashed before every write and after the last, judged by unexplained()".
   N of M: N the value table's rows with a driver in the sweep (DRIVERS, read
   off the suite's tree, never run: it is a room's restart, a minute), M the
   rows of server/src/valuepause.js VALUE_PAUSE (every action that begins
   with a take on a `move` or `escrow` road).  The suite fails a row with no
   driver, so on a green main N is M; the row says it when the two part. */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { treeOf, constInit, objectKeys } from './_tree.mjs';

export default async function restartSweepReach({ root }) {
  const { VALUE_PAUSE } = await import(pathToFileURL(join(root, 'server/src/valuepause.js')).href);
  const rows = Object.keys(VALUE_PAUSE || {});
  const drivers = objectKeys(constInit(treeOf(root, 'server/test/chaos-restart.test.mjs') || { program: null }, 'DRIVERS'));
  if (!drivers) return { say: null, note: `chaos-restart has no sweep made from the value table on this tree (card BK's #2281), or a DRIVERS this cannot read whole (a spread, a key it cannot read); ${rows.length} rows in VALUE_PAUSE` };
  const have = new Set(drivers);
  const missing = rows.filter((k) => !have.has(k));
  return { say: `${rows.length - missing.length} of ${rows.length}`, note: 'value actions, each crashed before every write and after the last, judged by the world\'s sum' + (missing.length ? `; no driver: ${missing.join(', ')}` : '') };
}
