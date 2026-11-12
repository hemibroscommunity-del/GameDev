/* A FIRE LIT WITH A LOG THE WORKER DOES NOT HOLD IS TAKEN BACK (v2.3.4886).
 *
 * The phone lights a fire on the tap (BroTown.jsx firemakingBus) before the
 * worker answers.  When the worker has no such log (cooking.js
 * _handleFiremakingRequest), it sends the bag back AND `firemaking_refused`,
 * and the phone takes back the light or the campfire it just lit
 * (src/game/fireRefuse.js).  Pinned here:
 *   1. a refused fire sends player_state and firemaking_refused, privately;
 *   2. `firerefuse: false` sends the bag alone;
 *   3. a log the worker holds is lit, no refusal;
 *   4. the type is privileged (a relay cannot forge one) and the phone has
 *      its case;
 *   5. the phone's rule: the light in flight stops, a campfire just lit goes
 *      out, an older one stays. */
import { readFileSync } from 'node:fs';
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { takeBackFire, FIRE_REFUSE } from '../../src/game/fireRefuse.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const mkState = () => {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
};
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const R = new GameRoom(mkState(), env);
const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
const ID = 'bp_fire_refuse';
R.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await R.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: 'Fire', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
const ps = R.playerState[ID];
check('setup: a v2 player joined', !!ps);

const light = async () => {
  ws.sent.length = 0;
  await R.webSocketMessage(ws, JSON.stringify({ type: 'firemaking_request', payload: { invKey: 'wood_pine' } }));
  await new Promise((r) => setTimeout(r, 5));
  return ws.sent.map((m) => m.type);
};

/* 1 */
ps.inventory = {};
let got = await light();
check('1: no log: the bag goes back and the fire is refused', got.includes('player_state') && got.includes('firemaking_refused'), got);
const ref = ws.sent.find((m) => m.type === 'firemaking_refused');
check('1: the refusal names the log', ref && ref.payload && ref.payload.invKey === 'wood_pine', ref);
check('1: and goes to no one else (nothing in the room buffer)', !(R.eventBuffer || []).some((e) => e && e.type === 'firemaking_refused'));

/* 2 */
R._liveFlags = { firerefuse: false };
got = await light();
check('2: firerefuse:false sends the bag alone', got.includes('player_state') && !got.includes('firemaking_refused'), got);
R._liveFlags = {};

/* 3 */
ps.inventory = { wood_pine: 2 };
got = await light();
check('3: a held log is lit, no refusal', !got.includes('firemaking_refused') && (ps.inventory.wood_pine || 0) === 1, { got, inv: ps.inventory });

/* 4 */
check('4: firemaking_refused is privileged', PRIVILEGED_EVENTS && (PRIVILEGED_EVENTS.has ? PRIVILEGED_EVENTS.has('firemaking_refused') : PRIVILEGED_EVENTS.includes('firemaking_refused')));
const wsc = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
check("4: the phone's direct switch has its case, and takes the fire back", /case 'firemaking_refused':[\s\S]{0,400}takeBackFire\(/.test(wsc));

/* 5 */
const now = 1_000_000;
let S = { _firemaking: { doneAt: now + 500 }, _campfire: null };
check('5: the light in flight stops', takeBackFire(S, now) === true && S._firemaking === null);
S = { _firemaking: null, _campfire: { litAt: now - 300 } };
check('5: a campfire just lit goes out', takeBackFire(S, now) === true && S._campfire === null);
S = { _firemaking: null, _campfire: { litAt: now - FIRE_REFUSE.LIT_MS - 1 } };
check('5: an older campfire stays', takeBackFire(S, now) === false && S._campfire !== null);
check('5: nothing drawn: nothing taken', takeBackFire({}, now) === false && takeBackFire(null, now) === false);

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nfire-refuse: all passed');
