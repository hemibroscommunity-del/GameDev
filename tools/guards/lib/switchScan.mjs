/* ═══ v2.3.5301: THE SWITCH SCANNER (grand plan step 7.1, card T PR 1) ═══
 *
 * The one reader of the CODE for the switch table (tools/guards/lib/
 * switches.mjs; the page docs/SWITCHES.md; the rules docs/specs/
 * switch-table.md).  It finds every NAME a switch is thrown by, and where
 * each is read.  It never judges a name: what a switch does, its risk and
 * its birth are the table's, written by a person reading the code.
 *
 *   scanWorker()  -> { names: Map(name -> [{file, line, shape}]), unknown: [{file, line, text}] }
 *   scanPage()    -> the same, for the page's `?name=` reads
 *   scanSavers()  -> the memory savers (CLIENT_SAVERS): one name each, both sides
 *   census()      -> every name keyed as the table keys it: { worker, page, savers, found }
 *
 * Paths are from the repository's root.  It reads the working tree, found
 * by this file's own place, and imports only node and two plain modules
 * (server/test/src-walk.mjs, the ONE walker of server/src/ in depth, card
 * N; src/game/clientOff.js, no imports), so a suite under server/test/
 * (liveops.test §8f and §8g) can use it on GitHub.
 *
 * Comments are blanked first, line for line (a comment that SAYS
 * `_flagOn('x')` reads nothing), except where a rule below reads them.
 *
 * ── THE WORKER: a live flag READ (server/src/, in depth; vendor/ left out
 *    by the walker) ──
 *   call     `_flagOn('x')`, `_flagNum('x', ...)`, the live flags' doors.
 *   local    a local holding the flags (`const f = this._liveFlags`,
 *            `= this && this._liveFlags`, `= room._liveFlags`,
 *            `= await this._liveFlagsEnsure()`), then within EIGHT lines
 *            (§8f's window) `f.x`, `f['x']`, or `own|has|hasOwn|
 *            hasOwnProperty.call|Object.hasOwn(f, 'x')`.
 *   member   `<obj>._liveFlags.x` or `<obj>._liveFlags['x']`.
 *   helper   a function that takes the NAME (`_drFlagOff(name)`, whose
 *            local reads `f[name]`), called with a literal:
 *            `_drFlagOff('dailyspin')`; `off(this, 'parryrearm')`.
 *   table    the same helper called with a field (`_moveKindOn(mv.flag)`),
 *            or a local read at a constant's field (`f[HEAP_BURN.FLAG]`):
 *            every `flag: 'x'` (`FLAG: 'x'`) written in that file.
 *   promise  a kill switch a COMMENT promises: `` `x: false` `` within 160
 *            characters of "live flags", "liveflags" or "kill switch"
 *            (§8g's rule; it reads the comments, as it must).
 *   A read of `_liveFlags` in no shape above is UNKNOWN: its line is
 *   counted apart (the guard's census: the count only falls), else a
 *   switch could hide from the table.  Not a read, and not counted: a test
 *   of the cache's presence (`if (!this._liveFlags)`, `this._liveFlags &&`),
 *   and the few lines DYNAMIC below names, each with why.
 *   NOISE: §8f's own scan holds a local's `f.x` for eight lines; a local
 *   that is not the flags (a name reused) would give a name that is no
 *   flag.  None does today (every name it gives is read as a flag at its
 *   line); a name that is noise goes in NOT_A_FLAG with why, held found.
 *
 * ── THE PAGE: a `?name=` READ (src/, every .js, .jsx and .mjs) ──
 *   regex    a regular expression over the address: `[?&]x`, `(^|[?&])x`,
 *            `(?:^|[?&])x` (`/[?&]dev=1\b/.test(location.search)`).
 *   params   `.get('x')`, `.has('x')`, `.getAll('x')` on a URLSearchParams
 *            (one made on the line, or a name bound to one in the file).
 *   helper   a function that builds the read from a parameter
 *            (`new RegExp('(?:^|[?&])' + name + ...)`), called with a
 *            literal: `deviceSwitch('manualbow', ...)`.
 *   The scanner follows the NAME, not the call: a read that hands the
 *   address to a rule in src/game/ (`frameSmoothOn(search)`) is found in
 *   that rule's file, where the name is.  A `.get(x)`/`.has(x)` with a
 *   variable on a URLSearchParams, or a helper called with no literal, is
 *   UNKNOWN (the same census).
 *   OUT OF REACH, and the page docs/SWITCHES.md says so: the QA pages
 *   (src/*-harness.html, public/tools/) and the phone scenarios' own
 *   addresses (tools/qa/).  NOT_ADDRESS below names the regexes that look
 *   like a read but run over another URL (an asset's), each with why.
 *
 * ── THE SAVERS ──
 *   Each memory saver in CLIENT_SAVERS (src/game/clientOff.js) is ONE name,
 *   its id: `off_<id>` on the worker (clientoff.js hands every phone the
 *   list) and `?<id>=0` on the page.  The page's read of `?<id>` is the
 *   saver's, not a name of its own.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { srcFiles } from '../../../server/test/src-walk.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const _read = new Map();
const read = (f) => { if (!_read.has(f)) _read.set(f, readFileSync(join(ROOT, f), 'utf8')); return _read.get(f); };

/* The functions that read the flags with no name on purpose: the doors
   themselves and the readers of the WHOLE map.  v2.3.5302 (the gatekeeper's
   review, sitting 8): an excuse is a FUNCTION, never a line's text (a new
   `_xFlagOff(name)` door written like `_flagOn` was excused by its text, and
   every read through it hid).  Each must still be used (the guard fails one
   that is not: a stale excuse would excuse a new line). */
export const DYNAMIC = Object.freeze([
  Object.freeze({ file: 'server/src/liveops.js', fn: '_flagOn', why: 'the live flags\' own door: the name is its caller\'s (shape `call`)' }),
  Object.freeze({ file: 'server/src/liveops.js', fn: '_flagNum', why: 'the live flags\' own door for a number: the name is its caller\'s' }),
  Object.freeze({ file: 'server/src/liveops.js', fn: '_liveFlagsEnsure', why: 'the cache\'s one load, which hands the whole map back' }),
  Object.freeze({ file: 'server/src/liveops.js', fn: '_liveopsRoutes', why: 'POST and DELETE /flags, the route that sets or clears a flag (any name flagNameOk takes)' }),
  Object.freeze({ file: 'server/src/join.js', fn: '_handleJoin', why: 'the caps override: every flag spread over state_sync.caps, the emergency lever of docs/specs/liveops.md ("Caps override"), out of the table by the card' }),
  Object.freeze({ file: 'server/src/eventcapes.js', fn: '_capeStartFresh', why: 'a new contest clears its two flags (read by name above it) and writes the map back' }),
  Object.freeze({ file: 'server/src/clientoff.js', fn: '_clientOffList', why: 'the memory savers\' `off_<id>` list, every one at once: the savers are the table\'s by CLIENT_SAVERS' }),
]);

/* Page regexes that run over another URL than the address: no switch. */
export const NOT_ADDRESS = Object.freeze([
  Object.freeze({ name: 'farm', file: 'src/rendering/paletteLoad.js', why: 'a world object\'s own asset URL (`?farm=1` on a farm picture), not the page\'s address' }),
  Object.freeze({ name: 'farm', file: 'src/rendering/paletteTex.js', why: 'a texture\'s label (its asset URL) counted for the memory report' }),
]);

/* A worker name a shape finds that is not a flag (a local reused).  None
   today.  The scanner keeps the name (liveops.test §8f still holds it to the
   route's names); the census leaves it out; the guard fails an entry the
   scanner no longer finds (v2.3.5302: it used to delete the name first, so
   no entry could ever be used). */
export const NOT_A_FLAG = Object.freeze([]);

/* ── the code, comments blanked, every line kept ── */
const REGEX_WORD = /(?:^|[^\w$])(?:return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/;
const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13;
const isWord = (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36;
/* a `/` here starts a regular expression (not a division)? `last` is the
   code before it, spaces skipped */
function regexHere(src, i, last) {
  if (last < 0) return true;
  const c = src.charCodeAt(last);
  if (c === 41 || c === 93) return false;                 /* ) ] */
  if (isWord(c)) return REGEX_WORD.test(src.slice(Math.max(0, last - 9), last + 1));
  return true;                                            /* an operator, ( , = : [ ! & | ? { } ; */
}
export function blankComments(src) {
  const parts = [];
  let from = 0;
  const blank = (a, b) => { parts.push(src.slice(from, a)); parts.push(src.slice(a, b).split('\n').map((l) => ' '.repeat(l.length)).join('\n')); from = b; };
  const n = src.length;
  const tpl = [];      /* a template's ${ depth stack */
  let last = -1;       /* the last code character before i */
  let i = 0;
  while (i < n) {
    const c = src.charCodeAt(i);
    if (c === 47) {                                       /* / */
      const d = src.charCodeAt(i + 1);
      if (d === 47) { const e = src.indexOf('\n', i); const end = e < 0 ? n : e; blank(i, end); i = end; continue; }
      if (d === 42) { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; blank(i, end); i = end; continue; }
      if (regexHere(src, i, last)) {
        let j = i + 1, cls = false;
        while (j < n) {
          const q = src.charCodeAt(j);
          if (q === 10) break;
          if (q === 92) { j += 2; continue; }
          if (q === 91) cls = true; else if (q === 93) cls = false; else if (q === 47 && !cls) break;
          j++;
        }
        last = j; i = j + 1; continue;
      }
    } else if (c === 39 || c === 34) {                    /* ' " */
      let j = i + 1;
      while (j < n) { const q = src.charCodeAt(j); if (q === c || q === 10) break; j += q === 92 ? 2 : 1; }
      last = j; i = j + 1; continue;
    } else if (c === 96 || (c === 125 && tpl.length && tpl[tpl.length - 1] === 0)) {   /* ` or a template's } */
      if (c === 125) tpl.pop();
      let j = i + 1, open = false;
      while (j < n) {
        const q = src.charCodeAt(j);
        if (q === 92) { j += 2; continue; }
        if (q === 96) break;
        if (q === 36 && src.charCodeAt(j + 1) === 123) { tpl.push(0); open = true; j += 2; break; }
        j++;
      }
      if (open) { last = j - 1; i = j; continue; }
      last = j; i = j + 1; continue;
    } else if (c === 123 && tpl.length) tpl[tpl.length - 1]++;
    else if (c === 125 && tpl.length) tpl[tpl.length - 1]--;
    if (!isSpace(c)) last = i;
    i++;
  }
  parts.push(src.slice(from));
  return parts.join('');
}

/* the arguments of the call whose `(` is at `open` in `s` (one line or
   more), split at the top level; null if the call does not close */
function callArgs(s, open) {
  let depth = 0, q = null, cur = '';
  const args = [];
  for (let k = open; k < s.length; k++) {
    const c = s[k];
    if (q) { cur += c; if (c === '\\') { cur += s[++k] || ''; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { if (depth++ > 0) cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (--depth === 0) { if (cur.trim() || args.length) args.push(cur.trim()); return args; }
      cur += c; continue;
    }
    if (c === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  return null;
}
const LIT = /^'([^'\\]+)'$|^"([^"\\]+)"$/;
const lit = (a) => { const m = LIT.exec(a || ''); return m ? (m[1] || m[2]) : null; };
const esc = (s) => s.replace(/[$]/g, '\\$');
const _starts = new Map();
const lineAt = (s, idx) => {
  let st = _starts.get(s);
  if (!st) { st = [0]; for (let k = s.indexOf('\n'); k >= 0; k = s.indexOf('\n', k + 1)) st.push(k + 1); _starts.set(s, st); }
  let lo = 0, hi = st.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (st[mid] <= idx) lo = mid; else hi = mid - 1; }
  return lo + 1;
};

/* the function whose body holds line `i` (a header within `back` lines
   above): { name, params } or null */
const HEAD = [
  /(?:^|[^\w$.])(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/,
  /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/,
];
function enclosing(lines, i, back = 4) {
  for (let j = i; j >= Math.max(0, i - back); j--) {
    for (const re of HEAD) {
      const m = re.exec(lines[j]);
      if (m && !/^(?:if|for|while|switch|catch|return)$/.test(m[1])) return { name: m[1], params: m[2].split(',').map((p) => p.trim().replace(/=.*$/, '').trim()).filter(Boolean) };
    }
  }
  return null;
}

function add(map, name, where) {
  if (!map.has(name)) map.set(name, []);
  map.get(name).push(where);
}


/* ── the functions of a file, by their braces ──
   [{ name, params, from, to }] (lines, 0-based, `to` its closing brace's),
   from the blanked code: the innermost one holding a line is its function.
   A local holding the flags is followed through its whole function, never a
   fixed count of lines (v2.3.5302, the gatekeeper's review: `f.x` nine lines
   below its local hid from §8f's eight). */
/* the text before `(` is a call's (`fn(`, `a.b(`, `x)(`), not `if (` or `!(` */
const isCallArg = (before) => /(?:[\])]|(?:^|[^\w$])(?!(?:if|while|switch|return|typeof|case|in|of|await|new)\b)[A-Za-z_$][\w$]*)\s*\(\s*$/.test(before);
/* the offset of line `i` (0-based) in `src` */
const lineStart = (src, i) => { lineAt(src, 0); return _starts.get(src)[i] ?? src.length; };
const _spans = new Map();
function functionsOf(src) {
  if (_spans.has(src)) return _spans.get(src);
  const lines = src.split('\n');
  const out = [];
  lines.forEach((L, i) => {
    let m = null;
    for (const re of HEAD) { m = re.exec(L); if (m) break; }
    if (!m || /^(?:if|for|while|switch|catch|return|with)$/.test(m[1])) return;
    /* the `{` that opens it, on its line or the next two */
    const start = lineStart(src, i);
    let k = src.indexOf('{', start + m.index + m[0].length - (m[0].endsWith('{') ? 1 : 0));
    if (k < 0 || lineAt(src, k) - 1 > i + 2) return;
    let d = 0;
    for (let j = k; j < src.length; j++) {
      const c = src.charCodeAt(j);
      if (c === 39 || c === 34 || c === 96) { const q = src[j]; j++; while (j < src.length && src[j] !== q && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1; continue; }
      if (c === 123) d++;
      else if (c === 125 && --d === 0) { out.push({ name: m[1], params: m[2].split(',').map((p) => p.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim()).filter(Boolean), from: i, to: lineAt(src, j) - 1 }); break; }
    }
  });
  _spans.set(src, out);
  return out;
}
function fnAt(src, i) {
  let best = null;
  for (const f of functionsOf(src)) if (f.from <= i && i <= f.to && (!best || f.from >= best.from)) best = f;
  return best;
}

/* ── helpers: a function that takes the NAME, and every call of it ──
   A call's argument at the helper's place is resolved:
     'x' or "x"          a name;
     p   (a parameter)   the function it sits in passes the name on: a helper too;
     p.field             the same, the name a field of what it is handed:
                         its callers' `{ field: 'x' }`;
     x.field             a table: every `field: 'x'` written in the call's file;
   anything else is UNKNOWN.  A method (`.name(`) is matched in every file; a
   plain function (`name(`) in its own file and the files that import it.  */
const tableOf = (raw, field) => [...raw.matchAll(new RegExp('(?<![\\w$])' + esc(field) + ':\\s*([\'"])([^\'"]+)\\1', 'g'))];
function resolveHelpers(code, raws, seeds, note, unknown) {
  const seen = new Set();
  const queue = [...seeds];
  const key = (h) => h.file + '#' + h.name + '#' + h.at + '#' + (h.field || '');
  while (queue.length) {
    const h = queue.shift();
    if (seen.has(key(h))) continue;
    seen.add(key(h));
    const callRe = new RegExp('(?<![\\w$])(\\.\\s*)?' + esc(h.name) + '\\s*\\(', 'g');
    for (const [file, src] of code) {
      if (src.indexOf(h.name) < 0) continue;
      const imports = file === h.file || new RegExp('import\\s*\\{[^}]*(?<![\\w$])' + esc(h.name) + '(?![\\w$])[^}]*\\}\\s*from').test(src);
      const lines = src.split('\n');
      for (const m of src.matchAll(callRe)) {
        if (!m[1] && !imports) continue;
        if (!m[1] && /(?:function\s*\*?\s*|(?:const|let|var)\s+)$/.test(src.slice(Math.max(0, m.index - 20), m.index))) continue;  /* its definition */
        const args = callArgs(src, m.index + m[0].length - 1);
        if (!args) continue;
        const line = lineAt(src, m.index);
        const L = lines[line - 1];
        if (!m[1] && /^\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/.test(L) && L.trim().startsWith(h.name)) continue;   /* a method's header */
        const a = (args[h.at] || '').replace(/\s*\|\|\s*(?:null|''|""|undefined)\s*$/, '');
        const fn = fnAt(src, line - 1);
        if (h.field) {
          if (!/^\{/.test(a)) {
            const at = fn ? fn.params.indexOf(a) : -1;
            if (at >= 0) { queue.push({ name: fn.name, at, file, field: h.field }); continue; }
            unknown.push({ file, line, text: L.trim().slice(0, 140) }); continue;
          }
          const fm = new RegExp('(?<![\\w$])' + esc(h.field) + ':\\s*([\'"])([^\'"]+)\\1').exec(a);
          if (fm) note(fm[2], { file, line, shape: 'helper' });
          continue;   /* an object without the field: no switch named */
        }
        const name = lit(a);
        if (name) { note(name, { file, line, shape: 'helper' }); continue; }
        if (fn && fn.params.includes(a)) { queue.push({ name: fn.name, at: fn.params.indexOf(a), file }); continue; }
        const pf = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(a);
        if (pf && fn && fn.params.includes(pf[1])) { queue.push({ name: fn.name, at: fn.params.indexOf(pf[1]), file, field: pf[2] }); continue; }
        const field = /^[A-Za-z_$][\w$.]*\.([A-Za-z_$][\w$]*)$/.exec(a);
        if (field) {
          const raw = raws(file);
          const t = tableOf(raw, field[1]);
          for (const x of t) note(x[2], { file, line: lineAt(raw, x.index), shape: 'table' });
          if (t.length) continue;
        }
        unknown.push({ file, line, text: L.trim().slice(0, 140) });
      }
    }
  }
  return [...seen];
}

/* the sources: the working tree, or a test's own (`source`: Map(path -> text)) */
function sourcesOf(files, source) {
  const raws = (f) => (source && source.has(f) ? source.get(f) : read(f));
  const code = new Map();
  for (const f of files) code.set(f, blankComments(raws(f)));
  return { raws, code };
}

/* ═══ the worker ═══ */
export function workerFiles() {
  return srcFiles().map((f) => 'server/src/' + f);
}

const OBJ = '(?:this|room|self|r|rm|that)';
/* a local holding the flags: `const f = this._liveFlags`, `= this && this._liveFlags`,
   `= (this._liveFlags || {})`, `= await this._liveFlagsEnsure()` */
const LOCAL = new RegExp('(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*\\(?\\s*(?:' + OBJ + '\\s*&&\\s*)?(?:await\\s+)?' + OBJ + '\\._liveFlags(?:Ensure\\(\\))?(?![\\w$])\\s*(?:\\|\\|\\s*\\{\\s*\\}\\s*\\)?)?');
/* `const { a, b: c, d = 1 } = this._liveFlags || {}` */
const DESTRUCT = new RegExp('(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*\\(?\\s*(?:' + OBJ + '\\s*&&\\s*)?(?:await\\s+)?' + OBJ + '\\._liveFlags(?:Ensure\\(\\))?(?![\\w$])');

export function scanWorker(files = workerFiles(), { source = null } = {}) {
  const names = new Map();
  const unknown = [];
  const helpers = [];        /* { name, at, file } */
  const dynamicSeen = new Set();
  const { raws, code } = sourcesOf(files, source);
  const excused = (file, src, i) => {
    const fn = fnAt(src, i);
    const d = fn && DYNAMIC.find((x) => x.file === file && x.fn === fn.name);
    if (d) dynamicSeen.add(d);
    return !!d;
  };
  /* a read with no name in it (`f[k]`, `_flagOn(k)`): a helper's parameter,
     a constant's field (the file's `FIELD: 'x'`), an excused function, or
     UNKNOWN */
  const dynamicRead = (file, src, lines, i, expr) => {
    const e = expr.trim();
    const fn = fnAt(src, i);
    const at = fn ? fn.params.indexOf(e) : -1;
    if (at >= 0) { if (!excused(file, src, i)) helpers.push({ name: fn.name, at, file }); return; }
    const cf = /^[A-Za-z_$][\w$]*\.([A-Za-z_$][\w$]*)$/.exec(e);
    if (cf) {
      const raw = raws(file);
      const t = tableOf(raw, cf[1]);
      for (const x of t) add(names, x[2], { file, line: lineAt(raw, x.index), shape: 'table' });
      if (t.length) return;
    }
    if (excused(file, src, i)) return;
    unknown.push({ file, line: i + 1, text: lines[i].trim().slice(0, 140) });
  };

  for (const [file, src] of code) {
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      /* call: _flagOn('x') / _flagNum("x", ...); any other argument is dynamic */
      for (const m of line.matchAll(/(?<![\w$])_flag(?:On|Num)\s*\(/g)) {
        if (/^\s*(?:async\s+)?_flag(?:On|Num)\s*\([^)]*\)\s*\{/.test(line)) continue;   /* the door's own header */
        const args = callArgs(src, lineStart(src, i) + m.index + m[0].length - 1);
        const a = args ? args[0] : '';
        const n = lit(a);
        if (n) add(names, n, { file, line: i + 1, shape: 'call' });
        else dynamicRead(file, src, lines, i, a || '?');
      }
      if (line.indexOf('_liveFlags') < 0) return;
      /* destructured */
      const ds = DESTRUCT.exec(line);
      if (ds) {
        for (const part of ds[1].split(',')) { const k = part.trim().split(/[:=]/)[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) add(names, k, { file, line: i + 1, shape: 'local' }); else if (part.trim()) unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140) }); }
      }
      /* a local: its reads, through its whole function */
      const decl = ds ? null : LOCAL.exec(line);
      if (decl) {
        const v = esc(decl[1]);
        const fn = fnAt(src, i);
        const to = fn ? fn.to : Math.min(lines.length - 1, i + 40);
        for (let j = i; j <= to; j++) {
          const L = j === i ? line.slice(decl.index + decl[0].length) : lines[j];
          if (L.indexOf(decl[1]) < 0) continue;
          for (const m of L.matchAll(new RegExp('(?:own|has|hasOwn|hasOwnProperty\\.call|Object\\.hasOwn|Object\\.prototype\\.hasOwnProperty\\.call)\\(\\s*' + v + '\\s*,\\s*([\'"])([^\'"]+)\\1', 'g'))) add(names, m[2], { file, line: j + 1, shape: 'local' });
          for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + '\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)', 'g'))) add(names, m[1], { file, line: j + 1, shape: 'local' });
          for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + '\\s*(?:\\?\\.)?\\[\\s*([\'"])([^\'"]+)\\1\\s*\\]', 'g'))) add(names, m[2], { file, line: j + 1, shape: 'local' });
          for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + '\\s*(?:\\?\\.)?\\[(?!\\s*[\'"][^\'"]+[\'"]\\s*\\])([^\\]]*)\\]', 'g'))) dynamicRead(file, src, lines, j, m[1]);
          /* the local handed on whole (`fn(f)`, `return f`, `...f`): unknown */
          for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + '(?![\\w$])', 'g'))) {
            const after = L.slice(m.index + m[0].length), before = L.slice(0, m.index);
            if (/^\s*(?:\?\.|\.|\[)/.test(after)) continue;                                   /* a read, above */
            if (/(?:own|has|hasOwn|hasOwnProperty\.call|Object\.hasOwn|Object\.prototype\.hasOwnProperty\.call)\(\s*$/.test(before)) continue;
            if (/(?:typeof\s+|!\s*|\(\s*|&&\s*|\|\|\s*)$/.test(before) && !isCallArg(before) && /^\s*(?:&&|\|\||\)|===|!==|\?|;|$)/.test(after)) continue;   /* a presence test */
            if (excused(file, src, j)) continue;
            unknown.push({ file, line: j + 1, text: lines[j].trim().slice(0, 140) });
          }
        }
      }
      /* every other `<obj>._liveFlags` and `_liveFlagsEnsure(` */
      for (const m of line.matchAll(/\._liveFlags(Ensure)?(?![\w$])/g)) {
        const after = line.slice(m.index + m[0].length);
        const before = line.slice(0, m.index).replace(/[\w$]+\s*$/, '');
        if (decl && m.index < decl.index + decl[0].length && m.index > decl.index) continue;
        if (ds && m.index > ds.index) continue;
        if (m[1]) {   /* _liveFlagsEnsure */
          if (/^\s*\(\)\s*;/.test(after) && /await\s*$/.test(before)) continue;         /* `await this._liveFlagsEnsure();`: loads, reads nothing */
          if (/typeof\s*$/.test(before) || /^\s*!==|^\s*===/.test(after)) continue;  /* is it there? */
          if (/^\s*\([^)]*\)\s*\{/.test(after) && /^\s*(?:async\s+)?$/.test(before)) continue;   /* its definition */
          if (excused(file, src, i)) continue;
          unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140) });
          continue;
        }
        const mem = /^\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*)|^\s*(?:\?\.)?\[\s*(['"])([^'"]+)\2\s*\]/.exec(after);
        if (mem) { add(names, mem[1] || mem[3], { file, line: i + 1, shape: 'member' }); continue; }
        const grp = /^\s*\|\|\s*\{\s*\}\s*\)\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*)/.exec(after);
        if (grp) { add(names, grp[1], { file, line: i + 1, shape: 'member' }); continue; }
        if (/(?:!\s*|\bif\s*\(\s*|&&\s*|\|\|\s*|\?\s*|!!\s*\(\s*|^\s*\(\s*)$/.test(before) && !isCallArg(before) && /^\s*(?:&&|\|\||\)|\?|;)/.test(after)) continue;   /* a presence test */
        const idx = /^\s*(?:\?\.)?\[([^\]]*)\]/.exec(after);
        if (idx) { dynamicRead(file, src, lines, i, idx[1]); continue; }
        if (excused(file, src, i)) continue;
        unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140) });
      }
    });
  }

  const resolved = resolveHelpers(code, raws, helpers, (name, where) => add(names, name, where), unknown);

  /* promises: §8g's rule, over the raw text (it reads the comments) */
  for (const file of files) {
    const s = raws(file);
    for (const m of s.matchAll(/`([A-Za-z_$][\w$]*): ?false`/g)) {
      const ctx = s.slice(Math.max(0, m.index - 160), m.index + m[0].length + 160);
      if (/live ?flags|liveflags|kill[ -]?switch/i.test(ctx)) add(names, m[1], { file, line: lineAt(s, m.index), shape: 'promise' });
    }
  }

  const staleDynamic = source ? [] : DYNAMIC.filter((d) => d.file.startsWith('server/') && !dynamicSeen.has(d));
  const notAFlag = new Set(NOT_A_FLAG.map((x) => x.name));
  const staleNotAFlag = NOT_A_FLAG.filter((x) => !names.has(x.name));
  return { names, unknown, helpers: resolved, staleDynamic, notAFlag, staleNotAFlag };
}

/* ═══ the page ═══ */
export function pageFiles() {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) walk(d + e.name + '/');
      else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(d + e.name);
    }
  })('src/');
  return out.sort();
}

/* the openings of a read of the address in a regular expression, then the
   name, or several in a group: `[?&]x`, `[?&](x|y)`, `(^|[?&])x`,
   `(?:^|[?&])x`, `(?:^|&)x` and `(^|&)x` (over `location.search.slice(1)`),
   `[&?]x` (v2.3.5302: the last three, and every name of a group, after the
   gatekeeper's review) */
const PAGE_REGEX = /(?:\[\?&\]|\[&\?\]|\(\^\|\[\?&\]\)|\(\?:\^\|\[\?&\]\)|\(\?:\^\|&\)|\(\^\|&\))\(?(?:\?:)?([A-Za-z][\w-]*(?:\|[A-Za-z][\w-]*)*)/g;
export function scanPage(files = pageFiles(), { source = null } = {}) {
  const names = new Map();
  const offNames = new Map();   /* clientOff('x') / clientOffAtLoad('x'): the worker's `off_x` */
  const unknown = [];
  const helpers = [];   /* { name, at, file } */
  const { raws, code } = sourcesOf(files, source);
  const notAddressSeen = new Set();
  let ownEntriesSeen = false;
  const note = (name, where) => {
    const na = NOT_ADDRESS.find((x) => x.name === name && x.file === where.file);
    if (na) { notAddressSeen.add(na); return; }
    add(names, name, where);
  };
  for (const [file, src] of code) {
    const lines = src.split('\n');
    const usp = new Set();
    lines.forEach((line, i) => {
      /* a helper: a function that builds the read from a parameter */
      if (/new RegExp\(/.test(line) && /\[\?&\]|\(\?:\^\|&\)|\(\^\|&\)/.test(line)) {
        const fn = fnAt(src, i);
        const p = fn && fn.params.find((x) => new RegExp('\\+\\s*\\(?\\s*' + esc(x) + '\\b').test(line));
        if (p) helpers.push({ name: fn.name, at: fn.params.indexOf(p), file });
      }
      if (line.indexOf('[?&]') >= 0 || line.indexOf('[&?]') >= 0 || line.indexOf('|&)') >= 0) for (const m of line.matchAll(PAGE_REGEX)) for (const n of m[1].split('|')) note(n, { file, line: i + 1, shape: 'regex' });
      if (line.indexOf('clientOff') >= 0) for (const m of line.matchAll(/(?<![\w$.])clientOff(?:AtLoad)?\(\s*(['"])([a-z0-9_]+)\1/g)) add(offNames, m[2], { file, line: i + 1, shape: 'saver' });
      /* `.includes('x=1')`, `.indexOf('?x')`: a string that reads as an address's */
      if (/\.(?:includes|indexOf|startsWith)\(\s*['"]/.test(line)) for (const m of line.matchAll(/\.(?:includes|indexOf|startsWith)\(\s*(['"])(?:[?&]([A-Za-z][\w-]*)(?:=[^'"]*)?|([A-Za-z][\w-]*)=[^'"]*)\1\s*\)/g)) note(m[2] || m[3], { file, line: i + 1, shape: 'string' });
      if (line.indexOf('URLSearchParams') < 0 && line.indexOf('searchParams') < 0 && !usp.size) return;
      const d = /([A-Za-z_$][\w$]*)\s*=\s*[^;]{0,80}?(?:new URLSearchParams\(|\.searchParams\b)/.exec(line);
      if (d) usp.add(d[1]);
      for (const m of line.matchAll(/(?:URLSearchParams\([^()]*(?:\([^()]*\)[^()]*)*\)\)?|\.searchParams)\s*\.(?:get|has|getAll)\(\s*(['"])([^'"]+)\1/g)) note(m[2], { file, line: i + 1, shape: 'params' });
      for (const v of usp) {
        for (const m of line.matchAll(new RegExp('(?<![\\w$.])' + esc(v) + '\\s*\\??\\.(?:get|has|getAll)\\(\\s*([\'"])([^\'"]+)\\1', 'g'))) note(m[2], { file, line: i + 1, shape: 'params' });
        for (const m of line.matchAll(new RegExp('(?<![\\w$.])' + esc(v) + '\\s*\\??\\.(?:get|has|getAll)\\(\\s*(?![\'"])([^)]*)\\)', 'g'))) {
          /* a parameter: its function is a helper; else the census, unless
             it is a loop over the address's own entries (keepSwitches.js
             writes, reads no switch) */
          const fn = fnAt(src, i);
          const a = m[1].trim();
          if (fn && fn.params.includes(a)) { helpers.push({ name: fn.name, at: fn.params.indexOf(a), file }); continue; }
          if (isOwnEntries(file, a)) { ownEntriesSeen = true; continue; }
          unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140) });
        }
      }
    });
  }
  const resolved = resolveHelpers(code, raws, helpers, note, unknown);
  const staleNotAddress = source ? [] : NOT_ADDRESS.filter((x) => !notAddressSeen.has(x));
  return { names, offNames, unknown, helpers: resolved, staleNotAddress, staleOwnEntries: !source && !ownEntriesSeen };
}
/* keepSwitches.js copies the address's own entries into a new one
   (`out.has(k)` over `for (const [k, v] of q)`): it writes, reads no
   switch, and is no census line.  Held to be used, as every excuse is. */
function isOwnEntries(file, via) {
  return file === 'src/ui/keepSwitches.js' && via === 'k';
}

/* ═══ the savers ═══ */
export async function scanSavers() {
  const { CLIENT_SAVERS } = await import(pathToFileURL(join(ROOT, 'src/game/clientOff.js')).href);
  return CLIENT_SAVERS.map((s) => s.id);
}

/* ═══ the census: every name found, keyed as the table keys them ═══
   A live flag by its name; a page name with its `?`; a switch the worker
   throws for the page (a memory saver of CLIENT_SAVERS, or any other
   `clientOff('x')` the page asks: the worker's `off_x`) by its id, its page
   read folded in.  NOT_A_FLAG's names are left out.
   { worker, page, savers, found: Map(name -> { side, reads }) } */
export async function census() {
  const worker = scanWorker();
  const page = scanPage();
  const savers = await scanSavers();
  const found = new Map();   /* table name -> { side, reads } */
  const put = (name, side, reads) => {
    const was = found.get(name);
    if (was) { was.reads.push(...reads); if (was.side !== side) was.side = 'both'; } else found.set(name, { side, reads: [...reads] });
  };
  const both = new Set([...savers, ...page.offNames.keys()]);
  for (const id of savers) put(id, 'both', []);
  for (const [id, reads] of page.offNames) put(id, 'both', reads);
  for (const [n, reads] of worker.names) if (!worker.notAFlag.has(n)) put(n, 'worker', reads);
  for (const [n, reads] of page.names) {
    if (both.has(n)) found.get(n).reads.push(...reads);
    else put('?' + n, 'page', reads);
  }
  return { worker, page, savers, found };
}
