/* ═══ v2.3.2638: THE EQUIP SOUND ACTUALLY FIRES ═══
   Owner: "When I equipped and unequipped it didn't make a sound."

   v2.3.2637 shipped an mp-uisfx that proved the three FILES decode -- and
   that is exactly why this bug got through. A file that decodes is not a
   sound that plays: the call sites were wrong, and nothing tested the call
   sites. So this one ignores the files entirely and asks the only question
   that was ever in doubt: when the player equips something, does the game
   ASK for the sound?

   BT_AUDIO.play is wrapped with a counter, a real equip is driven through
   the real UI, and the count is read back. It also checks the count is
   exactly ONE -- a gesture that ticks twice is its own bug, and wiring a
   shared core plus one of its callers is the obvious way to cause it. */
import * as H from './harness.mjs';

const arm = (P) => P.page.evaluate(() => {
  const A = window.BT_AUDIO;
  window.__sfxCalls = [];
  if (!A.__origPlay) A.__origPlay = A.play.bind(A);
  A.play = function (key, opts) { window.__sfxCalls.push(key); return A.__origPlay(key, opts); };
  return true;
});
const calls = (P, key) => P.page.evaluate((k) =>
  (window.__sfxCalls || []).filter((x) => x === k).length, key);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ear', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await arm(P);

  rec.ok('the play() counter is armed (guard)',
    await P.page.evaluate(() => Array.isArray(window.__sfxCalls)), null);

  /* Drive the REAL function the Equipped pane's button calls -- it is on
     the autotest surface (v2.3.2123) precisely so a scenario tests the game's
     copy of the rule rather than its own. Give the player a weapon to take
     off first, or the core returns before it does anything. */
  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg || S.rpgState;
    if (!R) return { err: 'no rpg state' };
    R.weaponStash = R.weaponStash || [];
    if (!R.weapon) R.weapon = { name: 'Test Blade', type: 'sword', tier: 1, dmg: 5 };
    return { weapon: !!R.weapon, stash: R.weaponStash.length };
  });
  rec.ok('the player has a weapon on to take off (guard)', !!setup && !setup.err, setup);

  const ran = await P.page.evaluate(() => {
    const f = window._gameFns && window._gameFns.unequipWeaponSlot;
    if (typeof f !== 'function') return { err: 'unequipWeaponSlot not on the autotest surface' };
    try { f('weapon'); return { called: true }; } catch (e) { return { err: String(e && e.message || e) }; }
  });
  rec.ok('the real unequip path runs (guard)', !!ran && !ran.err, ran);

  await P.page.waitForTimeout(300);
  const n = await calls(P, 'ui-equip');
  rec.ok('unequipping through the shared core ASKS for the ui-equip sound',
    n >= 1, { calls: n });
  rec.ok('...exactly once for one gesture, not twice',
    n === 1, { calls: n });

  await P.ctx.close().catch(() => {});
}
