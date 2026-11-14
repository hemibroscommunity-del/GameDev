/* v2.3.4793: CHAOS -- A SERVER RESTART BETWEEN TWO WRITES, AND A DEPLOY MID-TRADE.
 *
 * Every merge touching server/ restarts the room (TRAPS §277), and a Durable
 * Object can be evicted between any two of its writes.  The suites that moved
 * money into one write each crash their own path at every write:
 * store-onewrite (the Auction House), market-settle (the General Store),
 * inbox.test §8c (a credit, the gift trade, the trade window's GOLD commit, a
 * staged weapon), duel.test §7b (a duel's START), arena.test §15 (an arena
 * ENTRY), dailyrewards (a daily quest), death-pile-saved (a death pile).
 * This suite is the sweep across what they leave out: for each money path
 * below, the room dies before EACH of its writes in turn, a second room
 * wakes on what was written (the restart sweeps run with the records aged,
 * the players come back), and the books are counted over the whole room --
 * every purse, bag, weapon stash and mailbox on disk, with no escrow record
 * left over.  Nothing may be made or lost, and a swap is whole or not at all.
 *
 *   1. a wagered duel WON: the pot's credit, then the escrow's delete
 *   2. a deploy mid-duel: the restart sweep's refunds, crashed at each write;
 *      the rejoin is not told a duel the new room never had
 *   3. the trade window's commit with gold, goods AND a staged weapon
 *   4. a deploy with a trade window open (offers set, a weapon staged, both
 *      ready): both rejoin, nothing is re-sent, a leave is answered 'gone',
 *      the weapon comes home; and the same with a new trade at once
 *   5. an arena sponsor's stake placed
 *   6. an arena match's stakes settled
 *
 * The storage is inbox.test §8c's: every write of one synchronous run commits
 * as one batch, as a Durable Object's does, and the room dies before batch
 * `crashAt` (that one and every later one are lost).  v2.3.5086: it lives in
 * the shared test room now (testroom.mjs, card E PR 7), this the first suite
 * moved onto it.
 *
 * KNOWN: a case found RED on today's code is listed in KNOWN with the reason
 * and kept out of the failure count (it prints KNOWN), so the suite guards
 * everything else while the fix waits on its own lane; CHAOS_KNOWN=1 counts
 * them.  A known case that turns green prints a NOTE: take it off the list.
 * This lane fixes no game code (money paths are reported, not fixed).
 *
 * Not here, on purpose: the threat levy's bounty (threat.js) and a clan's
 * founding fee (clans.js) also write in two batches, but both are shut on the
 * live game (OPEN_PVP false; clans became parties, `clanparty`), and a fix
 * never turns on what nobody has seen (TRAPS §305).
 */
import { GameRoom } from '../src/index.js';
import { ARENA } from '../src/gladiator.js';
/* v2.3.5086: the shared test room (testroom.mjs, card E PR 7): this suite's
   own storage model (every write of one synchronous run one batch, the room
   dying before batch `crashAt`), its socket, its session and its settle moved
   there, the first suite on it */
import { mockEnv, fakeWs, baseSession, makeStorage, settle } from './testroom.mjs';

/* v2.3.4793: what is red on today's code, each with its reason.  The ids are
   the ones the checks below pass to `verdict`. */
const KNOWN = new Map([
  /* v2.3.5087 (grand plan card E, PR 8): 'trade-weapon-half' is off the list --
     trade2.js v2.3.4795 delivers each staged weapon, or marks it OWED on file,
     in the swap's own one write, and this suite has passed it at every write
     since (it printed NOTE). Its checks count again. */
  /* v2.3.5088 (card E, PR 8b): 'arena-stake-place' is off the list too --
     gladiator.js v2.3.4796 takes the stake and puts its arena_stake record in
     ONE synchronous run (_escrowDebitGoldTogether), and this suite has passed
     it at every write since (it printed NOTE). Its check counts again. */
  /* v2.3.5089 (card E, PR 8c): 'arena-stake-settle-loss' is off the list --
     gladiator.js _arenaSettleStakes writes the whole settlement as a plan on
     every stake record in ONE run before a coin moves, pays each leg once by
     its opId, and the sweep FINISHES a planned record rather than refunding
     it.  KNOWN is empty: step 4.5's line.
     Sitting 10: the plan is OFF until the owner says yes to its cost (two
     rows a match), so case 6 runs it ON (`arenasettleplan: true`); off, the
     old order's hole is as it was. */
]);
const COUNT_KNOWN = process.env.CHAOS_KNOWN === '1';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
/* v2.3.5089: step 4.5's line -- no money path loses value to a restart, and
   none is waived: a new red case is fixed, never listed (grand plan card E) */
check('KNOWN is empty: no restart loss is waived (step 4.5)', KNOWN.size === 0, [...KNOWN.keys()]);
function verdict(id, name, cond, detail) {
  if (!KNOWN.has(id) || COUNT_KNOWN) return check(name, cond, detail);
  if (cond) console.log('NOTE known case "' + id + '" passes now: take it off KNOWN --', name);
  else console.log('KNOWN', name, '--', KNOWN.get(id).slice(0, 160) + '...', detail !== undefined ? JSON.stringify(detail).slice(0, 300) : '');
}

/* v2.3.5086: the storage is the shared room's (testroom.mjs makeStorage): inbox.test
   §8c's model, moved there whole */
const mkCrashState = makeStorage;
const settleIo = settle;   /* v2.3.5086: the shared room's */
async function joinOn(rm, ws, pid) {
  rm.sessions.set(ws, baseSession());
  /* today's login reward already taken, so a join moves no gold (inbox.test) */
  await rm.state.storage.put('cadence:login:' + pid, { period: rm._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await rm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid, data: { x: 100, y: 100, z: 'town' } }));
  await settleIo();
  return ws;
}
const cmd = (r, ws, type, payload) => r.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
const sessionOf = (r, pid) => { for (const s of r.sessions.values()) if (s && s.id === pid) return s; return null; };

const GEL = 'slime_gel';
const BLADE = 'Chaos-blade';
/* the blades in a record: every object named BLADE (a weapon can carry its
   name twice, a delivered one its provenance too, so the text is no count) */
function bladesIn(v) {
  let n = 0;
  const walk = (x) => {
    if (!x || typeof x !== 'object') return;
    if (!Array.isArray(x) && x.name === BLADE && typeof x.type === 'string') { n++; return; }
    for (const y of Array.isArray(x) ? x : Object.values(x)) walk(y);
  };
  walk(v);
  return n;
}

/* The books, read off the disk: gold in purses, mail and escrow records that
   still hold it; gel in bags and mail; blades in stashes, hands, mail and
   escrow.  `left` names any escrow record still standing. */
function books(store) {
  let gold = 0, gel = 0, blades = 0;
  const left = [];
  for (const [k, v] of store) {
    if (k.startsWith('rpg:')) {
      gold += Math.floor((v && v.coins) || 0);
      gel += (v && v.inventory && v.inventory[GEL]) || 0;
      blades += bladesIn(v);
    } else if (k.startsWith('inbox:')) {
      for (const e of v || []) {
        if (e.kind === 'gold') gold += Math.floor(e.payload.amount || 0);
        if (e.kind === 'item' && e.payload.invKey === GEL) gel += Math.max(1, Math.floor(e.payload.count || 1));
        if (e.kind === 'weapon') blades += bladesIn(e.payload);
      }
    } else if (k.startsWith('duelEscrow:') || k.startsWith('arena_stake:') || k.startsWith('arena_entry:') || k.startsWith('trade2wpn:')) {
      left.push(k);
    }
  }
  return { gold, gel, blades, left };
}
const per = (store, pid) => {
  const v = store.get('rpg:' + pid) || {};
  let gold = Math.floor(v.coins || 0), gel = (v.inventory && v.inventory[GEL]) || 0;
  let blades = bladesIn(v);
  for (const e of store.get('inbox:' + pid) || []) {
    if (e.kind === 'gold') gold += e.payload.amount;
    if (e.kind === 'item' && e.payload.invKey === GEL) gel += e.payload.count;
    if (e.kind === 'weapon') blades += bladesIn(e.payload);
  }
  return { gold, gel, blades };
};

/* A world of saved players: pid -> { coins, inv, stash } */
async function seedPlayers(spec) {
  const s = mkCrashState();
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  for (const [pid, p] of Object.entries(spec)) {
    await joinOn(r, fakeWs('seed-' + pid), pid);
    const ps = r.playerState[pid];
    ps.coins = p.coins || 0;
    ps.inventory = { ...(p.inv || {}) };
    if (p.stash) ps.weaponStash = p.stash.map((w) => ({ ...w }));
    r._saveRpg(pid, ps);
  }
  await settleIo();
  return s._store;
}

/* The restart: a second room on what survived.  Escrow records are aged past
   their sweeps' waits (the time a real restart takes is not the point), the
   players come back, and every restart sweep runs to its end. */
async function wake(survived, pids, opts = {}) {
  const s2 = mkCrashState(survived);
  for (const [k, v] of s2._store) {
    if (k.startsWith('duelEscrow:')) s2._store.set(k, { ...v, startedAt: 0 });
    if (k.startsWith('arena_stake:')) s2._store.set(k, { ...v, ts: 0 });
    if (k.startsWith('arena_entry:')) s2._store.set(k, { ...v, paidAt: 0 });
  }
  const r2 = new GameRoom(s2, mockEnv);
  await r2._liveFlagsEnsure();
  const wss = {};
  for (const pid of pids) wss[pid] = await joinOn(r2, fakeWs('back-' + pid), pid);
  if (opts.beforeSweeps) await opts.beforeSweeps(r2, wss);
  for (let i = 0; i < 2; i++) {
    r2._lastDuelSweep = 0; await r2._duelEscrowSweep();
    r2._lastStakeSweep = 0; await r2._arenaStakeSweep();
    r2._lastArenaSweep = 0; await r2._arenaEntrySweep();
    r2._lastT2WpnSweep = 0; await r2._trade2WpnSweep();
    await settleIo();
  }
  /* the mail reaches a player at their join: everyone joins again */
  for (const pid of pids) await joinOn(r2, fakeWs('again-' + pid), pid);
  await settleIo();
  return { store: s2._store, room: r2, wss };
}

/* Run `act` on a room over `seed` with the room dying before its k-th batch
   (`before` first, with no restart), then wake.  Returns the woken disk. */
async function crashRun(seed, k, path) {
  const s1 = mkCrashState(seed);
  const r1 = new GameRoom(s1, mockEnv);
  await r1._liveFlagsEnsure();
  const ctx = path.before ? ((await path.before(r1)) || {}) : {};
  await settleIo();
  s1.crashAt(k === Infinity ? Infinity : s1.batches() + k);
  ctx.result = await path.act(r1, ctx);
  await settleIo(); await settleIo();
  const w = await wake(s1._store, path.pids, path.wakeOpts);
  return { ...w, ctx };
}
async function measure(seed, path) {
  const s = mkCrashState(seed);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  const ctx = path.before ? ((await path.before(r)) || {}) : {};
  await settleIo();
  const b0 = s.batches();
  ctx.result = await path.act(r, ctx);
  await settleIo(); await settleIo();
  return { batches: s.batches() - b0, store: s._store, ctx };
}
/* every k from 0 (before the first write) to n (none lost) */
async function everyRestart(seed, path, judge) {
  const m = await measure(seed, path);
  const out = [];
  for (let k = 0; k <= m.batches; k++) {
    const w = await crashRun(seed, k, path);
    const bad = judge(w.store, k, w);
    if (bad) out.push({ restartBefore: k, of: m.batches, ...bad });
  }
  return { wrong: out, batches: m.batches };
}
const sameBooks = (W0) => (st) => {
  const b = books(st);
  if (b.gold !== W0.gold || b.gel !== W0.gel || b.blades !== W0.blades || b.left.length) {
    return { gold: b.gold - W0.gold, gel: b.gel - W0.gel, blades: b.blades - W0.blades, left: b.left };
  }
  return null;
};

// ── 1. a wagered duel won: the pot's credit, then the escrow's delete ──
const DA = 'bp_cx_duela', DB = 'bp_cx_duelb';
{
  const seed = await seedPlayers({ [DA]: { coins: 100 }, [DB]: { coins: 100 } });
  const W0 = books(seed);
  const path = {
    pids: [DA, DB],
    before: async (r) => {
      await joinOn(r, fakeWs('da'), DA); await joinOn(r, fakeWs('db'), DB);
      await r._interceptDuel(DA, { type: 'duel_wager_request', payload: { target: DB, fromName: 'A', wager: 40 } });
      await r._interceptDuel(DB, { type: 'duel_accept', payload: { target: DA, wager: 40 } });
      await settleIo();
      if (!r._duelFor(DA)) throw new Error('1: the duel did not start');
    },
    act: async (r) => {
      const psB = r.playerState[DB];
      psB.hp = 0; psB.dying = false; psB.dead = false;
      r._handlePlayerDeath(psB, DB, 'pvp:' + DA);
      await settleIo();
    },
  };
  const outcomes = new Set();
  const res = await everyRestart(seed, path, (st) => {
    const a = per(st, DA).gold, b = per(st, DB).gold;
    outcomes.add(a + '/' + b);
    const bad = sameBooks(W0)(st);
    if (bad) return bad;
    if (!((a === 140 && b === 60) || (a === 100 && b === 100))) return { a, b };
    return null;
  });
  check(`1. a wagered duel won: a restart before any of its ${res.batches} write(s) makes or loses no gold; the pot is paid (140/60) or the duel voided (100/100)`, res.wrong.length === 0 && res.batches >= 1, res);
  check('1. ...and with no restart the winner holds the pot', outcomes.has('140/60'), [...outcomes]);
}

// ── 2. a deploy mid-duel ──
{
  const seed0 = await seedPlayers({ [DA]: { coins: 100 }, [DB]: { coins: 100 } });
  /* the duel started and written, then the deploy: the room is gone */
  const s = mkCrashState(seed0);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  await joinOn(r, fakeWs('da'), DA); await joinOn(r, fakeWs('db'), DB);
  await r._interceptDuel(DA, { type: 'duel_wager_request', payload: { target: DB, fromName: 'A', wager: 40 } });
  await r._interceptDuel(DB, { type: 'duel_accept', payload: { target: DA, wager: 40 } });
  await settleIo();
  const midDuel = s._store;
  check('2. the duel\'s stakes are in escrow on disk (60 each in the purse, one escrow record)',
    per(midDuel, DA).gold === 60 && per(midDuel, DB).gold === 60 && books(midDuel).left.filter((k) => k.startsWith('duelEscrow:')).length === 1, { a: per(midDuel, DA), b: per(midDuel, DB), left: books(midDuel).left });

  /* the rejoin: the new room never had the duel, so it is not re-sent, and
     the phone (caps.rejoinResend >= 1) clears its copy at state_sync */
  const w = await wake(midDuel, [DA, DB]);
  const sentA = w.wss[DA].sent;
  const sync = sentA.find((m) => m.type === 'state_sync');
  check('2. after the deploy the rejoin is told no duel (no duel_resume), and the cap tells the phone to clear its copy',
    !sentA.some((m) => m.type === 'duel_resume') && sync && sync.caps && sync.caps.rejoinResend >= 1 && !w.room._duelFor(DA),
    { resume: sentA.filter((m) => m.type === 'duel_resume').length, cap: sync && sync.caps && sync.caps.rejoinResend });
  check('2. ...and the restart sweep hands both stakes back (100/100, no record left)',
    per(w.store, DA).gold === 100 && per(w.store, DB).gold === 100 && books(w.store).left.length === 0, { a: per(w.store, DA), b: per(w.store, DB), left: books(w.store).left });

  /* the sweep itself, crashed at each of its writes (both players away: the
     refunds go to the mail); the next wake's sweep finishes it */
  const aged = new Map([...midDuel].map(([k, v]) => [k, k.startsWith('duelEscrow:') ? { ...v, startedAt: 0 } : v]));
  const W0 = books(seed0);
  const res = await everyRestart(aged, {
    pids: [DA, DB],
    act: async (r1) => { r1._lastDuelSweep = 0; await r1._duelEscrowSweep(); },
  }, (st) => sameBooks(W0)(st) || ((per(st, DA).gold !== 100 || per(st, DB).gold !== 100) ? { a: per(st, DA).gold, b: per(st, DB).gold } : null));
  check(`2. the restart sweep crashed before any of its ${res.batches} write(s), then swept again: each stake comes back exactly once`, res.wrong.length === 0 && res.batches >= 2, res);
}

// ── 3. the trade window's commit: gold, goods and a staged weapon ──
const TA = 'bp_cx_tradea', TB = 'bp_cx_tradeb';
const blade = { type: 'sword', gearBase: 'iron', tier: 'common', tierMult: 1, name: BLADE };
const tradeSeed = await seedPlayers({ [TA]: { coins: 300, stash: [blade] }, [TB]: { coins: 300, inv: { [GEL]: 5 } } });
/* open the window, A stages the blade and 40 gold, B puts up 70 gold and 3
   gel; both ready; A confirms (the cooling-off aged away) */
async function openTrade(r, { ready = true, confirmA = true } = {}) {
  const wa = await joinOn(r, fakeWs('ta'), TA), wb = await joinOn(r, fakeWs('tb'), TB);
  await cmd(r, wa, 'trade2_open', { target: TB });
  await cmd(r, wb, 'trade2_open', { target: TA });
  await cmd(r, wa, 'trade2_stage_weapon', { stashIdx: 0 });
  await settleIo();
  await cmd(r, wa, 'trade2_set', { offer: { _gold: 40 } });
  await cmd(r, wb, 'trade2_set', { offer: { _gold: 70, [GEL]: 3 } });
  if (ready) {
    await cmd(r, wa, 'trade2_ready', { ready: true });
    await cmd(r, wb, 'trade2_ready', { ready: true });
    for (const t of r._trades2.values()) t.changedAt = Date.now() - 999999;
    if (confirmA) await cmd(r, wa, 'trade2_confirm');
  }
  await settleIo();
  const t = [...r._trades2.values()][0];
  return { wa, wb, id: t && t.id };
}
{
  const W0 = books(tradeSeed);
  check('3. the world: 600 gold, 5 gel, one blade (A\'s)', W0.gold === 600 && W0.gel === 5 && W0.blades === 1, W0);
  const path = { pids: [TA, TB], before: (r) => openTrade(r), act: (r, ctx) => cmd(r, ctx.wb, 'trade2_confirm') };
  const m = await measure(tradeSeed, path);
  const whole = { a: per(m.store, TA), b: per(m.store, TB) };
  check('3. with no restart the trade is whole: A 330 gold, 3 gel, no blade; B 270 gold, 2 gel, the blade',
    whole.a.gold === 330 && whole.a.gel === 3 && whole.a.blades === 0 && whole.b.gold === 270 && whole.b.gel === 2 && whole.b.blades === 1, whole);
  const isNone = (a, b) => a.gold === 300 && a.gel === 0 && a.blades === 1 && b.gold === 300 && b.gel === 5 && b.blades === 0;
  const isWhole = (a, b) => a.gold === 330 && a.gel === 3 && a.blades === 0 && b.gold === 270 && b.gel === 2 && b.blades === 1;
  const conserve = await everyRestart(tradeSeed, path, sameBooks(W0));
  check(`3. a restart before any of the commit's ${conserve.batches} write(s) makes or loses no gold, gel or blade over the room`, conserve.wrong.length === 0, conserve);
  const swap = await everyRestart(tradeSeed, path, (st) => {
    const a = per(st, TA), b = per(st, TB);
    return (isNone(a, b) || isWhole(a, b)) ? null : { a, b };
  });
  verdict('trade-weapon-half', `3. ...and the swap is whole or not at all at every one of them (handoff rule 7: both sides of a swap in one write)`, swap.wrong.length === 0, swap.wrong);
}

// ── 4. a deploy with a trade window open ──
{
  const W0 = books(tradeSeed);
  const s = mkCrashState(tradeSeed);
  const r = new GameRoom(s, mockEnv);
  await r._liveFlagsEnsure();
  const ctx = await openTrade(r, { ready: true, confirmA: false });
  await settleIo();
  const open = s._store;
  const escrowed = [...open].filter(([k, v]) => k.startsWith('trade2wpn:') && bladesIn(v) === 1);
  check('4. the window is open with the blade in escrow on disk (out of A\'s stash, in one record)', !!ctx.id && escrowed.length === 1 && per(open, TA).blades === 0, { id: ctx.id, left: books(open).left, a: per(open, TA) });
  const w = await wake(open, [TA, TB], {
    beforeSweeps: async (r2, wss) => {
      /* the phone's leave, naming the trade the old room held */
      wss[TA].sent.length = 0;
      await cmd(r2, wss[TA], 'trade2_cancel', { id: ctx.id });
      await settleIo();
    },
  });
  const sentA = w.wss[TA].sent, sentB = w.wss[TB].sent;
  check('4. after the deploy nobody is sent the dead window (no trade2_state open, no invite)',
    ![...sentA, ...sentB].some((x) => (x.type === 'trade2_state' && x.payload && x.payload.state !== 'cancelled') || x.type === 'trade2_invite'),
    [...sentA, ...sentB].filter((x) => /^trade2/.test(x.type)).map((x) => [x.type, x.payload && x.payload.state]));
  check('4. ...A\'s leave naming it is answered at once: cancelled, "gone"',
    sentA.some((x) => x.type === 'trade2_state' && x.payload && x.payload.state === 'cancelled' && x.payload.reason === 'gone' && x.payload.id === ctx.id), sentA.filter((x) => /^trade2/.test(x.type)));
  const a = per(w.store, TA), b = per(w.store, TB);
  check('4. ...and nothing moved: the blade is back with A, the books as before, no escrow left',
    a.gold === 300 && a.blades === 1 && b.gold === 300 && b.gel === 5 && !sameBooks(W0)(w.store), { a, b, books: books(w.store) });

  /* the same deploy, and A at once trades the blade again in the new room
     (its escrow numbering starts again at 1, the old record's key) */
  const s3 = mkCrashState(open);
  const r3 = new GameRoom(s3, mockEnv);
  await r3._liveFlagsEnsure();
  const again = await openTrade(r3, { ready: true, confirmA: true });
  await cmd(r3, again.wb, 'trade2_confirm');
  await settleIo(); await settleIo();
  const w3 = await wake(s3._store, [TA, TB]);
  const b3 = books(w3.store);
  check('4. a deploy, then A trades again at once in the new room: one blade in the world, the books balanced',
    b3.blades === 1 && b3.gold === W0.gold && b3.gel === W0.gel && b3.left.length === 0, { books: b3, a: per(w3.store, TA), b: per(w3.store, TB) });
}

// ── 5. an arena sponsor's stake ──
const SP = 'bp_cx_sponsor', FA = 'bp_cx_fightera', FB = 'bp_cx_fighterb';
const arenaRunning = (r) => {
  r._arena = { id: 'cx-t', status: 'running', round: 1, matches: [{ id: 'cx-m', round: 1, a: FA, b: FB, aName: 'FA', bName: 'FB' }], entrants: [FA, FB] };
};
{
  const seed = await seedPlayers({ [SP]: { coins: 1000 }, [FA]: { coins: 0 }, [FB]: { coins: 0 } });
  const W0 = books(seed);
  const path = {
    pids: [SP],
    before: async (r) => { await joinOn(r, fakeWs('sp'), SP); arenaRunning(r); },
    act: async (r) => { await r._handleArenaSponsor(sessionOf(r, SP), { targetId: FA, amount: 300 }); },
  };
  const m = await measure(seed, path);
  check('5. with no restart the stake is placed: 700 in the purse, one stake record of 300',
    per(m.store, SP).gold === 700 && [...m.store].some(([k, v]) => k.startsWith('arena_stake:') && v.amount === 300), { sp: per(m.store, SP), keys: [...m.store.keys()].filter((k) => k.startsWith('arena_stake:')) });
  /* the bracket lives in memory: a deploy voids it, and the sweep refunds */
  const res = await everyRestart(seed, path, sameBooks(W0));
  verdict('arena-stake-place', `5. a restart before any of the stake's ${res.batches} write(s), then the restart sweep: the sponsor has the 1,000 back`, res.wrong.length === 0, res.wrong);
}

// ── 6. an arena match's stakes settled ──
{
  /* the stakes as placed: C 500 on the winner W, D 500 on the loser (each
     already out of its purse, as _handleArenaSponsor leaves it) */
  const C = 'bp_cx_backerc', D = 'bp_cx_backerd', W = FA, L = FB;
  const s0 = await seedPlayers({ [C]: { coins: 500 }, [D]: { coins: 500 }, [W]: { coins: 0 }, [L]: { coins: 0 } });
  for (const [sp, tg] of [[C, W], [D, L]]) {
    s0.set('arena_stake:cx-t:cx-m:' + sp, { tid: 'cx-t', matchId: 'cx-m', sponsorId: sp, targetId: tg, amount: 500, ts: Date.now() });
  }
  const START_GOLD = 500 + 500 + 1000;   /* purses + the two stakes */
  const path = {
    pids: [C, D, W, L],
    before: async (r) => { for (const p of [C, D, W, L]) await joinOn(r, fakeWs('s6' + p), p); },
    /* v2.3.5089 (sitting 10): the plan on, as the owner's yes would turn it */
    act: async (r) => { r._liveFlags = Object.assign({}, r._liveFlags, { arenasettleplan: true }); await r._arenaSettleStakes('cx-t', 'cx-m', W); },
  };
  const m = await measure(s0, path);
  const whole = { c: per(m.store, C).gold, d: per(m.store, D).gold, w: per(m.store, W).gold };
  check('6. with no restart: C gets 500 + 450 back, the fighter W the 50 cut, D nothing (2,000 in the world)',
    whole.c === 1450 && whole.d === 500 && whole.w === 50, whole);
  const made = [], lost = [];
  const res = await everyRestart(s0, path, (st, k) => {
    const b = books(st);
    if (b.gold > START_GOLD || b.left.length) made.push({ k, gold: b.gold - START_GOLD, left: b.left });
    if (b.gold < START_GOLD) lost.push({ k, gold: b.gold - START_GOLD });
    return null;
  });
  check(`6. a restart before any of the settlement's ${res.batches} write(s), then the restart sweep: no gold is ever MADE, no stake left standing`, made.length === 0 && res.batches >= 2, made);
  verdict('arena-stake-settle-loss', '6. ...nor lost', lost.length === 0, lost);
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
