/* ═══ v2.3.3262: THE SWORD'S LUNGE AT A PLAYER -- HOW LONG A DAZE ═══
   (docs/specs/pvp-lunge.md has the tables and the pick)

   Every pairing with a sword in it, at each skill, for several lengths of the
   daze a landed lunge puts on a player, on the fight simulator (sim.mjs),
   split over four worker threads:
     node tools/pvp-sim/lunge.mjs [N] [levels csv] [armours csv]
     node tools/pvp-sim/lunge.mjs 300 5,10,20 both
   Levels and armour as matrix.mjs.  A row: for sword v bow and sword v staff
   the sword's win rate at low/moderate/high skill and the moderate fight's
   median seconds from the first hit; for sword v sword the moderate median and
   how often the better sword wins (hi>lo); lunges thrown and dazes landed a
   fight (moderate, sword v bow); and bow v staff, which no lunge touches, as a
   control. */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const HERE = new URL('.', import.meta.url).pathname;
const LV = {
  5: { L: 5, tm: { melee: 1.12, bow: 1.0, staff: 1.0 } },
  10: { L: 10, tm: { melee: 1.25, bow: 1.25, staff: 1.25 } },
  20: { L: 20, tm: { melee: 1.4, bow: 1.4, staff: 1.4 } },
};
const AR = { none: [null, null], torso: [1, null], both: [1, 1], iron: [2, 2] };
/* the lengths tried: none is the game before the lunge reached players */
/* `{}` is the game as shipped (pvplunge.js PVP_LUNGE: the rock monsters'
   daze, 500 ms, then 2,500 ms before another).  LUNGE_SETTINGS (JSON, the
   same shape) tries others; `lungeCd` a longer cooldown against players. */
const SETTINGS = JSON.parse(process.env.LUNGE_SETTINGS || 'null') || [
  { label: 'no lunge', tune: { lunge: false } },
  { label: 'lunge, no daze', tune: { dazeMs: 0 } },
  { label: 'daze 300 / 2200', tune: { dazeMs: 300, dazeImmuneMs: 2200 } },
  { label: 'SHIPPED 500/2500', tune: {} },
  { label: 'daze 500 / 2000', tune: { dazeMs: 500, dazeImmuneMs: 2000 } },
  { label: 'daze 1000 / 1500', tune: { dazeMs: 1000, dazeImmuneMs: 1500 } },
];
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

if (isMainThread) {
  const N = Number(process.argv[2] || 300);
  const levels = (process.argv[3] || '10').split(',').map(Number);
  const armours = (process.argv[4] || 'both').split(',');
  const jobs = [];
  for (let si = 0; si < SETTINGS.length; si++) for (const L of levels) for (const ar of armours) {
    for (const b of ['bow', 'staff']) for (const sk of ['low', 'moderate', 'high']) jobs.push({ si, L, ar, a: 'melee', b, skA: sk, skB: sk });
    for (const [skA, skB] of [['moderate', 'moderate'], ['high', 'low']]) jobs.push({ si, L, ar, a: 'melee', b: 'melee', skA, skB });
    jobs.push({ si, L, ar, a: 'bow', b: 'staff', skA: 'moderate', skB: 'moderate' });
  }
  const res = [];
  await Promise.all(Array.from({ length: 4 }, (_, w) => new Promise((ok, bad) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % 4 === w), N, w, settings: SETTINGS } });
    wk.on('message', (m) => { res.push(...m); ok(); }); wk.on('error', bad);
  })));
  const g = (si, L, ar, a, b, skA, skB) => res.find((r) => r.si === si && r.L === L && r.ar === ar && r.a === a && r.b === b && r.skA === skA && r.skB === (skB || skA));
  const s = (ms) => ms == null ? '  - ' : (ms / 1000).toFixed(1).padStart(4);
  const pc = (x) => (Math.round(100 * x) + '%').padStart(4);
  console.log('N', N);
  for (const L of levels) for (const ar of armours) {
    console.log(`\nL${L} (character Lv ${L + 2}), ${ar}`);
    console.log('setting'.padEnd(18) + '| sword v bow (lo/mod/hi, mod s) | sword v staff (lo/mod/hi, mod s) | sword v sword (mod s, hi>lo) | lunges/dazes a fight (mod SvB) | bow v staff (bow wins, mod)');
    for (let si = 0; si < SETTINGS.length; si++) {
      const mb = ['low', 'moderate', 'high'].map((sk) => g(si, L, ar, 'melee', 'bow', sk));
      const ms = ['low', 'moderate', 'high'].map((sk) => g(si, L, ar, 'melee', 'staff', sk));
      const mm = g(si, L, ar, 'melee', 'melee', 'moderate'), hl = g(si, L, ar, 'melee', 'melee', 'high', 'low');
      const bs = g(si, L, ar, 'bow', 'staff', 'moderate');
      console.log(SETTINGS[si].label.padEnd(18) + '| ' + mb.map((c) => pc(c.winA)).join('/') + ' ' + s(mb[1].hit50) + '            | '
        + ms.map((c) => pc(c.winA)).join('/') + ' ' + s(ms[1].hit50) + '              | ' + s(mm.hit50) + ' ' + pc(hl.winA) + '                  | '
        + mb[1].lunges.toFixed(1).padStart(4) + ' / ' + mb[1].dazes.toFixed(1).padStart(4) + '                  | ' + pc(bs.winA));
    }
  }
  process.exit(0);
} else {
  const { fight, seed, setTune, room } = await import(HERE + 'sim.mjs');
  const { jobs, N, w, settings } = workerData;
  const out = []; let k = 0;
  for (const j of jobs) {
    room._liveFlags = {};
    setTune(settings[j.si].tune);
    /* the same seed for a job at every setting: the fights differ only by it */
    seed(9001 + 131 * (j.L * 7 + ['none', 'torso', 'both', 'iron'].indexOf(j.ar) * 17
      + ['melee', 'bow', 'staff'].indexOf(j.b) * 31 + ['low', 'moderate', 'high'].indexOf(j.skA) * 3 + ['low', 'moderate', 'high'].indexOf(j.skB)));
    k++;
    const lv = LV[j.L];
    const [ch, lg] = AR[j.ar];
    const specA = { style: j.a, L: lv.L, tm: lv.tm[j.a], chest: ch, legs: lg };
    const specB = { style: j.b, L: lv.L, tm: lv.tm[j.b], chest: ch, legs: lg };
    let winA = 0, to = 0, lunges = 0, dazes = 0; const hit = [];
    for (let i = 0; i < N; i++) {
      const r = fight(specA, j.skA, specB, j.skB, { gap0: 350 });
      if (r.winner === 'A') winA++;
      if (r.winner === 'none') to++; else if (r.fromFirstHit != null) hit.push(r.fromFirstHit);
      lunges += r.A.stats.lunges || 0; dazes += r.B.stats.dazed || 0;
    }
    out.push({ si: j.si, L: j.L, ar: j.ar, a: j.a, b: j.b, skA: j.skA, skB: j.skB, winA: winA / N, timeout: to / N, hit50: q(hit, 0.5), lunges: lunges / N, dazes: dazes / N });
  }
  parentPort.postMessage(out);
}
