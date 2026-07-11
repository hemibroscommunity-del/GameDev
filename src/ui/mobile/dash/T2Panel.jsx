import React, { useEffect, useState } from 'react';
import { COL, panelStyle, rowStyle } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import {
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_META,
  WEAPON_CHANNELS,
  WEAPON_CHANNEL_CAP,
  WEAPON_LEVEL_CAP,
  weaponXpRequired,
  xpRequired,
  activeWeaponCategory,
  recalcDerived,
  DEFENSE_CHANNELS,
  DEFENSE_CHANNEL_CAP,
  HP_CHANNELS,
  ENDURANCE_CHANNELS,
  GRID_CHANNEL_CAP,
  combatBuildTotal,
  COMBAT_BUILD_CEILING,
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

/* v2.3.1154: HP + Endurance grid tabs.  Unlike the weapon/defense skills
   these have no separate skill track — the STAT is the level (vitality /
   endurance, use-trained via addBuildProg) and each stat level grants
   +1 point into the matching pool.  Spending is gated on the worker's
   caps.hpEndGrids (deploy-order safety): against an old worker the
   channels render as "Soon" so points can't be spent into multipliers
   the worker would stomp. */
const GRID_TABS = {
  hp: {
    stat: 'vitality', label: 'HP', emoji: '❤️',
    channels: HP_CHANNELS, specKey: 'hpSpec', poolKey: 'hpUnspent',
  },
  endurance: {
    stat: 'endurance', label: 'Endur.', emoji: '⚡',
    channels: ENDURANCE_CHANNELS, specKey: 'enduranceSpec', poolKey: 'enduranceUnspent',
  },
};

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
   grants +1 point spent into that category's channels (was +5 before
   v2.3.910's build-skill restructure).  Channels flagged "Soon" are
   allocatable-but-inert until their combat wiring ships. */
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
  const gridTab = GRID_TABS[activeCat] || null;
  const skills = R.weaponSkills || {};
  const specs = R.weaponSpecs || {};
  const pools = R.weaponUnspent || {};

  /* v2.3.1154: grid spending is caps-gated (see GRID_TABS comment).
     Offline / pre-worker sessions stay live (legacy client-local play). */
  const gridsLive = !S.channel || !!(S._serverCaps && S._serverCaps.hpEndGrids);
  /* v2.3.1156: uniform 100-pt caps are ALSO caps-gated — an old worker
     clamps weapon specs at 99 and defense/grid specs at 50, so spending
     past the legacy caps against it would be truncated on echo. */
  const t2uniform = !S.channel || !!(S._serverCaps && S._serverCaps.t2uniform);
  const LEGACY_WEAPON_CAP = 99, LEGACY_GRID_CAP = 50;
  /* v2.3.1157: the 1000-point combat ceiling — total allocation across
     all six grids.  Server enforces (_clampBuildTotal); the panel shows
     the meter and refuses spends at the line. */
  const buildTotal = combatBuildTotal(R);
  const atCeiling = t2uniform && buildTotal >= COMBAT_BUILD_CEILING;

  /* Source the selected tab's skill / spec / pool / channels from the
     Defense fields, a grid tab, or the weapon maps. */
  const sk = gridTab
    ? { level: R[gridTab.stat] || 0, xp: (R._buildProg && R._buildProg[gridTab.stat]) || 0 }
    : isDef ? (R.defenseSkill || { level: 0, xp: 0 }) : (skills[activeCat] || { level: 0, xp: 0 });
  const catSpecs = gridTab ? (R[gridTab.specKey] || {}) : isDef ? (R.defenseSpec || {}) : (specs[activeCat] || {});
  const unspent = gridTab ? (R[gridTab.poolKey] || 0) : isDef ? (R.defenseUnspent || 0) : (pools[activeCat] || 0);
  const channels = gridTab
    ? (gridsLive ? gridTab.channels : gridTab.channels.map((ch) => ({ ...ch, active: false })))
    : isDef ? DEFENSE_CHANNELS : (WEAPON_CHANNELS[activeCat] || []);
  const channelCap = t2uniform
    ? (gridTab ? GRID_CHANNEL_CAP : isDef ? DEFENSE_CHANNEL_CAP : WEAPON_CHANNEL_CAP)
    : (gridTab || isDef ? LEGACY_GRID_CAP : LEGACY_WEAPON_CAP);
  /* Grid tabs level via the STAT's own training curve (addBuildProg
     threshold); weapon/defense tabs keep their damage-driven curve. */
  const need = gridTab
    ? Math.max(200, Math.floor(xpRequired(sk.level || 0)))
    : weaponXpRequired(sk.level || 0);
  const xpPct = need > 0 ? Math.max(0, Math.min(100, ((sk.xp || 0) / need) * 100)) : 0;

  /* v2.3.911: spending now goes through a confirmation window.  Keep the
     guards here, then hand the channel context to spendConfirmBus; the
     SpendPointConfirm overlay applies the point (recalcDerived + persist)
     after the player confirms. */
  const addPoint = (key, active) => {
    if (!active) return;
    if (atCeiling) return; /* v2.3.1157: build complete at 1000 */
    if (unspent <= 0) return;
    if ((catSpecs[key] || 0) >= channelCap) return;
    const ch = channels.find((c) => c.key === key);
    if (!ch) return;
    spendConfirmBus.open({
      isDef,
      /* v2.3.1154: grid tabs hand the confirm popup their field names so
         it can apply the point generically. */
      gridSpecKey: gridTab ? gridTab.specKey : null,
      gridPoolKey: gridTab ? gridTab.poolKey : null,
      cat: activeCat,
      key,
      channel: ch,
      current: (catSpecs[key] || 0),
      skillLabel: gridTab ? gridTab.label : isDef ? DEF_META.label : ((WEAPON_CATEGORY_META[activeCat] || {}).label || activeCat),
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
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'baseline', gap: 8 }}>
            Builds
            {/* v2.3.1157: the combat build meter — a character finishes
                at 1000 allocated points (1/3 of the 3000-slot grid). */}
            {t2uniform && (
              <span style={{ fontSize: 10, fontWeight: 700, color: atCeiling ? COL.gold : COL.muted }}>
                {buildTotal}/{COMBAT_BUILD_CEILING}{atCeiling ? ' · complete' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: COL.muted, marginTop: 2 }}>
            {/* v2.3.1133: label caught up with v2.3.910's 1-pt-per-level change */}
            {gridTab
              ? (gridTab.stat === 'vitality'
                ? 'Taking part in combat trains Vitality. Each level = +1 point.'
                : 'Sprinting, blocking & rolling train Endurance. Each level = +1 point.')
              : isDef
                ? 'Block & mitigate hits to level Defense. Each level = +1 point.'
                : 'Deal damage to level a weapon. Each level = +1 point.'}
          </div>
        </div>
      </div>

      {/* Category tabs — weapon categories + Defense (v2.3.693) + the
          HP/Endurance grids (v2.3.1154). */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[...WEAPON_CATEGORIES, DEF_TAB, ...Object.keys(GRID_TABS)].map((c) => {
          const cIsDef = c === DEF_TAB;
          const cGrid = GRID_TABS[c] || null;
          const meta = cGrid ? cGrid : cIsDef ? DEF_META : (WEAPON_CATEGORY_META[c] || { label: c, emoji: '' });
          const lvl = cGrid ? (R[cGrid.stat] || 0) : cIsDef ? ((R.defenseSkill && R.defenseSkill.level) || 0) : ((skills[c] && skills[c].level) || 0);
          const p = cGrid ? (R[cGrid.poolKey] || 0) : cIsDef ? (R.defenseUnspent || 0) : (pools[c] || 0);
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
            {(gridTab || (isDef ? DEF_META : (WEAPON_CATEGORY_META[activeCat] || {}))).label} skill · Lv {sk.level || 0}
            {/* v2.3.1207: cap is WEAPON_LEVEL_CAP (100 since v2.3.1156) — the stale 99 literal showed "(Max)" one level early. */}
            {(sk.level || 0) >= WEAPON_LEVEL_CAP ? ' (Max)' : ` · ${Math.round(xpPct)}% to next`}
          </div>
          <div style={{ height: 4, background: 'rgba(34, 48, 60, 0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: xpPct + '%', height: '100%', background: 'rgba(91,82,255,0.85)', transition: 'width .15s linear' }} />
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: unspent > 0 ? COL.accent : COL.muted,
          background: 'rgba(34, 48, 60, 0.05)',
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid ' + COL.border,
          whiteSpace: 'nowrap',
        }}>
          {unspent} pts
        </div>
      </div>

      {/* v2.3.1154: old-worker notice — grid channels render as "Soon"
          until the connected worker advertises caps.hpEndGrids. */}
      {gridTab && !gridsLive && (
        <div style={{ fontSize: 11, color: COL.gold, marginBottom: 8 }}>
          Unlocking with the next server update — your points are safe.
        </div>
      )}

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
                    background: canAdd ? COL.accent : 'rgba(34, 48, 60, 0.10)',
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
