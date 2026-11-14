/* ═══ v2.3.5160: THE STATE LEDGER, system `quests` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `quests` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger quests --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'quests';
export const ROWS = [
  { field: '_achv', system: 'quests', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/achievements.js achvOf', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/achievements.js', 'src/ui/panels/AchievementBanner.jsx'] },
  { field: '_levelUpFlash', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/levelCelebration.js celebrateLifeSkillLevel', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/levelCelebration.js', 'src/game/stateCleanup.js'] },
  { field: '_pointsResetAskedAt', system: 'quests', lifetime: 'sitting', suggested: 'rejoin', born: 'fly src/game/pointsReset.js requestPointsReset', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/pointsReset.js'] },
  { field: '_qcNextPoll', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/questComplete.js checkQuestComplete', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/questComplete.js'] },
  { field: '_qcSeen', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/questComplete.js checkQuestComplete', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/questComplete.js'] },
  { field: '_xpBar', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/xpBar.js noteProg3Xp', twoFiles: '2+~', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/killXp.js~', 'src/game/xpBar.js'] },
  { field: '_xpCarry', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'fly src/game/xpBar.js noteProg3Xp', twoFiles: '2+', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/killXp.js', 'src/game/xpBar.js'] },
  { variable: '_titlePick', file: 'src/game/achievements.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/achievements.js'] },
  { variable: 'POINTS_FLY_SKILLS', file: 'src/game/pointsBubbles.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'var array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'FLY_Z', file: 'src/game/questFly.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'var number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: 'QUEST_FLY_TARGETS', file: 'src/game/questFly.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'var object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: true, writers: [] },
  { variable: '_pending', file: 'src/game/questHandIn.js', system: 'quests', lifetime: 'sitting', suggested: 'rejoin', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/questHandIn.js'] },
  { variable: '_kept', file: 'src/game/questKept.js', system: 'quests', lifetime: 'sitting', suggested: 'rejoin', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/questKept.js'] },
  { variable: '_lastShown', file: 'src/game/questTrailStyle.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'let call', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/questTrailStyle.js'] },
  { variable: '_style', file: 'src/game/questTrailStyle.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'let call', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/questTrailStyle.js'] },
  { variable: '_id', file: 'src/game/trackedQuest.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/trackedQuest.js'] },
  { variable: '_read', file: 'src/game/trackedQuest.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/trackedQuest.js'] },
  { variable: '_subs', file: 'src/game/trackedQuest.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/trackedQuest.js'] },
  { variable: '_listeners', file: 'src/game/xpBar.js', system: 'quests', lifetime: 'sitting', suggested: 'never', born: 'const Set', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/xpBar.js'] },
];
