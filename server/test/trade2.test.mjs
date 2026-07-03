/* Two-sided trade test (v2.3.1132, PR16, handoff item H).  The gift
 * trade (trade.js) stays; this is the both-stage-both-confirm window:
 * mutual open, staged offers, anti-switch confirm reset, ATOMIC swap
 * validated at commit.  Checks:
 *   1. caps.trade2 advertised.
 *   2. Open handshake: A's open invites B (trade2_invite + 'invited'
 *      echo); B opening back goes live for both; self-target dropped;
 *      third parties get 'busy'.
 *   3. trade2_set sanitizes + echoes; ANY change resets BOTH confirms.
 *   4. Single confirm does not swap; both confirms swap ATOMICALLY
 *      (gold-for-items both directions verified on coins + inventory),
 *      session ends 'done' + settled to both.
 *   5. Commit-time shortfall cancels with NO partial application.
 *   6. Confirms/sets from non-members are ignored.
 *   7. Cancel notifies both; disconnect cancels; TTL sweep expires
 *      idle sessions; expired invites do not complete.
 *   8. Forged trade2_state / trade2_invite are not rebroadcast.
 */
import { GameRoom } from '../src/index.js';
import { TRADE2 } from '../src/trade2.js';

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
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }
const lastState = (ws) => { const r = msgsOfType(ws, 'trade2_state'); return r[r.length - 1] && r[r.length - 1].payload; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const P = (n) => 'bp_t2_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const wss = {};
for (const n of ['a', 'b', 'c']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
  room.playerState[P(n)].coins = 1000;
  room.playerState[P(n)].inventory = {};
}
const psA = room.playerState[P('a')], psB = room.playerState[P('b')];
psA.inventory = { fish_minnow: 10 };
psB.inventory = { ore_iron_ore: 4 };

// ── 1. caps ──
const sync = wss.a.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.trade2', sync && sync.caps && sync.caps.trade2 === true, sync && sync.caps);

// ── 2. open handshake ──
await cmd(wss.a, 'trade2_open', { target: P('a') });
check('self-target dropped', !room._t2Invites || !room._t2Invites.has(P('a') + '>' + P('a')));
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_open', { target: P('b') });
check("A's open invites B + echoes 'invited'", msgsOfType(wss.b, 'trade2_invite').length === 1 && lastState(wss.a).state === 'invited');
await cmd(wss.b, 'trade2_open', { target: P('a') });
const sA = lastState(wss.a), sB = lastState(wss.b);
check('mutual open goes live for both', sA && sA.state === 'open' && sB && sB.state === 'open' && sA.id === sB.id, { sA: sA && sA.state, sB: sB && sB.state });
wss.c.sent.length = 0;
await cmd(wss.c, 'trade2_open', { target: P('a') });
check("third party gets 'busy'", lastState(wss.c).reason === 'busy');

// ── 3. staging + anti-switch ──
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 5, _gold: -50, junk: 'x' } });
let st = lastState(wss.b);
check('set sanitizes and echoes to both', st.offers[P('a')].fish_minnow === 5 && st.offers[P('a')]._gold === undefined, st.offers[P('a')]);
await cmd(wss.a, 'trade2_confirm');
check('single confirm marks but does not swap', lastState(wss.a).confirmed[P('a')] === true && psA.inventory.fish_minnow === 10);
await cmd(wss.b, 'trade2_set', { offer: { _gold: 200 } });
st = lastState(wss.a);
check("B's change resets BOTH confirms (anti-switch)", st.confirmed[P('a')] === false && st.confirmed[P('b')] === false);

// ── 6. non-member noise ignored ──
await cmd(wss.c, 'trade2_confirm');
await cmd(wss.c, 'trade2_set', { offer: { _gold: 999 } });
st = lastState(wss.a);
check('non-member confirm/set ignored', st.confirmed[P('a')] === false && !st.offers[P('c')]);

// ── 4. atomic swap ──
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_confirm');
await cmd(wss.b, 'trade2_confirm');
st = lastState(wss.a);
check('both confirms settle: A gave 5 fish, got 200g', psA.inventory.fish_minnow === 5 && psA.coins === 1200, { inv: psA.inventory, coins: psA.coins });
check('B gave 200g, got 5 fish', psB.coins === 800 && psB.inventory.fish_minnow === 5 && psB.inventory.ore_iron_ore === 4, { inv: psB.inventory, coins: psB.coins });
check("both sides told 'done' + settled, session gone", st.state === 'done' && st.settled === true && lastState(wss.b).state === 'done' && room._trades2.size === 0);

// ── 5. commit-time shortfall = clean cancel ──
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 5 } });
await cmd(wss.b, 'trade2_set', { offer: { _gold: 500 } });
await cmd(wss.a, 'trade2_confirm');
psB.coins = 100; // B spent their gold mid-trade (the classic scam window)
const aInvPre = JSON.stringify(psA.inventory), aCoinsPre = psA.coins;
wss.a.sent.length = 0;
await cmd(wss.b, 'trade2_confirm');
st = lastState(wss.a);
check('shortfall at commit cancels with NO partial application', st.state === 'cancelled' && st.reason === 'insufficient:' + P('b') && JSON.stringify(psA.inventory) === aInvPre && psA.coins === aCoinsPre && psB.coins === 100 && room._trades2.size === 0, st && st.reason);

// ── 7. cancel / disconnect / TTLs ──
psB.coins = 1000;
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_cancel');
check('unilateral cancel notifies the other side', lastState(wss.b).state === 'cancelled' && room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
room._trade2OnDisconnect(P('a'));
check('disconnect cancels the session', room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
const live = room._t2SessionFor(P('a'));
live.ts = Date.now() - TRADE2.SESSION_TTL - 1000;
room._tickTrades2(Date.now());
check('idle session swept by the tick', room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
room._t2Invites.set(P('a') + '>' + P('b'), Date.now() - TRADE2.INVITE_TTL - 1000);
wss.b.sent.length = 0;
await cmd(wss.b, 'trade2_open', { target: P('a') });
check('expired invite does not complete (fresh invite instead)', room._trades2.size === 0 && lastState(wss.b).state === 'invited');
await cmd(wss.b, 'trade2_cancel');

// ── 8. deny-list ──
room.eventBuffer.length = 0;
await cmd(wss.c, 'trade2_state', { state: 'done', settled: true });
await cmd(wss.c, 'trade2_invite', { from: P('c') });
check('forged trade2_state / trade2_invite dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'trade2_state' || e.type === 'trade2_invite').length === 0, room.eventBuffer.map((e) => e.type));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
