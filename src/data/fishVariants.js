/* ═══ v2.3.4032: THE RARE FISH -- WHAT THE PHONE SAYS ABOUT THEM ═══
 *
 * The owner, 2026-11-02: a 1% chance of an ALBINO of the fish you are
 * catching, a 0.1% chance of a LARGE one (it heals double), each worth
 * achievement points the first time it is eaten, and an Inspect that weighs a
 * fish, with records for the heaviest of each kind.
 *
 * THE WORKER DECIDES EVERYTHING (server/src/fishlog.js): the roll at the
 * catch, the weight at the weigh-in, the boards.  This file is the names, the
 * bag's look of a variant and the words; mirror-audit holds its species,
 * weights and odds to the worker's FISHLOG.
 *
 * A variant is its own bag key: the species' key with a suffix,
 * `fish_trout_albino`, `fish_pike_large`, `cooked_fish_salmon_albino`.
 *
 * No imports: node-tested (server/test/mirror-audit.test.mjs,
 * fish-variants.test.mjs).  Spec: docs/specs/fish-variants.md. */

/* the five fish, in the fishing ladder's order (lifeSkills.js FISHING_TIERS) */
export const FISH_SPECIES = Object.freeze([
  Object.freeze({ id: 'minnow', name: 'Minnow' }),
  Object.freeze({ id: 'clownfish', name: 'Clownfish' }),
  Object.freeze({ id: 'trout', name: 'Trout' }),
  Object.freeze({ id: 'salmon', name: 'Salmon' }),
  Object.freeze({ id: 'pike', name: 'Pike' }),
]);
const NAME = Object.create(null);
for (const f of FISH_SPECIES) NAME[f.id] = f.name;

/* what each weighs, in grams (server fishlog.js WEIGHTS: the owner's kg) */
export const FISH_WEIGHTS = Object.freeze({
  minnow: Object.freeze([50, 200]),
  clownfish: Object.freeze([100, 400]),
  trout: Object.freeze([500, 3000]),
  salmon: Object.freeze([2000, 8000]),
  pike: Object.freeze([2000, 12000]),
});
export const FISH_ODDS = Object.freeze({ large: 0.001, albino: 0.01 });
/* a large fish weighs 3 to 5 times the plain fish's biggest */
export const FISH_LARGE = Object.freeze({ min: 3, max: 5 });

const KEY_RE = /^(cooked_)?fish_([a-z]+)(?:_(albino|large))?$/;

/** A fish key read: `{cooked, sp, v, name}` (v null for a plain fish), or
 *  null for anything that is not one of the game's fish. */
export function fishKeyInfo(key) {
  if (typeof key !== 'string') return null;
  const m = KEY_RE.exec(key.toLowerCase());
  if (!m || !NAME[m[2]]) return null;
  return { cooked: !!m[1], sp: m[2], v: m[3] || null, name: NAME[m[2]] };
}

/** The plain key a variant's picture is found under: `fish_trout_albino`
 *  -> `fish_trout` (the bag's thumbFor reads the species' picture). */
export function fishPlainKey(key) {
  return typeof key === 'string' ? key.replace(/^((?:cooked_)?fish_[a-z]+)_(?:albino|large)$/i, '$1') : key;
}

/** The variant of a bag key: 'albino', 'large' or null. */
export function fishVariantOf(key) {
  const i = fishKeyInfo(key);
  return i ? i.v : null;
}

/* "Albino Trout", "Large Salmon", "Cooked Albino Pike": the bag's names for
   the twenty variant keys (InventoryPanel.jsx ITEM_NAMES spreads these, so
   the card, the shop, the store, the trade and Ace all say them) */
export const FISH_VARIANT_NAMES = (() => {
  const o = Object.create(null);
  for (const f of FISH_SPECIES) {
    for (const v of ['albino', 'large']) {
      const word = v === 'albino' ? 'Albino ' : 'Large ';
      o['fish_' + f.id + '_' + v] = word + f.name;
      o['cooked_fish_' + f.id + '_' + v] = 'Cooked ' + word + f.name;
    }
  }
  return Object.freeze(o);
})();

/* THE BAG'S LOOK (no new art, the lane's decision): an albino is the
   species' own picture washed pale with a little pink; a large one wears a
   small "L" badge.  The filter is the BAG's only (its tiles sit in the
   dashboard, never over the world): the item card and the weigh-in card are
   drawn over the WebGL canvas, where a CSS filter is the iOS grain hazard
   (TRAPS §42), so there the name says "Albino". */
export const ALBINO_FILTER = 'grayscale(0.85) brightness(1.35) sepia(0.25) hue-rotate(300deg) saturate(1.6)';
export function fishArtStyle(key) {
  return fishVariantOf(key) === 'albino' ? { filter: ALBINO_FILTER } : null;
}

/** A weight in grams, in words: "0.12 kg" under a kilo, "2.4 kg" above. */
export function fishKg(g) {
  const n = Math.max(0, Number(g) || 0) / 1000;
  return (n < 1 ? n.toFixed(2) : n.toFixed(1)) + ' kg';
}

/** The catch's words ("An albino Trout!", "A LARGE Salmon!"), or null for
 *  a plain fish. */
export function fishCatchWords(v, sp) {
  const name = NAME[sp];
  if (!name) return null;
  if (v === 'albino') return 'An albino ' + name + '!';
  if (v === 'large') return 'A LARGE ' + name + '!';
  return null;
}

/** The weigh-in's words, from the worker's `fish_weight`. */
export function fishWeighWords(p) {
  if (!p || typeof p !== 'object') return '';
  const name = NAME[p.sp] || 'fish';
  const what = (p.v === 'albino' ? 'albino ' : p.v === 'large' ? 'large ' : '') + name;
  if (p.off) return 'The scales are closed for now.';
  if (p.unavailable) return "The scales can't read your log right now. Try again soon.";
  if (p.none) return "You've weighed all your " + name + '.';
  return 'This ' + what + ' weighs ' + fishKg(p.g) + '.';
}
