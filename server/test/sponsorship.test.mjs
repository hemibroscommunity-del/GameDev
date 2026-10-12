/* Arena sponsorship test (v2.3.1128, PR11 half 1).  Spectator stakes
 * used to be pure client theatre: three different PartyPanel payout
 * mints (pot-split / champion 2x / per-match 1.8x) paid the bettor
 * from their own Math.  Stakes now escrow at placement and settle ONLY
 * off the server-observed match result (never the cosmetic arena_bet
 * relay).  Checks:
 *   1. caps.sponsor advertised in state_sync.
 *   2. Stake escrows gold + persists a record; ack sent privately.
 *   3. One stake per sponsor per match; competitors can't sponsor
 *      their own match; amount clamps; bogus targets rejected.
 *   4. matchId optional: the open current-round match containing the
 *      target is resolved server-side.
 *   5. Server-observed resolution pays winning sponsors their stake back
 *      plus a pro-rata share of the losing stakes (v2.3.3177: a pool, after
 *      the winning competitor's FIGHTER_CUT; was 3x from the house);
 *      private arena_stake_result either way.
 *   6. Re-settling is opId-idempotent (a re-put record can't double-pay).
 *   7. Sweep refunds orphaned stakes but never over a stamped payout.
 *   8. _arenaWire emits the old sanitizeTournament superset the betting
 *      UI actually reads (status 'active', players id/name, champion.id,
 *      recentMatches winnerId) -- the PR10 shape mismatch regression.
 *   9. Forged arena_stake_result is not rebroadcast (deny-list).
 *
 * v2.3.1210 (spectator stake board): stakes were private; a privileged
 * server-summed board now lets spectators see the action.  Checks:
 *   10. Placement broadcasts a server-summed board (two sponsors on one
 *       competitor sum + count 2 backers, no per-sponsor identity
 *       leaked); a second staked match adds a row; a resolved match
 *       drops off after settlement while open matches remain; a forged
 *       arena_stake_board is dropped by the PRIVILEGED deny-list.
 */
import { GameRoom } from '../src/index.js';
import { ARENA } from '../src/gladiator.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const P = (n) => 'bp_sp_' + n;
const sponsor = (ws, payload) => room.webSocketMessage(ws, JSON.stringify({ type: 'arena_sponsor', payload }));

const wss = {};
for (const n of ['a', 'b', 'c', 'd']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
  room.playerState[P(n)].coins = 1000;
}

// ── 1. caps ──
const sync = wss.c.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.sponsor', sync && sync.caps && sync.caps.sponsor === true, sync && sync.caps);

// ── setup: 2-player tournament, a vs b ──
await room._arenaJoin(P('a'), 'A');
await room._arenaJoin(P('b'), 'B');
room._arena.gatherDeadline = Date.now() - 1;
room._arenaLazyTick(Date.now());
await new Promise((r) => setTimeout(r, 20));
const t = room._arena;
const m = t.matches[0];
check('tournament running with an active match', t.status === 'running' && m && m.active, t && t.status);

// ── 8a. wire superset while running ──
const wireR = room._arenaWire();
check('wire status is the old-contract "active"', wireR.status === 'active', wireR.status);
check('wire players carry id/name/level/color (betting UI shape)', wireR.players.every((p) => p.id && p.name && typeof p.level === 'number' && p.color), wireR.players[0]);
check('wire exposes currentMatches with ids', wireR.currentMatches.length === 1 && wireR.currentMatches[0].id === m.id, wireR.currentMatches);

// ── 2. stake escrows + records ──
wss.c.sent.length = 0;
await sponsor(wss.c, { targetId: P('a'), amount: 100 }); // matchId omitted on purpose (4)
const placed = msgsOfType(wss.c, 'arena_stake_placed');
const stakeKey = 'arena_stake:' + t.id + ':' + m.id + ':' + P('c');
check('stake escrows gold and persists the record', room.playerState[P('c')].coins === 900 && state._store.has(stakeKey), { coins: room.playerState[P('c')].coins });
check('private arena_stake_placed ack with target name', placed.length === 1 && placed[0].payload.amount === 100 && placed[0].payload.matchId === m.id, placed.map((p) => p.payload));

// ── 3. validation ──
wss.c.sent.length = 0;
await sponsor(wss.c, { targetId: P('a'), amount: 50 });
check('second stake on the same match rejected', msgsOfType(wss.c, 'arena_stake_error')[0].payload.code === 'already-staked' && room.playerState[P('c')].coins === 900);
wss.a.sent.length = 0;
await sponsor(wss.a, { targetId: P('b'), amount: 50 });
check('competitor cannot sponsor own match', msgsOfType(wss.a, 'arena_stake_error')[0].payload.code === 'own-match' && room.playerState[P('a')].coins === 900); // a paid 100 entry
for (const bad of [5, 5001, 'lol']) {
  wss.d.sent.length = 0;
  await sponsor(wss.d, { targetId: P('a'), amount: bad });
  if (msgsOfType(wss.d, 'arena_stake_error')[0]?.payload.code !== 'bad-amount' || room.playerState[P('d')].coins !== 1000) {
    check('bad amount rejected: ' + bad, false, room.playerState[P('d')].coins);
  }
}
check('all bad amounts rejected without debits', room.playerState[P('d')].coins === 1000);
wss.d.sent.length = 0;
await sponsor(wss.d, { targetId: 'bp_nobody', amount: 100 });
check('bogus target rejected', msgsOfType(wss.d, 'arena_stake_error')[0].payload.code === 'no-match' && room.playerState[P('d')].coins === 1000);

// ── 4/5. d backs b via explicit matchId; a wins; both stakes settle ──
await sponsor(wss.d, { matchId: m.id, targetId: P('b'), amount: 200 });
check('explicit-matchId stake escrows', room.playerState[P('d')].coins === 800);
const duel = room._duelFor(P('a'));
wss.c.sent.length = 0; wss.d.sent.length = 0;
room._resolveDuel(duel, P('a'), P('b'), 'kill'); // server-observed result
await new Promise((r) => setTimeout(r, 30));
const cRes = msgsOfType(wss.c, 'arena_stake_result');
const dRes = msgsOfType(wss.d, 'arena_stake_result');
/* v2.3.3177: a pool.  c's 100 on the winner, d's 200 on the loser: the
   fighter keeps 10% of the 200 (20), c gets 100 back + the other 180. */
check('winning sponsor paid their stake + the losing pool after the cut', room.playerState[P('c')].coins === 900 + 280 && cRes.length === 1 && cRes[0].payload.won === true && cRes[0].payload.payout === 280, { coins: room.playerState[P('c')].coins, cRes: cRes.map((r) => r.payload) });
check('the winning competitor keeps the cut of the losing stakes', room.playerState[P('a')].coins === 900 + 20 + 2 * ARENA.PRIZE_PER_ENTRANT, { a: room.playerState[P('a')].coins });
check('losing sponsor notified, no payout', dRes.length === 1 && dRes[0].payload.won === false && dRes[0].payload.payout === 0 && room.playerState[P('d')].coins === 800, dRes.map((r) => r.payload));
check('stake records deleted after settlement', !state._store.has(stakeKey) && !state._store.has('arena_stake:' + t.id + ':' + m.id + ':' + P('d')));

// ── 8b. wire superset when complete ──
const wireC = room._arenaWire();
check('wire champion carries old-contract id/name', wireC.status === 'complete' && wireC.champion.id === P('a') && wireC.champion.name === 'A', wireC.champion);
check('wire recentMatches carry winnerId', wireC.recentMatches.length === 1 && wireC.recentMatches[0].winnerId === P('a'), wireC.recentMatches);

// ── 6. re-settle is opId-idempotent ──
await state.storage.put(stakeKey, { tid: t.id, matchId: m.id, sponsorId: P('c'), targetId: P('a'), amount: 100, ts: Date.now() });
await room._arenaSettleStakes(t.id, m.id, P('a'));
await new Promise((r) => setTimeout(r, 10));
check('re-put record cannot double-pay (opId stamp)', room.playerState[P('c')].coins === 1180 && !state._store.has(stakeKey), room.playerState[P('c')].coins);

// ── 7. sweep: refund unstamped orphans, never over a stamped payout ──
room._arena = null; // deploy wiped the bracket
await state.storage.put('arena_stake:gone:m1:' + P('d'), { tid: 'gone', matchId: 'm1', sponsorId: P('d'), targetId: 'x', amount: 150, ts: Date.now() - ARENA.STALE_STAKE_MS - 1000 });
room._lastStakeSweep = 0;
await room._arenaStakeSweep();
check('sweep refunds an unstamped orphan stake', room.playerState[P('d')].coins === 800 + 150 && !state._store.has('arena_stake:gone:m1:' + P('d')), room.playerState[P('d')].coins);
// Stamped case: pay the win opId first, then a lingering record must NOT refund on top.
await room._creditPlayer(P('d'), { opId: 'arenastakewin:gone2:m2:' + P('d'), source: 'arena', kind: 'gold', payload: { amount: 300 }, note: 'test payout' });
await state.storage.put('arena_stake:gone2:m2:' + P('d'), { tid: 'gone2', matchId: 'm2', sponsorId: P('d'), targetId: 'x', amount: 100, ts: Date.now() - ARENA.STALE_STAKE_MS - 1000 });
room._lastStakeSweep = 0;
await room._arenaStakeSweep();
check('sweep never refunds over a stamped payout', room.playerState[P('d')].coins === 950 + 300 && !state._store.has('arena_stake:gone2:m2:' + P('d')), room.playerState[P('d')].coins);

// ── 9. forged arena_stake_result denied ──
room.eventBuffer.length = 0;
await room.webSocketMessage(wss.d, JSON.stringify({ type: 'arena_stake_result', payload: { won: true, payout: 99999 } }));
check('forged arena_stake_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'arena_stake_result').length === 0, room.eventBuffer.map((e) => e.type));

// ── 10. v2.3.1210 spectator stake board (server-summed, display-only) ──
{
  const lastBoard = () => [...room.eventBuffer].reverse().find((e) => e.type === 'arena_stake_board');
  // Fresh 4-player bracket so resolving ONE round-1 match leaves the
  // tournament RUNNING (a 2-player final would complete and the board
  // rebroadcast is suppressed once status flips to 'complete').
  for (const n of ['e', 'f', 'g', 'h']) {
    wss[n] = fakeWs(n);
    await join(wss[n], P(n), n.toUpperCase());
    room.playerState[P(n)].coins = 2000;
    await room._arenaJoin(P(n), n.toUpperCase());
  }
  room._arena.gatherDeadline = Date.now() - 1;
  room._arenaLazyTick(Date.now());
  await new Promise((r) => setTimeout(r, 20));
  const t2 = room._arena;
  const m1 = t2.matches[0], m2 = t2.matches[1];
  check('4-bracket has two open round-1 matches', t2.status === 'running' && m1 && m2 && m1.id !== m2.id && !m1.winner && !m2.winner, t2 && t2.matches.length);

  // c and d both back the SAME competitor in m1 (they're not in t2, so
  // eligible) -> the board must SUM them and count 2 backers.
  room.eventBuffer.length = 0;
  await sponsor(wss.c, { matchId: m1.id, targetId: m1.a, amount: 100 });
  await sponsor(wss.d, { matchId: m1.id, targetId: m1.a, amount: 250 });
  {
    const bd = lastBoard();
    const row = bd && bd.payload.board.find((r) => r.matchId === m1.id);
    check('placement broadcasts a server-summed board row',
      row && row.aId === m1.a && row.aTotal === 350 && row.aBackers === 2 && row.bTotal === 0 && row.bBackers === 0,
      bd && bd.payload.board);
    check('board rows leak no individual sponsor identity/amount',
      row && !('sponsorId' in row) && !('sponsors' in row), row);
  }

  // A backs m2 (a is not in t2) -> the board carries a SECOND row.
  await sponsor(wss.a, { matchId: m2.id, targetId: m2.a, amount: 500 });
  check('a second staked match adds a second board row',
    (() => { const bd = lastBoard(); return bd && bd.payload.board.length === 2 && bd.payload.board.some((r) => r.matchId === m2.id && r.aTotal === 500); })(),
    lastBoard() && lastBoard().payload.board);

  // Resolve m1 (server-observed) -> its stakes settle + records delete +
  // winner set, so the recomputed board DROPS m1 and keeps m2.  The
  // tournament stays running (m2 still open).
  room.eventBuffer.length = 0;
  const duel1 = room._duelFor(m1.a);
  room._resolveDuel(duel1, m1.a, m1.b, 'kill');
  await new Promise((r) => setTimeout(r, 30));
  {
    const bd = lastBoard();
    const r1 = bd && bd.payload.board.find((r) => r.matchId === m1.id);
    const r2 = bd && bd.payload.board.find((r) => r.matchId === m2.id);
    check('settled match drops off the board; the open match remains',
      bd && !r1 && r2 && r2.aTotal === 500, bd && bd.payload.board);
  }

  // Deny-list: a forged arena_stake_board from a client is not rebroadcast.
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wss.d, JSON.stringify({ type: 'arena_stake_board', payload: { tid: t2.id, board: [{ matchId: m2.id, aId: m2.a, aTotal: 999999, aBackers: 1 }] } }));
  check('forged arena_stake_board dropped by PRIVILEGED deny-list',
    room.eventBuffer.filter((e) => e.type === 'arena_stake_board').length === 0, room.eventBuffer.map((e) => e.type));
}

// ── 11. v2.3.3177: sponsorship is a pool -- it moves gold, it never makes it ──
// A won stake paid 3x from the house and a lost one went to the winning
// fighter.  So backing BOTH sides of a match netted the backers +stake and
// the winner +stake whoever won, and backing the winner of a match your own
// two accounts fought paid 2x per backer.  Settled directly here (records
// put the way placement writes them; the escrow already took the gold).
{
  const coins = (id) => room.playerState[id].coins;
  const putStake = (tid, mid, sponsorId, targetId, amount) =>
    state.storage.put('arena_stake:' + tid + ':' + mid + ':' + sponsorId, { tid, matchId: mid, sponsorId, targetId, amount, ts: Date.now() });
  const W = P('a'), L = P('b');            // the two fighters of each made-up match
  const settle = async (tid, mid, stakes) => {
    for (const [sp, tg, n] of stakes) await putStake(tid, mid, sp, tg, n);
    const ids = [...new Set([W, L, ...stakes.map((x) => x[0])])];
    const before = Object.fromEntries(ids.map((id) => [id, coins(id)]));
    await room._arenaSettleStakes(tid, mid, W);
    await new Promise((r) => setTimeout(r, 10));
    const got = Object.fromEntries(ids.map((id) => [id, coins(id) - before[id]]));
    const staked = stakes.reduce((n, x) => n + x[2], 0);
    const paid = Object.values(got).reduce((n, v) => n + v, 0);
    return { got, staked, paid };
  };

  // (a) the hedge: 5,000 on each side
  const h = await settle('pool-t', 'pool-m1', [[P('c'), W, 5000], [P('d'), L, 5000]]);
  check('a hedge on both sides pays out exactly what was staked: nothing is made', h.paid === h.staked, h);
  check('...the two backers lose the cut between them instead of gaining a stake', h.got[P('c')] + h.got[P('d')] === 9500 && h.got[P('c')] === 9500, h.got);
  check('...and the winning fighter gets the cut, not the whole losing stake', h.got[W] === 500, h.got);

  // (b) a fixed match: every backer on the winner
  const f = await settle('pool-t', 'pool-m2', [[P('c'), W, 5000], [P('d'), W, 3000]]);
  check('backing the known winner of a fixed match only returns the stakes', f.got[P('c')] === 5000 && f.got[P('d')] === 3000 && f.paid === f.staked, f.got);

  // (c) nobody backed the winner: the losing stakes go to the fighter, as before
  const n0 = await settle('pool-t', 'pool-m3', [[P('c'), L, 400], [P('d'), L, 100]]);
  check('with nobody backing the winner, every losing stake goes to the winning fighter', n0.got[W] === 500 && n0.paid === n0.staked, n0.got);

  // (d) rounding: three equal winners and an odd pool still pay out exactly
  const r = await settle('pool-t', 'pool-m4', [[P('c'), W, 10], [P('d'), W, 10], [P('e'), W, 10], [P('f'), L, 101]]);
  check('pro-rata shares and the rounding leftovers sum to exactly what was staked', r.paid === r.staked && r.got[P('c')] === r.got[P('d')] && r.got[P('d')] === r.got[P('e')], r);

  // (e) a pool-settled loser can never be refunded by the sweep
  room._arena = null;                                      // a deploy wiped the bracket
  /* the record a crash part-way through settlement would have left behind */
  const dBefore = coins(P('d'));
  await state.storage.put('arena_stake:pool-t:pool-m1:' + P('d'), { tid: 'pool-t', matchId: 'pool-m1', sponsorId: P('d'), targetId: L, amount: 5000, ts: Date.now() - ARENA.STALE_STAKE_MS - 1000 });
  room._lastStakeSweep = 0;
  await room._arenaStakeSweep();
  check('the sweep never refunds a losing stake a pool already paid out', coins(P('d')) === dBefore && !state._store.has('arena_stake:pool-t:pool-m1:' + P('d')), coins(P('d')) - dBefore);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
