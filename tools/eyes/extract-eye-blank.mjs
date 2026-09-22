/* ═══ v2.3.2643: THE WHOLE EYE, NOT THE IRIS — SO A STYLE CAN ERASE IT ═══
 *
 * Owner, on the eye styles: "I still see some remnants around the eyes where
 * you stickered over the old ones, can that be cleaned up with whatever skin
 * color it is (the ones that gets changed with custom skin color choice)?"
 *
 * An eye style is a sprite drawn OVER the eyes the body sheets paint, and no
 * drawn shape covers another drawn shape exactly. What shows round the edges is
 * the base eye's black top edge and a sliver of its sclera — a hard dark line
 * beside a white one, which reads as a second eye behind the first.
 *
 * The fix is to erase the real eye under a style and fill it with skin, and the
 * fill has to follow the player's chosen SKIN COLOUR, which is a runtime
 * recolour. So the COLOUR is sampled at bake time from the retinted body itself
 * (playerSkins._blankEyes) and only the REGION is shipped as data — this file.
 *
 * ── WHY THIS IS NOT eyeMask.json ──
 * That file records the IRIS, because the iris is the part the eye-colour
 * feature repaints (its own header explains why the white and the brow stay).
 * An erase needs the opposite: everything that is not skin. Two different
 * questions about the same feature, so two tables rather than one table and a
 * fudge factor at each call site.
 *
 * ── HOW THE BOX IS FOUND ──
 * Not by a fresh search. `irisIn` from extract-eye-mask.mjs finds the irises —
 * the reviewed predicate that keeps armour highlights out — and each iris is
 * then grown to its own eye by the walk import_headwear_green.eye_boxes uses
 * to measure eyewear coverage: UP from the pupil over the solid dark top edge,
 * then OUT along that edge's full run, which is the eye's real width because
 * the white sits on one side of the pupil only. Down to the last row that is
 * still white or dark. Same landmark, same two files, one implementation of the
 * idea each.
 *
 * A rectangle, deliberately, rather than a flood fill of "everything eye-
 * coloured". A flood can escape along the head's own outline on the side views
 * where the eye sits a pixel or two from the edge of the face; a box bounded by
 * the eye's own top edge cannot. Over-filling by a pixel paints skin onto skin
 * and costs nothing, which is the asymmetry that makes the box the safe shape.
 *
 * REVIEW THE OUTPUT. Same rule as eyeMask.json: --contact writes a sheet with
 * every box drawn on the frame it came from, and nothing ships until someone
 * has looked at it.
 *
 *   node tools/eyes/extract-eye-blank.mjs [--out src/rendering/eyeBlankMask.json]
 *                                         [--contact /tmp/eye-blank]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';
import { irisIn } from './extract-eye-mask.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(REPO, 'public/sprites/player');

const isDark = (r, g, b, a) => a > 40 && r < 70 && g < 70 && b < 70;
const isWhite = (r, g, b, a) => a > 40 && r > 200 && g > 200 && b > 190;

/* Growth limits, expressed against the 256 frame and scaled by the sheet's own
   size exactly as extract-eye-mask.limits() does — the same eye is 7 rows tall
   in a 256 sheet and 3-4 in a 128 one, so fixed pixel counts find the top edge
   on stand and miss it on jog. */
function limits(fw) {
  const k = fw / 256;
  return {
    up: Math.max(2, Math.round(5 * k)),      // rows of dark top edge above the pupil
    out: Math.max(3, Math.round(8 * k)),     // columns that edge may run either way
    down: Math.max(1, Math.round(3 * k)),    // rows of lower lid below the pupil
    gap: Math.max(2, Math.round(4 * k)),     // x-gap that separates one eye from the other
  };
}

/* ONE DISK PIXEL OF PAD, and it is the difference between a clean face and a
   brown outline of the old eye.  The walk above finds the eye's HARD pixels;
   the artist anti-aliased its join to the cheek, so a ring of blend sits
   immediately outside that box -- rgb(183,120,66) against skin of rgb(198,128,71)
   on stand-south.  Erasing the hard pixels alone leaves that ring behind, which
   at game size reads as a brown rectangle where the eye used to be: the exact
   remnant this table exists to remove, one shade lighter.
   PADDED HERE rather than in the renderer because the pad is ONE SHEET PIXEL,
   and only this file knows how big that is -- the 128px sheets become 2px of
   pad once the table is converted to 256-space, the 256px ones stay 1.  The
   renderer fills with skin, so a pad that overshoots paints skin onto skin and
   costs nothing; a pad that undershoots is visible. */
const PAD = 1;

/** Whole-eye boxes in one frame, as [x0,y0,w,h] in FRAME-LOCAL disk pixels. */
export function eyeBoxesIn(px, x0, x1, h) {
  const fw = x1 - x0;
  const { up: UP, out: OUT, down: DOWN, gap: GAP } = limits(fw);
  const at = (x, y) => {
    if (x < x0 || y < 0 || x >= Math.min(x1, px.width) || y >= px.height) return [0, 0, 0, 0];
    const i = (y * px.width + x) * 4;
    return [px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3]];
  };
  const pts = irisIn(px, x0, x1, h);
  if (!pts.length) return [];

  /* Cluster the iris pixels into eyes by an x-gap, the same way
     import_headwear_green.eye_boxes splits its runs: two irises on one face are
     further apart than the columns of one iris are. */
  const cols = [...new Set(pts.map(([x]) => x))].sort((a, b) => a - b);
  const groups = [];
  let cur = [cols[0]];
  for (const c of cols.slice(1)) {
    if (c - cur[cur.length - 1] > GAP) { groups.push(cur); cur = []; }
    cur.push(c);
  }
  groups.push(cur);

  const boxes = [];
  for (const g of groups) {
    const set = new Set(g);
    const mine = pts.filter(([x]) => set.has(x));
    let xa = Math.min(...mine.map(([x]) => x)), xb = Math.max(...mine.map(([x]) => x));
    const ya = Math.min(...mine.map(([, y]) => y)), yb = Math.max(...mine.map(([, y]) => y));

    /* UP over the solid dark top edge: every column of the pupil must be dark
       for the row to count, so a single dark pixel of something else above the
       eye cannot drag the box up into the hairline. */
    let top = ya;
    for (let n = 0; n < UP && top - 1 >= 0; n++) {
      let all = true;
      for (let x = xa; x <= xb; x++) if (!isDark(...at(x, top - 1))) { all = false; break; }
      if (!all) break;
      top--;
    }
    /* OUT along that edge — its run IS the eye's width, because the white sits
       on one side of the pupil only (the v2.3.2361 measurement). */
    let left = xa, right = xb;
    for (let n = 0; n < OUT && left - 1 >= x0; n++) {
      const c = at(left - 1, top);
      if (!isDark(...c) && !isWhite(...c)) break;
      left--;
    }
    for (let n = 0; n < OUT && right + 1 < x1; n++) {
      const c = at(right + 1, top);
      if (!isDark(...c) && !isWhite(...c)) break;
      right++;
    }
    /* DOWN to the last row still holding any of the eye. */
    let bot = yb;
    for (let n = 0; n < DOWN && bot + 1 < h; n++) {
      let any = false;
      for (let x = left; x <= right; x++) {
        const c = at(x, bot + 1);
        if (isDark(...c) || isWhite(...c)) { any = true; break; }
      }
      if (!any) break;
      bot++;
    }
    const px0 = Math.max(0, left - x0 - PAD), py0 = Math.max(0, top - PAD);
    const px1 = Math.min(fw, right - x0 + 1 + PAD), py1 = Math.min(h, bot + 1 + PAD);
    boxes.push([px0, py0, px1 - px0, py1 - py0]);
  }
  return boxes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const argAt = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
  const outPath = argAt('--out') || path.join(REPO, 'src/rendering/eyeBlankMask.json');
  const contact = argAt('--contact');
  const mask = {};
  let sheets = 0, frames = 0, area = 0;
  const report = [];
  const shots = [];

  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.png')).sort()) {
    const px = decode(fs.readFileSync(path.join(DIR, f)));
    /* CEIL, and the last chunk is short — the same chunking eyeMask.json uses,
       and it has to stay the same, because both tables are consumed by loops
       that walk the upscaled canvas in 256px steps (playerSkins._paintEyes /
       _blankEyes). See extract-eye-mask.mjs's note for the bow sheets that are
       not an integer number of square frames. */
    const fw = px.height, n = Math.max(1, Math.ceil(px.width / fw));
    const base = f.replace(/\.png$/, '');
    const per = [];
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const b = eyeBoxesIn(px, i * fw, Math.min((i + 1) * fw, px.width), px.height);
      if (b.length) { hit++; area += b.reduce((s, r) => s + r[2] * r[3], 0); }
      per.push(b);
      if (contact && b.length) shots.push({ f, i, fw, px, boxes: b });
    }
    if (hit) {
      sheets++; frames += hit;
      /* 256-SPACE, like eyeMask.json and for the same reason: the recolour
         always runs on a 256 frame, so a disk-space table would make every
         consumer redo the conversion and get it wrong once. */
      const k = 256 / fw;
      mask[base] = per.map((b) => b.map(([x, y, w, h]) =>
        [Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k)]));
      report.push(`${base.padEnd(26)} ${hit}/${n} frames, ${per.reduce((s, b) => s + b.length, 0)} box(es)`);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(mask));
  console.log(report.join('\n'));
  console.log(`\n${sheets} sheets, ${frames} frames, ${area} px of eye`);
  console.log('wrote', path.relative(REPO, outPath), (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB');

  if (contact) {
    fs.mkdirSync(contact, { recursive: true });
    /* One strip per sheet that hit, with every box outlined in magenta on the
       frame it came from.  NOTHING SHIPS UNTIL SOMEONE HAS LOOKED AT THIS. */
    const byFile = new Map();
    for (const s of shots) { if (!byFile.has(s.f)) byFile.set(s.f, []); byFile.get(s.f).push(s); }
    for (const [f, list] of byFile) {
      const { fw, px } = list[0];
      const W = fw * list.length, H = px.height;
      const data = new Uint8Array(W * H * 4);
      list.forEach((s, col) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < fw; x++) {
          const sx = s.i * fw + x;
          if (sx >= px.width) continue;
          const si = (y * px.width + sx) * 4, di = (y * W + col * fw + x) * 4;
          data[di] = px.data[si]; data[di + 1] = px.data[si + 1];
          data[di + 2] = px.data[si + 2]; data[di + 3] = px.data[si + 3];
        }
        for (const [bx, by, bw, bh] of s.boxes) {
          for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
            if (y !== by && y !== by + bh - 1 && x !== bx && x !== bx + bw - 1) continue;
            const di = (y * W + col * fw + x) * 4;
            data[di] = 255; data[di + 1] = 0; data[di + 2] = 255; data[di + 3] = 255;
          }
        }
      });
      fs.writeFileSync(path.join(contact, f), encode({ width: W, height: H, data }));
    }
    console.log('contact sheets in', contact);
  }
}
