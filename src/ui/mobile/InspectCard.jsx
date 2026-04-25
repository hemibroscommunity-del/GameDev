import React, { useEffect, useState } from 'react';
import { inspectCardBus } from './inspectCardBus.js';
import { ItemArt } from './ItemArt.jsx';

// Color canon — spec §"Color palette summary (both surfaces)".
const C = {
  bg:        '#F1EFE8',
  cardBg:    '#FFFFFF',
  divider:   '#E2DCC8',
  divider2:  '#D3D1C7',
  text:      '#2C2C2A',
  muted:     '#5F5E5A',
  muted2:    '#888780',
  veryMuted: '#B4B2A9',
  badgeRed:  '#E24B4A',
  navBg:     '#1E3328',
  navText:   '#FFFFFF',
  navMuted:  '#9DA89B',
  // Stat colors (canonical §"Stat colors").
  power:     '#378ADD',
  vitality:  '#E24B4A',
  endurance: '#639922',
  agility:   '#EF9F27',
  mind:      '#7F77DD',
};

const POLE_HALO = {
  light: '#E8D29B',
  dark:  '#3A2A52',
  flame: '#E8704A',
  flora: '#7BC25A',
  stone: '#9C8B6A',
  wind:  '#A6D9D2',
  volt:  '#E0D85C',
};

const FONT = {
  serif: '"EB Garamond", "Cormorant", Georgia, serif',
  sans:  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono:  'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
};

const STAT_KEYS = ['power', 'vitality', 'endurance', 'agility', 'mind'];
const STAT_LABEL = {
  power: 'Power', vitality: 'Vitality', endurance: 'Endurance',
  agility: 'Agility', mind: 'Mind',
};

const useBusVersion = () => {
  const [, setV] = useState(0);
  useEffect(() => inspectCardBus.subscribe(() => setV(v => v + 1)), []);
};

// ─── Section header — every section uses this so taps work consistently. ───
const SectionHeader = ({ id, label }) => {
  const expanded = inspectCardBus.state.expanded.has(id);
  return (
    <div onClick={() => inspectCardBus.toggleExpanded(id)} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 14px 6px', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
    }}>
      <span style={{
        fontFamily: FONT.sans, fontSize: 10, letterSpacing: '0.12em',
        color: C.muted2, textTransform: 'uppercase', fontWeight: 500,
      }}>{label}</span>
      <span style={{ fontFamily: FONT.sans, fontSize: 11, color: C.veryMuted }}>
        {expanded ? '▾' : '▸'}
      </span>
    </div>
  );
};

// ─── Section 1: Identity Band ───
const IdentityBand = ({ s }) => {
  const halo = POLE_HALO[s.pole] || POLE_HALO.light;
  return (
    <div style={{
      padding: '14px',
      borderBottom: `1px solid ${C.divider}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Silhouette + pole halo */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: -8,
            background: `radial-gradient(ellipse at center, ${halo} 0%, transparent 70%)`,
            opacity: 0.55, borderRadius: 50,
          }} />
          <svg width="80" height="100" viewBox="0 0 80 100" style={{ position: 'relative' }}>
            <ellipse cx="40" cy="22" rx="14" ry="17" fill="#D4B090" />
            <path d="M18 44 Q 18 38 40 38 Q 62 38 62 44 L 62 82 Q 62 90 56 91 L 24 91 Q 18 90 18 82 Z"
              fill="#6A7A8A" />
            <rect x="26" y="91" width="9" height="9" fill="#6A7A8A" />
            <rect x="45" y="91" width="9" height="9" fill="#6A7A8A" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.serif, fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
            {s.name || '(unnamed)'}
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 11, color: C.muted, marginTop: 3 }}>
            Lv {s.level || 1} · {s.archetype || 'Wanderer'} · {s.pole || 'unaligned'}
          </div>
          {s.clanTag && (
            <div style={{ fontFamily: FONT.sans, fontSize: 10, color: C.muted2, marginTop: 2 }}>
              {s.clanTag}
            </div>
          )}
          {s.questLine && (
            <div style={{
              fontFamily: FONT.sans, fontSize: 11, color: C.text,
              marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 4,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted2}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>{s.questLine}</span>
            </div>
          )}
          {s.recentJourneyLine && (
            <div style={{
              fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 11,
              color: C.muted, marginTop: 4, lineHeight: 1.3,
            }}>{s.recentJourneyLine}</div>
          )}
        </div>
        {/* Top-right: optional cosmetic logo */}
        {s.logo && (
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            background: `url(${s.logo}) center/contain no-repeat`,
            flexShrink: 0,
          }} />
        )}
      </div>
    </div>
  );
};

// ─── Section 2: Combat ───
const StatTile = ({ stat, value, expanded, tier2 }) => {
  const color = C[stat] || C.text;
  return (
    <div style={{
      width: 60, height: expanded ? 70 : 44, padding: '4px 4px',
      background: color + '33', // 20% opacity tint
      border: `1px solid ${color}`, borderRadius: 6,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
        <circle cx="12" cy="12" r="6" />
      </svg>
      <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.text, fontWeight: 600, lineHeight: 1.1 }}>
        {value || 0}
      </div>
      {expanded && tier2 && (
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.muted, marginTop: 1 }}>
          {tier2}
        </div>
      )}
    </div>
  );
};

const StackedBar = ({ stats }) => {
  const total = STAT_KEYS.reduce((a, k) => a + (stats[k] || 0), 0) || 1;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8, marginBottom: 4 }}>
      {STAT_KEYS.map(k => (
        <div key={k} style={{
          width: `${((stats[k] || 0) / total) * 100}%`,
          background: C[k], height: '100%',
        }} />
      ))}
    </div>
  );
};

const tier2Label = (s, k) => {
  const t2 = s.tier2 || {};
  if (k === 'power' && t2.ferocity)     return `${Math.round(t2.ferocity.crit * 100)}% / x${t2.ferocity.mult}`;
  if (k === 'vitality' && t2.fortification) return `+${t2.fortification} HP`;
  if (k === 'endurance' && t2.stamina)  return `+${t2.stamina} stam`;
  if (k === 'agility' && t2.evasion)    return `${Math.round(t2.evasion * 100)}% eva`;
  if (k === 'mind' && t2.focus)         return `${t2.focus} focus`;
  return null;
};

const CombatSection = ({ s }) => {
  const expanded = inspectCardBus.state.expanded.has('combat');
  const stats = s.stats || {};
  const vows = s.vows || [];
  return (
    <div style={{ borderBottom: `1px solid ${C.divider}` }}>
      <SectionHeader id="combat" label="Combat" />
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ fontSize: 10, color: C.muted2, letterSpacing: '0.12em',
          fontFamily: FONT.sans, textTransform: 'uppercase', marginBottom: 6 }}>
          {s.archetype || 'BALANCED'}
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
          {STAT_KEYS.map(k => (
            <StatTile key={k} stat={k} value={stats[k]}
              expanded={expanded} tier2={tier2Label(s, k)} />
          ))}
        </div>
        <StackedBar stats={stats} />
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${C.divider}` }}>
            <div style={{ fontSize: 10, color: C.muted2, letterSpacing: '0.12em',
              fontFamily: FONT.sans, textTransform: 'uppercase', marginBottom: 6 }}>VOWS</div>
            {vows.length === 0 ? (
              <div style={{ fontFamily: FONT.sans, fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
                (no vows yet)
              </div>
            ) : vows.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 11, fontFamily: FONT.sans, color: C.text, padding: '3px 0' }}>
                <span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                    background: C[v.stat] || C.text, marginRight: 6 }} />
                  {STAT_LABEL[v.stat] || v.stat}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.muted }}>
                  vowed {v.days} days{v.partner ? ` · with ${v.partner}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section 3: Carrying ───
const EquipTile = ({ item, label, size = 80 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: size, height: size, background: C.bg,
      border: `1px solid ${C.divider2}`, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {item ? <ItemArt item={item} size={Math.round(size * 0.65)} /> : (
        <span style={{ color: C.veryMuted, fontSize: 22 }}>—</span>
      )}
    </div>
    <span style={{ fontFamily: FONT.sans, fontSize: 9, color: C.muted2,
      letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
  </div>
);

const CarryingSection = ({ s }) => (
  <div style={{ borderBottom: `1px solid ${C.divider}` }}>
    <SectionHeader id="carrying" label="Carrying" />
    <div style={{
      padding: '0 14px 14px',
      display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'flex-start',
    }}>
      <EquipTile item={s.weapon} label="Weapon" size={80} />
      <EquipTile item={s.armor}  label="Armor"  size={80} />
      <EquipTile item={s.pet}    label="Pet"    size={60} />
    </div>
  </div>
);

// ─── Section 4: Skills ───
const SKILL_KEYS = [
  'cooking', 'fishing', 'farming', 'blacksmithing', 'gemCutting',
  'alchemy', 'woodworking', 'tailoring', 'taming', 'scribing',
];
const SKILL_LABEL = {
  cooking: 'Cooking', fishing: 'Fishing', farming: 'Farming',
  blacksmithing: 'Blacksmithing', gemCutting: 'Gem Cutting',
  alchemy: 'Alchemy', woodworking: 'Woodworking', tailoring: 'Tailoring',
  taming: 'Taming', scribing: 'Scribing',
};

const SkillTile = ({ skill, rank }) => (
  <div style={{
    background: '#FFFFFF', border: `1px solid ${C.divider2}`, borderRadius: 6,
    height: 32, padding: '0 6px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6" />
    </svg>
    <span style={{ fontFamily: FONT.mono, fontSize: 14, color: C.text, fontWeight: 500 }}>
      {rank || 0}
    </span>
  </div>
);

const SkillsSection = ({ s }) => {
  const expanded = inspectCardBus.state.expanded.has('skills');
  const skills = s.skills || {};
  return (
    <div style={{ borderBottom: `1px solid ${C.divider}` }}>
      <SectionHeader id="skills" label="Skills" />
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {SKILL_KEYS.map(k => (
            <SkillTile key={k} skill={k} rank={skills[k]} />
          ))}
        </div>
        {expanded && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.divider}` }}>
            {SKILL_KEYS.map(k => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, fontFamily: FONT.sans, color: C.text, padding: '3px 0',
              }}>
                <span>{SKILL_LABEL[k]}</span>
                <span style={{ fontFamily: FONT.mono, color: C.muted }}>
                  {skills[k] || 0}{(skills[k] || 0) >= 80 ? ' · Guild' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section 5: History ───
const HistorySection = ({ s }) => {
  const expanded = inspectCardBus.state.expanded.has('history');
  const h = s.history || {};
  return (
    <div style={{ borderBottom: `1px solid ${C.divider}` }}>
      <SectionHeader id="history" label="History" />
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT.serif, fontSize: 14, color: C.text }}>
            {h.displayedTitle || <span style={{ fontStyle: 'italic', color: C.muted }}>(no titles yet)</span>}
          </span>
          {h.ascendant && (
            <span style={{ color: '#D4A050', fontSize: 14 }}>★</span>
          )}
        </div>
        {(h.capstones || []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {h.capstones.slice(0, 4).map((c, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: 9, background: C.divider,
                fontFamily: FONT.sans, fontSize: 9, color: C.text,
              }}>{c}</span>
            ))}
          </div>
        )}
        <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.muted2, marginTop: 4 }}>
          {h.zonesCleared || 0} zones · {h.apexKills || 0} apex kills
        </div>
        {expanded && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.divider}` }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 11, color: C.text, marginBottom: 6 }}>
              <strong style={{ fontWeight: 600 }}>All titles:</strong>{' '}
              {(h.titles && h.titles.length) ? h.titles.join(', ')
                : <span style={{ fontStyle: 'italic', color: C.muted }}>(none)</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section 6: Journey ───
const JourneySection = ({ s }) => {
  const expanded = inspectCardBus.state.expanded.has('journey');
  const j = s.journey || {};
  return (
    <div>
      <SectionHeader id="journey" label="Journey" />
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted }}>
            {j.count || 0} entries
          </span>
          <span style={{ fontFamily: FONT.sans, fontSize: 11, color: C.muted2 }}>›</span>
        </div>
        {j.folklore && (
          <div style={{
            fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 11,
            color: C.muted, marginTop: 4, lineHeight: 1.3,
          }}>{j.folklore}</div>
        )}
        {expanded && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.divider}` }}>
            {(j.entries || []).slice(0, 20).map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.muted2, marginRight: 6 }}>
                  Day {e.day || i + 1}
                </span>
                <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 11, color: C.text }}>
                  {e.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Root ───
export const InspectCard = () => {
  useBusVersion();
  const open = inspectCardBus.state.open;
  const subject = inspectCardBus.state.subject;
  const hintShown = inspectCardBus.state.hintShown;

  if (!open || !subject) return null;

  return (
    <>
      <style>{`
        @keyframes inspect-in {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div onClick={() => inspectCardBus.close()} style={{
        position: 'fixed', inset: 0, zIndex: 99800,
        background: 'rgba(30, 51, 40, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '20px 0', overflowY: 'auto',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: 340, maxWidth: '92vw',
          background: C.cardBg, borderRadius: 10,
          boxShadow: '0 6px 28px rgba(0,0,0,.4)',
          color: C.text, fontFamily: FONT.sans,
          animation: 'inspect-in 220ms ease-out',
          marginBottom: 20,
        }}>
          <IdentityBand s={subject} />
          <CombatSection s={subject} />
          <CarryingSection s={subject} />
          <SkillsSection s={subject} />
          <HistorySection s={subject} />
          <JourneySection s={subject} />
          <div onClick={() => inspectCardBus.close()} style={{
            padding: '10px 14px', textAlign: 'center',
            fontFamily: FONT.sans, fontSize: 11, color: C.muted2,
            cursor: 'pointer', borderTop: `1px solid ${C.divider}`,
          }}>close</div>
          {!hintShown && (
            <div onClick={(e) => { e.stopPropagation(); inspectCardBus.markHintSeen(); }}
              style={{
                padding: '6px 10px', background: C.divider,
                fontFamily: FONT.sans, fontSize: 10, color: C.muted,
                textAlign: 'center', borderRadius: 4, margin: '8px 14px 14px',
                fontStyle: 'italic', cursor: 'pointer',
              }}>
              long-press any name or number to learn more · tap to dismiss
            </div>
          )}
        </div>
      </div>
    </>
  );
};
