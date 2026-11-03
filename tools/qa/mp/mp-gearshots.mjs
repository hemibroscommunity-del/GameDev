/* ═══ mp-gearshots (v2.3.4151): THE GEAR TAB'S PICTURES FOR THE DOCS ═══
 *
 * The owner's second mockup (2026-11-03): the bag (three by three, the coins
 * beside "All Items") | ONE card | "Equipped".  This scenario plays the real
 * tab in the Wheel's BroTown and saves the nine pictures
 * docs/UI-DESIGN-NOTES.md shows (v2.3.4191, A4: the bro preview at rest, the
 * new item card; the skill tiles' XP picture gone; v2.3.4191: the tab fills
 * the band's 840 px assembly on a computer, PR #1424):
 *
 *   docs/shots/gear-tab-overview.webp  upright phone (390 x 844, touch), nothing picked: the bro
 *   docs/shots/gear-tab-item.webp      ...a material in the bag tapped (the ore)
 *   docs/shots/gear-tab-gear.webp      ...a bag weapon, compared against the one worn
 *   docs/shots/gear-tab-armour.webp    ...a rare chest from the bag (two blue stars), compared
 *   docs/shots/gear-tab-more.webp      ...its "⋯" open (Drop, Pin)
 *   docs/shots/gear-tab-slot.webp      ...the Sword slot tapped (the bag filtered)
 *   docs/shots/gear-tab-desk.webp      a computer (1280 x 800), the band open
 *   docs/shots/gear-tab-oneband-desk.webp      the one band, a computer (1280 x 720), open
 *   docs/shots/gear-tab-oneband-sideways.webp  ...a sideways phone (844 x 390), opened
 *
 * The character is levelled through the worker's own XP path (the dev kit's
 * levels) so the overview's "Lv N" reads a played character's.
 *
 * Each phone picture is the band and a strip of world over it, cut to 256
 * colours and saved as lossless webp (the memory law's 256, and a picture in
 * the repo that is small) by tools/qa/mp/gear_shots.py.  The character holds
 * the test kit's weapons, a spare greatsword, a shield, and a few stacks
 * (ore, bars, logs, fish, a gem, bottles), so the bag is not empty.
 *
 *   npm run build && node tools/qa/mp/run.mjs gearshots
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = `${H.REPO}/tools/qa/mp/out/gearshots`;
const DOCS = `${H.REPO}/docs/shots`;

async function seed(P, wsPort) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const hasSword = await H.readState(P, (S) => !!(S.rpg && S.rpg.weapon));
  if (!hasSword) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee'); await P.page.waitForTimeout(1500); }
  await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); S.rpg.activeSlot = 'melee'; S._userCycledSlot = true; });
  await H.devOp(wsPort, 'kit', id, { what: 'shield' }).catch(() => null);
  /* v2.3.4191: rare armour into the bag (the kit's own pieces, in a grade:
     devtools.js v2.3.3142) -- the item card's two blue stars */
  await H.devOp(wsPort, 'kit', id, { what: 'armor', quality: 'rare' }).catch(() => null);
  for (const [invKey, count] of [['ore_iron_ore', 27], ['ore_copper_ore', 12], ['bar_iron', 5], ['wood_pine_log', 24], ['fish_minnow', 7], ['gem_fire', 1], ['manaShard', 3], ['whetstone', 2]]) {
    await H.grant(wsPort, id, 'item', { invKey, count }).catch(() => null);
  }
  await P.page.waitForTimeout(2500);
  return id;
}

/* the band and a strip of world over it: the Gear tab's top, less the
   dashboard's button row (52 px) and `above` */
async function bandClip(P, vw, vh, above) {
  const top = await P.page.evaluate(() => {
    const el = document.querySelector('[data-gear-tab]');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  const y = Math.max(0, (top == null ? vh - 320 : top - 52) - above);
  return { x: 0, y, width: vw, height: vh - y };
}

async function tapEl(P, sel) {
  const b = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'nearest' });   /* v2.3.4191: a bag piece past the nine in view (the ore, with the rare armour in) */
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!b) return false;
  await P.page.touchscreen.tap(b.x, b.y);
  await P.page.waitForTimeout(700);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(DOCS, { recursive: true });
  const shots = [];

  /* ══ the upright phone ══ */
  {
    const P = await H.newPlayer(browser, { name: 'Geary', wsPort, webPort, touch: true, world: 'wheel', viewport: { width: 390, height: 844 } });
    try {
      await H.enterWorld(P);
      await seed(P, wsPort);
      await H.unfoldBand(P);
      await P.page.evaluate(() => {
        try { window.__broDashPanelBus.toBar(); } catch (e) { /* at rest */ }
        const g = window.__btGearTab;
        if (g) { g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); }
      });
      await P.page.waitForTimeout(1200);
      const clip = await bandClip(P, 390, 844, 60);
      const shot = async (name, want, tag) => {
        await P.page.waitForTimeout(700);
        const v = await P.page.evaluate(() => (document.querySelector('[data-gear-pane="bro"]') || { getAttribute: () => null }).getAttribute('data-gear-view'));
        const f = `${OUT}/gear-tab-${name}.png`;
        await P.page.screenshot({ path: f, clip });
        shots.push(f);
        rec.ok(`[390x844] ${tag}: the card shows the ${want}, pictured`, v === want, v);
      };
      /* a level-up through the worker's own XP path, so the levels read
         as a played character's */
      await H.devOp(wsPort, 'kit', await H.readState(P, (S) => S.myId), { what: 'levels' }).catch(() => null);
      await P.page.waitForTimeout(2500);
      await shot('overview', 'overview', 'nothing picked');
      /* a stack in the bag: the ore */
      const ore = await P.page.evaluate(() => { const t = document.querySelector('[data-gear-bag] [data-bag-key^="i-ore_"]'); return t ? t.getAttribute('data-bag-key') : null; });
      if (ore) await tapEl(P, `[data-gear-bag] [data-bag-key="${ore}"]`);
      await shot('item', 'item', 'the ore tapped');
      await tapEl(P, `[data-gear-bag] [data-bag-key="${ore}"]`);
      /* a weapon from the bag, compared against the one worn: the spare
         greatsword (its key off the bag's own probe) */
      const spare = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
        return i >= 0 ? 'stashWeapon-' + i : null;
      });
      if (spare) {
        await P.page.evaluate((k) => { const t = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (t) t.scrollIntoView({ block: 'nearest' }); }, spare);
        await tapEl(P, `[data-gear-bag] [data-bag-key="${spare}"]`);
      }
      await shot('gear', 'item', 'a bag greatsword compared');
      if (spare) await tapEl(P, `[data-gear-bag] [data-bag-key="${spare}"]`);
      /* v2.3.4191: a rare chest from the bag, against what is worn; then its
         "⋯" open */
      const chest = await P.page.evaluate(() => {
        const t = [...document.querySelectorAll('[data-gear-bag] [data-bag-key^="stashArmor-"]')].find((x) => !x.hasAttribute('data-unrevealed'));
        return t ? t.getAttribute('data-bag-key') : null;
      });
      if (chest) {
        await P.page.evaluate((k) => { const t = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (t) t.scrollIntoView({ block: 'nearest' }); }, chest);
        await tapEl(P, `[data-gear-bag] [data-bag-key="${chest}"]`);
      }
      const stars = await P.page.evaluate(() => (document.querySelector('[data-gear-stars]') || { getAttribute: () => null }).getAttribute('data-gear-stars'));
      await shot('armour', 'item', `a bag chest (${stars} stars) compared`);
      await tapEl(P, '[data-gear-pane="bro"] [data-gear-act="more"]');
      {
        await P.page.waitForTimeout(500);
        const open = await P.page.evaluate(() => !!document.querySelector('[data-gear-more-menu]'));
        const f = `${OUT}/gear-tab-more.png`;
        await P.page.screenshot({ path: f, clip });
        shots.push(f);
        rec.ok('[390x844] the card\'s "⋯" open, pictured', open, open);
      }
      await P.page.evaluate(() => window.__btGearTab.bus.afterChange());
      /* the Sword slot: the bag filtered to swords, the card the sword */
      await tapEl(P, '[data-gear-cell="sword"]');
      await shot('slot', 'item', 'the Sword slot tapped');
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* ══ v2.3.4151: inside the one band (Lane B's PR #1410, here by its
     ?oneband=1, the default since): a computer with the band open, and a
     sideways phone with the band opened by a tap -- the short band, both
     grids one row of nine ══ */
  for (const o of [
    { name: 'desk', viewport: { width: 1280, height: 800 }, wide: true },
    { name: 'oneband-desk', viewport: { width: 1280, height: 720 }, wide: true },
    { name: 'oneband-sideways', viewport: { width: 844, height: 390 }, touch: true },
  ]) {
    const P = await H.newPlayer(browser, { name: 'Oneg' + o.name.slice(8, 12), wsPort, webPort, world: 'wheel', viewport: o.viewport, touch: !!o.touch, wide: !!o.wide, query: 'oneband=1' });
    try {
      await H.enterWorld(P);
      await seed(P, wsPort);
      await H.unfoldBand(P);
      await P.page.evaluate(() => {
        try { if (window.__broDashPanelBus.state.mode !== 'bar') window.__broDashPanelBus.toBar(); } catch (e) { /* at rest */ }
        const g = window.__btGearTab;
        if (g) { g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); }
      });
      await P.page.waitForTimeout(1800);
      const f = `${OUT}/gear-tab-${o.name}.png`;
      await P.page.screenshot({ path: f });
      shots.push(f);
      const inBand = await P.page.evaluate(() => !!document.querySelector('[data-one-band-cols] [data-gear-tab]'));
      /* v2.3.4191: what the picture shows, in numbers -- the tab's width, the
         squares', the card's and the bro's (the brief asks the square size) */
      const m = await P.page.evaluate(() => {
        const w = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : null; };
        const f = document.querySelector('[data-gear-figure]');
        return { tab: w('[data-gear-tab]'), box: w('[data-band-box="cols"]'), square: w('[data-gear-cell]'), bag: w('[data-gear-pane="inv"]'), card: w('[data-gear-pane="bro"]'), gear: w('[data-gear-pane="equip"]'), bro: f ? Number(f.getAttribute('data-size')) : null };
      });
      console.log(`[${o.name}] measured: ${JSON.stringify(m)}`);
      rec.ok(`[${o.name}] the Gear tab in the one band, pictured (tab ${m.tab} px in a ${m.box} px block, squares ${m.square} px, card ${m.card} px)`, inBand, { inBand, m });
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* 256 colours, lossless webp, into docs/shots */
  try {
    const out = execFileSync('python3', [`${H.REPO}/tools/qa/mp/gear_shots.py`, DOCS, ...shots], { encoding: 'utf8' });
    console.log(out.trim());
    rec.ok('the nine pictures saved to docs/shots at 256 colours', /saved 9/.test(out), out.trim());
  } catch (e) {
    rec.ok('the nine pictures saved to docs/shots at 256 colours', false, String(e).slice(0, 300));
  }
}
