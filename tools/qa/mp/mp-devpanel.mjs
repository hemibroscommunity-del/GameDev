/* THE OWNER'S TEST PANEL, ON A REAL CLIENT (v2.3.2240).
 *
 * Owner: "test features directly without needing to play through the quest
 * line".  The server suite (server/test/devtools.test.mjs) proves the four
 * operations are correct and that nothing but the admin key can reach them.
 * What it cannot see is the half that decides whether the owner is actually
 * unblocked: does the panel OPEN on a phone-shaped gesture, does it talk to
 * the worker cross-origin, and does a real character walk out of the tutorial
 * gate afterwards.
 *
 * THE FAILURE THIS FILE EXISTS TO CATCH is a panel that is perfect and
 * unreachable -- the same class as an ability whose client whitelist has no
 * entry, which this repo has shipped four times.  So the FIRST assertion is
 * the long press, and the LAST is a real move into a zone that was shut when
 * the run began.
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

const panelUp = (P) => P.page.evaluate(() =>
  !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));

const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

export async function run({ browser, wsPort, webPort, rec }) {
  /* The admin /player summary carries no `z` (it never has -- an earlier
     version of this file asserted on it and reported a working warp as
     broken).  /dev/state is the endpoint that does, so the server's own
     answer is what every zone assertion below reads. */
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());
  const P = await H.newPlayer(browser, { name: 'Owner', wsPort, webPort, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const myId = await H.readState(P, (S) => S.myId);

  /* ── 1. A SHORT PRESS MUST NOT OPEN IT ──
     The gesture has to be one nobody performs by accident, or the panel is
     a trap for a player who taps the header. */
  await holdTitle(P, 250);
  await P.page.waitForTimeout(500);
  rec.ok('a short tap on the zone name does NOT open the panel', !(await panelUp(P)), {});

  /* ── 2. THE LONG PRESS OPENS IT ── */
  const held = await holdTitle(P, 1500);
  await P.page.waitForTimeout(900);          /* the panel is lazily imported */
  rec.ok('the zone-name element exists to press', held === 'ok', { held });
  rec.ok('a 1.2s press opens the test panel', await panelUp(P), {});

  /* ── 3. IT ASKS FOR A KEY, AND DOES NOTHING WITHOUT ONE ── */
  const asksForKey = await P.page.evaluate(() => !!document.querySelector('input[type="password"]'));
  rec.ok('with no key stored it asks for one', asksForKey, {});

  /* ── 4. WITH THE KEY, IT REACHES THE WORKER CROSS-ORIGIN ──
     The page is served from the dist server and the worker is a different
     origin, so this also pins that the admin routes answer preflight. */
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  const gotState = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf('Unlock every gated zone') >= 0));
  rec.ok('with a key it shows the tools', gotState, {});

  /* ── 5. THE GATE IS SHUT BEFORE ── */
  const before = await devState(myId);
  rec.ok('ember is gated before we start (guard)',
    before.ok && before.zones && before.zones.ember === false, before.zones);

  /* ── 6. UNLOCK ── */
  rec.ok('the unlock button is there to press', await tap(P, 'Unlock every gated zone'), {});
  await P.page.waitForTimeout(1800);
  const opened = await devState(myId);
  console.log('    ZONES AFTER UNLOCK -> ' + JSON.stringify(opened.zones));
  rec.ok('every gated zone reads open on the SERVER',
    opened.zones && Object.values(opened.zones).every(Boolean), opened.zones);

  /* ── 7. AND THE CHARACTER CAN NOW ACTUALLY GO ──
     The real test of the whole feature: drive an ordinary client move into
     ember and read the SERVER's opinion of where the player is.  Anything
     less would be checking our own paperwork. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'ember';
    S.channel.send({ type: 'move', x: 500, y: 500, z: 'ember' });
  });
  await P.page.waitForTimeout(2500);
  const after = await devState(myId);
  console.log('    SERVER ZONE AFTER MOVE -> ' + after.zone);
  rec.ok('the player is now IN ember, with no quest played', after.zone === 'ember', { zone: after.zone });

  /* ── 8. GOD MODE ROUND-TRIPS ── */
  await holdTitle(P, 1500);
  await P.page.waitForTimeout(900);
  rec.ok('the panel reopens', await panelUp(P), {});
  rec.ok('god mode has a button', await tap(P, 'God mode'), {});
  await P.page.waitForTimeout(1600);
  const godSrv = await devState(myId);
  rec.ok('god mode is really ON server-side', godSrv.god === true && godSrv.godMsLeft > 0, { god: godSrv.god, ms: godSrv.godMsLeft });
  await P.page.waitForTimeout(1500);
  const btnTexts = await P.page.evaluate(() => Array.from(document.querySelectorAll('button')).map((n) => n.textContent).filter((t) => /God|Heal|Unlock/.test(t)));
  console.log('    BUTTONS -> ' + JSON.stringify(btnTexts));
  const godOn = await P.page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf('God mode ON') >= 0));
  rec.ok('...and the panel reflects the server, not a local guess', godOn, {});

  /* ── 9. FORGETTING THE KEY LEAVES NOTHING BEHIND ── */
  rec.ok('there is a forget button', await tap(P, 'Forget key'), {});
  await P.page.waitForTimeout(600);
  const cleared = await P.page.evaluate(() => {
    try { return localStorage.getItem('bt_dev_key') === null; } catch (e) { return false; }
  });
  rec.ok('the key is gone from the device', cleared, {});

  await P.ctx.close().catch(() => {});
}
