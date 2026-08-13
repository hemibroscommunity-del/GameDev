/* THE WORKER IS THE AUTHORITY — three places the client quietly wasn't
 * asking it anything (v2.3.1702).
 *
 * All three are the same shape, and it is the shape that keeps recurring in
 * this codebase: a client→server send gated on `S._serverMonsters`.  That
 * flag means "this zone's monsters are server-driven".  It is FALSE in town.
 * It was never an "am I in multiplayer" test, but it kept getting used as
 * one — v2.3.1684 (quest accept/turn-in), v2.3.1687 (equip/sell) and now the
 * ability spends were all found the same way: the action worked perfectly on
 * screen and the worker had never heard of it.
 *
 * 1. ABILITY SPENDS.  Dodge / lunge / retreat / swipe deducted their pool
 *    locally and sent `ability_use` only in a spoke zone.  In town the
 *    worker's pool never moved, so its next player_state echo REFUNDED the
 *    spend: unlimited specials and unlimited dodges anywhere in the hub.
 *
 * 2. FIREMAKING.  Lighting a campfire from a wood_* log had no wire message
 *    AT ALL — the client deleted the log from its own bag and the worker's
 *    inventory echo handed it straight back.  One log, unlimited fires.
 *
 * 3. PLAYER HP.  The local monster AI subtracts player HP at seven sites and
 *    none of them checked `_serverMonsters`, while the worker runs its own
 *    copy of the same monster and applies its own damage.  Nothing reaches
 *    those sites TODAY — the outer early-return covers them because no
 *    variant currently sets clientSideMovement — so this is a guard, not a
 *    repair, and section 3 pins the invariant both ways round rather than
 *    claiming a symptom it did not observe.
 *
 * Assertions 1 and 2 are checked on the WIRE (H.instrumentWire) and against
 * the worker's own stored blob, never against the client's copy — reading the
 * client is exactly what let the earlier versions of these bugs ship green.
 */
import * as H from './harness.mjs';

/* The persisted bag, straight from the worker's storage. */
const serverBag = async (wsPort, id) =>
  (await H.adminPlayer(wsPort, id).catch(() => ({}))).rpg?.inventory || null;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tinder', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  const zone0 = await H.readState(P, (S) => ({ zone: S.currentZone, srvMon: !!S._serverMonsters }));
  rec.ok('the character starts in town', zone0.zone === 'town', zone0);
  /* The premise of the whole file: if this flag were true in town the bugs
     below would never have existed, and these assertions would prove nothing. */
  rec.ok('...where _serverMonsters is FALSE (the flag these sends were gated on)',
    zone0.srvMon === false, zone0);

  /* ═══ 1. ABILITY SPENDS REACH THE WORKER IN TOWN ═══ */
  /* A special needs a weapon in the active slot (v2.3.212), and since
     v2.3.1676 every fresh character starts with all three slots empty — so
     take the mayor's first quest, which grants Bro's Sword (a 'greatsword';
     weaponType 'sword' at wood tier is the bamboo stick — see mp-townlock),
     and equip it out of the bag. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.weaponStash || []).map((w) => w && w.type),
    (t) => t.includes('greatsword'), { timeout: 20000, label: 'the quest sword reaches the stash' })
    .catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return;
    const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
  });
  await P.page.waitForTimeout(2000);
  const armed = await H.readState(P, (S) => ({ weapon: S.rpg?.weapon?.type || null, mana: S.rpg?.mana, maxMana: S.rpg?.maxMana }));
  rec.ok('the starter sword is equipped, so a special is even possible',
    armed.weapon === 'greatsword', armed);

  /* Full mana so the cost check can't be what stops the send. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) { S.rpg.mana = S.rpg.maxMana || 100; S._lastSwipe = 0; S._tutorialStep = 0; }
  });
  await H.callFn(P, 'specialAttack').catch(() => {});
  await P.page.waitForTimeout(400);
  /* Dodge is the same gate on the same wire message, so exercise both arms. */
  await H.callFn(P, 'contextualDodge', 0).catch(() => {});
  await P.page.waitForTimeout(600);
  const wire = await H.wireCounts(P);
  rec.ok('a special attack in TOWN sends ability_use to the worker',
    (wire.ability_use || 0) >= 1, wire);

  /* ═══ 2. LIGHTING A CAMPFIRE BURNS A REAL LOG ═══ */
  /* Seeded through the operator grant rather than by writing S.rpg.inventory:
     the whole question is what the WORKER holds, so the worker has to be the
     one that put it there. */
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_oak', count: 2 }).catch(() => {});
  await P.page.waitForTimeout(1500);
  const bagBefore = await serverBag(wsPort, myId);
  rec.ok('the worker granted two oak logs', (bagBefore?.wood_oak || 0) === 2, bagBefore);

  /* Driven through the real item card (itemDetailBus -> "Light fire" ->
     firemakingBus -> BroTown's subscriber), not by poking the bus, so the
     button that players actually press is the thing under test. */
  await H.openDest(P, 'Bag').catch(() => {});
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => window._itemDetailBus
    && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 2 }));
  await P.page.waitForTimeout(500);
  const lit = await H.clickText(P, 'Light fire').then(() => true).catch(() => false);
  rec.ok('the log offers a "Light fire" action', lit);
  await P.page.waitForTimeout(2000);

  const wire2 = await H.wireCounts(P);
  rec.ok('lighting the fire tells the worker (firemaking_request on the wire)',
    (wire2.firemaking_request || 0) >= 1, wire2);
  const bagAfter = await serverBag(wsPort, myId);
  /* THE REGRESSION.  Before v2.3.1702 this read 2: the client deleted its own
     copy, the worker still held both, and its next inventory echo refunded
     the one that was "burned". */
  rec.ok('the WORKER is down exactly one log', (bagAfter?.wood_oak || 0) === 1, bagAfter);
  const clientBag = await H.readState(P, (S) => (S.rpg && S.rpg.inventory) || {});
  rec.ok('...and the client agrees with it (no refund on the next echo)',
    (clientBag.wood_oak || 0) === 1, clientBag);

  /* ═══ 3. THE LOCAL MONSTER AI DOES NOT WRITE PLAYER HP IN A SERVER ZONE ═══ */
  /* The local AI in monsterCombat.js subtracts player HP at seven sites, and
     until v2.3.1702 not one of them checked _serverMonsters -- while the
     worker runs its own copy of the same monster and applies its own damage
     (_monsterStrikePlayer).  Today the outer `S._serverMonsters &&
     !usesClientSideMovement(m)` early-return keeps that from firing, because
     no variant currently sets clientSideMovement; the guard is what stops it
     coming back the moment one does, or a zone_state race flips the flag mid
     fight.  Either way the INVARIANT is the thing worth pinning, so this
     tests the invariant and not the mechanism: with the flag up the client
     writes nothing itself, with it down the local path still works.

     A monster is injected rather than travelled to.  A spoke zone would make
     the reading depend on the worker's own hits landing during the sample
     window, which is exactly the noise this assertion has to be free of. */
  const localHit = await P.page.evaluate(async () => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg || !S.player) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const arm = (srvMon) => {
      S._serverMonsters = srvMon;
      S.rpg.hp = S.rpg.maxHp || 100;
      S.shieldEnd = 0; S._shieldUp = false; S._dodgeRoll = null; S.respawnTimer = 0;
      S.monsters = [{
        id: 'qa_local_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
        x: S.player.x + 8, y: S.player.y, renderX: S.player.x + 8, renderY: S.player.y,
        spawnX: S.player.x + 8, spawnY: S.player.y, targetX: S.player.x + 8, targetY: S.player.y,
        hp: 500, curHp: 500, maxHp: 500, dmg: 12, level: 1, gold: 0,
        alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
        respawnAt: 0, moveTimer: 0, _stuckArrows: [],
      }];
    };
    const sample = async (srvMon) => {
      arm(srvMon);
      const before = S.rpg.hp;
      /* Long enough to clear the 400ms telegraph and land several swings. */
      await sleep(4000);
      const after = S.rpg.hp;
      S.monsters = [];
      return { before, after, dropped: before - after };
    };
    /* Client-driven zone first, so a total failure to attack shows up as the
       CONTROL failing rather than as a silent pass on the guarded case. */
    const clientZone = await sample(false);
    const serverZone = await sample(true);
    S._serverMonsters = false;
    S.rpg.hp = S.rpg.maxHp || 100;
    return { clientZone, serverZone };
  });
  if (localHit.__no) {
    rec.skip('the local monster AI respects HP authority', 'no player state to drive');
  } else {
    /* The control.  If this ever stops dropping HP, the guard has gone too
       far and made the player invulnerable in client-driven zones -- which
       would be a far worse bug than the one it fixes. */
    rec.ok('a client-driven zone still takes local melee damage',
      localHit.clientZone.dropped > 0, localHit.clientZone);
    rec.ok('a SERVER-driven zone takes none of it locally (player_state is the truth)',
      localHit.serverZone.dropped === 0, localHit.serverZone);
  }

  await P.ctx.close().catch(() => {});
}
