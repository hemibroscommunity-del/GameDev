/* ═══ v2.3.3734: AN AMOUNT OF COINS SHOWS ITS PILE ═══
 *
 * The owner, 2026-10-28: "I want these as the coin art instead of the current
 * one (and at different amounts) shown between the labelled pic and unlabeled
 * one".  Their sheet has fourteen piles over the labels 1, 2, 3, 4, 5, 10, 50,
 * 100, 1,000, 5,000, 10,000, 50,000, 100,000 and 200,000+
 * (assets/icons-source/coins/coins-labelled.png); an amount shows the pile
 * whose label is the LARGEST AT OR UNDER it: 7 coins the 5 pile, 12,345 the
 * 10,000 pile, 250,000 the 200,000+ pile.  Nothing, a negative or a broken
 * number shows the single coin -- never no picture.
 *
 * COIN_ONE is the single coin: a coin as a unit beside a price ("120 [coin]"),
 * not an amount being had or given.  The pictures are cut by
 * tools/ui/add-coin-art.mjs (data/coinPiles.js, GENERATED).  No imports but
 * the table, so node tests it (server/test/coin-art.test.mjs). */
import { COIN_PILES } from '../data/coinPiles.js';

export { COIN_PILES };
export const COIN_ONE = COIN_PILES[0].url;

/** The pile row an amount shows: { min, url, w, h }. */
export function coinPileFor(amount) {
  const n = Math.floor(Number(amount));
  if (!(n >= 1)) return COIN_PILES[0];
  let lo = 0, hi = COIN_PILES.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (COIN_PILES[mid].min <= n) lo = mid; else hi = mid - 1;
  }
  return COIN_PILES[lo];
}

/** The picture's address for an amount of coins. */
export function coinArtFor(amount) {
  return coinPileFor(amount).url;
}

/** Every pile's address (a loading screen warms them all). */
export const COIN_PILE_URLS = Object.freeze(COIN_PILES.map((p) => p.url));
