/* ═══ v2.3.4359: A NEW MONSTER'S STRIPS SHARE ONE LIST OF 256 COLOURS ═══
 *
 * The owner, 2026-11-10: "you're converting the pictures into the 256 color
 * framework right? That should be happening as part of the process".
 *
 * It is: every strip of the four monsters cut from the owner's art is a
 * palette PNG on at most 256 colours (tools/art/strip256.mjs, the game's own
 * quantiser), and the game holds a strip on 256 colours or fewer as colour
 * numbers, a byte a pixel (src/rendering/picsNumbers.js, on by default).
 * This suite holds the part that makes that work for a whole monster: its
 * strips are put on 256 colours TOGETHER (strip256 --shared), so they share
 * ONE list -- the game keeps a bundle's strips on rows of 256 colours
 * (picsNumbers rowFor), and strips each on their own 256 would want a row
 * each, of which there are few.
 */
import { readFileSync, readdirSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

function chunks(rel) {
  const buf = readFileSync(new URL(rel, root));
  const out = { ct: 0, bd: 0, plte: null, trns: null };
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { out.bd = d[8]; out.ct = d[9]; }
    else if (type === 'PLTE') out.plte = d.toString('hex');
    else if (type === 'tRNS') out.trns = d.toString('hex');
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  return out;
}

const MONSTERS = { 'water-frog': 15, 'storm-eye': 3, rotcap: 3, 'rock-golem': 3 };
for (const [dir, want] of Object.entries(MONSTERS)) {
  const files = readdirSync(new URL(`public/sprites/monsters/${dir}/`, root)).filter((f) => f.endsWith('.png')).sort();
  const cs = files.map((f) => chunks(`public/sprites/monsters/${dir}/${f}`));
  check(`${dir}: its ${want} strips are palette PNGs on at most 256 colours`,
    files.length === want && cs.every((c) => c.ct === 3 && c.bd === 8 && c.plte && c.plte.length / 6 <= 256), { files: files.length, colours: cs.map((c) => c.plte && c.plte.length / 6) });
  check(`${dir}: ...and all share ONE list of colours (so the game holds them all on one row of it)`,
    cs.every((c) => c.plte === cs[0].plte && c.trns === cs[0].trns), cs.map((c) => c.plte && c.plte.slice(0, 12)));
  /* a row is 256 places and the first is see-through (picsNumbers rowFor:
     `n: 1`), so one row is 255 colours you can see */
  const seen = cs[0].plte.length / 6 - (cs[0].trns ? cs[0].trns.match(/../g).filter((b) => b === '00').length : 0);
  check(`${dir}: ...${seen} colours you can see, so one row holds them (255 and see-through)`, seen >= 16 && seen <= 255, seen);
}
{
  const s256 = src('tools/art/strip256.mjs');
  check('the cutting tools put a monster on its colours together (strip256 --shared: every pixel of every strip as one picture)',
    /const shared = argv\[0\] === '--shared';/.test(s256) && /reduce256\(all, total, 1\)/.test(s256)
    && ['tools/art/cut_water_frog.py', 'tools/art/cut_storm_eye.py', 'tools/art/sheet_rows.py'].every((f) => /'strip256\.mjs'\), '--shared', /.test(src(f))));
  const pn = src('src/rendering/picsNumbers.js'), zt = src('src/rendering/zoneTextures.js');
  check('the game holds such a strip as colour numbers by default (?picnumbers=0 the way out), a bundle\'s strips on rows of 256 colours',
    /const WANTED = !\/\[\?&\]picnumbers=0\\b\/\.test\(_q\)/.test(pn) && /if \(r\.n \+ fresh <= 256\) return r;/.test(pn) && /let numSrc = packed \? stripAsNumbers\(bundle, packed\.canvas, url, read\) : null;/.test(zt));   /* v2.3.4400: + `read` (the numbers already read, when a strip is unpacked in play) */
  /* ...AND A STRIP THE PACKER LEAVES WHOLE (its art fills its cells: the
     frog's death, 5.2 MB as a plain picture): drawn whole and read into its
     numbers the same way, the canvas emptied if that is refused */
  check('...a strip the packer declines too: drawn whole on a canvas and read into its numbers, never left a plain picture for being full',
    /if \(!packed && picNumbersOn\(\)\) \{/.test(zt) && /whole\.width = n \* fw; whole\.height = fh;/.test(zt) && /numSrc = stripAsNumbers\(bundle, whole, url, wholeCv \? read : undefined\);/.test(zt)
    && /if \(!numSrc && whole\) \{ try \{ whole\.width = 0; whole\.height = 0; \}/.test(zt)
    && /const src = numSrc \|\| Texture\.from\(packed \? packed\.canvas : img\)\.source;/.test(zt));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
