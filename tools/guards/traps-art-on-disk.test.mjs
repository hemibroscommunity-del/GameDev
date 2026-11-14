/* ═══ v2.3.5326: TRAPS INTO GUARDS, THE ART ON DISK (card V PR 7) ═══
 *
 * Grand plan step 8.2, card V's last batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.  Read off the shipped files: the tee sheets, the
 * eyewear frames with src/rendering/eyeMask.json, the traits' hi/ frames, the
 * body sheets.  A PNG is read with tools/png.mjs (RGB, RGBA); a 256-colour one
 * with the game's own src/rendering/png8Decode.js (as card P's gate does).
 *
 * TRAPS §27 (one case): the tee sheets the seal writes (tools/gear/seal-shirt-edges.mjs: stand and jog, five facings) keep their near-black keyline count within what ships plus 4 px a frame, so an opening filled black, or a seal run twice, fails; a clipped measurement in another tool is not seen. Break: public/sprites/gear/shirt/tshirt/stand-south.png: three rows over the collar filled near-black (48 px) -> FAIL (tried 2026-11-14).
 * TRAPS §55 (the rule): every shipped eyewear piece, placed as the game places it (characterPortrait.js placeTrait: its anchor on the head's crown and nudge), has the eye it is worn over behind it on every facing that paints eyes (eyeMask.json), and a pair has both. Break: public/sprites/traits/eyewear/thug-life/meta.json: crownNudge.south y lifted 6 px, the shoulders' registration -> FAIL (tried 2026-11-14).
 * TRAPS §56 (the rule): no shipped eyewear piece is taller than 0.6 of the head (body-anchors.json, the import's own warning line): a keyed outline is the figure's height. Break: public/sprites/traits/eyewear/goggles/south.png: a one-pixel outline drawn down to the frame's bottom -> FAIL (tried 2026-11-14).
 * TRAPS §58 (the rule): every trait's hi/ frame, halved, is the same drawing as its world frame (alpha silhouettes, IoU at or over 0.8; one facing a trait, the facings in turn): a re-import that leaves the old original in hi/ fails. Break: public/sprites/traits/eyewear/eye-patch/hi: every frame mirrored, the patch on the other eye (a stale re-import) -> FAIL (tried 2026-11-14).
 * TRAPS §255 (the rule): no body or torso sheet made from an original (public/sprites/player/<pose>-<dir>-body.png, -torso.png) holds a pixel the recolour reads (alpha over 40) where the original is empty and outside the figure (tools/art/clean-sword-fill.py's rule). Break: public/sprites/player/sword-south-body.png: the gap between the legs filled with flat grey 90 -> FAIL (tried 2026-11-14).
 *
 * SAMPLED, TO STAY UNDER A SECOND OR TWO (the README).  §58 reads one facing
 * of each of the ~61 traits with a hi/ folder, the facings in turn by the
 * trait's place in the list, so every facing and every trait is read (all
 * 285 pairs take a second alone; `--all` reads them all).  §27 reads the ten
 * sheets the seal writes, not the 25 other tee strips.  §255 floods each strip
 * from its own edges, not each frame's: it can miss a pocket reached only
 * from between two frames (fewer findings), never invent one.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §27   stand-south.png: three rows over the collar near-black (130 > 86)    -> FAIL §27
 *   §55   thug-life meta: crownNudge.south [x, y-6] (86%/86%)                   -> FAIL §55
 *   §56   goggles south.png: a 1 px column down to the frame's foot            -> FAIL §56
 *   §58   eye-patch hi/*.png mirrored, a stale re-import (sampled: sw 0.25)     -> FAIL §58
 *   §255  sword-south-body.png: flat grey 90 between the legs (841 px)        -> FAIL §255
 *
 * Run from the repository's root: node tools/guards/traps-art-on-disk.test.mjs [--all]
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/fourLines.mjs';
import { decode } from '../png.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const P = (f) => join(ROOT, f);
const json = (f) => JSON.parse(readFileSync(P(f), 'utf8'));
const { decodePng8 } = await import(pathToFileURL(P('src/rendering/png8Decode.js')).href);

/* a PNG as { width, height, data: RGBA }, whatever its colour type */
async function readPng(f) {
  const bytes = readFileSync(P(f));
  if (bytes[25] !== 3) return decode(bytes);
  const p = await decodePng8(new Uint8Array(bytes), async (z) => new Uint8Array(inflateSync(z)));
  if (!p) throw new Error('not a 256-colour PNG png8Decode reads: ' + f);
  const data = new Uint8Array(p.w * p.h * 4);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = p.idx[y * p.stride + x], o = (y * p.w + x) * 4;
    data[o] = p.rgb[i * 3]; data[o + 1] = p.rgb[i * 3 + 1]; data[o + 2] = p.rgb[i * 3 + 2]; data[o + 3] = p.alpha[i];
  }
  return { width: p.w, height: p.h, data };
}
const lum = (d, k) => 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];

/* ── §27: the tee's keylines are not thickened ── */
{
  /* near-black opaque pixels (alpha over 40, luminance under 70: the old
     mp-shirtkeyline's measure) as the sheets ship today */
  const SHIPS = {
    'stand-south': 82, 'stand-southwest': 108, 'stand-east': 68, 'stand-northeast': 86, 'stand-north': 78,
    'jog-south': 3394, 'jog-southwest': 2224, 'jog-east': 2088, 'jog-northeast': 2293, 'jog-north': 2400,
  };
  const over = [];
  for (const [k, n] of Object.entries(SHIPS)) {
    const f = `public/sprites/gear/shirt/tshirt/${k}.png`;
    if (!existsSync(P(f))) { over.push(`${k}: gone (a sheet the seal writes; take its line off)`); continue; }
    const I = await readPng(f);
    let b = 0;
    for (let i = 0; i < I.width * I.height; i++) { const k4 = i * 4; if (I.data[k4 + 3] > 40 && lum(I.data, k4) < 70) b++; }
    const budget = n + 4 * Math.max(1, Math.round(I.width / 128));
    if (b > budget) over.push(`${k}: ${b} > ${budget}`);
  }
  check('§27: the tee sheets the seal writes keep their near-black keyline within what ships plus 4 px a frame (the openings stay open)', over.length === 0, over);
}

/* ── §55, §56: a face-worn piece sits on the eyes, and is a piece ── */
{
  const eyeMask = json('src/rendering/eyeMask.json');
  const tops = json('public/sprites/player/body-tops.json');
  const heads = json('public/sprites/player/body-anchors.json');
  const { headCrown } = await import(pathToFileURL(P('src/rendering/headCrowns.js')).href);
  const pieces = readdirSync(P('public/sprites/traits/eyewear'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const off = [], tall = [], rows = [];
  for (const id of pieces) {
    const meta = json(`public/sprites/traits/eyewear/${id}/meta.json`);
    const covers = {};
    for (const dir of ['south', 'southwest', 'east']) {
      const f = `public/sprites/traits/eyewear/${id}/${dir}.png`;
      if (!existsSync(P(f)) || !meta.anchors || !meta.anchors[dir]) continue;
      const img = await readPng(f);
      const W = img.width, H = img.height, norm = 256 / W;
      /* the placement, as characterPortrait.js placeTrait does it (stand, frame 0) */
      const anchor = meta.anchors[dir];
      const cn = (meta.crownNudge && meta.crownNudge[dir]) || [0, 0];
      const pn = (meta.poseNudge && meta.poseNudge.stand && meta.poseNudge.stand[dir]) || [0, 0];
      const sc = ((meta.scale && meta.scale[dir]) || 1) * ((meta.scaleByPose && meta.scaleByPose.stand && meta.scaleByPose.stand[dir]) || 1);
      const crown = headCrown(tops, 'stand', dir, 0);
      const tx = crown[0] + cn[0] + pn[0], ty = crown[1] + cn[1] + pn[1];
      /* the piece's FILLED silhouette: a ring's hole (the monocle's glass) is the piece */
      const outside = new Uint8Array(W * H);
      const op = (i) => img.data[i * 4 + 3] > 40;
      const st = [];
      for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
      while (st.length) {
        const i = st.pop();
        if (outside[i] || op(i)) continue;
        outside[i] = 1;
        const x = i % W, y = (i / W) | 0;
        if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W);
      }
      /* §56: its height against the head's */
      let y0 = H, y1 = -1;
      for (let i = 0; i < W * H; i++) if (op(i)) { const y = (i / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const hgt = (y1 - y0 + 1) * norm * sc;
      const hb = heads[`stand-${dir}-0`] && heads[`stand-${dir}-0`].head;
      if (hb && hgt > 0.6 * hb.height) tall.push(`${id} ${dir}: ${hgt.toFixed(0)} px against a ${hb.height} px head`);
      /* §55: each eye's pupils (the game's eye mask, frame 0) behind the piece */
      const runs = ((eyeMask['stand-' + dir] || [[]])[0] || []).slice().sort((a, b) => a[0] - b[0]);
      const eyes = [];
      for (const q of runs) { if (eyes.length && q[0] - eyes[eyes.length - 1][eyes[eyes.length - 1].length - 1][0] <= 4) eyes[eyes.length - 1].push(q); else eyes.push([q]); }
      covers[dir] = eyes.map((e) => {
        let n = 0, c = 0;
        for (const [x0, ey0, w, h] of e) for (let y = ey0; y < ey0 + h; y++) for (let x = x0; x < x0 + w; x++) {
          n++;
          const u = Math.floor(((x + 0.5 - tx) / sc + anchor[0]) / norm), v = Math.floor(((y + 0.5 - ty) / sc + anchor[1]) / norm);
          if (u >= 0 && v >= 0 && u < W && v < H && !outside[v * W + u]) c++;
        }
        return n ? c / n : 0;
      });
    }
    const pair = (covers.south || []).length >= 2 && covers.south.every((c) => c >= 0.9);
    rows.push(`${id}${pair ? ' (a pair)' : ''}: ${Object.entries(covers).map(([d, cs]) => d + ' ' + cs.map((c) => Math.round(c * 100) + '%').join('/')).join(', ')}`);
    for (const [dir, cs] of Object.entries(covers)) {
      if (!cs.length) continue;
      const ok = pair ? cs.every((c) => c >= 0.9) : Math.max(...cs) >= 0.9;
      if (!ok) off.push(`${id} ${dir}: ${cs.map((c) => Math.round(c * 100) + '%').join('/')}${pair ? ' (a pair: both eyes)' : ''}`);
    }
  }
  check(`§55: every eyewear piece has the eye it is worn over behind it on each facing that paints eyes, a pair both (${pieces.length} pieces)`,
    pieces.length >= 5 && rows.length === pieces.length && off.length === 0, off.length ? off : rows);
  check('§56: no eyewear piece is taller than 0.6 of the head (a keyed outline is the figure\'s height)', tall.length === 0, tall);
}

/* ── §58: a trait's hi/ frame is the drawing its world frame is ── */
{
  const ALL = process.argv.includes('--all');
  const FACINGS = ['south', 'southwest', 'east', 'northeast', 'north'];
  const R = 'public/sprites/traits';
  const traits = [];
  for (const cat of readdirSync(P(R), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    for (const id of readdirSync(P(`${R}/${cat}`), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
      if (existsSync(P(`${R}/${cat}/${id}/hi`))) traits.push(`${R}/${cat}/${id}`);
    }
  }
  const bad = [];
  let read = 0;
  for (let t = 0; t < traits.length; t++) {
    const have = FACINGS.filter((d) => existsSync(P(`${traits[t]}/hi/${d}.png`)) && existsSync(P(`${traits[t]}/${d}.png`)));
    const pick = ALL ? have : have.length ? [have[t % have.length]] : [];
    for (const d of pick) {
      const Hi = await readPng(`${traits[t]}/hi/${d}.png`), Lo = await readPng(`${traits[t]}/${d}.png`);
      read++;
      if (Hi.width !== 2 * Lo.width || Hi.height !== 2 * Lo.height) { bad.push(`${traits[t]}/${d}: hi ${Hi.width} is not twice ${Lo.width}`); continue; }
      let inter = 0, uni = 0;
      for (let y = 0; y < Lo.height; y++) for (let x = 0; x < Lo.width; x++) {
        let n = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (Hi.data[((2 * y + dy) * Hi.width + 2 * x + dx) * 4 + 3] > 40) n++;
        const a = n >= 2, b = Lo.data[(y * Lo.width + x) * 4 + 3] > 40;
        if (a && b) inter++;
        if (a || b) uni++;
      }
      const iou = uni ? inter / uni : 1;
      if (iou < 0.8) bad.push(`${traits[t].slice(R.length + 1)}/${d}: ${iou.toFixed(2)}`);
    }
  }
  check(`§58: every trait's hi/ frame, halved, is the drawing its world frame is (${read} of ${traits.length} traits' frames read${ALL ? ', all' : ': one facing each, in turn'})`,
    traits.length >= 20 && read >= traits.length && bad.length === 0, bad);
}

/* ── §255: what a body sheet must not have stays empty ── */
{
  const D = 'public/sprites/player';
  const isKey = (r, g, b, a) => a > 40 && ((r > 150 && b > 150 && g < 110) || (g > 150 && b > 150 && r < 110));
  const sheets = readdirSync(P(D)).filter((f) => /-(?:body|torso)\.png$/.test(f) && existsSync(P(`${D}/${f.replace(/-(?:body|torso)\.png$/, '.png')}`))).sort();
  const found = [];
  for (const f of sheets) {
    const S = await readPng(`${D}/${f}`), O = await readPng(`${D}/${f.replace(/-(?:body|torso)\.png$/, '.png')}`);
    if (S.width !== O.width || S.height !== O.height) { found.push(`${f}: not its original's size`); continue; }
    const W = O.width, H = O.height, pass = new Uint8Array(W * H), out = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { const k = i * 4, a = O.data[k + 3]; pass[i] = (a <= 40 || isKey(O.data[k], O.data[k + 1], O.data[k + 2], a)) ? 1 : 0; }
    const st = [];
    const seed = (i) => { if (pass[i] && !out[i]) { out[i] = 1; st.push(i); } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; if (x > 0) seed(i - 1); if (x < W - 1) seed(i + 1); if (y > 0) seed(i - W); if (y < H - 1) seed(i + W); }
    let n = 0;
    for (let i = 0; i < W * H; i++) if (S.data[i * 4 + 3] > 40 && O.data[i * 4 + 3] <= 40 && out[i]) n++;
    if (n) found.push(`${f}: ${n} px`);
  }
  check(`§255: no body or torso sheet made from an original holds a pixel the recolour reads where the original is empty, outside the figure (${sheets.length} sheets)`,
    sheets.length >= 6 && found.length === 0, found);
}

process.exit(failed ? 1 : 0);
