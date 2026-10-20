/* The quest greaves go on the LEGS (v2.3.1701).
 *
 * Owner: 'Copper Greaves' — the tut_4 reward, granted as kind:'legs' precisely
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

/* v2.3.3517: the Mayor's last three -- the tour (his slimes first, then ten
   steps for the other givers) is put behind this character by the operator's
   /dev/tour, which pays nothing; tut_4 is the one that pays the greaves */
const STEPS = [
  { id: 'tut_2', invKey: 'snowman', count: 4 },
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

  const toured = await H.devOp(wsPort, 'tour', myId, { at: 'tut_2' });
  rec.ok('the tour is behind this character (setup)', !!toured && toured.ok === true, toured);
  await P.page.waitForTimeout(900);
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
  rec.ok('the greaves land in the LEGS stash', bags.legs.includes('Copper Greaves'), bags);
  rec.ok('...and NOT in the chest stash (the bug: the slot was dropped)',
    !bags.chest.includes('Copper Greaves'), bags);

  /* ── equip it through the real bag UI ──
     There is no Bag DESTINATION any more: since v2.3.1653 the resting
     dashboard IS the bag (BottomDashboard RAIL_ORDER), so the tile lives on
     the band and 'Dashboard' is how you get back to it. */
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(900);
  /* v2.3.3399: ...and the band OPEN.  Since v2.3.2495 a first join arrives
     with the dashboard folded, which shows no bag at all: the tile was never
     on screen to tap (the sweep of 2026-10-18, its card text ending "OPEN"). */
  await H.unfoldBand(P);
  const tapped = await P.page.locator('[title="Copper Greaves"]').first()
    .click({ timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('the greaves show up as a bag tile you can tap', tapped);
  await P.page.waitForTimeout(500);
  const card = await H.bodyText(P);
  rec.ok('its card names the LEGS slot, not the chest',
    /Legs/.test(card) && !/Copper Greaves[\s\S]{0,120}Chest/.test(card), card.slice(0, 400));
  const equipped = await H.clickText(P, 'Equip').then(() => true).catch(() => false);
  rec.ok('the card offers Equip', equipped);
  await P.page.waitForTimeout(1800);

  const worn = await H.readState(P, (S) => ({
    legsArmor: S.rpg.legsArmor && S.rpg.legsArmor.name,
    armor: S.rpg.armor && S.rpg.armor.name,
  }));
  rec.ok('equipping puts it on the LEGS', worn.legsArmor === 'Copper Greaves', worn);
  rec.ok('...and leaves the chest slot alone', worn.armor !== 'Copper Greaves', worn);

  /* The worker has to learn it, or the next full player_state takes the
     piece back off and the server keeps computing damage without it. */
  const after = await H.adminPlayer(wsPort, myId);
  rec.ok('the WORKER stored the legs piece (so it actually reduces damage)',
    !!(after && after.rpg && after.rpg.legsArmor && after.rpg.legsArmor.name === 'Copper Greaves'),
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
  /* v2.3.1758: the tier-one greaves are COPPER now (owner: "copper to be the
     first armor in the game ... this should replace the iron armor"), and the
     layer id is what carries the metal — 'coppergreaves' is the steel art with
     the copper tint, so asserting the id here is asserting the colour too. */
  rec.ok('the worn greaves put armour on the LEGS layer the renderer draws',
    shown.legs === 'coppergreaves', shown);
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
  rec.ok('unequipping puts the greaves back in the bag', !bare.legsArmor && bare.legsStash.includes('Copper Greaves'), bare);
  rec.ok('...and takes the art back off the character', bare.legs === 'none', bare);

  /* ═══ v2.3.1704: AND THE MINING QUEST PAYS THE OTHER HALF, ONCE ═══
     Owner: "Prospectors vest and prospectors greaves are the wrong description
     of quest awards for iron torso and iron legs for mining quest.  Also the
     legs were an earlier reward already so it would just be torso."
     life_2 paid a two-piece armorSet beside tut_4's greaves, so a second pair
     of legs appeared in the stash.
     v2.3.3517: life_1 and life_2 are RETIRED -- their errands and tools went
     to the tour's givers (Diego's fish, Blacksmith Bro's ore, which pays bars
     you forge yourself), and the worker refuses to start either.  So what is
     left to pin is the same relationship from the other side: asked for the
     two old quests, the worker starts neither, and the whole arc still leaves
     ONE pair of legs, tut_4's. */
  for (const id of ['life_1', 'life_2']) {
    await send({ type: 'quest_accept', payload: { questId: id } });
    await P.page.waitForTimeout(900);
  }
  const mining = await H.adminPlayer(wsPort, myId);
  const mq = (mining && mining.rpg && mining.rpg._quests) || {};
  rec.ok('the retired mining and fishing quests cannot be started (the worker refuses them)',
    mq.life_1 !== 'active' && mq.life_1 !== 'turnedIn' && mq.life_2 !== 'active' && mq.life_2 !== 'turnedIn', mq);

  const after2 = await H.readState(P, (S) => ({
    chest: (S.rpg.armorStash || []).map((a) => a && a.name),
    legs: (S.rpg.legsStash || []).map((a) => a && a.name),
    wornLegs: S.rpg.legsArmor && S.rpg.legsArmor.name,
  }));
  /* The name is half the report — "Prospector's" was the family that did not
     exist, so its absence is worth asserting rather than assuming. */
  rec.ok('...and nothing is called "Prospector\'s" anything any more',
    !after2.chest.concat(after2.legs).some((n) => /Prospector/i.test(String(n))), after2);
  /* The headline: ONE pair of legs in the whole arc, and it is tut_4's. */
  rec.ok('the whole arc pays ONE pair of legs, tut_4\'s',
    after2.legs.filter((n) => n === 'Copper Greaves').length === 1
    && after2.legs.length === 1, after2);

  await P.ctx.close().catch(() => {});
}
