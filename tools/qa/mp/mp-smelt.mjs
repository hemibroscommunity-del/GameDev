/* SMELTING AT THE BLACKSMITH (v2.3.2822)
 *
 * Owner, with the bar art: "Make one bar require 5 copper ore.  You get xp for
 * each time you smelt it into a bar."
 *
 * A real client against a real worker, through the real door:
 *   1. Walk to the Blacksmith's door in the Wheel's BroTown (v2.3.3912: it
 *      played the retired old map until then), enter -- the Smelting rows
 *      are there.
 *   2. Smelt takes 1 copper ore (v2.3.3912, the owner's one-to-one; it was 5)
 *      and gives 1 Copper Bar, and Smithing XP goes up by the row's promised
 *      amount (80).
 *   3. Smelt all makes every bar the ore pays for, in one request.
 *   4. A double-tap is ONE smelt (the phone accident).
 *   5. Short of ore, the button says how many more and does nothing.
 *   6. The bar has its picture in the bag.
 */
import * as H from './harness.mjs';
import { skillXpRequired } from '../../../src/data/items.js'; /* v2.3.3090: the game's own life-skill curve */

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/smelt-${name}.png` }).catch(() => {});
const bag = (P) => H.readState(P, (S) => {
  const inv = (S.rpg && S.rpg.inventory) || {};
  const bs = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.blacksmithing) || {};
  return { ore: inv.ore_copper_ore || 0, bar: inv.bar_copper || 0, lvl: bs.level || 0, xp: bs.xp || 0 };
});
/* Total XP ever earned at a level/xp pair, on the shared curve
   (skillXpRequired per level: 1000 * 1.08^(L-1) since v2.3.3090), so a
   level-up mid-test still compares. */
const totalXp = (b) => {
  let t = b.xp;
  for (let L = 1; L < (b.lvl || 1); L++) t += skillXpRequired(L);
  return t;
};
const waitBag = (P, pred, ms = 6000) => P.page.waitForFunction((src) => {
  const S = window._gameState.current;
  const inv = (S.rpg && S.rpg.inventory) || {};
  return new Function('ore', 'bar', 'return ' + src)(inv.ore_copper_ore || 0, inv.bar_copper || 0);
}, pred, { timeout: ms }).then(() => true).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  /* v2.3.3912: in the Wheel, a phone (it played the retired old map) */
  const P = await H.newPlayer(browser, { name: 'Smith', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) { await P.ctx.close().catch(() => {}); return; }
  await P.page.waitForTimeout(1500);
  /* The day's chest window opens by itself; "Later" keeps it and clears the way. */
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }

  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.smelting));
  rec.ok('the worker advertises caps.smelting', caps);
  /* v2.3.3912: and one ore a bar (caps.onetoone) */
  const one1 = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.onetoone));
  rec.ok('the worker advertises caps.onetoone', one1);

  const me = await H.readState(P, (S) => S.myId);
  /* every quest handed in, so no one stops us in the street (mp-hardenbars) */
  await H.devOp(wsPort, 'quests', me, {});
  await P.page.waitForFunction(() => { const q = (window._gameState.current.rpg || {})._quests || {}; return q.tut_1 === 'turnedIn'; }, null, { timeout: 8000 }).catch(() => {});
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(800);
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 3 });
  await waitBag(P, 'ore === 3', 8000);
  const barsAtStart = (await bag(P)).bar;

  /* ── 1. The door ── */
  const doors = await H.waitFor(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []), (d) => d.length > 0,
    { timeout: 20000, label: 'the town\'s doors' }).catch(() => []);
  const smith = doors.find((d) => d.id === 'blacksmith') || null;
  rec.ok('the Blacksmith has a door in BroTown', !!smith, doors.map((d) => d.id));
  if (!smith) { await P.ctx.close().catch(() => {}); return; }
  const standAt = async (x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
    }
    return false;
  };
  await standAt(smith.x, smith.y + 30);
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  await P.page.waitForSelector('[data-smithy]', { timeout: 6000 }).catch(() => {});
  await P.page.click('[data-smithy-tab="smelt"]').catch(() => {});
  const opened = await P.page.waitForSelector('[data-smelt-row="bar_copper"]', { timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('entering the Blacksmith\'s door shows the Smelting row', opened);
  if (!opened) { await shot(P, 'no-panel'); await P.ctx.close().catch(() => {}); return; }
  const row = await P.page.$eval('[data-smelt-row="bar_copper"]', (el) => el.innerText);
  rec.ok('...which shows the ore it takes (3/1) and the XP it pays (+80)', /3\/1/.test(row) && /\+80/.test(row), row);
  const iconOk = await P.page.$eval('[data-smelt-row="bar_copper"] img', (im) => im.complete && im.naturalWidth > 0).catch(() => false);
  rec.ok('...with the copper bar picture', iconOk);
  rec.ok('...and "All (3)" for 3 ore', !!(await P.page.$('[data-smelt-all="bar_copper"]'))
    && /All \(3\)/.test(await P.page.$eval('[data-smelt-all="bar_copper"]', (b) => b.textContent)));
  await shot(P, 'panel');

  /* ── 2. One smelt ── */
  const b0 = await bag(P);
  await P.page.click('[data-smelt-one="bar_copper"]');
  const one = await waitBag(P, 'ore === 2 && bar === ' + (barsAtStart + 1));
  const b1 = await bag(P);
  rec.ok('Smelt: 1 copper ore became 1 Copper Bar (settled by the worker)', one, b1);
  rec.ok('...and Smithing XP went up by exactly 80', totalXp(b1) - totalXp(b0) === 80, { b0, b1 });
  await P.page.waitForTimeout(250);
  await shot(P, 'smelted');

  /* ── 3. Smelt all ── */
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 1 });   /* 3 ore -> 3 bars */
  await waitBag(P, 'ore === 3');
  await P.page.waitForFunction(() => /All \(3\)/.test((document.querySelector('[data-smelt-all="bar_copper"]') || {}).textContent || ''), null, { timeout: 4000 }).catch(() => {});
  await P.page.click('[data-smelt-all="bar_copper"]');
  const all = await waitBag(P, 'ore === 0 && bar === ' + (barsAtStart + 4));
  const b2 = await bag(P);
  rec.ok('Smelt all: 3 ore made 3 bars', all, b2);
  await P.page.waitForTimeout(250);
  await shot(P, 'smelt-all');
  rec.ok('...paying XP for each bar (3 x 80)', totalXp(b2) - totalXp(b1) === 240, { b1, b2 });

  /* ── 5. Short of ore ── */
  const short = await P.page.$eval('[data-smelt-one="bar_copper"]', (b) => ({ t: b.textContent, d: b.disabled }));
  const shortRow = await P.page.$eval('[data-smelt-row="bar_copper"]', (el) => el.innerText);
  rec.ok('with no ore the Smelt button is off and the cost reads 0/1', short.d && /0\/1/.test(shortRow), { short, shortRow });

  /* ── 4. A double-tap is one smelt ── */
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 2 });    /* 2 ore -> room for 2 */
  await waitBag(P, 'ore === 2');
  await P.page.waitForFunction(() => { const b = document.querySelector('[data-smelt-one="bar_copper"]'); return b && !b.disabled; }, null, { timeout: 4000 }).catch(() => {});
  await P.page.dblclick('[data-smelt-one="bar_copper"]');
  await waitBag(P, 'bar >= ' + (barsAtStart + 5));
  await P.page.waitForTimeout(1200);
  const b3 = await bag(P);
  rec.ok('a double-tap on Smelt makes ONE bar, not two', b3.bar === barsAtStart + 5 && b3.ore === 1, b3);

  /* ── 6. The bag ── */
  const art = await P.page.evaluate(async () => {
    const r = await fetch('/icons/items/bar-copper.webp').catch(() => null);
    return r ? { ok: r.ok, type: r.headers.get('content-type') } : null;
  });
  rec.ok('the bar\'s bag picture ships with the build', !!art && art.ok && /image/.test(art.type || ''), art);
  rec.ok('...and the row names it "Copper Bar", not "Bar Copper"', /Copper Bar/.test(row) && !/Bar Copper/.test(row), row);

  await P.ctx.close().catch(() => {});
}
