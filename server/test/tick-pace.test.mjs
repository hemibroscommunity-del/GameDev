/* ═══ v2.3.3202: THE TICK'S PACER (server/src/tickpace.js) ═══
 *
 * The runtime's setInterval waits the whole interval after each tick, so the
 * period is the interval + the tick + ~1 ms.  The pacer shortens the interval
 * when ticks start further apart than TARGET (22 + 2 ms) and puts it back the
 * moment one comes sooner.  Checked here:
 *
 *   1. the rule on its own (paceInterval);
 *   2. a simulated runtime with exactly that timer behaviour (the next tick
 *      starts `interval + 1.1 ms` after the last one ENDS, as measured with a
 *      one-line Durable Object on the local runtime): a quiet room is left
 *      alone (no re-arm, the world no faster); 10 ms ticks are held at
 *      TARGET; 18 ms ticks go to the shortest interval; 30 ms ticks (a full
 *      thread) stay there and never below it; a load that drops all at once
 *      costs one quick tick; one long hitch costs at most a few; the kill
 *      switch puts the plain interval back;
 *   3. in Node (no WebSocketPair -- the test harnesses that drive the tick
 *      by hand) the interval is never set again.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the Workers runtime's own global, before the module looks for it */
globalThis.WebSocketPair = function WebSocketPair() {};
const { TICK_PACE, paceInterval, tickPaceMethods } = await import('../src/tickpace.js');

const TICK = 22, TARGET = TICK + TICK_PACE.ABOVE_MS;

/* ── 1. the rule ───────────────────────────────────────────────────────── */
{
  check('1a. a quiet room\'s period (23.6 ms): the interval stays', paceInterval(22, 23.6, 23.6, TICK) === 22);
  check('1b. ticks 33 ms apart: the interval comes down', paceInterval(22, 33, 33, TICK) < 22);
  check('1c. never below MIN_MS', paceInterval(6, 50, 50, TICK) === TICK_PACE.MIN_MS && paceInterval(7, 60, 60, TICK) === TICK_PACE.MIN_MS);
  check('1d. a tick that came far too early (the load gone): back up by the whole difference', paceInterval(6, 30, 8, TICK) === 22 && paceInterval(6, 20, 17, TICK) === 13);
  check('1d2. ...but ordinary jitter only moves the average', paceInterval(10, 26, 20, TICK) === 9 && paceInterval(10, 21, 22, TICK) === 12);
  check('1e. never above TICK_RATE', paceInterval(22, 10, 10, TICK) === 22 && paceInterval(21, 23, 5, TICK) === 22);
  check('1f. inside the band nothing changes', paceInterval(14, TARGET + 0.9, TARGET - 0.9, TICK) === 14);
}

/* ── 2. a simulated runtime ───────────────────────────────────────────── */
function simulate(phases, { flagsAt } = {}) {
  const intervals = [];
  let rearms = 0;
  const room = Object.assign(Object.create(null), tickPaceMethods, { TICK_RATE: TICK, _liveFlags: {}, tickInterval: 1 });
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  let iv = TICK;
  globalThis.setInterval = (fn, ms) => { iv = ms; intervals.push(ms); rearms++; return 2 + rearms; };
  globalThis.clearInterval = () => {};
  const fn = () => {};
  const log = [];
  let t = 1000, k = 0;
  try {
    for (const ph of phases) {
      for (let i = 0; i < ph.ticks; i++, k++) {
        if (flagsAt && flagsAt[k]) room._liveFlags = flagsAt[k];
        const start = t;
        room._tickPaceStart(start);
        const T = typeof ph.T === 'function' ? ph.T(i) : ph.T;
        room._tickPaceEnd(fn);
        log.push({ phase: ph.name, start, T, iv });
        t = start + T + iv + 1.1;   /* the runtime: the interval after the tick ENDS, + its own ~1 ms */
      }
    }
  } finally {
    globalThis.setInterval = realSet; globalThis.clearInterval = realClear;
  }
  /* the period of each tick = the next start - this start */
  for (let i = 0; i + 1 < log.length; i++) log[i].period = log[i + 1].start - log[i].start;
  return { log, rearms, room };
}
const periods = (log, phase, from = 0) => log.filter((e) => e.phase === phase && e.period !== undefined).slice(from).map((e) => e.period);
const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

{
  const { log, room } = simulate([
    { name: 'quiet', ticks: 300, T: 0.5 },
    { name: 'busy10', ticks: 400, T: 10 },
    { name: 'busy18', ticks: 300, T: 18 },
    { name: 'full30', ticks: 300, T: 30 },
    { name: 'drop', ticks: 300, T: 0.5 },
  ]);
  const quietRearms = log.filter((e) => e.phase === 'quiet' && e.iv !== TICK).length;
  check('2a. a quiet room is left alone: the plain interval, every tick', quietRearms === 0, { quietRearms });
  const q = periods(log, 'quiet');
  check('2b. ...and its world is no faster (23.6 ms a tick)', Math.min(...q) >= 23.5, { min: Math.min(...q) });
  const b10 = periods(log, 'busy10', 100);
  check('2c. 10 ms ticks are held at TARGET (' + TARGET + ' ms), not 33', Math.abs(avg(b10) - TARGET) <= TICK_PACE.BAND_MS + 0.5, { avg: avg(b10) });
  const b10iv = log.filter((e) => e.phase === 'busy10').slice(100).map((e) => e.iv);
  const steadyRearms = b10iv.filter((v, i) => i && v !== b10iv[i - 1]).length;
  check('2d. ...with few re-arms once settled (' + steadyRearms + ' in 300 ticks)', steadyRearms <= 30, { steadyRearms });
  const b18 = log.filter((e) => e.phase === 'busy18').slice(50);
  check('2e. 18 ms ticks: the shortest interval', b18.every((e) => e.iv === TICK_PACE.MIN_MS), { ivs: [...new Set(b18.map((e) => e.iv))] });
  const f30 = log.filter((e) => e.phase === 'full30');
  check('2f. a full thread (30 ms ticks): never below MIN_MS', f30.every((e) => e.iv >= TICK_PACE.MIN_MS));
  const drop = log.filter((e) => e.phase === 'drop' && e.period !== undefined);
  const fast = drop.filter((e) => e.period < 23.5).length;
  check('2g. the load dropping all at once: ONE quick tick, then a quiet room again', fast === 1 && drop.slice(2).every((e) => e.iv === TICK), { fast, ivs: [...new Set(drop.map((e) => e.iv))] });
  const info = room._tickPaceInfo();
  check('2h. /dev/overview\'s readout', info.on === true && info.intervalMs === TICK && info.ticksPerSec > 40 && info.ticksPerSec < 43, info);
}

{
  /* one 200 ms hitch in a quiet room counts as SAMPLE_MAX_MS */
  const { log } = simulate([
    { name: 'quiet', ticks: 100, T: 0.5 },
    { name: 'hitch', ticks: 1, T: 200 },
    { name: 'after', ticks: 100, T: 0.5 },
  ]);
  const after = log.filter((e) => e.phase === 'after' && e.period !== undefined);
  const quick = after.filter((e) => e.period < 23.5).length;
  check('2i. one long hitch brings a few quick ticks at most', quick <= 3, { quick, periods: after.slice(0, 8).map((e) => Math.round(e.period * 10) / 10) });
  check('2j. ...and then a quiet room again', after.slice(10).every((e) => e.iv === TICK));
}

{
  /* a real room's ticks are not all alike: 6-14 ms, at random */
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const { log } = simulate([
    { name: 'noisy', ticks: 1200, T: () => 6 + rnd() * 8 },
  ]);
  const noisy = log.filter((e) => e.period !== undefined).slice(100);
  const a = avg(noisy.map((e) => e.period));
  const ivChanges = noisy.filter((e, i) => i && e.iv !== noisy[i - 1].iv).length;
  check('2m. ticks of 6-14 ms at random: held near TARGET (' + a.toFixed(1) + ' ms; 33 without the pacer)', a >= TARGET - 0.5 && a <= TARGET + 2, { avg: a });
  check('2n. ...and the interval set again on fewer than half the ticks', ivChanges < noisy.length / 2, { ivChanges, of: noisy.length });
}

{
  /* the kill switch in the middle of a busy spell */
  const { log } = simulate([
    { name: 'busy', ticks: 200, T: 10 },
    { name: 'off', ticks: 200, T: 10 },
  ], { flagsAt: { 200: { tickpace: false } } });
  const offIv = log.filter((e) => e.phase === 'off').slice(1).map((e) => e.iv);
  check('2k. `tickpace: false`: the plain interval from the next tick', offIv.every((v) => v === TICK), { ivs: [...new Set(offIv)] });
  const offP = periods(log, 'off', 5);
  check('2l. ...and the old, slower world (33 ms a tick)', Math.abs(avg(offP) - 33.1) < 0.2, { avg: avg(offP) });
}

/* ── 3. Node: never set again ─────────────────────────────────────────── */
{
  const mod = fileURLToPath(new URL('../src/tickpace.js', import.meta.url));
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `
    const { tickPaceMethods } = await import(${JSON.stringify('file://' + mod)});
    let sets = 0;
    globalThis.setInterval = () => { sets++; return 9; };
    globalThis.clearInterval = () => {};
    const room = Object.assign(Object.create(null), tickPaceMethods, { TICK_RATE: 22, _liveFlags: {}, tickInterval: 1 });
    let t = 0;
    for (let i = 0; i < 50; i++) { room._tickPaceStart(t); room._tickPaceEnd(() => {}); t += 40; }
    console.log(JSON.stringify({ sets, on: room._tickPaceInfo().on }));
  `], { encoding: 'utf8' }).trim().split('\n').pop();
  const r = JSON.parse(out);
  check('3a. in Node (no WebSocketPair) the interval is never set again', r.sets === 0 && r.on === false, r);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all tick-pace checks passed');
