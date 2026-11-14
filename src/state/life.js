/* ═══ v2.3.5160: THE STATE LEDGER, system `life` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `life` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger life --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'life';
export const ROWS = [
  { field: '_deathCard', system: 'life', lifetime: 'sitting', suggested: 'death', born: 'fly src/game/deathCard.js noteDeath', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/deathCard.js'] },
];
