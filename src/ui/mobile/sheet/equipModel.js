import { calcDisplayDmgRange, calcDisplayDps, getArmorPieceDr, getArmorDrPct } from '../../../data/gameSystems.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS, WEAPON_TYPES, SWING_RANGE, bowRangeMult } from '../../../data/gameSystems.js'; /* v2.3.1845: item naming; v2.3.1846: the stat rows */
import { TILE } from '../../../data/constants.js'; /* v2.3.1846: range, in tiles */
import { displayWeapon } from './statPreview.js'; /* v2.3.1766: one weapon-for-display rule */
import { gearIdIcon, armorIconFor } from '@/rendering/gearVariants.js'; /* v2.3.1758: one armour art table */
import { weaponMaterial, metalIconPath } from '@/rendering/traits/materialTints.js'; /* v2.3.1760 */
import { getShieldStats, getAmuletBonus } from '../../../data/items.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { getCape, CAPE_CATALOG } from '@/rendering/traits/capeCatalog.js'; /* v2.3.2105 */

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
const ITEMS_V = '?v=2.3.1774'; /* v2.3.1774: pine shield icon */
/* v2.3.1845: THE ICON IS THE WEAPON'S, NOT THE SLOT'S.
   Owner: "when you only have sword (no bow or staff) it still shows bow icon
   when you double tap to switch weapons on the character's weapon slot."

   This used to read `slot === 'ranged'` as a second way to reach the bow art,
   and that is a different question from "what is in your hand".  activeSlot
   can be 'ranged' with an EMPTY ranged slot — the weapon cycle would rotate
   into it whether or not you owned a bow (fixed the same version in
   BroTown's _desktopCycleWeapon) and the server persists the slot across
   sessions.  displayWeapon then falls back to the sword you do own, so the
   cell drew a bow over a sword's stats: art and numbers describing different
   weapons.

   The weapon's own `type` is the whole answer, and it is always set — every
   mint path writes it (server quests.js `_grantQuestItem`, the forge, drops).
   No fallback is needed, and one that guesses from the slot is exactly the
   bug. */
const wpnIconSrc = (R, wpn) => {
  if (!wpn) return null;
  /* v2.3.1760: a melee weapon's icon takes its METAL (metalIconPath); a bow or
     a staff never does — owner: "only for metals though not staff or bow". */
  const metal = weaponMaterial(wpn.type, wpn.gearBase);
  return wpn.type === 'bow' ? `/icons/items/bow.webp${ITEMS_V}`
    : wpn.type === 'staff' ? `/icons/items/staff.webp${ITEMS_V}`
    : wpn.type === 'greatsword' ? `${metalIconPath('/icons/items/great-sword.webp', metal)}${ITEMS_V}`
      : `${metalIconPath('/icons/items/sword.webp', metal)}${ITEMS_V}`;
};

/* ═══ v2.3.1845: ONE NAME FOR A WEAPON ═══
 * Owner: "refer to it as copper greatsword, pine bow, and pine staff in the
 * character equip menu.  Right now it's not that way."
 *
 * It was not, because the card title was `wpn.type.toUpperCase()` — the
 * TYPE, which knows nothing about what the thing is made of.  So the starter
 * kit read GREATSWORD / BOW / STAFF and the copper and the pine, which are
 * the parts that change as you play, were nowhere on the screen.
 *
 * Composed from the tier and the type rather than taken from `wpn.name`,
 * for two reasons.  The stored name is what the SERVER minted ("Copper Great
 * Sword") and is not what the owner asked to read; and it is a free-text
 * label that a forge or a future rename can put anything into, while
 * gearBase is the field the stats already come from — so a composed name
 * cannot drift from the item's real tier.  `wpn.name` is still the fallback
 * when the tier is unknown, because a name we cannot verify beats no name.
 *
 * NOT used for shields.  The starter shield is `gearBase:'wood'` and named
 * "Pine Shield" on purpose (server data.js: the wood tier is what carries its
 * stats, so renaming the base would blank them).  Composing there would print
 * WOOD SHIELD over an item the rest of the game calls a Pine Shield — so the
 * shield card uses its own `name`, which is right for the same reason
 * composing is right for weapons: use the field that is true. */
const TYPE_WORD = {
  /* One word, per the owner's own spelling — WEAPON_TYPES.greatsword.label is
     'Great Sword' and stays that way for the surfaces that already use it. */
  greatsword: 'Greatsword', sword: 'Sword', bow: 'Bow', staff: 'Staff',
};

export function weaponTierLabel(w) {
  if (!w || !w.gearBase) return '';
  const base = String(w.gearBase);
  /* Woodworking gearBases carry a 'ww_' prefix that the tier table's own keys
     do not — the same strip `gemExtractCost` does.  Without it a Pine Bow
     resolves to no tier at all and falls through to printing the raw
     'ww_pine' at the player, which is what the old tierLabel in
     ItemDetailPopup did. */
  const ww = base.indexOf('ww_') === 0 ? base.slice(3) : null;
  const tier = ww ? WOODWORKING_TIERS[ww]
    : (BLACKSMITH_TIERS[base] || WOODWORKING_TIERS[base]);
  return tier && tier.label ? tier.label : '';
}

export function weaponDisplayName(w) {
  if (!w) return '';
  const word = TYPE_WORD[w.type]
    || (WEAPON_TYPES[w.type] && WEAPON_TYPES[w.type].label)
    || w.type || 'Weapon';
  const tier = weaponTierLabel(w);
  return tier ? `${tier} ${word}` : (w.name || word);
}

/* v2.3.1758: armour art comes from ONE table (gearVariants) so a tier's icon
   cannot drift from the metal it renders in.  The shirt keeps its own line —
   it is not a metal and has no material variants. */
const gearIconSrc = (id) =>
  id === 'tshirt' ? `/icons/items/cloth-shirt.webp${ITEMS_V}`
    : gearIdIcon(id) ? `${gearIdIcon(id)}${ITEMS_V}` : null;

export function getEquippedSlots(R) {
  /* v2.3.1766: displayWeapon here too, so the weapon CELL and the DPS cell
     agree.  Using the active-slot weapon for the icon and a fallback weapon
     for the number would put a DPS figure next to an empty weapon slot, which
     is a worse answer than either one alone. */
  const wpn = R ? displayWeapon(R) : null;
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
    /* ═══ v2.3.2105: THE CAPE SHOWS IN THE CAPE SLOT ═══
       Owner: "make the cape go into the cape slot after being equipped on
       character menu too."

       The slot has existed since the sheet was built and was hardcoded
       `item: null, ghost: true` -- "Phase-2, no data field yet". There IS a
       data field now: the worker echoes `player_state.cape` from the contest
       LEDGER and wsClient feeds it to capeCatalog (v2.3.2023), so a winner has
       been wearing their prize in the world while their character sheet showed
       an empty hanger. That is the whole gap.

       READ FROM capeCatalog, not from R. The cape is deliberately NOT on the
       rpg blob: ownership is a server fact about the persistent `bp_`
       identity, and capeCatalog's own header is emphatic that this module must
       not become a picker -- "a picker is how a contest prize ends up on
       everybody". Reading the active id here displays what the server granted
       and offers no way to choose it, which keeps that property.

       v2.3.2106: the owner's own cape art ("Use this for the inventory art for
       cape"), imported by tools/import_item_icon.py. The first cut borrowed
       the renderer's south-facing WORLD frame -- correct, and wrong for a
       slot: that sprite is drawn to hang off a 200px character at world
       scale, so in a 44px tile it is a small red smudge. An inventory icon is
       its own drawing of the garment, which is what arrived. */
    (function () {
      const capeId = getCape();
      const worn = capeId && capeId !== 'none';
      const entry = worn ? CAPE_CATALOG.find((c) => c.id === capeId) : null;
      return {
        slot: 'cape',
        label: 'Cape',
        item: worn ? { capeId, name: (entry && entry.name) || 'Cape' } : null,
        iconSrc: worn ? `/icons/items/cape-${capeId}.webp${ITEMS_V}` : null,
        ghost: !worn,
        pickerSlot: null,
      };
    }()),
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
  /* v2.3.1766 (owner: "if there's an overall DPS when nothing is active
     (tapped) on the character equip menu it should show DPS — they'll have a
     primary active weapon equipped if nothing else").
     getActiveWeapon returns null when the ACTIVE SLOT is empty, which is the
     right answer for combat and the wrong one for a readout: a player holding
     a bow with an empty melee slot saw the DMG and DPS cells fall back to
     their '—' placeholder, which reads as "you have no damage".  displayWeapon
     keeps the active slot's weapon when there is one and otherwise speaks for
     whatever IS worn.  The fallback lives in the display layer on purpose —
     getActiveWeapon also drives swing sfx and combat, and widening it there
     would change what the game DOES, not just what it says. */
  const wpn = R ? displayWeapon(R) : null;
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

  /* ═══ v2.3.1846: THE ROWS ON AN ITEM CARD ═══
   * Owner mockup: name and CHANGE on the frame, the rarity under the name,
   * the item's picture beside a LABEL/VALUE list, and the item's bonuses on
   * a strip along the bottom.  ("You can ignore the irrelevant test data" —
   * so this fills the shape with the stats this game actually has, rather
   * than reproducing the mockup's placeholder numbers.)
   *
   * WHAT IS REAL, and what was left out.  Every row here is a number the
   * fight uses:
   *   DAMAGE / DPS  — calcDisplayDmgRange + calcDisplayDps, the same pair
   *                   the totals grid shows.
   *   SPEED         — swings per second, from that range's own `cdMs`
   *                   (600ms × the attack-speed allocation).  NOT
   *                   WEAPON_TYPES.speed: that field reads like the answer
   *                   (0.7 for a greatsword, 1.4 for a sword) and is DEAD —
   *                   nothing in combat or in the damage math consumes it,
   *                   so printing it would put a number on the card that
   *                   describes nothing that happens.
   *   RANGE         — WEAPON_TYPES.range, which combat DOES use
   *                   (monsterCombat's swing envelope), through the same
   *                   bow multiplier and 250px clamp the attack applies, and
   *                   divided into TILEs because "50" means nothing to a
   *                   player standing on a 32px grid.
   * A weapon's `speed` word from the mockup is therefore absent by choice,
   * not by omission. */
  const cdMs = range && range.cdMs ? range.cdMs : 0;
  const rangePx = wpn && WEAPON_TYPES[wpn.type]
    ? Math.min(250, Math.round((WEAPON_TYPES[wpn.type].range || SWING_RANGE)
      * (WEAPON_TYPES[wpn.type].type === 'ranged' ? bowRangeMult(R) : 1)))
    : 0;

  /* The bottom strip: what this ONE item adds beyond its base numbers.
     Empty for every starter item, and the card drops the strip entirely
     rather than drawing an empty band — a row of nothing reads as a stat
     with no value rather than as an item with no affixes. */
  const wpnBonuses = [];
  if (wpn) {
    if (wpn.reforgeBonus && wpn.reforgeBonus.label) {
      wpnBonuses.push(`+${fmt1(wpn.reforgeBonus.value)}${wpn.reforgeBonus.unit || ''} ${wpn.reforgeBonus.label}`);
    }
    if (wpn.hardenBonus && wpn.hardenBonus.label) {
      wpnBonuses.push(`+${fmt1(wpn.hardenBonus.value)}${wpn.hardenBonus.unit || ''} ${wpn.hardenBonus.label}`);
    }
    /* Elements are the weapon's identity, not a stat line — one word each. */
    for (const el of [wpn.element1, wpn.element2]) {
      if (el) wpnBonuses.push(String(el).charAt(0).toUpperCase() + String(el).slice(1));
    }
  }

  const cards = {
    weapon: range ? {
      /* v2.3.1845: COPPER GREATSWORD, not GREATSWORD — see weaponDisplayName. */
      title: weaponDisplayName(wpn).toUpperCase(),
      primary: { k: 'DMG', v: dmgText },
      secondary: { k: 'DPS', v: fmt1(dps) },
      rows: [
        { k: 'DAMAGE', v: dmgText },
        { k: 'DPS', v: fmt1(dps) },
        cdMs ? { k: 'SPEED', v: fmt1(1000 / cdMs) + '/s' } : null,
        rangePx ? { k: 'RANGE', v: fmt1(rangePx / TILE) } : null,
      ].filter(Boolean),
      bonuses: wpnBonuses,
    } : null,
    shield: ss ? {
      /* v2.3.1845: the shield's own name (PINE SHIELD), not the bare slot
         word.  Its `gearBase` is 'wood' by design, so composing from the tier
         the way weapons do would print WOOD SHIELD — see weaponDisplayName. */
      title: String((R.shield && R.shield.name) || 'Shield').toUpperCase(),
      primary: { k: 'BLOCK', v: '+' + fmt1(ss.blockBonus) + '%' },
      secondary: ss.gemBonus ? gemOf(ss.gemBonus) : { k: 'STAM', v: '+' + ss.staminaBonus },
      rows: [
        { k: 'BLOCK', v: '+' + fmt1(ss.blockBonus) + '%' },
        { k: 'STAMINA', v: '+' + ss.staminaBonus },
        ss.flatDef ? { k: 'DEFENCE', v: '+' + fmt1(ss.flatDef) } : null,
      ].filter(Boolean),
      bonuses: ss.gemBonus ? [`+${fmt1(ss.gemBonus.value)}${ss.gemBonus.unit || ''} ${GEM_SHORT[ss.gemBonus.stat] || 'GEM'}`] : [],
    } : null,
    chest: chestDr ? { title: 'CHEST', primary: { k: 'DMG RED', v: fmt1(chestDr * 100) + '%' }, secondary: null,
      rows: [{ k: 'DMG RED', v: fmt1(chestDr * 100) + '%' }], bonuses: [] } : null,
    /* v2.3.1697: legs are no longer stat-less.  The old note ("steel
       greaves are cosmetic") described the gearCatalog cosmetic, but
       R.legsArmor is a real worn piece cutting 20%+ of every hit since
       v2.3.1679 — cosmetic greaves with no armour piece still show
       nothing, which is the honest reading. */
    legs: legsDr ? { title: 'LEGS', primary: { k: 'DMG RED', v: fmt1(legsDr * 100) + '%' }, secondary: null,
      rows: [{ k: 'DMG RED', v: fmt1(legsDr * 100) + '%' }], bonuses: [] } : null,
    cape: null,   /* Phase-2: no data field */
    amulet: am ? { title: 'AMULET', primary: gemOf(am), secondary: null,
      rows: [gemOf(am)], bonuses: [] } : null,
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
