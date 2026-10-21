/* ═══ THE DUNGEON FIXES, ON A PHONE, IN THE WORLD (v2.3.3556, docs/specs/dungeon-fixes.md) ═══
 *
 * The owner, 2026-10-21: "I have no clue what the state of dungeons are right
 * now in the game.  I have never played dungeons yet.  This will probably need
 * work to get right."  The tour (mp-dungeontour, docs/specs/dungeons-today.md)
 * found what a player meets; these are the four fixes it said need no
 * decision.  One real player against a real worker, on a phone (390 x 844,
 * touch), at the Goo Grotto:
 *   1. ONE LEVEL: the top bar says the dungeon's one level, "(Lv N)" (it read
 *      "(Lv3-3)"), and every monster in it is that level (they rolled +0..2);
 *   2. STRAIGHT BACK IN: out by its way out with the wave still standing, and
 *      in again at once -- a new run, no "You already have a dungeon running"
 *      (it said so for a minute);
 *   3. A REAL BOSS: after the waves the boss is said on the wire (`boss`),
 *      four wave monsters of health, drawn half again as big as a wave
 *      monster, its plate "Boss <name>" on its own deep red;
 *   4. TIME FOR THE LOOT: after the clear a card counts down from 30 ("out in
 *      27 s") and you are still inside a few seconds on (it was three); its
 *      Leave now takes you out at once, at the mouth;
 *   5. ...and left alone, the time running out takes you out by itself;
 *   6. no page errors.
 * The walker is a god (server/src/devtools.js); the waves are ended by the QA
 * dev op `clearwave` (a real fight takes minutes on this box).
 * Pictures: tools/qa/mp/out/dungeonfix-{title,boss,clear,back}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const G = WHEEL_DOORS.verdant;
  const P = await H.newPlayer(browser, { name: 'Bossbane', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `dungeonfix-${name}.png`) }).catch(() => {});
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
  const want = Math.max(1, Math.min(5, level));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* the words over you, kept as they come (a line over your bro is gone in
     about a second) */
  const words = [];
  const listen = async (ms) => {
    for (let t = 0; t < ms; t += 150) {
      const w = await P.page.evaluate(() => ((window._gameState.current || {}).dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean)).catch(() => []);
      for (const x of w) if (!words.includes(x)) words.push(x);
      await P.page.waitForTimeout(150);
    }
  };
  const enter = async () => {
    await H.hopTo(P, G.at[0], G.at[1] + 60, { step: 100, gap: 260 });
    for (let i = 0; i < 20; i++) {
      if (await P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'))) break;
      await P.page.waitForTimeout(300);
    }
    const b = await P.page.evaluate(() => { const el = document.querySelector('[data-wheel-door]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (b) await P.page.touchscreen.tap(Math.round(b.x), Math.round(b.y));
    return !!b;
  };
  const walkOut = async () => {
    /* onto the way out (tile 9), step by step, no further once it has taken
       you out (mp-wheeldungeon's walk) */
    const door = await P.page.evaluate(() => {
      const S = window._gameState.current, T = 32;
      for (let y = 0; y < S.map.length; y++) for (let x = 0; x < S.map[y].length; x++) if (S.map[y][x] === 9) return { x: x * T + T / 2, y: y * T + T / 2 };
      return null;
    });
    for (let i = 0; door && i < 60; i++) {
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
    return door;
  };
  const scaleOf = (mid) => P.page.evaluate((m) => (window.__btMonsterScale ? window.__btMonsterScale(m) : null), mid);

  /* ── 1. one level ── */
  await enter();
  const z1 = await waitZone((z) => /^dungeon:/.test(z), 30000);
  let one = null;
  for (let i = 0; i < 30; i++) {
    one = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const ms = (S.monsters || []).filter((m) => m.alive !== false);
      return {
        zone: S.currentZone, n: ms.length, levels: ms.map((m) => m.level), ids: ms.map((m) => m.id),
        title: (document.querySelector('[data-zone-title]') || {}).textContent || null,
        bosses: ms.filter((m) => m.boss).length,
      };
    });
    if (one.n > 0 && one.title) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(1500);
  /* a wave monster's resting scale, the boss's yardstick (the least of a few
     readings: a wind-up only ever throbs it bigger) */
  let waveScale = Infinity;
  for (let i = 0; i < 6 && one && one.ids.length; i++) {
    const s = await scaleOf(one.ids[0]);
    if (s && s.scale > 0) waveScale = Math.min(waveScale, s.scale);
    await P.page.waitForTimeout(200);
  }
  await shot('title');
  rec.ok(`1: the top bar says the dungeon's one level, "${one && one.title}" (it read "(Lv${want}-${want})"), and all ${one && one.n} of its monsters are Lv ${want} (yours ${level}; they rolled +0..2), no boss yet`,
    /^dungeon:/.test(z1 || '') && !!one && one.title === `the Goo Grotto (Lv ${want})` && one.n > 0 && one.levels.every((l) => l === want) && one.bosses === 0,
    one);

  /* ── 2. straight back in ── */
  await walkOut();
  const out1 = await waitZone((z) => z === 'wheel', 60000);
  await P.page.waitForTimeout(800);
  words.length = 0;
  await enter();
  const listening = listen(4000);
  const z2 = await waitZone((z) => /^dungeon:/.test(z) && z !== z1, 30000);
  await listening;
  const refused = words.filter((w) => /already have a dungeon/i.test(w));
  rec.ok(`2: out by its way out with the wave standing (${out1}), and in again at once: a new run (${z2}), no "You already have a dungeon running" (it said so for a minute)`,
    out1 === 'wheel' && /^dungeon:/.test(z2 || '') && z2 !== z1 && refused.length === 0, { out1, z1, z2, refused, words: words.slice(-8) });

  /* ── 3. a real boss ── */
  await P.page.waitForTimeout(1500);
  /* stand in the arena's middle, so the boss (at its top third) is on the
     screen when it comes */
  const mid = await P.page.evaluate(() => ({ x: (globalThis.TOWN_W || 1152) / 2, y: (globalThis.TOWN_H || 1664) * 0.52 }));
  await H.hopTo(P, mid.x, mid.y, { step: 80, gap: 220 });
  let boss = null;
  const seen = [];
  for (let k = 0; k < 6 && !boss; k++) {
    const r = await H.devOp(wsPort, 'clearwave', id);
    seen.push(r && r.cleared);
    for (let i = 0; i < 12 && !boss; i++) {
      await P.page.waitForTimeout(250);
      boss = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const b = (S.monsters || []).find((m) => m.alive !== false && m.boss);
        return b ? { id: b.id, boss: b.boss, level: b.level, maxHp: b.maxHp, home: b.home } : null;
      });
    }
  }
  /* past its arrival (the white silhouette that grows, SPAWN_FX_MS), then
     its resting scale and its plate */
  await P.page.waitForTimeout(900);
  let bossScale = Infinity, plate = null;
  for (let i = 0; boss && i < 8; i++) {
    const s = await scaleOf(boss.id);
    if (s && s.scale > 0) bossScale = Math.min(bossScale, s.scale);
    const p = await P.page.evaluate((bid) => {
      const pl = window.__btMonsterPlates && window.__btMonsterPlates.plates;
      const x = pl && pl.find((q) => q.id === bid);
      return x ? { name: x.name, soft: x.soft, hidden: x.hidden, band: x.band } : null;
    }, boss.id);
    if (p && p.name) plate = p;
    await P.page.waitForTimeout(150);
  }
  await shot('boss');
  rec.ok(`3: then the boss, said on the wire (boss ${boss && boss.boss}), Lv ${boss && boss.level} with ${boss && boss.maxHp} HP (the Verdant Wilds' own)`,
    !!boss && boss.boss === 1 && boss.level === want && boss.home === 'verdant' && boss.maxHp > 0, { boss, seen });
  const ratio = bossScale / waveScale;
  rec.ok(`3: ...drawn half again as big as a wave monster (scale ${bossScale.toFixed(3)} against ${waveScale.toFixed(3)}: x${ratio.toFixed(2)})`,
    isFinite(ratio) && ratio > 1.4 && ratio < 1.6, { bossScale, waveScale });
  rec.ok(`3: ...its plate "${plate && plate.name}" on its own deep red (${plate && plate.soft && plate.soft.fill != null ? '#' + Number(plate.soft.fill).toString(16) : '?'}), bold`,
    !!plate && /^Boss /.test(plate.name || '') && !!plate.soft && plate.soft.boss === true
      && (plate.soft.fill === 0x7A1D1D || plate.soft.fill === 0xE03131) && plate.soft.nameWeight === '700', plate);

  /* ── 4. time for the loot ── */
  words.length = 0;
  await H.devOp(wsPort, 'clearwave', id);
  let card = null;
  for (let i = 0; i < 30 && !card; i++) {
    await P.page.waitForTimeout(250);
    card = await P.page.evaluate(() => {
      const el = document.querySelector('[data-dungeon-clear]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const btn = el.querySelector('[data-dungeon-leave]');
      const b = btn && btn.getBoundingClientRect();
      return { secs: Number(el.getAttribute('data-dungeon-clear')), text: el.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        btn: b ? { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height } : null, vw: window.innerWidth };
    });
  }
  const tClear = Date.now();
  await shot('clear');
  rec.ok(`4: after the clear a card counts down: "${card && card.text}" (${card && card.secs} s), on the screen, Leave now a thumb's size`,
    !!card && card.secs >= 25 && card.secs <= 30 && /Dungeon cleared!/.test(card.text) && /out in \d+ s/.test(card.text)
      && card.top >= 0 && card.left >= 0 && card.right <= card.vw && !!card.btn && card.btn.h >= 40, card);
  await P.page.waitForTimeout(4500);
  const later = await P.page.evaluate(() => {
    const el = document.querySelector('[data-dungeon-clear]');
    return { zone: window._gameState.current.currentZone, secs: el ? Number(el.getAttribute('data-dungeon-clear')) : null };
  });
  rec.ok(`4: ...and you are still inside ${((Date.now() - tClear) / 1000).toFixed(1)} s on (it took you out at 3), the card at ${later.secs} s`,
    /^dungeon:/.test(later.zone || '') && later.zone === z2 && later.secs != null && later.secs < card.secs, later);
  const b = await P.page.evaluate(() => { const el = document.querySelector('[data-dungeon-leave]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (b) await P.page.touchscreen.tap(Math.round(b.x), Math.round(b.y));
  const tTap = Date.now();
  const out2 = await waitZone((z) => z === 'wheel', 30000);
  const tOut = Date.now() - tTap;
  await P.page.waitForTimeout(1500);
  const where = await P.page.evaluate(() => { const S = window._gameState.current; return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), card: !!document.querySelector('[data-dungeon-clear]') }; });
  await shot('back');
  rec.ok(`4: its Leave now takes you out at once (${(tOut / 1000).toFixed(1)} s), at the Grotto's mouth (${Math.round(Math.hypot(where.x - G.back[0], where.y - G.back[1]))} px from its way out), the card gone`,
    !!b && out2 === 'wheel' && Math.hypot(where.x - G.back[0], where.y - G.back[1]) < 80 && !where.card && tOut < 15000, { where, tOut });

  /* ── 5. the time running out ── */
  await enter();
  const z3 = await waitZone((z) => /^dungeon:/.test(z) && z !== z2, 30000);
  await P.page.waitForTimeout(1500);
  let done = false;
  for (let k = 0; k < 8 && !done; k++) {
    await H.devOp(wsPort, 'clearwave', id);
    for (let i = 0; i < 8 && !done; i++) {
      await P.page.waitForTimeout(250);
      done = await H.readState(P, (S) => !!S._dungeonComplete);
    }
  }
  const tDone = Date.now();
  const out3 = await waitZone((z) => z === 'wheel', 75000);
  const tAuto = (Date.now() - tDone) / 1000;
  rec.ok(`5: left alone after the clear (${z3}), the time running out takes you out by itself (${tAuto.toFixed(1)} s on)`,
    /^dungeon:/.test(z3 || '') && done && out3 === 'wheel' && tAuto >= 25 && tAuto <= 60, { z3, done, out3, tAuto });

  stopAlive = true;
  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`6: no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
