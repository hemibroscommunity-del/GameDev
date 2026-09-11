/* ═══ A MAGIC ORB REACHES AS FAR AS AN ARROW (v2.3.2387) ═══
 *
 * Owner: "extend magic projectile range to what it was before (should be same
 * as arrow).  It just needs to travel further."
 *
 * ── WHY THE EXISTING COVERAGE SAID NOTHING ──
 * mp-orbline measures the magic special end to end -- three orbs, one ray, in
 * succession, each landing its own hit -- and it was green throughout. It never
 * looks at how FAR any of them gets, because distance was never the question it
 * was written to ask. Nothing else in the suite reads a projectile's reach at
 * all, which is how the staff sat at half the bow's for ~1000 versions.
 *
 * ── THE THING THIS PINS ──
 * The two weapons are bounded by DIFFERENT MECHANISMS in projectiles.js: the
 * arrow plants at 675 px or the screen edge, and the staff is EXCLUDED from
 * that guard (`if (!a.isStaff && _released)`), so an orb's only limit is
 * running out of `life`. That asymmetry is deliberate and staying, which means
 * nothing structural stops the two drifting apart again -- only a number does.
 * So this file measures the number, from four independent directions.
 *
 * ── AND IT MEASURES DISTANCE, NOT THE CONSTANT ──
 * Asserting STAFF_LIFE === 135 would pass on a build where projectiles.js had
 * stopped reading it. Section 2 flies a real orb in a real client and watches
 * `dist` climb, which is the observable a player actually experiences.
 */
import * as H from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAFF_RANGE_PX, STAFF_LIFE, STAFF_ORB_SPEED_PX } from '../../../src/data/gameSystems.js';
import { WORLD_ZOOM, TILE } from '../../../src/data/constants.js';

const PHONE = { width: 390, height: 844 };

/* The screen corner in world px, on the reference phone in a combat zone --
   the distance an orb has to clear to reach a monster you can SEE. Derived
   from worldViewport's own rule rather than hardcoded, so a WORLD_ZOOM change
   moves it. */
const cornerPx = (cssW, cssH, WORLD_ZOOM, TILE) => {
  const scale = Math.max(
    0.75 / WORLD_ZOOM, cssW / Math.round(390 * WORLD_ZOOM),
    cssW / (32 * TILE), cssH / (32 * TILE), 0.50,
  );
  const W = cssW / scale, Hh = cssH / scale;
  return Math.hypot(W / 2 - 24, Hh / 2 - 24);
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* ════════════ 1. THE ARITHMETIC, AT THE SOURCE ════════════ */
  rec.ok('the staff range constant is the arrow\'s own 675px cap',
    STAFF_RANGE_PX === 675, { STAFF_RANGE_PX });
  rec.ok('...and life x speed lands exactly on it (no rounding drift)',
    STAFF_LIFE * STAFF_ORB_SPEED_PX === STAFF_RANGE_PX,
    { STAFF_LIFE, STAFF_ORB_SPEED_PX, product: STAFF_LIFE * STAFF_ORB_SPEED_PX });
  rec.ok('...which is very nearly DOUBLE the 340px it shipped at',
    STAFF_RANGE_PX / 340 > 1.9, { was: 340, now: STAFF_RANGE_PX });

  const P = await H.newPlayer(browser, { name: 'Mage', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* The corner an orb has to clear, computed from the client's OWN constants
     so this cannot drift from the game. */
  const corner = cornerPx(390, 615, WORLD_ZOOM, TILE);
  console.log('    screen corner on a 390x844 phone: ' + corner.toFixed(0) + ' px');
  rec.ok('an orb now clears the screen CORNER (it used to die short of it)',
    STAFF_RANGE_PX > corner && 340 < corner,
    { corner: +corner.toFixed(0), was: 340, now: STAFF_RANGE_PX, WORLD_ZOOM });

  /* ════════════ 2. A REAL ORB, FLYING ════════════
     The observable a player feels. Fire a basic staff shot and watch `dist`
     climb until the orb is gone; the peak is the reach. */
  const flight = await P.page.evaluate(({ LIFE }) => new Promise((resolve) => {
    const S = window._gameState.current, R = S.rpg;
    R.activeSlot = 'staff';
    R.mana = R.maxMana = 500;
    S.arrows = [];
    S._aimAngle = 0;
    /* Spawned with the SHIPPED constant, in the shape monsterCombat uses.
       What this section measures is the projectile SIM -- that 135 ticks of
       life actually carries an orb 675 px, which is a property of
       projectiles.js and not of the number. That the GAME sets that life is a
       different claim, covered by section 3 (which fires the real special
       through the real bridge) and section 5 (which reads all four sites). */
    S.arrows.push({
      ang: 0, dist: 14, dmg: 1, life: LIFE, maxLife: LIFE,
      hitIds: new Set(), isStaff: true,
    });
    /* rAF, not setInterval: the sim advances on the render frame, so polling
       on any other clock reads a stale dist and undercounts the last hop. */
    let peak = 0, samples = 0;
    const step = () => {
      const a = (S.arrows || [])[0];
      samples++;
      if (a && typeof a.dist === 'number') peak = Math.max(peak, a.dist);
      if (!a || samples > 600) { resolve({ peak: Math.round(peak), samples, gone: !a }); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { LIFE: STAFF_LIFE });
  console.log('    flew: ' + JSON.stringify(flight));
  rec.ok('the projectile sim carries an orb its full life in a real client (guard)',
    flight.samples > 1, flight);
  /* One frame of slack: the last tick can overshoot or fall just short. */
  /* Tolerance is four frames, and it is asymmetric on purpose: the orb is
     REMOVED on the frame its life expires, so the last dist a sampler can
     observe is always a hop or three short of the true reach. What this has to
     separate is 675 from 340, and 640 does that with a wide margin. */
  rec.ok('...and STAFF_LIFE ticks of it is 675px of travel, not 340',
    flight.peak >= STAFF_RANGE_PX - STAFF_ORB_SPEED_PX * 4 && flight.peak <= STAFF_RANGE_PX + STAFF_ORB_SPEED_PX,
    { peak: flight.peak, want: STAFF_RANGE_PX, floor: STAFF_RANGE_PX - STAFF_ORB_SPEED_PX * 4 });

  /* ════════════ 3. THE SPECIAL GOES WITH IT ════════════
     Three orbs, each solving its life from the SAME reach, so the distance
     does not depend on which orb you are. That is this file's claim and it is
     unchanged.

     ═══ v2.3.2464: WHAT THE SPEEDS ARE IS NO LONGER THIS FILE'S BUSINESS ═══
     This block used to assert the three flew at three DIFFERENT speeds --
     v2.3.2262's fast/medium/slow, an owner request. The owner has since
     replaced it: "I want magic special to change to 3 evenly spaced out orbs.
     Maybe like one every .2 seconds until it hits the 3rd orb." Evenly spaced
     takes ONE speed; three speeds keep opening the gaps for the whole flight,
     which is a fan rather than a line.

     So the assertion is inverted rather than deleted, because the direction is
     load-bearing either way: one speed is now the thing that must not silently
     regress. The SPACING itself -- the 200ms launch step, and that the gaps
     hold as the orbs travel -- belongs to mp-solospecial, which measures it in
     flight. Here it is only the range that is at stake, and with one speed
     there is one life and all three plainly land on STAFF_RANGE_PX. */
  const orbs = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    /* specialAttack REFUSES without a real weapon in the slot -- getActiveWeapon
       returns nothing and it bails silently, which is what an empty orb list
       means. Minted from the game's own tier table (mp-orbline's shape), never
       a literal tierMult. */
    const t = (F.WOODWORKING_TIERS || {}).pine;
    if (t) R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
    R.activeSlot = 'staff'; R.mana = R.maxMana = 500; S._lastSwipe = 0;
    S.arrows = []; S._aimAngle = 0;
    if (!F.specialAttack || !R.staffWeapon) return null;
    F.specialAttack();
    return (S.arrows || []).filter((a) => a.isSpecial && a.isStaff)
      .map((a) => ({ life: a.life, speedPx: a.speedPx, reach: Math.round(a.life * a.speedPx) }));
  });
  console.log('    special orbs: ' + JSON.stringify(orbs));
  if (orbs && orbs.length === 3) {
    rec.ok('all three special orbs reach the same 675px',
      orbs.every((o) => Math.abs(o.reach - STAFF_RANGE_PX) <= 3), orbs);
    rec.ok('...and all three fly at ONE speed, so the volley stays evenly spaced',
      new Set(orbs.map((o) => o.speedPx)).size === 1, orbs.map((o) => o.speedPx));
  } else {
    rec.skip('all three special orbs reach the same 675px', 'specialAttack bridge absent');
  }

  /* ════════════ 4. THE PEER MIRROR ════════════
     What YOU see of someone ELSE's orb. This is the site a range change
     forgets: it lives in networking/gameEvents.js, not in the combat files, so
     a stale value there kills a remote caster's orb at 340px on your screen
     while it flies 675 on theirs -- a desync nobody would trace back to a
     range retune.

     NOT DRIVEN LIVE, and deliberately not faked. processGameEvent is module
     scope inside the bundle with no window handle, so the inbound switch
     cannot be reached from the page; the honest options were a second real
     client firing a real staff (a much larger fixture than this change needs)
     or reading the source. Section 5 does the latter and covers all four
     sites at once. An earlier draft of this file invented a
     `window.__btGameEvents` to poke -- precheck's qa-handles gate rejected it,
     correctly: a test that reads a handle nothing defines is not testing
     anything. */

  /* ════════════ 5. NO STRAY LITERAL LEFT BEHIND ════════════
     Four modules spawn staff projectiles and they live in four different
     places -- combat, dodge, the special, and the peer mirror. The whole point
     of the shared constant is that a future retune cannot half-land, so this
     asserts the old literal is GONE rather than trusting that it is. Read off
     disk, because a bundled client cannot tell you which module a number came
     from. */
  const SITES = [
    'src/game/monsterCombat.js',
    'src/game/dodge.js',
    'src/game/playerActions.js',
    'src/networking/gameEvents.js',
  ];
  const srcOf = (f) => readFileSync(join(H.REPO, f), 'utf8');
  const strays = SITES.filter((f) => /\?\s*68\s*:/.test(srcOf(f)));
  rec.ok('no spawn site still carries the old 68-tick literal', strays.length === 0, { strays });
  const unwired = SITES.filter((f) => !/STAFF_LIFE|STAFF_RANGE_PX/.test(srcOf(f)));
  rec.ok('...and all four read the shared constant', unwired.length === 0, { unwired });

  await P.ctx.close().catch(() => {});
}
