/* ═══ v2.3.5760: WHERE A FUNCTION AND A BLOCK BEGIN AND END (card V2 PR 1) ═══
 *
 * Card V2's guards ask questions of one function at a time: "is there an
 * await between this door's take and that put, in the same function?",
 * "does the handler that reaches a take read the life phase?".  esbuild's
 * output (lib/codeOnly.mjs) has no comments and maskCode (lib/maskCode.mjs)
 * blanks the strings, so the braces left are code; this file finds, in that
 * masked code:
 *
 *   spansOf(m)            -> { fns, blocks }
 *     fns:    [{ name, a, b }]  every function body: `name(...){` (a method,
 *             a `function name(...)`), `=>{` (name '=>'); a..b the braces
 *     blocks: [[a, b]]          every {...} (bodies, if/for blocks, objects)
 *   innerFn(fns, p)       -> the innermost function whose body holds p
 *   namedFn(fns, p)       -> its name, or the nearest named one around it
 *                            (not an arrow nor an anonymous function); '(top)' at the top
 *   blockAt(blocks, p)    -> the innermost block that holds p
 *   otherBranch(m, blocks, x, w) -> true when x and w sit in two branches
 *             of one if/else (or a try and its catch/finally): a block
 *             around x that does not hold w is followed by an else-chain
 *             (or catch, finally) one of whose blocks holds w
 *   closeOf(m, open)      -> the index of the bracket closing the one at open
 *
 * A guess without a parser, as maskCode's: an `if (...) {` is not a
 * function (its word is a keyword), a `name(...) {` is.  It imports nothing.
 */
const NOT_FN = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'await', 'new', 'in', 'of', 'do', 'else']);

export function closeOf(m, open) {
  let d = 0;
  for (let k = open; k < m.length; k++) {
    const c = m[k];
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') { if (--d === 0) return k; }
  }
  return m.length;
}

export function spansOf(m) {
  const pair = new Map();
  const st = [];
  const blocks = [];
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (c === '(' || c === '{' || c === '[') st.push(i);
    else if (c === ')' || c === '}' || c === ']') {
      const o = st.pop();
      if (o === undefined) continue;
      pair.set(o, i); pair.set(i, o);
      if (c === '}') blocks.push([o, i]);
    }
  }
  const fns = [];
  for (const [a, b] of blocks) {
    let k = a - 1;
    while (k >= 0 && /\s/.test(m[k])) k--;
    if (m[k] === '>' && m[k - 1] === '=') { fns.push({ name: '=>', a, b }); continue; }
    if (m[k] !== ')') continue;
    const o = pair.get(k);
    if (o === undefined) continue;
    let j = o - 1;
    while (j >= 0 && /\s/.test(m[j])) j--;
    const e = j + 1;
    while (j >= 0 && /[\w$]/.test(m[j])) j--;
    const w = m.slice(j + 1, e);
    if (!w || NOT_FN.has(w)) continue;
    fns.push({ name: w, a, b });
  }
  fns.sort((x, y) => x.a - y.a);
  blocks.sort((x, y) => x[0] - y[0]);
  return { fns, blocks };
}

export function innerFn(fns, p) {
  let best = null;
  for (const f of fns) if (f.a < p && p < f.b && (!best || f.a > best.a)) best = f;
  return best;
}

export function namedFn(fns, p) {
  let best = null;
  for (const f of fns) if (f.name !== '=>' && f.name !== 'function' && f.a < p && p < f.b && (!best || f.a > best.a)) best = f;
  return best ? best.name : '(top)';
}

export function blockAt(blocks, p) {
  let best = null;
  for (const bl of blocks) if (bl[0] < p && p < bl[1] && (!best || bl[0] > best[0])) best = bl;
  return best;
}

export function otherBranch(m, blocks, x, w) {
  const byStart = new Map(blocks.map((bl) => [bl[0], bl]));
  for (const [a, b] of blocks) {
    if (!(a < x && x < b) || (a < w && w < b)) continue;
    let k = b + 1;
    for (;;) {
      const t = /^\s*(?:else\s*(?:if\s*)?|catch\s*|finally\s*)/.exec(m.slice(k, k + 16));
      if (!t) break;
      const o = m.indexOf('{', k + t[0].length);
      const blk = o < 0 ? null : byStart.get(o);
      if (!blk) break;
      if (blk[0] < w && w < blk[1]) return true;
      k = blk[1] + 1;
    }
  }
  return false;
}
