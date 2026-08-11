/* On-chain score checkpoint test (v2.3.1664).
 *
 * The contract and the encoder are pinned by chainwriter.test.mjs; this
 * suite pins the GAME side — when a checkpoint fires, when it must NOT, and
 * above all that a broken chain never becomes a broken game.
 *
 * The properties that matter here are the ones that cost real money or real
 * data when they regress:
 *   - a missing/unfunded/malformed relayer config must no-op, not throw
 *   - a milestone is written ONCE, ever (a repeat write burns gas for a row
 *     the contract would reject anyway)
 *   - the in-flight guard holds across the await, or one lucky double
 *     level-up double-spends a nonce
 *   - svKills is server-counted and SURVIVES RECONNECT — if it reset, the
 *     next attestation would report fewer kills than the last and the
 *     contract's monotonic guard would reject it, silently wasting gas
 */
import { GameRoom } from '../src/index.js';
import { CHAIN_SCORE } from '../src/chainscore.js';
import { privToAddress, normalizePrivKey } from '../src/chainwriter.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(store),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const LEADERBOARD = { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) };
const TEST_KEY = '4c0883a69102937d6231471b5dbb6204fe512961708279e2b8b4b1b6b0b0a0a1';
const CONTRACT = '0x' + 'ab'.repeat(20);

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

/** A node stub that records what it was asked and always accepts. */
function stubNode(log) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    if (log) log.push(body.method);
    const result = body.method === 'eth_getTransactionCount' ? '0x0'
      : body.method === 'eth_gasPrice' ? '0x3b9aca00'
      : body.method === 'eth_sendRawTransaction' ? '0x' + 'ee'.repeat(32)
      : null;
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };
}

// ── 1. Configuration gate: absent secrets = feature off, game unaffected ──
{
  const room = new GameRoom(makeState(), { LEADERBOARD });
  check('unconfigured: _chainScoreConfigured is false', room._chainScoreConfigured() === false);
  const res = await room._chainScoreCheckpoint('bp_a', { level: 100, svKills: 5 });
  check('unconfigured: checkpoint no-ops with a reason', res.ok === false && res.reason === 'not-configured', res);
  let threw = false;
  try { room._chainScoreOnLevelUp('bp_a', { level: 100 }); } catch (e) { threw = true; }
  check('unconfigured: the level-up hook never throws', !threw);

  const partial = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: TEST_KEY });
  check('half-configured (no contract) is still off', partial._chainScoreConfigured() === false);
}

// ── 2. Milestone selection ──
{
  const room = new GameRoom(makeState(), { LEADERBOARD });
  check('level 3 (a fresh prog3 character) is below the first milestone',
    room._chainScoreMilestone(3) === 0, room._chainScoreMilestone(3));
  check('level 5 hits the first milestone', room._chainScoreMilestone(5) === 5);
  check('level 9 stays on milestone 5', room._chainScoreMilestone(9) === 5);
  check('level 10 advances to 10', room._chainScoreMilestone(10) === 10);
  check('level 137 resolves to 100', room._chainScoreMilestone(137) === 100, room._chainScoreMilestone(137));
  check('level 300 (the cap) resolves to 300', room._chainScoreMilestone(300) === 300);
  check('milestones are ascending and unique',
    CHAIN_SCORE.MILESTONES.every((m, i, a) => i === 0 || m > a[i - 1]));
}

// ── 3. The happy path writes once, stores, and receipts the player ──
{
  const state = makeState();
  const calls = [];
  const room = new GameRoom(state, { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });
  room._chainRpcOpts = { fetchImpl: stubNode(calls), rpc: 'http://test' };
  const ws = fakeWs('p');
  room.sessions.set(ws, { id: 'bp_c', name: 'C', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });

  const ps = { level: 25, svKills: 40 };
  const res = await room._chainScoreCheckpoint('bp_c', ps);
  check('checkpoint succeeds', res.ok === true, res);
  check('checkpoint reports the crossed milestone', res.milestone === 25, res.milestone);
  check('checkpoint broadcast a raw transaction', calls.includes('eth_sendRawTransaction'), calls);

  const stored = state._store.get(CHAIN_SCORE.KEY('bp_c'));
  check('the attestation is stored under the registered prefix', !!stored, stored);
  check('stored record carries milestone/nonce/level/kills/txHash',
    stored && stored.milestone === 25 && stored.nonce === 1
    && stored.level === 25 && stored.kills === 40 && /^0x/.test(stored.txHash), stored);

  const receipt = ws.sent.filter((m) => m.type === 'chain_score_recorded');
  check('the player receives a receipt with an explorer link',
    receipt.length === 1 && /\/tx\/0x/.test(receipt[0].payload.explorer), receipt.map((r) => r.payload));

  // Same milestone again: must not spend gas twice.
  calls.length = 0;
  const again = await room._chainScoreCheckpoint('bp_c', ps);
  check('the same milestone is never written twice',
    again.ok === false && again.reason === 'already-recorded', again);
  check('the repeat attempt sent no transaction', calls.length === 0, calls);

  // A higher milestone writes again, with an incremented nonce.
  ps.level = 50; ps.svKills = 90;
  const next = await room._chainScoreCheckpoint('bp_c', ps);
  check('the next milestone writes again', next.ok === true && next.milestone === 50, next);
  check('the nonce increments across writes',
    state._store.get(CHAIN_SCORE.KEY('bp_c')).nonce === 2,
    state._store.get(CHAIN_SCORE.KEY('bp_c')).nonce);
}

// ── 4. Failure posture: nothing about a broken chain reaches the game ──
{
  const state = makeState();
  const room = new GameRoom(state, { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });

  room._chainRpcOpts = { fetchImpl: async () => { throw new Error('ECONNREFUSED'); } };
  const dead = await room._chainScoreCheckpoint('bp_d', { level: 10, svKills: 1 });
  check('a dead node returns {ok:false} rather than throwing', dead.ok === false, dead);
  check('a failed write stores NOTHING (so it retries next time)',
    state._store.get(CHAIN_SCORE.KEY('bp_d')) === undefined);

  room._chainRpcOpts = { fetchImpl: async (u, i) => ({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: JSON.parse(i.body).id, error: { message: 'insufficient funds' } }),
  }) };
  const broke = await room._chainScoreCheckpoint('bp_e', { level: 10, svKills: 1 });
  check('an unfunded relayer is reported, not thrown',
    broke.ok === false && /insufficient funds/.test(broke.reason), broke);
  check('the unfunded attempt stored nothing',
    state._store.get(CHAIN_SCORE.KEY('bp_e')) === undefined);

  const badKey = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: 'not-a-key', SCORES_CONTRACT: CONTRACT });
  const bad = await badKey._chainScoreCheckpoint('bp_f', { level: 10, svKills: 1 });
  check('a malformed relayer key is caught and named',
    bad.ok === false && bad.reason === 'relayer-key-malformed', bad);
  check('the malformed-key reason does not leak the value',
    !String(bad.reason).includes('not-a-key'), bad.reason);
}

// ── 5. In-flight guard across the await ──
{
  const room = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });
  let release;
  const gate = new Promise((r) => { release = r; });
  let sends = 0;
  room._chainRpcOpts = { fetchImpl: async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.method === 'eth_sendRawTransaction') sends++;
    await gate;                                   // hold both calls mid-flight
    const result = body.method === 'eth_getTransactionCount' ? '0x0'
      : body.method === 'eth_gasPrice' ? '0x3b9aca00'
      : '0x' + 'ee'.repeat(32);
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  } };

  const ps = { level: 100, svKills: 7 };
  const first = room._chainScoreCheckpoint('bp_g', ps);
  const second = await room._chainScoreCheckpoint('bp_g', ps);   // re-enters while first awaits
  check('a re-entrant checkpoint is refused while one is in flight',
    second.ok === false && second.reason === 'in-flight', second);
  release();
  const firstRes = await first;
  check('the first checkpoint still completes', firstRes.ok === true, firstRes);
  check('only one transaction was broadcast', sends === 1, sends);
}

// ── 6. svKills: server-counted, and it must survive a reconnect ──
{
  const state = makeState();
  const room = new GameRoom(state, { LEADERBOARD });
  const ws = fakeWs('k');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: 'bp_k', name: 'Killer', protocolVersion: 2,
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
  const ps = room.playerState.bp_k;
  check('a fresh character starts at 0 server-verified kills', (ps.svKills || 0) === 0, ps.svKills);

  const m = (room.monsters.meadow || []).find((x) => x.alive);
  if (m) {
    m.hp = 1; m.maxHp = 100; m.dmgByPlayer = Object.create(null);
    m.dmgByPlayer['bp_k'] = 100;
    room._resolveMonsterKill('meadow', m, 'bp_k', ps, 'melee');
    check('resolving a kill increments svKills', ps.svKills === 1, ps.svKills);
  } else {
    check('harness found a live monster', false);
  }

  ps.svKills = 42;
  await room._saveRpg('bp_k', ps);
  const blob = state._store.get('rpg:bp_k');
  check('svKills is persisted by _saveRpg', blob && blob.svKills === 42, blob && blob.svKills);

  // Reconnect into a FRESH room from the same storage.
  const room2 = new GameRoom(state, { LEADERBOARD });
  const ws2 = fakeWs('k2');
  room2.sessions.set(ws2, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room2.webSocketMessage(ws2, JSON.stringify({
    type: 'join', id: 'bp_k', name: 'Killer', protocolVersion: 2,
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
  check('svKills survives a reconnect (a reset would break monotonicity on-chain)',
    room2.playerState.bp_k.svKills === 42, room2.playerState.bp_k.svKills);

  const echo = ws2.sent.filter((mm) => mm.type === 'player_state').pop();
  check('player_state echoes svKills', echo && echo.payload && echo.payload.svKills === 42,
    echo && echo.payload && echo.payload.svKills);
}

// ── 7. The relayer address is derivable (operator sanity: fund THIS one) ──
{
  const addr = privToAddress(normalizePrivKey(TEST_KEY));
  check('a relayer key yields a checksum-shaped address', /^0x[0-9a-f]{40}$/.test(addr), addr);
}

console.log(failures === 0 ? '\nchainscore: ALL PASS' : `\nchainscore: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
