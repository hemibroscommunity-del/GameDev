/* ═══ v2.3.4414: CHANGING PLACE ON THE PHONE -- THE LEFTOVERS EACH WAY SKIPPED ═══
 *
 * The 2026-11-03 state-machine sweep (V11 G3-6, G3-2, G3-4; VA G5), phone
 * side only:
 *   1. ONE FLIP AND ITS WIPE.  clearZoneLocalFx (zoneTransitions.js) is the
 *      list of zone-local leftovers every way of changing place must clear,
 *      and five of nine ways skipped it: a fire lit in a cleared Workshop
 *      arena stayed a working Cook spot on the farm.  changeZone(S, to) flips
 *      the zone and runs the list (and drops the lock) in one call.
 *   2. THE WAYS MOVED ONTO IT: the respawn, a dungeon's arena entry, the
 *      Workshop clear's way home and the buildings' farm trip.
 *   3. THE OPENING'S LATE FINISH.  It lifted the shared loading screen before
 *      asking whether you had died behind it; a death hands the screen to the
 *      respawn's trip (veilWheelTrip), so today's town showed with the trip
 *      still marked veiled.  It lifts below that check now, and there only
 *      when no other way holds the screen.
 *   4. THE ZONE WIPE.  Every writer stores Date.now(); the clearer read `.ts`,
 *      so the flag never cleared.  It clears now.  The renderer is left as
 *      it is: the wipe has never drawn, and turning it on (a full-screen
 *      fade on every change of place) is the owner's call, so this pins that
 *      it still draws nothing.
 *   5. THE WHEEL'S "LOADED".  A preloadWheel that ended after you had left
 *      still wrote `_ready = true`; it writes only for the way in it began for.
 * The code under test is cut from src/ and run here with stubs.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* the body of the block that opens at `start` (its first '{' at or after the
   end of `start`, minus one), braces counted; null when not found */
function block(text, start, from) {
  const at = text.indexOf(start, from || 0);
  if (at < 0) return null;
  const open = text.indexOf('{', at + start.length - 1);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return null;
}

/* ── 1. changeZone ── */
const zt = src('src/game/zoneTransitions.js');
const clearBody = block(zt, 'export function clearZoneLocalFx(S) {');
const changeBody = block(zt, 'export function changeZone(S, to) {');
check('1a clearZoneLocalFx found', !!clearBody);
check('1b changeZone found in zoneTransitions.js', !!changeBody);
const clearZoneLocalFx = new Function('return function (S) {' + clearBody + '};')();
const changeZone = changeBody
  ? new Function('clearZoneLocalFx', 'return function (S, to) {' + changeBody + '};')(clearZoneLocalFx)
  : function (S, to) { S.currentZone = to; };
/* what a player leaves behind in a place: their fire, a peer's fire, a lunge,
   and the lock on a monster there */
function leftovers() {
  return {
    _campfire: { x: 100, y: 100, until: Date.now() + 45000 },
    _peerCampfires: new Map([['bp_peer', { x: 5, y: 5 }]]),
    _bashDash: { target: { id: 'm1' } },
    lockedTarget: { type: 'monster', id: 'm1' },
  };
}
const gone = (S) => S._campfire === null && S._peerCampfires.size === 0 && S._bashDash === null && S.lockedTarget === null;
{
  const S = Object.assign({ currentZone: 'wheel' }, leftovers());
  changeZone(S, 'farm_home');
  check('1c changeZone flips the zone', S.currentZone === 'farm_home', S.currentZone);
  check('1d ...and the fire, a peer\'s fire, the lunge and the lock go with it', gone(S), S);
}

/* ── 2. the ways moved onto it ── */
/* 2a. the respawn (respawn.js applyLocalRespawn) */
{
  const body = block(src('src/game/respawn.js'), 'export function applyLocalRespawn(S, zone) {');
  check('2a applyLocalRespawn found', !!body);
  const names = ['dropDungeonZone', 'releaseLeftZoneArt', 'updateZoneDimensions', 'BT_AUDIO', 'generateZoneMap', 'ZONES', 'TILE',
    'deathLine', 'chatLogBus', 'wantWheelSpawn', 'veilWheelTrip', 'localStorage', 'cue', 'changeZone'];
  const fn = new Function(...names, 'return function (S, zone) {' + body + '};')(
    () => {}, () => {}, () => {}, { startZoneAmbient() {} }, () => [[0]], { town: { w: 10, h: 10 } }, 32,
    () => null, { bump() {} }, () => {}, () => {}, { setItem() {} }, () => {}, changeZone);
  const S = Object.assign({ currentZone: 'wheel', player: { x: 0, y: 0 }, rpg: {}, _dying: true }, leftovers());
  fn(S, 'town');
  check('2b a respawn puts you in town', S.currentZone === 'town', S.currentZone);
  check('2c ...and leaves the fire you lit where you died behind (it was a Cook spot in town)', gone(S), { campfire: S._campfire, peers: S._peerCampfires.size, dash: S._bashDash });
}
/* 2d. the Workshop clear's way home (gameEvents.js dungeon_cleared) */
const ge = src('src/networking/gameEvents.js');
{
  const body = block(ge, 'startDungeonClear(S, payload.zone, Date.now(), function () {');
  check('2d the Workshop clear\'s way home found', !!body);
  const names = ['leaveWheelDungeon', 'ZONES', 'updateZoneDimensions', 'generateZoneMap', 'TILE', 'FARM_FROM_WORKSHOP', 'holdFarmUntilReady', 'changeZone', 'S'];
  const S = Object.assign({ currentZone: 'dungeon:ws1', _serverDungeon: 'dungeon:ws1', player: { x: 0, y: 0 }, channel: null }, leftovers());
  const fn = new Function(...names, 'return function () {' + body + '};')(
    () => false, { farm_home: { w: 40, h: 30 } }, () => {}, () => [[0]], 32, { x: 10, y: 10 }, () => {}, changeZone, S);
  fn();
  check('2e the Workshop clear takes you to the farm', S.currentZone === 'farm_home', S.currentZone);
  check('2f ...without the arena\'s fire as a Cook spot there, or the lock', gone(S), { campfire: S._campfire, lock: S.lockedTarget });
}
/* 2g. the arena entry (gameEvents.js dungeon_started _enterArena): too many
   pieces to run here, so read: it flips through changeZone, never by hand */
{
  const body = block(ge, 'var _enterArena = function () {');
  check('2g _enterArena found', !!body);
  check('2h the arena entry flips through changeZone', !!body && /changeZone\(S, payload\.zone\)/.test(body));
  check('2i ...and writes no bare `S.currentZone =`', !!body && !/S\.currentZone\s*=[^=]/.test(body));
}
/* 2j. the buildings' farm trip (farmTrip.js warpToFarm) */
{
  const body = block(src('src/game/farmTrip.js'), 'export function warpToFarm(S) {');
  check('2j warpToFarm found', !!body);
  const names = ['rememberFarmTrip', 'updateZoneDimensions', 'generateZoneMap', 'FARM_ARRIVE', 'holdFarmUntilReady', 'changeZone'];
  const fn = new Function(...names, 'return function (S) {' + body + '};')(
    () => {}, () => {}, () => [[0]], { x: 1, y: 2 }, () => {}, changeZone);
  const S = Object.assign({ currentZone: 'wheel', player: { x: 0, y: 0 } }, leftovers());
  fn(S);
  check('2k the Land Office / Feed & Seed trip takes you to the farm', S.currentZone === 'farm_home', S.currentZone);
  check('2l ...without the Wheel\'s fire as a Cook spot there', gone(S), { campfire: S._campfire });
}

/* ── 3. the opening's late finish ── */
{
  const anchor = ge.indexOf("new Promise(function (r) { setTimeout(r, 8000); }),");
  const body = anchor < 0 ? null : block(ge, ']).then(function () {', anchor);
  check('3a the opening\'s finish found', !!body);
  const names = ['S', 'payload', '_dFrom', 'hideZoneLoadingOverlay', 'freeDungeonFloor', 'freeDungeonArt', '_enterArena', 'releaseLeftZoneArt'];
  function finish(extra) {
    const log = [];
    const S = Object.assign({ currentZone: 'wheel', player: { x: 0, y: 0 }, _wheelDungeonOpening: 'dungeon:g1', _dungeonBack: { x: 1 } }, extra);
    const fn = new Function(...names, 'var _dFloorLate = false, _dFloor = null, _dArt = null; return function () {' + body + '};')(
      S, { zone: 'dungeon:g1' }, 'wheel', () => log.push('hide'), () => {}, () => {}, () => log.push('enter'), () => {});
    fn();
    return { S, log };
  }
  const ok = finish({});
  check('3b an opening still yours lifts the screen, then enters', ok.log.join() === 'hide,enter', ok.log);
  const replaced = finish({ _wheelDungeonOpening: 'dungeon:g2' });
  check('3c one a newer opening replaced lifts nothing (v2.3.4366)', replaced.log.length === 0, replaced.log);
  /* died behind the screen, and the respawn put you in today's town under
     its trip's veil (the same element, renamed) */
  const died = finish({ currentZone: 'town', _dying: false, _wheelTripVeil: true });
  check('3d died behind it: the respawn trip\'s screen is left up (it showed today\'s town)', died.log.indexOf('hide') < 0, died.log);
  check('3e ...and the arena is not entered', died.log.indexOf('enter') < 0 && died.S._dungeonBack === null, died.log);
  const dying = finish({ _dying: true });
  check('3f still dying, nobody else holding it: lifted, as before', dying.log.join() === 'hide', dying.log);
  const farm = finish({ currentZone: 'farm_home', _farmArtHold: 3 });
  check('3g gone to the farm meanwhile: the farm\'s screen is left up', farm.log.indexOf('hide') < 0, farm.log);
}

/* ── 4. the zone wipe ── */
{
  const body = block(src('src/game/stateCleanup.js'), 'export function updateStateCleanup(S) {');
  check('4a updateStateCleanup found', !!body);
  const fn = new Function('SWING_COOLDOWN', 'PRINT_TTL_MS', 'return function (S) {' + body + '};')(500, 3000);
  const S = { _zoneWipe: Date.now() - 1000 };
  fn(S);
  check('4b a wipe stored as a number (as every writer stores it) clears after 800 ms', S._zoneWipe === null, S._zoneWipe);
  const S2 = { _zoneWipe: Date.now() - 100 };
  fn(S2);
  check('4c ...and not before', typeof S2._zoneWipe === 'number', S2._zoneWipe);

  const er = src('src/rendering/systems/effectsRenderer.js');
  const draw = block(er, 'if (S._zoneWipe) {');
  check('4d the renderer\'s wipe found', !!draw);
  const rects = [];
  const gfx = { rect() { rects.push('rect'); return gfx; }, fill(o) { rects.push(o.alpha); return gfx; } };
  const run = new Function('S', 'gfx', 'now', 'viewW', 'viewH', 'ZONES', 'ELEMENTS', 'cssToHex', draw);
  const now = Date.now();
  run({ _zoneWipe: now - 300, currentZone: 'farm_home' }, gfx, now, 400, 800, { farm_home: {} }, {}, () => 0);
  check('4e ...and the renderer still draws no wipe stored as a number (turning it on is the owner\'s call)', rects.length === 0, rects);
}

/* ── 5. the Wheel's "loaded" ── */
{
  const wt = src('src/game/worldTrial.js');
  const body = block(wt, 'async function preloadWheel() {');
  const left = block(wt, 'export function worldTrialLeft() {');
  check('5a preloadWheel and worldTrialLeft found', !!body && !!left);
  const names = ['wheelResetCounts', 'loadGroundSteps', 'wheelSizeTold', 'wheelStart', 'wheelRetryIn', 'START_TRIES_MS', 'setExits', 'wheelWayBack',
    'exitBeside', 'wheelStats', 'WARM_PAD', 'WARM_OBJECTS_X', 'WARM_OBJECTS_Y', 'arrivalPoint', 'wheelObjectsOn', 'wheelWarm', 'STEPS_WAIT_MS', 'document'];
  function trial() {
    let lay;
    const laid = new Promise((r) => { lay = r; });
    const api = new Function(...names,
      'let _ready = false, _readyGen = 0;\n'
      + 'async function preloadWheel() {' + body + '}\n'
      + 'function worldTrialLeft() {' + left + '}\n'
      + 'return { preloadWheel, worldTrialLeft, ready: () => _ready };')(
      () => {}, () => Promise.resolve(), () => Promise.resolve(), () => Promise.resolve({}), () => 0, 15000, () => {}, () => false,
      () => null, {}, 200, 600, 900, () => ({ x: 0, y: 0 }), () => false, () => laid, 10, undefined);
    return { api, lay };
  }
  const a = trial();
  const pa = a.api.preloadWheel();
  a.lay();
  await pa;
  check('5b a way in that finishes says the Wheel is loaded', a.api.ready() === true);
  const b = trial();
  const pb = b.api.preloadWheel();
  b.api.worldTrialLeft();   /* left (or the worker stopped) while it laid the ground */
  b.lay();
  await pb;
  check('5c one that ends after you left does not (the next trip would skip its gate)', b.api.ready() === false);
}

/* ── 6. v2.3.4651: ONE DOOR, NO OTHER WRITER (TRAPS §304) ── */
/* Nine ways still flipped the zone by hand after §2 (four on the live world,
   five on the retired old map); every one goes through changeZone now, and no
   new one may appear.  The renderers' own `this.currentZone` / local
   `currentZone` (what they last drew) are not the game's place. */
{
  const { readdirSync, statSync } = await import('node:fs');
  const root = new URL('../../src/', import.meta.url);
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const u = new URL(name, dir);
      if (statSync(u).isDirectory()) walk(new URL(name + '/', dir));
      else if (/\.(js|jsx|mjs)$/.test(name)) files.push(u);
    }
  })(root);
  const writers = [];
  for (const u of files) {
    const rel = u.pathname.slice(root.pathname.length);
    readFileSync(u, 'utf8').split('\n').forEach((line, i) => {
      if (!/(?<![\w$])currentZone\s*=[^=]/.test(line)) return;   /* not babel's `_ZONES$S$currentZone` temp */
      if (/this\.currentZone|\blet currentZone\b|^\s*currentZone = zoneId;/.test(line)) return;
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;   /* a comment */
      writers.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 80));
    });
  }
  check('6a the only writer of the game\'s place is changeZone', writers.length === 1 && /^game\/zoneTransitions\.js:/.test(writers[0]) && /S\.currentZone = to;/.test(writers[0]), writers);
  for (const [f, n] of [['game/zoneTransitions.js', 4], ['game/wheelDungeons.js', 1], ['game/dungeonWaves.js', 2], ['game/monsterCombat.js', 1], ['ui/BroTown.jsx', 2]]) {
    const t = readFileSync(new URL(f, root), 'utf8');
    const got = (t.match(/\bchangeZone\((S|S2|st), /g) || []).length;
    check('6b ' + f + ' changes place through changeZone (' + n + ')', got >= n, got);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
