/* ═══ v2.3.4011: THE OPEN WORLD'S FIGHTS, TIER BY TIER ═══
 * (docs/specs/monster-moves.md: the tables, and what they decided)
 *
 * One sword player at each tier's middle level, in that level's gear, against
 * one and two monsters of every kind the Wheel spawns, with the monster moves
 * off (`monstermoves: false`, the fights as they were) and on.  Prints, per
 * tier: the time to kill, the damage taken (a share of the player's bar) and
 * deaths per 100 fights.  Every blow is the worker's (sim.mjs runOpenWorld).
 *
 *   node tools/dungeon-sim/open-world.mjs                 6 fights a cell, careless and average
 *   node tools/dungeon-sim/open-world.mjs --runs=3 --tiers=1,2
 *   node tools/dungeon-sim/open-world.mjs --skill=careless --n=2
 *   node tools/dungeon-sim/open-world.mjs --kinds=frost:0,ember:0
 *   node tools/dungeon-sim/open-world.mjs --detail   per kind, not only per tier
 *
 * Deterministic: fight k is seed 4000 + 7919 k, the same before and after.
 */
import { runOpenWorld, seed } from './sim.mjs';

const arg = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith('--' + name + '='));
  return a ? a.slice(name.length + 3) : dflt;
};
const RUNS = Math.max(1, Number(arg('runs', 6)));
const TIERS = String(arg('tiers', '1,2,3,4,5,6,7,8')).split(',').map(Number);
const SKILLS = String(arg('skill', 'careless,average')).split(',');
const NS = String(arg('n', '1,2')).split(',').map(Number);
const DETAIL = process.argv.includes('--detail');
const POINTS = arg('points', 'balanced');
const GEARARG = arg('gear', '');   /* empty: the level's usual (sim.mjs OPEN_GEAR) */
/* the Wheel's nine kinds (the codex's): home and its spawn list's entry */
const KINDS = String(arg('kinds', 'frost:0,ember:0,sky:0,hollows:0,thunder:0,tidal:0,mist:0,mist:1,verdant:0')).split(',')
  .map((x) => { const [home, sp] = x.split(':'); return { home, spawn: Number(sp) || 0, label: x }; });
const MODES = [['before', { monstermoves: false }], ['after', {}]];

const pad = (v, w) => String(v).padStart(w);
console.log(`Open-world fights: ${RUNS} a cell, points "${POINTS}", gear ${GEARARG || 'the level\'s usual'}, kinds ${KINDS.map((k) => k.label).join(' ')}\n`);
for (const skill of SKILLS) {
  for (const n of NS) {
    console.log(`== ${skill} player, 1 v ${n} ==`);
    console.log('tier  lvl | before: kill s  taken  deaths/100 | after: kill s  taken  deaths/100 | taken +%');
    for (const tier of TIERS) {
      const level = tier * 5 - 2;
      const agg = {};
      for (const [mode, flags] of MODES) {
        const a = { ms: 0, won: 0, taken: 0, died: 0, fights: 0, per: {} };
        for (const kind of KINDS) {
          const pk = { ms: 0, won: 0, taken: 0, died: 0, fights: 0 };
          for (let k = 1; k <= RUNS; k++) {
            seed(4000 + k * 7919 + tier * 101 + n * 13);
            const r = await runOpenWorld({ level, tier, home: kind.home, spawn: kind.spawn, n, skill, flags, place: k, points: POINTS, gear: GEARARG || undefined });
            for (const o of [a, pk]) {
              o.fights++; o.taken += Math.min(1, r.taken);
              if (r.won) { o.won++; o.ms += r.ms; }
              if (r.died) o.died++;
            }
          }
          a.per[kind.label] = pk;
        }
        agg[mode] = a;
      }
      const f = (a) => `${pad(a.won ? (a.ms / a.won / 1000).toFixed(1) : '-', 6)}  ${pad(Math.round(100 * a.taken / a.fights) + '%', 5)}  ${pad(Math.round(100 * a.died / a.fights), 10)}`;
      const B = agg.before, A = agg.after;
      const up = B.taken > 0 ? Math.round(100 * (A.taken / B.taken - 1)) : 0;
      console.log(`${pad(tier, 4)}  ${pad(level, 3)} |      ${f(B)} |     ${f(A)} | ${pad((up >= 0 ? '+' : '') + up + '%', 6)}`);
      if (DETAIL) {
        for (const kind of KINDS) {
          const b = B.per[kind.label], a2 = A.per[kind.label];
          console.log(`        ${kind.label.padEnd(10)} |      ${f(b)} |     ${f(a2)} |`);
        }
      }
    }
    console.log('');
  }
}
