/* Live-ops rail test (v2.3.1150; spec docs/specs/liveops.md).
 * Flags/kill-switches + announce/MOTD + the daily economy tripwire,
 * driven through the REAL admin HTTP surface and webSocketMessage.
 * Checks:
 *   1.  Flag CRUD via /api/admin/flags (auth inherited from admin rail:
 *       401 wrong key; name/value validation; budget cap).
 *   2.  Caps merge: a `jackpot:false` flag overrides the baked literal
 *       in the next state_sync while untouched caps survive (spread
 *       order proof); deleting the flag restores the literal.
 *   3.  Kill switches actually gate the handlers, and clear live via
 *       the write-through cache (no rejoin needed): disable_jackpot
 *       (deposit leaves coins+pool untouched), disable_weapon_drops
 *       (forced roll attaches no weapon), disable_dungeons
 *       (dungeon_error code 'disabled'), disable_threats (pvp_threat
 *       relays nothing).
 *   4.  xp_mult: write-clamped AND read-clamped; a real
 *       _resolveMonsterKill pays m.xp × mult via the fallback
 *       share-1.0 path; combat_credit carries the multiplied value;
 *       monster_kill payload stays base (rule 20).
 *   5.  Announce: broadcast reaches BOTH connected sessions
 *       immediately (not via eventBuffer); sticky MOTD arrives on the
 *       next join with motd:true; DELETE clears it; a client-forged
 *       server_announce is dropped by the deny-list.
 *   6.  Metrics: once-daily key-existence idempotency; /economy
 *       history/delta/alert math; ring prunes to METRICS_KEEP.
 *   7b. v2.3.3368: the mailboxes and orders are paged like the player
 *       records, and a buy order's gold is counted (escrowedGold read
 *       fields no order has, and was always 0).
 *   8.  v2.3.3295: every kill switch can be THROWN through the real
 *       route -- the five camelCase ones (storeGear, dailyChest,
 *       zoneDepth, whirlWindup, broCount) answered 400 before; each now
 *       stores, does what its comment says, reaches a join's caps and
 *       clears; any other camelCase name (weaponDrops first) is still
 *       refused; and two scans of server/src hold every flag the worker
 *       READS and every `<name>: false` a comment PROMISES to a name the
 *       route takes.                                                  */
import { readdirSync, readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { LIVEOPS, METRICS, flagNameOk, orderEscrowGold } from '../src/liveops.js';
import { ZONES } from '../src/data.js';
import { zoneDepthK } from '../src/depth.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      /* v2.3.2438: faithful to the runtime -- keys come back SORTED, `limit`
         bounds the page, `startAfter` resumes past a key, and delete()
         takes one key or an array.  The incremental housekeeping jobs
         depend on all four; a mock that ignored `limit` would let a sweep
         "finish" in one page and prove nothing about the paging. */
      list: async (opts) => {
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        let n = 0;
        for (const k of keys) {
          if (opts?.startAfter && k <= opts.startAfter) continue;
          if (opts?.limit && n >= opts.limit) break;
          out.set(k, store.get(k)); n++;
        }
        if (store._listLog) store._listLog.push({ prefix: opts?.prefix, limit: opts?.limit, startAfter: opts?.startAfter, size: out.size });
        return out;
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
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
const baseSession = () => ({ id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  // Pre-settle the daily reward so message counts stay exact (the
  // admin/inbox/trade suites' convention).
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T-' + id, phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}
const req = (method, path, body, key) => room.fetch(new Request('https://x' + path, {
  method,
  headers: key === null ? {} : { Authorization: 'Bearer ' + (key || 'test-secret-key') },
  body: body ? JSON.stringify(body) : undefined,
}));
const jbody = async (r) => ({ status: r.status, body: await r.json() });
const setFlag = (name, value) => req('POST', '/api/admin/flags', { name, value });
const realRandom = Math.random;

// ── 1. flag CRUD + validation ──
check('flags route inherits admin auth (wrong key -> 401)', (await req('GET', '/api/admin/flags', null, 'nope')).status === 401);
check('bad flag name rejected', (await setFlag('NOPE UPPER', true)).status === 400);
check('bad flag value rejected', (await req('POST', '/api/admin/flags', { name: 'x', value: 'string' })).status === 400);
{
  const r = await jbody(await setFlag('test_flag', true));
  check('flag set + echoed', r.status === 200 && r.body.flags.test_flag === true, r.body);
  const g = await jbody(await req('GET', '/api/admin/flags'));
  check('flag readable', g.body.flags.test_flag === true);
  await req('DELETE', '/api/admin/flags?name=test_flag');
  const g2 = await jbody(await req('GET', '/api/admin/flags'));
  check('flag deletable', !('test_flag' in g2.body.flags));
}

// ── 2. caps merge/override ──
await setFlag('jackpot', false);
const wsA = fakeWs('a');
await join(wsA, 'bp_lo_a');
{
  const sync = msgsOfType(wsA, 'state_sync')[0];
  check('flag overrides the baked cap (jackpot:false wins)', sync.caps.jackpot === false, sync.caps);
  check('untouched caps survive the spread (trade stays true)', sync.caps.trade === true && sync.caps.weaponDrops === true);
}
await req('DELETE', '/api/admin/flags?name=jackpot');
{
  const wsA2 = fakeWs('a2');
  await join(wsA2, 'bp_lo_a');
  check('deleting the flag restores the literal on the next sync', msgsOfType(wsA2, 'state_sync')[0].caps.jackpot === true);
}

// ── 3. kill switches (live, no rejoin) ──
const ws = fakeWs('p');
await join(ws, 'bp_lo_p');
const ps = room.playerState['bp_lo_p'];
ps.coins = 500; ps.dead = false; ps.dying = false;
await setFlag('disable_jackpot', true);
await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_deposit', payload: { amount: 100 } }));
check('disable_jackpot: deposit leaves coins + pool untouched', ps.coins === 500 && !state._store.get('jackpot:draw'), ps.coins);
await req('DELETE', '/api/admin/flags?name=disable_jackpot');
await room.webSocketMessage(ws, JSON.stringify({ type: 'jackpot_deposit', payload: { amount: 100 } }));
check('clearing the flag re-enables live (write-through cache)', ps.coins === 400 && state._store.get('jackpot:draw').pool === 100);

await setFlag('disable_weapon_drops', true);
Math.random = () => 0; // would force a drop if the gate were open
const gatedPile = room._spawnLootForKill('frost', { id: 'lo-1', arch: 'fodder', level: 25, x: 0, y: 0, gold: 5 }, 'bp_lo_p', ['bp_lo_p'], { bp_lo_p: 1 });
Math.random = realRandom;
check('disable_weapon_drops: forced roll attaches no weapon', gatedPile && gatedPile.weapon === null);
await req('DELETE', '/api/admin/flags?name=disable_weapon_drops');

await setFlag('disable_dungeons', true);
ws.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'dungeon_start', payload: { waves: 1 } }));
{
  const derr = msgsOfType(ws, 'dungeon_error');
  check('disable_dungeons: dungeon_start answered with code disabled', derr.length === 1 && derr[0].payload.code === 'disabled', derr);
}
await req('DELETE', '/api/admin/flags?name=disable_dungeons');

await setFlag('disable_threats', true);
const wsT = fakeWs('t');
await join(wsT, 'bp_lo_t');
room.eventBuffer.length = 0;
wsT.sent.length = 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'pvp_threat', payload: { target: 'bp_lo_t' } }));
check('disable_threats: threat relays NOTHING (dropped, rule 15)',
  room.eventBuffer.filter((e) => e.type === 'pvp_threat').length === 0
  && msgsOfType(wsT, 'pvp_threat').length === 0);
await req('DELETE', '/api/admin/flags?name=disable_threats');

// ── 4. xp_mult ──
{
  const w = await jbody(await setFlag('xp_mult', 9));
  check('xp_mult write-clamps to the [1,4] ceiling', w.body.flags.xp_mult === LIVEOPS.XP_MULT_MAX, w.body.flags);
  // Hand-edit storage past the clamp to prove READ-side clamping too.
  const flags = state._store.get('liveflags');
  flags.xp_mult = 99; room._liveFlags = flags;
  check('xp_mult read-clamps against hand-edited storage', room._flagNum('xp_mult', 1, 1, 4) === 4);
  flags.xp_mult = 4;
  // Real kill through the fallback share-1.0 path (no contribution
  // data -> killer takes the full share).
  ps.xp = 0; ps.level = 1;
  const xpBefore = ps.xp;
  room.eventBuffer.length = 0;
  ws.sent.length = 0;
  const mon = { id: 'lo-xp-1', arch: 'fodder', level: 5, hp: 0, maxHp: 10, xp: 100, gold: 0, x: 0, y: 0, alive: true };
  room._resolveMonsterKill('meadow', mon, 'bp_lo_p', ps, 'melee');
  const credit = msgsOfType(ws, 'combat_credit')[0];
  const killEv = room.eventBuffer.find((e) => e.type === 'monster_kill');
  check('xp_mult multiplies the authoritative grant (100 -> 400)', ps.xp - xpBefore === 400 || (ps.xp === 0 && credit && credit.payload.xpAmt === 400), { gained: ps.xp - xpBefore, credit: credit && credit.payload });
  check('combat_credit carries the multiplied value', credit && credit.payload.xpAmt === 400, credit && credit.payload);
  check('monster_kill payload stays base (echo corrects, rule 20)', killEv && killEv.payload.xp === 100, killEv && killEv.payload);
  await req('DELETE', '/api/admin/flags?name=xp_mult');
  ps.xp = 0;
  room.eventBuffer.length = 0; ws.sent.length = 0;
  const mon2 = { id: 'lo-xp-2', arch: 'fodder', level: 5, hp: 0, maxHp: 10, xp: 100, gold: 0, x: 0, y: 0, alive: true };
  room._resolveMonsterKill('meadow', mon2, 'bp_lo_p', ps, 'melee');
  const credit2 = msgsOfType(ws, 'combat_credit')[0];
  check('flag cleared -> base XP again', credit2 && credit2.payload.xpAmt === 100, credit2 && credit2.payload);
}

// ── 5. announce + MOTD ──
{
  ws.sent.length = 0; wsT.sent.length = 0;
  const a = await jbody(await req('POST', '/api/admin/announce', { text: 'Server restarting in 2 minutes!' }));
  check('announce accepted', a.status === 200);
  check('announce broadcast reaches BOTH live sessions immediately',
    msgsOfType(ws, 'server_announce').length === 1 && msgsOfType(wsT, 'server_announce').length === 1
    && msgsOfType(ws, 'server_announce')[0].payload.text === 'Server restarting in 2 minutes!');
  check('empty announce rejected', (await req('POST', '/api/admin/announce', { text: '   ' })).status === 400);
  await req('POST', '/api/admin/announce', { text: 'Welcome to BroTown — 2x XP weekend!', sticky: true });
  const wsM = fakeWs('m');
  await join(wsM, 'bp_lo_m');
  const motd = msgsOfType(wsM, 'server_announce').filter((m) => m.payload.motd);
  check('sticky MOTD delivered on join with motd:true', motd.length === 1 && /2x XP/.test(motd[0].payload.text), motd);
  await req('DELETE', '/api/admin/announce');
  const wsM2 = fakeWs('m2');
  await join(wsM2, 'bp_lo_m');
  check('DELETE clears the MOTD for later joins', msgsOfType(wsM2, 'server_announce').length === 0);
  // Forgery: a client-sent server_announce must not rebroadcast.
  room.eventBuffer.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'server_announce', payload: { text: 'FAKE: free gold at hacker.example' } }));
  check('forged server_announce dropped by the deny-list', room.eventBuffer.filter((e) => e.type === 'server_announce').length === 0);
}

// ── 6. metrics tripwire ──
{
  const DAY = 86400000;
  const T0 = Date.UTC(2026, 6, 3, 12, 0, 0);
  // The join hook already wrote metrics:<real-today> earlier in this
  // file (back when totalGold was still ~0), and T0 may fall on the
  // same UTC day.  Clear the slate so the T0 snapshot captures the
  // REAL current gold; otherwise the seeded "yesterday = half of
  // today" math below degenerates to -100%.
  for (const k of [...state._store.keys()].filter((x) => x.startsWith('metrics:'))) state._store.delete(k);
  room._lastMetricsDay = null;
  await room._metricsMaybe(T0);
  await room._metricsMaybe(T0 + 3600000); // same UTC day, +1h
  const keys = [...state._store.keys()].filter((k) => k.startsWith('metrics:'));
  check('metrics written once per day (key-existence idempotent)', keys.length === 1 && keys[0] === 'metrics:' + room._cadencePeriodDaily(T0), keys);
  // Seed a yesterday snapshot with half the gold -> delta 100%, alert.
  const today = state._store.get(keys[0]);
  state._store.set('metrics:' + room._cadencePeriodDaily(T0 - DAY), { ...today, totalGold: Math.max(1, Math.floor(today.totalGold / 2)) });
  const eco = await jbody(await req('GET', '/api/admin/economy'));
  check('/economy surfaces history + day-over-day delta + alert',
    eco.body.history.length === 2
    && eco.body.delta && Math.abs(eco.body.delta.totalGoldPct - 100) < 1
    && eco.body.alert === true,
    { history: eco.body.history.length, delta: eco.body.delta, alert: eco.body.alert });
  // Ring prune: seed KEEP+5 old days, force a new write, assert cap.
  for (let i = 1; i <= LIVEOPS.METRICS_KEEP + 5; i++) {
    state._store.set('metrics:' + room._cadencePeriodDaily(T0 - i * DAY), { totalGold: i, ts: 1 });
  }
  room._lastMetricsDay = null;
  await room._metricsMaybe(T0 + DAY);
  const pruned = [...state._store.keys()].filter((k) => k.startsWith('metrics:'));
  check('metrics ring prunes to METRICS_KEEP', pruned.length === LIVEOPS.METRICS_KEEP, pruned.length);
}

// ── 7. v2.3.2438: the daily metric is a PAGED JOB ──
// One page of rpg: per call, totals carried, the record written on the last
// (short) page.  A throw backs off instead of retrying every slot.
{
  const s7 = makeState();
  const r7 = new GameRoom(s7, mockEnv);
  const T7 = Date.UTC(2031, 0, 5, 12, 0, 0);
  const N = METRICS.PAGE * 2 + 50;                     // three pages
  for (let i = 0; i < N; i++) s7._store.set('rpg:bp_m' + String(i).padStart(4, '0'), { coins: 3, level: 1 });
  s7._store._listLog = [];
  const p1 = await r7._metricsMaybe(T7);
  check('metrics page 1: more to do, nothing written yet', p1 === true && ![...s7._store.keys()].some((k) => k.startsWith('metrics:')), p1);
  const rpgLists = () => s7._store._listLog.filter((l) => l.prefix === 'rpg:');
  check('metrics page 1 listed one bounded page', rpgLists().length === 1 && rpgLists()[0].limit === METRICS.PAGE && rpgLists()[0].size === METRICS.PAGE, rpgLists());
  const p2 = await r7._metricsMaybe(T7 + 3000);
  const p3 = await r7._metricsMaybe(T7 + 6000);
  check('metrics page 2 more to do, page 3 done', p2 === true && p3 === false, { p2, p3 });
  const rec7 = s7._store.get('metrics:' + r7._cadencePeriodDaily(T7));
  check('the record is written on the last page with the FULL totals', rec7 && rec7.playerBlobs === N && rec7.totalGold === N * 3, rec7);
  check('every rpg: page carried the limit and a cursor after the first', rpgLists().every((l, i) => l.limit === METRICS.PAGE && (i === 0 ? !l.startAfter : !!l.startAfter)), rpgLists());
  check('a fourth call the same day does nothing (fast path)', (await r7._metricsMaybe(T7 + 9000)) === false && rpgLists().length === 3, rpgLists().length);
  // Backoff: a throw must not be retried on the very next slot.
  const s8 = makeState();
  const r8 = new GameRoom(s8, mockEnv);
  s8._store.set('rpg:bp_x', { coins: 1 });
  const realList = s8.storage.list;
  let calls = 0;
  s8.storage.list = async (o) => { calls++; throw new Error('boom'); };
  check('a throwing page returns false', (await r8._metricsMaybe(T7)) === false);
  const c1 = calls;
  await r8._metricsMaybe(T7 + 3000);
  await r8._metricsMaybe(T7 + 60000);
  check('...and is not retried within RETRY_MS (no further list calls)', calls === c1, { c1, calls });
  s8.storage.list = realList;
  check('...but runs again after RETRY_MS', (await r8._metricsMaybe(T7 + METRICS.RETRY_MS + 1)) === false && s8._store.has('metrics:' + r8._cadencePeriodDaily(T7)));
}

// ── 7b. v2.3.3368: the mailboxes and the orders are paged too, and a buy
//        order's gold is counted ──
// The two tails were one unbounded list each, values and all; and escrowedGold
// read `o.side`/`o.qty`, which no order has (an order is {type, price}), so it
// was 0 every day.  Every list the job and /economy make is bounded now.
{
  const s9 = makeState();
  const r9 = new GameRoom(s9, mockEnv);
  const T9 = Date.UTC(2031, 1, 7, 12, 0, 0);
  const pad = (i) => String(i).padStart(4, '0');
  for (let i = 0; i < 30; i++) s9._store.set('rpg:bp_g' + pad(i), { coins: 10, level: 1 });
  const BOXES = METRICS.BOX_PAGE * 2 + 7;                  // three pages of mail
  let entries = 0;
  for (let i = 0; i < BOXES; i++) {
    const n = 1 + (i % 4);
    entries += n;
    s9._store.set('inbox:bp_m' + pad(i), Array.from({ length: n }, (_, j) => ({ opId: 'op' + i + '_' + j, kind: 'gold', payload: { amount: 5 } })));
  }
  const ORDERS = METRICS.PAGE + 40;                        // two pages of orders
  let buyGold = 0, sells = 0;
  for (let i = 0; i < ORDERS; i++) {
    const buy = i % 3 !== 0;
    const price = 100 + i;
    if (buy) buyGold += price; else sells++;
    // the shape market.js stores (_mktPlaceOrder): `type`, `price`, the weapon on a sell
    s9._store.set('mkt_order:' + pad(i), { id: pad(i), type: buy ? 'buy' : 'sell', category: 'weapon', price, item: buy ? null : { name: 'Sword' }, playerId: 'bp_o' + (i % 9) });
  }
  check('7b. orderEscrowGold: a buy holds its price, a sell none, junk none',
    orderEscrowGold({ type: 'buy', price: 250 }) === 250 && orderEscrowGold({ type: 'sell', price: 250 }) === 0
    && orderEscrowGold({ side: 'buy', price: 250, qty: 3 }) === 0 && orderEscrowGold(null) === 0
    && orderEscrowGold({ type: 'buy', price: 'x' }) === 0 && orderEscrowGold({ type: 'buy', price: -5 }) === 0);

  s9._store._listLog = [];
  const ret = [];
  for (let i = 0; i < 20; i++) {
    ret.push(await r9._metricsMaybe(T9 + i * 3000));
    if (ret[ret.length - 1] === false) break;
  }
  const rec9 = s9._store.get('metrics:' + r9._cadencePeriodDaily(T9));
  const log = s9._store._listLog;
  const of = (p) => log.filter((l) => l.prefix === p);
  check('7b. the record counts every buy order\'s gold (it read 0 before)', rec9 && rec9.escrowedGold === buyGold && buyGold > 0, { got: rec9 && rec9.escrowedGold, want: buyGold });
  check('7b. ...and every entry in every mailbox, across three pages of them', rec9 && rec9.pendingEntries === entries, { got: rec9 && rec9.pendingEntries, want: entries });
  check('7b. ...and the gold and the records as before', rec9 && rec9.totalGold === 300 && rec9.playerBlobs === 30, rec9);
  // (the ring's own prune lists `metrics:`, at most METRICS_KEEP + 1 rows, by design)
  check('7b. every list of a table that grows with players carried a limit (nothing unbounded)',
    log.length > 0 && log.filter((l) => l.prefix !== 'metrics:').every((l) => l.limit > 0)
    && log.filter((l) => l.prefix === 'metrics:').every((l) => l.size <= LIVEOPS.METRICS_KEEP + 1), log);
  check('7b. the mailboxes were read BOX_PAGE at a time, resumed after the last key',
    of('inbox:').length === 3 && of('inbox:').every((l, i) => l.limit === METRICS.BOX_PAGE && (i === 0 ? !l.startAfter : !!l.startAfter))
    && of('inbox:').map((l) => l.size).join() === [METRICS.BOX_PAGE, METRICS.BOX_PAGE, 7].join(), of('inbox:'));
  check('7b. the orders were read PAGE at a time', of('mkt_order:').length === 2 && of('mkt_order:').every((l) => l.limit === METRICS.PAGE)
    && of('mkt_order:').map((l) => l.size).join() === [METRICS.PAGE, 40].join(), of('mkt_order:'));
  // one call: the short rpg page, then the mail's first FULL page, and stop;
  // so a call never reads more than one full page
  const calls = [];
  {
    let cur = [];
    for (const l of log) { cur.push(l); if (l.size === l.limit) { calls.push(cur); cur = []; } }
    if (cur.length) calls.push(cur);
  }
  check('7b. no call read more than one FULL page', calls.every((c) => c.filter((l) => l.size === l.limit).length <= 1), calls.map((c) => c.map((l) => l.prefix + l.size)));
  check('7b. ...the record went out on the call whose pages all came back short (four calls: the short records page and the first full mail page, the second, the short mail page and the full order page, then the short order page)',
    ret.length === 4 && ret.slice(0, 3).every((x) => x === true) && ret[3] === false, ret);

  // the same counts through the owner's /economy, paged the same way
  s9._store._listLog = [];
  const eco = await r9._economySnapshot();
  const log2 = s9._store._listLog;
  check('7b. /economy\'s snapshot counts the buy orders\' gold and the open orders', eco.market.escrowedGold === buyGold && eco.market.openOrders === ORDERS, eco.market);
  check('7b. ...and the mail', eco.inbox.inboxes === BOXES && eco.inbox.pendingEntries === entries, eco.inbox);
  check('7b. ...every list it made carried a limit', log2.length > 0 && log2.every((l) => l.limit > 0), log2);
  check('7b. ...the mail BOX_PAGE at a time', log2.filter((l) => l.prefix === 'inbox:').every((l) => l.limit === METRICS.BOX_PAGE) && log2.filter((l) => l.prefix === 'inbox:').length === 3, log2.filter((l) => l.prefix === 'inbox:'));

  // an empty room: nothing at all to count still writes its record in one call
  const s10 = makeState();
  const r10 = new GameRoom(s10, mockEnv);
  check('7b. an empty room writes its record in one call, all zeros',
    (await r10._metricsMaybe(T9)) === false
    && JSON.stringify(Object.entries(s10._store.get('metrics:' + r10._cadencePeriodDaily(T9)) || {}).filter(([k]) => k !== 'ts'))
      === JSON.stringify([['totalGold', 0], ['playerBlobs', 0], ['escrowedGold', 0], ['pendingEntries', 0]]),
    s10._store.get('metrics:' + r10._cadencePeriodDaily(T9)));
  // exactly a full page of mail: the next page comes back empty, and that ends it
  const s11 = makeState();
  const r11 = new GameRoom(s11, mockEnv);
  for (let i = 0; i < METRICS.BOX_PAGE; i++) s11._store.set('inbox:bp_x' + pad(i), [{ kind: 'gold' }]);
  const a = await r11._metricsMaybe(T9), b = await r11._metricsMaybe(T9 + 3000);
  check('7b. a mailbox count of exactly one page ends on the empty page after it', a === true && b === false
    && (s11._store.get('metrics:' + r11._cadencePeriodDaily(T9)) || {}).pendingEntries === METRICS.BOX_PAGE, { a, b });
}

// ── 8. v2.3.3295: every kill switch can be thrown ──
{
  // 8a. the five camelCase switches are stored by the route an operator uses
  for (const name of LIVEOPS.CAMEL_SWITCHES) {
    const r = await jbody(await setFlag(name, false));
    check('8a. POST /flags stores ' + name + ': false (was a 400)', r.status === 200 && r.body.flags[name] === false, r);
  }
  // 8b. ...and each one does what its comment says, on the worker
  const dunes = Object.keys(ZONES).find((z) => ZONES[z] && ZONES[z].depth && ZONES[z].depth.axis === 'y');
  check('8b. storeGear: the gear listings read off (_stGearOff)', room._stGearOff() === true);
  check('8b. dailyChest: the chest reads off (_chestOff)', room._chestOff() === true);
  check('8b. whirlWindup: the windup reads off (_abilWindupOff)', room._abilWindupOff() === true);
  check('8b. zoneDepth: a zone with depth scales 1 (_depthK)', !!dunes && zoneDepthK(dunes, 0) !== 1 && room._depthK(dunes, 0) === 1, { dunes, k: dunes && zoneDepthK(dunes, 0) });
  // 8c. ...and the phone is told: a join's caps say all five are off
  {
    const ws8 = fakeWs('s8');
    await join(ws8, 'bp_lo_s8');
    const caps = (msgsOfType(ws8, 'state_sync')[0] || {}).caps || {};
    check('8c. a join is told all five are off (broCount too: it is read by the phone only)', LIVEOPS.CAMEL_SWITCHES.every((n) => caps[n] === false), LIVEOPS.CAMEL_SWITCHES.map((n) => n + '=' + caps[n]));
    check('8c. ...and the caps around them are untouched', caps.trade === true && caps.weaponDrops === true && caps.jackpot === true);
  }
  // 8d. cleared, each is back on
  for (const name of LIVEOPS.CAMEL_SWITCHES) await req('DELETE', '/api/admin/flags?name=' + name);
  const left = (await jbody(await req('GET', '/api/admin/flags'))).body.flags;
  check('8d. DELETE clears all five', LIVEOPS.CAMEL_SWITCHES.every((n) => !(n in left)), left);
  check('8d. ...and the worker reads them on again', !room._stGearOff() && !room._chestOff() && !room._abilWindupOff() && room._depthK(dunes, 0) === zoneDepthK(dunes, 0));
  // 8e. no other camelCase name: weaponDrops' false brings back weapons the
  //     phone mints itself (liveops.md "Caps override"), and a near miss of
  //     a listed name is not that name
  for (const bad of ['weaponDrops', 'settledX', 'StoreGear', 'storegear ', 'broCount2', '', 'a'.repeat(33)]) {
    check('8e. ' + JSON.stringify(bad) + ' is refused', (await setFlag(bad, false)).status === 400 && !flagNameOk(bad));
  }
  check('8e. the lower-case rule is unchanged', flagNameOk('disable_dungeons') && flagNameOk('xp_mult') && flagNameOk('bowvolley') && !flagNameOk(null) && !flagNameOk(7));
  check('8e. the list is frozen', Object.isFrozen(LIVEOPS.CAMEL_SWITCHES));
  // 8h. v2.3.3732: the message diet's two lower-case switches (movepath.js):
  //     v2.3.3744: every phone is on it by default, `pathall: false` leaves
  //     only ?diet=1 phones, `movepath: false` kills it, each through the
  //     operator's route, and a join is told
  {
    check('8h. with nothing set the worker glides and every phone is on the path', room._movePathOn() === true && room._movePathAll() === true);
    const r0 = await jbody(await setFlag('pathall', false));
    check('8h. POST /flags stores pathall: false, and only ?diet=1 phones are on it', r0.status === 200 && r0.body.flags.pathall === false && room._movePathAll() === false && room._movePathOn() === true, r0);
    const r1 = await jbody(await setFlag('pathall', true));
    check('8h. ...pathall: true puts every phone back on it', r1.status === 200 && r1.body.flags.pathall === true && room._movePathAll() === true && room._movePathOn() === true, r1);
    const r2 = await jbody(await setFlag('movepath', false));
    check('8h. the kill switch movepath: false turns off the glide and every phone, pathall or not', r2.status === 200 && room._movePathOn() === false && room._movePathAll() === false, r2);
    const ws8f = fakeWs('s8f');
    await join(ws8f, 'bp_lo_s8f');
    const caps = (msgsOfType(ws8f, 'state_sync')[0] || {}).caps || {};
    check('8h. ...and a join is told both are off', caps.movepath === false && caps.pathall === false, { movepath: caps.movepath, pathall: caps.pathall });
    await req('DELETE', '/api/admin/flags?name=movepath');
    await req('DELETE', '/api/admin/flags?name=pathall');
    check('8h. cleared, the worker glides again and every phone is on the path (the default)', room._movePathOn() === true && room._movePathAll() === true);
  }
  // 8i. v2.3.3755: a memory saver turned off for every phone (clientoff.js):
  //     `off_<name>: true` through the operator's route, told at join
  {
    const r = await jbody(await setFlag('off_onecopy', true));
    check('8i. POST /flags stores off_onecopy: true', r.status === 200 && r.body.flags.off_onecopy === true, r);
    const ws8i = fakeWs('s8i');
    await join(ws8i, 'bp_lo_s8i');
    const caps = (msgsOfType(ws8i, 'state_sync')[0] || {}).caps || {};
    check('8i. ...and a join is told the saver is off (caps.clientoff)', caps.clientoff === 'onecopy', caps.clientoff);
    await req('DELETE', '/api/admin/flags?name=off_onecopy');
    check('8i. cleared, no saver is off', room._clientOffList() === '');
  }

  // 8f. every flag the WORKER READS is a name the route takes.  The reads
  //     come in three shapes: _flagOn/_flagNum('<name>'), and a cache held
  //     in a local (`const f = this._liveFlags;`) then read as f.<name>,
  //     f['<name>'] or hasOwnProperty.call(f, '<name>') a few lines on.
  const dir = new URL('../src/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  const reads = new Map();
  const note = (n, where) => { if (!reads.has(n)) reads.set(n, where); };
  for (const file of files) {
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/_flag(?:On|Num)\(\s*'([^']+)'/g)) note(m[1], file + ':' + (i + 1));
      const decl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*this\._liveFlags\b/.exec(line);
      if (!decl) return;
      const v = decl[1].replace(/\$/g, '\\$');
      for (let j = i; j < Math.min(lines.length, i + 8); j++) {
        for (const m of lines[j].matchAll(new RegExp('hasOwnProperty\\.call\\(\\s*' + v + "\\s*,\\s*'([^']+)'", 'g'))) note(m[1], file + ':' + (j + 1));
        for (const m of lines[j].matchAll(new RegExp('(?<![\\w$.])' + v + '\\.([A-Za-z_]\\w*)', 'g'))) note(m[1], file + ':' + (j + 1));
        for (const m of lines[j].matchAll(new RegExp('(?<![\\w$.])' + v + "\\[\\s*'([^']+)'\\s*\\]", 'g'))) note(m[1], file + ':' + (j + 1));
      }
    });
  }
  const unthrowable = [...reads].filter(([n]) => !flagNameOk(n)).map(([n, w]) => n + ' @ ' + w);
  check('8f. the scan sees the worker\'s flag reads (60 or more, the camelCase ones among them)', reads.size >= 60 && ['storeGear', 'dailyChest', 'zoneDepth', 'whirlWindup', 'disable_dungeons', 'xp_mult'].every((n) => reads.has(n)), reads.size);
  check('8f. every flag the worker reads can be set through POST /flags', unthrowable.length === 0, unthrowable);

  // 8g. every kill switch a COMMENT promises -- `<name>: false` beside
  //     "live flags" / "liveflags" / "kill switch" -- is a name the route takes
  const promised = new Map();
  for (const file of files) {
    const s = readFileSync(new URL(file, dir), 'utf8');
    for (const m of s.matchAll(/`([A-Za-z_$][\w$]*): ?false`/g)) {
      const ctx = s.slice(Math.max(0, m.index - 160), m.index + m[0].length + 160);
      if (/live ?flags|liveflags|kill[ -]?switch/i.test(ctx) && !promised.has(m[1])) promised.set(m[1], file);
    }
  }
  const broken = [...promised].filter(([n]) => !flagNameOk(n)).map(([n, f]) => n + ' @ ' + f);
  check('8g. the scan sees the promised switches (60 or more, broCount among them)', promised.size >= 60 && promised.has('broCount') && promised.has('storeGear'), promised.size);
  check('8g. every promised kill switch can be set through POST /flags', broken.length === 0, broken);
  check('8g. ...and each camelCase exception is still promised somewhere (drop it from the list when its switch goes)', LIVEOPS.CAMEL_SWITCHES.every((n) => promised.has(n)), LIVEOPS.CAMEL_SWITCHES.filter((n) => !promised.has(n)));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
