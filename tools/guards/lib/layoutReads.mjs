/* ═══ v2.3.6360: EVERY READ OF THE PAGE'S LAYOUT, FOUND (card LR PR 1) ═══
 *
 * The scanning half of tools/guards/layout-reads.test.mjs (docs/specs/
 * layout-reads.md says why).  A LAYOUT READ is code that asks the browser
 * where or how big something on the page is, or what its finished style is:
 * if anything on the page changed since the browser last laid it out, it
 * must lay the WHOLE page out there and then, in the middle of the script
 * (docs/plan/census/HB-holds.md, "By cause": 58 to 114 ms on a slow phone).
 *
 *   readsOf(files, read?)  -> [{ file, fn, kind, approved }]
 *     every read in the code (esbuild's output: no comments; strings
 *     blanked by maskCode, so a name in a string or a comment is never
 *     one), with the function it sits in and its KIND (the name read:
 *     `clientWidth`, `getBoundingClientRect`, ...).  `approved` is the way
 *     it is allowed without a list row: 'helper' (APPROVED below, the
 *     measure helpers), 'observer' (inside a `new ResizeObserver(...)`'s
 *     callback, which the browser calls right after its own layout) or
 *     'frame-top' (in a function handed to framePacer.js `beforeDraw`, or a
 *     function of its file that one calls by name: the top of the game's
 *     frame, where the page the browser just drew is laid out).
 *
 * THE FUNCTION a read sits in is the innermost NAMED one: `function name`,
 * a method `name(...) {`, or an arrow or `function` given a name
 * (`name = (...) => ...`, `name: function (...) {...}`), an arrow with no
 * braces included.  A callback with no name (`useLayoutEffect(() => {...})`,
 * `setTimeout(function () {...})`) is its named function's.  '(top)' at the
 * top of a file.  So a row is stable while lines above it move.
 *
 * It reads src/**\/*.{js,jsx}, every file: src/debug/ too, which runs on
 * every player's page (the field report, the crash trap, the long-task
 * observer: HB-holds rows 8, 20, 22, 40); nothing under src/ is left out.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './fourLines.mjs';
import { sourceFiles } from './codeOnly.mjs';
import { maskCode } from './maskCode.mjs';
import { spansOf } from './fnSpans.mjs';

/* THE KINDS: what a read is, as a pattern on the masked code (whitespace
   minified: `a.clientWidth`, never `a . clientWidth`).  Each match is one
   read, named by the word it reads. */
export const KINDS = [
  /* where a box is: the whole page laid out first */
  { re: /\.(getBoundingClientRect|getClientRects)\(/g, why: 'a box\'s place and size' },
  /* a box's size or scroll, read (or a scroll written: the same layout) */
  { re: /\.(clientWidth|clientHeight|clientTop|clientLeft|offsetWidth|offsetHeight|offsetTop|offsetLeft|offsetParent|scrollWidth|scrollHeight|scrollTop|scrollLeft)\b/g, why: 'a box\'s size, place or scroll' },
  /* the window's size (laid out when the page changed: HB-holds rows 3, 13) */
  { re: /(?<![\w$])(innerWidth|innerHeight|outerWidth|outerHeight)\b/g, why: 'the window\'s size' },
  { re: /\bvisualViewport\??\.(width|height)\b/g, kind: (m) => 'visualViewport.' + m[1], why: 'the visible part\'s size' },
  /* the finished style (style and, for a size, layout first) */
  { re: /(?<![\w$])(getComputedStyle)\(/g, why: 'a finished style' },
  { re: /\.(getPropertyValue)\(/g, why: 'a finished style\'s value' },
  /* what is under a point (the page laid out first) */
  { re: /\.(elementFromPoint|elementsFromPoint)\(/g, why: 'what is under a point' },
  /* a canvas's text measured (HB-holds row 4: every name, every redraw) */
  { re: /\.(measureText)\(/g, why: 'a text\'s width on a canvas' },
  /* the whole page searched (HB-holds rows 18, 24: in a timer, every turn) */
  { re: /\.(querySelectorAll)\(/g, why: 'the whole page searched' },
];

/* THE APPROVED PLACES: the one way to measure, each a function that keeps
   what it measured and measures again only when the page truly moved, or
   measures after the browser's own layout.  docs/specs/layout-reads.md,
   "The ways".  A read here needs no list row; a new place here is a new
   way, and the spec says what it must be. */
export const APPROVED = [
  { file: 'src/ui/mobile/playViewport.js', fn: '_dims',
    why: 'the play column\'s and the window\'s size, kept; cleared by a resize or a turn, the column\'s re-read by its ResizeObserver (v2.3.4875). playVw() / playVh() / playIsLandscape() read it' },
  { file: 'src/ui/mobile/playViewport.js', fn: '_win',
    why: 'the window\'s own size, kept till the BROWSER resizes it (a script\'s `resize`, isTrusted false, never clears it: v2.3.6241, HB PR 2). winVw() / winVh() read it' },
  { file: 'src/ui/mayorScreen.js', fn: 'canvasBox', alias: '_measureBox',
    why: 'the canvas\'s place on the page, kept; measured again on a resize, a turn, its ResizeObserver, or after RECT_MS (v2.3.4470); card HB2 (#2224, v2.3.6280) moves the measuring into `_measureBox`, run at the top of the frame' },
  { file: 'src/ui/doorPrompt.js', fn: 'placeOverHeadNow',
    why: 'measured at the top of the next frame (requestAnimationFrame), where the page the browser just drew is laid out (`?afterpaint`, v2.3.6244, HB PR 5)' },
];

/* every word a kind reads, for the quick pass over the sources */
const WORDS = /getBoundingClientRect|getClientRects|client(?:Width|Height|Top|Left)|offset(?:Width|Height|Top|Left|Parent)|scroll(?:Width|Height|Top|Left)|inner(?:Width|Height)|outer(?:Width|Height)|visualViewport|getComputedStyle|getPropertyValue|elementsFromPoint|elementFromPoint|measureText|querySelectorAll/;

let _esb = null;
function esbuild() {
  if (_esb) return _esb;
  for (const pkg of ['server/package.json', 'package.json']) {
    try { _esb = createRequire(join(ROOT, pkg))('esbuild'); return _esb; } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}

/** The files read: every .js and .jsx under src/. */
export function layoutFiles() {
  return sourceFiles(['src']).filter((f) => /\.(js|jsx)$/.test(f));
}

/* each file compiled alone (JSX to calls, comments gone, whitespace
   minified: lib/codeOnly.mjs's settings), so a scratch file can be read too */
function compile(files, read) {
  const esb = esbuild();
  const out = new Map();
  for (const f of files) {
    const r = esb.transformSync(read(f), {
      loader: 'jsx', format: 'esm', target: 'esnext', jsx: 'transform',
      legalComments: 'none', minifyWhitespace: true, logLevel: 'silent', sourcefile: f,
    });
    out.set(f, r.code);
  }
  return out;
}

/* the word before index k (skipping spaces), and where it starts */
function wordBefore(m, k) {
  while (k >= 0 && /\s/.test(m[k])) k--;
  const e = k + 1;
  while (k >= 0 && /[\w$]/.test(m[k])) k--;
  return { w: m.slice(k + 1, e), at: k + 1 };
}
const NOT_NAME = new Set(['return', 'typeof', 'await', 'new', 'in', 'of', 'do', 'else', 'case', 'void', 'delete', 'yield', 'default', 'export', 'const', 'let', 'var']);
/* the name a function expression is given: `name=` or `name:` before index k
   (`async` skipped); '' when none */
function givenName(m, k) {
  let { w, at } = wordBefore(m, k);
  if (w === 'async') ({ w, at } = wordBefore(m, at - 1));
  if (w) return '';   /* a word right before: a call's argument, a keyword... */
  let j = at - 1;
  while (j >= 0 && /\s/.test(m[j])) j--;
  const c = m[j];
  if (c === ':' || (c === '=' && !/[=!<>+\-*/%&|^?]/.test(m[j - 1] || ''))) {
    const n = wordBefore(m, j - 1).w;
    return n && !NOT_NAME.has(n) && !/^\d/.test(n) ? n : '';
  }
  return '';
}

/* the functions in masked code, each with its name or '' (no name), and the
   ResizeObserver callbacks */
function functionsOf(m) {
  const { fns, blocks } = spansOf(m);
  const pair = new Map();
  for (const [a, b] of blocks) pair.set(b, a);
  const parenOpen = (k) => {   /* the `(` that the `)` at k closes */
    let d = 0;
    for (let i = k; i >= 0; i--) {
      const c = m[i];
      if (c === ')' || c === ']' || c === '}') d++;
      else if (c === '(' || c === '[' || c === '{') { if (--d === 0) return i; }
    }
    return -1;
  };
  /* where an arrow's parameters begin, given the index of its `=>` */
  const paramsStart = (arrow) => {
    let k = arrow - 1;
    while (k >= 0 && /\s/.test(m[k])) k--;
    if (m[k] === ')') return parenOpen(k);
    return wordBefore(m, k).at;
  };
  const out = [];
  for (const f of fns) {
    if (f.name === '=>') {
      let k = f.a - 1;
      while (k >= 0 && /\s/.test(m[k])) k--;
      const ps = paramsStart(k - 1);
      out.push({ name: givenName(m, ps - 1), a: f.a, b: f.b, start: ps });
    } else if (f.name === 'function') {
      /* `function(...) {`: the `function` word sits before the `(` */
      let k = f.a - 1;
      while (k >= 0 && /\s/.test(m[k])) k--;
      const op = parenOpen(k);
      const fw = wordBefore(m, op - 1);
      out.push({ name: givenName(m, fw.at - 1), a: f.a, b: f.b, start: fw.at });
    } else {
      /* `var x = function x(...) {`: esbuild prints the inner name `x2`
         (BroTown2, relock2), so the name given wins, then the source's */
      let k = f.a - 1;
      while (k >= 0 && /\s/.test(m[k])) k--;
      const nw = wordBefore(m, parenOpen(k) - 1);
      const fw = wordBefore(m, nw.at - 1);
      const given = fw.w === 'function' ? givenName(m, fw.at - 1) : '';
      out.push({ name: given || f.name, a: f.a, b: f.b, start: f.a });
    }
  }
  /* the arrows with no braces: `name=(...)=>expr`, ended by a `,` `;` or a
     closing bracket at their own depth */
  const re = /=>/g;
  let x;
  while ((x = re.exec(m))) {
    let k = x.index + 2;
    while (k < m.length && /\s/.test(m[k])) k++;
    if (m[k] === '{') continue;
    let d = 0, e = k;
    for (; e < m.length; e++) {
      const c = m[e];
      if (c === '(' || c === '[' || c === '{') d++;
      else if (c === ')' || c === ']' || c === '}') { if (d === 0) break; d--; }
      else if ((c === ',' || c === ';') && d === 0) break;
    }
    const ps = paramsStart(x.index);
    out.push({ name: givenName(m, ps - 1), a: x.index + 1, b: e, start: ps });
  }
  /* `new ResizeObserver(<fn>)`: the function that is its first argument */
  const ro = [];
  const reRO = /new ResizeObserver\(/g;
  while ((x = reRO.exec(m))) {
    const at = x.index + x[0].length;
    let best = null;
    for (const f of out) if (f.start >= at && f.start <= at + 1 && (!best || f.b > best.b)) best = f;
    if (!best) {   /* `new ResizeObserver(function(...){...})` */
      for (const f of out) if (f.start >= at && f.start < at + 12 && (!best || f.b > best.b)) best = f;
    }
    if (best) ro.push([best.a, best.b]);
  }
  /* v2.3.6360: THE TOP OF THE GAME'S FRAME (framePacer.js `beforeDraw`,
     CLAUDE.md §7's place for a read): a function handed to `beforeDraw(` (a
     callback, or a function of this file by its name), and a function of this
     file it calls by name (`beforeDraw(function () { p = readCoachPage(); })`),
     with every function inside them.  Card HB2 moves the coach's reads there
     (#2224, `?afterpaint`); the gatekeeper's sitting 51 asked for the rule. */
  const top = [];
  const topNames = new Set();
  const reBD = /(?<![\w$.])beforeDraw\(/g;
  while ((x = reBD.exec(m))) {
    const at = x.index + x[0].length;
    let best = null;
    for (const f of out) if (f.start >= at && f.start < at + 12 && (!best || f.b > best.b)) best = f;
    if (best && !best.name) {
      top.push([best.a, best.b]);
      const body = m.slice(best.a, best.b);
      const reCall = /(?<![\w$.])([A-Za-z_$][\w$]*)\(/g;
      let c;
      while ((c = reCall.exec(body))) topNames.add(c[1]);
    } else {
      const w = /^\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(m.slice(at, at + 80));
      if (w) topNames.add(w[1]);
    }
  }
  for (const f of out) if (f.name && topNames.has(f.name)) top.push([f.a, f.b]);
  return { fns: out, ro, top };
}

function namedAt(fns, p) {
  let best = null;
  for (const f of fns) if (f.name && f.a < p && p < f.b && (!best || f.a > best.a)) best = f;
  return best ? best.name : '(top)';
}

/** Every layout read in `files` (paths from the root; `read(path)` gives a
 *  file's source, the disk by default). */
export function readsOf(files = layoutFiles(), read = (f) => readFileSync(join(ROOT, f), 'utf8')) {
  /* only a file whose source names a kind's word is compiled (seconds saved;
     a read always names its word, in the code as in the source) */
  const src = new Map(files.map((f) => [f, read(f)]));
  const named = files.filter((f) => WORDS.test(src.get(f)));
  const code = compile(named, (f) => src.get(f));
  const out = [];
  for (const f of named) {
    const m = maskCode(code.get(f));
    let fr = null;
    for (const K of KINDS) {
      K.re.lastIndex = 0;
      let x;
      while ((x = K.re.exec(m))) {
        if (!fr) fr = functionsOf(m);
        const p = x.index;
        const fn = namedAt(fr.fns, p);
        const kind = K.kind ? K.kind(x) : x[1];
        let approved = '';
        if (APPROVED.some((a) => a.file === f && (a.fn === fn || a.alias === fn))) approved = 'helper';
        else if (fr.ro.some(([a, b]) => a < p && p < b)) approved = 'observer';
        else if (fr.top.some(([a, b]) => a < p && p < b)) approved = 'frame-top';
        out.push({ file: f, fn, kind, approved });
      }
    }
  }
  return out;
}

/** The reads that need a list row, counted by `file|fn|kind`. */
export function tally(reads) {
  const t = new Map();
  for (const r of reads) {
    if (r.approved) continue;
    const k = r.file + '|' + r.fn + '|' + r.kind;
    t.set(k, (t.get(k) || 0) + 1);
  }
  return t;
}

/* THE LIST'S FILE (./layoutReadsKnown.mjs), written by the guard's `--write`
   (which only lowers or removes a row) from rows { file, fn, kind, n, hb? }.
   Sorted by file, function and kind, one row a line, so a fix's diff is the
   lines it lowered. */
export const KNOWN_PATH = 'tools/guards/lib/layoutReadsKnown.mjs';
export function renderKnown(rows, line) {
  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const sorted = rows.slice().sort((a, b) => (a.file + '|' + a.fn + '|' + a.kind < b.file + '|' + b.fn + '|' + b.kind ? -1 : 1));
  const total = sorted.reduce((s, r) => s + r.n, 0);
  const files = new Set(sorted.map((r) => r.file)).size;
  let out = `/* v2.3.6360: THE LIST of the page's layout reads found on main before the
   guard (tools/guards/layout-reads.test.mjs; docs/specs/layout-reads.md),
   frozen: card LR PR 1, 2026-11-18.  A row is a file, the function a read
   sits in (lib/layoutReads.mjs says how it is named), the KIND read and how
   many there are; \`hb\` is its row in docs/plan/census/HB-holds.md when it
   has one (a hold a slow phone was measured to feel).  The count only falls
   (the plan's rule 3): a fix that takes a read away runs
   \`node tools/guards/layout-reads.test.mjs --write\`, which lowers the row
   and LINE; it never adds one.  NEVER ADD A ROW BY HAND: a new read goes
   through the ways the spec names.  A read that truly must stay (a size
   read once at start, the window's own resize) is a row with its \`why\`,
   added only with the planning session's yes, in a PR that says so. */
export const LINE = ${line === undefined ? total : line};   /* ${total} reads in ${files} files */

export const KNOWN = Object.freeze([
`;
  let last = '';
  for (const r of sorted) {
    if (r.file !== last) { out += `  /* ${r.file} */\n`; last = r.file; }
    out += `  { file: ${q(r.file)}, fn: ${q(r.fn)}, kind: ${q(r.kind)}, n: ${r.n}`
      + (r.hb ? `, hb: ${q(r.hb)}` : '') + (r.why ? `, why: ${q(r.why)}` : '') + ' },\n';
  }
  return out + ']);\n';
}
