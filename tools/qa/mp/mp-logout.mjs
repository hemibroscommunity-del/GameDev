/* Where does Log Out land you? (v2.3.1840)
 *
 * Owner: "log out behavior should bring you back to main splash screen of
 * create new character or the use key option.  Right now it doesn't."
 *
 * It didn't, and the reason is that there are TWO roads into the world.
 * Logout reloaded with `?noresume=1`, which suppresses the resume SNAPSHOT —
 * but the boot check is a separate road: stored key -> ask the worker whether
 * it has a character -> yes -> bootPhase null -> auto-join.  So the reload
 * went straight back into town and logging out looked like it did nothing.
 *
 * This drives the real chip and the real confirm, then asserts on the SCREEN
 * the player is looking at: both doors present, and the world gone.  It also
 * asserts the key SURVIVED, because the lazy way to force a login screen is
 * to wipe the passphrase — and the passphrase IS the character.
 */
import * as H from './harness.mjs';

const LOGOUT_CHIP = '[aria-label="Log out to the character screen"]';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Leaver', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const keyBefore = await P.page.evaluate(() => {
    try { return localStorage.getItem('bt_passphrase') || null; } catch (e) { return null; }
  });
  rec.ok('the character has a stored key before logging out (guard)', !!keyBefore,
    { hasKey: !!keyBefore });

  const chip = await P.page.$(LOGOUT_CHIP);
  rec.ok('the log-out chip is on screen', !!chip, { selector: LOGOUT_CHIP });
  if (!chip) return;

  /* Real clicks, not in-page .click(): an in-page click skips hit testing and
     would "press" a chip that something else is covering. */
  await chip.click();
  await P.page.waitForTimeout(500);
  const confirmBtn = await P.page.$('text=Log Out');
  rec.ok('...and it asks before throwing you out', !!confirmBtn, {});
  if (!confirmBtn) return;

  await Promise.all([
    P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    confirmBtn.click(),
  ]);
  await P.page.waitForTimeout(3500);

  const landed = await P.page.evaluate(() => {
    const txt = (document.body.innerText || '');
    return {
      url: location.search,
      route: window.__btBootRoute || null,
      hasCreate: /Create Character/i.test(txt),
      hasKey: /Log in with your Key/i.test(txt),
      /* The world is a canvas; the door is not. */
      canvases: document.querySelectorAll('canvas').length,
      keyStillThere: (() => {
        try { return !!localStorage.getItem('bt_passphrase'); } catch (e) { return null; }
      })(),
      text: txt.slice(0, 220),
    };
  });

  rec.ok('logging out lands on the door, not back in the world',
    landed.route === 'login-forced', landed);
  rec.ok('...offering Create Character', !!landed.hasCreate, landed);
  rec.ok('...and Log in with your Key', !!landed.hasKey, landed);
  /* THE ONE THAT MATTERS MOST: characters are permanent and the passphrase IS
     the character, so forcing the login screen by wiping the key would throw
     the character away to fix a routing bug. */
  rec.ok('...without throwing the character away — the key survives',
    landed.keyStillThere === true, { keyStillThere: landed.keyStillThere });
}
