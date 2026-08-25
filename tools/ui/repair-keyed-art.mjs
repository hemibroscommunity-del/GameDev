/* ═══ v2.3.1933: REPAIR GREEN-KEY DAMAGE IN TRAIT ART ═══
 *
 * Owner: "the barbarian helmet has the dangling ear piece keyed out and it
 * shouldn't be."
 *
 * WHAT HAPPENED.  This art was imported off a GREEN SCREEN (tools/
 * import_headwear_green.py, remove_accent_color.py, degreen_accents.py).  The
 * key was too greedy on some frames: it punched holes through the artwork
 * wherever a colour came close to the key, and it took whole parts with it.
 * The evidence is in the file: alpha is strictly binary (0 or 250+, so a hard
 * key, not a soft mask), and every crumb it left behind is near-black with a
 * GREEN bias — (6,14,5), (5,13,5), (3,9,3) — which is green spill on an
 * outline that was just dark enough to survive.
 *
 * The damage is NOT recoverable: no intact copy exists anywhere in this repo's
 * history (checked with git log --follow; every version has the same 2048
 * opaque pixels), and the key left no partial alpha to un-premultiply.  So this
 * repairs rather than restores, and it only does the two things that can be
 * done without inventing art:
 *
 *   1. STRIP DETACHED CRUMBS.  Opaque islands not connected to the main sprite
 *      are what the key leaves when it eats a part and spares a few outline
 *      pixels — on the barbarian helmet they read as a dotted line hanging in
 *      space.  Same topology-only rule playerSprites.stripDetachedComponents
 *      already applies to the jog-NE body sheet, for the same reason.
 *
 *   2. INPAINT ENCLOSED HOLES.  A transparent region you cannot reach from the
 *      frame border without crossing opaque art is a hole punched INSIDE the
 *      sprite.  Each is filled from its own neighbours, outside in.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: fill a bite taken out of the SILHOUETTE.
 * That is not a hole, it is missing art, and guessing it would be drawing new
 * art into someone else's sprite.  Those are reported, not repaired.
 *
 * A beard's mouth and a crown's gaps are legitimate enclosed holes, so this is
 * NOT run across the library — it takes the frames it is told to.
 *
 *   node tools/ui/repair-keyed-art.mjs <trait/dir> [more...] [--dry]
 *   e.g. node tools/ui/repair-keyed-art.mjs headwear/barbarian-helmet
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ROOT = path.join(REPO, 'public/sprites/traits');
const DRY = process.argv.includes('--dry');
const ALLOW_DRIFT = process.argv.includes('--allow-anchor-drift');
const TARGETS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!TARGETS.length) { console.error('usage: repair-keyed-art.mjs <cat/id> [...] [--dry]'); process.exit(2); }

/* ── GRAFTS: reconstruction, not repair ──
 *
 * When the key ate a whole PART rather than punching holes in one, there is
 * nothing to inpaint from and the silhouette itself is wrong.  The barbarian
 * helmet's FAR ear strap is the case: south shows a strap hanging at each end
 * of the rim, and in southwest the far one is gone entirely — all that survived
 * is a 3px outline stub under the rim's left end (x101-103, y46-49), which is
 * the proof it belongs there rather than a guess that it might.
 *
 * So it is rebuilt from the NEAR strap on the same frame: same helmet, same
 * frame, same artist, same light.  Mirrored, because on the south frame the two
 * straps are mirror images (each carries its highlight on its OUTER edge), and
 * squeezed to 11px against the near strap's 17 because the far side of a
 * three-quarter view is foreshortened — 17 was rendered too and reads as a
 * second near strap rather than a far one.
 *
 * This is drawing, and it is confined to this table so it can never happen by
 * accident to a frame nobody looked at.  Surviving pixels are never
 * overwritten: the graft only fills transparency.
 */
const GRAFT = Object.create(null);   /* CLAUDE.md rule 4: keyed by trait id */
GRAFT['headwear/barbarian-helmet'] = [{
  facing: 'southwest',
  from: { x0: 138, y0: 46, x1: 154, y1: 66 },   /* the near strap, 256-space */
  toX: 101, width: 11, mirror: true,
  why: 'far ear strap, eaten whole by the key; stub at x101-103 y46-49 survived',
}];

/* ── TRIM: art that is there and should not be ──
 *
 * Owner: "The fez hat has a string below it."  It does — a tassel cord drawn
 * down the front of the fez and continuing BELOW the brim, so it hangs over
 * the forehead when worn.  Unlike the crumbs and holes above, this is not key
 * damage: it is deliberate art the owner does not want.
 *
 * The rule is the hat's own silhouette: a fez's brim IS its bottom edge, so
 * anything below it is the dangle.  The art agrees — northeast has nothing
 * below its brim at all, which is what the other four should look like.  The
 * brim is found per facing (the lowest row still at 70% of the widest row)
 * rather than hardcoded, so a redraw does not silently trim the wrong rows.
 *
 * Opt-in per item, and it has to be: "below the widest part" describes a
 * cowboy hat's crown-and-brim exactly as well, and would behead it.
 */
/* ── ITEMS WITH NO LEGITIMATELY DETACHED PART ──
 *
 * The size cap in the strip pass exists to protect art that is SUPPOSED to be
 * a separate island: cat-ears carries a 262px island above its band that is the
 * ears, and eating it would be a disaster.  The cap cannot tell that from a big
 * crumb, so for items that have no detached part at all it is told.
 *
 * naruto-headband is one connected band. Owner: "the k band has residue black
 * crumbs above it" -- and with the default cap two survived, a 46px bar on
 * south and a 32px bar on east, both sitting at the top of the frame well clear
 * of the band. Anything not touching the band is residue here, by construction.
 */
const STRIP_ALL = new Set(['headwear/naruto-headband']);

const TRIM = Object.create(null);   /* CLAUDE.md rule 4 */
TRIM['headwear/fez-hat'] = { belowBrim: 0.7, why: 'tassel cord hanging past the brim' };

const A = (p, i) => p.data[i * 4 + 3];

/** Pixels reachable from the border without crossing opaque art. */
function outside(p) {
  const W = p.width, H = p.height, seen = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
  while (st.length) {
    const i = st.pop();
    if (i < 0 || i >= W * H || seen[i] || A(p, i) > 40) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1);
    if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
  }
  return seen;
}

/** Opaque connected components, 8-connected, largest first. */
function components(p) {
  const W = p.width, H = p.height, lab = new Int32Array(W * H).fill(-1), out = [];
  for (let s = 0; s < W * H; s++) {
    if (lab[s] >= 0 || A(p, s) <= 40) continue;
    const id = out.length, cell = []; const st = [s]; lab[s] = id;
    while (st.length) {
      const i = st.pop(); cell.push(i);
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (lab[j] >= 0 || A(p, j) <= 40) continue;
        lab[j] = id; st.push(j);
      }
    }
    out.push(cell);
  }
  return out.sort((a, b) => b.length - a.length);
}

const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

/* Apply a graft.  Coordinates are 256-space; a 128 file scales them, the same
   convention eyeMask.json uses, so the table is written once. */
function graft(p, g) {
  const k = p.width / 256;
  const S = (v) => Math.round(v * k);
  const sx0 = S(g.from.x0), sx1 = S(g.from.x1), sy0 = S(g.from.y0), sy1 = S(g.from.y1);
  const sw = sx1 - sx0 + 1, sh = sy1 - sy0 + 1, fw = Math.max(1, S(g.width)), tx = S(g.toX);
  let n = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < fw; x++) {
      const srcX = g.mirror ? sx1 - Math.floor((x * sw) / fw) : sx0 + Math.floor((x * sw) / fw);
      const si = ((sy0 + y) * p.width + srcX) * 4;
      if (p.data[si + 3] <= 40) continue;
      const dx = tx + x, dy = sy0 + y;
      if (dx < 0 || dy < 0 || dx >= p.width || dy >= p.height) continue;
      const di = (dy * p.width + dx) * 4;
      if (p.data[di + 3] > 40) continue;   /* never overwrite art that survived */
      p.data[di] = p.data[si]; p.data[di + 1] = p.data[si + 1];
      p.data[di + 2] = p.data[si + 2]; p.data[di + 3] = 255;
      n++;
    }
  }
  return n;
}

/** Erase everything below the sprite's brim.  Returns the pixel count. */
function trimBelowBrim(p, frac) {
  const W = p.width, H = p.height;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let a = Infinity, b = -1;
    for (let x = 0; x < W; x++) if (A(p, y * W + x) > 40) { if (x < a) a = x; if (x > b) b = x; }
    if (b >= 0) rows.push({ y, w: b - a + 1 });
  }
  if (!rows.length) return 0;
  const maxW = Math.max(...rows.map((r) => r.w));
  let brim = rows[0].y;
  for (const r of rows) if (r.w >= maxW * frac) brim = r.y;
  let n = 0;
  for (let y = brim + 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (A(p, i) > 40) { p.data[i * 4 + 3] = 0; n++; }
    }
  }
  return n;
}

function repair(file, grafts, trim, stripAll) {
  const p = decode(fs.readFileSync(file));
  const W = p.width, H = p.height;
  let stripped = 0, filled = 0, grafted = 0, trimmed = 0;

  const comps = components(p);
  if (comps.length > 1) {
    /* Keep the sprite; drop islands. A crumb is small AND detached; a genuinely
       separate part (a horn tip the outline does not reach) would be large, so
       the cap keeps this from eating real art. */
    const CAP = stripAll ? Infinity : Math.max(12, Math.round(comps[0].length * 0.04));
    for (let c = 1; c < comps.length; c++) {
      if (comps[c].length > CAP) continue;
      for (const i of comps[c]) { p.data[i * 4 + 3] = 0; stripped++; }
    }
  }

  const seen = outside(p);
  const hole = [];
  for (let i = 0; i < W * H; i++) if (A(p, i) <= 40 && !seen[i]) hole.push(i);
  /* Fill outside-in: a hole pixel with enough opaque neighbours takes their
     median, then it counts as opaque for the next pass. Repeats until closed. */
  let todo = hole.slice();
  for (let pass = 0; pass < 64 && todo.length; pass++) {
    const next = [];
    let did = 0;
    for (const i of todo) {
      const x = i % W, y = (i / W) | 0, R = [], G = [], B = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (A(p, j) > 40) { R.push(p.data[j * 4]); G.push(p.data[j * 4 + 1]); B.push(p.data[j * 4 + 2]); }
      }
      if (R.length >= 3) {
        p.data[i * 4] = med(R); p.data[i * 4 + 1] = med(G); p.data[i * 4 + 2] = med(B); p.data[i * 4 + 3] = 255;
        filled++; did++;
      } else next.push(i);
    }
    if (!did) break;
    todo = next;
  }
  /* grafts run AFTER the repair, so the near strap they copy is already whole */
  for (const g of (grafts || [])) grafted += graft(p, g);
  /* trim runs LAST: it reads the silhouette, and the passes above change it */
  if (trim && trim.belowBrim) trimmed = trimBelowBrim(p, trim.belowBrim);
  if (!DRY && (stripped || filled || grafted || trimmed)) fs.writeFileSync(file, encode({ width: W, height: H, data: p.data }));
  return { stripped, filled, grafted, trimmed, unfilled: todo.length };
}

/* meta.bboxes is documented as the art's own bbox, and stripping crumbs that
   hung below the sprite makes the stored HEIGHT too big.  Nothing renders off
   it today for this helmet (the one reader, the float-above-hair offset, is
   gated on meta.floatsAboveHair, which it does not set) — but a stale number
   that is only harmless by accident is the kind that bites the next feature.
   x0/y0/w are NOT rewritten: `anchors` is the bbox top-centre and crownNudge
   was hand-dialled against it (see meta.note), so if those ever move this
   refuses rather than silently relocating a hat someone tuned by eye. */
function refreshMetaHeights(base, t) {
  const mf = path.join(base, 'meta.json');
  if (!fs.existsSync(mf)) return;
  const meta = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!meta.bboxes) return;
  const changed = [], drift = [];
  for (const f of Object.keys(meta.bboxes)) {
    const src = ['hi/' + f + '.png', f + '.png'].map((r) => path.join(base, r)).find((x) => fs.existsSync(x));
    if (!src) continue;
    const p = decode(fs.readFileSync(src));
    const k = 256 / p.width;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) continue;
    const now = [Math.round(x0 * k), Math.round(y0 * k), Math.round((x1 - x0 + 1) * k), Math.round((y1 - y0 + 1) * k)];
    const was = meta.bboxes[f];
    if (was[0] !== now[0] || was[1] !== now[1] || was[2] !== now[2]) {
      /* v2.3.1936: the origin moving is NOT automatically a relocation, and the
         naruto headband is the case that shows why: its crumbs WERE the topmost
         pixels, so removing them raised the bbox top 7px.  The art does not
         move — `anchors` is an ABSOLUTE texture coordinate that _placeTrait
         pins to the crown (headwear.anchor.set(anchorPx / W)), not something
         re-derived from the bbox at draw time.  Verified per file: every
         surviving pixel is byte-identical AND at the same coordinate.
         Still refused BY DEFAULT, because the invariant in meta.note ("anchors
         are the hat bbox top-centre") stops holding, and any future tool that
         re-derives anchors from the bbox WOULD then move the hat.  Pass
         --allow-anchor-drift to accept that, and the note below records it. */
      if (!ALLOW_DRIFT) {
        console.error(`REFUSING to touch ${t} meta: ${f} bbox origin/width moved ${JSON.stringify(was.slice(0, 3))} -> ${JSON.stringify(now.slice(0, 3))}; anchors/crownNudge derive from those and are hand-tuned. Re-run with --allow-anchor-drift only if you have checked the art does not move.`);
        process.exitCode = 1;
        return;
      }
      drift.push(`${f} ${JSON.stringify(was.slice(0, 3))}->${JSON.stringify(now.slice(0, 3))}`);
      meta.bboxes[f][0] = now[0]; meta.bboxes[f][1] = now[1]; meta.bboxes[f][2] = now[2];
      changed.push(`${f} origin/width`);
    }
    /* `was` ALIASES meta.bboxes[f]; read the old height out before mutating or
       the log prints the new value on both sides of the arrow. */
    const wasH = was[3];
    if (wasH !== now[3]) { meta.bboxes[f][3] = now[3]; changed.push(`${f} h ${wasH}->${now[3]}`); }
  }
  if (!changed.length || DRY) return;
  meta.note = (meta.note ? meta.note + ' ' : '') + `v2.3.1933: bboxes refreshed after art repair (${changed.join(', ')}).`
    + (drift.length
      ? ` v2.3.1936: the bbox ORIGIN moved on ${drift.join('; ')} because the removed pixels were the topmost ones. anchors and crownNudge are deliberately UNCHANGED and the art does not move: anchors is an absolute texture coordinate that _placeTrait pins to the crown, not a value re-derived from the bbox. It is therefore no longer this hat's bbox top-centre -- do NOT re-derive anchors from bboxes for this trait.`
      : ' Origin/width unchanged, so anchors and crownNudge are untouched.');
  fs.writeFileSync(mf, JSON.stringify(meta, null, 2) + '\n');
  console.log(`${t}/meta.json`.padEnd(46) + changed.join(', '));
}

for (const t of TARGETS) {
  const base = path.join(ROOT, t);
  if (!fs.existsSync(base)) { console.error('no such trait: ' + t); process.exitCode = 1; continue; }
  for (const f of ['south', 'southwest', 'east', 'northeast', 'north']) {
    for (const rel of [`${f}.png`, `hi/${f}.png`]) {
      const file = path.join(base, rel);
      if (!fs.existsSync(file)) continue;
      const gs = (GRAFT[t] || []).filter((g) => g.facing === f);
      const r = repair(file, gs, TRIM[t], STRIP_ALL.has(t));
      if (r.stripped || r.filled || r.grafted || r.trimmed) {
        console.log(`${t}/${rel}`.padEnd(44) + `stripped ${r.stripped}, filled ${r.filled}, grafted ${r.grafted}, trimmed ${r.trimmed}`
          + (r.unfilled ? `, ${r.unfilled} UNFILLED` : ''));
      }
    }
  }
  refreshMetaHeights(base, t);
}
