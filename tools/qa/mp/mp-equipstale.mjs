/* EQUIP FROM A POPUP THAT OUTLIVED ITS BAG (v2.3.2341)
 *
 * Owner: "I selected a weapon and nothing happened / it reverted."
 *
 * The bag-weapon popup (ItemDetailPopup, kind 'stashWeapon') resolved its
 * entry by OBJECT IDENTITY -- `R.weaponStash.indexOf(target.wpn)` -- and
 * wsClient.js replaces the whole weaponStash array on any player_state that
 * carries one: every rejoin (the bootstrap sync is sent in full), a weapon
 * drop, a quest mint, an inbox claim, a market return.  The popup stays open
 * through all of them.  So after any of them the indexOf came back -1, the
 * equip_request was gated off, and everything else still ran: the slot took
 * the stale copy, activeSlot flipped, set_active_slot went out and persisted.
 * The bow was in hand AND in the bag on the client, and on the worker
 * activeSlot said 'ranged' with rangedWeapon still null -- fists.
 *
 * This holds a bagged bow (dev kit), opens its popup, kills the socket from
 * the page so scheduleReconnect rejoins and a FULL player_state replaces the
 * array, then taps Equip on the popup that was open the whole time.  The
 * assertions are the two halves of the owner's report: no copy of the held
 * bow left in the bag, and the worker agreeing that a 'ranged' activeSlot has
 * a ranged weapon in it.
 *
 * The socket is reached by capturing the live WebSocket off its own send
 * (WebSocket.prototype.send -> `this`) rather than through any bridge, so
 * the rejoin is the client's real onclose -> scheduleReconnect -> connect
 * path, not a re-implementation of it.
 */
import * as H from './harness.mjs';

const same = (a, b) => !!a && !!b && a.name === b.name && a.type === b.type
  && a.gearBase === b.gearBase && a.quality === b.quality;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Stale', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  const myId = await H.readState(P, (S) => S.myId);

  /* Two weapons through the WORKER, so both sides agree on the bag. */
  const kit = await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'weapons' }),
  }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
  console.log('    dev kit: ' + JSON.stringify(kit));
  const bagged = await H.waitFor(P, (S) => {
    const st = (S.rpg && S.rpg.weaponStash) || [];
    const i = st.findIndex((w) => w && w.type === 'bow');
    return i >= 0 ? { index: i, name: st[i].name, len: st.length, held: !!S.rpg.rangedWeapon } : null;
  }, (v) => !!v, { label: 'a bow in the bag' });
  console.log('    bagged: ' + JSON.stringify(bagged));
  rec.ok('a bow sits in the bag, none in hand (guard)', bagged && !bagged.held, bagged);

  await H.instrumentWire(P);

  /* Open the popup exactly as the bag tile does (InventoryPanel StashTile),
     handing it the object AND the index the tile was built from. */
  const opened = await P.page.evaluate((i) => {
    const R = window._gameState.current.rpg;
    const bus = window._itemDetailBus;
    if (!bus || typeof bus.open !== 'function') return false;
    bus.open({ kind: 'stashWeapon', wpn: R.weaponStash[i], index: i, anchor: null });
    return true;
  }, bagged.index);
  rec.ok('the stash-weapon popup opens through its bus', opened, { opened });
  await P.page.waitForTimeout(600);
  rec.ok('...and offers Equip', !!(await P.page.$('button:has-text("Equip")')));

  /* ── Kill the socket from the page; the client rejoins on its own ── */
  const closed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__stashRef = S.rpg.weaponStash;
    /* The channel shim reads ws.readyState before every send, and unlike
       `send` (which debugBus.js rebinds per INSTANCE when the debug overlay
       is on) readyState is a prototype getter nothing overrides -- so a
       getter that notes `this` is how the live socket is found. */
    const proto = WebSocket.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'readyState');
    Object.defineProperty(proto, 'readyState', {
      configurable: true,
      get() { window.__liveWs = this; return desc.get.call(this); },
    });
    /* Any allowlisted message reaches the check; the current slot re-sent
       is a no-op on the worker. */
    S.channel.send({ type: 'set_active_slot', payload: { slot: S.rpg.activeSlot || 'melee' } });
    Object.defineProperty(proto, 'readyState', desc);
    if (!window.__liveWs) return { err: 'no live socket captured' };
    window.__liveWs.close();
    return { readyState: window.__liveWs.readyState };
  });
  console.log('    close: ' + JSON.stringify(closed));
  rec.ok('the live socket was closed from the page (guard)', !closed.err, closed);

  const rejoined = await H.waitFor(P, (S) => ({
    status: S._realtimeStatus,
    fresh: S.rpg.weaponStash !== window.__stashRef,
    len: (S.rpg.weaponStash || []).length,
  }), (v) => v.status === 'connected' && v.fresh, { timeout: 30000, label: 'rejoin with a full player_state' });
  console.log('    rejoined: ' + JSON.stringify(rejoined));
  rec.ok('the rejoin replaced the bag array under the open popup (guard)', rejoined.fresh, rejoined);
  await P.page.waitForTimeout(800);

  /* The popup must still be up -- that is the whole situation. */
  const btn = await P.page.$('button:has-text("Equip")');
  rec.ok('the popup is still open after the rejoin (guard)', !!btn);
  if (!btn) { await P.ctx.close().catch(() => {}); return; }

  const before = await H.wireCounts(P);
  await btn.evaluate((b) => b.click());
  await P.page.waitForTimeout(1500);
  const wire = await H.wireCounts(P);
  const sent = (wire.equip_request || 0) - (before.equip_request || 0);

  const local = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    const held = R.rangedWeapon || null;
    const eq = (a, b) => !!a && !!b && a.name === b.name && a.type === b.type
      && a.gearBase === b.gearBase && a.quality === b.quality;
    return {
      activeSlot: R.activeSlot,
      held: held && held.name,
      dupInBag: !!held && (R.weaponStash || []).some((w) => eq(w, held)),
      stash: (R.weaponStash || []).map((w) => w && w.name),
    };
  });
  console.log('    equip_request sent: ' + sent + '  local: ' + JSON.stringify(local));

  /* ═══ THE REGRESSION THIS SCENARIO EXISTS FOR ═══ */
  rec.ok('the held bow has no copy left in the bag',
    !local.dupInBag, local);
  rec.ok('either the equip reached the wire, or nothing moved locally',
    sent >= 1 || (!local.held && local.activeSlot !== 'ranged'), { sent, local });

  /* And the worker's view, which is what decides the swing. */
  const srv = await H.adminPlayer(wsPort, myId).catch(() => null);
  const r = (srv && srv.rpg) || {};
  const server = { activeSlot: r.activeSlot, ranged: r.rangedWeapon && r.rangedWeapon.name,
    stash: (r.weaponStash || []).map((w) => w && w.name) };
  console.log('    server: ' + JSON.stringify(server));
  rec.ok("a 'ranged' activeSlot on the worker has a ranged weapon in it",
    server.activeSlot !== 'ranged' || !!server.ranged, server);
  if (local.held) {
    rec.ok('the worker holds the bow the client shows in hand',
      !!r.rangedWeapon && same(r.rangedWeapon, { name: local.held, type: 'bow',
        gearBase: r.rangedWeapon.gearBase, quality: r.rangedWeapon.quality }), server);
  }

  await P.ctx.close().catch(() => {});
}
