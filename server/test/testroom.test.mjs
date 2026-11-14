/* The shared test room holds -- v2.3.5086 (server/test/testroom.mjs; grand
 * plan step 4.5's harness, card E PR 7).
 *
 *   1. STORAGE: a copy of what is put; every write of one synchronous run is
 *      one batch; a restart before batch n loses it and every later one, and
 *      keeps every earlier one; a read sees its own run's writes; `list`
 *      takes prefix, start, startAfter, end, limit and reverse; `get` a list.
 *   2. THE ROOM: opened on it, a player joins the world's way.
 *   3. THE INPUT GATE: messages sent without waiting are delivered one at a
 *      time, in order, each to its writes' commit.
 *   4. THE CLOCK: seeded, moved only by the test, the same every run.
 *   5. THE DISTURBANCES: one closed list (SHAPES part 7), each scheduling a
 *      script as it says.
 *   6. A DEPLOY AT A MESSAGE: a second room on what was written keeps it all
 *      and nothing of the first room's memory.
 */
import { makeStorage, openRoom, roomQueue, seededClock, join, fakeWs, settle, DISTURBANCES, disturbance, schedule } from './testroom.mjs';
import { BANK } from '../src/bank.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const clock = seededClock({ seed: 11 }).install();

/* ── 1. storage ── */
{
  const s = makeStorage();
  s.storage.put('a', 1); s.storage.put('b', { x: [1] });   /* one synchronous run: no await between */
  check('1. one synchronous run is one batch (before it commits, nothing is on file)', s.batches() === 0 && s._store.size === 0);
  check('1. ...but its own run reads what it wrote', (await s.storage.get('a')) === 1);
  await settle();
  check('1. ...and then commits whole', s.batches() === 1 && s._store.get('a') === 1 && s._store.get('b').x[0] === 1);
  const v = await s.storage.get('b'); v.x.push(2);
  check('1. a read is a copy (changing it changes nothing on file)', s._store.get('b').x.length === 1);
  s.crashAt(s.batches() + 1);
  s.storage.put('c', 3); await settle();          /* batch n: commits */
  s.storage.put('d', 4); s.storage.delete('a');   /* batch n+1: lost */
  await settle();
  s.storage.put('e', 5); await settle();          /* and every later one */
  check('1. crashAt(n+1): batch n kept, n+1 and every later one lost (a dead room writes nothing)', s._store.get('c') === 3 && !s._store.has('d') && s._store.get('a') === 1 && !s._store.has('e') && s.dead());
  const t = makeStorage(new Map([['k:1', 1], ['k:2', 2], ['k:3', 3], ['k:4', 4], ['z', 9]]));
  const keys = async (o) => [...(await t.storage.list(o)).keys()].join();
  check('1. list: prefix, in key order', (await keys({ prefix: 'k:' })) === 'k:1,k:2,k:3,k:4');
  check('1. list: startAfter + limit (a page)', (await keys({ prefix: 'k:', startAfter: 'k:1', limit: 2 })) === 'k:2,k:3');
  check('1. list: start, end (end left out)', (await keys({ start: 'k:2', end: 'k:4' })) === 'k:2,k:3');
  check('1. list: reverse + limit (the newest)', (await keys({ prefix: 'k:', reverse: true, limit: 2 })) === 'k:4,k:3');
  const g = await t.storage.get(['k:1', 'nope', 'z']);
  check('1. get a list: a Map of what is there', g instanceof Map && g.size === 2 && g.get('z') === 9);
  check('1. delete a list answers how many were there', (await t.storage.delete(['k:1', 'nope'])) === 1);
}

/* ── 2 + 3. the room, and the input gate ── */
{
  const s = makeStorage();
  const room = await openRoom(s);
  const ws = await join(room, fakeWs('a'), 'bp_tr_a', { loginTaken: true });
  const P = room.playerState.bp_tr_a;
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('2. a player joins the world\'s way (state_sync, a live player)', !!sync && !!P);
  const c = room._wheelT().WHEEL_CENTRE;
  P.z = 'wheel'; P.x = c[0] + BANK.DOOR[0] + 40; P.y = c[1] + BANK.DOOR[1] + 150; P.coins = 500;
  const q = roomQueue(room);
  q.send(ws, 'bank_open');
  q.send(ws, 'bank_deposit', { kind: 'gold', n: 100, opId: 'q1' });
  q.send(ws, 'bank_deposit', { kind: 'gold', n: 50, opId: 'q2' });
  const last = q.send(ws, 'bank_withdraw', { kind: 'gold', n: 30, opId: 'q3' });
  check('3. sent without waiting, nothing has been delivered yet', q.delivered === 0);
  await last;
  const states = ws.sent.filter((m) => m.type === 'bank_state').map((m) => m.payload && m.payload.gold);
  check('3. ...then delivered one at a time, in order: the vault 100, 150, 120', JSON.stringify(states.slice(-3)) === '[100,150,120]' && q.delivered === 4, states);
  check('3. ...each to its writes\' commit (the vault on file says 120)', s._store.get('bank:bp_tr_a') && s._store.get('bank:bp_tr_a').gold === 120 && P.coins === 380);
}

/* ── 4. the clock ── */
{
  const a = seededClock({ seed: 5, start: 1000 }), b = seededClock({ seed: 5, start: 1000 });
  const ra = [a.random(), a.random(), a.random()], rb = [b.random(), b.random(), b.random()];
  check('4. the same seed, the same numbers', JSON.stringify(ra) === JSON.stringify(rb) && ra.every((x) => x >= 0 && x < 1));
  a.advance(250);
  check('4. moved only by advance (never backwards)', a.now() === 1250 && a.advance(-5) === 1250);
  check('4. installed, Date.now is the test\'s', Date.now() === clock.now());
}

/* ── 5. the disturbances ── */
{
  check('5. one closed list, frozen: the SHAPES part 7 members', JSON.stringify(DISTURBANCES.map((d) => d.id)) === JSON.stringify(['deploy', 'hidden', 'fps60', 'fps30', 'fps20', 'fps4', 'delay', 'loss', 'lane_full'])
    && Object.isFrozen(DISTURBANCES) && DISTURBANCES.every((d) => Object.isFrozen(d) && typeof d.what === 'string' && d.what.length > 10));
  check('5. found by name, an unknown one null', disturbance('fps4').fps === 4 && disturbance('nope') === null);
  const script = Array.from({ length: 12 }, (_, i) => ({ type: 'move', i }));
  const plain = schedule(script, disturbance('lane_full'));
  check('5. lane_full changes nothing: 12 messages, 100 ms apart, in order', plain.length === 12 && plain.every((st, i) => st.i === i && st.at === (i + 1) * 100 && !st.drop && !st.deploy && !st.rejoin));
  const f4 = schedule(script, disturbance('fps4'));
  const f60 = schedule(script, disturbance('fps60'));
  check('5. fps4: a message every 250 ms; fps60: every ~16.7 ms', f4[1].at - f4[0].at === 250 && Math.abs((f60[1].at - f60[0].at) - 1000 / 60) < 1e-9);
  const dl = schedule(script, disturbance('delay'));
  check('5. delay: every message 300 ms late, in order', dl.every((st, i) => st.i === i && st.at === (i + 1) * 100 + 300));
  const hd = schedule(script, disturbance('hidden'));
  const held = hd.filter((st) => st.i >= 4 && st.i < 8);
  check('5. hidden: the middle third held, then delivered together a minute on; the order kept, the rest after',
    held.every((st) => st.at === 400 + 60000) && hd.map((st) => st.i).join() === script.map((m) => m.i).join() && hd[11].at > held[0].at, hd.map((st) => [st.i, st.at]));
  const dp = schedule(script, disturbance('deploy'), { at: 5 });
  check('5. deploy: the restart lands before the message asked (5)', dp.filter((st) => st.deploy).map((st) => st.i).join() === '5');
  const ls = schedule(script, disturbance('loss'), { seed: 3 });
  const drop = ls.findIndex((st) => st.drop);
  check('5. loss: one message dropped, the player joins again before the next', drop >= 0 && ls.filter((st) => st.drop).length === 1 && (drop === ls.length - 1 || ls[drop + 1].rejoin));
  check('5. seeded: the same disturbance schedules the same every time', JSON.stringify(schedule(script, disturbance('loss'), { seed: 3 })) === JSON.stringify(ls));
}

/* ── 6. a deploy at a message ── */
{
  const s1 = makeStorage();
  const r1 = await openRoom(s1);
  const ws = await join(r1, fakeWs('d1'), 'bp_tr_d', { loginTaken: true });
  const P = r1.playerState.bp_tr_d;
  P.coins = 77; r1._saveRpg('bp_tr_d', P);
  r1._someMemory = 'lost on a deploy';
  await settle();
  /* the deploy: whatever is not yet written dies with the room */
  s1.crashAt(s1.batches());
  P.coins = 999; r1._saveRpg('bp_tr_d', P);
  await settle();
  const s2 = makeStorage(s1._store);
  const r2 = await openRoom(s2);
  check('6. a second room on what was written: the record as last committed (77, not 999)', s2._store.get('rpg:bp_tr_d').coins === 77);
  check('6. ...and nothing of the first room\'s memory', r2._someMemory === undefined && !r2.playerState.bp_tr_d);
  await join(r2, fakeWs('d2'), 'bp_tr_d', { loginTaken: true });
  check('6. the player joins again and is what was written', r2.playerState.bp_tr_d && r2.playerState.bp_tr_d.coins === 77);
  void ws;
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all testroom checks passed');
process.exit(0);
