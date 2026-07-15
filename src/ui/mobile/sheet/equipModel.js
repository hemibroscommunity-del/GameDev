import { getActiveWeapon } from '../../../data/gameSystems.js';
import { getEquip } from '../../../rendering/gearCatalog.js';

/* v2.3.1285: the six equipped positions in the nav-system spec's FIXED
   order — Weapon, Shield, Chest, Legs, Cape, Amulet.  Resolution
   extracted from the retired Loadout column (BottomDashboard
   v2.3.1069..1281 lineage) so BagCompact and the expanded InventoryPanel
   share one source.

   Each entry: { slot, label, item, iconSrc, ghost, quality, pickerSlot }
   - iconSrc: the real item art when equipped, else null.
   - ghost:   true when the slot renders its empty-state pictogram.
   - pickerSlot: itemDetailBus loadout-picker slot id (null = no picker
     yet — cape has no data field, amulet uses its own popup kind). */

/* Ghost pictograms (spec: 25-30% opacity, low-contrast).  No dedicated
   silhouette assets exist yet — weapon/shield/chest/legs reuse the real
   item art grayscaled; cape and amulet get inline SVGs until the owner
   generates art (flagged in the PR notes). */
/* v2.3.1312 (round-8): the owner's painted slot-silhouette set replaces
   the mixed bag of borrowed item art + inline SVG line drawings — all
   six slots share one optical scale now, and the cape/amulet ghosts
   finally have real contrast. */
export const GHOST_SRC = {
  weapon: '/icons/bag/slot-weapon.webp?v=2.3.1312',
  shield: '/icons/bag/slot-shield.webp?v=2.3.1312',
  chest:  '/icons/bag/slot-chest.webp?v=2.3.1312',
  legs:   '/icons/bag/slot-legs.webp?v=2.3.1312',
  cape:   '/icons/bag/slot-cape.webp?v=2.3.1312',
  amulet: '/icons/bag/slot-amulet.webp?v=2.3.1312',
};

const wpnIconSrc = (R, wpn) => {
  if (!wpn) return null;
  const slot = R.activeSlot || 'melee';
  const isWoodSword = slot === 'melee' && wpn.gearBase === 'wood';
  return slot === 'ranged' ? '/sprites/weapons/bows/Bow2.webp?v=2.3.173'
    : slot === 'staff' ? '/sprites/weapons/staffs/Wizard%20Staff2.webp?v=2.3.173'
    : isWoodSword ? '/sprites/weapons/swords/steel-sword-east.webp?v=2.3.1070'
    : '/sprites/weapons/swords/Sword1.webp?v=2.3.173';
};

const gearIconSrc = (id) =>
  (id === 'steelplate' || id === 'steelgreaves')
    ? `/sprites/gear/icons/${id}.webp?v=2.3.685`
    : id === 'tshirt' ? '/sprites/gear/icons/tshirt.webp?v=2.3.756' : null;

export function getEquippedSlots(R) {
  const wpn = R ? getActiveWeapon(R) : null;
  const gearChestId = getEquip('chest');
  const gearShirtId = getEquip('shirt');
  const gearLegsId = getEquip('legs');
  const chestEquipped = gearChestId !== 'none' || gearShirtId !== 'none' || !!R.armor;
  const chestIcon = gearChestId !== 'none' ? gearIconSrc(gearChestId)
    : gearShirtId !== 'none' ? gearIconSrc(gearShirtId) : null;
  return [
    { slot: 'weapon', label: 'Weapon', item: wpn, iconSrc: wpnIconSrc(R, wpn),
      ghost: !wpn, quality: wpn && wpn.quality, pickerSlot: 'weapon' },
    { slot: 'shield', label: 'Shield', item: R.shield,
      iconSrc: R.shield ? '/sprites/shields/wood-shield-front.webp?v=2.3.198' : null,
      ghost: !R.shield, pickerSlot: 'shield' },
    { slot: 'chest', label: 'Chest', item: chestEquipped ? { gearChestId, gearShirtId } : null,
      iconSrc: chestIcon, ghost: !chestEquipped, pickerSlot: 'chest' },
    { slot: 'legs', label: 'Legs', item: gearLegsId !== 'none' ? { gearLegsId } : null,
      iconSrc: gearLegsId !== 'none' ? gearIconSrc(gearLegsId) : null,
      ghost: gearLegsId === 'none', pickerSlot: 'legs' },
    /* Cape: Phase-2 — no data field yet; permanently ghosted, no picker. */
    { slot: 'cape', label: 'Cape', item: null, iconSrc: null, ghost: true, pickerSlot: null },
    { slot: 'amulet', label: 'Amulet', item: R.amulet || null, iconSrc: null,
      ghost: !R.amulet, pickerSlot: null },
  ];
}
