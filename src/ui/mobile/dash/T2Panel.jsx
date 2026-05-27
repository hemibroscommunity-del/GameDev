import React, { useEffect, useState } from 'react';
import { COL, panelStyle, rowStyle } from './common.js';
import {
  calcCritChance,
  calcCritMult,
  calcBlockReduction,
  recalcDerived,
} from '../../../data/gameSystems.js';

const T2_CAP = 99;

/* The 5 GDD §1.3 specs.  Each entry's `derive` returns a short readout
   of the current primary effect, computed from the live rpg state.
   v2.3.235: allocation-only -- training hooks are deferred per the plan. */
const SPECS = [
  {
    key: 'ferocity',
    label: 'Ferocity',
    style: 'ATTACK',
    blurb: 'Amps crit chance + crit damage on top of Power.',
    derive: (R) => {
      const pct = (calcCritChance(R.power || 0, R.ferocity || 0) * 100).toFixed(1);
      const mult = calcCritMult(R.power || 0, R.ferocity || 0).toFixed(2);
      return pct + '% crit  ·  x' + mult + ' crit dmg';
    },
  },
  {
    key: 'elementalMastery',
    label: 'Elemental Mastery',
    style: 'ELEMENTS',
    blurb: 'Status damage, collision damage, status duration.',
    derive: (R) => {
      const em = R.elementalMastery || 0;
      const dmg = (1 + em * 0.0015).toFixed(2);
      const dur = (1 + em * 0.0004).toFixed(2);
      return 'x' + dmg + ' status / collision  ·  x' + dur + ' duration';
    },
  },
  {
    key: 'fortification',
    label: 'Fortification',
    style: 'DEFEND',
    blurb: 'Partial-block floor + Thorns + Counter Resonance.',
    derive: (R) => {
      const f = R.fortification || 0;
      /* Active block is now full-invuln; Fortification still feeds the
         partial-block floor reported below for advanced builds. */
      const floor = (0.08 + f * 0.0003).toFixed(2);
      const counter = (0.03 + f * 0.00008).toFixed(2);
      return 'partial floor ' + floor + '  ·  counter ' + counter;
    },
  },
  {
    key: 'restoration',
    label: 'Restoration',
    style: 'SUSTAIN',
    blurb: 'All regen rates + collision mana restore + healing.',
    derive: (R) => {
      const r = R.restoration || 0;
      const regen = (1 + r * 0.001).toFixed(2);
      const heal  = (1 + r * 0.0018).toFixed(2);
      return 'x' + regen + ' regen  ·  x' + heal + ' healing';
    },
  },
  {
    key: 'influence',
    label: 'Influence',
    style: 'CONTROL',
    blurb: 'CC durations and debuff potency.',
    derive: (R) => {
      const i = R.influence || 0;
      const cc   = (1 + i * 0.0008).toFixed(2);
      const slow = (1 + i * 0.001).toFixed(2);
      return 'x' + cc + ' CC dur  ·  x' + slow + ' slow / curse';
    },
  },
];

function persist(R) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bt_rpg', JSON.stringify(R));
    }
  } catch (e) {}
}

export const T2Panel = () => {
  const [, force] = useState(0);
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

  const unspent = R.unspentT2 || 0;

  const addPoint = (key) => {
    if ((R.unspentT2 || 0) <= 0) return;
    if ((R[key] || 0) >= T2_CAP) return;
    R[key] = (R[key] || 0) + 1;
    R.unspentT2 -= 1;
    recalcDerived(R);
    persist(R);
    force((v) => v + 1);
  };

  return (
    <div style={panelStyle}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 2px 10px',
        borderBottom: '1px solid ' + COL.divider,
        marginBottom: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em' }}>
            Specializations
          </div>
          <div style={{ fontSize: 11, color: COL.muted, marginTop: 2 }}>
            +5 points per combat level. Tap + to spend.
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

      {SPECS.map((spec) => {
        const v = R[spec.key] || 0;
        const atCap = v >= T2_CAP;
        const canAdd = unspent > 0 && !atCap;
        return (
          <div key={spec.key} style={{
            ...rowStyle,
            background: COL.tile,
            border: '1px solid ' + COL.tileBor,
            padding: '8px 10px',
            marginBottom: 6,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 3,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{spec.label}</span>
                <span style={{ fontSize: 10, color: COL.muted, letterSpacing: '0.08em' }}>
                  {spec.style}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: v > 0 ? COL.text : COL.muted,
                  minWidth: 26, textAlign: 'right',
                }}>{v}</span>
                <button
                  onPointerUp={(e) => { e.stopPropagation(); if (canAdd) addPoint(spec.key); }}
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
            <div style={{ fontSize: 11, color: COL.muted }}>{spec.blurb}</div>
            <div style={{ fontSize: 11, color: COL.text }}>{spec.derive(R)}</div>
            {atCap && (
              <div style={{ fontSize: 10, color: COL.gold }}>Max (99).</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
