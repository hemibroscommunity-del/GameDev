/* build_fire_8f — convert the owner's 8-frame firemaking art into the engine's
 * strip format, and rebuild the `fire` crown table for it (v2.3.1715).
 *
 * WHY THIS EXISTS.  The firemaking stand-in used to be
 * public/sprites/skills/firemaking-strip.webp — 4669x220, 29 frames of 161x220
 * — and its only gear layer was a SHIRT derived from the body itself
 * (tools/build_fire_shirt.mjs, v2.3.1713).  There was no chest or legs sheet,
 * so the fire-lighter could not wear armour the way the cook (v2.3.1114/1115)
 * and the chopper (v2.3.1131) can.
 *
 * The owner supplied four mutually-generated 1536x1024 contact sheets — body,
 * shirt, chest armour, legs armour — each a 4-col x 2-row grid of 384x512
 * cells, 8 frames.  The decision (owner, 2026-08-13) is a WHOLESALE REPLACEMENT:
 * the 29-frame animation is RETIRED, the 8-frame one is the only one, and the
 * supplied sheets are taken AS THEY ARE — this tool does not re-register them
 * against each other.  See "WHAT THE ART ACTUALLY DOES" below, which is the
 * honest measurement of how the gear lands, kept here because it is the thing a
 * future reader will want and cannot get from the code.
 *
 * ── FRAME SIZE: 384x512, i.e. the source cells UNTOUCHED ────────────────────
 * The choice is measured, not aesthetic.  The new cells are the SAME animation
 * as the old strip, re-rendered larger: an alpha-mask search over (scale, dx,
 * dy) fitting each of the 8 cells onto its old-strip counterpart (the mapping,
 * verified by that same fit, is old frames 0, 4, 8 … 28) lands on
 *
 *     scale 0.43 on 8/8 frames, dx -4..+2, dy -1..+13
 *
 * and 220/512 = 0.4297.  So one cell IS one old frame at 512/220 = 2.327x, with
 * the cell origin on the frame origin.  (The dy spread is the fire's soft glow
 * halo dragging the mask fit on the late frames, not a real offset.)
 * Therefore:
 *
 *   - keep the cells at native 384x512 and lay the 4x2 grid out as an 8x1 strip.
 *     NOTHING is resampled — there is no downscale to alias, which is the best
 *     possible answer to "nearest-neighbour, do not smooth it";
 *   - keep the renderer's drawn height FH = 154 unchanged.  The old figure drew
 *     at 154/220 = 0.7 screen px per art px on art 1/2.327 this size, i.e.
 *     0.3008 screen px per NEW art px; the new one draws at 154/512 = 0.3008.
 *     On-screen size is preserved to four significant figures (drawn height of
 *     the standing frame: 130.9px before, 130.8px after).
 *
 * The two knock-ons are handled in effectsRenderer.js and are easy to miss:
 *   - sp.scale.y drops 0.7 -> 0.3008, so _skillTraitMul.fire (which multiplies
 *     it to size the player's HAT) has to be multiplied by 2.327: 0.85 -> 1.98,
 *     or every hat shrinks to 43% on this pose only;
 *   - _updateRemoteExtraction sized peers with a hardcoded `spec.h / 220`.
 *
 * ── FRAME CADENCE ──────────────────────────────────────────────────────────
 * 29 frames x 55ms = 1595ms.  8 x 200ms = 1600ms, so the light still takes the
 * same time.  8 x 55ms would have been 440ms — a twitch, not an animation.
 *
 * ── CROWNS ─────────────────────────────────────────────────────────────────
 * crowns.json's `fire` entry is per-frame and seats the player's hat, so a
 * 29-entry table on an 8-frame strip flings hats around.  It is re-derived here
 * with build_fire_shirt's recipe — topmost contiguous skin run at least RUNW px
 * wide, using the ratio-windowed skin test that rejects the flame and its glow
 * halo — and cross-checked against the OLD crowns for the 8 mapped frames
 * scaled by 512/220.  The hand-repaired frames 22/23 from v2.3.1713 are moot:
 * those frames no longer exist.
 *
 * ── WHAT WAS TRIED AND REJECTED ────────────────────────────────────────────
 *  - Rebuilding at 161x220 so no renderer constant has to move.  It works
 *    geometrically (that is exactly what the registration fit says) but it
 *    throws away 82% of the supplied pixels through a 0.43 nearest-neighbour
 *    decimation to save three numbers in one file.
 *  - An integer 2:1 downscale to 192x256.  A transition histogram (how often a
 *    pixel differs from its left neighbour, bucketed by x mod 4) comes out flat
 *    — 39080/39870/39288/39648 — so the source is NOT on a 2x2 block grid and a
 *    2:1 drop is lossy like any other.
 *  - Re-deriving the shirt from the new body with the v2.3.1713 recipe, which
 *    produces a perfectly registered garment.  Rejected because the owner asked
 *    for the supplied shirt sheet; the recipe still lives in
 *    build_fire_shirt.mjs if that decision is revisited.  It is the fix for the
 *    misregistration measured below.
 *
 * ── WHAT THE ART ACTUALLY DOES (measured, not papered over) ────────────────
 * The four sheets are NOT registered to each other.  Composited as supplied the
 * chest plate lands low and left of the torso, the greaves land over the log,
 * and on the mid frames both overlap the flame.  The "gear vs torso" table
 * printed on every run is the number behind that sentence.  Nothing HERE nudges
 * it, because a silent nudge would hide the very thing that needs deciding.
 *
 * ⚠ AND IT WAS DECIDED (v2.3.1723).  Shown the composited figure, the owner's
 * answer was that it does not look right — the garment sits low and left of the
 * torso and, on the tending frames, inside the flames.  The correction is a
 * per-frame offset table, FIRE_GEAR_REG in effectsRenderer.js, measured by
 * tools/measure_fire_gear_reg.mjs.  It lives in the RENDERER so these sheets
 * stay byte-for-byte the art that was supplied and one deleted constant reverts
 * it.  If corrected art ever arrives, re-run this tool AND delete that table —
 * leaving it in place would nudge already-correct sheets back off the body.
 *
 *   node tools/build_fire_8f.mjs           # measure + previews -> scratch
 *   APPLY=1 node tools/build_fire_8f.mjs   # also write the four sheets + crowns
 *
 * Env: ART (source dir), SCRATCH (preview dir), RUNW (crown run width, 24).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';

const REPO = process.cwd();
const ART = process.env.ART || '/tmp/claude-0/-home-user-GameDev/ba2a7620-b71c-5524-9335-7697a970ae8a/scratchpad/fire-art';
const SCRATCH = process.env.SCRATCH || '/tmp/fire-8f';
const APPLY = process.env.APPLY === '1';
const RUNW = +(process.env.RUNW ?? 24);
const MINBLOB = +(process.env.MINBLOB ?? 1800);   /* see FIRE_SKIN_OPTS in effectsRenderer.js */
const CW = 384, CH = 512, N = 8;

const OUT = {
  body: join(REPO, 'public/sprites/skills/firemaking-strip.webp'),
  shirt: join(REPO, 'public/sprites/gear/shirt/tshirt/fire-south.png'),
  chest: join(REPO, 'public/sprites/gear/chest/steelplate/fire-south.png'),
  legs: join(REPO, 'public/sprites/gear/legs/steelgreaves/fire-south.png'),
};
const CROWNS = join(REPO, 'public/sprites/skills/crowns.json');

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const srv = createServer(async (q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/blank.html') { s.writeHead(200, { 'content-type': 'text/html' }); s.end('<!doctype html><body>'); return; }
  const root = p.startsWith('/art/') ? ART : join(REPO, 'public');
  const rel = p.startsWith('/art/') ? p.slice(4) : p;
  try {
    const b = await readFile(join(root, rel));
    s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); s.end(b);
  } catch { s.writeHead(404); s.end(); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto(base + '/blank.html');

const out = await page.evaluate(async ({ base, RUNW, MINBLOB, CW, CH, N }) => {
  const load = (u) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(u)); i.src = u; });
  const ctxOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return x; };

  /* ── 4x2 grid -> 8x1 strip.  Straight blits, no scaling anywhere. ───────── */
  const toStrip = (img) => {
    const x = ctxOf(CW * N, CH);
    for (let f = 0; f < N; f++) x.drawImage(img, (f % 4) * CW, Math.floor(f / 4) * CH, CW, CH, f * CW, 0, CW, CH);
    return x;
  };

  const FILE = { body: 'body', shirt: 'shirt', chest: 'chest-armour', legs: 'legs-armour' };
  const srcs = {};
  for (const k in FILE) srcs[k] = await load(base + '/art/src-' + FILE[k] + '-8f.png');
  const strips = {}, pngs = {};
  for (const k in srcs) { strips[k] = toStrip(srcs[k]); pngs[k] = strips[k].canvas.toDataURL('image/png').split(',')[1]; }

  /* ── the skin classifier, verbatim from playerSkins._isSkin + the fire's
     ratio window (FIRE_SKIN_OPTS).  Re-stated rather than imported so this tool
     stays a single file, exactly as build_fire_shirt.mjs does. ────────────── */
  const OPTS = { maxBR: 0.50, minGR: 0.45, maxGR: 0.80 };
  const isSkin = (r, g, b, al) => al > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25
    && (b / r) <= OPTS.maxBR && (g / r) >= OPTS.minGR && (g / r) <= OPTS.maxGR;

  /* ── the body strip keeps the .webp name every reference already uses, and
     that is a LOSSY encode: the shipped 29-frame file is VP8+ALPH (checked with
     a chunk dump — VP8L would be the lossless one), and there is no cwebp or
     PIL in this sandbox, so canvas toDataURL('image/webp', 1) is the encoder.
     Byte-exactness is therefore the wrong gate, and the right one is what the
     bytes are FOR: recolorStandInSkin's classification.  Measured here as the
     number of VISIBLE pixels that change skin/not-skin across the round trip —
     if that is ~0 the recolour cannot tell the two files apart. */
  const webp = strips.body.canvas.toDataURL('image/webp', 1);
  const rt = await load(webp);
  const a = strips.body.getImageData(0, 0, CW * N, CH).data;
  const bctx = ctxOf(CW * N, CH); bctx.drawImage(rt, 0, 0);
  const b2 = bctx.getImageData(0, 0, CW * N, CH).data;
  let visDiff = 0, visMaxDelta = 0, visN = 0, classFlip = 0;
  for (let p = 0, i = 0; p < CW * N * CH; p++, i += 4) {
    if (a[i + 3] <= 40 && b2[i + 3] <= 40) continue;      /* both invisible: RGB is undefined there */
    visN++;
    for (let c = 0; c < 4; c++) { const dd = Math.abs(a[i + c] - b2[i + c]); if (dd) { visDiff++; if (dd > visMaxDelta) visMaxDelta = dd; } }
    const s1 = isSkin(a[i], a[i + 1], a[i + 2], a[i + 3]) ? 1 : 0;
    const s2 = isSkin(b2[i], b2[i + 1], b2[i + 2], b2[i + 3]) ? 1 : 0;
    if (s1 !== s2) classFlip++;
  }

  const W = CW * N;
  const bd = strips.body.getImageData(0, 0, W, CH).data;
  const px = (f, x, y) => ((y * W) + f * CW + x) * 4;

  /* modal skin colour, so the recolour's reference tone can be stated */
  const hist = new Map();
  for (let f = 0; f < N; f++) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = px(f, x, y);
    if (!isSkin(bd[i], bd[i + 1], bd[i + 2], bd[i + 3])) continue;
    const k = (bd[i] << 16) | (bd[i + 1] << 8) | bd[i + 2];
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const top = [...hist.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4)
    .map(([k, c]) => ({ hex: '#' + k.toString(16).padStart(6, '0'), n: c }));

  /* Connected skin blobs per frame (4-connected, the same labelling
     recolorStandInSkin does), so FIRE_SKIN_OPTS.minBlob can be set from data
     instead of scaled by guesswork off the old 161x220 value.  Each blob is
     reported with its bounding box, because the size alone does not say whether
     a 1129px component is an arm or the flame's orange rim — and retinting the
     flame to the player's skin is precisely the failure the ratio window
     exists to prevent. */
  const blobStats = [], labels = [];
  for (let f = 0; f < N; f++) {
    const mask = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = px(f, x, y);
      if (isSkin(bd[i], bd[i + 1], bd[i + 2], bd[i + 3])) mask[y * CW + x] = 1;
    }
    const lab = new Int32Array(CW * CH); const st = new Int32Array(CW * CH); const blobs = [];
    for (let s0 = 0; s0 < CW * CH; s0++) {
      if (!mask[s0] || lab[s0]) continue;
      const id = blobs.length + 1; let sp = 0, n = 0; st[sp++] = s0; lab[s0] = id;
      let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
      while (sp > 0) {
        const q = st[--sp]; n++; const qx = q % CW, qy = (q / CW) | 0;
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
        if (qx > 0 && mask[q - 1] && !lab[q - 1]) { lab[q - 1] = id; st[sp++] = q - 1; }
        if (qx < CW - 1 && mask[q + 1] && !lab[q + 1]) { lab[q + 1] = id; st[sp++] = q + 1; }
        if (q >= CW && mask[q - CW] && !lab[q - CW]) { lab[q - CW] = id; st[sp++] = q - CW; }
        if (q + CW < CW * CH && mask[q + CW] && !lab[q + CW]) { lab[q + CW] = id; st[sp++] = q + CW; }
      }
      blobs.push({ id, n, box: [minx, miny, maxx, maxy] });
    }
    blobs.sort((p, q) => q.n - p.n);
    blobStats.push(blobs.slice(0, 6));
    labels.push(lab);
  }

  /* ── crowns: topmost contiguous skin run >= RUNW wide ───────────────────── */
  const crowns = [];
  for (let f = 0; f < N; f++) {
    let got = null;
    for (let y = 0; y < CH && !got; y++) {
      let run = 0, end = -1;
      for (let x = 0; x < CW; x++) {
        const i = px(f, x, y);
        if (isSkin(bd[i], bd[i + 1], bd[i + 2], bd[i + 3])) { run++; end = x; } else { if (run >= RUNW) break; run = 0; }
      }
      if (run >= RUNW) got = [end - ((run - 1) >> 1), y];
    }
    crowns.push(got || [CW >> 1, 0]);
  }

  /* ── how the supplied gear lands on the supplied body (reported, not fixed).
     "torso" = the body's own skin between the chin and the waist (topmost pants
     row under the crown); each gear piece's alpha centroid is compared to it. */
  const isPants = (r, g, b, al) => al > 180 && g >= r - 10 && g > b + 8 && r < 150;
  const centroid = (S, f) => {
    let sx = 0, sy = 0, n = 0;
    const d = S.getImageData(0, 0, W, CH).data;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      if (d[px(f, x, y) + 3] <= 40) continue;
      sx += x; sy += y; n++;
    }
    return n ? { cx: sx / n, cy: sy / n, n } : null;
  };
  const gearFit = [];
  for (let f = 0; f < N; f++) {
    const [crx, cry] = crowns[f];
    let waist = CH;
    for (let y = cry; y < CH; y++) { const i = px(f, Math.min(CW - 1, crx), y); if (isPants(bd[i], bd[i + 1], bd[i + 2], bd[i + 3])) { waist = y; break; } }
    const chin = cry + Math.round((waist - cry) * 0.33);
    let tsx = 0, tsy = 0, tn = 0;
    for (let y = chin; y < waist; y++) for (let x = 0; x < CW; x++) {
      const i = px(f, x, y);
      if (isSkin(bd[i], bd[i + 1], bd[i + 2], bd[i + 3])) { tsx += x; tsy += y; tn++; }
    }
    const torso = tn ? { cx: tsx / tn, cy: tsy / tn, n: tn } : null;
    gearFit.push({ f, crown: crowns[f], chin, waist, torso, chest: centroid(strips.chest, f), legs: centroid(strips.legs, f), shirt: centroid(strips.shirt, f) });
  }

  /* ── previews ───────────────────────────────────────────────────────────── */
  const sheet = (draw, label) => {
    const S = 0.55;
    const m = document.createElement('canvas'); m.width = CW * 4 * S; m.height = CH * 2 * S;
    const x = m.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#242424'; x.fillRect(0, 0, m.width, m.height);
    for (let f = 0; f < N; f++) {
      const c = f % 4, r = Math.floor(f / 4);
      x.save(); x.translate(c * CW * S, r * CH * S); x.scale(S, S);
      draw(x, f); x.restore();
      x.strokeStyle = '#0a0'; x.strokeRect(c * CW * S, r * CH * S, CW * S, CH * S);
      x.fillStyle = '#0ff'; x.font = '15px monospace'; x.fillText(label + f, c * CW * S + 4, r * CH * S + 17);
    }
    return m.toDataURL('image/png').split(',')[1];
  };
  const blit = (x, S, f) => x.drawImage(S.canvas, f * CW, 0, CW, CH, 0, 0, CW, CH);

  const prevCrown = sheet((x, f) => {
    blit(x, strips.body, f);
    const [cx, cy] = crowns[f];
    x.strokeStyle = '#f0f'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - 30, cy); x.lineTo(cx + 30, cy); x.moveTo(cx, cy - 20); x.lineTo(cx, cy + 20); x.stroke();
  }, 'c');
  const prevShirt = sheet((x, f) => { blit(x, strips.body, f); blit(x, strips.shirt, f); }, 's');
  const prevArmour = sheet((x, f) => { blit(x, strips.body, f); blit(x, strips.legs, f); blit(x, strips.chest, f); }, 'a');
  /* Skin classification map — magenta = exactly what recolorStandInSkin will
     repaint at MINBLOB, i.e. classified AND in a component that survives the
     blob floor.  If the flame, its halo or the log turns magenta the window or
     the floor is wrong; if part of the BODY stays unpainted the floor is too
     high and the figure will flicker between two skins at frame rate. */
  const sizeOfId = blobStats.map((bl) => { const m = new Map(); for (const b of bl) m.set(b.id, b.n); return m; });
  const prevSkin = sheet((x, f) => {
    blit(x, strips.body, f);
    const id = x.createImageData(CW, CH); const dd = id.data;
    const lab = labels[f], szm = sizeOfId[f];
    for (let p = 0; p < CW * CH; p++) {
      const L = lab[p];
      if (!L || (szm.get(L) || 0) < MINBLOB) continue;
      const o = p * 4; dd[o] = 255; dd[o + 1] = 0; dd[o + 2] = 255; dd[o + 3] = 200;
    }
    const t = ctxOf(CW, CH); t.putImageData(id, 0, 0); x.drawImage(t.canvas, 0, 0);
  }, 'k');

  return {
    pngs, webp: webp.split(',')[1], visDiff, visMaxDelta, visN, classFlip, crowns, top, blobStats, gearFit,
    previews: { crowns: prevCrown, shirt: prevShirt, armour: prevArmour, skin: prevSkin },
  };
}, { base, RUNW, MINBLOB, CW, CH, N });

await browser.close(); srv.close();

/* ── report ───────────────────────────────────────────────────────────────── */
console.log(`strip: ${CW * N}x${CH}, ${N} frames of ${CW}x${CH}`);
console.log(`webp q=1 round-trip over ${out.visN} visible px: ${out.visDiff} changed channel bytes (max delta ${out.visMaxDelta}), `
  + `${out.classFlip} pixels flip skin/not-skin (${(100 * out.classFlip / out.visN).toFixed(3)}%)`);
console.log('modal skin colours:', out.top.map((t) => `${t.hex} x${t.n}`).join('  '));
console.log(`skin blobs per frame (size @ bbox), floor MINBLOB=${MINBLOB}:`);
out.blobStats.forEach((s, f) => console.log(`  f${f}: ` + s.map((b) => `${b.n}${b.n >= MINBLOB ? '*' : ' '}@[${b.box.join(',')}]`).join('  ')));
const keptMin = Math.min(...out.blobStats.map((s) => Math.min(...s.filter((b) => b.n >= MINBLOB).map((b) => b.n))));
const dropMax = Math.max(...out.blobStats.map((s) => Math.max(0, ...s.filter((b) => b.n < MINBLOB).map((b) => b.n))));
console.log(`  (* = retinted)  smallest KEPT blob ${keptMin}, largest DROPPED blob ${dropMax} — the floor must sit inside that gap`);
console.log('crowns (new 384x512 space):', JSON.stringify(out.crowns));
const OLD = [[105, 15], [98, 75], [94, 86], [117, 79], [117, 79], [117, 79], [108, 67], [105, 16]];
console.log('cross-check vs OLD crowns (frames 0,4,8..28) x 512/220:');
out.crowns.forEach((c, i) => {
  const o = [Math.round(OLD[i][0] * 512 / 220), Math.round(OLD[i][1] * 512 / 220)];
  console.log(`  f${i}: derived ${JSON.stringify(c)}  old-scaled ${JSON.stringify(o)}  d=(${c[0] - o[0]},${c[1] - o[1]})`);
});
console.log('gear vs torso (dx > 0 = gear is RIGHT of the torso centre; dy > 0 = BELOW it):');
for (const g of out.gearFit) {
  const t = g.torso;
  const rel = (c) => (c && t) ? `dx ${(c.cx - t.cx).toFixed(0).padStart(4)} dy ${(c.cy - t.cy).toFixed(0).padStart(4)}` : 'n/a';
  console.log(`  f${g.f} torso@(${t ? t.cx.toFixed(0) : '?'},${t ? t.cy.toFixed(0) : '?'})  chest ${rel(g.chest)} | legs ${rel(g.legs)} | shirt ${rel(g.shirt)}`);
}

await mkdir(SCRATCH, { recursive: true });
for (const [k, v] of Object.entries(out.previews)) await writeFile(join(SCRATCH, 'preview-' + k + '.png'), Buffer.from(v, 'base64'));
console.log('previews ->', SCRATCH);

if (APPLY) {
  for (const k of ['shirt', 'chest', 'legs']) {
    await mkdir(dirname(OUT[k]), { recursive: true });
    await writeFile(OUT[k], Buffer.from(out.pngs[k], 'base64'));
    console.log('WROTE', OUT[k]);
  }
  await writeFile(OUT.body, Buffer.from(out.webp, 'base64'));
  console.log('WROTE', OUT.body);
  const j = JSON.parse(await readFile(CROWNS, 'utf8'));
  j.fire = { fw: CW, fh: CH, n: N, crowns: out.crowns };
  await writeFile(CROWNS, JSON.stringify(j) + '\n');
  console.log('WROTE', CROWNS, '(fire entry rebuilt for 8 frames)');
} else {
  for (const k of ['shirt', 'chest', 'legs']) await writeFile(join(SCRATCH, k + '-fire-south.png'), Buffer.from(out.pngs[k], 'base64'));
  await writeFile(join(SCRATCH, 'firemaking-strip.webp'), Buffer.from(out.webp, 'base64'));
  console.log('sheets (preview copies) ->', SCRATCH, ' — rerun with APPLY=1 to install');
}
