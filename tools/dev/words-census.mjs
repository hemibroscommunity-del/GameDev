#!/usr/bin/env node
/* ═══ v2.3.6140: EVERY WORD A PLAYER READS, COUNTED (GRAND-PLAN 8.8 part 2; card WD PR 1) ═══
 *
 *   node tools/dev/words-census.mjs            print the page (docs/plan/census/words.md)
 *   node tools/dev/words-census.mjs --write    write the page
 *   node tools/dev/words-census.mjs --check    exit 1 if the page on disk is not what this prints
 *   node tools/dev/words-census.mjs --json     the totals and every row, as JSON
 *   node tools/dev/words-census.mjs --lines    the counts the guard holds, and every "Wheel" /
 *                                              "remnant" row (v2.3.6141: tools/guards/player-words.test.mjs)
 *
 * WHY.  The plan's 8.8: "every word a player reads in one table".  Before a
 * later card moves a single word, this counts them: every string a player can
 * read, where it is written, and whether it already comes from a table.  It
 * changes no game code.  Card WD's PR 2 turns the count into a guard that only
 * lets it fall; PR 3 (docs/specs/player-words.md) plans the table.
 *
 * NO PACKAGES.  The card says "node, no deps": GitHub's `test` job has no
 * @babel, and a guard will import this file.  So it carries its own small
 * lexer for JS and JSX (below, `lex`): strings, templates, comments, regular
 * expressions, brackets, and JSX elements with their attributes and text.
 * It is not a parser: what it cannot be sure of it says on the page.
 *
 * WHAT COUNTS (the page's "How it reads" says the same in plain words):
 *   - JSX text, and a JSX attribute a player reads (title, aria-label,
 *     placeholder, alt, label, ...): player-facing, `yes`;
 *   - a JS string or template that reads as words, in a speaking place: the
 *     value of a key such as `text:`, `label:`, `title:`, `message:`,
 *     `hint:`, `name:` ..., or an argument of a call such as `toast(`,
 *     `showToast(`, `addChat(`, `new Text(`, `deskWords(`: `yes`;
 *   - words (two or more) anywhere else: `?` (the card's reading: unclear
 *     counts as player-facing);
 *   - never: comments, console.* and Error(...) arguments, imports, object
 *     keys, comparisons (`=== 'x'`, `case 'x':`), CSS, paths and ids.
 *   - developer-only files (DEV_FILES: the Test panel, src/debug, mock data)
 *     and, v2.3.6355, words no player is shown (NOT_SHOWN, by their call)
 *     are counted apart and given as a total only (the card's reading).
 *   - the server (server/src, vendor/ aside): words in a field the page shows
 *     (`error:`, `message:`, `text:`, `title:`, `note:` ...).  Refusal CODES
 *     ('not-now', 'busy') are one word and not counted: the page turns them
 *     into its own words, which this counts where the page writes them.
 *
 * TABLE OR IN PLACE.  A string is `table` when its file is under src/data/
 * or it is written inside a `deskWords(...)` call (the one word-swap the page
 * has, CLAUDE.md §7 Desktop); every other is `place`.  The server's are
 * `server` (in place on the worker; PR 3 says where they go).
 *
 * THE WORD RULES (CLAUDE.md §1, §7) are flagged on the page:
 *   - `Wheel` (a capital W: the world's code name; a spin wheel is
 *     lowercase) and `remnant(s)` in a player-facing string;
 *   - `tap` words outside deskWords(): a computer player would read "tap"
 *     (files only a phone shows are listed too: a human reads the list).
 *
 * Deterministic: files and rows sorted, nothing reads a clock.  Line numbers
 * are on the page, so the page goes stale when src/ moves: `--check` is the
 * card's proof, run by hand, not a guard (the guard of PR 2 holds counts).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve as pathResolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PAGE = 'docs/plan/census/words.md';

/* ── which files ── */
const CLIENT_DIRS = ['src'];
const SERVER_DIRS = ['server/src'];
const SKIP_DIRS = new Set(['node_modules', 'vendor']);
const EXT = /\.(js|jsx|mjs)$/;

/* Developer-only: counted apart, a total only (the card's first reading). */
const DEV_FILES = [
  /^src\/debug\//,
  /^src\/state\//,           // the state ledgers: notes for coders, never drawn
  /^src\/ui\/panels\/(DevPanel|DevWatch|ReportTable|SetSwitchRow|FeedbackOwnerRows|SoundStudio)\.jsx$/,
  /^src\/ui\/panels\/RenameRow\.jsx$/,   // v2.3.6355: the Test panel's rename row (DevPanel.jsx its one caller; card WD3)
  /^src\/game\/ownerSwitches\.js$/,
  /^src\/data\/soundStudio\.js$/,
  /^src\/ui\/mobile\/mock[A-Z]\w*\.js$/,
  /^src\/ui\/kit\/(UiKitPage\.jsx|sampleData\.js)$/,   // v2.3.6680: the kit's own page (?uikit=1) and its samples' reader: a developer's page (card UI2)
  /^server\/src\/wire\//,       // the wire table: its notes are for coders
  /^server\/src\/(devtools|admin)\.js$/,   // the Test panel's levers and the admin routes
];
export const isDevFile = (f) => DEV_FILES.some((re) => re.test(f));

/* v2.3.6355: NOT SHOWN (docs/specs/player-words.md, "A `?` row is judged as
   its screen moves": it moves into the table or is listed here, a reason
   each).  Words inside a file a player uses that no player is shown, by the
   call they are written in, counted with the developer-only above.  Never a
   way to meet the line by renaming (rule 8): each entry names what it is and
   why no player reads it (card WD3, the planning session's answer).
   tools/guards/player-words.test 5 is its break proof. */
export const NOT_SHOWN = [
  { call: 'debugBus.cmd', why: 'the dev console\'s commands and their replies (src/ui/GameApp.jsx: `wheel`, `inv`, `card`, `hpx`, `nudge`, `mastery` ...): typed by a coder in the ?dev=1 console, printed there' },
];
const notShown = (s) => NOT_SHOWN.some((n) => s.calls.includes(n.call));

/* ── the lexer ──
 * lex(text, jsx) -> { strings: [{ kind, value, at, key, calls, jsxChild, objKey, cmp, code }] }
 *   kind  'str' (quoted), 'tpl' (template; `${..}` written as {…}), 'jsxtext', 'jsxattr'
 *   key   the property, assignment or attribute name the string is the value of
 *   calls enclosing calls' names, innermost first ('console.log', 'Text', 'toast')
 */
const KW_BEFORE_EXPR = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await', 'default', 'export']);
const ID0 = /[A-Za-z_$À-￿]/;
const IDC = /[\w$À-￿]/;

export function lex(src, jsxOk = true) {
  const out = [];
  let i = 0;
  const n = src.length;
  let last = null;            // { t: 'id'|'kw'|'num'|'p'|'str'|'close', v }
  const prev = [];            // the last few significant tokens
  const stack = [];           // frames: { ch, callee, key, jsx, tplExpr }
  const push = (t, v) => { last = { t, v }; prev.push(last); if (prev.length > 6) prev.shift(); };
  const top = () => stack[stack.length - 1];
  const calls = () => {
    const c = [];
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].ch === '(' && stack[k].callee) c.push(stack[k].callee);
    return c;
  };
  const curKey = () => {
    for (let k = stack.length - 1; k >= 0; k--) {
      const f = stack[k];
      if (f.key) return f.key;
      if (f.ch === '(' && f.callee) return null;   // a call's argument is not its outer key's value
      if (f.jsx) return f.key || null;
    }
    return rootKey.key;
  };
  const inJsxChild = () => { const f = top(); return !!(f && f.jsx === 'child'); };
  const peekSig = (j) => {
    for (;;) {
      while (j < n && /\s/.test(src[j])) j++;
      if (src.startsWith('//', j)) { j = src.indexOf('\n', j); if (j < 0) return ''; continue; }
      if (src.startsWith('/*', j)) { j = src.indexOf('*/', j + 2); if (j < 0) return ''; j += 2; continue; }
      return src.slice(j, j + 3);
    }
  };
  const record = (kind, value, at, extra = {}) => {
    const p1 = prev[prev.length - 1];
    const nx = extra.next || '';
    out.push({
      kind, value, at,
      key: extra.key !== undefined ? extra.key : curKey(),
      calls: calls(),
      jsxChild: extra.jsxChild || false,
      objKey: !!extra.objKey,
      cmp: !!(p1 && (p1.v === '===' || p1.v === '!==' || p1.v === '==' || p1.v === '!=' || p1.v === 'case'))
        || /^(===|!==|==[^=]|!=[^=])/.test(nx) || /^in\b/.test(nx),
      imp: !!(p1 && (p1.v === 'from' || p1.v === 'import')),
    });
  };

  function readQuoted(q) {
    const at = i; i++;
    let v = '';
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') {
        const e = src[i + 1];
        if (e === 'u' || e === 'x') {
          const m = e === 'x' ? /^x([0-9a-fA-F]{2})/.exec(src.slice(i + 1, i + 4))
            : /^u(?:\{([0-9a-fA-F]+)\}|([0-9a-fA-F]{4}))/.exec(src.slice(i + 1, i + 12));
          if (m) { v += String.fromCodePoint(parseInt(m[1] || m[2], 16)); i += 1 + m[0].length; continue; }
        }
        v += e === 'n' ? '\n' : e === 't' ? '\t' : e === '\n' ? '' : e;
        i += 2; continue;
      }
      if (src[i] === '\n') break;   // an unterminated string: stop at the line
      v += src[i++];
    }
    i++;
    return { at, v };
  }

  function readTemplate() {
    const at = i; i++;
    let v = '';
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { v += src[i + 1] === 'n' ? '\n' : src[i + 1]; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2; v += '{…}';
        stack.push({ ch: '{', tplExpr: true });
        const save = last; last = { t: 'p', v: '${' };
        scanJS();
        stack.pop();
        last = save;
        i++;   // the closing }
        continue;
      }
      v += src[i++];
    }
    i++;
    return { at, v };
  }

  function readRegex() {
    i++;
    let cls = false;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') break;
      if (cls) { if (c === ']') cls = false; }
      else if (c === '[') cls = true;
      else if (c === '/') { i++; break; }
      i++;
    }
    while (i < n && /[a-z]/.test(src[i])) i++;
  }

  function regexAllowed() {
    if (!last) return true;
    if (last.t === 'kw') return true;
    if (last.t === 'p') return !(last.v === ')' || last.v === ']' || last.v === '}');
    return false;
  }

  function jsxStartHere() {
    if (!jsxOk) return false;
    const c = src[i + 1];
    if (!(c === '>' || /[A-Za-z]/.test(c))) return false;
    if (!last) return true;
    if (last.t === 'kw') return true;
    if (last.t === 'p') return !(last.v === ')' || last.v === ']' || last.v === '}');
    return false;
  }

  // The JS scanner: runs until an unmatched closer (left at i) or the end.
  function scanJS() {
    const base = stack.length;
    while (i < n) {
      const c = src[i];
      if (c === '\n' || c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '"' || c === "'") {
        const { at, v } = readQuoted(c);
        const nx = peekSig(i);
        const p1 = prev[prev.length - 1];
        const objKey = nx[0] === ':' && p1 && (p1.v === '{' || p1.v === ',');
        record('str', v, at, { next: nx, objKey, jsxChild: inJsxChild() });
        push('str', v);
        continue;
      }
      if (c === '`') {
        const at = i;
        const { v } = readTemplate();
        record('tpl', v, at, { next: peekSig(i), jsxChild: inJsxChild() });
        push('str', v);
        continue;
      }
      if (c === '/' && regexAllowed()) { readRegex(); push('id', 're'); continue; }
      if (c === '<' && jsxStartHere()) { scanElement(); push('p', ')'); continue; }
      if (ID0.test(c)) {
        let j = i + 1;
        while (j < n && IDC.test(src[j])) j++;
        const w = src.slice(i, j);
        i = j;
        push(KW_BEFORE_EXPR.has(w) ? 'kw' : 'id', w);
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
        let j = i + 1;
        while (j < n && /[\w.]/.test(src[j])) j++;
        i = j; push('num', 'n'); continue;
      }
      if (c === '(' || c === '[' || c === '{') {
        let callee = null;
        if (c === '(' && last && last.t === 'id') {
          // a member chain: console.log, PIXI.Text, this.toast
          const p = prev, L = p.length;
          callee = last.v;
          if (L >= 3 && p[L - 2].v === '.' && p[L - 3].t === 'id') callee = p[L - 3].v + '.' + callee;
        }
        stack.push({ ch: c, callee, key: null });
        push('p', c); i++;
        continue;
      }
      if (c === ')' || c === ']' || c === '}') {
        if (stack.length <= base) return;      // the caller's closer
        stack.pop();
        push('p', c); i++;
        continue;
      }
      // punctuation: the longest of the usual operators
      const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
      let op = c;
      if (['===', '!==', '...', '>>>', '**=', '&&=', '||=', '??='].includes(three)) op = three;
      else if (['==', '!=', '=>', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '<<', '>>'].includes(two)) op = two;
      i += op.length;
      const f = top();
      const fq = f || rootKey;
      if (op === '?') fq.q = (fq.q || 0) + 1;
      if (op === ':' && fq.q > 0) { fq.q--; push('p', op); continue; }
      else if (op === ':' && f && last && (last.t === 'id' || last.t === 'str' || last.t === 'kw')) {
        const p2 = prev[prev.length - 2];
        if (!p2 || p2.v === '{' || p2.v === ',' || f.ch === '{') f.key = last.v;
      } else if (op === '=' && last && last.t === 'id') {
        if (f) f.key = last.v; else rootKey.key = last.v;
      } else if (op === ',' || op === ';') {
        fq.key = null; fq.q = 0;
      }
      push('p', op);
    }
  }
  const rootKey = { key: null };

  // A JSX element, from its '<' to past its end.
  function scanElement() {
    i++;   // '<'
    let name = '';
    while (i < n && /[\w.:-]/.test(src[i])) name += src[i++];
    // attributes
    for (;;) {
      while (i < n && /\s/.test(src[i])) i++;
      if (i >= n) return;
      if (src[i] === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (src[i] === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
      if (src[i] === '/' && src[i + 1] === '>') { i += 2; return; }
      if (src[i] === '>') { i++; break; }
      if (src[i] === '{') {   // a spread or a comment
        i++; stack.push({ ch: '{', jsx: 'attr', key: null });
        const save = last; last = { t: 'p', v: '{' };
        scanJS(); stack.pop(); last = save; i++;
        continue;
      }
      let an = '';
      while (i < n && /[\w:.-]/.test(src[i])) an += src[i++];
      if (!an) { i++; continue; }
      while (i < n && /\s/.test(src[i])) i++;
      if (src[i] !== '=') continue;
      i++;
      while (i < n && /\s/.test(src[i])) i++;
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i], at = i; i++;
        const e = src.indexOf(q, i);
        const v = src.slice(i, e < 0 ? n : e);
        i = e < 0 ? n : e + 1;
        record('jsxattr', v, at, { key: an });
      } else if (src[i] === '{') {
        i++; stack.push({ ch: '{', jsx: 'attr', key: an });
        const save = last; last = { t: 'p', v: '{' };
        scanJS(); stack.pop(); last = save; i++;
      }
    }
    // children
    for (;;) {
      const at = i;
      let t = '';
      while (i < n && src[i] !== '<' && src[i] !== '{') t += src[i++];
      if (/\S/.test(t)) {
        const lead = t.match(/^\s*/)[0].length;
        record('jsxtext', unEntity(t.trim().replace(/\s+/g, ' ')), at + lead, { key: null, jsxChild: true });
      }
      if (i >= n) return;
      if (src[i] === '{') {
        i++; stack.push({ ch: '{', jsx: 'child', key: null });
        const save = last; last = { t: 'p', v: '{' };
        scanJS(); stack.pop(); last = save; i++;
        continue;
      }
      if (src[i + 1] === '/') {   // the closing tag
        const e = src.indexOf('>', i);
        i = e < 0 ? n : e + 1;
        return;
      }
      scanElement();
    }
  }

  let stray = 0;
  while (i < n) {
    scanJS();
    if (i < n) { i++; stray++; }   // a stray closer: step over it (counted: a sign the lexer lost its place)
  }
  out.stray = stray;
  out.open = stack.length;
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', ldquo: '\u201c',
  rdquo: '\u201d', lsquo: '\u2018', rsquo: '\u2019', hellip: '\u2026', middot: '\u00b7', times: '\u00d7', rarr: '\u2192', larr: '\u2190' };
const unEntity = (s) => s.replace(/&(#\d+|[a-z]+);/g, (m, e) => (e[0] === '#' ? String.fromCodePoint(+e.slice(1)) : ENTITIES[e] || m));

/* ── what reads as words ── */
const CSS_WORDS = new Set(('none auto flex block inline inline-block inline-flex grid center left right top bottom middle bold bolder normal italic ' +
  'solid dashed dotted double absolute relative fixed sticky static hidden visible scroll pointer default row column wrap nowrap ' +
  'start end flex-start flex-end space-between space-around stretch baseline both inherit initial unset transparent white black ' +
  'red green blue gray grey yellow orange purple pink cover contain no-repeat repeat ease ease-in ease-out ease-in-out linear ' +
  'forwards backwards infinite alternate uppercase lowercase capitalize sans-serif serif monospace system-ui cursive ' +
  'important screen and only not all min-width max-width orientation landscape portrait hover active focus touch ' +
  'smooth instant nearest pre pre-wrap break-word anywhere collapse separate border-box content-box').split(' '));
const CSS_RE = /(\d(px|rem|em|vh|vw|vmin|vmax|ms|deg|fr)\b|rgba?\(|hsla?\(|var\(--|gradient\(|translate|cubic-bezier|calc\(|scale\(|rotate\(|drop-shadow|blur\(|!important|#[0-9a-fA-F]{3,8}\b|\b[a-z-]+:[^\s;]+[^;]*;|-webkit-|@keyframes|@media)/;
const CODE_RE = /([;{}]\s*\n|\bvec[234]\b|\bgl_|=>|&&|\|\||===|\bfunction\b|\breturn\b|;\s*$|^[.#][\w-]+|\w\(\)|\$\{)/;
const PATH_RE = /^(https?:|data:|blob:|wss?:|mailto:|\.{0,2}\/|[\w.-]+\/[\w./-]*$)|\.(png|webp|js|jsx|mjs|json|mp3|ogg|wav|m4a|css|svg|jpe?g|gif|md|html)\b/;

/** 'words' (two or more words), 'word' (one word a speaking place may show), or null. */
export function reads(s) {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\{…\}/g, ' 0 ').replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z]/.test(t)) return null;
  if (PATH_RE.test(t) || CSS_RE.test(t) || CODE_RE.test(t)) return null;
  if (/^[a-z0-9]+([-_.:/][a-z0-9]+)+$/i.test(t)) return null;          // kebab, snake, dotted ids
  const words = t.split(' ').filter((w) => /[A-Za-z]/.test(w));
  if (words.length >= 2) {
    if (words.every((w) => CSS_WORDS.has(w.replace(/[(),:;]/g, '').toLowerCase()) || /^[\d.%-]+$/.test(w))) return null;
    if (/^\(?[\w-]+\s*:\s*[\w-]+\)?$/.test(t)) return null;            // a media query
    if (/^[a-z]+(\s[a-z]+)*$/.test(t) && words.every((w) => /^[a-z][a-z0-9]*$/.test(w)) && words.length <= 3
      && words.some((w) => CSS_WORDS.has(w))) return null;
    return 'words';
  }
  const w = words[0] || '';
  if (/^[A-Za-z][a-z']*[!?.…:]*$/.test(w) || /^[A-Z]{2,}[!?]*$/.test(w)) {
    if (CSS_WORDS.has(w.toLowerCase())) return null;
    return 'word';
  }
  return null;
}

/* ── where words are spoken ── */
const SPEAK_ATTRS = new Set(['title', 'aria-label', 'placeholder', 'alt', 'label', 'aria-description', 'aria-roledescription',
  'aria-valuetext', 'value', 'text', 'hint', 'caption', 'heading', 'header', 'subtitle', 'message', 'confirmLabel', 'cancelLabel',
  'okLabel', 'buttonLabel', 'emptyText', 'tooltip', 'name', 'sub', 'note', 'body', 'cta', 'line', 'word', 'words', 'tip']);
const SPEAK_KEY_RE = /^(text|texts|label|labels|title|titles|message|messages|msg|line|lines|hint|hints|tip|tips|toast|desc|description|blurb|body|caption|heading|header|subtitle|sub|subline|prompt|placeholder|error|err|note|notes|info|confirm|button|btn|cta|say|says|said|speech|greeting|greet|reply|answer|ask|question|name|displayName|fullName|title2|lore|flavor|flavour|tagline|tooltip|alt|word|words|status|statusText|reason|why|help|intro|outro|summary|detail|details|story|phrase|quote|banner|headline|chat|shout|whisper|warn|warning|notice|teach|lesson|goal|objective|step|steps|task|tasks|story|nudge|coach|label2|short|long|verb|noun|caption2|empty|emptyText|okText|yesText|noText|cancelText|bodyText|hintText|titleText|subText|sayText)$/i;
const SPEAK_CALL_RE = /(^|\.)(toast|showToast|pushToast|addToast|popup|showPopup|notify|addNotif|pushNotif|notif|say|announce|banner|showBanner|flash|alert|confirm|prompt|addChat|pushChat|chat|sysChat|systemChat|addSystem|pushSystem|systemLine|addLine|pushLine|floatText|floatingText|addFloating|spawnFloat|popText|showMessage|setMessage|setMsg|setStatus|setError|setHint|setNote|setTitle|setLabel|setText|setWords|setToast|setBanner|setInfo|setLine|setReason|Text|BitmapText|HTMLText|deskWords|tell|speak|bubble|showInfo|openInfo|log2|feed|pushFeed|addFeed|storeToast|infoPopup|coach|nudge|teach)$/;
const CODE_CALL_RE = /^(console\.\w+|Error|TypeError|RangeError|SyntaxError|require|import|querySelector|querySelectorAll|document\.querySelector|document\.querySelectorAll|document\.getElementById|getElementById|addEventListener|removeEventListener|dispatchEvent|CustomEvent|Event|getItem|setItem|removeItem|localStorage\.getItem|localStorage\.setItem|sessionStorage\.getItem|sessionStorage\.setItem|matchMedia|window\.matchMedia|getPropertyValue|setProperty|setAttribute|getAttribute|hasAttribute|createElement|document\.createElement|fetch|postMessage|RegExp|Symbol|warn|debug|trace|emit|on|off|once|send|_send|act|includes|startsWith|endsWith|indexOf|split|join|replace|replaceAll|match|test|has|get|delete|sw|swHas|swOn|swNum|readSwitch|pageAddress|mark|measure|noteMade|recordCrash|_rebuildRenderer|window._rebuildRenderer|perfMark|assert|describe|it|check|hold)$/;
const CODE_KEYS = new Set(['className', 'class', 'style', 'id', 'key', 'type', 'src', 'href', 'd', 'fill', 'stroke', 'color', 'background',
  'backgroundColor', 'font', 'fontFamily', 'fontWeight', 'fontStyle', 'cursor', 'transform', 'transition', 'animation', 'position',
  'display', 'kind', 'op', 'event', 'ev', 'mode', 'role', 'tag', 'tagName', 'url', 'path', 'file', 'sheet', 'anim', 'pose', 'look',
  'icon', 'emoji', 'slot', 'stat', 'skill', 'zone', 'land', 'element', 'elem', 'sound', 'sfx', 'clip', 'cue', 'action', 'cap', 'flag',
  'lane', 'data-key', 'data-esc', 'data-enter', 'data-qa', 'data-testid', 'htmlFor', 'inputMode', 'autoComplete', 'enterKeyHint',
  'touchAction', 'whiteSpace', 'textAlign', 'align', 'justify', 'justifyContent', 'alignItems', 'flexDirection', 'overflow',
  'pointerEvents', 'userSelect', 'boxShadow', 'textShadow', 'border', 'borderColor', 'outline', 'filter', 'mixBlendMode',
  'objectFit', 'imageRendering', 'zIndex', 'width', 'height', 'gridTemplateColumns', 'gridTemplateAreas', 'gridArea', 'fontVariant',
  'textTransform', 'letterSpacing', 'lineHeight', 'fontSize', 'margin', 'padding', 'gap', 'blend', 'blendMode', 'tint', 'stroke2',
  'dropShadowColor', 'fontVariantNumeric', 'opacity', 'visibility', 'textDecoration', 'verticalAlign', 'wordBreak', 'scrollBehavior',
  'transformOrigin', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'WebkitTextStroke', 'webkitTextStroke',
  'xmlns', 'viewBox', 'preserveAspectRatio', 'strokeLinecap', 'strokeLinejoin', 'fillRule', 'clipRule', 'method', 'credentials',
  'mimeType', 'accept', 'rel', 'target', 'download', 'crossOrigin', 'loading', 'decoding', 'name2', 'qa', 'probe', 'hold', 'why2']);

/** 'yes', '?', or null (not player-facing) for one lexed string. */
export function judge(s) {
  if (s.objKey || s.cmp || s.imp) return null;
  if (s.calls.some((c) => CODE_CALL_RE.test(c))) {
    // a code call inside a speaking one (toast(x.replace('a','b'))) is still code
    return null;
  }
  const r = reads(s.value);
  if (!r) return null;
  if (s.kind === 'jsxtext') return 'yes';
  if (s.kind === 'jsxattr') {
    if (SPEAK_ATTRS.has(s.key)) return 'yes';
    if (CODE_KEYS.has(s.key) || /^(on[A-Z]|data-|aria-)/.test(s.key || '')) return null;
    return r === 'words' ? '?' : null;
  }
  if (s.key && CODE_KEYS.has(s.key)) return null;
  const speakCall = s.calls.length && SPEAK_CALL_RE.test(s.calls[0]);
  if (speakCall || (s.key && SPEAK_KEY_RE.test(s.key)) || s.jsxChild) return 'yes';
  return r === 'words' ? '?' : null;
}

/** The server: words in a field the page shows. */
const SERVER_KEY_RE = /^(error|message|msg|text|title|line|note|toast|body|hint|label|desc|description|say|chat|banner|warn|warning|detail|why|reason|words|name)$/;
export function judgeServer(s) {
  if (s.objKey || s.cmp || s.imp) return null;
  if (s.calls.some((c) => CODE_CALL_RE.test(c))) return null;
  if (reads(s.value) !== 'words') return null;
  if (s.key && SERVER_KEY_RE.test(s.key)) return 'yes';
  return null;
}

/* ── the screen a file draws ── */
export function screenOf(f) {
  const base = f.split('/').pop().replace(/\.(jsx|js|mjs)$/, '');
  if (f.startsWith('server/src/')) return 'server: ' + base;
  if (f === 'src/ui/BroTown.jsx') return 'BroTown (the game page)';
  if (f.startsWith('src/ui/')) return base;
  if (f.startsWith('src/data/')) return 'data: ' + base;
  const dir = f.split('/')[1];
  return dir + ': ' + base;
}

/* ── the scan ── */
function walk(dir, out) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs).sort()) {
    if (SKIP_DIRS.has(e)) continue;
    const rel = dir + '/' + e;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (EXT.test(e)) out.push(rel);
  }
  return out;
}

function lineAt(starts, at) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= at) lo = m; else hi = m - 1; }
  return lo + 1;
}

const WHEEL_RE = /\bWheel\b/;
const REMNANT_RE = /\bremnants?\b/i;
const TAP_RE = /\b[Tt]ap(s|ped|ping)?\b/;

/** Every player-facing row, with the totals.  `files` overrides the walk (the guard's tests). */
export function census(opts = {}) {
  const read = opts.read || ((f) => readFileSync(join(ROOT, f), 'utf8'));
  const clientFiles = opts.clientFiles || CLIENT_DIRS.flatMap((d) => walk(d, []));
  const serverFiles = opts.serverFiles || SERVER_DIRS.flatMap((d) => walk(d, []));
  const rows = [];
  let dev = 0;
  for (const f of clientFiles) {
    const text = read(f);
    const starts = [0];
    for (let k = 0; k < text.length; k++) if (text[k] === '\n') starts.push(k + 1);
    const dv = isDevFile(f);
    for (const s of lex(text, true)) {
      const v = judge(s);
      if (!v) continue;
      if (dv || notShown(s)) { dev++; continue; }
      const where = f.startsWith('src/data/') || s.calls.includes('deskWords') ? 'table' : 'place';
      rows.push({ file: f, line: lineAt(starts, s.at), screen: screenOf(f), side: 'client', where, sure: v, kind: s.kind, value: s.value, desk: s.calls.includes('deskWords') });
    }
  }
  for (const f of serverFiles) {
    const text = read(f);
    const starts = [0];
    for (let k = 0; k < text.length; k++) if (text[k] === '\n') starts.push(k + 1);
    const dv = isDevFile(f);
    for (const s of lex(text, false)) {
      if (!judgeServer(s)) continue;
      if (dv) { dev++; continue; }
      rows.push({ file: f, line: lineAt(starts, s.at), screen: screenOf(f), side: 'server', where: 'server', sure: 'yes', kind: s.kind, value: s.value, desk: false });
    }
  }
  for (const r of rows) {
    r.wheel = WHEEL_RE.test(r.value);
    r.remnant = REMNANT_RE.test(r.value);
    r.tap = r.side === 'client' && !r.desk && TAP_RE.test(r.value);
  }
  rows.sort((a, b) => (a.screen < b.screen ? -1 : a.screen > b.screen ? 1 : a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  const t = {
    all: rows.length,
    table: rows.filter((r) => r.where === 'table').length,
    place: rows.filter((r) => r.where === 'place').length,
    server: rows.filter((r) => r.where === 'server').length,
    sure: rows.filter((r) => r.sure === 'yes').length,
    unsure: rows.filter((r) => r.sure === '?').length,
    dev,
    wheel: rows.filter((r) => r.wheel).length,
    remnant: rows.filter((r) => r.remnant).length,
    tap: rows.filter((r) => r.tap).length,
    files: clientFiles.length + serverFiles.length,
  };
  return { rows, totals: t, clientFiles, serverFiles };
}

/* ── the page ── */
const cell = (v) => {
  let s = v.replace(/\s+/g, ' ').trim();
  if (s.length > 90) s = s.slice(0, 87) + '...';
  return '`' + s.replace(/`/g, "'").replace(/\|/g, '\\|') + '`';
};

export function page(c = census()) {
  const { rows, totals: t } = c;
  const L = [];
  L.push('# Card WD: every word a player reads, counted (v2.3.6140)');
  L.push('');
  L.push('Made by `node tools/dev/words-census.mjs --write` (GRAND-PLAN 8.8, part 2). Never');
  L.push('edited by hand: `--check` fails a page that is not the scan\'s. No word has moved');
  L.push('yet: this is the count a later card moves into one table (`docs/specs/player-words.md`).');
  L.push('');
  L.push('## The count');
  L.push('');
  L.push('| | strings |');
  L.push('|---|---|');
  L.push('| player-facing, all | ' + t.all + ' |');
  L.push('| ...in a table (`src/data/*`, `deskWords()`) | ' + t.table + ' |');
  L.push('| ...written in place on the page | ' + t.place + ' |');
  L.push('| ...written in place on the worker (`server/src`) | ' + t.server + ' |');
  L.push('| ...sure (`yes`) / unclear, counted (`?`) | ' + t.sure + ' / ' + t.unsure + ' |');
  L.push('| developer-only (Test panel, `src/debug`, mock data; NOT_SHOWN, v2.3.6355): not player-facing, total only | ' + t.dev + ' |');
  L.push('| flag: "Wheel" a player reads | ' + t.wheel + ' |');
  L.push('| flag: "remnant(s)" a player reads | ' + t.remnant + ' |');
  L.push('| flag: "tap" outside `deskWords()` | ' + t.tap + ' |');
  L.push('| files read | ' + t.files + ' |');
  L.push('');
  L.push('## How it reads');
  L.push('');
  L.push('- Its own lexer for JS and JSX (no packages): strings, templates (`${..}` shown as');
  L.push('  `{…}`), comments, regular expressions, brackets, JSX tags, attributes and text.');
  L.push('- **yes**: JSX text; an attribute a player reads (`title`, `aria-label`, `placeholder`,');
  L.push('  `alt`, `label` ...); words as the value of a speaking key (`text:`, `label:`,');
  L.push('  `message:`, `hint:`, `name:` ...) or in a speaking call (`toast(`, `addChat(`,');
  L.push('  `new Text(`, `deskWords(` ...).');
  L.push('- **?**: two or more words anywhere else (the card: unclear counts as player-facing).');
  L.push('- **Never**: comments; `console.*`, `Error(` and other code calls; imports; object');
  L.push('  keys; comparisons and `case` labels; CSS, paths, ids; a single word outside a');
  L.push('  speaking place.');
  L.push('- **Table**: a file under `src/data/`, or a string inside a `deskWords(...)` call.');
  L.push('  **In place**: every other. The worker\'s: words in a field the page shows');
  L.push('  (`error:`, `message:`, `text:`, `title:`, `note:` ...); one-word refusal codes');
  L.push('  are not words (the page writes its own, counted where it writes them).');
  L.push('- **Flags**: `Wheel` with a capital (the world\'s code name; a spin wheel is');
  L.push('  lowercase), `remnant(s)`, and `tap` words not inside `deskWords()` (a phone-only');
  L.push('  screen may say "tap": a human reads the list).');
  L.push('- What it cannot see: words joined at run time from pieces it does not judge');
  L.push('  (`a + b`), words in `.html` and `.css` (`content:`), and words in pictures.');
  L.push('');
  // screens
  const byScreen = new Map();
  for (const r of rows) {
    if (!byScreen.has(r.screen)) byScreen.set(r.screen, []);
    byScreen.get(r.screen).push(r);
  }
  const screens = [...byScreen.keys()];
  L.push('## The screens');
  L.push('');
  L.push('One row a screen (a file under `src/ui/`; the rest by its folder), largest first.');
  L.push('');
  L.push('| screen | files | in place | in a table | server | ? | Wheel | remnant | tap |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  const sum = (a, k, v) => a.filter((r) => r[k] === v).length;
  const ordered = screens.slice().sort((a, b) => byScreen.get(b).length - byScreen.get(a).length || (a < b ? -1 : 1));
  for (const s of ordered) {
    const a = byScreen.get(s);
    const files = [...new Set(a.map((r) => r.file))].length;
    L.push('| ' + s + ' | ' + files + ' | ' + sum(a, 'where', 'place') + ' | ' + sum(a, 'where', 'table') + ' | ' + sum(a, 'where', 'server')
      + ' | ' + sum(a, 'sure', '?') + ' | ' + sum(a, 'wheel', true) + ' | ' + sum(a, 'remnant', true) + ' | ' + sum(a, 'tap', true) + ' |');
  }
  L.push('');
  const flagList = (title, k, note) => {
    L.push('## ' + title);
    L.push('');
    if (note) { L.push(note); L.push(''); }
    const a = rows.filter((r) => r[k]);
    if (!a.length) L.push('None.');
    for (const r of a) L.push('- `' + r.file + ':' + r.line + '` (' + r.screen + ', ' + r.sure + ') ' + cell(r.value));
    L.push('');
  };
  flagList('Flag: "Wheel" a player reads', 'wheel', 'CLAUDE.md §1: on screen it is "BroTown", the "World map", "the world". Not fixed here (card WD moves no words).');
  flagList('Flag: "remnant(s)" a player reads', 'remnant', 'CLAUDE.md §1: players read "Remains".');
  flagList('Flag: "tap" outside deskWords()', 'tap', 'CLAUDE.md §7 Desktop: words a computer player reads say "click", through `deskWords()`. A row on a phone-only screen is not a fault, '
    + 'and a table\'s row (`src/data/*`, the townsfolk\'s and quests\' words) may be swapped by `deskWords()` where its screen draws it: a human reads the list.');
  L.push('## Every string, by screen');
  L.push('');
  L.push('`P` in place, `T` in a table, `S` the worker; `?` unclear (counted).');
  L.push('');
  for (const s of screens) {
    const a = byScreen.get(s);
    L.push('### ' + s + ' (' + a.length + ')');
    L.push('');
    for (const r of a) {
      const w = r.where === 'table' ? 'T' : r.where === 'server' ? 'S' : 'P';
      L.push('- `' + r.file + ':' + r.line + '` ' + w + (r.sure === '?' ? '?' : '') + ' ' + cell(r.value));
    }
    L.push('');
  }
  return L.join('\n');
}

/* ── the command ── */
const isMain = process.argv[1] && pathResolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv[2] || '';
  const c = census();
  if (arg === '--lines') {
    // v2.3.6141: what tools/guards/player-words.test.mjs holds, as it would write it
    console.log('in place on the page: ' + c.totals.place + '   on the worker: ' + c.totals.server);
    for (const r of c.rows.filter((x) => x.wheel || x.remnant)) console.log('  ' + JSON.stringify({ value: r.value }) + ',   // ' + r.file + ':' + r.line);
  } else if (arg === '--json') {
    process.stdout.write(JSON.stringify(c, null, 1) + '\n');
  } else if (arg === '--write') {
    writeFileSync(join(ROOT, PAGE), page(c) + '\n');
    console.log('wrote ' + PAGE + ': ' + JSON.stringify(c.totals));
  } else if (arg === '--check') {
    const want = page(c) + '\n';
    const have = existsSync(join(ROOT, PAGE)) ? readFileSync(join(ROOT, PAGE), 'utf8') : '';
    if (want !== have) {
      console.log('FAIL ' + PAGE + ' is not what the scan makes: node tools/dev/words-census.mjs --write');
      process.exit(1);
    }
    console.log('ok ' + PAGE + ' is the scan\'s, byte for byte: ' + JSON.stringify(c.totals));
  } else {
    process.stdout.write(page(c) + '\n');
  }
}
