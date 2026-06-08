import React, { useEffect, useState } from 'react';
import { COL, panelStyle, rowStyle } from './common.js';
import {
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_META,
  WEAPON_CHANNELS,
  WEAPON_CHANNEL_CAP,
  weaponXpRequired,
  activeWeaponCategory,
  recalcDerived,
} from '../../../data/gameSystems.js';

function persist(R) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    }
  } catch (e) {}
}

/* Per-weapon-CATEGORY build allocation.  Replaces the retired generic
   "Specs" (Ferocity/Elemental Mastery/…).  Each category levels its own
   skill by dealing damage with a weapon of that category; each level
   grants +5 points spent into that category's channels.  Damage + crit
   channels are live; the rest are flagged "Soon" until their combat
   wiring ships. */
export const T2Panel = () => {
  const [, force] = useState(0);
  const [cat, setCat] = useState(null);
  useEffect(() => {
    /* Light polling; the panel is tiny and only mounts when open. */
    const id = setInterval(() => force((v) => v + 1), 250);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || null;
  if (!R) {
    return (
      <div style={panelStyle}>
        <div style={{ color: COL.muted, textAlign: 'center', padding: '14px 0' }}>
          No character loaded.
        </div>
      </div>
    );
  }

  /* Default the selected tab to whatever's equipped right now. */
  const activeCat = cat || activeWeaponCategory(R);
  const skills = R.weaponSkills || {};
  const specs = R.weaponSpecs || {};
  const pools = R.weaponUnspent || {};

  const sk = skills[activeCat] || { level: 0, xp: 0 };
  const catSpecs = specs[activeCat] || {};
  const unspent = pools[activeCat] || 0;
  const channels = WEAPON_CHANNELS[activeCat] || [];
  const need = weaponXpRequired(sk.level || 0);
  const xpPct = need > 0 ? Math.max(0, Math.min(100, ((sk.xp || 0) / need) * 100)) : 0;

  const addPoint = (key, active) => {
    if (!active) return;
    if ((pools[activeCat] || 0) <= 0) return;
    if ((catSpecs[key] || 0) >= WEAPON_CHANNEL_CAP) return;
    if (!R.weaponSpecs) R.weaponSpecs = {};
    if (!R.weaponSpecs[activeCat]) R.weaponSpecs[activeCat] = {};
    R.weaponSpecs[activeCat][key] = (R.weaponSpecs[activeCat][key] || 0) + 1;
    R.weaponUnspent[activeCat] -= 1;
    recalcDerived(R);
    persist(R);
    force((v) => v + 1);
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 2px 8px',
        borderBottom: '1px solid ' + COL.divider,
        marginBottom: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em' }}>
            Weapon Builds
          </div>
          <div style={{ fontSize: 11, color: COL.muted, marginTop: 2 }}>
            Deal damage to level a weapon. Each level = +5 points.
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {WEAPON_CATEGORIES.map((c) => {
          const meta = WEAPON_CATEGORY_META[c] || { label: c, emoji: '' };
          const lvl = (skills[c] && skills[c].level) || 0;
          const p = pools[c] || 0;
          const sel = c === activeCat;
          return (
            <button
              key={c}
              onPointerUp={(e) => { e.stopPropagation(); setCat(c); }}
              style={{
                flex: 1,
                position: 'relative',
                background: sel ? 'rgba(91,82,255,0.18)' : COL.tile,
                border: '1px solid ' + (sel ? COL.accent : COL.tileBor),
                borderRadius: 7,
                padding: '6px 4px',
                color: sel ? COL.text : COL.muted,
                cursor: 'pointer',
                touchAction: 'manipulation',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{meta.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{meta.label}</span>
              <span style={{ fontSize: 9, color: sel ? COL.accent : COL.muted }}>Lv {lvl}</span>
              {p > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -4,
                  background: COL.accent, color: '#fff',
                  fontSize: 9, fontWeight: 900,
                  borderRadius: 8, padding: '1px 5px', lineHeight: 1.3,
                }}>{p}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected category skill bar + pool */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: COL.muted, marginBottom: 3 }}>
            {(WEAPON_CATEGORY_META[activeCat] || {}).label} skill · Lv {sk.level || 0}
            {(sk.level || 0) >= 99 ? ' (Max)' : ` · ${Math.round(xpPct)}% to next`}
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: xpPct + '%', height: '100%', background: 'rgba(91,82,255,0.85)', transition: 'width .15s linear' }} />
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: unspent > 0 ? COL.accent : COL.muted,
          background: 'rgba(255,255,255,0.04)',
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid ' + COL.border,
          whiteSpace: 'nowrap',
        }}>
          {unspent} pts
        </div>
      </div>

      {/* Channels */}
      {channels.map((ch) => {
        const v = catSpecs[ch.key] || 0;
        const atCap = v >= WEAPON_CHANNEL_CAP;
        const canAdd = ch.active && unspent > 0 && !atCap;
        return (
          <div key={ch.key} style={{
            ...rowStyle,
            background: COL.tile,
            border: '1px solid ' + COL.tileBor,
            padding: '8px 10px',
            marginBottom: 6,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 3,
            opacity: ch.active ? 1 : 0.55,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{ch.label}</span>
                {!ch.active && (
                  <span style={{ fontSize: 9, color: COL.gold, letterSpacing: '0.08em' }}>SOON</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: v > 0 ? COL.text : COL.muted,
                  minWidth: 26, textAlign: 'right',
                }}>{v}</span>
                <button
                  onPointerUp={(e) => { e.stopPropagation(); if (canAdd) addPoint(ch.key, ch.active); }}
                  disabled={!canAdd}
                  style={{
                    width: 28, height: 28,
                    background: canAdd ? COL.accent : 'rgba(255,255,255,0.06)',
                    color: canAdd ? '#fff' : COL.muted,
                    border: '1px solid ' + COL.border,
                    borderRadius: 6,
                    fontSize: 16, fontWeight: 900,
                    cursor: canAdd ? 'pointer' : 'default',
                    touchAction: 'manipulation',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >+</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: COL.muted }}>{ch.blurb}</div>
            {ch.active && (
              <div style={{ fontSize: 11, color: COL.text }}>{ch.derive(v)}</div>
            )}
            {atCap && (
              <div style={{ fontSize: 10, color: COL.gold }}>Max ({WEAPON_CHANNEL_CAP}).</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
