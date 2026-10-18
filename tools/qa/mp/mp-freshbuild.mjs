/* AN INSTALLED APP TAKES THE NEW BUILD (v2.3.2237).
 *
 * Owner: "Is there a way to make sure that if you play through the mobile
 * web app that it only pulls the latest version?"
 *
 * buildWatch has always DETECTED staleness (v2.3.1718) and offered a
 * reload.  The gap was that it only ever offered: an installed web app is
 * RESUMED rather than reloaded, so it lands back on its pre-game screen
 * still running whatever bundle it had when it was last opened, and the
 * banner is dismissible.  That is a fine trade mid-fight and the wrong one
 * on a screen where a reload costs the player nothing.
 *
 * So the rule is now split by where you are, and BOTH halves are asserted
 * here against a real client, in the two states a player is actually in --
 * not by forcing window.__btPhase, which the game re-stamps on every render
 * and would make this test measure its own fixture.
 */
import * as H from './harness.mjs';

/* Make /version.json disagree with the running bundle, then make buildWatch
   look: it checks on visibilitychange (throttled 60s, and lastCheck starts
   at 0 so the first one always lands). */
const goStale = (P) => P.page.evaluate(() => {
  const origFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    if (typeof url === 'string' && url.indexOf('/version.json') === 0) {
      return Promise.resolve(new Response(
        JSON.stringify({ sha: 'deadbeefstale', version: '9.9.9', time: 'never' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return origFetch(url, opts);
  };
  window.__stillHere = true;          /* cleared by a real page load */
  document.dispatchEvent(new Event('visibilitychange'));
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. IN THE WORLD: offered, never forced ── */
  const A = await H.newPlayer(browser, { name: 'Player', wsPort, webPort });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  const inWorld = await A.page.evaluate(() => (window.__btPhase || {}).bootPhase);
  rec.ok('player A is in the world, past the pre-game screens (guard)',
    inWorld !== 'login' && inWorld !== 'checking', { bootPhase: inWorld });

  await goStale(A);
  await A.page.waitForTimeout(1500);
  const worldState = await A.page.evaluate(() => ({
    reloaded: !window.__stillHere,
    banner: !![...document.querySelectorAll('div')]
      .find((d) => /New version available/.test(d.textContent || '')),
  }));
  console.log('    IN WORLD -> ' + JSON.stringify(worldState));
  rec.ok('mid-game it does NOT reload out from under you',
    worldState.reloaded === false, worldState);
  rec.ok('...it offers the banner instead',
    worldState.banner === true, worldState);
  await A.ctx.close().catch(() => {});

  /* ── 1b. IN THE WHEEL, ON A PHONE: the banner's Reload is on top ──
     v2.3.3331, the owner: "The 'new version available' button ... is layered
     behind the minimap so whenever I try to tap the button it just opens the
     minimap."  The Wheel's minimap opens on an invisible button laid over its
     box, a z 45 body portal; the 340px card at the top of a 390px phone runs
     under that box.  A REAL tap on Reload must reach Reload (the page
     reloads), not the minimap's button (the world map would open). */
  const W = await H.newPlayer(browser, { name: 'Wheeler', wsPort, webPort, world: 'wheel',
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(W);
  await H.waitFor(W, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
  await W.page.waitForSelector('[data-world-map-open]', { timeout: 20000 }).catch(() => {});
  await goStale(W);
  await W.page.waitForSelector('[data-update-banner]', { timeout: 5000 }).catch(() => {});
  const look = await W.page.evaluate(() => {
    const card = document.querySelector('[data-update-banner]');
    const mapBtn = document.querySelector('[data-world-map-open]');
    const reload = card && [...card.querySelectorAll('button')].find((b) => /Reload/.test(b.textContent || ''));
    if (!card || !reload) return { card: !!card, reload: !!reload, map: !!mapBtn };
    const r = reload.getBoundingClientRect(), m = mapBtn ? mapBtn.getBoundingClientRect() : null;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    const overlaps = !!m && x >= m.left && x <= m.right && y >= m.top && y <= m.bottom;
    return { card: true, reload: true, map: !!mapBtn, x: Math.round(x), y: Math.round(y), overlaps,
      onTop: hit === reload || reload.contains(hit), hit: hit ? (hit.getAttribute('aria-label') || hit.tagName) : null };
  });
  console.log('    WHEEL -> ' + JSON.stringify(look));
  rec.ok('in the Wheel on a phone the banner\'s Reload is the thing under a finger, though it lies over the minimap\'s box',
    !!look.onTop && look.map === true, look);
  if (look.reload) {
    await W.page.mouse.click(look.x, look.y);
    await W.page.waitForTimeout(2500);
  }
  const afterTap = await W.page.evaluate(() => ({ reloaded: !window.__stillHere, map: !!window.__btWorldMap && !!window.__btWorldMap.open }))
    .catch(() => ({ reloaded: true, map: false }));   /* a navigation in flight: the page is reloading */
  rec.ok('...and a real tap on it reloads the page (the world map does not open)', afterTap.reloaded === true, afterTap);
  await W.ctx.close().catch(() => {});

  /* ── 2. ON THE PRE-GAME SCREEN: just take it ──
     No enterWorld: a fresh client sits on the login/checking screen, which
     is exactly where a resumed installed app lands. */
  const B = await H.newPlayer(browser, { name: 'Resumer', wsPort, webPort });
  await B.page.waitForTimeout(2500);
  const preGame = await B.page.evaluate(() => (window.__btPhase || {}).bootPhase);
  rec.ok('player B is sitting on a pre-game screen (guard)',
    preGame === 'login' || preGame === 'checking', { bootPhase: preGame });

  await goStale(B);
  await B.page.waitForTimeout(2500);
  const preState = await B.page.evaluate(() => ({
    reloaded: !window.__stillHere,
    phase: (window.__btPhase || {}).bootPhase,
  }));
  console.log('    PRE-GAME -> ' + JSON.stringify(preState));
  rec.ok('on a pre-game screen it takes the new build without asking',
    preState.reloaded === true, preState);

  await B.ctx.close().catch(() => {});
}
