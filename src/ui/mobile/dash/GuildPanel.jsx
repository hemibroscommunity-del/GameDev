import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState, openGameWindow } from './common.js';
import { SKILL_GUILDS, getGuildRank } from '@/data/index.js';   /* v2.3.3066: the ranks the guild window shows */

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — spec
   empty state (icon at .4 opacity + one muted line), identity strip
   with the guild icon, module header + 44px rows with right-aligned
   tabular values for guild skills.  Data reads and the 800ms refresh
   interval are unchanged. */
/* v2.3.1235: batch-1 rollout — section-header ladder locked at
   11/700 uppercase .14em muted (was 600/.12em). */
const secHdr = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.14em', color: COL.muted, margin: '12px 8px 4px',
};
const row = {
  display: 'flex', alignItems: 'center', gap: 8,
  minHeight: 44, padding: '0 8px',
  borderBottom: `1px solid ${COL.divider}`,
};

/* ═══ v2.3.3066: THE SKILL GUILDS, AS THEY ARE ═══
   This page read `rpg.guild` / `S._guild`, which nothing sets, so it said
   "You haven't joined a guild yet" to everyone -- while every player is in
   every skill guild already, ranked by that life skill's level (the guild
   window, src/ui/panels/GuildPanel.jsx: SKILL_GUILDS, getGuildRank).  So it
   lists those ranks, from the same data, and opens the guild window for the
   titles and the guild quests -- which nothing in play opened before the
   Wheel's Guild Hall (wheelBuildingDoors.js WHEEL_HALL_DOORS). */
export function guildRanks(R) {
  const skills = (R && R.lifeSkills) || {};
  return Object.keys(SKILL_GUILDS).map((k) => {
    const lvl = (skills[k] && skills[k].level) || 1;
    return { key: k, guild: SKILL_GUILDS[k], level: lvl, rank: getGuildRank(lvl) };
  });
}
/** Your best rank, for the More page's line: null while you are a Novice in all. */
export function bestGuildRank(R) {
  let best = null;
  for (const g of guildRanks(R)) if (g.rank.rank > 0 && (!best || g.rank.rank > best.rank.rank)) best = g;
  return best;
}

export const GuildPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 800);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const rows = guildRanks(S?.rpg || {});
  return (
    <div style={panelStyle} data-dash-guild="">
      {/* Identity strip — icon + what the guilds are. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px' }}>
        <img src="/icons/ui/panel-guild.webp" alt="" draggable={false}
          style={{ width: 28, height: 28, objectFit: 'contain', flex: '0 0 auto' }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('⚒')); }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COL.text }}>Skill guilds</div>
          <div style={{ fontSize: 12, color: COL.muted }}>Your rank in each rises with its life skill</div>
        </div>
      </div>
      <div style={secHdr}>Your ranks</div>
      {rows.map((r) => (
        <div key={r.key} style={row} data-guild-rank={r.key}>
          <span aria-hidden="true" style={{ width: 22, textAlign: 'center', fontSize: 16, flex: '0 0 auto' }}>{r.guild.icon}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.guild.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: r.rank.color }}>{r.rank.title}</span>
          <span style={{ width: 52, textAlign: 'right', fontSize: 14, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
            Lv {r.level}
          </span>
        </div>
      ))}
      <button type="button" data-dash-open-guild="" onClick={() => openGameWindow('guildOpen')}
        style={{ font: 'inherit', display: 'block', width: 'calc(100% - 16px)', margin: '10px 8px 2px', minHeight: 44, borderRadius: 10,
          background: COL.raised, color: COL.text, border: `1px solid ${COL.borderStrong}`, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Titles and guild quests
      </button>
    </div>
  );
};
