/* ═══ mp-memalarm (v2.3.6501): THE GAME'S MEMORY ALARM CAN GO OFF ═══
 *
 * Card PH's PR 2 (the shape review's item 17).  The governor's memory rung
 * (src/game/framePacer.js memFull, the lanes' `mem` axis: the caches'
 * share, then the crowd) was set off by two of the memory check's lines,
 * copied: the art's 79.3 MB, which play reads 11 to 16 of, and the chip's
 * 109.3.  It could not go off.  Now it has a trigger of its own: the game's
 * own TOTAL (art + the chip's, on a phone or a tablet, + sound) over
 * MEM_ALARM.MB, set just above what the game reads in a crowded fight
 * (docs/plan/census/PH-phone.md).
 *
 * This box cannot fill a phone's memory, so the test FORCES the count
 * (window.__btMemAlarm({ force }): MB added to the art's reading, QA only)
 * and watches what a player's phone would do.  The phone's screen is
 * scripted on time (a refresh a call, every frame inside it, as mp-governor
 * scripts its own), so no late frame moves the ladder: only the memory.
 * In the world's BroTown, `?govern=1` (the governor asked for).  Asserted:
 *   1. the alarm reads the game's own total and stands under it in town
 *      (the count is read while the governor judges);
 *   2. with the total forced over the alarm, the memory's rung is taken
 *      (__btLane().rung.mem 1) and the caches' share halves: the masked
 *      frames' cap 900 -> 450 (__btLocalMisses().cap), the frames held
 *      within it;
 *   3. the force taken off, the alarm reads under again.
 *   `?memalarm=0` (the old two lines) is held by frame-pacer.test 23b, and
 *   the pacer's own read (memFull) with it thrown and not by 23i (v2.3.6501,
 *   the gatekeeper's sitting 57).
 *   BREAK, tried 2026-11-23 on the test box: framePacer.js memFull's
 *   `memOver(m, memAlarmOld())` made `memOver(m, true)` (the old two lines:
 *   the art forced to 47 MB never reaches 79.3)  -> FAIL 2, both checks.
 *
 *   node tools/qa/mp/run.mjs memalarm
 */
import * as H from './harness.mjs';
export const lane = 'full';
/* the governor asked for (the harness adds `govern=1`): the memory is read only while it judges */
export const govern = true;

const PHONE = { width: 390, height: 844 };
const B = 1000 / 60;

const seen = (P) => P.page.evaluate(() => {
  const a = window.__btMemAlarm ? window.__btMemAlarm() : null;
  const l = window.__btLane ? window.__btLane() : null;
  const m = window.__btLocalMisses ? window.__btLocalMisses() : null;
  return { alarm: a, mem: l ? l.rung.mem | 0 : null, caches: l ? l.knobs.caches : null, cap: m ? m.cap : null, size: m ? m.size : null };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Alarmed', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query: 'perf=1' });
  const stopAlive = H.keepAlive(P);
  const said = [];
  P.page.on('pageerror', (e) => said.push('error: ' + String((e && e.message) || e).slice(0, 160)));
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok('in BroTown (guard)', ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});

    /* the phone's screen, from here: a refresh a call, every frame on time (no late frame moves the ladder) */
    await P.page.evaluate(({ b }) => {
      const raf = window.requestAnimationFrame.bind(window);
      let fake = performance.now(), seenT = -1;
      performance.now = () => fake;
      window.requestAnimationFrame = (cb) => raf((t) => {
        if (t !== seenT) { seenT = t; fake += b; }
        cb(fake);
      });
    }, { b: B });

    /* 1: the count read, under the alarm */
    const first = await H.waitFor(P, () => (window.__btMemAlarm ? window.__btMemAlarm() : null), (v) => v && typeof v.total === 'number', { timeout: 240000, label: 'the alarm\'s first read' }).catch(() => null);
    const s0 = await seen(P);
    const A = s0.alarm || {};
    rec.ok(`1. the alarm reads the game's own total: ${A.total != null ? A.total.toFixed(1) : '?'} MB in town, under its ${A.mb} MB (the old lines off: ${A.old === false})`,
      !!first && A.mb > 0 && A.old === false && typeof A.total === 'number' && A.total > 0 && A.total < A.mb && A.over === false, s0);
    rec.ok(`1. ...and the memory's rung untaken: the caches whole (share ${s0.caches}, the masked frames' cap ${s0.cap})`,
      s0.mem === 0 && s0.caches === 1 && s0.cap === 900, s0);
    if (!(A.mb > 0)) return;

    /* 2: the total forced over the alarm */
    const force = Math.ceil(A.mb - (A.total || 0)) + 10;
    await P.page.evaluate((f) => window.__btMemAlarm({ force: f }), force);
    const taken = await H.waitFor(P, () => {
      const l = window.__btLane ? window.__btLane() : null;
      const a = window.__btMemAlarm ? window.__btMemAlarm() : null;
      return l && a ? { mem: l.rung.mem | 0, caches: l.knobs.caches, over: a.over, total: a.total } : null;
    }, (v) => v && v.mem >= 1, { timeout: 300000, label: 'the memory\'s rung' }).catch(() => null);
    const s1 = await seen(P);
    rec.ok(`2. the total forced over the alarm (+${force} MB: ${s1.alarm && s1.alarm.total != null ? s1.alarm.total.toFixed(1) : '?'} over ${A.mb}) takes the memory's rung (mem ${s1.mem})`,
      !!taken && s1.mem >= 1 && s1.alarm && s1.alarm.over === true, { taken, s1 });
    rec.ok(`2. ...which frees the caches: their share ${s1.caches}, the masked frames' cap ${s0.cap} -> ${s1.cap}, ${s1.size} frames held`,
      s1.caches === 0.5 && s1.cap === 450 && s1.size <= s1.cap, s1);

    /* 3: the force off, the alarm under again */
    await P.page.evaluate(() => window.__btMemAlarm({ force: 0 }));
    const under = await H.waitFor(P, () => (window.__btMemAlarm ? window.__btMemAlarm() : null), (v) => v && v.force === 0 && v.over === false && typeof v.total === 'number' && v.total < v.mb, { timeout: 240000, label: 'the alarm under again' }).catch(() => null);
    rec.ok(`3. the force off, the alarm reads under again (${under && under.total != null ? under.total.toFixed(1) : '?'} MB)`, !!under, under);
    rec.ok('the page threw nothing', said.length === 0, said);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
