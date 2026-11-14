/* ═══ v2.3.5160: THE STATE LEDGER, system `townsfolk` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `townsfolk` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger townsfolk --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'townsfolk';
export const ROWS = [
  { field: '__btNoIdleMoves', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { field: '_dead', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { field: '_emoteAt', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/interactions.js sendEmote', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/interactions.js'] },
  { field: '_emoteMove', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/interactions.js sendMove', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/interactions.js'] },
  { field: '_idleChatAt', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/townChatter.js idleChatMay', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/townChatter.js'] },
  { field: '_idleChatSeq', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/townChatter.js idleChatMay', twoFiles: '', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/townChatter.js'] },
  { field: '_pose', system: 'townsfolk', lifetime: 'zone+rejoin', reset: 'fn endOwnPose', suggested: 'zone+rejoin', born: 'fly src/game/interactions.js sendMove', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/interactions.js', 'src/game/moveSounds.js~', 'src/game/rejoinSlots.js'] },
  { field: 'emote', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'first src/ui/BroTown.jsx', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/interactions.js'] },
  { variable: 'POSE_SHIFT_PX', file: 'src/game/interactions.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'IDLE_GAP_MS', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'IDLE_REACH', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'IDLE_TIMER_MAX_MS', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'IDLE_TIMER_MIN_MS', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'OLD_TIMER_MIN_MS', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'OLD_TIMER_SPAN_MS', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: '_off', file: 'src/game/townChatter.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'var null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townChatter.js'] },
  { variable: '_bumpsTotal', file: 'src/game/townsfolkDay.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townsfolkDay.js'] },
  { variable: '_frame', file: 'src/game/townsfolkDay.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townsfolkDay.js'] },
  { variable: '_giverSrc', file: 'src/game/townsfolkDay.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townsfolkDay.js'] },
  { variable: '_givers', file: 'src/game/townsfolkDay.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townsfolkDay.js'] },
  { variable: '_loops', file: 'src/game/townsfolkWalk.js', system: 'townsfolk', lifetime: 'sitting', suggested: 'never', born: 'const WeakMap', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townsfolkWalk.js'] },
];
