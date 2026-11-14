/* ═══ v2.3.5101: THE FOUR LINES, MEASURED (grand plan step 5.1, card B PR 2) ═══
 *
 * The measuring half of tools/guards/four-lines.test.mjs, in a file of its
 * own so tools/dev/scoreboard.mjs reads the same numbers the guard holds (a
 * second counter is how two numbers for one thing begin: the plan's rule 2).
 * The LINES table is at the bottom: each line only falls, and only the
 * gatekeeper lowers one (a PR of its own).
 *
 * THE RULES, PINNED HERE (W found the plan's figures, "about 8,700" and
 * "about 3,600", unexplained; a parser gave 9,872 and 14,864.  These rules
 * decide; the figures follow them):
 *
 *   THE FILES.  The client: every .js and .jsx file under src/.
 *
 *   A CODE LINE is a line of a file that holds at least one token of code.
 *   Read by esbuild (the one parser GitHub's `test` job has: wrangler brings
 *   it), which compiles the file with a source map; a line the map points at
 *   is code.  So comments and blank lines never count (comments are the
 *   project's memory), a closing brace or a JSX tag on its own line does,
 *   and the inside lines of a string or template that spans lines do not
 *   (one token, one line: its first).
 *
 *   THE LONGEST FUNCTION is the function with the most code lines from its
 *   first token to its last, the functions inside it included.  A function
 *   is a `function`, a method, or an arrow (with a braced body or an
 *   expression), as esbuild prints it.  So a React component is one
 *   function: `BroTown` is the BroTown component, its hooks and handlers
 *   inside it.  A function is named by the file and the name it is given
 *   (`function name`, `name(...) {`, `const name = ... =>`, `name: ... =>`).
 *
 *   AN IMPORT CYCLE is a group of two or more files under src/ that reach
 *   each other by static imports (relative, or through vite's `@/` alias) (`import ... from`, `export ... from`,
 *   `import "x"`): a strongly connected component of the import graph.  A
 *   file that imports itself is one too.  `import()` (loaded later) is not
 *   an edge.  The count is the number of groups.
 *
 *   WRITES TO `S` FROM src/rendering/ are card D's count, never this file's
 *   (rule 2): `node tools/dev/state-census.mjs --json`, the places under
 *   rendering/ that set a field of the state or change inside one (its
 *   `sets` and `inside`; writes through a name for the inside are listed
 *   apart).  The guard reads it off the page that script writes
 *   (docs/plan/census/state.md, "The counts"): the script takes about 16 s
 *   and needs the root's @babel, which GitHub's `test` job does not install
 *   (it installs only server/'s).  So the line holds what the page says;
 *   the page is held to the code by `state-census.mjs --check` (card D's),
 *   and `node tools/guards/four-lines.test.mjs --live` runs the script.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

let _esbuild = null;
function esbuild() {
  if (_esbuild) return _esbuild;
  for (const pkg of ['server/package.json', 'package.json']) {
    try { _esbuild = createRequire(join(ROOT, pkg))('esbuild'); return _esbuild; } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}

/** The client's files, as paths under src/ with forward slashes, sorted. */
export function clientFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
    }
  };
  walk('src');
  return out.sort();
}

/* ── the source map's mappings, decoded: for each generated line, its
   segments [genCol, srcLine] (srcLine 0-based) ── */
const B64 = Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((c, i) => [c, i]));
function decodeMappings(m) {
  const lines = [];
  let srcLine = 0, srcCol = 0, srcIdx = 0, nameIdx = 0;
  for (const lineStr of m.split(';')) {
    const segs = [];
    let genCol = 0;
    if (lineStr) {
      for (const seg of lineStr.split(',')) {
        const v = [];
        let shift = 0, val = 0;
        for (const ch of seg) {
          const d = B64[ch];
          val += (d & 31) << shift;
          if (d & 32) shift += 5;
          else { v.push(val & 1 ? -(val >>> 1) : (val >>> 1)); val = 0; shift = 0; }
        }
        genCol += v[0];
        if (v.length >= 4) {
          srcIdx += v[1]; srcLine += v[2]; srcCol += v[3];
          if (v.length >= 5) nameIdx += v[4];
          segs.push([genCol, srcLine, srcCol]);
        }
      }
    }
    lines.push(segs);
  }
  return lines;
}

/* ── a small lexer over esbuild's OWN output (no JSX, comments only as
   annotations, strings in double quotes): tokens with their place ── */
const KW_NOT_FN = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'await', 'yield', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else']);
function lex(code) {
  const toks = [];
  let i = 0, line = 0, col = 0;
  const n = code.length;
  const adv = (k) => { for (let j = 0; j < k; j++) { if (code[i] === '\n') { line++; col = 0; } else col++; i++; } };
  const regexOk = () => {
    const p = toks[toks.length - 1];
    if (!p) return true;
    if (p.t === 'id') return KW_NOT_FN.has(p.v) || p.v === 'return';
    if (p.t === 'num' || p.t === 'str') return false;
    return !(p.v === ')' || p.v === ']' || p.v === '}');
  };
  const tplStack = [];   /* brace depth at each `${` */
  let depth = 0;
  while (i < n) {
    const c = code[i];
    if (c === '\n' || c === ' ' || c === '\t' || c === '\r') { adv(1); continue; }
    const L = line, C = col;
    if (c === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); adv((e < 0 ? n : e + 2) - i); continue; }
    if (c === '/' && code[i + 1] === '/') { const e = code.indexOf('\n', i); adv((e < 0 ? n : e) - i); continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c) { if (code[j] === '\\') j++; j++; }
      adv(j + 1 - i); toks.push({ t: 'str', v: c, l: L, c: C, el: line, ec: col }); continue;
    }
    if (c === '`' || (c === '}' && tplStack.length && tplStack[tplStack.length - 1] === depth)) {
      if (c === '}') tplStack.pop();
      let j = i + 1;
      while (j < n && code[j] !== '`') {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '$' && code[j + 1] === '{') break;
        j++;
      }
      if (j < n && code[j] === '$') { adv(j + 2 - i); tplStack.push(depth); }
      else adv(j + 1 - i);
      toks.push({ t: 'str', v: '`', l: L, c: C, el: line, ec: col }); continue;
    }
    if (c === '/' && regexOk()) {
      let j = i + 1, cls = false;
      while (j < n) {
        const d = code[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') cls = true; else if (d === ']') cls = false;
        else if (d === '/' && !cls) break;
        else if (d === '\n') break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(code[j])) j++;
      adv(j - i); toks.push({ t: 'str', v: '/', l: L, c: C, el: line, ec: col }); continue;
    }
    if (/[A-Za-z_$\\]/.test(c) || c.charCodeAt(0) > 127) {
      let j = i;
      while (j < n && (/[A-Za-z0-9_$\\]/.test(code[j]) || code.charCodeAt(j) > 127)) j++;
      const v = code.slice(i, j); adv(j - i); toks.push({ t: 'id', v, l: L, c: C, el: line, ec: col }); continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i;
      while (j < n && /[0-9A-Za-z_.]/.test(code[j])) j++;
      adv(j - i); toks.push({ t: 'num', v: '0', l: L, c: C, el: line, ec: col }); continue;
    }
    if (c === '=' && code[i + 1] === '>') { adv(2); toks.push({ t: 'p', v: '=>', l: L, c: C, el: line, ec: col }); continue; }
    if (c === '?' && code[i + 1] === '.') { adv(2); toks.push({ t: 'p', v: '?.', l: L, c: C, el: line, ec: col }); continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    if (c === '}' || c === ')' || c === ']') depth--;
    adv(1); toks.push({ t: 'p', v: c, l: L, c: C, el: line, ec: col });
  }
  return toks;
}

/* the functions in esbuild's output: [{ name, sl, sc, el, ec }] in generated places */
function findFunctions(toks) {
  const out = [];
  const match = new Array(toks.length).fill(-1);
  const st = [];
  for (let k = 0; k < toks.length; k++) {
    const v = toks[k].t === 'p' ? toks[k].v : '';
    if (v === '(' || v === '[' || v === '{') st.push(k);
    else if (v === ')' || v === ']' || v === '}') { const o = st.pop(); if (o !== undefined) { match[o] = k; match[k] = o; } }
  }
  const nameBefore = (k) => {
    /* `const name = ...`, `name: ...`, `name = ...` walking back from k */
    for (let j = k - 1, seen = 0; j >= 0 && seen < 40; j--, seen++) {
      const t = toks[j];
      if (t.t === 'p' && (t.v === ';' || t.v === '{' || t.v === '}')) break;
      if (t.t === 'p' && (t.v === '=' || t.v === ':') && toks[j - 1] && toks[j - 1].t === 'id') return toks[j - 1];
    }
    return null;
  };
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t !== 'p') continue;
    if (t.v === '{' && match[k] > k) {
      const p = toks[k - 1];
      if (p && p.t === 'p' && p.v === '=>') {
        /* an arrow: from its parameters (or its one name) */
        let s = k - 2;
        if (toks[s] && toks[s].v === ')' && match[s] >= 0) s = match[s];
        if (toks[s - 1] && toks[s - 1].v === 'async') s--;
        out.push({ nameTok: nameBefore(s), s: toks[s], e: toks[match[k]] });
      } else if (p && p.t === 'p' && p.v === ')' && match[k - 1] >= 0) {
        const o = match[k - 1];
        const q = toks[o - 1];
        if (!q) continue;
        if (q.t === 'id' && !KW_NOT_FN.has(q.v)) {
          let s = o - 1;
          const nameTok = q.v === 'function' ? nameBefore(s) : q;
          if (toks[s - 1] && toks[s - 1].v === 'function') s--;
          if (toks[s - 1] && (toks[s - 1].v === 'async' || toks[s - 1].v === 'get' || toks[s - 1].v === 'set' || toks[s - 1].v === 'static')) s--;
          out.push({ nameTok, s: toks[s], e: toks[match[k]] });
        } else if (q.t === 'p' && q.v === '*' && toks[o - 2] && toks[o - 2].v === 'function') {
          out.push({ nameTok: nameBefore(o - 2), s: toks[o - 2], e: toks[match[k]] });
        }
      }
    } else if (t.v === '=>' && toks[k + 1] && !(toks[k + 1].t === 'p' && toks[k + 1].v === '{')) {
      /* an arrow with an expression body: it ends at the first , ; or closer at its own depth */
      let s = k - 1;
      if (toks[s] && toks[s].v === ')' && match[s] >= 0) s = match[s];
      if (toks[s - 1] && toks[s - 1].v === 'async') s--;
      let d = 0, j = k + 1, last = k + 1;
      for (; j < toks.length; j++) {
        const u = toks[j];
        if (u.t === 'p') {
          if (u.v === '(' || u.v === '[' || u.v === '{') d++;
          else if (u.v === ')' || u.v === ']' || u.v === '}') { if (d === 0) break; d--; }
          else if ((u.v === ',' || u.v === ';') && d === 0) break;
        }
        last = j;
      }
      out.push({ nameTok: nameBefore(s), s: toks[s], e: toks[last] });
    }
  }
  return out;
}

/* a relative path, or vite's `@/` alias for src/ (vite.config.js) */
const RELATIVE = /^(?:\.\.?\/|@\/)/;
function staticImports(code) {
  const out = [];
  for (const m of code.matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*"([^"]+)";$/gms)) out.push(m[1]);
  for (const m of code.matchAll(/^import\s*"([^"]+)";$/gm)) out.push(m[1]);
  return out.filter((s) => RELATIVE.test(s));
}
function resolveImport(fromFile, spec, known) {
  const base = (spec.startsWith('@/') ? 'src/' + spec.slice(2) : join(dirname(fromFile), spec)).split(sep).join('/');
  for (const c of [base, base + '.js', base + '.jsx', base + '/index.js', base + '/index.jsx']) if (known.has(c)) return c;
  return null;
}

/* Tarjan's strongly connected components */
function cycles(graph) {
  let idx = 0;
  const index = new Map(), low = new Map(), on = new Set(), st = [], out = [];
  const strong = (v) => {
    index.set(v, idx); low.set(v, idx); idx++; st.push(v); on.add(v);
    for (const w of graph.get(v) || []) {
      if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const comp = [];
      let w;
      do { w = st.pop(); on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1 || (graph.get(v) || []).includes(v)) out.push(comp.sort());
    }
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) strong(v);
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/* code lines, functions and imports from esbuild's output and its map */
function measureOutput(code, mapJson, srcText) {
  const map = JSON.parse(mapJson);
  const gen = decodeMappings(map.mappings);
  const codeLines = new Set();
  for (const segs of gen) for (const [, sl] of segs) codeLines.add(sl);
  const srcLines = srcText.split('\n');
  /* esbuild renames a name that collides (BroTown -> BroTown2): the name is
     read back off the source, at the place the map gives the name's token */
  const realName = (tok, fallback) => {
    if (!tok) return fallback;
    for (const [gc, sl, sc] of gen[tok.l] || []) {
      if (gc !== tok.c) continue;
      const m = /^[A-Za-z_$][\w$]*/.exec((srcLines[sl] || '').slice(sc));
      return m ? m[0] : fallback;
    }
    return fallback;
  };
  const fns = findFunctions(lex(code)).map((f) => {
    const lines = new Set();
    for (let g = f.s.l; g <= f.e.el && g < gen.length; g++) {
      for (const [gc, sl] of gen[g]) {
        if (g === f.s.l && gc < f.s.c) continue;
        if (g === f.e.el && gc > f.e.c) continue;
        lines.add(sl);
      }
    }
    let from = Infinity;
    for (const l of lines) if (l < from) from = l;
    return { name: realName(f.nameTok, f.nameTok ? f.nameTok.v : '(anonymous)'), lines: lines.size, from: lines.size ? from + 1 : 0 };
  });
  return { codeLines: codeLines.size, functions: fns, imports: staticImports(code) };
}

const OPTS = { jsx: 'transform', legalComments: 'none', format: 'esm', target: 'esnext' };

/** Measure one file's source: its code lines, its functions (by code lines). */
export function measureSource(src, file = 'x.jsx') {
  const r = esbuild().transformSync(src, { ...OPTS, loader: file.endsWith('.jsx') ? 'jsx' : 'js', sourcemap: 'external', sourcefile: file });
  return measureOutput(r.code, r.map, src);
}

/** Every file: { files: {path: codeLines}, functions: [...], cycles: [[...]] } */
export function measureClient() {
  const files = clientFiles();
  const known = new Set(files);
  /* one build for every file (a call a file is ~3 s of waiting on esbuild) */
  const out = esbuild().buildSync({
    ...OPTS, entryPoints: files.map((f) => join(ROOT, f)), outbase: join(ROOT, 'src'), outdir: join(ROOT, '.four-lines-out'),
    write: false, bundle: false, sourcemap: 'external', loader: { '.js': 'jsx', '.jsx': 'jsx' }, logLevel: 'silent',
    outExtension: { '.js': '.js' },
  });
  const byOut = new Map(out.outputFiles.map((o) => [relative(join(ROOT, '.four-lines-out'), o.path).split(sep).join('/'), o.text]));
  const byFile = Object.create(null);
  const functions = [];
  const graph = new Map();
  for (const f of files) {
    const o = f.slice(4).replace(/\.jsx?$/, '.js');
    const code = byOut.get(o), map = byOut.get(o + '.map');
    if (code === undefined || map === undefined) throw new Error('esbuild gave no output for ' + f);
    const m = measureOutput(code, map, readFileSync(join(ROOT, f), 'utf8'));
    byFile[f] = m.codeLines;
    for (const fn of m.functions) functions.push({ file: f, name: fn.name, lines: fn.lines, from: fn.from });
    graph.set(f, [...new Set(m.imports.map((s) => resolveImport(f, s, known)).filter(Boolean))]);
  }
  functions.sort((a, b) => b.lines - a.lines || (a.file + a.from < b.file + b.from ? -1 : 1));
  return { files: byFile, functions, cycles: cycles(graph) };
}

/** Card D's count of writes to `S` from src/rendering/ (rule 2: its number,
    never a second one).  Read off the page its script writes; `live` runs
    the script instead (about 16 s, and it needs the root's @babel). */
export function stateWritesFromRendering({ live = false } = {}) {
  if (live) {
    const out = execFileSync(process.execPath, [join(ROOT, 'tools/dev/state-census.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 });
    const j = JSON.parse(out);
    let sets = 0, inside = 0;
    for (const r of j.fields) {
      sets += (r.sets || []).filter((s) => s.startsWith('rendering/')).length;
      inside += (r.inside || []).filter((s) => s.startsWith('rendering/')).length;
    }
    return { count: sets + inside, by: 'state-census.mjs --json', sets, inside };
  }
  const page = readFileSync(join(ROOT, 'docs/plan/census/state.md'), 'utf8');
  const m = /^\| writes to `S` from `src\/rendering\/` \| [^|]* \| \*\*(\d+)\*\* \|/m.exec(page);
  if (!m) throw new Error('docs/plan/census/state.md has no "writes to `S` from `src/rendering/`" row in The counts');
  return { count: Number(m[1]), by: 'docs/plan/census/state.md (the page state-census.mjs writes)' };
}

/* ═══ THE LINES ═══  Each only falls.  Only the gatekeeper lowers one, in a
   PR of its own; nobody raises one.  Set 2026-11-14 at main d2e096a, by the
   rules above; taken again at main 0c83972 before this landed (card A's
   #1703 had added six code lines to wsClient.js meanwhile).  v2.3.5362
   (the gatekeeper, sitting 6, main f2351ab): entityRenderer.js 8968 -> 8961
   (card H's #1700 moved the page's side of the masked bake into
   bakeByAddress.js), gameDisplay.js 4270 -> 4268 (#1712: the fold into
   src/data/soundFold.js). */
export const LINES = Object.freeze({
  /* a file's code lines.  These files have a line of their own, at their
     count on the day; every other file under src/ stays at or under
     OTHER_FILE (a new file too) */
  FILE: Object.freeze({
    'src/rendering/systems/effectsRenderer.js': 9871,
    'src/rendering/systems/entityRenderer.js': 8961,
    'src/ui/BroTown.jsx': 8371,
    'src/data/gameSystems.js': 5622,
    'src/data/gameDisplay.js': 4268,
    'src/networking/wsClient.js': 3296,
    'src/networking/gameEvents.js': 2639,
    'src/game/monsterCombat.js': 1792,
  }),
  OTHER_FILE: 1500,
  /* a function's code lines, by `file#name` (the largest of a name, where a
     file has two: `(anonymous)` is every unnamed one); every other function
     stays at or under OTHER_FUNCTION */
  FUNCTION: Object.freeze({
    'src/ui/BroTown.jsx#BroTown': 7801,
    'src/networking/wsClient.js#setupWebSocket': 3097,
    'src/networking/gameEvents.js#processGameEvent': 2500,
    'src/ui/BroTown.jsx#(anonymous)': 2133,
    'src/networking/wsClient.js#connect': 2055,
    'src/game/monsterCombat.js#updateMonsterCombat': 1732,
    'src/ui/BroTown.jsx#gameLoop': 1584,
    'src/networking/wsClient.js#onmessage': 1466,
    'src/rendering/systems/entityRenderer.js#_updatePlayer': 1369,
    'src/ui/mobile/sheet/HeroExpanded.jsx#HeroExpanded': 1266,
    'src/rendering/systems/entityRenderer.js#_updateMonsters': 1086,
    'src/ui/panels/DungeonCreatorPanel.jsx#DungeonCreatorPanel': 1060,
    'src/ui/panels/buildings/ExchangePanel.jsx#ExchangePanel': 1029,
  }),
  OTHER_FUNCTION: 1000,
  /* import cycles under src/: the groups, and the files in them (a file
     that joins a group leaves the groups' count as it was, so the files
     are held too).  The plan said "five today": by the rule above, five,
     29 files:
       the zone door's 8 (zoneTransitions.js, wheelHome.js, bodyPlace.js,
         farmTrip.js, questRoute.js, wheelDungeons.js, preloadAnimations.js,
         effectsRenderer.js);
       the monsters' 10 (entityRenderer.js, combatHelpers.js, targeting.js,
         worldTrial.js, wheelMonsterArt.js and five sprite and fx files);
       characterPortrait.js and six colour catalogs (7);
       the bag's InventoryPanel.jsx and bagModel.js (2);
       TownBoard.jsx and TownBoardPage.jsx (2) */
  IMPORT_CYCLES: 5,
  IMPORT_CYCLE_FILES: 29,
  /* writes to S from src/rendering/ (card D's count: 92 sets and 22 changes
     inside; the plan said 89) */
  STATE_WRITES_FROM_RENDERING: 114,
});
