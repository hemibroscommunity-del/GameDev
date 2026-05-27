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
import { cookingBus } from '../cookingBus.js';
import { eatBus } from '../eatBus.js';
import {
  WEAPON_TYPES,
  SWING_COOLDOWN,
  BLACKSMITH_TIERS,
  WOODWORKING_TIERS,
  getFishHealAmount,
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
  return wpn.gearBase === 'wood'
    ? `/sprites/weapons/swords/Bamboo.png?v=${v}`
    : `/sprites/weapons/swords/Sword1.png?v=${v}`;
}

function shieldThumb(shield) {
  const v = '2.3.210';
  if (shield && shield.gearBase === 'wood') return `/sprites/weapons/shields/Wood.png?v=${v}`;
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
    let info = null;
    if (isCookedFish) info = '+' + getFishHealAmount(key) + ' HP when eaten';
    else if (isRawFish) info = 'Cook to make edible';
    else if (isBurnt) info = 'Inedible';
    else if (count > 0) info = 'Quantity: ' + count;
    return {
      lockKey: key,
      thumb: thumbFor(key),
      glyph: iconFor(key),
      name: prettyName(key),
      info,
      desc: cat.charAt(0).toUpperCase() + cat.slice(1),
      actions: { cook: isRawFish && count > 0, eat: isCookedFish && count > 0 },
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
  return null;
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
  const resolved = resolveTarget(target);
  if (!resolved) return null;
  const { lockKey, thumb, glyph, name, info, desc, actions } = resolved;
  const locked = itemIsLocked(lockKey);

  const onCook = () => {
    cookingBus.open(target.key);
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
  const onToggleLock = () => {
    if (locked) unlockItem(lockKey);
    else        lockItem(lockKey);
  };
  const onClose = () => itemDetailBus.close();

  /* Final unequip handler: dispatch on target.kind. */
  const onUnequip = () => {
    if (target.kind === 'shield') onUnequipShield();
    else                          onUnequipWeapon();
  };
  const onEquip = () => {
    if (target.kind === 'stashShield') onEquipStashShield();
    else                                onEquipStashWeapon();
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
            <div style={{
              position: 'absolute', top: 2, right: 2,
              width: 18, height: 18,
              background: 'rgba(15,17,26,0.92)',
              border: '1px solid #f5c542',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#f5c542',
              fontWeight: 900,
            }}>L</div>
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
          {actions.cook     && <button onClick={onCook}    style={buttonStyle('primary')}>Cook</button>}
          {actions.eat      && <button onClick={onEat}     style={buttonStyle('primary')}>Eat</button>}
          {actions.equip    && <button onClick={onEquip}   style={buttonStyle('primary')}>Equip</button>}
          {actions.unequip  && <button onClick={onUnequip} style={buttonStyle('danger')}>Unequip</button>}
          <button onClick={onToggleLock} style={buttonStyle()}>
            {locked ? 'Unlock' : 'Lock'}
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
