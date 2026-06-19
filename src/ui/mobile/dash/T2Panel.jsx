import React, { useEffect, useState } from 'react';
import { COL, panelStyle, rowStyle } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import {
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_META,
  WEAPON_CHANNELS,
  WEAPON_CHANNEL_CAP,
  weaponXpRequired,
  activeWeaponCategory,
  recalcDerived,
  DEFENSE_CHANNELS,
  DEFENSE_CHANNEL_CAP,
} from '../../../data/gameSystems.js';

/* v2.3.911: lets the dashboard open this panel jumped to a specific tab.
   The dashboard calls requestT2Category(cat) then pushes the 't2' panel;
   the component consumes the pending value on its next render. */
let _pendingCat = null;
export function requestT2Category(cat) { _pendingCat = cat; }

/* v2.3.693: Defense is a 4th tab.  Its data lives in rpg.defenseSkill /
   defenseSpec / defenseUnspent (not the weapon maps) and it trains by
   blocking / mitigating rather than dealing damage, but the panel shape is
   identical so it shares the tab strip + channel rows below. */
const DEF_TAB = 'defense';
const DEF_META = { label: 'Defense', emoji: '\u{1F6E1}' };

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
  /* v2.3.911: if the dashboard asked us to open on a specific tab, adopt it
     (runs after every render; consumes the pending value once). */
  useEffect(() => {
    if (_pendingCat) { setCat(_pendingCat); _pendingCat = null; }
  });

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
  const isDef = activeCat === DEF_TAB;
  const skills = R.weaponSkills || {};
  const specs = R.weaponSpecs || {};
  const pools = R.weaponUnspent || {};

  /* Source the selected tab's skill / spec / pool / channels from either the
     Defense fields or the weapon maps. */
  const sk = isDef ? (R.defenseSkill || { level: 0, xp: 0 }) : (skills[activeCat] || { level: 0, xp: 0 });
  const catSpecs = isDef ? (R.defenseSpec || {}) : (specs[activeCat] || {});
  const unspent = isDef ? (R.defenseUnspent || 0) : (pools[activeCat] || 0);
  const channels = isDef ? DEFENSE_CHANNELS : (WEAPON_CHANNELS[activeCat] || []);
  const channelCap = isDef ? DEFENSE_CHANNEL_CAP : WEAPON_CHANNEL_CAP;
  const need = weaponXpRequired(sk.level || 0);
  const xpPct = need > 0 ? Math.max(0, Math.min(100, ((sk.xp || 0) / need) * 100)) : 0;

  /* v2.3.911: spending now goes through a confirmation window.  Keep the
     guards here, then hand the channel context to spendConfirmBus; the
     SpendPointConfirm overlay applies the point (recalcDerived + persist)
     after the player confirms. */
  const addPoint = (key, active) => {
    if (!active) return;
    if (unspent <= 0) return;
    if ((catSpecs[key] || 0) >= channelCap) return;
    const ch = channels.find((c) => c.key === key);
    if (!ch) return;
    spendConfirmBus.open({
      isDef,
      cat: activeCat,
      key,
      channel: ch,
      current: (catSpecs[key] || 0),
      skillLabel: isDef ? DEF_META.label : ((WEAPON_CATEGORY_META[activeCat] || {}).label || activeCat),
    });
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
            Builds
          </div>
          <div style={{ fontSize: 11, color: COL.muted, marginTop: 2 }}>
            {isDef
              ? 'Block & mitigate hits to level Defense. Each level = +5 points.'
              : 'Deal damage to level a weapon. Each level = +5 points.'}
          </div>
        </div>
      </div>

      {/* Category tabs — weapon categories + the Defense tab (v2.3.693). */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[...WEAPON_CATEGORIES, DEF_TAB].map((c) => {
          const cIsDef = c === DEF_TAB;
          const meta = cIsDef ? DEF_META : (WEAPON_CATEGORY_META[c] || { label: c, emoji: '' });
          const lvl = cIsDef ? ((R.defenseSkill && R.defenseSkill.level) || 0) : ((skills[c] && skills[c].level) || 0);
          const p = cIsDef ? (R.defenseUnspent || 0) : (pools[c] || 0);
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
            {(isDef ? DEF_META : (WEAPON_CATEGORY_META[activeCat] || {})).label} skill · Lv {sk.level || 0}
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
        const atCap = v >= channelCap;
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
              <div style={{ fontSize: 10, color: COL.gold }}>Max ({channelCap}).</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
