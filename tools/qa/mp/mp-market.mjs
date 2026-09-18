/* The player marketplace: escrow, the shared order book, and the auth gate.
 *
 * THE UI IS CURRENTLY UNREACHABLE.  ExchangePanel only renders under
 * buildingPanel === 'exchange', which only enterBuilding() sets, which only the
 * `nearBuilding !== null` prompt calls — and BroTown.jsx force-sets
 * S.nearBuilding = null every frame (v2.3.823, "town buildings have no in-game
 * art yet").  Verified by standing dead-centre on all twelve building rects:
 * no prompt, no panel.  So the panel-driving half of this scenario SKIPS with a
 * reason and will start running by itself if the proximity scan comes back.
 *
 * What still runs is the part that would break silently: the order book itself,
 * exercised from inside each player's own browser session, with the same
 * endpoint, the same `x-bt-auth` session token and the same room the panel uses
 * (ExchangePanel.jsx). That is the real economy path — two real identities
 * against the real Durable Object — just triggered without the click.
 *
 * Buy orders, not sell orders, deliberately: a sell escrows a WEAPON out of the
 * stash, and the operator grant endpoint cannot mint weapons ("weapons
 * unsupported v1"). A buy escrows gold, which can be granted, so the whole
 * escrow → list → cancel → refund cycle is reachable honestly.
 */
import * as H from './harness.mjs';

/* Issue the panel's own request from inside the player's page. */
function mkt(P, method, path, body) {
  return P.page.evaluate(async ({ m, p, b }) => {
    const S = window._gameState.current;
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const sep = p.includes('?') ? '&' : '?';
    const headers = { 'Content-Type': 'application/json' };
    if (S._httpToken) headers['x-bt-auth'] = S._httpToken;
    const res = await fetch(`${base}/api/market${p}${sep}room=${room}`,
      b ? { method: m, headers, body: JSON.stringify(b) } : { method: m, headers });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    return { status: res.status, json };
  }, { m: method, p: path, b: body || null });
}

/* v2.3.2476: the same trick for the auction house's own surface.  Issued
   from inside the player's page for the same reason: the session token the
   worker checks is minted for THAT socket and lives nowhere else. */
function st(P, method, path, body) {
  return P.page.evaluate(async ({ m, p, b }) => {
    const S = window._gameState.current;
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const sep = p.includes('?') ? '&' : '?';
    const headers = { 'Content-Type': 'application/json' };
    if (S._httpToken) headers['x-bt-auth'] = S._httpToken;
    const res = await fetch(`${base}/api/store${p}${sep}room=${room}`,
      b ? { method: m, headers, body: JSON.stringify(b) } : { method: m, headers });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    return { status: res.status, json };
  }, { m: method, p: path, b: body || null });
}

const ORDER = (playerId, playerName, price) => ({
  type: 'buy', category: 'weapon', subtype: 'sw', tierKey: 'iron',
  tierLabel: 'Iron', price, playerId, playerName,
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Seller', nameB: 'Bidder' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── the UI half, if it is reachable at all ── */
  const MARKETPLACE = 0;   // TOWN_BUILDINGS[0]
  if (await H.buildingReachable(A, MARKETPLACE)) {
    rec.ok('the Marketplace building can be entered', true);
  } else {
    /* v2.3.2078: the reason given here was stale and blamed the wrong thing.
       S.nearBuilding is NOT force-set to null any more — BroTown.jsx computes
       it every frame from buildingPropNear(zone, x, y, 95), matching a prop's
       `action` against the BUILDINGS table, and the note there says so ("this
       restores access to panels that have been UNREACHABLE for the whole time
       the prompt was off").
       The real reason is that no PLACED town prop carries action 'exchange'.
       Of the twelve buildings, exactly two have a door in town today — the
       forge and the auction house — because the props that carry the other
       ten actions are the v16 set still held behind propIsPlaced, or tiles
       from the procedural town that no longer exists. That is a content gap
       for the owner, not something a test can route around. */
    rec.skip('the Marketplace panel can be opened from town',
      'no placed town prop carries action \'exchange\', so ExchangePanel has no '
      + 'door — 2 of 12 buildings are reachable in town (forge, auction-house). '
      + 'Server-side order book still checked below.');
  }

  /* ── the players need gold to bid with ── */
  await H.grant(wsPort, aId, 'gold', { amount: 800 });
  await H.grant(wsPort, bId, 'gold', { amount: 800 });
  await A.page.waitForTimeout(1500);
  const coins = async (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
  const aCoins0 = await coins(A), bCoins0 = await coins(B);
  rec.ok('both traders are funded', aCoins0 >= 800 && bCoins0 >= 800, { aCoins0, bCoins0 });

  /* ── the session token exists (the v2.3.1178 item-theft fix depends on it) ── */
  const aTok = await H.readState(A, (S) => !!S._httpToken);
  rec.ok('the client holds a market session token', aTok);

  /* ── placing a buy order escrows the gold ── */
  const placed = await mkt(A, 'POST', '/place', ORDER(aId, 'Seller', 120));
  rec.ok('a buy order is accepted', placed.status === 200 && placed.json && placed.json.ok === true, placed);
  await A.page.waitForTimeout(1500);
  const aCoins1 = await coins(A);
  rec.ok('placing a buy order escrows the gold', aCoins1 === aCoins0 - 120, { aCoins0, aCoins1 });

  /* ── and the book is SHARED: the other player can see it ── */
  const seen = await mkt(B, 'GET', '/orders?category=weapon&subtype=sw&tier=iron');
  const mine = ((seen.json || {}).orders || []).filter((o) => o.playerId === aId);
  rec.ok("the other player's browser sees the order", mine.length === 1 && mine[0].price === 120,
    { count: ((seen.json || {}).orders || []).length, mine });
  const orderId = mine.length ? mine[0].id : null;

  /* ── a player may not cancel someone ELSE's order ──
     v2.3.1178: playerId is public (it rides player_join and track), so before
     the token gate a forged cancel could delist anyone's orders. */
  if (orderId) {
    const forged = await mkt(B, 'DELETE', `/cancel?id=${orderId}&playerId=${encodeURIComponent(aId)}`);
    rec.ok("a forged cancel of another player's order is refused",
      forged.status === 403 && forged.json && forged.json.ok === false, forged);
    await A.page.waitForTimeout(1200);
    rec.ok('the refused cancel did not delist or refund anything',
      (await coins(A)) === aCoins1, { coins: await coins(A), expected: aCoins1 });
  }

  /* ── the owner CAN cancel, and gets the escrow back ── */
  if (orderId) {
    const cancelled = await mkt(A, 'DELETE', `/cancel?id=${orderId}&playerId=${encodeURIComponent(aId)}`);
    rec.ok('the owner can cancel their own order',
      cancelled.status === 200 && cancelled.json && cancelled.json.ok === true, cancelled);
    await A.page.waitForTimeout(1800);
    rec.ok('cancelling refunds the escrowed gold', (await coins(A)) === aCoins0,
      { now: await coins(A), expected: aCoins0 });
    const after = await mkt(B, 'GET', '/orders?category=weapon&subtype=sw&tier=iron');
    rec.ok('the cancelled order leaves the shared book',
      !((after.json || {}).orders || []).some((o) => o.id === orderId));
  }

  /* ── you cannot bid gold you do not have ── */
  const broke = await mkt(B, 'POST', '/place', ORDER(bId, 'Bidder', 999999));
  rec.ok('an unaffordable bid is refused', broke.json && broke.json.ok === false, broke.json);
  await B.page.waitForTimeout(1200);
  rec.ok('the refused bid took no gold', (await coins(B)) === bCoins0,
    { now: await coins(B), expected: bCoins0 });

  /* ═══════════════════════════════════════════════════════════════════
     v2.3.2476 — THE AUCTION HOUSE, the other shelf in the same room.
     Two real identities, the real Durable Object, the real HTTP surface:
     one lists something out of their bag, the other bids on it, is
     outbid-refunded, and finally buys one outright.  Stackables rather
     than weapons for the same reason the order-book half above bids
     instead of sells — the operator grant cannot mint a weapon.
     ═══════════════════════════════════════════════════════════════════ */
  const capOn = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.store));
  rec.ok('the worker advertises the store capability', capOn);

  await H.grant(wsPort, aId, 'item', { invKey: 'wood_oak', count: 6 });
  await A.page.waitForTimeout(1500);
  /* The whole bag comes back and the key is picked HERE: the reader runs
     inside the page, so a closed-over variable is not in scope there. */
  const held = async (P, k) => {
    const inv = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
    return (inv && inv[k]) || 0;
  };
  const aWood0 = await held(A, 'wood_oak');
  rec.ok('the seller has something to sell', aWood0 >= 6, { aWood0 });

  const listed = await st(A, 'POST', '/list', { playerId: aId, kind: 'item', invKey: 'wood_oak', qty: 2, price: 60 });
  rec.ok('a listing is accepted and settled server-side',
    listed.status === 200 && listed.json && listed.json.ok === true && listed.json.settled === true, listed.json);
  await A.page.waitForTimeout(1500);
  rec.ok('listing takes the goods out of the seller\'s bag now',
    (await held(A, 'wood_oak')) === aWood0 - 2, { before: aWood0, now: await held(A, 'wood_oak') });
  const listingId = listed.json && listed.json.listing && listed.json.listing.id;

  /* The shelf is shared, and what it says about the item is the SERVER's
     answer -- the request above named a key and a price and nothing else. */
  const shelf = await st(B, 'GET', '/browse?cat=crafting');
  const row = ((shelf.json || {}).listings || []).find((l) => l.id === listingId);
  rec.ok('the other player\'s browser sees the listing', !!row, shelf.json);
  rec.ok('...filed under the same category the bag would file it',
    !!(row && row.cat === 'crafting'), row);
  rec.ok('...described by the server, not by the seller\'s client',
    !!(row && row.disp && row.disp.invKey === 'wood_oak' && row.qty === 2 && row.askPrice === 60), row);

  const bCoinsPre = await coins(B);
  const bid = await st(B, 'POST', '/bid', { playerId: bId, listingId, amount: 25 });
  rec.ok('a bid is accepted', bid.json && bid.json.ok === true, bid.json);
  await B.page.waitForTimeout(1500);
  rec.ok('a bid holds the bidder\'s gold', (await coins(B)) === bCoinsPre - 25,
    { before: bCoinsPre, now: await coins(B) });

  /* Raising your own bid returns the first one -- the refund path an outbid
     player takes, driven by the only second bidder this scenario has. */
  const rebid = await st(B, 'POST', '/bid', { playerId: bId, listingId, amount: 40 });
  rec.ok('a higher bid replaces the standing one', rebid.json && rebid.json.ok === true, rebid.json);
  await B.page.waitForTimeout(1500);
  rec.ok('...and the bid it replaced is refunded, not held twice',
    (await coins(B)) === bCoinsPre - 40, { expected: bCoinsPre - 40, now: await coins(B) });

  /* A stranger cannot accept someone else's bid on someone else's listing. */
  const forgedAccept = await st(B, 'POST', '/accept', { playerId: aId, listingId });
  rec.ok('a forged accept (acting as the seller) is refused',
    forgedAccept.status === 403, forgedAccept);

  const aCoinsPre = await coins(A);
  const accepted = await st(A, 'POST', '/accept', { playerId: aId, listingId });
  rec.ok('the seller can take the top bid', accepted.json && accepted.json.ok === true && accepted.json.price === 40, accepted.json);
  await A.page.waitForTimeout(1800);
  rec.ok('the seller is paid the bid', (await coins(A)) === aCoinsPre + 40,
    { expected: aCoinsPre + 40, now: await coins(A) });
  rec.ok('the winner gets the goods', (await held(B, 'wood_oak')) >= 2, { now: await held(B, 'wood_oak') });
  rec.ok('the winner is not charged a second time', (await coins(B)) === bCoinsPre - 40,
    { expected: bCoinsPre - 40, now: await coins(B) });

  /* v2.3.2476: and the seller is TOLD.  The notice rides the mail the
     economy already has (source 'market'), so nothing new is on the wire --
     what is new is that it is readable without opening the chat log. */
  rec.ok('the seller sees a notice that it sold', await H.seesText(A, 'sold to'));

  /* ── buy now, and the token gate on the way ── */
  const listed2 = await st(A, 'POST', '/list', { playerId: aId, kind: 'item', invKey: 'wood_oak', qty: 1, price: 30 });
  const id2 = listed2.json && listed2.json.listing && listed2.json.listing.id;
  rec.ok('a second listing goes up', !!id2, listed2.json);
  const ownBuy = await st(A, 'POST', '/buy', { playerId: aId, listingId: id2 });
  rec.ok('you cannot buy your own listing', ownBuy.json && ownBuy.json.ok === false, ownBuy.json);
  const bCoinsPre2 = await coins(B);
  const bWoodPre = await held(B, 'wood_oak');
  const bought = await st(B, 'POST', '/buy', { playerId: bId, listingId: id2 });
  rec.ok('buy now settles', bought.json && bought.json.ok === true && bought.json.settled === true, bought.json);
  await B.page.waitForTimeout(1800);
  rec.ok('the buyer pays the asking price', (await coins(B)) === bCoinsPre2 - 30,
    { expected: bCoinsPre2 - 30, now: await coins(B) });
  rec.ok('...and receives the goods', (await held(B, 'wood_oak')) === bWoodPre + 1,
    { expected: bWoodPre + 1, now: await held(B, 'wood_oak') });

  /* ── taking a listing down returns it ── */
  const listed3 = await st(A, 'POST', '/list', { playerId: aId, kind: 'item', invKey: 'wood_oak', qty: 1, price: 99 });
  const id3 = listed3.json && listed3.json.listing && listed3.json.listing.id;
  const aWoodPre = await held(A, 'wood_oak');
  const takenDown = await st(A, 'DELETE', `/cancel?id=${encodeURIComponent(id3)}&playerId=${encodeURIComponent(aId)}`);
  rec.ok('a seller can take their listing down', takenDown.json && takenDown.json.ok === true, takenDown.json);
  await A.page.waitForTimeout(1800);
  rec.ok('...and the goods come back', (await held(A, 'wood_oak')) === aWoodPre + 1,
    { expected: aWoodPre + 1, now: await held(A, 'wood_oak') });

  await A.ctx.close(); await B.ctx.close();
}
