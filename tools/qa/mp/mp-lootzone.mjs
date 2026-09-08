/* ═══ A LOOT PILE FROM ANOTHER ZONE STAYS THERE (v2.3.2342) ═══
 *
 * loot_drop rides the room-wide `events` buffer (server/src/tick.js: "NOT
 * scoped: events"), so a kill or a death pile in Ember reaches every client
 * in the room.  The worker's _serializePile stamps `zone` on the pile for
 * exactly that reason -- and the client's loot_drop handler was the one loot
 * entry that never looked at it.  The result, seen from Frost: a stranger's
 * Ember pile drawn at its raw world coordinates, and a free-for-all death
 * pile that fired loot_pickup requests the worker can never grant (the pile
 * lives in another zone's list, so every request is refused and re-armed).
 *
 * WHY THE PAYLOAD IS DISPATCHED THROUGH A SEAM.  A real cross-zone kill needs
 * a third player fighting in Ember while this one stands in Frost; the
 * outcome is the same packet either way, and its SHAPE is the worker's own
 * (_serializePile, field for field).  window.__btDispatch hands that packet
 * to the REAL handler (wsClient.js -> processGameEvent), so what runs here is
 * the code that runs on a phone -- only the socket is skipped.
 *
 * B has to be OUT of town for the second half: the ground-loot loop drops
 * every pile silently in a safe zone (v2.3.136), so a foreign pile in town
 * would never send anything and the assertion would pass for the wrong
 * reason.  The test panel's warp (v2.3.2308) puts B in Frost by the front
 * door, per-zone loads and all.
 *
 * The control at the end is what makes the negative mean something: a build
 * that dropped EVERY loot_drop would pass the first three checks.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Ember', wsPort, webPort });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Frost', wsPort, webPort });
  await H.enterWorld(B);
  await B.page.waitForTimeout(1500);

  /* ── B to Frost, by the real route ──────────────────────────────────── */
  /* The town gate is the tut_1 quest record; "Finish all quests" clears it and
     the per-zone quest gate together (the same admin route the panel calls). */
  const bId = await H.readState(B, (S) => S.myId);
  const fq = await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/quests`, { method: 'POST',
    headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: bId }) }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
  await H.waitFor(B, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v,
    { timeout: 10000, label: 'tut_1 echoed' }).catch(() => {});
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    S._devWarp = { to: 'frost', legs: 0, t: Date.now(), nextAt: 0 };
  });
  const zf = await H.waitFor(B, (S) => S.currentZone, (z) => z === 'frost',
    { timeout: 40000, label: 'devwarp frost' }).catch(() => null);
  rec.ok('setup: B is in Frost (guard)', zf === 'frost', { zf, fq });
  if (zf !== 'frost') { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  /* Let the zone's own zone_loot land before injecting, so the seam is the
     only source of the ids asserted on. */
  await H.waitFor(B, (S) => !S._zoneLoading, (v) => v, { timeout: 10000, label: 'frost loaded' }).catch(() => {});
  await B.page.waitForTimeout(1000);
  const aZone = await H.readState(A, (S) => S.currentZone);
  rec.ok('setup: A is still in town, so the pair are two zones apart (guard)', aZone === 'town', { aZone });

  const seam = await B.page.evaluate(() => typeof window.__btDispatch === 'function');
  rec.ok('the game-event seam is wired (guard)', seam === true, {});
  if (!seam) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* ── two Ember piles, shaped by server/src/index.js _serializePile ──── */
  const bPos = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
  const emberKill = {
    lootId: 'lz-ember-kill', zone: 'ember', x: bPos.x + 60, y: bPos.y,
    coins: 40, skull: null, shard: null,
    /* recipient-locked to A: a kill B had no part in */
    recipients: ['bp_someone_else'], shares: { bp_someone_else: 1 },
    killerName: 'Elsewhere', ts: Date.now(), inventoryClaimed: false,
    hasWeapon: false, weaponClaimed: false, weaponMystery: false,
    weaponTier: null, weaponType: null, weaponName: null,
    armor: null, armorClaimed: false, mystery: false,
  };
  /* A death pile whose owner-only window has already closed: free-for-all,
     so the ground-loot loop treats B as a recipient and asks the worker. */
  const emberDeath = { ...emberKill, lootId: 'lz-ember-death', x: bPos.x - 60,
    recipients: null, shares: {}, isDeathDrop: true, deathItems: [],
    ownerOnlyUntil: Date.now() - 1, expiry: Date.now() + 120000 };

  await H.instrumentWire(B);
  await B.page.evaluate((p) => {
    window.__btDispatch({ type: 'loot_drop', payload: { pile: p.kill } });
    window.__btDispatch({ type: 'loot_drop', payload: { pile: p.death } });
  }, { kill: emberKill, death: emberDeath });
  /* Inline: readState serialises the function into the page, so a module-
     scope helper is out of reach there. */
  const after = await H.readState(B, (S) => ({ zone: S.currentZone, ids: (S.groundLoot || []).map((l) => l.lootId) }));
  console.log('    B ground loot after the Ember drops', JSON.stringify(after));
  rec.ok('a recipient-locked kill pile from Ember is NOT on Frost\'s ground',
    !after.ids.includes('lz-ember-kill'), after);
  rec.ok('a free-for-all death pile from Ember is NOT on Frost\'s ground',
    !after.ids.includes('lz-ember-death'), after);

  /* ── walk onto the death pile's spot: nothing to ask the worker for ── */
  /* Bounded settle for a NEGATIVE: the loop runs every frame, and on the
     broken build the first send is immediate, so this is generous. */
  await B.page.evaluate((p) => {
    const S = window._gameState.current;
    S.player.x = p.x; S.player.y = p.y + 15;
  }, { x: emberDeath.x, y: emberDeath.y });
  await B.page.waitForTimeout(2500);
  const wire = await H.wireCounts(B);
  console.log('    B wire after standing on the Ember death pile', JSON.stringify(wire));
  rec.ok('...and standing where it would be sends NO loot_pickup (the worker could never grant one)',
    !(wire.loot_pickup > 0), wire);

  /* ── control: a pile from THIS zone is still accepted ───────────────── */
  const frostKill = { ...emberKill, lootId: 'lz-frost-kill', zone: 'frost', x: bPos.x + 200, y: bPos.y + 200 };
  /* And one with no zone at all -- an older worker that pre-dates the field.
     Deploy-order safety: the client must not start dropping every pile when
     it is the newer half. */
  const legacyKill = { ...emberKill, lootId: 'lz-legacy-kill', x: bPos.x + 220, y: bPos.y + 200 };
  delete legacyKill.zone;
  const ctrl = await B.page.evaluate((p) => {
    window.__btDispatch({ type: 'loot_drop', payload: { pile: p.frost } });
    window.__btDispatch({ type: 'loot_drop', payload: { pile: p.legacy } });
    const S = window._gameState.current;
    const f = (S.groundLoot || []).find((l) => l.lootId === 'lz-frost-kill');
    return { ids: (S.groundLoot || []).map((l) => l.lootId), zoneField: f ? f.zone : undefined };
  }, { frost: frostKill, legacy: legacyKill });
  console.log('    B ground loot after the control drops', JSON.stringify(ctrl));
  rec.ok('control: a pile from Frost IS accepted in Frost', ctrl.ids.includes('lz-frost-kill'), ctrl);
  rec.ok('...carrying its zone, so the ground loop can tell a straggler later', ctrl.zoneField === 'frost', ctrl);
  rec.ok('control: a pile with no zone (older worker) is still accepted', ctrl.ids.includes('lz-legacy-kill'), ctrl);

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
