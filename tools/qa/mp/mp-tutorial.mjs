/* The tutorial arc, through the real UI (v2.3.1665).
 *
 * This scenario exists because the bug it guards was a REACHABILITY bug,
 * and reachability is invisible to a unit test: the server's quest handlers
 * were fully implemented and fully tested, and a player still could not
 * accept a single quest, because the only trigger was an NPC entity that no
 * longer spawns.  Everything below therefore goes through the DOM — real
 * taps on the real panel — rather than through the wire.
 *
 * What it pins:
 *   - a fresh character starts BARE (armor is earned now, not issued)
 *   - the first tutorial quest is visible and offered to a new player
 *   - tapping Accept actually reaches the server (checked in the DO, not
 *     in the client's optimistic copy)
 *   - Turn In is refused while the objective is unmet — the reward gate is
 *     the SERVER's, not the button's
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── a fresh character is bare ── */
  const gear = await P.page.evaluate(() => {
    try {
      return {
        chest: localStorage.getItem('bt-gear-v3-chest'),
        legs: localStorage.getItem('bt-gear-v3-legs'),
        staleV2: localStorage.getItem('bt-gear-v2-chest'),
      };
    } catch (e) { return { err: String(e) }; }
  });
  /* null means "never set", i.e. the default is in force — which is now
     'none'.  A non-null 'steelplate' here would mean the key bump failed. */
  rec.ok('a fresh character is not issued chest armor',
    gear.chest === null || gear.chest === 'none', gear);
  rec.ok('a fresh character is not issued leg armor',
    gear.legs === null || gear.legs === 'none', gear);

  /* ── the quest is offered ── */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  /* The panel opens on Active, which is empty for a new player ("No active
     quests. Choose one from Available…").  Offered quests live behind the
     Available segment, so a new player's first move is this tap. */
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  const questsBody = await H.bodyText(P);
  rec.ok('the Quests panel offers the first tutorial quest',
    /Cold Reception/.test(questsBody), questsBody.slice(0, 400));

  const opened = await H.clickText(P, 'Cold Reception').then(() => true).catch(() => false);
  rec.ok('the quest row opens its detail page', opened);
  await P.page.waitForTimeout(500);

  const detail = await H.bodyText(P);
  rec.ok('the detail page states the objective and the zone',
    /Frost Ridge/.test(detail), detail.slice(0, 400));
  /* v2.3.1673: the arc asks for REMNANTS now, not a kill count.  Pinned here
     because the client `check` and the server objective are two tables that
     have to agree, and the symptom of disagreement is a Turn In button that
     refuses without saying why. */
  rec.ok('the objective asks for remnants, not a kill count',
    /Snowman Remnants/i.test(detail) && !/Defeat \d/i.test(detail), detail.slice(0, 400));
  rec.ok("the quest giver's portrait is shown in the dialogue block",
    await P.page.evaluate(() => !!document.querySelector('img[src*="mayor-bro-head"]')));
  rec.ok('the detail page shows the quest giver speaking',
    /Mayor Bro/.test(detail), detail.slice(0, 400));

  /* ═══ v2.3.1704: THE REWARD BLOCK NAMES ITS OWN QUEST ═══
     Owner: "The quest UI is a little confusing what's rewards for the next
     quests vs what's rewarded for the current quest."
     This page is reached by tapping a row in a list of quests and its reward
     block was headed with the bare word "Rewards" over two numbers, so nothing
     on screen tied the figures to the quest they belonged to, nor said WHEN
     they are paid — and a quest has two payout moments (the kit handed over on
     accept, and the payout for coming back).  Asserting the quest TITLE
     appears in the heading is what stops it drifting back to a bare label. */
  rec.ok('the reward block says which quest the figures belong to',
    /For finishing “Cold Reception”/.test(detail), detail.slice(0, 600));
  rec.ok('...and who pays them, and when',
    /Paid by Mayor Bro when you hand this quest in/.test(detail), detail.slice(0, 600));

  /* ── accept reaches the SERVER, not just the client ── */
  const acceptTapped = await H.clickText(P, 'Accept from Mayor Bro').then(() => true).catch(() => false);
  rec.ok('the Accept button exists and is tappable', acceptTapped);
  await P.page.waitForTimeout(1200);

  const admin = await H.adminPlayer(wsPort, myId);
  const quests = (admin && admin.rpg && admin.rpg._quests) || {};
  rec.ok('the server marked the quest active (the reachability bug is gone)',
    quests.tut_1 === 'active', quests);

  /* ── the reward gate belongs to the server ── */
  const coinsBefore = (admin && admin.rpg && admin.rpg.coins) || 0;
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(1200);
  const after = await H.adminPlayer(wsPort, myId);
  const q2 = (after && after.rpg && after.rpg._quests) || {};
  rec.ok('turning in with an unmet objective is refused server-side',
    q2.tut_1 === 'active', q2);
  /* A DELTA, not an absolute — a new character already starts with coins,
     so "coins < reward" would pass for the wrong reason. */
  rec.ok('the refused turn-in paid no gold',
    ((after.rpg && after.rpg.coins) || 0) === coinsBefore,
    { before: coinsBefore, after: after.rpg && after.rpg.coins });

  /* ═══ v2.3.1704: THE PANE SHOWS THE HAND-IN, IT DOES NOT PERFORM IT ═══
     Owner: "Disable turning in quest rewards (completion) through the quest
     pane.  It's getting messed up."
     The pane had a `Turn in — claim your reward` button and an XP-skill
     picker beside the "return to Mayor Bro" banner: two contradictory
     instructions, and the button was the one the owner wants gone.  The
     dialogue at the giver is the only door now (mp-questui walks it end to
     end).
     Both halves are pinned, because either alone is a bad test: that the
     CONTROL is gone, and that the pane still says a hand-in is waiting and
     names the person to see.  A pane that just dropped the button would be a
     quest with no visible way to finish. */
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(2200);
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  await H.clickText(P, 'Active').catch(() => {});
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Cold Reception').catch(() => {});
  await P.page.waitForTimeout(700);

  const readyPane = await H.bodyText(P);
  const paneButtons = await H.buttonTexts(P);
  rec.ok('the pane still says the quest is ready to hand in',
    /Ready to hand in/i.test(readyPane), readyPane.slice(0, 500));
  rec.ok('...and names the person to go and see',
    /go and see Mayor Bro/i.test(readyPane), readyPane.slice(0, 500));
  rec.ok('...and says he is the one who pays',
    /He pays the reward there/i.test(readyPane), readyPane.slice(0, 600));
  /* The button list is the honest witness: bodyText would still match a
     button rendered but disabled, and "disabled" is not what was asked for. */
  rec.ok('the pane offers NO turn-in button any more',
    !paneButtons.some((t) => /turn in/i.test(t)), paneButtons);
  rec.ok('...and no XP-skill picker either (it belongs to the dialogue now)',
    !/Train 40 XP into/.test(readyPane)
    && !paneButtons.some((t) => /Choose a skill to train/i.test(t)),
    { paneButtons, pane: readyPane.slice(0, 500) });
  /* The quest must be untouched by all of that — a pane that quietly turned
     it in anyway would pass every assertion above. */
  const stillActive = await H.adminPlayer(wsPort, myId);
  rec.ok('and the quest is still ACTIVE — the pane settled nothing',
    ((stillActive.rpg && stillActive.rpg._quests) || {}).tut_1 === 'active',
    stillActive.rpg && stillActive.rpg._quests);

  await P.ctx.close().catch(() => {});
}
