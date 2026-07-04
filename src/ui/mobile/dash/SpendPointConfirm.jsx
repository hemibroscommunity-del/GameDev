import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import { recalcDerived, WEAPON_CHANNEL_CAP, DEFENSE_CHANNEL_CAP, GRID_CHANNEL_CAP, combatBuildTotal, COMBAT_BUILD_CEILING } from '../../../data/gameSystems.js';

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
    /* v2.3.1157: the 1000-point combat ceiling — re-checked here like
       the pool/cap guards, in case state moved while the dialog was
       open.  The server's _clampBuildTotal is the authority. */
    if (R && combatBuildTotal(R) >= COMBAT_BUILD_CEILING) {
      spendConfirmBus.close();
      return;
    }
    if (R) {
      if (t.gridSpecKey) {
        /* v2.3.1154: HP/Endurance grid spend — the panel passes the rpg
           field names (hpSpec/hpUnspent or enduranceSpec/enduranceUnspent)
           so this stays generic.  Server re-clamps [0,50] + the grid
           budget (sum <= governing stat). */
        if (!R[t.gridSpecKey]) R[t.gridSpecKey] = {};
        if ((R[t.gridPoolKey] || 0) > 0 && (R[t.gridSpecKey][t.key] || 0) < GRID_CHANNEL_CAP) {
          R[t.gridSpecKey][t.key] = (R[t.gridSpecKey][t.key] || 0) + 1;
          R[t.gridPoolKey] -= 1;
        }
      } else if (t.isDef) {
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
      /* v2.3.1021: flush the spend to the worker immediately.  This popup
         mutates S.rpg directly (no setRpgState), so BroTown's React-driven
         stats_update effect doesn't fire on its own -- and now that the
         server persists + echoes the weapon/defense skill track, an un-synced
         spend would be clobbered by the stored copy on the next reconnect.
         Mirrors ItemDetailPopup._syncArmorChange's direct push; the server
         applies partial payloads (each field presence-gated) + clamps. */
      try {
        if (S && S.channel) {
          S.channel.send({ type: 'stats_update', payload: {
            weaponSpecs: R.weaponSpecs || {},
            weaponUnspent: R.weaponUnspent || {},
            weaponSkills: R.weaponSkills || {},
            defenseSpec: R.defenseSpec || {},
            defenseUnspent: (typeof R.defenseUnspent === 'number') ? R.defenseUnspent : 0,
            defenseSkill: R.defenseSkill || { level: 0, xp: 0 },
            /* v2.3.1154: HP/Endurance grid track rides the same flush. */
            hpSpec: R.hpSpec || {},
            hpUnspent: (typeof R.hpUnspent === 'number') ? R.hpUnspent : 0,
            enduranceSpec: R.enduranceSpec || {},
            enduranceUnspent: (typeof R.enduranceUnspent === 'number') ? R.enduranceUnspent : 0,
          } });
        }
      } catch (e) {}
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
