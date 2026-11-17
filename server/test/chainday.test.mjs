/* ═══ v2.3.5712: THE CHAIN'S SENDS HAVE A DAY'S BUDGET (card SEC PR 13) ═══
 * (server/src/chainscore.js "THE CHAIN'S DAY BUDGET"; chainwriter.js "THE
 * FEE'S CEILING"; docs/specs/progression-onchain.md)
 *
 * Every new character's first level-up made the game's wallet pay a fee,
 * with no ceiling a day, no live flag, and a fee taken at twice the node's
 * quote whatever it was.
 *   1. Past SENDS_DAY sends a UTC day, a checkpoint is not sent
 *      (`day-ceiling`) and nothing is stored or broadcast; after the day
 *      turns the same player's next level-up sends it, the whole series
 *      (nothing lost).
 *   2. A quote whose most possible fee (gas limit x twice the quote) is
 *      over FEE_MAX_WEI is not sent (`fee-over-ceiling`): no signed
 *      transaction broadcast, nothing stored, and its day's place given
 *      back; at a normal quote the next level-up sends it.
 *   3. `chainscore: false`: nothing sent, no RPC asked at all; back on, the
 *      next level-up sends.
 *   4. No new write: a refused checkpoint writes no row, and the day's
 *      count has no row of its own (memory only).
 *
 * BREAK PROOF (rule 8), tried by hand: main's chainscore.js and
 * chainwriter.js -> FAIL 1, 2, 3.
 * Not a phone test: node, a GameRoom on a node stub (chainscore.test's). */
import { GameRoom } from '../src/index.js';
import { CHAIN_SCORE } from '../src/chainscore.js';
import { privToAddress, normalizePrivKey } from '../src/chainwriter.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
let NOW = Date.UTC(2026, 10, 17, 20, 0, 0);
const realNow = Date.now;
Date.now = () => NOW;

const TEST_KEY = '4c0883a69102937d6231471b5dbb6204fe512961708279e2b8b4b1b6b0b0a0a1';
const CONTRACT = '0x' + 'ab'.repeat(20);
const SEL_SIGNER = '0x238ac933', SEL_NONCES = '0x9e317f12';
const LEADERBOARD = { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) };
function makeState() {
  const store = new Map(); const puts = [];
  return { _store: store, puts, storage: {
    get: async (k) => store.get(k), put: async (k, v) => { puts.push(k); store.set(k, v); },
    list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
    delete: async (k) => { store.delete(k); },
  }, getWebSockets: () => [], acceptWebSocket: () => {} };
}
/* the node: `price` the quote (wei, hex), every send logged */
function mk(price) {
  const state = makeState();
  const rpc = [];
  const node = { price: price || '0x989680' };   /* 0.01 gwei */
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    rpc.push(body.method);
    let result = null;
    if (body.method === 'eth_getTransactionCount') result = '0x0';
    else if (body.method === 'eth_gasPrice') result = node.price;
    else if (body.method === 'eth_sendRawTransaction') result = '0x' + 'ee'.repeat(32);
    else if (body.method === 'eth_getCode') result = '0x6080604052';
    else if (body.method === 'eth_getTransactionReceipt') result = { status: '0x1', blockNumber: '0x10' };
    else if (body.method === 'eth_call') {
      const data = String((body.params && body.params[0] && body.params[0].data) || '');
      if (data.startsWith(SEL_SIGNER)) result = '0x' + '00'.repeat(12) + privToAddress(normalizePrivKey(TEST_KEY)).slice(2);
      else if (data.startsWith(SEL_NONCES)) result = '0x' + '00'.repeat(32);
    }
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };
  const room = new GameRoom(state, { LEADERBOARD, RELAYER_KEY: TEST_KEY, SCORES_CONTRACT: CONTRACT });
  room._chainRpcOpts = { fetchImpl, rpc: 'http://test', receiptIntervalMs: 0 };
  return { room, state, rpc, node };
}
const player = (level) => ({ level, prog3: { sk: { sword: { level }, bow: { level: 1 }, staff: { level: 1 } } }, svKills: 3 });
const sends = (rpc) => rpc.filter((m) => m === 'eth_sendRawTransaction').length;

/* 1. the day's ceiling */
{
  const { room, state, rpc } = mk();
  const N = CHAIN_SCORE.SENDS_DAY;
  check('1. the day\'s ceiling is a number (guard)', Number.isInteger(N) && N > 0, N);
  let ok = 0;
  for (let i = 0; i < N; i++) { const r = await room._chainScoreCheckpoint('bp_cd_' + i, player(2)); if (r.ok) ok++; }
  check('1. ' + N + ' new characters\' first checkpoints are sent', ok === N && sends(rpc) === N, { ok, sends: sends(rpc) });
  const puts0 = state.puts.length, s0 = sends(rpc);
  const over = await room._chainScoreCheckpoint('bp_cd_over', player(2));
  check('1. the next one that day is not sent (day-ceiling): nothing broadcast, nothing stored', over.ok === false && over.reason === 'day-ceiling' && sends(rpc) === s0 && state.puts.length === puts0 && !state._store.has(CHAIN_SCORE.KEY('bp_cd_over')), { over, puts: state.puts.length - puts0 });
  NOW += 24 * 3600 * 1000;
  const next = await room._chainScoreCheckpoint('bp_cd_over', player(3));
  const rec = state._store.get(CHAIN_SCORE.KEY('bp_cd_over'));
  check('1. the day turned, the same player\'s next level-up sends it: the whole series, nothing lost', next.ok === true && rec && rec.milestone === 2 && rec.series.melee === 3 && rec.series.kills === 3, { next, rec: rec && rec.series });
}

/* 2. the fee's ceiling */
{
  const { room, state, rpc, node } = mk('0x' + (5n * 10n ** 9n).toString(16));   /* a 5 gwei quote: four series, 610k gas x 2 x 5 gwei = 0.0061 ETH */
  const r = await room._chainScoreCheckpoint('bp_cd_fee', player(2));
  check('2. a quote over the fee\'s ceiling is not sent: nothing broadcast, nothing stored', r.ok === false && r.reason === 'fee-over-ceiling' && sends(rpc) === 0 && !state._store.has(CHAIN_SCORE.KEY('bp_cd_fee')), { r, sends: sends(rpc) });
  check('2. ...and gives its day\'s place back', !room._chainDay || room._chainDay.n === 0, room._chainDay);
  node.price = '0x989680';
  const again = await room._chainScoreCheckpoint('bp_cd_fee', player(2));
  check('2. at a normal quote the next level-up sends it', again.ok === true && sends(rpc) === 1 && state._store.has(CHAIN_SCORE.KEY('bp_cd_fee')), again);
}

/* 3. the switch */
{
  const { room, state, rpc } = mk();
  room._liveFlags = { chainscore: false };
  room._chainScoreOnLevelUp('bp_cd_off', player(2));
  await new Promise((r) => setTimeout(r, 20));
  const r = await room._chainScoreCheckpoint('bp_cd_off', player(2));
  check('3. chainscore: false: nothing sent, not one RPC asked, nothing stored', r.ok === false && r.reason === 'switched-off' && rpc.length === 0 && !state._store.has(CHAIN_SCORE.KEY('bp_cd_off')), { r, rpc });
  room._liveFlags = {};
  const back = await room._chainScoreCheckpoint('bp_cd_off', player(2));
  check('3. ...back on, the next level-up sends it', back.ok === true && sends(rpc) === 1, back);
}

/* 4. no new write */
{
  const { room, state } = mk();
  room._chainDay = { day: 20261117, n: CHAIN_SCORE.SENDS_DAY };
  NOW = Date.UTC(2026, 10, 17, 21);
  await room._chainScoreCheckpoint('bp_cd_none', player(2));
  check('4. a refused checkpoint writes no row; the day\'s count has none of its own', state.puts.length === 0 && ![...state._store.keys()].some((k) => /chain_day|chainday|chain_budget/.test(k)), state.puts);
}

Date.now = realNow;
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
