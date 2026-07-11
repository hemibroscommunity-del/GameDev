import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — stat
   tiles become quiet #19252A cells with the stat-*.webp icons (same
   language as the dashboard Build column), the archetype portrait uses
   the combat-*.webp icons with the old emoji as image-failure fallback,
   and type moves onto the spec ladder (14/700 name, tabular values,
   10/600 captions).  Profile derivation via __broBuildSelfProfile and
   the 400ms refresh interval are unchanged. */
const StatTile = ({ label, iconSrc, glyph, value }) => (
  <div style={{
    flex: 1,
    background: COL.wellSoft,
    border: `1px solid ${COL.tileBor}`,
    borderRadius: 8,
    padding: '6px 2px 5px',
    textAlign: 'center',
    minWidth: 0,
  }}>
    <img src={iconSrc} alt="" draggable={false}
      style={{ width: 26, height: 26, objectFit: 'contain', display: 'block', margin: '0 auto' }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(glyph)); }} />
    <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: COL.muted }}>{label}</div>
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
  if (!profile) return <div style={panelStyle}>
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <img src="/icons/ui/panel-self.webp" alt="" draggable={false}
        style={{ width: 44, height: 44, objectFit: 'contain', opacity: 0.4 }}
        onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🪪')); }} />
      <div style={{ fontSize: 13, color: COL.muted, marginTop: 6 }}>No profile.</div>
    </div>
  </div>;

  const st = profile.stats || {};
  const carry = [];
  if (profile.weapon?.name) carry.push(`⚔ ${profile.weapon.name}`);
  if (profile.armor?.name)  carry.push(`🛡 ${profile.armor.name}`);
  if (profile.pet?.name)    carry.push(`🐾 ${profile.pet.name}`);

  return (
    <div style={panelStyle}>
      {/* Identity strip — occupied-slot portrait + name/level metadata. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 8px', marginBottom: 8 }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: 8,
          background: COL.slot,
          border: `1px solid ${COL.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 48px',
        }}>
          {profile.archetype === 'mage'
            ? <img src="/icons/ui/combat-magic.webp" alt="" draggable={false}
                style={{ width: 28, height: 28, objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🧙')); }} />
            : profile.archetype === 'archer'
              ? <img src="/icons/ui/combat-bow.webp" alt="" draggable={false}
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🏹')); }} />
              : <img src="/icons/ui/combat-melee.webp" alt="" draggable={false}
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('⚔')); }} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile.name}
            {profile.clanTag && <span style={{ color: COL.muted, marginLeft: 6, fontSize: 12, fontWeight: 600 }}>[{profile.clanTag}]</span>}
          </div>
          <div style={{ fontSize: 12, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
            Lv {profile.level} · {profile.archetype || 'wanderer'}
            {profile.pole ? ` · ${profile.pole}` : ''}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, padding: '0 8px' }}>
        <StatTile label="POW" iconSrc="/icons/ui/stat-power.webp"     glyph="⚔" value={st.power ?? 0} />
        <StatTile label="VIT" iconSrc="/icons/ui/stat-vitality.webp"  glyph="♥" value={st.vitality ?? 0} />
        <StatTile label="END" iconSrc="/icons/ui/stat-endurance.webp" glyph="🛡" value={st.endurance ?? 0} />
        <StatTile label="AGI" iconSrc="/icons/ui/stat-agility.webp"   glyph="🏃" value={st.agility ?? 0} />
        <StatTile label="MND" iconSrc="/icons/ui/stat-mind.webp"      glyph="✨" value={st.mind ?? 0} />
      </div>

      {/* Carrying */}
      {carry.length > 0 && (
        <div style={{ fontSize: 12, color: COL.muted, marginBottom: 6, padding: '0 8px' }}>
          {carry.join(' · ')}
        </div>
      )}

      {/* Quest / journey footer */}
      {profile.questLine && (
        <div style={{ fontSize: 13.5, color: COL.text2, padding: '0 8px' }}>
          ✦ {profile.questLine}
        </div>
      )}
      {profile.history?.displayedTitle && (
        <div style={{ fontSize: 12, fontWeight: 600, color: COL.gold, marginTop: 4, padding: '0 8px' }}>
          ★ {profile.history.displayedTitle}
        </div>
      )}
    </div>
  );
};
