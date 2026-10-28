/* ═══ THE LEAN GROUND LAYS THE SAME GROUND (v2.3.3717) ═══
 *
 * `?groundlean` (public/tools/world/core/ground-worker.js, THE LEAN GROUND)
 * keeps fewer swatch pictures unpacked in the ground worker and squeezes the
 * ones it lets go.  This proves it costs the ground nothing: a phone (dpr 3)
 * walks the memory check's trip -- the Wheel's BroTown to the Flame Fields'
 * inner end and home, twice, so the second time out every picture comes back
 * from the cold store -- once as today and once with `?groundlean`, both
 * with `?groundsum` (each piece sent with a checksum of its colour numbers,
 * its colours and what is underfoot).  Then:
 *   - every piece laid both times is the SAME, byte for byte;
 *   - the lean walk thawed pictures (the cold store was used) and unpacked
 *     none twice;
 *   - its pieces came as fast (the worker's mean piece time within
 *     SLOWER_MS of today's, and no more than POPIN_MORE pop-ins more);
 *   - and the ground worker held less (its heap and buffers, after a GC).
 * v2.3.3736: lean is the DEFAULT (the owner: "including the new memory change
 * work by default would be better"), so "today" is `?groundlean=0`, the
 * old ground, and "lean" is the page as it starts.  And a SPRINT -- the
 * cache's worst case -- after the two trips: from home out across the
 * commons' edge into the Flame Fields, half again as far as the fight's
 * spot, and straight back, at a sprint's 1.33x the walk: the lean ground
 * shows no more holes on the way (pop-ins) than today's, no piece is left
 * short of a picture, and nothing fails.
 * Results: the log and tools/qa/mp/out/groundlean.json.
 *
 *   node tools/qa/mp/run.mjs groundlean
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
/* a piece's time is the worker's, on a box drawing a 3x phone in software:
   the two walks' means differ by run-to-run noise of a few ms */
const SLOWER_MS = 12;
const POPIN_MORE = 60;
/* the sprint (v2.3.3736): H.glideTo's 450 px a second is the walk; a
   sprint is 1.33x it (mp-sprint), and its pop-ins may be at most this
   many more than today's */
const SPRINT_SPEED = 600;
const SPRINT_POPIN_MORE = 25;

async function walk(browser, wsPort, webPort, query, label) {
  const P = await H.newPlayer(browser, { name: label, wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    if (!ok) return null;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 15 }).catch(() => null);
    /* past the Mayor's gate (mp-membudget's way): the worker's quests handed in, the flag kept */
    await H.devOp(wsPort, 'quests', myId).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      setInterval(keep, 100);
    });
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await P.page.waitForTimeout(6000);
    for (let k = 0; k < 2; k++) {
      await H.glideTo(P, at[0], at[1] + 40);
      await P.page.waitForTimeout(8000);
      await H.glideTo(P, home.x, home.y);
      await P.page.waitForTimeout(8000);
    }
    const read = () => P.page.evaluate(() => { const w = window.__btWorldTrial.stats; return { popIns: w.popIns, partial: w.partial, short: w.short, failures: w.failures, loads: w.loads }; });
    const s0 = await read();
    /* v2.3.3736: the sprint out across the land's edge and straight back */
    const far = [home.x + (at[0] - home.x) * 1.5, home.y + (at[1] + 40 - home.y) * 1.5];
    await H.glideTo(P, far[0], far[1], { speed: SPRINT_SPEED });
    await H.glideTo(P, home.x, home.y, { speed: SPRINT_SPEED });
    await P.page.waitForTimeout(8000);
    const s1 = await read();
    const sprint = { popIns: s1.popIns - s0.popIns, partial: s1.partial - s0.partial, loads: s1.loads - s0.loads, short: s1.short, failures: s1.failures,
      at: await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) })), far: far.map(Math.round) };
    const st = await P.page.evaluate(() => {
      const w = window.__btWorldTrial.stats;
      return { loads: w.loads, avgMs: w.loads ? +(w.sumMs / w.loads).toFixed(1) : null, maxMs: w.maxMs, popIns: w.popIns, partial: w.partial,
        failures: w.failures, diet: w.diet, sums: Object.assign({}, w.sums || {}) };
    });
    const { workers } = await memSampler(P, browser);
    const ws = (await workers()) || [];
    const g = ws.find((w) => /ground-worker/.test(w.url)) || null;
    st.worker = g ? { heapMB: g.heapMB, buffersMB: g.buffersMB } : null;
    st.sprint = sprint;
    return st;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const today = await walk(browser, wsPort, webPort, 'groundsum&groundlean=0', 'today');
  const lean = await walk(browser, wsPort, webPort, 'groundsum', 'lean');
  rec.ok('both walks went out to the Flame Fields and home, twice (guard)', !!today && !!lean);
  if (!today || !lean) return;
  const line = (s) => `${s.loads} pieces, ${s.avgMs} ms a piece (worst ${s.maxMs}), ${s.popIns} pop-ins, ${s.partial} partial; `
    + `worker heap ${s.worker && s.worker.heapMB} + buffers ${s.worker && s.worker.buffersMB} MB; diet ${JSON.stringify(s.diet)}`;
  console.log(`    today: ${line(today)}`);
  console.log(`    lean:  ${line(lean)}`);
  const keys = Object.keys(today.sums).filter((k) => k in lean.sums);
  const differ = keys.filter((k) => today.sums[k] !== lean.sums[k]);
  writeFileSync(join(OUT, 'groundlean.json'), JSON.stringify({ today: { ...today, sums: undefined }, lean: { ...lean, sums: undefined }, compared: keys.length, differ }, null, 1));
  rec.ok(`every piece laid on both walks is the same, byte for byte (${keys.length} pieces compared, ${differ.length} differ)`,
    keys.length >= 50 && differ.length === 0, { differ: differ.slice(0, 20) });
  const d = lean.diet || {};
  rec.ok(`the lean walk let pictures go and thawed them back (${d.squeezed} squeezed, ${d.thaws} thawed in ${d.thawMs} ms), and unpacked none twice (${d.redecodes})`,
    d.lean === true && d.thaws > 0 && d.redecodes === 0, d);
  rec.ok(`the lean ground came as fast: ${lean.avgMs} ms a piece against ${today.avgMs} (at most ${SLOWER_MS} more), ${lean.popIns} pop-ins against ${today.popIns} (at most ${POPIN_MORE} more), no failures`,
    lean.avgMs <= today.avgMs + SLOWER_MS && lean.popIns <= today.popIns + POPIN_MORE && !lean.failures, { today: [today.avgMs, today.popIns], lean: [lean.avgMs, lean.popIns] });
  const sp = (s) => `${s.sprint.loads} pieces, ${s.sprint.popIns} pop-ins, ${s.sprint.partial} partial, ${s.sprint.short} short at the end, ${s.sprint.failures} failures`;
  console.log(`    sprint, today: ${sp(today)}; lean: ${sp(lean)}`);
  rec.ok(`the sprint across the land's edge and back: the lean ground no holier than today's (${lean.sprint.popIns} pop-ins against ${today.sprint.popIns}, at most ${SPRINT_POPIN_MORE} more), none short, no failures`,
    lean.sprint.popIns <= today.sprint.popIns + SPRINT_POPIN_MORE && !lean.sprint.short && !lean.sprint.failures && lean.sprint.loads > 0,
    { today: today.sprint, lean: lean.sprint });
  const mb = (s) => (s.worker ? s.worker.heapMB + s.worker.buffersMB : null);
  rec.ok(`the ground worker held less: ${mb(lean)} MB against ${mb(today)}`, mb(lean) != null && mb(today) != null && mb(lean) < mb(today),
    { today: today.worker, lean: lean.worker });
}
