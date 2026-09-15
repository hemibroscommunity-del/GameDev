/* THE PILE THAT RUNS AWAY FROM YOU (v2.3.2490).
 *
 * Owner: coins and remnants that "sometimes just won't pick up", mainly after
 * a melee dash kill.
 *
 * ═══ THE ARITHMETIC THE REPORT IS MADE OF ═══
 * src/game/groundLoot.js pulled a pile toward the player at
 * `(1 - lDist / 50) * 3` px per frame, ungated at both ends.  Past 50 px that
 * term is NEGATIVE, so the magnet PUSHED, harder the farther it got.  The gate
 * that decided whether to run the pull measured the pile's ANCHOR (its true
 * server position), not the sprite, so a player standing still next to the
 * drop spot -- fighting the next monster -- kept the pull running while the
 * sprite sailed off.
 *
 * That matters because the ANCHOR is the only position the worker will ever
 * measure: server/src/index.js `_handleLootPickup` compares the player against
 * `pile.x/y` with LOOT_PICKUP_RANGE 160.  The client fires its request when the
 * player reaches the SPRITE.  Once the two are more than 160 px apart the two
 * halves can never agree again, and the pile is gold the player can see and
 * never have.
 *
 * A dash kill is the reliable way in: DASH_STOP_PX is 46 and the magnet range
 * is 50, so the lunge parks the player right on the sign change.
 *
 * ═══ WHAT THIS FILE ASSERTS, AND WHY IN THIS ORDER ═══
 *   1. A real dash kill in a real server-driven zone leaves a pile that is
 *      actually COLLECTED -- coins in the bag, pile off the ground -- within a
 *      few seconds of the player standing where the lunge left them.
 *   2. A pile displaced 120 px from its anchor is re-homed to within the
 *      magnet range and still collected.  120 px is inside the server's 160,
 *      so the OLD build fails this one by running the pile further out rather
 *      than by being out of range at the start: the displacement is the
 *      reproduction, not the bug.
 *
 * ═══ THE TWO THINGS HERE THAT ARE NOT A PLAYER'S ROAD, STATED ═══
 *   - Damage is sent as `monster_damage` on the real channel rather than by
 *     tapping the attack disc.  It is the same message the swing sends
 *     (src/game/monsterCombat.js) through the same shim, and the worker
 *     applies the same cadence floor (210 ms) and the same 400 px proximity
 *     bound.  Tapping a canvas disc accurately enough to kill a wandering
 *     monster is what this would otherwise spend its minute on.
 *   - The 120 px displacement is written onto the live pile object.  There is
 *     no way to ASK for the old bug; writing the drift is how you get a pile
 *     that has drifted.  Everything after that -- the clamp, the pull, the
 *     request, the worker's answer -- is the shipped code.
 *
 * The KILLING BLOW is a real lunge (`window.__btMaybeSwordDash`), because the
 * geometry the owner reported is the geometry the lunge leaves behind.
 */
import * as H from './harness.mjs';

const MAGNET_RANGE = 50;          /* groundLoot.js */

/* Whittle with real melee sends, finish with a real lunge.
 *
 * A SIGHTING WATCHER runs at 16 ms from before the killing blow, because the
 * pile does not reliably survive long enough to be looked up afterwards: when
 * the lunge ends close enough, the magnet collects it inside the same beat and
 * a post-hoc read finds nothing but an empty ground and more gold.  The
 * watcher records the pile the instant it lands -- which is also the only
 * moment a displacement can be written before the magnet has had a say.
 */
async function dashKill(P, { shoveTo = 0 } = {}) {
  return P.page.evaluate(async ({ shove }) => {
    const S = window._gameState.current;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
    if (!live.length) return { none: true };
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y)
      - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = live[0];
    const id = m.id;
    S.groundLoot = [];
    S.rpg.activeSlot = 'melee';
    S._shieldUp = false;
    const goldBefore = S.rpg.coins;

    let seen = null;
    const watcher = setInterval(() => {
      if (seen) return;
      const pile = (S.groundLoot || []).find((l) => l && l._serverLoot && l.lootId && l._sx !== undefined);
      if (!pile) return;
      seen = { lootId: pile.lootId, coins: pile.coins || 0, ax: pile._sx, ay: pile._sy,
        playerToAnchor: Math.round(Math.hypot(S.player.x - pile._sx, (S.player.y - 15) - pile._sy)) };
      if (shove) {
        /* Directly AWAY from the player: the worst case for the pull, and the
           direction the old runaway actually took. */
        const ang = Math.atan2(pile._sy - (S.player.y - 15), pile._sx - S.player.x);
        pile.x = pile._sx + Math.cos(ang) * shove;
        pile.y = pile._sy + Math.sin(ang) * shove;
        seen.shovedTo = Math.round(Math.hypot(pile.x - pile._sx, pile.y - pile._sy));
      }
    }, 16);

    const hit = (special) => {
      if (S.channel) S.channel.send({ type: 'monster_damage', payload: {
        monsterId: id, zone: S.currentZone, element: null, slot: 'melee', special: !!special } });
    };
    const alive = () => {
      const cur = (S.monsters || []).find((x) => x.id === id);
      return cur && cur.alive !== false && (cur.curHp == null || cur.curHp > 0) ? cur : null;
    };

    /* Phase 1 -- whittle to a sliver with ordinary swings, at the worker's own
       cadence floor (210 ms) plus slack. */
    const maxHp = m.maxHp || m.curHp || 1;
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const cur = alive();
      if (!cur || (cur.curHp != null && cur.curHp <= maxHp * 0.25)) break;
      hit(false);
      await sleep(260);
    }

    /* Phase 2 -- the lunge finishes it, so the geometry at the kill is the
       geometry the owner reported.  Repeat past the 2500 ms cooldown if one
       lunge is not enough; the last blow landed is still a lunge. */
    let lunges = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 20000 && alive()) {
      const cur = alive();
      S.lockedTarget = { type: 'monster', id: cur.id, ref: cur, src: 'tap' };
      S.rpg.stamina = S.rpg.maxStamina || 100;
      S._abilCd = null;
      if (window.__btMaybeSwordDash && window.__btMaybeSwordDash()) lunges++;
      const t2 = Date.now();
      while (Date.now() - t2 < 2700 && alive()) await sleep(100);
    }

    /* Give the worker's monster_kill + loot_drop time to reach the watcher. */
    const t3 = Date.now();
    while (Date.now() - t3 < 6000 && !seen) await sleep(50);
    clearInterval(watcher);

    return { lunges, dead: !alive(), seen, goldBefore, gold: S.rpg.coins };
  }, { shove: shoveTo });
}

/* Poll until the pile is gone (or credited) -- the magnet, the request and the
   worker's answer all have to happen for this to flip. */
async function settle(P, lootId, ms) {
  return P.page.evaluate(async ({ id, budget }) => {
    const S = window._gameState.current;
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const t0 = Date.now();
    let maxDrift = 0;
    let out = null;
    while (Date.now() - t0 < budget) {
      const p = (S.groundLoot || []).find((l) => l && l.lootId === id);
      if (p && p._sx !== undefined) {
        maxDrift = Math.max(maxDrift, Math.hypot(p.x - p._sx, p.y - p._sy));
      }
      if (!p || p._collected) {
        out = { collected: true, ms: Date.now() - t0, gone: !p };
        break;
      }
      await sleep(50);
    }
    if (!out) {
      const p = (S.groundLoot || []).find((l) => l && l.lootId === id);
      out = { collected: false, ms: Date.now() - t0,
        lDist: p ? Math.round(Math.hypot(S.player.x - p.x, (S.player.y - 15) - p.y)) : null,
        drift: p ? Math.round(Math.hypot(p.x - p._sx, p.y - p._sy)) : null };
    }
    out.maxDrift = Math.round(maxDrift);
    out.gold = S.rpg.coins;
    return out;
  }, { id: lootId, budget: ms });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Magnet', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* A server-driven spoke.  Town monsters are client-side (TRAPS #32) and
     nothing under test here exists on that path -- there is no worker to
     refuse a pickup, so a town run would pass with the bug intact. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(3500);

  /* A weapon the WORKER forged: the lunge needs `cfg.needs === 'weapon'`
     satisfied on the SERVER's copy, and a client-side S.rpg.weapon is undone
     by the next player_state echo (mp-dashhit's point 2). */
  const myId = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, myId, 'gold', { amount: 500 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'forge_weapon',
      payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
  });
  await P.page.waitForTimeout(2500);

  const setup = await H.readState(P, (S) => ({
    zone: S.currentZone,
    serverDriven: !!S._serverMonsters,
    serverLoot: !!S._serverLoot,
    weapon: S.rpg && S.rpg.weapon ? (S.rpg.weapon.name || S.rpg.weapon.type) : null,
    monsters: (S.monsters || []).filter((m) => m && m.alive !== false).length,
  }));
  console.log('    setup: ' + JSON.stringify(setup));
  rec.ok('the bro is in a zone the WORKER drives, with monsters to kill (guard)',
    setup.serverDriven === true && setup.monsters > 0, setup);
  rec.ok('...holding a weapon the worker forged, so the lunge is castable (guard)',
    !!setup.weapon, setup);
  if (!setup.serverDriven || !setup.monsters || !setup.weapon) {
    await P.ctx.close().catch(() => {}); return;
  }

  /* ═══ 1. THE DASH KILL, THEN THE WALK ONTO IT ═══
     MEASURED, and it changed this test twice.  The lunge does NOT leave the
     player at DASH_STOP_PX from the pile: the swing knocks the monster back
     before it dies, so the pile lands where the monster ENDED UP -- 76 to 107
     px out across the runs here, outside the 50 px at which the magnet even
     engages.  A dash kill is followed by a short walk in real play, and it is
     followed by one here.  And when the knockback happens to be small the pile
     is collected before any post-hoc read can see it, which is why the pile is
     captured by a watcher at the moment it drops rather than looked up after. */
  const first = await dashKill(P);
  console.log('    dash kill: ' + JSON.stringify(first));
  if (first.none || !first.dead || !first.seen) {
    rec.skip("a dash kill's pile is collected", first.none ? 'no live monster to kill'
      : !first.dead ? 'the monster survived the budget' : 'the kill dropped no server pile');
  } else {
    rec.ok('the kill was finished with a real lunge (guard)', first.lunges > 0, first);
    /* Walked, not teleported: the worker keeps its own copy of the player and
       refuses a jump (movement.js, 500 px/s x dt + 80), and it is the worker's
       copy the pickup is measured against. */
    const walked = await H.hopTo(P, first.seen.ax, first.seen.ay + 15);
    rec.ok('the bro can walk to where the pile fell (guard)', walked === true,
      { walked, seen: first.seen });
    const s1 = await settle(P, first.seen.lootId, 6000);
    console.log('    settle 1: ' + JSON.stringify(s1));
    rec.ok(`the pile a dash kill drops is COLLECTED, not left on the ground (${s1.ms}ms)`,
      s1.collected === true, { first, s1 });
    rec.ok(`...and the sprite never strayed further from its anchor than the magnet range `
      + `(max ${s1.maxDrift}px, limit ${MAGNET_RANGE})`,
      s1.maxDrift <= MAGNET_RANGE + 1, { s1 });
    rec.ok(`...and the coins actually landed in the bag (${first.goldBefore} -> ${s1.gold})`,
      s1.gold > first.goldBefore, { before: first.goldBefore, after: s1.gold, seen: first.seen });
  }

  await P.page.waitForTimeout(1500);

  /* ═══ 2. A PILE SHOVED 120px OFF ITS ANCHOR ═══
     This is the reproduction.  The shove is written on the frame the pile
     lands -- there is no way to ASK for the old bug, and writing the drift is
     how you get a pile that has drifted.  Everything after it is shipped code.
     120 px is chosen to be INSIDE the worker's 160 px pickup radius at the
     start, so a failure here is the RUNAWAY carrying it past that radius, not
     a setup that began out of reach.
     On the old formula the player walks in, the magnet's own gate
     (`sDist < magnetRange`) opens, `(1 - lDist/50) * 3` is about -4 px per
     frame and growing, and the pile leaves for good. */
  const second = await dashKill(P, { shoveTo: 120 });
  console.log('    shoved kill: ' + JSON.stringify(second));
  if (second.none || !second.dead || !second.seen || !second.seen.shovedTo) {
    rec.skip('a pile 120px off its anchor is re-homed and collected',
      second.none ? 'no second live monster' : !second.dead ? 'the monster survived the budget'
        : 'the kill dropped no server pile to shove');
  } else {
    rec.ok(`the pile really was shoved 120px off its anchor (guard -- ${second.seen.shovedTo}px)`,
      second.seen.shovedTo >= 110, second.seen);
    const walked2 = await H.hopTo(P, second.seen.ax, second.seen.ay + 15);
    rec.ok('...and the bro walked to the anchor, where the worker measures him (guard)',
      walked2 === true, { walked2, seen: second.seen });
    const s2 = await settle(P, second.seen.lootId, 8000);
    console.log('    settle 2: ' + JSON.stringify(s2));
    rec.ok(`...the sprite was re-homed instead of running away `
      + `(furthest from its anchor afterwards: ${s2.maxDrift}px, limit ${MAGNET_RANGE})`,
      s2.maxDrift <= MAGNET_RANGE + 1, { second, s2 });
    rec.ok(`...and it was still COLLECTED (${s2.ms}ms)`, s2.collected === true, { second, s2 });
    rec.ok(`...with the coins in the bag (${second.goldBefore} -> ${s2.gold})`,
      s2.gold > second.goldBefore, { before: second.goldBefore, after: s2.gold });
  }


  /* ═══ 3. A PERMANENT REFUSAL DROPS THE PILE INSTEAD OF RETRYING FOREVER ═══
     A pile the worker has never heard of answers `no-pile`.  Before v2.3.2490
     the client kept that pile on the ground and re-asked every 5 s for as long
     as the tab was open -- one request per stuck pile per player, forever, with
     nothing on screen to say why it would not grab.  The seam hands the REAL
     loot_drop handler a pile shaped exactly like the worker's _serializePile;
     the lootId is the only invented part, and inventing it is the point. */
  const seam = await P.page.evaluate(() => typeof window.__btDispatch === 'function');
  if (!seam) {
    rec.skip('a permanently-refused pile is dropped rather than retried forever', 'no game-event seam');
  } else {
    await H.instrumentWire(P);
    const ghost = await P.page.evaluate(async () => {
      const S = window._gameState.current;
      const sleep = (t) => new Promise((r) => setTimeout(r, t));
      const me = S.myId;
      window.__btDispatch({ type: 'loot_drop', payload: { pile: {
        lootId: 'lm-ghost-' + Date.now(), zone: S.currentZone,
        x: S.player.x + 8, y: S.player.y - 10,
        coins: 25, skull: null, shard: null,
        recipients: [me], shares: { [me]: 1 },
        killerName: 'Nobody', ts: Date.now() - 400, inventoryClaimed: false,
        hasWeapon: false, weaponClaimed: false, weaponMystery: false,
        weaponTier: null, weaponType: null, weaponName: null,
        armor: null, armorClaimed: false, mystery: false,
      } } });
      const id = (S.groundLoot || []).map((l) => l.lootId).filter((k) => k && k.startsWith('lm-ghost-')).pop();
      const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
        if (!(S.groundLoot || []).some((l) => l.lootId === id)) break;
        await sleep(50);
      }
      return { id, stillThere: (S.groundLoot || []).some((l) => l.lootId === id), ms: Date.now() - t0 };
    });
    const wire = await H.wireCounts(P);
    console.log('    ghost pile: ' + JSON.stringify(ghost) + ' wire ' + JSON.stringify(wire));
    rec.ok('a pile the worker refuses permanently (no-pile) is DROPPED from the ground, not kept',
      ghost.stillThere === false, { ghost, wire });
    /* One request, maybe two if a frame slipped in before the refusal landed.
       The number that matters is "not a 5 s heartbeat for the rest of the
       session"; the old build sends one every 5 s and would show 2+ here over
       the 8 s budget with the pile still on the ground. */
    rec.ok(`...having asked the worker once, not on a loop (${wire.loot_pickup} loot_pickup sent)`,
      wire.loot_pickup >= 1 && wire.loot_pickup <= 2, { wire, ghost });
  }

  await P.ctx.close().catch(() => {});
}
