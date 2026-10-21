/* ═══ ARMOUR ASKS YOUR LEVEL, ON A REAL PAGE (v2.3.3544, docs/specs/gear-level.md) ═══
 *
 * The owner, of one level: "I'm thinking of gating armor and weapons on combat
 * level instead of primary combat skill level and defense level."  What you
 * wear asks the CHARACTER level (one level: the best weapon's) at the numbers
 * it asked in Defense points.  A real client against a real worker, through
 * the real doors, IN THE WORLD (v2.3.3552: `world: 'wheel'` -- the old map,
 * where this was first written, is retired; tools/qa/mp/oldMap.mjs):
 *   1. the worker advertises caps.gearlevel;
 *   2. the Blacksmith's Armor tab says the Black Steel Torso is "Level 5 to
 *      wear" (not "Defense 5"), and forges it into the bag with its id;
 *   3. at level 1 its card says "Needs level 5 (you are 1)", and Equip refuses
 *      it in words ("NEEDS LEVEL 5"): it stays in the bag and the worker wears
 *      nothing new;
 *   4. at Melee 5 -- no Defense point spent -- Equip puts it on, and the
 *      WORKER holds it (so it stops damage);
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/gearlevel-{tab,card,worn}.png.
 */
import * as H from './harness.mjs';

const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/gearlevel-${name}.png` }).catch(() => {});
const torsoInBag = (P) => H.readState(P, (S) => {
  const list = (S.rpg && S.rpg.armorStash) || [];
  const i = list.findIndex((p) => p && p.name === 'Black Steel Torso');
  return i >= 0 ? { index: i, gid: list[i].gid || null } : null;
});
const openCard = (P) => P.page.evaluate(() => {
  const bus = window._itemDetailBus;
  const S = window._gameState && window._gameState.current;
  if (!bus || !S) return false;
  const list = S.rpg.armorStash || [];
  const i = list.findIndex((p) => p && p.name === 'Black Steel Torso');
  if (i < 0) return false;
  bus.open({ kind: 'stashArmor', armor: list[i], index: i });
  return true;
});
const words = (P) => P.page.evaluate(() => ((window._gameState.current || {}).dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean)).catch(() => []);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Plated', wsPort, webPort, world: 'wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.gearlevel));
  rec.ok('the worker advertises caps.gearlevel', caps);
  if (!caps) { await P.ctx.close().catch(() => {}); return; }

  const me = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, me, 'item', { invKey: 'bar_black_steel', count: 5 });
  await H.devOp(wsPort, 'lifeskill', me, { skill: 'blacksmithing', level: 10 });
  await P.page.waitForFunction(() => {
    const R = window._gameState.current.rpg || {};
    return (R.inventory || {}).bar_black_steel === 5 && R.lifeSkills && R.lifeSkills.blacksmithing && R.lifeSkills.blacksmithing.level >= 10;
  }, null, { timeout: 8000 }).catch(() => {});

  /* ── 2. the forge's word, and the torso ── */
  await P.page.waitForFunction(() => !document.body.innerText.includes('WELCOME'), null, { timeout: 15000 }).catch(() => {});
  /* the world's Blacksmith: stand at the foot of its steps and press Enter,
     as a player does (mp-hardenbars' way in) */
  const doors = await H.waitFor(P, () => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []), (d) => d.length > 0,
    { timeout: 20000, label: 'the town\'s doors' }).catch(() => []);
  const smith = doors.find((d) => d.id === 'blacksmith') || null;
  const zone = await H.readState(P, (S) => S.currentZone);
  if (!smith) { rec.ok(`the Blacksmith has a door in the world (guard; zone "${zone}")`, false, doors.map((d) => d.id)); await P.ctx.close().catch(() => {}); return; }
  for (let k = 0; k < 4; k++) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, smith.x, smith.y + 30 - dy, { step: 100, gap: 260, tries: 90 });
    await P.page.waitForTimeout(800);
    const g = await P.page.evaluate(() => window.__btPlayerGround());
    if (Math.hypot(g.x - smith.x, g.y - (smith.y + 30)) < 14) break;
  }
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  await P.page.waitForSelector('[data-smithy-tab="armor"]', { timeout: 6000 }).catch(() => {});
  rec.ok(`in the world (zone "${zone}"), the Blacksmith's door opens the forge`, zone === 'wheel' && !!(await P.page.$('[data-smithy-tab="armor"]')), { zone });
  await P.page.click('[data-smithy-tab="armor"]').catch(() => {});
  await P.page.waitForSelector('[data-armor-row="blacksteel_torso"]', { timeout: 5000 }).catch(() => {});
  const row = await P.page.evaluate(() => {
    const el = document.querySelector('[data-armor-row="blacksteel_torso"]');
    return el ? el.innerText.replace(/\s+/g, ' ') : null;
  });
  await shot(P, 'tab');
  rec.ok(`the Armor tab says what wearing black steel asks: your level ("${row}")`,
    !!row && /Level 5 to wear/.test(row) && !/Defense \d+ to wear/.test(row), row);
  await P.page.click('[data-armor-go="blacksteel_torso"]').catch(() => {});
  let bag = null;
  for (let i = 0; i < 20 && !(bag && bag.gid); i++) { bag = await torsoInBag(P); if (!(bag && bag.gid)) await P.page.waitForTimeout(300); }
  rec.ok('...and forges a Black Steel Torso into the bag, with the worker\'s id', !!bag && typeof bag.gid === 'string', bag);
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(500);

  /* ── 3. at level 1: the card's words, and a refusal in words ── */
  const lv1 = await H.devOp(wsPort, 'combat', me, { skill: 'all', level: 1 });
  await P.page.waitForTimeout(800);
  await openCard(P);
  await P.page.waitForTimeout(600);
  const card = await P.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
  /* the card's line is drawn in capitals (CSS), so read without case */
  const cardLine = (card.match(/· Chest · Needs[^)]*\)?/i) || [null])[0];
  await shot(P, 'card');
  rec.ok(`at level 1 its card says what it asks: "${cardLine}"`,
    !!lv1 && lv1.ok && /Needs level 5 \(you are 1\)/i.test(card) && !/Needs 5 Defense/i.test(card), { lv1, cardLine });
  await H.clickText(P, 'Equip').catch(() => {});
  let said = [];
  for (let i = 0; i < 30 && !said.some((w) => /NEEDS LEVEL 5/.test(w)); i++) {
    for (const w of await words(P)) if (!said.includes(w)) said.push(w);
    if (!said.some((w) => /NEEDS LEVEL 5/.test(w))) await P.page.waitForTimeout(100);
  }
  await P.page.waitForTimeout(1200);
  const srv1 = await H.adminPlayer(wsPort, me).catch(() => null);
  const still = await torsoInBag(P);
  rec.ok('...and Equip refuses it in words ("NEEDS LEVEL 5"): it stays in the bag, the worker wears nothing new',
    said.some((w) => /NEEDS LEVEL 5/.test(w)) && !!still
      && !(srv1 && srv1.rpg && srv1.rpg.armor && srv1.rpg.armor.name === 'Black Steel Torso'),
    { said, still, worn: srv1 && srv1.rpg && srv1.rpg.armor });

  /* ── 4. at Melee 5, no Defense point: on ── */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(400);
  const lv5 = await H.devOp(wsPort, 'combat', me, { skill: 'sword', level: 5 });
  await P.page.waitForFunction(() => {
    const p3 = (window._gameState.current.rpg || {}).prog3;
    return !!(p3 && p3.sk && p3.sk.sword && p3.sk.sword.level === 5);
  }, null, { timeout: 8000 }).catch(() => {});
  const def = await H.readState(P, (S) => ((S.rpg.prog3 || {}).alloc || {}).def || 0);
  await openCard(P);
  await P.page.waitForTimeout(600);
  await H.clickText(P, 'Equip').catch(() => {});
  let srv5 = null;
  for (let i = 0; i < 20; i++) {
    srv5 = await H.adminPlayer(wsPort, me).catch(() => null);
    if (srv5 && srv5.rpg && srv5.rpg.armor && srv5.rpg.armor.name === 'Black Steel Torso') break;
    await P.page.waitForTimeout(300);
  }
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(400);
  await shot(P, 'worn');
  rec.ok(`at Melee 5 (level ${lv5 && lv5.charLevel}, ${def} Defense points) Equip puts it on, and the WORKER holds it`,
    !!lv5 && lv5.charLevel === 5 && def === 0 && !!srv5 && !!srv5.rpg && !!srv5.rpg.armor && srv5.rpg.armor.name === 'Black Steel Torso',
    { lv5, def, worn: srv5 && srv5.rpg && srv5.rpg.armor });

  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
