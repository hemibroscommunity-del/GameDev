import React, { useEffect, useState } from 'react';
import { COL } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COMBAT_SKILLS, skillLevel, deriveHeroStats } from './heroModel.js';
import { IdentityStrip } from './IdentityStrip.jsx';   /* v2.3.1294 */
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx'; /* v2.3.1311 */

/* v2.3.1286: Hero compact — the glanceable combat dashboard (nav-system
   spec §Hero Compact).  Upper band: the three live resource bars with
   exact values + gold.  Lower band: the six combat-parent icons with
   levels (unspent-T2 badge jumps to the spend screen) and the two
   derived numbers that matter mid-fight, DPS and Block%.

   v2.3.1311 (owner spec): vitals unified on ONE bar component
   (VitalBar — same trough/caps/highlight, HP 2px thicker), emoji
   icons replaced by the owner's HD pixel-art set, per-parent unspent
   badges restyled "+N" (they are parent-SPECIFIC T2 pool counts — a
   bare number read as a global currency), and the mitigation tile is
   named BLOCK (the number is calcBlockReduction = shield block, not
   general damage reduction). */

export const HeroCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 250);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};
  const d = deriveHeroStats(R);

  /* v2.3.1339 (owner): the heart/bolt/droplet icons were the "super
     tiny" ones — 14 -> 24px, still under the 40px identity portrait
     (owner's stated ceiling). */
  const row = (kind, cur, max) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 0 }}>
      <img src={VITAL_ICONS[kind]} alt={kind} draggable={false}
        style={{ width: 24, height: 24, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      <VitalBar kind={kind} cur={cur} max={max} />
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
      gap: 3, /* v2.3.1339: pays for the taller vital rows */
      padding: '6px 10px 4px',
    }}>
      {/* v2.3.1294 (ChatGPT round-4): identity strip — the retired
          top-right world card lives here now (portrait, name, level,
          exact XP, gold).  Hero compact = the character HUD: who am I,
          what condition am I in, what's my combat strength. */}
      <IdentityStrip />
      {/* Live resources — one VitalBar component for all three. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {row('hp', R.hp || 0, R.maxHp || 100)}
        {row('stamina', R.stamina || 0, R.maxStamina || 100)}
        {row('mana', R.mana || 0, R.maxMana || 100)}
      </div>

      {/* Combat parents + the two mid-fight derived values.
          v2.3.1339: the v2.3.1338 44px icons clipped their level
          numbers below the compact fold — back to 22px (the owner's
          "super tiny" icons were the VITALS trio, now 24px above).
          DPS/Block keep the v2.3.1338 stacked trailing column. */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr) auto',
        gap: 6,
        alignContent: 'center',
        alignItems: 'center',
      }}>
        {COMBAT_SKILLS.map(s => {
          const lvl = skillLevel(R, s.key);
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
                /* v2.3.1311d (owner): parents are launchers — always
                   tappable into their five-category spend screen. */
                if (openT2Cat) {
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
                cursor: 'pointer',
                touchAction: 'none',
              }}>
              {/* v2.3.1311: "+N" — these are parent-specific T2 points
                  (e.g. the bow pool), not a global currency; the bare
                  "2" read as spendable-anywhere.  The GLOBAL total now
                  badges the Hero toolbar icon + the Build subtab. */}
              {unspent > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: 0,
                  background: '#D8A85F', color: '#20170D',
                  fontSize: 10, fontWeight: 900,
                  borderRadius: 7, padding: '0 4px', lineHeight: 1.4,
                  pointerEvents: 'none', zIndex: 1,
                }}>+{unspent}</span>
              )}
              <img src={s.iconSrc} alt={s.label} draggable={false}
                style={{ width: 22, height: 22, objectFit: 'contain', pointerEvents: 'none' }} /> {/* v2.3.1339: 44 -> 22 — the 2x pass clipped the levels below the compact fold; the tiny-icon complaint was the VITALS trio */}
              <span style={{ fontSize: 12, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {lvl}
              </span>
            </div>
          );
        })}
        {/* DPS + Block — stacked mini-rows in the trailing auto column
            (v2.3.1338).  v2.3.1311: DR renamed BLOCK — the number is
            shield block % (calcBlockReduction), not general mitigation;
            labels stay neutral (green is reserved for buffs/deltas). */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, minWidth: 0, paddingLeft: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: COL.text2 }}>DPS</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {d.dps.toFixed(1)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: COL.text2 }}>BLOCK</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(d.block * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
