/* The tool-gated lifeskill chain — client half (v2.3.1680).
 *
 * Owner: "gate and hide resource extraction for woodcutting, fishing, and
 * mining behind a mayor bro quest where it only becomes visible after giving
 * you the quest and equipment."
 *
 * The gate has two halves, and they are tested in different places on purpose:
 *   - the SERVER refusal (a modified client cannot harvest without the tool)
 *     is pinned in server/test/protocol-v2.test.mjs, where a real wire message
 *     can be sent without a browser;
 *   - the CLIENT half — the node is not tappable, so the world reads as "not
 *     yet" rather than "broken" — needs a live game loop, which is here.
 *
 * The first attempt at this tried to travel to a zone with real nodes by
 * pushing a `move` packet.  That does not run the client's zone-entry path, so
 * no nodes ever arrived and the whole scenario asserted against an empty list.
 * Injecting one node is both more reliable and more direct: what is under test
 * is the gate, not the node-sync pipeline.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Digger', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(900);

  const inject = () => P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    const node = {
      id: 'test-tree-1', nodeType: 'tree', tierLvl: 1, alive: true, respawnAt: 0,
      x: S.player.x + 8, y: S.player.y + 8,
    };
    S.gatherNodes = [node];
    S._tapNode = node;          // as if the player had tapped it
    return true;
  });

  const nearNode = () => H.readState(P, (S) => (S._nearNode ? S._nearNode.id : null));

  /* ── no tool ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) { S.rpg.inventory = S.rpg.inventory || {}; delete S.rpg.inventory.woodcutting_axe; }
  });
  rec.ok('a node could be injected to test against', await inject());
  await P.page.waitForTimeout(700);
  rec.ok('a tree is NOT interactable without an axe', (await nearNode()) === null, await nearNode());

  /* ── with the axe the quest hands over ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    S.rpg.inventory = S.rpg.inventory || {};
    S.rpg.inventory.woodcutting_axe = 1;
  });
  await inject();
  await P.page.waitForTimeout(700);
  rec.ok('the same tree IS interactable once the axe is in the bag',
    (await nearNode()) === 'test-tree-1', await nearNode());

  /* Losing the tool re-hides it — the gate reads the bag live rather than
     latching once, which is what lets the pickaxe reveal rocks the moment the
     quest pays out instead of on the next zone entry. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    delete S.rpg.inventory.woodcutting_axe;
  });
  await P.page.waitForTimeout(700);
  rec.ok('and it hides again if the tool leaves the bag (live, not latched)',
    (await nearNode()) === null, await nearNode());

  await P.ctx.close().catch(() => {});
}
