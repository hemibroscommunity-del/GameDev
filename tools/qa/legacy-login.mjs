/* tools/qa/legacy-login.mjs — the one way into the world for the
   top-level QA harnesses.
   ═══════════════════════════════════════════════════════════════════
   v2.3.1964: WHY THIS FILE EXISTS.
   Six harnesses in this directory opened with

       await page.locator('input').first().fill(name);
       await input.press('Enter');

   which was correct when the creator WAS the landing screen: the name
   box was the first (and only) input on the page.  v2.3.1814 put a
   login door in front of it — "Continue" / "Create Character" — and
   the splash now has no input at all, so that fill waits out its full
   timeout and dies.  Nobody saw it because the smoke job left the PR
   path on 2026-07-16 (owner directive) and only runs on demand; the
   next dispatch, six weeks later, failed on the very first session.

   tools/qa/mp/harness.mjs already learned this door (its enterWorld,
   also v2.3.1814).  This is the same sequence for harnesses that drive
   a bare Playwright page instead of the mp harness's context objects —
   deliberately a copy of the SHAPE and not an import, because
   harness.mjs owns context creation, logging and teardown that these
   scripts do their own way.  Keep the two in step: if the door changes
   again, both files change.  */

/** Take a freshly-loaded page from the splash into the live world.
 *  Resolves once the world is up; throws (with a readable message) if
 *  it never gets there. */
export async function legacyLogin(page, name, timeout = 90000) {
  /* Wait for whichever screen this device gets.  A browser whose key
     already has a character skips both screens and walks straight in —
     waiting for a specific screen would hang forever on that path and
     read as a broken login rather than a working one. */
  await page.waitForFunction(() => {
    if (window.__btBootRoute === 'resume') return true;
    return !!(document.querySelector('input.bt-cc-name')
      || document.querySelector('[data-tut="login-create"]'));
  }, null, { timeout: 30000, polling: 250 });

  const resumed = await page.evaluate(() => window.__btBootRoute === 'resume');
  if (!resumed) {
    /* v2.3.2111: the door opens the character list by itself when the device
       has characters (LoginScreen), and that list covers both buttons. */
    if (await page.$('[data-tut="char-picker"]')) {
      const back = await page.$('[data-tut="char-picker"] >> text=Back');
      if (back) { await back.click(); await page.waitForTimeout(400); }
    }
    if (await page.$('[data-tut="login-create"]')) {
      await page.click('[data-tut="login-create"]');
      await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    }
    await page.fill('input.bt-cc-name', name);
    await page.click('button.bt-cc-play');
  }

  /* The loading screen preloads every global animation before the intro
     lifts (the animation-preloading law), so this legitimately takes a
     while.  window._gameState is the REF; the live object is .current. */
  await page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout, polling: 500 });

  /* v2.3.1668: the intro clip is still painted over the live world for
     a couple of seconds, and a tap that lands on it fails as "covered
     by <video>".  Waited for, not slept through; a build with no intro
     must not hang here. */
  await page.waitForFunction(() => document.querySelectorAll('video').length === 0,
    null, { timeout: 15000, polling: 200 }).catch(() => {});
}
