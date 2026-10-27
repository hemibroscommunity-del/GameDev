/* ═══ ADD A PET FROM THE TEST PANEL (v2.3.3613) ═══
 *
 * The owner, 2026-10-26: "Admin 'add pet'".  A catch is 1% at best, about a
 * hundred kills; the worker's trapping lever (devtools.js _devTrapping `pet`)
 * puts a land's pet in the pets record as a catch would, and the Test panel
 * now has a row for it.  On a phone in the world, through the real panel:
 *   1. the panel opens and shows the row: Golden, Big, Lv 1, Lv 21, and a chip
 *      for each of the eight lands;
 *   2. Golden, Big and Lv 21 chosen, the Poison chip: a Wisplet arrives in the
 *      pets record (the worker's pets_state), golden, big (the top size),
 *      level 21 and its land's second stage, and the panel says where it went;
 *   3. the options off and Lv 1, the Frost chip: a Snowling, not golden, at
 *      level 1 -- the options are this row's, never left over from before;
 *   4. the Pets page lists both;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/devpet-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return true;
};
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    await holdTitle(P, 2200);
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}
const clickSel = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b || b.disabled) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
}, sel);
const pets = (P) => H.readState(P, (S) => (S._petBook && Array.isArray(S._petBook.list)
  ? S._petBook.list.map((p) => ({ id: p.id, kind: p.kind, gold: !!p.gold, size: p.size, level: p.lv, stage: p.stage }))
  : null));
async function waitPets(P, n, ms = 12000) {
  let l = null;
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    l = await pets(P);
    if (l && l.length >= n) return l;
    await P.page.waitForTimeout(300);
  }
  return l;
}
const panelMsg = (P) => P.page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('div, span'));
  const m = all.find((n) => /is in More, Pets\./.test(n.textContent || '') && n.children.length === 0);
  return m ? m.textContent : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Petkeeper', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    /* the admin key, as the owner saved it on their phone (DevPanel's KEY_LS) */
    init: 'try { localStorage.setItem("bt_dev_key", ' + JSON.stringify(H.ADMIN_KEY) + '); } catch (e) {}',
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2000);
  const before = await pets(P);
  rec.ok('setup: in the world, the pets record came at join, empty', zone === 'wheel' && Array.isArray(before) && before.length === 0, { zone, before });

  /* ── 1. the panel and its row ── */
  const opened = await openPanel(P);
  const row = await P.page.evaluate(() => ({
    lands: Array.from(document.querySelectorAll('[data-dev-pet]')).map((b) => b.getAttribute('data-dev-pet')),
    opts: Array.from(document.querySelectorAll('[data-dev-pet-opt]')).map((b) => b.getAttribute('data-dev-pet-opt')),
    levels: Array.from(document.querySelectorAll('[data-dev-pet-level]')).map((b) => b.getAttribute('data-dev-pet-level')),
  }));
  await P.page.evaluate(() => { const b = document.querySelector('[data-dev-pet="frost"]'); if (b) b.scrollIntoView({ block: 'center' }); });
  await P.page.waitForTimeout(300);
  await P.page.screenshot({ path: join(OUT, 'devpet-row.png') });
  rec.ok(`1. the test panel opens with the Add a pet row: ${row.lands.length} lands, ${row.opts.join(' + ')}, Lv ${row.levels.join(' / ')}`,
    opened && row.lands.length === 8 && ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'].every((l) => row.lands.includes(l))
      && row.opts.join() === 'gold,big' && row.levels.join() === '1,21', { opened, row });

  /* ── 2. golden, big, level 21, from the Poison Forest ── */
  await clickSel(P, '[data-dev-pet-opt="gold"]');
  await clickSel(P, '[data-dev-pet-opt="big"]');
  await clickSel(P, '[data-dev-pet-level="21"]');
  await P.page.waitForTimeout(300);
  const pressed = await P.page.evaluate(() => ['[data-dev-pet-opt="gold"]', '[data-dev-pet-opt="big"]', '[data-dev-pet-level="21"]']
    .map((s) => (document.querySelector(s) || {}).getAttribute && document.querySelector(s).getAttribute('aria-pressed')));
  const c2 = await clickSel(P, '[data-dev-pet="mist"]');
  const l2 = await waitPets(P, 1);
  const p2 = l2 && l2[0];
  const m2 = await panelMsg(P);
  await P.page.screenshot({ path: join(OUT, 'devpet-golden.png') });
  rec.ok(`2. Golden, Big and Lv 21 lit (${pressed.join(', ')}), the Poison chip: a ${p2 && p2.kind} arrives, golden ${p2 && p2.gold}, size ${p2 && p2.size}, level ${p2 && p2.level}`,
    c2 && pressed.every((v) => v === 'true') && !!p2 && p2.kind === 'wisplet' && p2.gold === true && p2.size >= 1.18 && p2.level === 21 && p2.stage === 2, { pressed, l2 });
  rec.ok(`2. ...and the panel says where it went ("${m2}")`, !!m2 && /golden big Poison pet, level 21/.test(m2), m2);

  /* ── 3. the options off, level 1, from Frost Ridge ── */
  await clickSel(P, '[data-dev-pet-opt="gold"]');
  await clickSel(P, '[data-dev-pet-opt="big"]');
  await clickSel(P, '[data-dev-pet-level="1"]');
  await P.page.waitForTimeout(300);
  const c3 = await clickSel(P, '[data-dev-pet="frost"]');
  const l3 = await waitPets(P, 2);
  const p3 = l3 && l3.find((p) => p.kind === 'snowling');
  rec.ok(`3. the options off and Lv 1, the Frost chip: a ${p3 && p3.kind}, golden ${p3 && p3.gold}, level ${p3 && p3.level} -- nothing left over from before`,
    c3 && !!p3 && p3.gold === false && p3.level === 1 && p3.size < 1.25, { l3 });

  /* ── 4. the Pets page lists both (More -> Pets, mp-trapping's way) ── */
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForTimeout(400);
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  const page = await P.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).then(() => true).catch(() => false);
  const rows = page ? await P.page.$$eval('[data-pet-row]', (els) => els.map((el) => el.getAttribute('data-pet-row'))) : [];
  await P.page.screenshot({ path: join(OUT, 'devpet-pets-page.png') });
  rec.ok(`4. the Pets page lists both (${rows.length} rows)`, rows.length >= 2 && l3 && l3.every((p) => rows.includes(p.id)), { rows, l3 });

  rec.ok('5. no page errors', errors.length === 0, errors);
  await P.ctx.close().catch(() => {});
}
