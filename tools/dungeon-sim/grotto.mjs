/* ═══ v2.3.3570: THE GOO GROTTO'S STUDY, RE-RUN ═══
 * (docs/specs/grotto-party.md: the tables, what they mean and the decision)
 *
 * Runs the Goo Grotto (the room's own: server/src/wheeldungeon.js
 * WHEEL_DUNGEON.PARTY decides its level and its boss) for each party below,
 * many times, and prints how often each clears it, how many die and how long
 * a clear takes.  Every run is the worker's own code (sim.mjs says what is
 * the worker's and what the player model decides).
 *
 *   node tools/dungeon-sim/grotto.mjs                 32 runs a party, average players
 *   node tools/dungeon-sim/grotto.mjs --runs=8        quicker
 *   node tools/dungeon-sim/grotto.mjs --skill=careful,average,careless
 *   node tools/dungeon-sim/grotto.mjs --points=defense --gear=copper --fish=10 --level=12
 *   node tools/dungeon-sim/grotto.mjs --flags=partydungeon:false   the Grotto before v2.3.3570
 *   node tools/dungeon-sim/grotto.mjs --parties="sword;sword+bow"
 *
 * Deterministic: run k of a party is seed 1000 + 7919 k, the same on every
 * machine.  ~0.4 s a run here.
 */
import { runDungeon, seed } from './sim.mjs';

const arg = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith('--' + name + '='));
  return a ? a.slice(name.length + 3) : dflt;
};
const RUNS = Math.max(1, Number(arg('runs', 32)));
const SKILLS = String(arg('skill', 'average')).split(',');
const POINTS = arg('points', 'balanced');
const GEAR = arg('gear', 'iron');
const FISH = Number(arg('fish', 5));
const LEVEL = Number(arg('level', 10));
const LAND = arg('land', 'verdant');
const FLAGS = Object.fromEntries(String(arg('flags', '')).split(',').filter(Boolean)
  .map((kv) => { const [k, v] = kv.split(':'); return [k, v !== 'false' && v !== '0']; }));
const PARTIES = String(arg('parties', 'sword;bow;staff;sword+bow;sword+staff;bow+staff;sword+bow+staff')).split(';');

console.log(`The ${LAND === 'verdant' ? 'Goo Grotto' : LAND + ' dungeon'}: level-${LEVEL} players in ${GEAR}, points "${POINTS}", ${FISH} fish each, ${RUNS} runs a party`
  + (Object.keys(FLAGS).length ? `, live flags ${JSON.stringify(FLAGS)}` : '') + '\n');
console.log('player    party              cleared   deaths/run  clear time  dungeon level');
for (const skill of SKILLS) {
  for (const party of PARTIES) {
    const styles = party.split('+');
    let cleared = 0, deaths = 0, clearMs = 0, level = null;
    for (let k = 1; k <= RUNS; k++) {
      seed(1000 + k * 7919);
      const r = await runDungeon({
        land: LAND, flags: FLAGS, maxMs: 12 * 60000,
        party: styles.map((style) => ({ style, level: LEVEL, gear: GEAR, points: POINTS, skill, fish: { n: FISH } })),
      });
      level = r.level;
      deaths += r.deaths;
      if (r.cleared) { cleared++; clearMs += r.ms; }
    }
    const pct = Math.round(100 * cleared / RUNS);
    console.log(`${skill.padEnd(9)} ${party.padEnd(18)} ${String(cleared).padStart(2)}/${RUNS} ${String(pct).padStart(3)}%  ${(deaths / RUNS).toFixed(2).padStart(9)}  ${cleared ? String(Math.round(clearMs / cleared / 1000)).padStart(7) + ' s' : '      -  '}  ${String(level).padStart(8)}`);
  }
}
