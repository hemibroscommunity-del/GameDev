/* ═══ v2.3.5221: THE LANES' TABLE HOLDS (grand plan step 2.1, card O PR 1) ═══
 *
 * The table is src/game/drawLanes.js (the knobs, the lanes, the ladder's two
 * axes, the overrides, the game's own drawing programs); docs/LANES.md is
 * made from it.  The rules: docs/specs/draw-lanes.md.  This guard holds:
 *
 *   1. every knob has a value in every lane, and it is one of its steps;
 *   2. every rung is ONE knob ONE step: walking each axis from the `full`
 *      row, a rung is `{ knob, to }` and nothing else, and takes its knob
 *      exactly one step down (a rung that lowers no knob, or two, fails);
 *   3. COMBAT'S TIMING AND LOADING ARE NEVER ON THE LADDER: no knob's reader
 *      is in card B's `combat` or `preload` system (tools/guards/lib/
 *      systems.mjs), and each knob's `system` is its first reader's;
 *   4. a knob marked moved is read through laneKnob('<name>') in every file
 *      it names; a laneKnob('<name>') anywhere else in src/ is a knob of the
 *      table, read in a file its row names and marks moved (one reader);
 *   5. the knobs not yet moved are a CENSUS (rule 3): the count only falls
 *      (UNMOVED_LINE), with each knob's PR (card O's 4 to 13);
 *   6. the `light` row is the `full` row at LIGHT_AT (a few rungs down);
 *   7. the programs (the report's `self`): a name each, once; every program
 *      a listed file builds (`name: 'bt-...'` / `'batch-...'`) is listed
 *      under its file, and every listed one is built there;
 *   8. an override pins a knob of the table to one of its steps;
 *   9. every file the table names exists;
 *  10. docs/LANES.md is what the table makes.
 *
 * BREAK PROOF (rule 8), each tried by hand once, 2026-11-14:
 *   - delete `crowd: 30, ` from the light row               -> FAIL 1 (and 6, 10)
 *   - the work axis's first rung `{ knob: 'crowd', to: 2 }`   -> FAIL 2 (two steps; and 6, 10)
 *   - `{ knob: 'crowd', to: 1, also: 'rate' }` as a rung     -> FAIL 2 (a rung with more than one knob)
 *   - 'src/game/manualCombat.js' added to the rate's files   -> FAIL 3 (combat; and 10)
 *   - `moved: true` on the rate (framePacer.js reads none)   -> FAIL 4 (and 10)
 *   - `laneKnob('crowd')` written in src/game/dodge.js        -> FAIL 4
 *   - UNMOVED_LINE one lower                                  -> FAIL 5
 *   - 'bt-glint-filter' renamed 'bt-glint' in the table       -> FAIL 7 (and 10)
 *   - a line of docs/LANES.md edited by hand                  -> FAIL 10
 *
 * Run from the repository's root:
 *   node tools/guards/draw-lanes.test.mjs           the checks
 *   node tools/guards/draw-lanes.test.mjs --write   write docs/LANES.md from the table
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  KNOBS, KNOB_NAMES, LANES, LANE_NAMES, AXES, AXIS_NAMES, LIGHT_AT, PROGRAMS, PROGRAM_NAMES, OVERRIDES,
  knobAt, ladderDepth, pickLane, DEFAULT_LANE,
} from '../../src/game/drawLanes.js';
import { systemOf, placeFiles, ROOT } from './lib/systems.mjs';

/* the census line: knobs with a reader not yet read through laneKnob.  Only
   falls, with each knob's PR (card O's 4 to 13); the gatekeeper alone lowers it */
const UNMOVED_LINE = 9;   /* v2.3.5224: the rate moved (card O PR 4); v2.3.5225 the pixels (PR 5) */
const NEVER = Object.freeze(['combat', 'preload']);
const PAGE = join(ROOT, 'docs/LANES.md');
const TABLE = 'src/game/drawLanes.js';

/* the code without its comments (a comment that SAYS laneKnob reads nothing) */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const codeOf = (f) => strip(readFileSync(join(ROOT, f), 'utf8'));

/* ── the page ── */
const sayOf = (name, v) => {
  const k = KNOBS[name];
  const i = k.steps.indexOf(v);
  return i >= 0 ? k.say[i] : String(v);
};
const cell = (s) => String(s).replace(/\|/g, '\\|');
export function makePage() {
  const L = [];
  L.push('# The lanes and the ladder');
  L.push('');
  L.push('MADE by `node tools/guards/draw-lanes.test.mjs --write` from `src/game/drawLanes.js`. Never edit it by hand:');
  L.push('`tools/guards/draw-lanes.test.mjs` fails a page that is not what the table makes. The rules are');
  L.push('`docs/specs/draw-lanes.md` (grand plan step 2.1, card O).');
  L.push('');
  L.push('A **lane** is a row of knobs: how much a device draws. A device\'s facts pick its lane, never the name of a system,');
  L.push('browser, chip or model. The **ladder** is the rungs below a lane\'s row: when a phone runs hot or slow, the game');
  L.push('steps down one rung at a time, each rung one knob one step, and steps back up when it can. **No quality is lowered');
  L.push('in silence**: every rung is a row below, in the words of what a player sees. **Combat\'s timing and loading are never');
  L.push('on the ladder**: no knob changes a swing, a cooldown, the dash, the bow\'s sight or what loads behind the loading');
  L.push('screen.');
  L.push('');
  L.push('## The lanes');
  L.push('');
  L.push('| Lane | What it is |');
  L.push('|---|---|');
  for (const n of LANE_NAMES) L.push(`| \`${n}\` | ${cell(LANES[n].say)} |`);
  L.push('');
  L.push(`A device picks \`thirty\` where its screen runs at 30 a second, else \`full\` (\`pickLane\`). Where nothing is known yet: \`${DEFAULT_LANE}\`.`);
  L.push('`?lane=<name>` draws a page in that lane, whatever its facts.');
  L.push('');
  L.push('| Knob | ' + LANE_NAMES.map((n) => '`' + n + '`').join(' | ') + ' |');
  L.push('|---|' + LANE_NAMES.map(() => '---').join('|') + '|');
  for (const k of KNOB_NAMES) L.push(`| \`${k}\` | ` + LANE_NAMES.map((n) => cell(sayOf(k, LANES[n].row[k]))).join(' | ') + ' |');
  L.push('');
  L.push('## The ladder');
  L.push('');
  L.push('Two axes. The game\'s own work (the crowd, then the rate) is stepped down when the late frames\' time was the');
  L.push('game\'s own; waiting for the graphics chip (the rate, then the passes, then the pixels) when it was the rest. A steady');
  L.push('lower frame rate comes before a softer picture (the owner\'s call 16). The rate\'s rung is on both axes: whichever');
  L.push('takes it first lowers the rate (on a screen of 60 or slower: a faster one keeps its own steps). The pixels change only behind');
  L.push('a loading screen or a tab\'s return.');
  L.push('');
  for (const a of AXIS_NAMES) {
    L.push(a === 'work' ? '### The game\'s own work' : '### Waiting for the graphics chip');
    L.push('');
    L.push('| Rung | Knob | What a player sees |');
    L.push('|---|---|---|');
    AXES[a].forEach((r, i) => L.push(`| ${i + 1} | \`${r.knob}\` | ${cell(KNOBS[r.knob].say[r.to])} |`));
    L.push('');
  }
  L.push(`Every rung of both axes: ${ladderDepth()} (the report's \`rung\` counts the rungs taken at once).`);
  L.push('');
  L.push('## The knobs, and who reads each');
  L.push('');
  L.push('A knob is read through `laneKnob(\'<name>\')` once its card O PR has moved it; until then its file reads its own');
  L.push('value, the `full` row\'s.');
  L.push('');
  L.push('| Knob | What it is | Steps | Read by | Moved | PR | Switch | System |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const k of KNOB_NAMES) {
    const o = KNOBS[k];
    const files = o.reader ? o.reader.files.map((f) => '`' + f + '`').join(', ') : 'none yet';
    L.push(`| \`${k}\` | ${cell(o.what)} | ${o.steps.map((v) => '`' + v + '`').join(', ')} | ${files} | ${o.reader ? (o.reader.moved ? 'yes' : 'not yet') : '-'} | ${o.pr || '-'} | ${o.switch ? '`' + o.switch + '`' : '-'} | ${o.system || '-'} |`);
  }
  L.push('');
  L.push(`Not yet moved: ${unmoved().length} of ${KNOB_NAMES.filter((k) => KNOBS[k].reader).length} knobs with a reader.`);
  L.push('');
  L.push('## The overrides');
  L.push('');
  L.push('An override pins a knob, over the lane and the ladder; the governor never moves a pinned knob.');
  L.push('');
  if (!OVERRIDES.length) L.push('None yet: card O\'s PR 8 moves the fallbacks here, PR 12 the off-ramps.');
  else {
    L.push('| Knob | Pinned to | Why |');
    L.push('|---|---|---|');
    for (const o of OVERRIDES) L.push(`| \`${o.knob}\` | \`${o.value}\` | ${cell(o.why)} |`);
  }
  L.push('');
  L.push('## The game\'s own drawing programs');
  L.push('');
  L.push('The report\'s `self` names one that failed its self-test at the door (step 1.7). Pixi\'s own programs are not the');
  L.push('game\'s.');
  L.push('');
  L.push('| Name | File | Programs built | Its way back |');
  L.push('|---|---|---|---|');
  for (const p of PROGRAMS) L.push(`| \`${p.name}\` | \`${p.file}\` | ${p.built.map((b) => '`' + b + '`').join(', ')} | ${p.back ? cell(p.back) : 'none: drawn as today'} |`);
  L.push('');
  return L.join('\n');
}
function unmoved() {
  return KNOB_NAMES.filter((k) => KNOBS[k].reader && !KNOBS[k].reader.moved);
}

if (process.argv.includes('--write')) {
  writeFileSync(PAGE, makePage());
  console.log('wrote docs/LANES.md');
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. every knob a value in every lane, one of its steps ── */
{
  const off = [];
  for (const n of LANE_NAMES) {
    const row = LANES[n].row;
    for (const k of KNOB_NAMES) if (!(k in row) || !KNOBS[k].steps.includes(row[k])) off.push(`${n}.${k}: ${row[k]}`);
    for (const k of Object.keys(row)) if (!KNOBS[k]) off.push(`${n}.${k}: no such knob`);
  }
  for (const k of KNOB_NAMES) {
    const o = KNOBS[k];
    if (!Array.isArray(o.steps) || !o.steps.length || !Array.isArray(o.say) || o.say.length !== o.steps.length) off.push(`${k}: a step with no words, or none`);
  }
  check(`1: every knob has a value in each of the ${LANE_NAMES.length} lanes, one of its steps (and each step its words)`, off.length === 0, off);
}

/* ── 2. every rung one knob one step ── */
{
  const off = [];
  for (const a of AXIS_NAMES) {
    const at = Object.create(null);
    for (const k of KNOB_NAMES) at[k] = KNOBS[k].steps.indexOf(LANES.full.row[k]);
    AXES[a].forEach((r, i) => {
      const keys = Object.keys(r).sort().join();
      if (keys !== 'knob,to' || typeof r.knob !== 'string' || !KNOBS[r.knob]) { off.push(`${a} ${i + 1}: not one knob (${keys})`); return; }
      if (r.to !== at[r.knob] + 1 || r.to >= KNOBS[r.knob].steps.length) { off.push(`${a} ${i + 1}: ${r.knob} from step ${at[r.knob]} to ${r.to} (one step, and a step it has)`); return; }
      at[r.knob] = r.to;
    });
  }
  check(`2: every rung of the ${AXIS_NAMES.length} axes lowers one knob one step`, off.length === 0, off);
}

/* ── 3. never combat, never loading ── */
const placed = placeFiles();
{
  const off = [];
  for (const k of KNOB_NAMES) {
    const o = KNOBS[k];
    if (!o.reader) continue;
    for (const f of o.reader.files) {
      const sys = systemOf(f, placed);
      if (NEVER.includes(sys)) off.push(`${k}: ${f} is in ${sys}`);
    }
    const first = systemOf(o.reader.files[0], placed);
    if (o.system !== first) off.push(`${k}: system "${o.system}", but ${o.reader.files[0]} is in "${first}"`);
  }
  check('3: no knob is read in card B\'s combat or preload system (combat\'s timing and loading are never on the ladder); each knob\'s system is its reader\'s', off.length === 0, off);
}

/* ── 4. a moved knob is read through laneKnob, and only where its row says ── */
{
  const off = [];
  for (const k of KNOB_NAMES) {
    const o = KNOBS[k];
    if (!o.reader || !o.reader.moved) continue;
    for (const f of o.reader.files) {
      if (!existsSync(join(ROOT, f)) || !new RegExp(`\\blaneKnob\\(\\s*['"]${k}['"]\\s*\\)`).test(codeOf(f))) off.push(`${k}: marked moved, but ${f} has no laneKnob('${k}')`);
    }
  }
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = dir + '/' + name;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(js|jsx|mjs)$/.test(name)) files.push(rel);
    }
  })('src');
  for (const f of files) {
    if (f === TABLE) continue;
    const c = codeOf(f);
    for (const m of c.matchAll(/\blaneKnob\(\s*(['"]?)([A-Za-z0-9_]*)\1\s*\)/g)) {
      const k = m[2];
      if (!m[1]) { off.push(`${f}: laneKnob(${k}) -- a knob is named by a literal`); continue; }
      const o = KNOBS[k];
      if (!o) off.push(`${f}: laneKnob('${k}') -- no such knob`);
      else if (!o.reader || !o.reader.files.includes(f) || !o.reader.moved) off.push(`${f}: laneKnob('${k}') -- not a file its row names and marks moved`);
    }
  }
  check('4: a knob marked moved is read through laneKnob in its files, and laneKnob is read nowhere else', off.length === 0, off);
}

/* ── 5. the census ── */
{
  const n = unmoved().length;
  check(`5: knobs not yet read through laneKnob: ${n} (the line: ${UNMOVED_LINE}, only falls)`, n <= UNMOVED_LINE, unmoved());
  if (n < UNMOVED_LINE) console.log(`     (the line can fall to ${n}: the gatekeeper lowers it)`);
}

/* ── 6. light is full a few rungs down ── */
{
  const off = KNOB_NAMES.filter((k) => knobAt('light', k, null) !== knobAt('full', k, LIGHT_AT));
  check(`6: the light row is the full row at ${LIGHT_AT.work} rung(s) of work and ${LIGHT_AT.chip} of the chip`, off.length === 0, off);
  check('6: a device picks thirty only at 30 a second, and never light by itself', pickLane({ hz: 30 }) === 'thirty' && pickLane({ hz: 60 }) === 'full' && pickLane({ hz: 'other' }) === 'full' && pickLane(null) === 'full'
    && [30, 60, 90, 120, 144, 'other'].every((hz) => pickLane({ hz }) !== 'light'));
}

/* ── 7. the programs, read from the code ── */
{
  const off = [];
  const seen = new Set();
  for (const p of PROGRAMS) {
    if (seen.has(p.name)) off.push(`${p.name}: twice`);
    seen.add(p.name);
    if (!/^[a-z]+$/.test(p.name)) off.push(`${p.name}: a name is a lower-case word`);
  }
  const byFile = new Map();
  for (const p of PROGRAMS) { if (!byFile.has(p.file)) byFile.set(p.file, []); byFile.get(p.file).push(...p.built); }
  for (const [f, listed] of byFile) {
    if (!existsSync(join(ROOT, f))) { off.push(`${f}: no such file`); continue; }
    const built = new Set([...codeOf(f).matchAll(/\bname:\s*'((?:bt|batch)-[a-z0-9-]+)'/g)].map((m) => m[1]));
    for (const b of built) if (!listed.includes(b)) off.push(`${f} builds ${b}: no program of the table lists it`);
    for (const b of listed) if (!built.has(b)) off.push(`${f}: ${b} is listed, but the file builds none of that name`);
  }
  check(`7: the ${PROGRAM_NAMES.length} programs are the ones their files build, a name each`, off.length === 0, off);
}

/* ── 8. overrides ── */
{
  const off = OVERRIDES.filter((o) => !o || !KNOBS[o.knob] || !KNOBS[o.knob].steps.includes(o.value) || typeof o.why !== 'string' || !o.why).map((o) => JSON.stringify(o));
  check(`8: every override pins a knob of the table to one of its steps, and says why (${OVERRIDES.length})`, off.length === 0, off);
}

/* ── 9. every file named exists ── */
{
  const off = [];
  for (const k of KNOB_NAMES) if (KNOBS[k].reader) for (const f of KNOBS[k].reader.files) if (!existsSync(join(ROOT, f))) off.push(f);
  check('9: every file the table names exists', off.length === 0, off);
}

/* ── 10. the page ── */
{
  const page = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : '';
  check('10: docs/LANES.md is what the table makes (node tools/guards/draw-lanes.test.mjs --write)', page === makePage());
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
