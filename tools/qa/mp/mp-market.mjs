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
       forge and the general store — because the props that carry the other
       ten actions are the v16 set still held behind propIsPlaced, or tiles
       from the procedural town that no longer exists. That is a content gap
       for the owner, not something a test can route around. */
    rec.skip('the Marketplace panel can be opened from town',
      'no placed town prop carries action \'exchange\', so ExchangePanel has no '
      + 'door — 2 of 12 buildings are reachable in town (forge, general-store). '
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

  await A.ctx.close(); await B.ctx.close();
}
