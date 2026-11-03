/* ═══ v2.3.3957: YOUR PORTRAIT IS A HEMI BRO ═══
 *
 * docs/specs/hemi-portrait.md.  The game's compositor (src/rendering/
 * hemiBustCore.js), the look table (hemiLook.js) and the atlas they read
 * (public/portrait/hemi-bros-atlas.png), held to their promises:
 *   1. the compositor IS the townsfolk's bake (tools/qa/nft_portraits.py): from
 *      the collection's source layers it rebuilds all 21 baked busts
 *      (public/sprites/npc/<head>.webp, read into server/test/fixtures/
 *      hemi-npc-busts.png) pixel for pixel;
 *   2. the atlas the game ships is on 256 colours at most, holds every layer
 *      it lists, and the busts built from it stay within the Python tool's
 *      own tolerance (no more than 12 of 1,024 pixels off by more than 50);
 *   3. every item of every look catalog maps to a trait the atlas holds --
 *      none falls through -- and only the monkey keeps the game's portrait;
 *   4. the collection's rules: bald under a hat, hair under a band, a chosen
 *      colour ramps the trait, the default keeps the collection's colours;
 *   5. the background is one of the collection's, the same for the same look;
 *   6. the bust is scaled by whole numbers, nearest neighbour: 6 x 6 blocks;
 *   7. the switch: `?hemiface=0` off, the Test panel's row off, else on;
 *   8. the atlas, its index and the fixture are what the tool makes now.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readPngRgba } from '../../tools/portrait/pngRgba.mjs';
import { NPC_BUSTS, npcRecipe, rgbTargets } from '../../tools/portrait/hemiNpcRecipes.mjs';
import { composeBust, sliceAtlas, upscale, GRID, rint } from '../../src/rendering/hemiBustCore.js';
import { HEMI_ATLAS } from '../../src/rendering/hemiAtlasIndex.js';
import {
  hemiRecipe, hemiLayerNames, hemiNearList, hemiFaceChoice, pickBackground, SHIRT_DEFAULT,
  HEMI_HAIR, HEMI_HEADWEAR, HEMI_EYEWEAR, HEMI_EYES, HEMI_SPECIES, HEMI_FACIAL_HAIR, HEMI_SHIRT,
} from '../../src/rendering/hemiLook.js';
import { decodePng8 } from '../../src/rendering/png8Decode.js';
import { HAIR_CATALOG } from '../../src/rendering/traits/hairCatalog.js';
import { HEADWEAR_CATALOG } from '../../src/rendering/traits/headwearCatalog.js';
import { EYEWEAR_CATALOG } from '../../src/rendering/traits/eyewearCatalog.js';
import { EYE_STYLE_CATALOG } from '../../src/rendering/traits/eyeStyleCatalog.js';
import { SPECIES_CATALOG } from '../../src/rendering/traits/speciesCatalog.js';
import { FACIALHAIR_CATALOG } from '../../src/rendering/traits/facialHairCatalog.js';
import { SHIRT_CATALOG } from '../../src/rendering/traits/shirtCatalog.js';
import { PATTERN_CATALOG } from '../../src/rendering/traits/patternCatalog.js';
import { CLIENT_SAVERS } from '../../src/game/clientOff.js';

let passed = 0, failed = 0;
const check = (name, ok, info) => {
  if (ok) { passed++; console.log('ok   ' + name); } else { failed++; console.log('FAIL ' + name, info === undefined ? '' : JSON.stringify(info)); }
};
const root = new URL('../../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root));

/* the source layers, as the Python tool reads them */
const SRC = Object.create(null);
for (const n of new Set([...HEMI_ATLAS.layers])) SRC[n] = readPngRgba(read('assets/portrait-source/hemi-bros/' + n + '.png')).data;
const fixture = readPngRgba(read('server/test/fixtures/hemi-npc-busts.png'));
const bustAt = (k) => {
  const out = new Uint8Array(GRID * GRID * 4);
  for (let y = 0; y < GRID; y++) out.set(fixture.data.subarray((y * fixture.w + k * GRID) * 4, (y * fixture.w + k * GRID + GRID) * 4), y * GRID * 4);
  return out;
};
const diff = (a, b) => {
  let off = 0, big = 0, sum = 0, max = 0;
  for (let i = 0; i < a.length; i += 4) {
    const e = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (e) off++;
    if (e > 50) big++;
    sum += e; max = Math.max(max, e);
  }
  return { off, big, max, mean: +(sum / (a.length / 4)).toFixed(2) };
};

/* ── 1. the compositor is the bake ─────────────────────────────────────── */
{
  check('1a. the fixture holds every townsperson\'s bust, 32 x 32 each in a row', fixture.w === NPC_BUSTS.length * GRID && fixture.h === GRID, { w: fixture.w, h: fixture.h, n: NPC_BUSTS.length });
  const bad = [];
  NPC_BUSTS.forEach(([head, rec], k) => {
    const d = diff(composeBust(SRC, npcRecipe(rec, HEMI_ATLAS.backgrounds)), bustAt(k));
    if (d.off) bad.push({ head, ...d });
  });
  check(`1b. from the source layers, all ${NPC_BUSTS.length} townsfolk's busts come out pixel for pixel (the eight of v2.3.3580 among them)`, !bad.length, bad);
  /* numpy's rounding, which the glass blend leans on */
  check('1c. rint is numpy\'s round (half to even)', rint(0.5) === 0 && rint(1.5) === 2 && rint(2.5) === 2 && rint(2.4999) === 2 && rint(-0.5) === -0 && rint(3.5) === 4);
}

/* ── 2. the atlas the game ships ───────────────────────────────────────── */
const atlasBytes = read('public/portrait/hemi-bros-atlas.png');
const p8 = await decodePng8(atlasBytes, async (z) => new Uint8Array(zlib.inflateSync(Buffer.from(z))));
let ATL = null;
{
  check('2a. the atlas is a palette PNG on 256 colours at most (the memory law), as the index says', !!p8 && p8.n <= 256 && p8.n === HEMI_ATLAS.colours && p8.w === HEMI_ATLAS.width && p8.h === HEMI_ATLAS.height, p8 && { n: p8.n, w: p8.w, h: p8.h });
  check('2b. ...and small: under 16 KB', atlasBytes.length < 16 * 1024, atlasBytes.length);
  const rgba = new Uint8Array(p8.w * p8.h * 4);
  for (let y = 0; y < p8.h; y++) for (let x = 0; x < p8.w; x++) {
    const k = p8.idx[y * p8.stride + x], o = (y * p8.w + x) * 4;
    rgba[o] = p8.rgb[k * 3]; rgba[o + 1] = p8.rgb[k * 3 + 1]; rgba[o + 2] = p8.rgb[k * 3 + 2]; rgba[o + 3] = p8.alpha[k];
  }
  ATL = sliceAtlas(rgba, p8.w, HEMI_ATLAS.layers, HEMI_ATLAS.cols, HEMI_ATLAS.cell);
  check('2c. the atlas has room for every layer it lists', Math.ceil(HEMI_ATLAS.layers.length / HEMI_ATLAS.cols) * HEMI_ATLAS.cell <= p8.h);
  /* each layer's shape is the source's: the reducer moves colours, never a pixel's coverage */
  const shape = HEMI_ATLAS.layers.filter((n) => { for (let i = 3; i < 4096; i += 4) if ((SRC[n][i] > 0) !== (ATL[n][i] > 0)) return true; return false; });
  check('2d. every layer covers exactly the pixels its source does', !shape.length, shape);
  const rows = [], over = [];
  NPC_BUSTS.forEach(([head, rec], k) => {
    const d = diff(composeBust(ATL, npcRecipe(rec, HEMI_ATLAS.backgrounds)), bustAt(k));
    rows.push(head + ' ' + d.big + '/' + d.mean);
    if (d.big > 12 || d.mean > 2) over.push({ head, ...d });
  });
  check('2e. built from the atlas, every townsperson\'s bust is within the Python tool\'s tolerance (<= 12 pixels off by > 50; mean under 2)', !over.length, over.length ? over : undefined);
  console.log('     (pixels off by > 50 / mean difference: ' + rows.join(', ') + ')');
}

/* ── 3. every catalog item maps ───────────────────────────────────────── */
const BGS = HEMI_ATLAS.backgrounds;
const base = { skin: null, hair: 'none', headwear: 'none', facialHair: 'none', eyewear: 'none', eyeStyle: 'none', species: 'none', shirt: 'tshirt', shirtColor: null, shirtPattern: '' };
const layersOf = (r) => ['bro', r.eyes, r.hair && r.hair.name, r.headwear && r.headwear.name, r.eyewear && r.eyewear.name, r.beard && 'beard', r.shirt && 'yellowshirt'].filter(Boolean);
{
  const table = (cat, map, slot) => {
    const missing = [], unknown = [];
    for (const e of cat) {
      if (e.id === 'none') continue;
      if (!Object.prototype.hasOwnProperty.call(map, e.id)) { missing.push(e.id); continue; }
      const v = map[e.id];
      if (v && !HEMI_ATLAS.layers.includes(v.trait)) unknown.push(e.id + '->' + v.trait);
    }
    check(`3. every ${slot} in the catalog (${cat.length - 1}) maps to a trait the atlas holds`, !missing.length && !unknown.length, { missing, unknown });
    const stale = Object.keys(map).filter((id) => !cat.some((e) => e.id === id));
    check(`3. ...and the ${slot} table names nothing the catalog has dropped`, !stale.length, stale);
  };
  table(HAIR_CATALOG, HEMI_HAIR, 'hair style');
  table(HEADWEAR_CATALOG, HEMI_HEADWEAR, 'headwear');
  table(EYEWEAR_CATALOG, HEMI_EYEWEAR, 'eyewear');
  table(EYE_STYLE_CATALOG, HEMI_EYES, 'eye style');
  table(FACIALHAIR_CATALOG, HEMI_FACIAL_HAIR, 'facial hair');
  table(SHIRT_CATALOG, HEMI_SHIRT, 'shirt');
  table(SPECIES_CATALOG, HEMI_SPECIES, 'species');
  /* every single item, through the recipe, builds a bust from atlas layers */
  const broken = [];
  const each = (slot, cat) => {
    for (const e of cat) {
      const r = hemiRecipe({ ...base, [slot]: e.id }, BGS);
      if (slot === 'species' && e.id === 'monkey') { if (r !== null) broken.push('monkey should keep the game\'s portrait'); continue; }
      if (!r) { broken.push(slot + ':' + e.id + ' gave no recipe'); continue; }
      const miss = layersOf(r).filter((n) => !HEMI_ATLAS.layers.includes(n));
      if (miss.length) { broken.push(slot + ':' + e.id + ' needs ' + miss); continue; }
      try { composeBust(ATL, r); } catch (err) { broken.push(slot + ':' + e.id + ' ' + err.message); }
    }
  };
  each('hair', HAIR_CATALOG); each('headwear', HEADWEAR_CATALOG); each('eyewear', EYEWEAR_CATALOG);
  each('eyeStyle', EYE_STYLE_CATALOG); each('facialHair', FACIALHAIR_CATALOG); each('shirt', SHIRT_CATALOG);
  each('species', SPECIES_CATALOG);
  check('3c. every item, alone, builds a bust from the atlas (and only the monkey keeps the game\'s portrait)', !broken.length, broken);
  /* the colours: every colour of every colour catalog (and every skin, every pattern) builds one */
  const colours = {
    hairColor: rgbTargets('src/rendering/traits/hairColorCatalog.js'),
    hatColor: rgbTargets('src/rendering/traits/hatColorCatalog.js'),
    facialHairColor: rgbTargets('src/rendering/traits/facialHairColorCatalog.js'),
    shirtColor: rgbTargets('src/rendering/traits/shirtColorCatalog.js'),
    eyewearColor: rgbTargets('src/rendering/traits/hatColorCatalog.js'),   /* eyewearColorCatalog.js: EYEWEAR_COLOR_CATALOG = HAT_COLOR_CATALOG */
    skin: rgbTargets('src/rendering/playerSkins.js'),
  };
  const full = { ...base, hair: 'afro', headwear: 'bandana-2', facialHair: 'beard', eyewear: 'goggles' };
  const bad = [];
  let n = 0;
  for (const [slot, tbl] of Object.entries(colours)) {
    for (const [id, rgb] of Object.entries(tbl)) {
      const r = hemiRecipe({ ...full, [slot]: rgb }, BGS);
      n++;
      if (!r) { bad.push(slot + ':' + id); continue; }
      try { composeBust(ATL, r); } catch (err) { bad.push(slot + ':' + id + ' ' + err.message); }
    }
  }
  for (const t of PATTERN_CATALOG) {
    const r = hemiRecipe({ ...full, shirtPattern: t.id + ':3' }, BGS);
    n++;
    if (!r || !r.shirt || !r.shirt.tile || r.shirt.tile.w !== t.w) bad.push('pattern:' + t.id);
  }
  check(`3d. every colour (hair, hat, beard, shirt, eyewear, skin) and every shirt pattern builds a bust (${n} of them)`, !bad.length && n > 60, bad);
  check('3e. the default tee is the game\'s own default blue (shirtColorCatalog SHIRT_DEFAULT_RGB)',
    /SHIRT_DEFAULT_RGB = \[58, 91, 208\]/.test(read('src/rendering/traits/shirtColorCatalog.js').toString()) && SHIRT_DEFAULT.join() === '58,91,208');
  const all = hemiLayerNames();
  check('3f. the atlas carries every layer a look can name', all.every((n) => HEMI_ATLAS.layers.includes(n)), all.filter((n) => !HEMI_ATLAS.layers.includes(n)));
  const near = hemiNearList();
  const doc = read('docs/specs/hemi-portrait.md').toString();
  const undocumented = near.filter((line) => !doc.includes('`' + line.split(' -> ')[0] + '`'));
  check('3g. every look worn as its nearest trait is on the doc\'s "Looks with no match yet" list', near.length > 0 && !undocumented.length, undocumented);
}

/* ── 4. the collection's rules ────────────────────────────────────────── */
{
  const hat = hemiRecipe({ ...base, hair: 'afro', headwear: 'top-hat' }, BGS);
  check('4a. a hat: bald under it (no hair layer), as the collection is', hat.headwear.name === 'tophat' && hat.hair === null);
  const band = hemiRecipe({ ...base, hair: 'flat-top', headwear: 'bandana-2' }, BGS);
  check('4b. a band (the red bandana) sits on the hair', band.headwear.name === 'redbandana' && band.hair && band.hair.name === 'flattophairstyle');
  const phones = hemiRecipe({ ...base, hair: 'blonde-hair', headwear: 'headphones' }, BGS);
  check('4c. ...and so do the headphones', phones.hair && phones.hair.name === 'blondehair');
  const dflt = hemiRecipe({ ...base, hair: 'afro' }, BGS);
  const grey = hemiRecipe({ ...base, hair: 'afro', hairColor: [156, 156, 162] }, BGS);
  check('4d. the default hair colour keeps the collection\'s; a chosen one ramps from 0.55 to 1.3 of it (the beard\'s rule)',
    !dflt.hair.ramp && JSON.stringify(grey.hair.ramp) === JSON.stringify([[85, 85, 89], [202, 202, 210]]), grey.hair.ramp);
  const bust = composeBust(ATL, grey);
  /* an outline pixel of the afro stays the outline after the ramp */
  let kept = 0;
  const afro = ATL.afro;
  for (let i = 0; i < afro.length; i += 4) if (afro[i + 3] === 255 && afro[i] === 31 && afro[i + 1] === 13 && afro[i + 2] === 27 && bust[i] === 31 && bust[i + 1] === 13 && bust[i + 2] === 27) kept++;
  check('4e. a recoloured trait keeps the collection\'s outline', kept > 10, kept);
  const bucket = hemiRecipe({ ...base, headwear: 'bucket-hat' }, BGS);
  const asian = hemiRecipe({ ...base, headwear: 'asian-hat' }, BGS);
  check('4f. the game\'s plain bucket hat has the logo painted out; the asian hat (the collection\'s, logo and all) keeps it', bucket.headwear.relogo && !asian.headwear.relogo && asian.headwear.name === 'buckethat');
  const tan = hemiRecipe({ ...base, skin: [200, 140, 80] }, BGS);
  const b = composeBust(ATL, tan);
  let orange = 0;
  for (let i = 0; i < b.length; i += 4) if (b[i] === 233 && b[i + 1] === 153 && b[i + 2] === 73) orange++;
  check('4g. a skin tone leaves no orange bro-skin pixel in the bust', orange === 0, orange);
  const bare = hemiRecipe({ ...base, shirt: 'none' }, BGS);
  check('4h. no shirt is the bro\'s own chest', bare.shirt === null);
  const beard = hemiRecipe({ ...base, facialHair: 'beard', facialHairColor: [46, 40, 38] }, BGS);
  const bb = composeBust(ATL, beard);
  /* the long beard runs off the bust's foot: its row 31 is dark, not skin or shirt */
  const o = (31 * GRID + 13) * 4;
  check('4i. the beard is the collection\'s grown long, in its colour, down to the foot of the bust', bb[o] < 60 && bb[o + 1] < 60 && bb[o + 2] < 60, [...bb.slice(o, o + 3)]);
}

/* ── 5. the background ───────────────────────────────────────────────── */
{
  const names = Object.keys(BGS);
  const r1 = hemiRecipe({ ...base, shirtColor: [46, 56, 120] }, BGS);
  const r2 = hemiRecipe({ ...base, shirtColor: [46, 56, 120] }, BGS);
  check('5a. the background is one of the collection\'s seven, and the same for the same look', names.length === 7 && names.includes(r1.bgName) && r1.bgName === r2.bgName && r1.bg === BGS[r1.bgName]);
  check('5b. a navy shirt is not put on the navy background', r1.bgName !== 'Purple Navy', r1.bgName);
  const g = pickBackground(BGS, [70, 160, 84]);
  check('5c. a green shirt is not put on a green background', !/Green/.test(g), g);
}

/* ── 6. whole numbers only ───────────────────────────────────────────── */
{
  const px = composeBust(ATL, hemiRecipe({ ...base, hair: 'afro' }, BGS));
  const big = upscale(px, 6);
  let flat = big.length === 192 * 192 * 4;
  for (let y = 0; flat && y < 192; y++) for (let x = 0; x < 192; x++) {
    const o = (y * 192 + x) * 4, s = ((Math.floor(y / 6)) * 32 + Math.floor(x / 6)) * 4;
    if (big[o] !== px[s] || big[o + 1] !== px[s + 1] || big[o + 2] !== px[s + 2] || big[o + 3] !== 255) { flat = false; break; }
  }
  check('6. the 192 px picture is the bust\'s 32 x 32 pixels, each a flat 6 x 6 block', flat);
}

/* ── 7. the switch ───────────────────────────────────────────────────── */
{
  check('7a. on by default', hemiFaceChoice('', false).on === true);
  check('7b. ?hemiface=0 brings back the game\'s headshot for the tab', hemiFaceChoice('?hemiface=0', false).on === false && hemiFaceChoice('?a=1&hemiface=0', false).on === false);
  check('7c. the Test panel\'s row turns it off for every phone; ?hemiface=1 turns it back on for one', hemiFaceChoice('', true).on === false && hemiFaceChoice('?hemiface=1', true).on === true);
  check('7d. the row is on the Test panel ("Memory savers"), from the next load', CLIENT_SAVERS.some((c) => c.id === 'hemiface' && c.live === false));
  const src = read('src/rendering/characterPortrait.js').toString();
  check('7e. the headshot path asks for the Hemi Bro first and falls through to the game\'s own', /if \(headshot\) \{\s*const hemi = await hemiBustUrl\(opts\);\s*if \(hemi\) return hemi;/.test(src));
  const pre = read('src/rendering/preloadAnimations.js').toString();
  check('7f. the atlas loads behind the loading screen (preloadWorldAnimations: PRELOADING IS LAW)', /hemiBust: preloadHemiBust\(\)/.test(pre));
}

/* ── 8. the files are the tool's ──────────────────────────────────────── */
{
  let ok = true, why = '';
  try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch (e) { ok = null; }
  if (ok === null) console.log('skip 8. (no ffmpeg here: the atlas tool reads the baked busts with it)');
  else {
    try { execFileSync(process.execPath, [new URL('tools/portrait/make-hemi-atlas.mjs', root).pathname, '--check'], { stdio: 'pipe' }); } catch (e) { ok = false; why = String(e.stdout || e.message).trim(); }
    check('8. the atlas, its index and the fixture are what tools/portrait/make-hemi-atlas.mjs makes now', ok, why);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all hemi-portrait checks passed');
