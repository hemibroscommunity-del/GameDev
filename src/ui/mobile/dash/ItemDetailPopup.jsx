import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { GEAR_CATALOG, getEquip, setEquip } from '../../../rendering/gearCatalog.js';
import { setShirt } from '../../../rendering/traits/shirtCatalog.js';
import {
  WEAPON_TYPES,
  SWING_COOLDOWN,
  BLACKSMITH_TIERS,
  WOODWORKING_TIERS,
  getFishHealAmount,
  getArmorHp,
  recalcDerived,
} from '../../../data/gameSystems.js';

/* Stat-free damage range + DPS for a weapon. */
function weaponDmgRange(wpn) {
  if (!wpn || !wpn.type) return null;
  const wType = WEAPON_TYPES[wpn.type];
  if (!wType) return null;
  const base = wType.base * (wpn.tierMult || 1);
  let dmgMin, dmgMax, cdMs = SWING_COOLDOWN;
  if (wpn.type === 'bow')        { dmgMin = base * 0.6;  dmgMax = base * 0.8; }
  else if (wpn.type === 'staff') { dmgMin = base * 0.5;  dmgMax = base * 1.5; cdMs += 300; }
  else                           { dmgMin = base * 0.75; dmgMax = base * 1.25; }
  dmgMin = Math.round(dmgMin); dmgMax = Math.round(dmgMax);
  const dmgText = dmgMin === dmgMax ? String(dmgMin) : `${dmgMin}-${dmgMax}`;
  const dps = ((dmgMin + dmgMax) / 2 / (cdMs / 1000)).toFixed(1);
  return { dmgText, dps };
}

function tierLabel(wpn) {
  if (!wpn || !wpn.gearBase) return '';
  const tbl = (wpn.gearBase || '').startsWith && wpn.type === 'bow'
    ? WOODWORKING_TIERS
    : BLACKSMITH_TIERS;
  const tier = tbl[wpn.gearBase] || WOODWORKING_TIERS[wpn.gearBase];
  return tier ? tier.label : wpn.gearBase;
}

/* Pick a thumb URL for a weapon based on type / gearBase. */
function weaponThumb(wpn) {
  if (!wpn || !wpn.type) return null;
  const v = '2.3.210';
  if (wpn.type === 'bow')   return `/sprites/weapons/bows/Bow2.png?v=${v}`;
  if (wpn.type === 'staff') return `/sprites/weapons/staffs/Wizard%20Staff2.png?v=${v}`;
  /* v2.3.1070: starter (wood) sword shows a clean mini steel-sword icon
     (east-view frame lifted from sword-east-weapon.png) instead of the old
     bamboo-stick render. */
  return wpn.gearBase === 'wood'
    ? `/sprites/weapons/swords/steel-sword-east.png?v=2.3.1070`
    : `/sprites/weapons/swords/Sword1.png?v=${v}`;
}

function shieldThumb(shield) {
  const v = '2.3.211';
  if (shield && shield.gearBase === 'wood') return `/sprites/shields/wood-shield-front.png?v=${v}`;
  return null; /* no metal-shield art slot yet; popup falls back to glyph */
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
    if (isCookedFish) info = '+' + getFishHealAmount(key) + ' HP when eaten';
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
    const range = weaponDmgRange(wpn);
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
    const range = weaponDmgRange(wpn);
    return {
      lockKey: 'stashWeapon_' + (target.index || 0),
      thumb: weaponThumb(wpn),
      glyph: null,
      name: wpn.name || 'Weapon',
      info: range ? ('Damage ' + range.dmgText + ' · DPS ' + range.dps) : null,
      desc: tierLabel(wpn) + ' · ' + (wpn.type || '').charAt(0).toUpperCase() + (wpn.type || '').slice(1),
      actions: { equip: true },
    };
  }
  if (target.kind === 'stashShield') {
    const sh = target.shield;
    if (!sh) return null;
    return {
      lockKey: 'stashShield_' + (target.index || 0),
      thumb: shieldThumb(sh),
      glyph: '\u{1F6E1}',
      name: sh.name || 'Shield',
      info: 'Hold to block',
      desc: (sh.gearBase === 'wood' ? 'Wooden' : tierLabel(sh)) + ' · Shield',
      actions: { equip: true },
    };
  }
  if (target.kind === 'armor') {
    const ar = target.armor;
    if (!ar) return null;
    /* v2.3.228: HP contribution at the player's current Vitality. */
    const S = getState();
    const vit = (S && S.rpg && S.rpg.vitality) || 0;
    const hp = getArmorHp(ar, vit);
    return {
      lockKey: 'armor',
      thumb: null,
      glyph: '\u{1F9BA}',
      name: ar.name || 'Armor',
      info: '+' + hp + ' Max HP',
      desc: (ar.gearBase === 'wood' ? 'Leather' : tierLabel(ar)) + ' · Chest',
      actions: { unequip: true },
    };
  }
  if (target.kind === 'stashArmor') {
    const ar = target.armor;
    if (!ar) return null;
    const S = getState();
    const vit = (S && S.rpg && S.rpg.vitality) || 0;
    const hp = getArmorHp(ar, vit);
    return {
      lockKey: 'stashArmor_' + (target.index || 0),
      thumb: null,
      glyph: '\u{1F9BA}',
      name: ar.name || 'Armor',
      info: '+' + hp + ' Max HP',
      desc: (ar.gearBase === 'wood' ? 'Leather' : tierLabel(ar)) + ' · Chest',
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
/* Icon PNGs exist for the steel set; other ids fall back to the glyph. */
function gearThumb(gearId) {
  return (gearId === 'steelplate' || gearId === 'steelgreaves')
    ? '/sprites/gear/icons/' + gearId + '.png?v=2.3.685'
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

const buttonStyle = (variant) => ({
  flex: 1,
  padding: '8px 0',
  background: variant === 'primary' ? COL.accent
             : variant === 'danger'  ? '#a73a3a'
             :                         'rgba(255,255,255,0.06)',
  color: COL.text,
  border: '1px solid ' + COL.border,
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
  fontFamily: 'Source Sans 3, sans-serif',
});

/* Compute an anchored position for the tooltip.
   Prefer right-of-anchor; flip to left if no room.  Clamp the whole
   popup inside the bottom dashboard rect when possible, otherwise
   inside the viewport. */
function positionFor(anchor, popupW, popupH) {
  const GAP = 8;
  const MARGIN = 4;
  const vw = (typeof window !== 'undefined') ? window.innerWidth : 1024;
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
      const types = active === 'ranged' ? ['bow'] : active === 'staff' ? ['staff'] : ['sword', 'greatsword'];
      if (!R2.weaponStash) R2.weaponStash = [];
      const mkRow = (w, on) => {
        const dr = weaponDmgRange(w);
        const base = [tierLabel(w), (WEAPON_TYPES[w.type] && WEAPON_TYPES[w.type].label) || w.type].filter(Boolean).join(' ');
        return {
          key: 'w' + (w.name || w.type || '') + R2.weaponStash.indexOf(w) + (on ? 'E' : ''),
          name: w.name || ((tierLabel(w) || '') + ' ' + (w.type || 'weapon')).trim(),
          sub: [base, dr ? 'DMG ' + dr.dmgText + ' · DPS ' + dr.dps : null].filter(Boolean).join(' · '),
          iconSrc: weaponThumb(w), glyph: '⚔️', on,
          toggle: () => {
            if (on) { R2.weaponStash.push(w); R2[prop] = null; }
            else {
              const i = R2.weaponStash.indexOf(w); if (i >= 0) R2.weaponStash.splice(i, 1);
              if (R2[prop]) R2.weaponStash.push(R2[prop]);
              R2[prop] = w; R2.activeSlot = active;
            }
            persist(R2); refresh();
          },
        };
      };
      if (R2[prop]) rows.push(mkRow(R2[prop], true));
      for (const w of R2.weaponStash.filter((x) => x && types.indexOf(x.type) >= 0)) rows.push(mkRow(w, false));
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
      for (const g of R2.gearStash.filter((g) => g && g.slot === slot)) rows.push(mkGearRow(g.gearId, false, g));
      /* Own nothing for this slot? still offer the catalog options so it can
         always be filled from the loadout. */
      if (!rows.length) {
        for (const c of (GEAR_CATALOG[slot] || [])) {
          if (c && c.id && c.id !== 'none') rows.push(mkGearRow(c.id, false, null));
        }
      }
      /* Chest also carries the optional t-shirt under-layer. */
      if (slot === 'chest') {
        const shirtOn = getEquip('shirt') !== 'none';
        rows.push({
          key: 'shirt', name: 'T-Shirt', sub: 'Cloth shirt · worn under armor',
          iconSrc: '/sprites/gear/icons/tshirt.png?v=2.3.756', on: shirtOn,
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
    const P = target.panel;
    const row = (r) => (
      <div key={r.key} style={{
        flex: '0 0 auto', height: P ? '100%' : undefined, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', gap: 4, padding: '7px 8px', borderRadius: 9,
        background: r.on ? 'rgba(125,255,192,.12)' : 'rgba(255,255,255,.06)',
        border: `1px solid ${r.on ? 'rgba(125,255,192,.45)' : 'rgba(255,255,255,.18)'}`,
        boxSizing: 'border-box', overflow: 'hidden',
      }}>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {r.iconSrc
            ? <img src={r.iconSrc} alt={r.name} draggable={false} style={{ width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated', filter: r.on ? 'none' : 'grayscale(1) brightness(.7)', userSelect: 'none', flex: '0 0 auto' }} />
            : <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, opacity: r.on ? 1 : 0.6, flex: '0 0 auto', userSelect: 'none' }}>{r.glyph || '▫'}</span>}
          <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, color: r.on ? '#7dffc0' : '#eaf0ff', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{r.name}</div>
        </div>
        {r.sub
          ? <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', fontSize: 9, lineHeight: 1.3, color: 'rgba(230,238,255,.8)', overflowWrap: 'anywhere' }}>{r.sub}</div>
          : <div style={{ flex: '1 1 auto' }} />}
        <button type="button" onPointerUp={(e) => { e.stopPropagation(); r.toggle(); }}
          style={{
            flex: '0 0 auto', width: '100%', padding: '5px 0', fontSize: 9.5, fontWeight: 800, borderRadius: 6, border: 'none',
            background: r.on ? '#d83b4e' : '#1f9d57', /* Unequip = red, Equip = green */
            color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>{r.on ? 'Unequip' : 'Equip'}</button>
      </div>
    );

    /* Dock the panel over the BUILD column (target.panel rect) -- a fixed,
       consistent, rounded card to the RIGHT of the loadout cells.  Capped to
       the column's own height (== inside the dashboard, never taller), so the
       row list scrolls internally.  The dismiss layer stops ABOVE the dashboard
       so the loadout cells stay tappable: tapping another cell switches the
       picker's slot in place; tapping the play area closes it. */
    const cardCommon = {
      background: 'linear-gradient(155deg, #2f63dd 0%, #234aa8 48%, #16245e 100%)',
      border: '1px solid rgba(140,178,255,0.6)',
      borderRadius: 12, padding: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', zIndex: 51,
    };
    const cardStyle = P
      ? { position: 'fixed', left: P.left, top: P.top, width: P.width, height: P.height, ...cardCommon }
      : { position: 'absolute', left: pos ? pos.left : -9999, top: pos ? pos.top : -9999, width: 210, maxHeight: '46vh', ...cardCommon };
    return (
      <div onPointerDown={() => itemDetailBus.close()}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 'var(--dash-h)', background: 'transparent', zIndex: 50, pointerEvents: 'auto' }}>
        <div ref={cardRef} onPointerDown={(e) => e.stopPropagation()} style={cardStyle}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,.85)', letterSpacing: 0.6 }}>{title}</span>
            <button type="button" aria-label="Close" onPointerUp={(e) => { e.stopPropagation(); itemDetailBus.close(); }}
              style={{
                flex: '0 0 auto', width: 20, height: 20, lineHeight: '18px', textAlign: 'center', padding: 0,
                fontSize: 13, fontWeight: 800, borderRadius: 6, border: '1px solid rgba(255,255,255,.3)',
                background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>✕</button>
          </div>
          {rows.length === 0
            ? <div style={{ fontSize: 9, color: 'rgba(230,238,255,.7)', padding: '4px 2px' }}>Nothing to equip here.</div>
            : <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', scrollSnapType: 'y mandatory' }}>
                {rows.map(row)}
              </div>}
          {rows.length > 1 && (
            <div style={{ flex: '0 0 auto', marginTop: 4, textAlign: 'center', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(230,238,255,.6)', pointerEvents: 'none', userSelect: 'none' }}>⌄ swipe · {rows.length} items</div>
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
    const chestId = getEquip('chest');
    const shirtId = getEquip('shirt');
    const S2 = getState();
    const R2 = S2 && S2.rpg;
    const stashedChest = R2 && R2.gearStash && R2.gearStash.find((g) => g && g.slot === 'chest');
    const toggleArmor = () => {
      if (!R2) return;
      if (chestId !== 'none') {
        if (!R2.gearStash) R2.gearStash = [];
        R2.gearStash.push({ slot: 'chest', gearId: chestId, name: gearName('chest', chestId) });
        setEquip('chest', 'none');
      } else if (stashedChest) {
        const idx = R2.gearStash.indexOf(stashedChest);
        if (idx >= 0) R2.gearStash.splice(idx, 1);
        setEquip('chest', stashedChest.gearId);
      }
      persist(R2);
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
    const armorOn = chestId !== 'none';
    const shirtOn = shirtId !== 'none';
    const layerRow = (key, iconSrc, name, sub, on, canEquip, onToggle) => (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 6px', borderRadius: 8,
        background: on ? 'rgba(61,212,151,.07)' : 'rgba(255,255,255,.03)',
        border: `1px solid ${on ? 'rgba(61,212,151,.3)' : 'rgba(255,255,255,.08)'}`,
      }}>
        <img src={iconSrc} alt={name} draggable={false}
          style={{ width: 24, height: 24, imageRendering: 'pixelated',
            filter: on ? 'none' : 'grayscale(1) brightness(.6)', userSelect: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: on ? '#3dd497' : COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,.35)' }}>{sub}</div>
        </div>
        <button type="button"
          onPointerUp={(e) => { e.stopPropagation(); if (on || canEquip) onToggle(); }}
          disabled={!on && !canEquip}
          style={{
            padding: '4px 8px', fontSize: 8.5, fontWeight: 700, borderRadius: 6,
            border: '1px solid rgba(255,255,255,.2)',
            background: on ? 'rgba(255,94,108,.25)' : (canEquip ? 'rgba(61,212,151,.25)' : 'rgba(255,255,255,.06)'),
            color: (on || canEquip) ? '#fff' : 'rgba(255,255,255,.3)',
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
            background: 'rgba(20,22,32,0.98)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            padding: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.55)', letterSpacing: 0.5, marginBottom: 5 }}>
            CHEST — LAYERS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {layerRow('armor', '/sprites/gear/icons/steelplate.png?v=2.3.685',
              armorOn ? gearName('chest', chestId) : (stashedChest ? stashedChest.name : 'Steel Plate'),
              'Armor · top layer', armorOn, !!stashedChest, toggleArmor)}
            {layerRow('shirt', '/sprites/gear/icons/tshirt.png?v=2.3.756',
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
    const legsId = getEquip('legs');
    const S2 = getState();
    const R2 = S2 && S2.rpg;
    const stashedLegs = R2 && R2.gearStash && R2.gearStash.find((g) => g && g.slot === 'legs');
    const on = legsId !== 'none';
    const toggleLegs = () => {
      if (!R2) return;
      if (on) {
        if (!R2.gearStash) R2.gearStash = [];
        R2.gearStash.push({ slot: 'legs', gearId: legsId, name: gearName('legs', legsId) });
        setEquip('legs', 'none');
      } else if (stashedLegs) {
        const idx = R2.gearStash.indexOf(stashedLegs);
        if (idx >= 0) R2.gearStash.splice(idx, 1);
        setEquip('legs', stashedLegs.gearId);
      } else {
        setEquip('legs', 'steelgreaves');
      }
      persist(R2);
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
            background: 'rgba(20,22,32,0.98)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            padding: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.55)', letterSpacing: 0.5, marginBottom: 5 }}>
            LEGS
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 6px', borderRadius: 8,
            background: on ? 'rgba(61,212,151,.07)' : 'rgba(255,255,255,.03)',
            border: `1px solid ${on ? 'rgba(61,212,151,.3)' : 'rgba(255,255,255,.08)'}`,
          }}>
            <img src="/sprites/gear/icons/steelgreaves.png?v=2.3.685" alt="Steel Greaves" draggable={false}
              style={{ width: 24, height: 24, imageRendering: 'pixelated',
                filter: on ? 'none' : 'grayscale(1) brightness(.6)', userSelect: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: on ? '#3dd497' : COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{on ? gearName('legs', legsId) : 'Steel Greaves'}</div>
              <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,.35)' }}>Armor · legs</div>
            </div>
            <button type="button"
              onPointerUp={(e) => { e.stopPropagation(); toggleLegs(); }}
              style={{
                padding: '4px 8px', fontSize: 8.5, fontWeight: 700, borderRadius: 6,
                border: '1px solid rgba(255,255,255,.2)',
                background: on ? 'rgba(255,94,108,.25)' : 'rgba(61,212,151,.25)',
                color: '#fff', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>{on ? 'Unequip' : 'Equip'}</button>
          </div>
        </div>
      </div>
    );
  }

  const resolved = resolveTarget(target);
  if (!resolved) return null;
  const { lockKey, thumb, glyph, name, info, desc, actions } = resolved;
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
    const S = getState();
    if (!S || !S.rpg) return;
    const R = S.rpg;
    const slotProp = target.slot === 'ranged' ? 'rangedWeapon'
                   : target.slot === 'staff'  ? 'staffWeapon'
                   : 'weapon';
    const cur = R[slotProp];
    if (!cur) { itemDetailBus.close(); return; }
    if (!R.weaponStash) R.weaponStash = [];
    R.weaponStash.push(cur);
    R[slotProp] = null;
    persist(R);
    itemDetailBus.close();
  };
  const onUnequipShield = () => {
    const S = getState();
    if (!S || !S.rpg) return;
    const R = S.rpg;
    if (!R.shield) { itemDetailBus.close(); return; }
    if (!R.shieldStash) R.shieldStash = [];
    R.shieldStash.push(R.shield);
    R.shield = null;
    persist(R);
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
  const _syncArmorChange = (R) => {
    /* Direct stats_update push -- popup mutates S.rpg without going
       through setRpgState, so the React-driven stats_update useEffect
       in BroTown doesn't fire on its own.  Send the armor change
       (with current raw stats so the server has everything it needs
       to recompute maxes correctly) explicitly here. */
    const S = getState();
    if (S && S.channel) {
      try {
        S.channel.send({ type: 'stats_update', payload: {
          armor: R.armor || null,
          maxHp: R.maxHp || 100,
          vitality: R.vitality || 0,
          power: R.power || 0,
          endurance: R.endurance || 0,
          agility: R.agility || 0,
          mind: R.mind || 0,
          ferocity: R.ferocity || 0,
          elementalMastery: R.elementalMastery || 0,
          fortification: R.fortification || 0,
          restoration: R.restoration || 0,
          influence: R.influence || 0,
        }});
      } catch (e) {}
    }
  };
  const onUnequipArmor = () => {
    const S = getState();
    if (!S || !S.rpg) return;
    const R = S.rpg;
    if (!R.armor) { itemDetailBus.close(); return; }
    if (!R.armorStash) R.armorStash = [];
    R.armorStash.push(R.armor);
    R.armor = null;
    recalcDerived(R);
    R.hp = Math.min(R.maxHp, R.hp);  // cap only, no delta-subtract
    persist(R);
    _syncArmorChange(R);
    itemDetailBus.close();
  };
  const onEquipStashArmor = () => {
    const S = getState();
    if (!S || !S.rpg || !target.armor) return;
    const R = S.rpg;
    if (!R.armorStash) R.armorStash = [];
    const idx = R.armorStash.indexOf(target.armor);
    if (idx >= 0) R.armorStash.splice(idx, 1);
    if (R.armor) R.armorStash.push(R.armor);
    R.armor = target.armor;
    recalcDerived(R);
    R.hp = Math.min(R.maxHp, R.hp);  // cap only, no delta-heal
    persist(R);
    _syncArmorChange(R);
    itemDetailBus.close();
  };
  /* v2.3.685: worn gear (rendered steel chest/legs) unequips into
     rpg.gearStash -- the bag shows it as a stash tile, and Equip from there
     puts it back on (swapping any currently-worn piece into the stash).
     setEquip drives the renderer directly (same path as the Equipment menu),
     so the armour visibly comes off/on and eqc/eql sync covers remotes. */
  const onUnequipGear = () => {
    const S = getState();
    if (!S || !S.rpg) return;
    const R = S.rpg;
    const slot = target.slot;
    const gearId = getEquip(slot);
    if (!gearId || gearId === 'none') { itemDetailBus.close(); return; }
    if (!R.gearStash) R.gearStash = [];
    R.gearStash.push({ slot, gearId, name: gearName(slot, gearId) });
    setEquip(slot, 'none');
    persist(R);
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
          background: 'rgba(20,22,32,0.98)',
          border: '1px solid ' + COL.border,
          borderRadius: 8,
          padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
          color: COL.text,
          fontFamily: 'Source Sans 3, sans-serif',
          boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
          opacity: pos ? 1 : 0,
        }}
      >
        <div style={{ position: 'relative', width: 80, height: 80, alignSelf: 'center' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + COL.border,
            borderRadius: 6,
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
              background: 'rgba(15,17,26,0.92)',
              border: '1px solid #f5c542',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, lineHeight: 1,
            }}>⚓</div>
          )}
        </div>

        <div style={{
          fontSize: 14, fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '.02em',
        }}>{name}</div>

        {info && (
          <div style={{
            fontSize: 11, color: COL.text,
            textAlign: 'center',
            padding: '4px 0',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 5,
          }}>{info}</div>
        )}

        {desc && (
          <div style={{
            fontSize: 10, color: COL.muted,
            textAlign: 'center',
          }}>{desc}</div>
        )}

        <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
          {actions.light    && <button onClick={onLight}   style={buttonStyle('primary')}>Light fire</button>}
          {actions.eat      && <button onClick={onEat}     style={buttonStyle('primary')}>Eat</button>}
          {actions.equip    && <button onClick={onEquip}   style={buttonStyle('primary')}>Equip</button>}
          {actions.unequip  && <button onClick={onUnequip} style={buttonStyle('danger')}>Unequip</button>}
          <button onClick={onToggleLock} style={buttonStyle()}>
            {locked ? '⚓ Unanchor' : '⚓ Anchor'}
          </button>
          <button onClick={onClose} style={buttonStyle()}>X</button>
        </div>
      </div>
    </div>
  );
};

function persist(R) {
  try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}
