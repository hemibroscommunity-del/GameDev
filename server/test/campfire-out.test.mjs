/* A refused campfire goes out on the OTHER players' screens too -- v2.3.4942
 * (lane 3; v2.3.4886 took it back on the lighter's phone only).
 *
 * The campfire lit on the tap is relayed to everyone (`campfire_lit`) and
 * drawn for 45 s.  When the worker refuses the fire (no such log), the
 * lighter's phone puts it out and now relays `campfire_out`; each other
 * phone drops that sender's fire.  This plays the REAL src/game/fireRefuse.js
 * against a REAL GameRoom's relay:
 *   1. the lighter's take-back says what it took: the light in flight (no
 *      campfire was relayed: nothing to tell) or the fire (tell them);
 *   2. campfire_out is relayed in the SENDER's name, after its campfire_lit;
 *      the watcher's screen drops that fire, and only that one;
 *   3. a forged out naming another player puts out only the sender's own;
 *   4. the wiring: wsClient relays it only for a fire, gameEvents draws it. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { RELAY } from '../src/relay.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

let F = {};
try { F = await import('../../src/game/fireRefuse.js'); } catch (e) { F = {}; }
check('0 fireRefuse.js exports the take-back\'s kind, the relay and the watcher\'s side',
  ['takeBackFireWhat', 'campfireOutMsg', 'peerFireOut'].every((f) => typeof F[f] === 'function'), Object.keys(F));
check('0 campfire_out is a relay', RELAY.TYPES.has('campfire_out'));

if (typeof F.takeBackFireWhat === 'function') {
  /* 1 */
  const now = 1_000_000;
  check('1 a light in flight: "light" (no campfire was relayed)', F.takeBackFireWhat({ _firemaking: { doneAt: now + 500 } }, now) === 'light');
  check('1 a campfire just lit: "fire" (it was relayed)', F.takeBackFireWhat({ _campfire: { litAt: now - 900 } }, now) === 'fire');
  check('1 an older fire: nothing', F.takeBackFireWhat({ _campfire: { litAt: now - 60000 } }, now) === null && F.takeBackFireWhat(null, now) === null);
  check('1 takeBackFire still answers true/false', F.takeBackFire({ _campfire: { litAt: now - 900 } }, now) === true);

  /* 2-3: a real room's relay */
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState(), env);
  const A = 'bp_cf_amy', B = 'bp_cf_bob', C = 'bp_cf_cal';
  const ws = Object.create(null);
  for (const pid of [A, B, C]) {
    ws[pid] = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
    room.sessions.set(ws[pid], { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
    await room.webSocketMessage(ws[pid], JSON.stringify({ type: 'join', id: pid, name: pid.slice(6), protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  }
  const relay = async (from, msg) => {
    const s = room.sessions.get(ws[from]);
    s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now();
    room.eventBuffer.length = 0;
    await room.webSocketMessage(ws[from], JSON.stringify(msg));
    return room.eventBuffer.slice();
  };
  /* the watcher's screen, as gameEvents draws campfire_lit */
  const watcher = { myId: B, currentZone: 'town', _peerCampfires: new Map() };
  const drawLit = (ev) => watcher._peerCampfires.set(String(ev.payload.id), { x: ev.payload.x, y: ev.payload.y });

  for (const ev of await relay(A, { type: 'campfire_lit', payload: { id: A, x: 10, y: 20, zone: 'town', expiresAt: Date.now() + 45000 } })) if (ev.type === 'campfire_lit') drawLit(ev);
  for (const ev of await relay(C, { type: 'campfire_lit', payload: { id: C, x: 30, y: 40, zone: 'town', expiresAt: Date.now() + 45000 } })) if (ev.type === 'campfire_lit') drawLit(ev);
  check('2 setup: the watcher draws both fires', watcher._peerCampfires.has(A) && watcher._peerCampfires.has(C));

  /* the lighter's phone sends what wsClient sends: the broadcast's event as the type */
  const lighter = { myId: A, currentZone: 'town' };
  const out = F.campfireOutMsg(lighter);
  check('2 the message is a broadcast named campfire_out, with the sender and zone', out.type === 'broadcast' && out.event === 'campfire_out' && out.payload.id === A && out.payload.zone === 'town', out);
  const outs = (await relay(A, { type: out.event, payload: out.payload })).filter((e) => e.type === 'campfire_out');
  check('2 the worker relays it once, in the sender\'s name', outs.length === 1 && outs[0].payload.id === A, outs);
  check('2 the watcher puts out THAT fire', F.peerFireOut(watcher, outs[0] && outs[0].payload) === true && !watcher._peerCampfires.has(A));
  check('2 ...and only that one', watcher._peerCampfires.has(C));

  /* 3 */
  const forged = (await relay(A, { type: 'campfire_out', payload: { id: C, zone: 'town' } })).filter((e) => e.type === 'campfire_out');
  check('3 a forged out naming another player is rebuilt in the sender\'s name', forged.length === 1 && forged[0].payload.id === A, forged);
  check('3 ...so Cal\'s fire still burns', F.peerFireOut(watcher, forged[0].payload) === false && watcher._peerCampfires.has(C));
  check('3 one\'s own echo is ignored', F.peerFireOut({ myId: C, _peerCampfires: new Map([[C, {}]]) }, { id: C }) === false);
}

/* 4 */
{
  const wc = src('src/networking/wsClient.js');
  check('4 wsClient relays campfire_out only for a fire it put out',
    /case 'firemaking_refused':[\s\S]{0,900}if \(_fireBack === 'fire' && S\.channel\)[\s\S]{0,80}S\.channel\.send\(campfireOutMsg\(S\)\)/.test(wc));
  const ge = src('src/networking/gameEvents.js');
  check('4 gameEvents draws campfire_out', /case 'campfire_out':[\s\S]{0,400}peerFireOut\(S, payload\)/.test(ge));
}

console.log(`\ncampfire-out: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
