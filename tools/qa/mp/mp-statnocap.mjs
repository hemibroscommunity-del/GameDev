/* v2.3.3578: NO CAP ON A STAT, ON A PHONE (server/src/statcap.js).
 *
 * The owner: "Remove stat cap."  A stat held at most your character level in
 * points; now it takes every point you have for it.  On a phone in the world,
 * with real points the worker minted (the dev kit's levels, as mp-catgrid):
 *
 *   1. the worker says caps.nostatcap, and the character has more shared
 *      points than its level (the old bound on Max HP)
 *   2. Max HP's window: [+] adds past your level, and Spend places every one
 *   3. the worker took them all: rpg.prog3.alloc.hp is past the old bound, and
 *      the bar grew
 *   4. the cell reads "Max HP, n points." -- never "n of 999"
 *   5. the window still offers the next point
 *   6. `nostatcap: false` (a rejoin to read it): [+] stops where the old bound
 *      is, the label says "n of L" again, and the points placed stay
 *   7. no page errors
 */
import * as H from './harness.mjs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

async function seed(P, wsPort) {
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(150);
    const s = await state(P);
    if (s.shared > 0) return s;
  }
  return state(P);
}
const state = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const R = S && S.rpg;
  const p = (R && R.prog3) || {};
  const sk = p.sk || {};
  const lv = Math.max(1, ...['sword', 'bow', 'staff'].map((c) => (sk[c] && sk[c].level) || 1));
  return { shared: p.shared || 0, hp: (p.alloc && p.alloc.hp) || 0, level: lv,
    maxHp: R && R.maxHp, caps: !!(S && S._serverCaps && S._serverCaps.nostatcap) };
});

async function finger(P, sel) {
  const box = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, sel);
  if (!box) return false;
  await P.page.touchscreen.tap(box.x, box.y);
  await P.page.waitForTimeout(340);
  return true;
}
const stepCount = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-infopopup-count]');
  return c ? Number(c.getAttribute('data-infopopup-count')) : null;
});
const label = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-prog3-plus="shared:hp"]');
  return el ? el.getAttribute('aria-label') : null;
});

async function openPoints(P) {
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(600);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
}

/* [+] up to `n` times, each tap waited out (this box's world page runs its
   timers a few times a second: TRAPS §200); the count it reached */
async function plus(P, n) {
  let c = await stepCount(P);
  for (let i = 0; i < n; i++) {
    const before = c;
    await finger(P, '[data-infopopup-step="up"]');
    for (let k = 0; k < 20 && (c = await stepCount(P)) === before; k++) await P.page.waitForTimeout(100);
    if (c === before) break;
  }
  return c;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  const P = await H.newPlayer(browser, { name: 'Nocap', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);

  /* 1 */
  const s0 = await seed(P, wsPort);
  rec.ok('1. the worker says caps.nostatcap', s0.caps, s0);
  rec.ok(`1b. ...and the character has more shared points than its level (${s0.shared} at level ${s0.level}: the old bound on Max HP was ${s0.level})`,
    s0.shared > s0.level, s0);

  /* 2 */
  await openPoints(P);
  const opened = await finger(P, '[data-prog3-plus="shared:hp"]');
  await P.page.waitForTimeout(500);
  rec.ok('2. Max HP\'s window opens from its [+]', opened && !!(await P.page.$('[data-infopopup]')));
  const want = Math.min(s0.shared, s0.level + 3);
  const got = await plus(P, want);
  rec.ok(`2b. [+] adds past your level: ${got} of the ${want} asked (the old bound stopped at ${s0.level})`, got === want && got > s0.level, { got, want, level: s0.level });
  await P.page.screenshot({ path: `${OUT}/statnocap-window.png` }).catch(() => {});
  await finger(P, '[data-infopopup-action]');

  /* 3 */
  let s1 = await state(P);
  for (let i = 0; i < 40 && s1.hp < want; i++) { await P.page.waitForTimeout(150); s1 = await state(P); }
  rec.ok(`3. the worker placed every one: Max HP ${s1.hp} points (past level ${s0.level}), ${s1.shared} shared left`,
    s1.hp === want && s1.shared === s0.shared - want, { s0, s1 });
  rec.ok(`3b. ...and the bar grew with them (${s0.maxHp} -> ${s1.maxHp})`, s1.maxHp > s0.maxHp, { before: s0.maxHp, after: s1.maxHp });

  /* 5: the window stays after a spend (v2.3.3522), its count back at 0 */
  let more = null;
  if (s1.shared > 0) {
    await P.page.waitForTimeout(600);
    more = await plus(P, 1);
    rec.ok('5. the window still offers the next point', more === 1, more);
  } else {
    rec.ok('5. (no point left to offer: skipped)', true);
  }
  await finger(P, '[data-infopopup-x]');
  await P.page.waitForTimeout(400);

  /* 4 */
  const l1 = await label(P);
  rec.ok(`4. the cell reads its points with no cap: "${l1}"`,
    !!l1 && new RegExp(`, ${want} points\\.`).test(l1) && !/ of \d/.test(l1), l1);

  /* 6: the switch, read at a rejoin */
  await H.liveFlag(wsPort, 'nostatcap', false);
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);
  const s2 = await state(P);
  rec.ok('6. `nostatcap: false`: the worker no longer says caps.nostatcap, and the points placed stay',
    !s2.caps && s2.hp === want, s2);
  await openPoints(P);
  const l2 = await label(P);
  rec.ok(`6b. ...the cell says "of ${s2.level}" again: "${l2}"`, !!l2 && new RegExp(`, ${want} of ${s2.level}\\.`).test(l2), l2);
  await finger(P, '[data-prog3-plus="shared:hp"]');
  await P.page.waitForTimeout(500);
  const blocked = await P.page.evaluate(() => {
    const b = document.querySelector('[data-infopopup-blocked]');
    return b ? (b.textContent || '').trim() : null;
  });
  const up = await plus(P, 1);
  rec.ok(`6c. ...and [+] adds nothing past the bound: "${blocked}"`, !up && !!blocked && /cap/i.test(blocked), { up, blocked });
  await H.liveFlag(wsPort, 'nostatcap', null);

  rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close().catch(() => {});
}
