/* ═══ v2.3.4355: THE TOWNSFOLK'S BAKED BODIES ARE MADE BEHIND THE LOADING SCREEN ═══
 *
 * The owner's iPhone on the skateboard through the town: "late frames 10 in
 * 10s", "worst 170.0 = game 40.0 + outside 130.0".  Four of the townsfolk
 * have a look the shared colour numbers refuse (an eye style, patterned
 * trousers), and each pose and direction of theirs was baked on the page the
 * first time it was met: 80 to 250 ms a sheet.  A day is a fixed loop, so its
 * poses are known ahead (src/game/townsfolkWalk.js folkDayPoses,
 * folkBakeJobs) and baked behind the world's loading screen (entityRenderer
 * prewarmFolkBodies, worldTrial.js preloadWheel).  Checked:
 *   1. folkDayPoses: the jog along every leg, a stand at every stop the way
 *      he came and south, each job facing south, each once;
 *   2. folkBakeJobs: every townsperson with a day, as a quest giver and as
 *      not; the blacksmith's hammer and his loop's legs are in it;
 *   3. every pose the day itself can put him in (folkAt, walked round the
 *      whole loop) is in his jobs -- so nothing of a day is first met on the
 *      street;
 *   4. the wiring, read from the source: the renderer asks for each sheet
 *      with the very call that draws him (the same key), only for what the
 *      numbers refuse, and waits for the bakes; the world's loading screen
 *      waits for that, with a limit and the `?folkbake=0` off-ramp; an
 *      object page's bases are read a few ms at a time; and each first-sight
 *      job names itself to the frame meter.
 * The phone half is tools/qa/mp/mp-townride.mjs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLK_DAYS, folkStops, folkAt, folkFacing, folkDayPoses, folkBakeJobs } from '../../src/game/townsfolkWalk.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const keys = (a) => a.map((p) => p.pose + '|' + p.facing).sort();

/* 1 */
{
  const stops = [[0, 0, 8000, 'mine'], [18, 8, 4000], [0, 0, 7000, 'mine'], [-16, 10, 4000]];   /* the blacksmith's */
  const p = folkDayPoses(stops);
  const want = ['jog|' + folkFacing(18, 8), 'jog|' + folkFacing(-18, -8), 'jog|' + folkFacing(-16, 10), 'jog|' + folkFacing(16, -10),
    'stand|' + folkFacing(18, 8), 'stand|' + folkFacing(-18, -8), 'stand|' + folkFacing(-16, 10), 'stand|' + folkFacing(16, -10), 'stand|south', 'mine|south'];
  check('1. a day\'s poses: the jog along every leg, a stand each way and south, the job facing south', JSON.stringify(keys(p)) === JSON.stringify([...new Set(want)].sort()), keys(p));
  check('1b. each once', new Set(keys(p)).size === p.length);
  check('1c. no day, no poses', folkDayPoses(null).length === 0 && folkDayPoses([]).length === 0);
  check('1d. a day that never leaves its spot: the stand, and its job', JSON.stringify(keys(folkDayPoses([[0, 0, 5000, 'fish']]))) === JSON.stringify(['fish|south', 'stand|south']));
}
/* 2 */
const jobs = folkBakeJobs();
{
  const names = new Set(jobs.map((j) => j.name));
  check('2. every townsperson with a day is in the jobs', Object.keys(FOLK_DAYS).every((n) => names.has(n)) && names.size === Object.keys(FOLK_DAYS).length, [...names].length);
  const of = (n) => jobs.filter((j) => j.name === n).map((j) => j.pose + '|' + j.facing);
  const bs = of('Blacksmith Bro');
  check('2b. the blacksmith: his hammer (the mining swing, south) and the jog along his legs', bs.includes('mine|south') && bs.filter((k) => k.startsWith('jog|')).length >= 2, bs);
  check('2c. no job twice for one townsperson', new Set(jobs.map((j) => j.name + '|' + j.pose + '|' + j.facing)).size === jobs.length);
}
/* 3: walk each day round its whole loop on the clock, as a giver and as not: the pose and facing it puts him in */
{
  let missing = null, seen = 0;
  for (const name of Object.keys(FOLK_DAYS)) {
    const mine = new Set(jobs.filter((j) => j.name === name).map((j) => j.pose + '|' + j.facing));
    for (const giver of [false, true]) {
      const stops = folkStops(name, giver);
      let prev = folkAt(stops, 0, 0);
      for (let t = 50; t < 240000 && !missing; t += 50) {
        const at = folkAt(stops, 0, t);
        if (at.work) { seen++; if (!mine.has(at.work + '|south')) missing = { name, giver, t, need: at.work + '|south' }; }
        const dx = at.dx - prev.dx, dy = at.dy - prev.dy;
        if (at.walking && prev.walking && Math.hypot(dx, dy) > 0.01) {
          seen++;
          const f = folkFacing(dx, dy);
          if (!mine.has('jog|' + f)) missing = { name, giver, t, need: 'jog|' + f };
        }
        prev = at;
      }
    }
  }
  check('3. every pose a day puts him in, round the whole loop, is among his jobs', !missing && seen > 1000, missing || seen);
}
/* 4 */
{
  const er = readFileSync(join(ROOT, 'src/rendering/systems/entityRenderer.js'), 'utf8');
  const pw = er.slice(er.indexOf('export function prewarmFolkBodies'), er.indexOf('function _remoteBodyArt(other, mirror) {'));
  const call = "getBodyFrame(look.skin, look.pants, look.shoes, pose, dir, frameIdx, null, 'none', look.eyeColor, art, look.eyeStyle)";
  const mine = "getBodyFrame(look.skin, look.pants, look.shoes, j.pose, dir, 0, null, 'none', look.eyeColor, art, look.eyeStyle)";
  check('4. the renderer asks for each sheet with the very call that draws him (the same key)', er.includes(call) && pw.includes(mine));
  check('4b. ...his drawings worked out the same way (the facing\'s direction and mirror)', /const \{ dir, mirror \} = resolveDirection\(j\.facing\);\s*const art = _remoteBodyArt\(look, mirror\);/.test(pw)
    && /const \{ dir, mirror \} = resolveDirection\(facing\);/.test(er) && /const art = _remoteBodyArt\(look, mirror\);/.test(er));
  check('4c. ...only what the numbers refuse, only when the townsfolk are drawn live, and the bakes are waited for', /if \(!lookBodyRefused\(j\.pose, dir, art, look\.eyeStyle\)\) continue;/.test(pw)
    && /if \(!lookFolkOn\(\) \|\| !jobs \|\| !jobs\.length\) return Promise\.resolve\(0\);/.test(pw) && /return awaitBodyBuilds\(\(\) => \{/.test(pw));
  const ps = readFileSync(join(ROOT, 'src/rendering/playerSkins.js'), 'utf8');
  check('4d. a bake started by an ask is handed to whoever is waiting', /const _bp = buildBodySheet\(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eye && eye\.t, _art, blank && blank\.rects\); if \(_buildSink\) _buildSink\.push\(_bp\);/.test(ps));
  const refused = ps.slice(ps.indexOf('export function lookBodyRefused'), ps.indexOf('export function getLookBodyFrame'));
  const glb = ps.slice(ps.indexOf('export function getLookBodyFrame'), ps.indexOf('export function getLookBodyEntries'));
  check('4e. "refused" is getLookBodyFrame\'s own two refusals', /eyeBlankFor\(pose, dir, eyeStyleId\)/.test(refused) && /bodyArtSeg\(artForFacing\(art, dir\)\)/.test(refused)
    && /if \(eyeBlankFor\(pose, dir, eyeStyleId\)\) return null;\s*if \(bodyArtSeg\(artForFacing\(art, dir\)\)\) return null;/.test(glb));
  const wt = readFileSync(join(ROOT, 'src/game/worldTrial.js'), 'utf8');
  const pre = wt.slice(wt.indexOf('async function preloadWheel'), wt.indexOf('const STEPS_WAIT_MS'));
  check('4f. the world\'s loading screen waits for the bakes, with a limit', /er\.prewarmFolkBodies\(tw\.folkBakeJobs\(\)\)/.test(pre) && /await Promise\.race\(\[baked, new Promise\(\(r\) => setTimeout\(r, FOLK_BAKE_WAIT_MS\)\)\]\);/.test(pre)
    && /await objects;/.test(pre) && /const FOLK_BAKE_WAIT_MS = \d+;/.test(wt));
  check('4g. ...only while they walk, and `?folkbake=0` is the old way', /folkbake=0/.test(pre) && /if \(day\.folkWalkWanted\(\) && ahead\)/.test(pre));
  const wo = readFileSync(join(ROOT, 'src/rendering/wheelObjects.js'), 'utf8');
  const rb = wo.slice(wo.indexOf('async function readPageBottoms'), wo.indexOf('/* ── the pages ── */'));
  check('4h. an object page\'s bases are read a few ms at a time', /if \(i \+ 1 < texs\.length && performance\.now\(\) - _t0 >= BASES_SLICE_MS\) \{[\s\S]*await new Promise\(\(r\) => setTimeout\(r, 0\)\);/.test(rb) && /const BASES_SLICE_MS = [1-5];/.test(wo));
  check('4i. each first-sight job names itself to the frame meter', /noteMade\(`body \$\{pose\}-\$\{dir\}`/.test(ps) && /noteMade\('page bases'/.test(rb));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
