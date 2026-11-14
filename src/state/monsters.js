/* ═══ v2.3.5160: THE STATE LEDGER, system `monsters` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `monsters` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger monsters --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'monsters';
export const ROWS = [
  { field: '_bowShotAng', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_bowSight', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_bowSpecialQueued', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_codex', system: 'monsters', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/monsterCodex.js codexOf', twoFiles: '2+~', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCodex.js', 'src/ui/panels/NewMonsterCard.jsx~'] },
  { field: '_cursedUntil', system: 'monsters', lifetime: 'sitting', suggested: 'death', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_deathDrops', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'first src/ui/BroTown.jsx', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/zoneTransitions.js', 'src/ui/BroTown.jsx'] },
  { field: '_hitFlash', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/projectiles.js', 'src/networking/gameEvents.js'] },
  { field: '_killSlowmo', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/ui/BroTown.jsx'] },
  { field: '_killSlowmoDuration', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'never', twoFiles: '', noRead: false, noSet: true, phase: null, flag: false, writers: [] },
  { field: '_monNoiseAt', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterNoises.js call', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterNoises.js'] },
  { field: '_ownCollisionRecent', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/projectiles.js'] },
  { field: '_ownSpecialRecent', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_playerStunUntil', system: 'monsters', lifetime: 'sitting', suggested: 'death', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_propSwingAt', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_pvpThreat', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: true, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/projectiles.js'] },
  { field: '_rpgSaveTimer', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_sootQueue', system: 'monsters', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/slimeBlast.js slimeBlastAftermath', twoFiles: '2+~', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/slimeBlast.js', 'src/rendering/sootMarks.js~'] },
  { field: '_staffCadenceMs', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js'] },
  { field: '_staffCastAng', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_staffCastAt', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_staffCastBig', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_swingBcastPending', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_swingSfxKey', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js'] },
  { field: '_swingSfxPending', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/monsterCombat.js updateMonsterCombat', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/monsterCombat.js', 'src/game/playerActions.js', 'src/game/shieldToggle.js', 'src/ui/BroTown.jsx'] },
  { field: 'isSwinging', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'first src/ui/BroTown.jsx', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: true, writers: ['src/game/abilities.js', 'src/game/climbActions.js', 'src/game/monsterCombat.js', 'src/game/playerActions.js', 'src/game/shieldToggle.js', 'src/ui/BroTown.jsx'] },
  { field: 'lastDamageTaken', system: 'monsters', lifetime: 'sitting', suggested: 'never', born: 'first src/ui/BroTown.jsx', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/monsterCombat.js', 'src/game/projectiles.js', 'src/networking/gameEvents.js'] },
  { variable: '_caps', file: 'src/game/monsterMoves.js', system: 'monsters', lifetime: 'sitting', suggested: 'rejoin', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/monsterMoves.js'] },
];
