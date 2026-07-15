import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { skillXpRequired } from '../../../data/items.js';
import { SKILL_ROSTER, skillUnlocks } from '../sheet/skillsModel.js';
import { skillDetailBus } from '../sheet/skillDetailBus.js';

/* v2.3.1296 (ChatGPT round-5 Skills): the focused skill detail view —
   XP alone says how far, this says WHY it matters.  Everything shown
   comes from real data: the unlock ladder rows exist only for skills
   with a tier table in data/lifeSkills.js (fishing / woodcutting /
   mining); other skills show level, exact XP and the earn hint — no
   invented bonuses or fake percentages (spec: placeholders must not
   masquerade as real values). */

const row = (label, value, strong) => (
  <div key={label} style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
    padding: '7px 2px', borderBottom: `1px solid ${COL.divider}`,
  }}>
    <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>{label}</span>
    <span style={{
      fontSize: 13, fontWeight: strong ? 700 : 600, color: strong ? COL.accent : COL.text,
      textAlign: 'right', minWidth: 0,
    }}>{value}</span>
  </div>
);

export const SkillDetailPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 600);
    return () => clearInterval(id);
  }, []);

  const sd = SKILL_ROSTER.find(s => s.key === skillDetailBus.selected()) || SKILL_ROSTER[0];
  const S = getState();
  const ls = (S && S.rpg && S.rpg.lifeSkills) || {};
  const sk = ls[sd.key] || { level: 1, xp: 0 };
  const need = Math.max(1, skillXpRequired(sk.level));
  const pct = Math.min(100, ((sk.xp || 0) / need) * 100);
  const unlocks = skillUnlocks(sd, sk.level || 0);

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* Identity: big icon, name, level, XP. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 10px' }}>
        {sd.iconSrc
          ? <img src={sd.iconSrc} alt="" draggable={false}
              style={{ width: 44, height: 44, objectFit: 'contain', flex: 'none' }} />
          : <span style={{ fontSize: 34 }}>{sd.icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: COL.text }}>{sd.name}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: COL.text2 }}>Level {sk.level || 0}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: '#0A1318', border: '1px solid rgba(229,237,233,.10)', overflow: 'hidden',
        }}>
          <div style={{ width: pct + '%', height: '100%', background: COL.xp }} />
        </div>
        <span style={{ flex: 'none', fontSize: 11, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
          {Math.floor(sk.xp || 0)} / {need} XP
        </span>
      </div>

      {unlocks && unlocks.current.length > 0 && row('Current', unlocks.current.join(' · '))}
      {unlocks && unlocks.next && row('Next unlock', `${unlocks.next.name} at Lv ${unlocks.next.lvl}`, true)}
      {unlocks && unlocks.later && row('Later', `${unlocks.later.name} at Lv ${unlocks.later.lvl}`)}

      {/* How to earn XP — one honest sentence per skill. */}
      <div style={{ padding: '10px 2px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
        How to level
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text2, padding: '0 2px' }}>
        {sd.earnHint}
      </div>
      {!unlocks && (
        <div style={{ fontSize: 11.5, lineHeight: 1.4, color: COL.muted, padding: '10px 2px 0' }}>
          Higher levels improve results and unlock new recipes as they're added.
        </div>
      )}
    </div>
  );
};
