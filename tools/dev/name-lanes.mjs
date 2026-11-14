#!/usr/bin/env node
/* ═══ v2.3.5223: EVERY PHONE SCENARIO NAMES ITS LANE (card O PR 3) ═══
 *
 * Writes `export const lane = 'full';` into every tools/qa/mp/mp-*.mjs that
 * names no lane, after its imports (or its header, with none).  `full` is
 * today's drawing, exactly (src/game/drawLanes.js, docs/LANES.md); a scenario
 * that plays another lane names it by hand.  Run twice, it changes nothing
 * the second time.  The gatekeeper runs it on a sitting's rehearsal tip, so
 * a scenario another PR of the sitting adds gets its line there
 * (tools/guards/scenario-lanes.test.mjs fails one without).
 *
 *   node tools/dev/name-lanes.mjs            write the line where it is missing
 *   node tools/dev/name-lanes.mjs --check    only say which files lack it (exit 1 if any)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'tools/qa/mp');
export const LINE = "export const lane = 'full';";
/* a file names its lane: an exported `lane`, however written */
export const NAMES_LANE = /^export\s+const\s+lane\s*=/m;

/** The file's text with the line added after its imports (or its header), or
 *  the text unchanged where it names a lane already. */
export function withLaneLine(text) {
  if (NAMES_LANE.test(text)) return text;
  const lines = text.split('\n');
  let at = -1;          /* the last line of the last top-level import */
  let inImport = false;
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (inImport) { if (/from\s+['"][^'"]+['"]\s*;?\s*(\/[*/].*)?$/.test(l) || /;\s*(\/[*/].*)?$/.test(l)) { inImport = false; at = i; } continue; }
    if (inComment) { if (l.includes('*/')) inComment = false; continue; }
    if (/^import[\s{*'"]/.test(l)) {
      if (/from\s+['"][^'"]+['"]\s*;?/.test(l) || /^import\s+['"][^'"]+['"]\s*;?/.test(l)) at = i;
      else inImport = true;
      continue;
    }
    if (/^\s*\/\*/.test(l) && !l.includes('*/')) { inComment = true; continue; }
    if (/^\s*(\/\/.*|\/\*.*\*\/\s*)?$/.test(l) || /^#!/.test(l)) continue;   /* blank, a comment, a shebang */
    break;   /* the first line of code that is not an import */
  }
  if (at < 0) {
    /* no imports: after the header comment (the file's first lines of comment) */
    let h = -1, inC = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (inC) { if (l.includes('*/')) { inC = false; h = i; } continue; }
      if (/^#!/.test(l) || /^\s*\/\//.test(l)) { h = i; continue; }
      if (/^\s*\/\*/.test(l)) { if (l.includes('*/')) h = i; else inC = true; continue; }
      break;
    }
    at = h;
  }
  lines.splice(at + 1, 0, LINE);
  return lines.join('\n');
}

export function scenarioFiles() {
  return readdirSync(DIR).filter((f) => /^mp-.+\.mjs$/.test(f)).sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const missing = [];
  for (const f of scenarioFiles()) {
    const p = join(DIR, f);
    const was = readFileSync(p, 'utf8');
    const now = withLaneLine(was);
    if (now === was) continue;
    missing.push(f);
    if (!check) writeFileSync(p, now);
  }
  if (check) {
    console.log(missing.length ? `${missing.length} scenario file(s) name no lane:\n  ${missing.join('\n  ')}` : 'every scenario file names its lane');
    process.exit(missing.length ? 1 : 0);
  }
  console.log(missing.length ? `wrote the lane's line into ${missing.length} file(s)` : 'every scenario file names its lane already: nothing written');
}
