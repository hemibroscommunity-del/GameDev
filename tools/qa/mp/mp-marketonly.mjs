/* ═══ v2.3.2618: MARKET IS THE ONLY BUTTON, AND THE SHELF LOOKS LIKE THE MOCKUP ═══
 *
 * Owner: "I want something like this for the storefront ui ... This is only
 * going to be a player marketplace so make that the only button."
 *
 * Two halves, and the second is the one with teeth:
 *
 *  1. THE VENDOR PANEL OFFERS ONE THING.  Shopkeeper Bro's five-row shelf is
 *     out of this building.  The scenario asserts the five item NAMES are
 *     gone from the panel, not merely that a "Market" button exists -- "the
 *     new button is there" would pass just as well with the old shelf still
 *     underneath it.
 *
 *  2. NOTHING WAS DELETED TO GET THERE.  SHOP_ITEMS still feeds the bag's
 *     potion filter AND is Shopkeeper Bro's whole permanent shelf
 *     (`shopStaples()` maps over every key of it).  So this asks the WORKER
 *     what Bro is selling and requires all five to still be on it.  If a
 *     later session "tidies up" the table, this goes red here rather than in
 *     a player's empty bag filter three weeks later.
 *
 * The shelf itself is measured against the mockup's row: a priced Buy
 * button, a clock, the seller's name, and the top bid.  Four viewports,
 * reached by rotating (see mp-vendorprompt for why a cold landscape start
 * cannot create a character).
 */
import * as H from './harness.mjs';

/* v2.3.2626: the door is read from worldProps.js now (H.doorOf), not
   hand-copied here.  Six scenarios each carried their own copy of
   {x:1290,y:855}; moving the auction house onto the plaza turned all six
   red at once, every failure being the test standing on empty cobble.
   H.doorOf also picks a cell you can actually STAND on -- the naive spot
   below this building's anchor is inside lamp-plaza-e's footprint. */

/* The names the vendor building must NO LONGER show. These are SHOP_ITEMS'
   display labels (VendorPanel.SHOP_STOCK keeps them as a record). */
const SHELF_NAMES = ['Cooked Minnow', 'Stamina Salts', 'Mana Draught', 'Swift Draught', 'Fury Tonic'];

const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

/* ═══ THE ONBOARDING COACH SITS OVER THE OPEN PANEL ═══
 * Found by this scenario at 390x844: the first-run QuestCoach card ("Your
 * bag, your gear and your stats live down here") renders at z31 inset:0 and
 * its 44x44 dismiss X landed exactly on the store's "List an Item" button,
 * so the tap went to the coach instead. The card outranks .bt-inspect (z32)
 * in practice because it is a later sibling in its own stacking context --
 * the same class of tap-eater as the World Chat feed over the party roster
 * (ARCHITECTURE-HANDOFF item F).
 *
 * It reproduces on main over the OLD store panel (the coach draws across its
 * body text there too -- see the base screenshots in the PR), so it is not
 * this PR's doing and it is not fixed here. It is reported, not routed
 * around: DISMISSING it is not enough, because dismissing one lesson marks
 * it done and the coach immediately offers the next eligible one, so the
 * layer never clears. The marks are pre-set instead, which is
 * shot-levelup.mjs's recipe.
 *
 * Named rather than wildcarded, so a NEW lesson shows up as a failure here
 * and gets added deliberately instead of being silently suppressed. */
const COACH_OFF = () => {
  try {
    const lessons = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll',
      'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const done = {};
    for (const k of lessons) done[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(done));
  } catch (e) { /* private mode */ }
};

/* v2.3.2624: the door's panel is titled AUCTION HOUSE now, not "Vendor".
   This check read the OLD header, so it would have gone red on the rename
   while the door itself worked perfectly -- the fifth stale scenario in this
   stack, and the first one made stale by the change it was run against.
   Confirming a door by its sign is fine; the sign just has to be the
   current one. */
async function openVendor(P) {
      const _door = await H.doorOf('auction-house');
      await H.hopTo(P, _door.x, _door.y);
  await P.page.waitForTimeout(700);
  const box = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-interact-prompt');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  });
  if (!box) return false;
  await P.page.touchscreen.tap(box.cx, box.cy);
  await P.page.waitForTimeout(1100);
  return H.seesText(P, 'Auction House');
}

/** What the store panel is actually showing, read off the DOM. */
async function shelfRead(P) {
  return P.page.evaluate(() => {
    const txt = document.body.innerText || '';
    const btns = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim());
    return {
      pricedBuy: btns.filter((t) => /^Buy \d+g$/.test(t)),
      bareBuy: btns.filter((t) => /^Buy$/.test(t)),
      clock: /\u{1F551}\s*\d+[mhd]/u.test(txt),
      seller: /Seller:\s*\S/.test(txt),
      bidLine: /Top bid:\s*\d+g/.test(txt) || /No bids/.test(txt),
      bidBtn: btns.some((t) => /^Bid$/.test(t)),
    };
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── A seller, so the shelf has something on it that is not the buyer's ── */
  const S = await H.newPlayer(browser, { name: 'Marvin', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 }, init: COACH_OFF });
  await H.enterWorld(S);
  await S.page.waitForTimeout(2200);
  const sellerId = await H.readState(S, (st) => st.myId);
  await H.grant(wsPort, sellerId, 'item', { invKey: 'wood_oak', count: 4 });
  await H.grant(wsPort, sellerId, 'gold', { amount: 400 });
  await S.page.waitForTimeout(1500);

  await H.openDest(S, 'Bag').catch(() => {});
  await S.page.waitForTimeout(700);
  await S.page.evaluate(() => window._itemDetailBus
    && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 4 }));
  await S.page.waitForTimeout(600);
  await H.clickText(S, 'Sell').catch(() => {});
  await S.page.waitForTimeout(500);
  await S.page.locator('input[type="number"]').last().fill('500');
  await S.page.waitForTimeout(200);
  await H.clickText(S, 'Put it up').catch(() => {});
  await S.page.waitForTimeout(2200);

  const listed = await S.page.evaluate(async () => {
    const base = (window.BT_API_BASE || '');
    const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
    const res = await fetch(`${base}/api/store/browse?room=${room}`);
    return res.json();
  });
  rec.ok('the seller put something on the shelf', ((listed || {}).listings || []).length >= 1,
    ((listed || {}).listings || []).length);

  /* ── NOTHING WAS DELETED: the worker still sells all five staples ── */
  /* Asked over the real wire -- `shop_list` -> `shop_state`, the same two
     messages ShopkeeperPanel uses -- so this is the worker's own answer and
     not a table read out of the client bundle. */
  const bro = await S.page.evaluate(async () => {
    const st = window._gameState && window._gameState.current;
    if (!st || !st.channel) return { noChannel: true };
    st.channel.send({ type: 'shop_list', payload: { keys: [] } });
    await new Promise((r) => setTimeout(r, 2000));
    const b = window.__broShopBus;
    return b ? { items: b.stock } : { noBus: true };
  });
  const broKeys = ((bro || {}).items || []).filter((i) => i && i.staple).map((i) => i.key);
  const wantKeys = ['cookedMinnow', 'staminaSalts', 'manaShard', 'swiftDraught', 'whetstone'];
  const missing = wantKeys.filter((k) => !broKeys.includes(k));
  rec.ok('Shopkeeper Bro still stocks all five staples (the shop DATA was hidden, not deleted)',
    broKeys.length > 0 && missing.length === 0, { broKeys, missing, bro: broKeys.length ? undefined : bro });

  await S.ctx.close().catch(() => {});

  /* ── The buyer, at four viewports ── */
  for (const phone of PHONES) {
    const P = await H.newPlayer(browser, { name: 'Shopper', wsPort, webPort, touch: true, viewport: phone.portrait, init: COACH_OFF });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2200);
      await H.grant(wsPort, await H.readState(P, (st) => st.myId), 'gold', { amount: 900 });
      await P.page.waitForTimeout(900);
      const coach0 = await P.page.evaluate(() => (document.querySelector('[data-coach]') ? 'still-there' : 'gone'));
      rec.ok(`${phone.label}: no first-run coach card is in the way (its marks are pre-set)`, coach0 === 'gone', coach0);

      for (const orient of ['portrait', 'landscape']) {
        if (orient === 'landscape') {
          await P.page.setViewportSize(phone.landscape);
          await P.page.waitForTimeout(1500);
        }
        const who = `${phone.label} ${orient}`;

        rec.ok(`${who}: the auction house door opens`, await openVendor(P));

        /* 1. ONE BUTTON. */
        const vendorBody = await P.page.evaluate(() => (document.querySelector('.bt-inspect-card')?.innerText) || '');
        const still = SHELF_NAMES.filter((n) => vendorBody.includes(n));
        rec.ok(`${who}: the shopkeeper's shelf is gone from the vendor panel`, still.length === 0, still);
        rec.ok(`${who}: ...and Market is offered`, /Market/i.test(vendorBody), vendorBody.slice(0, 120));
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/marketonly-${phone.label}-${orient}-vendor.png` });

        /* 2. THE SHELF, AGAINST THE MOCKUP'S ROW. */
        const intoMarket = await H.clickText(P, 'Market').then(() => true).catch(() => false);
        rec.ok(`${who}: Market opens the player shelf`, intoMarket);
        await P.page.waitForTimeout(1400);
        rec.ok(`${who}: the shelf is the player store`, await H.seesText(P, 'What everyone is selling'));

        const r = await shelfRead(P);
        rec.ok(`${who}: the Buy button carries its price ("Buy 500g")`, r.pricedBuy.length >= 1, r);
        rec.ok(`${who}: ...and no bare "Buy" is left`, r.bareBuy.length === 0, r);
        rec.ok(`${who}: every row shows how long it has left`, r.clock, r);
        rec.ok(`${who}: ...who is selling it`, r.seller, r);
        rec.ok(`${who}: ...and the bid line`, r.bidLine, r);
        rec.ok(`${who}: ...with a Bid button beside Buy`, r.bidBtn, r);
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/marketonly-${phone.label}-${orient}-shelf.png` });

        /* 3. YOURS: two tabs and an empty state that leads somewhere. */
        await H.clickText(P, 'Yours').catch(() => {});
        await P.page.waitForTimeout(900);
        const yours = await P.page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim());
          return {
            myListings: btns.some((t) => /^My Listings$/i.test(t)),
            myBids: btns.some((t) => /^My Bids$/i.test(t)),
            listItem: btns.some((t) => /List an Item/i.test(t)),
            text: (document.querySelector('.bt-inspect-card')?.innerText) || '',
          };
        });
        rec.ok(`${who}: Yours splits into My Listings and My Bids`, yours.myListings && yours.myBids, yours);
        rec.ok(`${who}: ...with the mockup's empty state`, /not selling anything yet/i.test(yours.text), yours.text.slice(0, 160));
        rec.ok(`${who}: ...offering "List an Item"`, yours.listItem, yours);
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/marketonly-${phone.label}-${orient}-yours.png` });

        /* 4. ...and it actually goes somewhere you can sell from.
           Read off dashboardPanelBus rather than off the pixels, because the
           destination is not the same in both orientations and that is the
           APP's rule, not this panel's: landSafe() (dashboardPanelBus.js)
           redirects 'bag' -> 'dashboard' in landscape, since the bag pane is
           portrait-only (the v2.3.2173 tourniquet). So the button lands on
           the bag upright and on the dashboard sideways, and asserting "bag"
           in both would be asserting against the app. */
        const listTap = await H.clickText(P, 'List an Item').then(() => null).catch((e) => String(e).slice(0, 120));
        if (listTap) {
          const b = P.page.locator('button:has-text("List an Item")').first();
          const cover = await H.coveringElement(P, b).catch(() => null);
          rec.ok(`${who}: the "List an Item" button can be pressed at all`, false, { listTap, cover });
        }
        await P.page.waitForTimeout(1800);
        const landed = await P.page.evaluate(() => {
          const b = window.__broDashPanelBus;
          const insp = document.querySelector('.bt-inspect');
          return {
            storeShut: !insp,
            inspectText: insp ? (insp.innerText || '').slice(0, 80) : null,
            root: b ? b.root() : null,
            mode: b ? b.state.mode : null,
          };
        });
        const wantRoot = orient === 'landscape' ? 'dashboard' : 'bag';
        rec.ok(`${who}: "List an Item" closes the store`, landed.storeShut, landed);
        rec.ok(`${who}: ...and opens the ${wantRoot} pane, where selling starts`,
          landed.root === wantRoot && landed.mode === 'expanded', landed);

        /* back to a clean slate for the next orientation */
        await P.page.evaluate(() => {
          const x = document.querySelector('.bt-inspect-close');
          if (x) x.click();
          try { window.__broDashPanelBus && window.__broDashPanelBus.toBar(); } catch (e) {}
        });
        await P.page.waitForTimeout(700);
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
