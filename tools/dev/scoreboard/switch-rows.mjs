/* v2.3.5301 (grand plan step 7.1, card T PR 1): part 3's row "Switches with
   a row (risk, what it needs, fallback or not)".  N of M: N the rows of kind
   `switch` that are whole (every column, `born` known); M the switches found,
   those rows and every name the scanner finds that has no row yet (each may
   be a switch until a person judges it).  The table: tools/guards/lib/
   switches.mjs; the scanner: tools/guards/lib/switchScan.mjs; the guard that
   holds both: tools/guards/switches.test.mjs. */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export default async function switchRows({ root }) {
  const { SWITCHES, COLUMNS } = await import(pathToFileURL(join(root, 'tools/guards/lib/switches.mjs')).href);
  const { census } = await import(pathToFileURL(join(root, 'tools/guards/lib/switchScan.mjs')).href);
  const { found } = await census();
  const rows = new Set(SWITCHES.map((r) => r.name));
  const unlisted = [...found.keys()].filter((n) => !rows.has(n)).length;
  const switches = SWITCHES.filter((r) => r.kind === 'switch');
  const whole = switches.filter((r) => COLUMNS.every((c) => Object.hasOwn(r, c)) && r.born !== 'unknown').length;
  return { say: `${whole} of ${switches.length + unlisted}`, note: `${unlisted} names found with no row yet; ${SWITCHES.length - switches.length} rows are values or levers` };
}
