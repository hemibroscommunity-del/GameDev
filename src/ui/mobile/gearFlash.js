/* ═══ v2.3.3049: THE FIRST QUEST'S GEAR FLASHES UNTIL IT IS ON ═══
 *
 * Owner, 2026-10-05: "After accepting first quest make 'OPEN' on dashboard
 * flash.  Then make sword and shield both flash."  And: "After receiving staff
 * and bow from first quest make 'OPEN' on dashboard flash (if not already
 * open) and make both weapons flash."
 *
 * Mayor Bro's first quest (tut_1) hands over a sword and a shield when you
 * accept it, and a bow and a staff when you hand it in -- into the BAG, not
 * your hands.  The coach (QuestCoach.jsx) already says so in words, but one
 * card at a time, twenty seconds apart (onboardingPace), ringing only the
 * first tile it finds.  These are not cards: they are the controls
 * themselves lighting up, the moment the gear arrives, until it is worn --
 *
 *   folded dashboard   -> the OPEN chip flashes (and the landscape arrow);
 *   open, bag on show  -> the very tiles flash: the sword AND the shield, then
 *                         the bow AND the staff;
 *   open, another tab  -> the rail's Dashboard button flashes, the way back
 *                         to the bag.
 *
 * WHICH TILES: a piece flashes while its SLOT is empty and the bag holds one
 * for it (no melee weapon worn and a sword in the bag; no shield and a shield
 * in the bag; the bow and the staff once tut_1 is handed in) -- so equipping
 * one stops its flash, and a spare kept beside a worn weapon never flashes.
 * WHEN: only through the first quest and the one after it (tut_1 accepted,
 * until tut_2 is handed in) -- it is the first quest's lesson, not a nag for
 * the rest of the game.
 *
 * HOW: a data-flash attribute on the live DOM node (game.css draws the glow),
 * set and cleared on a light timer -- the bag re-renders every tile on its own
 * schedule, and an attribute it never set is never in its way.  A glow, box-
 * shadow only: no filter (the iOS grain rule), and no transform -- a control
 * that never stops moving is never "stable" to an automated tap.  Not a pop-up,
 * so the onboarding referee's 20 s gap and "Skip tutorial" do not hold it
 * back: it is the game answering what you just did, as QUEST ACCEPTED! is.
 */

const MELEE = { sword: 1, greatsword: 1 };

/** Which pieces want the player's eye right now: { melee, shield, bow,
 *  staff } -- pure, node-testable. */
export function gearFlashWants(rpg) {
  const none = { melee: false, shield: false, bow: false, staff: false };
  if (!rpg || typeof rpg !== 'object') return none;
  const q = rpg._quests || {};
  const t1 = q.tut_1, t2 = q.tut_2;
  const accepted = t1 === 'active' || t1 === 'turnedIn';
  if (!accepted || t2 === 'turnedIn') return none;
  const stash = Array.isArray(rpg.weaponStash) ? rpg.weaponStash : [];
  const has = (pred) => stash.some((w) => w && pred(String(w.type || '')));
  const shields = Array.isArray(rpg.shieldStash) ? rpg.shieldStash : [];
  const handedIn = t1 === 'turnedIn';
  return {
    melee: !rpg.weapon && has((t) => !!MELEE[t]),
    shield: !rpg.shield && shields.length > 0,
    bow: handedIn && !rpg.rangedWeapon && has((t) => t === 'bow'),
    staff: handedIn && !rpg.staffWeapon && has((t) => t === 'staff'),
  };
}

/** The CSS selectors to light for those wants, given whether the dashboard is
 *  folded and whether any wanted tile is on screen. */
export function gearFlashSelectors(w, folded, tileOnScreen) {
  const tiles = [];
  if (w.melee) tiles.push('[data-gear="sword"]', '[data-gear="greatsword"]');
  if (w.shield) tiles.push('[data-gear="shield"]');
  if (w.bow) tiles.push('[data-gear="bow"]');
  if (w.staff) tiles.push('[data-gear="staff"]');
  if (!tiles.length) return [];
  if (folded) return ['[data-dash-fold="min"]', '[data-land-fold="min"]'];
  if (!tileOnScreen) return ['[data-nav="dashboard"]'];
  return tiles;
}

let _timer = null;
let _lit = [];
/** Start the watcher (BottomDashboard mounts it once).  `getS` returns the
 *  game state; nothing happens before the world is on screen. */
export function startGearFlash(getS) {
  if (_timer || typeof document === 'undefined') return stopGearFlash;
  const tick = () => {
    let want = [];
    try {
      const S = getS && getS();
      if (S && S.__introLiftedAt && S.rpg) {
        const w = gearFlashWants(S.rpg);
        /* ON SCREEN, not merely in the page: the band keeps the other
           orientation's fold chip mounted and hidden (upright, the sideways
           chip reads "min" whenever no sheet is open), so "is there a min
           chip" was true with the band wide open, and OPEN kept the flash
           the sword and the shield should have had */
        const shown = (sel) => Array.from(document.querySelectorAll(sel)).some((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const folded = shown('[data-dash-fold="min"], [data-land-fold="min"]');
        const tileSel = gearFlashSelectors(w, false, true);
        const tileOnScreen = tileSel.length > 0 && tileSel.some(shown);
        want = gearFlashSelectors(w, folded, tileOnScreen);
      }
    } catch (e) { want = []; }
    const now = [];
    for (const sel of want) {
      try { document.querySelectorAll(sel).forEach((el) => now.push(el)); } catch (e) { /* a bad selector lights nothing */ }
    }
    for (const el of _lit) if (now.indexOf(el) < 0 && el.getAttribute('data-flash') === '1') el.removeAttribute('data-flash');
    for (const el of now) if (el.getAttribute('data-flash') !== '1') el.setAttribute('data-flash', '1');
    _lit = now;
    try {
      if (typeof window !== 'undefined' && window.__btProbe) {
        window.__btGearFlash = { want, lit: now.map((el) => el.getAttribute('data-gear') || el.getAttribute('data-dash-fold') || el.getAttribute('data-land-fold') || el.getAttribute('data-nav') || '?') };
      }
    } catch (e) { /* probe only */ }
  };
  _timer = setInterval(tick, 300);
  tick();
  return stopGearFlash;
}
export function stopGearFlash() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  for (const el of _lit) { try { el.removeAttribute('data-flash'); } catch (e) { /* gone */ } }
  _lit = [];
}
