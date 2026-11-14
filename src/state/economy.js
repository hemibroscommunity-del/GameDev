/* ═══ v2.3.5160: THE STATE LEDGER, system `economy` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `economy` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger economy --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'economy';
export const ROWS = [
  { field: '_bank', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/bank.js onBankState', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/bank.js'] },
  { field: '_bankPending', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/bank.js bankMove', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/bank.js'] },
  { field: '_dailyRewards', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/dailyRewards.js applyRewardsState', twoFiles: '', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/dailyRewards.js'] },
  { field: '_dlCredits', system: 'economy', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/dropLines.js credits', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/dropLines.js'] },
  { field: '_dropLast', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/itemDrop.js applyItemDropResult', twoFiles: '', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/itemDrop.js'] },
  { field: '_dropLines', system: 'economy', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/dropLines.js groups', twoFiles: '2+~', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/dropLines.js', 'src/rendering/dropLines.js~'] },
  { field: '_mail', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/postOffice.js recordMail', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/postOffice.js'] },
  { field: '_mktPlaceBusy', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/storeSellTap.js claimPlace', twoFiles: '', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/storeSellTap.js'] },
  { field: '_revealLast', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/revealBag.js applyItemReveal', twoFiles: '', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/revealBag.js'] },
  { field: '_spinBoard', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/spinBoard.js onSpinBoard', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/spinBoard.js'] },
  { field: '_t2Leave', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/tradeSlot.js t2LeaveDrop', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/tradeSlot.js'] },
  { field: '_t2QuietUntil', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/tradeSlot.js close', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/tradeSlot.js'] },
  { variable: 'listeners', file: 'src/game/bank.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/bank.js'] },
  { variable: 'rev', file: 'src/game/bank.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/bank.js'] },
  { variable: 'seq', file: 'src/game/bank.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/bank.js'] },
  { variable: '_lastSpin', file: 'src/game/dailyRewards.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/dailyRewards.js'] },
  { variable: '_listeners', file: 'src/game/dailyRewards.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/dailyRewards.js'] },
  { variable: '_spinSeq', file: 'src/game/dailyRewards.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: true, phase: null, flag: false, neverChanged: false, writers: ['src/game/dailyRewards.js'] },
  { variable: '_state', file: 'src/game/dailyRewards.js', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/dailyRewards.js'] },
  { variable: '_win', file: 'src/game/dailyRewards.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/dailyRewards.js'] },
  { variable: 'thumb', file: 'src/game/dropLook.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/dropLook.js'] },
  { variable: '_st', file: 'src/game/loginSpinWheel.js', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'let object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loginSpinWheel.js'] },
  { variable: 'listeners', file: 'src/game/loginSpinWheel.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/loginSpinWheel.js'] },
  { variable: '_after', file: 'src/game/revealBag.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/revealBag.js'] },
  { variable: '_held', file: 'src/game/revealBag.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/revealBag.js'] },
  { variable: '_then', file: 'src/game/revealBag.js', system: 'economy', lifetime: 'sitting', suggested: 'rejoin', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/revealBag.js'] },
  { variable: '_last', file: 'src/game/salvage.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/salvage.js'] },
  { variable: '_listeners', file: 'src/game/salvage.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/salvage.js'] },
  { variable: 'listeners', file: 'src/game/spinBoard.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/spinBoard.js'] },
  { variable: 'sellsOut', file: 'src/game/storeAnswer.js', system: 'economy', lifetime: 'sitting', suggested: 'never', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/storeAnswer.js'] },
];
