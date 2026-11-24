/* ═══ v2.3.6505 (card PH PR 6): THE DEBT LIST AT THE GATE, HELD ═══
 *
 * The held-page budget (tools/qa/mp/held-budget.mjs) was judged only when a
 * session ran the whole sweep by hand, for hours: a new hold past its line
 * sat on main unseen.  The gatekeeper's rehearsal (tools/dev/gatekeeper.mjs)
 * now plays a short sample of it on the merged tree each sitting.  This
 * reads the rehearsal's step list and the sweep BY THEIR SYNTAX TREES (never
 * a pattern of their text: finish.md part 5, rule 2) and holds:
 *   1. a step builds the sweep's unminified bundle (`--minify false`) into
 *      the directory the sample reads;
 *   2. a step runs mp-heldsweep with the stations `stand`, `town` and `ride`
 *      (each one of the sweep's own STATION_NAMES), on that bundle (QA_DIST);
 *   3. the build runs before the sample, both in every full rehearsal (not
 *      cut by a `withPrecheck` or left past the steps a run reaches);
 *   4. the sweep judges what it measures by held-budget.mjs (judgeHeld);
 *   5. the screen-check mend (TRAPS 177, the test first): the sweep's peer
 *      rider plays in a browser of its own (H.launch()), never the phone's
 *      `browser` -- one browser's two pages share one software chip, and the
 *      phone's black-screen check waited for the rider's frames (281 to 307
 *      ms, red on main; 6.5 ms with its own browser, the test box,
 *      2026-11-24).
 *
 * Break proofs (tried 2026-11-24, each put back):
 *   gatekeeper.mjs: the `heldsample` step taken out                 -> FAIL 2, 3
 *   gatekeeper.mjs: BT_HS_STATIONS 'stand,town' (the ride dropped)  -> FAIL 2
 *   gatekeeper.mjs: QA_DIST 'dist' (the minified bundle)            -> FAIL 2
 *   gatekeeper.mjs: the build's `--outDir ../dist` (not the sample's) -> FAIL 1, 2
 *   gatekeeper.mjs: `heldsample` before `profbuild`                 -> FAIL 3
 *   mp-heldsweep.mjs: `H.newPlayer(browser, { name: 'Rider', ...`   -> FAIL 5
 */
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
let failed = 0;
const ok = (name, cond, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
  if (!cond) failed++;
};

let parser = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { parser = createRequire(join(ROOT, pkg))('@babel/parser'); break; } catch { /* the next */ }
}
if (!parser) { console.log('FAIL @babel/parser is not installed (npm ci)'); process.exit(1); }
const parse = (rel) => parser.parse(readFileSync(join(ROOT, rel), 'utf8'), { sourceType: 'module', plugins: ['topLevelAwait'], errorRecovery: false }).program;

/* every node under `n`, depth first */
function* walk(n) {
  if (!n || typeof n.type !== 'string') return;
  yield n;
  for (const k of Object.keys(n)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
    const v = n[k];
    if (Array.isArray(v)) { for (const c of v) yield* walk(c); } else if (v && typeof v.type === 'string') yield* walk(v);
  }
}
/* a literal's value, an array of them, an object of them: anything else is
   `undefined` (a step built by a call is not plain data, so it is not read) */
function plain(n) {
  if (!n) return undefined;
  if (n.type === 'StringLiteral' || n.type === 'NumericLiteral' || n.type === 'BooleanLiteral') return n.value;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis[0].value.cooked;
  if (n.type === 'ArrayExpression') return n.elements.map(plain);
  if (n.type === 'ObjectExpression') {
    const o = Object.create(null);
    for (const p of n.properties) {
      if (p.type !== 'ObjectProperty' || p.computed) continue;
      o[p.key.type === 'Identifier' ? p.key.name : p.key.value] = plain(p.value);
    }
    return o;
  }
  return undefined;
}
const declOf = (prog, name) => {
  for (const n of walk(prog)) if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.id.name === name) return n.init;
  return null;
};

/* ── the rehearsal's steps ── */
const gk = parse('tools/dev/gatekeeper.mjs');
const stepsNode = declOf(gk, 'STEPS');
const STEPS = stepsNode && stepsNode.type === 'ArrayExpression' ? stepsNode.elements.map(plain) : [];
ok('0 gatekeeper.mjs keeps its STEPS as plain data (an array of literal objects)', STEPS.length > 0 && STEPS.every((s) => s && typeof s.id === 'string' && Array.isArray(s.argv)), STEPS.length);

/* the sweep's stations, by its syntax tree */
const hs = parse('tools/qa/mp/mp-heldsweep.mjs');
const stNode = declOf(hs, 'STATION_NAMES');
const STATION_NAMES = stNode ? plain(stNode) : [];

/* 1. the unminified build, into a directory of its own (vite's root is src/: `../x` is the repository's `x`) */
const flag = (argv, f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const buildAt = STEPS.findIndex((s) => s.cmd === 'npx' && s.argv[0] === 'vite' && s.argv[1] === 'build' && flag(s.argv, '--minify') === 'false');
const build = STEPS[buildAt];
const outDir = build ? flag(build.argv, '--outDir') : undefined;
const builtTo = typeof outDir === 'string' ? posix.normalize(posix.join('src', outDir)) : null;
ok('1 a step builds the sweep\'s unminified bundle (`vite build --minify false`) into a directory of its own, not the tree\'s `dist`',
  !!build && !!builtTo && !builtTo.startsWith('..') && builtTo !== 'dist' && builtTo !== 'src/dist', { outDir, builtTo });

/* 2. the sample: mp-heldsweep, stand + town + ride, on that bundle */
const sampleAt = STEPS.findIndex((s) => s.cmd === 'node' && s.argv[0] === 'tools/qa/mp/run.mjs' && s.argv[1] === 'heldsweep');
const sample = STEPS[sampleAt];
const stations = sample && sample.env && typeof sample.env.BT_HS_STATIONS === 'string' ? sample.env.BT_HS_STATIONS.split(',').map((x) => x.trim()) : [];
const WANT = ['stand', 'town', 'ride'];
ok('2 a step plays mp-heldsweep\'s `stand`, `town` and `ride` (each a station the sweep has) on the unminified bundle (QA_DIST its directory)',
  !!sample && WANT.every((w) => stations.includes(w)) && stations.every((w) => Array.isArray(STATION_NAMES) && STATION_NAMES.includes(w))
    && !!builtTo && sample.env.QA_DIST === builtTo,
  { stations, STATION_NAMES, QA_DIST: sample && sample.env && sample.env.QA_DIST, builtTo });

/* 3. in order, in every full rehearsal */
ok('3 the build runs before the sample, both in every full rehearsal (no `withPrecheck` cut, each with a cap)',
  buildAt >= 0 && sampleAt > buildAt && !build.withPrecheck && !sample.withPrecheck
    && typeof build.mins === 'number' && build.mins > 0 && typeof sample.mins === 'number' && sample.mins > 0,
  { buildAt, sampleAt });

/* 4. the sweep is judged by the held budget */
const importsJudge = hs.body.some((n) => n.type === 'ImportDeclaration' && /(^|\/)held-budget\.mjs$/.test(n.source.value)
  && n.specifiers.some((sp) => sp.imported && sp.imported.name === 'judgeHeld'));
const callsJudge = [...walk(hs)].some((n) => n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'judgeHeld');
ok('4 mp-heldsweep judges what it measures by held-budget.mjs (imports and calls judgeHeld)', importsJudge && callsJudge, { importsJudge, callsJudge });

/* 5. the peer's rider in a browser of its own */
const isH = (callee, name) => callee && callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'H'
  && callee.property.type === 'Identifier' && callee.property.name === name;
const riders = [...walk(hs)].filter((n) => n.type === 'CallExpression' && isH(n.callee, 'newPlayer')
  && n.arguments[1] && plain(n.arguments[1].properties ? { type: 'ObjectExpression', properties: n.arguments[1].properties.filter((p) => p.key && p.key.name === 'name') } : null)?.name === 'Rider');
const riderBrowser = riders.length === 1 && riders[0].arguments[0].type === 'Identifier' ? riders[0].arguments[0].name : null;
const launched = riderBrowser && riderBrowser !== 'browser' && [...walk(hs)].some((n) => n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.left.name === riderBrowser
  && n.right.type === 'AwaitExpression' && n.right.argument.type === 'CallExpression' && isH(n.right.argument.callee, 'launch'));
ok('5 the sweep\'s peer rider plays in a browser of its own (H.launch()), never the phone\'s `browser` (two pages on one software chip: screen-check)',
  !!launched, { riders: riders.length, riderBrowser });

console.log(`\n${failed ? failed + ' failed' : 'all passed'}`);
process.exit(failed ? 1 : 0);
