/* The quest greaves go on the LEGS (v2.3.1701).
 *
 * Owner: "Iron Greaves" — the tut_4 reward, granted as kind:'legs' precisely
 * because the owner asked for legs first ("animations look better with legs
 * only than they do chest only") — equipped to the CHEST.
 *
 * The worker was right all along: it sends `quest_reward_stashed` with
 * `slot:'legsArmor'` (pinned server-side by tutorial.test.mjs).  The CLIENT
 * dropped the slot and pushed every piece into `armorStash`, which the item
 * popup swaps against R.armor.  So this scenario has to run the whole way
 * through a real client: a unit test on either side would have passed while
 * the piece landed on the torso.
 *
 * It walks the tutorial arc over the wire (the DOM path for that is already
 * covered by mp-tutorial / mp-questui; repeating it here would only make this
 * slower and flakier) and then equips through the REAL bag UI, because the
 * equip route is the half that was wrong.
 *
 * The last assertion is the one that matters most: the server's own blob has
 * `legsArmor` set.  ps.legsArmor is what _armorDrMult reads, so a greave that
 * only exists on the client is a cosmetic that mitigates nothing.
 *
 * v2.3.1704 EXTENSION — the MINING quest's half of the same wardrobe.  Owner:
 * "Also the legs were an earlier reward already so it would just be torso."
 * life_2 was paying a second pair of legs on top of tut_4's, which is a fault
 * only visible from a run that walks BOTH arcs and then counts what is in the
 * bag — so the tail of this scenario now does exactly that.
 */
import * as H from './harness.mjs';

const STEPS = [
  { id: 'tut_1', invKey: 'snowman', count: 4 },
  { id: 'tut_2', invKey: 'slime-remnants', count: 6 },
  { id: 'tut_3', invKey: 'skeleton-remnants', count: 5 },
  { id: 'tut_4', invKey: 'fire-goblin-remnants', count: 6 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Greaver', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.waitForTimeout(1200);

  const send = (msg) => P.page.evaluate((m) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send(m);
  }, msg);

  for (const step of STEPS) {
    await send({ type: 'quest_accept', payload: { questId: step.id } });
    await P.page.waitForTimeout(900);
    await H.grant(wsPort, myId, 'item', { invKey: step.invKey, count: step.count });
    await P.page.waitForTimeout(1200);
    /* prog3 characters must name the skill the XP trains or the worker
       refuses the turn-in outright (v2.3.1669). */
    await send({ type: 'quest_turn_in', payload: { questId: step.id, xpCat: 'sword' } });
    await P.page.waitForTimeout(1500);
  }

  const admin = await H.adminPlayer(wsPort, myId);
  rec.ok('the four-step arc completed server-side',
    admin && admin.rpg && admin.rpg._quests && admin.rpg._quests.tut_4 === 'turnedIn',
    admin && admin.rpg && admin.rpg._quests);

  /* ── the piece arrives in the LEGS bag, not the chest one ── */
  const bags = await H.readState(P, (S) => ({
    legs: (S.rpg.legsStash || []).map((a) => a && a.name),
    chest: (S.rpg.armorStash || []).map((a) => a && a.name),
  }));
  rec.ok('the greaves land in the LEGS stash', bags.legs.includes('Iron Greaves'), bags);
  rec.ok('...and NOT in the chest stash (the bug: the slot was dropped)',
    !bags.chest.includes('Iron Greaves'), bags);

  /* ── equip it through the real bag UI ──
     There is no Bag DESTINATION any more: since v2.3.1653 the resting
     dashboard IS the bag (BottomDashboard RAIL_ORDER), so the tile lives on
     the band and 'Dashboard' is how you get back to it. */
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(900);
  const tapped = await P.page.locator('[title="Iron Greaves"]').first()
    .click({ timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('the greaves show up as a bag tile you can tap', tapped);
  await P.page.waitForTimeout(500);
  const card = await H.bodyText(P);
  rec.ok('its card names the LEGS slot, not the chest',
    /Legs/.test(card) && !/Iron Greaves[\s\S]{0,120}Chest/.test(card), card.slice(0, 400));
  const equipped = await H.clickText(P, 'Equip').then(() => true).catch(() => false);
  rec.ok('the card offers Equip', equipped);
  await P.page.waitForTimeout(1800);

  const worn = await H.readState(P, (S) => ({
    legsArmor: S.rpg.legsArmor && S.rpg.legsArmor.name,
    armor: S.rpg.armor && S.rpg.armor.name,
  }));
  rec.ok('equipping puts it on the LEGS', worn.legsArmor === 'Iron Greaves', worn);
  rec.ok('...and leaves the chest slot alone', worn.armor !== 'Iron Greaves', worn);

  /* The worker has to learn it, or the next full player_state takes the
     piece back off and the server keeps computing damage without it. */
  const after = await H.adminPlayer(wsPort, myId);
  rec.ok('the WORKER stored the legs piece (so it actually reduces damage)',
    !!(after && after.rpg && after.rpg.legsArmor && after.rpg.legsArmor.name === 'Iron Greaves'),
    after && after.rpg && after.rpg.legsArmor);

  /* ═══ v2.3.1703: AND IT SHOWS ON THE CHARACTER ═══
     Owner: "when you equip iron greaves it doesn't show on your character."
     v2.3.1701 wired the piece all the way to the server's damage maths and
     stopped there — the RENDERED layer is a separate store (gearCatalog's
     chest/legs slots) that nothing connected to it, so the numbers moved and
     the character stayed bare.  The layer is derived from the worn stat
     piece now, and this asks the store the RENDERER reads (via the
     _gameFns.getEquip bridge) rather than any state of the test's own. */
  const shown = await P.page.evaluate(() => {
    const g = window._gameFns && window._gameFns.getEquip;
    return g ? { legs: g('legs'), chest: g('chest') } : { err: 'no getEquip bridge' };
  });
  rec.ok('the worn greaves put armour on the LEGS layer the renderer draws',
    shown.legs === 'steelgreaves', shown);
  rec.ok('...and did not also paint a chest plate on (there is no chest piece)',
    shown.chest === 'none', shown);

  /* Taking them off takes the art off too.  This direction is the half that
     used to be a cosmetic-only toggle, so it could disagree with the stats
     both ways: the old Loadout button even had a branch that equipped steel
     greaves onto a character who owned none. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (window._itemDetailBus && S && S.rpg && S.rpg.legsArmor) {
      window._itemDetailBus.open({ kind: 'legsArmor' });
    }
  });
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Unequip').catch(() => {});
  await P.page.waitForTimeout(1500);
  const bare = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const g = window._gameFns && window._gameFns.getEquip;
    return {
      legsArmor: S && S.rpg && S.rpg.legsArmor && S.rpg.legsArmor.name,
      legsStash: ((S && S.rpg && S.rpg.legsStash) || []).map((a) => a && a.name),
      legs: g ? g('legs') : 'no bridge',
    };
  });
  rec.ok('unequipping puts the greaves back in the bag', !bare.legsArmor && bare.legsStash.includes('Iron Greaves'), bare);
  rec.ok('...and takes the art back off the character', bare.legs === 'none', bare);

  /* ═══ v2.3.1704: AND THE MINING QUEST PAYS THE OTHER HALF, ONCE ═══
     Owner: "Prospectors vest and prospectors greaves are the wrong description
     of quest awards for iron torso and iron legs for mining quest.  Also the
     legs were an earlier reward already so it would just be torso."
     life_2 paid a two-piece armorSet — a "Prospector's Vest" AND a
     "Prospector's Greaves" — while tut_4 above had already paid Iron Greaves
     since v2.3.1692.  Nothing errored: armour overflows to the bag rather
     than dressing you (v2.3.1695), so the second pair of legs simply appeared
     in the stash next to the first, under a name from a family that matched
     nothing else the player owned.
     This belongs in THIS scenario rather than a new one precisely because the
     bug is a relationship BETWEEN the two quests — the assertion that matters
     is that the legs stash still holds exactly the one pair tut_4 paid after
     the mining quest has also been turned in, which only a run that walks
     both arcs can make.
     Driven over the wire (the DOM paths for accept/turn-in are covered by
     mp-tutorial and mp-questui); what is under test here is the payout. */
  const LIFE = [
    { id: 'life_1', invKey: 'cooked_fish_minnow', count: 2 },
    { id: 'life_2', invKey: 'ore_copper', count: 5 },
  ];
  for (const step of LIFE) {
    await send({ type: 'quest_accept', payload: { questId: step.id } });
    await P.page.waitForTimeout(900);
    await H.grant(wsPort, myId, 'item', { invKey: step.invKey, count: step.count });
    await P.page.waitForTimeout(1200);
    await send({ type: 'quest_turn_in', payload: { questId: step.id, xpCat: 'sword' } });
    await P.page.waitForTimeout(1600);
  }
  const mining = await H.adminPlayer(wsPort, myId);
  rec.ok('the mining quest completed server-side',
    !!(mining && mining.rpg && mining.rpg._quests && mining.rpg._quests.life_2 === 'turnedIn'),
    mining && mining.rpg && mining.rpg._quests);

  const after2 = await H.readState(P, (S) => ({
    chest: (S.rpg.armorStash || []).map((a) => a && a.name),
    legs: (S.rpg.legsStash || []).map((a) => a && a.name),
    wornLegs: S.rpg.legsArmor && S.rpg.legsArmor.name,
  }));
  rec.ok('the mining quest pays an IRON TORSO into the chest bag',
    after2.chest.includes('Iron Torso'), after2);
  /* The name is half the report — "Prospector's" was the family that did not
     exist, so its absence is worth asserting rather than assuming. */
  rec.ok('...and nothing is called "Prospector\'s" anything any more',
    !after2.chest.concat(after2.legs).some((n) => /Prospector/i.test(String(n))), after2);
  /* The headline: ONE pair of legs in the whole arc, and it is tut_4's. */
  rec.ok('the mining quest pays NO second pair of legs',
    after2.legs.filter((n) => n === 'Iron Greaves').length === 1
    && after2.legs.length === 1, after2);

  await P.ctx.close().catch(() => {});
}
