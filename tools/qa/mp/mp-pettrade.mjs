/* ═══ PETS CHANGE HANDS, ON TWO PHONES (v2.3.3122) ═══
 *
 * docs/PET-TRAPPING-PLAN.md, Phase 3: "Pets in the trade window, the auction
 * house and the mail."  Two real phone clients against a real worker:
 *
 *   1. caps.pettrade on both;
 *   2. THE PETS PAGE says which pets may change hands (the one out with you
 *      may not) and offers Sell on the others;
 *   3. THE TRADE WINDOW: the seller's pet lane lists only pets that may go;
 *      a tap offers one and the buyer sees it in the seller's lane, by name,
 *      kind and level; the review screen lists it under YOU RECEIVE; both
 *      accept, and the pet is the buyer's (the worker's record, the same id),
 *      shown on the receipt, gone from the seller's;
 *   4. THE AUCTION HOUSE: the seller lists another from the Pets page at a
 *      price; it leaves their collection; the buyer walks to the auction
 *      house, finds it under Pets, its picture drawn, and buys it -- it is
 *      theirs, the seller is paid;
 *   5. no page errors on either phone.
 * Pictures: tools/qa/mp/out/pettrade-*.png.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/pettrade-${name}.png` }).catch(() => {});
const tapText = (P, re) => P.page.evaluate((rx) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && new RegExp(rx).test(x.textContent || ''));
  if (!b || b.disabled) return false; b.click(); return true;
}, re);
const drawerText = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-trade-drawer]');
  return c ? (c.innerText || '').replace(/\s+/g, ' ').trim() : '';
});
const pets = (P) => H.readState(P, (S) => ((S._petBook && S._petBook.list) || []).map((p) => ({ id: p.id, kind: p.kind, lv: p.lv, owners: p.owners })));

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Petseller', nameB: 'Petbuyer' });
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  try {
    await body({ A, B, wsPort, rec, errors });
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}

async function body({ A, B, wsPort, rec, errors }) {
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  const caps = await Promise.all([A, B].map((P) => H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.pettrade && S._serverCaps.petbook))));
  rec.ok('caps.pettrade on both phones', caps[0] && caps[1], caps);
  if (!(caps[0] && caps[1])) return;

  /* ── setup: pets, through the test kit (as a catch makes them) ── */
  const made = [];
  for (const [home, level] of [['frost', 3], ['ember', 4], ['sky', 2]]) {
    const r = await H.devOp(wsPort, 'trapping', aId, { level: 20, pet: { home, level, tradeable: true } });
    made.push(r.pet);
  }
  await H.devOp(wsPort, 'trapping', bId, { level: 20, pet: { home: 'tidal', level: 5, tradeable: true } });
  await H.grant(wsPort, bId, 'gold', { amount: 400 });
  await A.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.list && b.list.length === 3; }, null, { timeout: 8000 }).catch(() => {});
  await B.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.list && b.list.length === 1; }, null, { timeout: 8000 }).catch(() => {});
  const a0 = await pets(A);
  const activeA = await H.readState(A, (S) => S._petBook && S._petBook.active);
  rec.ok('setup: the seller has three pets, the first out with them (guard)', a0.length === 3 && activeA === made[0], { a0, activeA });

  /* ── 2. the Pets page ── */
  await H.openDest(A, 'More').catch(() => {});
  await A.page.waitForTimeout(600);
  await A.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  await A.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).catch(() => {});
  const rowState = async (id) => {
    await A.page.click(`[data-pet-row="${id}"]`).catch(() => {});
    await A.page.waitForTimeout(300);
    const st = await A.page.evaluate((pid) => {
      const row = document.querySelector(`[data-pet-row="${pid}"]`);
      const t = row && row.querySelector('[data-pet-trade]');
      return t ? { state: t.getAttribute('data-pet-trade'), text: t.innerText.replace(/\s+/g, ' '), sell: !!row.querySelector('[data-pet-sell]') } : null;
    }, id);
    await A.page.click(`[data-pet-row="${id}"]`).catch(() => {});
    await A.page.waitForTimeout(200);
    return st;
  };
  const sOut = await rowState(made[0]);
  const sFree = await rowState(made[1]);
  rec.ok(`the Pets page: the pet out with you may not go ("${sOut && sOut.text}"), another may ("${sFree && sFree.text}", with Sell)`,
    !!sOut && sOut.state === 'active' && !sOut.sell && !!sFree && sFree.state === 'ok' && sFree.sell, { sOut, sFree });
  await shot(A, 'pets-page');
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(400);

  /* ── 3. the trade window ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Trade');
  const invited = await H.waitUi(B, () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Open trade')),
    { label: 'B trade invite', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the buyer gets the trade invite (guard)', invited);
  if (!invited) return;
  await H.clickText(B, 'Open trade');
  const live = (P) => H.waitUi(P, () => !!document.querySelector('[data-trade-drawer]') && [...document.querySelectorAll('button')]
    .some((b) => /Confirm trade|Add an item or gold|Ready to trade/.test(b.textContent)), { label: 'live trade window', timeout: 20000 });
  await live(A); await live(B);
  const picker = await A.page.evaluate(() => [...document.querySelectorAll('[data-trade-pet]')].map((b) => b.getAttribute('data-trade-pet')));
  rec.ok('the seller\'s pet lane lists only the pets that may go (not the one out with them)',
    picker.length === 2 && picker.includes(made[1]) && picker.includes(made[2]) && !picker.includes(made[0]), picker);
  await A.page.evaluate((id) => { const b = document.querySelector(`[data-trade-pet="${id}"]`); if (b) b.click(); }, made[1]);
  await B.page.waitForFunction(() => /Gobling/.test((document.querySelector('[data-trade-drawer]') || {}).innerText || ''), null, { timeout: 6000 }).catch(() => {});
  const seen = await drawerText(B);
  rec.ok(`the buyer sees it in the seller's lane, by kind and level ("...${(seen.match(/Gobling\s*Lv \d+/) || [''])[0]}...")`, /Gobling/.test(seen) && /Lv 4/.test(seen), seen.slice(0, 220));
  await shot(B, 'lane');
  const goldIn = B.page.locator('[data-trade-drawer] input[type="number"]').first();
  await goldIn.fill('50').catch(() => {});
  await B.page.waitForTimeout(1200);
  await tapText(A, 'Ready to trade');
  await tapText(B, 'Ready to trade');
  await A.page.waitForTimeout(1200);
  const reviewB = await drawerText(B);
  rec.ok('the buyer\'s review screen lists the pet under YOU RECEIVE', /YOU RECEIVE.*Gobling, Lv 4.*YOU GIVE/.test(reviewB), reviewB.slice(0, 240));
  await shot(B, 'review');
  await A.page.waitForTimeout(2800);   /* the server's accept cooldown */
  await tapText(A, '^Accept$');
  await tapText(B, '^Accept$');
  await B.page.waitForFunction((id) => { const b = window._gameState.current._petBook; return b && b.list && b.list.some((p) => p.id === id); }, made[1], { timeout: 8000 }).catch(() => {});
  const bAfter = await pets(B), aAfter = await pets(A);
  const moved = bAfter.find((p) => p.id === made[1]);
  rec.ok('both accept: the pet is the buyer\'s -- the same id, one more owner -- and gone from the seller',
    !!moved && moved.owners === 2 && !aAfter.some((p) => p.id === made[1]), { bAfter, aAfter });
  await B.page.waitForTimeout(600);
  const receipt = await drawerText(B);
  rec.ok('the receipt shows the pet received', /Gobling/.test(receipt), receipt.slice(0, 200));
  await shot(B, 'receipt');
  const srvB = await H.devOp(wsPort, 'trapping', bId, {});
  void srvB;
  await A.page.waitForTimeout(3200);   /* the receipt closes itself */

  /* ── 4. the auction house ── */
  await H.openDest(A, 'More').catch(() => {});
  await A.page.waitForTimeout(600);
  await A.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  await A.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).catch(() => {});
  await A.page.click(`[data-pet-row="${made[2]}"]`).catch(() => {});
  await A.page.waitForTimeout(300);
  await A.page.click(`[data-pet-sell="${made[2]}"]`).catch(() => {});
  await A.page.fill(`[data-pet-price="${made[2]}"]`, '120').catch(() => {});
  await A.page.click(`[data-pet-list="${made[2]}"]`).catch(() => {});
  await A.page.waitForSelector('[data-pet-listed]', { timeout: 6000 }).catch(() => {});
  const listed = await A.page.evaluate(() => { const el = document.querySelector('[data-pet-listed]'); return el ? el.innerText : null; });
  const aNow = await pets(A);
  rec.ok(`listed from the Pets page ("${listed}"), and it leaves the seller's collection`, !!listed && /120 gold/.test(listed) && !aNow.some((p) => p.id === made[2]), { listed, aNow });
  await shot(A, 'listed');
  await H.closeDest(A).catch(() => {});

  const coinsA0 = await H.readState(A, (S) => (S.rpg || {}).coins || 0);
  await H.closeDest(B).catch(() => {});
  const door = await H.doorOf('auction-house');
  await H.hopTo(B, door.x, door.y);
  await B.page.waitForTimeout(800);
  /* the trade left the bag sheet up: put it away first, as a player would */
  await H.closeDest(B).catch(() => {});
  await B.page.waitForTimeout(600);
  const pb = await B.page.evaluate(() => {
    const el = document.querySelector('.bt-interact-prompt');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  });
  if (pb) await B.page.mouse.click(pb.cx, pb.cy);   /* joinPair's pages are not touch pages: a real click at the prompt */
  await B.page.waitForTimeout(1100);
  if (!(await H.seesText(B, 'Auction House'))) { await B.page.keyboard.press('e'); await B.page.waitForTimeout(1100); }
  await H.clickText(B, 'Market').catch(() => {});
  await B.page.waitForTimeout(1200);
  const opened = await H.seesText(B, 'What everyone is selling');
  if (!opened) await shot(B, 'no-auction');
  rec.ok('the buyer walks into the auction house (guard)', opened);
  if (!opened) return;
  await tapText(B, '^Pets$');
  await B.page.waitForTimeout(1200);
  const row = await B.page.evaluate(() => {
    const t = document.body.innerText;
    const port = [...document.querySelectorAll('canvas[data-pet-portrait]')].map((c) => {
      const g = c.getContext('2d').getImageData(0, 0, 64, 64).data; let n = 0; for (let i = 3; i < g.length; i += 4) if (g[i] > 40) n++; return n;
    });
    return { mumling: /Mumling/.test(t), lv: /Lv 2/.test(t), price: /120g/.test(t), drawn: Math.max(0, ...port) };
  });
  rec.ok(`under Pets: the Mumling, Lv 2, 120g, its picture drawn (${row.drawn} px)`, row.mumling && row.lv && row.price && row.drawn > 150, row);
  await shot(B, 'shelf');
  await tapText(B, '^Buy 120g$');
  await B.page.waitForFunction((id) => { const b = window._gameState.current._petBook; return b && b.list && b.list.some((p) => p.id === id); }, made[2], { timeout: 8000 }).catch(() => {});
  const bought = (await pets(B)).find((p) => p.id === made[2]);
  await A.page.waitForTimeout(1500);
  const coinsA1 = await H.readState(A, (S) => (S.rpg || {}).coins || 0);
  rec.ok(`bought: the Mumling is the buyer's, and the seller is paid (${coinsA0} -> ${coinsA1})`, !!bought && bought.owners === 2 && coinsA1 > coinsA0, { bought, coinsA0, coinsA1 });
  await shot(B, 'bought');

  rec.ok('no page errors on either phone', errors.length === 0, errors.slice(0, 5));
}
