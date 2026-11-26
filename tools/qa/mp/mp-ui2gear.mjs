/* ═══ v2.3.6687: GEAR'S ONE ITEM PAGE ON A PHONE AND A COMPUTER (card UI2-gear PR 1, the build's step 5) ═══
 *
 * The one item page (src/ui/mobile/dash/ItemPage.jsx, its model
 * src/game/itemInspect.js), opened from Gear's card: the picked item's
 * picture and name are the door (data-gear-details), under the new frame.
 * In the Wheel's BroTown, a character given the dev kit's weapons (a
 * greatsword in hand, a bow and a staff on), its armour in the RARE grade in
 * the bag, two minnows and copper ore (the legs and the amulet cells empty):
 *
 *   upright phone (390 x 844, touch):
 *     1. Gear: tap the Sword cell; the card has the door, its foot still the
 *        one gold button (Unequip): nothing on today's card moved;
 *     2. the door: the item page on Gear's stack under [‹ Gear] Sword [Menu]
 *        [✕]; the band's height unchanged (243); the grade's slot, the name,
 *        "Worn"; DPS and "Attack speed" among the facts; Unequip leads; no
 *        Sell; every button 44 x 44 or more, inside the page; no word under
 *        11 px; no fact cut short; the action row in view (the page never
 *        scrolls as a whole);
 *     3. Back: Gear again, the sword still picked;
 *     4. the bag's rare chest piece: its page says Rare (two stars), "In
 *        your bag", Damage cut, Equip leads, no Sell; Equip: back on Gear,
 *        and the worker puts it on (the chest cell filled);
 *     5. a stack (the minnows): "You hold 2", its own actions, no Sell;
 *   375 x 667 and sideways 844 x 390: the sword's page fits (sideways the
 *   identity, facts and actions side by side, the page 66 px inside);
 *   a computer (1280 x 800, wide): the same page fits, its buttons 44 px.
 *
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-gear-item-worn.png,
 * -item-bag.png, -item-stack.png, -item-sideways.png, -item-computer.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';

export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* the page's reading, in the page */
function itemRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const pg = document.querySelector('[data-item-page]');
  const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
  const out = {
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    title: txt('[data-dash-frame] [data-u2="title"]'),
    back: txt('[data-dash-frame] [data-dash-ctl="back"]'),
    page: !!pg,
  };
  if (!pg) return out;
  const P = pg.getBoundingClientRect();
  const inside = (r) => r.left >= P.left - 0.5 && r.right <= P.right + 0.5 && r.top >= P.top - 0.5 && r.bottom <= P.bottom + 0.5;
  const btns = Array.from(pg.querySelectorAll('button')).map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.getAttribute('data-item-act'), w: Math.round(r.width), h: Math.round(r.height), off: b.disabled, in: inside(r), text: b.textContent.trim() };
  });
  const small = [];
  for (const e of pg.querySelectorAll('*')) {
    const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || e.closest('[aria-hidden="true"]')) continue;
    const fs0 = parseFloat(getComputedStyle(e).fontSize);
    if (fs0 < 11) small.push([e.className, fs0, e.textContent.trim().slice(0, 20)]);
  }
  const cut = Array.from(pg.querySelectorAll('.u2-group-v')).filter((v) => v.scrollWidth > v.clientWidth + 0.5).map((v) => v.textContent);
  const acts = pg.querySelector('[data-item-actions]');
  const id = pg.querySelector('[data-item-id]');
  const facts = Array.from(pg.querySelectorAll('[data-item-fact]')).map((f) => f.getAttribute('data-item-fact'));
  const grade = pg.querySelector('[data-item-grade-word]');
  const stars = pg.querySelector('[data-item-stars]');
  return {
    ...out,
    box: [Math.round(P.width), Math.round(P.height)],
    scrolls: pg.scrollHeight > pg.clientHeight + 1,
    name: txt('[data-item-page] [data-item-name]'),
    where: txt('[data-item-page] [data-item-where]'),
    grade: grade ? grade.getAttribute('data-item-grade-word') : null,
    stars: stars ? Number(stars.getAttribute('data-item-stars')) : 0,
    slot: (pg.querySelector('.u2-slot') || { getAttribute: () => null }).getAttribute('data-grade'),
    facts,
    acts: acts ? acts.getAttribute('data-item-actions').split(' ') : [],
    actsIn: acts ? inside(acts.getBoundingClientRect()) : true,
    idIn: id ? inside(id.getBoundingClientRect()) : false,
    btns,
    smallBtns: btns.filter((b) => b.w < 44 || b.h < 44),
    outBtns: btns.filter((b) => !b.in),
    small,
    cut,
    sideways: id && acts ? Math.abs(id.getBoundingClientRect().top - acts.getBoundingClientRect().top) < 30 : null,
  };
}
const read = (P) => P.page.evaluate(itemRead);
const tap = async (P, sel, ms = 600) => { await P.page.locator(sel).first().tap({ timeout: 6000 }); await P.page.waitForTimeout(ms); };
const click = async (P, sel, ms = 600) => { await P.page.locator(sel).first().click({ timeout: 6000 }); await P.page.waitForTimeout(ms); };
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 60), w: b.width, h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 60) }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
const rpgOf = (P) => P.page.evaluate(() => {
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  return { weapon: !!R.weapon, armor: R.armor ? { name: R.armor.name, q: R.armor.quality } : null, stashArmor: (R.armorStash || []).length };
});
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
async function seed(P, wsPort, rec, tag, full) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  if (full) {
    await H.devOp(wsPort, 'kit', id, { what: 'armor', quality: 'rare' }).catch(() => null);
    await H.grant(wsPort, id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => null);
    await H.grant(wsPort, id, 'item', { invKey: 'ore_copper_ore', count: 3 }).catch(() => null);
  }
  await P.page.waitForTimeout(2500);
  const r = await rpgOf(P);
  rec.ok(`${tag}: seeded (a weapon in hand${full ? ', rare armour in the bag' : ''})`, r.weapon && (!full || r.stashArmor > 0 || !!r.armor), r);
}
/* Gear's root, the sword picked, its door pressed */
async function swordPage(P, press) {
  /* Gear's ROOT: the page left on Gear's stack goes (dashOpen would resume it) */
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(600);
  await H.dashOpen(P, 'dashboard');
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.deselect(); });
  await P.page.waitForTimeout(400);
  await press(P, '[data-gear-cell="sword"]');
  await press(P, '[data-gear-details]', 900);
  return read(P);
}
const fits = (s) => s.page && !s.scrolls && s.smallBtns.length === 0 && s.outBtns.length === 0 && s.small.length === 0 && s.cut.length === 0 && s.actsIn && s.idIn;
const fitWhy = (s) => ({ box: s.box, scrolls: s.scrolls, smallBtns: s.smallBtns, outBtns: s.outBtns, small: s.small, cut: s.cut, actsIn: s.actsIn, idIn: s.idIn });

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });

  /* ══ the upright phone, then the other shapes ══ */
  const P = await H.newPlayer(browser, { name: 'Gearbro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, '390x844'))) return;
    await seed(P, wsPort, rec, '390x844', true);
    await H.unfoldBand(P).catch(() => null);
    await H.dashOpen(P, 'dashboard');
    await P.page.waitForTimeout(800);
    const before = await read(P);

    /* 1. the door on Gear's card; the foot as it was */
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.deselect(); });
    await tap(P, '[data-gear-cell="sword"]');
    const card = await P.page.evaluate(() => {
      const d = document.querySelector('[data-gear-details]');
      const r = d ? d.getBoundingClientRect() : null;
      return { door: r ? [Math.round(r.width), Math.round(r.height)] : null, label: d ? d.getAttribute('aria-label') : null,
        foot: Array.from(document.querySelectorAll('[data-gear-foot] button')).map((b) => b.getAttribute('data-gear-act')) };
    });
    rec.ok('1. Gear\'s card: the picked sword\'s picture and name are the door ("Details of ..."), 44 px tall or more; the foot still one gold button, Unequip',
      !!card.door && card.door[1] >= 44 && /^Details of /.test(card.label || '') && card.foot.join() === 'unequip', card);

    /* 2. the item page */
    await tap(P, '[data-gear-details]', 900);
    const s2 = await read(P);
    await bandShot(P, 'ui2-gear-item-worn.png');
    rec.ok('2a. the item page on Gear\'s stack: [‹ Gear] Sword [Menu] [✕]; the band 390 x 243 as before',
      s2.page && s2.title === 'Sword' && /Gear/.test(s2.back || '') && !!s2.band && !!before.band && s2.band[1] === before.band[1] && s2.band[1] === 243,
      { title: s2.title, back: s2.back, band: s2.band, before: before.band });
    rec.ok('2b. its identity: the grade\'s slot and word with its stars, the name, "Worn"; DPS and "Attack speed" among the facts; Unequip leads; no Sell',
      !!s2.name && s2.where === 'Worn' && ['Normal', 'Rare', 'Elite', 'Godly'].includes(s2.grade) && s2.stars >= 1 && !!s2.slot
        && s2.facts.includes('DPS') && s2.facts.includes('Attack speed') && !s2.facts.includes('Speed') && s2.acts[0] === 'unequip' && !s2.acts.includes('sell'),
      { name: s2.name, where: s2.where, grade: s2.grade, stars: s2.stars, slot: s2.slot, facts: s2.facts, acts: s2.acts });
    rec.ok('2c. 390x844: it fits: every button 44 x 44 or more inside the page, no word under 11 px, no fact cut short, the identity and the action row in view, no scroll', fits(s2), fitWhy(s2));

    /* 3. Back: Gear, the pick kept */
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 800);
    const s3 = await P.page.evaluate(() => ({ page: !!document.querySelector('[data-item-page]'), title: (document.querySelector('[data-dash-frame] [data-u2="title"]') || {}).textContent, sel: window.__btGearTab ? window.__btGearTab.state().sel : null }));
    rec.ok('3. Back: Gear again, the sword still picked', !s3.page && /Gear/.test(s3.title || '') && !!s3.sel && s3.sel.cell === 'sword', s3);

    /* 4. the bag's rare chest piece, then Equip */
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.deselect(); });
    await P.page.waitForTimeout(300);
    const chestKey = await P.page.evaluate(() => { const e = document.querySelector('[data-gear-bag] [data-bag-key^="stashArmor-"]'); return e ? e.getAttribute('data-bag-key') : null; });
    if (chestKey) {
      await tap(P, `[data-gear-bag] [data-bag-key="${chestKey}"]`);
      await tap(P, '[data-gear-details]', 900);
      const s4 = await read(P);
      await bandShot(P, 'ui2-gear-item-bag.png');
      rec.ok('4a. the bag\'s rare chest piece: Rare, two stars, "In your bag", Damage cut, Equip leads, no Sell; it fits',
        s4.page && s4.title === 'Chest' && s4.grade === 'Rare' && s4.stars === 2 && s4.slot === 'rare' && s4.where === 'In your bag'
          && s4.facts.includes('Damage cut') && s4.acts[0] === 'equip' && !s4.acts.includes('sell') && fits(s4),
        { title: s4.title, grade: s4.grade, stars: s4.stars, where: s4.where, facts: s4.facts, acts: s4.acts, fit: fitWhy(s4) });
      await tap(P, '[data-item-page] [data-item-act="equip"]', 2500);
      const after = await P.page.evaluate(() => ({ page: !!document.querySelector('[data-item-page]'), chest: (document.querySelector('[data-gear-cell="chest"]') || { getAttribute: () => null }).getAttribute('data-gear-filled') }));
      const r4 = await rpgOf(P);
      rec.ok('4b. Equip: back on Gear, the worker puts the rare piece on (the chest cell filled)', !after.page && after.chest === '1' && !!r4.armor && r4.armor.q === 'rare', { after, r4 });
    } else {
      rec.ok('4. the bag\'s rare chest piece is in the bag (guard)', false, 'no stashArmor tile');
    }

    /* 5. a stack */
    await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
    await P.page.waitForTimeout(600);
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.deselect(); });
    await P.page.waitForTimeout(300);
    if (await P.page.locator('[data-gear-bag] [data-bag-key="i-fish_minnow"]').count()) {
      await tap(P, '[data-gear-bag] [data-bag-key="i-fish_minnow"]');
      await tap(P, '[data-gear-details]', 900);
      const s5 = await read(P);
      await bandShot(P, 'ui2-gear-item-stack.png');
      rec.ok('5. a stack (two minnows): "You hold 2", "In your bag", its actions without Sell; it fits',
        s5.page && s5.where === 'In your bag' && s5.facts.includes('You hold') && !s5.acts.includes('sell') && fits(s5),
        { facts: s5.facts, acts: s5.acts, where: s5.where, fit: fitWhy(s5) });
    } else {
      rec.ok('5. the minnows are in the bag (guard)', false, 'no i-fish_minnow tile');
    }

    /* 6. the other shapes */
    for (const sh of [{ w: 375, h: 667, band: 235, tag: '375x667' }, { w: 844, h: 390, band: 130, tag: '844x390' }]) {
      await P.page.setViewportSize({ width: sh.w, height: sh.h });
      await P.page.waitForTimeout(1500);
      const s6 = await swordPage(P, tap);
      if (sh.tag === '844x390') await bandShot(P, 'ui2-gear-item-sideways.png');
      rec.ok(`6. ${sh.tag}: the sword's page fits (the band ${sh.w} x ${sh.band} as today${sh.tag === '844x390' ? '; identity, facts and actions side by side' : ''})`,
        fits(s6) && !!s6.band && s6.band[1] === sh.band && (sh.tag !== '844x390' || s6.sideways === true),
        { band: s6.band, sideways: s6.sideways, fit: fitWhy(s6) });
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ══ a computer ══ */
  const D = await H.newPlayer(browser, { name: 'Geardesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (!(await inWorld(D, rec, 'computer'))) return;
    await seed(D, wsPort, rec, 'computer', false);
    const s7 = await swordPage(D, click);
    await bandShot(D, 'ui2-gear-item-computer.png');
    rec.ok('7. a computer: the sword\'s page under [‹ Gear] Sword; it fits, every button 44 px or more',
      s7.page && s7.title === 'Sword' && fits(s7), { title: s7.title, band: s7.band, fit: fitWhy(s7) });
  } finally {
    await D.ctx.close().catch(() => {});
  }
}
