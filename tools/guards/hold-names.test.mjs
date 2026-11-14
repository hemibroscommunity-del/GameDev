/* ═══ v2.3.5120: ONE LIST OF HOLD NAMES (the grand plan's step 1.0) ═══
 *
 * src/debug/holdNames.js is the one list of the names a hold may have, and
 * the table that maps each string a job notes (debug/madeLog.js noteMade) to
 * its name.  The field report (step 1.1) names holds by this list, so a name
 * the sweep or the debt list uses that the phone cannot take, or a note the
 * phone takes under no name, is a hole in the report.  This guard holds:
 *
 *   1. every name of the debt list (tools/qa/mp/held-budget.mjs KNOWN, card
 *      H's) is on the list, and the list has each name once, in ASCII;
 *   2. every row of the table maps to a name of the list;
 *   3. every noteMade call in src/ (and every call of a function that hands
 *      its own string on to noteMade: bodyBake.js noteWorkerSheet) passes a
 *      string the table maps to a name: a template's or a sum's moving parts
 *      read as 'x', so `body ${pose}-${dir}` is tried as 'body x-x';
 *   4. noteMade itself keeps the name and drops what maps to none (played in
 *      node with a stand-in window).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. holdNames.js: delete the line `'gc',`                       -> FAIL 1
 *   2. holdNames.js: a row `[/^page bases$/, 'object-base']`       -> FAIL 2, 3, 4
 *   3. wheelObjects.js: `noteMade('page bottoms', ...)` in place of
 *      `noteMade('page bases', ...)`                               -> FAIL 3
 *   4. madeLog.js: `recordExternal(name, ms)` in place of
 *      `recordExternal(hold, ms)`                                  -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/hold-names.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

const { HOLD_NAMES, MADE_AS, holdOf } = await import(pathToFileURL(join(ROOT, 'src/debug/holdNames.js')).href);
const { KNOWN } = await import(pathToFileURL(join(ROOT, 'tools/qa/mp/held-budget.mjs')).href);
const names = new Set(HOLD_NAMES);

/* ── 1. the debt list's names are on the list ── */
{
  const missing = Object.keys(KNOWN).filter((k) => !names.has(k));
  check(`1: every name of the debt list (${Object.keys(KNOWN).length}) is on the list of hold names`, missing.length === 0, missing);
  check('1: each name once', names.size === HOLD_NAMES.length, HOLD_NAMES.filter((n, i) => HOLD_NAMES.indexOf(n) !== i));
  const odd = HOLD_NAMES.filter((n) => typeof n !== 'string' || !n || !/^[\x20-\x7e]+$/.test(n));
  check('1: every name is a string of plain ASCII', odd.length === 0, odd);
  check('1: holdOf passes a name of the list as itself', HOLD_NAMES.every((n) => holdOf(n) === n));
}

/* ── 2. the table maps to names of the list ── */
{
  const bad = MADE_AS.filter(([re, n]) => !(re instanceof RegExp) || !names.has(n)).map(([re, n]) => String(re) + ' -> ' + n);
  check(`2: every row of the table (${MADE_AS.length}) maps to a name of the list`, bad.length === 0, bad);
}

/* ── 3. every note's string maps to a name ── */
/* the first argument of a call, as written: from just past its '(' to the comma
   or ')' at its own depth (strings and templates skipped whole) */
function firstArg(src, at) {
  let depth = 0, i = at;
  const stack = [];   /* '`' while in a template's text */
  for (; i < src.length; i++) {
    const c = src[i];
    if (stack.length && stack[stack.length - 1] === '`') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { stack.pop(); continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push('${'); i++; }
      continue;
    }
    if (c === "'" || c === '"') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '`') { stack.push('`'); continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === '}' && stack.length && stack[stack.length - 1] === '${' && depth === 0) { stack.pop(); continue; }
    if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; continue; }
    if (c === ',' && depth === 0 && !stack.length) break;
  }
  return src.slice(at, i).trim();
}
/* an argument as the string it makes: its literal parts kept, every moving part 'x'
   (a sum's terms split at its own depth) */
function sample(arg) {
  const terms = [];
  let depth = 0, cur = '', q = null, tdepth = 0;
  for (let i = 0; i < arg.length; i++) {
    const c = arg[i];
    cur += c;
    if (q) {
      if (c === '\\') { cur += arg[++i]; continue; }
      if (q === '`' && c === '$' && arg[i + 1] === '{') { tdepth++; cur += arg[++i]; continue; }
      if (q === '`' && c === '}' && tdepth) { tdepth--; continue; }
      if (c === q && !tdepth) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === '+' && depth === 0) { terms.push(cur.slice(0, -1).trim()); cur = ''; }
  }
  terms.push(cur.trim());
  return terms.map((t) => {
    const m = /^(['"])([\s\S]*)\1$/.exec(t);
    if (m) return m[2];
    if (/^`[\s\S]*`$/.test(t)) {
      let s = t.slice(1, -1), out = '';
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '$' && s[i + 1] === '{') {
          let d = 1; i += 2;
          for (; i < s.length && d; i++) { if (s[i] === '{') d++; else if (s[i] === '}') d--; }
          i--; out += 'x';
        } else out += s[i];
      }
      return out;
    }
    return 'x';
  }).join('');
}
function walk(dir, out = []) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const p = dir + '/' + f;
    if (statSync(join(ROOT, p)).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(f)) out.push(p);
  }
  return out;
}
const lineOf = (src, at) => src.slice(0, at).split('\n').length;
{
  const files = walk('src');
  const calls = [];        /* { file, line, arg, via } */
  const forwards = [];     /* functions that pass their own parameter on to noteMade */
  const strays = [];
  for (const file of files) {
    const src = read(file);
    for (const m of src.matchAll(/\bnoteMade\(/g)) {
      const before = src.slice(Math.max(0, m.index - 16), m.index);
      if (/function\s+$/.test(before)) continue;   /* its own definition */
      const arg = firstArg(src, m.index + m[0].length);
      if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
        /* a bare name: the parameter of the function it sits in, whose callers are read instead */
        const head = [...src.slice(0, m.index).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)].pop();
        const params = head ? head[2].split(',').map((p) => p.trim().split(/\s|=/)[0]) : [];
        if (head && params[0] === arg) forwards.push({ fn: head[1], file, line: lineOf(src, m.index) });
        else strays.push(`${file}:${lineOf(src, m.index)} noteMade(${arg}, ...)`);
        continue;
      }
      calls.push({ file, line: lineOf(src, m.index), arg, via: 'noteMade' });
    }
  }
  check('3: a note passed a bare name is its function\'s first parameter (its callers are read)', strays.length === 0, strays);
  for (const fw of forwards) {
    const re = new RegExp('\\b' + fw.fn.replace(/\$/g, '\\$') + '\\(', 'g');
    for (const file of files) {
      const src = read(file);
      for (const m of src.matchAll(re)) {
        if (/function\s+$/.test(src.slice(Math.max(0, m.index - 16), m.index))) continue;
        if (/import\s*\{[^}]*$/.test(src.slice(Math.max(0, m.index - 200), m.index))) continue;
        calls.push({ file, line: lineOf(src, m.index), arg: firstArg(src, m.index + m[0].length), via: fw.fn });
      }
    }
  }
  /* a floor, so a reader that finds nothing never passes: 8 calls of noteMade with a string and 5 through
     noteWorkerSheet in src/ on 2026-11-14 */
  const direct = calls.filter((c) => c.via === 'noteMade').length, through = calls.length - direct;
  check(`3: the notes were found (${direct} noteMade calls, ${through} through ${forwards.map((f) => f.fn).join(', ') || 'none'})`,
    direct >= 8 && forwards.some((f) => f.fn === 'noteWorkerSheet') && through >= 5, { direct, through, forwards });
  const unmapped = [];
  for (const c of calls) {
    const s = sample(c.arg);
    const n = holdOf(s);
    if (!n) unmapped.push(`${c.file}:${c.line} ${c.via}(${c.arg}) -> '${s}'`);
  }
  check('3: every note\'s string maps to a hold name (holdNames.js MADE_AS)', unmapped.length === 0, unmapped);
  console.log('     ' + calls.map((c) => `${relative('src', c.file)}:${c.line} '${sample(c.arg)}' -> ${holdOf(sample(c.arg))}`).join('\n     '));
}

/* ── 4. noteMade keeps the name, and drops what maps to none ── */
{
  const ring = [];
  globalThis.window = { __btMade: [], perfTracker: { recordExternal: (name, ms) => ring.push([name, ms]) } };
  const { noteMade } = await import(pathToFileURL(join(ROOT, 'src/debug/madeLog.js')).href);
  noteMade('body jog-east', 41, 'body jog-east#k');
  noteMade('strip made', 9, 'strip made /sprites/x.png');
  noteMade('page bases', 3);
  noteMade('a name on no list', 50);
  check('4: the ring keeps the list\'s name (body-bake, strip-made) and nothing under 4 ms',
    JSON.stringify(ring) === JSON.stringify([['body-bake', 41], ['strip-made', 9]]), ring);
  check('4: a test\'s window.__btMade still reads the caller\'s own string, and nothing of a string off the list',
    JSON.stringify(window.__btMade) === JSON.stringify(['body jog-east#k', 41, 'strip made /sprites/x.png', 9, 'page bases', 3]), window.__btMade);
  delete globalThis.window;
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
