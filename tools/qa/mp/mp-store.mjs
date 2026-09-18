/* THE AUCTION HOUSE, THROUGH THE SCREEN (v2.3.2476).
 *
 * mp-market drives the store's HTTP surface directly and proves the money is
 * right.  This one proves a player can actually GET there and press the
 * things: walk to the auction house, open the player shelf, put something up
 * from the bag, and see it on the shelf a moment later.
 *
 * THE DOOR IS THE POINT OF THE FIRST HALF.  Twelve building panels are
 * written and only two have a prop on the current town map -- the forge and
 * the auction house (worldProps.js).  The MARKETPLACE building that opens
 * the old Exchange is one of the ten with no door at all, which is why
 * mp-market has skipped its UI half for versions.  So the store hangs off the
 * one building it belongs in AND can be entered from, and this scenario
 * walks it rather than poking a panel open: a door that stops existing has
 * to fail here.
 *
 * Walked, not teleported: movement.js rejects a jump and then treats every
 * later move as illegal too (see hopTo's note in the harness).
 */
import * as H from './harness.mjs';

/* The auction-house prop's own anchor (src/data/worldProps.js), and a
   standing spot in front of its door -- buildingPropNear() wants 95px. */
/* v2.3.2626: the door is read from worldProps.js now (H.doorOf), not
   hand-copied here.  Six scenarios each carried their own copy of
   {x:1290,y:855}; moving the auction house onto the plaza turned all six
   red at once, every failure being the test standing on empty cobble.
   H.doorOf also picks a cell you can actually STAND on -- the naive spot
   below this building's anchor is inside lamp-plaza-e's footprint. */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shopper', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  const capOn = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.store));
  rec.ok('the worker advertises the store capability', capOn);

  await H.grant(wsPort, myId, 'item', { invKey: 'wood_oak', count: 4 });
  await H.grant(wsPort, myId, 'gold', { amount: 400 });
  await P.page.waitForTimeout(1600);
  const bag0 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
  rec.ok('the seller has four logs to sell', (bag0.wood_oak || 0) >= 4, bag0);

  /* ═══ 1. THE ITEM CARD: SELL, AND THE ANCHOR DEMOTED ═══ */
  await H.openDest(P, 'Bag').catch(() => {});
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => window._itemDetailBus
    && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 4 }));
  await P.page.waitForTimeout(600);

  const texts = await H.buttonTexts(P);
  rec.ok('the item card offers Sell', texts.some((t) => /^sell$/i.test((t || '').trim())), texts);
  /* v2.3.2476: the anchor used to be a full-width button in this row,
     sitting among the actions as though pinning your own bag were one. */
  rec.ok('the full-width Anchor button is gone from the action row',
    !texts.some((t) => /anchor/i.test(t || '')), texts);

  const chip = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((el) => /pin to the top of the bag/i.test(el.getAttribute('aria-label') || ''));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  rec.ok('the anchor is a small header icon instead', !!(chip && chip.w <= 32 && chip.h <= 32), chip);

  const pinned = await P.page.evaluate(async () => {
    const b = [...document.querySelectorAll('button')]
      .find((el) => /pin to the top of the bag/i.test(el.getAttribute('aria-label') || ''));
    if (!b) return null;
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const on = !!(window._inventoryLocks && window._inventoryLocks.isLocked('wood_oak'));
    /* put it back so the rest of the scenario starts from a clean bag */
    const b2 = [...document.querySelectorAll('button')]
      .find((el) => /pin to the top of the bag/i.test(el.getAttribute('aria-label') || ''));
    if (b2) b2.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return on;
  });
  rec.ok('...and it still pins the item to the top of the bag', pinned === true, { pinned });

  /* ═══ 2. PUTTING IT UP ═══ */
  await H.clickText(P, 'Sell').catch(() => {});
  await P.page.waitForTimeout(500);
  rec.ok('the price sheet asks for a price', await H.seesText(P, 'Price in gold'));

  await P.page.locator('input[type="number"]').last().fill('75');
  await P.page.waitForTimeout(200);
  await H.clickText(P, 'Put it up').catch(() => {});
  await P.page.waitForTimeout(2200);

  const bag1 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
  rec.ok('listing takes the log out of the bag', (bag1.wood_oak || 0) === (bag0.wood_oak || 0) - 1,
    { before: bag0.wood_oak, after: bag1.wood_oak });

  const shelf = await P.page.evaluate(async () => {
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const res = await fetch(`${base}/api/store/browse?room=${room}`);
    return res.json();
  });
  const mine = ((shelf || {}).listings || []).filter((l) => l.sellerId === myId);
  rec.ok('the worker is holding the listing at the price that was typed',
    mine.length === 1 && mine[0].askPrice === 75 && mine[0].qty === 1, mine);

  /* ═══ 3. THE DOOR ═══ */
  await H.closeDest(P).catch(() => {});
  await P.page.waitForTimeout(400);
      const _door = await H.doorOf('auction-house');
      await H.hopTo(P, _door.x, _door.y);
  await P.page.waitForTimeout(700);
  const near = await H.readState(P, (S) => S.nearBuilding);
  rec.ok('standing at the auction house raises the enter prompt', near !== null && near !== undefined, { near });

  const entered = await P.page.locator('.bt-interact-prompt').first().isVisible().catch(() => false);
  rec.ok('the prompt is on screen', entered);
  if (entered) {
    /* ═══ v2.3.2624: A REAL TAP, NOT A SYNTHETIC mousedown (TRAPS §67/§88) ═══
       This line used to dispatch a bare 'mousedown' at the prompt.  That
       worked only because the prompt happened to listen on mousedown; when
       v2.3.2617 collapsed the enter gesture to a single onClick -- the fix for
       the button that would not go away -- the synthetic event stopped opening
       anything, and this scenario went red against a door that works fine for
       a finger.  dispatchEvent does not hit-test and does not produce the
       click that follows a real press, so it can only ever test the handler
       you already guessed.  Tap the middle of the prompt like a thumb does. */
    const pb = await P.page.evaluate(() => {
      const el = document.querySelector('.bt-interact-prompt');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
    });
    if (pb) await P.page.touchscreen.tap(pb.cx, pb.cy);
    await P.page.waitForTimeout(1100);
    /* ═══ v2.3.2624: TWO ANCHORS THIS TEST HAD LOST ═══
       It asserted the door opened a panel headed "Vendor" and then clicked
       "Player store". v2.3.2618 made Market the only button and renamed that
       link; v2.3.2624 renamed the building itself to the Auction House. Both
       left this scenario red against the game being right -- the fourth stale
       assertion in this series, and the reason every one of them is now run
       against the tip rather than only against its own branch. */
    rec.ok('the door opens the Auction House', await H.seesText(P, 'Auction House'));
    const doored = await H.clickText(P, 'Market').then(() => true).catch(() => false);
    rec.ok('...with a way through to the player store', doored);
    await P.page.waitForTimeout(1200);
    rec.ok('the player store opens', await H.seesText(P, 'What everyone is selling'));
    /* The listing made above, on the shelf, drawn from the server's own
       description of it -- the panel holds no item table of its own. */
    rec.ok('...showing the thing that was just listed', await H.seesText(P, '75g'));
    rec.ok('...named by the server, not by a local guess', await H.seesText(P, 'Wood Oak'));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/store.png` });   /* v2.3.2624: was a hard-coded, wrong-cased absolute path */

    /* Your own listing offers no Buy -- the worker refuses it, and a button
       that only ever produces an error is worse than no button. */
    const shelfTexts = await H.buttonTexts(P);
    rec.ok('your own listing shows no Buy button', !shelfTexts.some((t) => /^buy$/i.test((t || '').trim())), shelfTexts);

    /* Taking it down returns the log -- through the panel, not the API.
       Your own listing is only actionable on the YOURS tab: on the open
       shelf it deliberately shows no buttons at all, because the worker
       refuses every one of them on your own goods. */
    const onYours = await H.clickText(P, 'Yours').then(() => true).catch(() => false);
    rec.ok('the Yours tab opens', onYours);
    await P.page.waitForTimeout(900);
    /* v2.3.2624: "Up for sale" was this tab's heading until v2.3.2618 rebuilt
       it into My Listings / My Bids; the string is gone from the client
       entirely.  Anchored instead on the slot counter, which is the one line
       the tab cannot render without. */
    rec.ok('...and lists what you have up for sale', await H.seesText(P, 'slots used'));
    const tookDown = await H.clickText(P, 'Take down').then(() => true).catch(() => false);
    rec.ok('a listing can be taken down from the panel', tookDown);
    await P.page.waitForTimeout(2200);
    const bag2 = await H.readState(P, (S) => ((S.rpg || {}).inventory || {}));
    rec.ok('...and the log comes back to the bag', (bag2.wood_oak || 0) === (bag0.wood_oak || 0),
      { expected: bag0.wood_oak, now: bag2.wood_oak });
  }

  await P.ctx.close();
}
