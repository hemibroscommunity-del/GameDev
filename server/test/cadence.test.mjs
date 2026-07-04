/* Time-cadence test (v2.3.1149; spec docs/specs/cadence.md).
 * The lazy daily/weekly settlement primitive + both consumers.  Period
 * helpers take an injectable `now`, so days and weeks are faked with
 * plain timestamps -- no clock mocking.  Checks:
 *   1.  Period keys: UTC day boundaries; ISO week key shape + Monday
 *       rollover.
 *   2.  Daily reward: first join credits base gold with the streak
 *       note (inbox_delivered renders it client-side for free);
 *       same-day rejoin is silent (fast path AND the oplog wall);
 *       contiguous-day join scales by streak; the cap holds; a gap
 *       resets to day 1.
 *   3.  Jackpot deposit: validation (multiple-of-50, bounds, funds),
 *       live-coin debit in the one gated event, pool + tickets grow,
 *       private jackpot_state reply with the deposit receipt.
 *   4.  Lazy draw: current-period record does NOT resolve; stale
 *       record pays ONE ticket-weighted winner via the jackpotwin:
 *       opId (double-resolve converges to a single payout), the
 *       broadcast rides eventBuffer, the record rolls to the current
 *       period; an offline winner is paid via inbox:.
 *   5.  Empty stale draw rolls forward without paying anyone. */
import { GameRoom } from '../src/index.js';
import { CADENCE } from '../src/cadence.js';

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
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T-' + id, phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}
const DAY = 86400000;
const realRandom = Math.random;

// ── 1. period keys ──
const T0 = Date.UTC(2026, 6, 3, 12, 0, 0); // Fri 2026-07-03 noon UTC
check('daily key is the UTC date', room._cadencePeriodDaily(T0) === 20260703);
check('daily key rolls at UTC midnight', room._cadencePeriodDaily(Date.UTC(2026, 6, 3, 23, 59)) === 20260703
  && room._cadencePeriodDaily(Date.UTC(2026, 6, 4, 0, 1)) === 20260704);
check('weekly key shape + value (2026-07-03 is ISO week 27)', room._cadencePeriodWeekly(T0) === '2026-W27', room._cadencePeriodWeekly(T0));
check('weekly key rolls on Monday', room._cadencePeriodWeekly(Date.UTC(2026, 6, 5, 23, 0)) === '2026-W27' // Sunday
  && room._cadencePeriodWeekly(Date.UTC(2026, 6, 6, 1, 0)) === '2026-W28', // Monday
room._cadencePeriodWeekly(Date.UTC(2026, 6, 6, 1, 0)));

// ── 2. daily reward ──
// The join handler calls _cadenceLoginReward with the REAL clock; for
// deterministic day simulation we drive the method directly with
// injected `now` values on a player that joined once (live ps).
const ws = fakeWs('c');
await join(ws, 'bp_cd_a');
const ps = room.playerState['bp_cd_a'];
{
  // The join itself already settled "today" (real clock) -- verify.
  const real = await room._cadenceGet('login', 'bp_cd_a');
  const delivered = msgsOfType(ws, 'inbox_delivered');
  check('join settles today: base gold + day-1 note via inbox_delivered',
    real && real.streak === 1
    && delivered.length === 1
    && delivered[0].payload.entries[0].payload.amount === CADENCE.DAILY_BASE_GOLD
    && /day 1/.test(delivered[0].payload.entries[0].note),
    { real, delivered: delivered.map((d) => d.payload) });
  const coinsAfterJoin = ps.coins;
  await room._cadenceLoginReward('bp_cd_a'); // same real day again
  check('same-day settle is silent (no double pay)', ps.coins === coinsAfterJoin);
}
// Simulated day walk: reset the record, then drive with injected nows.
// v2.3.1155: the walk anchors to W0 in the PAST, not T0 — the join
// above settles the REAL day, and once the wall clock reached T0+1day
// (2026-07-04) the simulated day-2 credit collided with the join's
// idempotency opId (daily:<id>:<period>) and silently paid nothing.
// Fixed future-ish timestamps the clock can catch up to are a time
// bomb in an opId-deduped system; past ones never collide.
const W0 = Date.UTC(2026, 0, 5, 12, 0, 0); // Mon 2026-01-05 noon UTC
await room._cadenceSet('login', 'bp_cd_a', { period: room._cadencePeriodDaily(W0), streak: 1 });
ps.coins = 0;
await room._cadenceLoginReward('bp_cd_a', W0 + DAY); // contiguous day 2
check('contiguous day pays base + one streak step', ps.coins === CADENCE.DAILY_BASE_GOLD + CADENCE.DAILY_STREAK_GOLD, ps.coins);
check('streak advanced to 2', (await room._cadenceGet('login', 'bp_cd_a')).streak === 2);
// Jump the record to a deep streak and verify the cap.
await room._cadenceSet('login', 'bp_cd_a', { period: room._cadencePeriodDaily(W0 + 20 * DAY), streak: 42 });
ps.coins = 0;
await room._cadenceLoginReward('bp_cd_a', W0 + 21 * DAY);
check('streak reward caps at DAILY_STREAK_CAP',
  ps.coins === CADENCE.DAILY_BASE_GOLD + CADENCE.DAILY_STREAK_GOLD * (CADENCE.DAILY_STREAK_CAP - 1), ps.coins);
// Gap: last settle 21d in, next login 25d in -> reset to day 1.
ps.coins = 0;
await room._cadenceLoginReward('bp_cd_a', W0 + 25 * DAY);
check('a missed day resets the streak to 1', ps.coins === CADENCE.DAILY_BASE_GOLD
  && (await room._cadenceGet('login', 'bp_cd_a')).streak === 1, ps.coins);

// ── 3. jackpot deposit ──
const session = room.sessions.get(ws);
ps.coins = 1000; ps.dead = false; ps.dying = false;
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_deposit', payload: { amount: 150 } }));
{
  const draw = state._store.get('jackpot:draw');
  const reply = msgsOfType(ws, 'jackpot_state');
  check('deposit debits live coins in the one gated event', ps.coins === 850, ps.coins);
  check('pool + ticket-weighted entries grow', draw && draw.pool === 150 && draw.entries['bp_cd_a'] === 3, draw);
  check('private jackpot_state receipt (pool + tickets + deposited)',
    reply.length === 1 && reply[0].payload.pool === 150 && reply[0].payload.yourTickets === 3 && reply[0].payload.deposited === 150,
    reply.map((r) => r.payload));
}
// Validation: each bad deposit leaves coins + pool untouched.
for (const [label, amount] of [['non-multiple of 50', 130], ['below min', 0], ['above max', 99999], ['insufficient funds', 900]]) {
  await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_deposit', payload: { amount } }));
  check('deposit rejected: ' + label, ps.coins === 850 && state._store.get('jackpot:draw').pool === 150, { coins: ps.coins, amount });
}

// ── 4. lazy draw resolution ──
await room._jackpotMaybeResolve(); // current period -> must NOT resolve
check('current-period draw does not resolve', state._store.get('jackpot:draw').pool === 150);
// Backdate the record to last week with two entrants; force the roll
// to land on the SECOND entrant's ticket range (weighted walk).
const lastWeek = room._cadencePeriodWeekly(T0 - 7 * DAY);
state._store.set('jackpot:draw', { period: lastWeek, pool: 500, entries: { bp_cd_a: 1, bp_cd_off: 9 } });
room.eventBuffer.length = 0;
Math.random = () => 0.5; // 0.5*10 = 5 tickets in -> past bp_cd_a's 1 -> bp_cd_off wins
await room._jackpotMaybeResolve(T0);
Math.random = realRandom;
{
  const draw = state._store.get('jackpot:draw');
  const inbox = state._store.get('inbox:bp_cd_off');
  const result = room.eventBuffer.find((e) => e.type === 'jackpot_result');
  check('stale draw pays the ticket-weighted winner', !!result && result.payload.winnerId === 'bp_cd_off' && result.payload.amount === 500, result && result.payload);
  check('offline winner is paid via the inbox (rule 4 for free)',
    Array.isArray(inbox) && inbox.length === 1 && inbox[0].payload.amount === 500 && inbox[0].opId === 'jackpotwin:' + lastWeek, inbox);
  check('record rolled to the current period, pool reset', draw.period === room._cadencePeriodWeekly(T0) && draw.pool === 0 && Object.keys(draw.entries).length === 0, draw);
}
// Double-resolve convergence: restore the stale record (as if the
// crash happened between credit and reset) -- the opId wall must
// prevent a second payout.
state._store.set('jackpot:draw', { period: lastWeek, pool: 500, entries: { bp_cd_off: 9, bp_cd_a: 1 } });
room.eventBuffer.length = 0;
Math.random = () => 0.5;
await room._jackpotMaybeResolve(T0);
Math.random = realRandom;
{
  const inbox = state._store.get('inbox:bp_cd_off');
  check('double-resolve converges: opId wall blocks the second payout (inbox still holds ONE entry)',
    Array.isArray(inbox) && inbox.length === 1, inbox && inbox.length);
  check('double-resolve still rolls the record forward', state._store.get('jackpot:draw').period === room._cadencePeriodWeekly(T0));
}

// ── 5. empty stale draw ──
state._store.set('jackpot:draw', { period: lastWeek, pool: 0, entries: {} });
room.eventBuffer.length = 0;
await room._jackpotMaybeResolve(T0);
check('empty stale draw rolls forward silently (nobody paid, no broadcast)',
  state._store.get('jackpot:draw').period === room._cadencePeriodWeekly(T0)
  && room.eventBuffer.filter((e) => e.type === 'jackpot_result').length === 0);

// Deny-list: forged jackpot events must not rebroadcast.
room.eventBuffer.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_result', payload: { winnerName: 'Hacker', amount: 999999 } }));
check('forged jackpot_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'jackpot_result').length === 0);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
