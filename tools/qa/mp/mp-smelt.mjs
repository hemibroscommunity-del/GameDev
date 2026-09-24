/* SMELTING AT THE BLACKSMITH (v2.3.2822)
 *
 * Owner, with the bar art: "Make one bar require 5 copper ore.  You get xp for
 * each time you smelt it into a bar."
 *
 * A real client against a real worker, through the real door:
 *   1. Walk to the Blacksmith's door, press E -- the Smelting rows are there.
 *   2. Smelt takes 5 copper ore and gives 1 Copper Bar, and Smithing XP goes
 *      up by the row's promised amount.
 *   3. Smelt all makes every bar the ore pays for, in one request.
 *   4. A double-tap is ONE smelt (the phone accident).
 *   5. Short of ore, the button says how many more and does nothing.
 *   6. The bar has its picture in the bag.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/smelt-${name}.png` }).catch(() => {});
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const bag = (P) => H.readState(P, (S) => {
  const inv = (S.rpg && S.rpg.inventory) || {};
  const bs = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.blacksmithing) || {};
  return { ore: inv.ore_copper_ore || 0, bar: inv.bar_copper || 0, lvl: bs.level || 0, xp: bs.xp || 0 };
});
/* Total XP ever earned at a level/xp pair, on the shared curve
   (ceil(500 * 1.08^(L-1)) per level), so a level-up mid-test still compares. */
const totalXp = (b) => {
  let t = b.xp;
  for (let L = 1; L < (b.lvl || 1); L++) t += Math.ceil(500 * Math.pow(1.08, L - 1));
  return t;
};
const waitBag = (P, pred, ms = 6000) => P.page.waitForFunction((src) => {
  const S = window._gameState.current;
  const inv = (S.rpg && S.rpg.inventory) || {};
  return new Function('ore', 'bar', 'return ' + src)(inv.ore_copper_ore || 0, inv.bar_copper || 0);
}, pred, { timeout: ms }).then(() => true).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Smith', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  /* The day's chest window opens by itself; "Later" keeps it and clears the way. */
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }

  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.smelting));
  rec.ok('the worker advertises caps.smelting', caps);

  const me = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 12 });
  await waitBag(P, 'ore === 12');

  /* ── 1. The door ── */
  /* The zone's WELCOME card sits over the middle of the screen for its first
     few seconds; wait it out so the screenshots show the panel. */
  await P.page.waitForFunction(() => !document.body.innerText.includes('WELCOME'), null, { timeout: 15000 }).catch(() => {});
  const forge = await P.page.evaluate(() =>
    (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.action === 'forge') || null);
  rec.ok('the Blacksmith building is in town', !!forge, forge);
  if (!forge) { await P.ctx.close().catch(() => {}); return; }
  await put(P, forge.x, forge.y + 55);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.press('e');
  const opened = await P.page.waitForSelector('[data-smelt-row="bar_copper"]', { timeout: 5000 }).then(() => true).catch(() => false);
  rec.ok('pressing E at the Blacksmith door shows the Smelting row', opened);
  if (!opened) { await shot(P, 'no-panel'); await P.ctx.close().catch(() => {}); return; }
  const row = await P.page.$eval('[data-smelt-row="bar_copper"]', (el) => el.innerText);
  rec.ok('...which shows the ore it takes (12/5) and the XP it pays (+400)', /12\/5/.test(row) && /\+400/.test(row), row);
  const iconOk = await P.page.$eval('[data-smelt-row="bar_copper"] img', (im) => im.complete && im.naturalWidth > 0).catch(() => false);
  rec.ok('...with the copper bar picture', iconOk);
  rec.ok('...and "All (2)" for 12 ore', !!(await P.page.$('[data-smelt-all="bar_copper"]'))
    && /All \(2\)/.test(await P.page.$eval('[data-smelt-all="bar_copper"]', (b) => b.textContent)));
  await shot(P, 'panel');

  /* ── 2. One smelt ── */
  const b0 = await bag(P);
  await P.page.click('[data-smelt-one="bar_copper"]');
  const one = await waitBag(P, 'ore === 7 && bar === 1');
  const b1 = await bag(P);
  rec.ok('Smelt: 5 copper ore became 1 Copper Bar (settled by the worker)', one, b1);
  rec.ok('...and Smithing XP went up by exactly 400', totalXp(b1) - totalXp(b0) === 400, { b0, b1 });
  await P.page.waitForTimeout(250);
  await shot(P, 'smelted');

  /* ── 3. Smelt all ── */
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 10 });   /* 17 ore -> 3 bars */
  await waitBag(P, 'ore === 17');
  await P.page.waitForFunction(() => /All \(3\)/.test((document.querySelector('[data-smelt-all="bar_copper"]') || {}).textContent || ''), null, { timeout: 4000 }).catch(() => {});
  await P.page.click('[data-smelt-all="bar_copper"]');
  const all = await waitBag(P, 'ore === 2 && bar === 4');
  const b2 = await bag(P);
  rec.ok('Smelt all: 17 ore made 3 bars and left 2 ore', all, b2);
  await P.page.waitForTimeout(250);
  await shot(P, 'smelt-all');
  rec.ok('...paying XP for each bar (3 x 400)', totalXp(b2) - totalXp(b1) === 1200, { b1, b2 });

  /* ── 5. Short of ore ── */
  const short = await P.page.$eval('[data-smelt-one="bar_copper"]', (b) => ({ t: b.textContent, d: b.disabled }));
  const shortRow = await P.page.$eval('[data-smelt-row="bar_copper"]', (el) => el.innerText);
  rec.ok('with 2 ore the Smelt button is off and the cost reads 2/5', short.d && /2\/5/.test(shortRow), { short, shortRow });

  /* ── 4. A double-tap is one smelt ── */
  await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: 8 });    /* 10 ore -> room for 2 */
  await waitBag(P, 'ore === 10');
  await P.page.waitForFunction(() => { const b = document.querySelector('[data-smelt-one="bar_copper"]'); return b && !b.disabled; }, null, { timeout: 4000 }).catch(() => {});
  await P.page.dblclick('[data-smelt-one="bar_copper"]');
  await waitBag(P, 'bar >= 5');
  await P.page.waitForTimeout(1200);
  const b3 = await bag(P);
  rec.ok('a double-tap on Smelt makes ONE bar, not two', b3.bar === 5 && b3.ore === 5, b3);

  /* ── 6. The bag ── */
  const art = await P.page.evaluate(async () => {
    const r = await fetch('/icons/items/bar-copper.webp').catch(() => null);
    return r ? { ok: r.ok, type: r.headers.get('content-type') } : null;
  });
  rec.ok('the bar\'s bag picture ships with the build', !!art && art.ok && /image/.test(art.type || ''), art);
  rec.ok('...and the row names it "Copper Bar", not "Bar Copper"', /Copper Bar/.test(row) && !/Bar Copper/.test(row), row);

  await P.ctx.close().catch(() => {});
}
