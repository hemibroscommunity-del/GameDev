#!/usr/bin/env node
/* ═══ v2.3.3728: THE EXISTING PICTURES ON 256 COLOURS, ONCE ═══
 *
 *   node tools/art/reduce256.mjs            every picture in SCOPE
 *   node tools/art/reduce256.mjs --dry      say what it would do
 *   node tools/art/reduce256.mjs --sheet    and the before | after sheet of
 *                                           the hardest (docs/specs/pictures-256-sheet.png)
 *
 * The owner, 2026-10-28: "You can go ahead and reduce it. I won't notice at all
 * from anything at 256" (docs/specs/pictures-256.md).  New art comes out of the
 * Object Studio on 256 colours (public/tools/style/process.js reduceColours);
 * this does the same, once, to the pictures already in the game.
 *
 * Each picture in SCOPE on more than 256 colours is read exactly as its file
 * holds it (ffmpeg: every pixel's own RGBA, no colour management), put on 256
 * colours by public/tools/style/quant256.js (OKLab, solid kept solid and soft
 * kept soft, no dithering), and written BESIDE the original as a palette PNG
 * with each colour's own alpha: `name.webp` -> `name.p256.png`.  The original
 * stays: the game reads the twin only with `?p256=1` (off by default, measured
 * in the spec) -- the originals go once the owner has tried it.  Every twin is read back (ffmpeg again) and must give exactly the
 * colours written, or the run stops.
 *
 * src/data/p256Files.js (GENERATED: never by hand) lists every twin: the
 * address the game asks for -> the twin's, its size, the original's colours
 * and how far its pixels moved (quant256's err, OKLab).  A picture already on
 * 256 or fewer is not twinned (the game reads it as it is).
 *
 * SCOPE: the effects drawn in the world (sprites/fx, sprites/effects) and the
 * gathering tools' strips (sprites/tools).  Not the character sheets (body,
 * clothes, armour, head pieces: their own method), not the pictures the page
 * draws with <img> or CSS (a browser keeps every picture at four bytes a
 * pixel whatever its colours: levelup-burst, the zone banners, the coin flip),
 * not a picture something reads back on the CPU until its readers are moved.
 *
 * v2.3.5243: its decode, its colours, its encode and its read-back are the
 * asset door's finishing tool's (tools/assets/finish.mjs), the read-back the
 * game's own reader (src/rendering/png8Decode.js) where it was ffmpeg.  The
 * same command line, the same colours (compared, card P PR 3).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRgba } from '../../public/tools/style/quant256.js';
import { readRgba, onColours, encodePng, verifyPng } from '../assets/finish.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(REPO, 'public');
const DRY = process.argv.includes('--dry');
const SHEET = process.argv.includes('--sheet');

/* the folders, and the files in them that stay as they are */
const SCOPE = [
  { dir: 'sprites/fx', skip: /^(levelup-burst|zonebanner-|coinflip-)/ },
  { dir: 'sprites/effects', skip: null },
  { dir: 'sprites/tools', skip: null },
  /* v2.3.5250 (card P's backlog, icons-items-world): the icons drawn in the
     world -- the ore and the trap, the shards, the hit popups -- by name, the
     rest of their folders being the windows' <img>s.  Twinned even on 256
     colours or fewer (`always`): they are WebPs, and the game reads only a
     palette PNG as colour numbers (png8Decode.js).  Not the popups whose
     width is not a multiple of four (the arrow, the dice, the spell, the
     xp): p256.js reads no twin that needs padding, so theirs would never be
     read. */
  { dir: 'icons/items', only: /^(ore-iron|ore-black-steel|ore-obsidian)\.webp$/, always: true },   /* not the trap's box: its pieces are cut from its pixels (p256.js) */
  { dir: 'icons/shards', only: /^shard_[a-z]+\.webp$/, always: true },
  { dir: 'icons/popups', only: /^(heart-256|sword)\.webp$/, always: true },
  /* v2.3.5258 (card P's backlog, icons-elements): the eight elements' marks
     drawn after a hit's number (effectsRenderer.js POPUP_ICON_SRC), by name:
     the 64 px plate icons and the gems' dark and light are not twinned (the
     plates load their own way, the gems are <img>s).  On 256 colours or
     fewer already, so their twins are exact. */
  { dir: 'icons/ui', only: /^elem-(flame|frost|water|venom|flora|stone|storm|wind)\.webp$/, always: true },
];
/* v2.3.5563 (card P's backlog, pets): the pet sheet every pet is drawn from
   (petSprites.js, tools/make_pet_sheet.py), on the loading screen for
   everyone: 80k colours, cut to 256. */
SCOPE.push({ dir: 'sprites/pets', only: /^pet-sheet\.png$/, always: true });
/* v2.3.5565 (card P's backlog, world-fish-spot): the pond under a fishing
   spot (effectsRenderer.js NODE_SPRITE_SOURCES), 627 px square.  p256.js
   reads no twin whose width is not a multiple of four, so its twin is padded
   here, once (`pad4`): one see-through column on its right, where the pond
   never reaches (its drawing spans columns 112-511), the picture itself
   untouched.  It is drawn at anchor (0.5, 0.5) and scaled by its height, so
   nothing in the code changes; the drawing sits half a texel left (0.1 world
   px at tier 1). */
SCOPE.push({ dir: 'sprites/world', only: /^fish-spot-627\.webp$/, always: true, pad4: true });
/* v2.3.5566 (card P's backlog, hud-bars): the bars over heads
   (entityRenderer.js _HUD_BAR_FILES): the mana and stamina pills and the HP
   pill (1444 px wide, 5.6k-7.9k colours), and the owner's health bar, its
   empty frame, its red fill and the harvest bar's green (363 px, 2.3k-3.5k
   colours: padded to 364 as the fish spot's pond, their drawing spanning
   columns 7-356).  Not the duel ask's small icon (SMALL_TEX, 0.02 MB). */
SCOPE.push({ dir: 'icons/ui', only: /^bar-(hp|mp|stam)\.webp$/, always: true });
SCOPE.push({ dir: 'ui/bars', only: /^(hp-frame|hp-full|node-full-green)\.png$/, always: true, pad4: true });
/* v2.3.5567 (card P's backlog, player-death): the owner's death strip
   (playerDeathSprites.js, 21 frames of 128 px), the fallback drawn when the
   bones' explosion (deathCrumble.js) has no corpse: 38k colours, cut to 256. */
SCOPE.push({ dir: 'sprites/players', only: /^death-v1\.png$/, always: true });
/* v2.3.5569 (card P's backlog, icons-from-uploads-world): the owner's
   five-block stamina and mana strips (fxStrips.js BLOCK_BARS, six frames of
   273 px each) and the verified Bro badge over a name (entityRenderer.js
   BRO_BADGE_URL), 2.5k-28k colours, cut to 256.  The stamina strip is 1638
   px wide: its twin is padded to 1640 (`pad4`), past its last frame. */
SCOPE.push({ dir: 'icons/ui', only: /^(blocks-(mp|stam|stam-steel)|verified-bro-small)\.webp$/, always: true, pad4: true });
/* v2.3.6222 (card FX PR 3, projectile-sheets): the staff's bolt, the staff's
   special and the sword's slash (effectsRenderer.js, four frames each, loaded
   whole and framed), 20k-63k colours, cut to 256.  Widths 868, 888 and 408:
   multiples of four already.  Not the arrows (arrow-pine.png has its own
   reader; arrow-special is not loaded while HOT_SPECIAL_ARROW draws it). */
SCOPE.push({ dir: 'sprites/projectiles', only: /^(magic-bolt|magic-special|sword-slash)-v1\.webp$/, always: true });
/* v2.3.5564 (card P's backlog, cape-hood): a cape's hood's hair masks, cut
   from its facings (tools/cape/split-cape-hood.py): two colours, exact.  Not
   the hood halves (sitting 20, the planning session's answer (a)): a cape is
   pixel art drawn crisp (capeSprites.js `nearest`, and sharpPixels.js's read
   as a piece of the figure), and colour numbers are drawn by a read that
   blends four texels, which honours neither. */
{
  const cp = path.join(PUB, 'sprites/traits/cape');
  if (fs.existsSync(cp)) for (const id of fs.readdirSync(cp).sort()) {
    if (fs.existsSync(path.join(cp, id, 'hood'))) SCOPE.push({ dir: `sprites/traits/cape/${id}/hood`, only: /^hairmask-[a-z]+\.png$/, always: true });
  }
}
/* v2.3.5562 (card P's backlog, traits-hairmasks): the hats' hair masks,
   the white silhouettes the hair is clipped to (entityRenderer.js
   _loadHairMaskDir, hairClip.js's stencil): two colours each, so twinned
   exactly (`always`: they are RGBA PNGs, and only a palette PNG is read as
   colour numbers).  Every hat that ships a hairmask/ folder. */
{
  const hw = path.join(PUB, 'sprites/traits/headwear');
  if (fs.existsSync(hw)) for (const hat of fs.readdirSync(hw).sort()) {
    if (fs.existsSync(path.join(hw, hat, 'hairmask'))) SCOPE.push({ dir: `sprites/traits/headwear/${hat}/hairmask`, skip: null, always: true });
  }
}

/* v2.3.5565: a picture widened to a multiple of four by see-through columns
   on its right (SCOPE's `pad4`); the columns it has are kept as they are */
function padRight(w, h, d) {
  const W = Math.ceil(w / 4) * 4;
  if (W === w) return { w, d, pad: 0 };
  const o = new Uint8Array(W * h * 4);
  for (let y = 0; y < h; y++) o.set(d.subarray(y * w * 4, (y + 1) * w * 4), y * W * 4);
  return { w: W, d: o, pad: W - w };
}

function colourCount(d) {
  const s = new Set();
  for (let i = 0; i < d.length; i += 4) s.add(d[i + 3] ? ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0 : 0);
  return s.size;
}
const twinOf = (rel) => rel.replace(/\.(png|webp)$/i, '.p256.png');

const out = {};
const hard = [];
for (const s of SCOPE) {
  const dir = path.join(PUB, s.dir);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(png|webp)$/i.test(f) || /\.p256\.png$/i.test(f) || (s.skip && s.skip.test(f)) || (s.only && !s.only.test(f))) continue;
    const rel = `/${s.dir}/${f}`;
    const src = readRgba(path.join(PUB, rel));
    const colours = colourCount(src.d);
    if (colours <= 256 && !s.always) { console.log(`  as it is  ${rel} (${colours} colours)`); continue; }
    const { w, d, pad } = s.pad4 ? padRight(src.w, src.h, src.d) : { w: src.w, d: src.d, pad: 0 };
    const h = src.h;
    const t0 = Date.now();
    const q = onColours([{ w, h, d }]);
    const r = { idx: q.idx[0], pal: q.pal, n: q.n, err: q.err };
    const twin = twinOf(rel);
    const bytes = await encodePng(r.idx, r.pal, w, h);
    if (!DRY) {
      fs.writeFileSync(path.join(PUB, twin), bytes);
      /* read back: exactly the colours written (the game's own reader) */
      await verifyPng(fs.readFileSync(path.join(PUB, twin)), r.idx, r.pal, w, h, twin);
    }
    out[rel] = { twin, w, h, colours, n: r.n, err: +r.err.toFixed(4), ...(pad ? { pad } : {}) };
    hard.push({ rel, twin, w, h, colours, err: r.err, d, r });
    console.log(`  256       ${rel} ${w}x${h}${pad ? ` (padded by ${pad})` : ''}: ${colours} colours -> ${r.n}, moved ${r.err.toFixed(4)} (OKLab), `
      + `${Math.round(fs.statSync(path.join(PUB, rel)).size / 1024)} KB -> ${Math.round(bytes.length / 1024)} KB, ${Date.now() - t0} ms`);
  }
}

const js = `/* GENERATED by tools/art/reduce256.mjs (v2.3.3728) -- never by hand.
 * Every picture the game reads on 256 colours from its twin beside it
 * (docs/specs/pictures-256.md): the address the game asks for (no query) ->
 * the twin's, its size, the original's colours, the colours used and how far
 * its pixels moved (OKLab, alpha-weighted mean); \`pad\`, the see-through
 * columns a twin was widened by on its right (v2.3.5565). */
export const P256_FILES = Object.freeze(${JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ')});
`;
if (!DRY) fs.writeFileSync(path.join(REPO, 'src/data/p256Files.js'), js);
console.log(`${Object.keys(out).length} twinned${DRY ? ' (dry)' : ''}`);

/* the owner's glance: before | after, the six with the most colours, each on a
   checker (see-through shows) and on black (a glow's fade shows) */
if (SHEET && hard.length) {
  const pick = hard.sort((a, b) => b.colours - a.colours).slice(0, 6);
  const scale = (p) => Math.min(1, 900 / p.w, 300 / p.h);
  const rows = pick.map((p) => {
    const k = scale(p);
    return { p, W: Math.max(1, Math.round(p.w * k)), H: Math.max(1, Math.round(p.h * k)) };
  });
  const GAP = 8;
  const SW = Math.max(...rows.map((r) => r.W)) * 2 + GAP * 3;
  const SH = rows.reduce((s, r) => s + r.H * 2 + GAP * 2, GAP);
  const sheet = new Uint8Array(SW * SH * 4);
  const put = (x, y, rgba, bg) => {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    const o = (y * SW + x) * 4, a = rgba[3] / 255;
    sheet[o] = Math.round(rgba[0] * a + bg[0] * (1 - a));
    sheet[o + 1] = Math.round(rgba[1] * a + bg[1] * (1 - a));
    sheet[o + 2] = Math.round(rgba[2] * a + bg[2] * (1 - a));
    sheet[o + 3] = 255;
  };
  let y0 = GAP;
  for (const { p, W, H } of rows) {
    const after = toRgba(p.r.idx, p.r.pal);
    for (const [band, dark] of [[0, false], [1, true]]) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = Math.min(p.w - 1, Math.floor(x * p.w / W)), sy = Math.min(p.h - 1, Math.floor(y * p.h / H));
        const i = (sy * p.w + sx) * 4;
        const bg = dark ? [0, 0, 0] : (((x >> 3) + (y >> 3)) & 1 ? [200, 200, 200] : [255, 255, 255]);
        put(GAP + x, y0 + band * (H + GAP) + y, p.d.subarray(i, i + 4), bg);
        put(GAP * 2 + W + x, y0 + band * (H + GAP) + y, after.subarray(i, i + 4), bg);
      }
    }
    y0 += H * 2 + GAP * 2;
  }
  /* written as a plain RGBA PNG (zlib) */
  const zlib = await import('node:zlib');
  const raw = Buffer.alloc((SW * 4 + 1) * SH);
  for (let y = 0; y < SH; y++) Buffer.from(sheet.buffer, y * SW * 4, SW * 4).copy(raw, y * (SW * 4 + 1) + 1);
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(t, 4, 'latin1'); data.copy(b, 8);
    b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SW, 0); ihdr.writeUInt32BE(SH, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  const where = path.join(REPO, 'docs/specs/pictures-256-sheet.png');
  fs.writeFileSync(where, png);
  console.log(`the sheet: ${path.relative(REPO, where)} (${pick.map((p) => path.basename(p.rel)).join(', ')})`);
}
