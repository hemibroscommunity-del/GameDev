/* ═══ v2.3.2476: THE STORE'S ONE DOOR TO THE WORKER ═══
 *
 * Every store call needs the same three things -- the API base, the room
 * the session actually belongs to, and this session's own economy token --
 * and there are now three callers (the item card's Sell button, the Store
 * panel, and the panel's own refresh).  The Exchange grew its copy of this
 * plumbing inline three times over; one module instead.
 *
 * WHY THE ROOM IS IN EVERY URL (v2.3.1118, ExchangePanel's note): escrow
 * mutates the wallet held by ONE Durable Object.  A `?room=qa1` tester's
 * listing has to land in the DO that holds their blob, not brotown-1's.
 *
 * WHY THE TOKEN IS IN EVERY MUTATING CALL (v2.3.1178): player ids are
 * public -- they are broadcast on join -- so "is that player online" was
 * never authentication.  The worker validates the x-bt-auth header against
 * the live session of the id the request claims to act for, and that token
 * only ever reaches the one socket it was minted for.
 *
 * Every function here resolves to the worker's own answer object, or to a
 * `{ ok: false, error }` of our own if the network never got there.  No
 * caller ever applies a credit itself: the goods and the gold arrive on
 * the authoritative player_state echo, which is the whole point of the
 * server-settled store (handoff rule zero). */

import { BT_API_BASE } from '@/networking/index.js';

function S() {
  try { return window._gameState && window._gameState.current; } catch (e) { return null; }
}

function room() {
  try { return encodeURIComponent((S() && S()._currentRoom) || 'brotown-1'); } catch (e) { return 'brotown-1'; }
}

/* Is this worker running a store at all?  Read straight off _serverCaps so
   the caps-audit suite can see the gate (server/test/caps-audit.test.mjs).
   Against an older worker there is no /api/store route, so an ungated
   button would post into a 404 -- see join.js's note on the flag. */
export function storeEnabled() {
  const s = S();
  return !!(s && s._serverCaps && s._serverCaps.store);
}

/* v2.3.2531: ...and is it running GEAR listings?  Its own narrow cap,
   not a widening of `store`: an older worker knows nothing about
   `kind: 'gear'` and refuses the listing, so a Sell button on an armour
   card would take the piece off the screen and put it nowhere.  It is
   also the owner's kill switch — live-ops can write `storeGear: false`
   and every gear Sell button in the game goes away on the next join
   (join.js spreads the live flags last over the baked caps). */
export function storeGearEnabled() {
  const s = S();
  return !!(s && s._serverCaps && s._serverCaps.storeGear);
}

/* v2.3.2551: ...and can it be told WHICH piece by its server-assigned id
   (`gid`) rather than by a selector?  Its own narrow cap again, and for
   the same reason (TRAPS #9, the caps.gems lesson): a v2.3.2531 worker
   advertises `storeGear` and knows nothing about `gid` -- it would go
   looking for `body.sel`, find none, and answer "Invalid item".  So the
   id only goes up when a worker has said it understands one; otherwise
   the selector this client has always sent goes up instead, and the
   worker resolves it against its own list exactly as before.

   This gates only HOW the piece is named.  The ownership gate itself
   (`_gearSellable`) runs on both paths, so an old client is not selling
   anything a new one cannot -- it is just naming it less precisely. */
export function storeGearRefEnabled() {
  const s = S();
  return !!(s && s._serverCaps && s._serverCaps.storeGearRef);
}

/* ═══ v2.3.2621: ...and does it carry per-listing message threads? ═══
 * Narrow, and MANDATORY rather than a nicety. An older worker has no case for
 * `store_dm` / `store_dm_open`, so both would fall through to its default
 * branch and be REBROADCAST to the whole room -- a private haggle over a
 * sword shouted at everybody, which is the worst possible failure and the
 * same one chatlanes.js argues about for /w. So the icon must not exist to be
 * tapped against such a worker. */
export function storeChatEnabled() {
  const s = S();
  return !!(s && s._serverCaps && s._serverCaps.storeChat);
}

/* The two store-chat types go over the WEBSOCKET, not the store's HTTP
   surface: they are a relay to another player's screen, which is what the
   socket is for, and the shim passes both through (wsClient.js). */
export function storeChatSend(type, payload) {
  const s = S();
  try { if (s && s.channel) s.channel.send({ type, payload }); } catch (e) { /* offline */ }
}

/* ═══ v2.3.2623: ...and can a buyer make a gold OFFER on a listing? ═══
 * Narrow and mandatory. An older worker has no case for `store_offer`, so
 * the request falls through to its default branch and is rebroadcast as
 * chatter: the buyer sees their offer "sent", no gold moves, and no seller
 * can ever accept it. A money control that silently does nothing is worse
 * than an absent one, so the offer box must not exist against a worker that
 * cannot settle it. */
export function storeOfferEnabled() {
  const s = S();
  return !!(s && s._serverCaps && s._serverCaps.storeOffer);
}

export function storeMyId() {
  const s = S();
  return (s && s.myId) || null;
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const s = S();
  if (s && s._httpToken) h['x-bt-auth'] = s._httpToken;
  return h;
}

async function post(path, body) {
  try {
    const res = await fetch(BT_API_BASE + '/api/store' + path + '?room=' + room(), {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...body, playerId: storeMyId() }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: 'No answer from the store' };
  }
}

export async function storeBrowse(cat, cursor, limit) {
  try {
    const q = '?room=' + room()
      + (cat && cat !== 'all' ? '&cat=' + encodeURIComponent(cat) : '')
      + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')
      + (limit ? '&limit=' + limit : '');
    const res = await fetch(BT_API_BASE + '/api/store/browse' + q);
    return await res.json();
  } catch (e) { return { ok: false, error: 'No answer from the store' }; }
}

export async function storeMine() {
  try {
    const res = await fetch(BT_API_BASE + '/api/store/mine?room=' + room()
      + '&playerId=' + encodeURIComponent(storeMyId() || ''));
    return await res.json();
  } catch (e) { return { ok: false, error: 'No answer from the store' }; }
}

/* kind 'item'  -> { invKey, qty, price }
   kind 'weapon'-> { stashIndex, price }
   kind 'gear'  -> { field, gid, price }              (v2.3.2551, caps.storeGearRef)
                -> { field, sel, hint, price }        (v2.3.2531, older workers)
   The worker takes the goods from ITS OWN copy of your bag or stash; what
   goes up here only names which one (handoff rule 16).

   v2.3.2551: a piece the worker MINTED carries its `gid`, and naming it
   by that id is exact -- it finds the receipt directly, including for a
   piece the worker's own stash snapshot has not adopted yet.  The
   selector below is what an older worker understands, and is still sent
   to one.  Either way the worker answers a refusal with a stable
   `reason` (gearSellReason.js) so the player is told WHY.

   GEAR IS NAMED DIFFERENTLY FROM A WEAPON, and the difference matters.
   `weaponStash` is the server's list and this client mirrors it off the
   player_state echo, so index 2 means the same weapon on both sides.  The
   gear stashes are the other way round for now: the client is still the
   authority for its own (gear-stash.md, "What this does NOT solve") and
   the server holds a snapshot that drifts out of order as you rearrange.
   An index would therefore point at whatever happens to sit there on the
   worker's side — a different piece from the one you tapped.  So `sel` is
   the piece's own identifying fields and the WORKER builds the lookup key
   from them, against its own list; `hint` is our index, believed only if
   the worker's own entry at that position agrees.  `sel` is a selector
   and never the goods: what is escrowed is the worker's own copy. */
export const storeList = (body) => post('/list', body);
export const storeBuy = (listingId) => post('/buy', { listingId });
export const storeBid = (listingId, amount) => post('/bid', { listingId, amount });
export const storeAccept = (listingId) => post('/accept', { listingId });

export async function storeCancel(listingId) {
  try {
    const res = await fetch(BT_API_BASE + '/api/store/cancel?room=' + room()
      + '&id=' + encodeURIComponent(listingId)
      + '&playerId=' + encodeURIComponent(storeMyId() || ''), {
      method: 'DELETE',
      headers: (S() && S()._httpToken) ? { 'x-bt-auth': S()._httpToken } : undefined,
    });
    return await res.json();
  } catch (e) { return { ok: false, error: 'No answer from the store' }; }
}
