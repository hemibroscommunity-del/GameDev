/* ═══ v2.3.3258: WHAT A FISH IS WORTH (docs/specs/pvp-fights.md "Fish") ═══
   B carries five fish, A none: B's win rate between equal players (both
   moderate, the copper set), eating from the bag (open it, find the fish,
   Eat) or with the quick-eat button (one tap), by tier -- the minnow, the
   tier below where they fight, the fish caught there, the tier above.  On the
   worker's own rules: the fish ladder, a quarter of a heal in a fight with a
   player, one bite every 15 s.  Live flags in FLAGS:
     FLAGS='{"pvp_heal_share":0.25}' node tools/pvp-sim/food-one.mjs [N] */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const HERE = new URL('.', import.meta.url).pathname;
const LEVELS = [
  { L: 5, tm: { melee: 1.12, bow: 1.0, staff: 1.0 }, fish: 'clownfish', below: 'minnow', above: 'trout' },
  { L: 10, tm: { melee: 1.25, bow: 1.25, staff: 1.25 }, fish: 'trout', below: 'clownfish', above: 'salmon' },
  { L: 20, tm: { melee: 1.4, bow: 1.4, staff: 1.4 }, fish: 'salmon', below: 'trout', above: 'pike' },
];
const MODES = [
  ['none', null, null],
  ['bag, at level', 'fish', null],
  ['quick, minnow', 'minnow', 250],
  ['quick, below', 'below', 250],
  ['quick, at level', 'fish', 250],
  ['quick, above', 'above', 250],
];
if (isMainThread) {
  const N = Number(process.argv[2] || 400);
  const jobs = [];
  for (const lv of LEVELS) for (const pair of ['melee', 'bow', 'staff']) for (const sk of ['moderate']) for (const ar of ['both']) for (const m of MODES) jobs.push({ lv, pair, sk, ar, m });
  const res = [];
  await Promise.all(Array.from({ length: 4 }, (_, w) => new Promise((ok, bad) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % 4 === w), N, w } });
    wk.on('message', (m) => { res.push(...m); ok(); }); wk.on('error', bad);
  })));
  console.log("B's win rate against an equal A, both moderate, copper armour; B carries 5 fish (bites a fight in brackets)");
  console.log('     ' + MODES.map((m) => m[0].padEnd(17)).join(''));
  for (const lv of LEVELS) for (const pair of ['melee', 'bow', 'staff']) {
    const row = MODES.map((m) => { const r = res.find((x) => x.lv === lv.L && x.pair === pair && x.mode === m[0]); return (Math.round(100 * r.winB) + '% (' + r.bites.toFixed(1) + ')').padEnd(17); });
    console.log(('L' + lv.L + ' ' + pair).padEnd(9) + row.join(''));
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
    seed(31 * (w + 1) + 7907 * (++k));
    const armour = j.ar === 'both' ? { chest: 1, legs: 1 } : { chest: null, legs: null };
    const [mode, which, eatMs] = j.m;
    const name = which === 'fish' ? j.lv.fish : which === 'below' ? j.lv.below : which === 'above' ? j.lv.above : which;
    const food = which ? Object.assign({ key: 'cooked_fish_' + name, n: 5, move: true }, eatMs != null ? { eatMs } : {}) : null;
    const specA = Object.assign({ style: j.pair, L: j.lv.L, tm: j.lv.tm[j.pair] }, armour);
    const specB = Object.assign({ style: j.pair, L: j.lv.L, tm: j.lv.tm[j.pair], food }, armour);
    let winB = 0, bites = 0;
    for (let i = 0; i < N; i++) { const r = fight(specA, j.sk, specB, j.sk, { gap0: 350 }); if (r.winner === 'B') winB++; bites += r.B.stats.eaten || 0; }
    out.push({ lv: j.lv.L, pair: j.pair, mode, winB: winB / N, bites: bites / N });
  }
  parentPort.postMessage(out);
}
