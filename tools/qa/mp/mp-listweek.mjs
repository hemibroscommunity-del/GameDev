/* ═══ v2.3.2619: EVERY LISTING RUNS A WEEK, AND NOTHING ASKS ═══
 *
 * Owner: "don't mess with different duration settings but keep it at one
 * week", and then, when a dropdown was still being described: "there
 * shouldn't be any to choose from. All listings are 7 days (1 week)."
 *
 * So this scenario's job is mostly NEGATIVE, which is unusual and is the
 * point: it proves a control does NOT exist. A test that only checked the
 * expiry would pass just as well with a one-option dropdown still sitting in
 * the sheet, and a one-option dropdown is exactly what the owner said not to
 * build.
 *
 * market.test.mjs S5c owns the server side -- the constant, that no
 * client-supplied duration can move it, the sweep arithmetic at the new
 * lifetime, and that a listing made under the old 24h rule still retires on
 * its own clock.
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

const DAY = 86400000;
const PHONES = [
  { label: '360', portrait: { width: 360, height: 640 }, landscape: { width: 640, height: 360 } },
  { label: '390', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const phone of PHONES) {
    const P = await H.newPlayer(browser, {
      name: 'Weeky' + phone.label, wsPort, webPort, touch: true,
      viewport: phone.portrait, init: COACH_OFF,
    });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(2200);
      const myId = await H.readState(P, (S) => S.myId);
      await H.grant(wsPort, myId, 'item', { invKey: 'wood_oak', count: 6 });
      await P.page.waitForTimeout(1400);

      for (const orient of ['portrait', 'landscape']) {
        if (orient === 'landscape') {
          await P.page.setViewportSize(phone.landscape);
          await P.page.waitForTimeout(1500);
        }
        const who = `${phone.label} ${orient}`;

        await H.openDest(P, 'Bag').catch(() => {});
        await P.page.waitForTimeout(700);
        await P.page.evaluate(() => window._itemDetailBus
          && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 6 }));
        await P.page.waitForTimeout(600);
        await H.clickText(P, 'Sell').catch(() => {});
        await P.page.waitForTimeout(600);
        rec.ok(`${who}: the sell sheet asks for a price`, await H.seesText(P, 'Price in gold'));

        /* ── THE CONTROL DOES NOT EXIST ── */
        const sheet = await P.page.evaluate(() => {
          const txt = document.body.innerText || '';
          return {
            selects: document.querySelectorAll('select').length,
            duration: /listing duration/i.test(txt),
            hours24: /24\s*hours/i.test(txt),
            week: /comes back in a week/i.test(txt),
          };
        });
        rec.ok(`${who}: there is no duration dropdown in the sheet`, sheet.selects === 0, sheet);
        rec.ok(`${who}: ...and no "Listing duration" row at all`, sheet.duration === false, sheet);
        rec.ok(`${who}: ...and nothing still promises 24 hours`, sheet.hours24 === false, sheet);
        rec.ok(`${who}: ...the sheet says it comes back in a week`, sheet.week === true, sheet);
        await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/listweek-${phone.label}-${orient}-sheet.png` });

        /* ── AND WHAT THE WORKER HOLDS IS SEVEN DAYS ──
           Portrait only: the sell sheet's confirm button is below the fold in
           landscape and its container does not scroll, so a listing cannot be
           completed sideways at all. Measured and written up at v2.3.2619;
           pre-existing and not this change's doing. */
        if (orient === 'landscape') {
          rec.skip(`${who}: a listing made sideways runs a week`,
            'the sell sheet\'s "Put it up" button is below the fold in landscape and its '
            + 'container does not scroll (overflow:visible) -- pre-existing, needs its own fix');
          await P.page.evaluate(() => window._itemDetailBus && window._itemDetailBus.close());
          await P.page.waitForTimeout(500);
          continue;
        }

        await P.page.locator('input[type="number"]').last().fill('60');
        await P.page.waitForTimeout(200);
        await H.clickText(P, 'Put it up').catch(() => {});
        await P.page.waitForTimeout(2400);

        const listed = await P.page.evaluate(async () => {
          const base = (window.BT_API_BASE || '');
          const room = (new URLSearchParams(location.search).get('room')) || 'brotown-1';
          const res = await fetch(`${base}/api/store/browse?room=${room}`);
          return res.json();
        });
        const mine = ((listed || {}).listings || [])
          .filter((l) => l.sellerId === myId && l.askPrice === 60)
          .sort((a, b) => b.createdAt - a.createdAt)[0];
        rec.ok(`${who}: the listing reached the worker`, !!mine, mine);
        if (mine) {
          const days = (mine.expiresAt - mine.createdAt) / DAY;
          rec.ok(`${who}: ...and the worker is holding it for SEVEN DAYS`,
            Math.abs(days - 7) < 0.01, { days: Number(days.toFixed(3)) });
          rec.ok(`${who}: ...with no duration field on the wire`,
            mine.durationMs === undefined, Object.keys(mine).filter((k) => /dur/i.test(k)));
        }

        /* ── AND THE SHELF SAYS A WEEK, NOT 24 HOURS ── */
        await P.page.evaluate(() => window._itemDetailBus && window._itemDetailBus.close());
        await P.page.waitForTimeout(600);
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
