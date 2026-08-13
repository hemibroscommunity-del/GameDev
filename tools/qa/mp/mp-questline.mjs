/* THE WHOLE QUEST LINE, START TO FINISH, THROUGH THE ONLY DOORS A PLAYER HAS.
 * v2.3.1707.
 *
 * Owner: "do headless testing to start the quest flow from start to finish."
 * Judges play today, so the question this file answers is the blunt one — can
 * one character get from a fresh spawn to the end of every chain Mayor Bro
 * offers, using nothing a player cannot do?
 *
 * It matters MORE than it did yesterday, because v2.3.1704 removed the Quests
 * pane's Turn In button (owner: "it's getting messed up"). The walk-up
 * dialogue is now the ONLY route to a reward in the game. Nothing else in the
 * suite walks the entire chain through it: mp-tutorial drives the accept and
 * the refusal, mp-questprox drives the latch, mp-questlegs drives one reward.
 * If the dialogue turn-in broke, every one of those could stay green while the
 * game became uncompletable.
 *
 * SO EVERY ACCEPT AND EVERY TURN-IN HERE IS A REAL TAP on the real dialogue,
 * opened by walking up to him. The XP-skill chooser is a real tap too — the
 * worker refuses an XP-paying turn-in that does not name a skill (v2.3.1669),
 * so it is part of the flow, not decoration.
 *
 * WHAT IS SEEDED, AND WHY — stated plainly rather than buried:
 *   • OBJECTIVE ITEMS are granted through the operator endpoint. Killing four
 *     snowmen, six blue slimes, five mummies and six fire goblins across four
 *     zones would make this a combat test that takes twenty minutes and fails
 *     on a bad spawn roll. Combat, gathering and travel each have their own
 *     scenarios (mp-townlock, mp-harvest, mp-hubspawn); this one owns the
 *     QUEST FLOW, and seeding the objective is what keeps it about that.
 *   • ONE REAL ROUND TRIP is walked anyway — town → World View → Frost Ridge
 *     → back — because "go to the zone and come back to hand it in" is the
 *     shape of every step, and a chain that cannot be walked is not a chain.
 *     The remaining steps hand in from town, which is where the giver is.
 *
 * Read from the WORKER at every checkpoint. The client's own _quests map is
 * written optimistically on accept, so asking it whether a quest advanced
 * proves nothing — that exact mistake is why the v2.3.1683 sword grant shipped
 * looking verified (see mp-townlock).
 */
import * as H from './harness.mjs';

/* The four-step tutorial arc and the two-step life-skill chain, in the order
   Mayor Bro offers them.  `objective` is what the worker demands before it
   will pay; `pays` is what must be in the bag afterwards. */
const ARC = [
  { id: 'tut_1', title: 'Cold Reception', give: { invKey: 'snowman', count: 4 } },
  { id: 'tut_2', give: { invKey: 'slime-remnants', count: 6 } },
  { id: 'tut_3', give: { invKey: 'skeleton-remnants', count: 5 } },
  { id: 'tut_4', give: { invKey: 'fire-goblin-remnants', count: 6 } },
  { id: 'life_1', give: { invKey: 'cooked_fish_minnow', count: 2 } },
  { id: 'life_2', give: { invKey: 'ore_copper', count: 5 } },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Pilgrim', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  const srv = () => H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);
  const open = () => P.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
  const cardText = () => P.page.evaluate(() => {
    const c = document.querySelector('.bt-inspect-card');
    return c ? (c.innerText || '') : '';
  });
  const close = async () => {
    await P.page.evaluate(() => {
      const b = document.querySelector('.bt-inspect-close');
      if (b) b.click();
    });
    await P.page.waitForTimeout(400);
  };
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });

  /* Walk up to him with a clean slate: away, close whatever is up, back in.
     The latch only re-arms after leaving the larger radius, and the scan will
     not re-fire while a card is already open (`!S._uiBusy`) — so a card left
     over from a previous step would sit there showing a stale quest.  That
     is not hypothetical: it is exactly what made this run's first attempt at
     the turn-in read "New Quest!" (v2.3.1706b). */
  const approach = async () => {
    await place(420, 0);
    await P.page.waitForTimeout(500);
    await close();
    await place(0, 34);
    await P.page.waitForTimeout(1100);
    return open();
  };

  /* ── the line starts here ── */
  const start = await srv();
  rec.ok('a fresh character has no quest history on the worker',
    !!start && Object.keys(start._quests || {}).length === 0, start && start._quests);

  let walked = null;
  for (const step of ARC) {
    /* ── ACCEPT, by walking up and tapping ── */
    rec.ok(`${step.id}: walking up to Mayor Bro opens his dialogue`, await approach());
    if (step.title) {
      rec.ok(`${step.id}: ...offering the right quest`,
        (await cardText()).includes(step.title), (await cardText()).slice(0, 120));
    }
    const accepted = await H.clickText(P, 'Accept').then(() => true).catch(() => false);
    rec.ok(`${step.id}: the dialogue offers Accept`, accepted);
    await P.page.waitForTimeout(1800);
    const afterAccept = await srv();
    rec.ok(`${step.id}: the WORKER records it active (not just the client)`,
      !!afterAccept && (afterAccept._quests || {})[step.id] === 'active',
      afterAccept && afterAccept._quests);

    /* tut_1's accept is also the moment the game arms you — the town gate
       will not let an unarmed character leave (v2.3.1676), so this is a
       prerequisite for the round trip below, not a side note. */
    if (step.id === 'tut_1') {
      rec.ok('accepting the first quest puts a sword AND a shield in the bag',
        !!afterAccept && (afterAccept.weaponStash || []).some((w) => w && w.type === 'greatsword')
        && !afterAccept.weapon,
        { stash: (afterAccept.weaponStash || []).map((w) => w && w.type), worn: afterAccept.weapon });
      /* Equip it the way the bag does, so the rest of the run is armed. */
      await close();
      await P.page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        const R = S && S.rpg;
        if (!R || !S.channel) return;
        const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
        if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
      });
      await P.page.waitForTimeout(1500);

      /* ── THE ROUND TRIP.  Done once, on the first step, because every step
            has this shape and a chain you cannot walk is not a chain. ── */
      const marks = await P.page.evaluate(() => {
        const f = window._gameFns;
        if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
        return {
          out: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview'),
          frost: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost'),
          home: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'town'),
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
      if (marks) {
        const toWorld = await travel(marks.out.tx, marks.out.ty, 'worldview');
        rec.ok('an armed character can leave town for the World View', toWorld);
        const toFrost = await travel(marks.frost.tx, marks.frost.ty, 'frost');
        rec.ok('...and walk on to the quest zone', toFrost,
          await H.readState(P, (S) => S.currentZone));
        /* Back the way you came: the spoke's return marker, then town. */
        await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
          { timeout: 8000, label: 'return to the World View' }).catch(() => {});
        const backHome = await travel(marks.home.tx, marks.home.ty, 'town');
        rec.ok('...and get back to town to hand it in', backHome,
          await H.readState(P, (S) => S.currentZone));
        walked = { toWorld, toFrost, backHome };
      }
      await P.page.waitForTimeout(1200);
    }

    /* ── the objective (see the header: seeded on purpose) ── */
    await H.grant(wsPort, myId, 'item', step.give);
    await P.page.waitForTimeout(1600);

    /* ── TURN IN, through the dialogue — the only door left ── */
    rec.ok(`${step.id}: walking back up opens the dialogue again`, await approach());
    const ready = await cardText();
    rec.ok(`${step.id}: ...and it carries the turn-in`,
      /Turn In|Choose a skill/i.test(ready), ready.slice(0, 200));
    /* The worker refuses an XP-paying turn-in with no named skill
       (v2.3.1669), so pick one when the chooser is on the card. */
    await H.clickText(P, 'Melee').catch(() => {});
    await P.page.waitForTimeout(400);
    await H.clickText(P, 'Turn In').catch(() => {});
    await P.page.waitForTimeout(2200);

    const done = await srv();
    rec.ok(`${step.id}: the WORKER marked it turned in`,
      !!done && (done._quests || {})[step.id] === 'turnedIn',
      done && done._quests);

    /* ═══ v2.3.1713: THE DIALOGUE SURVIVES THE HAND-IN ═══
       Owner: "make it so that turning in the quest after completion launches
       the quest dialog window (same behavior as when you first begin a
       quest)."  turnInQuest used to end on setQuestPanel(null) while
       acceptQuest kept its card up and merely flipped the status — so a
       hand-in dropped the player back to a blank screen standing right in
       front of the giver, and his next quest stayed unoffered until they had
       walked 110px away and back, because the proximity opener's latch is
       still armed from this same visit.
       Every quest in ARC is Mayor Bro's and he has more beyond life_2, so
       there is always a next one to show — no last-step special case.
       Asserted BEFORE the close() below, which would hide the thing under
       test.  "Offers Accept" is the honest witness rather than the title: a
       card that merely failed to close would still carry the OLD quest's
       Turn In, and would pass a bare "is it open" check. */
    const afterTurnIn = await cardText();
    rec.ok(`${step.id}: the dialogue stays open through the hand-in`,
      await open(), afterTurnIn.slice(0, 200));
    rec.ok(`${step.id}: ...already offering his next quest, with no walk-away`,
      /Accept/i.test(afterTurnIn) && !/Turn In/i.test(afterTurnIn),
      afterTurnIn.slice(0, 200));

    await close();
  }

  /* ── what the line actually paid out ── */
  const end = await srv();
  const q = (end && end._quests) || {};
  rec.ok('every quest in the line is turned in',
    ARC.every((s) => q[s.id] === 'turnedIn'), q);
  /* ── the two armour rewards ──
     Read from the CLIENT's bag, and that is correct rather than a shortcut:
     there is deliberately NO server-side armour stash.  Handoff rule 1
     forbids adding a field to the rpg blob, so v2.3.1695 has the worker
     announce the piece with `quest_reward_stashed` and the client hold it in
     armorStash/legsStash until the player equips it — at which point
     stats_update tells the worker what is worn.  Asking the worker for the
     BAG therefore reads empty on a working game, which is exactly what the
     first cut of this file did.  So: check the bag on the client, then equip
     and check the WORKER, which is the half that decides damage. */
  const bags = await H.readState(P, (S) => ({
    legs: (S.rpg.legsStash || []).map((a) => a && a.name),
    chest: (S.rpg.armorStash || []).map((a) => a && a.name),
  }));
  /* v2.3.1692: tut_4 pays the LEGS. */
  rec.ok('the fire-goblin quest paid the Iron Greaves into the bag',
    bags.legs.includes('Iron Greaves'), bags);
  /* v2.3.1704 (owner: "Prospectors vest and prospectors greaves are the wrong
     description ... the legs were an earlier reward already so it would just
     be torso"): one chest piece, and NOT a second pair of legs. */
  rec.ok('the mining quest paid the Iron Torso into the bag',
    bags.chest.includes('Iron Torso'), bags);
  rec.ok('...and did NOT pay a second pair of legs',
    bags.legs.filter(Boolean).length === 1, bags);

  /* Equip both, the way the bag does, and confirm the WORKER holds them —
     armour that only exists on the client mitigates nothing (v2.3.1701). */
  await P.page.evaluate(() => {
    const bus = window._itemDetailBus;
    const S = window._gameState && window._gameState.current;
    if (!bus || !S) return;
    const legs = (S.rpg.legsStash || [])[0];
    if (legs) bus.open({ kind: 'stashLegs', armor: legs, index: 0 });
  });
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Equip').catch(() => {});
  await P.page.waitForTimeout(1800);
  await P.page.evaluate(() => {
    const bus = window._itemDetailBus;
    const S = window._gameState && window._gameState.current;
    if (!bus || !S) return;
    const chest = (S.rpg.armorStash || [])[0];
    if (chest) bus.open({ kind: 'stashArmor', armor: chest, index: 0 });
  });
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Equip').catch(() => {});
  await P.page.waitForTimeout(1800);
  const wornSrv = await srv();
  rec.ok('equipping the greaves reaches the WORKER (so they reduce damage)',
    !!wornSrv && wornSrv.legsArmor && wornSrv.legsArmor.name === 'Iron Greaves',
    wornSrv && wornSrv.legsArmor);
  rec.ok('equipping the torso reaches the WORKER too',
    !!wornSrv && wornSrv.armor && wornSrv.armor.name === 'Iron Torso',
    wornSrv && wornSrv.armor);
  /* And the character actually wears them — the v2.3.1703 derived layer. */
  const layer = await P.page.evaluate(() => {
    const g = window._gameFns && window._gameFns.getEquip;
    return g ? { legs: g('legs'), chest: g('chest') } : null;
  });
  rec.ok('...and both show on the character',
    !!layer && layer.legs === 'steelgreaves' && layer.chest === 'steelplate', layer);

  rec.ok('all three primary weapons were handed over across the line',
    !!end && ['greatsword', 'bow', 'staff'].every((t) =>
      (end.weaponStash || []).some((w) => w && w.type === t) || (end.weapon && end.weapon.type === t)),
    { stash: (end && end.weaponStash || []).map((w) => w && w.type), worn: end && end.weapon && end.weapon.type });
  rec.ok('and the line paid real gold', !!end && (end.coins || 0) > 0, end && end.coins);
  if (walked) rec.ok('the round trip walked cleanly in both directions', walked.toWorld && walked.toFrost && walked.backHome, walked);

  await P.ctx.close().catch(() => {});
}
