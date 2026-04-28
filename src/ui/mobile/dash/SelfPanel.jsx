import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const StatTile = ({ label, value }) => (
  <div style={{
    flex: 1,
    background: COL.tile,
    border: `1px solid ${COL.tileBor}`,
    borderRadius: 4,
    padding: '4px 2px',
    textAlign: 'center',
    minWidth: 0,
  }}>
    <div style={{ fontSize: 9, color: COL.muted, letterSpacing: '.04em' }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
  </div>
);

export const SelfPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const profile = (S && window.__broBuildSelfProfile) ? window.__broBuildSelfProfile(S) : null;
  if (!profile) return <div style={panelStyle}><span style={{ color: COL.muted }}>No profile.</span></div>;

  const st = profile.stats || {};
  const carry = [];
  if (profile.weapon?.name) carry.push(`⚔ ${profile.weapon.name}`);
  if (profile.armor?.name)  carry.push(`🛡 ${profile.armor.name}`);
  if (profile.pet?.name)    carry.push(`🐾 ${profile.pet.name}`);

  return (
    <div style={panelStyle}>
      {/* Identity strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: 6,
          background: COL.tile,
          border: `1px solid ${COL.tileBor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flex: '0 0 48px',
        }}>{profile.archetype === 'mage' ? '🧙' : profile.archetype === 'archer' ? '🏹' : '⚔'}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile.name}
            {profile.clanTag && <span style={{ color: COL.muted, marginLeft: 6, fontSize: 11 }}>[{profile.clanTag}]</span>}
          </div>
          <div style={{ fontSize: 11, color: COL.muted }}>
            Lv {profile.level} · {profile.archetype || 'wanderer'}
            {profile.pole ? ` · ${profile.pole}` : ''}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <StatTile label="POW" value={st.power ?? 0} />
        <StatTile label="VIT" value={st.vitality ?? 0} />
        <StatTile label="END" value={st.endurance ?? 0} />
        <StatTile label="AGI" value={st.agility ?? 0} />
        <StatTile label="MND" value={st.mind ?? 0} />
      </div>

      {/* Carrying */}
      {carry.length > 0 && (
        <div style={{ fontSize: 11, color: COL.muted, marginBottom: 4 }}>
          {carry.join(' · ')}
        </div>
      )}

      {/* Quest / journey footer */}
      {profile.questLine && (
        <div style={{ fontSize: 11, color: COL.text, opacity: 0.85 }}>
          ✦ {profile.questLine}
        </div>
      )}
      {profile.history?.displayedTitle && (
        <div style={{ fontSize: 11, color: COL.gold, marginTop: 2 }}>
          ★ {profile.history.displayedTitle}
        </div>
      )}
    </div>
  );
};
