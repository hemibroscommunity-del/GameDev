/* ═══ v2.3.6687: WHAT IS IN EACH OF GEAR'S NINE CELLS (card UI2-gear PR 1) ═══
 * Moved out of GearTab.jsx (where it was written at v2.3.4151), so the one
 * item page (dash/itemPageOpen.js) reads a worn piece the way Gear's own card
 * does: one reader, two screens.  `cellContent(R, id, slots)` answers
 * { item, icon, quality, name, unequip, rows } for a cell of GEAR_CELLS
 * (itemCategory.js); `slots` is getEquippedSlots(R) (sheet/equipModel.js). */
import { gearCell } from './itemCategory.js';
import { unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect } from './equipActions.js';
import { weaponRows, shieldRows, armourRows } from './gearStats.js';
import { getEquipContribs, wpnIconSrc, weaponDisplayName } from '../sheet/equipModel.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { gemElementName } from '@/data/gems.js';
import { act } from '@/game/actions.js';   /* v2.3.5191: the page's requests leave through the action door (card K PR 7) */

export const HAND_FIELD = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };

export function cellContent(R, id, slots) {
  const c = gearCell(id);
  if (c.field) {
    const wpn = R[c.field] || null;
    return {
      item: wpn, icon: wpn ? wpnIconSrc(R, wpn) : null, quality: wpn && wpn.quality,
      name: wpn ? weaponDisplayName(wpn) : '',
      unequip: wpn ? () => unequipWeaponSlot(c.active === 'melee' ? 'weapon' : c.active) : null,
      rows: wpn ? weaponRows(R, wpn) : [],
    };
  }
  const sl = slots.find((x) => x.slot === id);
  if (id === 'shield') {
    return { item: R.shield || null, icon: sl && sl.iconSrc, quality: R.shield && R.shield.quality,
      name: (R.shield && R.shield.name) || 'Shield', unequip: R.shield ? () => unequipShieldDirect() : null,
      rows: shieldRows(R.shield) };
  }
  if (id === 'chest' || id === 'legs') {
    const piece = id === 'chest' ? R.armor : R.legsArmor;
    const gearId = getEquip(id);
    /* v2.3.4199, the owner: "don't show the shirt in the chest slot. It's too
       confusing ... It's intended for torso armor." The base shirt is a
       cosmetic gear id (equip.shirt, no armour stat), so the chest cell is
       worn only by the Iron-Torso-style piece or a chest gear layer. */
    const worn = id === 'chest'
      ? !!(piece || (sl && sl.item && sl.item.gearChestId && sl.item.gearChestId !== 'none'))
      : !!(sl && sl.item);
    const unequip = piece ? () => (id === 'chest' ? unequipArmorDirect() : unequipLegsDirect())
      : (gearId && gearId !== 'none') ? () => unequipGearDirect(id) : null;
    return { item: worn ? (piece || sl.item) : null, icon: worn ? (sl && sl.iconSrc) : null, quality: piece && piece.quality,
      name: (piece && piece.name) || (id === 'chest' ? 'Chest' : 'Legs'), unequip,
      rows: piece ? armourRows(piece, id) : [] };
  }
  if (id === 'cape') {
    const it = sl && sl.item;
    return { item: it || null, icon: sl && sl.iconSrc, quality: null, name: it ? it.name : 'Cape',
      unequip: it ? () => {
        try { act('cape_equip', { worn: false }); } catch (e) { /* offline */ }   /* v2.3.5191: through the action door (actions.js); v2.3.6687: act() itself answers with no socket */
      } : null,
      rows: [] };
  }
  if (id === 'amulet') {
    /* v2.3.4151: NO Unequip -- the worker's unequip_request for the amulet
       slot nulls it with no bag to put it in (gear.js _handleUnequipRequest:
       "armor/shield/amulet just null out"), so the button would destroy it */
    const card = getEquipContribs(R).cards.amulet;
    return { item: R.amulet || null, icon: sl && sl.iconSrc, quality: null,
      name: (R.amulet && R.amulet.name) || 'Amulet', unequip: null,
      rows: card ? card.rows.map((r) => ({ k: r.k, v: r.v })) : [] };
  }
  /* gem: the gems set in the weapon in your hand */
  const hand = R[HAND_FIELD[R.activeSlot || 'melee']] || null;
  const els = hand ? [hand.element1, hand.element2].filter(Boolean) : [];
  return { item: els.length ? { els, hand } : null, icon: null, els, hand, quality: null,
    name: els.length ? els.map((e) => gemElementName(e) + ' Gem').join(' + ') : 'Gem', unequip: null, rows: [] };
}
