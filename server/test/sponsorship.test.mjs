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
 *   5. Server-observed resolution pays 3x to winning sponsors and the
 *      stake itself to the winning COMPETITOR for losing sponsors;
 *      private arena_stake_result either way.
 *   6. Re-settling is opId-idempotent (a re-put record can't double-pay).
 *   7. Sweep refunds orphaned stakes but never over a stamped payout.
 *   8. _arenaWire emits the old sanitizeTournament superset the betting
 *      UI actually reads (status 'active', players id/name, champion.id,
 *      recentMatches winnerId) -- the PR10 shape mismatch regression.
 *   9. Forged arena_stake_result is not rebroadcast (deny-list).
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
check('winning sponsor paid 3x', room.playerState[P('c')].coins === 900 + 300 && cRes.length === 1 && cRes[0].payload.won === true && cRes[0].payload.payout === 300, { coins: room.playerState[P('c')].coins, cRes: cRes.map((r) => r.payload) });
check('losing stake goes to the winning competitor', room.playerState[P('a')].coins === 900 + 200 + ARENA.CHAMPION_REWARD, { a: room.playerState[P('a')].coins });
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
check('re-put record cannot double-pay (opId stamp)', room.playerState[P('c')].coins === 1200 && !state._store.has(stakeKey), room.playerState[P('c')].coins);

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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
