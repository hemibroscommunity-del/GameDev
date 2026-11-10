// Collects every sweep agent's findings: the .json when it parses, else the .md blocks. Prints a compact table.
// usage: node collect.mjs [--verdict needs-thought,watch] [--slices S1,S2] [--full]
import fs from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm/out';
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const wantV = opt('--verdict')?.split(','), wantS = opt('--slices')?.split(','), full = args.includes('--full');
const slices = [...new Set(fs.readdirSync(OUT).filter(f => /^[A-Z]\d+\.(md|json)$/.test(f)).map(f => f.split('.')[0]))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const rows = [], notes = [];
function fromMd(sl) {
  const p = `${OUT}/${sl}.md`; if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  return txt.split(/^## /m).slice(1).map(b => {
    const head = b.split('\n')[0];
    const m = head.match(/^(\S+)\s*[·\-—:]\s*(.*)$/) || [null, head.trim(), ''];
    const field = k => (b.match(new RegExp(`^- ${k}:\\s*(.*)$`, 'mi')) || [])[1] || '';
    return { id: m[1], title: m[2], area: field('Area'), verdict: field('Verdict').split(/[\s(]/)[0], oneLine: field('Why'), topConcern: '', modes: [...new Set([...b.matchAll(/^\s*- \[([a-z-]+)\]/gmi)].map(x => x[1].toLowerCase()))], confidence: '', files: field('Key files').split(/,\s*/).slice(0, 4), src: 'md' };
  });
}
for (const sl of slices) {
  if (wantS && !wantS.includes(sl)) continue;
  let got = null; const jp = `${OUT}/${sl}.json`;
  if (fs.existsSync(jp)) { try { const j = JSON.parse(fs.readFileSync(jp, 'utf8')); got = (Array.isArray(j) ? j : j.machines || []).map(r => ({ ...r, src: 'json' })); } catch (e) { notes.push(`${sl}.json does not parse (${e.message.slice(0, 60)}); using .md`); } }
  const md = fromMd(sl);
  if (!got) { got = md; if (md.length) notes.push(`${sl}: no usable .json, ${md.length} blocks from .md`); }
  else if (md.length && md.length !== got.length) notes.push(`${sl}: .json has ${got.length}, .md has ${md.length}`);
  rows.push(...got);
}
const sel = rows.filter(r => !wantV || wantV.includes(String(r.verdict).toLowerCase()));
const count = (k) => sel.reduce((a, r) => (a[r[k]] = (a[r[k]] || 0) + 1, a), {});
console.log(`slices with output: ${slices.length}; machines: ${rows.length}; shown: ${sel.length}`);
console.log('by verdict', JSON.stringify(count('verdict')), '\nby area', JSON.stringify(count('area')));
for (const n of notes) console.log('NOTE', n);
for (const r of sel) {
  const files = (r.files || []).slice(0, full ? 6 : 3).join(', ');
  console.log(`\n[${r.id}] (${r.verdict}; ${r.area}; ${(r.modes || []).join('/')}${r.confidence ? '; ' + r.confidence : ''}) ${r.title}\n   ${r.oneLine || ''}${r.topConcern ? '\n   ! ' + r.topConcern : ''}\n   ${files}${full && r.linked?.length ? '\n   linked: ' + r.linked.join('; ') : ''}`);
}
