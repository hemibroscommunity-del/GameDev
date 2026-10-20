/* ═══ v2.3.3515: GEMS LIVE IN THE BAG (the gem plan's Phase 2, decision 5) ═══
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good" --
 * decision 5, "In the bag, raw and finished: tradeable, sellable, bankable,
 * droppable, and lost with the bag in No man's land".  Until now raw and
 * polished gems sat in a pouch the bag never showed (`lifeSkills.gems`,
 * `raw_<element>` / `polished_<element>`, v2.3.1198): a popup said "Raw Frost
 * Gem!" and after that a gem appeared only on the Gem Works' tabs.
 *
 * They are bag items now, `ps.inventory`:
 *
 *     gem_raw_<element>   a raw gem ("Raw Frost Gem")
 *     gem_<element>       an elemental gem ("Frost Gem") -- set into gear
 *
 * THIS MODULE IS THE ONE DOOR to a gem count.  Everything that spends or
 * pays a gem -- the crack and the combine (shardcrack.js), a weapon's, an
 * amulet's and a shield's gem (weapongem.js, amulet.js, shieldgem.js), Take
 * out and salvage, the old cut, the dev kit -- goes through `gemCount`,
 * `gemTake` and `gemGive`.
 *
 * THE MOVE IS A JOIN-TIME HEAL, NOT A REGISTRY MIGRATION (`gemsIntoBag`,
 * called from amulet.js _gemsAdoptOnJoin on every join).  Two reasons:
 *   - the join's one-time capture of an old browser's pouch (a record from
 *     before v2.3.1198) is an UNMIGRATED WRITER: it would put gems back in
 *     the pouch after any migration had run (docs/specs/migrations.md, the
 *     boundary-heal rule) -- so the join must move them anyway;
 *   - a registry migration bumps RPG_SCHEMA_VERSION, and a rollback to a
 *     worker before this one would then refuse every character saved by this
 *     one (the v2.3.3303 "newer save" rule) until it came back.  The move
 *     changes no field's shape: gems land in `inventory`, a field every
 *     worker keeps, so an older worker reads a character whole -- it only
 *     does not know what the new keys are.
 * It is idempotent: an empty pouch moves nothing.  And for safety the counts
 * read BOTH places (`gemCount`), taking from the bag first, so a gem in a
 * pouch the move has not reached yet is never lost or unspendable.
 *
 * Keys are built from an element only after the element is checked against
 * GEM_ELEMENTS (own members of a Set; never a client's string). */
import { AMULET_GEMS, WEAPON_GEMS } from './data.js';

/* every element a gem can be: the amulets' nine and the weapons' eight
   (Flora is a weapon's, Dark and Light an amulet's) -- the ten */
export const GEM_ELEMENTS = new Set([...AMULET_GEMS, ...WEAPON_GEMS]);

export const gemRawKey = (e) => 'gem_raw_' + e;
export const gemCutKey = (e) => 'gem_' + e;
const pouchKey = (e, raw) => (raw ? 'raw_' : 'polished_') + e;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

/** {element, raw} of a bag key, or null for anything that is not a gem. */
export function parseGemKey(k) {
  if (typeof k !== 'string' || k.length > 24) return null;
  if (k.indexOf('gem_raw_') === 0) {
    const e = k.slice(8);
    return GEM_ELEMENTS.has(e) ? { element: e, raw: true } : null;
  }
  if (k.indexOf('gem_') === 0) {
    const e = k.slice(4);
    return GEM_ELEMENTS.has(e) ? { element: e, raw: false } : null;
  }
  return null;
}

const pouchOf = (ps) => (ps && ps.lifeSkills && typeof ps.lifeSkills === 'object'
  && ps.lifeSkills.gems && typeof ps.lifeSkills.gems === 'object' && !Array.isArray(ps.lifeSkills.gems) ? ps.lifeSkills.gems : null);
const bagOf = (ps, create) => {
  if (!ps) return null;
  if (!ps.inventory || typeof ps.inventory !== 'object' || Array.isArray(ps.inventory)) {
    if (!create) return null;
    ps.inventory = {};
  }
  return ps.inventory;
};

/** How many gems of `element` (raw or cut) this player holds: the bag, and
 *  any the old pouch still has. */
export function gemCount(ps, element, raw) {
  if (!GEM_ELEMENTS.has(element)) return 0;
  const bag = bagOf(ps, false);
  const pouch = pouchOf(ps);
  const k = raw ? gemRawKey(element) : gemCutKey(element);
  const p = pouchKey(element, raw);
  return (bag && own(bag, k) ? num(bag[k]) : 0) + (pouch && own(pouch, p) ? num(pouch[p]) : 0);
}

/** Take `n` gems of `element`: the bag first, then the pouch.  False (and
 *  nothing taken) when fewer are held. */
export function gemTake(ps, element, raw, n = 1) {
  const want = num(n);
  if (!want || gemCount(ps, element, raw) < want) return false;
  let left = want;
  const bag = bagOf(ps, false);
  const k = raw ? gemRawKey(element) : gemCutKey(element);
  if (bag && own(bag, k)) {
    const have = num(bag[k]);
    const t = Math.min(have, left);
    if (have - t > 0) bag[k] = have - t; else delete bag[k];
    left -= t;
  }
  if (left > 0) {
    const pouch = pouchOf(ps);
    const p = pouchKey(element, raw);
    const have = pouch && own(pouch, p) ? num(pouch[p]) : 0;
    if (have - left > 0) pouch[p] = have - left; else if (pouch) delete pouch[p];
  }
  return true;
}

/** Give `n` gems of `element`: always into the bag. */
export function gemGive(ps, element, raw, n = 1) {
  const add = num(n);
  if (!add || !GEM_ELEMENTS.has(element)) return false;
  const bag = bagOf(ps, true);
  const k = raw ? gemRawKey(element) : gemCutKey(element);
  bag[k] = (own(bag, k) ? num(bag[k]) : 0) + add;
  return true;
}

/** The join-time move: every gem in the old pouch into the bag, one for one,
 *  and the pouch emptied.  True when anything moved. */
export function gemsIntoBag(ps) {
  const pouch = pouchOf(ps);
  if (!pouch) return false;
  let moved = false;
  for (const k of Object.keys(pouch)) {
    const raw = k.indexOf('raw_') === 0;
    const e = raw ? k.slice(4) : (k.indexOf('polished_') === 0 ? k.slice(9) : null);
    const n = num(pouch[k]);
    if (e && GEM_ELEMENTS.has(e) && n > 0) { gemGive(ps, e, raw, n); moved = true; }
  }
  if (Object.keys(pouch).length) {
    ps.lifeSkills.gems = {};
    moved = true;
  }
  return moved;
}
