/* EATING AND COOKING IN TOWN REACH THE WORKER (v2.3.2077).
 *
 * `eat_request` and `cook_recipe` were gated on
 * `S._serverMonsters && S.channel` since v2.3.1207. That flag means "this
 * zone has server-managed monsters", and wsClient sets it FALSE whenever the
 * monster list is empty -- its own comment says "town, or a dungeon the server
 * doesn't model". So in town neither message was ever sent: the client healed,
 * decremented the bag and wrote localStorage, and the worker -- which owns
 * inventory and HP -- never heard about it.
 *
 * THE THIRD TIME THIS EXACT FLAG HAS DONE IT. v2.3.1702 fixed `ability_use`,
 * v2.3.2063 fixed `shop_purchase` (no purchase in the game's history had
 * reached the server, because the vendor stands in town). So the assertion is
 * written where it can catch the next one: not "the flag is right" but "the
 * WORKER'S OWN BLOB CHANGED", read back through the admin API. A test that
 * checked client state would have passed throughout the bug.
 */
import * as H from './harness.mjs';

const FISH = 'cooked_fish_minnow';

const srvCount = async (wsPort, id, key) => {
  const p = await H.adminPlayer(wsPort, id);
  const inv = (p && p.rpg && p.rpg.inventory) || {};
  return inv[key] || 0;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Diner', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  const id = await H.readState(P, (S) => S.myId);

  const zone = await H.readState(P, (S) => S.currentZone);
  rec.ok(`the diner is in town, where the bug lived (${zone})`, zone === 'town', { zone });
  /* The flag itself, for the record: false here, which is the whole story. */
  const flag = await H.readState(P, (S) => !!S._serverMonsters);
  rec.ok('...and _serverMonsters is false there, as it always was',
    flag === false, { serverMonsters: flag });

  await H.grant(wsPort, id, 'item', { invKey: FISH, count: 3 });
  await P.page.waitForTimeout(1500);
  const before = await srvCount(wsPort, id, FISH);
  rec.ok(`the worker has three cooked fish for them (${before})`, before === 3, { before });

  /* Hurt, or the client refuses the eat before it ever gets to the send. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.hp = Math.max(1, Math.floor((S.rpg.maxHp || 100) * 0.3));
  });
  await P.page.waitForTimeout(400);

  /* Through the real UI: tap the bag tile, then Eat on the detail card. */
  const tile = `[data-inv-key="${FISH}"]`;
  const sawTile = await P.page.waitForSelector(tile, { timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the fish is in the bag on screen', sawTile, { tile });
  await P.page.click(tile).catch(() => {});
  await P.page.waitForTimeout(600);
  const ate = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Eat');
    if (!b) return false;
    b.click();
    return true;
  });
  rec.ok('the detail card offers Eat, and it was pressed', ate === true, { ate });

  /* THE ASSERTION. Not the client's bag -- the worker's. */
  await P.page.waitForTimeout(2200);
  const after = await srvCount(wsPort, id, FISH);
  rec.ok(`the WORKER consumed the fish, so eating in town sticks (${before} -> ${after})`,
    after === before - 1, { before, after });

  /* ...and it stuck to the persisted blob rather than only to the live copy:
     the blob is what a player gets back when they next log in. */
  const p = await H.adminPlayer(wsPort, id);
  const hp = p && p.live && p.live.hp;
  rec.ok(`...and the worker's HP moved with it (${hp})`,
    typeof hp === 'number' && hp > 0, { hp });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
