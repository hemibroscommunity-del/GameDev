/* ═══ v2.3.3260: WHEN BOTH EAT (docs/specs/pvp-fights.md "Fish") ═══
   Both players carry five fish and eat with the quick-eat button: B's win
   rate when its fish is the same as A's, one or two tiers better, or A has
   none -- and the fight's median length from the first hit: too big a bite
   against the bar and two players with fish never finish (the one formula's
   bigger bars make a fish a third or so of one).  Live flags in FLAGS:
     FLAGS='{"oneformula":false}' node tools/pvp-sim/food-both.mjs [N] */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const HERE = new URL('.', import.meta.url).pathname;
const LEVELS = [
  { L: 5, tm: { melee: 1.12, bow: 1.0, staff: 1.0 }, t: ['minnow', 'clownfish', 'trout'] },
  { L: 10, tm: { melee: 1.25, bow: 1.25, staff: 1.25 }, t: ['clownfish', 'trout', 'salmon'] },
  { L: 20, tm: { melee: 1.4, bow: 1.4, staff: 1.4 }, t: ['trout', 'salmon', 'pike'] },
];
/* [A's fish, B's fish] by index into t: same/same, below/at, at/above, below/above */
const MATCH = [['same', 1, 1], ['below vs at', 0, 1], ['at vs above', 1, 2], ['below vs above', 0, 2], ['none vs at', -1, 1]];
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
if (isMainThread) {
  const N = Number(process.argv[2] || 400);
  const jobs = [];
  for (const lv of LEVELS) for (const pair of ['melee', 'bow', 'staff']) for (const m of MATCH) jobs.push({ lv, pair, m });
  const res = [];
  await Promise.all(Array.from({ length: 4 }, (_, w) => new Promise((ok, bad) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % 4 === w), N, w } });
    wk.on('message', (m) => { res.push(...m); ok(); }); wk.on('error', bad);
  })));
  console.log("Both moderate, copper armour, quick-eat, 5 fish each.  B's win rate (median fight from first hit)");
  console.log('          ' + MATCH.map((m) => m[0].padEnd(18)).join(''));
  for (const lv of LEVELS) for (const pair of ['melee', 'bow', 'staff']) {
    const row = MATCH.map((m) => { const r = res.find((x) => x.lv === lv.L && x.pair === pair && x.m === m[0]); return (Math.round(100 * r.winB) + '% (' + (r.t50 / 1000).toFixed(1) + 's)').padEnd(18); });
    console.log(('L' + lv.L + ' ' + pair).padEnd(10) + row.join(''));
  }
  process.exit(0);
} else {
  const { fight, seed, setTune } = await import(HERE + 'sim.mjs');
  const { jobs, N, w } = workerData;
  const out = []; let k = 0;
  setTune({});
  const { room } = await import(HERE + 'sim.mjs');
  const FLAGS = JSON.parse(process.env.FLAGS || '{}');
  for (const j of jobs) {
    room._liveFlags = Object.assign({}, FLAGS);
    seed(57 * (w + 1) + 4409 * (++k));
    const armour = { chest: 1, legs: 1 };
    const [tag, ia, ib] = j.m;
    const fa = ia < 0 ? null : { key: 'cooked_fish_' + j.lv.t[ia], n: 5, move: true, eatMs: 250 };
    const fb = { key: 'cooked_fish_' + j.lv.t[ib], n: 5, move: true, eatMs: 250 };
    let winB = 0; const ts = [];
    for (let i = 0; i < N; i++) {
      const specA = Object.assign({ style: j.pair, L: j.lv.L, tm: j.lv.tm[j.pair], food: fa ? Object.assign({}, fa) : null }, armour);
      const specB = Object.assign({ style: j.pair, L: j.lv.L, tm: j.lv.tm[j.pair], food: Object.assign({}, fb) }, armour);
      const r = fight(specA, 'moderate', specB, 'moderate', { gap0: 350 });
      if (r.winner === 'B') winB++;
      if (r.winner !== 'none' && r.fromFirstHit != null) ts.push(r.fromFirstHit);
    }
    out.push({ lv: j.lv.L, pair: j.pair, m: tag, winB: winB / N, t50: q(ts, 0.5) || 0 });
  }
  parentPort.postMessage(out);
}
