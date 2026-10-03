/* ═══ THE WHEEL'S DUNGEONS, ON A PHONE (v2.3.3016) ═══
 *
 * Offered "Dungeons in the Wheel", the owner: "Yes continue working on those
 * items".  One real player against a real worker:
 *   1. the client knows the three mouths (the Great Cave, the Foundry Dome,
 *      the Buried City) from the Wheel's own map, where the worker baked them;
 *   2. walked to the Great Cave, its mouth is drawn and "Enter the Great
 *      Cave" comes up (and not a step before, far off);
 *   3. a tap opens the dungeon: the loading screen, then the arena, its
 *      monsters the Stone Hollows' own -- their own looks, at the run's level
 *      -- and the way back out remembered;
 *   4. three waves and the boss (each ended by the QA dev op `clearwave`: a
 *      real fight takes minutes on this box) -- and the clear pays and brings
 *      you back out at the cave's mouth, in the Wheel;
 *   5. in again, and out by its door: back at the mouth again;
 *   6. no page errors.
 * The walker is a god (server/src/devtools.js): it crosses levels 6-20.
 * Pictures: tools/qa/mp/out/wheeldungeon-{mouth,arena,back}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const P = await H.newPlayer(browser, { name: 'Delver', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
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
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  /* ── 1. the mouths ── */
  let doors = [];
  for (let i = 0; i < 30 && doors.length < 3; i++) {
    doors = await P.page.evaluate(() => (window.__btWheelDungeons ? window.__btWheelDungeons.doors() : []));
    if (doors.length < 3) await P.page.waitForTimeout(500);
  }
  const cave = doors.find((d) => d.id === 'hollows');
  const W = WHEEL_DOORS.hollows;
  rec.ok(`the client knows the three mouths from the Wheel's map, where the worker baked them (${doors.map((d) => d.name).join(', ')})`,
    z0 === 'wheel' && doors.length === 3 && !!cave && cave.name === 'the Great Cave' && Math.hypot(cave.x - W.at[0], cave.y - W.at[1]) < 2,
    { z0, doors, baked: W });

  /* ── 2. walk to the Great Cave ── */
  const farBtn = await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'));
  const t0 = Date.now();
  await H.hopTo(P, W.at[0], W.at[1] + 300, { step: 100, gap: 260, tries: 260 });
  await P.page.waitForTimeout(1200);
  const outside = await P.page.evaluate(() => ({ btn: !!document.querySelector('[data-wheel-door]'), at: window.__btWheelDungeons.at() }));
  await H.hopTo(P, W.at[0], W.at[1] + 60, { step: 60, gap: 260, tries: 20 });
  let near = null;
  for (let i = 0; i < 20; i++) {
    near = await P.page.evaluate(() => {
      const b = document.querySelector('[data-wheel-door]');
      return { btn: b ? b.textContent : null, door: b ? b.getAttribute('data-wheel-door') : null, at: window.__btWheelDungeons.at(), drawn: window.__btWheelDoorsDrawn || [] };
    });
    if (near.btn) break;
    await P.page.waitForTimeout(300);
  }
  await P.page.screenshot({ path: join(OUT, 'wheeldungeon-mouth.png') }).catch(() => {});
  rec.ok(`walked to the Great Cave in ${((Date.now() - t0) / 1000).toFixed(1)} s: its mouth is drawn, and "${near && near.btn}" comes up at it (not from town, nor 300 px off)`,
    !farBtn && !outside.btn && !!near && near.door === 'hollows' && /Enter the Great Cave/.test(near.btn || '') && near.drawn.includes('hollows'),
    { farBtn, outside, near });

  /* ── 3. in ── */
  const wheelScale = await H.readState(P, (S) => S._worldScaleX || null);
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
        kinds: [...new Set(ms.map((m) => m.archetype || m.type))],
        levels: ms.map((m) => m.level),
        drawn: ms.filter((m) => { const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null; return !!(sp && sp.visible && sp.texAlive); }).length,
        floor: window.__btArenaFloor || null,
        scale: S._worldScaleX || null,
        oldTools: /Light Torch|Echo: /.test(document.body.innerText || ''),
      };
    });
    if (arena.n > 0 && arena.drawn === arena.n) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.screenshot({ path: join(OUT, 'wheeldungeon-arena.png') }).catch(() => {});
  rec.ok(`a tap opens it: in the arena (${inZ}), the Stone Hollows' own monsters (${arena && arena.kinds.join(', ')}) at your level, drawn in their own looks (${arena && arena.drawn} of ${arena && arena.n}), the way back out remembered`,
    /^dungeon:/.test(inZ || '') && !!arena && arena.n > 0 && arena.homes.length === 1 && arena.homes[0] === 'hollows'
      && arena.drawn === arena.n && !!arena.back && Math.abs(arena.back.x - W.back[0]) < 1 && Math.abs(arena.back.y - W.back[1]) < 1,
    arena);
  /* v2.3.3016: the arena itself -- floored with the Stone Hollows' own cave
     stone, drawn at the Wheel's character size (the Workshop's 28 x 22 was
     zoomed in to fill an upright phone), and none of the old Deep Hollows'
     torch and echo over the controls */
  rec.ok(`the arena is floored with the land's own ground (${arena && arena.floor && arena.floor.pic}) and drawn at the Wheel's size (scale ${arena && arena.scale && arena.scale.toFixed(3)}, the Wheel's ${wheelScale && wheelScale.toFixed(3)}), with no old zone tools over the controls`,
    !!arena && !!arena.floor && arena.floor.drawn === true && /hollows-4-A\.png/.test(arena.floor.pic || '')
      && typeof wheelScale === 'number' && typeof arena.scale === 'number' && arena.scale <= wheelScale * 1.05 && !arena.oldTools,
    { floor: arena && arena.floor, scale: arena && arena.scale, wheelScale, oldTools: arena && arena.oldTools });

  /* ── 4. the waves, the boss, the clear ── */
  const coins0 = await H.readState(P, (S) => (S.rpg && S.rpg.coins) || 0);
  const seen = [];
  for (let k = 0; k < 6; k++) {
    const r = await H.devOp(wsPort, 'clearwave', id);
    seen.push(r && r.cleared);
    await P.page.waitForTimeout(1500);
    const z = await H.readState(P, (S) => S.currentZone);
    if (!/^dungeon:/.test(z || '')) break;
    const done = await H.readState(P, (S) => !!S._dungeonComplete);
    if (done) break;
  }
  const cleared = await H.readState(P, (S) => !!S._dungeonComplete || !/^dungeon:/.test(S.currentZone || ''));
  const back = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(1500);
  const where = await P.page.evaluate(() => { const S = window._gameState.current; return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), coins: (S.rpg && S.rpg.coins) || 0 }; });
  await P.page.screenshot({ path: join(OUT, 'wheeldungeon-back.png') }).catch(() => {});
  rec.ok(`three waves and the boss (${seen.join(', ')} monsters ended), the clear pays (${where.coins - coins0} gold), and you are back out at the cave's mouth (${Math.round(Math.hypot(where.x - W.back[0], where.y - W.back[1]))} px from its way out)`,
    cleared && back === 'wheel' && where.zone === 'wheel' && Math.hypot(where.x - W.back[0], where.y - W.back[1]) < 80 && where.coins > coins0,
    { seen, cleared, back, where, want: W.back });

  /* ── 5. in again, and out by its door ── */
  await H.hopTo(P, W.at[0], W.at[1] + 60, { step: 60, gap: 260, tries: 20 });
  for (let i = 0; i < 15; i++) {
    if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
    await P.page.waitForTimeout(300);
  }
  await P.page.evaluate(() => { const b = document.querySelector('[data-wheel-door]'); if (b) b.click(); });
  const in2 = await waitZone((z) => /^dungeon:/.test(z), 30000);
  await P.page.waitForTimeout(1200);
  /* walk onto the way out (tile 9): a row a player can stand on, the last of
     the floor, on a bottom wall three rows thick */
  const door = await P.page.evaluate(() => {
    const S = window._gameState.current, T = 32;
    for (let y = 0; y < S.map.length; y++) for (let x = 0; x < S.map[y].length; x++) {
      if (S.map[y][x] === 9) return { x: x * T + T / 2, y: y * T + T / 2, row: y, rows: S.map.length };
    }
    return null;
  });
  /* step by step, as H.hopTo does -- but no further once the door has taken
     you out: hopTo would go on walking toward the door's arena point in the
     Wheel's own coordinates, 1,200 px off the mouth (the first run) */
  for (let i = 0; door && i < 40; i++) {
    const done = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      if (!/^dungeon:/.test(S.currentZone || '')) return true;
      const dx = x - S.player.x, dy = y - S.player.y, d = Math.hypot(dx, dy);
      if (d < 4) return false;
      const k = Math.min(40, d);
      S.player.x += (dx / d) * k; S.player.y += (dy / d) * k;
      return false;
    }, door);
    if (done) break;
    await P.page.waitForTimeout(260);
  }
  const out2 = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(1200);
  const where2 = await P.page.evaluate(() => { const S = window._gameState.current; return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y) }; });
  rec.ok(`in again (${in2}) and out by its door (row ${door && door.row} of ${door && door.rows}): back at the mouth (${Math.round(Math.hypot(where2.x - W.back[0], where2.y - W.back[1]))} px from its way out)`,
    /^dungeon:/.test(in2 || '') && !!door && out2 === 'wheel' && Math.hypot(where2.x - W.back[0], where2.y - W.back[1]) < 80, { in2, door, out2, where2 });

  stopAlive = true;
  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
