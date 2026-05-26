import React, { useEffect, useState } from 'react';
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

/* Stat-free damage range + DPS for a weapon. Mirrors the dashboard's
   loadout calc with statVal=0 so the popup reads "this weapon's base
   stats" rather than "this weapon plus my current build". */
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

/* Lookup the tier label for a weapon's gearBase. Both metal-tier and
   wood-tier weapons use the same `gearBase` field with different
   keys. */
function tierLabel(wpn) {
  if (!wpn || !wpn.gearBase) return '';
  const tbl = (wpn.gearBase || '').startsWith && wpn.type === 'bow'
    ? WOODWORKING_TIERS
    : BLACKSMITH_TIERS;
  const tier = tbl[wpn.gearBase] || WOODWORKING_TIERS[wpn.gearBase];
  return tier ? tier.label : wpn.gearBase;
}

/* Resolve the popup's "lock key" + display fields for the current
   target. Lives outside the component so the render stays focused. */
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
    if (isCookedFish) {
      info = '+' + getFishHealAmount(key) + ' HP when eaten';
    } else if (isRawFish) {
      info = 'Cook to make edible';
    } else if (isBurnt) {
      info = 'Inedible';
    } else if (count > 0) {
      info = 'Quantity: ' + count;
    }
    return {
      lockKey: key,
      thumb: thumbFor(key),
      glyph: iconFor(key),
      name: prettyName(key),
      info,
      desc: cat.charAt(0).toUpperCase() + cat.slice(1),
      actions: {
        cook: isRawFish && count > 0,
        eat:  isCookedFish && count > 0,
      },
    };
  }
  if (target.kind === 'weapon') {
    const wpn = target.wpn;
    if (!wpn) return null;
    const range = weaponDmgRange(wpn);
    const isRanged = wpn.type === 'bow';
    const isStaff = wpn.type === 'staff';
    const lockKey = target.slot === 'ranged' ? 'rangedWeapon'
                  : target.slot === 'staff'  ? 'staffWeapon'
                  : 'weapon';
    return {
      lockKey,
      thumb: isRanged ? '/sprites/weapons/bows/Bow2.png?v=2.3.173'
           : isStaff  ? '/sprites/weapons/staffs/Wizard%20Staff2.png?v=2.3.173'
           : (wpn.gearBase === 'wood' ? '/sprites/weapons/swords/Bamboo.png?v=2.3.173'
                                       : '/sprites/weapons/swords/Sword1.png?v=2.3.173'),
      glyph: null,
      name: wpn.name || 'Weapon',
      info: range ? ('Damage ' + range.dmgText + ' · DPS ' + range.dps) : null,
      desc: tierLabel(wpn) + ' · ' + (wpn.type || '').charAt(0).toUpperCase() + (wpn.type || '').slice(1),
      actions: {
        unequip: true,
      },
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
  padding: '10px 0',
  background: variant === 'primary' ? COL.accent
             : variant === 'danger'  ? '#a73a3a'
             :                         'rgba(255,255,255,0.06)',
  color: COL.text,
  border: '1px solid ' + COL.border,
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
  fontFamily: 'Source Sans 3, sans-serif',
});

export const ItemDetailPopup = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const u1 = itemDetailBus.subscribe(() => force((v) => v + 1));
    const u2 = subscribeLocks(() => force((v) => v + 1));
    return () => { u1(); u2(); };
  }, []);

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
  const onUnequip = () => {
    /* Swap current equipped weapon back into the stash. If no stash
       array exists yet, create it. Leaves the active slot empty
       (unarmed) until the player picks up or equips something else. */
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
    try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    itemDetailBus.close();
  };
  const onToggleLock = () => {
    if (locked) unlockItem(lockKey);
    else        lockItem(lockKey);
  };
  const onClose = () => itemDetailBus.close();

  return (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(320px, 90vw)',
          maxHeight: '85vh',
          background: 'rgba(20,22,32,0.98)',
          border: '1px solid ' + COL.border,
          borderRadius: 10,
          padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
          color: COL.text,
          fontFamily: 'Source Sans 3, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {/* Large icon with optional lock glyph in upper-right. */}
        <div style={{ position: 'relative', width: 128, height: 128, alignSelf: 'center' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + COL.border,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64,
          }}>
            {thumb
              ? <img src={thumb} alt={name} draggable={false}
                  style={{ width: '85%', height: '85%', objectFit: 'contain', imageRendering: 'auto' }} />
              : <span>{glyph}</span>}
          </div>
          {locked && (
            <div style={{
              position: 'absolute',
              top: 4, right: 4,
              width: 22, height: 22,
              background: 'rgba(15,17,26,0.92)',
              border: '1px solid #f5c542',
              borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#f5c542',
              fontWeight: 900,
            }}>L</div>
          )}
        </div>

        {/* Name on own line, bold. */}
        <div style={{
          fontSize: 18, fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '.02em',
        }}>{name}</div>

        {/* Type-specific info block. */}
        {info && (
          <div style={{
            fontSize: 13, color: COL.text,
            textAlign: 'center',
            padding: '6px 0',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
          }}>{info}</div>
        )}

        {/* Description / tier label. */}
        {desc && (
          <div style={{
            fontSize: 12, color: COL.muted,
            textAlign: 'center',
          }}>{desc}</div>
        )}

        <div style={{ flex: 1 }} />

        {/* Action buttons. Lock + Close are always present; type-
            specific primary action is leftmost. */}
        <div style={{ display: 'flex', gap: 8 }}>
          {actions.cook && (
            <button onClick={onCook} style={buttonStyle('primary')}>Cook</button>
          )}
          {actions.eat && (
            <button onClick={onEat} style={buttonStyle('primary')}>Eat</button>
          )}
          {actions.unequip && (
            <button onClick={onUnequip} style={buttonStyle('danger')}>Unequip</button>
          )}
          <button onClick={onToggleLock} style={buttonStyle()}>
            {locked ? 'Unlock' : 'Lock'}
          </button>
          <button onClick={onClose} style={buttonStyle()}>Close</button>
        </div>
      </div>
    </div>
  );
};
