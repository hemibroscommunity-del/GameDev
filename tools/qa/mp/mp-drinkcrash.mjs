/* DRINKING A POTION MUST NOT TAKE THE GAME WITH IT (v2.3.2151).
 *
 * Owner: "Drinking potions crashes the game immediately."
 *
 * mp-potions already drives the real Drink button and already proves the
 * bottle is spent -- and it passes. That is exactly why it could not catch
 * this: it asserts the SEND landed, and a client that sends the message and
 * then tears its own React tree down satisfies every one of its assertions.
 * So this scenario asserts the thing mp-potions never looks at -- that the
 * app is STILL THERE afterwards: no uncaught page error, the dashboard and
 * the canvas still mounted, and the player still able to move.
 *
 * Order matters here. The liveness checks come AFTER the drink and are
 * compared against a reading taken BEFORE it, so a screen that was already
 * broken for some unrelated reason fails the control instead of being
 * reported as this bug. */
import * as H from './harness.mjs';

const alive = (P) => P.page.evaluate(() => ({
  /* The nav rail is the outermost thing the game's React tree renders that
     is always present in play -- if the tree unmounted, this is gone. */
  rail: !!document.querySelector('.bt-navrail'),
  canvas: !!document.querySelector('canvas'),
  /* A crashed tree leaves the mount point empty rather than absent. */
  rootKids: (document.getElementById('root') || { childElementCount: -1 }).childElementCount,
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gulper', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  const id = await H.readState(P, (S) => S.myId);

  const before = await alive(P);
  rec.ok('the control: the game is up before any drink',
    before.rail && before.canvas && before.rootKids > 0, before);

  /* EVERY drinkable, not just the one mp-potions buys. The five effects are
     five different code paths on both sides -- a heal, a stamina refill, a
     damage buff, a mana surge, a speed buff -- and "potions crash" names the
     whole shelf, so testing one of them is testing a fifth of the report. */
  const BOTTLES = ['swiftDraught', 'manaShard', 'whetstone', 'staminaSalts', 'cookedMinnow'];
  for (const key of BOTTLES) {
    await H.grant(wsPort, id, 'item', { invKey: key, count: 2 });
  }
  await P.page.waitForTimeout(1400);

  const held = (k) => P.page.evaluate((key) => {
    const S = window._gameState && window._gameState.current;
    return ((S && S.rpg && S.rpg.inventory) || {})[key] || 0;
  }, k);

  /* THE POTIONS CHIP IS ON, and that is not decoration. v2.3.2145 is what
     put these five under it, so the owner's route to a bottle now goes
     through this filter -- and draining the last one empties a FILTERED
     list, which is a different render branch from emptying the bag. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
  await P.page.waitForTimeout(700);
  /* pointerUP, not click: the chip is a role="button" div wired to
     onPointerUp, and .click() on a div does nothing while looking like it
     worked (the same trap the Drink lookup avoids by asking for a <button>). */
  const chip = await P.page.$('[aria-label="Potion"][role="button"]');
  if (chip) { await chip.dispatchEvent('pointerup'); await P.page.waitForTimeout(500); }
  rec.ok('the Potions chip actually selected the potion filter',
    await P.page.evaluate(() => {
      const c = document.querySelector('[aria-label="Potion"][role="button"]');
      return !!c && c.getAttribute('aria-pressed') === 'true';
    }), null);
  rec.ok('the Potions chip is reachable in the bag', !!chip, null);

  for (const key of BOTTLES) {
    rec.ok(`${key} is in the bag to drink`, (await held(key)) >= 1, { key, n: await held(key) });

    await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
    await P.page.waitForTimeout(800);
    const tile = await P.page.$(`[data-inv-key="${key}"]`);
    rec.ok(`${key} has a tile in the bag`, !!tile, { key });
    if (!tile) continue;

    await tile.dispatchEvent('pointerup');
    await P.page.waitForTimeout(800);
    const btn = await P.page.$('button:has-text("Drink")');
    rec.ok(`${key}'s popup offers Drink`, !!btn, { key });

    const errsBefore = P.logs.filter((l) => l.startsWith('pageerror')).length;
    if (btn) { await btn.click(); await P.page.waitForTimeout(1600); }

    const after = await alive(P);
    rec.ok(`the game is still mounted after drinking ${key}`,
      after.rail && after.canvas && after.rootKids > 0, { key, before, after });

    /* SECOND sip: the stack was 2, so this is the one that takes the key
       out of the inventory entirely -- and out of a list the Potions chip is
       filtering, which is the branch a single sip never reaches. */
    const btn2 = await P.page.$('button:has-text("Drink")');
    if (btn2) { await btn2.click(); await P.page.waitForTimeout(1400); }
    const drained = await alive(P);
    rec.ok(`the game survives draining the last ${key}`,
      drained.rail && drained.canvas && drained.rootKids > 0, { key, drained, left: await held(key) });

    const errs = P.logs.filter((l) => l.startsWith('pageerror')).slice(errsBefore);
    rec.ok(`drinking ${key} threw nothing uncaught`, errs.length === 0, errs.slice(0, 3));

    /* Both layers down, or the next tile tap lands on this popup instead
       (the v2.3.2127 lesson: `open(null)` is not a close). */
    await P.page.evaluate(() => {
      try { window._itemDetailBus.close(); } catch (e) {}
      try { window.__broDashPanelBus.clear(); } catch (e) {}
    });
    await P.page.waitForTimeout(500);
  }

  /* A React tree can survive while the GAME does not -- the loop is a
     separate thing. Moving is the cheapest proof it is still running. */
  const y0 = await H.readState(P, (S) => S.player.y);
  await P.page.keyboard.down('w');
  await P.page.waitForTimeout(700);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(300);
  const y1 = await H.readState(P, (S) => S.player.y);
  rec.ok('the world loop is still running after all five (he can walk)',
    Math.abs(y1 - y0) > 8, { y0, y1 });
}
