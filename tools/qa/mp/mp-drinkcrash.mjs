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
 * reported as this bug.
 *
 * ═══ v2.3.2152: AND IT IS NOT A THROW AT ALL ═══
 * Owner, asked what the crash looks like: "More than one type of potion, from
 * bag menu (tap item, drink) ... immediate ejection to a different tab I had
 * open. Full crash no warning."
 *
 * No dialog, no error, dropped onto another open tab is iOS Safari DISCARDING
 * the tab -- the renderer process was killed, which is a memory verdict and
 * not an exception. So the pageerror watch below was looking for the wrong
 * thing, and it stays only as a guard; it is not the test for this report.
 *
 * Measured while chasing it, and recorded here so nobody re-runs it:
 *   - the drink allocates NOTHING on the JS side. Heap, total canvas bytes and
 *     the baked body-sheet cache are flat across all five drinkables.
 *   - the bag's thumbnails are NOT replaced when the inventory changes, so
 *     there is no burst of image decodes behind it (the hypothesis that fit
 *     "from the bag menu, more than one potion" best). Asserted below, because
 *     a future render change could quietly make it true.
 *   - heap readings around the drink swing 22-44MB in BOTH directions run to
 *     run. That is GC, not signal; an earlier reading of it as "a full bag
 *     grows" was wrong.
 * What CANNOT be measured here is the thing most likely left: GPU and image
 * memory. This harness launches with --disable-gpu on a Linux box, so an iOS
 * texture budget is not modelled at all. That is a limit of the harness, not a
 * clean bill of health. */
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
  /* v2.3.2152: a bag the size a real player carries, not five bottles. The
     owner drinks from a full bag, and the grid's cost is per TILE -- a
     five-item bag would have hidden anything that scales with the bag. */
  for (const k of ['fish_minnow', 'fish_trout', 'fish_bass', 'fish_carp',
    'cooked_fish_minnow', 'cooked_fish_trout', 'cooked_fish_bass',
    'wood_oak', 'wood_pine', 'wood_birch', 'wood_willow',
    'shard_meadow', 'shard_ember', 'shard_frost', 'shard_dune',
    'ore_copper', 'ore_iron', 'ore_silver', 'ore_gold',
    'herb_firebloom', 'herb_frostleaf', 'herb_sunroot', 'burnt_dust']) {
    await H.grant(wsPort, id, 'item', { invKey: k, count: 7 });
  }
  await P.page.waitForTimeout(2200);

  const held = (k) => P.page.evaluate((key) => {
    const S = window._gameState && window._gameState.current;
    return ((S && S.rpg && S.rpg.inventory) || {})[key] || 0;
  }, k);

  /* ═══ v2.3.2152: THE FIRST BOTTLE GOES DOWN WITH THE WHOLE BAG ON SCREEN ═══
     The Potions chip used to be selected for the ENTIRE run, and that quietly
     shrank the grid under test to five tiles -- the filler granted above never
     reached the screen at all, so anything that scales with BAG SIZE could not
     have shown up. Found by the control run for the thumbnail probe below,
     which reported 5 tiles where it should have reported ~28.

     So the first bottle drinks under 'All', with the full grid rendered, and
     the chip goes on afterwards for the rest -- which still covers what it was
     added for: draining the last of a stack out of a FILTERED list is a
     different render branch from emptying the bag. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
  await P.page.waitForTimeout(900);
  const tileCount = await P.page.evaluate(() =>
    document.querySelectorAll('[data-inv-key]').length);
  rec.ok(`the whole bag is on screen for the first drink (${tileCount} tiles)`,
    tileCount >= 20, { tileCount });
  await P.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) {} });
  await P.page.waitForTimeout(400);

  let chipOn = false;
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

    /* v2.3.2152: stamp every bag thumbnail, so the drink can be asked whether
       it REPLACED them. Counting images cannot answer that -- the count is
       identical either way -- and a replaced <img> is a fresh decode on the
       device, one per tile, which is the shape of thing that loses an iOS tab.
       The stamp survives a re-render and dies with the node. */
    const before2 = await P.page.evaluate(() => {
      const imgs = [...document.querySelectorAll('[data-inv-key] img')];
      for (const i of imgs) i.__btStamp = 1;
      const cvs = [...document.querySelectorAll('canvas')];
      let px = 0; for (const c of cvs) px += (c.width || 0) * (c.height || 0);
      let sheets = -1;
      try { sheets = window.__btBodySheetKeys ? window.__btBodySheetKeys().length : -1; } catch (e) {}
      return { imgs: imgs.length, canvasPx: px, sheets };
    });

    const errsBefore = P.logs.filter((l) => l.startsWith('pageerror')).length;
    if (btn) { await btn.click(); await P.page.waitForTimeout(1600); }

    const after2 = await P.page.evaluate(() => {
      const imgs = [...document.querySelectorAll('[data-inv-key] img')];
      let kept = 0; for (const i of imgs) if (i.__btStamp) kept++;
      const cvs = [...document.querySelectorAll('canvas')];
      let px = 0; for (const c of cvs) px += (c.width || 0) * (c.height || 0);
      let sheets = -1;
      try { sheets = window.__btBodySheetKeys ? window.__btBodySheetKeys().length : -1; } catch (e) {}
      return { imgs: imgs.length, kept, canvasPx: px, sheets };
    });
    /* The bottle's own tile legitimately goes when the stack empties, so the
       property is "all the OTHERS survived", not "every one did". */
    rec.ok(`drinking ${key} did not re-decode the bag `
         + `(${after2.kept}/${after2.imgs} thumbnails are the same nodes)`,
      after2.kept >= after2.imgs - 1, { before: before2, after: after2 });
    rec.ok(`drinking ${key} allocated no new canvas or baked sheet`,
      after2.canvasPx <= before2.canvasPx
        && after2.sheets <= before2.sheets, { before: before2, after: after2 });

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

    if (!chipOn) {
      /* pointerUP, not click: the chip is a role="button" div wired to
         onPointerUp, and .click() on a div does nothing while looking like it
         worked (the same trap the Drink lookup avoids by asking for a
         <button>). */
      await P.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
      await P.page.waitForTimeout(700);
      const chip = await P.page.$('[aria-label="Potion"][role="button"]');
      if (chip) { await chip.dispatchEvent('pointerup'); await P.page.waitForTimeout(500); }
      chipOn = await P.page.evaluate(() => {
        const c = document.querySelector('[aria-label="Potion"][role="button"]');
        return !!c && c.getAttribute('aria-pressed') === 'true';
      });
      rec.ok('the Potions chip actually selected the potion filter', chipOn, null);
      await P.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) {} });
      await P.page.waitForTimeout(400);
    }
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
