import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { skillXpRequired } from '../../../data/items.js';
import { SKILL_DISPLAY_12, markSkillsSeen } from '../sheet/skillsModel.js';
import { skillsFocusBus } from '../sheet/skillsFocusBus.js';
import { skillDetailBus } from '../sheet/skillDetailBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1224: roster corrected to the canonical 10 LIFE_SKILLS (owner
   directive).  v2.3.1286 (nav-system): 3-column card grid on the shared
   roster; XP CURVE FIX — progress uses skillXpRequired (items.js,
   500·1.08^(level-1)), the exact award curve.
   v2.3.1296 (ChatGPT round-5): display order matches compact (gathering
   then processing, two "soon" pads); cards ~10% shorter; empty track
   contrast raised; bottom padding clears the toolbar; compact-tile taps
   scroll their card into view with a brief brass flash (skillsFocusBus);
   tapping a card drills into the skill DETAIL view (unlock ladder,
   earn hint — skillDetailBus).  Opening this panel marks level-ups
   seen (clears the toolbar dot). */
export const SkillsPanel = () => {
  const [, force] = useState(0);
  const rootRef = useRef(null);
  const [flashKey, setFlashKey] = useState('');
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);
  /* Level-up badge lifecycle: viewing the expanded panel = seen. */
  useEffect(() => {
    const S = getState();
    markSkillsSeen((S && S.rpg) || {});
  }, []);
  /* Focus request from a compact tile: scroll + flash.  Consumed on
     mount; the subscribe handles already-mounted re-focus taps. */
  useEffect(() => {
    const run = () => {
      const req = skillsFocusBus.consume();
      if (!req || !rootRef.current) return;
      const el = rootRef.current.querySelector(`[data-skill="${req.key}"]`);
      if (el) {
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
        setFlashKey(req.key + ':' + req.epoch);
        setTimeout(() => setFlashKey(''), 1400);
      }
    };
    run();
    return skillsFocusBus.subscribe(run);
  }, []);

  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};

  return (
    <div ref={rootRef} style={{ ...panelStyle, overflowY: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        /* round-5: last row must scroll fully above the toolbar/fade. */
        paddingBottom: 26,
      }}>
        {SKILL_DISPLAY_12.map(sd => {
          if (sd.placeholder) {
            return (
              <div key={sd.key} aria-hidden="true" style={{
                background: 'rgba(0,0,0,0.18)',
                border: `1px dashed ${COL.tileBor}`,
                borderRadius: 8,
                minHeight: 76,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: COL.disabled }}>SOON</span>
              </div>
            );
          }
          const sk = ls[sd.key] || { level: 1, xp: 0 };
          const need = Math.max(1, skillXpRequired(sk.level));
          const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
          const flashing = flashKey.startsWith(sd.key + ':');
          return (
            <button key={sd.key} data-skill={sd.key}
              onPointerUp={(e) => {
                e.stopPropagation();
                skillDetailBus.select(sd.key);
                dashboardPanelBus.push('skillDetail');
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 6px 6px',
                background: flashing ? COL.accentFill : COL.wellSoft,
                border: `1px solid ${flashing ? COL.accent : COL.tileBor}`,
                borderRadius: 8,
                minWidth: 0,
                cursor: 'pointer',
                touchAction: 'manipulation',
                fontFamily: 'Source Sans 3, sans-serif',
                color: COL.text,
                transition: 'background .3s ease, border-color .3s ease',
              }}>
              {sd.iconSrc
                ? <img src={sd.iconSrc} alt="" draggable={false}
                    style={{ width: Math.round(26 * (sd.iconScale || 1)), height: Math.round(26 * (sd.iconScale || 1)), objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sd.icon)); }} />
                : <span style={{ fontSize: 22 }}>{sd.icon}</span>}
              <span style={{
                fontSize: 11, fontWeight: 600, color: COL.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{sd.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                Lv {sk.level || 0}
              </span>
              <div style={{
                alignSelf: 'stretch',
                height: 5,
                /* round-5: empty track lifted from wellDeep for contrast */
                background: '#0A1318',
                border: '1px solid rgba(229,237,233,.10)',
                borderRadius: 999,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)',
              }}>
                <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: COL.xp }} />
              </div>
              <span style={{ fontSize: 10, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(sk.xp || 0)} / {need} XP
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
