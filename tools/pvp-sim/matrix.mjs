/* ═══ v2.3.3260: THE TIME-TO-KILL MATRIX (docs/specs/pvp-fights.md) ═══
   Every weapon pairing at each skill, on the fight simulator (sim.mjs), split
   over four worker threads.  Live flags can be tried (`{"oneformula":false}`
   is the world before the one formula):
     node tools/pvp-sim/matrix.mjs '<json liveflags>' [N] [levels csv] [armours csv]
     node tools/pvp-sim/matrix.mjs '{}' 300 10 none,both,iron
   Levels: 5 (character Lv 7, the tutorial kit), 10 (Lv 12, iron/hardwood
   weapons), 20 (Lv 22, black steel/cedar).  Armour: none, torso, both (the
   copper set), iron.  A row reads, per same-weapon pairing, the median
   seconds from the first hit at low/moderate/high skill, the specials' share
   of the damage and how often the better player wins (hi>lo); per mixed
   pairing, the first weapon's win rate at each skill, the moderate median,
   the timeouts (no winner in 120 s) and the win rate from an ambush in
   contact (amb). */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const HERE = new URL('.', import.meta.url).pathname;
const LV = {
  5: { L: 5, tm: { melee: 1.12, bow: 1.0, staff: 1.0 } },
  10: { L: 10, tm: { melee: 1.25, bow: 1.25, staff: 1.25 } },
  20: { L: 20, tm: { melee: 1.4, bow: 1.4, staff: 1.4 } },
};
const AR = { none: [null, null], torso: [1, null], both: [1, 1], iron: [2, 2] };
const PAIRS = [['melee', 'melee'], ['bow', 'bow'], ['staff', 'staff'], ['melee', 'bow'], ['melee', 'staff'], ['bow', 'staff']];
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

if (isMainThread) {
  const flags = JSON.parse(process.argv[2] || '{}');
  const simTune = JSON.parse(process.env.SIMTUNE || '{}');
  const N = Number(process.argv[3] || 300);
  const levels = (process.argv[4] || '10').split(',').map(Number);
  const armours = (process.argv[5] || 'none,both').split(',');
  const jobs = [];
  for (const L of levels) for (const ar of armours) for (const [a, b] of PAIRS) {
    const sks = a === b ? [['low', 'low'], ['moderate', 'moderate'], ['high', 'high'], ['high', 'low']] : [['low', 'low'], ['moderate', 'moderate'], ['high', 'high']];
    for (const [skA, skB] of sks) jobs.push({ L, ar, a, b, skA, skB, gap0: 350 });
    if (a !== b) for (const sk of ['moderate', 'high']) jobs.push({ L, ar, a, b, skA: sk, skB: sk, gap0: 40 });
  }
  const res = [];
  await Promise.all(Array.from({ length: 4 }, (_, w) => new Promise((ok, bad) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % 4 === w), N, w, flags, simTune } });
    wk.on('message', (m) => { res.push(...m); ok(); }); wk.on('error', bad);
  })));
  const g = (L, ar, a, b, skA, skB, gap0) => res.find((r) => r.L === L && r.ar === ar && r.a === a && r.b === b && r.skA === skA && r.skB === (skB || skA) && r.gap0 === (gap0 || 350));
  const s = (ms) => ms == null ? '  - ' : (ms / 1000).toFixed(1).padStart(4);
  const pc = (x) => (Math.round(100 * x) + '%').padStart(4);
  console.log('flags', JSON.stringify(flags), 'sim', JSON.stringify(simTune), 'N', N);
  for (const L of levels) for (const ar of armours) {
    const line = [];
    for (const [a, b] of PAIRS.slice(0, 3)) {
      const cs = ['low', 'moderate', 'high'].map((sk) => g(L, ar, a, b, sk));
      const hl = g(L, ar, a, b, 'high', 'low');
      line.push(`${a[0].toUpperCase()}${b[0].toUpperCase()} ${cs.map((c) => s(c.hit50)).join('/')} sp${pc(cs[1].share)} hi>lo${pc(hl.winA)}`);
    }
    for (const [a, b] of PAIRS.slice(3)) {
      const cs = ['low', 'moderate', 'high'].map((sk) => g(L, ar, a, b, sk));
      const am = ['moderate', 'high'].map((sk) => g(L, ar, a, b, sk, sk, 40));
      line.push(`${a[0].toUpperCase()}${b[0].toUpperCase()} ${cs.map((c) => pc(c.winA)).join('/')} ${s(cs[1].hit50)} to${pc(Math.max(...cs.map((c) => c.timeout)))} amb${am.map((c) => pc(c.winA)).join('/')}`);
    }
    console.log(`L${String(L).padStart(2)} ${ar.padEnd(5)} | ` + line.join(' | '));
  }
  const maxHitShare = Math.max(...res.map((r) => r.maxHitShare));
  console.log('biggest single hit seen, share of max HP:', maxHitShare.toFixed(2), ' timeouts:', Math.max(...res.map((r) => r.timeout)).toFixed(2));
  process.exit(0);
} else {
  const { fight, seed, setTune, room } = await import(HERE + 'sim.mjs');
  const { jobs, N, w, flags, simTune } = workerData;
  setTune(simTune || {});
  const out = []; let k = 0;
  /* the biggest hit any fight saw, as a share of the target's max HP */
  let maxShare = 0;
  const orig = room._applyDamage.bind(room);
  room._applyDamage = function (ps, raw, blk, opts) {
    const r = orig(ps, raw, blk, opts);
    if (r && r.dmgTaken > 0 && ps.maxHp > 0) maxShare = Math.max(maxShare, r.dmgTaken / ps.maxHp);
    return r;
  };
  for (const j of jobs) {
    room._liveFlags = Object.assign({}, flags);
    seed(9001 * (w + 1) + 131 * (++k));
    maxShare = 0;
    const lv = LV[j.L];
    const [ch, lg] = AR[j.ar];
    const specA = { style: j.a, L: lv.L, tm: lv.tm[j.a], chest: ch, legs: lg };
    const specB = { style: j.b, L: lv.L, tm: lv.tm[j.b], chest: ch, legs: lg };
    let winA = 0, to = 0, spDmg = 0, dealt = 0; const hit = [];
    for (let i = 0; i < N; i++) {
      const sB = j.gap0 === 40 ? Object.assign({}, specB, { startDelay: 500 }) : specB;
      const r = fight(specA, j.skA, sB, j.skB, { gap0: j.gap0 });
      if (r.winner === 'A') winA++;
      if (r.winner === 'none') to++; else if (r.fromFirstHit != null) hit.push(r.fromFirstHit);
      spDmg += r.A.stats.specialDmg; dealt += r.A.dealt;
    }
    out.push({ gap0: j.gap0, L: j.L, ar: j.ar, a: j.a, b: j.b, skA: j.skA, skB: j.skB, winA: winA / N, timeout: to / N, hit50: q(hit, 0.5), share: spDmg / Math.max(1, dealt), maxHitShare: maxShare });
  }
  parentPort.postMessage(out);
}
