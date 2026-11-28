/* ═══ the style sheets' small rule reader (comments out; at-rules' blocks walked) ═══
 * Written for tools/guards/ui3-weights.test.mjs (v2.3.6780, card UI3-kit); moved here unchanged
 * (v2.3.6841, card UI4 PR 2) so tools/guards/ui4-look.test.mjs reads the sheets the same way: the
 * server's test run installs no CSS parser (postcss is the client build's), so a guard there brings
 * its own.  Returns [{ sel, at, decls: [{ prop, value }] }] in the sheet's order. */
export function cssRules(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const block = (end, at) => {
    while (i < src.length) {
      let j = i;
      let depth = 0;
      while (j < src.length && !(depth === 0 && (src[j] === '{' || src[j] === '}'))) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      if (j >= src.length) { i = j; return; }
      if (src[j] === '}') { i = j + 1; return; }
      const sel = src.slice(i, j).trim().replace(/^[^{]*;\s*/, '');
      i = j + 1;
      if (/^@(media|supports|container|layer)/.test(sel)) { block('}', sel); continue; }
      if (/^@/.test(sel)) { let d = 1; while (i < src.length && d) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; } continue; }
      let k = i;
      let paren = 0;
      while (k < src.length && !(paren === 0 && src[k] === '}')) { if (src[k] === '(') paren++; else if (src[k] === ')') paren--; k++; }
      const body = src.slice(i, k);
      i = k + 1;
      const decls = [];
      let buf = '';
      let pd = 0;
      for (const ch of body) {
        if (ch === '(') pd++;
        if (ch === ')') pd--;
        if (ch === ';' && pd === 0) { decls.push(buf); buf = ''; } else buf += ch;
      }
      decls.push(buf);
      rules.push({ sel, at: at || '', decls: decls.map((d) => d.trim()).filter(Boolean).map((d) => { const x = d.indexOf(':'); return { prop: d.slice(0, x).trim().toLowerCase(), value: d.slice(x + 1).trim() }; }) });
    }
  };
  block(null, '');
  return rules;
}
