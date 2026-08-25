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

function repair(file, grafts) {
  const p = decode(fs.readFileSync(file));
  const W = p.width, H = p.height;
  let stripped = 0, filled = 0, grafted = 0;

  const comps = components(p);
  if (comps.length > 1) {
    /* Keep the sprite; drop islands. A crumb is small AND detached; a genuinely
       separate part (a horn tip the outline does not reach) would be large, so
       the cap keeps this from eating real art. */
    const CAP = Math.max(12, Math.round(comps[0].length * 0.04));
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
  if (!DRY && (stripped || filled || grafted)) fs.writeFileSync(file, encode({ width: W, height: H, data: p.data }));
  return { stripped, filled, grafted, unfilled: todo.length };
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
  const changed = [];
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
      console.error(`REFUSING to touch ${t} meta: ${f} bbox origin/width moved ${JSON.stringify(was.slice(0, 3))} -> ${JSON.stringify(now.slice(0, 3))}; anchors/crownNudge derive from those and are hand-tuned.`);
      process.exitCode = 1;
      return;
    }
    /* `was` ALIASES meta.bboxes[f]; read the old height out before mutating or
       the log prints the new value on both sides of the arrow. */
    const wasH = was[3];
    if (wasH !== now[3]) { meta.bboxes[f][3] = now[3]; changed.push(`${f} h ${wasH}->${now[3]}`); }
  }
  if (!changed.length || DRY) return;
  meta.note = (meta.note ? meta.note + ' ' : '') + `v2.3.1933: bbox heights refreshed after green-key repair (${changed.join(', ')}); origin/width unchanged so anchors and crownNudge are untouched.`;
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
      const r = repair(file, gs);
      if (r.stripped || r.filled || r.grafted) {
        console.log(`${t}/${rel}`.padEnd(46) + `stripped ${r.stripped}, filled ${r.filled}, grafted ${r.grafted}`
          + (r.unfilled ? `, ${r.unfilled} UNFILLED` : ''));
      }
    }
  }
  refreshMetaHeights(base, t);
}
