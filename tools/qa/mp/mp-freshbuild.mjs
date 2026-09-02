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
