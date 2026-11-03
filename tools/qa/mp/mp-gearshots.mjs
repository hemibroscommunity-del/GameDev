/* ═══ mp-gearshots (v2.3.4061): THE GEAR TAB'S PICTURES FOR THE DOCS ═══
 *
 * The owner's mockup (2026-11-03): three panels, the bag | LOOK, STATS or
 * DETAILS | the gear.  This scenario plays the real tab in the Wheel's
 * BroTown and saves the four pictures docs/UI-DESIGN-NOTES.md shows:
 *
 *   docs/shots/gear-tab-look.webp     upright phone (390 x 844, touch), LOOK
 *   docs/shots/gear-tab-stats.webp    ...STATS
 *   docs/shots/gear-tab-details.webp  ...a spare sword in the bag tapped (DETAILS)
 *   docs/shots/gear-tab-desk.webp     a computer playing wide (1280 x 800), STATS
 *
 * Each the bottom of the screen (the band and a little of the world above),
 * cut to 256 colours and saved as lossless webp (the memory law's 256, and a
 * picture in the repo that is small) by tools/qa/mp/gear_shots.py.  The
 * character holds the test kit's weapons, a spare greatsword, a shield, and a
 * few stacks (ore, logs, fish, a gem, bottles), so the bag is not empty.
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
  for (const [invKey, count] of [['ore_copper_ore', 12], ['bar_iron', 5], ['wood_pine_log', 24], ['fish_minnow', 7], ['gem_fire', 1], ['manaShard', 3], ['whetstone', 2]]) {
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
      for (const view of ['look', 'stats']) {
        await tapEl(P, `[data-gear-tab-btn="${view}"]`);
        await P.page.waitForTimeout(view === 'look' ? 1500 : 600);
        const ok = await P.page.evaluate((v) => (document.querySelector('[data-gear-pane="bro"]') || {}).getAttribute?.('data-gear-view') === v, view);
        const f = `${OUT}/gear-tab-${view}.png`;
        await P.page.screenshot({ path: f, clip });
        shots.push(f);
        rec.ok(`[390x844] ${view.toUpperCase()} shown and pictured`, ok);
      }
      /* DETAILS: the Sword cell (the bag filtered to swords), then the spare */
      await tapEl(P, '[data-gear-cell="sword"]');
      const spare = await P.page.evaluate(() => { const t = document.querySelector('[data-gear-bag] [data-bag-key^="stashWeapon-"]'); return t ? t.getAttribute('data-bag-key') : null; });
      if (spare) await tapEl(P, `[data-gear-bag] [data-bag-key="${spare}"]`);
      const det = await P.page.evaluate(() => (document.querySelector('[data-gear-pane="bro"]') || {}).getAttribute?.('data-gear-view'));
      const f = `${OUT}/gear-tab-details.png`;
      await P.page.screenshot({ path: f, clip });
      shots.push(f);
      rec.ok('[390x844] a bag sword tapped: DETAILS shown and pictured', !!spare && det === 'details', { spare, det });
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* ══ a computer playing wide ══ */
  {
    const P = await H.newPlayer(browser, { name: 'Deska', wsPort, webPort, world: 'wheel', wide: true, viewport: { width: 1280, height: 800 } });
    try {
      await H.enterWorld(P);
      await seed(P, wsPort);
      await P.page.evaluate(() => {
        try { window.__broDashPanelBus.open('dashboard'); } catch (e) { /* no sheet */ }
        const g = window.__btGearTab;
        if (g) { g.bus.afterChange(); g.bus.clearFilter(); g.bus.setMenu(false); g.bus.setTab('stats'); }
      });
      await P.page.waitForTimeout(1800);
      const f = `${OUT}/gear-tab-desk.png`;
      await P.page.screenshot({ path: f });
      shots.push(f);
      const layout = await P.page.evaluate(() => (document.querySelector('[data-gear-tab]') || {}).getAttribute?.('data-gear-layout'));
      rec.ok('[computer] the Gear tab three across in the column, pictured', layout === 'wide', layout);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* 256 colours, lossless webp, into docs/shots */
  try {
    const out = execFileSync('python3', [`${H.REPO}/tools/qa/mp/gear_shots.py`, DOCS, ...shots], { encoding: 'utf8' });
    console.log(out.trim());
    rec.ok('the four pictures saved to docs/shots at 256 colours', /saved 4/.test(out), out.trim());
  } catch (e) {
    rec.ok('the four pictures saved to docs/shots at 256 colours', false, String(e).slice(0, 300));
  }
}
