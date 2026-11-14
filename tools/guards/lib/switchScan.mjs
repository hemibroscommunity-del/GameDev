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

/* Reads of `_liveFlags` that name no flag on purpose: the doors themselves
   and the two readers of the WHOLE map.  Each must still be found (the
   guard fails one that is not: a stale excuse would excuse a new line). */
export const DYNAMIC = Object.freeze([
  Object.freeze({ file: 'server/src/liveops.js', text: 'this._liveFlags[name]', why: '_flagOn and _flagNum, the live flags\' own doors: the name is their caller\'s (shape `call`)' }),
  Object.freeze({ file: 'server/src/liveops.js', text: 'this._liveFlags = (await', why: 'the cache\'s one load' }),
  Object.freeze({ file: 'server/src/liveops.js', text: 'flags[name] = value', why: 'POST /flags, the route that sets a flag (any name flagNameOk takes)' }),
  Object.freeze({ file: 'server/src/liveops.js', text: 'delete flags[name]', why: 'DELETE /flags, the route that clears one' }),
  Object.freeze({ file: 'server/src/join.js', text: '..._liveFlags', why: 'the caps override: every flag spread over state_sync.caps, the emergency lever of docs/specs/liveops.md ("Caps override"), out of the table by the card' }),
  Object.freeze({ file: 'server/src/clientoff.js', text: 'f[k] === true', why: 'the memory savers\' `off_<id>` list, every one at once: the savers are the table\'s by CLIENT_SAVERS' }),
]);

/* Page regexes that run over another URL than the address: no switch. */
export const NOT_ADDRESS = Object.freeze([
  Object.freeze({ name: 'farm', file: 'src/rendering/paletteLoad.js', why: 'a world object\'s own asset URL (`?farm=1` on a farm picture), not the page\'s address' }),
  Object.freeze({ name: 'farm', file: 'src/rendering/paletteTex.js', why: 'a texture\'s label (its asset URL) counted for the memory report' }),
]);

/* A worker name a shape finds that is not a flag (a local reused).  None
   today: the guard fails an entry here that the scanner no longer finds. */
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
  const blank = (a, b) => { parts.push(src.slice(from, a)); parts.push(src.slice(a, b).replace(/[^\n]/g, ' ')); from = b; };
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


/* ── helpers: a function that takes the NAME, and every call of it ──
   A call's argument at the helper's place is resolved:
     'x'                 a name;
     p   (a parameter)   the function it sits in passes the name on: a helper too;
     p.field             the same, the name a field of what it is handed:
                         its callers' `{ field: 'x' }`;
     x.field             a table: every `field: 'x'` written in the call's file;
   anything else is UNKNOWN.  A method (`.name(`) is matched in every file; a
   plain function (`name(`) in its own file and the files that import it.  */
function resolveHelpers(code, seeds, note, unknown) {
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
        let a = (args[h.at] || '').replace(/\s*\|\|\s*(?:null|''|""|undefined)\s*$/, '');
        if (h.field) {
          if (!/^\{/.test(a)) {
            const fn = enclosing(lines, line - 1, 12);
            const at = fn ? fn.params.indexOf(a) : -1;
            if (at >= 0) { queue.push({ name: fn.name, at, file, field: h.field }); continue; }
            unknown.push({ file, line, text: L.trim().slice(0, 140) }); continue;
          }
          const fm = new RegExp('(?<![\\w$])' + esc(h.field) + ":\\s*'([^']+)'").exec(a);
          if (fm) note(fm[1], { file, line, shape: 'helper' });
          continue;   /* an object without the field: no switch named */
        }
        const name = lit(a);
        if (name) { note(name, { file, line, shape: 'helper' }); continue; }
        const fn = enclosing(lines, line - 1, 12);
        if (fn && fn.params.includes(a)) { queue.push({ name: fn.name, at: fn.params.indexOf(a), file }); continue; }
        const pf = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(a);
        if (pf && fn && fn.params.includes(pf[1])) { queue.push({ name: fn.name, at: fn.params.indexOf(pf[1]), file, field: pf[2] }); continue; }
        const field = /^[A-Za-z_$][\w$.]*\.([A-Za-z_$][\w$]*)$/.exec(a);
        if (field) {
          const raw = read(file);
          const found = [...raw.matchAll(new RegExp('(?<![\\w$])' + esc(field[1]) + ":\\s*'([^']+)'", 'g'))];
          for (const t of found) note(t[1], { file, line: lineAt(raw, t.index), shape: 'table' });
          if (found.length) continue;
        }
        unknown.push({ file, line, text: L.trim().slice(0, 140) });
      }
    }
  }
  return [...seen];
}

/* ═══ the worker ═══ */
export function workerFiles() {
  return srcFiles().map((f) => 'server/src/' + f);
}

export function scanWorker(files = workerFiles()) {
  const names = new Map();
  const unknown = [];
  const helpers = [];        /* { name, at, file } */
  const dynamicSeen = new Set();
  const code = new Map();
  for (const file of files) code.set(file, blankComments(read(file)));

  const LOCAL = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:this\s*&&\s*)?(?:(?:this|room|self|r)\._liveFlags\b(?!\w)|await\s+this\._liveFlagsEnsure\(\))/;
  for (const [file, src] of code) {
    const lines = src.split('\n');
    const covered = new Set();   /* lines whose `_liveFlags` a shape explains */
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/_flag(?:On|Num)\(\s*'([^']+)'/g)) add(names, m[1], { file, line: i + 1, shape: 'call' });
      for (const m of line.matchAll(/\._liveFlags\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*'([^']+)'\s*\])/g)) {
        add(names, m[1] || m[2], { file, line: i + 1, shape: 'member' });
      }
      const decl = LOCAL.exec(line);
      if (!decl) return;
      covered.add(i);
      const v = esc(decl[1]);
      for (let j = i; j < Math.min(lines.length, i + 8); j++) {
        const L = lines[j];
        for (const m of L.matchAll(new RegExp('(?:own|has|hasOwn|hasOwnProperty\\.call|Object\\.hasOwn)\\(\\s*' + v + "\\s*,\\s*'([^']+)'", 'g'))) add(names, m[1], { file, line: j + 1, shape: 'local' });
        for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + '\\.([A-Za-z_$][\\w$]*)', 'g'))) add(names, m[1], { file, line: j + 1, shape: 'local' });
        for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + "\\[\\s*'([^']+)'\\s*\\]", 'g'))) add(names, m[1], { file, line: j + 1, shape: 'local' });
        /* any other index: a helper's parameter, or unknown */
        for (const m of L.matchAll(new RegExp('(?<![\\w$.])' + v + "\\[(?!\\s*'[^']+'\\s*\\])([^\\]]*)\\]", 'g'))) {
          const fn = enclosing(lines, j);
          const at = fn ? fn.params.indexOf(m[1].trim()) : -1;
          if (at >= 0) { helpers.push({ name: fn.name, at, file }); continue; }
          /* a constant's field (`f[HEAP_BURN.FLAG]`): the file's `FLAG: 'x'` */
          const cf = /^\s*[A-Za-z_$][\w$]*\.([A-Za-z_$][\w$]*)\s*$/.exec(m[1]);
          if (cf) {
            const raw = read(file);
            const t = [...raw.matchAll(new RegExp('(?<![\\w$])' + esc(cf[1]) + ":\\s*'([^']+)'", 'g'))];
            for (const x of t) add(names, x[1], { file, line: lineAt(raw, x.index), shape: 'table' });
            if (t.length) continue;
          }
          const dyn = DYNAMIC.find((d) => d.file === file && L.includes(d.text));
          if (dyn) { dynamicSeen.add(dyn); continue; }
          unknown.push({ file, line: j + 1, text: L.trim().slice(0, 140) });
        }
      }
    });
    /* every `_liveFlags` no shape explains */
    lines.forEach((line, i) => {
      if (covered.has(i)) return;
      for (const m of line.matchAll(/_liveFlags\b(?!Ensure|Ready|Load)/g)) {
        const after = line.slice(m.index + m[0].length);
        const before = line.slice(0, m.index);
        if (/^\s*(?:\.\s*[A-Za-z_$]|\[\s*')/.test(after)) continue;                 /* member: a name */
        if (/^\s*(?:&&|\)|\|\||;|$)/.test(after) && !/=\s*$/.test(before)) continue;  /* a presence test */
        const dyn = DYNAMIC.find((d) => d.file === file && line.includes(d.text));
        if (dyn) { dynamicSeen.add(dyn); continue; }
        unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140) });
      }
    });
  }

  const noteW = (name, where) => add(names, name, where);
  const resolved = resolveHelpers(code, helpers, noteW, unknown);

  /* promises: §8g's rule, over the raw text (it reads the comments) */
  for (const file of files) {
    const s = read(file);
    for (const m of s.matchAll(/`([A-Za-z_$][\w$]*): ?false`/g)) {
      const ctx = s.slice(Math.max(0, m.index - 160), m.index + m[0].length + 160);
      if (/live ?flags|liveflags|kill[ -]?switch/i.test(ctx)) add(names, m[1], { file, line: lineAt(s, m.index), shape: 'promise' });
    }
  }

  for (const n of NOT_A_FLAG) names.delete(n.name);
  const staleDynamic = DYNAMIC.filter((d) => d.file.startsWith('server/') && !dynamicSeen.has(d));
  return { names, unknown, helpers: resolved, staleDynamic };
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

const PAGE_REGEX = [
  /\[\?&\]\(?(?:\?:)?([A-Za-z][\w-]*)/g,          /* [?&]x  [?&](x  [?&](?:x */
  /\(\^\|\[\?&\]\)([A-Za-z][\w-]*)/g,             /* (^|[?&])x */
  /\(\?:\^\|\[\?&\]\)([A-Za-z][\w-]*)/g,          /* (?:^|[?&])x */
];
export function scanPage(files = pageFiles()) {
  const names = new Map();
  const unknown = [];
  const helpers = [];   /* { name, at, file } */
  const code = new Map();
  for (const file of files) code.set(file, blankComments(read(file)));
  const notAddressSeen = new Set();
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
      if (/new RegExp\(/.test(line) && /\[\?&\]/.test(line)) {
        const fn = enclosing(lines, i, 8);
        const p = fn && fn.params.find((x) => new RegExp("\\+\\s*\\(?\\s*" + esc(x) + '\\b').test(line));
        if (p) { helpers.push({ name: fn.name, at: fn.params.indexOf(p), file }); }
      }
      for (const re of PAGE_REGEX) for (const m of line.matchAll(re)) note(m[1], { file, line: i + 1, shape: 'regex' });
      if (line.indexOf('[?&]') < 0 && line.indexOf('URLSearchParams') < 0 && !usp.size && line.indexOf('RegExp') < 0) return;
      const d = line.indexOf('URLSearchParams') >= 0 ? /([A-Za-z_$][\w$]*)\s*=\s*[^;]{0,60}?new URLSearchParams\(/.exec(line) : null;
      if (d) usp.add(d[1]);
      for (const m of line.matchAll(/URLSearchParams\([^()]*(?:\([^()]*\)[^()]*)*\)\)?\s*\.(?:get|has|getAll)\(\s*'([^']+)'/g)) note(m[1], { file, line: i + 1, shape: 'params' });
      for (const v of usp) {
        for (const m of line.matchAll(new RegExp('(?<![\\w$.])' + esc(v) + "\\.(?:get|has|getAll)\\(\\s*'([^']+)'", 'g'))) note(m[1], { file, line: i + 1, shape: 'params' });
        for (const m of line.matchAll(new RegExp('(?<![\\w$.])' + esc(v) + '\\.(?:get|has|getAll)\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)', 'g'))) {
          /* a parameter: its function is a helper; else the census, unless
             it is a loop over the address's own entries (keepSwitches.js
             writes, reads no switch) */
          const fn = enclosing(lines, i, 8);
          if (fn && fn.params.includes(m[1])) { helpers.push({ name: fn.name, at: fn.params.indexOf(m[1]), file }); continue; }
          unknown.push({ file, line: i + 1, text: line.trim().slice(0, 140), via: m[1] });
        }
      }
    });
  }
  const resolved = resolveHelpers(code, helpers, note, unknown);
  const staleNotAddress = NOT_ADDRESS.filter((x) => !notAddressSeen.has(x));
  return { names, unknown: unknown.filter((u) => !isOwnEntries(u)), helpers: resolved, staleNotAddress };
}
/* keepSwitches.js copies the address's own entries into a new one
   (`out.has(k)` over `for (const [k, v] of q)`): it writes, reads no
   switch, and is no census line */
function isOwnEntries(u) {
  return u.file === 'src/ui/keepSwitches.js' && u.via === 'k';
}

/* ═══ the savers ═══ */
export async function scanSavers() {
  const { CLIENT_SAVERS } = await import(pathToFileURL(join(ROOT, 'src/game/clientOff.js')).href);
  return CLIENT_SAVERS.map((s) => s.id);
}

/* ═══ the census: every name found, keyed as the table keys them ═══
   A live flag by its name; a page name with its `?`; a memory saver by its
   id, its page read folded in.  { worker, page, savers, found: Map(name ->
   { side, reads }) } */
export async function census() {
  const worker = scanWorker();
  const page = scanPage();
  const savers = await scanSavers();
  const found = new Map();   /* table name -> { side, reads } */
  const put = (name, side, reads) => {
    const was = found.get(name);
    if (was) { was.reads.push(...reads); if (was.side !== side) was.side = 'both'; } else found.set(name, { side, reads: [...reads] });
  };
  const saverIds = new Set(savers);
  for (const id of savers) put(id, 'both', []);
  for (const [n, reads] of worker.names) put(n, 'worker', reads);
  for (const [n, reads] of page.names) {
    if (saverIds.has(n)) found.get(n).reads.push(...reads);
    else put('?' + n, 'page', reads);
  }
  return { worker, page, savers, found };
}

