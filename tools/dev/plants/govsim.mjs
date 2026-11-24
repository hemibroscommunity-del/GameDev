/* A closed-loop check of the governor (review-smooth): the suite's own model (frame-pacer.test §13), with ONE change --
   the heat is a STATE the phone's own work drives (less drawn -> cooler), not a function of the clock.
   Counted from the frames really drawn (the pacer may read a hot 120 screen as a 60 one).
   Usage: node govsim.mjs <worktree root> */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const ROOT = process.argv[2];
const fp = await import(pathToFileURL(join(ROOT, 'src/game/framePacer.js')).href);
const dl = await import(pathToFileURL(join(ROOT, 'src/game/drawLanes.js')).href);
const { makeGovernor, makeFramePacer, useFrameSamples } = fp;
const { KNOBS, knobAt, ladderRung, _resetLanes, liveKnobs } = dl;

const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const memStore = () => { let v = null; return { get: () => (v ? JSON.parse(JSON.stringify(v)) : null), set: (x) => { v = JSON.parse(JSON.stringify(x)); } }; };
const EFFECT = { crowd: [1, 0.8, 0.64], shine: [1, 0.86], shadows: [1, 0.8], water: [1, 0.9], pixels: [1, 0.78, 0.56] };   /* the suite's own */
const stepOf = (k, r) => KNOBS[k].steps.indexOf(knobAt('full', k, r));
const live = new Set(liveKnobs());
const eff = (k, r) => (live.has(k) ? EFFECT[k][stepOf(k, r)] : 1);
/* the owner plays alone: a crowd rung hides no one and saves no work */
const costAt = (base, r) => ({ work: base.work, chip: base.chip * eff('shine', r) * eff('shadows', r) * eff('water', r) * eff('pixels', r) });

function sim({ b, base, hot, tau, mins, seed, veils = false }) {
  _resetLanes();
  const G = makeGovernor({ on: true, store: memStore() });
  const P = makeFramePacer({ gov: G });
  const ring = [];
  useFrameSamples((fromT, fn) => { let i = ring.length; while (i > 0 && ring[i - 1].t > fromT) i--; for (let j = i; j < ring.length; j++) fn(ring[j]); return ring.length ? ring[ring.length - 1].t : fromT; }, null);
  const r = rng(seed);
  const ms = mins * 60000;
  const nominal = base.work + base.chip;
  let T = 0, k = 0, prevT = null, prevWork = 0, seen = 0, lastT = 0;
  const steps = [];
  /* 10 s windows: frames drawn and the nominal work done in each */
  const WIN = 10000, win = [];
  let passSecs = 0, misreadMs = 0;
  while (k * b < ms) {
    const t = k * b;
    const veil = t < 2000 || (veils && [10, 20, 30, 40, 50].some((m) => t >= m * 60000 && t < m * 60000 + 3000));
    let did = 0;
    if (P.take(t, !veil)) {
      if (prevT != null) { ring.push({ t, totalMs: t - prevT, workMs: prevWork }); if (ring.length > 600) ring.shift(); }
      const u = r();
      const m = (1 + (hot - 1) * T) * (u < 0.7 ? 0.85 + 0.2 * r() : u < 0.95 ? 1.05 + 0.3 * r() : 1.35 + 0.35 * r());
      const c = costAt(base, ladderRung());
      prevWork = c.work * m; prevT = t;
      k += Math.max(1, Math.ceil((c.work + c.chip) * m / b - 1e-9));
      did = c.work + c.chip;
      const w = Math.floor(t / WIN); win[w] = win[w] || { n: 0 }; win[w].n++;
    } else k += 1;
    const now = k * b, dt = now - lastT;
    /* the heat: toward the work really done in this stretch (nominal ms of work a ms of clock), against every refresh drawn at the row */
    const duty = Math.min(1.3, (did / dt) / (nominal / b));
    T += (duty - T) * Math.min(1, dt / tau);
    const rg = ladderRung();
    if (knobAt('full', 'shine', rg) !== 'on' || knobAt('full', 'shadows', rg) !== 'on' || knobAt('full', 'water', rg) !== 'moving' || knobAt('full', 'pixels', rg) !== 1) passSecs += dt / 1000;
    const rd = P.read();
    if (rd.refresh && Math.abs(rd.refresh - b) > 2) misreadMs += dt;
    lastT = now;
    const L = G.read();
    if (L.stepsN > seen) { for (const st of L.steps.slice(-(L.stepsN - seen))) steps.push({ t: Math.round(st.t / 1000), axis: st.axis, dir: st.dir, knobs: st.knobs.join('+') }); seen = L.stepsN; }
  }
  useFrameSamples(null, null);
  /* each 10 s window's real rate, snapped to the rates a screen can show */
  const snap = (f) => [120, 60, 40, 30, 24, 20].reduce((a, x) => (Math.abs(x - f) < Math.abs(a - f) ? x : a), 120);
  const rates = win.map((w) => snap((w ? w.n : 0) / (WIN / 1000)));
  const at = Object.create(null); for (const x of rates) at[x] = (at[x] || 0) + 1;
  let changes2 = 0; for (let i = Math.floor(rates.length / 2) + 1; i < rates.length; i++) if (rates[i] !== rates[i - 1]) changes2++;
  return {
    hz: Math.round(1000 / b), hot, tauS: tau / 1000, veils,
    realRateShare: Object.fromEntries(Object.entries(at).map(([f, n]) => [f + 'fps', Math.round(100 * n / rates.length) + '%'])),
    rateChangesIn2ndHalf_10sWindows: changes2,
    ladder: { down: steps.filter((x) => x.dir < 0).length, up: steps.filter((x) => x.dir > 0).length, kinds: [...new Set(steps.map((x) => x.axis + ':' + x.knobs))] },
    secsWithAPassOrPixelsDropped: Math.round(passSecs),
    pacerMisreadsRefreshShare: Math.round(100 * misreadMs / ms) + '%',
    first: steps.slice(0, 5).map((x) => `${x.t}s ${x.dir < 0 ? 'down' : 'up'} ${x.axis}:${x.knobs}`),
    end: { rung: { ...ladderRung() }, every: P.read().every, refreshRead: P.read().refresh && +P.read().refresh.toFixed(1), heat: +T.toFixed(2) },
  };
}

const runs = [
  { b: 1000 / 60, base: { work: 5, chip: 6 }, hot: 1.6 },      /* a 60 screen 5% too slow when hot */
  { b: 1000 / 60, base: { work: 5, chip: 6 }, hot: 2.1 },      /* the suite's own `hot` at 60 */
  { b: 1000 / 60, base: { work: 5, chip: 6 }, hot: 3.2 },      /* very hot: late even at 30? */
  { b: 1000 / 120, base: { work: 2.6, chip: 3.4 }, hot: 2.4 }, /* the owner's 120 screen (the flag off) */
  { b: 1000 / 120, base: { work: 2.6, chip: 3.4 }, hot: 5.4 }, /* the suite's own `hot` at 120 */
];
for (const R of runs) for (const tau of [180000, 600000]) console.log(JSON.stringify(sim({ ...R, tau, mins: 60, seed: 7 })));
console.log(JSON.stringify(sim({ b: 1000 / 60, base: { work: 5, chip: 6 }, hot: 3.2, tau: 180000, mins: 60, seed: 7, veils: true })));
