/* ═══ v2.3.5160: THE STATE LEDGER, system `session` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `session` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger session --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'session';
export const ROWS = [
  { field: '_blockFlash', system: 'session', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/stateCleanup.js updateStateCleanup', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/projectiles.js', 'src/game/stateCleanup.js'] },
  { field: '_deathFlash', system: 'session', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/stateCleanup.js updateStateCleanup', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/stateCleanup.js', 'src/networking/wsClient.js', 'src/ui/BroTown.jsx'] },
  { field: '_mapWatchSent', system: 'session', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/presence2.js sendMapWatch', twoFiles: '', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/presence2.js'] },
  { field: '_onlineAt', system: 'session', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/presence2.js applyOnlineList', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/presence2.js'] },
];
