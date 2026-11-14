#!/usr/bin/env node
/* v2.3.5242: THE MEASURE -- MB HELD AT THE MEMORY CHECK'S FIGHT, BY FAMILY
 * (grand plan step 9.1, part two; card P, PR 2; docs/specs/asset-door.md part 2).
 *
 * Usage:
 *   QA_MB_ROWS=1 node tools/qa/mp/run.mjs membudget      (three times: copy
 *     tools/qa/mp/out/membudget.json aside after each run)
 *   node tools/assets/fightmb.mjs a.json b.json c.json            print the census
 *   node tools/assets/fightmb.mjs a.json b.json c.json --write    write docs/plan/census/assets.md
 *
 * ONE RULER: the memory check's own trip (mp-membudget: a phone, 390 x 844 at
 * dpr 3, BroTown to a fight at the Flame Fields and home, three times), read
 * its own way (memprobe.mjs: two forced collections), at its three fights.
 * With QA_MB_ROWS=1 each fight stop carries every row of what the page holds
 * (memprobe.mjs __memRows): each texture on the chip, each picture in the
 * page, the colour numbers kept, each decoded sound by its file, the atlas.
 *
 * A row is matched to its family by its label's path: `/sprites/x.png` is
 * `public/sprites/x.png`, a file of tools/assets/shipped.json, and that row's
 * family.  A label that is not a file in reach is a texture MADE IN PLAY (a
 * canvas, a render texture, a ground piece, a look atlas page): `in play:
 * <label>`, its digits folded to `#` so a hundred pieces read as one line,
 * and `in play: unnamed` with no label.  Those are the renderers' bakes:
 * listed for reading, never a family, never the door's to change.
 *
 * A family's MB at the fight is the most it held at any one fight stop of any
 * run (chip + page + numbers + sound at that stop), the census's order: the
 * backlog's (card P, PR 6 on).  Bytes on disk are not the measure: the .p256
 * twins taught it (docs/specs/pictures-256.md).
 *
 * It reads; it writes only the census, with --write.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ASSET_FAMILIES } from './families.mjs';
import { ROOT, readShipped, withinBar } from './shipped.mjs';

export const CENSUS = 'docs/plan/census/assets.md';

/* While card H is not done, card P touches none of these files (card P,
   "Files P waits on"): a backlog family whose loader is one of them, or
   whose draw path goes through one, goes after H. */
export const WAITS_ON_H = [
  'src/rendering/stripRead.js', 'src/rendering/png8Worker.js', 'src/rendering/stripPack.js',
  'src/rendering/picsNumbers.js', 'src/rendering/zoneTextures.js', 'src/data/soundFold.js',
  'src/rendering/picsOnce.js', 'src/rendering/bodyBake.js', 'src/rendering/bodyBakeWorker.js',
  'src/rendering/maskedBakeWorker.js', 'src/rendering/systems/entityRenderer.js',
  'src/rendering/characterPortrait.js', 'src/rendering/gearSheets.js',
];
/* the draw paths whose module is one of H's files: a strip goes through
   zoneTextures.js and stripRead.js; a sound is folded by soundFold.js */
const DRAW_WAITS = { strip: 'zoneTextures.js, stripRead.js', sfx: 'soundFold.js (the fold)' };

const mb = (n) => (n == null ? '' : (Math.round(n * 100) / 100).toFixed(2));

/** every in-reach path -> its family, from the record */
function familyByPath() {
  const rec = readShipped();
  if (!rec) throw new Error('tools/assets/shipped.json is not written: node tools/assets/shipped.mjs --write');
  return { rec, of: new Map(rec.rows.map((r) => [r.path, r.family])) };
}

/** a row's label -> its family's name, or `in play: <label>`.  A label
 *  names a file in reach in two forms: its address (`/sprites/x.png`), and
 *  a look sheet's texture, `bt-look:<set>/<sheet>` (`bt-look:<sheet>` for
 *  the body set: src/rendering/lookPalette.js), which is the file
 *  public/sprites/look/<set>/<sheet>.png drawn as it is.  A look atlas page
 *  (`bt-look:page/...`) holds many sheets laid out in play: made in play. */
export function keyOf(label, of) {
  const l = String(label || '').trim();
  const look = /^bt-look:(?!page\/)(.+)$/.exec(l);
  if (look) {
    const f = of.get(`public/sprites/look/${look[1]}.png`);
    if (f) return f;
  }
  if (l.startsWith('/')) {
    let path = 'public' + l;
    try { path = 'public' + decodeURIComponent(l); } catch (e) { /* not an address */ }
    const f = of.get(path);
    if (f) return f;
  }
  /* a picture made from bytes in play has a random name: one line each kind */
  if (/^blob:/.test(l)) return 'in play: blob: (a picture made in play from bytes)';
  if (/^data:/.test(l)) return 'in play: data: (a picture made in play from a data address)';
  const folded = l.replace(/^https?:\/\/[^/]+/, '').replace(/\d+/g, '#').slice(0, 80);
  return 'in play: ' + (folded || 'unnamed');
}

/** one fight stop's rows -> { key: { chip, page, numbers, sound, rows:Set } } */
function perStop(rows, of) {
  const out = new Map();
  const at = (k) => {
    let e = out.get(k);
    if (!e) { e = { chip: 0, page: 0, numbers: 0, sound: 0, rows: new Set() }; out.set(k, e); }
    return e;
  };
  for (const [label, m, kind, row] of rows.chip || []) {
    const e = at(keyOf(label, of));
    e.chip += m || 0;
    if (row != null) e.rows.add(row);
    /* `in play: unnamed` stays one line (the card), with its kinds beside it */
    if (!String(label || '').trim()) (e.kinds || (e.kinds = {}))[kind || '?'] = ((e.kinds || {})[kind || '?'] || 0) + (m || 0);
  }
  for (const [label, m] of rows.page || []) at(keyOf(label, of)).page += m || 0;
  for (const [label, m, row] of rows.numbers || []) { const e = at(keyOf(label, of)); e.numbers += m || 0; if (row != null) e.rows.add(row); }
  for (const [label, m] of rows.sound || []) at(keyOf(label, of)).sound += m || 0;
  return out;
}

const heldOf = (e) => e.chip + e.page + e.numbers + e.sound;

/** the runs -> the census rows (highest of every fight stop), and the stops' sums */
export function census(runs) {
  const { rec, of } = familyByPath();
  const best = new Map();
  const stops = [];
  runs.forEach((run, ri) => {
    for (const s of run.stops || []) {
      if (!s.rows) continue;
      const per = perStop(s.rows, of);
      const sum = { chip: 0, page: 0, numbers: 0, sound: 0 };
      for (const e of per.values()) for (const k of Object.keys(sum)) sum[k] += e[k];
      stops.push({ run: ri + 1, label: s.label, lines: { gpu: s.gpu, cache: s.cache, sound: s.decodedMB, soundHeld: s.rows.soundTotal ? s.rows.soundTotal.mb : null },
        sum, palette: s.rows.palette, picNumbers: s.rows.picNumbers });
      for (const [k, e] of per) {
        const b = best.get(k);
        if (!b || heldOf(e) > heldOf(b.e)) best.set(k, { e, run: ri + 1, stop: s.label });
      }
    }
  });
  /* the files, disk MB and the bar, from the record */
  const disk = new Map();
  const barOf = new Map(ASSET_FAMILIES.map((f) => [f.name, f.bar]));
  for (const r of rec.rows) {
    const d = disk.get(r.family) || { files: 0, bytes: 0, over: 0 };
    d.files++; d.bytes += r.bytes;
    if (barOf.get(r.family) && withinBar(r.path) === false) d.over++;
    disk.set(r.family, d);
  }
  const fams = ASSET_FAMILIES.map((f) => {
    const b = best.get(f.name);
    const e = b ? b.e : { chip: 0, page: 0, numbers: 0, sound: 0, rows: new Set() };
    const d = disk.get(f.name) || { files: 0, bytes: 0, over: 0 };
    const loaders = [].concat(f.loader || []);
    const waits = loaders.filter((l) => WAITS_ON_H.includes(l)).map((l) => l.split('/').pop());
    if (DRAW_WAITS[f.draw]) waits.push(DRAW_WAITS[f.draw]);
    /* whether a backlog PR may take it: never a data file (the door never
       rewrites one: the look sheets are colour NUMBERS), a made one only by
       its own tool, and one whose loader is card H's only after H */
    const takes = f.kind === 'data' ? 'no: data' : waits.length ? 'after H' : f.kind === 'made' ? 'yes, by its tool' : 'yes';
    return { name: f.name, kind: f.kind, draw: f.draw, files: d.files, diskMB: d.bytes / 1048576, over: d.over,
      held: heldOf(e), chip: e.chip, page: e.page, numbers: e.numbers, sound: e.sound, rows: e.rows.size,
      waits: waits.join(', '), takes, at: b ? `run ${b.run}` : '' };
  });
  fams.sort((a, b) => b.held - a.held || b.diskMB - a.diskMB);
  const inPlay = [...best.entries()].filter(([k]) => k.startsWith('in play: '))
    .map(([k, b]) => ({ name: k, held: heldOf(b.e), chip: b.e.chip, page: b.e.page, numbers: b.e.numbers, sound: b.e.sound, rows: b.e.rows.size,
      kinds: b.e.kinds ? Object.entries(b.e.kinds).sort((x, y) => y[1] - x[1]).map(([kk, v]) => `${kk} ${mb(v)}`).join(', ') : '' }))
    .sort((a, b) => b.held - a.held);
  return { fams, inPlay, stops };
}

function text(c, files) {
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const L = [];
  L.push('# The asset census: MB held at the memory check\'s fight, by family (v2.3.5242)');
  L.push('');
  L.push('Card P, PR 2 (grand plan step 9.1, part two); `docs/specs/asset-door.md`');
  L.push('part 2 says how it is read. Written by `node tools/assets/fightmb.mjs <runs> --write`,');
  L.push(`never by hand, from ${files.length} runs of \`QA_MB_ROWS=1 node tools/qa/mp/run.mjs membudget\` at \`${head}\`.`);
  L.push('');
  L.push('**MB at the fight** is the most a family held at any one fight stop of any');
  L.push('run: on the graphics chip, the picture the page keeps, the colour numbers the');
  L.push('page keeps, and decoded sound (BT_AUDIO\'s own count, by file). **Atlas** is');
  L.push('the rows of the palette atlas its pictures took there. **Over bar** counts its');
  L.push('files the game\'s reader (`png8Decode.js`) does not read. **Waits on H**: its');
  L.push('loader is one of the files card P leaves alone while card H runs.');
  L.push('**Backlog**: whether a backlog PR may take it: never a data family (the door');
  L.push('never rewrites data: the look sheets are colour NUMBERS), a made family only');
  L.push('by changing its own tool, and a family waiting on card H only after H.');
  L.push('');
  L.push('This is the backlog\'s order (card P, PR 6 on), most MB held first. The backlog');
  L.push('stops at the first family under 1 MB (the line below the table\'s marker).');
  L.push('');
  L.push('| family | kind | draw | files | MB on disk | MB at the fight | chip | page | numbers | sound | atlas | over bar | backlog | waits on H |');
  L.push('|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|---|');
  let marked = false;
  for (const f of c.fams.filter((x) => x.held > 0)) {
    if (!marked && f.held < 1) {
      L.push('| **under 1 MB at the fight: the backlog stops here** | | | | | | | | | | | | | |');
      marked = true;
    }
    L.push(`| \`${f.name}\` | ${f.kind} | ${f.draw} | ${f.files} | ${mb(f.diskMB)} | **${mb(f.held)}** | ${mb(f.chip)} | ${mb(f.page)} | ${mb(f.numbers)} | ${mb(f.sound)} | ${f.rows || ''} | ${f.over || ''} | ${f.takes} | ${f.waits} |`);
  }
  L.push('');
  const zero = c.fams.filter((x) => x.held === 0);
  L.push(`## Held nothing at the fight (${zero.length} families)`);
  L.push('');
  L.push('Loaded elsewhere (another land, a window, a computer\'s path), or by nothing.');
  L.push('A family whose draw path is `none` is loaded by nothing on any device by');
  L.push('default: removing any of its files but the 19 `.m4a` is the owner\'s yes.');
  L.push('');
  L.push('| family | kind | draw | files | MB on disk | over bar |');
  L.push('|---|---|---|--:|--:|--:|');
  for (const f of zero.sort((a, b) => (a.draw === 'none') - (b.draw === 'none') || b.diskMB - a.diskMB)) {
    L.push(`| \`${f.name}\` | ${f.kind} | ${f.draw} | ${f.files} | ${mb(f.diskMB)} | ${f.over || ''} |`);
  }
  L.push('');
  L.push('## Made in play (no family holds these)');
  L.push('');
  L.push('A texture whose label is not a file in reach: a canvas, a render texture, a');
  L.push('ground piece, a look atlas page. The renderers\' bakes: for reading, never');
  L.push('the door\'s to change. Digits in a label are folded to `#`.');
  L.push('');
  L.push('| label | MB at the fight | chip | page | numbers | sound | atlas |');
  L.push('|---|--:|--:|--:|--:|--:|--:|');
  const small = c.inPlay.filter((f) => f.held < 0.1);
  for (const f of c.inPlay.filter((x) => x.held >= 0.1)) L.push(`| \`${f.name.slice(9).replace(/\|/g, '/')}\`${f.kinds ? ` (on the chip: ${f.kinds})` : ''} | ${mb(f.held)} | ${mb(f.chip)} | ${mb(f.page)} | ${mb(f.numbers)} | ${mb(f.sound)} | ${f.rows || ''} |`);
  if (small.length) L.push(`| ${small.length} more, each under 0.1 MB | ${mb(small.reduce((a, f) => a + f.held, 0))} | | | | | |`);
  L.push('');
  L.push('## The fight stops read');
  L.push('');
  L.push('Each stop\'s rows, summed, beside the lines the check reads at the same stop.');
  L.push('The chip\'s rows are its whole list, so they sum to the `gpu` line. The page\'s');
  L.push('rows are the asset cache\'s, the `artCache` line. Sound by file is BT_AUDIO\'s');
  L.push('own count (`soundHeld`); the `sound` line counts every buffer the page can');
  L.push('still reach, so it can be higher.');
  L.push('');
  L.push('| run | stop | gpu line | chip rows | artCache line | page rows | numbers | sound line | soundHeld | sound rows | atlas rows used | rowsFull | monster bundles |');
  L.push('|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|');
  for (const s of c.stops) {
    L.push(`| ${s.run} | ${s.label.replace(/\|/g, '/').slice(0, 60)} | ${s.lines.gpu ?? ''} | ${mb(s.sum.chip)} | ${s.lines.cache ?? ''} | ${mb(s.sum.page)} | ${mb(s.sum.numbers)} | ${s.lines.sound ?? ''} | ${s.lines.soundHeld ?? ''} | ${mb(s.sum.sound)} | `
      + `${s.palette ? `${s.palette.rowsUsed} of ${s.palette.rowsMax}` : ''} | ${s.palette ? s.palette.rowsFull : ''} | ${s.picNumbers ? (s.picNumbers.bundles || []).join(', ') : ''} |`);
  }
  L.push('');
  return L.join('\n');
}

const args = process.argv.slice(2);
if (args.length) {
  const files = args.filter((a) => !a.startsWith('--'));
  const runs = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  if (!runs.some((r) => (r.stops || []).some((s) => s.rows))) {
    console.log('No fight stop carries rows: run the check with QA_MB_ROWS=1.');
  } else {
    const c = census(runs);
    const out = text(c, files);
    if (args.includes('--write')) { writeFileSync(join(ROOT, CENSUS), out); console.log(`${CENSUS} written (${c.fams.length} families, ${c.inPlay.length} made in play).`); }
    else console.log(out);
  }
} else {
  console.log('usage: node tools/assets/fightmb.mjs <membudget.json> [...] [--write]');
}
