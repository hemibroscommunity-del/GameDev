import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COMBAT_SKILLS, skillLevel, skillProgressPct, skillProgress, deriveHeroStats } from './heroModel.js';
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
  minHeight: 34, /* v2.3.1311b: no-scroll budget */
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
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
      <img src={VITAL_ICONS[kind]} alt="" draggable={false}
        style={{ width: 15, height: 15, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      <span style={{ flex: 'none', width: 52, fontSize: 11, fontWeight: 700, color: COL.text2 }}>{label}</span>
      <VitalBar kind={kind} cur={cur} max={max} thick={kind === 'hp' ? 12 : 10} />
      <span style={{ flex: 'none', minWidth: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
        {Math.ceil(cur)} / {Math.ceil(max)}
      </span>
    </div>
  );

  /* Overview derived pills — v2.3.1311b (owner): ALL SIX on ONE ROW,
     no scrolling anywhere in the subtab.  ~55px per pill at 390w:
     centered 8.5px label over a 13px value.  Values stay neutral
     (round-4: green is reserved for deltas/bonuses). */
  const cell = (label, value) => (
    <div key={label} style={{
      background: COL.wellSoft,
      border: `1px solid ${COL.tileBor}`,
      borderRadius: 8,
      padding: '4px 2px 5px',
      minWidth: 0,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', marginTop: 1, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );

  const totalUnspent = COMBAT_SKILLS.reduce((n, s) => n + buildSkillUnspent(R, s.key), 0);

  return (
    <div style={{
      ...panelStyle, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 10,
      /* v2.3.1311d (owner: "the last row is faded at the bottom"): the
         panelStyle bottom scroll-edge fade exists to signal MORE
         content below the fold — Hero's subtabs are designed no-scroll,
         so the mask only dimmed the flush last row.  Off here. */
      WebkitMaskImage: 'none', maskImage: 'none',
    }}>
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
          <div style={{ padding: '6px 0 4px' }}>
            {labeledBar('hp', 'HP', R.hp || 0, R.maxHp || 100)}
            {labeledBar('stamina', 'Stamina', R.stamina || 0, R.maxStamina || 100)}
            {labeledBar('mana', 'Mana', R.mana || 0, R.maxMana || 100)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
            {cell('Damage', d.dmgText)}
            {cell('DPS', d.dps.toFixed(1))}
            {/* v2.3.1311: it's BLOCK — the number is calcBlockReduction
                (shield block %), not armor/Iron-Skin mitigation, so
                "Damage Reduction" would overclaim. */}
            {cell('Block', `${Math.round(d.block * 100)}%`)}
            {cell('Crit', `${Math.round(d.crit * 100)}%`)}
            {cell('Dodge', `${Math.round(d.dodge * 100)}%`)}
            {cell('Speed', d.speed.toFixed(1))}
          </div>
        </>
      )}

      {section === 'Build' && (
        <>
          {/* v2.3.1311c: single-line points chip — the two-cell header
              banner cost ~14px the no-scroll budget doesn't have on a
              real iPhone Safari viewport (~715px innerHeight). */}
          <div style={{
            margin: '5px 0 4px',
            padding: '3px 10px',
            borderRadius: 7,
            background: totalUnspent > 0 ? COL.accentFill : COL.wellSoft,
            border: `1px solid ${totalUnspent > 0 ? COL.accent : COL.tileBor}`,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
            color: totalUnspent > 0 ? COL.accent : COL.text2,
          }}>
            <span>BUILD POINTS</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalUnspent} AVAILABLE</span>
          </div>
          {/* v2.3.1311d (owner): the six parents are LAUNCHERS — every
              tile is ALWAYS tappable and opens that parent's five-
              category spend screen (T2Panel), points or not.  With the
              detail living one tap away, the tiles drop the XP text
              line for breathing room: icon + name + Lv + the parent's
              family line + level-progress bar + drill chevron; the +N
              chip marks waiting points.  3x2, sized to the real device
              budget. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, flex: 1, minHeight: 0, alignContent: 'stretch' }}>
            {COMBAT_SKILLS.map(s => {
              const lvl = skillLevel(R, s.key);
              const pct = skillProgressPct(R, s.key);
              const prog = skillProgress(R, s.key);
              const unspent = buildSkillUnspent(R, s.key);
              /* v2.3.1313 (owner): Vitality and Stamina were DEAD buttons — the
                 map only knew defense + the weapon cats, so openT2Cat came back
                 undefined and the tap no-oped.  Their T2 tabs are 'hp' and
                 'endurance'. */
              const openT2Cat = s.key === 'defense' ? 'defense'
                : s.key === 'vitality' ? 'hp'
                : s.key === 'endurance' ? 'endurance'
                : STAT_TO_WEAPON_CAT[s.key];
              return (
                <div key={s.key}
                  className={unspent > 0 ? 'bt-build-flash' : undefined}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (openT2Cat) { requestT2Category(openT2Cat); dashboardPanelBus.push('t2'); }
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    gap: 2,
                    padding: '5px 7px 9px',
                    background: unspent > 0 ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
                    borderRadius: 7,
                    cursor: 'pointer',
                    touchAction: 'none',
                    minWidth: 0,
                  }}>
                  {unspent > 0 && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 2, right: 2,
                      background: COL.accent, color: '#20170D',
                      fontSize: 9, fontWeight: 900,
                      borderRadius: 6, padding: '0 3px', lineHeight: 1.4,
                      pointerEvents: 'none',
                    }}>+{unspent}</span>
                  )}
                  {/* v2.3.1311f (owner): bigger icon + text; the
                      "5 x skills" line is gone to pay for it — the
                      drill chevron alone marks the tap-through. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <img src={s.iconSrc} alt="" draggable={false}
                      style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>{s.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: COL.text2, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>Lv {lvl}</div>
                    </div>
                    <span aria-hidden="true" style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: COL.text2, lineHeight: 1 }}>›</span>
                  </div>
                  {prog && (
                    <div style={{ position: 'absolute', left: 7, right: 7, bottom: 4, height: 3, borderRadius: 999, overflow: 'hidden', background: '#0B1216', pointerEvents: 'none' }}>
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
        /* v2.3.1311c: 3x2 (was 2x3) — two card rows fit the real device
           budget without scrolling; three didn't. */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, paddingTop: 6 }}>
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
              borderRadius: 7,
              padding: '5px 7px 6px',
              minWidth: 0,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
