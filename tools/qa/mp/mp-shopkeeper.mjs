/* TRADING WITH SHOPKEEPER BRO, END TO END (v2.3.2050).
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
 */
import * as H from './harness.mjs';

const KEY = 'slime-remnants';
const openShop = (P) => P.page.evaluate(() => window.__broShopBus.setOpen(true));
const rows = (P) => P.page.evaluate((k) => {
  const el = document.querySelector(`[data-shop-row="${k}"]`);
  const box = document.querySelector('[data-shop-panel]');
  if (!box) return null;
  const sell = document.querySelector(`[data-shop-sell="${k}"]`);
  const buy = document.querySelector(`[data-shop-buy="${k}"]`);
  return {
    panel: true,
    row: !!el,
    rowText: el ? el.textContent.replace(/\s+/g, ' ').trim() : null,
    sellLabel: sell ? sell.textContent.trim() : null,
    buyLabel: buy ? buy.textContent.trim() : null,
    sellDisabled: sell ? sell.disabled : null,
    note: (document.querySelector('[data-shop-note]') || {}).textContent || null,
  };
}, KEY);
const purse = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
const bag = (P) => H.readState(P, (S) => ((S.rpg || {}).inventory || {})['slime-remnants'] || 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Seller', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await A.page.waitForTimeout(2500);

  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  /* {invKey, count} -- the shape inbox.js reads. The first cut passed
     {key, qty}, which the grant accepted and silently credited nothing, so the
     whole scenario failed at 'carrying something' with a zero that looked like
     a game bug rather than a typo in the seed. */
  await H.grant(wsPort, aId, 'item', { invKey: KEY, count: 20 });
  await H.grant(wsPort, bId, 'gold', { amount: 400 });
  await A.page.waitForTimeout(1200);
  const carried = await bag(A);
  rec.ok(`the seller is carrying something he will take (${carried})`, carried > 0, { carried });

  /* ── THE WINDOW ── */
  await openShop(A);
  await A.page.waitForTimeout(1200);
  let r = await rows(A);
  rec.ok('the shop window opens', !!r && r.panel, r);
  rec.ok('...and lists what you are carrying even though he holds none of it '
       + '(otherwise the first seller of a thing could never sell it)',
    !!r && r.row, r);
  rec.ok('...with a Sell button that is live', !!r && r.sellDisabled === false, r);

  const coins0 = await purse(A);

  /* ── A SALE SETTLES ── */
  await A.page.click(`[data-shop-sell="${KEY}"]`);
  await A.page.waitForTimeout(1500);
  const coins1 = await purse(A), bag1 = await bag(A);
  rec.ok('selling one pays the player', coins1 > coins0, { coins0, coins1 });
  rec.ok('...and takes the item out of the bag', bag1 === carried - 1, { carried, bag1 });
  r = await rows(A);
  rec.ok('...and says what happened, in his words', !!r && /Sold 1 for \d+ coins/.test(r.note || ''), r);

  /* ── THE PILE IS PUBLIC ── */
  await openShop(B);
  await B.page.waitForTimeout(1500);
  const rb = await rows(B);
  /* Parsed, not pattern-matched. The row's text runs together with no spaces
     ("...he holds 1Sell 8g"), so `1\b` never matched -- and the LATER
     assertion that the count had changed passed for that same wrong reason,
     i.e. vacuously. A captured number cannot be right by accident. */
  const holds = (r2) => { const m = /he holds (\d+)/.exec((r2 && r2.rowText) || ''); return m ? +m[1] : null; };
  rec.ok('a player who never touched anything sees the pile the seller filled',
    !!rb && rb.row && holds(rb) === 1, { holds: holds(rb), rb });

  /* ── THE OFFER FALLS AS THE PILE GROWS ──
     The owner's rule, on the glass, on the OTHER player's screen. */
  const firstOffer = rb.sellLabel;
  for (let i = 0; i < 12; i++) {
    await A.page.click(`[data-shop-sell="${KEY}"]`);
    await A.page.waitForTimeout(320);
  }
  await B.page.waitForTimeout(1500);
  const rb2 = await rows(B);
  const num = (s) => { const m = /(\d+)g/.exec(s || ''); return m ? +m[1] : null; };
  rec.ok(`the watcher's copy of the pile grew without them doing anything `
       + `(${holds(rb)} -> ${holds(rb2)})`,
    holds(rb2) !== null && holds(rb2) > holds(rb), { before: holds(rb), after: holds(rb2) });
  rec.ok(`...and his offer FELL as it grew (${num(firstOffer)}g -> ${num(rb2.sellLabel)}g), `
       + `which is the owner's whole rule, seen by someone who was not selling`,
    num(rb2.sellLabel) !== null && num(firstOffer) !== null
    && num(rb2.sellLabel) < num(firstOffer), { first: firstOffer, now: rb2.sellLabel });

  /* ── BUYING BACK ── */
  const bCoins0 = await purse(B), bBag0 = await bag(B);
  await B.page.click(`[data-shop-buy="${KEY}"]`);
  await B.page.waitForTimeout(1500);
  rec.ok('the watcher can buy out of the pile the seller filled',
    (await bag(B)) === bBag0 + 1, { before: bBag0, after: await bag(B) });
  rec.ok('...and it costs them coins', (await purse(B)) < bCoins0, { before: bCoins0, after: await purse(B) });

  /* ── HE STILL SELLS WHAT THE OLD TOWN SHOP SOLD (v2.3.2051) ──
     That shop was the only source of these three, so a replacement that
     dropped them would have deleted them from the game rather than moved
     them. Bought here through the real UI, from a pile he holds none of. */
  const staple = await A.page.evaluate(() => {
    const b = document.querySelector('[data-shop-buy="whetstone"]');
    const row = document.querySelector('[data-shop-row="whetstone"]');
    return { present: !!b, disabled: b ? b.disabled : null, label: b ? b.textContent.trim() : null,
      text: row ? row.textContent.replace(/\s+/g, ' ') : null };
  });
  rec.ok('he stocks the old town shop\'s consumables, at its prices',
    staple.present && /50g/.test(staple.label || ''), staple);
  rec.ok('...listed as always in stock rather than with a count he does not have',
    /always in stock/.test(staple.text || ''), staple);
  const wBefore = await H.readState(A, (S) => ((S.rpg || {}).inventory || {}).whetstone || 0);
  await A.page.click('[data-shop-buy="whetstone"]');
  await A.page.waitForTimeout(1500);
  rec.ok('...and one can actually be bought', 
    (await H.readState(A, (S) => ((S.rpg || {}).inventory || {}).whetstone || 0)) === wBefore + 1,
    { wBefore });

  /* ── HIS PILE LOOKS LIKE AN INVENTORY (v2.3.2052) ──
     Owner: "show his inventory similar to how my inventory is shown with the
     actual item thumbnail". Asserted as a REAL loaded image, not just an <img>
     tag: a broken src still renders an element, and a row of broken images is
     exactly the failure this would otherwise miss. */
  const thumb = await A.page.evaluate(() => {
    const row = document.querySelector('[data-shop-row="slime-remnants"]');
    const img = row && row.querySelector('img');
    if (!img) return { img: false };
    return { img: true, src: img.getAttribute('src'),
      loaded: img.complete && img.naturalWidth > 0, w: img.naturalWidth };
  });
  rec.ok('his stock shows the item\'s real thumbnail, the same picture the bag uses',
    thumb.img && thumb.loaded && thumb.w > 0, thumb);

  /* The staples have no painted art, so they fall to a glyph -- but it must be
     the RIGHT glyph. 'whetstone' contains 'stone', and iconFor's ore rule would
     hand it a pickaxe if the exact match were not above it. */
  const glyphs = await A.page.evaluate(() => {
    const g = (k) => {
      const row = document.querySelector(`[data-shop-row="${k}"]`);
      const tile = row && row.firstElementChild;
      return tile ? tile.textContent.trim().replace(/\d+$/, '') : null;
    };
    return { whetstone: g('whetstone'), antidote: g('antidote'), trap: g('trap_basic') };
  });
  rec.ok('the consumables show their own glyphs, not a bare diamond',
    glyphs.whetstone === '🪨' && glyphs.antidote === '🍃' && glyphs.trap === '🪤', glyphs);

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
