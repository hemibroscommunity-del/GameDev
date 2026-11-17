/* ═══ v2.3.5782: WHAT THE DRAWING LOADS, AND WHETHER THE LOADING SCREEN WAITS FOR IT (card U2 PR 3; CLAUDE.md §8 row "an animation or sprite") ═══
 *
 * CLAUDE.md §7, PRELOADING IS LAW: every animation and sprite loads behind
 * the loading screen (preloadWorldAnimations), a zone's own art behind its
 * overlay (preloadZoneAssets), and the Wheel's monsters as you walk
 * (wheelMonsterArt.js).  Nothing held a new loader to it.
 *
 * THE READING (a census, not a proof):
 *   - a LOAD is a call of `Assets.load(`, `loadTrackedStrip(`, `_fxLoad(` or
 *     `loadImage(` in a file under src/rendering/ (the drawing), in the code
 *     with its comments dropped (codeOnly.mjs);
 *   - a NAME GRAPH over src/: every function, method or arrow given a name,
 *     and the plain calls inside it (`name(`; a method call, `.name(`, is
 *     not followed: every `.then(` would reach every `then`).  From the ROOTS (preloadWorldAnimations,
 *     preloadZoneAssets, and every function of wheelMonsterArt.js) it walks
 *     the calls; a load inside a function it reaches is REACHED;
 *   - a loader that only pushes its promise on a list a reached function
 *     awaits counts as reached (POOLED: `_fxLoad`, whose list
 *     effectsAnimationsReady() awaits, as effectsRenderer.js says).
 * Names are matched across files, so two functions of one name are one; a
 * function passed by name, or called as a method, is not followed.  Both err
 * the same way the census allows: a load listed that may be fine, read by
 * whoever takes it off.
 */
import { codeOf } from './codeOnly.mjs';
import { maskCode, blockEnd } from './maskCode.mjs';

export const ROOTS = ['preloadWorldAnimations', 'preloadZoneAssets'];
export const WALK_FILE = 'src/rendering/wheelMonsterArt.js';
export const POOLED = Object.freeze({ _fxLoad: 'effectsAnimationsReady' });
const LOAD = /\b(Assets\.load|loadTrackedStrip|_fxLoad|loadImage)\(/g;
const DEF = /(?:\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(|\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b[^(]*\(|\([^()]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)|(?:^|[;{}\s,])(?:async\s+|static\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{)/g;
const KW = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'new', 'await', 'async', 'with']);

/* the `)` that closes the `(` at i */
function closeParen(m, i) {
  let depth = 0;
  for (; i < m.length; i++) {
    if (m[i] === '(') depth++;
    else if (m[i] === ')' && --depth === 0) return i;
  }
  return m.length;
}

/* where an arrow's expression body ends: the first `;` or `,` outside any
   bracket, or the bracket that closes around it (masked code: no strings) */
function exprEnd(m, i) {
  let depth = 0;
  for (; i < m.length; i++) {
    const c = m[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (depth === 0) return i; depth--; }
    else if ((c === ';' || c === ',') && depth === 0) return i;
  }
  return m.length;
}

export function preloadCensus() {
  const code = codeOf(['src']);
  const mask = new Map();
  for (const [f, c] of code) mask.set(f, maskCode(c));
  const defs = new Map();   /* name -> [{ file, start, end }] */
  const loads = [];
  for (const [file, m] of mask) {
    for (const d of m.matchAll(DEF)) {
      const name = d[1] || d[2] || d[3];
      if (!name || KW.has(name)) continue;
      /* the body: past the parameters (a `function` or a method), or past `=>` */
      let i = d.index + d[0].length - 1;
      if (m[i] === '(') i = closeParen(m, i) + 1;
      else if (m[i] !== '{') i++;
      while (i < m.length && /\s/.test(m[i])) i++;
      if (m.startsWith('=>', i)) { i += 2; while (i < m.length && /\s/.test(m[i])) i++; }
      const start = i;
      const end = m[i] === '{' ? blockEnd(m, i + 1) : exprEnd(m, i);
      if (!defs.has(name)) defs.set(name, []);
      defs.get(name).push({ file, start, end });
    }
    if (!file.startsWith('src/rendering/')) continue;
    for (const l of m.matchAll(LOAD)) {
      if (/function\s*$/.test(m.slice(Math.max(0, l.index - 12), l.index))) continue;   /* the loader's own definition */
      loads.push({ file, at: l.index, how: l[1], text: code.get(file).slice(l.index, l.index + 70) });
    }
  }
  const seen = new Set();
  const spans = [];
  const queue = [...ROOTS];
  for (const [n, ds] of defs) if (ds.some((d) => d.file === WALK_FILE)) queue.push(n);
  while (queue.length) {
    const n = queue.pop();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const d of defs.get(n) || []) {
      spans.push(d);
      for (const c of mask.get(d.file).slice(d.start, d.end).matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) if (defs.has(c[1]) && !seen.has(c[1])) queue.push(c[1]);
    }
  }
  const reached = (l) => (Object.hasOwn(POOLED, l.how) && seen.has(POOLED[l.how]))
    || spans.some((d) => d.file === l.file && d.start <= l.at && l.at < d.end);
  for (const l of loads) l.reached = reached(l);
  return { loads, bare: loads.filter((l) => !l.reached), roots: ROOTS.filter((r) => seen.has(r) && defs.has(r)), names: seen.size };
}
