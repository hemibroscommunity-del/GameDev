// usage (from the worktree's server/): node batch.mjs <plants.json>
// plants.json: [{ id, suites: [..], env?: {..}, show?: n, edits: [{ file, anchor, text, before? } | { file, replace: [from, to] }] }]
//   (a plant with file/anchor/text at its top is one edit)
// For each plant: make its edits (insert `text` as a new line after/before the first line containing `anchor`, or
// replace the first occurrence of `from`), check each .js still parses, run each suite alone
// (`node test/run.mjs <suite> --jobs=1`), print RED/GREEN + the first FAIL lines, restore every file.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const ROOT = process.cwd().replace(/\/server$/, '') + '/';
const plants = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const pl of plants) {
  const edits = pl.edits || [{ file: pl.file, anchor: pl.anchor, text: pl.text, before: pl.before, replace: pl.replace }];
  const orig = new Map();
  let okPlant = true;
  for (const e of edits) {
    const p = ROOT + e.file;
    if (!orig.has(p)) orig.set(p, readFileSync(p, 'utf8'));
    const cur = readFileSync(p, 'utf8');
    if (e.replace) {
      const at = cur.indexOf(e.replace[0]);
      if (at < 0) { console.log('[' + pl.id + '] PLANT FAILED: text to replace not found in ' + e.file); okPlant = false; break; }
      writeFileSync(p, cur.slice(0, at) + e.replace[1] + cur.slice(at + e.replace[0].length));
      console.log('[' + pl.id + '] ' + e.file + ':' + cur.slice(0, at).split('\n').length + '  REPLACED `' + e.replace[0].slice(0, 90) + '` WITH `' + e.replace[1].slice(0, 90) + '`');
    } else {
      const lines = cur.split('\n');
      const i = lines.findIndex((l) => l.includes(e.anchor));
      if (i < 0) { console.log('[' + pl.id + '] PLANT FAILED: anchor not found in ' + e.file + ': ' + e.anchor); okPlant = false; break; }
      lines.splice(i + (e.before ? 0 : 1), 0, e.text);
      writeFileSync(p, lines.join('\n'));
      console.log('[' + pl.id + '] ' + e.file + ':' + (i + (e.before ? 1 : 2)) + '  ' + e.text.trim());
    }
    if (/\.m?js$/.test(e.file)) {
      const chk = spawnSync('node', ['--check', p], { encoding: 'utf8' });
      if (chk.status !== 0) console.log('     !! SYNTAX ERROR in plant: ' + (chk.stderr || '').split('\n').slice(0, 5).join(' | ').slice(0, 300));
    }
  }
  try {
    if (okPlant) for (const s of pl.suites) {
      const t0 = Date.now();
      const r = spawnSync('node', ['test/run.mjs', s, '--jobs=1'], { cwd: ROOT + 'server', encoding: 'utf8', timeout: 400000, env: { ...process.env, ...(pl.env || {}) } });
      const out = (r.stdout || '') + (r.stderr || '');
      const fails = out.split('\n').filter((l) => /FAIL |not ok|Error:|✗/.test(l)).slice(0, pl.show || 3);
      const ran = /(\d+) suites?,/.exec(out);
      console.log('     ' + s + ': ' + (r.status === 0 ? 'GREEN  <-- NOT SEEN' : 'RED') + '  (' + (Date.now() - t0) + ' ms' + (ran ? ', ' + ran[1] + ' suite(s) ran' : ', ?? no suite count') + ')');
      for (const f of fails) console.log('        ' + f.trim().slice(0, 260));
    }
  } finally {
    for (const [p, s] of orig) writeFileSync(p, s);
  }
}
console.log('all files restored');
