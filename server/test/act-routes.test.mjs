/* ═══ v2.3.5191: THE ACTION DOOR'S ROUTE WAY, AGAINST THE REAL ROUTES (card K PR 7.5) ═══
 *
 * The page's fetches of /api/ moved to act() (src/game/actions.js).  Its route
 * way sends the bytes the page sent before: a GET plain (no headers, no body),
 * a DELETE with no body, a body only on a POST (a request id on a `req` row),
 * the session's token in x-bt-auth only on an `auth` row.  This drives the REAL
 * act() through a transport that reaches a REAL GameRoom's routes (as
 * wsClient.js's reaches the worker) and asks the routes what they made of it:
 *
 *   1. the market's place, its list and its cancel: a POST with a request id,
 *      a plain GET, a DELETE;
 *   2. the arena's status and the store's browse answer a plain GET;
 *   3. a store buy of nothing is the route's own refusal, never the wire
 *      door's 400 (the request id in the body passes it);
 *   4. the token rides the economy routes only, and a forged one through the
 *      door is refused by the route (403: v2.3.1178's gate).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-15: act() sending the token on
 * every route -> FAIL 1 and 4; act() sending a JSON body on every route -> the
 * GET's Request throws (a red suite). */
import { GameRoom } from '../src/index.js';
import { act, setActionTransport } from '../../src/game/actions.js';
const store = new Map();
const state = { storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
  list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
  delete: async (k) => { store.delete(k); } }, getWebSockets: () => [], acceptWebSocket: () => {} };
const room = new GameRoom(state, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_act_http', name: 'T', phrase: 'p-x', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
const ps = room.playerState['bp_act_http'];
ps.weaponStash = [{ name: 'Http Axe', tierMult: 1, dmg: 5 }]; ps.coins = 0;
const ss = ws.sent.find((m) => m.type === 'state_sync');
const tok = (ss && typeof ss.httpToken === 'string') ? ss.httpToken : null;
const seen = [];
setActionTransport({ send: () => true, http: (path, init) => { seen.push({ path, init }); return room.fetch(new Request('https://x' + path, init)); }, token: () => tok });
let bad = 0; const ok = (n, c, d) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(d).slice(0, 300))); if (!c) bad++; };
const place = await (await act('http:/api/market/place', { type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, tierLabel: 'Mythic', playerName: 'T', playerId: 'bp_act_http', stashIndex: 0 }, { query: 'room=brotown-1' })).json();
ok('1 market place through act (body with reqId, token ' + (tok ? 'given' : 'none in state_sync') + ')', place.ok === true && /^rq-/.test(JSON.parse(seen[0].init.body).reqId), place);
const orders = await (await act('http:/api/market/orders', {}, { query: 'category=weapon&subtype=axe&tier=mythic&room=brotown-1' })).json();
ok('1 market orders: a plain GET, no headers', orders.ok === true && orders.orders.length === 1 && seen[1].init.headers === undefined, orders);
const cxl = await (await act('http:/api/market/cancel', {}, { query: 'id=' + place.order.id + '&playerId=bp_act_http&room=brotown-1' })).json();
ok('1 market cancel: a DELETE, no body', cxl.ok === true && seen[2].init.body === undefined, cxl);
const st = await (await act('http:/api/arena/status', {}, { query: 'playerId=bp_act_http' })).json();
ok('2 arena status GET answers', st && st.ok !== undefined, st);
const browse = await (await act('http:/api/store/browse', {}, { query: 'room=brotown-1' })).json();
ok('2 store browse GET answers', browse && browse.ok === true, browse);
const buy = await (await act('http:/api/store/buy', { listingId: 'nope', playerId: 'bp_act_http' }, { query: 'room=brotown-1' })).json();
ok('3 store buy of nothing: the route\'s own refusal, not the door\'s 400', buy && buy.error !== 'bad request', buy);
ok('4 the token rode the economy routes only', !!tok && seen[0].init.headers['x-bt-auth'] === tok && seen[2].init.headers['x-bt-auth'] === tok && !seen[1].init.headers && !seen[4].init.headers, seen.map((x) => x.init.headers));
/* a forged token is refused by the route (v2.3.1178), so the door's token is the one the route checks */
setActionTransport({ send: () => true, http: (path, init) => room.fetch(new Request('https://x' + path, init)), token: () => 'forged' });
const forged = await act('http:/api/market/place', { type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: 'bp_act_http', stashIndex: 0 }, { query: 'room=brotown-1' });
ok('4 a forged token through the door is refused by the route (403)', forged.status === 403, forged.status);
console.log(bad ? bad + ' FAILED' : 'all passed');
process.exit(bad ? 1 : 0);
