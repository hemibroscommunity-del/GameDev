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
 *   v2.3.6520: THE LINES HOLD STATEMENTS, not code lines (the rule is
 *   below OPTS: countStatements).  Code lines are still measured, as here.
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
 *   apart).  v2.3.5201 (card L PR 1): the guard reads it off the SCRIPT
 *   wherever the script loads, GitHub's `test` job included (server/ carries
 *   the root's @babel since; the script's loader tries the root's packages,
 *   then server/'s).  The script takes about 18 s, so it runs ONCE a
 *   `npm test`, shared with the state ledger's guard (stateCensus() below).
 *   Only where it cannot load (no @babel in either place) does the guard
 *   read the page the script writes (docs/plan/census/state.md, "The
 *   counts"), and it says which it read.  Nothing holds the page to the
 *   code (this said `state-census.mjs --check` did: nothing ran it, the
 *   gatekeeper's finding, sitting 6); the page is a census the script
 *   rewrites, its line numbers stale by the next PR, never a gate.
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, openSync, closeSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

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

/* ═══ v2.3.6520: STATEMENTS, NOT LINES (card WL; the shape review's item 13) ═══
   A line that holds a token counted two statements on one line as one: the
   review's plant 4a (`S.rpg.coins -= ...` put on the same line as the
   `dyingTo(...)` call) left every line green.  The lines now hold
   STATEMENTS, read off @babel's syntax tree (the root's or server/'s, as
   phase-table loads it; GitHub's `test` job has server/'s):

     - every statement node but a block `{ }` and an empty `;` (an `if`, a
       loop, a `return`, a `throw`, a `break`, a `switch`, a `try`, a
       declaration of a function or a class, an expression statement...);
     - a `var`/`let`/`const` counts each of its declarators (`var a = 1,
       b = 2;` is two);
     - an expression statement that is a comma list counts each expression
       (`a(), b();` is two), and a `case` each of its statements;
     - an arrow whose body is an expression counts that expression as one
       (`() => go()` does work, as `() => { go(); }` does), and a class's
       field declaration one;
     - `export` around a declaration adds nothing (the declaration counts).

   A function's count is every statement from its first token to its last,
   the functions inside it included (as its lines were); it is named as its
   lines were (its own name, a method's key, the variable or property it is
   given to, `(anonymous)` else).  The code lines are still measured (the
   scoreboard prints them beside the count). */
let _babel = null;
function babel() {
  if (_babel) return _babel;
  for (const pkg of ['package.json', 'server/package.json']) {
    try {
      const req = createRequire(join(ROOT, pkg));
      const t = req('@babel/traverse');
      _babel = { parse: req('@babel/parser').parse, traverse: t.default || t };
      return _babel;
    } catch { /* the next */ }
  }
  throw new Error('@babel/parser and @babel/traverse load from neither the root nor server/ (run `npm install` in server/)');
}
const NOT_STATEMENT = new Set(['BlockStatement', 'EmptyStatement', 'VariableDeclaration', 'SwitchCase']);
const FN_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod']);
/* the statements a node is worth on its own (its children are visited apart) */
function worth(path) {
  const n = path.node;
  if (n.type === 'VariableDeclarator') return 1;
  if (n.type === 'ClassProperty' || n.type === 'ClassPrivateProperty') return 1;
  if (n.type === 'ArrowFunctionExpression' && n.body.type !== 'BlockStatement') return 1;
  if (!path.isStatement() || NOT_STATEMENT.has(n.type)) return 0;
  /* `export function f`, `export const g = ...`: the declaration inside is the statement */
  if ((n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration') && n.declaration && n.declaration.type !== 'Identifier' && /Declaration$/.test(n.declaration.type)) return 0;
  if (n.type === 'ExpressionStatement' && n.expression.type === 'SequenceExpression') return n.expression.expressions.length;
  return 1;
}
function fnNameOf(path) {
  const n = path.node;
  if (n.id && n.id.name) return n.id.name;
  if ((n.type === 'ObjectMethod' || n.type === 'ClassMethod') && !n.computed && n.key) return String(n.key.name ?? n.key.value);
  if (n.type === 'ClassPrivateMethod' && n.key && n.key.id) return n.key.id.name;
  const p = path.parent;
  if (p.type === 'VariableDeclarator' && p.id.type === 'Identifier') return p.id.name;
  if (p.type === 'AssignmentExpression' && p.right === n) {
    if (p.left.type === 'Identifier') return p.left.name;
    if (p.left.type === 'MemberExpression' && !p.left.computed && p.left.property.type === 'Identifier') return p.left.property.name;
  }
  if ((p.type === 'ObjectProperty' || p.type === 'ClassProperty') && p.value === n && !p.computed && p.key) return String(p.key.name ?? p.key.value);
  return '(anonymous)';
}
/** One file's statements: { statements, functions: [{ name, statements, from }] } */
export function countStatements(src, file = 'x.jsx') {
  const { parse, traverse } = babel();
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true, sourceFilename: file });
  let total = 0;
  const fns = [];
  const open = [];   /* the functions the walk is inside: each gets every statement */
  traverse(ast, {
    enter(path) {
      const w = worth(path);
      if (w) { total += w; for (const f of open) f.statements += w; }
      if (FN_TYPES.has(path.node.type)) {
        const f = { name: fnNameOf(path), statements: 0, from: path.node.loc.start.line };
        /* an expression-bodied arrow's own expression is its one statement */
        if (path.node.type === 'ArrowFunctionExpression' && path.node.body.type !== 'BlockStatement') f.statements = 1;
        fns.push(f); open.push(f); path.node._wlOpen = f;
      }
    },
    exit(path) { if (path.node._wlOpen) { open.pop(); delete path.node._wlOpen; } },
  });
  return { statements: total, functions: fns };
}

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
  const codeLines = Object.create(null);
  const functions = [];
  const graph = new Map();
  for (const f of files) {
    const o = f.slice(4).replace(/\.jsx?$/, '.js');
    const code = byOut.get(o), map = byOut.get(o + '.map');
    if (code === undefined || map === undefined) throw new Error('esbuild gave no output for ' + f);
    const text = readFileSync(join(ROOT, f), 'utf8');
    const m = measureOutput(code, map, text);
    const st = countStatements(text, f);   /* v2.3.6520: what the lines hold */
    byFile[f] = st.statements;
    codeLines[f] = m.codeLines;
    for (const fn of st.functions) functions.push({ file: f, name: fn.name, statements: fn.statements, from: fn.from });
    graph.set(f, [...new Set(m.imports.map((s) => resolveImport(f, s, known)).filter(Boolean))]);
  }
  functions.sort((a, b) => b.statements - a.statements || (a.file + a.from < b.file + b.from ? -1 : 1));
  /* v2.3.6520: `files` and each function's `statements` are what the lines
     hold; `codeLines` the lines that hold a token, as they were counted */
  return { files: byFile, codeLines, functions, cycles: cycles(graph) };
}

/* ═══ v2.3.5201: CARD D'S SCRIPT, ONE RUN A `npm test` (card L PR 1) ═══
 *
 * Two guards read `state-census.mjs --json`: this file's fourth number and
 * the state ledger's (tools/guards/state-ledger.test.mjs).  Server CI's
 * runner starts each guard in a process of its own, side by side, and the
 * script takes about 18 s, so they share ONE run: its output is kept in the
 * system's temporary folder under a hash of everything the script reads
 * (below), and a lock file says a run is under way.  The first guard to want
 * it runs it; the other waits for the file.  Kept by content, never by time
 * or by run: the same inputs make the same rows (the script is
 * deterministic, its header says), and an edit anywhere it reads makes a new
 * hash, so a stale copy cannot be read.
 *
 * Returns { json, by } or, ONLY where the script cannot load its @babel
 * (it exits 3: neither the root's nor server/'s packages), null, and the
 * caller reads the page instead and says so.  Any other failure of the
 * script (a file it cannot parse, the flow not settling) throws: a red,
 * never a fallback to the page.
 */
export const CENSUS_SCRIPT = 'tools/dev/state-census.mjs';
/* what the script reads: every file under src/, and the names QA tools and
   tests use under tools/ and server/test/ (its `no-read (tests)` mark), the
   script and the map (tools/guards/lib/systems.mjs) among them.  A superset
   is harmless (a needless run); a gap would let a stale copy through, so
   these are the script's folders whole, by its own extensions. */
const CENSUS_READS = ['src', 'tools', join('server', 'test')];
const CENSUS_EXT = /\.(js|jsx|mjs|cjs|html)$/;
function censusKey() {
  const h = createHash('sha256');
  h.update(process.version + '\0');
  const visit = (rel) => {
    let names;
    try { names = readdirSync(join(ROOT, rel)).sort(); } catch { return; }
    for (const name of names) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const r = rel + '/' + name;
      const st = statSync(join(ROOT, r));
      if (st.isDirectory()) visit(r);
      else if (CENSUS_EXT.test(name)) { h.update(r + '\0'); h.update(readFileSync(join(ROOT, r))); h.update('\0'); }
    }
  };
  for (const d of CENSUS_READS) visit(d.split(sep).join('/'));
  return h.digest('hex').slice(0, 32);
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let _census;
export function stateCensus() {
  if (_census !== undefined) return _census;
  const dir = join(tmpdir(), 'brotown-state-census');
  mkdirSync(dir, { recursive: true });
  const key = censusKey();
  const out = join(dir, key + '.json');
  const lock = join(dir, key + '.lock');
  const t0 = Date.now();
  for (;;) {
    if (existsSync(out)) {
      _census = { json: JSON.parse(readFileSync(out, 'utf8')), by: CENSUS_SCRIPT + ' --json' };
      return _census;
    }
    let fd = null;
    try { fd = openSync(lock, 'wx'); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    if (fd !== null) {
      let r;
      try {
        if (existsSync(out)) continue;   /* another finished between the two looks */
        r = spawnSync(process.execPath, [join(ROOT, CENSUS_SCRIPT), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 });
        if (r.status === 0) {
          JSON.parse(r.stdout);   /* never keep a half-written run */
          const tmp = out + '.' + process.pid;
          writeFileSync(tmp, r.stdout);
          renameSync(tmp, out);
          /* an old run's copy goes after a day: the folder never grows */
          for (const n of readdirSync(dir)) {
            const p = join(dir, n);
            try { if (p !== out && Date.now() - statSync(p).mtimeMs > 864e5) unlinkSync(p); } catch { /* gone */ }
          }
        }
      } finally {
        closeSync(fd);
        try { unlinkSync(lock); } catch { /* gone */ }
      }
      if (r.status === 3) { _census = null; return null; }   /* cannot load here: never kept, it costs ~0.1 s */
      if (r.status !== 0) throw new Error(`${CENSUS_SCRIPT} --json failed (exit ${r.status}${r.signal ? ', ' + r.signal : ''}): ${String(r.stderr || r.error || '').slice(-800)}`);
      continue;
    }
    /* another guard is running it: wait for its file.  A lock older than
       five minutes is a run that died (the script takes ~18 s): take it. */
    let age;
    try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
    if (age > 300e3) { try { unlinkSync(lock); } catch { /* taken */ } continue; }
    if (Date.now() - t0 > 600e3) throw new Error(`waited ten minutes for ${CENSUS_SCRIPT} (its lock ${lock})`);
    sleep(200);
  }
}

/** Card D's count of writes to `S` from src/rendering/ (rule 2: its number,
    never a second one).  Read off the script (stateCensus(), one run a
    `npm test`) wherever it loads, and off the page it writes only where it
    cannot; `live` insists on the script (it throws where it cannot load). */
export function stateWritesFromRendering({ live = false } = {}) {
  const c = stateCensus();
  if (c) {
    let sets = 0, inside = 0;
    for (const r of c.json.fields) {
      sets += (r.sets || []).filter((s) => s.startsWith('rendering/')).length;
      inside += (r.inside || []).filter((s) => s.startsWith('rendering/')).length;
    }
    return { count: sets + inside, by: c.by, sets, inside };
  }
  if (live) throw new Error(`${CENSUS_SCRIPT} cannot load its @babel here (run \`npm install\` at the root or in server/)`);
  const page = readFileSync(join(ROOT, 'docs/plan/census/state.md'), 'utf8');
  const m = /^\| writes to `S` from `src\/rendering\/` \| [^|]* \| \*\*(\d+)\*\* \|/m.exec(page);
  if (!m) throw new Error('docs/plan/census/state.md has no "writes to `S` from `src/rendering/`" row in The counts');
  return { count: Number(m[1]), by: 'docs/plan/census/state.md (the page state-census.mjs writes: the script cannot load here)' };
}

/* ═══ THE LINES ═══  Each only falls.  Only the gatekeeper lowers one, in a
   PR of its own; nobody raises one.  Set 2026-11-14 at main d2e096a, by the
   rules above; taken again at main 0c83972 before this landed (card A's
   #1703 had added six code lines to wsClient.js meanwhile).  v2.3.5362
   (the gatekeeper, sitting 6, main f2351ab): entityRenderer.js 8968 -> 8961
   (card H's #1700 moved the page's side of the masked bake into
   bakeByAddress.js), gameDisplay.js 4270 -> 4268 (#1712: the fold into
   src/data/soundFold.js).  v2.3.5364 (the gatekeeper, sitting 8, main
   7593b4e): effectsRenderer.js 9871 -> 9870 (card P's #1745, the trees'
   numbers).  v2.3.5371 (the gatekeeper, sitting 14, main 1cce0b2):
   entityRenderer.js 8961 -> 8955 (card TF's #1812, the townsfolk's trades
   drawn from the `skills` set).  v2.3.5373 (the gatekeeper, sitting 16, main
   64bb498): wsClient.js 3296 -> 3039 and its setupWebSocket 3097 -> 2839
   (card K's #1829, the action door: the send lists became the door's rows
   in src/game/actions.js).  v2.3.5374 (the gatekeeper, sitting 17, main
   59469b2): BroTown.jsx 8371 -> 8370, its BroTown 7801 -> 7800, its
   (anonymous) 2133 -> 2132 and its gameLoop 1584 -> 1583 (card SK's #1782,
   the board's roll-off: the ride's per-frame rules moved into
   src/game/ride.js); entityRenderer.js 8955 -> 8953 (SK's #1782 and card
   O's #1836, the crowd's rung).  v2.3.5375 (the gatekeeper, sitting 18, main
   abff2ef): monsterCombat.js 1792 -> 1785 and its updateMonsterCombat
   1732 -> 1724 (card K's #1861: the combat and moving sends through act()).
   v2.3.5376 (the gatekeeper, sitting 19, main 29b1a0d): entityRenderer.js
   8953 -> 8941 (card P's #1868: the full set's test moved into
   beltHold.js).
   v2.3.6520 (card WL, at main 0aec648): THE LINES HOLD STATEMENTS (the
   header's rule above), so every number was set again, room for room (the
   orchestrator's rule, 2026-11-23): new line = today's statements + the
   room, the room = floor(old room in code lines x the file's own statements
   a code line), and never more than the old room's own number, so no line
   is lowered and none loosened in either measure (the two renderers' rooms
   are the gatekeeper's to take back).  The
   generic lines by the whole client's measure (154,347 statements on
   187,101 code lines): OTHER_FILE 1500 -> 1237, OTHER_FUNCTION 1000 -> 824.
   Three that hold more statements than their lines said, under the old
   generic lines and over the new, get lines of their own by the same rule,
   their room under 1500 / 1000 (PACKED_FILE, and FUNCTION's last row: three
   NEW rows, the gatekeeper's to lower): bodyRecolor.js 1010 code
   lines, 1449 statements; hitMaterialFx.js 1332, 1778; initPixiRenderer
   960, 967.  The old and the new, (line, count) -> (line, count):
     effectsRenderer.js (9870, 9425) -> (10150, 9705)
     entityRenderer.js  (8941, 7959) -> (8965, 7983)
     BroTown.jsx        (8370, 8332) -> (6916, 6885)
     gameSystems.js     (5622, 5622) -> (2105, 2105)
     gameDisplay.js     (4268, 4268) -> (3116, 3116)
     wsClient.js        (3039, 3034) -> (2598, 2594)
     gameEvents.js      (2639, 2621) -> (2182, 2168)
     monsterCombat.js   (1785, 1785) -> (1319, 1319)
     BroTown#BroTown             (7800, 7789) -> (6399, 6390)
     setupWebSocket              (2839, 2829) -> (2414, 2406)
     processGameEvent            (2500, 2474) -> (2036, 2015)
     BroTown#(anonymous)         (2132, 2129) -> (2023, 2021)
     wsClient#connect            (2055, 2048) -> (1656, 1651)
     updateMonsterCombat         (1724, 1722) -> (1273, 1272)
     BroTown#gameLoop            (1583, 1573) -> (1472, 1463)
     wsClient#onmessage          (1466, 1459) -> (1246, 1241)
     _updatePlayer               (1369, 1369) -> (1153, 1153)
     HeroExpanded                (1266, 1264) -> (478, 478)
     _updateMonsters             (1086, 1086) -> (996, 996)
     DungeonCreatorPanel         (1060, 1058) -> (229, 229)
     ExchangePanel               (1029, 1020) -> (270, 268)
     bodyRecolor.js    (1500 generic, 1010) -> (1939, 1449)
     hitMaterialFx.js  (1500 generic, 1332) -> (1946, 1778)
     initPixiRenderer  (1000 generic, 960)  -> (1007, 967)
   v2.3.6268 (the gatekeeper, sitting 56, main 0aec648; the shape review's
   part 4): entityRenderer.js 8941 -> 7984 and effectsRenderer.js 9870 ->
   9450 code lines, each that day's count (7959, 9425) plus 25.  By
   statements (v2.3.6520, the same rule, merged after it: the room 25 lines
   is 25 statements in both): effectsRenderer.js 9705 + 25 = 9730,
   entityRenderer.js 7983 + 25 = 8008 (the table above says the rooms before
   sitting 56). */
export const LINES = Object.freeze({
  /* a file's code lines.  These files have a line of their own, at their
     count on the day; every other file under src/ stays at or under
     OTHER_FILE (a new file too) */
  FILE: Object.freeze({
    'src/rendering/systems/effectsRenderer.js': 9730,
    'src/rendering/systems/entityRenderer.js': 8008,
    'src/ui/BroTown.jsx': 6916,
    'src/data/gameSystems.js': 2105,
    'src/data/gameDisplay.js': 3116,
    'src/networking/wsClient.js': 2598,
    'src/networking/gameEvents.js': 2182,
    'src/game/monsterCombat.js': 1319,
  }),
  /* v2.3.6520: files under the old generic line that hold more statements
     than the new one, at their own measure (the note above).  Not "big
     files" (lib/bigFileSuites.mjs reads FILE alone): a line, not a list */
  PACKED_FILE: Object.freeze({
    'src/rendering/bodyRecolor.js': 1939,
    'src/rendering/hitMaterialFx.js': 1946,
  }),
  OTHER_FILE: 1237,
  /* a function's code lines, by `file#name` (the largest of a name, where a
     file has two: `(anonymous)` is every unnamed one); every other function
     stays at or under OTHER_FUNCTION */
  FUNCTION: Object.freeze({
    'src/ui/BroTown.jsx#BroTown': 6399,
    'src/networking/wsClient.js#setupWebSocket': 2414,
    'src/networking/gameEvents.js#processGameEvent': 2036,
    'src/ui/BroTown.jsx#(anonymous)': 2023,
    'src/networking/wsClient.js#connect': 1656,
    'src/game/monsterCombat.js#updateMonsterCombat': 1273,
    'src/ui/BroTown.jsx#gameLoop': 1472,
    'src/networking/wsClient.js#onmessage': 1246,
    'src/rendering/systems/entityRenderer.js#_updatePlayer': 1153,
    'src/ui/mobile/sheet/HeroExpanded.jsx#HeroExpanded': 478,
    'src/rendering/systems/entityRenderer.js#_updateMonsters': 996,
    'src/ui/panels/DungeonCreatorPanel.jsx#DungeonCreatorPanel': 229,
    'src/ui/panels/buildings/ExchangePanel.jsx#ExchangePanel': 270,
    'src/rendering/pixiRenderer.js#initPixiRenderer': 1007,   /* v2.3.6520: under the old generic line, over the new */
  }),
  OTHER_FUNCTION: 824,
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

/* v2.3.6520 (card WL, after sitting 57's hold): THE CODE LINES STAY HELD TOO.
   By statements alone, one statement folded over forty lines (an object
   literal, a long chain) passed: the review's plant in monsterCombat.js
   went green, where the code-line guard on `main` failed it.  So both
   measures hold: a file or a function stays at or under its statement line
   (LINES) AND its code-line line (CODE_LINES).  These are `main`'s own
   code-line lines on the day the statements came in (sitting 56's two
   renderer lines included), not set again: they only fall, and only the
   gatekeeper lowers them, as LINES. */
export const CODE_LINES = Object.freeze({
  FILE: Object.freeze({
    'src/rendering/systems/effectsRenderer.js': 9450,
    'src/rendering/systems/entityRenderer.js': 7984,
    'src/ui/BroTown.jsx': 8370,
    'src/data/gameSystems.js': 5622,
    'src/data/gameDisplay.js': 4268,
    'src/networking/wsClient.js': 3039,
    'src/networking/gameEvents.js': 2639,
    'src/game/monsterCombat.js': 1785,
  }),
  OTHER_FILE: 1500,
  FUNCTION: Object.freeze({
    'src/ui/BroTown.jsx#BroTown': 7800,
    'src/networking/wsClient.js#setupWebSocket': 2839,
    'src/networking/gameEvents.js#processGameEvent': 2500,
    'src/ui/BroTown.jsx#(anonymous)': 2132,
    'src/networking/wsClient.js#connect': 2055,
    'src/game/monsterCombat.js#updateMonsterCombat': 1724,
    'src/ui/BroTown.jsx#gameLoop': 1583,
    'src/networking/wsClient.js#onmessage': 1466,
    'src/rendering/systems/entityRenderer.js#_updatePlayer': 1369,
    'src/ui/mobile/sheet/HeroExpanded.jsx#HeroExpanded': 1266,
    'src/rendering/systems/entityRenderer.js#_updateMonsters': 1086,
    'src/ui/panels/DungeonCreatorPanel.jsx#DungeonCreatorPanel': 1060,
    'src/ui/panels/buildings/ExchangePanel.jsx#ExchangePanel': 1029,
  }),
  OTHER_FUNCTION: 1000,
});
