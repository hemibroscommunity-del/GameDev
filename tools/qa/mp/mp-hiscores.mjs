/* The per-skill hiscores board, end to end (v2.3.1671).
 *
 * WHY THIS EXISTS, and why the unit suite could not have caught the bug it
 * guards.  Before v2.3.1671 this panel read `S._leaderboard[cat]` — and
 * NOTHING in the client ever wrote `S._leaderboard`.  The server's ranking was
 * correct, the endpoint returned correct rows, and the screen the player
 * actually opens showed "No leaderboard data yet." forever.  The defect lived
 * entirely in the gap between a working server and a screen that never asked
 * it anything, which is exactly the gap a DOM-level scenario covers.
 *
 * WHAT THIS DELIBERATELY DOES NOT TEST.  Ranking order.  Setting a player's
 * skill levels would need either a long real grind or a new admin mutation
 * route — and adding a privileged "set any player's levels" endpoint to a
 * live game to make a test convenient is a bad trade at any deadline.  So
 * sorting, the drop-zero filter and the derived combat sum are pinned in
 * server/test/hiscores.test.mjs, where they can be tested exhaustively against
 * fabricated rows, and this scenario pins the thing only a browser can see:
 * that the board is reachable, fetches, and renders real server rows.
 *
 * Two fresh players therefore both sit at combat 3 (three level-1 trained
 * skills) with nothing else trained, and the assertions below are chosen to be
 * true and meaningful in exactly that state.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Hiscore', wsPort, webPort });
  const B = await H.newPlayer(browser, { name: 'Rival', wsPort, webPort, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);

  /* The leaderboard report is throttled server-side (v2.3.1620) but FORCED on
     join, so both rows exist by now; the pause is for the write to land, not
     for a timer to elapse. */
  await A.page.waitForTimeout(2000);

  /* The More tile is labelled "Ranks", not "Leaderboard" — the panel title
     and the tile caption differ, which is exactly the sort of thing only a
     real DOM walk catches. */
  await H.openDest(A, 'Ranks');
  await A.page.waitForTimeout(1500);

  const chips = await H.buttonTexts(A);
  rec.ok('the board offers a ranking per combat type',
    ['Melee', 'Bow', 'Magic'].every((c) => chips.includes(c)), chips.slice(0, 24));
  rec.ok('the board offers a ranking for every life skill',
    ['Woodcutting', 'Fishing', 'Mining', 'Farming', 'Cooking', 'Blacksmithing',
      'Woodworking', 'Gem Cutting', 'Enchanting', 'Trapping'].every((c) => chips.includes(c)),
    chips.slice(0, 24));

  /* ══ THE ASSERTION THAT WOULD HAVE FAILED BEFORE THIS CHANGE ══ */
  rec.ok('the panel is no longer permanently empty',
    !(await H.seesText(A, 'No leaderboard data yet.')));

  /* Read the RENDERED ROWS, not document.body.
     H.bodyText is whole-document, and the player's own name is painted on the
     HUD nameplate — so /Hiscore/ over the body passes whether or not the board
     rendered a single row.  That false positive cost a debugging round: three
     assertions "passed" against a board that was returning zero results.
     A row is `#N | name | value`, so match on the rank column. */
  const rows = () => A.page.evaluate(() => [...document.querySelectorAll('div')]
    .filter((d) => {
      const sp = [...d.children].filter((c) => c.tagName === 'SPAN');
      return sp.length === 3 && /^#\d+$/.test((sp[0].textContent || '').trim());
    })
    .map((d) => {
      const sp = [...d.children];
      return { rank: sp[0].textContent.trim(), name: sp[1].textContent.trim(), value: sp[2].textContent.trim() };
    }));

  const got = await H.waitFor(A, () => [...document.querySelectorAll('span')]
    .some((sp) => /^#1$/.test((sp.textContent || '').trim())), (v) => v === true,
  { timeout: 20000, label: 'a ranked row on the combat board' }).then(() => true).catch(() => false);
  rec.ok('a real server row is fetched and rendered', got);

  const combat = await rows();
  rec.ok('both live players appear on the combat board',
    combat.some((r) => r.name === 'Hiscore') && combat.some((r) => r.name === 'Rival'), combat);
  rec.ok('the row shows the ranked value (fresh character = 3 trained levels)',
    combat.length > 0 && combat[0].rank === '#1' && combat[0].value === '3', combat);

  /* Switching category must trigger a NEW fetch.  Nobody has fished, so the
     honest answer is an empty board — and the copy has to distinguish "we
     asked and nobody qualifies" from the old "we never asked", or this panel
     silently regresses to its previous state without any test noticing. */
  await H.clickText(A, 'Fishing').catch(() => {});
  await A.page.waitForTimeout(2000);
  rec.ok('an untrained skill reports nobody trained it, not missing data',
    /Nobody has trained this yet\./.test(await H.bodyText(A)));
  rec.ok('...and lists no one at zero', (await rows()).length === 0, await rows());

  /* Back to a populated board: proves the switch is a real re-fetch in both
     directions, not a one-way latch. */
  await H.clickText(A, 'Combat').catch(() => {});
  await A.page.waitForTimeout(2000);
  rec.ok('switching back re-fetches the populated board', (await rows()).length >= 2, await rows());

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
