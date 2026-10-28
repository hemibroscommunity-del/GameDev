/* ═══ v2.3.3755: EACH MEMORY SAVER, OFF FROM THE TEST PANEL ═══
 *
 * src/game/clientOff.js (the phone's rule) and server/src/clientoff.js (the
 * worker's list).  Checked:
 *   1. the phone: a list read, the worker's word followed live and kept for
 *      the next load, the savers that follow live told, nothing before it;
 *   2. the worker: caps.clientoff at join, every `off_` flag set or cleared
 *      told to every phone at once (`client_off`), a privileged type;
 *   3. the panel's names: every saver has words, and its flag's name is one
 *      the flags route takes.
 */
import { CLIENT_SAVERS, parseClientOff, clientOff, clientOffAtLoad, setClientOff, onClientOff, clientOffNow, _resetClientOff } from '../../src/game/clientOff.js';
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}

/* ── 1. the phone ─────────────────────────────────────────────────────── */
{
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  _resetClientOff();
  check('1a. a list: names kept, junk dropped', JSON.stringify([...parseClientOff(' sfxcache,voicecap,,Bad Name,__proto__x,a'.replace('__proto__x', 'x y'))]) === JSON.stringify(['sfxcache', 'voicecap', 'a']));
  check('1b. before the worker speaks, with nothing heard: every saver on', CLIENT_SAVERS.every((c) => !clientOff(c.id)) && clientOffNow() === null);
  const told = [];
  onClientOff((set) => told.push([...set].sort().join(',')));
  setClientOff('voicecap,onecopy');
  check('1c. the worker\'s word followed at once', clientOff('voicecap') && clientOff('onecopy') && !clientOff('sfxcache'));
  check('1d. ...the live savers told once', JSON.stringify(told) === JSON.stringify(['onecopy,voicecap']));
  check('1e. ...and kept for the next load', mem.get('bt_clientoff') === 'voicecap,onecopy');
  setClientOff('onecopy,voicecap');
  check('1f. the same list again tells nobody', told.length === 1);
  /* a fresh page load: what was heard is the at-load answer until the worker speaks */
  _resetClientOff();
  check('1g. the next load: off from what was heard, before the worker speaks', clientOffAtLoad('onecopy') && clientOff('voicecap') && !clientOff('sfxcache'));
  setClientOff('');
  check('1h. the worker says none: every saver on, nothing kept', CLIENT_SAVERS.every((c) => !clientOff(c.id)) && !mem.has('bt_clientoff'));
  check('1i. ...but a load-time saver keeps what this load began with', clientOffAtLoad('onecopy') === true);
  delete globalThis.localStorage;
  _resetClientOff();
  setClientOff('sfxcache');
  check('1j. no storage (private mode): the worker\'s word still followed', clientOff('sfxcache'));
  _resetClientOff();
}

/* ── 2. the worker ────────────────────────────────────────────────────── */
function mockState() {
  const store = new Map();
  return {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
async function capsOf(flags) {
  const room = new GameRoom(mockState(), mockEnv);
  room._liveFlags = flags;
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'co1', name: 'co1', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  const ss = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
  return { room, caps: ss && ss.caps };
}
{
  const a = await capsOf({});
  check('2a. with no flag, a join is told no saver is off', a.caps && a.caps.clientoff === '', a.caps && a.caps.clientoff);
  const b = await capsOf({ off_voicecap: true, off_onecopy: true, off_sfxcache: false, movepath: false });
  check('2b. `off_<name>: true` flags, as one sorted list (false ones and other flags left out)', b.caps.clientoff === 'onecopy,voicecap', b.caps.clientoff);
  const room = a.room;
  const told = [];
  room.broadcastAll = (m) => told.push(m);
  room._adminLog = async () => {};
  const post = (name, value) => room._liveopsRoutes(new Request('http://x/flags', { method: 'POST', body: JSON.stringify({ name, value }) }), new URL('http://x/flags'), '/flags', (o) => o);
  const del = (name) => room._liveopsRoutes(new Request('http://x/flags?name=' + name, { method: 'DELETE' }), new URL('http://x/flags?name=' + name), '/flags', (o) => o);
  await post('off_voicecap', true);
  await post('off_sfxcache', true);
  await del('off_voicecap');
  await post('xp_mult', 2);
  await del('off_sfxcache');
  const said = told.filter((m) => m.type === 'client_off').map((m) => m.off);
  check('2c. every off_ flag set or cleared is told to every phone at once, and no other flag is', JSON.stringify(said) === JSON.stringify(['voicecap', 'sfxcache,voicecap', 'sfxcache', '']), said);
  check('2d. client_off is a privileged type (a phone cannot forge it)', PRIVILEGED_EVENTS.has('client_off'));
}

/* ── 3. the panel's names ─────────────────────────────────────────────── */
check('3a. every saver has plain words, a known kind, and a flag name the route takes',
  CLIENT_SAVERS.length === 8 && CLIENT_SAVERS.every((c) => typeof c.words === 'string' && c.words.length > 5 && typeof c.live === 'boolean' && flagNameOk('off_' + c.id)),
  CLIENT_SAVERS.map((c) => c.id));
check('3b. the names are the owner\'s eight', JSON.stringify(CLIENT_SAVERS.map((c) => c.id)) === JSON.stringify(['sfxcache', 'voicecap', 'onecopy', 'picnumbers', 'codelazy', 'groundlean', 'heaplean', 'lookpalette']));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all client-off checks passed');
