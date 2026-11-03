/* ═══ A TIER-2 MONSTER'S MOVE, SEEN COMING, ON A PHONE (v2.3.3946) ═══
 * (spec: docs/specs/monster-moves.md; the worker: server/src/monstermoves.js)
 *
 * The owner, 2026-11-02: "Make next tier monsters noticeably harder.  Develop
 * combo / specific ability system to make them harder to beat."  From level 6
 * a Wheel monster has moves of its tier, and each one warns on the ground
 * first.  A real player, in the world (BroTown, then out along the Stone
 * Hollows' spoke to its levels 6-10):
 *   1. the worker says it can (caps.monstermoves);
 *   2. a REAL tier-2 rock monster meets the player and winds up its combo: the
 *      phone draws its warning -- a ring round the monster, the worker's own
 *      radius, as long as both strikes, in the land's colour -- and the body
 *      throbs for it (a picture: tools/qa/mp/out/monstermoves-combo.png);
 *   3. ...and the strikes land (or miss) where it was drawn: the execute's
 *      ring or MISS on the phone;
 *   4. the other shapes, as the worker sends them (a charge's lane, a volley's
 *      fan, a two-step slam's two rings), each drawn as its shape, and a
 *      volley's release flies three balls (a picture of each);
 *   5. no page errors.
 * Sampled, not soaked (CLAUDE.md §6): one real tier-2 combo; the tier-3 and
 * tier-5 shapes from the worker's own event shapes. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the page's clock held still for a picture (mp-killroll's snap) */
const snap = async (P, path) => {
  await P.page.evaluate(() => { if (!window.__qaRealNow) { const t = Date.now(); window.__qaRealNow = Date.now; Date.now = () => t; } });
  try { await P.page.waitForTimeout(250); await P.page.screenshot({ path }); }
  finally { await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } }); }
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Movebro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1 ── */
    const caps = await H.readState(P, (S) => ({ moves: S._serverCaps && S._serverCaps.monstermoves }));
    rec.ok('1. the worker says it can (caps.monstermoves)', caps.moves === true, caps);

    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await P.page.waitForTimeout(1000);

    /* a recorder in the page: every warning drawn with a shape, and every
       landing ring and MISS, as they come (this box draws a few frames a
       second: a 1.1 s warning is read off the list, not the screen) */
    await P.page.evaluate(() => {
      window.__qaMoves = { zones: [], rings: 0, miss: 0 };
      /* the landings (a ring where it hit) and the misses, counted as they come */
      const seen = new WeakSet();
      const iv = setInterval(() => {
        const S = window._gameState && window._gameState.current;
        if (!S) return;
        for (const z of S._telegraphZones || []) {
          if (!z || !z.geo || z.__qaSeen) continue;
          z.__qaSeen = true;
          /* ...and whether its body throbs for it, then (the throb ends with the wind-up) */
          const mm = z.geo.mid ? (S.monsters || []).find((q) => q && q.id === z.geo.mid) : null;
          window.__qaMoves.zones.push({ shape: z.geo.shape, mid: z.geo.mid || null, r: z.r, ms: z.duration, color: z.color, x: Math.round(z.x), y: Math.round(z.y), at: Date.now(),
            throb: !!(mm && mm._tgUntil > Date.now()) });
        }
        for (const r of S._impactRings || []) if (r && typeof r === 'object' && !seen.has(r)) { seen.add(r); window.__qaMoves.rings++; }
        for (const d of S.dmgNumbers || []) if (d && typeof d === 'object' && !seen.has(d)) { seen.add(d); if (d.text === 'MISS') window.__qaMoves.miss++; }
      }, 15);
      window.__qaMovesIv = iv;
    });

    /* ── 2 ── out to the Stone Hollows' levels 6-10, where the rock monsters
       have their combo */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const t2 = WHEEL_SPAWNS.hollows.deeper.find((d) => d.tier === 2);
    const at = t2.points[0];
    const arrived = await H.hopTo(P, at[0], at[1] + 60, { step: 100, gap: 260, tries: 420 });
    rec.ok('2. walked out to the Stone Hollows\' levels 6-10 (guard)', !!arrived, at);
    let combo = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const got = await P.page.evaluate(() => (window.__qaMoves.zones || []).find((z) => z.shape === 'follow' && String(z.mid).indexOf('-t2-') > 0) || null);
      if (got) { combo = got; break; }
      /* stand where one will notice: next to the nearest tier-2 monster */
      const m = await P.page.evaluate(() => {
        const S = window._gameState.current, p = S.player;
        const near = (S.monsters || []).filter((q) => q && q.alive !== false && String(q.id).indexOf('wm-hollows-t2-') === 0)
          .map((q) => ({ x: q.x, y: q.y, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d)[0];
        return near || null;
      });
      if (m && m.d > 140) await H.hopTo(P, m.x, m.y + 70, { tries: 30 });
      await P.page.waitForTimeout(400);
    }
    const mon = combo && await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((q) => q && q.id === id);
      return m ? { id: m.id, level: m.level, home: m.home, element: m.element } : null;
    }, combo.mid);
    rec.ok(`2. a real tier-2 rock monster (${mon && mon.id}, level ${mon && mon.level}) winds up its combo: a ring round it, ${combo && combo.r} px, ${combo && combo.ms} ms (both strikes), in the Stone Hollows' colour`,
      !!combo && combo.r === 100 && combo.ms === 1100 && combo.color === '#795548' && !!mon && mon.level >= 6 && mon.level <= 10 && combo.throb === true, { combo, mon });
    if (combo) {
      try { await snap(P, join(OUT, 'monstermoves-combo.png')); } catch { /* the picture only */ }
    }

    /* ── 3 ── its strikes land, or miss, where it was drawn: two of them */
    const before3 = await P.page.evaluate(() => ({ rings: window.__qaMoves.rings, miss: window.__qaMoves.miss }));
    await P.page.waitForTimeout(2500);
    const after = await P.page.evaluate(() => ({ rings: window.__qaMoves.rings, miss: window.__qaMoves.miss }));
    rec.ok(`3. ...and its strikes arrive on the phone: a landing ring or a MISS (${after.rings} rings, ${after.miss} misses so far)`, !!combo && (after.rings + after.miss) >= 2, { before3, after });

    /* ── 4 ── the other shapes, as the worker sends them */
    const shapes = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      const mid = ((S.monsters || []).find((q) => q && String(q.id).indexOf('wm-hollows-t2-') === 0) || {}).id || 'qa-mm';
      const send = (pl) => window.__btDispatch({ type: 'monster_ability', payload: Object.assign({ zone: S.currentZone, monsterId: mid, x: Math.round(p.x), y: Math.round(p.y - 120) }, pl) });
      const before = (S._telegraphZones || []).length;
      send({ ability: 'charge', phase: 'telegraph', ms: 3000, radius: 34, shape: 'line', w: 34, ax: Math.round(p.x - 160), ay: Math.round(p.y - 120), bx: Math.round(p.x + 160), by: Math.round(p.y - 120) });
      send({ ability: 'volley', phase: 'telegraph', ms: 3000, radius: 44, shape: 'fan', br: 44, ang: 1.5708, span: 0.84, len: 200, n: 3, ax: Math.round(p.x), ay: Math.round(p.y - 150) });
      send({ ability: 'stomp', phase: 'telegraph', ms: 3000, radius: 150, shape: 'rings', r0: 90, ax: Math.round(p.x), ay: Math.round(p.y + 160) });
      const zs = (S._telegraphZones || []).slice(before).map((z) => z.geo && z.geo.shape);
      const balls0 = (S.slimeProjectiles || []).length;
      send({ ability: 'volley', phase: 'execute', release: true, travelMs: 650, ball: 'snowball', radius: 44, ax: Math.round(p.x), ay: Math.round(p.y - 150),
        pts: [[Math.round(p.x - 80), Math.round(p.y + 30)], [Math.round(p.x), Math.round(p.y + 50)], [Math.round(p.x + 80), Math.round(p.y + 30)]] });
      const balls = (S.slimeProjectiles || []).slice(balls0).filter((b) => b && b.displayOnly && b.kind === 'snowball').length;
      return { zs, balls };
    });
    rec.ok(`4. a charge's lane, a volley's fan and a two-step slam's two rings, each drawn as its shape (${shapes.zs.join(', ')})`, JSON.stringify(shapes.zs) === JSON.stringify(['line', 'fan', 'rings']), shapes);
    rec.ok(`4. ...and a volley's release flies its three balls, for show (the worker deals each one): ${shapes.balls}`, shapes.balls === 3, shapes);
    await P.page.waitForTimeout(700);
    try { await snap(P, join(OUT, 'monstermoves-shapes.png')); } catch { /* the picture only */ }

    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.page.evaluate(() => { try { clearInterval(window.__qaMovesIv); } catch (e) { /* gone */ } }).catch(() => {});
    await P.ctx.close().catch(() => {});
  }
}
