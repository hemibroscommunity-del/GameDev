/* ═══ v2.3.3515: GEMS ARE BAG ITEMS (the worker's server/src/gems.js) ═══
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good" --
 * decision 5, "In the bag, raw and finished: tradeable, sellable, bankable,
 * droppable, and lost with the bag in No man's land".  Raw and polished gems
 * sat in a pouch the bag never showed (`lifeSkills.gems`, `raw_<element>` /
 * `polished_<element>`, v2.3.1198).  The worker moves them into the bag at
 * the next join, as
 *
 *     gem_raw_<element>   a raw gem       ("Raw Frost Gem")
 *     gem_<element>       an elemental gem ("Frost Gem"), set into gear
 *
 * and every gem it pays goes there.  The page reads a count as the worker
 * does (`gemCount`): the bag, and any gems an old pouch still holds -- so a
 * page against a worker from before this version, whose gems are still in
 * the pouch, reads them the same, and needs no cap to know which.
 *
 * Held to the worker by server/test/mirror-audit.test.mjs: GEM_ELEMENTS is
 * gems.js's set, and the keys its keys.  Imports only elements.js (itself
 * import-free), so the audit reads it in plain node. */
import { ELEMENTS } from './elements.js';

/* every element a gem can be: the amulets' nine and the weapons' eight --
   Flora is a weapon's, Dark and Light an amulet's (gems.js GEM_ELEMENTS) */
export const GEM_ELEMENTS = Object.freeze(['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind', 'flora', 'dark', 'light']);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const gemRawKey = (e) => 'gem_raw_' + e;
export const gemCutKey = (e) => 'gem_' + e;

export function isGemElement(e) {
  return typeof e === 'string' && GEM_ELEMENTS.indexOf(e) >= 0;
}

/** {element, raw} of a bag key, or null for anything that is not a gem. */
export function parseGemKey(k) {
  if (typeof k !== 'string' || k.length > 24) return null;
  if (k.indexOf('gem_raw_') === 0) {
    const e = k.slice(8);
    return isGemElement(e) ? { element: e, raw: true } : null;
  }
  if (k.indexOf('gem_') === 0) {
    const e = k.slice(4);
    return isGemElement(e) ? { element: e, raw: false } : null;
  }
  return null;
}

/** "Frost" */
export function gemElementName(e) {
  return typeof e === 'string' && e ? e.charAt(0).toUpperCase() + e.slice(1) : '';
}

/** "Raw Frost Gem" / "Frost Gem" for a bag key, else null. */
export function gemName(key) {
  const g = parseGemKey(key);
  return g ? (g.raw ? 'Raw ' : '') + gemElementName(g.element) + ' Gem' : null;
}

/** The element's own colour (elements.js). */
export function gemColor(e) {
  return own(ELEMENTS, e) && ELEMENTS[e].color ? ELEMENTS[e].color : '#9FD3F0';
}

/** A gem's picture.  Until the owner's gem pictures (the plan's Phase 3), the
 *  element's own icon -- already drawn in the gem's shape -- for both. */
export function gemIcon(key) {
  const g = parseGemKey(key);
  return g ? '/icons/ui/elem-' + g.element + '.webp' : null;
}

/** How many gems of `element` (raw or cut) this character holds: the bag, and
 *  any the old pouch still has (the worker's gemCount). */
export function gemCount(rpg, element, raw) {
  if (!rpg || !isGemElement(element)) return 0;
  const inv = rpg.inventory && typeof rpg.inventory === 'object' ? rpg.inventory : null;
  const pouch = rpg.lifeSkills && rpg.lifeSkills.gems && typeof rpg.lifeSkills.gems === 'object' ? rpg.lifeSkills.gems : null;
  const k = raw ? gemRawKey(element) : gemCutKey(element);
  const p = (raw ? 'raw_' : 'polished_') + element;
  const n = (v) => { const x = Math.floor(Number(v)); return Number.isFinite(x) && x > 0 ? x : 0; };
  return (inv && own(inv, k) ? n(inv[k]) : 0) + (pouch && own(pouch, p) ? n(pouch[p]) : 0);
}

/** Take `n` gems of `element` off this browser's own copy, as the worker does
 *  (the bag first, then any pouch left) -- a window's PREDICTION of what the
 *  worker will settle; the next player_state puts the true counts back.
 *  False (nothing taken) when fewer are held. */
export function gemTakeLocal(rpg, element, raw, n = 1) {
  const want = Math.max(0, Math.floor(Number(n) || 0));
  if (!want || gemCount(rpg, element, raw) < want) return false;
  let left = want;
  const inv = rpg.inventory && typeof rpg.inventory === 'object' ? rpg.inventory : null;
  const k = raw ? gemRawKey(element) : gemCutKey(element);
  if (inv && own(inv, k)) {
    const have = Math.max(0, Math.floor(Number(inv[k]) || 0));
    const t = Math.min(have, left);
    if (have - t > 0) inv[k] = have - t; else delete inv[k];
    left -= t;
  }
  if (left > 0) {
    const pouch = rpg.lifeSkills && rpg.lifeSkills.gems;
    const p = (raw ? 'raw_' : 'polished_') + element;
    const have = pouch && own(pouch, p) ? Math.max(0, Math.floor(Number(pouch[p]) || 0)) : 0;
    if (have - left > 0) pouch[p] = have - left; else if (pouch) delete pouch[p];
  }
  return true;
}

/** The gems this character made whose Enchanting XP is still to come, for
 *  `element` (the worker's `lifeSkills.gemsUnpaid`, weapongem.js "THE XP,
 *  ONCE A GEM"); null against a worker that does not keep the count. */
export function gemXpOwed(rpg, element) {
  const u = rpg && rpg.lifeSkills && rpg.lifeSkills.gemsUnpaid;
  if (!u || typeof u !== 'object' || Array.isArray(u)) return null;
  const n = own(u, element) ? Math.floor(Number(u[element]) || 0) : 0;
  return n > 0 ? n : 0;
}

/** Every gem owed its XP, summed (null when the worker keeps no count). */
export function gemXpOwedTotal(rpg) {
  const u = rpg && rpg.lifeSkills && rpg.lifeSkills.gemsUnpaid;
  if (!u || typeof u !== 'object' || Array.isArray(u)) return null;
  let t = 0;
  for (const e of GEM_ELEMENTS) t += gemXpOwed(rpg, e) || 0;
  return t;
}
