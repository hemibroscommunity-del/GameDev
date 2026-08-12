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
import { CHAIN_SCORE, LIFE_SKILL_KEYS, COMBAT_SKILL_KEYS } from '../src/chainscore.js';
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

/* v2.3.1682: selectors the hardened path calls via eth_call, pinned as
   literals against solc's methodIdentifiers (printed by
   tools/dev/evm-conformance.mjs — the 0xfc9f73a9 precedent).  The stub
   dispatches on them, which is also an implicit assertion: derive the wrong
   selector in production code and every happy-path test fails. */
const SEL_SIGNER = '0x238ac933';        // signer()
const SEL_NONCES = '0x9e317f12';        // nonces(bytes32)

/** A node stub that records what it was asked and always accepts.
 *  v2.3.1682: grew eth_getCode / eth_call / eth_getTransactionReceipt
 *  branches — the checkpoint path now preflights the contract, reads the
 *  player's on-chain nonce, and refuses to report ok without a status-0x1
 *  receipt, so a stub that answers only the broadcast trio fails everything.
 *  `over` lets one case override a single method's behaviour. */
function stubNode(log, over = {}) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    if (log) log.push(body.method);
    if (over[body.method]) {
      const r = over[body.method](body);
      if (r && r.error) return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, error: r.error }) };
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: r ? r.result : null }) };
    }
    let result = null;
    if (body.method === 'eth_getTransactionCount') result = '0x0';
    else if (body.method === 'eth_gasPrice') result = '0x3b9aca00';
    else if (body.method === 'eth_sendRawTransaction') result = '0x' + 'ee'.repeat(32);
    else if (body.method === 'eth_getCode') result = '0x6080604052';
    else if (body.method === 'eth_getBalance') result = '0xde0b6b3a7640000';   // 1 ETH
    else if (body.method === 'eth_getTransactionReceipt') result = { status: '0x1', blockNumber: '0x10' };
    else if (body.method === 'eth_call') {
      const data = String((body.params && body.params[0] && body.params[0].data) || '');
      if (data.startsWith(SEL_SIGNER)) {
        result = '0x' + '00'.repeat(12) + privToAddress(normalizePrivKey(TEST_KEY)).slice(2);
      } else if (data.startsWith(SEL_NONCES)) {
        result = '0x' + '00'.repeat(32);
      }
    }
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };
}

/** A configured room wired to the stub node, with the RPC call log.  Same
 *  shape the older sections build inline; extracted here because the series
 *  sections (7-8) need several independent rooms. */
function mk(over) {
  const state = makeState();
  const rpc = [];
  const room = new GameRoom(state, { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });
  room._chainRpcOpts = { fetchImpl: stubNode(rpc, over), rpc: 'http://test', receiptIntervalMs: 0 };
  return { room, state, rpc };
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
  /* v2.3.1683: first milestone is 4 — one level-up from a fresh character
     (level 3), so the chain shows something within minutes of play. */
  check('level 4 (the FIRST level-up) hits the first milestone', room._chainScoreMilestone(4) === 4);
  check('level 9 stays on milestone 4', room._chainScoreMilestone(9) === 4);
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
  room._chainRpcOpts = { fetchImpl: stubNode(calls), rpc: 'http://test', receiptIntervalMs: 0 };
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

  /* v2.3.1682: the stub answers the preflight and nonce reads normally and
     errors only the broadcast — 'insufficient funds' is a SEND failure, and
     with a preflight in front of the send an error-everything stub would be
     testing the preflight instead. */
  room._chainRpcOpts = { receiptIntervalMs: 0, fetchImpl: stubNode(null, {
    eth_sendRawTransaction: () => ({ error: { message: 'insufficient funds' } }),
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
  /* v2.3.1682: gate the whole flight but answer the hardened protocol —
     preflight (getCode + signer()), nonce read, receipt — or the first
     checkpoint dies in preflight and the case tests nothing. */
  const base = stubNode(null);
  room._chainRpcOpts = { receiptIntervalMs: 0, fetchImpl: async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.method === 'eth_sendRawTransaction') sends++;
    await gate;                                   // hold both calls mid-flight
    return base(url, init);
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

// ── 7. THE SERIES: every server-owned number, and only those ──
{
  const { room } = mk();
  const ps = {
    level: 25,
    svKills: 40,
    prog3: { sk: { sword: { level: 12 }, bow: { level: 8 }, staff: { level: 5 } } },
    lifeSkills: {
      fishing: { level: 31 }, mining: { level: 4 },
      woodcutting: { level: 0 },              // untouched
      gems: { ruby: 3 },                       // NOT a skill — the amulet bag
    },
  };
  const series = room._chainScoreSeries(ps);

  /* Combat skills are stored as sword/bow/staff but have always been SHOWN as
     Melee/Bow/Magic.  The chain record is a presentation surface — a reader
     should not need the repo's glossary to read a column. */
  check('sword is attested as "melee"', series.melee === 12, series);
  check('bow is attested as "bow"', series.bow === 8, series);
  check('staff is attested as "magic"', series.magic === 5, series);
  check('no raw sword/staff keys leak into the series',
    series.sword === undefined && series.staff === undefined, series);

  check('life skills are attested by name', series.fishing === 31 && series.mining === 4, series);
  check('kills rides along as a series', series.kills === 40, series);
  check('a zero life skill is omitted (noise on a permanent ledger)',
    series.woodcutting === undefined, series);
  check('the gems bag is not mistaken for a skill', series.gems === undefined, series);

  /* The whole point of the redesign: adding a skill to LIFE_SKILL_KEYS is the
     only change needed — the contract addresses skills by NAME and needs no
     redeploy.  Guard the two lists against silent drift instead. */
  check('every LIFE_SKILL_KEY fits in a bytes32 key',
    LIFE_SKILL_KEYS.every((k) => new TextEncoder().encode(k).length <= 32), LIFE_SKILL_KEYS);
  check('LIFE_SKILL_KEYS has no duplicates',
    new Set(LIFE_SKILL_KEYS).size === LIFE_SKILL_KEYS.length);
  check('the three combat keys do not collide with a life skill',
    Object.values(COMBAT_SKILL_KEYS).every((k) => !LIFE_SKILL_KEYS.includes(k)));

  /* Client-reported vanity must never reach a permanent public ledger: it
     would LOOK verified while being worth the client's word. */
  const vain = { ...ps, goldEarned: 999999, playtime: 42, dungeons: 7 };
  const s2 = room._chainScoreSeries(vain);
  check('client-reported gold/playtime/dungeons are NOT attested',
    s2.goldEarned === undefined && s2.playtime === undefined && s2.dungeons === undefined, s2);
}

// ── 8. Only what CHANGED is sent (calldata + a cold SSTORE per skill) ──
{
  const { room, state, rpc } = mk();
  const ps = {
    level: 25, svKills: 40,
    prog3: { sk: { sword: { level: 12 }, bow: { level: 8 }, staff: { level: 5 } } },
    lifeSkills: { fishing: { level: 31 } },
  };
  const first = await room._chainScoreCheckpoint('bp_s', ps);
  check('first checkpoint sends every non-zero series', first.ok === true
    && first.skills.length === 5, first.skills);
  check('the stored record remembers the series it wrote',
    state._store.get(CHAIN_SCORE.KEY('bp_s')).series.fishing === 31,
    state._store.get(CHAIN_SCORE.KEY('bp_s')).series);

  // Cross a new milestone with only ONE number moved.
  ps.level = 50; ps.prog3.sk.sword.level = 30;
  rpc.length = 0;
  const second = await room._chainScoreCheckpoint('bp_s', ps);
  check('the next checkpoint sends ONLY the changed skills',
    second.ok === true && second.skills.length === 1 && second.skills[0] === 'melee',
    second.skills);
  check('the unchanged skills are still in the stored series',
    state._store.get(CHAIN_SCORE.KEY('bp_s')).series.fishing === 31);

  /* A milestone crossed with literally nothing moved must not spend gas on an
     empty write — the contract would revert with EmptyUpdate anyway. */
  ps.level = 100;
  rpc.length = 0;
  const third = await room._chainScoreCheckpoint('bp_s', ps);
  check('a checkpoint with nothing changed sends no transaction',
    third.ok === false && third.reason === 'nothing-changed', third);
  check('...and really broadcast nothing', !rpc.includes('eth_sendRawTransaction'), rpc);
}

// ── 9. The relayer address is derivable (operator sanity: fund THIS one) ──
{
  const addr = privToAddress(normalizePrivKey(TEST_KEY));
  check('a relayer key yields a checksum-shaped address', /^0x[0-9a-f]{40}$/.test(addr), addr);
}

// ── 10. v2.3.1682: ok means CONFIRMED — a revert is a failure, not a receipt ──
{
  /* First attempt's receipt reverts; the retry's succeeds — the stateful
     stub is the point, because the property under test is that a revert
     leaves the door OPEN. */
  let receipts = 0;
  const { room, state } = mk({
    eth_getTransactionReceipt: () => (++receipts === 1
      ? { result: { status: '0x0', blockNumber: '0x10' } }
      : { result: { status: '0x1', blockNumber: '0x11' } }),
  });
  const ws = fakeWs('r');
  room.sessions.set(ws, { id: 'bp_r', name: 'R', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  const res = await room._chainScoreCheckpoint('bp_r', { level: 25, svKills: 3 });
  check('a REVERTED transaction is reported as a failure', res.ok === false && res.reason === 'reverted', res);
  check('a reverted write stores NOTHING', state._store.get(CHAIN_SCORE.KEY('bp_r')) === undefined);
  check('a reverted write sends the player NO receipt',
    ws.sent.filter((m) => m.type === 'chain_score_recorded').length === 0, ws.sent);
  /* THE point: before v2.3.1682 this next call returned 'already-recorded'
     and the score was lost forever. */
  const retry = await room._chainScoreCheckpoint('bp_r', { level: 25, svKills: 3 });
  check('the milestone is NOT latched by the failure — it retries', retry.ok === true, retry);
}
{
  const { room, state } = mk({
    eth_getTransactionReceipt: () => ({ result: null }),   // never mined
  });
  const res = await room._chainScoreCheckpoint('bp_u', { level: 25, svKills: 3 });
  check('a never-mined transaction reports unconfirmed', res.ok === false && res.reason === 'unconfirmed', res);
  check('an unconfirmed write stores nothing (retry converges via >= guard)',
    state._store.get(CHAIN_SCORE.KEY('bp_u')) === undefined);
}

// ── 11. v2.3.1682: the attestation nonce is anchored to the CONTRACT ──
{
  /* The resurrection case: DO storage lost, chain remembers nonce 3.  The
     old `stored+1` restarts at 1 and every write reverts StaleNonce forever;
     the fix reads the chain and continues at 4. */
  const { room, state } = mk({
    eth_call: (body) => {
      const data = String(body.params[0].data || '');
      if (data.startsWith(SEL_NONCES)) return { result: '0x' + '3'.padStart(64, '0') };
      if (data.startsWith(SEL_SIGNER)) return { result: '0x' + '00'.repeat(12) + privToAddress(normalizePrivKey(TEST_KEY)).slice(2) };
      return { result: null };
    },
  });
  const res = await room._chainScoreCheckpoint('bp_n', { level: 25, svKills: 9 });
  check('a lost DO record resumes AFTER the chain nonce', res.ok === true, res);
  check('the stored nonce is chain+1, not 1',
    state._store.get(CHAIN_SCORE.KEY('bp_n')).nonce === 4,
    state._store.get(CHAIN_SCORE.KEY('bp_n')).nonce);
}
{
  /* Fail CLOSED: if the nonce read fails, do not sign with a guess. */
  const { room, state, rpc } = mk({
    eth_call: (body) => {
      const data = String(body.params[0].data || '');
      if (data.startsWith(SEL_NONCES)) return { error: { message: 'node melted' } };
      if (data.startsWith(SEL_SIGNER)) return { result: '0x' + '00'.repeat(12) + privToAddress(normalizePrivKey(TEST_KEY)).slice(2) };
      return { result: null };
    },
  });
  const res = await room._chainScoreCheckpoint('bp_n2', { level: 25, svKills: 9 });
  check('a failed nonce read fails closed', res.ok === false && res.reason === 'nonce-read-failed', res);
  check('...without broadcasting', !rpc.includes('eth_sendRawTransaction'), rpc);
  check('...and stores nothing', state._store.get(CHAIN_SCORE.KEY('bp_n2')) === undefined);
}

// ── 12. v2.3.1682: preflight — burn zero gas on a config that cannot work ──
{
  const bad = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: 'banana' });
  const rpc = [];
  bad._chainRpcOpts = { fetchImpl: stubNode(rpc), rpc: 'http://test', receiptIntervalMs: 0 };
  const res = await bad._chainScoreCheckpoint('bp_p', { level: 25, svKills: 1 });
  check('a malformed contract address is a pure failure', res.ok === false && res.reason === 'contract-malformed', res);
  check('...with ZERO RPC calls', rpc.length === 0, rpc);

  const zero = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: '0x' + '00'.repeat(20) });
  zero._chainRpcOpts = { fetchImpl: stubNode(), rpc: 'http://test', receiptIntervalMs: 0 };
  const zres = await zero._chainScoreCheckpoint('bp_p', { level: 25, svKills: 1 });
  check('the zero address is refused', zres.ok === false && zres.reason === 'contract-zero', zres);
}
{
  const { room, rpc } = mk({ eth_getCode: () => ({ result: '0x' }) });
  const res = await room._chainScoreCheckpoint('bp_p2', { level: 25, svKills: 1 });
  check('an address with no code is named as the problem',
    res.ok === false && res.reason === 'no-contract-code', res);
  check('...and no gas was spent on it', !rpc.includes('eth_sendRawTransaction'), rpc);
}
{
  const { room, rpc } = mk({
    eth_call: (body) => String(body.params[0].data || '').startsWith(SEL_SIGNER)
      ? { result: '0x' + '00'.repeat(12) + 'cc'.repeat(20) }   // some OTHER signer
      : { result: '0x' + '00'.repeat(32) },
  });
  const res = await room._chainScoreCheckpoint('bp_p3', { level: 25, svKills: 1 });
  check('a signer mismatch is caught BEFORE any gas is spent',
    res.ok === false && res.reason === 'signer-mismatch', res);
  check('...no broadcast happened', !rpc.includes('eth_sendRawTransaction'), rpc);
}
{
  /* The verdict is cached for the DO lifetime: one getCode across two
     checkpoints proves it (env can only change via a deploy, which wipes
     the DO and the cache with it). */
  const { room, rpc } = mk();
  await room._chainScoreCheckpoint('bp_p4', { level: 25, svKills: 1 });
  await room._chainScoreCheckpoint('bp_p4', { level: 50, svKills: 2 });
  check('the preflight verdict is cached (one eth_getCode for two checkpoints)',
    rpc.filter((m) => m === 'eth_getCode').length === 1, rpc);
}

// ── 13. v2.3.1682: one send in flight per DO — cross-PLAYER serialization ──
{
  const room = new GameRoom(makeState(), { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });
  let release;
  const gate = new Promise((r) => { release = r; });
  const order = [];
  let txCount = 0;
  const base = stubNode(null);
  room._chainRpcOpts = { receiptIntervalMs: 0, fetchImpl: async (url, init) => {
    const body = JSON.parse(init.body);
    order.push(body.method);
    if (body.method === 'eth_getTransactionCount') {
      /* An incrementing count models the real node: if the two sends were
         concurrent they would both read the SAME value and collide. */
      const r = '0x' + (txCount++).toString(16);
      if (txCount === 1) await gate;   // hold the FIRST flight mid-air
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: r }) };
    }
    return base(url, init);
  } };

  const a = room._chainScoreCheckpoint('bp_qa', { level: 25, svKills: 1 });
  const b = room._chainScoreCheckpoint('bp_qb', { level: 25, svKills: 2 });
  await new Promise((r) => setTimeout(r, 20));
  const sendsBeforeRelease = order.filter((m) => m === 'eth_sendRawTransaction').length;
  const countsBeforeRelease = order.filter((m) => m === 'eth_getTransactionCount').length;
  release();
  const [ra, rb] = await Promise.all([a, b]);
  check('both players\' checkpoints eventually succeed', ra.ok === true && rb.ok === true, { ra, rb });
  check('the second player did not read a tx nonce while the first was in flight',
    countsBeforeRelease === 1, { countsBeforeRelease, sendsBeforeRelease });
  check('the two transactions used DIFFERENT relayer nonces', txCount === 2, txCount);
}

// ── 14. v2.3.1682: GET /api/admin/chainstatus — the operator's one page ──
{
  const { room, state } = mk();
  room.env = { ...room.env, ADMIN_KEY: 'sesame' };
  const call = (path, auth) => room._adminFetch(new Request('http://x/api/admin' + path, {
    headers: auth ? { Authorization: 'Bearer ' + auth } : {},
  }));

  let r = await call('/chainstatus');
  check('chainstatus without a key is denied', r.status === 401, r.status);

  r = await call('/chainstatus', 'sesame');
  let j = await r.json();
  check('chainstatus reports a healthy config', j.ok === true && j.configured === true
    && j.signerMatch === true && j.codePresent === true, j);
  check('chainstatus names the relayer address and balance',
    /^0x[0-9a-f]{40}$/.test(j.relayerAddress) && j.balanceEth === '1.0000', j);

  await room._chainScoreCheckpoint('bp_st', { level: 25, svKills: 6 });
  r = await call('/chainstatus?id=bp_st', 'sesame');
  j = await r.json();
  check('chainstatus?id returns the stored write with an explorer link',
    j.player && j.player.milestone === 25 && /\/tx\/0x/.test(j.player.explorer), j.player);
  check('chainstatus?id hands the operator the player key (no by-hand keccak)',
    j.player && /^0x[0-9a-f]{64}$/.test(j.player.playerKey), j.player && j.player.playerKey);

  r = await call('/chainstatus', 'sesame');
  j = await r.json();
  check('the aggregate view counts writes and shows the newest',
    j.writes === 1 && j.lastWrite && j.lastWrite.milestone === 25, j);

  const noAdmin = new GameRoom(makeState(), { LEADERBOARD });
  const r404 = await noAdmin._adminFetch(new Request('http://x/api/admin/chainstatus'));
  check('with no ADMIN_KEY configured the surface does not exist', r404.status === 404, r404.status);
}

// ── 15. v2.3.1682: CHAIN_RPC override reaches every call site ──
{
  const state = makeState();
  const urls = new Set();
  const room = new GameRoom(state, {
    LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT,
    CHAIN_RPC: 'http://override.example',
  });
  /* No _chainRpcOpts here — production path, only fetch is stubbed.  The
     helper must route EVERY call (preflight, nonce, send, receipt) to the
     env override; a single call escaping to the hardcoded default is the
     bug. */
  const base = stubNode(null);
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { urls.add(String(url)); return base(url, init); };
  try {
    /* receipt polling at production interval would stall the suite — inject
       only the interval, keeping the rpc/fetch resolution on the env path. */
    room._chainRpcOpts = null;
    const orig = room._chainRpcOptions.bind(room);
    room._chainRpcOptions = () => ({ ...orig(), receiptIntervalMs: 0 });
    const res = await room._chainScoreCheckpoint('bp_o', { level: 25, svKills: 2 });
    check('the env-override path completes', res.ok === true, res);
    check('every RPC call hit the CHAIN_RPC override',
      urls.size === 1 && urls.has('http://override.example'), [...urls]);
  } finally {
    globalThis.fetch = origFetch;
  }
}

console.log(failures === 0 ? '\nchainscore: ALL PASS' : `\nchainscore: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
