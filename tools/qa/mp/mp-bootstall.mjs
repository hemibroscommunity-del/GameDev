/* The login door survives a worker that never answers (v2.3.1921).
 *
 * Owner: "it just keeps saying checking for character on login menu."
 *
 * The boot check holds bootPhase at 'checking' until checkAccountLogin
 * settles.  A REJECTED request was always handled — the catch returns
 * 'unavailable' and the door appears — but a bare fetch does not reject
 * when the far end accepts the connection and then goes silent, which is
 * what a worker does mid-deploy and what a phone does on a stalled cell
 * handoff.  Nothing settled, so the screen said "Checking for your
 * character…" until the player reloaded.
 *
 * This reproduces exactly that: the account-login request is intercepted
 * and NEVER answered — not failed, HUNG, because failing was never the
 * broken case.  Then it waits past the timeout and asserts the player is
 * looking at a door they can use.
 */
import * as H from './harness.mjs';

const TIMEOUT_MS = 8000;

export async function run({ browser, wsPort, webPort, rec }) {
  /* A key seeded BEFORE first paint is what sends the boot down the checking
     road at all — without one it goes straight to the door and this tests
     nothing.  newPlayer's `phrase` option exists for exactly that reason and
     writes it in an init script, which is the only moment early enough: the
     boot check runs on mount. */
  const P = await H.newPlayer(browser, { name: 'Stalled', wsPort, webPort,
    viewport: { width: 390, height: 844 },
    phrase: 'stall-test-key-one-two' });

  /* Hang the boot check.  Playwright's handler simply never calls
     fulfill/abort, so the request sits open exactly as it does against a
     worker that is restarting.  NOT abort() — a rejected request was always
     handled correctly, and testing the half that already worked is how this
     bug survived. */
  let seen = 0;
  await P.page.route('**/api/account/login', async () => { seen++; /* never respond */ });
  await P.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});

  /* Mid-flight: it SHOULD be saying "checking" — if it never does, the
     scenario is not exercising the road it claims to. */
  await P.page.waitForTimeout(1500);
  const during = await P.page.evaluate(() => ({
    phase: (window.__btPhase || {}).bootPhase || null,
    text: (document.body.innerText || '').slice(0, 400),
  }));
  rec.ok('the boot check is actually running (guard)',
    during.phase === 'checking' || /Checking for your character/i.test(during.text), during);
  rec.ok('...and the request really was intercepted (guard)', seen > 0, { seen });

  /* Now wait past the timeout. */
  await P.page.waitForTimeout(TIMEOUT_MS + 3000);
  const after = await P.page.evaluate(() => ({
    phase: (window.__btPhase || {}).bootPhase || null,
    route: window.__btBootRoute || null,
    text: (document.body.innerText || '').slice(0, 400),
    stillChecking: /Checking for your character/i.test(document.body.innerText || ''),
    /* The door's buttons are PAINTED behind the checking note and disabled
       while it runs, so "the text is on screen" does not tell you whether
       the player can act.  Enabled-ness does. */
    doorLive: (() => {
      /* v2.3.1923: the door's two buttons by their data-tut handles rather
         than by their labels.  The key button was renamed "Log in with your
         Key" -> "Continue" when it started opening the character picker, and
         a label match that silently degrades to finding only ONE of the two
         still reports a live door — which is the half of this check that
         would have gone quiet. */
      const btns = [...document.querySelectorAll('[data-tut="login-create"], [data-tut="login-key"]')];
      return { n: btns.length, enabled: btns.filter((b) => !b.disabled).length };
    })(),
  }));

  rec.ok('a worker that never answers does not strand the player on "Checking…"',
    after.stillChecking === false, after);
  rec.ok('...it lands on the login door instead',
    after.phase === 'login' || after.route === 'login', after);
  /* The door has to be USABLE, not merely painted — the whole point is a
     way forward without a manual reload.  Testing for the TEXT passed in
     the control run too (the buttons are rendered behind the checking note
     the whole time), so it discriminated nothing; enabled-ness is the
     property that actually differs. */
  rec.ok('...offering a way in that can be clicked',
    !!after.doorLive && after.doorLive.enabled > 0, after.doorLive);

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/bootstall.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
