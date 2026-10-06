/* BARS INTO ARMOR AT THE BLACKSMITH (v2.3.3092)
 *
 * Asked "Should smelted bars make armour?", the owner said "Yes".
 *
 * A real client against a real worker, through the real door:
 *   1. the worker advertises caps.armorforge, and the Blacksmith has an Armor
 *      tab -- copper's torso and greaves to make, iron's two shown locked
 *      ("Smithing 5"), each row with its bars HAVE/NEED, what it stops and the
 *      XP it pays, and the bar pictures shipped;
 *   2. Forge on the copper torso: four bars gone (v2.3.3126: four a piece), a Copper Torso in the bag
 *      with the worker's id, its metal and a grade, "BAG: Copper Torso", and
 *      Smithing XP up by the row's promise;
 *   3. the greaves: four bars too, into the legs' bag;
 *   4. out of bars, Forge is off and the cost reads 0/4;
 *   5. the bars' bag names ("Iron Bar", not "Bar Iron").
 * Pictures: tools/qa/mp/out/armorforge-*.png.
 */
import * as H from './harness.mjs';
import { skillXpRequired } from '../../../src/data/items.js';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/armorforge-${name}.png` }).catch(() => {});
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const bag = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  const bs = (R.lifeSkills && R.lifeSkills.blacksmithing) || {};
  const pick = (p) => (p ? { name: p.name, gid: p.gid || null, mat: p.mat || null, tierMult: p.tierMult, quality: p.quality || null, slot: p.slot } : null);
  return {
    bars: (R.inventory || {}).bar_copper || 0, lvl: bs.level || 0, xp: bs.xp || 0,
    torsos: (R.armorStash || []).filter((p) => p && p.name === 'Copper Torso').map(pick),
    greaves: (R.legsStash || []).filter((p) => p && p.name === 'Copper Greaves').map(pick),
  };
});
/* all the Smithing XP ever earned, on the game's own curve */
const totalXp = (b) => { let t = b.xp; for (let L = 1; L < (b.lvl || 1); L++) t += skillXpRequired(L); return t; };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Armorer', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.armorforge));
  rec.ok('the worker advertises caps.armorforge', caps);
  if (!caps) { await P.ctx.close().catch(() => {}); return; }

  const me = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, me, 'item', { invKey: 'bar_copper', count: 8 });
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).bar_copper === 8, null, { timeout: 6000 }).catch(() => {});

  /* ── 1. the door, the tab ── */
  await P.page.waitForFunction(() => !document.body.innerText.includes('WELCOME'), null, { timeout: 15000 }).catch(() => {});
  const forge = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.action === 'forge') || null);
  if (!forge) { rec.ok('the Blacksmith building is in town (guard)', false); await P.ctx.close().catch(() => {}); return; }
  await put(P, forge.x, forge.y + 55);
  await P.page.waitForTimeout(500);
  await P.page.keyboard.press('e');
  const opened = await P.page.waitForSelector('[data-smithy-tab="armor"]', { timeout: 5000 }).then(() => true).catch(() => false);
  const tabs = opened ? await P.page.$$eval('[data-smithy-tab]', (b) => b.map((x) => x.getAttribute('data-smithy-tab'))) : [];
  rec.ok(`the Blacksmith has an Armor tab, beside Forge (${tabs.join(', ')})`, opened && tabs.indexOf('armor') === tabs.indexOf('forge') + 1, tabs);
  if (!opened) { await shot(P, 'no-tab'); await P.ctx.close().catch(() => {}); return; }
  await P.page.click('[data-smithy-tab="armor"]');
  await P.page.waitForSelector('[data-armor-row="copper_torso"]', { timeout: 4000 }).catch(() => {});
  const rows = await P.page.$$eval('[data-armor-row]', (els) => els.map((el) => ({
    key: el.getAttribute('data-armor-row'), text: el.innerText.replace(/\s+/g, ' '),
    go: (() => { const b = el.querySelector('[data-armor-go]'); return b ? { t: b.textContent, d: b.disabled } : null; })(),
    img: (() => { const im = el.querySelector('img'); return !!(im && im.complete && im.naturalWidth > 0); })(),
  })));
  const row = (k) => rows.find((r) => r.key === k) || null;
  const torso = row('copper_torso'), irn = row('iron_torso');
  rec.ok(`copper's torso and greaves to make, iron's shown locked: ${rows.map((r) => r.key).join(', ')}`,
    !!torso && !!row('copper_greaves') && !!irn && !!row('iron_greaves') && !row('blacksteel_torso')
    && /Smithing 5/.test(irn.text) && irn.go && irn.go.d && /Locked/.test(irn.go.t), rows);
  rec.ok(`...the torso row: its bars (8/4), what it stops and its XP ("${torso && torso.text}")`,
    !!torso && /8\/4/.test(torso.text) && /-\d+(\.\d)?%/.test(torso.text) && /\+800/.test(torso.text) && torso.go && !torso.go.d && torso.img, torso);
  await shot(P, 'tab');

  /* ── 2. a copper torso ── */
  const b0 = await bag(P);
  await P.page.click('[data-armor-go="copper_torso"]');
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).bar_copper === 4, null, { timeout: 6000 }).catch(() => {});
  let b1 = null;
  for (let i = 0; i < 12; i++) { b1 = await bag(P); if (b1.torsos.length > b0.torsos.length) break; await P.page.waitForTimeout(300); }
  const t = b1.torsos[b1.torsos.length - 1] || null;
  const told = await P.page.evaluate(() => ({ forged: window.__btArmorForged || null,
    popups: ((window._gameState.current.dmgNumbers) || []).map((d) => d && d.text).filter(Boolean) }));
  rec.ok(`Forge: four copper bars became a Copper Torso in the bag (${b0.bars} -> ${b1.bars}), the worker's piece: its id, copper, a ${t && t.quality} grade`,
    b1.bars === 4 && !!t && typeof t.gid === 'string' && t.mat === 'copper' && t.tierMult === 1 && !!t.quality
    && !!told.forged && told.forged.piece && told.forged.piece.gid === t.gid, { b1, told });
  rec.ok(`...said over the smith ("${told.popups.filter((x) => /BAG|Smithing/.test(x)).join('", "')}")`,
    told.popups.some((x) => /BAG: Copper Torso/.test(x)) && told.popups.some((x) => /\+800 Smithing XP/.test(x)), told.popups);
  rec.ok(`...and Smithing XP went up by exactly 800 (Lv ${b0.lvl} -> ${b1.lvl})`, totalXp(b1) - totalXp(b0) === 800, { b0, b1 });
  await P.page.waitForTimeout(400);
  await shot(P, 'torso');

  /* ── 3. the greaves ── */
  await P.page.waitForFunction(() => { const b = document.querySelector('[data-armor-go="copper_greaves"]'); return b && !b.disabled; }, null, { timeout: 4000 }).catch(() => {});
  await P.page.click('[data-armor-go="copper_greaves"]');
  let b2 = null;
  for (let i = 0; i < 20; i++) { b2 = await bag(P); if (b2.greaves.length > b1.greaves.length && b2.bars === 0) break; await P.page.waitForTimeout(300); }
  const g = b2.greaves[b2.greaves.length - 1] || null;
  rec.ok('the greaves: the last four bars, Copper Greaves in the legs\' bag', b2.bars === 0 && !!g && g.slot === 'legsArmor' && typeof g.gid === 'string', b2);

  /* ── 4. out of bars ── */
  await P.page.waitForTimeout(600);
  const out = await P.page.$eval('[data-armor-row="copper_torso"]', (el) => ({ text: el.innerText.replace(/\s+/g, ' '),
    d: el.querySelector('[data-armor-go]').disabled }));
  rec.ok('out of bars: Forge is off and the cost reads 0/4', out.d && /0\/4/.test(out.text), out);

  /* ── 5. the bars' names and pictures ── */
  const art = await P.page.evaluate(async () => {
    const one = async (u) => { const r = await fetch(u).catch(() => null); return !!(r && r.ok && /image/.test(r.headers.get('content-type') || '')); };
    return { iron: await one('/icons/items/bar-iron.webp'), blacksteel: await one('/icons/items/bar-blacksteel.webp') };
  });
  rec.ok('the iron and black steel bars\' pictures ship with the build', art.iron && art.blacksteel, art);
  const names = await P.page.evaluate(() => {
    const el = document.querySelector('[data-armor-row="iron_torso"]');
    return el ? el.innerText : '';
  });
  rec.ok('...and the panel names the armor, not the bar\'s key', /Iron Torso/.test(names) && !/bar_iron/.test(names), names);
  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
