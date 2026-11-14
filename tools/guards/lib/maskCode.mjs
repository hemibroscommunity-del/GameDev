/* ═══ v2.3.5320: CODE WITH ITS STRINGS BLANKED, AND A NAME'S BLOCK (card V PR 1) ═══
 *
 * A guard that follows a name through the code (TRAPS §2: every field
 * written on a player's `ps`) needs two things esbuild's output does not
 * give: where a `const` ends (its block), and code with no string, template
 * or regular expression in it, so a brace or a `ps.x=` inside a string is
 * never read as code.  Both, from the comment-free output of codeOnly.mjs
 * (minified whitespace, so `ps.x=1`, never `ps.x = 1`):
 *
 *   maskCode(code)          -> the same length, every character inside a
 *                              string, a template's text or a regular
 *                              expression a space (the quotes stay; a
 *                              template's `${...}` stays code)
 *   blockEnd(masked, i)     -> the index of the `}` that closes the block
 *                              the code at i sits in (the length at the top)
 *
 * A `/` starts a regular expression after an operator, a bracket, a comma or
 * a keyword (`return`, `typeof`...), and is a division after a name, a
 * number or a closing bracket: the one guess a scanner without a parser
 * makes, and the minified output's.  It imports nothing.
 */
const RE_AFTER_WORD = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw', 'new', 'else', 'do', 'instanceof', 'yield', 'await']);

export function maskCode(code) {
  const out = code.split('');
  const n = code.length;
  /* the stack of template depths: each entry is the brace count inside a `${` */
  const tmpl = [];
  let i = 0;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const prevSig = (k) => { k--; while (k >= 0 && /\s/.test(code[k])) k--; return k; };
  const regexMayStart = (k) => {
    const p = prevSig(k);
    if (p < 0) return true;
    const c = code[p];
    if (/[\w$]/.test(c)) {
      let s = p; while (s > 0 && /[\w$]/.test(code[s - 1])) s--;
      return RE_AFTER_WORD.has(code.slice(s, p + 1));
    }
    return !(c === ')' || c === ']' || c === '}');
  };
  /* read a template's text from i (just past the backtick or the `}` that
     closed a `${`), blanking it, up to its end or its next `${` */
  const templateText = () => {
    const a = i;
    while (i < n) {
      const c = code[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { blank(a, i); i++; return; }
      if (c === '$' && code[i + 1] === '{') { blank(a, i); i += 2; tmpl.push(0); return; }
      i++;
    }
    blank(a, n);
  };
  while (i < n) {
    const c = code[i];
    if (c === '"' || c === "'") {
      const a = ++i;
      while (i < n && code[i] !== c) { if (code[i] === '\\') i++; i++; }
      blank(a, i); i++;
      continue;
    }
    if (c === '`') { i++; templateText(); continue; }
    if (tmpl.length && c === '{') { tmpl[tmpl.length - 1]++; i++; continue; }
    if (tmpl.length && c === '}') {
      if (tmpl[tmpl.length - 1] === 0) { tmpl.pop(); i++; templateText(); continue; }
      tmpl[tmpl.length - 1]--; i++; continue;
    }
    if (c === '/' && regexMayStart(i)) {
      const a = ++i;
      let cls = false;
      while (i < n) {
        const d = code[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '[') cls = true; else if (d === ']') cls = false;
        else if (d === '/' && !cls) break;
        else if (d === '\n') break;
        i++;
      }
      blank(a, i); i++;
      continue;
    }
    i++;
  }
  return out.join('');
}

/** The index of the `}` closing the block the masked code at i is in. */
export function blockEnd(masked, i) {
  let depth = 0;
  for (let k = i; k < masked.length; k++) {
    const c = masked[k];
    if (c === '{') depth++;
    else if (c === '}') { if (--depth < 0) return k; }
  }
  return masked.length;
}
