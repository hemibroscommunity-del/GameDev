/* ═══ v2.3.5817 (card RV, PR 17; step 11.5, RT-3 P1): A PLAYER'S BIDS, TO THAT PLAYER ONLY ═══
 *
 * `GET /api/store/mine?playerId=` answered anyone with that player's bids
 * (what they bid on, how much, when); a player id is on every board.  Now
 * `bidding` comes back only to a request carrying that player's live session
 * token (`t`, which the page's action door adds to this GET), else empty; the
 * listings stay (each is on the public browse anyway).  `minebids: false`:
 * as before.
 *
 *   1. no token: no bids;
 *   2. another player's token: no bids;
 *   3. the player's own token: their bids;
 *   4. the listings are answered either way; an old cached phone that never
 *      declared the token is answered as httpauth.js answers its POSTs;
 *   5. the page's action door puts the token in the query of this GET (and
 *      no header);
 *   6. `minebids: false`: every bid, as before.
 *
 * Red on main before this change: checks 1, 2 and 5 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ''); }
}
const A = 'bp_rvmineb01', B = 'bp_rvmineb02', C = 'bp_rvmineb03';

async function setup(flags, opts = {}) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const wa = fakeWs('a'), wb = fakeWs('b');
  await join(room, wa, A, { loginTaken: true, data: { x: 100, y: 100, z: 'town' } });
  await join(room, wb, B, { loginTaken: true, data: { x: 100, y: 100, z: 'town' } });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  /* today's phone declares the token at its join (wsClient.js `httpAuth:
     true`); testroom's join does not, so mark the two sessions as it would */
  for (const [, s] of room.sessions) if (s && (s.id === A || s.id === B)) s.httpAuthEnforced = !opts.oldPhone;
  await room._stEnsureIndex();
  const now = Date.now();
  room._stIndex.set('L_rvmb_1', { id: 'L_rvmb_1', sellerId: C, sellerName: 'C', kind: 'item', askPrice: 900, createdAt: now, expiresAt: now + 864e5,
    disp: { name: 'Stick' }, topBid: { bidderId: A, bidderName: 'A', amount: 400, at: now } });
  room._stIndex.set('L_rvmb_2', { id: 'L_rvmb_2', sellerId: A, sellerName: 'A', kind: 'item', askPrice: 50, createdAt: now, expiresAt: now + 864e5, disp: { name: 'Rock' } });
  const tokOf = (pid) => { for (const [, s] of room.sessions) if (s.id === pid) return s.httpToken; return null; };
  const ask = async (t) => {
    const res = await room._storeFetch(new Request('https://x/api/store/mine?room=brotown-1&playerId=' + A + (t ? '&t=' + encodeURIComponent(t) : '')));
    return res.json();
  };
  return { room, ask, tokOf };
}

{
  const { ask, tokOf } = await setup(null);
  const none = await ask(null), other = await ask(tokOf(B)), own = await ask(tokOf(A));
  check('1. no token: no bids', none.ok && Array.isArray(none.bidding) && none.bidding.length === 0, none.bidding);
  check('2. another player\'s token: no bids', other.ok && other.bidding.length === 0, other.bidding);
  check('3. the player\'s own token: their bid', own.ok && own.bidding.length === 1, own.bidding);
  check('4. the listings answered either way', none.listings.length === 1 && own.listings.length === 1, { none: none.listings.length, own: own.listings.length });
}
{
  /* the page's door: the row's GET carries the token as `t`, and no header */
  const { act, setActionTransport } = await import('../../src/game/actions.js');
  let seen = null;
  setActionTransport({ send: () => true, http: async (path, init) => { seen = { path, init }; return new Response('{}'); }, token: () => 'tok-123' });
  await act('http:/api/store/mine', {}, { query: 'room=brotown-1&playerId=' + A });
  const hdr = seen && seen.init && seen.init.headers ? Object.keys(seen.init.headers) : [];
  check('5. the page\'s door puts the token in this GET\'s query, and sends no header', !!seen && /[?&]t=tok-123(&|$)/.test(seen.path) && hdr.length === 0, seen);
}
{
  /* an old cached phone that never declared the token: answered as the
     POSTs answer it (httpauth.js's rollout window), its own bids shown */
  const { ask } = await setup(null, { oldPhone: true });
  const none = await ask(null);
  check('4b. an old phone that never declared the token: as httpauth.js holds a POST (shown)', none.bidding.length === 1, none.bidding);
}
{
  const { ask } = await setup({ minebids: false });
  const none = await ask(null);
  check('6. `minebids: false`: every bid, as before', none.bidding.length === 1, none.bidding);
}

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
