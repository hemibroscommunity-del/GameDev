/* ═══ v2.3.5781: THE CAP GATE RULE, ONE COPY (card U2 PR 2; CLAUDE.md §8 row "a server behaviour") ═══
 *
 * Moved here from tools/dev/precheck.mjs's check 12 (`cap-registry`,
 * v2.3.2440), word for word, so precheck and the guard
 * (tools/guards/cap-gates.test.mjs) run the same rule: every
 * `_serverCaps.<name>` the page reads (anywhere under src/) is in
 * CAP_GATES (src/ui/panels/DevPanel.jsx).  The test panel's "This worker"
 * section walks CAP_GATES to say which systems a worker did NOT claim; a
 * cap missing from it reads as "fine" forever.
 *
 * capGateRows(root) gives precheck's rows ({ level, check, msg }), exactly as
 * it printed them, and the facts the guard reads.  Node only: no imports
 * outside node: (the guards run on GitHub with server/'s packages only).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

export function capGateRows(root = ROOT) {
  const read = (f) => readFileSync(join(root, f), 'utf8');
  const rows = [];
  const add = (level, check, msg) => rows.push({ level, check, msg });
  let gates = null;
  const used = new Map(); // cap -> first "file:line"
  let missing = [];
  try {
    const panel = read('src/ui/panels/DevPanel.jsx');
    const m = panel.match(/const CAP_GATES = \[([\s\S]*?)\];/);
    if (m) gates = new Set([...m[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]));
  } catch { /* handled below */ }
  if (!gates) {
    add('WARN', 'cap-registry', 'CAP_GATES not found in src/ui/panels/DevPanel.jsx — cap registry check skipped');
  } else {
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const rel = dir + '/' + e.name;
        if (e.isDirectory()) walk(rel);
        else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(rel);
      }
    };
    walk('src');
    for (const f of files) {
      const t = read(f);
      for (const mm of t.matchAll(/_serverCaps\s*\.\s*([A-Za-z0-9_]+)/g)) {
        if (!used.has(mm[1])) used.set(mm[1], `${f}:${lineOf(t, mm.index)}`);
      }
    }
    missing = [...used.keys()].filter((c) => !gates.has(c)).sort();
    if (!missing.length) {
      add('PASS', 'cap-registry', `all ${used.size} capability gate(s) the client reads are registered in CAP_GATES (${gates.size} listed)`);
    } else {
      add('FAIL', 'cap-registry',
        `${missing.length} capability gate(s) read by the client are missing from CAP_GATES in src/ui/panels/DevPanel.jsx —\n`
        + '    the test panel would report "all clear" while these are switched off. Add them (same PR):\n'
        + missing.map((c) => `    ${c}  (${used.get(c)})`).join('\n'));
    }
  }
  return { rows, gates, used, missing };
}
