/* ═══ v2.3.6688: YOU NOW, AND YOU IF EQUIPPED (card UI2-gear PR 2, the build's step 5) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 5.1): "When
 * inspecting an equippable inventory item, automatically compare the
 * projected resulting character performance against current equipped gear
 * for the relevant slot/channel. Compare final outcome, not merely raw item
 * modifiers. Use the same calculation pipeline as real equipping and the
 * existing attribute preview wherever possible."
 *
 * projectEquip(R, item, kind) answers { kind, now, then }: the numbers of
 * YOUR character as it is (`now`; null when nothing is worn in that place)
 * and of your character with the item put in its place (`then`), read by the
 * readers the Bro pages print with (sheet/broStats.js broWeaponStats: the
 * rpg as if that weapon's lane were out, `activeSlot`), never from the
 * item's own numbers:
 *   a weapon   DPS = calcDisplayDps(you, weapon) (gameSystems.js, called,
 *              never changed); the average hit from calcDisplayDmgRange;
 *              the attack's seconds from statSim's autoSwingMs (your Speed,
 *              your amulet, the weapon type, a staff's 300 ms);
 *   armour     your whole damage cut (heroStatPills' combinedDamageCut of
 *              your Defense, your armour as getArmorDrPct reads it with the
 *              piece in place, and your Dodge): the number the Gear tab and
 *              the Character page already say ("Damage cut");
 *   a shield   its block (calcBlockReduction), Defence and Energy
 *              (getShieldStats): a shield's numbers ARE what you get.
 * A requirement the worker's equip gate asks (getEquipReqLabel) comes back
 * as `req`, for the summary's reason.  Pure (node tests it:
 * tools/guards/compare.test.mjs); never throws: a number it cannot read is
 * left out. */
import {
  calcDisplayDps, calcDisplayDmgRange, weaponForCat, getArmorDrPct, calcBlockReduction, getEquipReqLabel,
} from '../data/gameSystems.js';
import { getShieldStats } from '../data/items.js';
import { prog3CatFor } from '../data/prog3.js';
import { autoSwingMs } from '../ui/mobile/sheet/statSim.js';
import { deriveHeroStats } from '../ui/mobile/sheet/heroModel.js';
import { combinedDamageCut } from '../ui/mobile/sheet/heroStatPills.js';

/** A weapon lane's field on the rpg record and its `activeSlot` (broStats' SLOT_OF). */
export const WEAPON_PLACE = Object.freeze({
  sword: Object.freeze({ field: 'weapon', active: 'melee' }),
  bow: Object.freeze({ field: 'rangedWeapon', active: 'ranged' }),
  staff: Object.freeze({ field: 'staffWeapon', active: 'staff' }),
});
/** Armour's and the shield's fields. */
export const WORN_FIELD = Object.freeze({ chest: 'armor', legs: 'legsArmor', shield: 'shield' });

const safe = (f) => { try { const v = f(); return typeof v === 'number' && Number.isFinite(v) ? v : null; } catch (e) { return null; } };

/** The kind a stored piece projects as: a weapon by its type's lane. */
export function projectKind(item, kind) {
  if (kind === 'chest' || kind === 'legs' || kind === 'shield') return kind;
  if (kind === 'sword' || kind === 'bow' || kind === 'staff' || kind === 'weapon') return item && item.type ? prog3CatFor(item.type) : (kind === 'weapon' ? 'sword' : kind);
  return null;
}

/** You with weapon lane `cat` out (the Bro pages' `as`). */
function youWith(R, cat) {
  return Object.assign({}, R, { activeSlot: WEAPON_PLACE[cat].active });
}

/** A weapon's numbers on character `R` (its lane out). */
export function weaponNumbers(R, cat) {
  const as = youWith(R, cat);
  const wpn = weaponForCat(as, cat);
  if (!wpn) return null;
  const range = (() => { try { return calcDisplayDmgRange(as, wpn); } catch (e) { return null; } })();
  const ms = safe(() => autoSwingMs(as, wpn));
  return {
    dps: safe(() => calcDisplayDps(as, wpn)),
    hit: range && Number.isFinite(range.min) && Number.isFinite(range.max) ? (range.min + range.max) / 2 : null,
    swing: ms != null && ms > 0 ? ms / 1000 : null,
  };
}

/** Your whole damage cut, in percent, on character `R`. */
export function cutNumbers(R) {
  const d = (() => { try { return deriveHeroStats(R) || {}; } catch (e) { return {}; } })();
  const arm = safe(() => getArmorDrPct(R));
  const cut = safe(() => combinedDamageCut(d.defPct, arm == null ? 0 : arm, d.dodge));
  return { cut: cut == null ? null : cut * 100 };
}

/** A shield's numbers. */
export function shieldNumbers(sh) {
  if (!sh) return null;
  const ss = (() => { try { return getShieldStats(sh) || {}; } catch (e) { return {}; } })();
  const block = safe(() => calcBlockReduction(0, sh));
  return { block: block == null ? null : block * 100, def: Number(ss.flatDef) || 0, stamina: Number(ss.staminaBonus) || 0 };
}

/** The equip gate's slot type for a kind (getEquipReqLabel's second argument). */
const REQ_SLOT = Object.freeze({ sword: 'weapon', bow: 'weapon', staff: 'weapon', chest: 'armor', legs: 'armor', shield: 'shield' });

/**
 * `R` the rpg record (GearTab's, handed down), `item` a stored piece,
 * `kind` its kind ('sword' | 'bow' | 'staff' | 'weapon' | 'chest' | 'legs' |
 * 'shield').  Returns { kind, now, then, req } or null for a kind with
 * nothing to project.
 */
export function projectEquip(R, item, kind) {
  const k = projectKind(item, kind);
  if (!k || !item || typeof item !== 'object') return null;
  const me = R || {};
  const req = (() => { try { return getEquipReqLabel(item, REQ_SLOT[k], me) || null; } catch (e) { return null; } })();
  if (WEAPON_PLACE[k]) {
    const f = WEAPON_PLACE[k].field;
    const now = me[f] ? weaponNumbers(me, k) : null;
    const then = weaponNumbers(Object.assign({}, me, { [f]: item }), k);
    return then ? { kind: k, now, then, req } : null;
  }
  if (k === 'shield') {
    return { kind: k, now: shieldNumbers(me.shield), then: shieldNumbers(item), req };
  }
  /* armour: your whole cut NOW, worn piece or not (your Defense and Dodge
     cut a hit with nothing on), so the change is what the piece does to you */
  const f = WORN_FIELD[k];
  const now = cutNumbers(me);
  const then = cutNumbers(Object.assign({}, me, { [f]: item }));
  return { kind: k, now, then, req };
}

/** A WORN piece's own numbers on you (the look from the Equipped side):
    the `now` of its place, no comparison. */
export function wornNumbers(R, kind) {
  const me = R || {};
  if (WEAPON_PLACE[kind]) return me[WEAPON_PLACE[kind].field] ? weaponNumbers(me, kind) : null;
  if (kind === 'shield') return shieldNumbers(me.shield);
  if (kind === 'chest' || kind === 'legs') return me[WORN_FIELD[kind]] ? cutNumbers(me) : null;
  return null;
}
