import { getActiveWeapon, calcDisplayDmgRange, calcDisplayDps, getArmorPieceDr, getArmorDrPct } from '../../../data/gameSystems.js';
import { gearIdIcon, armorIconFor } from '@/rendering/gearVariants.js'; /* v2.3.1758: one armour art table */
import { weaponMaterial, metalIconPath } from '@/rendering/traits/materialTints.js'; /* v2.3.1760 */
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

/* v2.3.1325 (owner icon sheets): equipped slots use the painted item
   set — one consistent style with the stash and inventory tiles.
   Weapon art keys off wpn.type (greatsword vs sword are distinct drop
   types that shared one icon since v2.3.173). */
/* v2.3.1710: bumped so a browser holding the cached bag drops the emoji-vest
   render and fetches the real chest-plate torso art (owner: "it's an emoji
   vest").  Lives in THREE files — keep them in lockstep or one surface serves
   stale thumbnails while its neighbour serves fresh ones. */
const ITEMS_V = '?v=2.3.1710';
const wpnIconSrc = (R, wpn) => {
  if (!wpn) return null;
  const slot = R.activeSlot || 'melee';
  /* v2.3.1760: a melee weapon's icon takes its METAL (metalIconPath); a bow or
     a staff never does — owner: "only for metals though not staff or bow". */
  const metal = weaponMaterial(wpn.type, wpn.gearBase);
  return wpn.type === 'bow' || slot === 'ranged' ? `/icons/items/bow.webp${ITEMS_V}`
    : wpn.type === 'staff' || slot === 'staff' ? `/icons/items/staff.webp${ITEMS_V}`
    : wpn.type === 'greatsword' ? `${metalIconPath('/icons/items/great-sword.webp', metal)}${ITEMS_V}`
      : `${metalIconPath('/icons/items/sword.webp', metal)}${ITEMS_V}`;
};

/* v2.3.1758: armour art comes from ONE table (gearVariants) so a tier's icon
   cannot drift from the metal it renders in.  The shirt keeps its own line —
   it is not a metal and has no material variants. */
const gearIconSrc = (id) =>
  id === 'tshirt' ? `/icons/items/cloth-shirt.webp${ITEMS_V}`
    : gearIdIcon(id) ? `${gearIdIcon(id)}${ITEMS_V}` : null;

export function getEquippedSlots(R) {
  const wpn = R ? getActiveWeapon(R) : null;
  const gearChestId = getEquip('chest');
  const gearShirtId = getEquip('shirt');
  const gearLegsId = getEquip('legs');
  const chestEquipped = gearChestId !== 'none' || gearShirtId !== 'none' || !!R.armor;
  /* v2.3.1710: ...and if NEITHER cosmetic layer is on, fall back to the
     STAT-BEARING piece's art (R.armor — the Iron Torso the life_2 quest pays
     out).  Found while fixing the owner's "iron torso icon is an emoji vest"
     report: chestEquipped has always counted R.armor, so a player wearing
     only the quest torso got a NON-ghosted cell with iconSrc null — an
     empty box, neither art nor silhouette.  Exactly the hole v2.3.1701
     closed one entry down for legs; the chest half was missed then.
     Ordering is deliberately unchanged — the two cosmetic layers still win,
     because this cell shows what you are WEARING and v2.3.1703 already
     derives the steelplate render layer from a worn torso, so the normal
     equip path resolves to chest-plate.webp through gearIconSrc above.
     This branch is the bare-cosmetics case that path does not cover. */
  const chestIcon = gearChestId !== 'none' ? gearIconSrc(gearChestId)
    : gearShirtId !== 'none' ? gearIconSrc(gearShirtId)
    : R && R.armor ? `${armorIconFor('chest', R.armor.mat)}${ITEMS_V}` : null; /* v2.3.1758 */
  return [
    { slot: 'weapon', label: 'Weapon', item: wpn, iconSrc: wpnIconSrc(R, wpn),
      ghost: !wpn, quality: wpn && wpn.quality, pickerSlot: 'weapon' },
    { slot: 'shield', label: 'Shield', item: R.shield,
      iconSrc: R.shield ? `/icons/items/shield.webp${ITEMS_V}` : null,
      ghost: !R.shield, pickerSlot: 'shield' },
    { slot: 'chest', label: 'Chest', item: chestEquipped ? { gearChestId, gearShirtId } : null,
      iconSrc: chestIcon, ghost: !chestEquipped, pickerSlot: 'chest' },
    /* v2.3.1701: the LEGS cell counts the stat-bearing piece too, exactly as
       the chest cell counts R.armor above.  R.legsArmor is what the server's
       damage reduction reads, so a worn greave that leaves this cell empty
       is the UI disagreeing with the fight. */
    { slot: 'legs', label: 'Legs',
      item: (gearLegsId !== 'none' || R.legsArmor) ? { gearLegsId, legsArmor: R.legsArmor } : null,
      iconSrc: gearLegsId !== 'none' ? gearIconSrc(gearLegsId)
        : R.legsArmor ? `${armorIconFor('legs', R.legsArmor.mat)}${ITEMS_V}` : null, /* v2.3.1758 */
      ghost: gearLegsId === 'none' && !R.legsArmor, pickerSlot: 'legs' },
    /* Cape: Phase-2 — no data field yet; permanently ghosted, no picker. */
    { slot: 'cape', label: 'Cape', item: null, iconSrc: null, ghost: true, pickerSlot: null },
    /* v2.3.1325: an equipped amulet finally shows real art instead of
       staying on the ghost pictogram. */
    { slot: 'amulet', label: 'Amulet', item: R.amulet || null,
      iconSrc: R.amulet ? `/icons/items/amulet.webp${ITEMS_V}` : null,
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

   v2.3.1697: the mockup's DEF number is no longer illustrative — armor
   reduces damage for real (server `_armorDrMult`, v2.3.1679) — and the
   HP it used to buy is GONE (owner directive; the maxHp fold left both
   sides this version).  So the chest/legs cards and the sixth total show
   DAMAGE REDUCTION, and continuing to print "+40 HP" would have been the
   only genuinely false number on this screen.

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
  /* v2.3.1697: each worn piece's OWN reduction for its card, and the
     multiplicatively-stacked total for the totals grid — the same split
     the server makes inside _armorDrMult. */
  const chestDr = R ? getArmorPieceDr(R.armor, 'chest') : 0;
  const legsDr = R ? getArmorPieceDr(R.legsArmor, 'legs') : 0;
  const armorDr = getArmorDrPct(R);
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
    chest: chestDr ? { title: 'CHEST', primary: { k: 'DMG RED', v: fmt1(chestDr * 100) + '%' }, secondary: null } : null,
    /* v2.3.1697: legs are no longer stat-less.  The old note ("steel
       greaves are cosmetic") described the gearCatalog cosmetic, but
       R.legsArmor is a real worn piece cutting 20%+ of every hit since
       v2.3.1679 — cosmetic greaves with no armour piece still show
       nothing, which is the honest reading. */
    legs: legsDr ? { title: 'LEGS', primary: { k: 'DMG RED', v: fmt1(legsDr * 100) + '%' }, secondary: null } : null,
    cape: null,   /* Phase-2: no data field */
    amulet: am ? { title: 'AMULET', primary: gemOf(am), secondary: null } : null,
  };

  /* Fixed order + fixed labels; '—' for absent (brief: cells never
     move).  v2.3.1329 (widget grid, 2-col x 3-row): pairs DMG|DPS,
     BLOCK|HP, GEM|STAM.  The feedback's SPD cell has no equipment
     source in this game's data — STAM (the shield's real stamina
     bonus) takes the sixth cell instead.
     v2.3.1697: the HP cell became ARMOUR — same position, same worn
     pieces feeding it, but the number armour actually pays out now. */
  const D = '—';
  const totals = [
    { k: 'DMG',   v: dmgText || D },
    { k: 'DPS',   v: range ? fmt1(dps) : D },
    { k: 'BLOCK', v: ss ? '+' + fmt1(ss.blockBonus) + '%' : D },
    { k: 'ARMOUR', v: armorDr ? fmt1(armorDr * 100) + '%' : D },
    { k: 'GEM',   v: am ? '+' + fmt1(am.value) + (am.unit || '') : D },
    { k: 'STAM',  v: ss ? '+' + ss.staminaBonus : D },
  ];
  return { cards, totals };
}
