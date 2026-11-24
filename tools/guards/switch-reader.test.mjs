/* ═══ v2.3.5306: THE PAGE'S ONE READER HOLDS (grand plan step 7.1, card T PR 6) ═══
 *
 * src/game/switches.js reads the page's address once and answers every
 * switch by its name (`sw`, `swHas`, `swValue`).  This guard holds:
 *
 *   1. A MOVE CHANGES NO ADDRESS'S MEANING.  Each read moved into the reader
 *      (MOVED below: its old test, kept here word for word) gives the same
 *      answer as the reader on a fixed set of addresses: the name absent;
 *      present; `=` empty; `=0`, `=1`, `=off`, `=false`; a value; the name
 *      inside a longer name (before and after); beside another name.  And
 *      its file asks the reader as the row says (the call is there).
 *   2. Every ask of the reader in src/ names a row of the switch table on the
 *      page's side, and `sw` only a row with a form (`swValue` reads a
 *      value's): an ask that can never be thrown is a mistake.
 *   3. THE OUTSIDE READS (a census, only falls; the gatekeeper's): the reads
 *      of `location.search` in src/ outside the reader, code only (comments
 *      blanked).  Card T's PRs 7 on lower it as reads move in.
 *   4. The page's reader follows its address: a page may change its own
 *      (history.replaceState), and the reader answers for it as it is now.
 *   5. pageAddress() (v2.3.5311) is the address as written, '' with no
 *      page: the sites that hand the whole address to a rule call it.
 *
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-14:
 *   - `?nmlask`'s old test made to also take `off` (/[?&]nmlask=(0|off)/):
 *     a moved read that answers `=off` differently
 *                                        -> FAIL 1 (nmlask: ?nmlask=off old
 *                                           true, reader false)
 *   - a `location.search` read added to src/game/dice.js
 *                                        -> FAIL 3 (one over the line)
 *   - `sw('lane')` in a moved file (`?lane` is a value)
 *                                        -> FAIL 2
 *   - the reader made to keep its first address (`if (_page) return _page`)
 *                                        -> FAIL 4 (true,true,true)
 *   - `?gearretry` (it needs `?retrylooks`) listed as moved
 *                                        -> FAIL 1 (?retrylooks=0: old false,
 *                                           reader true)
 *   - pageAddress() made to lower-case the address (2026-11-17)
 *                                        -> FAIL 5 (?tod=dusk&TOD=x)
 *   v2.3.6520 (card WL; the shape review's plant 6), tried 2026-11-23, each
 *   in src/game/farmWalk.js tickFarmWalk:
 *   - `if (new URL(window.location.href).searchParams.get('farmfast') === '1') return;`
 *                                        -> FAIL 3 (the text count passed it)
 *   - `const _q = new URLSearchParams(document.location.search); if (_q.has('farmfast')) return;`
 *                                        -> FAIL 3
 *   - `if (/farmfast/.test(location.href)) return;`  -> FAIL 3
 *   - `if (String(location).includes('farmfast')) return;` -> FAIL 3
 *   v2.3.6520, sitting 58's hold (the guard knew spellings; it now FOLLOWS
 *   the location and fails on a form it cannot follow: addressScan), tried
 *   2026-11-24, each in tickFarmWalk:
 *   - `new URL(window.location).searchParams.get('farmfast')`  -> FAIL 3
 *   - `const _loc = window.location; _loc.search.includes(..)` -> FAIL 3
 *   - `const { search } = window.location; search.includes(..)` -> FAIL 3
 *   - `const { location: _l } = window; _l.href...`            -> FAIL 3
 *   - `window['location'].search`, `window.location?.search`   -> FAIL 3
 *   - `readIt(location)`, `[window.location][0]`,
 *     `String.bind(null, location)`, `let _m = location; _m = null`
 *                                        -> FAIL 3b (a form it cannot follow)
 *   - `location.pathname === '/x'`        -> green (no switch is there)
 *   What it does not follow: `document` itself (document.URL and
 *   .documentURI are read where they stand).
 *
 * Run from the repository's root: node tools/guards/switch-reader.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SWITCHES } from './lib/switches.mjs';
import { blankComments, pageFiles, pageForm, READER_FILE, READER_IMPORT, ROOT } from './lib/switchScan.mjs';
import { filesOf } from './lib/filesOf.mjs';
import { babel } from './lib/renderTables.mjs';   /* v2.3.6520: @babel, the root's or server/'s */

/* ═══ v2.3.6520: THE PAGE'S ADDRESS, READ OFF THE SYNTAX TREE (card WL) ═══
   Check 3 counted the text `location.search`; the shape review (2026-11-23,
   plant 6) read `?farmfast` through `new URL(window.location.href)
   .searchParams.get('farmfast')` and the count stayed green.  Now each
   SOURCE of the address is counted, off the tree (the plan's rule 2):
   `search` or `href` of a `location` (any receiver: `window.`,
   `document.`, `self.`), `document.URL`, `document.documentURI`,
   `String(location)`, `location.toString()`, `location` in a template or
   added to text.  A source is no read when it is: a place to go
   (`location.href = ...`); a base for a relative URL (`new URL(u,
   location.href)`); or the start of a URL that only WRITES its params
   (`set`, `delete`, `append`, `sort`) and is otherwise handed whole or
   read for its href, pathname, search, hash or text: the page building its
   own new address (history.replaceState), no switch read.  So
   `new URL(location.href).searchParams.get(..)` and
   `new URLSearchParams(location.search)` are each one read.
   What it cannot see: the address handed whole to another module and read
   there (`readIt(location)`): no rule over one file can. */
const PARAM_WRITES = new Set(['set', 'delete', 'append', 'sort']);
const ADDRESS_TEXT = new Set(['href', 'search', 'URL', 'documentURI']);

const keyOf = (m) => (!m.computed && m.property.type === 'Identifier' ? m.property.name
  : (m.property.type === 'StringLiteral' ? m.property.value : null));
/* `location`, `window.location`, `document.location`, `self.location`, `globalThis.location` */
const isLocation = (n) => !!n && ((n.type === 'Identifier' && n.name === 'location')
  || (n.type === 'MemberExpression' && keyOf(n) === 'location'));
/* the address as text: a location's href or search, document.URL, document.documentURI */
const isAddressText = (n) => !!n && n.type === 'MemberExpression' && ADDRESS_TEXT.has(keyOf(n))
  && ((isLocation(n.object) && ['href', 'search'].includes(keyOf(n)))
    || (n.object.type === 'Identifier' && n.object.name === 'document' && ['URL', 'documentURI'].includes(keyOf(n))));
const isNew = (n, names) => !!n && n.type === 'NewExpression' && n.callee.type === 'Identifier' && names.includes(n.callee.name);

/* a URL made from the address whose params are only WRITTEN (`set`, `delete`, `append`, `sort`) and
   which is otherwise only handed whole (history.replaceState(.., u)) or read for its href, pathname,
   hash or text: the page building its own new address, no switch read */
function onlyRewrites(newPath) {
  const uses = [];
  const p = newPath.parent;
  if (p.type === 'VariableDeclarator' && p.id.type === 'Identifier' && p.init === newPath.node) {
    const b = newPath.parentPath.scope.getBinding(p.id.name);
    if (!b || (b.constantViolations && b.constantViolations.length)) return false;
    for (const r of b.referencePaths) uses.push(r);
  } else uses.push(newPath);
  return uses.every((r) => {
    const q = r.parent;
    if (q.type === 'MemberExpression' && q.object === r.node) {
      const k = keyOf(q);
      if (['href', 'pathname', 'search', 'hash', 'toString'].includes(k)) return true;   /* the new address, whole or in parts */
      if (k !== 'searchParams') return false;
      const q2 = r.parentPath.parent;
      return q2.type === 'MemberExpression' && q2.object === q && PARAM_WRITES.has(keyOf(q2));
    }
    if (q.type === 'CallExpression' && q.arguments.includes(r.node)) return true;
    if (q.type === 'BinaryExpression' && q.operator === '+') return true;
    if (q.type === 'TemplateLiteral') return true;
    return false;
  });
}

const _cache = new Map();
/* v2.3.6520 (sitting 58's hold: `new URL(window.location).searchParams.get(..)`,
   `const _loc = window.location; _loc.search...` and a destructured `search`
   stayed green): the guard no longer knows spellings of a read, it FOLLOWS
   the location.  Every place the page's location object turns up (the global
   `location`, any `X.location` or `X['location']`, a `location` taken out of
   anything by destructuring) is followed through the tree: a name bound to
   it (`const _loc = location`) is followed to each of its uses, a
   destructuring is read key by key, and each use is judged:
     - a READ (counted): its `search` or `href` (read or destructured), the
       object made text (`String(..)`, `.toString()`, a template, `+`), or
       handed to `new URL(..)` / `new URLSearchParams(..)` (unless that URL
       only rewrites the address: onlyRewrites);
     - NO READ: a place to go (`location.href = ..`, `location = ..`,
       `.assign(..)`, `.replace(..)`, `.reload()`), a part that holds no
       switch (`pathname`, `hash`, `host`, `hostname`, `origin`, `port`,
       `protocol`), `typeof location`, a base for a relative URL;
     - a FORM IT CANNOT FOLLOW: anything else (handed to a function, kept in
       an object or array, a name assigned again, a computed key, a rest
       element, `.bind`/`.call`...).  Those are counted by file in
       UNFOLLOWED (check 3b) and the list only falls: an unknown spelling is
       red, never green.
   document.URL and document.documentURI are read as text where they stand
   (`document` itself is everywhere and is not followed: said in the PR). */
const NO_SWITCH_PARTS = new Set(['pathname', 'hash', 'host', 'hostname', 'origin', 'port', 'protocol', 'ancestorOrigins']);
const GOES = new Set(['assign', 'replace', 'reload']);
const isMember = (n) => !!n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression');
const propKey = (p) => (p.computed ? (p.key.type === 'StringLiteral' ? p.key.value : null)
  : (p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'StringLiteral' ? p.key.value : null)));
/* the location only TESTED (is there one): the left of `&&`, or the test of a `?:` or an `if`
   (through `&&` and `||`), never its value handed on */
const onlyTested = (path) => {
  let q = path;
  if (q.parent.type === 'LogicalExpression' && q.parent.operator === '&&' && q.parent.left === q.node) return true;
  while (q.parent.type === 'LogicalExpression') q = q.parentPath;
  const p = q.parent;
  return ((p.type === 'ConditionalExpression' || p.type === 'IfStatement') && p.test === q.node)
    || (p.type === 'UnaryExpression' && p.operator === '!');
};
/* the reads of the page's address in one file's source: { reads: [{ line, how }],
   unfollowed: [{ line, how }] }, or null when no @babel loads */
function addressScan(src, file) {
  if (!/location|document\.URL|documentURI/.test(src)) return { reads: [], unfollowed: [] };
  let B;
  try { B = babel(); } catch { return null; }
  const key = file + '\0' + src.length;
  if (_cache.has(key)) return _cache.get(key);
  const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const reads = [], unfollowed = [];
  const add = (n, how) => reads.push({ line: n.loc.start.line, how });
  const cannot = (n, how) => unfollowed.push({ line: n.loc.start.line, how });
  const seen = new Set();
  /* one source of the address at `path` (its text, or the object handed to a URL): a read unless it
     is a place to go, a base, or the start of a URL that only rewrites the address */
  const judge = (path, how) => {
    const n = path.node, p = path.parent;
    if (p.type === 'AssignmentExpression' && p.left === n) return;                       /* location.href = ... : a place to go */
    if (isNew(p, ['URL']) && p.arguments[1] === n) return;                                /* new URL(u, location.href): a base */
    if (isNew(p, ['URL', 'URLSearchParams']) && p.arguments[0] === n && onlyRewrites(path.parentPath)) return;
    add(n, how);
  };
  /* a name bound to the location: follow each use; a name assigned again is not followed */
  const followName = (scope, name, at) => {
    const b = scope.getBinding(name);
    if (!b) { cannot(at, `the location kept in ${name} (no binding)`); return; }
    if (b.constantViolations && b.constantViolations.length) { cannot(at, `the location kept in ${name}, assigned again`); return; }
    for (const r of b.referencePaths) follow(r);
  };
  /* a destructuring of the location, key by key */
  const pattern = (path, pat) => {
    for (const p of pat.properties) {
      if (p.type === 'RestElement') { cannot(p, 'the location destructured into a rest'); continue; }
      const k = propKey(p);
      if (k === 'search' || k === 'href') add(p, `the address (${k}, destructured)`);
      else if (k === null) cannot(p, 'the location destructured by a computed key');
      else if (!NO_SWITCH_PARTS.has(k) && !GOES.has(k)) cannot(p, `the location's ${k}, destructured`);
    }
  };
  /* `path` evaluates to the page's location object: judge its use */
  const follow = (path) => {
    const n = path.node;
    if (seen.has(n)) return;
    seen.add(n);
    const p = path.parent;
    if (isMember(p) && p.object === n) {
      const k = keyOf(p);
      if (k === 'search' || k === 'href') { judge(path.parentPath, k === 'search' ? 'location.search' : 'the address (href)'); return; }
      if (k === 'toString' && path.parentPath.parent.type === 'CallExpression') { judge(path.parentPath.parentPath, 'the address (as text)'); return; }
      if (k !== null && (NO_SWITCH_PARTS.has(k) || GOES.has(k))) return;
      cannot(p, k === null ? 'the location by a computed key' : `the location's ${k}`);
      return;
    }
    if (p.type === 'VariableDeclarator' && p.init === n) {
      if (p.id.type === 'Identifier') { followName(path.parentPath.scope, p.id.name, n); return; }
      if (p.id.type === 'ObjectPattern') { pattern(path.parentPath, p.id); return; }
      cannot(n, 'the location bound to a pattern');
      return;
    }
    if (p.type === 'AssignmentExpression' && p.left === n) return;                      /* location = '...': a place to go */
    if (p.type === 'AssignmentExpression' && p.right === n && p.left.type === 'ObjectPattern') { pattern(path.parentPath, p.left); return; }
    if (p.type === 'UnaryExpression' && (p.operator === 'typeof' || p.operator === '!')) return;
    if (onlyTested(path)) return;                                                          /* `window.location ? .. : ..`: is there one */
    if (isNew(p, ['URL', 'URLSearchParams']) && p.arguments.includes(n)) { judge(path, 'the address (the location to a URL)'); return; }
    if (p.type === 'CallExpression' && p.callee.type === 'Identifier' && p.callee.name === 'String' && p.arguments[0] === n) { judge(path.parentPath, 'the address (as text)'); return; }
    if (p.type === 'TemplateLiteral') { add(n, 'the address (in a template)'); return; }
    if (p.type === 'BinaryExpression' && p.operator === '+') { add(p, 'the address (+ text)'); return; }
    cannot(n, `the location in a ${p.type}`);
  };
  B.traverse(ast, {
    Identifier(path) {
      /* the global `location` (a name bound in the file is not the page's) */
      if (path.node.name !== 'location' || !path.isReferencedIdentifier() || path.scope.hasBinding('location')) return;
      follow(path);
    },
    MemberExpression(path) { if (keyOf(path.node) === 'location') follow(path); },
    OptionalMemberExpression(path) { if (keyOf(path.node) === 'location') follow(path); },
    ObjectPattern(path) {
      /* `const { location } = window` (and `{ location: _l }`): the name it binds */
      for (const p of path.node.properties) {
        if (p.type !== 'ObjectProperty' || propKey(p) !== 'location') continue;
        if (p.value.type === 'Identifier') followName(path.scope, p.value.name, p);
        else if (p.value.type === 'ObjectPattern') pattern(path, p.value);
        else cannot(p, 'the location destructured into a pattern');
      }
    },
  });
  /* document.URL, document.documentURI: the address as text where it stands */
  B.traverse(ast, {
    MemberExpression(path) {
      const n = path.node;
      if (n.object.type === 'Identifier' && n.object.name === 'document' && ['URL', 'documentURI'].includes(keyOf(n))) judge(path, 'the address (' + keyOf(n) + ')');
    },
  });
  const out = { reads, unfollowed };
  _cache.set(key, out);
  return out;
}
   /* v2.3.5742: a big file found by its system (tests-by-system 2); v2.3.5343: and the two renderers (inSystem below) */

/* the outside reads: only falls */
/* v2.3.6520 (card WL): 17 -> 18, the same code counted by the tree, which
   reads all the address and not the text `location.search` alone: the one
   it newly sees was there all along (BroTown.jsx's tidy of `?create`,
   `?login`, `?noresume`, `_u2.searchParams.has(k)` on a URL made from
   `window.location.href`).  No room: the count is the line. */
const OUTSIDE_LINE = 18;   /* its first count, v2.3.5306: 228 with sitting 17's `?slimewalk` (card P's slimeSprites.js, P still running: not moved), 221 after the first seven reads moved; 212 after v2.3.5309's nine; 201 after v2.3.5310's eleven; 189 after v2.3.5232's twelve (card O PR 12: the lanes' off-ramps); 172 with v2.3.5311's pageAddress() sites (seventeen) ; 161 after v2.3.5313's eleven ; 155 after v2.3.5314's six ; 144 after v2.3.5315's eleven ; 116 after v2.3.5316's twenty-eight ; 71 after v2.3.5317's forty-five (render, on pageAddress()) ; 65 after v2.3.5740's six (card T2: the game's) ; 59 after v2.3.5741's six (card T2: the screens, the townsfolk's pictures) ; 56 after v2.3.5742's three (card T2: the connection's) ; 34 after v2.3.5343's twenty-two (card M chain B: the two renderers; the gatekeeper's sitting 42) ; 33 after v2.3.5743's one (card T2: the kill's XP fly, on pageAddress(); census part 1 closed) ; 17 after v2.3.5342's sixteen (card M chain A: BroTown.jsx; the gatekeeper's sitting 46, v2.3.6260) */

/* v2.3.6520 (sitting 58): the forms of the location the tree cannot follow, by file (check 3b;
   it only falls).  None today: every use of the location in src/ is a read, a place to go, a part
   that holds no switch, or a test. */
const UNFOLLOWED = Object.freeze(Object.assign(Object.create(null), {}));

/* v2.3.5343: a moved read in a big file (the four lines' own: BroTown.jsx,
   the two renderers) names its file through its system, never its path
   (tests-by-system, step 5.2b): a name the map no longer gives is undefined,
   and check 1 fails loudly (its file asks nothing) */
const inSystem = (system, name) => filesOf(system).find((f) => f.endsWith('/' + name));

/* ── the reads moved into the reader: each old test word for word, as a
   function of the address (S) ── */
const MOVED = Object.freeze([
  { name: 'starcue', call: 'sw', file: 'src/ui/starCue.js', old: (S) => new URLSearchParams(S).get('starcue') === '0' },
  { name: 'guidearrow', call: 'sw', file: 'src/ui/guideArrow.js', old: (S) => new URLSearchParams(S).get('guidearrow') === '0' },
  { name: 'guidearrow', call: 'sw', file: 'src/ui/deskTeach.js', old: (S) => new URLSearchParams(S).get('guidearrow') === '0' },
  { name: 'nmlask', call: 'sw', file: 'src/game/nmlAsk.js', old: (S) => /[?&]nmlask=0(?:&|$)/.test(S || '') },
  /* v2.3.6560 (card LS): the meaning changed on purpose (the owner, 2026-11-24: no popup at login): the value is read and
     src/game/loginSpinWheel.js spinOffersItself decides (`=1` offers once; nothing, `=0` or any other word never) */
  { name: 'loginspin', call: 'swValue', file: 'src/ui/mobile/LoginSpinWindow.jsx', old: (S) => new URLSearchParams(S).get('loginspin') },
  { name: 'nomapdetail', call: 'swHas', file: 'src/ui/worldMapDetail.js', old: (S) => /[?&]nomapdetail(?:[=&]|$)/.test(S) },
  { name: 'tapthrough', call: 'swHas', file: 'src/ui/swallowTapClick.js', old: (S) => /[?&]tapthrough(=|&|$)/.test(S || '') },
  /* v2.3.5309: quests, skills, economy, townsfolk, audio (the systems with the fewest reads, their files held by no running card) */
  { name: 'questpath', call: 'sw', file: 'src/game/questTrailStyle.js', old: (S) => new URLSearchParams(S).has('questpath') },
  { name: 'treefade', call: 'sw', file: 'src/game/tierTrees.js', old: (S) => /(^|[?&])treefade=0(&|$)/.test(S || '') },
  { name: 'droplines', call: 'sw', file: 'src/game/dropLines.js', old: (S) => /[?&]droplines=0\b/.test(S || '') },
  { name: 'equipredraw', call: 'sw', file: 'src/game/gearWornSync.js', old: (S) => /[?&]equipredraw=0\b/.test(S || '') },
  { name: 'townchat', call: 'sw', file: 'src/game/townChatter.js', old: (S) => /[?&]townchat=0(?:&|$)/.test(S) },
  { name: 'folkwalk', call: 'sw', file: 'src/game/townsfolkDay.js', old: (S) => /(^|[?&])folkwalk=0(&|$)/.test(S || '') },
  { name: 'nobeds', call: 'sw', file: 'src/game/ambientBeds.js', old: (S) => /[?&]nobeds(?:[&=]|$)/.test(S) },
  { name: 'noforge', call: 'sw', file: 'src/game/townAmbience.js', old: (S) => /[?&]noforge(?:[&=]|$)/.test(S) },
  { name: 'sounds', call: 'swHas', file: 'src/game/soundStudio.js', old: (S) => /[?&]sounds(=|&|$)/.test(S) },
  /* v2.3.5310: data, preload, and world's and ui's plain switches (files held by no running card) */
  { name: 'burstnumbers', call: 'sw', file: 'src/data/levelUpBurst.js', old: (S) => /[?&]burstnumbers=0(&|$)/.test(S || '') },
  { name: 'codelazy', call: 'sw', file: 'src/ui/lazyPanel.js', old: (S) => /(^|[?&])codelazy=(0|off|false)(&|$)/.test(S || '') },
  { name: 'bodyhere', call: 'sw', file: 'src/game/bodyPlace.js', old: (S) => new URLSearchParams(S).get('bodyhere') === '0' },
  { name: 'noobjects', call: 'swHas', file: 'src/game/wheelTrial.js', old: (S) => /(^|[?&])noobjects(=|&|$)/.test(S || '') },
  { name: 'nolife', call: 'swHas', file: 'src/game/wheelTrial.js', old: (S) => /(^|[?&])nolife(=|&|$)/.test(S || '') },
  { name: 'noswim', call: 'sw', file: 'src/game/wheelTrial.js', old: (S) => /(^|[?&])noswim(=|&|$)/.test(S || '') },
  { name: 'groundwait', call: 'sw', file: 'src/game/wheelTrial.js', old: (S) => /[?&]groundwait=0(&|$)/.test(S || '') },
  { name: 'heaplean', call: 'sw', file: 'src/game/wheelTrial.js', old: (S) => /[?&]heaplean=(0|off|false)(&|$)/.test(S || '') },
  { name: 'folkbake', call: 'sw', file: 'src/game/worldTrial.js', old: (S) => /(^|[?&])folkbake=0(&|$)/.test(S || '') },
  { name: 'playvwlive', call: 'sw', file: 'src/ui/mobile/playViewport.js', old: (S) => /(^|[?&])playvwlive=1(&|$)/.test(S || '') },
  { name: 'dev', call: 'sw', file: 'src/ui/GameApp.jsx', old: (S) => /[?&]dev=1\b/.test(S) },
  /* v2.3.5313: preload, art (cards A, G, H, O, P done: their files free) */
  { name: 'warmonce', call: 'sw', file: 'src/rendering/warmOnce.js', old: (S) => /[?&]warmonce=0\b/.test(S || '') },
  { name: 'banners', call: 'sw', file: 'src/rendering/zoneBannerPreload.js', old: (S) => /(^|[?&])banners=all(&|$)/.test(S || '') },
  { name: 'sharp', call: 'sw', file: 'src/rendering/sharpPixels.js', old: (S) => /[?&]sharp=0\b/.test(S) },
  { name: 'figround', call: 'sw', file: 'src/rendering/sharpPixels.js', old: (S) => /[?&]figround=1\b/.test(S) },
  /* v2.3.5314: debug (card A done) */
  { name: 'dev', call: 'sw', file: 'src/debug/crashTrap.js', old: (S) => /[?&]dev=1\b/.test(S) },
  { name: 'report', call: 'sw', file: 'src/debug/report.js', old: (S) => /(^|[?&])report=0(&|$)/.test(S || '') },
  /* v2.3.5315: memory (cards G, H done) */
  { name: 'canvascheck', call: 'sw', file: 'src/rendering/canvasWitness.js', old: (S) => /[?&]canvascheck=0\b/.test(S || '') },
  { name: 'gfxlean', call: 'sw', file: 'src/rendering/gfxLean.js', old: (S) => /[?&]gfxlean=(0|off|false)(&|$)/.test(S || '') },
  { name: 'gpucopies', call: 'swHas', file: 'src/rendering/gpuOnly.js', old: (S) => /[?&]gpucopies\b/.test(S || '') },
  { name: 'heaptrim', call: 'sw', file: 'src/rendering/heapTrim.js', old: (S) => /[?&]heaptrim=(0|off|false)(&|$)/.test(S || '') },
  { name: 'held', call: 'sw', file: 'src/rendering/heldNumbers.js', old: (S) => /[?&]held=0\b/.test(S || '') },
  { name: 'treenumbers', call: 'sw', file: 'src/rendering/paletteLoad.js', old: (S) => /[?&]treenumbers=0(&|$)/.test(S || '') },
  { name: 'nopalette', call: 'swHas', file: 'src/rendering/paletteTex.js', old: (S) => /(^|[?&])nopalette(=|&|$)/.test(S || '') },
  { name: 'loudclear', call: 'swHas', file: 'src/rendering/quietClear.js', old: (S) => /[?&]loudclear(=|&|$)/.test(S || '') },
  { name: 'textkeep', call: 'swHas', file: 'src/rendering/textRelease.js', old: (S) => /[?&]textkeep(=|&|$)/.test(S || '') },
  { name: 'poolkeep', call: 'swHas', file: 'src/rendering/texturePoolTrim.js', old: (S) => /[?&]poolkeep(=|&|$)/.test(S || '') },
  /* v2.3.5316: look (cards H, P done); a look whose row needs ?lookpalette keeps its old test on pageAddress() */
  { name: 'garmentspecks', call: 'sw', file: 'src/rendering/bodyRecolor.js', old: (S) => /[?&]garmentspecks=0(&|$)/.test(S || '') },
  { name: 'pickwood', call: 'sw', file: 'src/rendering/bodyRecolor.js', old: (S) => /[?&]pickwood=0(&|$)/.test(S || '') },
  { name: 'toolsolid', call: 'sw', file: 'src/rendering/bodyRecolor.js', old: (S) => /[?&]toolsolid=(0|off|false)(&|$)/.test(S || '') },
  { name: 'bakeread', call: 'sw', file: 'src/rendering/bodyRecolor.js', old: (S) => /(^|[?&])bakeread=0(&|$)/.test(S || '') },
  { name: 'portraitgentle', call: 'sw', file: 'src/rendering/characterPortrait.js', old: (S) => /(^|[?&])portraitgentle=(0|off|false)(&|$)/.test(S || '') },
  { name: 'gearretry', call: 'sw', file: 'src/rendering/gearSheets.js', old: (S) => /[?&](gearretry|retrylooks)=0\b/.test(S || '') },
  { name: 'gearpackgentle', call: 'sw', file: 'src/rendering/gearSheets.js', old: (S) => /(^|[?&])gearpackgentle=(0|off|false)(&|$)/.test(S || '') },
  { name: 'shirtworker', call: 'sw', file: 'src/rendering/gearSheets.js', old: (S) => /(^|[?&])shirtworker=(0|off|false)(&|$)/.test(S || '') },
  { name: 'sheetfetch', call: 'sw', file: 'src/rendering/lookArmour.js', old: (S) => /(^|[?&])sheetfetch=0(&|$)/.test(S || '') },
  { name: 'retrylooks', call: 'sw', file: 'src/rendering/lookPalette.js', old: (S) => /[?&]retrylooks=0\b/.test(S || '') },
  { name: 'traitretry', call: 'sw', file: 'src/rendering/traits/speciesArt.js', old: (S) => /[?&](traitretry|retrylooks)=0\b/.test(S || '') },
  { name: 'alphaclip', call: 'swHas', file: 'src/rendering/hairClip.js', old: (S) => /[?&]alphaclip\b/.test(S || '') },
  { name: 'headframes', call: 'swHas', file: 'src/rendering/headFrames.js', old: (S) => /[?&]headframes(=|&|$)/.test(S || '') },
  /* v2.3.5232 (card O PR 12): the lanes' off-ramps (the values -- ?lane, ?govern, ?crowd, ?onebatch, ?lookpalette, ?pixbudget, ?res, ?zoom -- read by swValue, their old patterns held to the value) */
  { name: 'ladderrate', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderrate=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'ladderpix', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderpix=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'ladderpass', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderpass=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'laddercrowd', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])laddercrowd=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'pace', call: 'sw', file: 'src/game/framePacer.js', old: (S) => /(^|[?&])pace=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'nowaves', call: 'sw', file: 'src/rendering/wheelWater.js', old: (S) => /(^|[?&])nowaves(=|&|$)/.test(S || '') },
  { name: 'shadowpass', call: 'sw', file: 'src/rendering/lightfx/shadows.js', old: (S) => /[?&]shadowpass\b/.test(S || '') },
  { name: 'sheenpass', call: 'sw', file: 'src/rendering/lightfx/sheenBatch.js', old: (S) => /[?&]sheenpass(=|&|$)/.test(S || '') },
  { name: 'stripgentle', call: 'sw', file: 'src/rendering/zoneTextures.js', old: (S) => /(^|[?&])stripgentle=(0|off|false)(&|$)/.test(S || '') },
  /* v2.3.5740 (card T2 PR 1): the game's six (the rest on pageAddress(): ?jumpms, ?nmlaskms, ?speedms, ride's rideCoastOn, resetOn's resetSwitches) */
  { name: 'dbltap', call: 'sw', file: 'src/game/desktopControls.js', old: (S) => /[?&]dbltap=0(?:&|$)/.test(S) },
  /* v2.3.5741 (card T2 PR 2): the screens and the townsfolk's pictures (?tradeside, a value, on pageAddress()) */
  { name: 'dev', call: 'sw', file: 'src/ui/mobile/dash/SettingsPanel.jsx', old: (S) => /[?&]dev=1\b/.test(S) },
  { name: 'p3colour', call: 'sw', file: 'src/ui/mobile/sheet/HeroExpanded.jsx', old: (S) => /[?&]p3colour=0\b/.test(S) },
  { name: 'p3cols', call: 'sw', file: 'src/ui/mobile/sheet/HeroExpanded.jsx', old: (S) => /[?&]p3cols=1\b/.test(S) },
  { name: 'npcheads', call: 'sw', file: 'src/rendering/npcSprites.js', old: (S) => /[?&]npcheads=0(&|$)/.test(S || '') },
  { name: 'coinflip', call: 'sw', file: 'src/rendering/npcSprites.js', old: (S) => /[?&]coinflip=0(&|$)/.test(S || '') },
  /* v2.3.5742 (card T2 PR 3): the connection's three (?diet and ?room, values, on pageAddress()) */
  /* the connection's file is a big file: found by its system (tests-by-system 2: a suite reads code by system, never a big file's path) */
  { name: 'wheelwhole', call: 'sw', file: filesOf('wire').find((f) => f.endsWith('/wsClient.js')), old: (S) => /[?&]wheelwhole(?:[=&]|$)/.test(S) },
  /* v2.3.5342 (card M PR 3, chain A): BroTown.jsx's single-name switches, a row a read in the file's order (`?guest`
     five reads, `?create` two), each old test word for word; its three rules handed the whole address
     (frameSmoothOn, framePaceOn, shieldFollowsPointerAlways) on pageAddress() */
  { name: 'owedrebuild', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]owedrebuild=0\b/.test(S || '') },
  { name: 'npcprox', call: 'swHas', file: inSystem('ui', 'BroTown.jsx'), old: (S) => new URLSearchParams(S).has('npcprox') },
  { name: 'guest', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]guest=1\b/.test(S) },
  { name: 'guest', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]guest=1\b/.test(S) },
  { name: 'create', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]create=1\b/.test(S) },
  { name: 'wdgeterror', call: 'swHas', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]wdgeterror\b/.test(S || '') },
  { name: 'guest', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]guest=1\b/.test(S) },
  { name: 'create', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]create=1\b/.test(S) },
  { name: 'login', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]login=1\b/.test(S) },
  { name: 'guest', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]guest=1\b/.test(S) },
  { name: 'guest', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]guest=1\b/.test(S) },
  { name: 'debug', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => new URLSearchParams(S).get('debug') === '1' },
  { name: 'noresume', call: 'sw', file: inSystem('ui', 'BroTown.jsx'), old: (S) => /[?&]noresume=1\b/.test(S) },
  /* v2.3.5343 (card M PR 4, chain B): the two renderers' single-name switches; their six other reads (a need, a value, two names) on pageAddress() with the old test in place.  `!(... !== '0')` is the old ON test turned to the read's OFF, word for word */
  { name: 'standinlegs', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => /[?&]standinlegs=0(&|$)/.test(S || '') },
  { name: 'firelegless', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => /[?&]firelegless=0(&|$)/.test(S || '') },
  { name: 'firelog', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => /[?&]firelog=0(&|$)/.test(S || '') },
  { name: 'firelit', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => /[?&]firelit=0(&|$)/.test(S || '') },
  { name: 'gripguess', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => /[?&]gripguess=0\b/.test(S || '') },
  { name: 'popupworld', call: 'swHas', file: 'src/rendering/leaves/effects-ui.js' /* v2.3.6220: moved verbatim with popupZoomK (card FX) */, old: (S) => /[?&]popupworld\b/.test(S || '') },
  { name: 'dmgwords', call: 'sw', file: 'src/rendering/leaves/effects-combat.js' /* v2.3.6220: moved verbatim with _dmgFontNames (card FX) */, old: (S) => /[?&]dmgwords=0\b/.test(S || '') },
  { name: 'lootbeam', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => !(new URLSearchParams(S).get('lootbeam') !== '0') },
  { name: 'burnfire', call: 'sw', file: inSystem('render', 'effectsRenderer.js'), old: (S) => !(new URLSearchParams(S).get('burnfire') !== '0') },
  { name: 'lootpop', call: 'sw', file: 'src/rendering/leaves/effects-economy.js' /* v2.3.6220: moved verbatim with landAgeOf (card FX) */, old: (S) => !(new URLSearchParams(S).get('lootpop') !== '0') },
  { name: 'headframes', call: 'swHas', file: inSystem('render', 'entityRenderer.js'), old: (S) => /[?&]headframes(=|&|$)/.test(S || '') },
  { name: 'nopeercull', call: 'swHas', file: inSystem('render', 'entityRenderer.js'), old: (S) => /[?&]nopeercull\b/.test(S || '') },
  { name: 'retrylooks', call: 'sw', file: inSystem('render', 'entityRenderer.js'), old: (S) => /[?&]retrylooks=0\b/.test(S || '') },
  { name: 'flipbake', call: 'sw', file: inSystem('render', 'entityRenderer.js'), old: (S) => /[?&]flipbake=0\b/.test(S || '') },
  { name: 'fishgrip', call: 'sw', file: inSystem('render', 'entityRenderer.js'), old: (S) => new URLSearchParams(S).get('fishgrip') === '1' },
  { name: 'fishgriptrousers', call: 'sw', file: inSystem('render', 'entityRenderer.js'), old: (S) => new URLSearchParams(S).get('fishgriptrousers') === '1' },
  /* v2.3.5743 (card T2 PR 4): gameEvents' killXpOn handed pageAddress() (kill-xp 5a tests it on strings): no sw read */
]);

/* v2.3.5306 (the gatekeeper's low, sitting 18): and each switch its row
   needs, thrown alone and beside it -- the old test never saw a need, so a
   moved read whose row has one is held to answer as it did (a move that
   would add a need's meaning is a change of meaning, and fails) */
const neededWords = (n) => {
  const r = SWITCHES.find((x) => x.name.replace(/^\?/, '') === n && x.side !== 'worker');
  return r ? r.needs.map((m) => m.replace(/^\?/, '')).filter((m) => SWITCHES.some((x) => x.side !== 'worker' && x.name.replace(/^\?/, '') === m))
    .map((m) => { const f = pageForm(SWITCHES.find((x) => x.name.replace(/^\?/, '') === m)); return f === '*' ? null : `${m}${f === '' ? '' : '=' + f.split('|')[0]}`; }).filter(Boolean) : [];
};
const ADDRESSES = (n) => ['', `?${n}`, `?${n}=`, `?${n}=0`, `?${n}=1`, `?${n}=off`, `?${n}=false`, `?${n}=7`,
  `?x${n}=0`, `?${n}x=0`, `?a=1&${n}=0`, `?${n}=0&b=2`, `?a=1&${n}`,
  ...neededWords(n).flatMap((w) => [`?${w}`, `?${n}=1&${w}`])];

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const { readerFor } = await import(pathToFileURL(join(ROOT, READER_FILE)).href);
const files = pageFiles();
const src = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]));

/* 1. each moved read answers as it did */
{
  const differ = [];
  const missing = [];
  for (const m of MOVED) {
    for (const S of ADDRESSES(m.name)) {
      const was = m.old(S);
      const now = readerFor(S)[m.call](m.name);
      if (was !== now) differ.push(`${m.name} (${m.file}): ${S || '(none)'} old ${was}, reader ${now}`);
    }
    const code = src.has(m.file) ? blankComments(src.get(m.file)) : '';
    if (!new RegExp(`(?<![\\w$.])${m.call}\\(\\s*['"]\\??${m.name}['"]`).test(code)) missing.push(`${m.file}: no ${m.call}('${m.name}')`);
  }
  check(`1: every moved read answers each fixed address as its old test did (${MOVED.length} reads, ${ADDRESSES('x').length} addresses each)`, differ.length === 0, differ);
  check('1: ...and its file asks the reader for it', missing.length === 0, missing);
}

/* 2. every ask names a page row, with a form for sw */
{
  const forms = new Map(SWITCHES.filter((r) => r.side !== 'worker').map((r) => [r.name.replace(/^\?/, ''), pageForm(r)]));
  const bad = [];
  let asks = 0;
  for (const [f, s] of src) {
    if (f === READER_FILE) continue;
    const code = blankComments(s);
    for (const m of code.matchAll(/(?<![\w$.])(sw|swHas|swValue)\(\s*(['"])\??([A-Za-z][\w-]*)\2/g)) {
      if (!READER_IMPORT.test(code)) continue;
      asks++;
      const [, fn, , n] = m;
      if (!forms.has(n)) bad.push(`${f}: ${fn}('${n}') names no page row`);
      else if (fn === 'sw' && forms.get(n) === '*') bad.push(`${f}: sw('${n}'), but ?${n} is a value (swValue reads it)`);
    }
  }
  check(`2: every ask of the reader names a page row, sw only one with a form (${asks} asks)`, bad.length === 0, bad);
}

/* 3. the outside reads: only fall.
   v2.3.6520 (card WL; the shape review's plant 6): the count was the text
   `location.search`, and `new URL(window.location.href).searchParams.get(
   'farmfast')` passed it.  Now the reads are read off the syntax tree (the
   plan's rule 2; addressScan, at the top of this file): each source of
   the address (`location.search`, `location.href`, `document.URL`, ...,
   through any receiver) that is not a place to go, a base for a relative
   URL, or the start of a URL that only rewrites the address. */
{
  let n = 0;
  const where = [];
  const unf = new Map();
  for (const [f, s] of src) {
    if (f === READER_FILE) continue;
    const scan = addressScan(s, f);
    if (scan === null) { check('3: @babel loads from the root or server/ (npm install)', false); break; }
    const { reads } = scan;
    if (reads.length) { n += reads.length; where.push(`${f}: ${reads.map((r) => r.line + ' ' + r.how).join(', ')}`); }
    if (scan.unfollowed.length) unf.set(f, scan.unfollowed);
  }
  check(`3: reads of the page's address outside the reader, read off the tree: ${n}, the line ${OUTSIDE_LINE} (it only falls: a read moves into src/game/switches.js)`, n <= OUTSIDE_LINE, where.slice(-12));
  if (n < OUTSIDE_LINE) console.log(`     (room: ${n} under the line ${OUTSIDE_LINE}; the gatekeeper may lower it)`);
  if (process.argv.includes('--list')) for (const w of where) console.log('     ' + w);
  /* 3b. v2.3.6520 (sitting 58): the forms of the location it cannot follow, by file; the list
     only falls (a new form is red until it is read as a read or mended) */
  const over = [];
  for (const [f, u] of unf) if (u.length > (UNFOLLOWED[f] || 0)) over.push(`${f}: ${u.map((r) => r.line + ' ' + r.how).join(', ')}`);
  const nUnf = [...unf.values()].reduce((a, u) => a + u.length, 0);
  check(`3b: forms of the page's location the tree cannot follow: ${nUnf}, the list ${Object.keys(UNFOLLOWED).length} file(s) (a new one fails: it only falls)`, over.length === 0, over);
  if (process.argv.includes('--list')) for (const [f, u] of unf) console.log('     unfollowed ' + f + ': ' + u.map((r) => r.line + ' ' + r.how).join(', '));
}

/* 5. v2.3.5311: pageAddress() is the address itself (the sites that hand the
   whole address to a rule call it: the planning session's answer), and ''
   with no page.  An address it changed would change every such rule. */
{
  const { pageAddress } = await import(pathToFileURL(join(ROOT, READER_FILE)).href);
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const bad = [];
  for (const S of ['', '?a=1&b', '?tod=dusk&TOD=x', '?x=%20y&&', '?halloween=on&tapms=40']) {
    Object.defineProperty(globalThis, 'location', { value: { search: S }, configurable: true, writable: true });
    if (pageAddress() !== S) bad.push(`${S}: ${pageAddress()}`);
  }
  delete globalThis.location;
  if (pageAddress() !== '') bad.push(`no page: ${pageAddress()}`);
  if (had) Object.defineProperty(globalThis, 'location', had);
  check('5: pageAddress() is the address as written, and \'\' with no page', bad.length === 0, bad);
}

/* 4. the page's reader follows its address when the page changes it
   (v2.3.5306, the gatekeeper's medium: history.replaceState drops `create`,
   `login`, `noresume`; tests flip a switch mid-page) */
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const mod = await import(pathToFileURL(join(ROOT, READER_FILE)).href + '?follow');
  const seen = [];
  try {
    Object.defineProperty(globalThis, 'location', { value: { search: '?starcue=0' }, configurable: true, writable: true });
    seen.push(mod.sw('starcue'));
    globalThis.location.search = '';
    seen.push(mod.sw('starcue'));
    globalThis.location.search = '?a=1&starcue=0';
    seen.push(mod.sw('starcue'));
  } finally {
    if (saved) Object.defineProperty(globalThis, 'location', saved); else delete globalThis.location;
  }
  check('4: the page\'s reader answers for the address as it is now (a page that changes its own address is read again)', seen.join() === 'true,false,true', seen);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
