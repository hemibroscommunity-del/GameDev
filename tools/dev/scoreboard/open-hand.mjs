/* v2.3.6524 (card WL PR 5): the open hand (step 5.7): code lines under
   src/ that reach window._gameState or window._gameFns, read off the tree
   by the open hand's own census (tools/guards/lib/openHand.mjs, card WL PR
   4), so the guard and the scoreboard can never say two numbers.  Its line
   (lib/openHandKnown.mjs LINE) only falls; closing the hand is not card
   WL's. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function openHand({ root }) {
  const lib = join(root, 'tools/guards/lib/openHand.mjs');
  if (!existsSync(lib)) return { say: null, note: 'no open-hand census on this tree (card WL PR 4)' };
  const { loadBabel, openHandCensus, realSources, KNOWN_PATH } = await import(pathToFileURL(lib).href);
  const babel = loadBabel(root);
  if (!babel) return { say: null, note: '@babel/parser is not installed here' };
  const reach = openHandCensus(babel, realSources(root));
  let n = 0;
  for (const lines of reach.values()) n += lines.size;
  let line = null;
  if (existsSync(join(root, KNOWN_PATH))) ({ LINE: line } = await import(pathToFileURL(join(root, KNOWN_PATH)).href));
  return { say: String(n), note: `code lines in ${reach.size} files` + (line !== null ? `; the line ${line}` : '') };
}
