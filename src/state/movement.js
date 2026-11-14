/* ═══ v2.3.5160: THE STATE LEDGER, system `movement` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `movement` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger movement --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'movement';
export const ROWS = [
  { field: '_avatarArtHold', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/avatarHold.js holdForAvatar', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/avatarHold.js'] },
  { field: '_climb', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/climbActions.js climbBegin', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js', 'src/ui/BroTown.jsx'] },
  { field: '_climbDrop', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/climbActions.js climbTick', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js', 'src/ui/BroTown.jsx'] },
  { field: '_flipCount', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js triggerFlip', twoFiles: '', noRead: 'tests', noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_jump', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/jump.js startJump', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jump.js', 'src/game/jumpActions.js'] },
  { field: '_jumpCount', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js triggerJump', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_jumpLandAt', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jump.js endJump', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jump.js'] },
  { field: '_jumpLandFx', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js tickJump', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_jumpOver', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/jump.js endJump', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jump.js'] },
  { field: '_jumpWhy', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js triggerJump', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_lastFlip', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js triggerFlip', twoFiles: '', noRead: 'tests', noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_lastJumpRun', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/jumpActions.js tickJump', twoFiles: '', noRead: 'tests', noSet: false, phase: null, flag: false, writers: ['src/game/jumpActions.js'] },
  { field: '_nearChest', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/climbActions.js climbTick', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js', 'src/ui/BroTown.jsx'] },
  { field: '_pushY', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/climbActions.js climbSteer', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js'] },
  { field: '_restAsked', system: 'movement', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/rest.js requestRest', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/rest.js'] },
  { field: '_ride', system: 'movement', lifetime: 'sitting', suggested: 'zone+rejoin', born: 'fly src/game/ride.js r0', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/ride.js', 'src/ui/BroTown.jsx'] },
  { field: '_riseChestAsk', system: 'movement', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/climbActions.js openRiseChest', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js'] },
  { field: '_riseChestGot', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/climbActions.js onRiseChest', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js'] },
  { field: '_riseCross', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/climbActions.js riseSolidAt', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/climbActions.js', 'src/ui/BroTown.jsx'] },
  { field: '_sprint', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/sprint.js sp0', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/sprint.js'] },
  { field: '_sprintRunOuts', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/sprint.js sprintOutBreathTurn', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/sprint.js'] },
  { field: '_tapAtk', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/tapJump.js requestTapAttack', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/tapJump.js'] },
  { field: '_tapAtkWhy', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/tapJump.js requestTapAttack', twoFiles: '', noRead: 'tests', noSet: false, phase: null, flag: false, writers: ['src/game/tapJump.js'] },
  { field: '_tapAttacks', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/tapJump.js requestTapAttack', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/tapJump.js'] },
  { field: '_wheelSwim', system: 'movement', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/wheelSwim.js updateWheelSwim', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/wheelSwim.js'] },
  { variable: '_lastS', file: 'src/game/climbActions.js', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/climbActions.js'] },
  { variable: 'climbStats', file: 'src/game/climbActions.js', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/climbActions.js'] },
  { variable: '_jumpMs', file: 'src/game/jumpActions.js', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'var none', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/jumpActions.js'] },
  { variable: '_tapMs', file: 'src/game/tapJump.js', system: 'movement', lifetime: 'sitting', suggested: 'never', born: 'var none', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/tapJump.js'] },
];
