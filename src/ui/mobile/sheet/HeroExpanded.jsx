import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { xpRequired, buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { SpriteHpBar } from '../../SpriteHpBar.jsx';
import { COMBAT_SKILLS, skillLevel, skillProgressPct, deriveHeroStats } from './heroModel.js';

/* v2.3.1286: Hero expanded — the detailed character/combat sheet
   (nav-system spec §Hero Expanded).  Identity + XP, exact resource
   bars, the six combat skills with their per-point XP strips (ported
   from the retired Build tiles), the derived combat values the build
   produces, and lifetime records from R._compStats.  Equipment
   management intentionally lives in Bag, not here. */

const secHdr = {
  fontSize: 10, fontWeight: 700, letterSpacing: '.10em',
  textTransform: 'uppercase', color: COL.muted,
  padding: '10px 2px 4px',
};

const valRow = (label, value, color) => (
  <div key={label} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 2px', borderBottom: `1px solid ${COL.divider}`,
  }}>
    <span style={{ fontSize: 12.5, color: COL.text2 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: color || COL.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

export const HeroExpanded = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const d = deriveHeroStats(R);
  const level = R.level || 1;
  const xp = R.xp || 0;
  const xpNeed = Math.max(1, Math.floor(xpRequired(level)));
  const cs = R._compStats || {};

  const bar = (cur, max, color, hp) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
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

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* Identity + level/XP.  v2.3.1292 (ChatGPT round-3 §4 Hero): the
          gold readout is gone here too — the persistent player card
          top-right already shows it in every mode. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px 8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(S && S.player && S.player.name) || 'Bro'}
          </div>
          <div style={{ fontSize: 11.5, color: COL.muted }}>Level {level}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (xp / xpNeed) * 100)}%`, height: '100%', background: '#8AA9F9' }} />
        </div>
        <span style={{ flex: 'none', fontSize: 10.5, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
          {xp} / {xpNeed} XP
        </span>
      </div>

      <div style={secHdr}>Vitals</div>
      {bar(R.hp || 0, R.maxHp || 100, null, true)}
      {bar(R.stamina || 0, R.maxStamina || 100, '#D8A85F')}
      {bar(R.mana || 0, R.maxMana || 100, '#5B99DE')}

      {/* v2.3.1292 (round-3 §4 Hero): information order — the derived
          combat stats move ABOVE the build grid so the first viewport
          is level/XP -> vitals -> core stats; they previously began
          below the fold. */}
      <div style={secHdr}>Combat Stats</div>
      {valRow('Damage', d.dmgText)}
      {valRow('DPS', d.dps.toFixed(1), '#7BCD84')}
      {valRow('DEF — damage blocked', `${Math.round(d.block * 100)}%`, '#6FC3DF')}
      {valRow('Crit Chance', `${(d.crit * 100).toFixed(1)}%`)}
      {valRow('Dodge', `${(d.dodge * 100).toFixed(1)}%`)}
      {valRow('Move Speed', `${d.speed.toFixed(1)} u/s`)}

      {/* v2.3.1292: section renamed Build — it IS the spend flow's
          home (the T2 drill is titled Build), one canonical name. */}
      <div style={secHdr}>Build</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {COMBAT_SKILLS.map(s => {
          const lvl = skillLevel(R, s.key);
          const pct = skillProgressPct(R, s.key);
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
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px 9px',
                background: unspent > 0 ? COL.accentFill : COL.wellSoft,
                /* v2.3.1292 (round-3 §4 Hero): with points waiting the
                   WHOLE card reads actionable — brass tint + brass
                   edge, not just the tiny count badge.  The card was
                   already fully tappable; now it looks it. */
                border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
                borderRadius: 8,
                cursor: unspent > 0 ? 'pointer' : 'default',
                touchAction: 'none',
                minWidth: 0,
              }}>
              {unspent > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 3,
                  background: '#D8A85F', color: '#20170D',
                  fontSize: 10, fontWeight: 900, borderRadius: 7,
                  padding: '0 4px', lineHeight: 1.4, pointerEvents: 'none', zIndex: 1,
                }}>{unspent}</span>
              )}
              <img src={s.iconSrc} alt="" draggable={false}
                style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: COL.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{lvl}</div>
              </div>
              {/* per-stat XP strip (the exact addBuildProg threshold) */}
              <div style={{ position: 'absolute', left: '12%', right: '12%', bottom: 3, height: 3, borderRadius: 999, overflow: 'hidden', background: '#0B1216', pointerEvents: 'none' }}>
                <div style={{ width: pct + '%', height: '100%', background: '#D8A85F' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={secHdr}>Record</div>
      {valRow('Kills', cs.monstersKilled ?? cs.kills ?? 0)}
      {valRow('Deaths', cs.deaths ?? 0)}
      {valRow('Gold Earned', cs.totalGoldEarned ?? cs.goldEarnedTotal ?? 0)}
      {valRow('Deepest Zone', cs.deepestZone ?? '—')}
    </div>
  );
};
