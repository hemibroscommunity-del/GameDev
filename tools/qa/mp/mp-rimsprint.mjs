/* ═══ v2.3.6644: THE USUAL CONTROLS SPRINT FROM THE STICK'S RIM, THE SPRINT BUTTON GONE (card PAD part 9) ═══
 *
 * The owner, 2026-11-26, shown the controller (the Sprint button floats over
 * its right side: their drawing has no socket for it), asked "Where do you
 * think sprint should go"; told "no button; push the stick to its edge", as
 * the two-button trial already plays: "Yeah do that and remove sprint
 * button".  So on a touch screen, in the USUAL controls (no `?manual=`), the
 * left stick pushed past its drawn rim sprints, by the trial's own rules
 * (game/stickZones.js rimSprint: on at 1.25 of the drawn radius, off below
 * 1.05, a hold), and the Sprint button is not drawn; `?rimsprint=0` gives the
 * button back.  Played with REAL touches (CDP Input.dispatchTouchEvent), in
 * the Wheel's BroTown, upright AND sideways, each touch landing at the left
 * disc's centre:
 *
 *   r1. the usual controls (no `?manual=`: not mode 5): no sprint button (its probe: not shown,
 *       the rim live, the worker's sprint supported; nothing in the page);
 *   r2. the controls tour's move step says "Push it past its edge to sprint";
 *   r3. the thumb AT the drawn rim: full walking speed, no sprint, the
 *       worker's stamina still;
 *   r4. pushed past it (1.4): the sprint (how 'rim', running), and the worker
 *       bills the moves marked `sp` (its stamina falls), the phone's too;
 *   r5. eased back to the rim (1.0): it ends ('rim'), the walk on;
 *   r6. with the dashboard the other way (folded if it arrived open, open if
 *       folded): out again it sprints; lifted, it ends ('rim') -- or, where
 *       the open band hides the controls (sideways), no stick is on screen
 *       to push (said, and the band folded back).  WHERE THE
 *       ENERGY SHOWS is printed for each band state (the card's reading 2:
 *       report, build no meter): the five blocks under the bro
 *       (window.__btResourceBars.en) and the dashboard's EN bar
 *       ([data-vital="stamina"], drawn and on screen);
 *   r7. tired (the worker's stamina set to 0, and the phone's bar held
 *       under SPRINT_MIN_START while the thumb plays: the worker refills a
 *       standing bro's bar within a second, faster than a slow page's push
 *       reaches the rim; the refusal is the phone's rule): a push past the rim held
 *       about says "Not enough energy!" once and sprints nothing; eased back
 *       in and out again, once more;
 *   r8. no page errors;
 *   r9. (upright) `?rimsprint=0`: the button back, a thumb past the rim walks
 *       at full speed and sprints nothing, the tour's move step without the
 *       line.
 *
 * The two-button trial's own rim (`?manual=5`) is mp-twobuttons' part 5;
 * the button itself (with `?rimsprint=0`) mp-sprint.
 */
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';
import { SAY as TOUR } from '../../../src/data/say/controlsTutorial.js';

export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const TIRED = 'Not enough energy!';   /* SprintButton.jsx SPRINT_TIRED_NOTE, the refusal's words */

/* the left disc's drawn box (its base: the share's radius is its half width) */
const DISC = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-joystick-base');
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width };
});
/* the sprint as the phone and its (absent) button see it, and where the energy shows */
const RIMV = (P) => H.readState(P, (S) => {
  const sp = S._sprint || {};
  const b = window.__btSprintBtn ? window.__btSprintBtn() : null;
  const v = document.querySelector('[data-vital="stamina"]');
  const vb = v ? v.getBoundingClientRect() : null;
  const rb = window.__btResourceBars || null;
  const fold = document.querySelector('[data-dash-fold]');
  return { on: !!sp.on, how: sp.how || null, why: sp.why || null, running: !!(sp.on && sp.moving), st: S.rpg ? S.rpg.stamina : null,
    sx: S.stickX || 0, mode: window.__btManual ? window.__btManual.mode() : null, f: S._frameCount || 0,
    btn: b && { shown: b.shown, rim: b.rim, supported: b.supported }, dom: !!document.querySelector('[data-sprint]'),
    blocks: rb ? rb.en : null,
    bar: !!vb && vb.width > 0 && vb.height > 0 && vb.bottom > 0 && vb.top < innerHeight && vb.right > 0 && vb.left < innerWidth,
    fold: fold ? fold.getAttribute('data-dash-fold') : null, tired: window.__rimTired || 0 };
});
/* `n` of the renderer's own frames (TRAPS 200: never a clock's window) */
async function frames(P, n) {
  const f0 = await H.readState(P, (S) => S._frameCount || 0);
  await H.waitFor(P, (S) => S._frameCount || 0, (v) => v >= f0 + n, { timeout: 90000, label: n + ' frames' }).catch(() => null);
}
const srvSt = async (wsPort, id) => { const v = await H.serverPlayer(wsPort, id).catch(() => null); return v && typeof v.stamina === 'number' ? v.stamina : null; };
/* the thumb from `from` to `share` of the drawn radius `R` from the disc's centre `c`, toward `dir`
   (-1 west, 1 east: the pushes take turns, so the bro stays near where he began), in slow steps (never a swipe) */
async function thumbTo(P, touch, c, R, from, share, dir) {
  const n = Math.max(1, Math.round(Math.abs(share - from) / 0.1));
  for (let k = 1; k <= n; k++) { await touch('touchMove', [{ x: c.x + dir * (from + (share - from) * k / n) * R, y: c.y, id: 5 }]); await P.page.waitForTimeout(40); }
}
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

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Rimbro' : 'Rimside', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel' });
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
      rec.ok(`${label}: the left disc is drawn (guard)`, !!D && D.w > 40, D);
      if (!D) continue;
      const c = { x: D.x, y: D.y }, R = D.w / 2;
      const energy = [];   /* where the energy shows, each band state */

      /* r3: at the rim */
      await touch('touchStart', [{ x: c.x, y: c.y, id: 5 }]);
      await P.page.waitForTimeout(80);
      await thumbTo(P, touch, c, R, 0, 1.0, -1);
      await frames(P, 4);
      const b0 = await RIMV(P), s0 = await srvSt(wsPort, me);
      await frames(P, 8);
      const b1 = await RIMV(P), s1 = await srvSt(wsPort, me);
      rec.ok(`r3. ${label}: the thumb at the drawn rim (${Math.round(R)} px) walks at full speed (${b1.sx.toFixed(2)}) and does not sprint (${b1.on}); stamina still (phone ${b0.st} -> ${b1.st}, worker ${s0} -> ${s1})`,
        b1.sx < -0.99 && !b0.on && !b1.on && b0.st === b1.st && s0 != null && s0 === s1, { b0, b1, s0, s1 });
      /* r4: past it */
      await thumbTo(P, touch, c, R, 1.0, 1.4, -1);
      const on = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on && S._sprint.moving), (v) => v, { timeout: 20000, label: 'the rim sprint' }).catch(() => null);
      const c0 = await RIMV(P);
      let s2 = null, c1 = null;
      for (let k = 0; k < 40; k++) {
        await frames(P, 2);
        s2 = await srvSt(wsPort, me); c1 = await RIMV(P);
        if (s2 != null && s1 != null && s2 < s1 - 1 && c1.st < s1 - 1) break;
      }
      rec.ok(`r4. ${label}: pushed past the rim (1.4) it sprints (how ${c1.how}, running ${c1.running}); the worker bills the sp moves (${s1} -> ${s2}), the phone's bar falls (${c0.st} -> ${c1.st})`,
        !!on && c1.on && c1.how === 'rim' && c1.running && s2 != null && s1 != null && s2 < s1 - 1 && c1.st < s1 - 1, { c0, c1, s1, s2 });
      energy.push({ band: c1.fold, blocks: c1.blocks, bar: c1.bar });
      await P.page.screenshot({ path: join(OUT, `rimsprint-${label}-${c1.fold || 'band'}.png`) }).catch(() => null);
      /* r5: eased back to the rim */
      await thumbTo(P, touch, c, R, 1.4, 1.0, -1);
      const off = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on), (v) => !v, { timeout: 20000, label: 'the rim sprint ends' }).catch(() => null);
      await frames(P, 3);
      const d1 = await RIMV(P);
      rec.ok(`r5. ${label}: eased back to the rim it ends (${d1.why}), the walk on (${d1.sx.toFixed(2)})`, off === false && !d1.on && d1.why === 'rim' && d1.sx < -0.99, d1);
      await touch('touchEnd', [{ x: c.x - 1.0 * R, y: c.y, id: 5 }]);
      await frames(P, 3);

      /* r6: the band the other way, out again, lifted */
      const was = (await RIMV(P)).fold;
      const turned = was === 'min' ? await H.unfoldBand(P) : await H.foldBand(P);
      await frames(P, 4);
      const D2 = (await DISC(P)) || D;
      const c2 = { x: D2.x, y: D2.y }, R2 = D2.w / 2;
      await touch('touchStart', [{ x: c2.x, y: c2.y, id: 5 }]);
      await P.page.waitForTimeout(80);
      await thumbTo(P, touch, c2, R2, 0, 1.4, 1);
      const on6 = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on && S._sprint.how === 'rim'), (v) => v, { timeout: 20000, label: 'the rim sprint, the band turned' }).catch(() => null);
      await frames(P, 6);
      const e6 = await RIMV(P);
      /* where the open band hides the controls (sideways) the thumb lands on the band: no walk at all */
      const hidden = !on6 && e6.fold === 'open' && e6.sx === 0;
      if (hidden) {
        await touch('touchEnd', [{ x: c2.x + 1.4 * R2, y: c2.y, id: 5 }]);
        console.log(`  ENERGY ${label}, the dashboard open: the controls are not on screen (no stick to sprint with); the five blocks under the bro ${e6.blocks > 0.01 ? 'SHOWN' : 'not shown'}; the dashboard's EN bar ${e6.bar ? 'ON SCREEN' : 'not on screen'}`);
        await P.page.screenshot({ path: join(OUT, `rimsprint-${label}-open.png`) }).catch(() => null);
        rec.ok(`r6. ${label}: the band turned (${turned && turned.arrived} -> ${turned && turned.now}): the open band hides the controls, a thumb there walks nothing (said; the band folded back)`,
          !!turned && turned.now === 'open' && turned.arrived === 'min', { turned, e6 });
        await H.foldBand(P);
        await frames(P, 4);
      } else {
        energy.push({ band: e6.fold, blocks: e6.blocks, bar: e6.bar });
        await P.page.screenshot({ path: join(OUT, `rimsprint-${label}-${e6.fold || 'band'}.png`) }).catch(() => null);
        await touch('touchEnd', [{ x: c2.x + 1.4 * R2, y: c2.y, id: 5 }]);
        const lift = await H.waitFor(P, (S) => ({ on: !!(S._sprint && S._sprint.on), why: S._sprint && S._sprint.why }), (v) => !v.on, { timeout: 20000, label: 'lifted' }).catch(() => null);
        rec.ok(`r6. ${label}: the band turned (${turned && turned.arrived} -> ${turned && turned.now}): past the rim it sprints (${!!on6}, ${e6.how}); lifted, it ends (${lift && lift.why})`,
          !!turned && turned.now !== turned.arrived && !!on6 && e6.how === 'rim' && !!lift && lift.why === 'rim', { turned, e6, lift });
      }
      for (const e of energy) {
        console.log(`  ENERGY ${label}, the dashboard ${e.band === 'min' ? 'minimized' : e.band === 'open' ? 'open' : e.band}: the five blocks under the bro ${e.blocks != null && e.blocks > 0.01 ? 'SHOWN (alpha ' + e.blocks + ')' : 'not shown (' + e.blocks + ')'}; the dashboard's EN bar ${e.bar ? 'ON SCREEN' : 'not on screen'}`);
      }
      rec.ok(`${label}: where the energy shows was read while sprinting (guard; printed as ENERGY lines)`, energy.length >= 1, energy);

      /* r7: tired */
      const D7 = (await DISC(P)) || D2;
      const c7 = { x: D7.x, y: D7.y }, R7 = D7.w / 2;
      await COUNT_TIRED(P);
      await H.devOp(wsPort, 'vitals', me, { stamina: 0 });
      await H.readState(P, (S) => { clearInterval(window.__rimPin); window.__rimPin = setInterval(() => { if (S.rpg) S.rpg.stamina = 0; }, 5); return true; });
      const low = await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 100), (v) => v < 5, { timeout: 20000, label: 'the low bar on the phone' }).catch(() => null);
      const t0 = (await RIMV(P)).tired;
      await touch('touchStart', [{ x: c7.x, y: c7.y, id: 5 }]);
      await P.page.waitForTimeout(80);
      await thumbTo(P, touch, c7, R7, 0, 1.4, -1);
      for (const [f, t] of [[1.4, 1.6], [1.6, 1.3], [1.3, 1.5]]) { await thumbTo(P, touch, c7, R7, f, t, -1); await frames(P, 2); }
      const t1 = await RIMV(P);
      await thumbTo(P, touch, c7, R7, 1.5, 0.8, -1);
      await frames(P, 2);
      await thumbTo(P, touch, c7, R7, 0.8, 1.4, -1);
      await frames(P, 3);
      const t2 = await RIMV(P);
      await touch('touchEnd', [{ x: c7.x - 1.4 * R7, y: c7.y, id: 5 }]);
      await H.readState(P, () => { clearInterval(window.__rimPin); return true; });
      rec.ok(`r7. ${label}: tired (${low}): one push past the rim held about says "${TIRED}" once (${t1.tired - t0}) and sprints nothing (${t1.on}, ${t1.why}); out again, once more (${t2.tired - t0})`,
        low != null && t1.tired - t0 === 1 && !t1.on && t1.why === 'tired' && t2.tired - t0 === 2 && !t2.on, { t0, t1, t2 });
      await H.devOp(wsPort, 'vitals', me, { heal: true });
      await frames(P, 3);

      /* r9: `?rimsprint=0`, upright */
      if (label === 'upright') {
        const u = new URL(P.page.url());
        u.searchParams.set('rimsprint', '0');
        await P.page.goto(u.toString()).catch(() => null);
        await H.enterWorld(P);
        const inH = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel, ?rimsprint=0' }).catch(() => null);
        let h0 = null, h1 = null, w0 = null;
        if (inH) {
          await P.page.waitForFunction(() => !!(window.__btSprintBtn && window.__btTourWords), null, { timeout: 20000 }).catch(() => null);
          await frames(P, 3);
          const ch = await P.ctx.newCDPSession(P.page);
          const th = (type, pts) => ch.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
          h0 = await RIMV(P);
          w0 = await tourMove(P);
          const DH = await DISC(P);
          if (DH) {
            const ch5 = { x: DH.x, y: DH.y }, RH = DH.w / 2;
            await th('touchStart', [{ x: ch5.x, y: ch5.y, id: 5 }]);
            await P.page.waitForTimeout(80);
            await thumbTo(P, th, ch5, RH, 0, 1.6, 1);
            await frames(P, 6);
            h1 = await RIMV(P);
            await th('touchEnd', [{ x: ch5.x + 1.6 * RH, y: ch5.y, id: 5 }]);
          }
        }
        rec.ok(`r9. ${label}: \`?rimsprint=0\` (mode ${h0 && h0.mode}): the sprint button back (${h0 && h0.btn && h0.btn.shown}, in the page ${h0 && h0.dom}); a thumb past the rim walks at full speed (${h1 && h1.sx.toFixed(2)}) and sprints nothing (${h1 && h1.on}); the tour's move step: "${w0}"`,
          !!h0 && !!h0.btn && h0.btn.shown === true && h0.btn.rim === false && h0.dom && !!h1 && h1.sx > 0.9 && !h1.on && w0 === TOUR['controlsTutorial.moveBody'], { h0, h1, w0 });
      }
    }
    rec.ok('r8. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
