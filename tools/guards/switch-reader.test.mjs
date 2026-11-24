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
 *   3. THE OUTSIDE READS (a census, only falls; the gatekeeper's): every
 *      appearance of the page's address in src/ outside the reader that is
 *      not an allowed form, by file (v2.3.6526).  Card T's PRs 7 on lowered
 *      it as reads moved in.
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
 *   v2.3.6526 (sitting 59's hold; the class, not the lines): an ALLOW list.
 *   The few forms the address may take outside the reader are named
 *   (addressScan's header); every other appearance, a form it cannot
 *   follow included, is a row of OUTSIDE (by file, only falls: 19 rows, 37
 *   forms).  Check 3c runs the plants itself: sitting 59's four
 *   (`new URL(window.location.href).search`, `.href`, `'' + new URL(..)`,
 *   `window[_k]`), card WL's own (`{ w: window }`, a computed destructure,
 *   performance's navigation entry, `document.defaultView[..]`,
 *   `document.baseURI`, `Reflect.get(_g, 'loc' + 'ation')`, an alias of the
 *   document, `ownerDocument.URL`, `navigation`) and 57 and 58's: all rows.
 *   `document` is followed now (an alias, a computed key, handed on).
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

/* ═══ v2.3.6526: THE PAGE'S ADDRESS, AN ALLOW LIST (card WL; sitting 59's hold) ═══
   Sittings 57 to 59 each planted a spelling the guard did not know, and
   each mend learned the spellings: `new URL(window.location.href)
   .search.includes(..)` passed as "a URL that only rewrites the address",
   `'' + new URL(..)` as "handed whole", `window[_k]` with `_k =
   'location'` was never seen at all.  So the guard is turned around: it
   names the FEW FORMS in which the page's address may appear outside the
   reader, and every other appearance is a row of OUTSIDE (by file, it only
   falls), the forms it cannot follow included.

   Where the address can be reached (each one a SOURCE):
     - `location`, the global name (unless the file binds its own);
     - any `X.location` / `X['location']` / `X[`location`]`, whatever X
       (`window.`, `document.`, `self.`, `this.`, an alias, a parameter);
     - `.URL`, `.documentURI`, `.baseURI` of anything (`document.URL`,
       `el.ownerDocument.URL`, `img.baseURI`), except the constructor
       `window.URL` / `self.URL` / `globalThis.URL`;
     - the global object or the document by a key that is not a literal
       (`window[_k]`, `globalThis['loc' + 'ation']`, `document.defaultView[k]`)
       or handed on whole (to a call, a spread, an array, a name assigned
       again, ...): `window`, `self`, `globalThis`, `document`, `top`,
       `parent`, `frames`, `opener` and `.defaultView` / `.ownerDocument`,
       and a const name bound to one of them (followed to each use);
     - the Navigation API (`navigation`), performance's navigation entry
       (`getEntries()`, `getEntriesByName(..)`, `getEntriesByType(..)` but
       for a literal other than 'navigation'), `eval`, `new Function`;
     - a file the parser cannot read.
   The ALLOWED forms (no row):
     - inside the reader, src/game/switches.js;
     - the location (or a const name bound to it, followed to each use)
       as a PLACE TO GO: `location = ..`, `location.href = ..` (any part,
       with `=`), `.assign(..)`, `.replace(..)`, `.reload()`;
     - a part that holds no switch: `pathname`, `hash`, `host`,
       `hostname`, `origin`, `port`, `protocol`, `ancestorOrigins` (read,
       or destructured into a name);
     - a TEST of being there: `typeof location`, `!location`, the left of
       `&&`, the test of `?:` or `if`;
     - a BASE under a literal path: `new URL('/x', location.href)` (the
       path, not '', '?..' or '#..', replaces the base's search);
     - the global object written to or asked its names:
       `Object.assign(window, ..)`, `Object.defineProperty(window, ..)`,
       `Object.keys(window)` (the values it then reads are judged where
       they are read), `typeof`/`===`/`in`/`instanceof` against it.
   Everything else (a read of `search` or `href`, the location to a URL or
   made text, a computed key, a destructure of `search`, a rest, a name
   assigned again, the location handed to a helper) is a row.  The old
   "a URL that only rewrites the address" is no longer an allowed form:
   those URLs are rows now, counted, and fall as they move to the reader. */
const GLOBALS = new Set(['window', 'self', 'globalThis', 'document', 'top', 'parent', 'frames', 'opener']);
const MEMBER_GLOBALS = new Set(['window', 'globalThis', 'document', 'defaultView', 'ownerDocument']);
const NO_SWITCH_PARTS = new Set(['pathname', 'hash', 'host', 'hostname', 'origin', 'port', 'protocol', 'ancestorOrigins']);
const NAMES_ONLY = new Set(['assign', 'defineProperty', 'defineProperties', 'keys', 'getOwnPropertyNames']);
const GOES = new Set(['assign', 'replace', 'reload']);
const TEXT_KEYS = new Set(['URL', 'documentURI', 'baseURI']);
const isMember = (n) => !!n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression');
/* the key of a member, or null when it is computed from anything but a literal */
const keyOf = (m) => {
  if (!m.computed) return m.property.type === 'Identifier' ? m.property.name : null;
  const p = m.property;
  if (p.type === 'StringLiteral') return p.value;
  if (p.type === 'TemplateLiteral' && p.expressions.length === 0) return p.quasis[0].value.cooked;
  return null;
};
const propKey = (p) => {
  if (!p.computed) return p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'StringLiteral' ? p.key.value : null);
  if (p.key.type === 'StringLiteral') return p.key.value;
  if (p.key.type === 'TemplateLiteral' && p.key.expressions.length === 0) return p.key.quasis[0].value.cooked;
  return null;
};

const _cache = new Map();
/* the rows of one file's source: [{ line, how }], or null when no @babel loads */
function addressScan(src, file) {
  let B;
  try { B = babel(); } catch { return null; }
  const key = file + '\0' + src.length;
  if (_cache.has(key)) return _cache.get(key);
  const rows = [];
  const row = (n, how) => rows.push({ line: n.loc ? n.loc.start.line : 0, how });
  let ast;
  try { ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); } catch (e) {
    rows.push({ line: 0, how: 'the file does not parse (' + String(e.message).slice(0, 60) + ')' });
    _cache.set(key, rows);
    return rows;
  }
  if (ast.errors && ast.errors.length) rows.push({ line: (ast.errors[0].loc && ast.errors[0].loc.line) || 0, how: 'the file parses with errors: it cannot be followed' });
  const seen = new Set();
  /* is `path` (an expression) the global object, the document, or a name kept bound to one */
  const globalish = (path, depth = 0) => {
    const n = path.node;
    if (!n || depth > 8) return false;
    if (n.type === 'Identifier') {
      if (GLOBALS.has(n.name) && !path.scope.hasBinding(n.name)) return true;
      const b = path.scope.getBinding(n.name);
      if (!b || !b.path.isVariableDeclarator() || !b.path.node.init) return false;
      return globalish(b.path.get('init'), depth + 1);
    }
    if (isMember(n)) { const k = keyOf(n); return k !== null && (MEMBER_GLOBALS.has(k) || (GLOBALS.has(k) && globalish(path.get('object'), depth + 1))); }
    if (n.type === 'ConditionalExpression') return globalish(path.get('consequent'), depth + 1) || globalish(path.get('alternate'), depth + 1);
    if (n.type === 'LogicalExpression') return globalish(path.get('left'), depth + 1) || globalish(path.get('right'), depth + 1);
    if (n.type === 'SequenceExpression') return globalish(path.get('expressions.' + (n.expressions.length - 1)), depth + 1);
    if (n.type === 'ParenthesizedExpression' || n.type === 'TSAsExpression') return globalish(path.get('expression'), depth + 1);
    return false;
  };
  /* the location tested for being there (never its value handed on) */
  const onlyTested = (path) => {
    let q = path;
    if (q.parent.type === 'LogicalExpression' && q.parent.operator === '&&' && q.parent.left === q.node) return true;
    while (q.parent.type === 'LogicalExpression') q = q.parentPath;
    const p = q.parent;
    return ((p.type === 'ConditionalExpression' || p.type === 'IfStatement') && p.test === q.node)
      || (p.type === 'UnaryExpression' && (p.operator === '!' || p.operator === 'typeof'));
  };
  const destructure = (pat) => {
    for (const p of pat.properties) {
      if (p.type === 'RestElement') { row(p, 'the location destructured into a rest'); continue; }
      const k = propKey(p);
      if (k !== null && NO_SWITCH_PARTS.has(k) && p.value.type === 'Identifier') continue;
      row(p, k === null ? 'the location destructured by a computed key' : `the location's ${k}, destructured`);
    }
  };
  /* a first argument that replaces the base's search: a literal path (not '', '?..' or '#..') */
  const fixedPath = (a) => {
    const t = a && (a.type === 'StringLiteral' ? a.value : (a.type === 'TemplateLiteral' ? a.quasis[0].value.cooked : null));
    return typeof t === 'string' && t.length > 0 && t[0] !== '?' && t[0] !== '#';
  };
  /* `path` is the page's location object: the ALLOWED forms; every other is a row */
  const follow = (path) => {
    const n = path.node;
    if (seen.has(n)) return;
    seen.add(n);
    const p = path.parent;
    if (p.type === 'AssignmentExpression' && p.left === n && p.operator === '=') return;          /* location = '..': a place to go */
    if (isMember(p) && p.object === n) {
      const k = keyOf(p);
      const pp = path.parentPath.parent;
      if (k !== null && NO_SWITCH_PARTS.has(k) && !(pp.type === 'AssignmentExpression' && pp.left === p && pp.operator !== '=')
        && !(pp.type === 'CallExpression' && pp.callee === p)) return;                             /* location.pathname: no switch there */
      if (k !== null && pp.type === 'AssignmentExpression' && pp.left === p && pp.operator === '=') return;   /* location.href = '..': a place to go */
      if ((k === 'href' || k === 'origin') && pp.type === 'NewExpression' && pp.callee.type === 'Identifier' && pp.callee.name === 'URL'
        && pp.arguments[1] === p && fixedPath(pp.arguments[0])) return;                             /* new URL('/x', location.href): a base */
      if (k !== null && GOES.has(k) && (pp.type === 'CallExpression' || pp.type === 'OptionalCallExpression') && pp.callee === p) return; /* location.assign(..) */
      row(p, k === null ? 'the location by a computed key' : `the location's ${k}`);
      return;
    }
    if (p.type === 'VariableDeclarator' && p.init === n) {
      if (p.id.type === 'Identifier') {
        const b = path.parentPath.scope.getBinding(p.id.name);
        if (!b || (b.constantViolations && b.constantViolations.length)) { row(n, `the location kept in ${p.id.name}, assigned again`); return; }
        for (const r of b.referencePaths) follow(r);
        return;
      }
      if (p.id.type === 'ObjectPattern') { destructure(p.id); return; }
      row(n, 'the location bound to a pattern');
      return;
    }
    if (onlyTested(path)) return;
    if (p.type === 'NewExpression' && p.callee.type === 'Identifier' && p.callee.name === 'URL' && p.arguments[1] === n && fixedPath(p.arguments[0])) return;
    row(n, `the location in a ${p.type}`);
  };
  B.traverse(ast, {
    Identifier(path) {
      const n = path.node;
      if (!path.isReferencedIdentifier()) return;
      if (n.name === 'location' && !path.scope.hasBinding('location')) follow(path);
      else if (n.name === 'navigation' && !path.scope.hasBinding('navigation')) row(n, 'the Navigation API (navigation)');
      else if ((n.name === 'eval') && !path.scope.hasBinding(n.name)) row(n, 'eval');
      else if (GLOBALS.has(n.name) && !path.scope.hasBinding(n.name)) handed(path);
    },
    'MemberExpression|OptionalMemberExpression'(path) {
      const n = path.node;
      const k = keyOf(n);
      if (k === 'location') { follow(path); return; }
      if (k !== null && TEXT_KEYS.has(k)) {
        /* document.URL / x.documentURI / x.baseURI: the address as text; window.URL is the constructor */
        if (k === 'URL' && n.object.type === 'Identifier' && ['window', 'self', 'globalThis'].includes(n.object.name)) return;   /* the constructor */
        const pp = path.parent;
        if (pp.type === 'AssignmentExpression' && pp.left === n) return;
        row(n, `the address (${k})`);
        return;
      }
      if (k === null && globalish(path.get('object'))) row(n, 'the global object by a computed key');
    },
    ObjectPattern(path) {
      for (const p of path.node.properties) {
        if (p.type !== 'ObjectProperty') continue;
        const k = propKey(p);
        if (k === 'location') {
          if (p.value.type === 'Identifier') {
            const b = path.scope.getBinding(p.value.name);
            if (!b || (b.constantViolations && b.constantViolations.length)) row(p, 'the location destructured, assigned again');
            else for (const r of b.referencePaths) follow(r);
          } else if (p.value.type === 'ObjectPattern') destructure(p.value);
          else row(p, 'the location destructured into a pattern');
        } else if (k !== null && TEXT_KEYS.has(k)) row(p, `the address (${k}, destructured)`);
      }
    },
    CallExpression(path) {
      /* performance's navigation entry names the address: getEntries(), getEntriesByType(not a literal
         or 'navigation'), getEntriesByName(..) */
      const c = path.node.callee, a = path.node.arguments[0];
      const k = isMember(c) ? keyOf(c) : null;
      if (k === 'getEntries' || k === 'getEntriesByName'
        || (k === 'getEntriesByType' && !(a && a.type === 'StringLiteral' && a.value !== 'navigation'))) row(path.node, `the address (performance's ${k})`);
    },
    NewExpression(path) {
      const c = path.node.callee;
      if (c.type === 'Identifier' && c.name === 'Function' && !path.scope.hasBinding('Function')) row(path.node, 'new Function');
    },
  });
  /* the global object or the document handed on whole (to a call, a spread, an array, an object, a
     name that is not followed, ...): the guard cannot follow it */
  function handed(path, name = path.node.name) {
    const n = path.node, p = path.parent;
    if (seen.has(n)) return;
    seen.add(n);
    if (isMember(p) && p.object === n) return;                         /* window.x: judged as a member */
    if (p.type === 'VariableDeclarator' && p.init === n && p.id.type === 'Identifier') {
      const b = path.parentPath.scope.getBinding(p.id.name);
      if (b && !(b.constantViolations && b.constantViolations.length)) {
        for (const r of b.referencePaths) handed(r, `${name} kept in ${p.id.name}`);
        return;
      }
    }
    if (p.type === 'VariableDeclarator' && p.init === n && p.id.type === 'ObjectPattern') {
      for (const q of p.id.properties) if (q.type === 'RestElement' || propKey(q) === null) row(q, `the global object (${name}) destructured by a computed key or rest`);
      return;
    }
    if (onlyTested(path)) return;
    /* written to, or asked its names (no value of the global's comes out): Object.assign(window, ..),
       Object.defineProperty(window, ..), Object.keys(window) */
    if (p.type === 'CallExpression' && p.arguments[0] === n && isMember(p.callee) && p.callee.object.type === 'Identifier'
      && p.callee.object.name === 'Object' && NAMES_ONLY.has(keyOf(p.callee))) return;
    if (p.type === 'BinaryExpression' && (p.operator === '===' || p.operator === '!==' || p.operator === '==' || p.operator === '!=' || p.operator === 'in' || p.operator === 'instanceof')) return;
    if (p.type === 'ConditionalExpression' || p.type === 'LogicalExpression') {
      /* `typeof window !== 'undefined' ? window : globalThis` as a value: judged where it goes */
      let q = path;
      while (q.parent.type === 'ConditionalExpression' || q.parent.type === 'LogicalExpression') q = q.parentPath;
      if (isMember(q.parent) && q.parent.object === q.node) return;
      if (q.parent.type === 'VariableDeclarator' && q.parent.id.type === 'Identifier') {
        const b = q.parentPath.scope.getBinding(q.parent.id.name);
        if (b && !(b.constantViolations && b.constantViolations.length)) {
          for (const r of b.referencePaths) handed(r, `${name} kept in ${q.parent.id.name}`);
          return;
        }
      }
    }
    row(n, `the global object (${name}) in a ${p.type}`);
  }
  _cache.set(key, rows);
  return rows;
}
   /* v2.3.5742: a big file found by its system (tests-by-system 2); v2.3.5343: and the two renderers (inSystem below) */

/* the outside reads: only fall.  v2.3.6526: the count is by file, OUTSIDE below (after inSystem). */

/* v2.3.5343: a moved read in a big file (the four lines' own: BroTown.jsx,
   the two renderers) names its file through its system, never its path
   (tests-by-system, step 5.2b): a name the map no longer gives is undefined,
   and check 1 fails loudly (its file asks nothing) */
const inSystem = (system, name) => filesOf(system).find((f) => f.endsWith('/' + name));

/* v2.3.6526 (sitting 59): every appearance of the address outside the reader that is not an
   allowed form, by file (check 3).  It only falls: a file over its row, or a file not here, fails.
   It starts with 19 rows holding 37 forms (the old line was 18 reads; the same code, now also
   counting the URLs made from the address to rewrite it or as a base (9), the global object by a
   computed key (5), the global object handed on whole (4) and an observer's getEntries() (1)).  The big files are named through their system
   (tests-by-system 2).  The old line's history: its first count, v2.3.5306: 228 with sitting 17's `?slimewalk` (card P's slimeSprites.js, P still running: not moved), 221 after the first seven reads moved; 212 after v2.3.5309's nine; 201 after v2.3.5310's eleven; 189 after v2.3.5232's twelve (card O PR 12: the lanes' off-ramps); 172 with v2.3.5311's pageAddress() sites (seventeen) ; 161 after v2.3.5313's eleven ; 155 after v2.3.5314's six ; 144 after v2.3.5315's eleven ; 116 after v2.3.5316's twenty-eight ; 71 after v2.3.5317's forty-five (render, on pageAddress()) ; 65 after v2.3.5740's six (card T2: the game's) ; 59 after v2.3.5741's six (card T2: the screens, the townsfolk's pictures) ; 56 after v2.3.5742's three (card T2: the connection's) ; 34 after v2.3.5343's twenty-two (card M chain B: the two renderers; the gatekeeper's sitting 42) ; 33 after v2.3.5743's one (card T2: the kill's XP fly, on pageAddress(); census part 1 closed) ; 17 after v2.3.5342's sixteen (card M chain A: BroTown.jsx; the gatekeeper's sitting 46, v2.3.6260) 
   v2.3.6520: 17 -> 18 by the tree (BroTown.jsx's tidy of `?create`); 3b's list of forms it could
   not follow was 0 and is folded in here. */
const OUTSIDE = Object.freeze(Object.assign(Object.create(null), {
  [inSystem('data', 'gameDisplay.js')]: 8,           /* `/[?&]x\b/.test(location.search)`: eight switches read before the reader */
  'src/data/soundFold.js': 1,
  'src/debug/perfTracker.js': 1,           /* a long-task observer's `list.getEntries()` (no navigation there; not followed) */
  'src/game/deskKeys.js': 1,               /* `typeof document !== 'undefined' ? document : null` handed on */
  'src/game/manualCombat.js': 2,
  'src/game/pinSlots.js': 1,
  'src/game/weaponFeel.js': 1,
  [inSystem('wire', 'wsClient.js')]: 2,        /* the document and the window handed to the freeze watch */
  'src/rendering/bodyBake.js': 1,          /* `new URL(u, location.href)`: a base under a path not literal */
  'src/rendering/drawLists.js': 1,         /* `window[name]` */
  'src/rendering/keepAsImage.js': 1,
  'src/rendering/png8Worker.js': 4,        /* `self.location.href` as a base under a path not literal */
  'src/rendering/retryLooks.js': 1,
  [inSystem('render', 'effectsRenderer.js')]: 3,   /* a base; `window[k]` twice (the probes kept) */
  [inSystem('render', 'entityRenderer.js')]: 2,    /* `window[k]` twice (the probes kept) */
  'src/rendering/traits/traitImg.js': 1,
  [inSystem('ui', 'BroTown.jsx')]: 4,              /* three URLs made from the address to rewrite it; `(_window = window)` */
  'src/ui/mobile/BottomDashboard.jsx': 1,
  'src/ui/oneBand.js': 1,                  /* `new URL(location.href)` to rewrite `?oneband` */
}));

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
   'farmfast')` passed it; read off the syntax tree since (the plan's rule 2).
   v2.3.6526 (sitting 59): an ALLOW list (addressScan, at the top of this
   file): every appearance of the address that is not one of its few
   allowed forms is a row, by file, against OUTSIDE.  A file over its row,
   or a file with no row, fails; the forms the tree cannot follow are rows
   too (3b is folded in: an unknown form is red, never green). */
{
  let n = 0;
  const where = [];
  const over = [];
  const seenFiles = new Set();
  for (const [f, s] of src) {
    if (f === READER_FILE) continue;
    const rows = addressScan(s, f);
    if (rows === null) { check('3: @babel loads from the root or server/ (npm install)', false); break; }
    if (!rows.length) continue;
    seenFiles.add(f);
    n += rows.length;
    const said = `${f}: ${rows.map((r) => r.line + ' ' + r.how).join(', ')}`;
    where.push(said);
    if (rows.length > (OUTSIDE[f] || 0)) over.push(`${said} (its row ${OUTSIDE[f] || 0})`);
  }
  const line = Object.values(OUTSIDE).reduce((a, b) => a + b, 0);
  check(`3: the page's address outside the reader, every form but the allowed ones: ${n} in ${seenFiles.size} files, the list ${line} in ${Object.keys(OUTSIDE).length} rows (by file; it only falls: a read moves into src/game/switches.js)`, over.length === 0, over);
  const lost = Object.keys(OUTSIDE).filter((f) => f === 'undefined' || !src.has(f));
  check('3: every row of OUTSIDE names a page file (a big file through its system)', lost.length === 0, lost);
  if (n < line) console.log(`     (room: ${n} under the list's ${line}; the gatekeeper may lower a row)`);
  if (process.argv.includes('--list')) for (const w of where) console.log('     ' + w);
}

/* 3c. v2.3.6526: the plants, run by the guard itself (each a whole file of one function): every
   RED one gives a row, every ALLOWED one none.  Sitting 59's lines first, then three of card WL's
   own that the allow list was not written for, then sittings 57 and 58's. */
{
  const wrap = (body) => `export function tickFarmWalk(S) {\n${body}\n}\n`;
  const RED = [
    /* sitting 59 */
    "if (new URL(window.location.href).search.includes('farmfast')) return;",
    "if (new URL(window.location.href).href.includes('farmfast')) return;",
    "if (('' + new URL(window.location.href)).includes('farmfast')) return;",
    "const _k = 'location'; if (String(window[_k]).includes('farmfast')) return;",
    /* card WL's own, not designed for */
    "const _o = { w: window }; if (_o.w.location.search) return;",
    "const { [`loc${'ation'}`]: _L } = window; if (_L.search) return;",
    "if (performance.getEntriesByType('navigation')[0].name.includes('farmfast')) return;",
    "if (document.defaultView[['loc', 'ation'].join('')].search) return;",
    "if (new URL('', document.baseURI).searchParams.has('farmfast')) return;",
    "const _g = typeof globalThis !== 'undefined' ? globalThis : window; if (Reflect.get(_g, 'loc' + 'ation').search) return;",
    "const _d = document; if (_d.URL.includes('farmfast')) return;",
    "if (el.ownerDocument.URL.includes('farmfast')) return;",
    "if (navigation.currentEntry.url.includes('farmfast')) return;",
    /* sittings 57 and 58 */
    "if (new URL(window.location).searchParams.get('farmfast')) return;",
    "const _loc = window.location; if (_loc.search.includes('farmfast')) return;",
    "const { search } = window.location; if (search.includes('farmfast')) return;",
    "const { location: _l } = window; if (_l.href.includes('farmfast')) return;",
    "if (window['location'].search) return;",
    "if (window.location?.search) return;",
    "readIt(location);",
    "if ([window.location][0].search) return;",
    "let _m = location; _m = null;",
    "if (/farmfast/.test(location.href)) return;",
    "if (String(location).includes('farmfast')) return;",
    "const _q = new URLSearchParams(document.location.search); if (_q.has('farmfast')) return;",
  ];
  const ALLOWED = [
    "if (location.pathname === '/x') return;",
    "location.href = '/play';",
    "window.location.reload();",
    "if (typeof window !== 'undefined' && window.location) S.x = 1;",
    "const u = new URL('/sprites/a.png', location.href);",
    "Object.assign(window, { __btX: 1 });",
    "const { pathname } = window.location;",
  ];
  const red = RED.filter((b) => !(addressScan(wrap(b), 'plant-' + b) || []).length);
  check(`3c: each planted read of the address is a row (${RED.length} plants)`, red.length === 0, red);
  const loud = ALLOWED.filter((b) => (addressScan(wrap(b), 'plant-' + b) || [1]).length);
  check(`3c: each allowed form is no row (${ALLOWED.length} forms)`, loud.length === 0, loud);
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
