/* ═══ v2.3.5160: THE STATE LEDGER, system `page-thread` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `page-thread` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger page-thread --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'page-thread';
export const ROWS = [
  { field: '__pixiErrStreak', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/renderFrame.js renderFrame', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/renderFrame.js'] },
  { field: '_heapBurnSentAt', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/heapBurn.js heapBurnStep', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/heapBurn.js'] },
  { field: '_heapBurnUntil', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/heapBurn.js heapBurnStep', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/heapBurn.js'] },
  { field: '_splitLog', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/renderFrame.js renderFrame', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/renderFrame.js'] },
  { field: 'campfires', system: 'page-thread', lifetime: 'sitting', suggested: 'zone', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { field: 'projectiles', system: 'page-thread', lifetime: 'sitting', suggested: 'zone', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { variable: '_before', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'const array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_busyIn', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_drawnAt', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_held', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: '?', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_returned', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: '?', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_samples', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_wasHidden', file: 'src/game/framePacer.js', system: 'page-thread', lifetime: 'sitting', suggested: '?', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/framePacer.js'] },
  { variable: '_fns', file: 'src/ui/afterFrame.js', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/ui/afterFrame.js'] },
  { variable: '_ranAt', file: 'src/ui/afterFrame.js', system: 'page-thread', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/ui/afterFrame.js'] },
];
