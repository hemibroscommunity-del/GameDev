/* ═══ THE TEST PANEL'S ZONE TELEPORT, FROM WHEREVER YOU ARE (v2.3.2308) ═══
 *
 * Owner (backlog #37): an admin mode with zone teleport.
 *
 * The panel has had zone chips since v2.3.2240, and mp-devpanel does NOT
 * press them -- it drives a synthetic `move` message instead, so the buttons
 * the owner actually taps have never been exercised by anything.  Pressing
 * them here found the feature dead where he uses it: from TOWN, the chip
 * printed "head there first" and left the player in town, on the client and
 * on the worker.
 *
 * TWO THINGS ARE ASSERTED, NOT ONE.  "He ends up in the zone" is the ask, but
 * a build that satisfied only that would be the dangerous one: setting
 * S.currentZone directly arrives instantly and skips the per-zone asset load,
 * which is CLAUDE.md's animation-preloading law and the reason the game stopped
 * being "wonky with RAM" on iPhone.  So this file also watches the ROUTE -- the
 * intermediate hub it must pass through -- and the per-zone LOADING OVERLAY,
 * which only exists on the real front door.  A shortcut passes the first
 * assertion and fails those two.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

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

const openPanel = async (P) => {
  if (await panelUp(P)) return true;
  await holdTitle(P, 1500);
  await P.page.waitForTimeout(900);
  return panelUp(P);
};

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);

export async function run({ browser, wsPort, webPort, rec }) {
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());

  const P = await H.newPlayer(browser, { name: 'Owner', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  /* Key in, gates open. Both are already proven by mp-devpanel; here they are
     only setup, so a failure in them must not read as a warp failure. */
  await openPanel(P);
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  const seeded = await devState(myId);
  rec.ok('setup: the key works and every zone is open on the worker',
    seeded.ok && seeded.zones && Object.values(seeded.zones).every(Boolean), seeded.zones);

  const startZone = await zoneOf(P);
  rec.ok('setup: we begin in town, which is NOT the World View', startZone === 'town', { startZone });

  /* ── 1. FROM TOWN ──
     Watch the whole journey, not just its end: a 60ms sampler records every
     zone the player is in and every appearance of the per-zone loading
     overlay.  Both are what separate "walked through the doors" from "was
     teleported", and only one of those obeys the preloading law. */
  await P.page.evaluate(() => {
    window.__btWarpTrace = { zones: [], loads: [] };
    if (window.__btWarpTimer) clearInterval(window.__btWarpTimer);
    window.__btWarpTimer = setInterval(() => {
      const S = window._gameState && window._gameState.current;
      const t = window.__btWarpTrace;
      if (!S || !t) return;
      if (t.zones[t.zones.length - 1] !== S.currentZone) t.zones.push(S.currentZone);
      /* PRESENCE IS THE SHOWN STATE: hideZoneLoadingOverlay REMOVES the
         element.  Do not reach for offsetParent -- the overlay is
         position:fixed, whose offsetParent is null even while it covers the
         screen, and the first cut of this file read a working overlay as
         absent because of it. */
      const el = document.querySelector('.bt-zone-loading');
      const shown = !!el;
      const name = shown ? (el.querySelector('.bt-zone-loading-name') || {}).textContent : null;
      if (shown && t.loads[t.loads.length - 1] !== name) t.loads.push(name);
      else if (!shown && t.loads[t.loads.length - 1] !== null) t.loads.push(null);
    }, 60);
  });

  await openPanel(P);
  const pressed = await tap(P, 'Flame Fields');
  rec.ok('the Flame Fields chip is there to press', pressed, {});
  let arrived = null;
  for (let i = 0; i < 30; i++) {
    await P.page.waitForTimeout(1000);
    arrived = await zoneOf(P);
    if (arrived === 'ember') break;
  }
  /* THE SERVER IS A BEAT BEHIND, ALWAYS.  The client flips currentZone and
     then sends `move`; reading the worker in that same millisecond reports a
     working warp as broken (it did, on the first run of this file).  Poll it,
     bounded -- a warp the worker never accepts still fails. */
  let srvTown = await devState(myId);
  for (let i = 0; i < 15 && srvTown.zone !== 'ember'; i++) {
    await P.page.waitForTimeout(500);
    srvTown = await devState(myId);
  }
  const trace = await P.page.evaluate(() => {
    if (window.__btWarpTimer) clearInterval(window.__btWarpTimer);
    return window.__btWarpTrace;
  });
  console.log('    FROM TOWN -> client ' + arrived + ' / server ' + (srvTown && srvTown.zone));
  console.log('    ROUTE -> ' + JSON.stringify(trace.zones) + '  OVERLAY -> ' + JSON.stringify(trace.loads.filter(Boolean)));
  rec.ok('tapping a zone from TOWN puts you in that zone',
    arrived === 'ember' && srvTown.zone === 'ember', { client: arrived, server: srvTown.zone });
  /* Town has exactly ONE door (TOWN_EXITS is a single entry, the World View),
     so town -> ember is necessarily two legs.  If this route were ever one
     hop, something had bypassed the doors. */
  rec.ok('...by walking the real route, through the World View',
    trace.zones.indexOf('worldview') > 0 && trace.zones.indexOf('worldview') < trace.zones.indexOf('ember'),
    trace.zones);
  /* THE LAW: the spoke's art is loaded behind the overlay before you are in
     it.  A direct S.currentZone write would arrive with no overlay at all. */
  rec.ok('...behind the per-zone loading overlay, so its art is loaded first',
    trace.loads.filter(Boolean).some((n) => /flame/i.test(n || '')), trace.loads.filter(Boolean));
  /* And it stops when it lands -- a driver that kept steering would walk the
     owner straight back out of the zone he asked for. */
  const pending = await H.readState(P, (S) => (S._devWarp ? S._devWarp.to : null));
  rec.ok('...and the warp stops itself on arrival', pending === null, { pending });

  /* ── 2. FROM A SPOKE ── */
  await openPanel(P);
  const pressed2 = await tap(P, 'Frost Ridge');
  rec.ok('the Frost Ridge chip is there to press', pressed2, {});
  let arrived2 = null;
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(1000);
    arrived2 = await zoneOf(P);
    if (arrived2 === 'frost') break;
  }
  let srvSpoke = await devState(myId);
  for (let i = 0; i < 15 && srvSpoke.zone !== 'frost'; i++) {
    await P.page.waitForTimeout(500);
    srvSpoke = await devState(myId);
  }
  console.log('    FROM A SPOKE -> client ' + arrived2 + ' / server ' + (srvSpoke && srvSpoke.zone));
  rec.ok('tapping a zone from ANOTHER ZONE puts you in that zone',
    arrived2 === 'frost' && srvSpoke.zone === 'frost', { client: arrived2, server: srvSpoke.zone });

  /* ── 3. IT GIVES UP OUT LOUD ──
     The client bounces you back from a zone your quests have not opened, and
     it does so silently from the driver's point of view -- the position is
     simply undone.  A retry loop with no end is the obvious way to write this
     and the worst one: the owner's character would jitter at a door forever
     with no idea why.  A SECOND player, who never pressed "Finish all
     quests", proves the cap fires and says something. */
  const Q = await H.newPlayer(browser, { name: 'Locked', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(Q);
  await Q.page.waitForTimeout(2500);
  const qGate = await H.readState(Q, (S) => ({
    zone: S.currentZone, tut1: !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1),
  }));
  console.log('    LOCKED PLAYER -> ' + JSON.stringify(qGate));
  await openPanel(Q);
  await Q.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(Q, 'Save key on this device');
  await Q.page.waitForTimeout(1200);
  /* SAMPLE THE BANNER WHILE IT IS UP, and sample the DOM rather than
     wrapping _setLevelUpMsg.  Two separate traps, both hit on the way here:
     the banner clears itself after 4s, so reading innerText once the retry
     cap has fired finds an empty screen; and BroTown re-assigns
     window._setLevelUpMsg in its RENDER BODY, so a wrapper installed around
     it is silently replaced by the next render -- which is why the first
     attempt recorded nothing at all while the message was really being
     shown. */
  await Q.page.evaluate(() => {
    window.__btWarpSaid = [];
    if (window.__btSaidTimer) clearInterval(window.__btSaidTimer);
    window.__btSaidTimer = setInterval(() => {
      const t = (document.body.innerText || '');
      const m = t.match(/Could not reach [a-z]+/i);
      if (m && window.__btWarpSaid.indexOf(m[0]) < 0) window.__btWarpSaid.push(m[0]);
    }, 60);
  });
  await openPanel(Q);
  const pressedQ = await tap(Q, 'Flame Fields');
  rec.ok('the locked character can press the chip too (guard)', pressedQ, {});
  await Q.page.waitForTimeout(12000);
  const gaveUp = await H.readState(Q, (S) => ({
    pending: S._devWarp ? S._devWarp.to : null, zone: S.currentZone,
  }));
  const said = await Q.page.evaluate(() => {
    if (window.__btSaidTimer) clearInterval(window.__btSaidTimer);
    return window.__btWarpSaid || [];
  });
  console.log('    GAVE UP -> ' + JSON.stringify(gaveUp) + '  SAID -> ' + JSON.stringify(said));
  rec.ok('a zone the character has not unlocked does not loop forever',
    gaveUp.pending === null, gaveUp);
  rec.ok('...and it says so out loud rather than failing silently',
    said.some((t) => /Could not reach/i.test(t || '')), said);
  await Q.ctx.close();

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/devwarp.png` }).catch(() => {});
  await P.ctx.close();
}
