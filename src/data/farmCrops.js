/* ═══ v2.3.3127: THE FARM'S CROPS, THE CLIENT'S COPY ═══
 *
 * The worker settles every bed from its own table (server/src/farm.js FARM);
 * this copy only lets the Feed & Seed window say what a seed costs, how long
 * it grows and what it pays BEFORE you tap.  mirror-audit pins every number
 * here to the worker's, so the window cannot promise "6 min" while the worker
 * waits 8.  Plain data, no imports: node reads it in that suite.
 *
 * `look` is the window's and the bag's picture for each thing, a glyph until
 * crop art is made (the daily chest and the golden ticket shipped the same
 * way); docs/ART-WISHLIST.md "The farm" has the prompts for the real ones. */

export const FARM = {
  FREE_BEDS: 6,
  MAX_BEDS: 25,
  WATER_TIME: 0.75,
  FEED_YIELD: 1.5,
  COMPOST: 'compost',
  COMPOST_PRICE: 4,
  BUY_MAX: 50,
  CROPS: {
    carrot:     { name: 'Carrot',     seed: 'seed_carrot',     item: 'crop_carrot',     lvl: 1,  price: 2,  mins: 8,    yield: 2, xp: 25,  base: 8,  look: '🥕' },
    firebloom:  { name: 'Firebloom',  seed: 'seed_firebloom',  item: 'herb_firebloom',  lvl: 1,  price: 5,  mins: 40,   yield: 2, xp: 50,  base: 16, look: '🌺' },
    rock_vine:  { name: 'Rock Vine',  seed: 'seed_rock_vine',  item: 'herb_rock_vine',  lvl: 5,  price: 10, mins: 320,  yield: 2, xp: 120, base: 30, look: '🌿' },
    cloudpetal: { name: 'Cloudpetal', seed: 'seed_cloudpetal', item: 'herb_cloudpetal', lvl: 10, price: 15, mins: 640,  yield: 2, xp: 180, base: 40, look: '🌸' },
    /* v2.3.3131: the two food crops */
    potato:     { name: 'Potato',     seed: 'seed_potato',     item: 'crop_potato',     lvl: 5,  price: 6,  mins: 160,  yield: 3, xp: 90,  base: 12, look: '🥔' },
    pumpkin:    { name: 'Pumpkin',    seed: 'seed_pumpkin',    item: 'crop_pumpkin',    lvl: 10, price: 25, mins: 1760, yield: 2, xp: 320, base: 60, look: '🎃' },
    /* v2.3.3119: ten more, the owner's "good variety of crops to grow" --
       appended in the worker's order (caps.farmCrops counts them).  Glyphs
       until the crop sheet is made (docs/art/FARM-ART-PROMPTS.md); 🍠 for the
       heartroot, as there is no radish or beet that every phone draws. */
    wheat:          { name: 'Wheat',          seed: 'seed_wheat',          item: 'crop_wheat',          lvl: 1,  price: 3,  mins: 20,   yield: 3, xp: 35,  base: 6,  look: '🌾' },
    strawberry:     { name: 'Strawberry',     seed: 'seed_strawberry',     item: 'crop_strawberry',     lvl: 1,  price: 4,  mins: 60,   yield: 3, xp: 60,  base: 10, look: '🍓' },
    tomato:         { name: 'Tomato',         seed: 'seed_tomato',         item: 'crop_tomato',         lvl: 5,  price: 5,  mins: 100,  yield: 3, xp: 75,  base: 11, look: '🍅' },
    frostberry:     { name: 'Frostberry',     seed: 'seed_frostberry',     item: 'herb_frostberry',     lvl: 5,  price: 8,  mins: 240,  yield: 2, xp: 110, base: 26, look: '🫐' },
    corn:           { name: 'Corn',           seed: 'seed_corn',           item: 'crop_corn',           lvl: 10, price: 9,  mins: 300,  yield: 2, xp: 125, base: 28, look: '🌽' },
    cabbage:        { name: 'Cabbage',        seed: 'seed_cabbage',        item: 'crop_cabbage',        lvl: 10, price: 11, mins: 420,  yield: 2, xp: 150, base: 34, look: '🥬' },
    dewmelon:       { name: 'Dewmelon',       seed: 'seed_dewmelon',       item: 'herb_dewmelon',       lvl: 10, price: 18, mins: 900,  yield: 2, xp: 220, base: 48, look: '🍈' },
    thunder_pepper: { name: 'Thunder Pepper', seed: 'seed_thunder_pepper', item: 'herb_thunder_pepper', lvl: 15, price: 12, mins: 540,  yield: 3, xp: 200, base: 30, look: '🌶️' },
    gloomcap:       { name: 'Gloomcap',       seed: 'seed_gloomcap',       item: 'herb_gloomcap',       lvl: 15, price: 20, mins: 1080, yield: 2, xp: 270, base: 55, look: '🍄' },
    heartroot:      { name: 'Heartroot',      seed: 'seed_heartroot',      item: 'herb_heartroot',      lvl: 20, price: 28, mins: 1440, yield: 2, xp: 340, base: 70, look: '🍠' },
  },
};

/* The order the window lists them in: by the level they open at, then the
   quickest first (v2.3.3119: sixteen). */
export const FARM_CROP_ORDER = [
  'carrot', 'wheat', 'firebloom', 'strawberry',
  'tomato', 'potato', 'frostberry', 'rock_vine',
  'corn', 'cabbage', 'cloudpetal', 'dewmelon', 'pumpkin',
  'thunder_pepper', 'gloomcap',
  'heartroot',
];

/* Glyphs for the things that are not crops. */
export const FARM_LOOK = {
  seed: '🌱',      /* a seedling: every seed packet, and a crop just planted */
  sprout: '🌿',    /* half grown */
  compost: '🪱',   /* a worm: compost */
  water: '💧',     /* a drop */
  dig: '⛏️',       /* a pick: the dig tool (there is no hoe glyph) */
  harvest: '🧺',   /* a basket */
};

export function farmGrowMs(crop, watered) {
  return Math.round(crop.mins * 60000 * (watered ? FARM.WATER_TIME : 1));
}

/* What a bed will pay, as the window says it before you harvest.  A whole
   number when it is one; v2.3.3131: a RANGE when fertilizing gives a fraction
   -- the potato's 3 x 1.5 is 4.5, and the worker pays 4 or 5 (farmYield), so
   "5" was a promise it broke half the time. */
export function farmYieldShown(crop, fed) {
  if (!fed) return crop.yield;
  const q = crop.yield * FARM.FEED_YIELD;
  const whole = Math.floor(q);
  return q === whole ? whole : whole + '\u2013' + (whole + 1);
}

/* Which crop a seed key plants (null for anything else). */
export function farmCropOfSeed(key) {
  for (const id of FARM_CROP_ORDER) if (FARM.CROPS[id].seed === key) return id;
  return null;
}

/* Which crop a harvested key is (null for anything else). */
export function farmCropOfItem(key) {
  for (const id of FARM_CROP_ORDER) if (FARM.CROPS[id].item === key) return id;
  return null;
}

/* The bag's name and glyph for every farm key (InventoryPanel ITEM_NAMES and
   iconFor), built from the table so a crop added here is named there too. */
export const FARM_ITEM_NAMES = FARM_CROP_ORDER.reduce((m, id) => {
  const c = FARM.CROPS[id];
  m[c.seed] = c.name + ' Seeds';
  m[c.item] = c.name;
  return m;
}, { [FARM.COMPOST]: 'Compost' });

export function farmLookFor(key) {
  if (key === FARM.COMPOST) return FARM_LOOK.compost;
  if (farmCropOfSeed(key)) return FARM_LOOK.seed;
  const c = farmCropOfItem(key);
  return c ? FARM.CROPS[c].look : null;
}

/* "6m", "1h 20m", "8h" -- short, for a bed's corner. */
export function farmTimeLeft(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? h + 'h ' + r + 'm' : h + 'h';
}
