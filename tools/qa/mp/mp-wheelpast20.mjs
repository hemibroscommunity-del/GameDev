/* ═══ PAST LEVEL 20: EVERY LAND'S SECOND STAGE (v2.3.3084) ═══
 *
 * The owner: "build the world past level 20 (levels 21-40 in each land with
 * their own monsters and resources) You can just recolor existing monsters for
 * now for placeholder monsters.  No preference on colors".
 *
 * On a phone viewport, against a real worker, the game as a player gets it:
 *   1. the Wheel holds every land's second stage too -- tiers 5-8, levels
 *      21-40, 24 monsters a land more -- each carrying its own level;
 *   2. out on Frost Ridge's fifth stretch (levels 21-25), past the first pass,
 *      the top bar says so;
 *   3. the snowmen there are GLACIER SNOWMEN: drawn from the land's own live
 *      art in the stage's icy blue (a sprite tint: src/data/wheelStageLooks.js)
 *      and named so on their plates, with their own levels;
 *   4. a first-stage snowman is still white and still a Snowman;
 *   5. (v2.3.3085) the second stage's resources: a titanium vein there, named
 *      and asking Mining 10, drawn from its own picture, its label grey for a
 *      miner short of it; cedar beside it;
 *   6. no page errors, and no render errors.
 * Pictures in tools/qa/mp/out/wheelpast20-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { WHEEL_STAGE_LOOKS } from '../../../src/data/wheelStageLooks.js';

const PHONE = { width: 390, height: 844 };
const tierOf = (id) => { const m = /-t(\d+)-\d+$/.exec(id); return m ? +m[1] : 1; };
const GLACIER = WHEEL_STAGE_LOOKS[2].snowman;

const monsters = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return (S.monsters || []).map((m) => {
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    return { id: m.id, home: m.home || null, x: Math.round(m.x), y: Math.round(m.y), alive: m.alive, level: m.level,
      sprite: sp ? { visible: sp.visible, texAlive: sp.texAlive, plate: sp.plate, tint: sp.tint, baseTint: sp.baseTint } : null };
  });
});

let firstThrow = null, phase = 'start';
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelpast20-${name}.png`) });
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');

  const P = await H.newPlayer(browser, { name: 'Farwalker', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  P.page.on('console', (m) => { if (!firstThrow && /app\.render threw/.test(m.text())) firstThrow = '[during: ' + phase + '] ' + m.text(); });
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  await H.devOp(wsPort, 'quests', myId);
  await P.page.waitForTimeout(1200);

  /* ── 1. the list ── */
  phase = 'the list';
  const all = await monsters(P);
  const second = all.filter((m) => tierOf(m.id) >= 5);
  const byLand = {};
  for (const m of second) (byLand[m.home] = byLand[m.home] || []).push(m);
  rec.ok(`in the Wheel (${zone}) every land's second stage has its monsters: ${second.length} (${Object.entries(byLand).map(([h, a]) => `${h} ${a.length}`).join(', ')}), levels ${Math.min(...second.map((m) => m.level))}-${Math.max(...second.map((m) => m.level))}`,
    zone === 'wheel' && second.length === 192 && Object.keys(byLand).length === 8 && Object.values(byLand).every((a) => a.length === 24)
      && second.every((m) => m.level >= 21 && m.level <= 40), { n: second.length });

  /* ── 2. out past the first pass, to Frost Ridge's levels 21-25 ── */
  phase = 'the walk';
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 10 });
  const t5 = WHEEL_SPAWNS.frost.deeper.find((d) => d.tier === 5);
  const mid = { x: t5.points.slice(0, 6).reduce((a, p) => a + p[0], 0) / 6, y: t5.points.slice(0, 6).reduce((a, p) => a + p[1], 0) / 6 };
  const t0 = Date.now();
  const arrived = await H.hopTo(P, mid.x, mid.y + 40, { step: 100, gap: 260, tries: 420 });
  const walkS = +((Date.now() - t0) / 1000).toFixed(1);
  let near = [];
  for (let i = 0; i < 24; i++) {
    await P.page.waitForTimeout(500);
    near = (await monsters(P)).filter((m) => m.home === 'frost' && tierOf(m.id) === 5 && m.alive !== false);
    if (near.length && near.every((m) => m.sprite && m.sprite.texAlive && m.sprite.plate)) break;
  }
  await shot(P, 'frost-21-25');
  const bar = await P.page.evaluate(() => {
    const t = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; };
    return { place: t('.bt-zone-header__place'), sub: t('.bt-zone-header__sub') };
  });
  rec.ok(`walked out past the first pass to Frost Ridge's levels 21-25 in ${walkS} s, and the top bar says where: "${bar.place}" / "${bar.sub}"`,
    arrived && bar.place === 'Frost Ridge' && /21.25/.test(bar.sub || ''), bar);

  /* ── 3. Glacier Snowmen ── */
  phase = 'the looks';
  const drawn = near.filter((m) => m.sprite && m.sprite.visible && m.sprite.texAlive);
  const hex = (v) => (v == null ? 'none' : '#' + Number(v).toString(16).padStart(6, '0'));
  rec.ok(`...the snowmen there are drawn from the land's own live art (${drawn.length} of ${near.length} in reach), tinted the stage's icy blue (${[...new Set(drawn.map((m) => hex(m.sprite.baseTint)))].join(', ')})`,
    near.length === 6 && drawn.length >= 1 && drawn.every((m) => m.sprite.baseTint === GLACIER.tint), near.map((m) => m.sprite && { tint: hex(m.sprite.baseTint), alive: m.sprite.texAlive }));
  const plates = near.filter((m) => m.sprite && m.sprite.plate).map((m) => ({ level: m.level, text: m.sprite.plate.level, name: m.sprite.plate.name }));
  rec.ok(`...named "${GLACIER.name}" on their plates, each with its own level (${plates.map((p) => `${p.name} ${p.text}`).join(', ')})`,
    plates.length >= 1 && plates.every((p) => p.name === GLACIER.name && p.text === 'LV ' + p.level && p.level >= 21 && p.level <= 25), plates);

  /* ── 4. the first stage keeps its own ── */
  phase = 'the first stage';
  const t4 = WHEEL_SPAWNS.frost.deeper.find((d) => d.tier === 4);
  const mid4 = { x: t4.points.slice(0, 6).reduce((a, p) => a + p[0], 0) / 6, y: t4.points.slice(0, 6).reduce((a, p) => a + p[1], 0) / 6 };
  await H.hopTo(P, mid4.x, mid4.y + 40, { step: 100, gap: 260, tries: 220 });
  let near4 = [];
  for (let i = 0; i < 20; i++) {
    await P.page.waitForTimeout(500);
    near4 = (await monsters(P)).filter((m) => m.home === 'frost' && tierOf(m.id) === 4 && m.alive !== false && m.sprite && m.sprite.texAlive && m.sprite.plate);
    if (near4.length) break;
  }
  await shot(P, 'frost-16-20');
  rec.ok(`a level ${near4.map((m) => m.level).join('/')} snowman, back inside the first stage, is still white and still a "Snowman"`,
    near4.length >= 1 && near4.every((m) => m.sprite.baseTint === 0xffffff && m.sprite.plate.name === 'Snowman'), near4.map((m) => m.sprite));

  /* ── 5. v2.3.3085: the second stage's resources ── */
  phase = 'the resources';
  const nodesHere = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.gatherNodes || []).filter((n) => n && n.alive !== false && (n.gatherLvl === 16 || n.gatherLvl === 21)).map((n) => {
      const sp = n._pixiSprite && !n._pixiSprite.destroyed ? n._pixiSprite : null;
      const tex = sp && sp.texture;
      const L = n._pixiLabel && !n._pixiLabel.destroyed ? n._pixiLabel : null;
      const p = L && L._nl;
      return { id: n.id, type: n.nodeType, tier: n.gatherLvl, name: n.name, req: n.reqLvl, x: n.x, y: n.y,
        d: Math.round(Math.hypot(n.x - S.player.x, n.y - S.player.y)),
        tex: tex ? String((tex.source && tex.source.label) || tex.label || '') : null, tint: sp ? sp.tint : null,
        label: p ? { text: p.name.text, lv: p.lv.text, gray: !!p.gray, words: !!(p.name.visible && p.lv.visible) } : null };
    });
  });
  /* the tools first: a resource is drawn and labelled for a player who holds
     its tool (mp-nodelabels' way in) */
  for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
  await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
    (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
  const frostVeins = (await import(H.REPO + '/server/src/wheelspawns.js')).WHEEL_NODES.frost.filter((q) => q[0] === 'o' && q[3] === 16);
  const v0 = frostVeins.sort((a, b) => Math.hypot(a[1] - mid.x, a[2] - mid.y) - Math.hypot(b[1] - mid.x, b[2] - mid.y))[0];
  let vein = null, here = [];
  if (v0) {
    await H.hopTo(P, v0[1] + 70, v0[2] + 40, { step: 100, gap: 260, tries: 220 });
    for (let i = 0; i < 20; i++) {
      await P.page.waitForTimeout(500);
      here = await nodesHere();
      vein = here.filter((n) => n.type === 'oreVein' && n.tier === 16).sort((a, b) => a.d - b.d)[0] || null;
      if (vein && vein.label && vein.label.words && vein.tex) break;
    }
  }
  await shot(P, 'titanium');
  rec.ok(`a titanium vein past level 20: "${vein && vein.name}", asking Mining ${vein && vein.req}, drawn from its own picture (${vein && vein.tex})`,
    !!vein && vein.name === 'Titanium Ore' && vein.req === 10 && /titanium/.test(vein.tex || ''), { vein, n: here.length });
  rec.ok(`...its label says so -- "${vein && vein.label && vein.label.text}" "${vein && vein.label && vein.label.lv}", grey for a miner short of it`,
    !!vein && !!vein.label && vein.label.text === 'Titanium Ore' && /10/.test(vein.label.lv) && vein.label.gray === true, vein && vein.label);
  const kinds = [...new Set(here.map((n) => `${n.name} (${n.type}, tier ${n.tier}, Lv ${n.req})`))];
  rec.ok(`...and the second stage's others grow there too: ${kinds.join(', ')}`,
    here.some((n) => n.type === 'tree' && n.tier === 16 && n.name === 'Cedar Wood' && n.req === 15), kinds);

  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
  stopAlive = true;
  const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok('no page errors, and no render errors', pageErrors.length === 0 && !firstThrow, { errors: pageErrors.slice(0, 5), firstThrow: firstThrow && firstThrow.slice(0, 600) });
  await P.ctx.close().catch(() => {});
}
