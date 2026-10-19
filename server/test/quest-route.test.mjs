/* The quest's road in the Wheel, and the quest you track -- v2.3.3489
 * (src/game/questWays.js, src/game/trackedQuest.js, src/game/questRoute.js;
 * docs/specs/menus-2026-10-19.md "Track a quest").
 *
 * The owner, playtesting: "I tapped track quest in quest menu but no golden
 * stars were in minimap (I had two active quests - one from beast master and
 * the other from mayor bro)."  Read in node with the real quest table and a
 * made-up Wheel (the real one's sizes):
 *
 *   1. the tracked quest is kept in memory and in the browser's storage, and
 *      another tab's change is heard;
 *   2. the road's order: the tracked quest first, then (as before) a hand-in
 *      or a land, then the rest, each in the worker's order;
 *   3. EVERY live quest leads somewhere at every step but the few done
 *      anywhere (life_1's fire and cooking), and none of the owner's seven
 *      did before (no land, no resource);
 *   4. every way written in the table means something: each door a plot of
 *      the town that opens, nothing misspelled;
 *   5. the lands, on both Wheels: where a land's road ends, when you are
 *      among its monsters, the nearest land from town;
 *   6. the owner's two quests: a star untracked, and it follows the one
 *      tracked; "you are there" ends the road; a building not yet visited; a
 *      dungeon's door; beast_2 step by step; a quest with nowhere to go
 *      passes to the next (the old _wantNode stopped);
 *   7. the game is wired to it (the minimap's and world map's road, the
 *      pinned quest card, the quest page's Track).
 */
import fs from 'fs';
import { QUEST_CHAINS, QUEST_STATUS, questSteps, NPC_DATA, BUILDINGS } from '../../src/data/gameSystems.js';
import { WHEEL_BUILDING_DOORS, WHEEL_HALL_DOORS, WHEEL_SHUT_DOORS } from '../../src/data/wheelBuildingDoors.js';
import { WHEEL_GEOM, setWheelGeom, wheelLandAt, ZONES } from '../../src/data/zones.js';
import {
  routeOrder, parseWay, wayOf, visitedSet, landStart, landHere, amongMonsters, nearestLandStart, pointFor, wheelWay,
  HERE, LAND_HERE_R, LAND_IN_PX, DOOR_HERE_R, GATHER_HERE_R,
} from '../../src/game/questWays.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

/* ── 1. the tracked quest ──────────────────────────────────────────────────── */
{
  const store = new Map();
  const fakeLs = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const heard = [];
  Object.defineProperty(globalThis, 'localStorage', { value: fakeLs, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: { addEventListener: (t, fn) => heard.push([t, fn]) }, configurable: true, writable: true });
  store.set('bt_trackedQuest', 'mayor_2');
  const T = await import('../../src/game/trackedQuest.js?a');
  check('1a the key is the one the quest page always wrote (bt_trackedQuest), read once at first ask', T.TRACK_KEY === 'bt_trackedQuest' && T.trackedQuestId() === 'mayor_2');
  store.set('bt_trackedQuest', 'tut_1');
  check('1b ...then kept in memory: the minimap asks every frame, the storage is read once', T.trackedQuestId() === 'mayor_2');
  T.setTrackedQuest('beast_1');
  check('1c tracking a quest keeps it in memory and in the storage', T.trackedQuestId() === 'beast_1' && store.get('bt_trackedQuest') === 'beast_1');
  T.setTrackedQuest(null);
  check('1d untracking forgets it in both', T.trackedQuestId() === null && !store.has('bt_trackedQuest'));
  const ev = heard.find((h) => h[0] === 'storage');
  check('1e another tab\'s change is heard (the browser\'s storage event)', !!ev);
  if (ev) {
    ev[1]({ key: 'bt_trackedQuest', newValue: 'beast_3' });
    const a = T.trackedQuestId();
    ev[1]({ key: 'something_else', newValue: 'x' });
    const b = T.trackedQuestId();
    ev[1]({ key: 'bt_trackedQuest', newValue: null });
    check('1f ...its own key only: tracked, untouched by another key, untracked', a === 'beast_3' && b === 'beast_3' && T.trackedQuestId() === null, { a, b });
  }
  check('1g trackedFirst: the tracked one first, the rest in their own order; one not in the list changes nothing',
    JSON.stringify(T.trackedFirst(['a', 'b', 'c'], 'b')) === '["b","a","c"]' && JSON.stringify(T.trackedFirst(['a', 'b'], 'z')) === '["a","b"]'
      && JSON.stringify(T.trackedFirst([{ qid: 'x' }, { qid: 'y' }], 'y').map((e) => e.qid)) === '["y","x"]' && T.trackedFirst(null, 'a').length === 0);
  /* no storage at all (a private window that throws): kept for the page */
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('denied'); }, configurable: true });
  const T2 = await import('../../src/game/trackedQuest.js?b');
  T2.setTrackedQuest('tut_2');
  check('1h storage that throws: nothing thrown, the choice kept for the page', T2.trackedQuestId() === 'tut_2');
  delete globalThis.localStorage;
  delete globalThis.window;
}

/* ── 2. the order ──────────────────────────────────────────────────────────── */
{
  const E = (qid, o = {}) => ({ qid, q: { id: qid }, done: !!o.done, zone: o.zone || null });
  const ids = (l) => l.map((e) => e.qid).join(',');
  const list = [E('beast_1'), E('mayor_2'), E('tut_2', { zone: 'verdant' }), E('life_2'), E('beast_4', { done: true })];
  check('2a untracked: a hand-in or a land first (as the old questTargetZone had it), then the rest, each in the worker\'s order',
    ids(routeOrder(list, null)) === 'tut_2,beast_4,beast_1,mayor_2,life_2', ids(routeOrder(list, null)));
  check('2b tracked: that quest first, whatever it is', ids(routeOrder(list, 'mayor_2')) === 'mayor_2,tut_2,beast_4,beast_1,life_2'
    && ids(routeOrder(list, 'tut_2')) === 'tut_2,beast_4,beast_1,mayor_2,life_2', ids(routeOrder(list, 'mayor_2')));
  check('2c tracking a quest that is not active changes nothing', ids(routeOrder(list, 'tut_9')) === ids(routeOrder(list, null)));
  check('2d no quests: nothing', routeOrder([], 'a').length === 0 && routeOrder(null, 'a').length === 0);
}

/* ── 3. every live quest leads somewhere ───────────────────────────────────── */
const LIVE = new Set((NPC_DATA || []).map((n) => n && n.name).filter(Boolean));
const live = Object.keys(QUEST_CHAINS).filter((k) => LIVE.has(QUEST_CHAINS[k].npc));
/* the steps done anywhere: light a fire from the bag, cook at it (life_1) --
   and every quest's last step, the hand-in, which is its giver once done */
const ANYWHERE = { life_1: [2, 3, 4] };
{
  check(`3a the live givers' quests are the ones this checks (${live.length}): the Mayor's tutorial and life quests, the Beastmaster's four, the Mayor's three`,
    ['tut_1', 'tut_2', 'tut_3', 'tut_4', 'life_1', 'life_2', 'beast_1', 'beast_2', 'beast_3', 'beast_4', 'mayor_1', 'mayor_2', 'mayor_3'].every((k) => live.includes(k)), live);
  const none = [];
  for (const k of live) {
    const q = QUEST_CHAINS[k];
    if (Array.isArray(q.steps) && q.steps.length) {
      for (let i = 0; i < q.steps.length - 1; i++) {
        if ((ANYWHERE[k] || []).includes(i)) continue;
        const steps = q.steps.map((s, j) => ({ label: s.label, done: j < i, current: j === i, node: s.node || null, way: s.way || null }));
        if (!wayOf(q, steps, false)) none.push(k + ' step ' + i);
      }
    } else if (!wayOf(q, null, false)) none.push(k);
  }
  check('3b every live quest has a way at every step while in progress (a land, a resource, a door, the monsters, a building to visit) but life_1\'s fire and cooking',
    none.length === 0, none);
  const anywhere = [];
  for (const k of Object.keys(ANYWHERE)) for (const i of ANYWHERE[k]) {
    const q = QUEST_CHAINS[k];
    const steps = q.steps.map((s, j) => ({ label: s.label, done: j < i, current: j === i, node: s.node || null, way: s.way || null }));
    if (wayOf(q, steps, false)) anywhere.push(k + ' ' + i);
  }
  check('3c ...and those few lead nowhere (done where you stand: no road, as before)', anywhere.length === 0, anywhere);
  const giver = live.filter((k) => { const w = wayOf(QUEST_CHAINS[k], null, true); return !w || w.kind !== 'giver' || w.npc !== QUEST_CHAINS[k].npc; });
  check('3d every quest ready to hand in leads to its giver', giver.length === 0, giver);
  const owners = ['beast_1', 'beast_2', 'beast_3', 'beast_4', 'mayor_1', 'mayor_2', 'mayor_3'];
  const hadOne = owners.filter((k) => { const q = QUEST_CHAINS[k]; return !!q.zone || !!q.node || (q.steps || []).some((s) => s.node); });
  check('3e none of the owner\'s seven named a land or a resource, so before v2.3.3489 none had a road until handed in', hadOne.length === 0, hadOne);
  const kinds = Object.fromEntries(owners.map((k) => [k, (wayOf(QUEST_CHAINS[k], QUEST_CHAINS[k].steps
    ? QUEST_CHAINS[k].steps.map((s, j) => ({ current: j === 0, node: s.node || null, way: s.way || null })) : null, false) || {}).kind + ((wayOf(QUEST_CHAINS[k], null, false) || {}).plot ? ':' + wayOf(QUEST_CHAINS[k], null, false).plot : '')]));
  check('3f the Woodworker for the traps, the monsters for springing, catching and the Mayor\'s five kills, a building for his visits, the Land Office for his dungeon',
    kinds.beast_1 === 'door:woodworker' && kinds.beast_2 === 'door' && kinds.beast_3 === 'monsters' && kinds.beast_4 === 'monsters'
      && kinds.mayor_1 === 'visit' && kinds.mayor_2 === 'monsters' && kinds.mayor_3 === 'door:landoffice', kinds);
}

/* ── 4. every way written means something ─────────────────────────────────── */
{
  const written = [];
  for (const k of Object.keys(QUEST_CHAINS)) {
    const q = QUEST_CHAINS[k];
    if (q.way !== undefined) written.push([k, q.way]);
    for (const [i, s] of (q.steps || []).entries()) if (s.way !== undefined) written.push([k + '.' + i, s.way]);
  }
  const bad = written.filter(([, w]) => !parseWay(w));
  check(`4a every way in the quest table parses (${written.length})`, written.length >= 10 && bad.length === 0, bad);
  const doors = written.map(([k, w]) => [k, parseWay(w)]).filter(([, p]) => p && p.kind === 'door');
  const wrong = doors.filter(([, p]) => !Object.prototype.hasOwnProperty.call(WHEEL_BUILDING_DOORS, p.plot) || WHEEL_SHUT_DOORS.includes(p.plot));
  check('4b ...each door one of the town\'s that opens (data/wheelBuildingDoors.js), none shut', doors.length >= 3 && wrong.length === 0, wrong);
  check('4c nonsense is no way: a misspelling, an empty door, a number', !parseWay('monster') && !parseWay('door:') && !parseWay('') && !parseWay(5) && !parseWay(null)
    && parseWay('door:bank').plot === 'bank' && parseWay('visit').kind === 'visit');
  check('4d the visited buildings, however a save holds them (a Set, an array, an object)',
    visitedSet(new Set([1, 2])).has(2) && visitedSet([3, '4']).has(4) && visitedSet({ a: 5 }).has(5) && visitedSet(null).size === 0);
}

/* ── 5. the lands, on both Wheels ─────────────────────────────────────────── */
const geomFor = (size) => {
  setWheelGeom(size);
  const z = ZONES.wheel;
  return { c: (z.w * 32) / 2, lands: z.lands, firstR: z.firstR || null, homes: z.homes, safeR: z.safeR, landAt: (x, y) => wheelLandAt('wheel', x, y) };
};
{
  const G5 = geomFor(5);
  const c = G5.c;
  const town = { x: c, y: c + 288 };   /* the arrival (lastplace.js ARRIVAL_DY) */
  const starts = G5.homes.map((l) => [l, landStart(G5, l)]);
  check('5a long Wheel: each land\'s road ends LAND_IN_PX past where its monsters begin, on its own spoke',
    starts.every(([l, s]) => s && Math.abs(Math.hypot(s.x - c, s.y - c) - (WHEEL_GEOM[5].firstR[l] + LAND_IN_PX)) < 2 && wheelLandAt('wheel', s.x, s.y) === l),
    starts.map(([l, s]) => [l, s && Math.round(Math.hypot(s.x - c, s.y - c))]));
  check('5b ...standing there you are among them; in town you are not', starts.every(([l, s]) => landHere(G5, l, s)) && starts.every(([l]) => !landHere(G5, l, town)));
  check('5c among ANY land\'s monsters: out on a spoke past where they begin, never in town or on the safe ground',
    starts.every(([, s]) => amongMonsters(G5, s)) && !amongMonsters(G5, town) && !amongMonsters(G5, { x: c + G5.safeR - 10, y: c }));
  const near = nearestLandStart(G5, town);
  check(`5d from where you arrive (south of the middle) the nearest land is the one south: ${near && near.land}`, !!near && near.land === 'tidal', near);
  const fromFrost = nearestLandStart(G5, { x: c - 1000, y: c - 1000 });
  check('5e ...and from the north-west corner of the commons, Frost Ridge', !!fromFrost && fromFrost.land === 'frost', fromFrost);
  const G1 = geomFor(1);
  const c1 = G1.c;
  check('5f short Wheel: a land\'s road ends at its monsters\' middle, and within LAND_HERE_R of it you are there',
    G1.homes.every((l) => { const s = landStart(G1, l); return s.x === G1.lands[l][0] && s.y === G1.lands[l][1] && landHere(G1, l, { x: s.x + LAND_HERE_R - 50, y: s.y }) === true; })
      && !landHere(G1, 'frost', { x: c1, y: c1 }));
  check('5g ...among any land\'s monsters only off the safe ground', !amongMonsters(G1, { x: c1, y: c1 + 288 }) && amongMonsters(G1, { x: G1.lands.tidal[0], y: G1.lands.tidal[1] }));
  check('5h a land that is not one of the Wheel\'s homes has no road (a zone named by an old quest)', landStart(G1, 'starting_meadow') === null && landStart(G1, '__proto__') === null);
}

/* ── 6. the owner's two quests, and the rest ──────────────────────────────── */
{
  const G = geomFor(5);
  const c = G.c;
  const idx = (plot) => BUILDINGS.findIndex((b) => b.id === WHEEL_BUILDING_DOORS[plot]);
  const door = (id, dx, dy) => ({ id, name: id, x: c + dx, y: c + dy,
    index: Object.prototype.hasOwnProperty.call(WHEEL_BUILDING_DOORS, id) ? idx(id) : -1,
    hall: Object.prototype.hasOwnProperty.call(WHEEL_HALL_DOORS, id) ? WHEEL_HALL_DOORS[id] : null,
    closed: WHEEL_SHUT_DOORS.includes(id) });
  const doors = [door('woodworker', -700, -400), door('landoffice', 800, 300), door('bank', 600, -500), door('store', 250, 650),
    door('guildhall', -150, 120), door('hotel', 90, 150), door('blacksmith', -900, 200)];
  const town = { x: c, y: c + 288 };
  const npcs = { 'Mayor Bro': { x: c + 40, y: c + 10 }, 'Beastmaster Bro': { x: c - 595, y: c - 366 } };
  const ctxOf = (entries, tracked, over = {}) => Object.assign({
    order: routeOrder(entries, tracked), steps: (q) => questSteps(q, over.R || {}, over.S || {}), P: town,
    npcAt: (n) => npcs[n] || null, doors, visited: new Set(), nodeNear: null, geom: G,
  }, over);
  const E = (qid, done = false, R = {}, S = {}) => ({ qid, q: QUEST_CHAINS[qid], done: done || !!QUEST_CHAINS[qid].check(R, S), zone: QUEST_CHAINS[qid].zone || null });
  const R0 = { _quests: { beast_1: QUEST_STATUS.active, mayor_2: QUEST_STATUS.active }, inventory: {}, _questKills: {} };
  const owner = [E('beast_1', false, R0), E('mayor_2', false, R0)];
  const u = wheelWay(ctxOf(owner, null, { R: R0 }));
  check(`6a the owner's case, nothing tracked: a star (${u && u.qid} -> ${u && (u.door || u.zoneId)}), where there was none -- the first taken leads, the Woodworker's door`,
    !!u && u.qid === 'beast_1' && u.way === 'door' && u.door === 'woodworker' && u.x === doors[0].x && u.y === doors[0].y, u);
  const m = wheelWay(ctxOf(owner, 'mayor_2', { R: R0 }));
  const tidal = landStart(G, 'tidal');
  check(`6b tracking the Mayor's "Kill 5 monsters": the star goes where the nearest land's monsters begin (${m && m.zoneId})`,
    !!m && m.qid === 'mayor_2' && m.way === 'monsters' && m.zoneId === 'tidal' && m.land === true && m.x === tidal.x && m.y === tidal.y, m);
  const b = wheelWay(ctxOf(owner, 'beast_1', { R: R0 }));
  check('6c tracking the Beastmaster\'s "Box Traps": back to the Woodworker\'s door', !!b && b.qid === 'beast_1' && b.door === 'woodworker', b);
  const at = wheelWay(ctxOf(owner, 'beast_1', { R: R0, P: { x: doors[0].x + 30, y: doors[0].y - 60 } }));
  check(`6d standing at the tracked quest's door (within ${DOOR_HERE_R} px), no star -- and not the other quest's either`, at === null, at);
  const out = wheelWay(ctxOf(owner, 'mayor_2', { R: R0, P: { x: tidal.x, y: tidal.y + 400 } }));
  check('6e out among a land\'s monsters with "Kill 5 monsters" tracked: no star', out === null, out);
  /* mayor_1: the nearest building not yet visited; the halls and the shut one never */
  const R1 = { _quests: { mayor_1: QUEST_STATUS.active } };
  const S1 = { stats: { visitedBuildings: new Set() } };
  const v0 = wheelWay(ctxOf([E('mayor_1', false, R1, S1)], null, { R: R1, S: S1, P: { x: c + 80, y: c + 160 } }));
  check(`6f "Visit 3 buildings": the nearest building with a door that opens one (${v0 && v0.door}), never a hall or a shut one`,
    !!v0 && v0.way === 'visit' && v0.door === 'store', v0);
  const v1 = wheelWay(ctxOf([E('mayor_1', false, R1, S1)], null, { R: R1, S: S1, P: { x: c + 80, y: c + 160 }, visited: new Set([idx('store')]) }));
  check(`6g ...one visited, the next nearest (${v1 && v1.door})`, !!v1 && v1.door !== 'store' && v1.door !== 'guildhall' && v1.door !== 'hotel', v1);
  const allSeen = new Set(doors.filter((d) => d.index >= 0).map((d) => d.index));
  const v2 = pointFor({ kind: 'visit' }, ctxOf([], null, { visited: allSeen }));
  check('6h ...every one visited: nothing to point at (and three visited is the hand-in, its giver)', v2 === null);
  const S3 = { stats: { visitedBuildings: new Set([1, 2, 3]) } };
  const v3 = wheelWay(ctxOf([E('mayor_1', false, R1, S3)], null, { R: R1, S: S3 }));
  check('6i three buildings visited: the road leads to Mayor Bro', !!v3 && v3.way === 'giver' && v3.npc === 'Mayor Bro' && v3.x === npcs['Mayor Bro'].x, v3);
  const d3 = wheelWay(ctxOf([E('mayor_3')], null));
  check('6j "Clear any dungeon": the Land Office\'s door (your farm\'s Dungeon Workshop is behind it)', !!d3 && d3.door === 'landoffice' && d3.qid === 'mayor_3', d3);
  /* beast_2, step by step */
  const RB = (traps, kills) => ({ _quests: { beast_2: QUEST_STATUS.active }, inventory: { trap_box: traps }, _questKills: { beast_2: kills } });
  const SB = (R) => ({ rpg: R });
  const step = (traps, kills) => { const R = RB(traps, kills); const S = SB(R); return wheelWay(ctxOf([E('beast_2', false, R, S)], null, { R, S })); };
  const s0 = step(0, 0), s1 = step(2, 0), s2 = step(2, 3), s3 = step(2, 5);
  check(`6k "Set and Spring": no trap yet, the Woodworker (${s0 && s0.door}); a trap in the bag, the monsters (${s1 && s1.zoneId}); three sprung, still the monsters; five, back to Beastmaster Bro`,
    !!s0 && s0.door === 'woodworker' && !!s1 && s1.way === 'monsters' && !!s2 && s2.way === 'monsters' && !!s3 && s3.way === 'giver' && s3.npc === 'Beastmaster Bro', { s0, s1, s2, s3 });
  /* THE OLD _wantNode: a quest with nowhere to go hid the one behind it */
  const RL = { _quests: { life_1: QUEST_STATUS.active, beast_3: QUEST_STATUS.active }, inventory: { fish_minnow: 1, wood_pine_log: 1 } };
  const SL = { rpg: RL };
  const lifeAtFire = { qid: 'life_1', q: QUEST_CHAINS.life_1, done: false, zone: null };
  const steps = questSteps(QUEST_CHAINS.life_1, RL, SL);
  const cur = steps && steps.find((s) => s.current);
  const pass = wheelWay(ctxOf([lifeAtFire, E('beast_3', false, RL, SL)], 'life_1', { R: RL, S: SL }));
  check(`6l a quest with nowhere to go right now (life_1 at "${cur && cur.label.slice(0, 30)}...", tracked) passes to the next: the Beastmaster's monsters`,
    !!cur && !cur.node && !cur.way && !!pass && pass.qid === 'beast_3' && pass.way === 'monsters', { cur, pass });
  /* a resource: the nearest live one, and at it you are there */
  const RO = { _quests: { life_2: QUEST_STATUS.active }, inventory: {} };
  const ore = wheelWay(ctxOf([E('life_2', false, RO)], null, { R: RO, nodeNear: (k) => (k === 'oreVein' ? { x: c + 900, y: c + 900, d: 1100 } : null) }));
  const oreHere = wheelWay(ctxOf([E('life_2', false, RO)], null, { R: RO, nodeNear: () => ({ x: c, y: c + 300, d: GATHER_HERE_R - 1 }) }));
  const oreNone = wheelWay(ctxOf([E('life_2', false, RO), E('mayor_3')], null, { R: RO, nodeNear: () => null }));
  check('6m "Bring 5 Ore": the nearest vein; at it, no star; none to be found (no pickaxe, none alive), the next quest\'s road',
    !!ore && ore.node === 'oreVein' && ore.x === c + 900 && oreHere === null && !!oreNone && oreNone.qid === 'mayor_3', { ore, oreHere, oreNone });
  /* a hand-in whose giver is not here passes too; and outside the Wheel only a giver who stands there */
  const RD = { _quests: { beast_1: QUEST_STATUS.active, tut_2: QUEST_STATUS.active }, inventory: {}, _questKills: { beast_1: 3 } };
  const away = wheelWay(ctxOf([E('beast_1', false, RD), E('tut_2', false, RD)], null, { R: RD, npcAt: () => null }));
  check('6n a quest ready to hand in whose giver is not in sight passes to the next (here a land\'s)', !!away && away.qid === 'tut_2' && away.way === 'land' && away.zoneId === 'verdant', away);
  const farm = wheelWay(ctxOf(owner, 'mayor_2', { R: R0, geom: null, doors: [] }));
  const farmGiver = wheelWay(ctxOf([E('beast_1', false, RD)], null, { R: RD, geom: null, doors: [] }));
  check('6o off the Wheel (the farm, a dungeon\'s arena) a land, the monsters and a door lead nowhere; a giver standing there still does',
    farm === null && !!farmGiver && farmGiver.way === 'giver', { farm, farmGiver });
  check('6p HERE is one object (a road that ends is told apart from no road)', pointFor({ kind: 'door', plot: 'bank' }, ctxOf([], null, { P: { x: doors[2].x, y: doors[2].y } })) === HERE);
}

/* ── 7. the game is wired to it ───────────────────────────────────────────── */
{
  const qr = read('../../src/game/questRoute.js');
  check('7a the road asks the tracked quest and each quest\'s way (questRoute.js): trackedQuestId, routeOrder, wheelWay, the town\'s doors',
    /import \{ trackedQuestId \} from '\.\/trackedQuest\.js'/.test(qr) && /import \{ routeOrder, wheelWay \} from '\.\/questWays\.js'/.test(qr)
      && /import \{ wheelTownDoors \} from '\.\/wheelTownDoors\.js'/.test(qr) && /return routeOrder\(list, trackedQuestId\(\)\)/.test(qr)
      && /return wheelWay\(\{/.test(qr));
  check('7b ...the old portals\' star and the hand-in take the same order (questTargetZone, _wantNpc read _routeQuests); the old _wantNode is gone',
    (qr.match(/of _routeQuests\(rpg, S\)/g) || []).length >= 2 && !/function _wantNode/.test(qr) && /if \(qid === tracked\) return ANY_FIELD_ZONE;/.test(qr));
  const qm = read('../../src/ui/mobile/sheet/questModel.js');
  check('7c the quest page and list keep their two calls, from the one module', /export \{ trackedQuestId, setTrackedQuest \} from '\.\.\/\.\.\/\.\.\/game\/trackedQuest\.js'/.test(qm) && !/localStorage/.test(qm.split('export { trackedQuestId')[0].slice(-400)));
  const bt = read('../../src/ui/BroTown.jsx');
  check('7d the pinned quest card shows the tracked quest (BroTown.jsx)', /import \{ trackedFirst \} from '@\/game\/trackedQuest\.js'/.test(bt) && /activeQuests = trackedFirst\(activeQuests\.map/.test(bt));
  const mm = read('../../src/rendering/systems/wheelMinimap.js'), wm = read('../../src/ui/WorldMapOverlay.jsx');
  check('7e the minimap\'s star and the world map\'s road say whose road it is (their probes)', /qid: quest\.qid \|\| null, way: quest\.way \|\| null/.test(mm) && /qid: quest\.qid \|\| null, way: quest\.way \|\| null/.test(wm));
  const gs = read('../../src/data/gameSystems.js');
  check('7f questSteps carries a step\'s way beside its node', /node: st\.node \|\| null, way: st\.way \|\| null/.test(gs));
}

console.log(`\nquest-route: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
