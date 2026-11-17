/* ═══ v2.3.4941: A WEAPON SALE IS DRAWN ONLY WHEN THE WORKER WILL HEAR IT ═══
 *
 * The bag's Sell button (InventoryPanel.jsx) took the weapon off the bag and
 * added its gold on the page at once, then asked the worker (`sell_weapon`).
 * A sale the worker refuses is answered since v2.3.4883 (gear.js: the coins
 * and the weapon bag sent back, the refusal door), and the phone adopts
 * them.  But a sale the CHANNEL dropped -- the connection down, a Wi-Fi blip
 * (wsClient.js channelShim answers `false`, TRAPS §287) -- reached no worker,
 * so nothing ever answered it: the gold stayed on the page, the weapon gone,
 * until the next join put both back with no word why.
 *
 * So the sale is asked first, and drawn only when the channel took it; a
 * dropped one draws nothing (the caller says so).  Not kept for the rejoin as
 * a quest tap is (questKept.js): a sale is a bag place, and the bag may have
 * moved under it by then.
 *
 * No imports: node tests it (server/test/weapon-sell.test.mjs). */

import { act } from './actions.js';   /* v2.3.5188: the action door (card K PR 7), its only import: it has none of its own, so node still reads this file */

/** Ask the worker to sell the weapon at bag place `si`.  True when the
    channel took the message (only `false` or a throw means dropped). */
export function askSellWeapon(S, si) {
  if (!S || !S.channel || typeof S.channel.send !== 'function') return false;
  try { return act('sell_weapon', { stashIdx: si }) !== false; } catch (e) { return false; }   /* v2.3.5188: through the action door (actions.js) */
}

/** The page's prediction of a sale the worker heard: the weapon off the
    bag, its gold added (the worker's echo is the truth either way). */
export function drawWeaponSale(R, si, sellVal) {
  if (!R || !Array.isArray(R.weaponStash) || !R.weaponStash[si]) return false;
  R.coins = (Number(R.coins) || 0) + sellVal;
  if (R._compStats) R._compStats.totalGoldEarned += sellVal;
  R.weaponStash.splice(si, 1);
  return true;
}
