/* ═══ THE TRADE WINDOW'S TWO OFFERS ON AN UPRIGHT PHONE (v2.3.3856) ═══
 *
 * The owner, 2026-10-29: "for trade window I'd prefer a side by side layout
 * of your trade window on left and other person trade window on right. Top to
 * bottom (current) is more confusing."
 *
 * Side by side needs a drawer 520 px wide (game.css .bt-t2-lanes); a
 * computer's is about 880 (mp-desktrade step 6 holds it there).  An upright
 * phone's is about 375, where a lane would be 180 px, so the default there is
 * the stack, theirs on top.  Two upright phones (390 x 844) in BroTown open a
 * real trade and each offers wood and gold:
 *   1. A, the default: the offers stack, theirs on top, each the drawer's width;
 *   2. B, with ?tradeside=1 (the owner's to try): side by side, its own offer
 *      on the left -- the picture says whether that reads at this width;
 *   3. no page errors.
 * Pictures: tools/qa/mp/out/tradeside-{stack,side}-phone.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WOOD = 'wood_pine_log';
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `tradeside-${name}.png`) }); } catch (e) { /* a picture only */ } };

const lanes = (P) => P.page.evaluate(() => {
  const d = document.querySelector('[data-trade-drawer]');
  const pick = (rx) => {
    const h = [...(d ? d.querySelectorAll('.bt-t2-lane-hdr') : [])].find((x) => rx.test(((x.querySelector('.bt-t2-lane-name') || {}).textContent || '').trim()));
    const l = h && h.closest('.bt-t2-lane'); if (!l) return null;
    const r = l.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
  };
  return { mine: pick(/^You offer$/i), theirs: pick(/offers$/i), drawerW: d ? Math.round(d.getBoundingClientRect().width) : 0 };
});
/* one wood and 100 gold into the offer: a click on the bag's wood tile, then
   the +100 chip */
const offer = async (P) => {
  await P.page.evaluate((k) => {
    const el = [...document.querySelectorAll(`[data-bag-key="i-${k}"]`)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (el) el.click();
  }, WOOD);
  await P.page.waitForTimeout(800);
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-trade-drawer] .bt-t2-chip')].find((x) => (x.textContent || '').trim() === '+100');
    if (b) b.click();
  });
  await P.page.waitForTimeout(800);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Sidestack', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Sideforce', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'tradeside=1' });
  await H.enterWorld(B);
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.waitMutualSight(A, B);
    const aId = await H.readState(A, (S) => S.myId);
    const bId = await H.readState(B, (S) => S.myId);
    for (const id of [aId, bId]) {
      await H.grant(wsPort, id, 'item', { invKey: WOOD, count: 6 });
      await H.grant(wsPort, id, 'gold', { amount: 500 });
    }
    await A.page.waitForTimeout(1200);
    await H.openInspect(A, bId);
    await H.clickText(A, 'Trade');
    const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
      .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
      .then(() => true).catch(() => false);
    rec.ok('B receives the trade invite (guard)', gotInvite);
    if (!gotInvite) return;
    await H.clickText(B, 'Open trade');
    await H.waitFor(A, () => !!(window.__broTradeBagBus && window.__broTradeBagBus.open), (v) => v === true,
      { timeout: 20000, label: 'A trade live' }).catch(() => null);
    await A.page.waitForTimeout(800);
    await offer(A);
    await offer(B);
    await A.page.waitForTimeout(1500);

    const LA = await lanes(A);
    await shot(A, 'stack-phone');
    rec.ok(`1. an upright phone (drawer ${LA.drawerW} px): the offers stack, theirs on top, each the drawer's width`,
      !!(LA.mine && LA.theirs) && LA.theirs.top < LA.mine.top && LA.mine.w > 300 && LA.theirs.w > 300, LA);
    const LB = await lanes(B);
    await shot(B, 'side-phone');
    rec.ok(`2. with ?tradeside=1 the same phone stands them side by side, its own offer on the left (${LB.mine && LB.mine.w} px a lane)`,
      !!(LB.mine && LB.theirs) && Math.abs(LB.mine.top - LB.theirs.top) <= 4 && LB.mine.right <= LB.theirs.left, LB);
    rec.ok('3. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
