/* ═══ v2.3.3654: THE POINTS PAGE SWITCHES BETWEEN THE THREE WEAPONS ═══
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
 *   4. a change of weapon in hand brings the grid to that weapon;
 *   5. a computer: a mouse click on a row does the same.
 *
 *   node tools/qa/mp/run.mjs pointsswitch
 */
import * as H from './harness.mjs';

/* the worker mints the points (mp-catgrid's seed: the devkit's `levels`) */
async function seed(P, wsPort) {
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  await P.page.waitForTimeout(1600);
}

/* points charged to one weapon's stat, through the game's own message */
async function allocate(P, cat, stat, n) {
  await P.page.evaluate(({ cat, stat, n }) => {
    const S = window._gameState.current;
    for (let i = 0; i < n; i++) S.channel.send({ type: 'prog3_allocate', payload: { stat, cat } });
  }, { cat, stat, n });
  return H.waitFor(P, (S) => {
    const a = S.rpg && S.rpg.prog3 && S.rpg.prog3.atk && S.rpg.prog3.atk[cat];
    return a ? a[stat] || 0 : 0;
  }, (v) => v >= n, { timeout: 8000, label: `${n} ${stat} on the ${cat}` }).catch(() => 0);
}

async function openPoints(P) {
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(600);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
}

/* what the grid shows: the lane its six cells are, the lit row, the held row,
   and one cell's label (its points) */
const grid = (P, cellStat) => P.page.evaluate((cellStat) => {
  const cells = [...document.querySelectorAll('[data-prog3-band="lane"] [data-prog3-row]')].map((c) => c.getAttribute('data-prog3-row'));
  const lanes = [...new Set(cells.map((k) => k.split(':')[0]))];
  const shown = document.querySelector('[data-points-frame="weapons"] [data-points-shown]');
  const held = document.querySelector('[data-points-frame="weapons"] [data-prog3-held]');
  const lane = lanes.length === 1 ? lanes[0] : null;
  const cell = lane ? document.querySelector(`[data-prog3-row="${lane}:${cellStat}"]`) : null;
  return {
    cells: cells.length, lane, lanes,
    shown: shown ? shown.getAttribute('data-points-shown') : null,
    held: held ? held.getAttribute('data-prog3-held') : null,
    head: (document.querySelector('[data-prog3-band="lane"] > [data-prog3-lane]') || {}).getAttribute
      ? document.querySelector('[data-prog3-band="lane"] > [data-prog3-lane]').getAttribute('data-prog3-lane') : null,
    cellLabel: cell ? cell.getAttribute('aria-label') : null,
  };
}, cellStat);

/* a real finger (or the mouse) on the middle of a weapon's row */
async function pick(P, key, mouse) {
  const box = await P.page.evaluate((k) => {
    const el = document.querySelector(`[data-points-frame="weapons"] [data-points-row="${k}"]`);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width, h: r.height } : null;
  }, key);
  if (!box) return null;
  if (mouse) await P.page.mouse.click(box.x, box.y);
  else await P.page.touchscreen.tap(box.x, box.y);
  await P.page.waitForTimeout(400);
  return box;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── a phone ── */
  const P = await H.newPlayer(browser, { name: 'Pointswap', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    await seed(P, wsPort);
    const bowPower = await allocate(P, 'bow', 'power', 2);
    const staffRange = await allocate(P, 'staff', 'range', 1);
    rec.ok(`the worker charged two Power to the bow and one Range to the staff (${bowPower}, ${staffRange}) (guard)`, bowPower >= 2 && staffRange >= 1);
    await openPoints(P);

    const g0 = await grid(P, 'power');
    rec.ok(`1. the grid opens on the weapon in your hand, the sword (${g0.lane}, its row lit: ${g0.shown}; in hand: ${g0.held})`,
      g0.cells === 6 && g0.lane === 'sword' && g0.shown === 'sword' && g0.held === 'sword', g0);

    const box = await pick(P, 'bow');
    const g1 = await grid(P, 'power');
    rec.ok(`2. a finger on the bow's row (${box ? Math.round(box.w) + ' x ' + Math.round(box.h) + ' px' : 'not found'}) shows the bow's six cells, its row lit, the sword still the one in hand`,
      !!box && g1.cells === 6 && g1.lane === 'bow' && g1.shown === 'bow' && g1.held === 'sword' && g1.head === 'bow', g1);
    rec.ok(`2b. ...with the bow's own points: its Power cell says 2 (${g1.cellLabel})`,
      /, 2 points?\b/.test(g1.cellLabel || '') || /\b2 points\b/.test(g1.cellLabel || ''), g1.cellLabel);

    await pick(P, 'staff');
    const g2 = await grid(P, 'range');
    rec.ok(`3. the staff's row shows the staff's cells, its Range 1 (${g2.lane}; ${g2.cellLabel})`,
      g2.lane === 'staff' && g2.shown === 'staff' && /\b1 point\b/.test(g2.cellLabel || ''), g2);
    await pick(P, 'sword');
    const g3 = await grid(P, 'power');
    rec.ok(`3b. ...and the sword's row brings the sword back (${g3.lane})`, g3.lane === 'sword' && g3.shown === 'sword', g3);

    /* the staff shown, then the bow taken in hand (the 2 key: the game's own
       slot pick, desktopControls -- a new character's bow slot) */
    await pick(P, 'staff');
    await P.page.keyboard.press('Digit2');
    await P.page.waitForTimeout(900);
    const g4 = await grid(P, 'power');
    rec.ok(`4. the bow taken in hand brings the grid to the bow (${g4.lane}; in hand: ${g4.held})`,
      g4.lane === 'bow' && g4.shown === 'bow' && g4.held === 'bow', g4);
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── a computer ── */
  const D = await H.newPlayer(browser, { name: 'Pointsdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, world: 'wheel' });
  try {
    await H.enterWorld(D);
    await D.page.waitForTimeout(2400);
    await seed(D, wsPort);
    await openPoints(D);
    const d0 = await grid(D, 'power');
    const dbox = await pick(D, 'bow', true);
    const d1 = await grid(D, 'power');
    rec.ok(`5. a computer: a click on the bow's row shows the bow (${d0.lane} -> ${d1.lane})`,
      !!dbox && d0.lane === 'sword' && d1.lane === 'bow' && d1.shown === 'bow', { d0, d1 });
  } finally {
    await D.ctx.close().catch(() => {});
  }
}
