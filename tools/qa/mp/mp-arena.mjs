/* The arena: queue, entry-fee escrow, shared queue state, and the auth gate.
 *
 * THE UI IS CURRENTLY UNREACHABLE, for the same reason the marketplace is: the
 * arena lives in PartyPanel, which renders under buildingPanel === 'party' (the
 * TAVERN), and no town building can be entered since v2.3.823 force-set
 * S.nearBuilding = null.  So the panel half SKIPS with a reason and the queue
 * machinery — the part that moves real gold — is exercised from inside each
 * player's own browser session, using the same endpoint and `x-bt-auth` token
 * the panel uses.
 *
 * Not asserted here: a full tournament to a champion.  That needs four
 * gladiators and a 60 s gathering window, and the matches themselves ride the
 * duel machine, which mp-duel already covers end to end.
 */
import * as H from './harness.mjs';

function arena(P, method, path, body) {
  return P.page.evaluate(async ({ m, p, b }) => {
    const S = window._gameState.current;
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const sep = p.includes('?') ? '&' : '?';
    const headers = { 'Content-Type': 'application/json' };
    if (S._httpToken) headers['x-bt-auth'] = S._httpToken;
    const res = await fetch(`${base}/api/arena${p}${sep}room=${room}`,
      b ? { method: m, headers, body: JSON.stringify(b) } : { method: m, headers });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    return { status: res.status, json };
  }, { m: method, p: path, b: body || null });
}

const ENTRY_FEE = 100;

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Gladius', nameB: 'Murmillo' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── the UI half, if it is reachable at all ── */
  const TAVERN = 6;   // TOWN_BUILDINGS[6], action 'party' — the arena screen
  if (await H.buildingReachable(A, TAVERN)) {
    rec.ok('the Tavern (arena) building can be entered', true);
  } else {
    rec.skip('the arena panel can be opened from town',
      'no town building is reachable: S.nearBuilding is force-set to null (v2.3.823), '
      + 'so PartyPanel has no entry point. Server-side queue still checked below.');
  }

  await H.grant(wsPort, aId, 'gold', { amount: 500 });
  await H.grant(wsPort, bId, 'gold', { amount: 500 });
  await A.page.waitForTimeout(1500);
  const coins = async (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
  const aCoins0 = await coins(A), bCoins0 = await coins(B);
  rec.ok('both gladiators can afford the entry fee', aCoins0 >= ENTRY_FEE && bCoins0 >= ENTRY_FEE,
    { aCoins0, bCoins0 });

  /* ── joining takes the entry fee ── */
  const joinA = await arena(A, 'POST', '/join', { playerId: aId, playerName: 'Gladius' });
  rec.ok('a player can join the arena queue',
    joinA.status === 200 && joinA.json && joinA.json.ok === true, joinA);
  await A.page.waitForTimeout(1500);
  const aCoins1 = await coins(A);
  rec.ok('joining escrows the 100g entry fee', aCoins1 === aCoins0 - ENTRY_FEE, { aCoins0, aCoins1 });

  /* ── the queue is SHARED: the other player's browser sees the entrant ── */
  const status = await arena(B, 'GET', '/status');
  const q = ((status.json || {}).queue) || [];
  rec.ok("the other player's browser sees the queue",
    q.some((p) => p.playerId === aId), { queueSize: (status.json || {}).queueSize, q });

  /* ── double-joining is refused, and does not double-charge ── */
  const again = await arena(A, 'POST', '/join', { playerId: aId, playerName: 'Gladius' });
  rec.ok('joining twice is refused', again.json && again.json.ok === false, again.json);
  await A.page.waitForTimeout(1200);
  rec.ok('the refused re-join took no second fee', (await coins(A)) === aCoins1,
    { now: await coins(A), expected: aCoins1 });

  /* ── a forged join cannot spend someone else's gold ──
     v2.3.1178: playerId is public, so without the token gate anyone could
     debit any online player's 100g by claiming their id. */
  const forged = await arena(B, 'POST', '/join', { playerId: aId, playerName: 'Gladius' });
  rec.ok("a join forged in another player's name is refused",
    forged.status === 403 && forged.json && forged.json.ok === false, forged);

  /* ── both queued, then leaving refunds ── */
  const joinB = await arena(B, 'POST', '/join', { playerId: bId, playerName: 'Murmillo' });
  rec.ok('a second gladiator can queue', joinB.json && joinB.json.ok === true, joinB.json);
  const status2 = await arena(A, 'GET', '/status');
  rec.ok('the queue holds both gladiators', ((status2.json || {}).queueSize || 0) >= 2,
    (status2.json || {}).queueSize);

  const left = await arena(B, 'POST', '/leave', { playerId: bId });
  rec.ok('a gladiator can leave the queue', left.json && left.json.ok === true, left.json);
  await B.page.waitForTimeout(2000);
  rec.ok('leaving refunds the entry fee', (await coins(B)) === bCoins0,
    { now: await coins(B), expected: bCoins0 });

  /* ── results are server-observed; a client cannot declare a winner ──
     v2.3.1126 closed this: the old client-claimed winner was a forgery hole. */
  const claim = await arena(A, 'POST', '/result', { winnerId: aId });
  rec.ok('a client cannot declare itself the champion',
    claim.json && claim.json.ok === false, claim.json);

  await A.ctx.close(); await B.ctx.close();
}
