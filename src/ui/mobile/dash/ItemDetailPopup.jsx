import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gearIdIcon, armorIconFor } from '@/rendering/gearVariants.js'; /* v2.3.1758: one armour art table */
import { weaponMaterial, metalIconPath } from '@/rendering/traits/materialTints.js'; /* v2.3.1760 */
import { COL, getState } from './common.js';
import { itemDetailBus } from './itemDetailBus.js';
import {
  lock as lockItem,
  unlock as unlockItem,
  isLocked as itemIsLocked,
  subscribe as subscribeLocks,
} from './inventoryLocks.js';
import { thumbFor, iconFor, classify } from './InventoryPanel.jsx';
import { firemakingBus } from '../firemakingBus.js';
import { eatBus } from '../eatBus.js';
import { GEAR_CATALOG, getEquip, setEquip, syncArmorLayers } from '../../../rendering/gearCatalog.js';
import { unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect, syncArmorChange, equipArmorFromStash, equipLegsFromStash } from './equipActions.js'; /* v2.3.1330: shared unequip cores; v2.3.1703 adds the legs twin */
import { setShirt } from '../../../rendering/traits/shirtCatalog.js';
import { playVw } from '../playViewport.js';
import {
  WEAPON_TYPES,
  calcDisplayDmgRange,
  calcDisplayDps,
  calcDisplayHeal,
  getArmorPieceDr, /* v2.3.1697: replaced calcDisplayArmorHp — armor buys mitigation, not HP */
  calcBlockReduction,
  BLACKSMITH_TIERS,
  WOODWORKING_TIERS,
  recalcDerived,
} from '../../../data/gameSystems.js';

/* v2.3.1313 (ChatGPT round-8 §8): comparison line for stash cards —
   the delta vs the currently equipped counterpart ("+2.4 DPS vs
   equipped"), so upgrade decisions don't require memorizing numbers
   and flipping between two cards.  Positive = green, negative = red;
   no counterpart equipped = no line (the base stat line already says
   everything).  Uses the SAME display formulas as the stat line, so
   the two can never disagree. */
function statDelta(d, unit, decimals) {
  if (!isFinite(d)) return null;
  const rounded = decimals ? Number(d.toFixed(decimals)) : Math.round(d);
  const sep = unit.startsWith('%') ? '' : ' '; /* "+5% Block", "+2.4 DPS" */
  if (rounded === 0) return { text: 'Same ' + unit.replace(/^% /, '').trim() + ' as equipped', tone: 0 };
  const mag = decimals ? Math.abs(rounded).toFixed(decimals) : Math.abs(rounded);
  return {
    text: (rounded > 0 ? '+' : '−') + mag + sep + unit + ' vs equipped',
    tone: rounded > 0 ? 1 : -1,
  };
}

/* Damage range + DPS for a weapon.
   v2.3.1206: was a "stat-free" local copy (wType.base × tierMult only) —
   it read NO allocations, so spending crit/damage-channel points moved
   the dashboard readout but not this popup (the reported bug), and it
   also ignored quality/hardness.  Now delegates to the shared
   calcDisplayDmgRange/calcDisplayDps (gameSystems.js), the dashboard's
   exact math, with the caller's live S.rpg threaded in.  A null rpg
   degrades gracefully (stat 0, channels 0, crit fold 1×). */
function weaponDmgRange(rpg, wpn) {
  const range = calcDisplayDmgRange(rpg, wpn);
  if (!range) return null;
  return { dmgText: range.text, dps: calcDisplayDps(rpg, wpn).toFixed(1) };
}

function tierLabel(wpn) {
  if (!wpn || !wpn.gearBase) return '';
  const tbl = (wpn.gearBase || '').startsWith && wpn.type === 'bow'
    ? WOODWORKING_TIERS
    : BLACKSMITH_TIERS;
  const tier = tbl[wpn.gearBase] || WOODWORKING_TIERS[wpn.gearBase];
  return tier ? tier.label : wpn.gearBase;
}

/* Pick a thumb URL for a weapon based on type.
   v2.3.1325 (owner icon sheets): painted item set — greatsword and
   sword split after sharing one icon since v2.3.210. */
/* v2.3.1710: bumped so a browser holding the cached bag drops the emoji-vest
   render and fetches the real chest-plate torso art (owner: "it's an emoji
   vest").  Lives in THREE files — keep them in lockstep or one surface serves
   stale thumbnails while its neighbour serves fresh ones. */
const ITEMS_V = '?v=2.3.1774'; /* v2.3.1774: pine shield icon */
function weaponThumb(wpn) {
  if (!wpn || !wpn.type) return null;
  if (wpn.type === 'bow')        return `/icons/items/bow.png${ITEMS_V}`;
  if (wpn.type === 'staff')      return `/icons/items/staff.png${ITEMS_V}`;
  const metal = weaponMaterial(wpn.type, wpn.gearBase); /* v2.3.1760 */
  if (wpn.type === 'greatsword') return `${metalIconPath('/icons/items/great-sword.webp', metal)}${ITEMS_V}`;
  return `${metalIconPath('/icons/items/sword.webp', metal)}${ITEMS_V}`;
}

function shieldThumb(shield) {
  /* v2.3.1325: every shield tier shows the painted shield (was
     wood-only + glyph fallback). */
  return shield ? `/icons/items/shield.png${ITEMS_V}` : null;
}

/* Which weapon slot does a `type` belong in. */
function slotFor(type) {
  if (type === 'bow')   return 'rangedWeapon';
  if (type === 'staff') return 'staffWeapon';
  return 'weapon'; /* sword, greatsword */
}

function resolveTarget(target) {
  if (!target) return null;
  if (target.kind === 'inventory') {
    const key = target.key;
    const count = target.count || 0;
    const cat = classify(key);
    const isRawFish = /^fish_/.test(key);
    const isCookedFish = /^cooked_fish_/.test(key);
    const isBurnt = /^burnt_/.test(key);
    const isLog = /^wood_/.test(key);
    let info = null;
    /* v2.3.1207: calcDisplayHeal (getFishHealAmount × HP-grid Recovery,
       ceil'd) — the server's _handleEatRequest math, so the promised
       number matches the heal the player_state echo delivers. */
    const SR = getState();
    if (isCookedFish) info = '+' + calcDisplayHeal(SR && SR.rpg, key) + ' HP when eaten';
    else if (isRawFish) info = 'Cook over a campfire';
    else if (isBurnt) info = 'Inedible';
    else if (isLog) info = 'Light a campfire to cook at';
    else if (count > 0) info = 'Quantity: ' + count;
    return {
      lockKey: key,
      thumb: thumbFor(key),
      glyph: iconFor(key),
      name: prettyName(key),
      info,
      desc: cat.charAt(0).toUpperCase() + cat.slice(1),
      actions: { light: isLog && count > 0, eat: isCookedFish && count > 0 },
    };
  }
  if (target.kind === 'weapon') {
    const wpn = target.wpn;
    if (!wpn) return null;
    /* v2.3.1206: live S.rpg (same source the armor branch reads) so the
       range reflects the player's stats + channel allocations. */
    const SW = getState();
    const range = weaponDmgRange(SW && SW.rpg, wpn);
    const lockKey = target.slot === 'ranged' ? 'rangedWeapon'
                  : target.slot === 'staff'  ? 'staffWeapon'
                  : 'weapon';
    return {
      lockKey,
      thumb: weaponThumb(wpn),
      glyph: null,
      name: wpn.name || 'Weapon',
      info: range ? ('Damage ' + range.dmgText + ' · DPS ' + range.dps) : null,
      desc: tierLabel(wpn) + ' · ' + (wpn.type || '').charAt(0).toUpperCase() + (wpn.type || '').slice(1),
      actions: { unequip: true },
    };
  }
  if (target.kind === 'shield') {
    const sh = target.shield;
    if (!sh) return null;
    return {
      lockKey: 'shield',
      thumb: shieldThumb(sh),
      glyph: '\u{1F6E1}',
      name: sh.name || 'Shield',
      info: 'Hold to block',
      desc: (sh.gearBase === 'wood' ? 'Wooden' : tierLabel(sh)) + ' · Shield',
      actions: { unequip: true },
    };
  }
  if (target.kind === 'stashWeapon') {
    const wpn = target.wpn;
    if (!wpn) return null;
    /* v2.3.1206: live S.rpg — stash previews price the STASHED weapon's
       own category channels (a stash bow reads AGI + bow channels even
       while a sword is equipped), so compares are apples-to-apples. */
    const SW = getState();
    const range = weaponDmgRange(SW && SW.rpg, wpn);
    /* v2.3.1313: DPS delta vs the weapon equipped in this stash
       weapon's OWN slot (a stash bow compares to the equipped bow even
       while a sword is active) — same slot the Equip button swaps. */
    const eqWpn = SW && SW.rpg && SW.rpg[slotFor(wpn.type)];
    const delta = eqWpn
      ? statDelta(calcDisplayDps(SW.rpg, wpn) - calcDisplayDps(SW.rpg, eqWpn), 'DPS', 1)
      : null;
    return {
      lockKey: 'stashWeapon_' + (target.index || 0),
      thumb: weaponThumb(wpn),
      glyph: null,
      name: wpn.name || 'Weapon',
      info: range ? ('Damage ' + range.dmgText + ' · DPS ' + range.dps) : null,
      delta,
      desc: tierLabel(wpn) + ' · ' + (wpn.type || '').charAt(0).toUpperCase() + (wpn.type || '').slice(1),
      actions: { equip: true },
    };
  }
  if (target.kind === 'stashShield') {
    const sh = target.shield;
    if (!sh) return null;
    /* v2.3.1313: block-reduction delta in percentage points vs the
       equipped shield (calcBlockReduction ignores its legacy first
       arg; only the shields' blockBonus differs). */
    const SS = getState();
    const eqSh = SS && SS.rpg && SS.rpg.shield;
    const delta = eqSh
      ? statDelta((calcBlockReduction(0, sh) - calcBlockReduction(0, eqSh)) * 100, '% Block', 0)
      : null;
    return {
      lockKey: 'stashShield_' + (target.index || 0),
      thumb: shieldThumb(sh),
      glyph: '\u{1F6E1}',
      name: sh.name || 'Shield',
      info: 'Hold to block',
      delta,
      desc: (sh.gearBase === 'wood' ? 'Wooden' : tierLabel(sh)) + ' · Shield',
      actions: { equip: true },
    };
  }
  if (target.kind === 'armor') {
    const ar = target.armor;
    if (!ar) return null;
    /* v2.3.228: HP contribution at the player's current Vitality.
       v2.3.1207: × HP-grid Vigor (calcDisplayArmorHp).
       v2.3.1697: BOTH retired — armor adds no maxHp on either side now
       (owner directive).  What it does add is per-hit damage reduction
       (server _armorDrMult since v2.3.1679), so that is what the card
       says.  Piece-only, not the stacked total: this popup is about the
       one item you tapped. */
    const dr = getArmorPieceDr(ar, 'chest');
    return {
      lockKey: 'armor',
      /* v2.3.1710: the EQUIPPED half of the owner's "iron torso icon is an
         emoji vest" report — the card you get by tapping the worn piece read
         🦺 while the worn greaves card below it read real painted art.  Same
         chest-plate.webp as the stash card; the glyph stays only as the
         img-fails fallback the popup already renders.
         v2.3.1758: through the material table, so a copper torso's card shows
         the copper torso. */
      thumb: `${armorIconFor('chest', ar && ar.mat)}${ITEMS_V}`,
      glyph: '\u{1F9BA}',
      name: ar.name || 'Armor',
      info: Math.round(dr * 100) + '% damage reduced',
      desc: (ar.gearBase === 'wood' ? 'Leather' : tierLabel(ar)) + ' · Chest',
      actions: { unequip: true },
    };
  }
  if (target.kind === 'stashArmor') {
    const ar = target.armor;
    if (!ar) return null;
    /* v2.3.1697: damage reduction, same as the equipped-armor card above. */
    const S = getState();
    const dr = getArmorPieceDr(ar, 'chest');
    /* v2.3.1313: delta vs the equipped chest armor — mitigation now, not
       Max HP.  One decimal: the tier step is 5 points of a percent, so
       whole numbers would render a real upgrade as "+0%". */
    const eqAr = S && S.rpg && S.rpg.armor;
    const delta = eqAr
      ? statDelta((dr - getArmorPieceDr(eqAr, 'chest')) * 100, '% Damage Reduced', 1)
      : null;
    return {
      lockKey: 'stashArmor_' + (target.index || 0),
      /* v2.3.1710: the item card the owner sees when they tap the Iron Torso
         in the bag.  Matched to the stashLegs card 25 lines down, which has
         carried `thumb: greaves.webp` since v2.3.1701 — the pair are one
         armour set and must read as one.
         v2.3.1758: ...and both read the piece's own metal. */
      thumb: `${armorIconFor('chest', ar && ar.mat)}${ITEMS_V}`,
      glyph: '\u{1F9BA}',
      name: ar.name || 'Armor',
      info: Math.round(dr * 100) + '% damage reduced',
      delta,
      desc: (ar.gearBase === 'wood' ? 'Leather' : tierLabel(ar)) + ' · Chest',
      actions: { equip: true },
    };
  }
  /* v2.3.1701: the LEGS twin of stashArmor.  Same card, but every number is
     read for the legs slot — base 20% instead of the torso's 30% — and the
     Equip action lands in R.legsArmor.  A shared card keyed on target.kind
     was rejected: the two slots have different bases and different worn
     pieces to compare against, and one branchy card is how the piece ended
     up in the wrong slot in the first place. */
  if (target.kind === 'stashLegs') {
    const ar = target.armor;
    if (!ar) return null;
    const S = getState();
    const dr = getArmorPieceDr(ar, 'legs');
    const eqLegs = S && S.rpg && S.rpg.legsArmor;
    const delta = eqLegs
      ? statDelta((dr - getArmorPieceDr(eqLegs, 'legs')) * 100, '% Damage Reduced', 1)
      : null;
    return {
      lockKey: 'stashLegs_' + (target.index || 0),
      thumb: `${armorIconFor('legs', ar && ar.mat)}${ITEMS_V}`, /* v2.3.1758 */
      glyph: '\u{1F456}',
      name: ar.name || 'Greaves',
      info: Math.round(dr * 100) + '% damage reduced',
      delta,
      /* Quest armour carries no gearBase, so tierLabel is empty for it —
         don't render a leading separator for a tier it does not have. */
      desc: (tierLabel(ar) ? tierLabel(ar) + ' · ' : '') + 'Armor · Legs',
      actions: { equip: true },
    };
  }
  /* v2.3.685: worn gear (the rendered steel chest/legs, gearCatalog slots) in
     the Loadout -- unequip drops it into the bag (rpg.gearStash), mirroring
     the weapon/shield flow. */
  if (target.kind === 'gear') {
    return {
      lockKey: 'gear_' + target.slot,
      thumb: gearThumb(target.gearId),
      glyph: target.slot === 'chest' ? '\u{1F9BA}' : '\u{1F456}',
      name: gearName(target.slot, target.gearId),
      info: 'Worn armor',
      desc: 'Steel · ' + (target.slot === 'chest' ? 'Chest' : 'Legs'),
      actions: { unequip: true },
    };
  }
  if (target.kind === 'stashGear') {
    const g = target.gear;
    if (!g) return null;
    return {
      lockKey: 'stashGear_' + (target.index || 0),
      thumb: gearThumb(g.gearId),
      glyph: g.slot === 'chest' ? '\u{1F9BA}' : '\u{1F456}',
      name: g.name || gearName(g.slot, g.gearId),
      info: 'In bag',
      desc: 'Steel · ' + (g.slot === 'chest' ? 'Chest' : 'Legs'),
      actions: { equip: true },
    };
  }
  return null;
}

/* Catalog display name for a gear slot item id. */
function gearName(slot, gearId) {
  const c = (GEAR_CATALOG[slot] || []).find((g) => g.id === gearId);
  return (c && c.name) || 'Armor';
}
/* v2.3.1325: painted item set for the worn-gear pieces. */
function gearThumb(gearId) {
  /* v2.3.1758: armour resolves through the one table; the shirt is not a metal. */
  return gearId === 'tshirt' ? `/icons/items/cloth-shirt.webp${ITEMS_V}`
    : gearIdIcon(gearId) ? `${gearIdIcon(gearId)}${ITEMS_V}`
    : null;
}

function prettyName(key) {
  if (!key) return '';
  return key
    .replace(/^cooked_fish_/, 'Cooked ')
    .replace(/^burnt_/, 'Burnt ')
    .replace(/^fish_/, '')
    .replace(/^wood_/, '')
    .replace(/^ore_/, '')
    .replace(/^shard_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* v2.3.1232: Lantern Slate button ladder — brass primary (#D8A85F on
   #20170D; the ONE brass action per popup state), raised secondary
   (gradient + hairline + text-1), destructive #7C3431/#FFF1EE with the
   #C7655F edge.  44pt targets, radius 11 per the spec. */
/* v2.3.1332 (owner: chiseled frames everywhere): the ladder's colors
   now come from the .bt-chisel classes (game.css) — brass primary /
   red danger faces inside the owner's 9-sliced frame; layout only
   here.  buttonClass pairs with buttonStyle at every call site. */
const buttonClass = (variant) =>
  'bt-chisel' + (variant === 'primary' ? ' bt-chisel--brass'
    : variant === 'danger' ? ' bt-chisel--danger' : '');
const buttonStyle = (_variant) => ({
  flex: 1,
  minHeight: 44,
  padding: '4px 0',
  fontSize: 12,
  fontWeight: 700,
});

/* Compute an anchored position for the tooltip.
   Prefer right-of-anchor; flip to left if no room.  Clamp the whole
   popup inside the bottom dashboard rect when possible, otherwise
   inside the viewport. */
function positionFor(anchor, popupW, popupH) {
  const GAP = 8;
  const MARGIN = 4;
  const vw = playVw();   /* v2.3.1715: the shell, not the window */
  const vh = (typeof window !== 'undefined') ? window.innerHeight : 768;
  /* Try to locate the bottom dashboard root for clamping. */
  let dashRect = null;
  try {
    const el = document.querySelector('[data-dashboard-root]')
            || document.querySelector('.bottom-dashboard')
            || document.querySelector('[data-dash]');
    if (el && el.getBoundingClientRect) dashRect = el.getBoundingClientRect();
  } catch (_e) {}
  const clampLeft = dashRect ? dashRect.left + MARGIN : MARGIN;
  const clampRight = dashRect ? dashRect.right - MARGIN : vw - MARGIN;
  const clampTop = dashRect ? dashRect.top + MARGIN : MARGIN;
  const clampBottom = dashRect ? dashRect.bottom - MARGIN : vh - MARGIN;

  if (!anchor) {
    /* No anchor -- center inside the dashboard (or viewport). */
    return {
      left: Math.max(clampLeft, ((clampLeft + clampRight) / 2) - popupW / 2),
      top:  Math.max(clampTop,  ((clampTop + clampBottom) / 2) - popupH / 2),
    };
  }

  /* Prefer right-of-anchor. */
  let left = anchor.right + GAP;
  if (left + popupW > clampRight) {
    /* Flip to left. */
    left = anchor.left - GAP - popupW;
  }
  /* Clamp horizontally. */
  if (left < clampLeft) left = clampLeft;
  if (left + popupW > clampRight) left = Math.max(clampLeft, clampRight - popupW);

  /* Vertical: top-align with anchor, shift up if needed. */
  let top = anchor.top;
  if (top + popupH > clampBottom) top = clampBottom - popupH;
  if (top < clampTop) top = clampTop;

  return { left, top };
}

export const ItemDetailPopup = () => {
  const [, force] = useState(0);
  const cardRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const u1 = itemDetailBus.subscribe(() => force((v) => v + 1));
    const u2 = subscribeLocks(() => force((v) => v + 1));
    return () => { u1(); u2(); };
  }, []);

  /* Measure popup size after render, then reposition.  setLayoutEffect
     so we don't flash at the unmeasured position. */
  useLayoutEffect(() => {
    if (!itemDetailBus.state.open) { setPos(null); return; }
    const el = cardRef.current;
    if (!el) return;
    const w = el.offsetWidth || 280;
    const h = el.offsetHeight || 240;
    const next = positionFor(itemDetailBus.state.target && itemDetailBus.state.target.anchor, w, h);
    setPos(next);
  }, [itemDetailBus.state.open, itemDetailBus.state.target]);

  if (!itemDetailBus.state.open) return null;
  const target = itemDetailBus.state.target;

  /* v2.3.1024: unified LOADOUT picker for every equip slot (weapon / shield /
     chest / legs).  Lists the items you own for that slot as equip/unequip
     rows; shows the top 2 and a "▼ N more" toggle to reveal the rest so a big
     stash never overflows the card.  Stays open so you can swap freely; tap
     outside / Escape closes.  Supersedes the chestLayers/legsArmor blocks below
     (now unreachable — the chest/legs cells open this instead). */
  if (target && target.kind === 'loadout') {
    const S2 = getState();
    const R2 = S2 && S2.rpg;
    if (!R2) return null;
    const slot = target.slot;
    const refresh = () => force((v) => v + 1);
    const rows = [];
    let title = '';

    if (slot === 'weapon') {
      const active = R2.activeSlot || 'melee';
      title = 'WEAPON'; /* melee/ranged/staff all share this slot */
      const prop = active === 'ranged' ? 'rangedWeapon' : active === 'staff' ? 'staffWeapon' : 'weapon';
      /* ═══ v2.3.1687: ALL THREE WEAPONS, NOT JUST THE ACTIVE SLOT'S ═══
         Owner: "the old behavior of choosing among the 3 primary weapons
         from the weapon slot in the character equip menu no longer works."
         This list was filtered to the types the ACTIVE slot accepts — from
         melee you saw swords only, so the bow and staff you own were
         invisible and the one card labelled WEAPON could not switch weapon.
         Switching was possible only through the separate cycle gesture,
         which is not what the card promises.
         The filter is gone: every weapon you own is listed, each row equips
         into ITS OWN slot and makes that slot active (slotFor + set_active_
         slot), so picking the bow here arms the bow.  `prop`/`active` still
         decide which row renders as the currently-equipped one. */
      if (!R2.weaponStash) R2.weaponStash = [];
      const mkRow = (w, on) => {
        const dr = weaponDmgRange(R2, w); /* v2.3.1206: R2 = live S.rpg */
        const base = [tierLabel(w), (WEAPON_TYPES[w.type] && WEAPON_TYPES[w.type].label) || w.type].filter(Boolean).join(' ');
        return {
          key: 'w' + (w.name || w.type || '') + R2.weaponStash.indexOf(w) + (on ? 'E' : ''),
          name: w.name || ((tierLabel(w) || '') + ' ' + (w.type || 'weapon')).trim(),
          sub: [base, dr ? 'DMG ' + dr.dmgText + ' · DPS ' + dr.dps : null].filter(Boolean).join(' · '),
          iconSrc: weaponThumb(w), glyph: '⚔️', on,
          toggle: () => {
            /* v2.3.1687: three cases now that every weapon is listed, not
               just the active slot's.  Tapping the weapon you are HOLDING
               unequips it (unchanged); tapping one you own but are not
               holding just makes its slot active — that is the "switch
               between your three weapons" the card is for, and re-equipping
               an already-equipped weapon would have pushed it into the bag
               and handed back a duplicate. */
            const ownProp = slotFor(w.type);
            const ownActive = ownProp === 'rangedWeapon' ? 'ranged'
              : ownProp === 'staffWeapon' ? 'staff' : 'melee';
            const isEquipped = R2[ownProp] === w;
            if (isEquipped && ownActive !== active) {
              R2.activeSlot = ownActive;
              syncWeaponSlot({ type: 'set_active_slot', payload: { slot: ownActive } });
              persist(R2); refresh();
              return;
            }
            if (on) {
              R2.weaponStash.push(w); R2[prop] = null;
              /* v2.3.1159: server-sync + active-slot repair (see
                 syncWeaponSlot).  Emptying the ranged/staff slot drops
                 the hand back to melee/fists on BOTH sides so the
                 character isn't left swinging a phantom weapon. */
              syncWeaponSlot({ type: 'unequip_request', payload: { slot: prop } });
              if (active !== 'melee') {
                R2.activeSlot = 'melee';
                syncWeaponSlot({ type: 'set_active_slot', payload: { slot: 'melee' } });
              }
            }
            else {
              /* v2.3.1687: the weapon decides its own slot, not the slot
                 that happens to be active — that is what lets this one card
                 arm a bow while melee is up. */
              const destProp = slotFor(w.type);
              const destActive = destProp === 'rangedWeapon' ? 'ranged'
                : destProp === 'staffWeapon' ? 'staff' : 'melee';
              const i = R2.weaponStash.indexOf(w); if (i >= 0) R2.weaponStash.splice(i, 1);
              if (R2[destProp]) R2.weaponStash.push(R2[destProp]);
              R2[destProp] = w; R2.activeSlot = destActive;
              /* v2.3.1159: pre-splice stash index, InventoryPanel's
                 equip_request convention — the worker swaps its own
                 stash entry and the player_state echo reconciles any
                 order drift. */
              if (i >= 0) syncWeaponSlot({ type: 'equip_request', payload: { stashIdx: i, slot: destProp } });
              /* The worker resolves damage from ITS activeSlot, so a swap
                 that only moved the slot locally would keep swinging the
                 old weapon server-side. */
              syncWeaponSlot({ type: 'set_active_slot', payload: { slot: destActive } });
            }
            persist(R2); refresh();
          },
        };
      };
      /* Every weapon you own: the three equipped slots (each marked as
         equipped) then everything in the bag, unfiltered. */
      for (const p of ['weapon', 'rangedWeapon', 'staffWeapon']) {
        if (R2[p]) rows.push(mkRow(R2[p], p === prop));
      }
      for (const w of R2.weaponStash) { if (w) rows.push(mkRow(w, false)); }
    } else if (slot === 'shield') {
      title = 'SHIELD';
      if (!R2.shieldStash) R2.shieldStash = [];
      const mkRow = (sh, on) => ({
        key: 'sh' + (sh.name || '') + R2.shieldStash.indexOf(sh) + (on ? 'E' : ''),
        name: sh.name || ((tierLabel(sh) || 'Wood') + ' Shield'),
        sub: ((tierLabel(sh) || 'Wood') + ' shield · raise to block').trim(), iconSrc: shieldThumb(sh), glyph: '🛡️', on,
        toggle: () => {
          if (on) { R2.shieldStash.push(sh); R2.shield = null; }
          else {
            const i = R2.shieldStash.indexOf(sh); if (i >= 0) R2.shieldStash.splice(i, 1);
            if (R2.shield) R2.shieldStash.push(R2.shield);
            R2.shield = sh;
          }
          persist(R2); refresh();
        },
      });
      if (R2.shield) rows.push(mkRow(R2.shield, true));
      for (const sh of R2.shieldStash) rows.push(mkRow(sh, false));
    } else if (slot === 'chest' || slot === 'legs') {
      title = slot === 'chest' ? 'CHEST' : 'LEGS';
      if (!R2.gearStash) R2.gearStash = [];
      const sub = slot === 'chest' ? 'Plate armor · chest · raises defense' : 'Plate greaves · legs · raises defense';
      const mkGearRow = (gearId, on, stashObj) => ({
        key: slot + gearId + (on ? 'E' : 's' + (stashObj ? R2.gearStash.indexOf(stashObj) : 'c')),
        name: gearName(slot, gearId), sub, iconSrc: gearThumb(gearId), on,
        toggle: () => {
          /* ═══ v2.3.1762: THIS ROW MOVES THE REAL PIECE ═══
             Owner: "Unequipping the copper torso plate armor doesn't remove it
             from the equipped status on character chest piece and also still
             keeps the mitigation percentage of wearing the plate active."

             It used to move only the COSMETIC mirror below — push a gearStash
             entry, setEquip(slot,'none') — which was correct when the layer was
             its own wardrobe.  Since v2.3.1703 the layer is DERIVED from the
             stat piece, so for chest and legs that made the row a lie: the art
             came off, R.armor stayed worn (so the cell still read equipped and
             the worker still mitigated), and the next armour echo re-derived
             the layer and put the art back.
             Chest and legs therefore route to the stat flows, which move the
             field, tell the worker, and let syncArmorLayers re-derive the art.
             Everything else — the shirt, shoulders, and a legacy cosmetic-only
             save with no stat piece — keeps the mirror path underneath. */
          const statSlot = slot === 'chest' || slot === 'legs';
          const wornStat = slot === 'chest' ? R2.armor : R2.legsArmor;
          const bag = slot === 'chest' ? (R2.armorStash || []) : (R2.legsStash || []);
          if (statSlot && on && wornStat) {
            if (slot === 'chest') unequipArmorDirect(); else unequipLegsDirect();
            refresh();
            return;
          }
          if (statSlot && !on && !wornStat && bag.length) {
            if (slot === 'chest') equipArmorFromStash(bag[0]); else equipLegsFromStash(bag[0]);
            refresh();
            return;
          }
          if (on) {
            R2.gearStash.push({ slot, gearId, name: gearName(slot, gearId) });
            setEquip(slot, 'none');
          } else {
            if (stashObj) { const i = R2.gearStash.indexOf(stashObj); if (i >= 0) R2.gearStash.splice(i, 1); }
            const prev = getEquip(slot);
            if (prev !== 'none') R2.gearStash.push({ slot, gearId: prev, name: gearName(slot, prev) });
            setEquip(slot, gearId);
          }
          persist(R2); refresh();
        },
      });
      const curId = getEquip(slot);
      if (curId !== 'none') rows.push(mkGearRow(curId, true, null));
      /* v2.3.1413 (owner: after unequipping the chest plate with a shirt
         on, the chest slot "only shows shirt with blank stats" — no way
         to re-equip).  Two hardening moves:
         1. SANITIZE the stash: older saves accumulated malformed entries
            (missing/unknown gearId) that rendered as a blank row that
            couldn't equip anything — and, being a row, SUPPRESSED the
            rows.length-gated catalog fallback that would have offered
            the real plate.  Unknown-id entries are dropped from the
            save (self-healing), duplicates collapse to one row.
         2. ALWAYS offer every catalog item for the slot: presence is
            checked per gear id, not via rows.length, so the plate can
            always be re-equipped from the loadout no matter what state
            an old save is in. */
      const _valid = new Set((GEAR_CATALOG[slot] || []).map((c) => c && c.id).filter((id) => id && id !== 'none'));
      const _stash = R2.gearStash.filter((g) => g && g.slot === slot);
      let _stashDirty = false;
      for (const g of _stash) {
        if (!_valid.has(g.gearId)) {
          const i = R2.gearStash.indexOf(g);
          if (i >= 0) { R2.gearStash.splice(i, 1); _stashDirty = true; }
        }
      }
      if (_stashDirty) persist(R2);
      const _seen = new Set([curId]);
      for (const g of _stash) {
        if (!_valid.has(g.gearId) || _seen.has(g.gearId)) continue;
        _seen.add(g.gearId);
        rows.push(mkGearRow(g.gearId, false, g));
      }
      /* ═══ v2.3.1750: YOU HAVE TO EARN IT ═══
         Owner: "you can access iron torso and iron greaves through the
         character equip menu even before completing the quest that gives you
         these.  They still gave a 0% armor bonus but remove them from the game
         until they get the quest reward for it."
         This loop used to offer EVERY catalog id unconditionally.  It was
         added in v2.3.1413 as hardening — after a save-shape bug left a player
         unable to re-equip a plate they owned, "always offer everything" made
         that unreachable state impossible.  It also handed a brand-new
         character the full armour set, wearing art for gear they had never
         been given, which is why it read as 0%: the CELL is cosmetic and the
         damage reduction comes from the stat-bearing piece the worker knows
         about (R.armor / R.legsArmor), which they did not have.
         So the fallback is kept and narrowed to OWNERSHIP.  A catalog piece is
         offered when the player has actually got one:
           - it is in gearStash (they own the cosmetic layer), or
           - they are wearing it right now (handled above), or
           - they hold the stat-bearing piece for this slot — the quest payout
             itself (R.armor / R.legsArmor, or its bag: armorStash/legsStash).
         The last clause is what preserves v2.3.1413's intent: a player who
         earned the torso can always get its art back, whatever shape their
         save is in.  A player who never did the quest sees an empty picker,
         which is the truth. */
      const _ownsStat = slot === 'chest'
        ? !!(R2.armor || (R2.armorStash && R2.armorStash.length))
        : !!(R2.legsArmor || (R2.legsStash && R2.legsStash.length));
      if (_ownsStat) {
        for (const id of _valid) {
          if (!_seen.has(id)) { _seen.add(id); rows.push(mkGearRow(id, false, null)); }
        }
      }
      /* Chest also carries the optional t-shirt under-layer. */
      if (slot === 'chest') {
        const shirtOn = getEquip('shirt') !== 'none';
        rows.push({
          key: 'shirt', name: 'T-Shirt', sub: 'Cloth shirt · worn under armor',
          iconSrc: `/icons/items/cloth-shirt.webp${ITEMS_V}`, on: shirtOn, /* v2.3.1325 */
          /* v2.3.1070: drive the MASTER shirt store (setShirt) so the swing
             renderer -- which reads getShirt() -- sees the change; setEquip
             keeps the gear mirror in lockstep even when setShirt dedupes. */
          toggle: () => { const nv = shirtOn ? 'none' : 'tshirt'; setShirt(nv); setEquip('shirt', nv); persist(R2); refresh(); },
        });
      }
    }

    /* v2.3.1037: one item per "page".  The card is a fixed-height flex column
       (title / scrolling list / cue); the list takes the leftover space via
       flex:1, and each row is height:100% of that list -- so a row is exactly
       one viewport tall regardless of the title/cue size (no fragile pixel
       math), the whole card border shows at rest, and a swipe snaps to the next
       item.  Name + Equip/Unequip pinned; description fills the middle. */
    /* v2.3.1235: correction pass §7 — the narrow BUILD-column dock
       truncated its contents.  Each row is now HORIZONTAL: icon + name
       + stats on the left, the action on the right.  Unequip is a
       routine action → compact secondary button (was destructive red);
       Equip stays the gold primary. */
    const row = (r) => (
      <div key={r.key} style={{
        flex: '0 0 auto',
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8,
        background: r.on ? 'var(--ui-card)' : 'var(--ui-well-soft)',
        border: `1px solid ${r.on ? 'var(--ui-brass)' : 'var(--ui-line)'}`,
        boxSizing: 'border-box', overflow: 'hidden',
      }}>
        {r.iconSrc
          ? <img src={r.iconSrc} alt={r.name} draggable={false} style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', filter: r.on ? 'none' : 'grayscale(1) brightness(.7)', userSelect: 'none', flex: '0 0 auto' }} />
          : <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, opacity: r.on ? 1 : 0.6, flex: '0 0 auto', userSelect: 'none' }}>{r.glyph || '▫'}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ui-text)', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{r.name}</div>
          {/* v2.3.1235: QA — hyphens swapped for non-breaking hyphens so a
              damage range ("8-13") can never wrap mid-number. */}
          {r.sub && <div style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--ui-text-muted)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{String(r.sub).replace(/-/g, '‑')}</div>}
        </div>
        <button type="button" onPointerUp={(e) => { e.stopPropagation(); r.toggle(); }}
          style={{
            flex: '0 0 auto', minWidth: 76, minHeight: 44, padding: '0 10px', fontSize: 12, fontWeight: 700, borderRadius: 10,
            border: r.on ? '1px solid var(--ui-line-strong)' : '1px solid #EAC675',
            background: r.on ? 'var(--ui-raised)' : 'linear-gradient(180deg, #E2B765, #D2A14D)',
            color: r.on ? 'var(--ui-text)' : '#172126',
            boxShadow: r.on ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.22)',
            fontFamily: 'inherit',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>{r.on ? 'Unequip' : 'Equip'}</button>
      </div>
    );

    /* Dock the panel over the BUILD column (target.panel rect) -- a fixed,
       consistent, rounded card to the RIGHT of the loadout cells.  Capped to
       the column's own height (== inside the dashboard, never taller), so the
       row list scrolls internally.  The dismiss layer stops ABOVE the dashboard
       so the loadout cells stay tappable: tapping another cell switches the
       picker's slot in place; tapping the play area closes it. */
    /* v2.3.1232: Lantern Slate world card (was the legacy indigo gradient) —
       rgba(17,25,29,.94) card gradient, strong border, radius 12. */
    const cardCommon = {
      background: 'var(--ui-sheet)',
      border: '1px solid var(--ui-line-strong)',
      borderRadius: 12, padding: 8,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)',
      fontFamily: 'Source Sans 3, sans-serif',
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', zIndex: 51,
    };
    /* v2.3.1235: §7 — a 320px-max horizontal popover centered 8px above
       the dashboard (replaces the BUILD-column dock whose narrow column
       truncated names and clipped buttons on small phones).  The
       dismiss layer still stops at the band so loadout cells stay
       tappable to switch slots. */
    const cardStyle = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 'calc(var(--dash-h) + 8px)',
      width: 'min(320px, calc(100vw - 24px))',
      maxHeight: '36vh',
      ...cardCommon,
    };
    return (
      <div onPointerDown={() => itemDetailBus.close()}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'var(--dash-h)', background: 'transparent', zIndex: 50, pointerEvents: 'auto' }}>
        <div ref={cardRef} onPointerDown={(e) => e.stopPropagation()} style={cardStyle}>
          {/* v2.3.1232: 11/600 uppercase section header + raised hairline close chip */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#96A2A0' }}>{title}</span>
            <button type="button" aria-label="Close" onPointerUp={(e) => { e.stopPropagation(); itemDetailBus.close(); }}
              style={{
                flex: '0 0 auto', width: 28, height: 28, lineHeight: '26px', textAlign: 'center', padding: 0,
                fontSize: 13, fontWeight: 700, borderRadius: 8, border: '1px solid rgba(238, 242, 235, .14)',
                background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)', color: '#F7F2E7', cursor: 'pointer',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>✕</button>
          </div>
          {rows.length === 0
            ? <div style={{ fontSize: 11, color: '#96A2A0', padding: '4px 2px' }}>Nothing to equip here.</div>
            : <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', scrollSnapType: 'y mandatory' }}>
                {rows.map(row)}
              </div>}
          {rows.length > 1 && (
            <div style={{ flex: '0 0 auto', marginTop: 4, textAlign: 'center', fontSize: 10, fontWeight: 600, letterSpacing: 0.4, color: '#96A2A0', pointerEvents: 'none', userSelect: 'none' }}>⌄ swipe · {rows.length} items</div>
          )}
        </div>
      </div>
    );
  }

  /* v2.3.756: the CHEST loadout slot holds TWO layers -- armour worn OVER the
     t-shirt.  Tapping it opens this two-row picker instead of a single-item
     card: each layer equips/unequips independently (armour to/from the bag,
     the shirt simply on/off), and the popup stays open so both can be set in
     one visit.  Armour always renders above the shirt in-game. */
  if (target && target.kind === 'chestLayers') {
    const shirtId = getEquip('shirt');
    const S2 = getState();
    const R2 = S2 && S2.rpg;
    /* v2.3.1703: this row used to add/remove a COSMETIC steel plate from
       gearStash while R.armor — the piece that actually reduces damage —
       sat untouched, so the loadout screen could say "armour on" for a
       character taking full hits.  The layer is derived from R.armor now
       (gearCatalog.syncArmorLayers), so the row moves the real piece:
       off into R.armorStash, or the first piece from the bag back on. */
    const stashedChest = R2 && R2.armorStash && R2.armorStash[0];
    const toggleArmor = () => {
      if (!R2) return;
      if (R2.armor) {
        unequipArmorDirect();
      } else if (stashedChest) {
        R2.armorStash.splice(0, 1);
        R2.armor = stashedChest;
        recalcDerived(R2);
        R2.hp = Math.min(R2.maxHp, R2.hp);
        syncArmorLayers(R2);
        persist(R2);
        syncArmorChange(R2);
      }
      force((v) => v + 1);
    };
    const toggleShirt = () => {
      /* v2.3.1070: see note above -- master setShirt() drives the renderer,
         setEquip() mirrors into the gear store. */
      const nv = shirtId !== 'none' ? 'none' : 'tshirt';
      setShirt(nv);
      setEquip('shirt', nv);
      force((v) => v + 1);
    };
    const armorOn = !!(R2 && R2.armor); /* v2.3.1703: the stat piece, not the layer */
    const shirtOn = shirtId !== 'none';
    /* v2.3.1232: Lantern Slate layer row — 44pt action row; equipped =
       occupied-slot surface + 1px brass edge; Equip = brass primary,
       Unequip = destructive, disabled = raised + #687575. */
    const layerRow = (key, iconSrc, name, sub, on, canEquip, onToggle) => (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
        padding: '5px 6px', borderRadius: 8,
        background: on ? '#243137' : '#19252A',
        border: `1px solid ${on ? '#D8A85F' : 'rgba(238, 242, 235, .14)'}`,
      }}>
        <img src={iconSrc} alt={name} draggable={false}
          style={{ width: 24, height: 24, imageRendering: 'pixelated',
            filter: on ? 'none' : 'grayscale(1) brightness(.6)', userSelect: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#F7F2E7' : '#B9C1BF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: 10, color: '#96A2A0' }}>{sub}</div>{/* v2.3.1239: 10px font floor (was 9) */}
        </div>
        <button type="button"
          onPointerUp={(e) => { e.stopPropagation(); if (on || canEquip) onToggle(); }}
          disabled={!on && !canEquip}
          style={{
            minHeight: 44, padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 11,
            border: on ? '1px solid #C7655F' : (canEquip ? 'none' : '1px solid rgba(238, 242, 235, .14)'),
            background: on ? '#7C3431' : (canEquip ? '#D8A85F' : '#2B3940'),
            color: on ? '#FFF1EE' : (canEquip ? '#20170D' : '#687575'),
            fontFamily: 'inherit',
            cursor: (on || canEquip) ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>{on ? 'Unequip' : 'Equip'}</button>
      </div>
    );
    return (
      <div onPointerDown={() => itemDetailBus.close()}
        style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 50, pointerEvents: 'auto' }}>
        <div ref={cardRef} onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: pos ? pos.left : -9999,
            top: pos ? pos.top : -9999,
            width: 200,
            background: '#2B3940',
            border: '1px solid rgba(238, 242, 235, 0.14)',
            borderRadius: 10,
            padding: 8,
            fontFamily: 'Source Sans 3, sans-serif',
            boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          }}>
          {/* v2.3.1232: 11/600 uppercase section header */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#96A2A0', marginBottom: 5 }}>
            Chest — Layers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* v2.3.1758: the metal of whichever piece this row is about —
                the worn one, or the one waiting in the bag. */}
            {layerRow('armor', `${armorIconFor('chest', (armorOn ? R2.armor : stashedChest) && (armorOn ? R2.armor : stashedChest).mat)}${ITEMS_V}`,
              armorOn ? ((R2.armor && R2.armor.name) || 'Armor') : (stashedChest ? (stashedChest.name || 'Armor') : 'No chest armor'),
              'Armor · top layer', armorOn, !!stashedChest, toggleArmor)}
            {layerRow('shirt', `/icons/items/cloth-shirt.webp${ITEMS_V}`,
              'T-Shirt', 'Clothing · under armor', shirtOn, true, toggleShirt)}
          </div>
        </div>
      </div>
    );
  }

  /* v2.3.1016: LEGS picker — mirrors the chest-layers popup but single-layer,
     so legs can be equipped/unequipped straight from the loadout cell, even
     when empty.  Equip pulls the unequipped greaves back from the bag if it's
     there, else equips the catalog default so the button always works. */
  if (target && target.kind === 'legsArmor') {
    const S2 = getState();
    const R2 = S2 && S2.rpg;
    /* v2.3.1703: the legs twin of the chest row above — and the one the
       owner actually hit ("when you equip iron greaves it doesn't show on
       your character").  This button used to toggle the cosmetic greaves
       layer and had a final `else setEquip('legs','steelgreaves')` branch
       that painted steel plate onto a character wearing nothing at all, so
       the cell and the stats disagreed in BOTH directions.  It moves
       R.legsArmor now, and the art follows the piece. */
    const stashedLegs = R2 && R2.legsStash && R2.legsStash[0];
    const on = !!(R2 && R2.legsArmor);
    const toggleLegs = () => {
      if (!R2) return;
      if (on) {
        unequipLegsDirect();
      } else if (stashedLegs) {
        R2.legsStash.splice(0, 1);
        R2.legsArmor = stashedLegs;
        recalcDerived(R2);
        R2.hp = Math.min(R2.maxHp, R2.hp);
        syncArmorLayers(R2);
        persist(R2);
        syncArmorChange(R2, { legs: true });
      }
      force((v) => v + 1);
    };
    return (
      <div onPointerDown={() => itemDetailBus.close()}
        style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 50, pointerEvents: 'auto' }}>
        <div ref={cardRef} onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: pos ? pos.left : -9999,
            top: pos ? pos.top : -9999,
            width: 200,
            background: '#2B3940',
            border: '1px solid rgba(238, 242, 235, 0.14)',
            borderRadius: 10,
            padding: 8,
            fontFamily: 'Source Sans 3, sans-serif',
            boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          }}>
          {/* v2.3.1232: 11/600 uppercase section header */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#96A2A0', marginBottom: 5 }}>
            Legs
          </div>
          {/* v2.3.1232: same Lantern row language as the chest-layers picker —
              44pt action row, brass Equip / destructive Unequip. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
            padding: '5px 6px', borderRadius: 8,
            background: on ? '#243137' : '#19252A',
            border: `1px solid ${on ? '#D8A85F' : 'rgba(238, 242, 235, .14)'}`,
          }}>
            <img src={`${armorIconFor('legs', (on ? (R2 && R2.legsArmor) : stashedLegs) && (on ? (R2 && R2.legsArmor) : stashedLegs).mat)}${ITEMS_V}`} alt="Greaves" draggable={false} /* v2.3.1758 */
              style={{ width: 24, height: 24, imageRendering: 'pixelated',
                filter: on ? 'none' : 'grayscale(1) brightness(.6)', userSelect: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#F7F2E7' : '#B9C1BF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{on ? ((R2 && R2.legsArmor && R2.legsArmor.name) || 'Greaves') : (stashedLegs ? (stashedLegs.name || 'Greaves') : 'No greaves')}</div>
              <div style={{ fontSize: 10, color: '#96A2A0' }}>Armor · legs</div>{/* v2.3.1239: 10px font floor (was 9) */}
            </div>
            <button type="button"
              onPointerUp={(e) => { e.stopPropagation(); toggleLegs(); }}
              style={{
                minHeight: 44, padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 11,
                border: on ? '1px solid #C7655F' : 'none',
                background: on ? '#7C3431' : '#D8A85F',
                color: on ? '#FFF1EE' : '#20170D',
                fontFamily: 'inherit',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>{on ? 'Unequip' : 'Equip'}</button>
          </div>
        </div>
      </div>
    );
  }

  const resolved = resolveTarget(target);
  if (!resolved) return null;
  const { lockKey, thumb, glyph, name, info, delta, desc, actions } = resolved;
  const locked = itemIsLocked(lockKey);

  /* v2.3.853: logs no longer cook directly -- they light a campfire.  Tapping a
     lit campfire (with raw fish in the bag) starts the cooking interaction. */
  const onLight = () => {
    firemakingBus.open(target.key);
    itemDetailBus.close();
  };
  const onEat = () => {
    eatBus.open(target.key);
    itemDetailBus.close();
  };
  const onUnequipWeapon = () => {
    unequipWeaponSlot(target.slot);
    itemDetailBus.close();
  };
  const onUnequipShield = () => {
    unequipShieldDirect();
    itemDetailBus.close();
  };
  const onEquipStashWeapon = () => {
    const S = getState();
    if (!S || !S.rpg || !target.wpn) return;
    const R = S.rpg;
    const slot = slotFor(target.wpn.type);
    /* Move target out of stash; swap any equipped weapon back into stash. */
    if (!R.weaponStash) R.weaponStash = [];
    const idx = R.weaponStash.indexOf(target.wpn);
    if (idx >= 0) R.weaponStash.splice(idx, 1);
    const cur = R[slot];
    if (cur) R.weaponStash.push(cur);
    R[slot] = target.wpn;
    /* Activate this slot so the player swings the equipped weapon. */
    R.activeSlot = slot === 'rangedWeapon' ? 'ranged'
                 : slot === 'staffWeapon'  ? 'staff'
                 :                            'melee';
    /* v2.3.1159: server-sync — pre-splice index, InventoryPanel
       convention; the slot activation must reach the worker too or its
       _computeAttackDamage keeps resolving the previous slot. */
    if (idx >= 0) syncWeaponSlot({ type: 'equip_request', payload: { stashIdx: idx, slot } });
    syncWeaponSlot({ type: 'set_active_slot', payload: { slot: R.activeSlot } });
    persist(R);
    itemDetailBus.close();
  };
  const onEquipStashShield = () => {
    const S = getState();
    if (!S || !S.rpg || !target.shield) return;
    const R = S.rpg;
    if (!R.shieldStash) R.shieldStash = [];
    const idx = R.shieldStash.indexOf(target.shield);
    if (idx >= 0) R.shieldStash.splice(idx, 1);
    if (R.shield) R.shieldStash.push(R.shield);
    R.shield = target.shield;
    persist(R);
    itemDetailBus.close();
  };
  /* v2.3.236: armor swap is HP-neutral.  Recompute maxHp from the
     new armor; only CAP current HP to the new max (no delta-add or
     delta-subtract).  Unequipping no longer secretly costs HP and
     equipping no longer secretly heals -- matches the user's mental
     model and stops the visible 120 -> 80 -> 100 hp drift on a
     local-only armor cycle.
     Also pushes the armor change into React state via the helper on
     window._gameState (set by BroTown) so the stats_update useEffect
     fires and the worker's ps.armor stays in sync.  Without that,
     the worker's next player_state echo re-applies the old armor and
     the local unequip silently undoes itself. */
  const onUnequipArmor = () => {
    unequipArmorDirect();
    itemDetailBus.close();
  };
  /* v2.3.1762: the body of this moved to equipActions (equipArmorFromStash) so
     the loadout picker's row can run the SAME code — see the note there. */
  const onEquipStashArmor = () => {
    if (!target.armor) return;
    equipArmorFromStash(target.armor);
    itemDetailBus.close();
  };
  /* v2.3.1701: the LEGS equip.  R.legsArmor is the field the LEGS card
     reads (equipModel.js), the field the worker persists (persistence.js)
     and the field the SERVER's per-hit reduction reads (combat.js
     _armorDrMult) — so this is the only route that makes an equipped greave
     mean anything.  syncArmorChange carries it to the worker with
     `legs: true`; without that push ps.legsArmor stays null and the next
     full player_state echo takes the piece straight back off. */
  /* v2.3.1762: body moved to equipActions (equipLegsFromStash), shared with the
     loadout picker's row. */
  const onEquipStashLegs = () => {
    if (!target.armor) return;
    equipLegsFromStash(target.armor);
    itemDetailBus.close();
  };
  /* v2.3.685: worn gear (rendered steel chest/legs) unequips into
     rpg.gearStash -- the bag shows it as a stash tile, and Equip from there
     puts it back on (swapping any currently-worn piece into the stash).
     setEquip drives the renderer directly (same path as the Equipment menu),
     so the armour visibly comes off/on and eqc/eql sync covers remotes. */
  const onUnequipGear = () => {
    unequipGearDirect(target.slot);
    itemDetailBus.close();
  };
  const onEquipStashGear = () => {
    const S = getState();
    if (!S || !S.rpg || !target.gear) return;
    const R = S.rpg;
    const g = target.gear;
    if (!R.gearStash) R.gearStash = [];
    const idx = R.gearStash.indexOf(g);
    if (idx >= 0) R.gearStash.splice(idx, 1);
    const cur = getEquip(g.slot);
    if (cur && cur !== 'none') {
      R.gearStash.push({ slot: g.slot, gearId: cur, name: gearName(g.slot, cur) });
    }
    setEquip(g.slot, g.gearId);
    persist(R);
    itemDetailBus.close();
  };
  const onToggleLock = () => {
    if (locked) unlockItem(lockKey);
    else        lockItem(lockKey);
  };
  const onClose = () => itemDetailBus.close();

  /* Final unequip handler: dispatch on target.kind. */
  const onUnequip = () => {
    if (target.kind === 'shield')      onUnequipShield();
    else if (target.kind === 'armor')  onUnequipArmor();
    else if (target.kind === 'gear')   onUnequipGear();
    else                                onUnequipWeapon();
  };
  const onEquip = () => {
    if (target.kind === 'stashShield')      onEquipStashShield();
    else if (target.kind === 'stashArmor')  onEquipStashArmor();
    else if (target.kind === 'stashLegs')   onEquipStashLegs();
    else if (target.kind === 'stashGear')   onEquipStashGear();
    else                                     onEquipStashWeapon();
  };

  return (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'transparent',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={cardRef}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: pos ? pos.left : -9999,
          top:  pos ? pos.top  : -9999,
          width: 240,
          maxHeight: '60vh',
          background: '#2B3940',
          border: '1px solid ' + COL.border,
          borderRadius: 10, /* v2.3.1232: card radius per Lantern Slate */
          padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
          color: COL.text,
          fontFamily: 'Source Sans 3, sans-serif',
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          opacity: pos ? 1 : 0,
        }}
      >
        <div style={{ position: 'relative', width: 80, height: 80, alignSelf: 'center' }}>
          {/* v2.3.1232: portrait sits in a recessed well (#121B20, slot radius) */}
          <div style={{
            width: '100%', height: '100%',
            background: '#121B20',
            border: '1px solid ' + COL.divider,
            borderRadius: 8,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
          }}>
            {thumb
              ? <img src={thumb} alt={name} draggable={false}
                  style={{ width: '85%', height: '85%', objectFit: 'contain', imageRendering: 'auto' }} />
              : <span>{glyph}</span>}
          </div>
          {locked && (
            /* v2.3.1070: ⚓ anchor glyph replaces the old "L" -- an anchored
               item stays pinned to the bag instead of scrolling off. */
            <div style={{
              position: 'absolute', top: 2, right: 2,
              width: 18, height: 18,
              background: 'rgba(9, 14, 17, 0.85)',
              border: '1px solid #F0C878', /* v2.3.1232: focus ring token (was legacy #f5c542) */
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, lineHeight: 1,
            }}>⚓</div>
          )}
        </div>

        {/* v2.3.1232: item name 15/700 warm-white per Lantern Slate */}
        <div style={{
          fontSize: 15, fontWeight: 700, color: '#F7F2E7',
          textAlign: 'center',
          letterSpacing: '.02em',
        }}>{name}</div>

        {/* v2.3.1232: stat line lives in a recessed well-soft cell, tabular numerals */}
        {info && (
          <div style={{
            fontSize: 12, color: COL.text, fontVariantNumeric: 'tabular-nums',
            textAlign: 'center',
            padding: '5px 0',
            background: '#19252A',
            border: '1px solid ' + COL.divider,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
            borderRadius: 8,
          }}>{info}</div>
        )}

        {/* v2.3.1313 (round-8 §8): comparison vs equipped — green
            upgrade / red downgrade / muted tie.  Only stash cards set
            it (no counterpart -> no line). */}
        {delta && (
          <div style={{
            fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            textAlign: 'center',
            /* Palette tokens: xp green for gains, danger red for losses
               (no off-palette colors — v2.3.1235 correction-pass rule). */
            color: delta.tone > 0 ? COL.xp : delta.tone < 0 ? COL.danger : COL.muted,
          }}>{delta.text}</div>
        )}

        {/* v2.3.1232: category caption — 10/600 uppercase metadata */}
        {desc && (
          <div style={{
            fontSize: 10, fontWeight: 600, color: COL.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            textAlign: 'center',
          }}>{desc}</div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {actions.light    && <button onClick={onLight}   className={buttonClass('primary')} style={buttonStyle('primary')}>Light fire</button>}
          {actions.eat      && <button onClick={onEat}     className={buttonClass('primary')} style={buttonStyle('primary')}>Eat</button>}
          {actions.equip    && <button onClick={onEquip}   className={buttonClass('primary')} style={buttonStyle('primary')}>Equip</button>}
          {actions.unequip  && <button onClick={onUnequip} className={buttonClass('danger')} style={buttonStyle('danger')}>Unequip</button>}
          <button onClick={onToggleLock} className={buttonClass()} style={buttonStyle()}>
            {locked ? '⚓ Unanchor' : '⚓ Anchor'}
          </button>
          <button onClick={onClose} className={buttonClass()} style={buttonStyle()}>X</button>
        </div>
      </div>
    </div>
  );
};

function persist(R) {
  try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

/* v2.3.1159: mirror weapon equip/unequip/slot changes to the worker.
   Every path in this popup used to mutate only S.rpg + localStorage —
   the server's ps.weapon/rangedWeapon/staffWeapon never heard about it,
   so an unequipped bow kept swinging server-side (_computeAttackDamage
   resolves from the SERVER slots) and the next player_state echo
   re-equipped it locally.  Local mutation stays as prediction (the
   InventoryPanel equip convention); the worker echo is authoritative.
   Gate on _serverMonsters like InventoryPanel — offline/legacy solo
   rendering has no worker to sync. */
/* ═══ v2.3.1687: THE GATE WAS `_serverMonsters`, WHICH IS FALSE IN TOWN ═══
   Owner: "Every time you turn in a quest it unequips all your weapons."
   It never unequipped anything — the equip had never reached the worker in
   the first place.  `_serverMonsters` means "this zone's monsters are
   server-driven" and is false in town (no monsters), and the character menu
   is a TOWN screen, so every equip / unequip / slot change made there was
   applied locally and sent nowhere.  Client and worker then disagreed
   silently until something made the worker restate the loadout — a quest
   turn-in does exactly that — and the client adopted the worker's empty
   slots.  The unequip was the two views finally being reconciled, with the
   client's side of the story never having been told.
   Same dead gate as the quest messages in v2.3.1684 (src/game/quests.js);
   gate on the CHANNEL, which is the only thing that was ever being asked. */
function syncWeaponSlot(msg) {
  const S = getState();
  if (S && S.channel) {
    try { S.channel.send(msg); } catch (e) {}
  }
}

