/* ═══ v2.3.5900: THE HARVEST'S GRADE, JUDGED (harvestgrade.js; card K4 PR 1) ═══
 *
 * Grand plan step 4.2: the harvest's grade, the phone's own score of its
 * gesture, was believed whenever it came with a fingerprint (a perfect mined
 * ore pays two).  `harvestgrade: true` (an opt-in, OFF as merged) holds it:
 *
 *   1. the reader: off with no flag and with `harvestgrade: false`, on only
 *      with `true`; the cap `harvestGrade` advertised only while on;
 *   2. off (as merged): a perfect sent at once after its hits is paid two,
 *      as before;
 *   3. on: the same perfect is paid as good (one ore), counted
 *      (`gradeEarly`), the node spent and the strike paid -- never refused;
 *   4. on: a perfect at the plan's hits + the settle + the gesture's floor
 *      (less the 100 ms slack) is paid two: the earliest an honest phone
 *      could send it, to the millisecond;
 *   5. on: a strike on the old timer (no plan) is held to the timer's own
 *      window (its jitter and the grace) plus the gesture's floor;
 *   6. on: at most 15 perfects in any 20 strikes -- the 16th in a row paid
 *      good (`gradeShare`), and once the window has room again, two;
 *   7. on: the run outlives a reconnect (it is the bot record's);
 *   8. on, a test-mode character: neither rule (as the too-early check);
 *   9. the pure judge: a good or ok claim passes untouched and is counted
 *      in the run; a recovery strike (no start: `earliest` null) is held to
 *      the share alone.
 *
 * Red on main (v2.3.5726): every check but 2 (no judge, no reader). */
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { HARVEST_GRADE, harvestGradeJudge, harvestGradeEarliest } from '../src/harvestgrade.js';
import { HONEST_CYCLE } from '../src/gathering.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const PID = 'bp_hgrade';
const FP = { len: 640, ent: 0.42, dur: 1400, n: 48, tv: 12, vc: 0.31 };
const clock = seededClock({ seed: 5900 }).install();

async function setup(flags, recs) {
  const st = makeStorage(recs ? new Map(Object.entries(recs)) : null);
  const room = await openRoom(st, flags);
  const ws = fakeWs('h');
  await join(room, ws, PID, { loginTaken: true, data: { x: 100, y: 100, z: WHEEL_ZONE } });
  const ps = room.playerState[PID];
  ps.inventory = { ...(ps.inventory || {}), mining_pickaxe: 1 };
  ps.lifeSkills = { mining: { level: 15, xp: 0 } };
  const ore = room._ensureZoneNodes(WHEEL_ZONE).find((n) => n.nodeType === 'oreVein' && n.tierLvl === 1);
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  let seq = 0, fpN = 0;
  const T = { room, ws, ps, ore, send };
  T.ores = () => ps.inventory.ore_copper_ore || 0;
  T.why = () => (room._lastStrikeFor(PID) || {}).why;
  T.counters = () => (room._botfp && room._botfp.get(PID) && room._botfp.get(PID).counters) || {};
  /* one harvest: the start (with a plan, or none: the old timer), `wait` ms,
     the strike; the node stood up again, the player beside it */
  T.harvest = async (accuracy, wait, { plan = true } = {}) => {
    ore.alive = true; ore.respawnAt = 0;
    ps.x = ore.x + 10; ps.y = ore.y + 10; ps.z = WHEEL_ZONE;
    await send('extraction_start', { nodeId: ore.id, zone: WHEEL_ZONE, skill: 'mining', ...(plan ? { hitSeq: ++seq } : {}) });
    const ex = room.extractions[PID];
    const w = typeof wait === 'function' ? wait(ex) : wait;
    clock.advance(w);
    const o0 = T.ores();
    await send('node_strike', { id: ore.id, zone: WHEEL_ZONE, accuracy, swipeFp: { ...FP, h: 'h' + (++fpN) } });
    await settle();
    return { paid: T.ores() - o0, why: T.why(), ex };
  };
  /* the earliest a perfect is believed after its start (rule 1) */
  T.floorOf = (ex) => (ex.hits ? ex.openDelayBase + HONEST_CYCLE.LEAD_MS + HONEST_CYCLE.SETTLE_MS + HONEST_CYCLE.GESTURE_FLOOR_MS - HARVEST_GRADE.SLACK_MS : 0);
  /* the plain too-early bound: the plan's hits less the grace */
  T.soonest = (ex) => Math.max(0, Math.floor(ex.openDelayBase * (1 - (typeof ex.jitter === 'number' ? ex.jitter : room.EXTRACT_JITTER))) - room.EXTRACTION_GRACE_MS + 1);
  return T;
}
const caps = (T) => { const s = T.ws.sent.find((m) => m.type === 'state_sync'); return (s && s.caps) || {}; };

/* ── 1. the reader and the cap ── */
{
  const a = await setup(), b = await setup({ harvestgrade: false }), c = await setup({ harvestgrade: true });
  check('1. `harvestgrade` is off with no flag and with `false`, on with `true`', a.room._harvestGradeOn() === false && b.room._harvestGradeOn() === false && c.room._harvestGradeOn() === true);
  check('1. ...the cap `harvestGrade` advertised only while on', caps(a).harvestGrade === undefined && caps(c).harvestGrade === 1, { off: caps(a).harvestGrade, on: caps(c).harvestGrade });
}

/* ── 2. off: an early perfect is paid two, as before ── */
{
  const T = await setup();
  const r = await T.harvest('perfect', T.soonest);
  check('2. off (as merged): a perfect sent at once after its hits is paid two', r.why === 'paid' && r.paid === 2, r);
}

/* ── 3, 4. on: the time ── */
{
  const T = await setup({ harvestgrade: true });
  const r = await T.harvest('perfect', T.soonest);
  check('3. on: the same perfect is paid as good -- one ore, the strike paid, never refused', r.why === 'paid' && r.paid === 1 && T.ore.alive === false, r);
  check('3. ...and counted in the bot record (`gradeEarly`)', T.counters().gradeEarly === 1, T.counters());
  const s = await T.harvest('perfect', (ex) => T.floorOf(ex) - 1);
  check('4. on: a perfect 1 ms before the floor (hits + settle + the gesture\'s 1.2 s, less the slack) is paid good', s.paid === 1 && T.counters().gradeEarly === 2, { paid: s.paid, hits: s.ex.hits });
  const t = await T.harvest('perfect', T.floorOf);
  check('4. ...and at the floor, paid two: the earliest an honest phone could send it', t.why === 'paid' && t.paid === 2 && T.counters().gradeEarly === 2, { paid: t.paid, floor: T.floorOf(t.ex) });
  const g = await T.harvest('good', T.soonest);
  check('4. a good sent at once is paid as it was (the judge holds the perfect only)', g.why === 'paid' && g.paid === 1, g);
}

/* ── 5. on: the old timer (no plan) ── */
{
  const T = await setup({ harvestgrade: true });
  const timerFloor = (ex) => Math.floor(ex.openDelayBase * (1 - T.room.EXTRACT_JITTER)) - T.room.EXTRACTION_GRACE_MS + HONEST_CYCLE.GESTURE_FLOOR_MS;
  const r = await T.harvest('perfect', (ex) => timerFloor(ex) - 1, { plan: false });
  check('5. on, the old timer: a perfect before its window and the gesture\'s floor is paid good', r.why === 'paid' && r.paid === 1 && !Array.isArray(r.ex.hits), { paid: r.paid, why: r.why });
  const s = await T.harvest('perfect', timerFloor, { plan: false });
  check('5. ...at them, two', s.why === 'paid' && s.paid === 2, s);
}

/* ── 6. on: the share ── */
{
  const T = await setup({ harvestgrade: true });
  const paid = [];
  for (let i = 0; i < 20; i++) { paid.push((await T.harvest('perfect', T.floorOf)).paid); clock.advance(2000); }
  const twos = paid.filter((p) => p === 2).length;
  check('6. on: twenty perfects in a row, each at its floor: the first 15 paid two, the next 5 good', twos === 15 && paid.slice(15).every((p) => p === 1), paid);
  check('6. ...each of the five counted (`gradeShare`)', T.counters().gradeShare === 5 && !T.counters().gradeEarly, T.counters());
  const nx = await T.harvest('perfect', T.floorOf);
  check('6. the 21st: its last 19 hold 14 perfects, so it is paid two', nx.paid === 2, nx);

}

/* ── 7. on: the run outlives a reconnect ── */
{
  const T = await setup({ harvestgrade: true });
  for (let i = 0; i < 15; i++) { await T.harvest('perfect', T.floorOf); clock.advance(2000); }
  const ws2 = fakeWs('h2');
  await join(T.room, ws2, PID, { loginTaken: true, data: { x: T.ore.x + 10, y: T.ore.y + 10, z: WHEEL_ZONE } });
  T.ps = T.room.playerState[PID];
  T.ps.inventory = { ...(T.ps.inventory || {}), mining_pickaxe: 1 };
  T.ps.lifeSkills = { mining: { level: 15, xp: 0 } };
  T.ore.alive = true; T.ore.respawnAt = 0;
  T.ps.x = T.ore.x + 10; T.ps.y = T.ore.y + 10; T.ps.z = WHEEL_ZONE;
  const send2 = (type, payload) => T.room.webSocketMessage(ws2, JSON.stringify({ type, payload }));
  await send2('extraction_start', { nodeId: T.ore.id, zone: WHEEL_ZONE, skill: 'mining', hitSeq: 900 });
  clock.advance(T.floorOf(T.room.extractions[PID]));
  const o0 = T.ps.inventory.ore_copper_ore || 0;
  await send2('node_strike', { id: T.ore.id, zone: WHEEL_ZONE, accuracy: 'perfect', swipeFp: { ...FP, h: 'reconnect' } });
  await settle();
  const after = (T.ps.inventory.ore_copper_ore || 0) - o0;
  check('7. on: fifteen perfects, a reconnect, and the sixteenth is paid good: the run is the bot record\'s, which outlives the socket', after === 1 && T.counters().gradeShare === 1, { after, c: T.counters() });
}

/* ── 8. a test-mode character: neither rule ── */
{
  const T = await setup({ harvestgrade: true }, { ['testmode:' + PID]: { v: 1, on: true, at: Date.now() } });
  const r = await T.harvest('perfect', T.soonest);
  check('8. on, a test-mode character: an early perfect paid two', r.why === 'paid' && r.paid === 2 && !T.counters().gradeEarly, { r, tm: T.room._testMode(T.ps) });
}

/* ── 9. the pure judge ── */
{
  const run = [];
  const a = harvestGradeJudge('good', 0, 1000, run);
  const b = harvestGradeJudge('ok', 0, 1000, run);
  check('9. a good or an ok claim passes untouched, early or not, and is counted in the run as no perfect', a.grade === 'good' && !a.why && b.grade === 'ok' && !b.why && run.join('') === '00');
  const r2 = Array(19).fill(1);
  const c = harvestGradeJudge('perfect', 5, null, r2);
  check('9. a recovery strike (no start: `earliest` null) is held to the share alone', c.grade === 'good' && c.why === 'share' && r2.length === 20, c);
  const r3 = [];
  const d = harvestGradeJudge('perfect', 5, null, r3);
  check('9. ...and with room in the window, believed', d.grade === 'perfect' && r3.join('') === '1');
  check('9. a record with no start time cannot be timed (null)', harvestGradeEarliest({ openDelayBase: 650, hits: [3, 3] }, { lead: 90, settle: 220, floor: 1200, grace: 250, jitter: 0.15 }) === null);
}

clock.restore();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
