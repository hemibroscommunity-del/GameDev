/* ═══ v2.3.5101: THE FOUR LINES (grand plan step 5.1, card B PR 2) ═══
 *
 * The client's walls start with four numbers that may only fall:
 *
 *   1. code lines by file (comments are the project's memory and are not
 *      counted): a file with a line of its own stays under it, every other
 *      file under OTHER_FILE;
 *   2. the longest function, and every function: the same, by function;
 *   3. import cycles under src/, and the files inside them;
 *   4. writes to `S` from src/rendering/ (card D's count, never a second one).
 *
 * THE RULES each is measured by are pinned in tools/guards/lib/fourLines.mjs's
 * header, with the table of lines (LINES) at its foot.  The rule decides; the
 * plan's figures ("about 8,700", "about 3,600", "five", "89") follow it, and
 * the header says what each came to.
 *
 * A LINE ONLY FALLS.  A number over its line fails.  A number under it is
 * printed as room the gatekeeper may take back (a lower line, in a PR of its
 * own); nobody raises a line.  Splitting a file or a function is how one
 * falls; moving code into a file or function with no line of its own only
 * moves the number under OTHER_FILE / OTHER_FUNCTION, which hold it too.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. LINES.OTHER_FILE 1500 -> 1300 (src/ui/mobile/sheet/HeroExpanded.jsx
 *      has 1336)                                            -> FAIL 1
 *   2. LINES.FUNCTION's BroTown 7801 -> 7800                -> FAIL 2
 *   3. `import './bagModel.js';` at the top of
 *      src/ui/mobile/dash/inventoryLocks.js (bagModel.js imports it: the file
 *      joins the bag's cycle)                               -> FAIL 3 (files)
 *   4. LINES.STATE_WRITES_FROM_RENDERING 114 -> 113         -> FAIL 4
 *   5. the rules' own examples (section 5) fail if the parser's reading
 *      changes: a comment counted as code turns 5 red.
 *
 * Run from the repository's root: node tools/guards/four-lines.test.mjs
 *   --live   take card D's count by running its script (16 s), not its page
 * (cd server && npm test runs it with every other guard and suite).
 */
import { measureClient, measureSource, stateWritesFromRendering, LINES } from './lib/fourLines.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const room = [];

const m = measureClient();

/* ── 1. code lines by file ── */
{
  const over = [];
  for (const [f, n] of Object.entries(m.files)) {
    const line = Object.hasOwn(LINES.FILE, f) ? LINES.FILE[f] : LINES.OTHER_FILE;
    if (n > line) over.push(`${f}: ${n} code lines, its line ${line}`);
    else if (Object.hasOwn(LINES.FILE, f) && n < line) room.push(`${f}: ${n} (its line ${line})`);
  }
  for (const f of Object.keys(LINES.FILE)) if (!Object.hasOwn(m.files, f)) room.push(`${f}: gone (its line can come off)`);
  const biggest = Object.entries(m.files).sort((a, b) => b[1] - a[1])[0];
  check(`1: no file over its line (the largest: ${biggest[0]}, ${biggest[1]} code lines; ${Object.keys(m.files).length} files)`, over.length === 0, over);
}

/* ── 2. the longest function, and every function ── */
{
  const best = Object.create(null);
  for (const fn of m.functions) {
    const k = fn.file + '#' + fn.name;
    if (!best[k] || fn.lines > best[k].lines) best[k] = fn;
  }
  const over = [];
  for (const [k, fn] of Object.entries(best)) {
    const line = Object.hasOwn(LINES.FUNCTION, k) ? LINES.FUNCTION[k] : LINES.OTHER_FUNCTION;
    if (fn.lines > line) over.push(`${k} (from line ${fn.from}): ${fn.lines} code lines, its line ${line}`);
    else if (Object.hasOwn(LINES.FUNCTION, k) && fn.lines < line) room.push(`${k}: ${fn.lines} (its line ${line})`);
  }
  for (const k of Object.keys(LINES.FUNCTION)) if (!best[k]) room.push(`${k}: gone (its line can come off)`);
  const top = m.functions[0];
  check(`2: no function over its line (the longest: ${top.file}#${top.name}, ${top.lines} code lines)`, over.length === 0, over);
}

/* ── 3. import cycles ── */
{
  const n = m.cycles.length, files = m.cycles.flat().length;
  check(`3: import cycles under src/ at or under ${LINES.IMPORT_CYCLES} (${n})`, n <= LINES.IMPORT_CYCLES, m.cycles.map((c) => c.join(' <-> ')));
  check(`3: files inside them at or under ${LINES.IMPORT_CYCLE_FILES} (${files})`, files <= LINES.IMPORT_CYCLE_FILES, m.cycles.map((c) => c.join(' <-> ')));
  if (n < LINES.IMPORT_CYCLES) room.push(`import cycles: ${n} (the line ${LINES.IMPORT_CYCLES})`);
  if (files < LINES.IMPORT_CYCLE_FILES) room.push(`files in import cycles: ${files} (the line ${LINES.IMPORT_CYCLE_FILES})`);
}

/* ── 4. writes to S from src/rendering/ (card D's count) ── */
{
  let w = null, err = null;
  try { w = stateWritesFromRendering({ live: process.argv.includes('--live') }); } catch (e) { err = String(e && e.message || e); }
  check(`4: writes to S from src/rendering/ at or under ${LINES.STATE_WRITES_FROM_RENDERING}` + (w ? ` (${w.count}, by ${w.by})` : ''),
    !!w && w.count <= LINES.STATE_WRITES_FROM_RENDERING, err || w);
  if (w && w.count < LINES.STATE_WRITES_FROM_RENDERING) room.push(`writes to S from rendering: ${w.count} (the line ${LINES.STATE_WRITES_FROM_RENDERING})`);
}

/* ── 5. the rules read as pinned (lib/fourLines.mjs's header) ── */
{
  const src = [
    '// a comment',                 // 1  not code
    'import a from "./a";',         // 2  code
    '/* a block',                   // 3  not code
    '   comment */',                // 4  not code
    'function f(x) {',              // 5  code
    '  const s = `one',             // 6  code
    'two`;',                        // 7  inside a template: not code
    '',                             // 8  blank
    '  return (',                   // 9  code
    '    <div>',                    // 10 code
    '      hi {x}',                 // 11 code
    '    </div>',                   // 12 \ a closing tag and paren: esbuild's map
    '  );',                         // 13 / points at one of the two (10 in all)
    '}',                            // 14 code (a closing brace)
    'export const g = () => 1;',    // 15 code
    'class K { m(a) { if (a) { return 1; } } }', // 16 code: a method, an `if` is no function
  ].join('\n') + '\n';
  const r = measureSource(src, 'rules.jsx');
  const names = r.functions.map((f) => f.name + ':' + f.lines).sort().join(' ');
  check('5: a comment, a blank line and a template\'s inside lines are not code; the rest is', r.codeLines === 10, r.codeLines);
  check('5: functions are named and counted by their code lines (f, g, the method m; no `if`)', names === 'f:7 g:1 m:1', names);
  const c = measureSource('function Big() {\n  const a = () => {\n    return 1;\n  };\n  return a;\n}\n', 'n.js');
  check('5: a function counts the functions inside it', c.functions.find((f) => f.name === 'Big').lines === 6, c.functions);
  check('5: static imports are read, import() is not', JSON.stringify(measureSource('import x from "./x";\nexport * from "./y";\nimport "./z";\nconst l = () => import("./w");\n', 'i.js').imports) === '["./x","./y","./z"]');
}

if (room.length) console.log('\nroom the gatekeeper may take back (lower these lines in a PR of their own):\n  ' + room.join('\n  '));
console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
