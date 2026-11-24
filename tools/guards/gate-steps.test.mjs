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
 *
 * v2.3.6506 (the sitting-59 mend): sitting 59 planted in the gatekeeper's RUN
 * (`steps` filtered of the sample, a red step's `ok` forced true) and in the
 * sweep's verdict (`fresh.length === 0` forced true), and 0 to 5 stayed green:
 * they read tables.  So now:
 *   6. the REAL gatekeeper rehearses a branch on a stand-in repository
 *      (lib/gateSandbox.mjs, each step's command a recorder): every step of
 *      STEPS runs, in order, once; the sample with its stations and bundle;
 *   7. each step red alone makes the gate red (exit 1, its FAIL line, one
 *      counted); two red, two counted;
 *   8. `--until=precheck` runs precheck and what rides with it, the rest
 *      named "not run";
 *   9. a branch not on origin: exit 2, nothing run;
 *  10. the sweep's verdict (held-budget.mjs sweepVerdict) driven with
 *      stations of its own: a new hold over its line, a listed one grown, a
 *      profile unread, a station not played, nothing at all -- each red; 4
 *      now holds that mp-heldsweep hands each row to rec.ok as it is, and 5
 *      that every write to the rider's browser is a launch of its own.
 * Break proofs (2026-11-24, each put back; the PR's mutation pass has the rest):
 *   gatekeeper.mjs: `const steps = STEPS.slice(0, upTo).filter((s) => s.id !== 'heldsample')` -> FAIL 6, 7
 *   gatekeeper.mjs: `const ok = true;` (a red not counted)                -> FAIL 7
 *   held-budget.mjs sweepVerdict: the new row's `ok: true`                -> FAIL 10
 *   mp-heldsweep.mjs: `rec.ok(v.name, true, v.detail)`                    -> FAIL 4
 *   mp-heldsweep.mjs: `browserB = browser;` after the launch              -> FAIL 5
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

/* 4. the sweep is judged by the held budget: v2.3.6506, its verdict's rows made by held-budget.mjs sweepVerdict
   (judged by behaviour in 10), and each row passed to the scenario's `rec.ok` as it is */
const importsJudge = hs.body.some((n) => n.type === 'ImportDeclaration' && /(^|\/)held-budget\.mjs$/.test(n.source.value)
  && n.specifiers.some((sp) => sp.imported && sp.imported.name === 'sweepVerdict'));
const verdictCalls = [...walk(hs)].filter((n) => n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init
  && n.init.type === 'CallExpression' && n.init.callee.type === 'Identifier' && n.init.callee.name === 'sweepVerdict');
const vName = verdictCalls.length === 1 ? verdictCalls[0].id.name : null;
/* `for (const v of <verdict>.rows) rec.ok(v.name, v.ok, v.detail);` -- nothing between the row and the record */
const passOn = [...walk(hs)].filter((n) => n.type === 'ForOfStatement' && n.right.type === 'MemberExpression'
  && n.right.object.type === 'Identifier' && n.right.object.name === vName && n.right.property.name === 'rows'
  && n.left.type === 'VariableDeclaration' && n.left.declarations[0].id.type === 'Identifier').filter((n) => {
  const v = n.left.declarations[0].id.name;
  const call = n.body.type === 'ExpressionStatement' ? n.body.expression : null;
  const field = (a, f) => a && a.type === 'MemberExpression' && a.object.type === 'Identifier' && a.object.name === v && a.property.name === f;
  return call && call.type === 'CallExpression' && call.callee.type === 'MemberExpression' && call.callee.object.name === 'rec'
    && call.callee.property.name === 'ok' && call.arguments.length === 3
    && field(call.arguments[0], 'name') && field(call.arguments[1], 'ok') && field(call.arguments[2], 'detail');
});
const wantArg = verdictCalls.length === 1 && verdictCalls[0].init.arguments[1] && verdictCalls[0].init.arguments[1].type === 'Identifier'
  && verdictCalls[0].init.arguments[1].name === 'WANT';
ok('4 mp-heldsweep judges what it measures by held-budget.mjs (imports sweepVerdict, calls it once with WANT, and hands each row to rec.ok as it is)',
  importsJudge && !!vName && wantArg && passOn.length === 1, { importsJudge, vName, wantArg, passOn: passOn.length });

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
/* v2.3.6506 (sitting 59: `browserB = await H.launch();` kept and the rider aliased back after it, green): EVERY
   write to the rider's browser is a launch of its own or null, its declaration included */
const writes = [...walk(hs)].filter((n) => (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.left.name === riderBrowser)
  || (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.id.name === riderBrowser)).map((n) => n.right || n.init);
const ownOrNone = (v) => !v || (v.type === 'NullLiteral')
  || (v.type === 'AwaitExpression' && v.argument.type === 'CallExpression' && isH(v.argument.callee, 'launch'));
ok('5 ...and every write to it (its declaration too) is `await H.launch()` or null: never an alias of the phone\'s browser',
  !!riderBrowser && writes.length >= 2 && writes.every(ownOrNone), { riderBrowser, writes: writes.map((v) => v && v.type) });

/* ── 6 to 9: v2.3.6506 (the sitting-59 mend): THE GATE RUN FOR REAL.  Sitting 59 filtered the sample out of the
   steps the gatekeeper runs (`const steps = ...filter((s) => s.id !== 'heldsample')`) and counted a red step green
   (`const ok = ...`), and 0 to 5 stayed green: they read the STEPS table, never the run.  The real gatekeeper now
   rehearses a branch on a stand-in repository (lib/gateSandbox.mjs: every step's command a recorder), and what
   ran, with what, and what the gate said are read back. */
const { makeSandbox } = await import('./lib/gateSandbox.mjs');
const sb = makeSandbox();
try {
  const ids = STEPS.map((s) => s.id);
  const green = sb.run(['claude/stand-in']);
  const ran = green.steps.map((s) => s.id);
  ok('6 a full rehearsal runs every step of STEPS, in its order, each once (the commands themselves, read by a recorder)',
    green.status === 0 && ran.join() === ids.join(), { status: green.status, ran, ids, tail: green.out.split('\n').slice(-6) });
  const ranSample = green.steps.filter((s) => s.id === 'heldsample');
  ok('6 ...the held sample ran once, with the stations `stand,town,ride` and the unminified bundle (QA_DIST) in its env',
    ranSample.length === 1 && ranSample[0].stations === WANT.join(',') && ranSample[0].dist === builtTo, ranSample);
  ok('6 ...and the gate says all green (exit 0)', /all green on the whole\./.test(green.out) && !/RED on the whole/.test(green.out), green.out.split('\n').slice(-4));
  /* 7: each step red alone: the gate is red, exit 1, that step's FAIL line, one command counted */
  const missed = [];
  for (const s of STEPS) {
    const r = sb.run(['claude/stand-in'], { red: [s.id] });
    const failLine = r.out.split('\n').some((l) => l.startsWith('FAIL     ' + s.say));
    if (!(r.status === 1 && failLine && /\n1 command\(s\) RED on the whole\./.test(r.out) && !/all green/.test(r.out))) missed.push({ id: s.id, status: r.status });
  }
  ok(`7 a red step, each of the ${STEPS.length} alone (the held sample among them), makes the gate red: exit 1, its FAIL line, one command counted`,
    missed.length === 0, missed);
  const two = sb.run(['claude/stand-in'], { red: ['heldsample', 'precheck'] });
  ok('7 ...two red, two counted (every step still ran)', two.status === 1 && /\n2 command\(s\) RED/.test(two.out) && two.steps.map((s) => s.id).join() === ids.join(), { status: two.status });
  /* 8: --until=precheck runs precheck and what rides with it, and names the rest as not run */
  const cutAt = ids.indexOf('precheck') + 1;
  let upTo = cutAt;
  while (upTo < STEPS.length && STEPS[upTo].withPrecheck) upTo++;
  const cut = sb.run(['claude/stand-in', '--until=precheck']);
  const notRun = cut.out.split('\n').filter((l) => l.startsWith('not run  ')).length;
  ok('8 `--until=precheck` runs precheck and the steps that ride with it, and names each other step "not run"',
    cut.status === 0 && cut.steps.map((s) => s.id).join() === ids.slice(0, upTo).join() && notRun === STEPS.length - upTo,
    { ran: cut.steps.map((s) => s.id), notRun });
  /* 9: a branch that is not there runs nothing */
  const none = sb.run(['claude/no-such-branch']);
  ok('9 a branch not on origin: exit 2, nothing run', none.status === 2 && none.steps.length === 0, { status: none.status });
  const bare = sb.run([]), badUntil = sb.run(['claude/stand-in', '--until=questline']);
  ok('9 ...no branch at all, or `--until=` a step that is not precheck or build: the usage, exit 2, nothing run',
    bare.status === 2 && bare.steps.length === 0 && badUntil.status === 2 && badUntil.steps.length === 0, { bare: bare.status, badUntil: badUntil.status });
} finally {
  sb.close();
}

/* ── 10: v2.3.6506 (sitting 59 forced the sweep's `fresh.length === 0` true, green): THE SWEEP'S VERDICT, DRIVEN.
   Stations as the sweep measures them; the rows read by what each says. */
const { sweepVerdict, KNOWN, HOLD_MAX_MS: HOLD } = await import('../qa/mp/held-budget.mjs');
const listedKey = Object.keys(KNOWN).find((k) => !k.includes('*') && typeof KNOWN[k].ms === 'number');
const stn = (name, held, readable = true) => ({ name, readable, held, frames: { long: [] } });
const clean = [stn('stand', []), stn('town', [{ key: 'a-quiet-job', what: 'a-quiet-job', ms: HOLD - 1 }]), stn('ride', [])];
const rowsOf = (stations, want) => { const v = sweepVerdict(stations, want); return { v, okAll: v.rows.every((r) => r.ok), bad: v.rows.filter((r) => !r.ok).map((r) => r.name.slice(0, 40)) }; };
const c0 = rowsOf(clean, WANT);
ok('10 the sweep\'s verdict: three stations played, nothing over its line -- every row green', c0.okAll && c0.v.rows.length === 4, c0.bad);
const fresh2 = rowsOf([stn('stand', []), stn('town', [{ key: 'a-new-job', what: 'a-new-job', ms: HOLD + 6 }, { key: 'a-new-job', what: 'a-new-job', ms: HOLD + 5 }]), stn('ride', [])], WANT);
ok('10 ...a NEW hold over the general line twice: red, and named', !fresh2.okAll && fresh2.v.rows[1].ok === false && /a-new-job/.test(fresh2.v.rows[1].name) && fresh2.v.rows[2].ok, fresh2.bad);
const grown = listedKey ? rowsOf([stn('stand', []), stn('town', [{ key: listedKey, what: listedKey, ms: KNOWN[listedKey].ms * 2 }]), stn('ride', [])], WANT) : null;
ok(`10 ...a listed hold (${listedKey}) grown to twice its own line: red on the debt row, not the new one`, !!grown && !grown.okAll && grown.v.rows[2].ok === false && grown.v.rows[1].ok, grown && grown.bad);
const atLine = listedKey ? rowsOf([stn('town', [{ key: listedKey, what: listedKey, ms: KNOWN[listedKey].ms }]), stn('stand', []), stn('ride', [])], WANT) : null;
ok('10 ...the same hold AT its own line: green', !!atLine && atLine.okAll, atLine && atLine.bad);
const unread = rowsOf([stn('stand', []), stn('town', [], false), stn('ride', [])], WANT);
ok('10 ...a station whose profile does not read by name: red', !unread.okAll && unread.v.rows[0].ok === false, unread.bad);
const short = rowsOf([stn('stand', []), stn('town', [])], WANT);
ok('10 ...a station asked for and not played (the ride): red', !short.okAll && short.v.rows[3].ok === false, short.bad);
const nothing = rowsOf([], WANT);
ok('10 ...no station at all: red (never green for having measured nothing)', !nothing.okAll && nothing.v.rows[0].ok === false && nothing.v.rows[3].ok === false, nothing.bad);

console.log(`\n${failed ? failed + ' failed' : 'all passed'}`);
process.exit(failed ? 1 : 0);
