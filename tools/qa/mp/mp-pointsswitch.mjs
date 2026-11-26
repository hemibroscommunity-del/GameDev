/* ═══ v2.3.3665: THE POINTS PAGE SWITCHES BETWEEN THE THREE WEAPONS ═══
 *
 * The owner: "the points page needs a way to change between views between
 * melee, bow, staff.  It's stuck on whatever weapon you have equipped but
 * there should be a way to toggle between the 3".  The weapons' gold frame
 * on the Points tab holds three rows, sword, staff and bow; a tap on a row
 * now shows that weapon's six numbers (HeroExpanded.jsx headCell).
 *
 * In the world, upright on a 390 x 844 phone, with real fingers:
 *   1. the grid opens on the weapon in your hand (v2.3.3051), its row lit;
 *   2. a tap on the bow's row shows the bow's six cells, with the points the
 *      WORKER minted and charged to it (two Power), its row lit and the
 *      sword still marked as the one in hand;
 *   3. the staff's row, then the sword's, the same;
 *   4. a change of weapon in hand brings the grid to that weapon (the 2 key,
 *      with a bow the worker armed: v2.3.4154, the key takes up only a weapon
 *      you hold);
 *   5. a computer: a mouse click on a row does the same.
 *
 * v2.3.6686 (card UI2-bro, tests part): UNDER THE FRAME there is no one grid with three rows to switch: Bro's Combat
 * is a hub and each weapon has its OWN page (Sword, Bow, Staff: Menu, Bro, Combat, the weapon's door).  What the
 * owner asked for -- to see any of the three weapons' points, never stuck on the one in hand -- is now "each page
 * shows ITS weapon's points, the worker's, whichever weapon is in hand".  The checks follow that:
 *   1. the Sword's page opens with the sword's own points (none placed), its pool the worker's;
 *   2. the Bow's page: Power says 2 placed (the points the worker charged to it), its pool the worker's, the sword's
 *      page still the sword's;  3. the Staff's page, Range 1; the Sword's page again, as it was;
 *   4. the bow taken in hand (the 2 key, a bow the worker armed): the page open stays the page opened, and the
 *      sword's and the bow's pages still show their own points (a page does not follow the hand, nor the hand a page);
 *   5. a computer: a click opens the Bow's page the same way.
 *
 *   node tools/qa/mp/run.mjs pointsswitch
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

/* the worker mints the points: every weapon to level 6 and the points those
   levels give, each weapon's own (/dev/combat `deal`, the free reset's deal;
   the kit's `levels` set the levels and left the weapons' points empty) */
async function seed(P, wsPort) {
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'combat', myId, { skill: 'all', level: 6, deal: true }).catch(() => null);
  await P.page.waitForTimeout(1600);
}

/* points charged to one weapon's stat, through the game's own message */
async function allocate(P, cat, stat, n) {
  await P.page.evaluate(({ cat, stat, n }) => {
    const S = window._gameState.current;
    for (let i = 0; i < n; i++) S.channel.send({ type: 'prog3_allocate', payload: { stat, cat } });
  }, { cat, stat, n });
  /* the read runs in the page, where `cat` and `stat` are not: it brings the
     whole table back and the lane is picked here */
  const pts = (atk) => (atk && atk[cat] && atk[cat][stat]) || 0;
  return H.waitFor(P, (S) => (S.rpg && S.rpg.prog3 && S.rpg.prog3.atk) || null,
    (atk) => pts(atk) >= n, { timeout: 8000, label: `${n} ${stat} on the ${cat}` }).then(pts).catch(() => 0);
}

const DOOR = { sword: 'broSword', bow: 'broBow', staff: 'broStaff' };
/* a weapon's page, by the taps a player takes (Menu, Bro, Combat, the weapon's door) */
async function openWeapon(P, cat) {
  for (let i = 0; i < 3; i++) {
    if (await P.page.locator(`[data-weapon-page="${cat}"]`).first().isVisible().catch(() => false)) break;
    await H.dashOpen(P, DOOR[cat]).catch(() => {});
    await P.page.locator(`[data-weapon-page="${cat}"]`).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }
  await P.page.waitForTimeout(500);
}

/* what the open weapon page shows: whose page it is, the pool, and the points placed on its tiles */
const page = (P) => P.page.evaluate(() => {
  const e = document.querySelector('[data-weapon-page]');
  if (!e) return null;
  const pts = {};
  e.querySelectorAll('[data-weapon-attr]').forEach((t) => { pts[t.getAttribute('data-weapon-attr')] = Number(t.getAttribute('data-weapon-attr-pts')); });
  const pool = e.querySelector('[data-weapon-pool]');
  return { cat: e.getAttribute('data-weapon-page'), whose: e.getAttribute('data-weapon-whose'), pool: pool ? Number(pool.getAttribute('data-weapon-pool')) : null, pts, tiles: Object.keys(pts).length };
});

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── a phone ── */
  const P = await H.newPlayer(browser, { name: 'Pointswap', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    await seed(P, wsPort);
    const bowPower = await allocate(P, 'bow', 'dmg', 2);
    const staffRange = await allocate(P, 'staff', 'range', 1);
    rec.ok(`the worker charged two Power to the bow and one Range to the staff (${bowPower}, ${staffRange}) (guard)`, bowPower >= 2 && staffRange >= 1);
    await openWeapon(P, 'sword');
    const g0 = await page(P);
    rec.ok(`1. the Sword's page opens on the sword's own points: six tiles, none placed, whose "${g0 && g0.whose}" (pool ${g0 && g0.pool})`,
      !!g0 && g0.cat === 'sword' && g0.tiles === 6 && g0.pts.dmg === 0 && g0.whose === 'self', g0);

    await openWeapon(P, 'bow');
    const g1 = await page(P);
    try {
      const out = join(H.REPO, 'tools/qa/mp/out');
      mkdirSync(out, { recursive: true });
      await P.page.screenshot({ path: join(out, 'pointsswitch-bow.png') });
    } catch (e) { /* a picture only */ }
    rec.ok('2. the Bow\'s page shows the bow\'s six tiles, its pool the worker\'s', !!g1 && g1.cat === 'bow' && g1.tiles === 6 && Number.isFinite(g1.pool), g1);
    rec.ok(`2b. ...with the bow's own points: its Power tile says 2 placed (${g1 && g1.pts.dmg})`, !!g1 && g1.pts.dmg === 2 && (g1.pts.range || 0) === 0, g1);

    await openWeapon(P, 'staff');
    const g2 = await page(P);
    rec.ok(`3. the Staff's page shows the staff's tiles, its Range 1 (${g2 && g2.cat}; Range ${g2 && g2.pts.range}, Power ${g2 && g2.pts.dmg})`,
      !!g2 && g2.cat === 'staff' && g2.pts.range === 1 && (g2.pts.dmg || 0) === 0, g2);
    await openWeapon(P, 'sword');
    const g3 = await page(P);
    rec.ok(`3b. ...and the Sword's page again is the sword's, as it was (${g3 && g3.cat}, Power ${g3 && g3.pts.dmg})`,
      !!g3 && g3.cat === 'sword' && g3.pts.dmg === 0 && (g3.pts.range || 0) === 0, g3);

    /* the staff's page open, then the bow taken in hand (the 2 key: the game's own slot pick, desktopControls).
       v2.3.4154: the 2 key takes up only a bow you hold and a new character has none, so the worker arms one first
       (H.armWorker, as mp-monsternumbers does); the 1 key takes melee back first */
    const myId = await H.readState(P, (S) => S.myId);
    const armed = await H.armWorker(P, wsPort, myId, ['bow']).catch(() => []);
    await P.page.keyboard.press('Digit1');
    await P.page.waitForTimeout(600);
    await openWeapon(P, 'staff');
    await P.page.keyboard.press('Digit2');
    await P.page.waitForTimeout(900);
    const g4 = await page(P);
    rec.ok(`4. the bow taken in hand (the worker's bow: ${armed.join(', ') || 'none'}) leaves the Staff's page the staff's, its Range 1`,
      armed.includes('bow') && !!g4 && g4.cat === 'staff' && g4.pts.range === 1, { g4, armed });
    await openWeapon(P, 'bow');
    const g5 = await page(P);
    await openWeapon(P, 'sword');
    const g6 = await page(P);
    rec.ok('4b. ...and the Bow\'s page still says Power 2, the Sword\'s none: a page shows its weapon, not the one in hand',
      !!g5 && !!g6 && g5.cat === 'bow' && g5.pts.dmg === 2 && g6.cat === 'sword' && g6.pts.dmg === 0, { g5, g6 });
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── a computer ── */
  const D = await H.newPlayer(browser, { name: 'Pointsdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel', wide: true });
  try {
    await H.enterWorld(D);
    await D.page.waitForTimeout(2400);
    await seed(D, wsPort);
    await allocate(D, 'bow', 'dmg', 2);
    await openWeapon(D, 'sword');
    const d0 = await page(D);
    await openWeapon(D, 'bow');
    const d1 = await page(D);
    rec.ok(`5. a computer: the Bow's page opens by clicks and shows the bow's own points (${d0 && d0.cat} -> ${d1 && d1.cat}, Power ${d1 && d1.pts.dmg})`,
      !!d0 && !!d1 && d0.cat === 'sword' && d1.cat === 'bow' && d1.pts.dmg === 2 && d0.pts.dmg === 0, { d0, d1 });
  } finally {
    await D.ctx.close().catch(() => {});
  }
}
