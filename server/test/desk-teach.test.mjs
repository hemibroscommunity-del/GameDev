/* THE FIRST-TIME TEACHING A NEW COMPUTER PLAYER MISSED -- v2.3.4343
 * (src/game/deskTeachState.js, src/ui/deskTeach.js, src/ui/guideArrow.js).
 * The owner watched a new player on a computer (2026-11-05):
 *   1. CLOSE: "played almost the whole time with the dashboard up" -> the big
 *      arrow points at CLOSE during the first quest's steps in the world;
 *   2. the harvest: the E was never seen -> a big E key by the character, the
 *      arrow at the gesture pad, a toast when the window passes unused;
 *   3. the other pine trees: pulsing rings, an edge arrow, a bigger minimap mark;
 *   4. "Click the monster to attack": a sword cursor and a line by the monster;
 *   5. special attacks and the shield never tried -> a one-time tips card
 *      (a computer) / the big arrow at the buttons (a phone). */
import { readFileSync } from 'fs';
globalThis.window = { matchMedia: () => ({ matches: true }), location: { search: '' } };   /* a computer */
globalThis.localStorage = (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })();
const G = await import('../../src/ui/guideArrow.js');
const T = await import('../../src/game/deskTeachState.js');

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const rd = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/* 1: CLOSE */
const worn = { _quests: { tut_1: 'active' }, weaponStash: [], shieldStash: [], weapon: { type: 'sword' }, shield: { name: 'Buckler' } };
const unworn = { _quests: { tut_1: 'active' }, weaponStash: [{ type: 'sword' }], shieldStash: [{ name: 'Buckler' }], weapon: null, shield: null };
check('1a CLOSE wanted while the first quest is active, weapons on', G.guideState('close', worn, null, 0, 0).want === true);
check('1b not while the weapons wait in the bag (the bag is needed), nor before the quest, nor after it', G.guideState('close', unworn, null, 0, 0).want === false && G.guideState('close', { _quests: {} }, null, 0, 0).want === false && G.guideState('close', { ...worn, _quests: { tut_1: 'turnedIn' } }, null, 0, 0).want === false);
check('1c done once the band is closed (not wanted after showing) or after CLOSE_MS', G.guideState('close', { _quests: {} }, null, 500, 0).done === true && G.guideState('close', worn, null, G.CLOSE_MS, 0).done === true && G.guideState('close', worn, null, 500, 0).done === false);
check('1d it points at the open band\'s CLOSE, in the owner\'s words, said "click" on a computer', G.guideTargets('close', worn, () => true)[0] === '[data-dash-close="open"]' && G.guideWords('close', '[data-dash-close="open"]', true) === 'Click CLOSE to see more of the world');

/* 2: the harvest */
const S0 = { myId: 'bp_t1', _extraction: { status: 'ready' } };
check('2a the gesture is wanted while the window is open', T.gestureWanted(S0) === true && T.gestureWanted({ _extraction: { status: 'waiting' } }) === false && T.gestureWanted({}) === false);
check('2b the harvest lesson (the arrow at the pad) is wanted on a computer while the window is open and fewer than 3 are done', G.guideState('harvest', {}, S0, 0, 0).want === true);
T.saveTeach('bp_t1', { harvest: 2 });
check('2c still owed at 2 done', T.harvestCoachWanted('bp_t1') === true && G.guideState('harvest', {}, S0, 0, 0).want === true);
T.saveTeach('bp_t1', { harvest: 3 });
check('2d finished at 3 done: not wanted, done once it had shown', T.harvestCoachWanted('bp_t1') === false && G.guideState('harvest', {}, S0, 0, 0).want === false && G.guideState('harvest', {}, S0, 500, 0).done === true);
check('2e it aims at the gesture pad, saying the E', G.guideTargets('harvest', {}, () => true)[0] === '.bt-rjoy-base' && /Press E/.test(G.guideWords('harvest', '.bt-rjoy-base', true)));

/* 3: the resource: where the edge arrow sits */
check('3a a target on the screen: no edge arrow', T.edgeArrowSpot(1000, 600, 500, 300, 30) === null);
const e1 = T.edgeArrowSpot(1000, 600, 2500, 300, 30);
check('3b a target far to the right: on the right edge, pointing right', e1 && Math.abs(e1.x - 970) < 1 && Math.abs(e1.y - 300) < 1 && Math.abs(e1.angle) < 0.01, e1);
const e2 = T.edgeArrowSpot(1000, 600, 500, -900, 30);
check('3c a target far above: on the top edge, pointing up', e2 && Math.abs(e2.y - 30) < 1 && Math.abs(e2.x - 500) < 1 && Math.abs(e2.angle + Math.PI / 2) < 0.01, e2);

/* 4: the sword cursor */
check('4a over a monster\'s circle: a hit; elsewhere: none', !!T.overAny(100, 100, [{ x: 110, y: 100, r: 20 }]) && T.overAny(300, 300, [{ x: 110, y: 100, r: 20 }]) === null);

/* 5: after the first kill */
check('5a a kill counted by the worker', T.killedAny({ _compStats: { monstersKilled: 1 } }) === true && T.killedAny({ _compStats: { monstersKilled: 0 } }) === false && T.killedAny({}) === false);
check('5b the phone\'s lesson: wanted after a kill on a phone only (this run is a computer: not wanted); aims at the special, then the shield', G.guideState('combat', { _compStats: { monstersKilled: 1 } }, null, 0, 0).want === false && G.guideTargets('combat', {}, () => true).join() === '[data-special],[data-shield]');
check('5c a character with no kills is owed the combat lesson again', G.guideOwedAgain({ _quests: {}, _compStats: { monstersKilled: 0 } }).includes('combat') && !G.guideOwedAgain({ _quests: {}, _compStats: { monstersKilled: 3 } }).includes('combat'));

/* the pieces are wired */
const dt = rd('../../src/ui/deskTeach.js'), coach = rd('../../src/ui/mobile/QuestCoach.jsx'), mini = rd('../../src/rendering/systems/wheelMinimap.js'), rew = rd('../../src/game/lifeSkillRewards.js');
check('6a QuestCoach mounts it; body-level, no pointer events, no CSS filter, ?guidearrow=0, per-character in try/catch',
  /startDeskTeach\(/.test(coach) && /document\.body\.appendChild\(el\)/.test(dt) && /pointer-events:none/.test(dt) && !/filter\s*[:=]/.test(dt) && /get\('guidearrow'\) === '0'/.test(dt) && /try \{ const v = JSON\.parse/.test(rd('../../src/game/deskTeachState.js')));
check('6b the toast says the owner\'s words; the harvest\'s success is stamped; the minimap reads the pulse',
  /Almost! Press E \(or drag\) when the bar empties to collect\./.test(dt) && /_lastHarvestOkAt = Date\.now\(\)/.test(rew) && /_teachNode/.test(mini));
check('6c the tips card names the right click and Q; the monster line is the owner\'s',
  /Right-click/.test(dt) && /Shield up \/ down/.test(dt) && /Click the monster to attack/.test(dt));

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('all passed');
