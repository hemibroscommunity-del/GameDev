/* ═══ v2.3.3957: THE TOWNSFOLK'S BUSTS, AS RECIPES FOR THE GAME'S COMPOSITOR ═══
 *
 * tools/qa/nft_portraits.py PORTRAITS, ported: each townsperson's Hemi Bros
 * bust (public/sprites/npc/<head>.webp) as the recipe src/rendering/
 * hemiBustCore.js composeBust stacks.  They are the proof the port is the
 * bake: server/test/hemi-portrait.test.mjs rebuilds every one of them and
 * compares it with the baked file's pixels (server/test/fixtures/
 * hemi-npc-busts.png, made by tools/portrait/make-hemi-atlas.mjs).
 *
 * Like the Python tool, every colour is read from the game, never copied: the
 * shirt and beard colours from their catalogs' source (those modules import
 * Pixi, so their `target`s are read as text, as nft_portraits.py _rgb_targets
 * reads them), the patterns and the drawing palette from their modules, and
 * each townsperson's look from src/data/npcLooks.js.  Change a PORTRAITS row
 * there and change it here in the same PR (the test fails otherwise).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NPC_LOOKS } from '../../src/data/npcLooks.js';
import { PATTERN_CATALOG } from '../../src/rendering/traits/patternCatalog.js';
import { ART_PALETTE } from '../../src/rendering/traits/playerArt.js';
import { rampOf } from '../../src/rendering/hemiBustCore.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* a colour catalog's { id: [r, g, b] } (its `target`s), read from its source */
export function rgbTargets(rel) {
  const src = fs.readFileSync(path.join(REPO, rel), 'utf8');
  const out = Object.create(null);
  const re = /\{\s*id:\s*'([\w-]+)'[^}]*?target:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (!Object.keys(out).length) throw new Error(rel + ': no colours read');
  return out;
}

export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* the game's skin tones (playerSkins.js SKIN_CATALOG targets), as the bake has them */
const SKIN = {
  fair: [230, 194, 155], tan: [200, 140, 80], brown: [155, 105, 65], sand: [217, 177, 132],
  pale: [240, 205, 170], olive: [178, 138, 94], honey: [201, 162, 113], rosy: [242, 201, 184],
  ivory: [242, 218, 188], porcelain: [245, 221, 205], alabaster: [249, 236, 226], deep: [112, 76, 50],
  ebony: [82, 56, 39],
};
const GREY = [[96, 96, 104], [206, 206, 212]];
const DARK = [[42, 38, 44], [92, 86, 90]];
const HAT_BLACK = [[34, 32, 38], [84, 82, 92]];
const HAIR_BLACK = [[14, 15, 17], [52, 52, 58]];
const BLONDE = [[150, 104, 36], [250, 222, 128]];
const PINK = [[160, 60, 110], [250, 170, 210]];
const EYES = { none: 'normaleyes', wtf: 'wtfeyes', sleepy: 'sleepyeyes', happy: 'happyeyes', sus: 'suseyes' };

/* nft_portraits.py PORTRAITS, row for row (the eight of v2.3.3580, then the
   new cast of v2.3.3833) */
export const NPC_BUSTS = [
  ['mayor-bro-head', { look: 'mayor', skin: 'fair', bg: 'Purple Navy', eyewear: 'goldenmonocle', headwear: 'tophat', tee: { cell: 2, ox: 1 } }],
  ['blacksmith-bro-head', { look: 'blacksmith', skin: 'tan', bg: 'Rose Taupe', hair: 'flattophairstyle', headwear: 'redbandana' }],
  ['shopkeeper-bro-head', { look: 'diego', skin: 'brown', bg: 'Dark Lavender', eyewear: 'goldenglasses', hair: 'slickbackhair', trim: { hair: 14 }, recolour: { hair: HAIR_BLACK }, tee: { cell: 1 } }],
  ['farmer-bro-head', { look: 'farmer', skin: 'sand', bg: 'Russian Green', headwear: 'buckethat', relogo: { headwear: [[[238, 230, 234], [94, 161, 72]]] }, tee: { cell: 1 } }],
  ['woodworker-bro-head', { look: 'woodworker', skin: 'pale', bg: 'Teal Blue', eyewear: 'goggles', hair: 'afro', recolour: { hair: GREY }, tee: { cell: 2, ox: 16, oy: 27 } }],
  ['beastmaster-bro-head', { look: 'beastmaster', skin: 'olive', bg: 'Camouflage Green', headwear: 'cowboyhat', tee: { cell: 1 } }],
  ['lil-bro-head', { look: 'lilbro', skin: 'honey', bg: 'Teal Blue', hair: 'blondehair', headwear: 'headphones', relogo: { headwear: [[[255, 255, 255], [152, 10, 4]]] }, tee: { cell: 1, oy: 27 } }],
  ['cardsharp-bro-head', { look: 'ace', skin: 'rosy', bg: 'Middle Green', headwear: 'derbyhat', recolour: { headwear: HAT_BLACK }, tee: { cell: 1, ox: 7, oy: 27 } }],
  ['sterling-head', { look: 'banker', skin: 'ivory', bg: 'Purple Navy', hair: 'splithair', eyewear: 'laserglass', recolour: { hair: HAIR_BLACK }, tee: { cell: 1 } }],
  ['slim-head', { look: 'barkeep', skin: 'deep', bg: 'Rose Taupe', hair: 'lightbrownhair', recolour: { hair: HAIR_BLACK }, tee: { cell: 1 } }],
  ['chef-blaze-head', { look: 'chef', skin: 'rosy', bg: 'Dark Lavender', hair: 'flattophairstyle', eyewear: 'thuglifeglasses', recolour: { hair: BLONDE }, tee: { cell: 1 } }],
  ['glint-head', { look: 'gemguru', skin: 'porcelain', bg: 'Teal Blue', hair: 'lightbrownhair', headwear: 'halo', recolour: { hair: DARK }, tee: { cell: 1 } }],
  ['postmaster-pete-head', { look: 'postman', skin: 'fair', bg: 'Purple Navy', headwear: 'bluecap', tee: { cell: 1 } }],
  ['deed-dave-head', { look: 'realtor', skin: 'tan', bg: 'Middle Green', headwear: 'flatcap', tee: { cell: 1 } }],
  ['benny-head', { look: 'bellhop', skin: 'brown', bg: 'Dark Lavender', headwear: 'fez', tee: { cell: 1 } }],
  ['guildmaster-gary-head', { look: 'guildmaster', skin: 'pale', bg: 'Russian Green', hair: 'blondehair', headwear: 'naruto', tee: { cell: 1 } }],
  ['sheriff-buck-head', { look: 'sheriff', skin: 'sand', bg: 'Camouflage Green', headwear: 'sheriffhat', eyewear: 'thuglifeglasses', tee: { cell: 1 } }],
  ['gavel-greg-head', { look: 'auctioneer', skin: 'ebony', bg: 'Purple Navy', headwear: 'crown', tee: { cell: 1 } }],
  ['old-man-reel-head', { look: 'fisher', skin: 'alabaster', bg: 'Teal Blue', headwear: 'redbeanie', recolour: { headwear: GREY }, tee: { cell: 1 } }],
  ['bean-head', { look: 'streamer', skin: 'honey', bg: 'Dark Lavender', hair: 'splithair', headwear: 'catears', recolour: { hair: PINK, headwear: PINK }, tee: { cell: 1 } }],
  ['tourist-terry-head', { look: 'tourist', skin: 'porcelain', bg: 'Middle Green', headwear: 'mexicanhat', eyewear: 'goldenmonocle', tee: { cell: 1 } }],
];

let _game = null;
function game() {
  if (_game) return _game;
  const tiles = Object.create(null);
  for (const t of PATTERN_CATALOG) tiles[t.id] = t;
  _game = {
    shirt: rgbTargets('src/rendering/traits/shirtColorCatalog.js'),
    beard: rgbTargets('src/rendering/traits/facialHairColorCatalog.js'),
    tiles,
  };
  return _game;
}

/** a PORTRAITS row -> composeBust's recipe (nft_portraits.py bake) */
export function npcRecipe(rec, backgrounds) {
  const G = game();
  const L = NPC_LOOKS[rec.look];
  if (!L) throw new Error('no NPC_LOOKS.' + rec.look);
  const piece = (slot) => {
    const name = rec[slot];
    if (!name) return null;
    const p = { name };
    if (rec.relogo && rec.relogo[slot]) p.relogo = rec.relogo[slot];
    if (rec.trim && rec.trim[slot] != null) p.trim = rec.trim[slot];
    if (rec.recolour && rec.recolour[slot]) p.ramp = rec.recolour[slot];
    return p;
  };
  let shirt = null;
  if ((L.shirt || 'none') !== 'none') {
    const t = rec.tee || {};
    shirt = { color: G.shirt[L.shirtColor] || G.shirt.blue, ox: t.ox || 0, oy: t.oy || 0, cell: t.cell || 1 };
    const p = L.patterns && L.patterns.shirt;
    if (p) {
      const [tid, idx] = p.split(':');
      shirt.tile = G.tiles[tid];
      shirt.ink = hexRgb(ART_PALETTE[Number(idx)]);
    }
  }
  let beard = null;
  if ((L.beard || 'none') !== 'none') beard = { ramp: rampOf(G.beard[L.beardColor]) };
  return {
    bg: backgrounds[rec.bg],
    skin: SKIN[rec.skin],
    shirt,
    eyes: EYES[L.eyes || 'none'] || 'normaleyes',
    eyewear: piece('eyewear'),
    hair: piece('hair'),
    headwear: piece('headwear'),
    beard,
  };
}

/** every layer name the townsfolk's recipes use */
export function npcLayerNames() {
  const s = new Set(['bro', 'beard', 'yellowshirt', ...Object.values(EYES)]);
  for (const [, r] of NPC_BUSTS) for (const k of ['eyewear', 'hair', 'headwear']) if (r[k]) s.add(r[k]);
  return [...s];
}
