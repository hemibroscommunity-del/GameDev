/* ═══ v2.3.5781: BOTH WHEELS ARE BAKED FROM TODAY'S PLAN (card U2 PR 2; CLAUDE.md §8 row "a change to the Wheel's plan or objects") ═══
 *
 * CLAUDE.md §7: a change to the plan, the object catalog, the placing, or the
 * trees' or rocks' picture sizes re-bakes BOTH Wheels in the same PR.  The
 * bakes' `--check` (test-world-core runs them) takes about 90 s, so it ran
 * only by hand.  This reads fingerprints instead, in well under two seconds
 * (tools/guards/lib/wheelBakes.mjs says how, and what it cannot see):
 *
 *   1. the world bake (public/tools/world/core/placed.js) was made from
 *      today's plan, catalog and placing, for both Wheels;
 *   2. the spawns bake's full check passed at today's inputs (both plans and
 *      the trees' and rocks' sizes): the fingerprint ./lib/wheelBakesSeen.mjs
 *      recorded with it is today's;
 *   3. ...and the spawns files are the ones that check saw (their
 *      WHEEL_SPAWNS_HASH), so a re-bake is checked again;
 *   4. it stays under two seconds.
 *
 * After a re-bake:  node tools/guards/wheel-bakes.test.mjs --write
 * runs both bakes' full `--check` (about 90 s) and records the fingerprint
 * only if both pass.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   public/tools/world/plan.js: the Blacksmith's `name` one letter changed -> FAIL 1 and 2
 *   src/data/treeArt.js: a tree's `foot` one pixel wider                  -> FAIL 2
 *   server/src/wheelspawns1.js: WHEEL_SPAWNS_HASH one digit changed       -> FAIL 3
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, worldBakes, bakeInputs, spawnHashes, renderSeen } from './lib/wheelBakes.mjs';

if (process.argv.includes('--write')) {
  for (const s of ['tools/world/bake-wheel-spawns.mjs', 'tools/world/bake-wheel-world.mjs']) {
    console.log(`running ${s} --check ...`);
    const r = spawnSync(process.execPath, [s, '--check'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) { console.log(`FAIL ${s} --check: re-bake (node ${s}) and run --write again; nothing written`); process.exit(1); }
  }
  const h = spawnHashes();
  const seen = { inputs: bakeInputs().inputs, spawnsLong: h.long, spawnsShort: h.short };
  writeFileSync(join(ROOT, 'tools/guards/lib/wheelBakesSeen.mjs'), renderSeen(seen));
  console.log('wrote tools/guards/lib/wheelBakesSeen.mjs: ' + JSON.stringify(seen));
  process.exit(0);
}

const { SEEN } = await import('./lib/wheelBakesSeen.mjs');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 700))); }
}
const REBAKE = 'run node tools/world/bake-wheel-world.mjs and node tools/world/bake-wheel-spawns.mjs, then node tools/guards/wheel-bakes.test.mjs --write';

const world = worldBakes();
const stale = world.filter((w) => w.now !== w.baked);
check(`1. the world bake (placed.js) is from today's plan, catalog and placing, both Wheels (${world.map((w) => w.now).join(', ')})`,
  stale.length === 0, stale.length ? { stale, fix: REBAKE } : undefined);

const inp = bakeInputs();
check(`2. the spawns bake's full check passed at today's inputs (both plans, the trees' and rocks' sizes: ${inp.inputs})`,
  inp.inputs === SEEN.inputs, { now: inp, checked: SEEN.inputs, fix: REBAKE });

const h = spawnHashes();
check(`3. ...and the spawns files are the ones it checked (${h.long}, ${h.short})`,
  h.long === SEEN.spawnsLong && h.short === SEEN.spawnsShort, { now: h, checked: [SEEN.spawnsLong, SEEN.spawnsShort], fix: 'node tools/guards/wheel-bakes.test.mjs --write' });

const ms = Math.round(performance.now());   /* since the process began: the imports included */
check(`4. it took ${ms} ms from start, imports included (under 2000)`, ms < 2000, ms);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
