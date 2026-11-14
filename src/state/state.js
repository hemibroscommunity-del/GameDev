/* ═══ v2.3.5160: THE STATE LEDGER, system `state` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `state` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger state --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'state';
export const ROWS = [
  { variable: 'resetStats', file: 'src/game/resetOn.js', system: 'state', lifetime: 'sitting', suggested: '?', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/resetOn.js'] },
];
