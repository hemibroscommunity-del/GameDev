#!/usr/bin/env node
/* ═══ v2.3.5347: THE RENDERERS' CODE, COUNTED -- part 5 of docs/plan/census/M-tables.md ═══
 *
 * Card M's line 7 (moves nothing): each function and method of the two
 * renderers, its code lines, whether it reads `this`, the module state it
 * reaches, the in-file names it reads, the suites that read it; and the
 * order a later card's moves can take, leaf first.  The rules are
 * tools/guards/lib/renderCode.mjs's header.
 *
 *   node tools/dev/render-code-census.mjs           print the summary
 *   node tools/dev/render-code-census.mjs --write   rewrite part 5 of the page
 *
 * Part 5 is a census written at a commit (its line numbers move with every
 * change to a renderer): rewrite it before a card reads it.  The page's
 * parts 0 to 4 are the tables guard's (render-tables.test --write), which
 * keeps part 5 as it finds it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { scanRendererCode } from '../guards/lib/renderCode.mjs';
import { ROOT } from '../guards/lib/renderTables.mjs';

const PAGE = 'docs/plan/census/M-tables.md';
export const PART5 = '<!-- part 5: the code (tools/dev/render-code-census.mjs --write) -->';

const rows = await scanRendererCode();
const short = (f) => f.split('/').pop();
const isLeaf = (r) => r.kind === 'function' && !r.readsThis && r.state.length === 0;

/* leaf-first levels: 0 reads no in-file function; k reads only leaves below k */
const fnByName = new Map();
for (const r of rows) if (r.kind === 'function') fnByName.set(`${r.file}|${r.bare}`, r);
const level = new Map();
for (let k = 0, changed = true; changed; k++) {
  changed = false;
  for (const r of rows) {
    if (!isLeaf(r) || level.has(r)) continue;
    const deps = r.names.map((n) => fnByName.get(`${r.file}|${n}`)).filter(Boolean);
    if (deps.every((d) => d !== r && level.has(d) && level.get(d) < k)) { level.set(r, k); changed = true; }
  }
}

const sum = (a) => a.reduce((s, r) => s + r.code, 0);
const L = [];
L.push(PART5);
L.push('## 5. The code, counted (v2.3.5347)');
L.push('');
let at = '';
try { at = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* no git */ }
L.push(`Written by \`node tools/dev/render-code-census.mjs --write\`${at ? ` at ${at}` : ''}; the rules are`);
L.push('`tools/guards/lib/renderCode.mjs`\'s header. Moves nothing. A **leaf** is a');
L.push('top-level function that reads no `this` and reaches no module state; its');
L.push('**level** is 0 when it reads no other in-file function, else one more than');
L.push('the highest leaf it reads (a function reading a non-leaf has no level).');
L.push('');
L.push('| | functions | their code lines | leaves | leaf lines | with a level | methods | method lines |');
L.push('|---|---|---|---|---|---|---|---|');
for (const f of ['entityRenderer.js', 'effectsRenderer.js']) {
  const a = rows.filter((r) => short(r.file) === f);
  const fn = a.filter((r) => r.kind === 'function');
  const lv = a.filter(isLeaf);
  const me = a.filter((r) => r.kind !== 'function');
  L.push(`| ${f} | ${fn.length} | ${sum(fn)} | ${lv.length} | ${sum(lv)} | ${lv.filter((r) => level.has(r)).length} | ${me.length} | ${sum(me)} |`);
}
L.push('');
L.push('### The order of the moves: leaves, level by level (largest first in each)');
L.push('');
const maxLv = Math.max(-1, ...level.values());
for (let k = 0; k <= maxLv; k++) {
  const lv = rows.filter((r) => level.get(r) === k).sort((a, b) => b.code - a.code);
  L.push(`- level ${k}: ${lv.length} functions, ${sum(lv)} code lines`);
}
L.push('');
L.push('### Every function and method');
L.push('');
L.push('| name | file | line | code | this | level | module state | in-file names | suites |');
L.push('|---|---|---|---|---|---|---|---|---|');
const cell = (a) => (a.length ? a.map((x) => '`' + x + '`').join(', ') : '-');
for (const r of rows) {
  L.push(`| \`${r.name}\` | ${short(r.file)} | ${r.line} | ${r.code} | ${r.readsThis ? 'yes' : '-'} | ${level.has(r) ? level.get(r) : '-'} | ${cell(r.state)} | ${cell(r.names)} | ${r.suites.join(', ') || '-'} |`);
}
L.push('');
const part5 = L.join('\n');

if (process.argv.includes('--write')) {
  const path = join(ROOT, PAGE);
  const page = readFileSync(path, 'utf8');
  const i = page.indexOf(PART5);
  writeFileSync(path, (i >= 0 ? page.slice(0, i) : page.replace(/\n*$/, '\n\n')) + part5);
  console.log(`wrote part 5 of ${PAGE}: ${rows.length} functions and methods`);
} else {
  console.log(L.slice(0, 20).join('\n'));
}
