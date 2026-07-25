import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { spendConfirmBus } from './spendConfirmBus.js';
import { recalcDerived, WEAPON_CHANNEL_CAP, DEFENSE_CHANNEL_CAP, GRID_CHANNEL_CAP, combatBuildTotal, COMBAT_BUILD_CEILING, isT2SimpleEnabled, isT2BenchEnabled, t2FlatOf, t2BenchRoleOf, t2PointValue, t2BenchLevel, t2SpendLevel } from '../../../data/gameSystems.js';
import { celebrateLevelUps } from '../../../game/levelCelebration.js';

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
  /* v2.3.1451 (bench-locked): when the worker + echo support it, feed
     the derive strings the BANKED total, the next point's value, and
     the benchmark level — the "Now/After" well then shows exactly what
     this point buys against today's monsters.  ctx stays null against
     an old worker (or pre-echo), rendering the legacy strings. */
  const _S0 = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const _R0 = _S0 && _S0.rpg;
  let ctxNow = null, ctxAfter = null;
  if (_R0 && isT2BenchEnabled() && _R0.t2Flat) {
    const _grid = t.gridSpecKey ? (t.gridSpecKey === 'hpSpec' ? 'hp' : 'endurance') : (t.isDef ? 'defense' : t.cat);
    const _role = t2BenchRoleOf(_grid, t.key);
    if (_role) {
      const _total = combatBuildTotal(_R0);
      const _bench = t2BenchLevel(t2SpendLevel(_total)); /* the NEXT point's benchmark */
      const _flat = t2FlatOf(_R0, _grid, t.key);
      const _next = t2PointValue(_role, _bench);
      ctxNow = { flat: _flat, next: _next, bench: _bench };
      ctxAfter = { flat: _flat + _next, next: t2PointValue(_role, t2BenchLevel(t2SpendLevel(_total + 1))), bench: _bench };
    }
  }
  const before = ch.derive ? ch.derive(current, ctxNow) : ('' + current);
  const after = ch.derive ? ch.derive(current + 1, ctxAfter) : ('' + (current + 1));

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
      /* v2.3.1451: remember whether the point actually landed (and
         where) so the bench-locked prediction below banks exactly the
         points that were placed — a pool/cap-blocked tap banks nothing. */
      let _spent = null;
      if (t.gridSpecKey) {
        /* v2.3.1154: HP/Endurance grid spend — the panel passes the rpg
           field names (hpSpec/hpUnspent or enduranceSpec/enduranceUnspent)
           so this stays generic.  Server re-clamps [0,50] + the grid
           budget (sum <= governing stat). */
        if (!R[t.gridSpecKey]) R[t.gridSpecKey] = {};
        if ((R[t.gridPoolKey] || 0) > 0 && (R[t.gridSpecKey][t.key] || 0) < GRID_CHANNEL_CAP) {
          R[t.gridSpecKey][t.key] = (R[t.gridSpecKey][t.key] || 0) + 1;
          R[t.gridPoolKey] -= 1;
          _spent = { grid: t.gridSpecKey === 'hpSpec' ? 'hp' : 'endurance', key: t.key };
        }
      } else if (t.isDef) {
        if (!R.defenseSpec) R.defenseSpec = {};
        if ((R.defenseUnspent || 0) > 0 && (R.defenseSpec[t.key] || 0) < DEFENSE_CHANNEL_CAP) {
          R.defenseSpec[t.key] = (R.defenseSpec[t.key] || 0) + 1;
          R.defenseUnspent -= 1;
          _spent = { grid: 'defense', key: t.key };
        }
      } else {
        if (!R.weaponSpecs) R.weaponSpecs = {};
        if (!R.weaponSpecs[t.cat]) R.weaponSpecs[t.cat] = {};
        const pool = (R.weaponUnspent && R.weaponUnspent[t.cat]) || 0;
        if (pool > 0 && (R.weaponSpecs[t.cat][t.key] || 0) < WEAPON_CHANNEL_CAP) {
          R.weaponSpecs[t.cat][t.key] = (R.weaponSpecs[t.cat][t.key] || 0) + 1;
          R.weaponUnspent[t.cat] -= 1;
          _spent = { grid: t.cat, key: t.key };
        }
      }
      /* v2.3.1451: bench-locked prediction — bank the point's value
         locally with THE SAME formula the server prices the diff with
         (grids.js _t2BenchReprice), so the panel updates instantly and
         the echo is normally a no-op.  Only when the accumulator has
         already arrived (R.t2Flat present): inventing one client-side
         would understate every pre-existing point until the echo, and
         reads fall back to legacy math without it anyway.  The spend
         level derives from the build total (which now INCLUDES the
         just-placed point, hence −1) — never from R.level. */
      if (_spent && isT2BenchEnabled() && R.t2Flat) {
        const _role = t2BenchRoleOf(_spent.grid, _spent.key);
        if (_role) {
          if (!R.t2Flat[_spent.grid]) R.t2Flat[_spent.grid] = {};
          R.t2Flat[_spent.grid][_spent.key] = (R.t2Flat[_spent.grid][_spent.key] || 0)
            + t2PointValue(_role, t2BenchLevel(t2SpendLevel(combatBuildTotal(R) - 1)));
        }
      }
      recalcDerived(R);
      /* v2.3.1342: level-is-build makes THIS the level-up moment — the
         point just placed is +1 combat level.  Light variant: banner +
         chime only; shake and a particle burst under a modal sheet read
         as a bug.  Gated on caps.t2simple — against an old worker the
         spend doesn't raise the authoritative level, so celebrating
         here would lie (its echo would put the level right back). */
      if (isT2SimpleEnabled()) {
        try { celebrateLevelUps(S, R, { light: true }); } catch (e) { void e; }
      }
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

  /* v2.3.1232: Lantern Slate structure pass — modal scrim, world-card
     dialog (strong border, radius 12), recessed comparison well with
     semantic-green "After" line, brass confirm / raised cancel at 44pt. */
  return (
    <div
      onPointerUp={(e) => { e.stopPropagation(); spendConfirmBus.close(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(8,16,20,.56)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
          border: '1px solid rgba(238,242,235,.24)', borderRadius: 12,
          padding: 16, width: 280, maxWidth: '86vw',
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          fontFamily: 'Source Sans 3, sans-serif', color: COL.text,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: COL.text, marginBottom: 3 }}>Apply 1 point?</div>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: COL.muted, marginBottom: 10,
        }}>
          {t.skillLabel ? t.skillLabel + ' · ' : ''}{ch.label}
        </div>
        <div style={{
          background: COL.well, border: '1px solid ' + COL.divider, borderRadius: 8,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
          padding: '8px 10px', marginBottom: 12, fontSize: 12, fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ color: COL.text2 }}>Now: {before}</div>
          {/* v2.3.1232: improvement reads semantic green + the number, never color alone */}
          <div style={{ color: '#59BF91', fontWeight: 700, marginTop: 2 }}>After: {after}</div>
        </div>
        {/* v2.3.1451: the one-sentence bench-locked story, only when live */}
        {ctxNow ? (
          <div style={{ fontSize: 10.5, color: COL.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.35 }}>
            Points keep their number forever — bigger monsters, bigger points.
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onPointerUp={(e) => { e.stopPropagation(); onConfirm(); }}
            style={{
              flex: 1, minHeight: 44, padding: '10px 0', background: COL.accent, color: COL.onAccent,
              border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >Confirm</button>
          <button
            onPointerUp={(e) => { e.stopPropagation(); spendConfirmBus.close(); }}
            style={{
              flex: 1, minHeight: 44, padding: '10px 0',
              background: 'linear-gradient(180deg, #304047 0%, #2B3940 100%)', color: COL.text,
              border: '1px solid ' + COL.border, borderRadius: 11, fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(5,8,10,.18)',
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
};
