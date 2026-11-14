/* ═══ v2.3.5160: THE STATE LEDGER, system `liveops` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `liveops` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger liveops --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'liveops';
export const ROWS = [
  { field: '_testMode', system: 'liveops', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/testMode.js applyTestMode', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/testMode.js'] },
];
