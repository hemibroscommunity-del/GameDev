/* HTTP economy-endpoint auth test (v2.3.1176; spec in
 * docs/specs/http-auth.md).  Player ids are public (player_join /
 * track broadcasts), so the old "is that playerId online" gate on the
 * market/arena HTTP surfaces authenticated nothing: a forged
 * /api/market/place with a victim's playerId escrowed the victim's
 * stash weapon out at any price (live item theft), and a forged
 * /api/arena/join debited the victim's 100g entry fee.  Checks:
 *   1. state_sync delivers a private per-session httpToken +
 *      caps.httpAuth; tokens are per-session (differ across players).
 *   2. Forged market place (victim playerId + attacker token) is
 *      rejected; nothing escrowed.  Same with no token at all.
 *   3. The owner's own token places fine (escrow proceeds).
 *   4. Cancel is gated the same way.
 *   5. Arena join/leave gated: forged join rejected with no debit;
 *      valid join debits the fee.
 *   6. Rollout grace: a legacy session (no httpAuth declared on join)
 *      still works tokenless, but a WRONG token is always rejected.
 *   7. Rejoin rotates the token: the old token stops working.
 *   8. Outer-worker router: /api/leaderboard is public-read-only now
 *      (POST /update was an unauthenticated row forge; the GameRoom's
 *      internal reportToLeaderboard uses the DO binding directly and
 *      doesn't pass through the router).
 */
import worker, { GameRoom } from '../src/index.js';

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

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, opts) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, httpAuth: true, data: { x: 0, y: 0, z: 'town' }, ...(opts || {}) }));
}
const tokenOf = (ws) => {
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  return sync && sync.httpToken;
};
const place = (playerId, stashIndex, token) => room._marketFetch(new Request('https://x/api/market/place', {
  method: 'POST',
  headers: token ? { 'x-bt-auth': token } : {},
  body: JSON.stringify({ type: 'sell', category: 'weapon', subtype: 'sword', tierKey: 'iron', price: 1, tierLabel: 'Iron', playerName: 'T', playerId, stashIndex }),
}));
const cancel = (orderId, playerId, token) => room._marketFetch(new Request(
  'https://x/api/market/cancel?id=' + orderId + '&playerId=' + playerId,
  { method: 'DELETE', headers: token ? { 'x-bt-auth': token } : {} }));
const arenaPost = (path, playerId, token) => room._arenaFetch(new Request('https://x/api/arena/' + path, {
  method: 'POST',
  headers: token ? { 'x-bt-auth': token } : {},
  body: JSON.stringify({ playerId, name: 'T' }),
}));

const wsV = fakeWs('victim'); const wsA = fakeWs('attacker');
await join(wsV, 'bp_ha_victim');
await join(wsA, 'bp_ha_attacker');
const victim = room.playerState['bp_ha_victim'];
victim.weaponStash = [{ name: 'Stolen Sword', tierMult: 1.0, dmg: 5 }];
victim.coins = 500;

// ── 1. token delivery ──
const tokV = tokenOf(wsV); const tokA = tokenOf(wsA);
check('state_sync delivers a session httpToken', typeof tokV === 'string' && tokV.length >= 16, tokV);
check('state_sync advertises caps.httpAuth', wsV.sent.find((m) => m.type === 'state_sync').caps.httpAuth === true);
check('tokens are per-session', typeof tokA === 'string' && tokA !== tokV);

// ── 2. forged place rejected ──
const forged = await place('bp_ha_victim', 0, tokA);
check('place with victim playerId + attacker token rejected (403)', forged.status === 403, forged.status);
const forgedNoTok = await place('bp_ha_victim', 0, null);
check('place with victim playerId + no token rejected', forgedNoTok.status === 403, forgedNoTok.status);
check('victim stash untouched by forged placements', victim.weaponStash.length === 1, victim.weaponStash);

// ── 3. owner's token places fine ──
const own = await place('bp_ha_victim', 0, tokV);
const ownBody = JSON.parse(await own.text());
check('place with the owner\'s own token succeeds', own.status === 200 && ownBody.ok === true, ownBody);
check('escrow proceeded (weapon left the stash)', victim.weaponStash.length === 0, victim.weaponStash);

// ── 4. cancel gated the same way ──
const forgedCxl = await cancel(ownBody.order.id, 'bp_ha_victim', tokA);
check('forged cancel rejected', forgedCxl.status === 403, forgedCxl.status);
check('order survives the forged cancel', state._store.has('mkt_order:' + ownBody.order.id));
const ownCxl = await cancel(ownBody.order.id, 'bp_ha_victim', tokV);
const ownCxlBody = JSON.parse(await ownCxl.text());
check('owner\'s cancel succeeds and refunds', ownCxl.status === 200 && ownCxlBody.ok === true && victim.weaponStash.length === 1, ownCxlBody);

// ── 5. arena join/leave gated ──
const coinsBefore = victim.coins;
const forgedArena = await arenaPost('join', 'bp_ha_victim', tokA);
check('forged arena join rejected (403)', forgedArena.status === 403, forgedArena.status);
check('no entry fee debited by the forged join', victim.coins === coinsBefore, victim.coins);
const ownArena = await arenaPost('join', 'bp_ha_victim', tokV);
const ownArenaBody = JSON.parse(await ownArena.text());
check('owner\'s arena join succeeds', ownArena.status === 200 && ownArenaBody.ok === true, ownArenaBody);
check('entry fee debited on the real join', victim.coins === coinsBefore - 100, victim.coins);
const forgedLeave = await arenaPost('leave', 'bp_ha_victim', null);
check('forged arena leave rejected', forgedLeave.status === 403, forgedLeave.status);
const ownLeave = await arenaPost('leave', 'bp_ha_victim', tokV);
check('owner\'s arena leave succeeds + refunds', ownLeave.status === 200 && victim.coins === coinsBefore, victim.coins);

// ── 6. legacy rollout grace ──
const wsL = fakeWs('legacy');
room.sessions.set(wsL, baseSession());
await room.webSocketMessage(wsL, JSON.stringify({ type: 'join', id: 'bp_ha_legacy', name: 'L', phrase: 'p-l', data: { x: 0, y: 0, z: 'town' } }));
const legacy = room.playerState['bp_ha_legacy'];
legacy.weaponStash = [{ name: 'Legacy Sword', tierMult: 1.0, dmg: 5 }];
const legacyPlace = await place('bp_ha_legacy', 0, null);
const legacyBody = JSON.parse(await legacyPlace.text());
check('legacy session (no httpAuth on join) still places tokenless', legacyPlace.status === 200 && legacyBody.ok === true, legacyBody);
legacy.weaponStash = [{ name: 'Legacy Sword 2', tierMult: 1.0, dmg: 5 }];
const legacyForged = await place('bp_ha_legacy', 0, 'wrong-token');
check('a WRONG token is rejected even for a legacy session', legacyForged.status === 403, legacyForged.status);
await cancel(legacyBody.order.id, 'bp_ha_legacy', null);

// ── 7. rejoin rotates the token ──
const wsV2 = fakeWs('victim-rejoin');
await join(wsV2, 'bp_ha_victim');
const tokV2 = tokenOf(wsV2);
check('rejoin mints a fresh token', typeof tokV2 === 'string' && tokV2 !== tokV);
room.playerState['bp_ha_victim'].weaponStash = [{ name: 'Rotated Sword', tierMult: 1.0, dmg: 5 }];
const staleTok = await place('bp_ha_victim', 0, tokV);
check('the pre-rejoin token stops working', staleTok.status === 403, staleTok.status);

// ── 8. outer router: leaderboard is public-read-only ──
{
  let forwarded = 0;
  const env = {
    LEADERBOARD: { idFromName: () => 'g', get: () => ({ fetch: async () => { forwarded++; return new Response('{"ok":true}'); } }) },
    GAME_ROOM: { idFromName: () => 'r', get: () => ({ fetch: async () => new Response('{}') }) },
    FEEDBACK: { idFromName: () => 'f', get: () => ({ fetch: async () => new Response('{}') }) },
  };
  const post = await worker.fetch(new Request('https://x/api/leaderboard/update', { method: 'POST', body: '{"playerId":"bp_forged","level":999}' }), env);
  check('public POST /api/leaderboard/update blocked (405)', post.status === 405 && forwarded === 0, post.status);
  const get = await worker.fetch(new Request('https://x/api/leaderboard/top?category=level'), env);
  check('public GET /api/leaderboard still forwarded', get.status === 200 && forwarded === 1, { status: get.status, forwarded });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
