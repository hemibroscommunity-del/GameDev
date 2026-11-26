/* ═══ v2.3.6786: THE GOLD ON THE TOP BAR, BETWEEN BROTOWN AND THE DAILY SPIN (card UI3, PR 7) ═══
 *
 * The owner, 2026-11-26: "Move gold amount in between daily spin and brotown
 * on top bar".  Their third word on the purse: v2.3.2320 put it at the very
 * top right ("Move gold amount display to very top right"), v2.3.4183 took it
 * away ("I don't like the placement of where the gold count is (top right)"),
 * and this one names the place: BETWEEN the name and the spin, never the
 * corner (ui/mobile/ZoneHeader.jsx draws it; game.css .bt-zone-header__gold).
 *
 * This module is the rule, so node tests what it DOES
 * (tools/guards/top-gold.test.mjs):
 *   - the number is the purse the page already holds, read where Gear reads
 *     it (S.rpg.coins: GearPanels.jsx / GearTab.jsx `R.coins`, R being S.rpg)
 *     and said in Gear's own form (barNumber(coins, true, 10000): "9,999",
 *     "12.4K", "2.55M"), so the bar and Gear never disagree.  No request, no
 *     write, no prediction of its own: it moves when the server's event moves
 *     the page's purse, as Gear's does;
 *   - before the worker's record has come (S._rpgFromServer, wsClient's
 *     player_state; joinTown clears it) nothing is shown: the warm-start cache
 *     or a blank character's 0 is never drawn as your gold;
 *   - `?topgold=0` hides it on this device and is remembered (bt_topgold
 *     '0'); `?topgold=1` forgets; on otherwise (a trial the owner likes is
 *     everyone's default, with its switch), as the HUD's `?hud=0`.
 * No imports but the number's form, the switch reader and the words.
 */
import { barNumber } from './barNumbers.js';
import { readerFor, pageAddress, swValue } from './switches.js';
import { say } from '../game/say.js';   /* (written so the words guard reads it: say.test 7) */
import { SAY } from '../data/say/zoneHeader.js';

/* Gear's form: barNumber(coins, true, 10000) -- whole up to 9,999, short past it */
export const TOP_GOLD_SHORT = 10000;

/* the switch's memory on this device (`?topgold=0` remembered; `?topgold=1` forgets) */
export const TOP_GOLD_KEY = 'bt_topgold';

/** Is the gold on the bar wanted on this device?  `search` and `store` are
 *  for tests; the page's address is read through the one reader (switches.js). */
export function topGoldWanted(search, store) {
  const v = search == null ? swValue('topgold') : readerFor(search).swValue('topgold');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(TOP_GOLD_KEY, '0'); else ls.removeItem(TOP_GOLD_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(TOP_GOLD_KEY) === '0'); } catch (e) { return true; }
}

/* the page's answer, asked again only when its address changes */
let _onFor = null;
let _on = null;
/** The page's: is the gold on the bar? */
export function topGoldOn() {
  const s = pageAddress();
  if (_onFor !== s) { _onFor = s; _on = topGoldWanted(s); }
  return _on;
}

/** What the bar shows: null (nothing: switched off, or the worker's record
 *  not come yet, or no purse in it), else { n, text, label }: `n` the whole
 *  number, `text` Gear's form of it, `label` "Gold: 1,234" for a reader. */
export function topGoldModel(S, on) {
  if (!on) return null;
  if (!S || !S._rpgFromServer || !S.rpg) return null;
  const c = S.rpg.coins;
  if (c == null || c === '' || !Number.isFinite(Number(c))) return null;
  const n = Math.max(0, Math.floor(Number(c)));
  return Object.freeze({
    n,
    text: barNumber(n, true, TOP_GOLD_SHORT),
    label: say(SAY, 'zoneHeader.gold', { gold: barNumber(n, false) }),
  });
}

/** How the number moved since it was last drawn: 'gain', 'spend' or null.
 *  `was` null (the first number, the record just come) is never a change. */
export function topGoldChange(was, now) {
  if (was == null || now == null) return null;
  if (now > was) return 'gain';
  if (now < was) return 'spend';
  return null;
}
