/* ═══ A PAGE THAT DIED OPEN IS REPORTED BY THE NEXT ONE (v2.3.3017) ═══
 *
 * Owner, 2026-10-04: "I was fighting fire goblins and my screen went black."
 * The crash feed had nothing: iPhone Safari killing a tab that holds too much
 * leaves no error and no event (debug/crashTrap.js markAlive).
 *
 * On a phone-sized page against a real worker:
 *   1. a page in the Wheel keeps an alive mark (bt-alive) with its zone, place
 *      and textures;
 *   2. a second tab opening beside it reports nothing -- the first answers for
 *      its mark;
 *   3. a page that died open -- its storage carried to where nobody answers
 *      for its mark, as an iOS kill leaves it -- is reported by the next page:
 *      'killed', ON SCREEN, in the Wheel, and the report reaches the worker's
 *      crash feed;
 *   4. a page closed properly leaves no mark and the next reports nothing.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const crashlog = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt-crashlog') || '[]'); } catch (e) { return []; } });
const alive = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt-alive') || 'null'); } catch (e) { return null; } });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Killbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  /* the harness's init scripts are the player's page's own: the other pages
     opened here (same browser, same storage) need the local worker too, or
     they would play -- and report -- against production */
  await P.ctx.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; window.__btTod = 'day'; window.__btAmbienceOff = true; }, wsPort);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    await P.page.waitForTimeout(6500);
    /* 1 */
    const a1 = await alive(P.page);
    rec.ok(`the page keeps an alive mark with where it is (${a1 && a1.zone} at ${a1 && a1.x},${a1 && a1.y}, ${a1 && a1.mb} MB, ${a1 && a1.vis})`,
      !!a1 && a1.zone === 'wheel' && typeof a1.x === 'number' && typeof a1.mb === 'number' && a1.vis === 'visible' && !!a1.sid, a1);
    const url = P.page.url();

    /* 2: a second tab beside it */
    const Q = await P.ctx.newPage();
    await Q.goto(url, { waitUntil: 'domcontentloaded' });
    await Q.waitForTimeout(3500);
    const qlog = await crashlog(Q);
    rec.ok('a second tab opening beside it reports nothing: the first answers for its mark',
      !qlog.some((e) => e.kind === 'killed' || e.kind === 'evicted'), qlog.slice(-4));
    await Q.close();

    /* 3: died open.  The page that wrote the mark is gone as far as the
       next page can tell: its storage (the mark in it) is carried into a
       fresh browser profile, where nobody answers the ping -- what an iOS
       kill leaves.  (Crashing the page itself, Page.crash, left Chromium
       unable to open the next page in the same profile.) */
    await P.page.waitForTimeout(6000);   /* a fresh mark of P's own, after Q's pagehide */
    const before = await alive(P.page);
    const state = await P.ctx.storageState();
    const ctx2 = await browser.newContext({ storageState: state, viewport: PHONE, isMobile: true, hasTouch: true });
    await ctx2.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; window.__btTod = 'day'; window.__btAmbienceOff = true; }, wsPort);
    try {
      const R = await ctx2.newPage();
      await R.goto(url, { waitUntil: 'domcontentloaded' });
      await R.waitForTimeout(4000);
      const rlog = await crashlog(R);
      const killed = rlog.filter((e) => e.kind === 'killed');
      rec.ok(`a page that died open is reported by the next one: ${killed.length ? killed[killed.length - 1].msg : 'nothing'}`,
        killed.length === 1 && /ON SCREEN/.test(killed[0].msg) && /zone wheel/.test(killed[0].msg), { before: before && { sid: before.sid, zone: before.zone }, rlog: rlog.slice(-4) });
      const feed = await (await fetch(`http://127.0.0.1:${wsPort}/api/feedback/crashes?limit=20`)).json().catch(() => null);
      const sent = !!feed && Array.isArray(feed.reports) && feed.reports.some((r) => (r.log || []).some((e) => e.kind === 'killed'));
      rec.ok('...and the report reaches the worker\'s crash feed', sent, feed && { count: feed.count, kinds: (feed.reports || []).map((r) => (r.log || []).map((e) => e.kind).slice(-3)) });
    } finally {
      await ctx2.close().catch(() => {});
    }

    /* 4: closed properly (pagehide) -- no mark, nothing reported */
    await P.page.evaluate(() => { try { localStorage.removeItem('bt-crashlog'); } catch (e) { /* ignore */ } });
    await P.page.waitForTimeout(6000);
    const markP = await alive(P.page);
    await P.page.close({ runBeforeUnload: true });
    await new Promise((r) => setTimeout(r, 800));
    const T = await P.ctx.newPage();
    await T.goto(url, { waitUntil: 'domcontentloaded' });
    await T.waitForTimeout(3000);
    const tlog = await crashlog(T);
    rec.ok('a page closed properly leaves no mark, and the next reports nothing',
      !!markP && !tlog.some((e) => e.kind === 'killed' || e.kind === 'evicted'), { markP: !!markP, tlog: tlog.slice(-3) });
    await T.close();
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
