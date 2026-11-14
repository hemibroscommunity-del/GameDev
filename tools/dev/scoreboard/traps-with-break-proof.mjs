/* ═══ v2.3.5320: TRAPS HELD BY A TEST WITH A BREAK PROOF (card V PR 1) ═══
 *
 * The grand plan's part 3 row "Traps held by a test that has a break proof"
 * (step 8.2: "the count that matters is traps held by a proof, not traps of
 * prose").  Found by its file name (tools/dev/scoreboard.mjs).
 *
 * It counts the traps of docs/TRAPS.md named by a line of this one form in
 * the HEADER (the first comment) of a guard (tools/guards/*.test.mjs) or a
 * suite (server/test/*.test.mjs), each on one line:
 *
 *   TRAPS §N (the rule | one case): what it holds. Break: <file>: <the change> -> FAIL (tried <date>).
 *
 * A line counts only when its § is a heading of docs/TRAPS.md, its <file>
 * is in the repository and its date is a date: a line with no break tried
 * is not a proof (the plan's rule 8).  A trap two tests hold counts once.
 * <file> is a path from the root, or a file's name alone (v2.3.5321): a
 * suite never names one of the big files by its folder (card B's
 * tests-by-system), so a break in `BroTown.jsx` is written by its name, and
 * counts when a file of that name is under src/, server/ or tools/.
 * tools/guards/README.md says the form.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* every file's name under the folders a break can be in */
function namesUnder(root, dirs) {
  const out = new Set();
  const walk = (d) => {
    let es = [];
    try { es = readdirSync(join(root, d), { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      if (e.isDirectory()) walk(d + '/' + e.name); else out.add(e.name);
    }
  };
  for (const d of dirs) walk(d);
  return out;
}

export const LINE = /TRAPS §(\d+) \((the rule|one case)\): .+? Break: (\S+?): .+ -> FAIL \(tried (\d{4}-\d{2}-\d{2})\)\./;

/** Every held line in the headers: [{ trap, kind, file, test, tried }]. */
export function heldLines({ root, read }) {
  const tests = [];
  for (const dir of ['tools/guards', 'server/test']) {
    for (const f of readdirSync(join(root, dir)).sort()) if (f.endsWith('.test.mjs')) tests.push(dir + '/' + f);
  }
  const headings = new Set([...read('docs/TRAPS.md').matchAll(/^## (?:§(\d+) |(\d+)\. )/gm)].map((m) => m[1] || m[2]));   /* `## 216. ...` and `## §43 — ...`, both forms the file has */
  let names = null;
  const isFile = (f) => (f.includes('/') ? existsSync(join(root, f)) : (names || (names = namesUnder(root, ['src', 'server', 'tools']))).has(f));
  const out = [];
  for (const test of tests) {
    const src = read(test);
    const a = src.indexOf('/*'), b = src.indexOf('*/');
    if (a < 0 || b < a || src.slice(0, a).trim() !== '') continue;   /* the header is the file's first thing */
    for (const l of src.slice(a, b).split('\n')) {
      const m = LINE.exec(l);
      if (!m || !headings.has(m[1]) || !isFile(m[3])) continue;
      out.push({ trap: Number(m[1]), kind: m[2], file: m[3], test, tried: m[4] });
    }
  }
  return out;
}

export default function ({ root, read }) {
  const lines = heldLines({ root, read });
  const traps = new Map();
  for (const l of lines) if (!traps.has(l.trap) || l.kind === 'the rule') traps.set(l.trap, l.kind);
  const rule = [...traps.values()].filter((k) => k === 'the rule').length;
  const tests = new Set(lines.map((l) => l.test)).size;
  return { say: String(traps.size), note: `${rule} holding the rule, ${traps.size - rule} one case; in ${tests} test file(s)` };
}
