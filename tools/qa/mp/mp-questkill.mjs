/* KILL THE THING THE QUEST ASKED FOR, AND SEE IT LAND IN THE BAG — v2.3.1972.
 *
 * THE GAP THIS FILLS.  Every quest scenario in the suite SEEDS its objective
 * through the operator endpoint (mp-questline says so in its own header, and
 * for good reason — it owns the quest FLOW and a combat grind would make it a
 * combat test).  So the whole suite is green on a game where snowmen drop
 * nothing at all: the accept works, the turn-in works, the reward pays, and
 * the one link a real player has to make — swing at it, and pick up what falls
 * out — is checked nowhere.
 *
 * It is also the link with the most moving parts and the most recent history
 * of being broken.  v2.3.1673 found that every zone-flavoured slime reskin had
 * been dropping NOTHING ("nobody noticed because the pile still spawns for the
 * gold"), and the cause was one hand-written list of five archetype names in
 * `_isRemnantSkullArch` that the reskins were not on.  Three of the four
 * tutorial steps depend on exactly that mapping surviving:
 *
 *     frost   snowman                       -> 'snowman'
 *     verdant fodder + variant blueSlime    -> 'slime-remnants'
 *     sky     stalker/hexer/volatile->mummy -> 'skeleton-remnants'
 *     ember   fodder->fireGoblin            -> 'fire-goblin-remnants'
 *
 * Two of those go through `_variantForArchInZone`, a MAP that mirrors the
 * client's ZONE_VARIANT_MAP by hand — the sky zone does not spawn a single
 * mummy, it spawns stalkers and hexers that are renamed to mummies for the
 * skull.  A stale entry there is silent: the kill still pays XP, the pile
 * still drops gold, and the quest simply never advances.
 *
 * WHAT IS DRIVEN AND WHAT IS NOT.  The quest is accepted through the real
 * panel, the sword is equipped through the real equip request, the travel is
 * the real exit tiles, and the KILL is the game's own auto-attack loop
 * (S.autoAttack, the flag the joystick sets) against a server-spawned monster.
 * The only liberty is standing the character next to it rather than walking:
 * pathing is mp-hubspawn's subject, and a walk would make this a test of the
 * joystick.  The verdict is read from the WORKER's inventory, never from the
 * client's copy — the client credits nothing itself on a server pile
 * (groundLoot.js waits for loot_credit), but asking it would still be asking
 * the wrong end.
 */
import * as H from './harness.mjs';

/* Where the objective item comes from, straight out of the shipped table. */
import { QUEST_REWARDS } from '../../../server/src/data.js';

const WANT = QUEST_REWARDS.tut_1.objective;   /* {collect, invKey:'snowman', count:4, zone:'frost'} */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hunter', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);
  const srv = () => H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);

  rec.ok('the first quest asks for an item, from a named zone (guard on the table)',
    !!WANT && WANT.type === 'collect' && WANT.invKey === 'snowman' && WANT.zone === 'frost', WANT);

  /* ── accept tut_1, which is also what arms you and opens Frost Ridge ── */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(400);
  await H.clickText(P, 'Cold Reception').catch(() => {});
  await P.page.waitForTimeout(600);
  await H.clickText(P, 'Accept from Mayor Bro').catch(() => {});
  await P.page.waitForTimeout(2000);
  const armedSrv = await srv();
  rec.ok('the quest is active on the worker (guard: the rest is meaningless without it)',
    !!armedSrv && (armedSrv._quests || {}).tut_1 === 'active', armedSrv && armedSrv._quests);

  /* Out from under the Quests panel the way mp-tutorial does it — a reload,
     which also proves the accept survived the round trip rather than living in
     the client's optimistic copy.  Everything below runs on a clean screen. */
  await P.page.reload();
  await P.page.waitForTimeout(9000);
  await H.waitFor(P, (S) => !!(S.myId && S.currentZone), (v) => !!v,
    { timeout: 60000, label: 'back in the world' }).catch(() => {});

  /* Equip the greatsword — quest weapons land in the STASH since v2.3.1683,
     and the auto-attack loop refuses to fire on an empty slot (v2.3.212), so
     an unequipped run would "fail" by never swinging. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel) return;
    const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
  });
  await P.page.waitForTimeout(1800);
  rec.ok('the starting sword is in the melee slot',
    await H.readState(P, (S) => !!(S.rpg && S.rpg.weapon)),
    await H.readState(P, (S) => S.rpg && S.rpg.weapon));

  /* ── travel to the quest zone, on the game's own trail-heads ── */
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      out: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview'),
      frost: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost'),
    };
  });
  const stand = (tx, ty) => P.page.evaluate(({ x, y }) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    S.player.x = x * 32 + 16; S.player.y = y * 32 + 16;
    return true;
  }, { x: tx, y: ty });
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 8; i++) {
      await stand(tx, ty);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 6000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(P, (S) => S.currentZone)) === zoneId;
  };
  rec.ok('the trail-heads are on the autotest bridge (guard)', !!marks, marks);
  if (marks) {
    await travel(marks.out.tx, marks.out.ty, 'worldview');
    rec.ok('the quest opened Frost Ridge and the character walked in',
      await travel(marks.frost.tx, marks.frost.ty, 'frost'),
      await H.readState(P, (S) => S.currentZone));
  }
  await P.page.waitForTimeout(2500);

  /* The zone has to have something in it, or "no drop" and "no monster" are
     the same result and this file proves nothing. */
  const spawned = await H.waitFor(P,
    (S) => (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp === undefined || m.curHp > 0)).length,
    (n) => n > 0, { timeout: 20000, label: 'frost has monsters' }).catch(() => 0);
  rec.ok('Frost Ridge actually spawned something to kill (guard)', spawned > 0, { alive: spawned });

  /* ── the hunt ──
     Park beside the nearest live monster and let the game's own auto-attack
     loop swing; when the pile drops, step onto it (groundLoot sends the
     loot_pickup at 20px, the worker's range gate is 60).  Re-read the world
     every pass rather than caching a target: it dies, it respawns elsewhere,
     and a stale reference is how a hunt loop turns into a stand-still.
     Budgeted in PASSES rather than by wall clock so a slow box gets a slower
     run instead of a red one. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S) S.autoAttack = true;
  });

  const invCount = async () => {
    const r = await srv();
    return (r && r.inventory && r.inventory[WANT.invKey]) || 0;
  };
  const startCount = await invCount();
  rec.ok('control: the bag holds none of the objective item to begin with',
    startCount === 0, { [WANT.invKey]: startCount });

  let got = 0;
  let died = false;
  const log = [];
  for (let pass = 0; pass < 70 && got < WANT.count; pass++) {
    const step = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return { err: 'no-state' };
      if (S.rpg && S.rpg.hp !== undefined && S.rpg.hp <= 0) return { err: 'dead', zone: S.currentZone };
      if (S.currentZone !== 'frost') return { err: 'left-zone', zone: S.currentZone };
      const P0 = S.player;
      /* A pile on the ground beats a live monster: it expires, and the whole
         point of the kill was what fell out of it. */
      /* S.groundLoot, not S.loot — the worker's map is `this.loot[zone]` and
         the client's mirror has a different name; reading the wrong one would
         make this loop quietly never pick anything up. */
      const piles = (S.groundLoot || []).filter((l) => l && !l._collected);
      if (piles.length) {
        let best = piles[0], bd = Infinity;
        for (const l of piles) {
          const d = Math.hypot(l.x - P0.x, l.y - P0.y);
          if (d < bd) { bd = d; best = l; }
        }
        P0.x = best.x; P0.y = best.y;
        return { act: 'loot', d: Math.round(bd) };
      }
      const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp === undefined || m.curHp > 0));
      if (!live.length) return { act: 'wait-respawn' };
      let tgt = live[0], td = Infinity;
      for (const m of live) {
        const d = Math.hypot(m.x - P0.x, m.y - P0.y);
        if (d < td) { td = d; tgt = m; }
      }
      /* Just inside the swing sweep, and BELOW the monster so the character
         faces up at it — the sweep is a cone off P.dir. */
      P0.x = tgt.x; P0.y = tgt.y + 26; P0.dir = 'up';
      S.autoAttack = true;
      return { act: 'fight', arch: tgt.arch || tgt.type, hp: Math.round(tgt.curHp || 0), was: Math.round(td) };
    });
    if (step && step.err === 'dead') { died = true; break; }
    if (step && step.err === 'left-zone') { died = true; log.push(step); break; }
    await P.page.waitForTimeout(900);
    const now = await invCount();
    if (now !== got) log.push({ pass, count: now, after: step && step.act });
    got = now;
  }

  const endSrv = await srv();
  rec.ok(`killing snowmen actually drops '${WANT.invKey}' into the worker's bag`,
    got > 0, { got, died, log, zone: endSrv && endSrv.z, inv: endSrv && endSrv.inventory });
  rec.ok('...and the character survived the errand (a corpse cannot finish it)',
    !died, { died, log });
  /* The whole objective, not just one drop: `count` of them is what the quest
     asks for and what the turn-in gate demands, so a drop rate or a respawn
     that cannot supply four in seventy passes is the finding, not a pass. */
  rec.ok(`...and the full objective (${WANT.count}) is reachable by fighting for it`,
    got >= WANT.count, { got, want: WANT.count, log });

  /* And the client agrees the quest is now ready to hand in — the same
     predicate QuestPanel gates Claim Reward on, so this is the button.

     POLLED, not sampled once, and the reason is a real property of the wire
     rather than test slop: `loot_credit` is cosmetic for a stackable (wsClient
     "the authoritative R.inventory write rides the player_state that follows
     on this same socket flush"), so the client's bag learns about the fourth
     remnant on the next `_flushPendingPlayerStates`, not on the pickup.  A
     single read the instant the WORKER reaches four is therefore a race the
     client can lose, and it did on the first run of this file
     (`{ready:false, got:4}` with four remnants sitting in the worker's blob).
     Waiting is the honest test — a genuine mismatch, which is what this
     assertion is for, still fails, it just takes ten seconds to say so. */
  let ready = null;
  for (let i = 0; i < 20; i++) {
    ready = await P.page.evaluate(() => {
      const F = window._gameFns || {};
      const S = window._gameState && window._gameState.current;
      const q = F.QUEST_CHAINS && F.QUEST_CHAINS.tut_1;
      if (!q || !S) return null;
      try { return !!q.check(S.rpg || {}, S); } catch (e) { return 'threw:' + e.message; }
    });
    if (ready === true) break;
    await P.page.waitForTimeout(500);
  }
  const clientHeld = await H.readState(P, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.snowman) || 0);
  rec.ok('...which makes the turn-in claimable without any seeding',
    ready === true, { ready, workerHeld: got, clientHeld });

  await P.ctx.close().catch(() => {});
}
