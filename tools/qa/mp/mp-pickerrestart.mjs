/* THE PICKER'S RESTART STARTS THE BRO CLEAN ON THIS DEVICE TOO (v2.3.3104).
 *
 * Found by the review of the fresh start (docs/specs/fresh-start.md): the
 * character picker's "Restart at level 1" wipes the record on the worker, but
 * for the bro this device plays it left the device's own copy (bt_rpg and the
 * rest) in place.  Picking the same row next joined with it:
 *   - before v2.3.3104 the worker took that join back as the character, so
 *     the restart silently did nothing;
 *   - since v2.3.3104 the worker takes nothing from a first join, so the old
 *     shield, stats and spare gear stayed on screen, and the next join folded
 *     the spare gear back into the record (the gear stashes merge every join).
 *
 * mp-roster stops short of a restart on purpose (its rows are invented keys).
 * This one plays a real bro, gives its copy on this device the things a
 * played character's copy holds (a purse, a worn shield, a spare in the
 * stash), restarts it from the picker, and checks that none of it comes back:
 * not in the browser, not on screen, and not on the worker after a rejoin.
 */
import * as H from './harness.mjs';

const OLD = {
  coins: 1500,
  shield: { name: 'Old Oak Shield', gearBase: 'wood', tierMult: 1 },
  spare: { name: 'Old Spare Plate', mat: 'iron', tierMult: 2 },
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Resa', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  const me = await P.page.evaluate(() => ({
    id: window._gameState.current.myId,
    key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
  }));
  rec.ok('a real bro on a bp_ key (guard)', !!me.key && /^bp_/.test(me.id), me);

  /* Log out the way a player does (both flags, v2.3.1840), then make this
     device's copy look like a played character's. */
  await P.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(2000);
  const seeded = await P.page.evaluate((old) => {
    let r = null;
    try { r = JSON.parse(localStorage.getItem('bt_rpg')); } catch (e) { r = null; }
    if (!r) return false;
    r.coins = old.coins;
    r.shield = old.shield;
    r.armorStash = [old.spare];
    localStorage.setItem('bt_rpg', JSON.stringify(r));
    localStorage.setItem('bt_stats', JSON.stringify({ kills: 999 }));
    return true;
  }, OLD);
  rec.ok('this device holds the old character\'s copy (guard)', seeded, {});

  /* ── the restart, from the picker, on the bro this device plays ── */
  rec.ok('Continue opens the character list', await H.openPicker(P.page), {});
  const row = '[data-tut="char-row"][data-char-active="1"]';
  await P.page.waitForSelector(row, { timeout: 10000 });
  const menuBtn = await P.page.$(`${row} ~ [data-tut="char-menu"]`);
  rec.ok('the active bro\'s row has its ... menu (guard)', !!menuBtn, {});
  if (!menuBtn) { await P.ctx.close().catch(() => {}); return; }
  await menuBtn.click();
  await P.page.waitForTimeout(400);
  await P.page.click('[data-tut="char-menu-restart"]');
  await P.page.waitForTimeout(400);
  await P.page.fill('[data-tut="char-confirm-input"]', 'yes');
  const reloaded = P.page.waitForNavigation({ timeout: 15000 }).then(() => true).catch(() => false);
  await P.page.click('[data-tut="char-confirm-go"]');
  const didReload = await reloaded;
  await P.page.waitForTimeout(2000);
  rec.ok('the restart reloads the page, as the in-game restart does', didReload, {});

  const left = await P.page.evaluate(() => ({
    rpg: (() => { try { return localStorage.getItem('bt_rpg'); } catch (e) { return 'unreadable'; } })(),
    stats: (() => { try { return localStorage.getItem('bt_stats'); } catch (e) { return 'unreadable'; } })(),
    key: (() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } })(),
  }));
  rec.ok('...and this device no longer holds the old character', left.rpg === null && left.stats === null,
    { rpg: left.rpg && left.rpg.slice(0, 120), stats: left.stats });
  rec.ok('...but keeps its Login Key: the restart is the character\'s, not the account\'s', left.key === me.key, left);
  const wiped = await H.adminPlayer(wsPort, me.id);
  rec.ok('the worker wiped the record (guard)', !wiped.rpg, wiped.rpg && { coins: wiped.rpg.coins });

  /* ── play the same bro again ── */
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  const back = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { id: S.myId, coins: S.rpg.coins, shield: S.rpg.shield ? S.rpg.shield.name : null,
      spares: (S.rpg.armorStash || []).map((p) => p && p.name) };
  });
  console.log('    back in', JSON.stringify(back));
  rec.ok('the same bro comes back (guard)', back.id === me.id, back);
  rec.ok('...with a new character\'s purse, not the old 1,500', back.coins < OLD.coins, back);
  rec.ok('...no old shield on the arm', back.shield === null, back);
  rec.ok('...and no old spare in the stash', !back.spares.includes(OLD.spare.name), back);

  /* ── and a rejoin folds nothing back in ── */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const rec2 = (await H.adminPlayer(wsPort, me.id)).rpg || {};
  const stash = (rec2.armorStash || []).map((p) => p && p.name);
  rec.ok('a rejoin folds no old spare back into the record', !stash.includes(OLD.spare.name), stash);
  rec.ok('...and the record keeps a new character\'s purse', (rec2.coins || 0) < OLD.coins, rec2.coins);

  await P.ctx.close().catch(() => {});
}
