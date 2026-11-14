/* ═══ v2.3.5160: THE STATE LEDGER, system `input` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `input` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger input --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'input';
export const ROWS = [
  { field: '_burstMsgAt', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/playerActions.js elementBurst', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/playerActions.js'] },
  { field: '_hasUsedSwipe', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/playerActions.js specialAttack', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/playerActions.js', 'src/ui/BroTown.jsx'] },
  { field: '_iceAttack', system: 'input', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/playerActions.js specialAttack', twoFiles: '', noRead: true, noSet: false, phase: null, flag: true, writers: ['src/game/playerActions.js'] },
  { field: '_lastBurstAt', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/playerActions.js elementBurst', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/playerActions.js'] },
  { field: '_lastSwipe', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/playerActions.js specialAttack', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/playerActions.js'] },
  { field: '_shieldStamina', system: 'input', lifetime: 'sitting', suggested: 'death', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { field: '_specialAttack', system: 'input', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/playerActions.js swingAttack', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/abilities.js', 'src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: 'shieldActive', system: 'input', lifetime: 'sitting', suggested: 'death', born: 'first src/ui/BroTown.jsx', twoFiles: '2+', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/playerActions.js', 'src/game/shieldToggle.js'] },
  { field: 'swingTimer', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'first src/ui/BroTown.jsx', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/abilities.js', 'src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { variable: 'HOLDS', file: 'src/game/controlVisibility.js', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/controlVisibility.js'] },
  { variable: '_armed', file: 'src/ui/swallowTapClick.js', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/ui/swallowTapClick.js'] },
  { variable: '_bound', file: 'src/ui/swallowTapClick.js', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/ui/swallowTapClick.js'] },
  { variable: '_off', file: 'src/ui/swallowTapClick.js', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/ui/swallowTapClick.js'] },
  { variable: '_qa', file: 'src/ui/swallowTapClick.js', system: 'input', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/ui/swallowTapClick.js'] },
];
