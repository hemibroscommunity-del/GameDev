import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import { recalcDerived, WEAPON_CHANNEL_CAP, DEFENSE_CHANNEL_CAP } from '../../../data/gameSystems.js';

/* v2.3.911: confirmation window for spending a build-skill Tier-2 point.
   Shows the channel's current effect vs the effect after +1 (via the
   channel's own derive(v)), and applies the point on Confirm — re-checking
   the pool + cap guards in case state changed while the dialog was open. */

function persist(R) {
  try { if (typeof window !== 'undefined') localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
}

export const SpendPointConfirm = () => {
  const [, force] = useState(0);
  useEffect(() => spendConfirmBus.subscribe(() => force((v) => v + 1)), []);

  const t = spendConfirmBus.state.open ? spendConfirmBus.state.target : null;
  if (!t || !t.channel) return null;

  const ch = t.channel;
  const current = t.current || 0;
  const before = ch.derive ? ch.derive(current) : ('' + current);
  const after = ch.derive ? ch.derive(current + 1) : ('' + (current + 1));

  const onConfirm = () => {
    const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (R) {
      if (t.isDef) {
        if (!R.defenseSpec) R.defenseSpec = {};
        if ((R.defenseUnspent || 0) > 0 && (R.defenseSpec[t.key] || 0) < DEFENSE_CHANNEL_CAP) {
          R.defenseSpec[t.key] = (R.defenseSpec[t.key] || 0) + 1;
          R.defenseUnspent -= 1;
        }
      } else {
        if (!R.weaponSpecs) R.weaponSpecs = {};
        if (!R.weaponSpecs[t.cat]) R.weaponSpecs[t.cat] = {};
        const pool = (R.weaponUnspent && R.weaponUnspent[t.cat]) || 0;
        if (pool > 0 && (R.weaponSpecs[t.cat][t.key] || 0) < WEAPON_CHANNEL_CAP) {
          R.weaponSpecs[t.cat][t.key] = (R.weaponSpecs[t.cat][t.key] || 0) + 1;
          R.weaponUnspent[t.cat] -= 1;
        }
      }
      recalcDerived(R);
      persist(R);
    }
    spendConfirmBus.close();
  };

  return (
    <div
      onPointerUp={(e) => { e.stopPropagation(); spendConfirmBus.close(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          background: COL.bg, border: '1px solid ' + COL.border, borderRadius: 10,
          padding: 16, width: 280, maxWidth: '86vw',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          fontFamily: 'Source Sans 3, sans-serif', color: COL.text,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>Apply 1 point?</div>
        <div style={{ fontSize: 12, color: COL.muted, marginBottom: 10 }}>
          {t.skillLabel ? t.skillLabel + ' · ' : ''}{ch.label}
        </div>
        <div style={{
          background: COL.tile, border: '1px solid ' + COL.tileBor, borderRadius: 6,
          padding: '8px 10px', marginBottom: 12, fontSize: 12,
        }}>
          <div style={{ color: COL.muted }}>Now: {before}</div>
          <div style={{ color: COL.accent, fontWeight: 700, marginTop: 2 }}>After: {after}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onPointerUp={(e) => { e.stopPropagation(); onConfirm(); }}
            style={{
              flex: 1, padding: '10px 0', background: COL.accent, color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 13,
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >Confirm</button>
          <button
            onPointerUp={(e) => { e.stopPropagation(); spendConfirmBus.close(); }}
            style={{
              flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', color: COL.text,
              border: '1px solid ' + COL.border, borderRadius: 6, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
};
