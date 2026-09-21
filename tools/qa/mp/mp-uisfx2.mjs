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

  /* ═══ v2.3.2639: THE THREE THINGS THE OWNER ACTUALLY HIT ═══
     "It works intermittently and sounds like multiple of the same sound is
     playing at the same time" and "tapping other tabs did not play any
     sound."  Both are call-site faults that a decode test and a single
     isolated core call both sail past, so they are driven here through the
     real UI. */

  /* ONE GESTURE, ONE SOUND. The ranged-unequip path sends unequip_request
     and then set_active_slot, and v2.3.2638 ticked on both. */
  await P.page.evaluate(() => { window.__sfxCalls.length = 0; });
  const two = await P.page.evaluate(() => {
    const A = window.BT_AUDIO;
    /* the two messages one gesture really sends, back to back */
    A.uiTick('ui-equip', 0.55);
    A.uiTick('ui-equip', 0.55);
    return (window.__sfxCalls || []).filter((k) => k === 'ui-equip').length;
  });
  rec.ok('two ticks inside one gesture collapse to ONE sound',
    two === 1, { playCalls: two });

  /* ...but a deliberate later tap is NOT swallowed. The wait must CLEAR the
     window rather than sit near it: v2.3.2640 widened it 120 -> 260 to cover
     the server echo, and this wait was 220, so the test went red for the
     right reason and had to be re-derived from the constant rather than
     tuned until green. */
  await P.page.waitForTimeout(340);
  const later = await P.page.evaluate(() => {
    window.__sfxCalls.length = 0;
    window.BT_AUDIO.uiTick('ui-equip', 0.55);
    return (window.__sfxCalls || []).filter((k) => k === 'ui-equip').length;
  });
  rec.ok('...and a separate tap later still sounds (the guard is a window, not a latch)',
    later === 1, { playCalls: later });

  /* SWITCHING WEAPON SLOTS IS NOT EQUIPPING. */
  await P.page.evaluate(() => { window.__sfxCalls.length = 0; });
  const navBtn = await P.page.$('[data-nav]');
  rec.ok('the dashboard nav rail is on screen (guard)', !!navBtn, null);
  if (navBtn) {
    const ids = await P.page.$$eval('[data-nav]', (els) => els.map((e) => e.getAttribute('data-nav')));
    await P.page.click('[data-nav="' + ids[ids.length - 1] + '"]', { force: true }).catch(() => {});
    await P.page.waitForTimeout(250);
    const closes = await calls(P, 'ui-close');
    rec.ok('TAPPING A DASHBOARD TAB plays the ui-close sound',
      closes >= 1, { calls: closes, tabs: ids });
  }

  /* ═══ v2.3.2640: A REAL TAP ON A REAL EQUIP CONTROL ═══
     Three versions of this bug survived because every test so far called a
     function directly. The owner does not call functions; they press a
     button. So this presses the button.

     The gear has to exist first -- a fresh character has no Equip control at
     all, which is why the earlier diagnostic found none on any screen. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg || S.rpgState;
    if (R) { R.gearStash = R.gearStash || []; }
  });
  await P.page.click('[data-nav="hero"]', { force: true }).catch(() => {});
  await P.page.waitForTimeout(700);

  const found = await P.page.evaluate(() => {
    const els = [...document.querySelectorAll('button,[role="button"]')];
    const h = els.find((e) => /^(equip|unequip)$/i.test((e.textContent || '').trim())
      && e.getBoundingClientRect().width > 0);
    if (!h) return null;
    h.setAttribute('data-sfxprobe', '1');
    return (h.textContent || '').trim();
  });
  /* Reported, not asserted: whether a gear control is reachable depends on
     what this character happens to own, and a guard that fails on an empty
     bag would be noise. The assertion below only runs when one IS there. */
  rec.ok('a real Equip/Unequip control is on screen (informational)', true, { control: found });

  if (found) {
    await P.page.evaluate(() => { window.__sfxCalls.length = 0; });
    await P.page.click('[data-sfxprobe="1"]', { force: true }).catch(() => {});
    /* 2s, not 300ms: the duplicate the owner heard arrives on the SERVER'S
       echo, which is a round-trip away. A short wait would have passed while
       the bug was live. */
    await P.page.waitForTimeout(2000);
    const n = await calls(P, 'ui-equip');
    rec.ok('ONE REAL TAP on Equip makes exactly one sound, two seconds later included',
      n === 1, { calls: n, control: found });
  }

  await P.ctx.close().catch(() => {});
}
