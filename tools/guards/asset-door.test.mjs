/* ═══ v2.3.5244: THE ASSET DOOR'S GATE (grand plan step 9.3; card P, PR 4) ═══
 *
 * tools/assets/shipped.json records every file the game ships under public/
 * (a picture, a sound, a video, data): its bytes, the SHA-256 of its bytes,
 * its family (tools/assets/families.mjs) and its kind (docs/specs/asset-door.md).
 * A sprite's .webp twin (public/sprites/player/ or gear/, its .png beside
 * it) is the sprite bot's, made on any branch and on main after a merge
 * (optimize-assets.yml): it is read as its PNG's row, and held by nothing
 * here (shipped.mjs inReach; the gatekeeper's sitting 5).
 * This guard fails:
 *
 *   1. a file in reach with no row (added outside the door);
 *   2. a row with no file (removed, its row left);
 *   3. a file whose bytes or hash are not its row's (changed outside the
 *      door: the mend is its own tool, then node tools/assets/shipped.mjs --write);
 *   4. a file two families match;
 *   5. a rise in `unsorted` (a census, rule 3: it only falls; the gatekeeper
 *      alone makes it strict);
 *   6. a file of a supplied family that the game's reader (png8Decode.js)
 *      reads over its bar -- a census too: today's are counted by family
 *      (OVER_BAR), and a family's count only falls.  A WebP is within its
 *      bar when its own colour index says 256 colours or fewer (shipped.mjs
 *      webpColours: what finish.mjs writes, and checks); a JPEG never is.  A
 *      picture within its bar must also be whole frames of its family's
 *      pixel rule, where the rule names a frame or a cell (11 of the 36
 *      supplied families with a bar at tag 5244: the others state no size);
 *   7. a look sheet that lookExpand.js lookSheetParse will not read, or whose
 *      hash is not its row's (the 223 bodies' NUMBERS: put on 256 colours, every
 *      body would be scrambled, and no other check would see it).  Read the
 *      game's way: the picture's pixels as a canvas gives them (tools/png.mjs;
 *      a see-through pixel reads 0,0,0,0, a partly see-through one fails), its
 *      manifest row and set's roles (roles.json), the spec (lookUnpack.js
 *      lookSheetSpec, the one copy lookPalette.js builds sheets with), the
 *      bytes (unpackLookSheet), the parse; every number below its table's
 *      entries.  The sheets are every one a look set's roles.json names
 *      (and every PNG of a family drawn `look`), each in a family of kind
 *      data drawn `look`: a change of the table's kind cannot take them
 *      out of this hold;
 *   8. a record that would not merge with one press (the gatekeeper's
 *      sitting 5): totals in its head (every PR changing a file in reach
 *      would rewrite them), rows out of path order or twice, not one a line
 *      as --write writes them; or a row whose family or kind is not the
 *      table's (a family moved without --write).
 *
 * IT NEVER MAKES A FILE AGAIN TO COMPARE: two machines' encoders differ and
 * it would flap.  It compares recorded hashes and reads files through the
 * game's own readers.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14 (and put back; tried
 * again after the gatekeeper's sitting 5, the same day):
 *   1. cp public/sprites/ride/skateboard-top.png public/sprites/ride/zz.png && git add -f it  -> FAIL 1
 *   2. rm public/sprites/ride/skateboard-top.png (its row left)                                -> FAIL 2
 *   3. one hex digit of skateboard-top.png's sha256 changed in shipped.json                    -> FAIL 3
 *   4. a second family in families.mjs over 'public/sprites/ride/*.png'                        -> FAIL 4 (and 5:
 *      a file two families match is counted unsorted; and 8: its rows' family is not the table's)
 *   5. the `ride` family's pattern made 'public/sprites/ride/*.gif' (its files match nothing) -> FAIL 5 (and 8)
 *   6. OVER_BAR['player-sheets'] 25 -> 24                                                      -> FAIL 6
 *      public/world/interiors/bank.webp copied to newhall.webp (no colour index), git add -f   -> FAIL 6 (and 1);
 *      the same file put through node tools/assets/finish.mjs world-interiors                  -> green
 *   7. one texel of public/sprites/look/shirt/stand-east.png given the number 200 (39 entries),
 *      re-encoded; or a see-through texel of look/dodge-east.png made half see-through       -> FAIL 7 (and 3);
 *      the `look-body` family's kind made 'made'                                              -> FAIL 7 (and 8)
 *   8. a "files" line put back in shipped.json's head; or two rows swapped; or a row's
 *      family changed by hand                                                                 -> FAIL 8
 *   (the bot's twins) a byte added to public/sprites/gear/belt/chainbelt/jog-east.webp        -> green;
 *      its jog-east.png removed (the twin left)                                               -> FAIL 1 (and 2)
 *
 * v2.3.6421 (card CK PR 2): BY GIT'S IDS AGAINST MAIN.  It hashed 143 MB
 * and read 63 MB of pictures on every run.  Now a file whose git id is
 * main's and whose row is main's (shipped.json as main holds it) was
 * checked when main took it: 3 reads its size, never its bytes; 6 and 7
 * read only the files that are not main's (and 7 a sheet whose roles.json
 * changed).  6's census counts by change: a supplied family whose changed
 * files went over their bar more than they came under it is counted whole.
 * When the guard's own readers changed against main (READERS), 6 and 7 read
 * every file; when no main is found, and in the gatekeeper's rehearsal
 * (BT_ASSETS_WHOLE=1, once a sitting), the whole run, as before
 * (tools/guards/lib/sinceMain.mjs).
 * BREAK PROOF, 2026-11-23, each by hand (and put back):
 *   9. one byte of public/sprites/ride/skateboard-top.png's pixels changed, its size
 *      the same (not committed; then committed on a branch)                            -> FAIL 3
 *  10. a look sheet's texel given a number past its table, and its row rewritten
 *      by node tools/assets/shipped.mjs --write                                         -> FAIL 7
 *  11. a supplied family's PNG within its bar re-encoded as RGBA, its row rewritten       -> FAIL 6
 *
 * Run from the repository's root: node tools/guards/asset-door.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { ASSET_FAMILIES } from '../assets/families.mjs';
import { inReach, botTwins, rowOf, familiesOf, readShipped, webpColours, ABOUT, OUT, UNSORTED } from '../assets/shipped.mjs';
import { mainBase, idsAt, idsNow, textAt, blobBytes, changedSince } from './lib/sinceMain.mjs';
import { readPng8Chunks } from '../../src/rendering/png8Decode.js';
import { lookSheetSpec, unpackLookSheet } from '../../src/rendering/lookUnpack.js';
import { lookSheetParse } from '../../src/rendering/lookExpand.js';
import { decode as decodePng } from '../png.mjs';

/* rule 3's census: `unsorted` only falls (0 at tag 5241) */
const UNSORTED_AT_MOST = 0;
/* hold 6's census: a supplied family's files the game's reader does not read
   today (RGBA or 16-bit PNGs, WebPs, JPEGs), by family, at tag 5244; a
   family's count only falls.  A family's files are finished by
   node tools/assets/finish.mjs <family> <file>. */
const OVER_BAR = Object.freeze({
  'player-sheets': 25, 'player-standin-bodies': 8, 'player-sword-weapon': 3, 'player-retired': 17, 'player-renders': 5,
  'player-naked': 5, 'player-death': 1, 'gear-walk-supplied': 38, 'gear-combat-supplied': 25, 'gear-chop-originals': 3,
  'traits-hi': 275, 'traits-thumbs': 48, 'traits-shirt': 5, 'traits-nft': 5, 'species-monkey': 5, 'cape': 5,
  'npc-storekeeper': 1, 'npc-retired': 5, 'tool-pan': 1, 'weapons-greatsword': 5, 'weapons-sword-originals': 3,
  'fx-sheets-supplied': 6, 'fx-coinflip': 2, 'world-originals': 3, 'props-buildings': 3, 'world-interiors': 16,
  'icons-app': 6, 'icons-cut-from-uploads': 14, 'icons-badge-retired': 16, 'icons-from-uploads-world': 3,
  'icons-verified-full': 1, 'ui-welcome-cat': 7,
});

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const MEND = ' (the mend: the file\'s own tool, then node tools/assets/shipped.mjs --write)';

const doc = readShipped(ROOT);
const rows = new Map(doc.rows.map((r) => [r.path, r]));
const present = inReach(ROOT);
const have = new Set(present);
const famOf = new Map(ASSET_FAMILIES.map((f) => [f.name, f]));

/* v2.3.6421: main, and what is main's (the header).  A file is main's when
   its git id now is its id in main and its row is main's row; the readers
   6 and 7 judge a picture by are READERS: one changed, 6 and 7 read all. */
const READERS = ['tools/guards/asset-door.test.mjs', 'tools/guards/lib/sinceMain.mjs', 'tools/assets/shipped.mjs', 'tools/assets/families.mjs',
  'src/rendering/png8Decode.js', 'src/rendering/lookUnpack.js', 'src/rendering/lookExpand.js', 'tools/png.mjs'];
const MAIN = (() => {
  const { base, how } = mainBase();
  const was = base && idsAt(base, 'public');
  const ids = base && idsNow('public');
  const text = base && textAt(base, OUT);
  const readers = base && changedSince(base, READERS);
  if (!was || !ids || !text || !readers) return { base: null, how: base ? how + ', but git could not read it: every file read' : how };
  return { base, how, was, ids, rows: new Map(JSON.parse(text).rows.map((r) => [r.path, r])), readersChanged: [...readers] };
})();
const isMains = (p) => {
  if (!MAIN.base) return false;
  const id = MAIN.ids.get(p), m = MAIN.rows.get(p), r = rows.get(p);
  return !!(id && id === MAIN.was.get(p) && m && r && m.bytes === r.bytes && m.sha256 === r.sha256);
};
/* 6 and 7 read every file when there is no main or a reader changed */
const readAll = !MAIN.base || MAIN.readersChanged.length > 0;
console.log(`     (by git's ids: ${MAIN.how}${MAIN.base && MAIN.readersChanged.length ? '; readers changed, 6 and 7 read every file: ' + MAIN.readersChanged.join(', ') : ''})`);

/* ── 1. every file in reach has its row ── */
{
  const noRow = present.filter((p) => !rows.has(p));
  check(`1: every file in reach has a row in tools/assets/shipped.json (${present.length} files; ${botTwins(ROOT).length} sprite twins the bot's, read as their PNGs' rows)` + MEND, noRow.length === 0, noRow);
}

/* ── 2. every row has its file ── */
{
  const noFile = [...rows.keys()].filter((p) => !have.has(p));
  check(`2: every row has its file (${rows.size} rows)` + MEND, noFile.length === 0, noFile);
}

/* ── 3, 4: bytes and hash; one family a file ── */
const now = new Map();
{
  const changed = [], twice = [];
  let bytes = 0, hashed = 0, byId = 0;
  for (const p of present) {
    /* v2.3.6421: main's file (by git's id, its size read) keeps its row's hash */
    const mine = isMains(p) && statSync(join(ROOT, p)).size === rows.get(p).bytes;
    let r;
    if (mine) {
      const fams = familiesOf(p), fam = fams.length === 1 ? fams[0] : null;
      const w = rows.get(p);
      r = { path: p, bytes: w.bytes, sha256: w.sha256, family: fam ? fam.name : UNSORTED, kind: fam ? fam.kind : UNSORTED, ...(fams.length > 1 ? { twice: fams.map((f) => f.name) } : {}) };
      byId++;
    } else { r = rowOf(p, ROOT); hashed += r.bytes; }
    r.mains = mine;
    now.set(p, r);
    bytes += r.bytes;
    if (r.twice) twice.push([p, r.twice]);
    const was = rows.get(p);
    if (was && (was.bytes !== r.bytes || was.sha256 !== r.sha256)) changed.push(p);
  }
  check(`3: every file's bytes and SHA-256 are its row's (${(bytes / 1048576).toFixed(1)} MB: ${byId} files main's by git's id, ${(hashed / 1048576).toFixed(1)} MB hashed)` + MEND, changed.length === 0, changed);
  check('4: no file is matched by two families (tools/assets/families.mjs: write the narrower one\'s files in the wider one\'s `not`)', twice.length === 0, twice);
}

/* ── 5. unsorted only falls ── */
{
  const list = [...now.values()].filter((r) => r.family === UNSORTED).map((r) => r.path);
  check(`5: unsorted files ${list.length}, at most ${UNSORTED_AT_MOST} (a census: give each its family in tools/assets/families.mjs)`, list.length <= UNSORTED_AT_MOST, list);
}

/* ── 6. a supplied family's files within the bar ── */
{
  const frameOf = (px) => { const m = /(?:frame|cells?)\s+(\d+)x(\d+)/i.exec(px || ''); return m ? [+m[1], +m[2]] : null; };
  /* a PNG read by the game's reader; a WebP by its own colour index (v2.3.5244) */
  const colours = (p, buf) => (!buf ? null : /\.png$/i.test(p) ? readPng8Chunks(buf) : webpColours(buf));
  const bytesOf = (p) => (/\.(png|webp)$/i.test(p) ? readFileSync(join(ROOT, p)) : null);
  const barred = (r) => { const f = famOf.get(r.family); return f && f.kind === 'supplied' && f.bar && /\.(png|webp|jpe?g)$/i.test(r.path) ? f : null; };
  const over = {}, offFrame = [];
  /* v2.3.6421: main's files were within their frames when main took them;
     the census counts by change (`delta`: a changed file over its bar now,
     +1; over it in main, -1), and a family that rose is counted whole */
  const delta = {};
  const whole = new Set();
  let read = 0;
  for (const [p, r] of now) {
    const f = barred(r);
    if (!f || (!readAll && r.mains)) continue;
    const c = colours(p, bytesOf(p));
    read++;
    if (!c) { over[r.family] = (over[r.family] || 0) + 1; delta[r.family] = (delta[r.family] || 0) + 1; }
    /* within its bar: whole frames of its pixel rule */
    const fr = frameOf(f.px);
    if (c && fr && (c.w % fr[0] || c.h % fr[1])) offFrame.push([p, `${c.w}x${c.h}`, f.px]);
    if (readAll) continue;
    const id = MAIN.was.get(p);
    if (id && MAIN.rows.get(p)?.family === r.family) {
      const buf = /\.(png|webp)$/i.test(p) ? blobBytes(id) : null;
      if (!colours(p, buf)) delta[r.family] = (delta[r.family] || 0) - 1;
    }
  }
  if (!readAll) {
    /* a file of a family that left the reach, or left the family, in this
       branch: its family is counted whole too (it may have been over) */
    for (const [p, m] of MAIN.rows) if (!now.has(p) || now.get(p).family !== m.family) whole.add(m.family);
    for (const [fam, d] of Object.entries(delta)) if (d > 0) whole.add(fam);
    for (const fam of whole) over[fam] = 0;
    for (const [p, r] of now) {
      if (!whole.has(r.family) || !barred(r)) continue;
      if (!colours(p, bytesOf(p))) over[r.family]++;
      read++;
    }
  }
  /* counted by change, a family not counted whole is within its line: main's
     count was, and its changed files went over no more than they came under */
  const counted = (fam) => readAll || whole.has(fam);
  console.log(`     (6: ${read} pictures read${readAll ? '' : `, by change against main; counted whole: ${[...whole].join(', ') || 'none'}`})`);
  for (const fam of Object.keys(over)) if (!counted(fam)) delete over[fam];
  const rose = Object.entries(over).filter(([f, n]) => n > (OVER_BAR[f] || 0)).map(([f, n]) => ({ family: f, now: n, was: OVER_BAR[f] || 0 }));
  const fell = Object.entries(OVER_BAR).filter(([f, n]) => counted(f) && (over[f] || 0) < n).map(([f, n]) => `${f} ${n} -> ${over[f] || 0}`);
  check('6: no supplied family has more files over its bar than at tag 5244 (finish it: node tools/assets/finish.mjs <family> <file>)', rose.length === 0, rose);
  check('6: every supplied picture within its bar is whole frames of its family\'s pixel rule (where the rule names a frame or a cell)', offFrame.length === 0, offFrame);
  if (fell.length) console.log(`     (a census that fell: lower OVER_BAR in this guard to lock it in: ${fell.join(', ')})`);
}

/* ── 7. the look sheets: read by lookSheetParse, their hashes their rows' ── */
{
  /* v2.3.5244 (the gatekeeper's sitting 5): the sheets are found by their
     manifests, not by the table's kind and draw alone (one line changing
     the kind took all 223 out of this hold with nothing failing) */
  const manifests = new Map();
  const bad = [];
  const named = new Set();
  for (const mf of present.filter((p) => /^public\/sprites\/look\/(?:.+\/)?roles\.json$/.test(p))) {
    const man = JSON.parse(readFileSync(join(ROOT, mf), 'utf8'));
    manifests.set(dirname(mf), man);
    for (const name of Object.keys((man && man.sheets) || {})) named.add(`${dirname(mf)}/${name}.png`);
  }
  for (const p of named) if (!now.has(p)) bad.push([p, 'its roles.json names it; no file']);
  const sheets = [...now.values()].filter((r) => named.has(r.path) || (famOf.get(r.family)?.draw === 'look' && /\.png$/i.test(r.path)));
  /* v2.3.6421: a sheet main's by git's id, beside a roles.json main's too,
     was read the game's way when main took it */
  const rolesMains = (dir) => isMains(dir + '/roles.json');
  let decoded = 0;
  for (const r of sheets) {
    const fam = famOf.get(r.family);
    if (!readAll && r.mains && rolesMains(dirname(r.path)) && fam && fam.kind === 'data' && fam.draw === 'look') continue;
    decoded++;
    if (!fam || fam.kind !== 'data' || fam.draw !== 'look') { bad.push([r.path, `a look sheet in ${r.family} (${fam ? fam.kind + ', drawn ' + fam.draw : 'no family'}): its family is data, drawn look`]); continue; }
    const dir = dirname(r.path);
    if (!manifests.has(dir)) {
      const mf = join(ROOT, dir, 'roles.json');
      manifests.set(dir, existsSync(mf) ? JSON.parse(readFileSync(mf, 'utf8')) : null);
    }
    const man = manifests.get(dir);
    const name = basename(r.path, '.png');
    const e = man && man.sheets && man.sheets[name];
    if (!e) { bad.push([r.path, 'no row in its roles.json']); continue; }
    /* the sheet's manifest row as lookPalette.js loadSet hands it to buildSheet */
    const m = { bits: man.bits, fw: man.fw, fh: man.fh, refScale: man.refScale, kind: man.kind, mip: man.mip, ...e };
    const roles = e.roleDefs || man.roleDefs || [];
    let png;
    try { png = decodePng(readFileSync(join(ROOT, r.path))); } catch (err) { bad.push([r.path, 'not an 8-bit RGB or RGBA PNG: ' + err.message]); continue; }
    const W = m.w, n = m.h, T = m.tableRows, E = m.entries, bits = m.bits === 8 ? 8 : 16;
    if (png.width !== W || png.height !== n + T) { bad.push([r.path, `${png.width}x${png.height}, its manifest says ${W}x${n + T}`]); continue; }
    /* the pixels as a canvas gives them back (the page's `make`, the bake
       worker's decode): a see-through pixel reads 0,0,0,0 -- number 0, see
       through -- whatever its file holds; a partly see-through one would
       come back premultiplied, its number changed */
    const px = png.data;
    let part = 0, big = 0;
    for (let q = 0; q < px.length; q += 4) {
      const a = px[q + 3];
      if (a === 0) { px[q] = 0; px[q + 1] = 0; px[q + 2] = 0; }
      else if (a !== 255) part++;
    }
    if (part) { bad.push([r.path, `${part} pixels partly see-through (a canvas would change their numbers)`]); continue; }
    /* a texel's colour number: red at 8 bits; red and green at 16, but a
       shirt's green is its frame + 1 (tools/art/shirt-bake.mjs) */
    const redOnly = bits === 8 || m.kind === 'shirt';
    for (let q = 0; q < W * n; q++) {
      const v = redOnly ? px[q * 4] : px[q * 4] + 256 * px[q * 4 + 1];
      if (v >= E) big++;
    }
    if (big) { bad.push([r.path, `${big} numbers at or past its ${E} entries (scrambled)`]); continue; }
    const spec = lookSheetSpec(m, roles, 0);
    const s = lookSheetParse(unpackLookSheet(px, spec), W, spec.rows, bits);
    if (s.n !== n || s.t0 !== n || s.ds !== m.ds || s.nr !== roles.length || !(s.dw % 1 === 0 && s.dh % 1 === 0)) {
      bad.push([r.path, `lookSheetParse reads n ${s.n}, t0 ${s.t0}, ds ${s.ds}, roles ${s.nr}, ${s.dw}x${s.dh}`]);
    }
  }
  const moved = sheets.filter((r) => { const w = rows.get(r.path); return !w || w.sha256 !== r.sha256; }).map((r) => r.path);
  check(`7: every look sheet (${sheets.length}; ${decoded} read here, the rest main's by git's id) is read by lookSheetParse the game's way, every number within its table`, bad.length === 0, bad);
  check(`7: every look sheet's hash is its row's (the bodies' numbers; re-made only by their bake: role-bake, head-bake, shirt-bake)`, moved.length === 0, moved);
}

/* ── 8. the record merges with one press; its rows are the table's ── */
{
  /* v2.3.5244 (the gatekeeper's sitting 5): no totals stored, one row a
     line in path order, as --write writes it: two PRs that change
     different files change different lines */
  const raw = readFileSync(join(ROOT, OUT), 'utf8');
  const head = Object.keys(doc).filter((k) => k !== 'rows');
  const lines = raw.split('\n');
  const want = ['{', `  "about": ${JSON.stringify(ABOUT)},`, '  "rows": [', ...doc.rows.map((r, i) => '    ' + JSON.stringify(r) + (i < doc.rows.length - 1 ? ',' : '')), '  ]', '}', ''];
  const off = lines.findIndex((l, i) => l !== want[i]);
  const order = doc.rows.findIndex((r, i) => i && Buffer.compare(Buffer.from(doc.rows[i - 1].path), Buffer.from(r.path)) >= 0);
  check('8: tools/assets/shipped.json holds no totals, one row a line in path order, each path once, as --write writes it (the mend: node tools/assets/shipped.mjs --write)',
    head.length === 1 && head[0] === 'about' && off < 0 && lines.length === want.length && order < 0,
    { head, firstLineOff: off < 0 ? null : [off + 1, (lines[off] || '').slice(0, 120)], outOfOrder: order < 0 ? null : doc.rows[order].path });
  const moved = doc.rows.filter((r) => now.has(r.path) && (now.get(r.path).family !== r.family || now.get(r.path).kind !== r.kind))
    .map((r) => [r.path, `${r.family} -> ${now.get(r.path).family}`]);
  check('8: every row\'s family and kind are tools/assets/families.mjs\'s today' + MEND, moved.length === 0, moved);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
