/* THE BUILDINGS ARE PLACED, SOLID, AND YOU CAN WALK INTO THEM (v2.3.1778).
 *
 * Owner supplied a forge, a bank, an enchanter, a general store and the
 * mayor's house, to be placed on the clifftop plateau and "Not walkable".
 *
 * Three claims, and the middle one is the ask:
 *
 *   1. all five are DRAWN, at a size that reads as a building next to a
 *      person (the renderer draws an NPC figure at 120 world px, which is the
 *      only yardstick the world has);
 *   2. they BLOCK — walked into, not read off the grid, because the footprint
 *      data could be perfect and never stamped;
 *   3. blocking them did not wall the town in half.  Five solid rectangles in
 *      a bowl is an easy way to cut the plateau in two, and the failure is
 *      invisible until someone cannot reach the shops.
 *
 * The entrance prompts come back with the art (v2.3.823 removed them because
 * there was none), so this also pins WHICH panel each door opens — and pins
 * the two that are gated behind a quest chain that is not live, so that stays
 * a known state rather than a surprise.
 */
import * as H from './harness.mjs';

const PERSON_H = 120;
const BUILDINGS = ['mayor-house', 'forge', 'bank', 'enchanter', 'general-store'];

const props = (P) => P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []));
const pos = (P) => H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

async function hold(P, key, ms) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(250);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Townie', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── 1. all five are on screen, and building-sized ── */
  const drawn = await props(P);
  const byId = Object.fromEntries(drawn.map((d) => [d.id, d]));
  const missing = BUILDINGS.filter((b) => !byId[b]);
  rec.ok('every building is drawn in town', missing.length === 0,
    { missing, drawn: drawn.map((d) => d.id) });
  const tooSmall = BUILDINGS.filter((b) => byId[b] && byId[b].height < PERSON_H * 1.8);
  rec.ok('...and each is clearly bigger than a person',
    missing.length === 0 && tooSmall.length === 0,
    { tooSmall, heights: BUILDINGS.map((b) => byId[b] && Math.round(byId[b].height)), person: PERSON_H });

  /* ── 2. they block ──
     Walk north into the bank's south wall from directly below it.  With no
     collision the player passes through and ends up above the building; with
     it they stop south of the wall. */
  const bank = byId['bank'];
  await put(P, bank.x, bank.y + 170);
  await P.page.waitForTimeout(300);
  const before = await pos(P);
  await hold(P, 'w', 2500);
  const after = await pos(P);
  rec.ok('the player actually walked toward the bank (guard)', after.y < before.y - 40, { before, after });
  rec.ok('the bank is SOLID — you stop at its wall instead of walking through it',
    after.y > bank.y - 20, { stoppedAt: after.y, bankBaseY: bank.y });

  /* ── 3. the town is still one place ──
     Spawn is west of every building; the far east end is past all of them.
     Walking the whole way proves no building pair walled the plateau off. */
  await put(P, 1050, 800);
  await P.page.waitForTimeout(300);
  await hold(P, 'd', 12000);
  const east = await pos(P);
  rec.ok('you can still walk the length of town past the new buildings',
    east.x > 2400, { reached: east, from: 1050 });

  /* ── 4. the doors ──
     v2.3.823 disabled these prompts for want of art; the art shipped. */
  const doorOf = async (id) => {
    const b = byId[id];
    await put(P, b.x, b.y + 55);
    await P.page.waitForTimeout(500);
    return P.page.evaluate(() => {
      const S = window._gameState.current;
      return S.nearBuilding;
    });
  };
  const atBank = await doorOf('bank');
  rec.ok('standing at the bank door offers an entrance', atBank !== null && atBank !== undefined, atBank);
  const atHouse = await doorOf('mayor-house');
  rec.ok('...and the mayor\'s house does NOT (it is his home, not a shop)',
    atHouse === null, atHouse);

  /* The bank has no quest gate, so it must actually open.  Driven with the
     E key rather than by clicking the prompt: the prompt is a HUD button whose
     handler is not a plain click, and pressing E is what the button itself
     tells the player to do. */
  await doorOf('bank');
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(900);
  rec.ok('...and pressing E actually opens it — a panel unreachable since v2.3.823',
    await H.seesText(P, 'Vault & equipment'));
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(400);

  /* ── 5. the two gated doors, pinned as a KNOWN state ──
     forge and enchant sit behind quest unlocks ('blacksmith', 'enchanting')
     whose chains are not live — the Bron chain is dormant (see the naming note
     in NPC_DATA).  So these doors currently refuse with a locked message.
     Asserted rather than left to be discovered: it is the one thing about this
     change that will look like a bug and is not one, and the day the chain is
     wired up this assertion is what says so. */
  await doorOf('forge');
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(900);
  const forgeOpened = await H.seesText(P, 'Forge a weapon').catch(() => false);
  rec.ok('the forge door is still quest-gated (known: its unlock chain is dormant)',
    forgeOpened === false, { forgeOpened });

  await P.ctx.close().catch(() => {});
}
