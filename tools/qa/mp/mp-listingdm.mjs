/* ═══ v2.3.2621: TALKING ABOUT ONE LISTING, THROUGH THE SCREEN ═══
 *
 * Owner: "Add the direct message feature (little chat icon)".
 *
 * storechat.test.mjs owns the server's half -- forgery, bounds, the rate
 * limit, the lifecycle. This owns the half a suite cannot reach: that the
 * icon is ON a listing, that a real finger opens the thread, that the three
 * canned replies send, that the composer counts to 200 and stops, and --
 * the one that matters -- that a line typed by one player ARRIVES ON THE
 * OTHER PLAYER'S SCREEN. Two real clients, one worker.
 *
 * A panel that renders its own optimistic bubble would pass every check but
 * that last one, which is why the buyer's line is read off the SELLER's DOM.
 */
import * as H from './harness.mjs';

const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll',
      'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

/* v2.3.2626: the door is read from worldProps.js now (H.doorOf), not
   hand-copied here.  Six scenarios each carried their own copy of
   {x:1290,y:855}; moving the auction house onto the plaza turned all six
   red at once, every failure being the test standing on empty cobble.
   H.doorOf also picks a cell you can actually STAND on -- the naive spot
   below this building's anchor is inside lamp-plaza-e's footprint. */
const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

async function openMarket(P) {
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
  await H.clickText(P, 'Market').catch(() => {});
  await P.page.waitForTimeout(1400);
  return H.seesText(P, 'What everyone is selling');
}

/** Tap the chat icon on the first listing, with a real finger. */
async function tapChatIcon(P) {
  const box = await P.page.evaluate(() => {
    const el = document.querySelector('[data-store-chat-icon]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    return { cx, cy, w: Math.round(r.width), h: Math.round(r.height),
      reachable: !!top && (top === el || el.contains(top) || top.contains(el)),
      topTag: top ? top.tagName.toLowerCase() + '.' + (typeof top.className === 'string' ? top.className : '') : 'nothing' };
  });
  if (!box) return null;
  if (box.reachable) {
    await P.page.touchscreen.tap(box.cx, box.cy);
    await P.page.waitForTimeout(1400);
  }
  return box;
}

const bubbles = (P) => P.page.evaluate(() => {
  const log = document.querySelector('[data-chat-log]');
  if (!log) return null;
  return (log.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── one seller, one listing, for the whole scenario ── */
  const S = await H.newPlayer(browser, { name: 'Marvin', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 }, init: COACH_OFF });
  await H.enterWorld(S);
  await S.page.waitForTimeout(2200);
  const sellerId = await H.readState(S, (st) => st.myId);
  rec.ok('the worker advertises the store-chat capability',
    await H.readState(S, (st) => !!(st._serverCaps && st._serverCaps.storeChat)));
  await H.grant(wsPort, sellerId, 'item', { invKey: 'wood_oak', count: 5 });
  await S.page.waitForTimeout(1400);
  await H.openDest(S, 'Bag').catch(() => {});
  await S.page.waitForTimeout(700);
  await S.page.evaluate(() => window._itemDetailBus
    && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 5 }));
  await S.page.waitForTimeout(600);
  await H.clickText(S, 'Sell').catch(() => {});
  await S.page.waitForTimeout(500);
  await S.page.locator('input[type="number"]').last().fill('500');
  await S.page.waitForTimeout(200);
  await H.clickText(S, 'Put it up').catch(() => {});
  await S.page.waitForTimeout(2300);

  for (const phone of PHONES) {
    const B = await H.newPlayer(browser, { name: 'Lyria' + phone.label, wsPort, webPort, touch: true, viewport: phone.portrait, init: COACH_OFF });
    try {
      await H.enterWorld(B);
      await B.page.waitForTimeout(2200);

      for (const orient of ['portrait', 'landscape']) {
        if (orient === 'landscape') {
          await B.page.setViewportSize(phone.landscape);
          await B.page.waitForTimeout(1500);
        }
        const who = `${phone.label} ${orient}`;
        rec.ok(`${who}: the market opens`, await openMarket(B));

        /* ── 1. THE ICON IS ON THE LISTING, AND A FINGER CAN REACH IT ── */
        const icon = await tapChatIcon(B);
        rec.ok(`${who}: a listing carries a chat icon`, !!icon, icon);
        if (!icon) continue;
        rec.ok(`${who}: ...and a finger would land on it (TRAPS §67)`, icon.reachable, icon);
        rec.ok(`${who}: ...at a thumb-sized 26px`, icon.w === 26 && icon.h === 26, icon);

        /* ── 2. IT OPENS THE THREAD, WITH THE MOCKUP'S HEADER ── */
        const head = await B.page.evaluate(() => {
          const el = document.querySelector('[data-store-chat]');
          return el ? (el.innerText || '') : null;
        });
        rec.ok(`${who}: the chat opens`, !!head, head);
        if (!head) continue;
        rec.ok(`${who}: ...naming the seller`, /Chat with Marvin/i.test(head), head.slice(0, 80));
        rec.ok(`${who}: ...with the item and its price`, /Wood Oak/i.test(head) && /500g/.test(head), head.slice(0, 160));
        rec.ok(`${who}: ...and the listing's own expiry`, /Listing expires in/i.test(head), head.slice(0, 200));
        rec.ok(`${who}: ...and the three canned replies`,
          /Still available\?/.test(head) && /Would you take less\?/.test(head) && /I have a question/.test(head), head);
        rec.ok(`${who}: ...and a 0/200 composer`,
          await B.page.evaluate(() => /0\/200/.test((document.querySelector('[data-chat-count]') || {}).innerText || '')));
        await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listingdm-${phone.label}-${orient}-open.png` });

        /* ── 3. A CANNED REPLY SENDS ── */
        await H.clickText(B, 'Still available?').catch(() => {});
        await B.page.waitForTimeout(1600);
        const mine = await bubbles(B);
        rec.ok(`${who}: tapping a canned reply puts it in the thread`,
          !!mine && mine.some((t) => /Still available\?/.test(t)), mine);

        /* ── 4. FREE TEXT, AND THE COUNTER ── */
        await B.page.locator('[data-store-chat] input[type="text"]').fill('Would you take 400g?');
        await B.page.waitForTimeout(300);
        rec.ok(`${who}: the composer counts what has been typed`,
          await B.page.evaluate(() => /20\/200/.test((document.querySelector('[data-chat-count]') || {}).innerText || '')));
        await H.clickText(B, 'Send').catch(() => {});
        await B.page.waitForTimeout(1700);
        const mine2 = await bubbles(B);
        rec.ok(`${who}: a typed line joins the thread`,
          !!mine2 && mine2.some((t) => /Would you take 400g\?/.test(t)), mine2);
        rec.ok(`${who}: ...and the composer empties`,
          await B.page.evaluate(() => /0\/200/.test((document.querySelector('[data-chat-count]') || {}).innerText || '')));
        await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listingdm-${phone.label}-${orient}-chat.png` });

        /* ── 5. THE COMPOSER STOPS AT 200 ── */
        await B.page.locator('[data-store-chat] input[type="text"]').fill('z'.repeat(260));
        await B.page.waitForTimeout(300);
        const typed = await B.page.evaluate(() => (document.querySelector('[data-store-chat] input[type="text"]') || {}).value || '');
        rec.ok(`${who}: the composer will not hold more than 200`, typed.length === 200, typed.length);
        await B.page.locator('[data-store-chat] input[type="text"]').fill('');

        /* back to the shelf for the next orientation */
        await H.clickText(B, 'Back to the shelf').catch(() => {});
        await B.page.waitForTimeout(900);
        await B.page.evaluate(() => {
          const x = document.querySelector('.bt-inspect-close');
          if (x) x.click();
        });
        await B.page.waitForTimeout(700);
      }

      /* ── 6. THE LINE REACHED THE OTHER PLAYER'S SCREEN ──
         Read off the SELLER's DOM, not the buyer's: a panel that rendered an
         optimistic bubble locally would pass everything above and fail only
         here, which is the whole reason this scenario runs two clients. */
      rec.ok(`${phone.label}: the seller can open their own listing's messages`, await openMarket(S));
      const sIcon = await tapChatIcon(S);
      rec.ok(`${phone.label}: the seller's own listing carries the icon too`, !!sIcon, sIcon);
      if (sIcon) {
        const sView = await S.page.evaluate(() => {
          const el = document.querySelector('[data-store-chat]');
          return el ? (el.innerText || '') : null;
        });
        rec.ok(`${phone.label}: the seller sees the buyer's line on THEIR screen`,
          !!sView && /Would you take 400g\?/.test(sView), sView && sView.slice(0, 300));
        rec.ok(`${phone.label}: ...attributed to the buyer, not to the seller`,
          !!sView && new RegExp('Lyria' + phone.label).test(sView), sView && sView.slice(0, 300));
        await S.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listingdm-${phone.label}-seller.png` });

        /* ── 7. AND THE SELLER CAN REPLY BACK ── */
        await S.page.locator('[data-store-chat] input[type="text"]').fill('Maybe, if nobody buys soon.');
        await S.page.waitForTimeout(300);
        await H.clickText(S, 'Send').catch(() => {});
        await S.page.waitForTimeout(1800);
        const sAfter = await bubbles(S);
        rec.ok(`${phone.label}: the seller's reply joins the thread`,
          !!sAfter && sAfter.some((t) => /Maybe, if nobody buys soon\./.test(t)), sAfter);
        await H.clickText(S, 'Back to the shelf').catch(() => {});
        await S.page.waitForTimeout(700);
        await S.page.evaluate(() => {
          const x = document.querySelector('.bt-inspect-close');
          if (x) x.click();
        });
        await S.page.waitForTimeout(600);
      }
    } finally {
      await B.ctx.close().catch(() => {});
    }
  }
  await S.ctx.close().catch(() => {});
}
