import { getActiveWeapon, calcDisplayDmgRange, calcDisplayDps, calcDisplayArmorHp } from '../../../data/gameSystems.js';
import { getShieldStats, getAmuletBonus } from '../../../data/items.js';
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

/* v2.3.1328 (owner mockup: Equipped redesign): per-item stat
   CONTRIBUTIONS + loadout totals for the Equipped tab's cards and the
   EQUIPPED TOTAL panel.  Every value is real item data — the mockup's
   DEF numbers were illustrative; damage-reduction DEF retired in
   v2.3.1153-era balance (armor buys HP, shields buy Block%), so the
   honest core rows are DMG / DPS / BLOCK / HP / GEM.  Display mirrors
   only — the server-echoed player_state is the truth (CLAUDE.md).

   Cards carry at most primary + secondary (brief: two stats max; the
   item modal keeps full details).  Cosmetic-only pieces (steel legs,
   shirt-only chest) contribute nothing and honestly show NO stat
   lines — never zero-value filler. */

const GEM_SHORT = {
  /* amulet gems */
  elemDmg: 'ELEM', maxMana: 'MANA', hpRegen: 'REGEN', maxHp: 'HP',
  atkSpd: 'ATK', elemResist: 'RESIST', moveSpd: 'SPD', critDmg: 'CRIT',
  staminaRegen: 'STAM',
  /* shield gems */
  blockReduc: 'BLOCK', thornsDmg: 'THORNS', hpOnBlock: 'HP/BLK',
  poisonResist: 'RESIST', counterDmg: 'CNTR', flatDmgReduc: 'REDUC',
  dodgeDist: 'DODGE',
};

const fmt1 = (n) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export function getEquipContribs(R) {
  const wpn = R ? getActiveWeapon(R) : null;
  const range = wpn ? calcDisplayDmgRange(R, wpn) : null;
  const dps = range ? calcDisplayDps(R, wpn) : 0;
  const ss = R && R.shield ? getShieldStats(R.shield) : null;
  const armorHp = R && R.armor ? calcDisplayArmorHp(R, R.armor) : 0;
  const am = R && R.amulet ? getAmuletBonus(R.amulet) : null;

  const dmgText = range ? range.text.replace('-', '–') : null;
  const gemOf = (b) => ({ k: GEM_SHORT[b.stat] || 'GEM', v: '+' + fmt1(b.value) + (b.unit || '') });

  const cards = {
    weapon: range ? {
      title: (wpn.type || 'weapon').toUpperCase(),
      primary: { k: 'DMG', v: dmgText },
      secondary: { k: 'DPS', v: fmt1(dps) },
    } : null,
    shield: ss ? {
      title: 'SHIELD',
      primary: { k: 'BLOCK', v: '+' + fmt1(ss.blockBonus) + '%' },
      secondary: ss.gemBonus ? gemOf(ss.gemBonus) : { k: 'STAM', v: '+' + ss.staminaBonus },
    } : null,
    chest: armorHp ? { title: 'CHEST', primary: { k: 'HP', v: '+' + armorHp }, secondary: null } : null,
    legs: null,   /* steel greaves are cosmetic — no stat data */
    cape: null,   /* Phase-2: no data field */
    amulet: am ? { title: 'AMULET', primary: gemOf(am), secondary: null } : null,
  };

  /* Fixed order + fixed labels; '—' for absent (brief: rows never move). */
  const D = '—';
  const totals = [
    { k: 'DMG',   v: dmgText || D },
    { k: 'DPS',   v: range ? fmt1(dps) : D },
    { k: 'BLOCK', v: ss ? '+' + fmt1(ss.blockBonus) + '%' : D },
    { k: 'HP',    v: armorHp ? '+' + armorHp : D },
    { k: 'GEM',   v: am ? '+' + fmt1(am.value) + (am.unit || '') : D },
  ];
  return { cards, totals };
}
