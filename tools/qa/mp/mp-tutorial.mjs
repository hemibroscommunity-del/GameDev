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

  /* Mayor Bro's welcome video is the FIRST thing a new browser sees and it
     sits over the nav rail (MayorGreeting.jsx, once per browser).  It is
     self-limiting for a real player — a SKIP button plus a 9s safety
     dismiss — but a headless tap lands on the <video> instead of the rail,
     so clear it the way a player would. */
  await H.clickText(P, 'SKIP').catch(() => {});
  await P.page.waitForTimeout(600);

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
    /First Blood/.test(questsBody), questsBody.slice(0, 400));

  const opened = await H.clickText(P, 'First Blood').then(() => true).catch(() => false);
  rec.ok('the quest row opens its detail page', opened);
  await P.page.waitForTimeout(500);

  const detail = await H.bodyText(P);
  rec.ok('the detail page states the objective and the zone',
    /Starting Meadow/.test(detail), detail.slice(0, 400));
  rec.ok('the detail page shows the quest giver speaking',
    /Mayor Bro/.test(detail), detail.slice(0, 400));

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

  await P.ctx.close().catch(() => {});
}
