/* ═══ THE GOO GROTTO, ON A PHONE (v2.3.3540, docs/specs/starter-dungeon.md;
 *     v2.3.3573, docs/specs/grotto-party.md: a dungeon built for a party) ═══
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY" -- the after-review
 * list's fourth item: a dungeon near town, the Verdant Wilds' landmark; then
 * "I want the goo grotto dungeon to be very difficult without a party of 2-3
 * people": level 16 whoever comes in, its boss sized for three.
 * One real player against a real worker, on a phone (390 x 844, touch):
 *   1. the client knows the Goo Grotto from the Wheel's own map, where the
 *      worker baked it, on the Verdant Wilds' first stretch, about half a
 *      minute's walk from where you arrive;
 *   2. on the way, the world map, centred on you, names it "Lv 16 · 2–3
 *      players"; walked there, its mouth is drawn, nothing standing over
 *      it, and "Enter the Goo Grotto" comes up with "Lv 16 · for 2–3
 *      players" under it;
 *   3. a tap opens it: the Verdant Wilds' own monsters at level 16 (whatever
 *      yours), drawn in their own looks, on the land's mossy stone, the way
 *      back out remembered;
 *   4. the waves (each ended by the QA dev op `clearwave`), then the boss at
 *      the dungeon's level, then the clear: back out at the Grotto's mouth;
 *   5. no page errors.
 * The walker is a god (server/src/devtools.js).
 * Pictures: tools/qa/mp/out/googrotto-{mouth,map,arena,boss,back}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `googrotto-${name}.png`) }).catch(() => {});
  const { WHEEL_DOORS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
  /* v2.3.3573: the Grotto's level and party, the worker's own */
  const { WHEEL_DUNGEON } = await import(H.REPO + '/server/src/wheeldungeon.js');
  const PARTY = WHEEL_DUNGEON.PARTY.verdant;
  const G = WHEEL_DOORS.verdant;
  const P = await H.newPlayer(browser, { name: 'Gooer', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  await H.enterWorld(P);
  const zoneNow = () => H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
  const waitZone = async (pred, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const z = await zoneNow();
      if (z && pred(z)) return z;
      await P.page.waitForTimeout(400);
    }
    return await zoneNow();
  };
  const z0 = await waitZone((z) => z === 'wheel');
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
  const level = await H.readState(P, (S) => (S.rpg && S.rpg.level) || 1);
  /* v2.3.3573: a party dungeon is its own level, whatever yours (it was
     yours, never past 5) */
  const want = PARTY.level;
  const mapLine = `Lv ${PARTY.level} · ${PARTY.size - 1}–${PARTY.size} players`;
  const doorLine = `Lv ${PARTY.level} · for ${PARTY.size - 1}–${PARTY.size} players`;
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  /* ── 1. where it is ── */
  let doors = [];
  for (let i = 0; i < 30 && !doors.some((d) => d.id === 'verdant'); i++) {
    doors = await P.page.evaluate(() => (window.__btWheelDungeons ? window.__btWheelDungeons.doors() : []));
    if (!doors.some((d) => d.id === 'verdant')) await P.page.waitForTimeout(500);
  }
  const goo = doors.find((d) => d.id === 'verdant');
  const walkS = Math.hypot(G.at[0] - WHEEL_CENTRE[0], G.at[1] - (WHEEL_CENTRE[1] + 288)) / 150;
  rec.ok(`the client knows the Goo Grotto from the Wheel's map, where the worker baked it (${goo && [goo.x, goo.y].join(', ')}), ${Math.round(walkS)} s at a walk from where you arrive`,
    z0 === 'wheel' && !!goo && goo.name === 'the Goo Grotto' && Math.hypot(goo.x - G.at[0], goo.y - G.at[1]) < 2
      && walkS > 20 && walkS < 60, { z0, goo, baked: G, walkS });

  /* ── 2. walk there ── */
  /* on the way, 2,500 px short of it: the world map, centred on you (◎),
     names it and says what it is (from its mouth your own "You" would have
     the spot its name is written in) */
  await H.hopTo(P, G.at[0] + 2500, G.at[1] + 60, { step: 100, gap: 260 });
  await P.page.evaluate(() => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(true); });
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-me]'); if (b) b.click(); });
  let wm = null;
  for (let i = 0; i < 16; i++) {
    await P.page.waitForTimeout(300);
    wm = await P.page.evaluate(() => (window.__btWorldMap ? { open: window.__btWorldMap.open, rel: window.__btWorldMap.rel, dungeons: window.__btWorldMap.more && window.__btWorldMap.more.dungeons, lines: window.__btWorldMap.more && window.__btWorldMap.more.dungeonLines } : null));
    if (wm && wm.dungeons > 0) break;
  }
  await shot('map');
  rec.ok(`on the way, the world map, centred on you, names it ("the Goo Grotto", "${wm && wm.lines && wm.lines[0]}"): ${wm && wm.dungeons} dungeon label at zoom ${wm && wm.rel && wm.rel.toFixed(1)}`,
    !!wm && wm.open === true && wm.dungeons >= 1 && Array.isArray(wm.lines) && wm.lines.includes(mapLine), { wm, mapLine });
  await P.page.evaluate(() => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); });
  await P.page.waitForTimeout(800);
  await H.hopTo(P, G.at[0], G.at[1] + 60, { step: 100, gap: 260 });
  let near = null;
  for (let i = 0; i < 20; i++) {
    near = await P.page.evaluate(() => {
      const b = document.querySelector('[data-wheel-door]');
      return { btn: b ? b.textContent : null, door: b ? b.getAttribute('data-wheel-door') : null, at: window.__btWheelDungeons.at(), drawn: window.__btWheelDoorsDrawn || [] };
    });
    if (near.btn) break;
    await P.page.waitForTimeout(300);
  }
  await shot('mouth');
  rec.ok(`at the Grotto its mouth is drawn and "${near && near.btn}" comes up (v2.3.3573: the level and the players it is built for under its name)`,
    !!near && near.door === 'verdant' && /Enter the Goo Grotto/.test(near.btn || '') && (near.btn || '').includes(doorLine) && near.drawn.includes('verdant'), { near, doorLine });

  /* ── 3. in ── */
  for (let i = 0; i < 15; i++) {
    if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
    await P.page.waitForTimeout(300);
  }
  await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
  const inZ = await waitZone((z) => /^dungeon:/.test(z), 30000);
  let arena = null;
  for (let i = 0; i < 30; i++) {
    arena = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const ms = (S.monsters || []).filter((m) => m.alive !== false);
      return {
        zone: S.currentZone, back: S._dungeonBack || null, n: ms.length,
        homes: [...new Set(ms.map((m) => m.home || null))],
        levels: ms.map((m) => m.level),
        drawn: ms.filter((m) => { const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null; return !!(sp && sp.visible && sp.texAlive); }).length,
        floor: window.__btArenaFloor || null,
      };
    });
    if (arena.n > 0 && arena.drawn === arena.n) break;
    await P.page.waitForTimeout(500);
  }
  await shot('arena');
  /* v2.3.3556: every one AT the dungeon's level (they rolled +0..2) */
  rec.ok(`a tap opens it (${inZ}): the Verdant Wilds' own monsters, all at Lv ${arena && Math.min(...arena.levels)} (yours is ${level}: a party dungeon is its own ${want}; v2.3.3556: no +0..2), drawn in their own looks (${arena && arena.drawn} of ${arena && arena.n}), on the land's mossy stone, the way back out remembered`,
    /^dungeon:/.test(inZ || '') && !!arena && arena.n > 0 && arena.homes.length === 1 && arena.homes[0] === 'verdant'
      && arena.levels.every((l) => l === want) && arena.drawn === arena.n
      && !!arena.floor && arena.floor.drawn === true && /verdant-3-A\.png/.test(arena.floor.pic || '')
      && !!arena.back && Math.abs(arena.back.x - G.back[0]) < 1 && Math.abs(arena.back.y - G.back[1]) < 1,
    arena);

  /* ── 4. the waves, the boss at the dungeon's level, the clear ── */
  const coins0 = await H.readState(P, (S) => (S.rpg && S.rpg.coins) || 0);
  let boss = null;
  const seen = [];
  for (let k = 0; k < 6; k++) {
    /* the boss, the moment it stands alone (after the last wave) */
    const b = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const ms = (S.monsters || []).filter((m) => m.alive !== false);
      return S._dungeonBossSpawned || ms.some((m) => /-boss$/.test(m.id || '')) ? (ms.find((m) => /-boss$/.test(m.id || '')) || null) : null;
    });
    if (b && !boss) { boss = { level: b.level, home: b.home, id: b.id }; await shot('boss'); }
    const r = await H.devOp(wsPort, 'clearwave', id);
    seen.push(r && r.cleared);
    await P.page.waitForTimeout(1500);
    const z = await H.readState(P, (S) => S.currentZone);
    if (!/^dungeon:/.test(z || '')) break;
    if (await H.readState(P, (S) => !!S._dungeonComplete)) break;
  }
  rec.ok(`the waves, then the boss at the dungeon's level: Lv ${boss && boss.level} (the dungeon's ${want}), the Verdant Wilds' own`,
    !!boss && boss.level === want && boss.home === 'verdant', { boss, want, seen });
  const back = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(1500);
  const where = await P.page.evaluate(() => { const S = window._gameState.current; return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), coins: (S.rpg && S.rpg.coins) || 0 }; });
  await shot('back');
  rec.ok(`the clear pays (${where.coins - coins0} gold) and you are back out at the Grotto's mouth (${Math.round(Math.hypot(where.x - G.back[0], where.y - G.back[1]))} px from its way out)`,
    back === 'wheel' && where.zone === 'wheel' && Math.hypot(where.x - G.back[0], where.y - G.back[1]) < 80 && where.coins > coins0,
    { seen, back, where, want: G.back });

  stopAlive = true;
  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
