/* First-run onboarding, on a browser that has never seen the game
 * (v2.3.1668).
 *
 * WHY THIS EXISTS.  The suite had an intermittent failure that read as
 * "the nav rail is not tappable: covered by <video>", hitting a different
 * scenario each run.  The cause was not a flaky test: after the world
 * reports itself live (`S.myId && S.currentZone`), the intro clip is
 * still painted full-screen over the UI for a couple of seconds.  Every
 * scenario now waits that out in `enterWorld`.
 *
 * That wait would also HIDE the failure if the intro ever stopped
 * lifting — a game that boots to a video you cannot dismiss is about the
 * worst thing a judge could meet, and no other scenario would notice,
 * because they all wait for exactly that condition.  So this one asserts
 * it on purpose, on a context that has never loaded the game before.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
  await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });

  /* ═══ v2.3.1814: A BRAND-NEW PLAYER MEETS THE LOGIN DOOR FIRST ═══
     Owner: "a new login screen needs to be made ... It should have button
     for Login (put in key) or create new character."
     This file drives its own context precisely BECAUSE it is the
     never-loaded-before case, which makes it the right place to assert what
     a first-time player actually lands on — not just to click through it. */
  await page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  rec.ok('a first-time player lands on the login screen, not straight in the creator',
    !(await page.$('input.bt-cc-name')), {});
  await page.click('[data-tut="login-create"]');

  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await page.fill('input.bt-cc-name', 'Newcomer');
  await page.click('button.bt-cc-play');

  const live = await page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout: 120000, polling: 500 }).then(() => true).catch(() => false);
  rec.ok('a brand-new player reaches the world', live);

  /* The intro is allowed to be playing here — that is the normal case,
     and the point of the next assertion. */
  const lifted = await page.waitForFunction(() => document.querySelectorAll('video').length === 0,
    null, { timeout: 15000, polling: 200 }).then(() => true).catch(() => false);
  rec.ok('the intro clip lifts on its own (never traps the player)', lifted);

  const railTappable = await page.locator('.bt-navrail [aria-label="Character"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the nav rail is usable as soon as the intro lifts', railTappable);

  await page.waitForTimeout(400);
  /* Hero's section tabs are icon-only (v2.3.1657), so assert on content
     the panel actually renders as text rather than on tab captions. */
  const opened = await page.evaluate(() => /Your stats|Damage|DPS/.test(document.body.innerText || ''));
  rec.ok('the first tap actually opens a screen', opened);

  await ctx.close().catch(() => {});
}
