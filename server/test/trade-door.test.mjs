/* ═══ v2.3.5210: THE TRADE DOOR (card L PR 5; docs/specs/trade-door.md) ═══
 *
 * A trade session's phase is one field, `s.state` ('open', then 'done' or
 * 'cancelled'), written only by trade2.js _t2To, by a way of TRADE_WAYS; both
 * ends are final (live flag `tradedoor: false` lets a finished one be written
 * again, as the two old lines would have).  This suite:
 *
 *   1. the door's own rules: each way goes to its own phase and no other; a
 *      finished trade stays finished; the kill switch;
 *   2. A SECOND WRITER FAILS: a write of `.state` anywhere in server/src that
 *      is not _t2To's, nor one of NOT_A_TRADE (other objects' `state`, each
 *      with why).  The phase table's guard reads the same off the syntax tree
 *      (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. every way a trade ends, played through the real room: the mutual open
 *      (born 'open'), the swap ('done'), a decline, a leave and the idle sweep
 *      ('cancelled'), and a commit-time shortfall ('cancelled');
 *   4. step 1 changes nothing: a cancel of a finished trade still sends
 *      nothing and refunds nothing (its old guard), and an invite is still
 *      no session.
 *
 * Break proof, tried by hand: `s.state = 'done';` put back in
 * _handleTrade2Confirm -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { trade2Methods, TRADE_PHASES, TRADE_WAYS } from '../src/trade2.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the phases are open, done, cancelled', TRADE_PHASES.join() === 'open,done,cancelled');
  check('1. the ways: cancel -> cancelled, swap -> done', TRADE_WAYS.cancel === 'cancelled' && TRADE_WAYS.swap === 'done' && Object.keys(TRADE_WAYS).length === 2);
  const door = Object.assign(Object.create(null), trade2Methods, { _liveFlags: {} });
  const fresh = () => ({ state: 'open' });
  let s = fresh();
  check('1. open -> cancelled by cancel', door._t2To(s, 'cancelled', 'cancel') === true && s.state === 'cancelled');
  s = fresh();
  check('1. open -> done by swap', door._t2To(s, 'done', 'swap') === true && s.state === 'done');
  s = fresh();
  check('1. a way names its own phase only (cancel -> done refused)', door._t2To(s, 'done', 'cancel') === false && s.state === 'open');
  check('1. an unknown way is refused', door._t2To(s, 'cancelled', 'nope') === false && door._t2To(s, 'open', 'cancel') === false && s.state === 'open');
  check('1. a way off the prototype is refused', door._t2To(s, undefined, 'toString') === false && s.state === 'open');
  check('1. no session, no write', door._t2To(null, 'done', 'swap') === false && door._t2To('x', 'done', 'swap') === false);
  s = { state: 'done' };
  check('1. a finished trade stays finished (done -> cancelled refused)', door._t2To(s, 'cancelled', 'cancel') === false && s.state === 'done');
  s = { state: 'cancelled' };
  check('1. ...and the other way (cancelled -> done refused)', door._t2To(s, 'done', 'swap') === false && s.state === 'cancelled');
  door._liveFlags = { tradedoor: false };
  s = { state: 'done' };
  check('1. tradedoor: false writes over a finished phase, as the old lines would have', door._t2To(s, 'cancelled', 'cancel') === true && s.state === 'cancelled');
  check('1. ...but never by a wrong way', door._t2To(s, 'done', 'cancel') === false && s.state === 'cancelled');
  door._liveFlags = { tradedoor: true };
  s = { state: 'done' };
  check('1. tradedoor: true is the default', door._t2To(s, 'cancelled', 'cancel') === false && s.state === 'done');
}

/* ── 2. no second writer ── */
{
  /* other objects' `state`: each named, with why */
  const NOT_A_TRADE = [
    { file: 'server/src/index.js', text: 'this.state = state', why: 'the Durable Object\'s own handle (GameRoom)' },
    { file: 'server/src/marketplace.js', text: 'this.state = state', why: 'the Durable Object\'s own handle' },
    { file: 'server/src/leaderboard.js', text: 'this.state = state', why: 'the Durable Object\'s own handle' },
    { file: 'server/src/arena.js', text: 'this.state = state', why: 'the Durable Object\'s own handle' },
    { file: 'server/src/feedback.js', text: 'this.state = state', why: 'the Durable Object\'s own handle' },
    { file: 'server/src/dungeon.js', text: 'inst.state = ', why: 'a dungeon instance: its own machine (the phase table\'s `dungeon` row)' },
  ];
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor') walk(r + '/'); }
      else if (/\.(js|mjs)$/.test(n)) files.push(r);
    }
  })('server/src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /(?:\.state|\[\s*['"]state['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\.state\b|Object\.assign\([^)]*\{[^}]*\bstate\s*:/;
  const outside = [];
  const seen = new Set();
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('state')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/trade2.js') {
        if (/^\s{2}_t2To\(s, to, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      const nb = NOT_A_TRADE.find((x) => x.file === f && l.includes(x.text));
      if (nb) { seen.add(nb); continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _t2To writes the phase (one write)', doorWrites === 1, doorWrites);
  check('2. no write of .state in server/src outside _t2To but NOT_A_TRADE\'s', outside.length === 0, outside);
  const stale = NOT_A_TRADE.filter((x) => !seen.has(x)).map((x) => x.file + ' "' + x.text + '"');
  check('2. every NOT_A_TRADE entry still writes (a stale one is deleted)', stale.length === 0, stale);
  const src = readFileSync(new URL('server/src/trade2.js', ROOT), 'utf8');
  check('2. the session is born open, once, at the mutual open', (src.match(/state: 'open', ts: now/g) || []).length === 1);
  check('2. both old lines go through the door', /this\._t2To\(s, 'cancelled', 'cancel'\)/.test(src) && /this\._t2To\(s, 'done', 'swap'\)/.test(src));
}

/* ── 3. every way a trade ends, through the real room ── */
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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const P = (n) => 'bp_tdoor_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
const wss = {};
for (const n of ['a', 'b']) {
  wss[n] = fakeWs(n);
  room.sessions.set(wss[n], baseSession());
  await room.webSocketMessage(wss[n], JSON.stringify({ type: 'join', id: P(n), name: n.toUpperCase(), phrase: 'p-' + n, data: { x: 0, y: 0, z: 'town' } }));
  room.playerState[P(n)].coins = 1000;
  room.playerState[P(n)].inventory = {};
}
const states = (ws) => ws.sent.filter((m) => m.type === 'trade2_state').map((m) => m.payload);
async function openPair() {
  await cmd(wss.a, 'trade2_open', { target: P('b') });
  const invite = room._t2Invites && room._t2Invites.get(P('a') + '>' + P('b'));
  const noSession = ![...(room._trades2 || new Map()).values()].some((s) => s.a === P('a') || s.b === P('a'));
  await cmd(wss.b, 'trade2_open', { target: P('a') });
  const s = [...room._trades2.values()].find((x) => (x.a === P('a') && x.b === P('b')) || (x.a === P('b') && x.b === P('a')));
  return { s, invite, noSession };
}
async function bothReady() {
  await cmd(wss.a, 'trade2_ready', { ready: true });
  await cmd(wss.b, 'trade2_ready', { ready: true });
  for (const s2 of room._trades2.values()) s2.changedAt = Date.now() - 999999;
}
{
  let r = await openPair();
  check('3. an invite is no session: a key of _t2Invites only (step 1)', typeof r.invite === 'number' && r.noSession);
  check('3. the mutual open is born open', r.s && r.s.state === 'open');

  /* the swap */
  room.playerState[P('a')].inventory = { fish_minnow: 3 };
  await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 2 } });
  await bothReady();
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.b, 'trade2_confirm');
  check('3. the swap ends it done (and it leaves the map)', r.s.state === 'done' && !room._trades2.has(r.s.id), r.s.state);
  check('3. ...the swap really ran', (room.playerState[P('b')].inventory.fish_minnow | 0) === 2);

  /* a decline */
  r = await openPair();
  await cmd(wss.a, 'trade2_cancel');
  check('3. a decline ends it cancelled', r.s.state === 'cancelled' && !room._trades2.has(r.s.id));

  /* a leave */
  r = await openPair();
  room._trade2OnDisconnect(P('b'));
  check('3. a leave ends it cancelled', r.s.state === 'cancelled' && !room._trades2.has(r.s.id));

  /* the idle sweep */
  r = await openPair();
  r.s.ts = Date.now() - 10 * 60 * 1000;
  room._tickTrades2(Date.now());
  check('3. the idle sweep ends it cancelled', r.s.state === 'cancelled' && !room._trades2.has(r.s.id));

  /* a commit-time shortfall */
  r = await openPair();
  room.playerState[P('a')].inventory = { fish_minnow: 2 };
  await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 2 } });
  await bothReady();
  room.playerState[P('a')].inventory = {};   /* spent since staging */
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.b, 'trade2_confirm');
  check('3. a shortfall at the commit ends it cancelled', r.s.state === 'cancelled' && !room._trades2.has(r.s.id), r.s.state);

  /* ── 4. step 1: a finished trade's cancel does nothing, as before ── */
  r = await openPair();
  await bothReady();
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.b, 'trade2_confirm');
  const before = states(wss.a).length + states(wss.b).length;
  room._t2Cancel(r.s, 'late');
  check('4. a cancel of a done trade sends nothing and leaves it done (its old guard)', r.s.state === 'done' && states(wss.a).length + states(wss.b).length === before);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
