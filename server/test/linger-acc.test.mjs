/* v2.3.4921: A LINGERING BODY'S SHOTS AND HITS ARE WRITTEN WHEN IT GOES
 * (linger.js _lingerEnd; docs/specs/session-door.md "Known leftovers").
 *
 * The close writes the shots and hits counted since the last write
 * (leave.js, accuracy.js _accDirtyCopy), but a body left behind in a fight
 * puts the close's duties off to _lingerEnd, which never took them: they sat
 * in memory and a restart lost them.
 *   1. the body's end writes the counts (acc:<id>) and clears the entry
 *   2. a resume (the join taking the body back) writes them too
 *   3. nothing unwritten: no write
 *   4. `lingeracc: false`: left in memory, as before
 */
import { GameRoom } from '../src/index.js';
import { accKey } from '../src/accuracy.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  let puts = [];
  return {
    _store: store,
    puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push(k); store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

async function room(flags) {
  const state = makeState();
  if (flags) await state.storage.put('liveflags', flags);
  const r = new GameRoom(state, mockEnv);
  await r._liveFlagsEnsure();
  return { r, state };
}
/* a player in, a few shots counted and not yet written, then the body left lingering */
async function lingering(r, id) {
  const ws = fakeWs();
  r.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'wheel' } }));
  await settle();
  clearInterval(r.tickInterval); r.tickInterval = null;
  const e = r._accEntry(id, Date.now());
  e.d.melee[0] = 7; e.d.melee[1] = 3; e.dirty = true;
  const ps = r.playerState[id];
  ps.lingering = true;
  if (!r._lingerBodies) r._lingerBodies = new Map();
  r._lingerBodies.set(id, { until: Date.now() + 1000 });
  return e;
}

// ── 1. the end writes them ──
{
  const { r, state } = await room();
  const e = await lingering(r, 'bp_la_a');
  await r._lingerEnd('bp_la_a');
  const rec = state._store.get(accKey('bp_la_a'));
  check('1. the body\'s end writes its shots and hits', !!rec && JSON.stringify(rec).includes('7') && !e.dirty, { rec, dirty: e.dirty });
}
// ── 2. a resume ──
{
  const { r, state } = await room();
  await lingering(r, 'bp_la_b');
  await r._lingerEnd('bp_la_b', true);
  check('2. a resume writes them too', !!state._store.get(accKey('bp_la_b')));
}
// ── 3. nothing unwritten: no write ──
{
  const { r, state } = await room();
  const e = await lingering(r, 'bp_la_c');
  e.d.melee[0] = 0; e.d.melee[1] = 0; e.dirty = false;
  await r._lingerEnd('bp_la_c');
  check('3. nothing unwritten: no acc write', !state.puts().includes(accKey('bp_la_c')), state.puts());
}
// ── 4. the switch ──
{
  const { r, state } = await room({ lingeracc: false });
  const e = await lingering(r, 'bp_la_d');
  await r._lingerEnd('bp_la_d');
  check('4. `lingeracc: false`: left in memory, as before', !state._store.get(accKey('bp_la_d')) && e.dirty === true);
}
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
