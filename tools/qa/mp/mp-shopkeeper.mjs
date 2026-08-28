/* TRADING WITH SHOPKEEPER BRO, END TO END (v2.3.2050, relaid v2.3.2059).
 *
 * Owner: "Make it so you can buy and sell things from him. His inventory is
 * public so other players who sell monster remains (etc) can see it and buy
 * from him. The more quantity he has of a thing the cheaper he's willing to
 * buy from you."
 *
 * The server suite already proves the arithmetic against a mocked store. What
 * it cannot prove is the half the owner actually asked for: that the pile is
 * PUBLIC. That is a claim about two players and one room, so it needs two real
 * browsers and a real worker -- player A sells, and player B, who never
 * touched anything, sees the pile grow and the offer fall on their own screen.
 *
 * It also checks the thing a mocked store cannot: that the coins and the bag
 * on the CLIENT end up matching the server's settlement, because the client is
 * told rather than trusted.
 *
 * ── v2.3.2059: RELAID FOR THE DRAWER ──
 * The shop stopped being a popup with a row per item and became a drawer that
 * attaches to the top edge of the band's existing bag. So the controls this
 * drives moved with it, and the assertions moved with them:
 *   his stock   [data-shop-bro="<key>"]   a slot on his shelf, inside the drawer
 *   your bag    [data-inv-key="<key>"]    the BAND's own tile -- not a copy
 *   the deal    [data-shop-act]           one button, verb set by the side
 * The layout itself is now load-bearing (the owner's brief is mostly about
 * where things sit), so it is asserted rather than eyeballed: the drawer's
 * bottom edge has to BE the band's top edge, and the bag must not move when
 * the drawer opens.
 */
import * as H from './harness.mjs';

const KEY = 'slime-remnants';
const openShop  = (P) => P.page.evaluate(() => window.__broShopBus.setOpen(true));
/* Closed by its own button, and only after stepping away from him first.
   Walking up to a shopkeeper OPENS his drawer (BroTown.jsx), and that
   auto-open is latched so it cannot fire again until you leave -- but this
   scenario opens the drawer by poking the bus, which sets no latch. Standing
   on him and closing therefore reopened it on the next frame, and whether
   that happened at all depended on where the player happened to spawn. Not a
   product bug: a real player's open always latches. It is this scenario that
   has to behave like a real player. */
const closeShop = async (P) => {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((o) => o.id === 'shopkeeper_bro');
    if (n) { S.player.x = n.x + 900; S.player.y = n.y + 900; }
  });
  await P.page.waitForTimeout(500);
  await P.page.click('[data-shop-close]');
};

/* Everything the drawer is currently saying, in one read. */
const view = (P) => P.page.evaluate((k) => {
  const q  = (s) => document.querySelector(s);
  const box = q('[data-shop-panel]');
  const act = q('[data-shop-act]');
  const broSlot = q(`[data-shop-bro="${k}"]`);
  const bagTile = q(`[data-inv-key="${k}"]`);
  const quote = bagTile && bagTile.querySelector('[data-shop-quote]');
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
  const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { t: Math.round(r.top), l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  return {
    panel: !!box,
    drawer: rect(box),
    broSlot: !!broSlot,
    broShelfCount: document.querySelectorAll('[data-shop-bro]').length,
    /* his count badge -- .bt-item-qty is hidden at 1, so a missing badge is 1 */
    broHolds: broSlot
      ? (() => { const b = broSlot.querySelector('.bt-item-qty'); return b ? +b.textContent : 1; })()
      : null,
    bagTile: !!bagTile,
    /* the untraded second key, for the merge check below */
    oakQuote: (() => {
      const t = q('[data-inv-key="wood_oak"]');
      const b = t && t.querySelector('[data-shop-quote]');
      return b ? b.textContent.replace(/\s+/g, '') : null;
    })(),
    bagQuote: txt(quote),                       /* e.g. "9g↑" */
    dealKey: q('[data-shop-deal]') && q('[data-shop-deal]').getAttribute('data-shop-deal'),
    dealSide: act && act.getAttribute('data-shop-act'),
    dealTotal: act ? act.getAttribute('data-shop-total') : null,
    actLabel: txt(act),
    actDisabled: act ? act.disabled : null,
    qty: q('[data-shop-qty]') && +q('[data-shop-qty]').getAttribute('data-shop-qty'),
    note: txt(q('[data-shop-note]')),
    /* the band's own bag grid, so "your bag does not move" is measurable */
    bandBag: rect(q('[data-inv-key]')),
    dashH: getComputedStyle(document.documentElement).getPropertyValue('--dash-h'),
    vh: window.innerHeight,
    /* What he actually said, so a null quote reports WHY rather than just
       being absent. */
    busStock: (window.__broShopBus && window.__broShopBus.stock || [])
      .map((i) => i.key + ':' + i.qty + '/' + i.buy + (i.quote ? 'q' : '')),
    invKeys: Object.keys(((window._gameState.current.rpg || {}).inventory) || {}),
  };
}, KEY);

/* view(), polled until the drawer says what we are waiting for. Every number
   in this UI is a server round-trip (the client holds no price table), so a
   plain wait-then-read races the answer -- and a null read makes an assertion
   fail for a reason that has nothing to do with the thing it is testing. */
const until = async (P, pred, label) => {
  for (let i = 0; i < 40; i++) {
    const v = await view(P);
    if (pred(v)) return v;
    await P.page.waitForTimeout(150);
  }
  /* Tagged, so a timeout reports itself instead of surfacing as a bare null
     in whatever assertion happens to read the field next. */
  return Object.assign(await view(P), { _timedOut: label });
};

const purse = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
/* The key is spelled out rather than closed over: readState serialises this
   function into the page, where module scope does not exist. Closing over KEY
   here threw "KEY is not defined" from inside the browser. */
const bag   = (P) => H.readState(P, (S) => ((S.rpg || {}).inventory || {})['slime-remnants'] || 0);
/* The gold number out of a per-slot quote, and its direction arrow. */
const qNum  = (s) => { const m = /(\d+)g/.exec(s || ''); return m ? +m[1] : null; };
const qArrow = (s) => (/↓/.test(s || '') ? 'down' : /↑/.test(s || '') ? 'up' : null);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Seller', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await A.page.waitForTimeout(2500);

  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  /* {invKey, count} -- the shape inbox.js reads. The first cut passed
     {key, qty}, which the grant accepted and silently credited nothing, so the
     whole scenario failed at 'carrying something' with a zero that looked like
     a game bug rather than a typo in the seed. */
  await H.grant(wsPort, aId, 'item', { invKey: KEY, count: 60 });
  /* A second key that NOBODY sells him in this scenario, so his pile of it
     stays at zero for the whole run. That is the only case where the quote
     for it exists purely because the seller asked for it by name -- and
     therefore the only case that can prove the broadcast after someone
     else's trade does not wipe it. */
  await H.grant(wsPort, aId, 'item', { invKey: 'wood_oak', count: 5 });
  await H.grant(wsPort, bId, 'gold', { amount: 400 });
  /* The watcher carries a couple too, on purpose: the price they are quoted
     for their OWN stack is the public number, and watching it fall while
     someone else floods the pile is the owner's rule stated from the outside.
     Without this they have no slot for a quote to appear in, and the check
     fails for the wrong reason. */
  await H.grant(wsPort, bId, 'item', { invKey: KEY, count: 2 });
  await A.page.waitForTimeout(1200);
  const carried = await bag(A);
  rec.ok(`the seller is carrying something he will take (${carried})`, carried > 0, { carried });

  /* ══ THE BAG DOES NOT MOVE ══
     Owner: "The important part is that your bag does not change position at
     all. The shop simply grows upward from it." Measured before and after,
     because this is the one requirement a screenshot review would pass by
     eye and a two-pixel regression would still break. */
  const before = await view(A);
  rec.ok('the bag is on screen before the shop opens (or the next check is vacuous)',
    !!before.bandBag, before.bandBag);
  await openShop(A);
  let v = await until(A, (x) => x.panel && x.bagQuote, 'A: drawer + first quote');
  rec.ok('the shop drawer opens', v.panel, v);
  rec.ok('...and your existing bag has NOT moved a pixel',
    !!v.bandBag && before.bandBag
    && v.bandBag.t === before.bandBag.t && v.bandBag.l === before.bandBag.l,
    { before: before.bandBag, after: v.bandBag });
  /* "rises immediately above the existing bottom HUD and physically touches
     it" -- the drawer's bottom edge IS the band's top edge, to the pixel. */
  const bandTop = v.vh - parseInt(v.dashH, 10);
  rec.ok(`...and it physically touches the band rather than floating over it `
       + `(drawer bottom ${v.drawer.b}, band top ${bandTop})`,
    Math.abs(v.drawer.b - bandTop) <= 1, { drawerBottom: v.drawer.b, bandTop });
  const dh = v.drawer.b - v.drawer.t;
  rec.ok(`...at the height the owner asked for, 220-280px (${dh})`,
    dh >= 220 && dh <= 280, { height: dh });

  /* ══ YOUR OWN BAG CARRIES HIS PRICE ══
     Owner: "put a tiny gold quote underneath or inside each owned item slot
     ... Those are what Bro currently pays per item." He holds none of this
     yet, so the arrow points UP: he is paying his best price for it. */
  rec.ok('your own bag slot shows what he pays for it', qNum(v.bagQuote) > 0, v.bagQuote);
  rec.ok('...pointing UP while he holds none of it (his best price)',
    qArrow(v.bagQuote) === 'up', v.bagQuote);
  const openingQuote = qNum(v.bagQuote);

  /* ══ TAP YOUR BAG -> SELL ══
     Owner: "There shouldn't even need to be a Buy/Sell toggle. Tap my
     inventory -> sell it. Tap his inventory -> buy it." */
  await A.page.evaluate((k) => document.querySelector(`[data-inv-key="${k}"]`)
    .dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), KEY);
  v = await until(A, (x) => x.dealKey === 'slime-remnants' && +x.dealTotal > 0, 'A: sell quote');
  rec.ok('tapping your own bag slot puts that item in the deal strip',
    v.dealKey === KEY, v);
  rec.ok('...and the one action button says SELL, with no toggle to set first',
    v.dealSide === 'bag' && /SELL/i.test(v.actLabel || ''), v);
  rec.ok('...quoting a total that came from the server, not from the client',
    +v.dealTotal > 0, v);

  const coins0 = await purse(A);
  await A.page.click('[data-shop-act]');
  await A.page.waitForTimeout(1600);
  const coins1 = await purse(A), bag1 = await bag(A);
  rec.ok('selling one pays the player', coins1 > coins0, { coins0, coins1 });
  rec.ok('...and takes the item out of the bag', bag1 === carried - 1, { carried, bag1 });
  v = await until(A, (x) => !!x.note, 'A: receipt');
  rec.ok('...and says what happened, in his words',
    /Sold 1 for \d+ coins/.test(v.note || ''), v.note);
  /* The regression that shipped in the first cut of the drawer: the sale's
     broadcast replaced the stock list wholesale and wiped every per-slot
     quote off the bag, permanently. */
  rec.ok('...and your bag slots STILL carry their quotes after a sale',
    qNum(v.bagQuote) > 0, v.bagQuote);

  /* ══ THE PILE IS PUBLIC ══ */
  await openShop(B);
  const vb = await until(B, (x) => x.panel && x.broSlot && x.bagQuote, 'B: shelf + quote');
  rec.ok('a player who never touched anything sees the pile the seller filled',
    vb.broSlot && vb.broHolds === 1, { holds: vb.broHolds, vb });

  /* ══ THE OFFER FALLS AS THE PILE GROWS ══
     The owner's rule, on the glass, on the OTHER player's screen. B's bag
     quote for the same key is what B would be paid -- the public number. */
  const firstOffer = qNum(vb.bagQuote);
  for (let i = 0; i < 12; i++) {
    await A.page.click('[data-shop-act]');
    await A.page.waitForTimeout(340);
  }
  const vb2 = await until(B, (x) => x.broHolds > vb.broHolds && x.bagQuote,
    'B: pile grew');
  rec.ok(`the watcher's copy of the pile grew without them doing anything `
       + `(${vb.broHolds} -> ${vb2.broHolds})`,
    vb2.broHolds !== null && vb2.broHolds > vb.broHolds,
    { before: vb.broHolds, after: vb2.broHolds });
  rec.ok(`...and his offer FELL as it grew (${firstOffer}g -> ${qNum(vb2.bagQuote)}g), `
       + `which is the owner's whole rule, seen by someone who was not selling`,
    qNum(vb2.bagQuote) !== null && firstOffer !== null && qNum(vb2.bagQuote) < firstOffer,
    { first: vb.bagQuote, now: vb2.bagQuote });
  rec.ok('...and the arrow flipped DOWN to say so at a glance',
    qArrow(vb2.bagQuote) === 'down', vb2.bagQuote);
  rec.ok(`...which is a fall from the seller's opening quote too (${openingQuote}g)`,
    qNum(vb2.bagQuote) < openingQuote, { openingQuote, now: qNum(vb2.bagQuote) });

  /* ══ TAP HIS SHELF -> BUY ══ */
  const bCoins0 = await purse(B), bBag0 = await bag(B);
  await B.page.click(`[data-shop-bro="${KEY}"]`);
  const vb3 = await until(B, (x) => x.dealSide === 'bro' && +x.dealTotal > 0, 'B: buy quote');
  rec.ok('tapping HIS slot flips the same strip to a purchase, still with no toggle',
    vb3.dealKey === KEY && vb3.dealSide === 'bro' && /BUY/i.test(vb3.actLabel || ''), vb3);
  await B.page.click('[data-shop-act]');
  await B.page.waitForTimeout(1600);
  rec.ok('the watcher can buy out of the pile the seller filled',
    (await bag(B)) === bBag0 + 1, { before: bBag0, after: await bag(B) });
  rec.ok('...and it costs them coins', (await purse(B)) < bCoins0, { before: bCoins0, after: await purse(B) });

  /* ══ SOMEONE ELSE'S TRADE DOES NOT BLANK YOUR PRICES ══
     Every sale broadcasts the pile to everyone, and that broadcast can only
     describe the pile -- it cannot carry a price for an item nobody has sold
     him, because it is one message going to every player at once. The seller
     is holding oak he has not traded and did not just act, so nothing would
     re-ask on his behalf: if the incoming list REPLACED his view instead of
     merging into it, this quote would vanish the moment the watcher bought
     something, and stay gone. */
  const vOak = await until(A, (x) => x.panel, 'A: still open');
  rec.ok('a price on an item you hold and he does not survives another '
       + "player's trade",
    /^\d+g/.test(vOak.oakQuote || ''), { oak: vOak.oakQuote, stock: vOak.busStock });

  /* ══ A STACK IS NOT UNIT PRICE TIMES N ══
     Owner: "that total can automatically account for diminishing demand."

     Stated as a PER-UNIT AVERAGE across two stack sizes, not as
     "total(5) < 5 x total(1)". The naive form is not actually true and the
     first cut of this failed on it: each unit price is a real, the stack is
     floored ONCE at the end while a single sale is floored on its own, so a
     stack can beat five separate sales by up to four coins of recovered
     rounding. That is the server behaving correctly (v2.3.2051 -- flooring
     every unit robs the seller). The decay is a real effect but it is small
     per unit, so the comparison has to be made at a stack size where it
     dominates the rounding rather than sitting inside it. */
  await A.page.evaluate((k) => document.querySelector(`[data-inv-key="${k}"]`)
    .dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), KEY);
  const small = await until(A, (x) => x.qty === 1 && +x.dealTotal > 0, 'A: quote for 1');
  const BIG = 40;
  for (let i = 0; i < BIG - 1; i++) await A.page.click('[data-shop-plus]');
  const big = await until(A, (x) => x.qty === BIG && +x.dealTotal > 0, 'A: quote for ' + BIG);
  rec.ok(`the stepper moves the quantity (1 -> ${big.qty})`, big.qty === BIG, big);
  const perSmall = +small.dealTotal / small.qty;
  const perBig = +big.dealTotal / big.qty;
  rec.ok(`each unit of a ${BIG}-stack is worth less than a single (${perBig.toFixed(2)}g `
       + `vs ${perSmall.toFixed(2)}g), so the total already accounts for his `
       + `diminishing demand rather than multiplying`,
    +big.dealTotal > 0 && perBig < perSmall, { perSmall, perBig, small: +small.dealTotal, big: +big.dealTotal });

  /* ══ CLOSING PUTS THE BAG BACK ══ */
  await closeShop(A);
  const vClosed = await until(A, (x) => !x.panel, 'A: drawer shut');
  rec.ok('his own close button shuts the drawer, and that takes the quotes '
       + 'back off your bag',
    !vClosed.panel && vClosed.bagQuote === null, vClosed);
  rec.ok('...and STILL has not moved it',
    !!vClosed.bandBag && vClosed.bandBag.t === before.bandBag.t
    && vClosed.bandBag.l === before.bandBag.l,
    { before: before.bandBag, after: vClosed.bandBag });

  /* ══ WHAT HE STARTS WITH (v2.3.2053) ══
     Owner: the consumables go; he starts with a few cooked fish instead. This
     is stock, not a staple -- it has a real count and it can run out. */
  const seed = await A.page.evaluate(() => {
    const slot = document.querySelector('[data-shop-bro="cooked_fish_trout"]');
    const gone = ['whetstone', 'antidote', 'trap_basic']
      .filter((k) => document.querySelector(`[data-shop-bro="${k}"]`));
    const badge = slot && slot.querySelector('.bt-item-qty');
    return { slot: !!slot, count: badge ? +badge.textContent : null, gone };
  });
  await openShop(A);
  await A.page.waitForTimeout(1200);
  const seed2 = await A.page.evaluate(() => {
    const slot = document.querySelector('[data-shop-bro="cooked_fish_trout"]');
    const badge = slot && slot.querySelector('.bt-item-qty');
    const price = slot && slot.parentElement
      && slot.parentElement.lastElementChild.textContent.trim();
    return { slot: !!slot, count: badge ? +badge.textContent : null, price,
      /* v2.3.2063: the potions are BACK on his shelf, at the owner's
         request, but as STAPLES -- so what is checked is that they carry no
         count badge. A number on a thing he can never run out of is a lie,
         and it is also how you would tell a staple that had been mistakenly
         dropped into the finite pile. */
      staples: ['whetstone', 'manaShard', 'swiftDraught'].map((k) => {
        const el = document.querySelector(`[data-shop-bro="${k}"]`);
        return { k, on: !!el, count: el && el.querySelector('.bt-item-qty')
          ? +el.querySelector('.bt-item-qty').textContent : null };
      }) };
  });
  rec.ok('he starts with cooked fish on his shelf', seed2.slot, seed2);
  rec.ok('...with a real count, not "always in stock" -- it is a pile that runs out',
    seed2.count > 0, seed2);
  rec.ok('...priced under the slot, so you know what it costs before tapping it',
    /^\d+g$/.test(seed2.price || ''), seed2);
  /* ═══ v2.3.2063: THE POTIONS ARE ON HIS SHELF NOW ═══
     Owner: "These potions should be purchasable there." This used to assert
     the opposite -- that the consumables were gone -- which was right while
     they were unbuyable and useless. They are neither now. */
  rec.ok('...alongside the potions, which he always has',
    seed2.staples.every((x) => x.on), seed2.staples);
  rec.ok('...and THOSE carry no count, because a staple cannot run out '
       + '(the fish can, and does)',
    seed2.staples.every((x) => x.count === null) && seed2.count > 0,
    { staples: seed2.staples, fish: seed2.count });
  rec.ok('(the drawer was shut a moment ago, so that shelf really did redraw)',
    seed.slot === false, seed);

  /* ══ HIS SHELF LOOKS LIKE AN INVENTORY (v2.3.2052) ══
     Owner: "show his inventory similar to how my inventory is shown with the
     actual item thumbnail". Asserted as a REAL loaded image, not just an <img>
     tag: a broken src still renders an element, and a shelf of broken images
     is exactly the failure this would otherwise miss. */
  const thumb = await A.page.evaluate((k) => {
    const slot = document.querySelector(`[data-shop-bro="${k}"]`);
    const img = slot && slot.querySelector('img');
    if (!img) return { img: false };
    return { img: true, src: img.getAttribute('src'),
      loaded: img.complete && img.naturalWidth > 0, w: img.naturalWidth };
  }, KEY);
  rec.ok('his stock shows the item\'s real thumbnail, the same picture the bag uses',
    thumb.img && thumb.loaded && thumb.w > 0, thumb);

  /* v2.3.2060 (owner: "show gold coin symbol next to his gold count").
     Asserted as a REAL loaded image, not just an <img> tag -- a broken src
     still renders an element, and the whole point of the change is that the
     coin is visible. */
  const coinIcon = await A.page.evaluate(() => {
    const box = document.querySelector('[data-shop-coins]');
    const img = box && box.querySelector('img');
    if (!img) return { img: false, text: box ? box.textContent.trim() : null };
    return { img: true, loaded: img.complete && img.naturalWidth > 0,
      w: img.naturalWidth, text: box.textContent.trim() };
  });
  rec.ok('his header shows the gold coin symbol beside the count',
    coinIcon.img && coinIcon.loaded && coinIcon.w > 0, coinIcon);
  rec.ok('...and the count itself is still a number', /^\d+$/.test(coinIcon.text || ''), coinIcon);

  const sizes = await A.page.evaluate(() =>
    ((window.__btNpcSprites && window.__btNpcSprites()) || [])
      .reduce((o, n) => { o[n.id] = Math.round(n.height); return o; }, {}));
  rec.ok(`the shopkeeper is drawn larger than he was (${sizes.shopkeeper_bro}px, `
       + `against Mayor Bro's ${sizes.mayor_bro})`,
    sizes.shopkeeper_bro > 140 && sizes.shopkeeper_bro > sizes.mayor_bro, sizes);

  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/shopkeeper-panel.png' }).catch(() => {});
  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }
  await A.ctx.close();
  await B.ctx.close();
}
