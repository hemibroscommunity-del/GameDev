import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COMBAT_SKILLS, skillLevel, skillProgressPct, skillProgress, attributeEffect, deriveHeroStats } from './heroModel.js';
import { IdentityStrip } from './IdentityStrip.jsx';
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx'; /* v2.3.1311 */

/* v2.3.1286: Hero expanded — the detailed character sheet.
   v2.3.1295 (ChatGPT round-4, owner-approved): no longer one long
   vertical feed — Overview, Build and Records are different TASKS, so
   a sticky segmented control under the identity strip gives each a
   focused half-screen view.
   v2.3.1311 (owner spec): Build goes 3x2 with a "BUILD POINTS · N
   AVAILABLE" header and Build·N on the segment when actionable;
   Overview renames DR to Block (the number is shield block, not
   general mitigation) and tightens the stat cards; Records grows
   Lifetime XP + Duels Won cards (Lifetime XP moved here from the
   identity strip, which now shows normalized next-level progress);
   vitals unified on VitalBar; the selected section resets to Overview
   when the sheet fully closes to the bar (it still survives compact
   dips and destination switches).
   Equipment management intentionally lives in Bag, not here. */

const SECTIONS = ['Overview', 'Build', 'Records'];
/* Round-3 §6 state preservation: the selected section survives leaving
   the destination (module-scoped, session-only).  v2.3.1311: reset to
   Overview when Hero is closed all the way to the toolbar — a NEXT
   open is a fresh visit (owner spec); a dip to compact keeps it. */
let _lastSection = 'Overview';
dashboardPanelBus.subscribe(() => {
  if (dashboardPanelBus.state.mode === 'bar') _lastSection = 'Overview';
});

const seg = (active) => ({
  flex: 1,
  minHeight: 36,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
});

export const HeroExpanded = () => {
  const [, force] = useState(0);
  const [section, setSectionState] = useState(_lastSection);
  const setSection = (s) => { _lastSection = s; setSectionState(s); };
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const d = deriveHeroStats(R);
  const cs = R._compStats || {};

  const labeledBar = (kind, label, cur, max) => (
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <img src={VITAL_ICONS[kind]} alt="" draggable={false}
        style={{ width: 15, height: 15, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      <span style={{ flex: 'none', width: 52, fontSize: 11, fontWeight: 700, color: COL.text2 }}>{label}</span>
      <VitalBar kind={kind} cur={cur} max={max} thick={kind === 'hp' ? 12 : 10} />
      <span style={{ flex: 'none', minWidth: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
        {Math.ceil(cur)} / {Math.ceil(max)}
      </span>
    </div>
  );

  /* Overview 3x2 data grid — every derived number in one viewport.
     Values stay neutral (round-4: reserve green for deltas/bonuses).
     Speed drops the "u/s" developer unit.  v2.3.1311: tightened so
     the second row clears the fold on 390x844. */
  const cell = (label, value) => (
    <div key={label} style={{
      background: COL.wellSoft,
      border: `1px solid ${COL.tileBor}`,
      borderRadius: 8,
      padding: '5px 8px 6px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{value}</div>
    </div>
  );

  const totalUnspent = COMBAT_SKILLS.reduce((n, s) => n + buildSkillUnspent(R, s.key), 0);

  return (
    <div style={{ ...panelStyle, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 14 }}>
      <IdentityStrip />

      {/* Sticky segmented control — content scrolls under it.
          v2.3.1311: Build carries an actionable count (Build · N);
          Overview/Records never badge (spec). */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', gap: 2,
        background: COL.bg,
        borderRadius: 10, padding: 2,
        border: `1px solid ${COL.border}`,
        flex: '0 0 auto',
      }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)} style={seg(section === s)}>
            {s === 'Build' && totalUnspent > 0 ? `Build · ${totalUnspent}` : s}
          </button>
        ))}
      </div>

      {section === 'Overview' && (
        <>
          <div style={{ padding: '8px 0 4px' }}>
            {labeledBar('hp', 'HP', R.hp || 0, R.maxHp || 100)}
            {labeledBar('stamina', 'Stamina', R.stamina || 0, R.maxStamina || 100)}
            {labeledBar('mana', 'Mana', R.mana || 0, R.maxMana || 100)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {cell('Damage', d.dmgText)}
            {cell('DPS', d.dps.toFixed(1))}
            {/* v2.3.1311: full name in expanded — and it's BLOCK: the
                number is calcBlockReduction (shield block %), not
                armor/Iron-Skin mitigation, so "Damage Reduction" would
                overclaim. */}
            {cell('Block', `${Math.round(d.block * 100)}%`)}
            {cell('Crit', `${(d.crit * 100).toFixed(1)}%`)}
            {cell('Dodge', `${(d.dodge * 100).toFixed(1)}%`)}
            {cell('Speed', d.speed.toFixed(1))}
          </div>
        </>
      )}

      {section === 'Build' && (
        <>
          {/* Available points, prominent — brass when actionable. */}
          <div style={{
            margin: '8px 0 6px',
            padding: '7px 10px',
            borderRadius: 8,
            background: totalUnspent > 0 ? COL.accentFill : COL.wellSoft,
            border: `1px solid ${totalUnspent > 0 ? COL.accent : COL.tileBor}`,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
            color: totalUnspent > 0 ? COL.accent : COL.text2,
          }}>
            <span>BUILD POINTS</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalUnspent} AVAILABLE</span>
          </div>
          {/* v2.3.1311: six parent cards in a 3x2 grid (spec) — column
              layout per card.  These levels DO advance through combat
              XP (addBuildProg), so the exact-progress line + bar stay
              (spec: bars imply XP — correct here — but must show exact
              numbers).  The +N chip is the parent's own T2 pool. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {COMBAT_SKILLS.map(s => {
              const lvl = skillLevel(R, s.key);
              const pct = skillProgressPct(R, s.key);
              const prog = skillProgress(R, s.key);
              const unspent = buildSkillUnspent(R, s.key);
              const openT2Cat = s.key === 'defense' ? 'defense' : STAT_TO_WEAPON_CAT[s.key];
              return (
                <div key={s.key}
                  className={unspent > 0 ? 'bt-build-flash' : undefined}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (unspent > 0 && openT2Cat) { requestT2Category(openT2Cat); dashboardPanelBus.push('t2'); }
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3,
                    padding: '8px 6px 12px',
                    background: unspent > 0 ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
                    borderRadius: 8,
                    cursor: unspent > 0 ? 'pointer' : 'default',
                    touchAction: 'none',
                    minWidth: 0,
                  }}>
                  {unspent > 0 && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 4, right: 4,
                      background: COL.accent, color: '#20170D',
                      fontSize: 10, fontWeight: 900,
                      borderRadius: 7, padding: '1px 5px', lineHeight: 1.3,
                      pointerEvents: 'none',
                    }}>+{unspent}</span>
                  )}
                  <img src={s.iconSrc} alt="" draggable={false}
                    style={{ width: 28, height: 28, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0, maxWidth: '100%' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{s.label}</span>
                    <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl}</span>
                  </div>
                  {/* Current gameplay effect (real formulas only). */}
                  <div style={{ fontSize: 9.5, color: COL.muted, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {attributeEffect(R, s.key)}
                  </div>
                  {/* Exact XP progress toward the next level of THIS
                      parent (round-4: a bare bar reads as decoration). */}
                  {prog && (
                    <div style={{ fontSize: 9.5, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
                      {prog.prog} / {prog.thresh} XP
                    </div>
                  )}
                  {prog && (
                    <div style={{ position: 'absolute', left: '12%', right: '12%', bottom: 5, height: 3, borderRadius: 999, overflow: 'hidden', background: '#0B1216', pointerEvents: 'none' }}>
                      <div style={{ width: pct + '%', height: '100%', background: '#D8A85F' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {section === 'Records' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, paddingTop: 8 }}>
          {[
            ['Kills', cs.monstersKilled ?? cs.kills ?? 0],
            ['Deaths', cs.deaths ?? 0],
            /* Renamed from "Gold Earned" so it can't be confused with
               the current balance in the identity strip (round-4). */
            ['Lifetime Gold', Number(cs.totalGoldEarned ?? cs.goldEarnedTotal ?? 0).toLocaleString()],
            /* v2.3.1311: lifetime cumulative XP lives HERE now — the
               identity strip shows normalized next-level progress. */
            ['Lifetime XP', Number(R.xp || 0).toLocaleString()],
            ['Duels Won', cs.duelsWon ?? 0],
            ['Deepest Zone', cs.deepestZone ?? '—'],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 8,
              padding: '9px 10px',
              minWidth: 0,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted, marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
