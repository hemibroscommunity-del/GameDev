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
 *       history/delta/alert math; ring prunes to METRICS_KEEP.       */
import { GameRoom } from '../src/index.js';
import { LIVEOPS } from '../src/liveops.js';

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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
