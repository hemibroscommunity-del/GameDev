/* ═══ THE GOO GROTTO'S GIANT SLIME SPLITS, ON A PHONE, IN THE WORLD (v2.3.3558, docs/specs/slime-boss.md) ═══
 *
 * The owner, 2026-10-22: "I think a giant slime that explodes and spawns small
 * (normal size slimes) like 8-10 maybe but shrinks in size afterwards would be
 * a good boss. Maybe it does 3 rounds of that before it finally just becomes a
 * normal slime then after you kill that you defeat the dungeon".  One real
 * player against a real worker, on a phone (390 x 844, touch), at the Goo
 * Grotto:
 *   1. the boss comes: `bn: 3, bs: 0` on the wire, drawn x4.59 a wave slime;
 *   2. hurt far past its first mark (the QA op `hurt`: the real damage path),
 *      it stops at 75%, its bar wearing its three marks;
 *   3. it swells ("BURSTING!"), then goes off: 10 of the Grotto's slimes, it a
 *      step smaller (x2.76), its bar two marks; watched every frame, it does
 *      not arrive again while its new slimes do (v2.3.3558: a re-push is not a
 *      new arrival -- game/monsterCarry.js);
 *   4. two of its slimes killed, then its second split: 9 more and x1.66, the
 *      two dead ones not dying again, and neither it nor the slimes standing
 *      arriving again;
 *   5. its third: 8 more, a normal slime's size, no marks (and nothing there
 *      arriving again);
 *   6. a slime's flight out of it, run slowly: from its middle, in an arc, to
 *      where it landed;
 *   7. its last form killed: it bursts as a blue slime, every slime it threw
 *      out still standing pops quietly (one splat for all), and the dungeon
 *      is cleared;
 *   8. no page errors.
 * The walker is a god (server/src/devtools.js); the waves are ended by the QA
 * dev op `clearwave`.
 * Pictures: tools/qa/mp/out/slimeboss-{giant,swell,burst,split1,split2,split3,cleared}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_DOORS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { SLIME_BOSS } = await import(H.REPO + '/server/src/slimeboss.js');
  const G = WHEEL_DOORS.verdant;
  const P = await H.newPlayer(browser, { name: 'Slimebane', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 2 });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `slimeboss-${name}.png`) }).catch(() => {});
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
  await waitZone((z) => z === 'wheel');
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
  const scaleOf = (mid) => P.page.evaluate((m) => (window.__btMonsterScale ? window.__btMonsterScale(m) : null), mid);
  /* a monster's resting scale: the least of a few readings */
  const restScale = async (mid, n = 6) => {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const s = await scaleOf(mid);
      if (s && s.scale > 0) best = Math.min(best, s.scale);
      await P.page.waitForTimeout(150);
    }
    return best;
  };
  const bossNow = (bid) => P.page.evaluate((b) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((q) => q.id === b);
    if (!m) return null;
    return { alive: m.alive !== false, hp: m.curHp != null ? m.curHp : m.hp, maxHp: m.maxHp, bs: m.bs, bn: m.bn,
      burstUntil: m._burstUntil || 0,
      marks: window.__btBossMarks ? window.__btBossMarks(b) : null };
  }, bid);
  const others = (bid) => P.page.evaluate((b) => {
    const S = window._gameState.current;
    return (S.monsters || []).filter((q) => q.id !== b).map((q) => ({ id: q.id, alive: q.alive !== false, quiet: !!q._quietDeath, death: q._slimeDeathStart || null }));
  }, bid);
  const words = () => P.page.evaluate(() => ((window._gameState.current || {}).dmgNumbers || []).map((d) => String(d.text || '')).filter(Boolean)).catch(() => []);
  const poll = async (fn, ms, step = 150) => {
    const t0 = Date.now();
    let v = null;
    while (Date.now() - t0 < ms) {
      v = await fn();
      if (v) return v;
      await P.page.waitForTimeout(step);
    }
    return v;
  };

  /* ── 1. the boss ── */
  await enter();
  const z1 = await waitZone((z) => /^dungeon:/.test(z), 30000);
  await P.page.waitForTimeout(1500);
  const firstWave = await P.page.evaluate(() => ((window._gameState.current.monsters || []).filter((m) => m.alive !== false)).map((m) => m.id));
  const waveScale = firstWave.length ? await restScale(firstWave[0]) : Infinity;
  const mid = await P.page.evaluate(() => ({ x: (globalThis.TOWN_W || 1152) / 2, y: (globalThis.TOWN_H || 1664) * 0.62 }));
  await H.hopTo(P, mid.x, mid.y, { step: 80, gap: 220 });
  let boss = null;
  for (let k = 0; k < 6 && !boss; k++) {
    await H.devOp(wsPort, 'clearwave', id);
    for (let i = 0; i < 12 && !boss; i++) {
      await P.page.waitForTimeout(250);
      boss = await P.page.evaluate(() => {
        const b = (window._gameState.current.monsters || []).find((m) => m.alive !== false && m.boss);
        return b ? { id: b.id, bs: b.bs, bn: b.bn, maxHp: b.maxHp, home: b.home, x: b.x, y: b.y } : null;
      });
    }
  }
  /* stand 300 px south of it, so the pictures hold all of it, its plate and
     its bar (from the arena's middle its top was under the top bar) */
  if (boss) await H.hopTo(P, boss.x, boss.y + 300, { step: 80, gap: 220 });
  await P.page.waitForTimeout(900);
  const k0 = boss ? (await restScale(boss.id)) / waveScale : NaN;
  await shot('giant');
  rec.ok(`1: in the Goo Grotto (${z1}) its boss comes, said on the wire as a splitting one (bs ${boss && boss.bs} of bn ${boss && boss.bn}), drawn x${k0.toFixed(2)} a wave slime`,
    /^dungeon:/.test(z1 || '') && !!boss && boss.bs === 0 && boss.bn === 3 && boss.home === 'verdant' && k0 > 4.4 && k0 < 4.8, { boss, k0, waveScale });
  if (!boss) { stopAlive = true; return; }

  /* ── 2-5. its three splits ── */
  const sizes = [k0];
  let killedTwo = null;
  for (let i = 0; i < 3; i++) {
    const before = await others(boss.id);
    /* Every frame from here to the split's end, which monsters ARRIVE (the
       renderer stamps _spawnFxAt on a monster's first sighting, and clears it
       SPAWN_FX_MS 620 later -- so the stamp cannot be read once afterwards).
       The boss and the slimes already standing must not; the new ones must,
       which says the watch can see an arrival at all. */
    const watched = [boss.id, ...before.filter((o) => o.alive).map((o) => o.id)];
    await P.page.evaluate((ids) => {
      const t0 = Date.now();
      const w = { t0, ids, arrived: Object.create(null), on: true };
      window.__qaArrive = w;
      const look = () => {
        if (!w.on) return;
        const S = window._gameState && window._gameState.current;
        for (const m of ((S && S.monsters) || [])) {
          if (m && m._spawnFxAt && m._spawnFxAt >= t0) w.arrived[m.id] = true;
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    }, watched);
    const r = await H.devOp(wsPort, 'hurt', id, { boss: true, dmg: 10000000 });
    const mark = Math.floor(boss.maxHp * (3 - i) / 4);
    if (i === 0) {
      const b0 = await poll(async () => { const b = await bossNow(boss.id); return b && b.hp === mark && b.marks && b.marks.visible ? b : null; }, 6000);
      rec.ok(`2: hurt far past its first mark (${r && r.dealt} of 10,000,000 dealt), it stops at 75% (${b0 && b0.hp} of ${boss.maxHp}), its bar wearing its three marks (${b0 && b0.marks && b0.marks.key})`,
        !!r && r.ok && r.hp === mark && !!b0 && /^3:0:/.test(b0.marks.key || ''), { r, b0 });
    }
    const tTell = Date.now();
    /* the swell (1.6 s) and its warning, watched while the pictures are taken:
       this box takes about a second a picture, so the swell's is asked for at
       once, and lands in it */
    let said = [];
    const swellP = poll(async () => {
      const b = await bossNow(boss.id);
      const w = (await words()).filter((x) => /BURSTING/.test(x));
      if (w.length) said = w;
      return b && b.burstUntil > Date.now() && said.length ? b : null;
    }, 4000, 100);
    if (i === 0) {
      await shot('swell');
      await shot('burst');
    }
    const swell = await swellP;
    rec.ok(`${3 + Math.min(i, 2)}: split ${i + 1} -- it swells first ("${said[0] || '-'}" over it, its swell under way)`,
      !!swell && said.length > 0, { swell, said, ms: Date.now() - tTell });
    const tSplit = Date.now();
    const after = await poll(async () => { const b = await bossNow(boss.id); return b && b.bs === i + 1 ? b : null; }, 6000, 120);
    if (i === 0) await shot('split1');
    await P.page.waitForTimeout(1000);
    const now = await others(boss.id);
    const fresh = now.filter((o) => o.alive && !before.some((x) => x.id === o.id));
    const k = (await restScale(boss.id)) / waveScale;
    sizes.push(k);
    const b1 = await bossNow(boss.id);
    const want = SLIME_BOSS.SPAWN[i];
    const kWant = Math.pow(k0, (3 - (i + 1)) / 3);
    rec.ok(`${3 + Math.min(i, 2)}: ...then it goes off: ${fresh.length} slimes out of it (${want} wanted), it a step smaller (x${k.toFixed(2)}, x${kWant.toFixed(2)} wanted), its bar's marks ${b1 && b1.marks && b1.marks.key}`,
      !!after && fresh.length === want && Math.abs(k - kWant) < 0.12 && !!b1 && b1.marks && b1.marks.key.startsWith('3:' + (i + 1) + ':'),
      { fresh: fresh.length, k, kWant, marks: b1 && b1.marks });
    const seen = await P.page.evaluate(() => {
      const w = window.__qaArrive;
      if (!w) return null;
      w.on = false;
      return { arrived: Object.keys(w.arrived), ids: w.ids };
    });
    const again = seen ? seen.ids.filter((x) => seen.arrived.includes(x)) : null;
    const came = seen ? fresh.filter((o) => seen.arrived.includes(o.id)).length : 0;
    rec.ok(`${3 + Math.min(i, 2)}: ...and nothing already there arrives again in its re-push: of ${watched.length} watched (it${watched.length > 1 ? ` and the ${watched.length - 1} slimes standing` : ''}) ${again ? again.length : '?'} arrived, while its ${fresh.length} new slimes each did (${came}) (game/monsterCarry.js)`,
      !!seen && again.length === 0 && fresh.length > 0 && came === fresh.length, { again, came, fresh: fresh.length, tSplit });
    if (i === 0) {
      /* two of its slimes killed (each a blue slime: it swells, then dies) */
      killedTwo = fresh.slice(0, 2).map((o) => o.id);
      for (const sid of killedTwo) await H.devOp(wsPort, 'hurt', id, { id: sid, dmg: 10000000 });
      const dead = await poll(async () => { const o = await others(boss.id); const d = o.filter((x) => killedTwo.includes(x.id) && !x.alive && x.death); return d.length === 2 ? d : null; }, 8000);
      killedTwo = dead ? dead.map((x) => ({ id: x.id, death: x.death })) : null;
    }
    if (i === 1) {
      const o = await others(boss.id);
      const again = (killedTwo || []).map((d) => ({ id: d.id, was: d.death, now: (o.find((x) => x.id === d.id) || {}).death }));
      rec.ok('4: ...and the two of its slimes killed before do not die again in its re-push (their death clocks as they were)',
        !!killedTwo && killedTwo.length === 2 && again.every((a) => a.now && a.now === a.was), again);
      await shot('split2');
    }
    if (i === 2) {
      await shot('split3');
      rec.ok(`5: after its third it is a normal slime's size (x${k.toFixed(2)}) and its bar has no marks left`,
        Math.abs(k - 1) < 0.1 && !!b1 && b1.marks && b1.marks.key.startsWith('3:3:'), { k, marks: b1 && b1.marks });
    }
  }

  /* ── 6. a flight out of it, slowly ── */
  const fly = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((q) => q.alive !== false && !q.boss);
    if (!m) { res(null); return; }
    const from = { x: m.x - 160, y: m.y + 40 };
    m._popFrom = { x: from.x, y: from.y, at: Date.now(), ms: 3000, hop: 46 };
    setTimeout(() => {
      const mid = { x: m.renderX, y: m.renderY, tx: m.x, ty: m.y, on: !!m._popFrom };
      setTimeout(() => res({ from, mid, end: { x: m.renderX, y: m.renderY, tx: m.x, ty: m.y, on: !!m._popFrom } }), 2600);
    }, 1300);
  }));
  const between = (v, a, b) => v > Math.min(a, b) + 4 && v < Math.max(a, b) - 4;
  rec.ok('6: a slime\'s flight out of it, run slowly: part way there, lifted in its arc, then landed where it is',
    !!fly && fly.mid.on && between(fly.mid.x, fly.from.x, fly.mid.tx) && fly.mid.y < Math.max(fly.from.y, fly.mid.ty) - 4
      && !fly.end.on && Math.abs(fly.end.x - fly.end.tx) < 40 && Math.abs(fly.end.y - fly.end.ty) < 40, fly);

  /* ── 7. its last form ── */
  const r4 = await H.devOp(wsPort, 'hurt', id, { boss: true, dmg: 10000000 });
  const gone = await poll(async () => { const b = await bossNow(boss.id); return b && !b.alive ? b : null; }, 8000);
  const settled = await poll(async () => {
    const o = await others(boss.id);
    return o.filter((x) => x.alive).length === 0 ? o : null;
  }, 8000);
  const popped = (settled || []).filter((x) => x.quiet);
  const card = await poll(async () => P.page.evaluate(() => {
    const el = document.querySelector('[data-dungeon-clear]');
    return el ? { text: el.textContent } : null;
  }), 10000);
  await shot('cleared');
  rec.ok(`7: its last form killed (${r4 && r4.dealt} dealt) it dies, every slime it threw out still standing pops quietly (${popped.length}), and the dungeon is cleared ("${card && card.text}")`,
    !!r4 && r4.ok && !!gone && !!settled && popped.length >= 20 && !popped.some((p) => (killedTwo || []).some((d) => d.id === p.id)) && !!card && /Dungeon cleared!/.test(card.text),
    { gone, popped: popped.length, card });

  stopAlive = true;
  const errs = P.logs.filter((l) => /^pageerror/.test(l));
  rec.ok('8: no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close().catch(() => {});
}
