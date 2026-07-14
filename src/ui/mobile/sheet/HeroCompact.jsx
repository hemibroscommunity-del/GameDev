import React, { useEffect, useState } from 'react';
import { COL } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { SpriteHpBar } from '../../SpriteHpBar.jsx';
import { COMBAT_SKILLS, skillLevel, deriveHeroStats } from './heroModel.js';

/* v2.3.1286: Hero compact — the glanceable combat dashboard (nav-system
   spec §Hero Compact).  Upper band: the three live resource bars with
   exact values + gold.  Lower band: the six combat-skill icons with
   levels (unspent-T2 badge jumps to the spend screen) and the two
   derived numbers that matter mid-fight, DPS and Block%.
   Bars and readouts keep their own shapes — the spec explicitly says
   NOT to force Hero into the item-slot metaphor. */

const flatBar = () => ({
  flex: 1,
  height: 8,
  borderRadius: 4,
  background: 'rgba(0,0,0,.5)',
  border: '1px solid rgba(255,255,255,.08)',
  overflow: 'hidden',
  position: 'relative',
});

export const HeroCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 250);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};
  const d = deriveHeroStats(R);

  const row = (icon, cur, max, color, hp) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 0 }}>
      <span style={{ width: 14, fontSize: 11, textAlign: 'center', flex: 'none' }}>{icon}</span>
      {hp ? (
        <div style={{ flex: 1 }}><SpriteHpBar hp={cur} maxHp={max} height={12} /></div>
      ) : (
        <div style={flatBar()}>
          <div style={{
            width: `${Math.max(0, Math.min(100, (cur / (max || 1)) * 100))}%`,
            height: '100%', borderRadius: 4, background: color,
            transition: 'width .15s linear',
          }} />
        </div>
      )}
      <span style={{
        flex: 'none', minWidth: 58, textAlign: 'right',
        fontSize: 11, fontWeight: 700, color: COL.text2,
        fontVariantNumeric: 'tabular-nums',
      }}>{Math.ceil(cur)} / {Math.ceil(max)}</span>
    </div>
  );

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      gap: 6,
      padding: '10px 10px 8px',
    }}>
      {/* Live resources.  v2.3.1292 (ChatGPT round-3 §4 Hero): the gold
          column is gone — gold is always visible in the persistent
          player card top-right; duplicating it here spent glance space
          on a number the eye already has.  Bars get the full width. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {row('❤️', R.hp || 0, R.maxHp || 100, null, true)}
        {row('⚡', R.stamina || 0, R.maxStamina || 100, '#D8A85F')}
        {row('💧', R.mana || 0, R.maxMana || 100, '#5B99DE')}
      </div>

      {/* Combat skills + the two mid-fight derived values. */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 6,
        alignContent: 'center',
      }}>
        {COMBAT_SKILLS.map(s => {
          const lvl = skillLevel(R, s.key);
          const unspent = buildSkillUnspent(R, s.key);
          const openT2Cat = s.key === 'defense' ? 'defense' : STAT_TO_WEAPON_CAT[s.key];
          return (
            <div key={s.key}
              className={unspent > 0 ? 'bt-build-flash' : undefined}
              onPointerUp={(e) => {
                e.stopPropagation();
                if (unspent > 0 && openT2Cat) {
                  requestT2Category(openT2Cat);
                  dashboardPanelBus.push('t2');
                }
              }}
              title={`${s.label} ${lvl}`}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                minWidth: 0, minHeight: 0,
                cursor: unspent > 0 ? 'pointer' : 'default',
                touchAction: 'none',
              }}>
              {unspent > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: 0,
                  background: '#D8A85F', color: '#20170D',
                  fontSize: 10, fontWeight: 900,
                  borderRadius: 7, padding: '0 4px', lineHeight: 1.4,
                  pointerEvents: 'none', zIndex: 1,
                }}>{unspent}</span>
              )}
              <img src={s.iconSrc} alt={s.label} draggable={false}
                style={{ width: 20, height: 20, objectFit: 'contain', pointerEvents: 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {lvl}
              </span>
            </div>
          );
        })}
        {/* DPS + DEF share the row's tile rhythm but read as values.
            v2.3.1292 (canonical naming): the mitigation number — block
            reduction from the Defense skill + shield — is called DEF in
            BOTH Hero views now (was BLK here / Block in expanded).
            This game has no separate armor stat (heroModel NOTE:
            armorDef was never wired), so DEF and block are one number
            with one name. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: '#7BCD84' }}>DPS</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {d.dps.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: '#6FC3DF' }}>DEF</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(d.block * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
