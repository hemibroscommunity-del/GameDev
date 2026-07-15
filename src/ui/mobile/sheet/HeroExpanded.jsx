import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { SpriteHpBar } from '../../SpriteHpBar.jsx';
import { COMBAT_SKILLS, skillLevel, skillProgressPct, skillProgress, attributeEffect, deriveHeroStats } from './heroModel.js';
import { IdentityStrip } from './IdentityStrip.jsx';

/* v2.3.1286: Hero expanded — the detailed character sheet.
   v2.3.1295 (ChatGPT round-4, owner-approved): no longer one long
   vertical feed — Overview, Build and Records are different TASKS, so
   a sticky segmented control under the identity strip gives each a
   focused half-screen view:
   - Overview: labeled vitals + a 3x2 data grid of every derived combat
     number, no scrolling.
   - Build: available points up top, six attribute cards with the
     CURRENT gameplay effect and exact XP progress; whole card taps to
     the spend flow when points wait.
   - Records: lifetime stats as number-dominant data cards.
   Equipment management intentionally lives in Bag, not here. */

const SECTIONS = ['Overview', 'Build', 'Records'];
/* Round-3 §6 state preservation: the selected section survives leaving
   the destination (module-scoped, session-only). */
let _lastSection = 'Overview';

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

  const labeledBar = (label, cur, max, color, hp) => (
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{ flex: 'none', width: 58, fontSize: 11, fontWeight: 700, color: COL.text2 }}>{label}</span>
      {hp ? (
        <div style={{ flex: 1 }}><SpriteHpBar hp={cur} maxHp={max} height={14} /></div>
      ) : (
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, (cur / (max || 1)) * 100))}%`, height: '100%', background: color, transition: 'width .15s linear' }} />
        </div>
      )}
      <span style={{ flex: 'none', minWidth: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
        {Math.ceil(cur)} / {Math.ceil(max)}
      </span>
    </div>
  );

  /* Overview 3x2 data grid — every derived number in one viewport.
     Values stay neutral (round-4: reserve green for deltas/bonuses).
     Speed drops the "u/s" developer unit. */
  const cell = (label, value) => (
    <div key={label} style={{
      background: COL.wellSoft,
      border: `1px solid ${COL.tileBor}`,
      borderRadius: 8,
      padding: '7px 8px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{value}</div>
    </div>
  );

  const totalUnspent = COMBAT_SKILLS.reduce((n, s) => n + buildSkillUnspent(R, s.key), 0);

  return (
    <div style={{ ...panelStyle, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <IdentityStrip />

      {/* Sticky segmented control — content scrolls under it. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', gap: 2,
        background: COL.bg,
        borderRadius: 10, padding: 2,
        border: `1px solid ${COL.border}`,
        flex: '0 0 auto',
      }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)} style={seg(section === s)}>{s}</button>
        ))}
      </div>

      {section === 'Overview' && (
        <>
          <div style={{ padding: '8px 0 4px' }}>
            {labeledBar('HP', R.hp || 0, R.maxHp || 100, null, true)}
            {labeledBar('Stamina', R.stamina || 0, R.maxStamina || 100, '#D8A85F')}
            {labeledBar('Mana', R.mana || 0, R.maxMana || 100, '#5B99DE')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {cell('Damage', d.dmgText)}
            {cell('DPS', d.dps.toFixed(1))}
            {cell('DR', `${Math.round(d.block * 100)}%`)}
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
            fontSize: 13, fontWeight: 700,
            color: totalUnspent > 0 ? COL.accent : COL.text2,
          }}>
            Build Points: {totalUnspent}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
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
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 9px 11px',
                    background: unspent > 0 ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
                    borderRadius: 8,
                    cursor: unspent > 0 ? 'pointer' : 'default',
                    touchAction: 'none',
                    minWidth: 0,
                  }}>
                  <img src={s.iconSrc} alt="" draggable={false}
                    style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{s.label}</span>
                      <span style={{ flex: 'none', fontSize: 12, fontWeight: 800, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl}</span>
                    </div>
                    {/* Current gameplay effect (real formulas only). */}
                    <div style={{ fontSize: 10.5, color: COL.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {attributeEffect(R, s.key)}
                    </div>
                    {/* Exact XP progress — the bar alone read as decoration
                        (round-4).  These levels DO advance through combat
                        XP (addBuildProg), so the bar stays, now labeled. */}
                    {prog && (
                      <div style={{ fontSize: 10, color: COL.muted, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {prog.prog} / {prog.thresh} XP
                      </div>
                    )}
                  </div>
                  {unspent > 0 && (
                    <span aria-hidden="true" style={{
                      flex: 'none',
                      width: 22, height: 22, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: COL.accent, color: '#20170D',
                      fontSize: 15, fontWeight: 900, lineHeight: 1,
                    }}>+</span>
                  )}
                  {prog && (
                    <div style={{ position: 'absolute', left: '10%', right: '10%', bottom: 4, height: 3, borderRadius: 999, overflow: 'hidden', background: '#0B1216', pointerEvents: 'none' }}>
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
