/* A PANEL THAT ANSWERS, EVEN WHEN THE SERVER DOES NOT (v2.3.2436).
 *
 * Owner, on a phone, against production: "I tapped the flags button and
 * nothing was happening."  The screenshot showed the test panel with
 * "Working…" under it and no error, forever.
 *
 * THE DEFECT WAS NOT THE FLAGS RAIL.  mp-devflags drives that whole rail end
 * to end and is green -- list, warn, clear, and the worker agreeing.  What
 * was broken is what the panel does when a request does not come back:
 *
 *   1. `fetch` has no timeout.  `busy` was cleared only in the `finally` of
 *      the fetch, and EVERY control is `disabled={busy}`, so one swallowed
 *      request froze the entire panel behind a single word with no error and
 *      no way out but closing it.  A dead button and a stalled request look
 *      exactly the same from a thumb.
 *
 *   2. The panel fires a state refresh BY ITSELF on open.  That automatic
 *      call set the same `busy` -- so a request the owner never made
 *      disabled the flags button they were pressing -- and wrote its failure
 *      into the status line, greeting them with "this worker does not have
 *      the test routes yet" about a round trip they did not ask for.
 *
 * Both are pinned here by making the admin surface HANG (a Playwright route
 * that never answers), because that is the one condition neither the server
 * suite nor mp-devflags can produce: their worker always replies.
 *
 * The third section is the other half of the same story.  The reason the
 * owner was in this panel at all was to find out whether `caps.prog3` was
 * off -- and the only surface that could tell them needed a key, a network
 * and a worker that answers.  So the panel now reads the caps the client
 * ALREADY holds from its join.  This proves that readout works with no admin
 * key typed in at all, which is the state every owner is in before they find
 * their key, and the state they are stuck in when the admin rail is down.
 */
import * as H from './harness.mjs';

/* Press it where a finger would -- see mp-devflags' note and TRAPS 67: a
   synthesised pointerdown skips the hit test, which is how a title that
   could not be pressed at all once kept this suite green. */
const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return 'no title element';
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return 'ok';
};

const waitPanel = async (P, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'))) return true;
    await P.page.waitForTimeout(250);
  }
  return false;
};

/* The button AS A CONTROL: found, and whether a thumb could actually use it.
   `disabled` is the assertion, not the presence -- a disabled button is
   exactly what the owner was tapping. */
const btnState = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  return b ? { found: true, disabled: !!b.disabled } : { found: false, disabled: null };
}, text);

const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, text);

const panelText = (P) => P.page.evaluate(() => {
  const strong = Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel');
  const sheet = strong && strong.parentElement && strong.parentElement.parentElement;
  return sheet ? (sheet.textContent || '').replace(/\s+/g, ' ').trim() : '';
});

/* The keyless readout marks itself, so this reads the CONCLUSION the panel
   drew rather than re-deriving it from prose that could be reworded. */
const capsOff = (P) => P.page.evaluate(() => {
  const n = document.querySelector('[data-caps-off]');
  if (n) return n.getAttribute('data-caps-off').split(',').filter(Boolean);
  return document.querySelector('[data-caps-ok]') ? [] : null;
});

const admin = (wsPort, path, init) => fetch('http://127.0.0.1:' + wsPort + '/api/admin' + path,
  Object.assign({ headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } }, init || {})).then((r) => r.json());

const setFlag = (wsPort, name, value) => admin(wsPort, '/flags', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, value }),
});

/* A route that accepts the request and never answers it.  This is the
   production condition the whole file is about; nothing else in the suite
   can make the worker do it. */
const blackhole = (page, pattern) => page.route(pattern, () => { /* deliberately never settled */ });

export async function run({ browser, wsPort, webPort, rec }) {
  /* ══ 1. THE KEYLESS READOUT, in the owner's exact situation ══
     A cap-named live flag is how caps.prog3 goes false on a healthy worker
     (liveops.js spreads the flag map over the caps literal LAST). */
  const set = await setFlag(wsPort, 'prog3', false);
  rec.ok('setup: a cap-named flag switches prog3 off on this worker',
    set.ok === true && set.flags.prog3 === false, set);

  const A = await H.newPlayer(browser, { name: 'CapReader', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 } });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);

  /* CONTROL: without this the section below could "pass" against a worker
     that never switched anything off. */
  const capA = await H.readState(A, (S) => ({ prog3: (S._serverCaps || {}).prog3, trade: (S._serverCaps || {}).trade }));
  rec.ok('control: the client really did receive prog3 as off', capA.prog3 === false, capA);
  rec.ok('control: ...and trade as on, so "off" is not just an empty caps map', capA.trade === true, capA);

  rec.ok('the panel opens on a long press', await (async () => { await holdTitle(A, 2000); return waitPanel(A); })(), {});

  /* THE POINT: no key has ever been typed on this device. */
  const keyless = await A.page.evaluate(() => ({
    stored: (() => { try { return localStorage.getItem('bt_dev_key'); } catch (e) { return 'ERR'; } })(),
    prompting: !!document.querySelector('input[type="password"]'),
  }));
  rec.ok('no admin key is stored on this device, and the panel is asking for one',
    keyless.stored === null && keyless.prompting === true, keyless);

  const off1 = await capsOff(A);
  console.log('    caps off: ' + JSON.stringify(off1));
  rec.ok('with NO key and NO admin request, the panel names the switched-off system',
    Array.isArray(off1) && off1.indexOf('prog3') >= 0, { off1 });
  /* The discriminator: a readout that flagged everything would be useless. */
  rec.ok('...and does not accuse a capability this worker did claim',
    Array.isArray(off1) && off1.indexOf('trade') < 0, { off1 });
  const txt1 = await panelText(A);
  rec.ok('...and says in words what that costs the player',
    /Points screen/.test(txt1) && /falls back to its old behaviour/.test(txt1), { txt1: txt1.slice(0, 240) });

  await A.ctx.close().catch(() => {});

  /* ══ 2. AN AUTOMATIC REQUEST MUST NOT DISABLE A BUTTON NOBODY PRESSED ══
     The owner's device already had a key saved, so the panel's own state
     refresh fires the moment it opens.  Hang it. */
  await admin(wsPort, '/flags?name=prog3', { method: 'DELETE' });
  const B = await H.newPlayer(browser, { name: 'StallTest', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 } });
  await H.enterWorld(B);
  await B.page.waitForTimeout(2000);

  const capB = await H.readState(B, (S) => (S._serverCaps || {}).prog3);
  rec.ok('control: with the flag cleared this worker claims prog3 again', capB === true, { capB });

  await B.page.evaluate((k) => { localStorage.setItem('bt_dev_key', k); }, H.ADMIN_KEY);
  await blackhole(B.page, '**/api/admin/dev/state*');

  rec.ok('the panel opens with a key already saved', await (async () => { await holdTitle(B, 2000); return waitPanel(B); })(), {});
  await B.page.waitForTimeout(1500);

  /* THE HEADLINE.  Pre-fix the automatic refresh set `busy`, so this button
     -- which the owner is pressing, and which talks to a different route --
     was disabled by a request they never made and that never came back. */
  const flagsBtn = await btnState(B, 'Show live flags');
  rec.ok('the flags button exists', flagsBtn.found === true, flagsBtn);
  rec.ok('a hung AUTOMATIC refresh does not disable it', flagsBtn.disabled === false, flagsBtn);
  const txtB = await panelText(B);
  rec.ok('...and does not put the panel into "Working…" over a request nobody made',
    !/Working…/.test(txtB), { txtB: txtB.slice(0, 240) });
  /* Nor does it narrate a failure for that unrequested call. */
  rec.ok('...and does not blame the worker for a call nobody made',
    !/does not have the test routes/.test(txtB) && !/Network error/.test(txtB), { txtB: txtB.slice(0, 240) });

  /* And it still WORKS while that other request hangs. */
  rec.ok('the button can be pressed', await tap(B, 'Show live flags'), {});
  await B.page.waitForTimeout(1500);
  const txtB2 = await panelText(B);
  rec.ok('the flags load while the other request is still hanging',
    /No flags set/.test(txtB2), { txtB2: txtB2.slice(0, 240) });

  /* ══ 3. A REQUEST THE OWNER *DID* MAKE, THAT NEVER COMES BACK ══
     Correct behaviour is not "never show Working…" -- it is to show it, then
     GIVE UP OUT LOUD.  Both halves are asserted. */
  await blackhole(B.page, '**/api/admin/flags*');
  rec.ok('the reload button is offered', await tap(B, 'Reload live flags'), {});
  await B.page.waitForTimeout(600);
  const during = await btnState(B, 'Reload live flags');
  const txtD = await panelText(B);
  rec.ok('a call the owner DID make shows it is working', /Working…/.test(txtD), { txtD: txtD.slice(0, 200) });
  rec.ok('...and holds the button while it does', during.disabled === true, during);

  /* 12s timeout + margin.  Deliberately a wall-clock wait: the defect IS
     that this moment never arrived. */
  await B.page.waitForTimeout(14000);
  const after = await btnState(B, 'Reload live flags');
  const txtA2 = await panelText(B);
  console.log('    after the timeout: ' + JSON.stringify(txtA2.slice(-140)));
  rec.ok('the panel gives up out loud instead of sitting on "Working…" forever',
    /No answer from the server after 12s/.test(txtA2), { txtA2: txtA2.slice(-200) });
  rec.ok('...stops saying it is working', !/Working…/.test(txtA2), { txtA2: txtA2.slice(-200) });
  rec.ok('...and hands the button back so it can be tried again', after.disabled === false, after);
  /* A timeout is ours, not the network refusing -- saying "network error"
     sends the owner to check their wifi over a request the server simply
     never answered. */
  rec.ok('...and does not misreport it as a network error', !/Network error/.test(txtA2), { txtA2: txtA2.slice(-200) });

  await B.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/devstall.png` }).catch(() => {});
  await B.ctx.close().catch(() => {});
}
