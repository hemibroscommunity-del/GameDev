/* ═══ v2.3.3999: YOUR LOOK, AS THE HEMI BROS COLLECTION'S TRAITS ═══
 *
 * One table from the game's look catalogs (src/rendering/traits/) to the
 * collection's trait layers (assets/portrait-source/hemi-bros/), and the
 * recipe hemiBustCore.js composeBust stacks from them.  The rules are the
 * townsfolk's busts' (docs/specs/npc-creator-looks.md):
 *   - the skin is the bro recoloured to your tone; the default keeps his orange;
 *   - a hat: the collection wears hair OR a hat, so a bro in a hat is bald
 *     under it, his ear showing below the brim.  A band (a bandana, the
 *     headband, the headphones) and what floats or perches (the halo, ears,
 *     horns, crowns, the axe) sit on the hair (`onHair`);
 *   - a colour you chose recolours the trait by the ramp rule (its outline
 *     kept, every other colour on a ramp in its own order of brightness, from
 *     0.55 to 1.3 of your colour, as the townsfolk's beards); the default keeps
 *     the collection's own colours;
 *   - your T-shirt is the collection's plain tee in your colour, and your
 *     pattern is the game's own tile on it, one bust pixel a tile cell, as the
 *     townsfolk wear theirs; a drawn print is left out (16 cells of art on a
 *     chest five pixels tall);
 *   - your beard is the collection's grown long, as the world's beards are.
 * Everything beyond the collection is its pieces combined or recoloured,
 * never redrawn.  An item with no good match wears the nearest trait and is
 * marked `near` (docs/specs/hemi-portrait.md, "Looks with no match yet").
 * Worn armour is left out.  The monkey has no bro in the collection, so its
 * portrait stays the game's own (hemiRecipe answers null).
 *
 * Pure: imports only the pattern catalog (no Pixi, no DOM), so node tests it
 * (server/test/hemi-portrait.test.mjs: every catalog item maps). */
import { parsePattern } from './traits/patternCatalog.js';
import { rampOf } from './hemiBustCore.js';

const T = (trait, more) => Object.freeze({ trait, ...(more || {}) });

/* hairCatalog.js -> the collection's hair */
export const HEMI_HAIR = Object.freeze({
  afro: T('afro'),
  'blonde-hair': T('blondehair'),
  /* the sheet's "Blond Hair" is this file (nft_portraits.py FILE_OF): dirty blonde */
  'dirty-blonde': T('lightbrownhair'),
  'flat-top': T('flattophairstyle'),
  'slick-back-hair': T('slickbackhair'),
  'split-hair': T('splithair'),
  /* the collection has no wavy hair (the Barkeep's bust wears this too) and no
     long: the nearest, in the game's default brown */
  wavy: T('lightbrownhair', { near: true, tint: [112, 72, 40] }),
  long: T('splithair', { near: true, tint: [112, 72, 40] }),
});

/* headwearCatalog.js -> the collection's headwear.  `onHair`: worn on the hair */
export const HEMI_HEADWEAR = Object.freeze({
  'old-school-helmet': T('oldschoolhelmet'),
  'top-hat': T('tophat'),
  'purple-hat': T('bluecap'),                 /* the game's is the collection's lavender cap */
  beanie: T('redbeanie'),
  'red-cap': T('backwardshat'),               /* the red cap, its brim to the right as the game's */
  'shark-hat': T('sharkhat'),
  bandana: T('purplebandana', { onHair: true }),
  sombrero: T('mexicanhat'),
  /* the game's bucket hat has no logo: painted out, as on the Farmer's bust */
  'bucket-hat': T('buckethat', { relogo: [[[238, 230, 234], [94, 161, 72]]] }),
  fedora: T('derbyhat'),                      /* named Derby in the picker */
  crown: T('crown', { onHair: true }),
  'wizard-hat': T('wizardhat'),
  'mickey-ears': T('mickeyears', { onHair: true }),
  'evil-crown': T('evilcrown', { onHair: true }),
  'barbarian-helmet': T('vikinghelm'),
  'army-helmet': T('armhelm'),
  'axe-head': T('axehead', { onHair: true }),
  'golden-bucket': T('goldenbucket'),
  'arabian-robe': T('arabianrobe'),
  headphones: T('headphones', { onHair: true }),
  'devil-horns': T('devilhorns', { onHair: true }),
  'cat-ears': T('catears', { onHair: true }),
  /* the light bulb: the collection has nothing like it; the halo floats where it floats */
  'new-idea': T('halo', { onHair: true, near: true }),
  'bucket-hat-2': T('brownhat'),              /* the dark one */
  'bandana-2': T('redbandana', { onHair: true }),
  'asian-hat': T('buckethat'),                /* the green bucket hat with the logo, as the game's */
  'fez-hat': T('fez'),
  'russian-hat': T('russianhat'),
  'cowboy-hat': T('cowboyhat'),
  'folded-brim': T('foldedbrim'),
  'gray-hat': T('oldbuckethat'),              /* the grey flat cap */
  'safety-helmet': T('hardhat'),
  'naruto-headband': T('naruto', { onHair: true }),
  'cowboy-hat-2': T('sheriffhat'),            /* named Sheriff Hat in the picker */
  'chinese-hat': T('chinesehat'),
  'spartan-helmet': T('spartanhelm'),
  'bandana-blue': T('headband', { onHair: true }),   /* white with the blue band */
  'kermit-hat': T('kermithat'),
  halo: T('halo', { onHair: true }),
});

/* eyewearCatalog.js -> the collection's eyewear */
export const HEMI_EYEWEAR = Object.freeze({
  /* red and blue lenses: the collection's laser visor is the nearest */
  '3d-glasses': T('laserglass', { near: true }),
  goggles: T('goggles'),
  'laser-glasses': T('laserglass'),
  'thug-life': T('thuglifeglasses'),
  /* white frames: the collection's are the nerd glasses' dark ones */
  'white-glass': T('nerdglasses', { near: true }),
  'golden-monocle': T('goldenmonocle'),
  'golden-glasses': T('goldenglasses'),
  'eye-patch': T('eyepatch'),
});

/* eyeStyleCatalog.js -> the collection's eyes.  The collection's pupils are
   its outline colour, so the eye colour has no pixel to paint at 32 px. */
export const HEMI_EYES = Object.freeze({
  none: T('normaleyes'),
  sleepy: T('sleepyeyes'),
  wtf: T('wtfeyes'),
  'one-eye': T('normaleyes', { near: true }),
  demon: T('wtfeyes', { near: true }),        /* wide and lit */
  alien: T('suseyes', { near: true }),        /* narrow, dark */
});

/* facialHairCatalog.js: the beard is the collection's grown long */
export const HEMI_FACIAL_HAIR = Object.freeze({ beard: T('beard') });
/* shirtCatalog.js: the T-shirt is the collection's plain tee */
export const HEMI_SHIRT = Object.freeze({ tshirt: T('yellowshirt') });
/* speciesCatalog.js: the alien is the bro on its own skin (the alien cyan);
   the monkey has no bro in the collection: null keeps the game's portrait */
export const HEMI_SPECIES = Object.freeze({
  monkey: null,
  alien: T('bro', { near: true }),
});

/* shirtColorCatalog.js SHIRT_DEFAULT_RGB: the tee as the game draws it with no
   colour picked (a copy: that module imports Pixi; the test holds them equal) */
export const SHIRT_DEFAULT = [58, 91, 208];

const _rgb = (c) => (Array.isArray(c) && c.length >= 3 && c.slice(0, 3).every((v) => Number.isFinite(v)) ? c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v)))) : null);
const _hex = (h) => (typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : null);
const own = (t, k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(t, k) ? t[k] : undefined);

/** The background furthest from the colour the eye lands on (the shirt, or
 *  the skin on a bare chest): one of the collection's, the same for the same
 *  look.  Weighted RGB distance (2, 4, 3); a tie goes to the first by name. */
export function pickBackground(backgrounds, against) {
  let best = null, bestD = -1;
  for (const name of Object.keys(backgrounds).sort()) {
    const b = backgrounds[name];
    const d = 2 * (b[0] - against[0]) ** 2 + 4 * (b[1] - against[1]) ** 2 + 3 * (b[2] - against[2]) ** 2;
    if (d > bestD) { bestD = d; best = name; }
  }
  return best;
}

/** A look -> composeBust's recipe, or null where the collection has no bro
 *  for it (the monkey).  `look`:
 *    skin            [r, g, b] | null   the game tone (null: the bro's orange)
 *    hair, headwear, facialHair, eyewear, eyeStyle, species, shirt   catalog ids
 *    hairColor, hatColor, facialHairColor, eyewearColor, shirtColor   [r, g, b] | null
 *    shirtPattern    'tile:ink' (patternCatalog) | ''
 *  `backgrounds`: name -> [r, g, b] (the atlas index's). */
export function hemiRecipe(look, backgrounds) {
  const L = look || {};
  const species = L.species && L.species !== 'none' ? own(HEMI_SPECIES, L.species) : undefined;
  if (species === null) return null;
  const skin = _rgb(L.skin);

  let headwear = null, hatOnHair = true;
  const hw = own(HEMI_HEADWEAR, L.headwear);
  if (hw) {
    headwear = { name: hw.trait };
    if (hw.relogo) headwear.relogo = hw.relogo;
    const c = _rgb(L.hatColor);
    if (c) headwear.ramp = rampOf(c);
    hatOnHair = !!hw.onHair;
  }

  let hair = null;
  const hr = own(HEMI_HAIR, L.hair);
  if (hr && hatOnHair) {
    hair = { name: hr.trait };
    const c = _rgb(L.hairColor) || hr.tint || null;
    if (c) hair.ramp = rampOf(c);
  }

  let eyewear = null;
  const ew = own(HEMI_EYEWEAR, L.eyewear);
  if (ew) {
    eyewear = { name: ew.trait };
    const c = _rgb(L.eyewearColor);
    if (c) eyewear.ramp = rampOf(c);
  }

  const eyes = (own(HEMI_EYES, L.eyeStyle) || HEMI_EYES.none).trait;

  let beard = null;
  if (own(HEMI_FACIAL_HAIR, L.facialHair)) {
    const c = _rgb(L.facialHairColor);
    beard = { ramp: c ? rampOf(c) : null };
  }

  let shirt = null;
  if (own(HEMI_SHIRT, L.shirt)) {
    shirt = { color: _rgb(L.shirtColor) || SHIRT_DEFAULT, ox: 0, oy: 0, cell: 1 };
    const p = L.shirtPattern ? parsePattern(L.shirtPattern, 'shirt') : null;
    const ink = p && _hex(p.color);
    if (p && ink) { shirt.tile = { w: p.tile.w, h: p.tile.h, cells: p.tile.cells }; shirt.ink = ink; }
  }

  const bgs = backgrounds || {};
  const against = shirt ? shirt.color : (skin || [233, 153, 73]);
  const bgName = pickBackground(bgs, against);
  return { bg: bgName ? bgs[bgName] : [86, 144, 86], bgName, skin, shirt, eyes, eyewear, hair, headwear, beard };
}

/** every layer name a look can name (the atlas carries each) */
export function hemiLayerNames() {
  const s = new Set(['bro', 'beard', 'yellowshirt']);
  for (const t of [HEMI_HAIR, HEMI_HEADWEAR, HEMI_EYEWEAR, HEMI_EYES]) for (const k of Object.keys(t)) s.add(t[k].trait);
  return [...s];
}

/** the items worn as their nearest trait, slot by slot (the doc's list) */
export function hemiNearList() {
  const out = [];
  const tables = { hair: HEMI_HAIR, headwear: HEMI_HEADWEAR, eyewear: HEMI_EYEWEAR, eyeStyle: HEMI_EYES, species: HEMI_SPECIES };
  for (const [slot, t] of Object.entries(tables)) {
    for (const [id, v] of Object.entries(t)) if (!v || v.near) out.push(slot + ':' + id + (v ? ' -> ' + v.trait : ' -> (none)'));
  }
  return out;
}

/** The switch.  v2.3.4049: OFF by default (owner, 2026-11-03, of the player's
 *  Hemi Bro portrait: "Sorry but I don't like the pfp"): the game's own
 *  headshot everywhere again, as before v2.3.3999.  `?hemiface=1` turns it on
 *  for one tab, so nothing is deleted.  The townsfolk's dialogue busts are a
 *  different thing (npc-creator-looks.md) and stay Hemi Bros. */
export function hemiFaceChoice(search) {
  let v = null;
  try { v = new URLSearchParams(search || '').get('hemiface'); } catch (e) { v = null; }
  if (v === '1') return { on: true, why: 'address' };
  return { on: false, why: v === '0' ? 'address' : 'default' };
}
