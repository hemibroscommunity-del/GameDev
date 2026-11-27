/* ═══ v2.3.6647: A FULL PUSH OF THE LEFT STICK SPRINTS, REACHABLE FROM ANYWHERE (card PAD part 12) ═══
 *
 * The owner, 2026-11-27, upright on an iPhone: "the sprint action isn't
 * working correctly because you can't move a big enough distance off screen
 * (in the southwest corner where the joystick is) when moving west or area
 * too close to the edge of the screen".  v2.3.6644 (card PAD part 9) made the
 * usual controls sprint from the stick's rim, the Sprint button gone, at 1.25
 * of the drawn radius from where the thumb landed: about 52 px, and the disc
 * is drawn about 55 px from the left edge.  Now (game/stickZones.js
 * stickReach, rimSprint) the thumb AT the reach sprints (off below 0.8 of
 * it), the reach the drawn radius or the room to the play area's edge less
 * 16 px (the band's top going south), the smaller, never under 18 px.
 * Played with REAL touches (CDP Input.dispatchTouchEvent) in the Wheel's
 * BroTown, upright 375 x 667 and 390 x 844 and sideways 844 x 390:
 *
 *   r1. the usual controls: no sprint button (its probe: not shown, the rim
 *       live, the worker's sprint supported; nothing in the page);
 *   r2. the controls tour's move step says "Push it past its edge to sprint";
 *   f1. landing ON the drawn disc and 20 px from the left edge, the thumb
 *       pushed west, south, south-west and east in 1.5 px steps (never a
 *       swipe), never past the edge less 16 px (or, where the landing point
 *       is within 34 px of an edge, past 18 px, the floor: on the glass): the
 *       phone sprints (how 'rim') by then and not before about the drawn
 *       radius or the room (a part push walks), and THE WORKER bills the
 *       moves (its stamina falls: the worker's word, not the page's wish).
 *       RED on main 17124fc8 going west and south from the disc (its line
 *       lay past the margin);
 *   f2. (390 x 844) a full push held until the bar empties: the run ends
 *       ('empty'), the bro walks on at full speed, the sprint never comes
 *       back while held (no flicker, counted every 5 ms), no words; then
 *       tired (the phone's bar held at 0), three more full pushes say "Not
 *       enough energy!" ONCE;
 *   r8. no page errors;
 *   r9. (390 x 844) `?rimsprint=0`: the button back, a thumb past the rim
 *       walks and sprints nothing, the tour's move step without the line;
 *   r10. (390 x 844) `?fullpush=0`: yesterday's rule whole: at the drawn rim
 *       a walk, past 1.25 of it a sprint; and the owner's bug as main plays
 *       it: from the disc west to the edge less 16 px, no sprint.
 *
 * The two-button trial's own rim (`?manual=5`) is mp-twobuttons' part 5;
 * the button itself (with `?rimsprint=0`) mp-sprint.
 */
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';
import { SAY as TOUR } from '../../../src/data/say/controlsTutorial.js';
import { STICK_ZONES } from '../../../src/game/stickZones.js';

export const lane = 'full';

const SCREENS = [
  ['upright 375', { width: 375, height: 667 }],
  ['upright 390', { width: 390, height: 844 }],
  ['sideways 844', { width: 844, height: 390 }],
];
const EDGE = STICK_ZONES.EDGE_PX, FLOOR = STICK_ZONES.REACH_FLOOR;
const STEP = 1.5;
const WAYS = [['west', Math.PI], ['south', Math.PI / 2], ['south-west', (3 * Math.PI) / 4], ['east', 0]];

/* the left disc's drawn box (its base: the drawn radius is its half width), and the left zone's bottom (the band's top) */
const DISC = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-joystick-base');
  const z = document.querySelector('[data-joyzone="L"]');
  if (!el || !z) return null;
  const b = el.getBoundingClientRect(), zb = z.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, vw: innerWidth, bandTop: zb.bottom };
});
/* the sprint as the phone and its (absent) button see it */
const RIMV = (P) => H.readState(P, (S) => {
  const sp = S._sprint || {};
  const b = window.__btSprintBtn ? window.__btSprintBtn() : null;
  return { on: !!sp.on, how: sp.how || null, why: sp.why || null, running: !!(sp.on && sp.moving), st: S.rpg ? S.rpg.stamina : null,
    sx: S.stickX || 0, sy: S.stickY || 0, mode: window.__btManual ? window.__btManual.mode() : null,
    btn: b && { shown: b.shown, rim: b.rim, supported: b.supported }, dom: !!document.querySelector('[data-sprint]'), tired: window.__rimTired || 0 };
});
/* `n` of the renderer's own frames (TRAPS 200: never a clock's window) */
async function frames(P, n) {
  const f0 = await H.readState(P, (S) => S._frameCount || 0);
  await H.waitFor(P, (S) => S._frameCount || 0, (v) => v >= f0 + n, { timeout: 90000, label: n + ' frames' }).catch(() => null);
}
const srvSt = async (wsPort, id) => { const v = await H.serverPlayer(wsPort, id).catch(() => null); return v && typeof v.stamina === 'number' ? v.stamina : null; };
const tourMove = (P) => P.page.evaluate(() => {
  const t = window.__btTourWords ? window.__btTourWords() : [];
  const m = t.find((x) => x.key === 'move');
  return m ? m.body : null;
});
/* the refusal's words counted as they are said (the popup list is kept, never replaced) */
const COUNT_TIRED = (P) => H.readState(P, (S) => {
  if (window.__rimTiredOn) return true;
  const L = S.dmgNumbers;
  if (!L) return false;
  const push = L.push;
  L.push = function () { for (const p of arguments) if (p && p.text === 'Not enough energy!') window.__rimTired = (window.__rimTired || 0) + 1; return push.apply(this, arguments); };
  window.__rimTiredOn = true;
  return true;
});
/* open ground near the bro with RAD world px clear west, south, south-west and east of it (the walk
   grid, the Wheel's blockers, the townsfolk: mp-sprint's FIND_LANE's tests), so every push is billed
   by the worker: going straight south from where players arrive the bro meets a wall.  The bro's own
   place (his feet `feetDy` under it), nearest first */
const RAD = 700;
const FIND_OPEN = (P) => P.page.evaluate(({ rad, hs }) => {
  const S = window._gameState.current;
  const g = S._tiledWalkable && S._tiledWalkable[S.currentZone];
  const Z = window.__btZones && window.__btZones[S.currentZone];
  const at = window.__btSwimAt;
  if (!g || !g.length || !Z) return { error: 'no grid', zone: S.currentZone };
  const gr = window.__btPlayerGround ? window.__btPlayerGround() : null;
  const feetDy = gr ? gr.y - S.player.y : 52;
  const rows = g.length, cols = g[0].length, cell = (Z.h * 32) / rows;
  const open = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && g[r][c] !== false && g[r][c] !== 0 && !(at && at((c + 0.5) * cell, (r + 0.5) * cell).swim);
  const W = window.__btWheelObjects;
  const bx = W && W.blockers ? W.blockers() : [];
  const rays = [[-1, 0], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2], [1, 0]];
  const fy = S.player.y + feetDy, c0 = Math.floor(S.player.x / cell), r0 = Math.floor(fy / cell);
  const out = [];
  for (let r = r0 - 90; r <= r0 + 90; r += 2) {
    for (let c = c0 - 90; c <= c0 + 90; c += 2) {
      const x = (c + 0.5) * cell, y = (r + 0.5) * cell;
      let ok = true;
      for (const [ux, uy] of rays) {
        for (let k = 0; ok && k <= rad; k += cell / 2) {
          const px = x + ux * k, py = y + uy * k, rc = Math.floor(py / cell), cc = Math.floor(px / cell);
          for (let dr = -1; ok && dr <= 1; dr++) for (let dc = -1; ok && dc <= 1; dc++) if (!open(rc + dr, cc + dc)) ok = false;
          if (ok && bx.some((b) => b.x1 > px - hs - 8 && b.x0 < px + hs + 8 && b.y1 > py - hs - 8 && b.y0 < py + hs + 8)) ok = false;
          if (ok && (S.npcs || []).some((m) => m && Math.abs(m.x - px) < 40 && Math.abs(m.y + feetDy - py) < 40)) ok = false;
        }
        if (!ok) break;
      }
      if (ok) out.push({ x, y: y - feetDy, d: Math.hypot(x - S.player.x, y - fy) });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return { cell, list: out.slice(0, 6) };
}, { rad: RAD, hs: 10 });
/* the room from (x, y) along `a` to the play area's edge less EDGE (the test's own sum, not the module's) */
function room(D, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const tx = c > 1e-9 ? (D.vw - EDGE - x) / c : c < -1e-9 ? (x - EDGE) / -c : Infinity;
  const ty = s > 1e-9 ? (D.bandTop - EDGE - y) / s : s < -1e-9 ? (y - EDGE) / -s : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  try {
    for (const [label, viewport] of SCREENS) {
      const P = await H.newPlayer(browser, { name: 'Rim' + label.replace(/\D/g, ''), wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2000);
      await P.page.waitForFunction(() => !!(window.__btSprintBtn && window.__btTourWords), null, { timeout: 20000 }).catch(() => null);
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true });
      await frames(P, 3);

      /* r1, r2 */
      const a = await RIMV(P);
      rec.ok(`r1. ${label}: the usual controls (mode ${a.mode}): no sprint button (shown ${a.btn && a.btn.shown}, the rim ${a.btn && a.btn.rim}, in the page ${a.dom}; the worker's sprint ${a.btn && a.btn.supported})`,
        a.mode != null && a.mode !== 5 && !!a.btn && a.btn.shown === false && a.btn.rim === true && a.btn.supported === true && !a.dom, a);
      const words = await tourMove(P);
      rec.ok(`r2. ${label}: the controls tour's move step: "${words}"`, words === TOUR['controlsTutorial.moveBodyEdge'], words);

      const D = await DISC(P);
      rec.ok(`${label}: the left disc and its zone are drawn (guard)`, !!D && D.w > 40 && D.bandTop > D.y, D);
      if (!D) continue;
      const R = D.w / 2;

      /* open ground, and a hop there before every push (H.hopTo, mp-sprint's way) */
      const spots = await FIND_OPEN(P);
      let home = null;
      for (const o of (spots.list || [])) {
        await H.hopTo(P, o.x, o.y, { tries: 200 });
        await P.page.waitForTimeout(800);
        const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
        if (Math.abs(here.x - o.x) < 8 && Math.abs(here.y - o.y) < 8) { home = o; break; }
      }
      rec.ok(`${label}: standing on open ground, ${RAD} px clear west, south, south-west and east (guard)`, !!home, { error: spots.error, n: (spots.list || []).length, home });
      if (!home) continue;
      const goHome = async () => { await H.hopTo(P, home.x, home.y, { tries: 200 }); await P.page.waitForTimeout(400); };

      /* f1: two landing points, four ways */
      const LANDS = [['on the drawn disc', Math.round(D.x), Math.round(D.y)], ['20 px from the left edge', 20, Math.round(D.y)]];
      for (const [where, x0, y0] of LANDS) {
        for (const [way, ang] of WAYS) {
          await goHome();
          await H.devOp(wsPort, 'vitals', me, { heal: true });
          await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 0), (v) => v >= 99, { timeout: 20000, label: 'the bar full on the phone' }).catch(() => null);
          await frames(P, 3);
          const rm = room(D, x0, y0, ang);
          const limit = Math.max(rm, FLOOR);   /* the farthest the thumb goes: the margin, or the floor's 18 px */
          const want = Math.min(R, limit);      /* where the full push should be */
          await touch('touchStart', [{ x: x0, y: y0, id: 5 }]);
          await P.page.waitForTimeout(60);
          let first = null, d = 0, early = false, walked = false;
          while (d < limit + 1) {
            d = Math.min(d + STEP, d < limit ? limit : limit + 1);
            await touch('touchMove', [{ x: x0 + Math.cos(ang) * d, y: y0 + Math.sin(ang) * d, id: 5 }]);
            await P.page.waitForTimeout(30);
            const v = await RIMV(P);
            if (Math.hypot(v.sx, v.sy) > 0.05) walked = true;
            if (v.on && v.how === 'rim') { first = d; if (d < want - STEP - 1) early = true; break; }
          }
          const pos = first == null ? null : { x: +(x0 + Math.cos(ang) * first).toFixed(1), y: +(y0 + Math.sin(ang) * first).toFixed(1) };
          const s0 = await srvSt(wsPort, me);
          let s1 = s0, v1 = null;
          for (let k = 0; k < 40 && first != null; k++) {
            await frames(P, 2);
            s1 = await srvSt(wsPort, me); v1 = await RIMV(P);
            if (s0 != null && s1 != null && s1 < s0 - 1) break;
          }
          await touch('touchEnd', [{ x: x0 + Math.cos(ang) * d, y: y0 + Math.sin(ang) * d, id: 5 }]);
          await frames(P, 3);
          const floorCase = rm < FLOOR;
          const onGlass = !!pos && pos.x >= 0 && pos.y <= D.bandTop;
          const inMargin = !!pos && pos.x >= EDGE - 1 && pos.x <= D.vw - EDGE + 1 && pos.y <= D.bandTop - EDGE + 1 && pos.y >= EDGE - 1;
          rec.ok(`f1. ${label}, ${where} (${x0}, ${y0}), ${way}: the phone sprints at ${first == null ? 'NEVER' : first.toFixed(1) + ' px'} (the room ${rm.toFixed(1)}, the full push ${want.toFixed(1)}; the thumb at ${pos ? pos.x + ', ' + pos.y : '-'}, ${floorCase ? 'the floor\'s case, on the glass' : 'inside the edge less ' + EDGE}), walking before it; the worker bills it (${s0} -> ${s1})`,
            first != null && !early && walked && (floorCase ? onGlass : inMargin) && s0 != null && s1 != null && s1 < s0 - 1,
            { first, want, rm, pos, early, walked, s0, s1, v1, D });
        }
      }
      await P.page.screenshot({ path: join(OUT, `rimsprint-${label.replace(' ', '-')}.png`) }).catch(() => null);

      if (label === 'upright 390') {
        /* f2: held until the bar empties; then tired, the words once */
        await goHome();
        const x0 = Math.round(D.x), y0 = Math.round(D.y), lim = Math.max(room(D, x0, y0, Math.PI), FLOOR);
        await COUNT_TIRED(P);
        await H.devOp(wsPort, 'vitals', me, { stamina: 14 });
        await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 100), (v) => v <= 15, { timeout: 20000, label: 'the low bar' }).catch(() => null);
        await H.readState(P, (S) => {
          clearInterval(window.__rimRec);
          const R0 = window.__rimRecS = { starts: 0, stops: 0, was: !!(S._sprint && S._sprint.on) };
          window.__rimRec = setInterval(() => { const o = !!(S._sprint && S._sprint.on); if (o && !R0.was) R0.starts++; if (!o && R0.was) R0.stops++; R0.was = o; }, 5);
          return true;
        });
        const w0 = (await RIMV(P)).tired;
        await touch('touchStart', [{ x: x0, y: y0, id: 5 }]);
        await P.page.waitForTimeout(60);
        for (let d = STEP; d <= lim; d = Math.min(d + STEP, d < lim ? lim : lim + 1)) {
          await touch('touchMove', [{ x: x0 - d, y: y0, id: 5 }]);
          await P.page.waitForTimeout(30);
          if (d >= lim) break;
        }
        const ran = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on), (v) => v, { timeout: 15000, label: 'the held sprint' }).catch(() => null);
        const empty = await H.waitFor(P, (S) => (S._sprint && S._sprint.why) || null, (v) => v === 'empty', { timeout: 30000, label: 'the bar empty' }).catch(() => null);
        await frames(P, 30);
        const h = await RIMV(P);
        const rs = await H.readState(P, () => Object.assign({}, window.__rimRecS));
        rec.ok(`f2. ${label}: a full push held: it sprints (${!!ran}), the bar empties (${empty}), the bro walks on at full speed (${h.sx.toFixed(2)}), never sprinting again while held (starts ${rs.starts}, stops ${rs.stops}: no flicker), no words (${h.tired - w0})`,
          !!ran && empty === 'empty' && h.sx < -0.99 && !h.on && rs.starts === 1 && rs.stops === 1 && h.tired - w0 === 0, { h, rs });
        /* tired: the phone's bar held at 0 (the worker refills a walking bro's faster than a slow page's push) */
        await H.devOp(wsPort, 'vitals', me, { stamina: 0 });
        await H.readState(P, (S) => { clearInterval(window.__rimPin); window.__rimPin = setInterval(() => { if (S.rpg) S.rpg.stamina = 0; }, 5); return true; });
        await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 100), (v) => v < 1, { timeout: 20000, label: 'the bar held at 0' }).catch(() => null);
        const rsT = await H.readState(P, () => Object.assign({}, window.__rimRecS));
        for (let k = 0; k < 3; k++) {
          await touch('touchMove', [{ x: x0 - 0.4 * lim, y: y0, id: 5 }]); await frames(P, 2);
          await touch('touchMove', [{ x: x0 - lim, y: y0, id: 5 }]); await frames(P, 3);
        }
        const t = await RIMV(P);
        const rs2 = await H.readState(P, () => Object.assign({}, window.__rimRecS));
        await touch('touchEnd', [{ x: x0 - lim, y: y0, id: 5 }]);
        await H.readState(P, () => { clearInterval(window.__rimPin); clearInterval(window.__rimRec); return true; });
        rec.ok(`f2. ${label}: tired, three more full pushes: "Not enough energy!" once (${t.tired - w0}), no sprint (starts ${rs2.starts - rsT.starts}, ${t.why})`,
          t.tired - w0 === 1 && !t.on && rs2.starts === rsT.starts && t.why === 'tired', { t, rs2, rsT });
        await H.devOp(wsPort, 'vitals', me, { heal: true });
        await frames(P, 3);

        /* r9 `?rimsprint=0`, r10 `?fullpush=0` */
        for (const [sw, step] of [['rimsprint', 'r9'], ['fullpush', 'r10']]) {
          const u = new URL(P.page.url());
          u.searchParams.delete('rimsprint'); u.searchParams.delete('fullpush');
          u.searchParams.set(sw, '0');
          await P.page.goto(u.toString()).catch(() => null);
          await H.enterWorld(P);
          const inH = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel, ?' + sw + '=0' }).catch(() => null);
          let h0 = null, h1 = null, h2 = null, h3 = null, w = null;
          if (inH) {
            await P.page.waitForFunction(() => !!(window.__btSprintBtn && window.__btTourWords), null, { timeout: 20000 }).catch(() => null);
            await frames(P, 3);
            await H.devOp(wsPort, 'vitals', me, { heal: true });
            const ch = await P.ctx.newCDPSession(P.page);
            const th = (type, pts) => ch.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
            h0 = await RIMV(P);
            w = await tourMove(P);
            const DH = await DISC(P);
            if (DH) {
              const cx = Math.round(DH.x), cy = Math.round(DH.y), RH = DH.w / 2;
              await th('touchStart', [{ x: cx, y: cy, id: 5 }]);
              await P.page.waitForTimeout(60);
              for (let k = 1; k <= 10; k++) { await th('touchMove', [{ x: cx + RH * k / 10, y: cy, id: 5 }]); await P.page.waitForTimeout(30); }
              await frames(P, 6);
              h1 = await RIMV(P);
              for (let k = 1; k <= 6; k++) { await th('touchMove', [{ x: cx + RH * (1 + 0.1 * k), y: cy, id: 5 }]); await P.page.waitForTimeout(30); }
              await frames(P, 6);
              h2 = await RIMV(P);
              await th('touchEnd', [{ x: cx + 1.6 * RH, y: cy, id: 5 }]);
              await frames(P, 3);
              if (sw === 'fullpush') {
                /* the owner's bug, yesterday's rule (main's): from the disc west to the edge less 16 px, no sprint */
                await th('touchStart', [{ x: cx, y: cy, id: 5 }]);
                await P.page.waitForTimeout(60);
                for (let x = cx - STEP; x > EDGE; x -= STEP) { await th('touchMove', [{ x, y: cy, id: 5 }]); await P.page.waitForTimeout(30); }
                await th('touchMove', [{ x: EDGE, y: cy, id: 5 }]);
                await frames(P, 6);
                h3 = await RIMV(P);
                await th('touchEnd', [{ x: EDGE, y: cy, id: 5 }]);
                await frames(P, 3);
              }
            }
          }
          if (sw === 'rimsprint') {
            rec.ok(`r9. ${label}: \`?rimsprint=0\` (mode ${h0 && h0.mode}): the sprint button back (${h0 && h0.btn && h0.btn.shown}, in the page ${h0 && h0.dom}); a thumb past the rim walks at full speed (${h2 && h2.sx.toFixed(2)}) and sprints nothing (${h2 && h2.on}); the tour's move step: "${w}"`,
              !!h0 && !!h0.btn && h0.btn.shown === true && h0.btn.rim === false && h0.dom && !!h2 && h2.sx > 0.9 && !h2.on && w === TOUR['controlsTutorial.moveBody'], { h0, h2, w });
          } else {
            rec.ok(`r10. ${label}: \`?fullpush=0\` (yesterday's rule): at the drawn rim a full-speed walk and no sprint (${h1 && h1.sx.toFixed(2)}, ${h1 && h1.on}); past 1.25 of it a sprint (${h2 && h2.on}, ${h2 && h2.how}); and the owner's bug, as main plays it: from the disc west to the edge less ${EDGE} px a walk (${h3 && h3.sx.toFixed(2)}) and NO sprint (${h3 && h3.on})`,
              !!h1 && h1.sx > 0.99 && !h1.on && !!h2 && h2.on && h2.how === 'rim' && !!h3 && h3.sx < -0.99 && !h3.on, { h0, h1, h2, h3 });
          }
        }
      }
    }
    rec.ok('r8. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
