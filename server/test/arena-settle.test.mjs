/* ═══ v2.3.5089: AN ARENA MATCH'S SETTLEMENT, ONE PLAN RECORD (gladiator.js; card E PR 8c, sitting 9's mend) ═══
 *
 *   1. ONE PLAN, ONE PUT: the settlement writes `arena_settle:<tid>:<mid>`
 *      and the losers' stamps in one batch, the stakes untouched; then the
 *      legs; then the stakes and the plan go together.  The puts a match:
 *      the old order's and ONE more (the plan), at 1 v 1, 3 v 2 and 10 v 10
 *      (cost-guard §17 holds the 1 v 1 line).
 *   2. A RESTART AFTER THE PLAN: the stakes and the plan on file, no leg
 *      paid; the next worker's sweep FINISHES the plan (each leg once),
 *      refunds nothing, and the world's gold is whole.
 *   3. A ROLLBACK, THEN A ROLL-FORWARD (sitting 9's find): a rolled-back
 *      worker's sweep (it knows no plan) refunds an unpaid winner's stake;
 *      the next new worker's sweep finishes the plan and pays that winner
 *      only the share left, never the stake twice.
 *   4. A HAND-MADE SPONSOR ID (a space in it, 150 characters) keeps its leg
 *      (sitting 9's find: it was dropped while its stake was deleted).
 *   5. A PLAN THE SWEEP CANNOT READ is kept, with its stakes, for the owner:
 *      nothing dropped unpaid -- and NOTHING PAID, not even its good legs
 *      (sitting 10: they were, and paid again each time the prune took their
 *      stamps), across two prunes.
 *   6. OFF BY DEFAULT (sitting 10: two rows a match is the owner's yes): no
 *      flag, the old order (no plan written); `arenasettleplan: true`, the
 *      plan.
 *   7. 48 H IDLE, THEN A JOIN (sitting 10's probe): a plan a deploy left with
 *      one leg paid, the room empty for 49 h; the tick's housekeeping slot
 *      (the real tick) waits to prune its stamps until the plan is finished,
 *      and the leg is paid once (it was paid again: +50 g, +620 g).
 *
 * BREAK PROOFS (rule 8), tried by hand: the refund check taken out of
 * _arenaStakeFinish -> FAIL 3 (the winner paid its stake twice); the arena's
 * wait taken out of tick.js's prune line -> FAIL 7 (the cut paid twice); the
 * readable check taken out of _arenaStakeFinish -> FAIL 5.
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import { ARENA } from '../src/gladiator.js';
import { OP_PRUNE } from '../src/inbox.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}
const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 4 }).install();

const TID = 'as-t', MID = 'as-m';
const rec = (coins) => ({ _v: 21, coins, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
/* a match: `w` sponsors of the winner W and `l` of the loser, 100 g each,
   every stake already out of its purse (as _handleArenaSponsor leaves it) */
function world(w, l, ids) {
  const m = new Map();
  const W = 'bp_as_w', L = 'bp_as_l';
  m.set('rpg:' + W, rec(0)); m.set('rpg:' + L, rec(0));
  const sp = [];
  for (let i = 0; i < w + l; i++) {
    const id = (ids && ids[i]) || ('bp_as_s' + i);
    sp.push(id);
    m.set('rpg:' + id, rec(0));
    m.set('arena_stake:' + TID + ':' + MID + ':' + id, { tid: TID, matchId: MID, sponsorId: id, targetId: i < w ? W : L, amount: 100, ts: clock.now() });
  }
  return { m, W, L, sp };
}
/* gold on file: purses, mail waiting, stakes held */
function gold(store) {
  let g = 0;
  for (const [k, v] of store) {
    if (k.startsWith('rpg:')) g += Math.floor((v && v.coins) || 0);
    else if (k.startsWith('inbox:')) { for (const e of v || []) if (e.kind === 'gold') g += Math.floor(e.payload.amount || 0); }
    else if (k.startsWith('arena_stake:')) g += Math.floor((v && v.amount) || 0);
  }
  return g;
}
const purse = (store, pid) => {
  let g = Math.floor(((store.get('rpg:' + pid) || {}).coins) || 0);
  for (const e of store.get('inbox:' + pid) || []) if (e.kind === 'gold') g += e.payload.amount;
  return g;
};
/* the puts a settlement writes, by kind of key */
function counting(st) {
  const puts = [];
  const real = st.storage.put;
  st.storage.put = function (k, v) {
    if (k && typeof k === 'object') for (const kk of Object.keys(k)) puts.push(kk); else puts.push(k);
    return real.call(this, k, v);
  };
  return puts;
}

/* ══════════ 1. ONE PLAN, ONE PUT ══════════ */
for (const [w, l] of [[1, 1], [3, 2], [10, 10]]) {
  const out = {};
  for (const on of [false, true]) {
    const { m, W } = world(w, l);
    const st = makeStorage(m);
    const room = await openRoom(st, on ? { arenasettleplan: true } : {});   /* off: the default (sitting 10) */
    const puts = counting(st);
    const b0 = st.batches();
    await room._arenaSettleStakes(TID, MID, W);
    await settle();
    out[on ? 'plan' : 'old'] = { puts: puts.length, plans: puts.filter((k) => k.startsWith('arena_settle:')).length, stakesRewritten: puts.filter((k) => k.startsWith('arena_stake:')).length, batches: st.batches() - b0, left: [...st._store.keys()].filter((k) => k.startsWith('arena_stake:') || k.startsWith('arena_settle:')).length, gold: gold(st._store) };
  }
  check(`1. ${w} v ${l}: the plan writes the old order's puts and ONE more (${out.old.puts} -> ${out.plan.puts}), no stake rewritten`,
    out.plan.puts === out.old.puts + 1 && out.plan.plans === 1 && out.plan.stakesRewritten === 0, out);
  check(`1. ${w} v ${l}: ...nothing left on file, and the gold the same as the old order's`, out.plan.left === 0 && out.plan.gold === out.old.gold && out.plan.gold === 100 * (w + l), out);
}
{
  /* the first batch: the plan and the losers' stamps, the stakes untouched */
  const { m, W } = world(2, 1);
  const st = makeStorage(m);
  const room = await openRoom(st, { arenasettleplan: true });
  st.crashAt(st.batches() + 1);   /* the room dies after the first batch */
  await room._arenaSettleStakes(TID, MID, W).catch(() => {});
  await settle();
  const plan = st._store.get('arena_settle:' + TID + ':' + MID);
  const stakes = [...st._store.entries()].filter(([k]) => k.startsWith('arena_stake:'));
  const stamps = [...st._store.keys()].filter((k) => k.startsWith('oplog:arenastakeloss:'));
  check('1. the first batch is the plan and the losers\' stamps, the stakes untouched', !!plan && plan.v === 1 && plan.winnerId === W && plan.keys.length === 3
    && stakes.length === 3 && stakes.every(([, v]) => !('settle' in v)) && stamps.length === 1, { plan, stakes: stakes.length, stamps });
}

/* ══════════ 2. A RESTART AFTER THE PLAN ══════════ */
{
  const bad = [];
  for (let k = 0; k <= 6; k++) {
    const { m, W, sp } = world(2, 2);
    const st = makeStorage(m);
    const room = await openRoom(st, { arenasettleplan: true });
    st.crashAt(st.batches() + k);
    await room._arenaSettleStakes(TID, MID, W).catch(() => {});
    await settle();
    /* the next worker, the records aged past the sweep's wait */
    const st2 = makeStorage(st._store);
    for (const [kk, v] of st2._store) if (kk.startsWith('arena_stake:')) st2._store.set(kk, { ...v, ts: 0 });
    const r2 = await openRoom(st2);
    r2._lastStakeSweep = 0; await r2._arenaStakeSweep(); await settle();
    const left = [...st2._store.keys()].filter((kk) => kk.startsWith('arena_stake:') || kk.startsWith('arena_settle:'));
    const g = gold(st2._store);
    const winners = sp.slice(0, 2).map((p) => purse(st2._store, p));
    /* whole: 400 g in the world, nothing left; either the plan (winners 145 each,
       the fighter 10 + rounding) or, before it, every stake refunded */
    const planned = winners.every((x) => x > 100);
    const refunded = sp.every((p) => purse(st2._store, p) === 100);
    if (g !== 400 || left.length || !(planned || refunded)) bad.push({ k, gold: g, left, winners, fighter: purse(st2._store, W) });
  }
  check('2. a restart before each batch of the settlement, then the sweep: 400 g whole, nothing left, the plan finished or every stake refunded', bad.length === 0, bad);
}

/* ══════════ 3. A ROLLBACK, THEN A ROLL-FORWARD ══════════ */
{
  const { m, W, sp } = world(1, 1);
  const st = makeStorage(m);
  const room = await openRoom(st, { arenasettleplan: true });
  st.crashAt(st.batches() + 1);   /* the plan on file, no leg paid */
  await room._arenaSettleStakes(TID, MID, W).catch(() => {});
  await settle();
  /* a rolled-back worker's sweep: it knows no plan; the loser is stamped (not
     refunded), the unpaid winner is refunded its stake (the old sweep's own
     credit, as gladiator.js wrote it before v2.3.5089) */
  const st2 = makeStorage(st._store);
  const old = await openRoom(st2);
  const C = sp[0];
  await old._creditPlayer(C, { opId: 'arenastakerefund:' + TID + ':' + MID + ':' + C, source: 'arena', kind: 'gold', payload: { amount: 100 }, note: 'sponsorship voided (server restart)' });
  await settle();
  /* ...and a new worker again: its sweep finishes the plan */
  const st3 = makeStorage(st2._store);
  for (const [kk, v] of st3._store) if (kk.startsWith('arena_stake:')) st3._store.set(kk, { ...v, ts: 0 });
  const r3 = await openRoom(st3);
  r3._lastStakeSweep = 0; await r3._arenaStakeSweep(); await settle();
  /* C staked 100 on the winner, D 100 on the loser: C is owed 100 + 90, the fighter 10 */
  check('3. a winner refunded by a rolled-back worker is paid only the share after (190 in all, never 290)', purse(st3._store, C) === 190 && purse(st3._store, W) === 10, { c: purse(st3._store, C), w: purse(st3._store, W) });
  check('3. ...the world\'s 200 g whole, nothing left on file', gold(st3._store) === 200 && ![...st3._store.keys()].some((k) => k.startsWith('arena_settle:') || k.startsWith('arena_stake:')), gold(st3._store));
}

/* ══════════ 4. A HAND-MADE SPONSOR ID ══════════ */
{
  const odd = 'bp_as odd ' + 'x'.repeat(140);
  const { m, W } = world(1, 1, [odd, 'bp_as_s1']);
  const st = makeStorage(m);
  const room = await openRoom(st, { arenasettleplan: true });
  await room._arenaSettleStakes(TID, MID, W);
  await settle();
  check('4. a sponsor id with a space, 150 characters long, keeps its leg (190 paid)', purse(st._store, odd) === 190 && purse(st._store, W) === 10, { odd: purse(st._store, odd), w: purse(st._store, W) });
}

/* a player in, and the room's own tick in hand (the socket's connect starts
   it, index.js; here it is started by hand and its function kept, as
   market-settle and cost-guard do) */
async function joinTicking(room, pid) {
  await join(room, fakeWs(pid), pid);
  let tickFn = null;
  const real = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return real(fn, ms); };
  try { if (!room.tickInterval) room.startTickLoop(); } finally { globalThis.setInterval = real; }
  return async (n) => {
    for (let i = 0; i < n && tickFn; i++) {
      try { tickFn(); } catch (e) { /* a slot's own business */ }
      await settle(); await settle();
      clock.advance(3500);   /* past the housekeeping slot's 3 s */
    }
    return !!tickFn;
  };
}
const stamps = (store, word) => [...store.keys()].filter((k) => k.startsWith('oplog:' + word));
const staked = (store) => gold(store) - purse(store, 'bp_as_x');   /* the match's gold: the joiner's own start left out */

/* ══════════ 5. A PLAN THE SWEEP CANNOT READ ══════════ */
{
  const { m, W } = world(1, 1);
  /* a good leg (the cut to W) and one it cannot read */
  m.set('arena_settle:' + TID + ':' + MID, { v: 1, tid: TID, matchId: MID, winnerId: W, legs: [{ to: W, amount: 10, kind: 'cut', id: TID + ':' + MID }, { to: W, amount: 10, kind: 'nope', id: TID + ':' + MID }], keys: ['arena_stake:' + TID + ':' + MID + ':bp_as_s0'], ts: 0 });
  const st = makeStorage(m);
  for (const [kk, v] of st._store) if (kk.startsWith('arena_stake:')) st._store.set(kk, { ...v, ts: 0 });
  const room = await openRoom(st);
  const tick = await joinTicking(room, 'bp_as_x');
  const paid = [];
  for (let round = 0; round < 3; round++) {
    await tick(4);   /* the slot: the arena's wait, then the prune */
    room._lastStakeSweep = 0; await room._arenaStakeSweep(); await settle();
    paid.push(purse(st._store, W));
    clock.advance(OP_PRUNE.TTL_MS + 3600000);   /* 49 h: the next prune takes any stamp */
  }
  const left = [...st._store.keys()].filter((k) => k.startsWith('arena_stake:') || k.startsWith('arena_settle:'));
  check('5. a plan with a leg the sweep cannot read is kept, its stakes with it, and pays NOTHING, across two prunes (W 0, 0, 0)', left.length === 3 && staked(st._store) === 200 && paid.every((g) => g === 0), { left, gold: staked(st._store), paid });
  check('5. ...and it never holds the prune (it pays nothing)', room._arenaPlansOpen === 0 && room._arenaSettleWait() === false);
  void ARENA;
}

/* ══════════ 6. OFF BY DEFAULT ══════════ */
{
  const out = {};
  for (const [name, flags] of [['none', {}], ['true', { arenasettleplan: true }], ['false', { arenasettleplan: false }]]) {
    const { m, W } = world(1, 1);
    const st = makeStorage(m);
    const room = await openRoom(st, flags);
    const puts = counting(st);
    await room._arenaSettleStakes(TID, MID, W);
    await settle();
    out[name] = { on: room._arenaSettlePlanOn(), plans: puts.filter((k) => k.startsWith('arena_settle:')).length, puts: puts.length, gold: gold(st._store) };
  }
  check('6. no flag: the old order (no plan, 5 puts); `arenasettleplan: true`: the plan (6); `false`: the old order',
    out.none.on === false && out.none.plans === 0 && out.none.puts === 5 && out.true.on === true && out.true.plans === 1 && out.true.puts === 6
    && out.false.on === false && out.false.plans === 0 && out.none.gold === 200 && out.true.gold === 200, out);
}

/* ══════════ 7. 48 H IDLE, THEN A JOIN ══════════ */
{
  const { m, W, sp } = world(1, 1);
  const st = makeStorage(m);
  const room = await openRoom(st, { arenasettleplan: true });
  /* the fighter online: the cut lands in the purse, its stamp the only record
     that it was paid (a mailbox would remember the opId by itself) */
  await join(room, fakeWs('w'), W);
  st.crashAt(st.batches() + 2);   /* the plan and the cut paid (W 10), the winner's share not */
  await room._arenaSettleStakes(TID, MID, W).catch(() => {});
  await settle();
  const cutStamp = stamps(st._store, 'arenastakecut:').length;
  /* the room empty for 49 h, then a join: a fresh worker's tick */
  clock.advance(OP_PRUNE.TTL_MS + 3600000);
  const st2 = makeStorage(st._store);
  const r2 = await openRoom(st2);   /* the switch off: a plan on file is finished all the same */
  r2._lastStakeSweep = clock.now();   /* the join's own sweep after the tick's slots (the probe's order) */
  const tick = await joinTicking(r2, 'bp_as_x');
  const ticked = await tick(6);
  const pruned = !stamps(st2._store, 'arenastakeloss:').length;   /* the loser's stamp, 49 h old: gone once the prune runs */
  r2._lastStakeSweep = 0; await r2._arenaStakeSweep(); await settle();
  const C = sp[0];
  check('7. setup: a plan with the cut paid into the purse, its stamp on file; the tick in hand', cutStamp === 1 && ticked && purse(st._store, W) === 10 && !(st._store.get('inbox:' + W) || []).length, { cutStamp, ticked, w: purse(st._store, W) });
  check('7. 48 h idle, then a join: the plan is finished before the prune, each leg once (W 10, C 190, never W 20)',
    purse(st2._store, W) === 10 && purse(st2._store, C) === 190 && staked(st2._store) === 200
    && ![...st2._store.keys()].some((k) => k.startsWith('arena_settle:') || k.startsWith('arena_stake:')), { w: purse(st2._store, W), c: purse(st2._store, C), gold: staked(st2._store), pruned });
  check('7. ...and then the prune ran (the plan\'s old stamps gone): the wait holds it only while a plan is open', r2._arenaPlansOpen === 0 && stamps(st2._store, 'arenastakecut:').length === 0, { open: r2._arenaPlansOpen, cut: stamps(st2._store, 'arenastakecut:') });
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all arena-settle checks passed');
