/* ═══ A MONSTER'S ELEMENT, SEEN AS IT WINDS UP, ON A PHONE (v2.3.3619) ═══
 *
 * The owner, 2026-10-26: "It would be cool if you could telegraph the attacks
 * of each monster (briefly) using code to represent their elements. Maybe a
 * brief snow swirl effect before a snowman throws a snowball for instance.
 * This will promote blocking and more skilled play."
 *
 * A real player in the world (BroTown, then Frost Ridge's first snowmen):
 *   1. the picture every piece is cut from was made on the loading screen;
 *   2. eight monsters, one of each element, winding up at once (the worker's
 *      own monster_ability wind-up, delivered as the worker sends it): each
 *      draws its element's look round it, every piece of it; a picture of
 *      all eight, and one of each (tools/qa/mp/out/elemwindup-*.png);
 *   3. the pieces move;
 *   4. the look ends with the wind-up, and a monster not winding up has none;
 *   5. a REAL snowman at Frost Ridge winding up for real draws the snow swirl
 *      (a picture of it);
 *   6. `?nowindupfx` draws none, while the body still throbs;
 *   7. no page errors. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ELEMENTS = ['frost', 'flame', 'wind', 'flora', 'stone', 'storm', 'water', 'venom'];

const probe = (P) => P.page.evaluate(() => (window.__btElemWindup ? window.__btElemWindup() : null));
/* the page's clock held still for a picture (mp-killroll's snap) */
const snap = async (P, path, clip) => {
  await P.page.evaluate(() => { if (!window.__qaRealNow) { const t = Date.now(); window.__qaRealNow = Date.now; Date.now = () => t; } });
  try { await P.page.waitForTimeout(250); await P.page.screenshot(clip ? { path, clip } : { path }); }
  finally { await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } }); }
};
/* eight procedural monsters (their look is drawn in code: no art to wait
   for), one of each element, in two rows in the open square south of the
   player (north of him is the Town Hall, which stands in front of them) */
const placeEight = (P) => P.page.evaluate((els) => {
  const S = window._gameState.current;
  S.monsters = (S.monsters || []).filter((m) => !(m && String(m.id).indexOf('qa-ew-') === 0));
  els.forEach((e, i) => {
    const x = S.player.x + (i % 4 - 1.5) * 150, y = S.player.y + 150 + Math.floor(i / 4) * 190;
    S.monsters.push({
      id: 'qa-ew-' + e, x, y, renderX: x, renderY: y, hp: 40, maxHp: 40, curHp: 40,
      alive: true, arch: 'brute', type: 'brute', archetype: 'brute', level: 3, element: e,
      statuses: {}, vx: 0, vy: 0, atkCd: 0, spawnX: x, spawnY: y, targetX: x, targetY: y, _stuckArrows: [],
    });
  });
}, ELEMENTS);
const windUp = (P, ids, ms) => P.page.evaluate(({ ids, ms }) => {
  for (const id of ids) {
    window.__btDispatch({ type: 'monster_ability', payload: { monsterId: id, ability: 'swing', phase: 'windup', ms } });
  }
}, { ids, ms });
const screenOf = (P, ids) => P.page.evaluate((ids) => {
  const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
  const out = {};
  for (const id of ids) {
    const m = (S.monsters || []).find((q) => q && q.id === id);
    if (m) out[id] = { x: r.left + (m.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (m.y - S.camera.y) * (S._worldScaleY || 1), k: S._worldScaleX || 1 };
  }
  return out;
}, ids);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Windbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1 ── */
    const p0 = await probe(P);
    rec.ok('1. the wind-ups\' picture was made on the loading screen, before any wind-up', !!p0 && p0.made === true && p0.on === true && p0.lit === 0, p0);

    /* ── 2 ── eight at once */
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    /* the tutorial done, so its welcome card is not over the square */
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await P.page.waitForTimeout(1200);
    await placeEight(P);
    await P.page.waitForTimeout(900);
    const ids = ELEMENTS.map((e) => 'qa-ew-' + e);
    const drawn = await P.page.evaluate((ids) => ids.filter((id) => !!(window.__btMonsterScale && window.__btMonsterScale(id))), ids);
    rec.ok(`2. the eight monsters are on screen (guard: ${drawn.length})`, drawn.length === 8, drawn);
    await windUp(P, ids, 3000);
    await P.page.waitForTimeout(500);
    const p2 = await probe(P);
    const live = (p2 && p2.live) || [];
    const want = { frost: 13, water: 11, flame: 13, wind: 12, stone: 13, storm: 10, venom: 11, flora: 11 };
    const byEl = Object.fromEntries(live.map((l) => [l.element, l]));
    const ok2 = ELEMENTS.every((e) => byEl[e] && byEl[e].id === 'qa-ew-' + e && byEl[e].pieces === want[e] && byEl[e].alphaMax > 0.5);
    rec.ok(`2. each of the eight draws its element's look round it, every piece (${live.map((l) => l.element + ':' + l.pieces).join(' ')})`, ok2, live.map((l) => ({ e: l.element, id: l.id, n: l.pieces, a: l.alphaMax })));
    const near = live.every((l) => l.at.every(([x, y]) => Math.abs(x - l.x) < 160 && y - l.y < 60 && l.y - y < 260));
    rec.ok('2. ...each piece round its own monster', near, live.map((l) => ({ e: l.element, at: l.at.slice(0, 3), x: l.x, y: l.y })));

    /* ── 3 ── they move (before any picture: a picture holds the page's
       clock still, and the wind-up runs on in real time) */
    await P.page.waitForTimeout(160);
    const b = await probe(P);
    let moved = 0, total = 0;
    for (const la of live) {
      const lb = ((b && b.live) || []).find((q) => q.id === la.id);
      if (!lb) continue;
      for (let i = 0; i < Math.min(la.at.length, lb.at.length); i++) {
        total++;
        if (Math.hypot(la.at[i][0] - lb.at[i][0], la.at[i][1] - lb.at[i][1]) >= 2) moved++;
      }
    }
    rec.ok(`3. the pieces move (${moved} of ${total} moved in 160 ms)`, total > 40 && moved >= total * 0.6, { moved, total });

    /* the pictures: all eight, then each, every one a fresh wind-up 40% of
       the way through */
    await windUp(P, ids, 3000);
    await P.page.waitForTimeout(1200);
    await snap(P, join(OUT, 'elemwindup-all.png'));
    let crops = 0;
    for (const e of ELEMENTS) {
      await windUp(P, ['qa-ew-' + e], 3000);
      await P.page.waitForTimeout(1200);
      const s = (await screenOf(P, ['qa-ew-' + e]))['qa-ew-' + e];
      if (!s) continue;
      const w = 160, h = 190;
      const x = Math.max(0, Math.min(PHONE.width - w, s.x - w / 2)), y = Math.max(0, Math.min(PHONE.height - h, s.y - 140));
      try { await snap(P, join(OUT, `elemwindup-${e}.png`), { x, y, width: w, height: h }); crops++; } catch { /* the picture only */ }
    }
    rec.ok(`2. a picture of all eight, and of each (${crops} of 8)`, crops === 8, crops);
    await P.page.waitForTimeout(3100);

    /* ── 4 ── it ends with the wind-up */
    const p4 = await probe(P);
    rec.ok('4. the look ends with the wind-up: nothing drawn once it is over', !!p4 && p4.lit === 0 && p4.live.length === 0, p4 && { lit: p4.lit, live: p4.live.length });
    await windUp(P, ['qa-ew-frost'], 1500);
    await P.page.waitForTimeout(300);
    const p4b = await probe(P);
    rec.ok('4. ...and a monster not winding up has none (one of eight winds up: one look)', !!p4b && p4b.live.length === 1 && p4b.live[0].id === 'qa-ew-frost', p4b && p4b.live.map((l) => l.id));
    await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = (S.monsters || []).filter((m) => !(m && String(m.id).indexOf('qa-ew-') === 0)); });

    /* ── 5 ── a real snowman, winding up for real */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const sp = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, sp[0] + 150, sp[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1200);
    const near5 = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost' && !m.tier)
        .map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), el: m.element, d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
        .sort((x, y) => x.d - y.d);
    });
    rec.ok(`5. at Frost Ridge's snowmen (${near5.length} in sight, element ${near5[0] && near5[0].el})`, near5.length >= 1 && near5[0].el === 'frost', near5.slice(0, 3));
    let real = null;
    if (near5.length) {
      const m = near5[0];
      /* the page holds its own clock still the moment a snowman's wind-up
         begins, 45% of the way through it: a wind-up is 350 ms and this box
         draws a few frames a second, so a picture asked for from here comes
         after it is over */
      await P.page.evaluate(() => {
        window.__qaWindupShot = null;
        const iv = setInterval(() => {
          const S = window._gameState && window._gameState.current;
          if (!S || window.__qaRealNow) return;
          const now = Date.now();
          const w = (S.monsters || []).find((q) => q && String(q.id).indexOf('wm-frost') === 0 && q._tgUntil > now && q._tgFrom);
          if (!w) return;
          clearInterval(iv);
          const t = Math.max(now, w._tgFrom + 0.45 * (w._tgUntil - w._tgFrom));
          window.__qaRealNow = Date.now;
          Date.now = () => t;
          window.__qaWindupShot = { id: w.id, t };
          /* ...and that wind-up held as it was: the worker's NEXT wind-up for
             him, arriving while the clock is held, would start the look over
             at nothing (its from = the held clock) */
          const from = w._tgFrom, until = w._tgUntil;
          const hold = () => {
            if (!window.__qaRealNow) return;
            w._tgFrom = from; w._tgUntil = until;
            requestAnimationFrame(hold);
          };
          hold();
        }, 4);
        window.__qaWindupIv = iv;
      });
      await H.hopTo(P, m.x, m.y + 130, { tries: 40 });
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const shot = await P.page.evaluate(() => window.__qaWindupShot);
        if (shot) {
          await P.page.waitForTimeout(400);
          const q = await probe(P);
          await snap(P, join(OUT, 'elemwindup-snowman.png'));
          real = (q && q.live && q.live.find((l) => l.id === shot.id)) || { id: shot.id, element: null, frozen: true };
          break;
        }
        await P.page.waitForTimeout(60);
      }
      await P.page.evaluate(() => { clearInterval(window.__qaWindupIv); if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
    }
    rec.ok(`5. a real snowman winding up for real draws the snow swirl (${real && real.id}: ${real && real.pieces} pieces)`, !!real && real.element === 'frost' && real.pieces === 13 && real.alphaMax >= 0.5, real && { id: real.id, element: real.element, pieces: real.pieces, alphaMax: real.alphaMax });

    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 6 ── ?nowindupfx */
  const Q = await H.newPlayer(browser, { name: 'Calmbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'nowindupfx' });
  try {
    await H.enterWorld(Q);
    await H.waitFor(Q, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    await placeEight(Q);
    await Q.page.waitForTimeout(900);
    await windUp(Q, ['qa-ew-frost'], 2000);
    await Q.page.waitForTimeout(300);
    const scales = [];
    for (let i = 0; i < 6; i++) {
      const s = await Q.page.evaluate(() => (window.__btMonsterScale ? window.__btMonsterScale('qa-ew-frost') : null));
      if (s) scales.push(s.scale / s.baseMult);
      await Q.page.waitForTimeout(60);
    }
    const q6 = await probe(Q);
    rec.ok('6. `?nowindupfx` draws no element look...', !!q6 && q6.on === false && q6.lit === 0, q6 && { on: q6.on, lit: q6.lit });
    rec.ok('6. ...while the body still throbs (the tell as it was)', scales.length > 0 && Math.max(...scales) > 1.02, scales);
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
