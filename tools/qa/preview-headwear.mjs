/* ═══ v2.3.1923: HEADWEAR PREVIEW SHEETS — not on the CI path ═══
 *
 * Owner: "some headwear items particularly in the east direction aren't
 * scaled properly and look strange.  Provide previews of headwear in each
 * direction so i can tweak."
 *
 * Renders every hat onto the REAL stand body, in all five stored directions,
 * using the same placement arithmetic the game uses (entityRenderer
 * _placeTrait) so what you see here is what the player sees standing still:
 *
 *   norm      = 256 / texWidth                     (trait frames are 128 now)
 *   anchor    = meta.anchors[dir]                  (256-space, hat's crown)
 *   crown     = body-tops.json["stand-<dir>-0"]    (256-space, body's crown)
 *   drawn     = crown + crownNudge - anchor*scale  (top-left of the hat)
 *   pixel step= 2 * scale                          (128 texture into 256 space)
 *
 * Two views per hat, because the two questions need different backgrounds:
 *   - ON-BODY, cropped to the head, for judging size and seat.
 *   - ISOLATED on a checkerboard, for judging the CUTOUT: any leftover
 *     backdrop halo is invisible against art but obvious against squares.
 *
 * Writes PNGs plus an index.html that tabulates each hat's meta numbers next
 * to its own picture, so a tweak can be read off the page.
 *
 *   node tools/qa/preview-headwear.mjs [outDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(process.argv[2] || path.join(REPO, 'preview/headwear'));
const HW = path.join(REPO, 'public/sprites/traits/headwear');
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const W = 256;

const bodyTops = JSON.parse(fs.readFileSync(path.join(REPO, 'public/sprites/player/body-tops.json'), 'utf8'));

/* ── tiny RGBA canvas ── */
function canvas(w, h, fill) {
  const data = Buffer.alloc(w * h * 4);
  if (fill) for (let i = 0; i < w * h; i++) { data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]; data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3] ?? 255; }
  return { width: w, height: h, data };
}
function checker(w, h, s = 8) {
  const c = canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const on = ((x / s | 0) + (y / s | 0)) % 2 === 0;
    const i = (y * w + x) * 4;
    /* Magenta/grey rather than the usual grey/white: a leftover white or
       black halo hides against grey-on-white, and these frames were keyed
       off a magenta backdrop, so magenta squares make surviving backdrop
       pixels vanish exactly where they'd otherwise be hardest to see. */
    c.data[i] = on ? 208 : 96; c.data[i + 1] = on ? 208 : 24; c.data[i + 2] = on ? 208 : 96; c.data[i + 3] = 255;
  }
  return c;
}
/* Source-over of one decoded image into a canvas, nearest-neighbour, with an
   arbitrary float scale and destination offset. */
function blit(dst, src, dx, dy, scale) {
  const sw = src.width, sh = src.height;
  const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
  for (let y = 0; y < dh; y++) {
    const ty = Math.round(dy) + y;
    if (ty < 0 || ty >= dst.height) continue;
    const sy = Math.min(sh - 1, Math.floor(y / scale));
    for (let x = 0; x < dw; x++) {
      const tx = Math.round(dx) + x;
      if (tx < 0 || tx >= dst.width) continue;
      const sx = Math.min(sw - 1, Math.floor(x / scale));
      const si = (sy * sw + sx) * 4, di = (ty * dst.width + tx) * 4;
      const a = src.data[si + 3] / 255;
      if (!a) continue;
      for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round(src.data[si + k] * a + dst.data[di + k] * (1 - a));
      dst.data[di + 3] = Math.max(dst.data[di + 3], src.data[si + 3]);
    }
  }
}
function crop(src, x0, y0, w, h) {
  const c = canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
    const si = (sy * src.width + sx) * 4, di = (y * w + x) * 4;
    for (let k = 0; k < 4; k++) c.data[di + k] = src.data[si + k];
  }
  return c;
}
function upscale(src, f) {
  const c = canvas(src.width * f, src.height * f);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const si = ((y / f | 0) * src.width + (x / f | 0)) * 4, di = (y * c.width + x) * 4;
    for (let k = 0; k < 4; k++) c.data[di + k] = src.data[si + k];
  }
  return c;
}

/** The game's own placement, reduced to stand/frame-0/no-mirror/bodyScale 1. */
export function placement(meta, dir, texW) {
  const pick = (o) => o && (o[dir] != null ? o[dir] : undefined);
  const anchor = pick(meta.anchors) || [W / 2, 0];
  const nudge = pick(meta.crownNudge) || [0, 0];
  const dscale = (pick(meta.scale) ?? 1);
  const crown = bodyTops[`stand-${dir}-0`] || [W / 2, 0];
  const norm = W / texW;                        // 2 for a 128 frame
  const step = norm * dscale;                   // source px -> dest px
  return {
    dscale, anchor, nudge, crown, step,
    x: crown[0] + nudge[0] - anchor[0] * dscale,
    y: crown[1] + nudge[1] - anchor[1] * dscale,
  };
}

/* v2.3.1925: everything below is the SHEET RUN and only fires when this file
   is the process entry point.  tools/fit-headwear-scale.mjs imports
   `placement` above so the before/after montage it renders is the same
   arithmetic this sheet is drawn with — one placement function, not two that
   drift apart.  Without the guard, importing it wrote a 4MB sheet as a side
   effect (and mkdir'd over the caller's output path). */
const ENTRY = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(path.dirname(new URL(import.meta.url).pathname), 'preview-headwear.mjs');
if (ENTRY) {

const items = fs.readdirSync(HW).filter((d) => fs.statSync(path.join(HW, d)).isDirectory()).sort();
fs.mkdirSync(OUT, { recursive: true });

/* Head crop window in 256-space: wide enough for a sombrero brim, tall enough
   to show the hat sitting on the head plus a little neck for context. */
const CROP = { x: 48, y: 0, w: 160, h: 150 };
const ZOOM = 2;

const report = [];
for (const it of items) {
  const meta = JSON.parse(fs.readFileSync(path.join(HW, it, 'meta.json'), 'utf8'));
  const row = { item: it, dirs: {} };
  for (const dir of DIRS) {
    const hatPath = path.join(HW, it, `${dir}.png`);
    const bodyPath = path.join(REPO, `public/sprites/player/stand-${dir}.png`);
    if (!fs.existsSync(hatPath)) continue;
    const hat = decode(fs.readFileSync(hatPath));
    const body = decode(fs.readFileSync(bodyPath));
    const p = placement(meta, dir, hat.width);

    /* on-body */
    const scene = canvas(W, W, [28, 34, 38, 255]);
    blit(scene, body, 0, 0, 1);
    blit(scene, hat, p.x, p.y, p.step);
    const onBody = upscale(crop(scene, CROP.x, CROP.y, CROP.w, CROP.h), ZOOM);
    fs.writeFileSync(path.join(OUT, `${it}-${dir}-body.png`), encode(onBody));

    /* isolated on checkerboard, same zoom, hat centred in its own bbox */
    const iso = checker(hat.width * ZOOM, hat.width * ZOOM, 8);
    blit(iso, hat, 0, 0, ZOOM);
    fs.writeFileSync(path.join(OUT, `${it}-${dir}-iso.png`), encode(iso));

    /* measured hat width on screen vs the head's width at crown level, the
       number that actually says "too big / too small on this facing" */
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, vis = 0;
    for (let y = 0; y < hat.height; y++) for (let x = 0; x < hat.width; x++) {
      if (hat.data[(y * hat.width + x) * 4 + 3] > 8) { vis++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    const drawnW = vis ? (maxx - minx + 1) * p.step : 0;
    const drawnH = vis ? (maxy - miny + 1) * p.step : 0;
    row.dirs[dir] = {
      dscale: p.dscale, nudge: p.nudge, anchor: p.anchor,
      drawnW: +drawnW.toFixed(1), drawnH: +drawnH.toFixed(1), vis,
    };
  }
  report.push(row);
}

/* ── head width per direction, measured off the bare body at crown level ── */
const headW = {};
for (const dir of DIRS) {
  const body = decode(fs.readFileSync(path.join(REPO, `public/sprites/player/stand-${dir}.png`)));
  const crown = bodyTops[`stand-${dir}-0`] || [128, 0];
  /* widest opaque run in the 16 rows below the crown = the skull */
  let best = 0;
  for (let y = crown[1]; y < crown[1] + 16 && y < body.height; y++) {
    let lo = 1e9, hi = -1e9;
    for (let x = 0; x < body.width; x++) if (body.data[(y * body.width + x) * 4 + 3] > 8) { if (x < lo) lo = x; if (x > hi) hi = x; }
    if (hi >= lo) best = Math.max(best, hi - lo + 1);
  }
  headW[dir] = best;
}

for (const r of report) for (const d of DIRS) {
  if (r.dirs[d]) r.dirs[d].ratio = +(r.dirs[d].drawnW / headW[d]).toFixed(2);
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ headW, report }, null, 1));

/* ── index.html ── */
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
let html = `<!doctype html><meta charset="utf-8"><title>Headwear preview</title>
<style>
 body{background:#121B20;color:#F7F2E7;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:20px}
 h1{font-size:20px;margin:0 0 4px} .sub{color:#96A2A0;margin:0 0 18px;font-size:13px}
 .nav{position:sticky;top:0;background:#121B20;padding:8px 0 12px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:16px;z-index:2}
 .nav a{color:#D8A85F;margin-right:12px;text-decoration:none;font-size:13px}
 table{border-collapse:collapse;margin:0 0 26px;width:100%}
 th{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#96A2A0;text-align:left;padding:6px 8px;font-weight:600}
 td{padding:6px 8px;vertical-align:top;border-top:1px solid rgba(255,255,255,.08)}
 .item{font-weight:700;font-size:15px;white-space:nowrap}
 img{image-rendering:pixelated;display:block;border-radius:6px}
 .num{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#B9C1BF;white-space:pre}
 .warn{color:#E0A05E;font-weight:700}
 .bad{color:#E06A5E;font-weight:700}
 .cell{display:flex;flex-direction:column;gap:4px;align-items:center}
</style>
<h1>Headwear preview — all ${items.length} hats × 5 directions</h1>
<p class="sub">Composited with the game's own stand-pose placement (crown anchor + crownNudge + per-direction scale).
Top row of each pair is <b>on the body</b> (judge size and seat); bottom is <b>isolated on a checkerboard</b> (judge the cutout — a leftover halo shows against the squares).
<b>ratio</b> = drawn hat width ÷ head width on that facing; a hat whose east ratio is far from its south ratio is the "looks strange from the side" case.</p>
<div class="nav"><b>Jump:</b> ${items.map((i) => `<a href="#${i}">${i}</a>`).join('')}</div>
<table><tr><th>hat</th>${DIRS.map((d) => `<th>${d}<br><span class="num">head ${headW[d]}px</span></th>`).join('')}</tr>`;
for (const r of report) {
  html += `<tr id="${r.item}"><td class="item">${esc(r.item)}</td>`;
  const ratios = DIRS.map((d) => r.dirs[d] && r.dirs[d].ratio).filter((v) => v != null);
  const med = ratios.slice().sort((a, b) => a - b)[Math.floor(ratios.length / 2)] || 1;
  for (const d of DIRS) {
    const c = r.dirs[d];
    if (!c) { html += '<td class="num">—</td>'; continue; }
    const off = Math.abs(c.ratio - med) / (med || 1);
    const cls = off > 0.35 ? 'bad' : off > 0.18 ? 'warn' : '';
    html += `<td><div class="cell">
      <img src="${r.item}-${d}-body.png" width="${CROP.w * ZOOM / 2}">
      <img src="${r.item}-${d}-iso.png" width="128">
      <div class="num">scale ${c.dscale}
nudge ${c.nudge[0]},${c.nudge[1]}
w ${c.drawnW}  <span class="${cls}">ratio ${c.ratio}</span></div></div></td>`;
  }
  html += '</tr>';
}
html += '</table>';
fs.writeFileSync(path.join(OUT, 'index.html'), html);

console.log(`wrote ${report.length * DIRS.length * 2} PNGs + index.html to ${OUT}`);
console.log('head widths (256-space):', headW);
console.log('\nhats whose EAST ratio deviates most from their own median facing:');
const dev = report.map((r) => {
  const rs = DIRS.map((d) => r.dirs[d] && r.dirs[d].ratio).filter((v) => v != null);
  const med = rs.slice().sort((a, b) => a - b)[Math.floor(rs.length / 2)] || 1;
  const e = r.dirs.east && r.dirs.east.ratio;
  return { item: r.item, east: e, med: +med.toFixed(2), off: e ? +((e - med) / med).toFixed(2) : 0 };
}).sort((a, b) => Math.abs(b.off) - Math.abs(a.off));
for (const d of dev.slice(0, 14)) {
  console.log(`  ${d.item.padEnd(20)} east ratio ${String(d.east).padEnd(5)} vs median ${String(d.med).padEnd(5)} → ${d.off > 0 ? '+' : ''}${(d.off * 100).toFixed(0)}%`);
}

}
