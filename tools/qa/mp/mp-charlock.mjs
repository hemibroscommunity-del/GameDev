/* A CHARACTER YOU MAKE ONCE (v2.3.1814).
 *
 * Owner: "character selections in terms of names and traits picked during
 * login should be permanent.  When you load a character using the key it
 * should just bring you into the game not the login menu anymore.  Which
 * means a new login screen needs to be made (re use the same splash
 * screen).  It should have button for Login (put in key) or create new
 * character."
 *
 * Four claims, and each one is a different failure if it breaks:
 *   1. A fresh browser lands on the LOGIN screen, not in the creator.
 *   2. Creating a character locks its name and look to the identity.
 *   3. Re-entering with the SAME key skips every pre-game screen.
 *   4. The look survives on a device that has never seen this character —
 *      the Login Key case, which is the whole reason the record is
 *      server-side rather than in localStorage.
 *
 * (4) is the one worth being careful about: it is easy to write a test that
 * passes because the look is still sitting in the first browser's module
 * state.  So it runs in a SECOND browser context with its own storage, and
 * asserts the traits arrive there having never been picked there.
 */
import * as H from './harness.mjs';

const route = (P) => P.page.evaluate(() => window.__btBootRoute || null);
const phraseOf = (P) => P.page.evaluate(() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } });
const record = (P) => P.page.evaluate(() => (window.__btCharRecord ? window.__btCharRecord() : null));
const look = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return S ? { name: S.myName, torso: S.bodyTorso, legs: S.bodyLegs } : null;
});
const visible = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. a fresh browser lands on the login door ── */
  const A = await H.newPlayer(browser, { name: 'Locke', wsPort, webPort });
  await A.page.waitForTimeout(2500);

  const r0 = await route(A);
  rec.ok('a fresh browser is routed to the LOGIN screen, not the creator',
    r0 === 'login', { route: r0 });
  rec.ok('...and both doors are on it — log in, or create',
    (await visible(A, '[data-tut="login-key"]')) && (await visible(A, '[data-tut="login-create"]')),
    { key: await visible(A, '[data-tut="login-key"]'), create: await visible(A, '[data-tut="login-create"]') });
  /* GUARD: the creator must NOT be mounted behind it — "the login screen is
     first" is only true if the thing it replaced is actually gone. */
  rec.ok('the creator is not mounted underneath (guard)',
    !(await visible(A, '.bt-cc-shell')), {});

  /* ── 2. create a character, and let the worker lock it in ── */
  await A.page.click('[data-tut="login-create"]');
  await A.page.waitForTimeout(1200);
  rec.ok('"Create a new character" opens the creator',
    await visible(A, '.bt-cc-shell'), {});

  await H.enterWorld(A);
  await A.page.waitForTimeout(3500);

  const key = await phraseOf(A);
  const made = await record(A);
  const madeLook = await look(A);
  rec.ok('the device has a Login Key to come back with (guard)', !!key, { key: !!key });
  rec.ok('the worker stored the character against the identity',
    !!(made && made.look), { made });
  rec.ok('...including the name that was entered',
    !!(made && made.name && madeLook && made.name === madeLook.name),
    { stored: made && made.name, live: madeLook && madeLook.name });

  await A.ctx.close().catch(() => {});

  /* ── 3. the same key walks straight in ── */
  const B = await H.newPlayer(browser, { name: 'ignored', wsPort, webPort, phrase: key });
  await B.page.waitForTimeout(3000);
  const r1 = await route(B);
  rec.ok('a device holding the key skips the login screen entirely',
    r1 === 'resume', { route: r1 });
  rec.ok('...and shows no pre-game screen at all',
    !(await visible(B, '.bt-name-modal')), {});

  /* ── 4. and it arrives wearing its own face on a device that never made it ──
     B has its own storage and never ran the trait picker, so anything it is
     wearing came off the wire. */
  await B.page.waitForTimeout(2500);
  const arrived = await look(B);
  const bRec = await record(B);
  rec.ok('the stored look reaches a device that never picked it',
    !!(bRec && bRec.look && Object.keys(bRec.look).length > 0), { bRec });
  rec.ok('...and the name came with it',
    !!(arrived && made && arrived.name === made.name),
    { expected: made && made.name, got: arrived && arrived.name });

  await B.ctx.close().catch(() => {});
}
