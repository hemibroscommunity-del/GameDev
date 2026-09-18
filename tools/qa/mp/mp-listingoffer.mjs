/* ═══ v2.3.2623: AN OFFER THAT ACTUALLY MOVES GOLD, THROUGH THE SCREEN ═══
 *
 * storeoffer.test.mjs owns the money: every branch, no double spend, and
 * conservation across accept / decline / withdraw / both expiries. This owns
 * the half a suite cannot reach -- that two real players can do it with
 * fingers, and that the GOLD THEY SEE matches the gold the worker moved.
 *
 * The assertion that matters is the last one: the buyer's purse and the
 * seller's purse are read off their own running clients after the accept. A
 * panel that drew an optimistic "sold!" would pass everything else.
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

const STORE_DOOR = { x: 1290, y: 855 };
const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 } },
  { label: '390', portrait: { width: 390, height: 844 } },
];

async function openMarket(P) {
  await H.hopTo(P, STORE_DOOR.x, STORE_DOOR.y);
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

async function openChat(P) {
  const box = await P.page.evaluate(() => {
    const el = document.querySelector('[data-store-chat-icon]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  });
  if (!box) return false;
  await P.page.touchscreen.tap(box.cx, box.cy);
  await P.page.waitForTimeout(1500);
  return P.page.evaluate(() => !!document.querySelector('[data-store-chat]'));
}

const coins = (P) => H.readState(P, (S) => Math.floor((S.rpg || {}).coins || 0));
const panelText = (P) => P.page.evaluate(() => (document.querySelector('[data-store-chat]') || {}).innerText || '');

export async function run({ browser, wsPort, webPort, rec }) {
  for (const phone of PHONES) {
    /* A seller with something up, and a buyer with gold. */
    const S = await H.newPlayer(browser, { name: 'Marvin', wsPort, webPort, touch: true, viewport: phone.portrait, init: COACH_OFF });
    const B = await H.newPlayer(browser, { name: 'Lyria', wsPort, webPort, touch: true, viewport: phone.portrait, init: COACH_OFF });
    try {
      await H.enterWorld(S);
      await H.enterWorld(B);
      await S.page.waitForTimeout(2200);
      const sellerId = await H.readState(S, (st) => st.myId);
      rec.ok(`${phone.label}: the worker advertises escrowed offers`,
        await H.readState(B, (st) => !!(st._serverCaps && st._serverCaps.storeOffer)));

      await H.grant(wsPort, sellerId, 'item', { invKey: 'wood_oak', count: 3 });
      await H.grant(wsPort, await H.readState(B, (st) => st.myId), 'gold', { amount: 900 });
      await B.page.waitForTimeout(1500);

      await H.openDest(S, 'Bag').catch(() => {});
      await S.page.waitForTimeout(700);
      await S.page.evaluate(() => window._itemDetailBus
        && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 3 }));
      await S.page.waitForTimeout(600);
      await H.clickText(S, 'Sell').catch(() => {});
      await S.page.waitForTimeout(500);
      await S.page.locator('input[type="number"]').last().fill('500');
      await S.page.waitForTimeout(200);
      await H.clickText(S, 'Put it up').catch(() => {});
      await S.page.waitForTimeout(2300);

      /* ── THE BUYER OFFERS, AND THE GOLD LEAVES ── */
      rec.ok(`${phone.label}: the buyer reaches the market`, await openMarket(B));
      rec.ok(`${phone.label}: ...and opens the chat on the listing`, await openChat(B));
      rec.ok(`${phone.label}: ...which offers a gold box`, /Offer gold/i.test(await panelText(B)));

      const bBefore = await coins(B);
      await B.page.locator('[data-store-chat] input[type="number"]').fill('400');
      await B.page.waitForTimeout(250);
      await H.clickText(B, 'Offer').catch(() => {});
      await B.page.waitForTimeout(2000);

      const bAfterOffer = await coins(B);
      rec.ok(`${phone.label}: offering TAKES the gold there and then`,
        bAfterOffer === bBefore - 400, { before: bBefore, after: bAfterOffer });
      rec.ok(`${phone.label}: ...and the panel says it is being held`,
        /being held/i.test(await panelText(B)), (await panelText(B)).slice(0, 200));
      await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listingoffer-${phone.label}-buyer.png` });

      /* ── THE SELLER SEES IT ON THEIR OWN SCREEN, WITH THE THREE ANSWERS ── */
      rec.ok(`${phone.label}: the seller reaches the market`, await openMarket(S));
      rec.ok(`${phone.label}: ...and opens their listing's chat`, await openChat(S));
      const sView = await panelText(S);
      rec.ok(`${phone.label}: the seller sees the offer on THEIR screen`,
        /Lyria offers/i.test(sView) && /400g/.test(sView), sView.slice(0, 260));
      rec.ok(`${phone.label}: ...with Accept naming the amount, not just "Yes"`,
        /Accept 400g/i.test(sView), sView.slice(0, 260));
      rec.ok(`${phone.label}: ...and the other two answers`,
        /think about it/i.test(sView) && /\bNo\b/.test(sView), sView.slice(0, 260));
      await S.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listingoffer-${phone.label}-seller.png` });

      /* ── "I'LL THINK ABOUT IT" HOLDS THE GOLD ── */
      await H.clickText(S, "I'll think about it").catch(() => {});
      await S.page.waitForTimeout(1600);
      rec.ok(`${phone.label}: thinking about it does NOT give the gold back`,
        (await coins(B)) === bAfterOffer, { now: await coins(B), held: bAfterOffer });

      /* ── ACCEPT: the sale completes on the spot ── */
      const sBefore = await coins(S);
      await H.clickText(S, 'Accept 400g').catch(() => {});
      await S.page.waitForTimeout(2600);

      rec.ok(`${phone.label}: accepting pays the SELLER the offered amount`,
        (await coins(S)) === sBefore + 400, { before: sBefore, after: await coins(S) });
      rec.ok(`${phone.label}: ...and the buyer is not charged twice`,
        (await coins(B)) === bAfterOffer, { now: await coins(B), expected: bAfterOffer });
      const bag = await H.readState(B, (st) => ((st.rpg || {}).inventory || {}).wood_oak || 0);
      rec.ok(`${phone.label}: ...and the buyer got the goods`, bag >= 1, { wood_oak: bag });

      const gone = await B.page.evaluate(async () => {
        const base = (window.BT_API_BASE || '');
        const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
        const res = await fetch(`${base}/api/store/browse?room=${room}`);
        const j = await res.json();
        return (j.listings || []).length;
      });
      rec.ok(`${phone.label}: ...and the listing has left the shelf`, gone === 0, { listings: gone });
    } finally {
      await B.ctx.close().catch(() => {});
      await S.ctx.close().catch(() => {});
    }
  }
}
