/* LIVE FLAGS IN THE OWNER'S PANEL (v2.3.2412).
 *
 * WHY THIS SCENARIO EXISTS, and it is not really about flags.
 *
 * 2026-09-09, production: the owner reported combat levels reading 0. The
 * Points screen showed Melee/Bow/Magic at Lv 0 while the panel one tap behind
 * it read "Melee skill - Lv 1" for the same character in the same second.
 * That pair is the diagnosis: the grid is gated on prog3Live (worker cap AND
 * blob), the panel on prog3HasSkills (blob only). So the blob was healthy and
 * caps.prog3 was false -- and a clean worker built from the same source
 * advertises 42 caps with prog3 true, so the code was never wrong.
 *
 * liveops.js's own header explains it: the `liveflags` map is spread over the
 * state_sync caps literal LAST, so a flag named after a capability overrides
 * the baked-in true, and "overriding a cap to false ... can re-enable legacy
 * client-side fallback paths". The legacy path is the one that prints Lv 0.
 *
 * The routes to read and clear that map have existed since v2.3.1150. What
 * did not exist was any way to reach them from a phone, which is the only
 * device the owner has. So the real defect was an operator surface that
 * required a computer, and a flag set once in an emergency could sit in
 * Durable Object storage for months, silently disabling a system, with
 * nothing anywhere saying so.
 *
 * THE FAILURE THIS FILE CATCHES is therefore the same class mp-devpanel was
 * written for -- a panel that is correct and unreachable -- plus one more:
 * a list that shows the flags but does not SAY which of them is breaking
 * something. A flag named `prog3` reading `false` in a list of twelve is not
 * a diagnosis; the warning line is the feature.
 */
import * as H from './harness.mjs';

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);

const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

/* The flag ROWS, read out of the DOM the way a human reads them. */
const rows = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('button'))
  .filter((b) => (b.textContent || '').trim() === 'Clear')
  .map((b) => {
    const row = b.parentElement;
    const spans = Array.from(row.querySelectorAll('span'));
    return { name: (spans[0] && spans[0].textContent || '').trim(), value: (spans[1] && spans[1].textContent || '').trim() };
  }));

const warning = (P) => P.page.evaluate(() => {
  const n = Array.from(document.querySelectorAll('b')).find((b) => /switching a\s+system off/.test(b.textContent || ''));
  return n ? (n.parentElement.textContent || '').replace(/\s+/g, ' ').trim() : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const admin = async (path, init) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin' + path,
    Object.assign({ headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } }, init || {}))).json());

  const P = await H.newPlayer(browser, { name: 'FlagOwner', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* CONTROL: the worker starts with no flags, so a green "prog3" cap. */
  const caps0 = await H.readState(P, (S) => (S._serverCaps || {}).prog3);
  rec.ok('control: this worker advertises caps.prog3 (guard: the whole bug is this going false)', caps0 === true, { caps0 });
  const f0 = await admin('/flags');
  rec.ok('control: no live flags are set to begin with', f0.ok === true && Object.keys(f0.flags || {}).length === 0, f0);

  await holdTitle(P, 1500);
  await P.page.waitForTimeout(900);
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1200);

  /* ── 1. AN EMPTY MAP SAYS SO, rather than showing nothing at all ──
     A blank area is indistinguishable from a failed request. */
  rec.ok('the panel offers to show live flags', await tap(P, 'Show live flags'), {});
  await P.page.waitForTimeout(1200);
  const emptyText = await P.page.evaluate(() => /No flags set/.test(document.body.textContent || ''));
  rec.ok('with no flags set, it says so in words', emptyText, {});
  rec.ok('...and lists no flag rows', (await rows(P)).length === 0, await rows(P));

  /* ── 2. THE REAL CASE: a flag whose NAME IS A CAPABILITY ──
     This is exactly what happened in production. */
  const set1 = await admin('/flags', { method: 'POST', headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'prog3', value: false }) });
  rec.ok('a cap-named flag can be set to false on the worker (setup)', set1.ok === true && set1.flags.prog3 === false, set1);
  /* A `disable_*` kill switch set alongside it, because the discriminating
     assertion is that these two are NOT treated the same. */
  const set2 = await admin('/flags', { method: 'POST', headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'disable_jackpot', value: true }) });
  rec.ok('an ordinary kill switch can be set too (setup)', set2.ok === true, set2);

  rec.ok('reloading the list is offered once loaded', await tap(P, 'Reload live flags'), {});
  await P.page.waitForTimeout(1300);
  const r2 = await rows(P);
  console.log('    rows: ' + JSON.stringify(r2));
  rec.ok('both flags are listed (' + r2.length + ')', r2.length === 2, r2);
  rec.ok('prog3 is listed with its value false', !!r2.find((x) => x.name === 'prog3' && x.value === 'false'), r2);
  rec.ok('disable_jackpot is listed too', !!r2.find((x) => x.name === 'disable_jackpot'), r2);

  /* ── 3. THE FEATURE: it NAMES the flag that is breaking something ──
     A list alone is not a diagnosis. */
  const w = await warning(P);
  console.log('    warning: ' + JSON.stringify(w));
  rec.ok('a warning calls out the cap-overriding flag', !!w, { w });
  rec.ok('...and names prog3 specifically', !!w && w.indexOf('prog3') >= 0, { w });
  /* THE DISCRIMINATOR: a kill switch is not a cap override, and saying it is
     would make the warning noise the owner learns to ignore. */
  rec.ok('...and does NOT accuse the ordinary kill switch', !!w && w.indexOf('disable_jackpot') < 0, { w });

  /* ── 4. CLEARING IT REACHES THE WORKER, not just the DOM ──
     The whole point is repairing live state, so the server's answer is the
     one that counts. */
  const cleared = await P.page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => (b.textContent || '').trim() === 'Clear');
    for (const b of btns) {
      const row = b.parentElement;
      const first = row.querySelector('span');
      if (first && first.textContent.trim() === 'prog3') { b.click(); return true; }
    }
    return false;
  });
  rec.ok('the prog3 row has a Clear button to press', cleared, {});
  await P.page.waitForTimeout(1400);

  const f2 = await admin('/flags');
  rec.ok('the WORKER no longer holds prog3 (not just the screen)', f2.ok === true && !('prog3' in (f2.flags || {})), f2);
  rec.ok('...and the untouched kill switch survived', f2.flags && f2.flags.disable_jackpot === true, f2);
  const r3 = await rows(P);
  rec.ok('the row is gone from the panel as well', !r3.find((x) => x.name === 'prog3'), r3);
  rec.ok('the warning goes with it', (await warning(P)) === null, {});

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/devflags.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
