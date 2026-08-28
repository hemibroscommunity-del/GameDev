/* DOES A KILL ACTUALLY ROLL FOR THE TICKET? (v2.3.2100)
 *
 * Owner, after a live event where nothing dropped in ~50 kills at 1-in-5:
 * "It still isn't dropping and very likely never worked."
 *
 * ── THE GAP THIS FILLS, WHICH IS THE WHOLE POINT ──
 * The contest had two test suites and NEITHER of them ever fired the drop.
 * server/test/eventcapes.test.mjs calls `_claimCapeTicket` directly, so it
 * proves the ledger, the cap and the one-per-account rule and says nothing
 * about whether anything CALLS it.  tools/qa/mp/mp-cape.mjs grants a ticket
 * through the operator API and then redeems it, so it proves the redeem and
 * skips the drop entirely.  Between them every part was green and the feature
 * was never once exercised end to end -- which is exactly how a contest ships
 * that cannot be won.
 *
 * So this drives the REAL path: a real client, a real worker, a real monster,
 * killed with the same `monster_damage` message the game sends, and then the
 * player's SERVER-side inventory read back through the admin API.  No test
 * hook, no direct call into the room.
 *
 * ── THE RATE IS PINNED TO 1.0 ──
 * At the shipped 1-in-5 a green run would need a dozen kills and a red one
 * would still be plausible luck; at 1.0 a single kill must produce a ticket,
 * so a failure is a failure.  The rate is set through the live-ops flag on the
 * LOCAL worker -- the same read path production uses (`_flagNum`), so this
 * also proves the flag can steer it, which is the tuning dial the owner is
 * told they have.
 */
import * as H from './harness.mjs';

const flag = (wsPort, name, value) => fetch(`http://127.0.0.1:${wsPort}/api/admin/flags`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, value }),
}).then((r) => r.json());

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Slayer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const setRate = await flag(wsPort, 'event_cape_rate', 1);
  rec.ok('the drop rate can be steered by the live-ops flag (guard, and the '
       + 'tuning dial the owner is told they have)', setRate && setRate.ok === true, setRate);

  /* ═══ GO WHERE THE MONSTERS ARE ═══
     Town has none, so a kill test that stays in town proves nothing -- the
     first cut of this file did exactly that and its own guard caught it
     ("killed: 0, zone: town"), which is the only reason it is not still
     sitting here reporting a green drop test over an empty square.

     The route is the real one: walk to the town trail-head, arrive on the
     World View, walk to Frost Ridge's trail-head. The level is set first
     because entry gating is CLIENT-side and soft (zoneTransitions.js) -- a
     level-1 probe is bounced off a band-8 spoke, which would look exactly
     like a broken portal. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) S.rpg.level = 40;
  });
  /* WALK, and steer. mp-townexit's route walker, and its reasoning applies
     here unchanged: holding one key runs past a trail-head's 2-tile radius
     and pins you on the map's bottom clamp, and teleporting onto the marker
     sets a position the movement loop never re-examines. The first two cuts
     of this file did each of those in turn and sat in town, which its own
     guard reported rather than hiding. */
  const walkTo = async (ex, ey, want) => {
    let stalls = 0;
    for (let i = 0; i < 50 && stalls < 5; i++) {
      const p = await H.readState(P, (S) => ({ zone: S.currentZone, x: S.player.x, y: S.player.y }));
      if (p.zone === want) return true;
      const dx = ex - p.x, dy = ey - p.y;
      if (Math.hypot(dx, dy) < 8) { await P.page.waitForTimeout(400); continue; }
      const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
      await P.page.keyboard.down(key);
      await P.page.waitForTimeout(Math.min(600, Math.max(120, Math.hypot(dx, dy) * 1.2)));
      await P.page.keyboard.up(key);
      await P.page.waitForTimeout(180);
      const q = await H.readState(P, (S) => ({ zone: S.currentZone, x: S.player.x, y: S.player.y }));
      if (q.zone === want) return true;
      stalls = Math.hypot(q.x - p.x, q.y - p.y) < 4 ? stalls + 1 : 0;
    }
    return (await H.readState(P, (S) => S.currentZone)) === want;
  };

  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(500);
  const townExit = await P.page.evaluate(() => {
    const e = (window.__btTownExits ? window.__btTownExits() : []).find((x) => x.zoneId === 'worldview');
    return e ? { x: e.tx * 32 + 16, y: e.ty * 32 + 16 } : null;
  });
  rec.ok('town declares its trail-head (guard)', !!townExit, townExit);
  const onWorld = !!townExit && await walkTo(townExit.x, townExit.y, 'worldview');
  rec.ok('the probe reached the World View (guard: the route out of town)',
    onWorld, { zone: await H.readState(P, (S) => S.currentZone) });
  let frostExit = null;
  if (onWorld) {
    await P.page.waitForTimeout(900);
    frostExit = await P.page.evaluate(() => {
      const f = (window._gameFns && window._gameFns.WORLDVIEW_EXITS) || [];
      const e = f.find((x) => x.zoneId === 'frost');
      return e ? { x: e.tx * 32 + 16, y: e.ty * 32 + 16 } : null;
    });
  }
  const onFrost = !!frostExit && await walkTo(frostExit.x, frostExit.y, 'frost');
  const zone = await H.readState(P, (S) => S.currentZone);
  rec.ok('...and then a zone the SERVER spawns monsters for (guard)',
    onFrost, { zone });

  /* The SERVER's monster list, not the client's mirror: the kill is resolved
     against these and a client-side copy can be stale or invented. */
  const live = async () => {
    const r = await fetch(`http://127.0.0.1:${wsPort}/api/admin/zones`, {
      headers: { Authorization: `Bearer ${H.ADMIN_KEY}` },
    }).then((x) => x.json()).catch(() => null);
    return r;
  };
  const zones = await live();
  rec.ok('the worker reports its live zones (guard)', !!zones, zones);

  const myId = await H.readState(P, (S) => S.playerId || S.myId);
  rec.ok('the client knows its own player id (guard)', !!myId, { myId });

  /* Swing until something dies. The damage number is not trusted by the
     server (it recomputes), so this is intent + repetition, exactly as a
     player's client does it. */
  const bag = async () => {
    const p = await H.adminPlayer(wsPort, myId).catch(() => null);
    const inv = (p && p.rpg && p.rpg.inventory) || (p && p.live && p.live.inventory) || {};
    return inv;
  };
  const before = await bag();

  let killed = 0;
  for (let round = 0; round < 60 && killed === 0; round++) {
    const target = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.alive !== false && x.hp > 0);
      if (!m) return null;
      /* Stand on it: the server gates melee on PVE_MELEE_RANGE. */
      S.player.x = m.x; S.player.y = m.y;
      return { id: m.id, zone: S.currentZone };
    });
    if (!target) { await P.page.waitForTimeout(500); continue; }
    for (let swing = 0; swing < 12; swing++) {
      await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee' });
      await P.page.waitForTimeout(120);
    }
    killed = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.id === id);
      return (!m || m.alive === false || m.hp <= 0) ? 1 : 0;
    }, target.id);
  }
  rec.ok('a monster was actually killed through the real damage path (guard: '
       + 'everything below is vacuous without one)', killed > 0, { killed, zone });

  await P.page.waitForTimeout(1200);
  const after = await bag();
  const tickets = Object.keys(after).filter((k) => k.startsWith('goldticket_'));
  rec.ok('a kill at rate 1.0 puts a golden ticket in the bag — the drop is '
       + 'WIRED, not just implemented',
    tickets.length > 0, { before: Object.keys(before), after: Object.keys(after), tickets });

  await P.ctx.close().catch(() => {});
}
