/* ═══ v2.3.5160: THE STATE LEDGER, system `device` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `device` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger device --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'device';
export const ROWS = [
  { variable: '_chipOf', file: 'src/game/deviceProfile.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'const WeakMap', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/deviceProfile.js'] },
  { variable: '_mq', file: 'src/game/deviceProfile.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/deviceProfile.js'] },
  { variable: '_classOf', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_lane', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_laneAskedAt', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_rung', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let value', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_subs', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_told', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_urlLane', file: 'src/game/drawLanes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let none', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/drawLanes.js'] },
  { variable: '_groups', file: 'src/game/loadTimes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loadTimes.js'] },
  { variable: '_groupsFrom', file: 'src/game/loadTimes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loadTimes.js'] },
  { variable: '_marks', file: 'src/game/loadTimes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'const array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loadTimes.js'] },
  { variable: '_seen', file: 'src/game/loadTimes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loadTimes.js'] },
  { variable: '_budgetOn', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_cssH', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_cssW', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_live', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_phone', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_url', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_urlBudget', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_viewOut', file: 'src/game/renderRes.js', system: 'device', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/renderRes.js'] },
  { variable: '_card', file: 'src/game/speedTest.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/speedTest.js'] },
  { variable: '_running', file: 'src/game/speedTest.js', system: 'device', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/speedTest.js'] },
];
