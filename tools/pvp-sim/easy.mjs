/* ═══ v2.3.3267: HOW EASY IS THE SPARRING CLONES' EASY? ═══
   (docs/specs/sparring.md "Easy, made easy" has the table and the pick)

   The owner, after a playtest: "The bot was tough to be beat even on easy".
   Easy was the fight simulator's careless player (SKILL.low) -- a fair fight
   for a careless player, and the owner on a phone is not a simulator.  This
   puts each candidate Easy (a skill object, sim.mjs's knobs) against a
   careless player who throws no specials (the one who matters: a player new
   to a weapon's special), a careless one (SKILL.low) and an average one
   (SKILL.moderate), every weapon against every weapon, split over four worker
   threads:
     node tools/pvp-sim/easy.mjs [N] [level] [armour]
     node tools/pvp-sim/easy.mjs 200 10 both
   Level and armour as lunge.mjs.  A row: the player's win rate with each of
   their weapons (sword / bow / staff) against each clone, averaged over the
   clone's three weapons, then the worst single pairing, and the median
   seconds of a fight from its first hit.  `EASY_CANDIDATES` (JSON, a list of
   { label, skill }) tries others. */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
const HERE = new URL('.', import.meta.url).pathname;
const LV = {
  5: { L: 5, tm: { melee: 1.12, bow: 1.0, staff: 1.0 } },
  10: { L: 10, tm: { melee: 1.25, bow: 1.25, staff: 1.25 } },
  20: { L: 20, tm: { melee: 1.4, bow: 1.4, staff: 1.4 } },
};
const AR = { none: [null, null], torso: [1, null], both: [1, 1], iron: [2, 2] };
/* the careless player (sim.mjs SKILL.low), the shipped Easy until v2.3.3267 */
const LOW = {
  focus: 0.65, holdAt: 140, sprint: false, lunge: false,
  band: { bow: [0, 280], staff: [0, 380] }, kite: 'none', strafe: 0,
  special: { melee: 120, bow: 420, staff: 600 }, specialMiss: 0.25,
  shieldSpecial: 0, rollSpecial: 0, rollSigma: 260, react: 450,
  eatBelow: 0.30, bagMs: 3000, dashAt: [60, 140], lungeWaits: false,
};
const BEGIN = { ...LOW, special: null, dashAt: null, eatBelow: 0 };
const CANDIDATES = JSON.parse(process.env.EASY_CANDIDATES || 'null') || [
  { label: 'v2.3.3265 Easy (low)', skill: LOW },
  { label: 'no specials/lunge', skill: BEGIN },
  { label: '+ focus .4', skill: { ...BEGIN, focus: 0.4 } },
  { label: '+ gap 600', skill: { ...BEGIN, focus: 0.4, gapMs: 600 } },
  { label: '+ straight bolts', skill: { ...BEGIN, focus: 0.4, gapMs: 600, boltsStraight: true } },
  { label: '+ aim .12', skill: { ...BEGIN, focus: 0.4, gapMs: 600, aimSigma: 0.12, boltsStraight: true } },
  { label: '+ aim .2', skill: { ...BEGIN, focus: 0.4, gapMs: 600, aimSigma: 0.2, boltsStraight: true } },
  { label: 'gap 300, aim .12', skill: { ...BEGIN, focus: 0.5, gapMs: 300, aimSigma: 0.12, boltsStraight: true } },
];
const WEAPONS = ['melee', 'bow', 'staff'];
/* the players: `plain` is careless and throws no specials (the lunge stays: it
   is the sword's press with a lock, nothing to learn) */
const WHO = ['plain', 'low', 'moderate'];
const WHO_NAME = { plain: 'careless, no specials', low: 'careless (SKILL.low)', moderate: 'average (SKILL.moderate)' };
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

if (isMainThread) {
  const N = Number(process.argv[2] || 200);
  const L = Number(process.argv[3] || 10);
  const ar = process.argv[4] || 'both';
  const jobs = [];
  for (let ci = 0; ci < CANDIDATES.length; ci++) for (const who of WHO) for (const a of WEAPONS) for (const b of WEAPONS) jobs.push({ ci, who, a, b });
  const res = [];
  await Promise.all(Array.from({ length: 4 }, (_, w) => new Promise((ok, bad) => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { jobs: jobs.filter((_, i) => i % 4 === w), N, L, ar, cands: CANDIDATES } });
    wk.on('message', (m) => { res.push(...m); ok(); }); wk.on('error', bad);
  })));
  const pc = (x) => (Math.round(100 * x) + '%').padStart(4);
  const s = (ms) => ms == null ? '  - ' : (ms / 1000).toFixed(1).padStart(4);
  console.log(`N ${N} a pairing, L${L} (character Lv ${L + 2}), ${ar}`);
  for (const who of WHO) {
    console.log(`\nthe player: ${WHO_NAME[who]}`);
    console.log('clone'.padEnd(24) + '| player sword / bow / staff (avg over the clone\'s weapons) | worst pairing      | median s');
    for (let ci = 0; ci < CANDIDATES.length; ci++) {
      const rows = res.filter((r) => r.ci === ci && r.who === who);
      const byA = WEAPONS.map((a) => { const r = rows.filter((x) => x.a === a); return r.reduce((t, x) => t + x.winA, 0) / r.length; });
      const worst = rows.reduce((m, x) => (x.winA < m.winA ? x : m), rows[0]);
      const med = q(rows.flatMap((x) => x.hits), 0.5);
      console.log(CANDIDATES[ci].label.padEnd(24) + '| ' + byA.map(pc).join(' / ') + '                                    | '
        + (pc(worst.winA) + ' ' + worst.a + ' v ' + worst.b).padEnd(19) + '| ' + s(med));
    }
  }
  process.exit(0);
} else {
  const { fight, seed, setTune, room, SKILL } = await import(HERE + 'sim.mjs');
  const { jobs, N, L, ar, cands } = workerData;
  const out = [];
  for (const j of jobs) {
    room._liveFlags = {};
    setTune({});
    seed(7001 + 97 * (j.ci * 13 + WEAPONS.indexOf(j.a) * 3 + WEAPONS.indexOf(j.b) + WHO.indexOf(j.who) * 50));
    const lv = LV[L];
    const [ch, lg] = AR[ar];
    const specA = { style: j.a, L: lv.L, tm: lv.tm[j.a], chest: ch, legs: lg };
    const specB = { style: j.b, L: lv.L, tm: lv.tm[j.b], chest: ch, legs: lg };
    let winA = 0; const hits = [];
    for (let i = 0; i < N; i++) {
      const who = j.who === 'plain' ? { ...SKILL.low, special: null } : SKILL[j.who];
      const r = fight(specA, who, specB, cands[j.ci].skill, { gap0: 220 });
      if (r.winner === 'A') winA++;
      if (r.winner !== 'none' && r.fromFirstHit != null) hits.push(r.fromFirstHit);
    }
    out.push({ ci: j.ci, who: j.who, a: j.a, b: j.b, winA: winA / N, hits });
  }
  parentPort.postMessage(out);
}
