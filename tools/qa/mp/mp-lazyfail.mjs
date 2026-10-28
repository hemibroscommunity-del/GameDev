/* ═══ A RARE WINDOW WHOSE SCRIPT CANNOT COME (v2.3.3736) ═══
 *
 * The rare windows' code loads when they are first opened (src/ui/lazyPanel.js,
 * on by default since v2.3.3736).  A tab left open across a deploy asks for
 * its OLD build's scripts, which Cloudflare Pages no longer has: it answers
 * with the page itself, which fails as a script.  A deploy can land while the
 * judges play.  A phone in BroTown, with the network answering the
 * Achievements page's script with the page's HTML (a stale tab after a
 * deploy) and the Settings page's script failing ONCE (a dropped connection):
 *   1. the rare windows' code is lazy by default, and none of it has come on
 *      arrival;
 *   2. Settings: its first fetch fails, the second comes, and the page opens
 *      with no "Couldn't open this";
 *   3. Achievements: the window says "Couldn't open this" with Reload and
 *      Close, after its one retry, and the game plays on (its frames keep
 *      coming, the worker's ticks keep coming); Close takes the card away;
 *   4. the script back, Achievements opened again tries again and opens.
 *
 *   node tools/qa/mp/run.mjs lazyfail
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Stale', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  /* the stale tab: the Achievements page's script answered with the page */
  let stale = true, settingsFails = 1, settingsAsked = 0, achvAsked = 0;
  await P.page.route(/\/assets\/AchievementsPanel-[^/]+\.js/, (route) => {
    achvAsked++;
    if (!stale) return route.continue();
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>BroTown</body></html>' });
  });
  await P.page.route(/\/assets\/SettingsPanel-[^/]+\.js/, (route) => {
    settingsAsked++;
    if (settingsFails > 0) { settingsFails--; return route.abort('connectionreset'); }
    return route.continue();
  });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok('in the Wheel (guard)', ok);
    if (!ok) return;
    const lazy = await P.page.evaluate(() => { const L = window.__btLazyCode; return L ? { on: L.on, loaded: L.loaded(), named: L.named().length } : null; });
    rec.ok(`the rare windows' code is lazy by default, none of it here on arrival (${lazy && lazy.named} windows; loaded: ${JSON.stringify(lazy && lazy.loaded)})`,
      !!lazy && lazy.on === true && lazy.loaded.length === 0 && lazy.named > 20, lazy);

    const openMore = async (tile) => {
      await H.unfoldBand(P).catch(() => {});
      await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('more'); });
      const t = P.page.locator(`[data-more-tile="${tile}"]`).first();
      await t.waitFor({ state: 'visible', timeout: 8000 });
      await t.click({ force: true });
    };
    const cantOpen = () => P.page.locator('[data-lazy-cantopen]').count();

    /* 2. a dropped connection: tried again, and in */
    await openMore('settings');
    const settingsIn = await H.waitFor(P, () => (window.__btLazyCode.loaded().indexOf('SettingsPanel') >= 0), (v) => v,
      { timeout: 12000, label: 'the Settings page\'s script' }).then(() => true).catch(() => false);
    rec.ok(`a dropped connection: the Settings page's script, refused once, came on its retry (${settingsAsked} asks) and the page opened without "Couldn't open this"`,
      settingsIn && settingsAsked >= 2 && (await cantOpen()) === 0, { settingsAsked, settingsIn });

    /* 3. a stale tab: the card, and the game plays on */
    await openMore('achievements');
    const card = await P.page.locator('[data-lazy-cantopen]').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    const words = card ? await P.page.locator('[data-lazy-cantopen]').first().innerText() : '';
    rec.ok(`a stale tab: the Achievements window says it couldn't open, in plain words, with Reload and Close, after its one retry (${achvAsked} asks): "${words.replace(/\s+/g, ' ').trim()}"`,
      card && /Couldn't open this/.test(words) && /Reload the game/.test(words) && /Reload/.test(words) && /Close/.test(words) && achvAsked >= 2,
      { achvAsked, words });
    /* the game plays on under the card: its frames keep coming, and a step
       taken is a step the world shows */
    const frames = await P.page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
    const p0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.glideTo(P, p0.x + 60, p0.y, { timeoutMs: 15000 });
    const p1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, zone: S.currentZone }));
    const errs = (P.logs || []).filter((e) => /^pageerror/.test(e) && !/AchievementsPanel|SettingsPanel|dynamically imported module|Failed to fetch|MIME|Unexpected token/i.test(e));
    rec.ok(`...and the game plays on under it: ${frames} frames in 2 s, a step taken (${Math.round(p1.x - p0.x)} px), still in the world, no page error besides the refused scripts (${errs.length})`,
      frames > 0 && p1.zone === 'wheel' && p1.x - p0.x > 30 && errs.length === 0, { frames, p0, p1, errs: errs.slice(0, 5) });
    /* a real tap on Close (the game's controls act on the lift) */
    const btn = P.page.locator('[data-lazy-cantopen] button[data-esc]').first();
    const bb = await btn.boundingBox();
    if (bb) await P.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await P.page.waitForTimeout(600);
    const cards = await P.page.evaluate(() => Object.assign({}, window.__btLazyCode.cards, { top: (() => { const n = document.querySelector('[data-lazy-cantopen] button[data-esc]'); if (!n) return null; const r = n.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t ? t.tagName + '|' + (t.getAttribute('data-esc') || '') : null; })() }));
    rec.ok(`a tap on Close takes the card away (cards ${JSON.stringify(cards)})`, (await cantOpen()) === 0, { bb, cards });

    /* 4. the script back: opened again, it tries again */
    stale = false;
    await openMore('achievements');
    const achvIn = await P.page.locator('[data-achv-panel]').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    rec.ok('opened again with its script back, the Achievements window tries again and opens', achvIn && (await cantOpen()) === 0, { achvAsked });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
