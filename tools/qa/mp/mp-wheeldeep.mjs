/* ═══ PAST LEVEL 5: THE WHEEL'S DEEPER STRETCHES (v2.3.3013) ═══
 *
 * Asked "monsters past level 5 ... levels 6-20 in all eight lands (up to the
 * first pass)", the owner, 2026-10-03: "Yes continue working on those items".
 * Each land's first stage runs levels 1-20, a stretch (tier) of five levels at
 * a time; only its first stretch had monsters (server/src/wheelzone.js).  Now
 * its next three have the land's own monsters too, at that stretch's levels.
 *
 * On a phone viewport, against a real worker, the game as a player gets it:
 *   1. the Wheel holds every land's monsters in its first four stretches: 192,
 *      24 a land, the first stretch's 48 at levels 1-2 as before (v2.3.3093:
 *      and its next four, levels 21-40 -- 384, 48 a land; mp-wheelpast20 walks
 *      out to them);
 *   2. each deeper one carries its stretch's level on the client too -- 6-10,
 *      11-15, 16-20 -- not clamped to its home's 1-2 (monsterVariants.js);
 *   3. out on Frost Ridge's third stretch (levels 11-15) the top bar says so,
 *      the snowmen there are drawn from live art, and their nameplates read
 *      their own levels on the difficulty border of a monster far above you;
 *   4. one of them fights and dies to you, and the kill pays its level's XP --
 *      more than a first-stretch snowman's;
 *   5. no page errors, and no render errors.
 * Pictures in tools/qa/mp/out/wheeldeep-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const TIERS = { 2: [6, 10], 3: [11, 15], 4: [16, 20], 5: [21, 25], 6: [26, 30], 7: [31, 35], 8: [36, 40] };   /* v2.3.3093: + the second stage */
const tierOf = (id) => { const m = /-t(\d+)-\d+$/.exec(id); return m ? +m[1] : 1; };

/* the monsters the client holds, with what the renderer drew for each */
const monsters = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return (S.monsters || []).map((m) => {
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    return { id: m.id, home: m.home || null, arch: m.arch || m.archetype, x: Math.round(m.x), y: Math.round(m.y),
      alive: m.alive, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg, xp: m.xp, level: m.level,
      sprite: sp ? { visible: sp.visible, texAlive: sp.texAlive, plate: sp.plate } : null };
  });
});

let firstThrow = null, phase = 'start';
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheeldeep-${name}.png`) });
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');

  const P = await H.newPlayer(browser, { name: 'Delver', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
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
  /* real input on a loop: the page logs itself out after two minutes without
     any (wsClient idleLogout), and Control does nothing in the game */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* past the Mayor's gate, so the lands are open (wheelCommonsGate) */
  await H.devOp(wsPort, 'quests', myId);
  await P.page.waitForTimeout(1200);

  /* ── 1-2. the list ── */
  phase = 'the list';
  const all = await monsters(P);
  const byLand = {};
  for (const m of all) (byLand[m.home] = byLand[m.home] || []).push(m);
  const first = all.filter((m) => tierOf(m.id) === 1);
  rec.ok(`in the Wheel (${zone}) every land's monsters stand in its first eight stretches, levels 1-40: ${all.length} (${Object.entries(byLand).map(([h, a]) => `${h} ${a.length}`).join(', ')}), the first stretch's ${first.length} at levels ${[...new Set(first.map((m) => m.level))].sort().join(' and ')}`,
    zone === 'wheel' && all.length === 384 && Object.keys(byLand).length === 8 && Object.values(byLand).every((a) => a.length === 48)
      && first.length === 48 && first.every((m) => m.level >= 1 && m.level <= 2), { n: all.length, lands: Object.keys(byLand) });
  const deep = all.filter((m) => tierOf(m.id) > 1);
  const offLevel = deep.filter((m) => !TIERS[tierOf(m.id)] || m.level < TIERS[tierOf(m.id)][0] || m.level > TIERS[tierOf(m.id)][1]);
  const lv = (t) => deep.filter((m) => tierOf(m.id) === t).map((m) => m.level);
  rec.ok(`...each deeper one at its own stretch's levels here too, not clamped to its home's 1-2 (6-10: ${Math.min(...lv(2))}-${Math.max(...lv(2))}, 11-15: ${Math.min(...lv(3))}-${Math.max(...lv(3))}, 16-20: ${Math.min(...lv(4))}-${Math.max(...lv(4))}, ... 36-40: ${Math.min(...lv(8))}-${Math.max(...lv(8))})`,
    deep.length === 336 && offLevel.length === 0 && Math.max(...lv(4)) === 20 && Math.min(...lv(2)) === 6 && Math.max(...lv(8)) === 40, offLevel.slice(0, 4));

  /* ── 3. out to Frost Ridge's third stretch ── */
  phase = 'the walk';
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 });
  const t3 = WHEEL_SPAWNS.frost.deeper.find((d) => d.tier === 3);
  const mid = { x: t3.points.slice(0, 6).reduce((a, p) => a + p[0], 0) / 6, y: t3.points.slice(0, 6).reduce((a, p) => a + p[1], 0) / 6 };
  const t0 = Date.now();
  const arrived = await H.hopTo(P, mid.x, mid.y + 40, { step: 100, gap: 260, tries: 260 });
  const walkS = +((Date.now() - t0) / 1000).toFixed(1);
  /* their looks load as you come (wheelMonsterArt.js); give the plates a beat */
  let near = [];
  for (let i = 0; i < 20; i++) {
    await P.page.waitForTimeout(500);
    near = (await monsters(P)).filter((m) => m.home === 'frost' && tierOf(m.id) === 3 && m.alive !== false);
    if (near.length && near.every((m) => m.sprite && m.sprite.texAlive && m.sprite.plate)) break;
  }
  await shot(P, 'frost-11-15');
  /* v2.3.3108: the minimap's name plate says where (wheelMinimap.js _plate) */
  const bar = await P.page.evaluate(() => {
    const pl = window.__btMinimap && window.__btMinimap.plate;
    return { place: pl ? pl.title : null, sub: pl ? pl.sub : null };
  });
  rec.ok(`walked out to Frost Ridge's third stretch in ${walkS} s, and the minimap's name plate says where: "${bar.place}" / "${bar.sub}"`,
    arrived && bar.place === 'Frost Ridge' && /11.15/.test(bar.sub || ''), bar);
  const drawn = near.filter((m) => m.sprite && m.sprite.visible && m.sprite.texAlive);
  rec.ok(`...the snowmen there are drawn from live art (${drawn.length} of ${near.length} in reach)`,
    near.length === 6 && drawn.length >= 1 && near.filter((m) => m.sprite).every((m) => m.sprite.texAlive), near.map((m) => m.sprite));
  const plates = near.filter((m) => m.sprite && m.sprite.plate).map((m) => ({ id: m.id, level: m.level, text: m.sprite.plate.level, band: m.sprite.plate.band }));
  rec.ok(`...and each nameplate reads its own level, on the border of a monster far above yours (${plates.map((p) => `${p.text} ${p.band}`).join(', ')})`,
    plates.length >= 1 && plates.every((p) => p.text === 'LV ' + p.level && p.level >= 11 && p.level <= 15 && p.band === 'danger'), plates);

  /* ── 4. a fight ── */
  phase = 'the fight';
  const xpOf = () => H.readState(P, (S) => (S.rpg && S.rpg.xp) || 0);
  const xp0 = await xpOf();
  let killed = null, target = null, rounds = 0;
  for (; rounds < 30 && !killed; rounds++) {
    target = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === 'frost' && /-t3-/.test(x.id) && x.alive !== false && x.hp > 0)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      return m ? { id: m.id, zone: S.currentZone, hp: m.hp, x: m.x, y: m.y, level: m.level, xp: m.xp } : null;
    });
    if (!target) { await P.page.waitForTimeout(500); continue; }
    /* onto it at a pace the worker accepts (its anti-teleport cap) */
    await H.hopTo(P, target.x, target.y + 10, { step: 60, tries: 20 });
    for (let swing = 0; swing < 12; swing++) {
      await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee' });
      await P.page.waitForTimeout(140);
    }
    killed = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.id === id);
      return !m ? null : (m.alive === false || m.hp <= 0) ? { id, level: m.level, xp: m.xp } : null;
    }, target.id);
  }
  await P.page.waitForTimeout(1500);
  const xp1 = await xpOf();
  await shot(P, 'fight');
  /* a first-stretch snowman's XP, the same land's, for the comparison */
  const xpFirst = Math.max(...first.filter((m) => m.home === 'frost').map((m) => m.xp));
  rec.ok(`a level-${killed && killed.level} snowman fights and dies to you, and the kill pays its level's XP (${xp0} -> ${xp1}: +${xp1 - xp0}, its ${killed && killed.xp}; a first-stretch snowman pays ${xpFirst})`,
    !!killed && killed.level >= 11 && xp1 - xp0 >= killed.xp && killed.xp > xpFirst, { killed, xp0, xp1, rounds, target });
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });

  stopAlive = true;
  const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok('no page errors, and no render errors', pageErrors.length === 0 && !firstThrow, { errors: pageErrors.slice(0, 5), firstThrow: firstThrow && firstThrow.slice(0, 600) });
  await P.ctx.close().catch(() => {});
}
