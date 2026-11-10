/* ═══ v2.3.4366: CHANGING PLACE ON THE PHONE -- THE DUNGEON'S OPENING AND THE FARM TRIP ═══
 *
 * The 2026-11-03 state-machine sweep (V11, G3-9, N2-10, P1-9), phone side only:
 *   1. THE ENTER GUARD.  A Wheel dungeon's opening (gameEvents.js
 *      dungeon_started) keeps you in the world behind its loading screen for
 *      up to 8 s while the arena's pictures load.  enterWheelDungeon refused a
 *      second Enter only once you were IN the arena (S._serverDungeon) or
 *      within 1 s, so a computer's E pressed again during the opening asked the
 *      worker for a new run: the worker ended the first and opened a second,
 *      and the first's late finish lifted the screen and unloaded the floor
 *      picture the second had taken.  The opening (S._wheelDungeonOpening)
 *      refuses it now.
 *   2. THE OPENING'S LATE FINISH.  It hid the shared loading screen BEFORE
 *      asking whether the opening was still its own, so an opening another one
 *      had replaced lifted the newer one's screen.  The hide comes after the
 *      check now.
 *   3. THE FARM TRIP.  The Land Office's "Travel to Farm" asked for the town's
 *      music after holdFarmUntilReady had asked for the farm's, so the farm
 *      played BroTown's track for the whole visit.  The three building trips
 *      (the Land Office, the Feed & Seed's "Visit Your Farm", the old Farm
 *      window) were hand copies that had already drifted; they are one
 *      function now, farmTrip.js warpToFarm, and none asks music of its own.
 * The code under test is cut from src/ and run here with stubs (React files
 * node does not run are read from their source).
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* the body of the block that opens at `start` (its first '{' on or after it),
   braces counted; null when not found */
function block(text, start) {
  const at = text.indexOf(start);
  if (at < 0) return null;
  const open = text.indexOf('{', at + start.length - 1);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return null;
}

/* ── 1. the Enter guard ── */
const wd = src('src/game/wheelDungeons.js');
const enterBody = block(wd, 'export function enterWheelDungeon(S, id) {');
check('1a enterWheelDungeon found in wheelDungeons.js', !!enterBody);
const enter = new Function('wheelDungeonOpen', 'BT_AUDIO', 'Date', 'return function (S, id) {' + enterBody + '};');
function tryEnter(extra) {
  const sent = [];
  const S = Object.assign({ channel: { send: (m) => sent.push(m) }, _wheelDoorAskedAt: 1000 }, extra);
  const r = enter(() => true, { enterBuilding() {} }, { now: () => 5000 })(S, 'goo_grotto');
  return { r, sent: sent.length };
}
const plain = tryEnter({});
check('1b a plain Enter at a mouth asks the worker once (the control)', plain.r === true && plain.sent === 1, plain);
const during = tryEnter({ _wheelDungeonOpening: 'dungeon:goo_grotto:abc' });
check('1c an Enter during the opening (4 s after the first: past the 1 s throttle) asks nothing', during.r === false && during.sent === 0, during);
const inside = tryEnter({ _serverDungeon: 'dungeon:goo_grotto:abc' });
const dying = tryEnter({ _dying: true });
check('1d ...and in the arena, or dying, still nothing (as before)', inside.sent === 0 && dying.sent === 0, { inside, dying });

/* ── 2. the opening's late finish ── */
const ge = src('src/networking/gameEvents.js');
const raceAt = ge.indexOf("S._wheelDungeonOpening = payload.zone;");
const thenBody = raceAt < 0 ? null : block(ge.slice(raceAt), ']).then(function () {');
check('2a the opening\'s finish found in gameEvents.js dungeon_started', !!thenBody);
function finish(opening, extra) {
  const calls = { hide: 0, enter: 0, freeFloor: 0, freeArt: 0, release: 0 };
  const S = Object.assign({ _wheelDungeonOpening: opening, currentZone: 'wheel', player: { x: 1, y: 1 } }, extra);
  const ctx = {
    S, payload: { zone: 'dungeon:a' }, _dFrom: 'wheel', _dFloor: 'floor-a', _dArt: { a: 1 }, _dFloorLate: false,
    hideZoneLoadingOverlay: () => { calls.hide++; },
    _enterArena: () => { calls.enter++; },
    freeDungeonFloor: () => { calls.freeFloor++; },
    freeDungeonArt: () => { calls.freeArt++; },
    releaseLeftZoneArt: () => { calls.release++; },
  };
  new Function('ctx', 'with (ctx) { return function () {' + thenBody + '}; }')(ctx)();
  return { calls, late: ctx._dFloorLate, opening: S._wheelDungeonOpening };
}
const mine = finish('dungeon:a');
check('2b its own opening: the screen lifts once and you step into the arena',
  mine.calls.hide === 1 && mine.calls.enter === 1 && mine.opening === null && mine.late === true, mine);
const replaced = finish('dungeon:b');
check('2c an opening another one replaced: it lets its pictures go and leaves the newer one\'s screen up',
  replaced.calls.hide === 0 && replaced.calls.enter === 0 && replaced.calls.freeFloor === 1 && replaced.calls.freeArt === 1
    && replaced.opening === 'dungeon:b' && replaced.late === true, replaced);
const died = finish('dungeon:a', { _dying: true });
check('2d its own opening, but you died while it loaded: the screen lifts (no newer owner), no arena',
  died.calls.hide === 1 && died.calls.enter === 0 && died.opening === null, died);

/* ── 3. the farm trip ── */
const ft = src('src/game/farmTrip.js');
const warpBody = block(ft, 'export function warpToFarm(S) {');
const holdBody = block(ft, 'export function holdFarmUntilReady(S) {');
check('3a warpToFarm exported from game/farmTrip.js', !!warpBody, { warpToFarm: !!warpBody, holdFarmUntilReady: !!holdBody });
if (warpBody && holdBody) {
  const music = [], order = [];
  const ARRIVE = { x: 900, y: 1300 };
  const hold = new Function('BT_AUDIO', 'releaseLeftZoneArt', 'farmReady', 'showZoneLoadingOverlay', 'hideZoneLoadingOverlay', 'ZONES', 'FARM_HOLD_CAP_MS', '_seqBox',
    'let _seq = 0; return function holdFarmUntilReady(S) {' + holdBody.replace(/import\([^)]*\)\.then\([^;]*\);/, 'Promise.resolve();') + '};');
  const holdFn = hold({ startZoneAmbient: (k) => music.push(k) }, (left, to) => order.push('release:' + left + '>' + to), () => true, () => {}, () => {}, {}, 12000);
  const warp = new Function('rememberFarmTrip', 'updateZoneDimensions', 'generateZoneMap', 'FARM_ARRIVE', 'holdFarmUntilReady', 'return function (S) {' + warpBody + '};')(
    (S) => { order.push('remember:' + S.currentZone); S._farmLeaving = S.currentZone; },
    (z) => order.push('dims:' + z),
    (z) => ({ map: z }),
    ARRIVE,
    (S) => { order.push('hold:' + S.currentZone); holdFn(S); });
  const S = { currentZone: 'wheel', player: { x: 5, y: 6, vx: 3, vy: -2 }, monsters: [1], gatherNodes: [1], npcs: [1], groundLoot: [1], hitParticles: [1],
    deathExplosions: [1], arrows: [1], _ambientParticles: [1], _currentDepth: 'core', map: null };
  const r = warp(S);
  check('3b the trip remembers where you left from BEFORE the zone flips (the gate leads back there)', order[0] === 'remember:wheel', order);
  check('3c ...lands you on the farm at its gate, still, with its own size and map',
    r !== false && S.currentZone === 'farm_home' && S.player.x === ARRIVE.x && S.player.y === ARRIVE.y && S.player.vx === 0 && S.player.vy === 0
      && order.indexOf('dims:farm_home') >= 0 && S.map && S.map.map === 'farm_home', { S, order });
  check('3d ...clears what belonged to where you left',
    S.monsters.length === 0 && S.gatherNodes.length === 0 && S.npcs === null && S.groundLoot.length === 0 && S.hitParticles.length === 0
      && S.deathExplosions.length === 0 && S.arrows.length === 0 && S._ambientParticles.length === 0 && S._currentDepth === 'shallow' && S._zoneWipe > 0, S);
  check('3e ...and asks for the farm\'s own music, only that (the bug: the town\'s after it)', music.length === 1 && music[0] === 'farm_home', music);
  check('3f ...and lets the Wheel\'s pictures go', order.indexOf('release:wheel>farm_home') >= 0, order);
}

/* the three doors that use it */
const bt = src('src/ui/BroTown.jsx');
const fs = src('src/ui/panels/buildings/FeedSeedPanel.jsx');
const fp = src('src/ui/panels/buildings/FarmPanel.jsx');
const land = block(bt, 'onTravel: function onTravel() {');
const visit = block(fs, 'const visit = () => {');
const fpAt = fp.indexOf('Visit Your Farm');
const old = fpAt < 0 ? null : block(fp.slice(fp.lastIndexOf('onClick: function onClick() {', fpAt)), 'onClick: function onClick() {');
check('3g the three doors found (the Land Office, the Feed & Seed, the old Farm window)', !!land && !!visit && !!old, { land: !!land, visit: !!visit, old: !!old });
check('3h the Land Office\'s "Travel to Farm" asks no music of its own', !!land && !/startZoneAmbient/.test(land), land && land.match(/startZoneAmbient\([^)]*\)/g));
for (const [name, body, file] of [['the Land Office', land, bt], ['the Feed & Seed', visit, fs], ['the old Farm window', old, fp]]) {
  check(`3i ${name} goes through warpToFarm, with no copy of the warp, no music and no hold of its own`,
    !!body && /\bwarpToFarm\(S2\)/.test(body) && !/currentZone\s*=/.test(body) && !/startZoneAmbient/.test(body) && !/holdFarmUntilReady/.test(body)
      && /import \{[^}]*\bwarpToFarm\b[^}]*\} from '@\/game\/farmTrip\.js'/.test(file), body && body.slice(0, 300));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
