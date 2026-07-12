import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — the flat
   label:value dump becomes a real readout: VITALS as spec meters
   (#0B1216 track, flat semantic fill + light overlay), ATTRIBUTES as
   quiet #19252A stat cells with the stat-*.webp icons (Build-column
   language), RECORD as divider rows.  Same data reads, same 400ms
   refresh interval; percentages are display-only derivation. */
/* v2.3.1235: batch-1 rollout — section headers are 11/700 uppercase
   .14em muted on the locked contract ladder (was 600/.12em). */
const secHdr = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.14em', color: COL.muted, margin: '10px 8px 4px',
};

/* Spec bar: track #0B1216 / radius 999 / flat semantic fill + vertical
   light overlay.  10px = the panel-meter size from the spec ladder. */
const Meter = ({ label, cur, max, color }) => {
  const pct = Math.max(0, Math.min(100, (cur / Math.max(1, max)) * 100));
  return (
    <div style={{ padding: '4px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        {/* v2.3.1235: batch-1 rollout — 10px label was below the 11px
            readability floor; vitals values are the panel's key numbers,
            so they move to 16/700 tabular per the contract ladder. */}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted }}>
          {label}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
          {cur} / {max}
        </span>
      </div>
      <div style={{
        /* v2.3.1235: batch-1 rollout — #0B1216 was an off-token literal;
           the bar track sits on well-deep (#0B161B) from the approved
           surface set. */
        height: 10, background: COL.wellDeep, borderRadius: 999,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.55)', overflow: 'hidden',
      }}>
        <div style={{
          width: pct + '%', height: '100%', borderRadius: 999,
          backgroundColor: color,
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)',
        }} />
      </div>
    </div>
  );
};

/* Quiet stat cell — icon over 14/700 tabular value, caption label. */
const StatCell = ({ label, iconSrc, glyph, value }) => (
  <div style={{
    /* v2.3.1235: batch-1 rollout — wellSoft/tileBor are off the approved
       correction-pass token list; quiet cells sit on the well surface
       with the standard 1px line. */
    background: COL.well,
    border: `1px solid ${COL.border}`,
    borderRadius: 8,
    padding: '6px 2px 5px',
    textAlign: 'center',
    minWidth: 0,
  }}>
    <img src={iconSrc} alt="" draggable={false}
      style={{ width: 26, height: 26, objectFit: 'contain', display: 'block', margin: '0 auto' }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(glyph)); }} />
    <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    {/* v2.3.1235: batch-1 rollout — 10px caption was below the 11px
        readability floor in the locked contract. */}
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: COL.muted }}>{label}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 36,
    padding: '0 8px',
    borderBottom: `1px solid ${COL.divider}`,
  }}>
    {/* v2.3.1235: batch-1 rollout — 13px body per contract ladder. */}
    <span style={{ fontSize: 13, color: COL.text2 }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

export const StatsPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = S?.rpg || {};
  const cs = R._compStats || {};

  return (
    <div style={panelStyle}>
      <div style={secHdr}>Vitals</div>
      <Meter label="HP"      cur={R.hp ?? 0}      max={R.maxHp ?? 1}      color={COL.hp} />
      <Meter label="MP"      cur={R.mana ?? 0}    max={R.maxMana ?? 1}    color={COL.mp} />
      <Meter label="Stamina" cur={R.stamina ?? 0} max={R.maxStamina ?? 1} color={COL.stam} />

      <div style={secHdr}>Attributes</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: '0 8px' }}>
        <StatCell label="POW" iconSrc="/icons/ui/stat-power.webp"     glyph="⚔" value={R.power ?? 0} />
        <StatCell label="VIT" iconSrc="/icons/ui/stat-vitality.webp"  glyph="♥" value={R.vitality ?? 0} />
        <StatCell label="END" iconSrc="/icons/ui/stat-endurance.webp" glyph="🛡" value={R.endurance ?? 0} />
        <StatCell label="AGI" iconSrc="/icons/ui/stat-agility.webp"   glyph="🏃" value={R.agility ?? 0} />
        <StatCell label="MND" iconSrc="/icons/ui/stat-mind.webp"      glyph="✨" value={R.mind ?? 0} />
      </div>

      <div style={secHdr}>Record</div>
      <Row label="Level"       value={R.level ?? 1} />
      <Row label="XP"          value={R.xp ?? 0} />
      <Row label="Kills"       value={cs.kills ?? 0} />
      <Row label="Deaths"      value={cs.deaths ?? 0} />
      <Row label="Gold earned" value={(cs.totalGoldEarned ?? 0).toLocaleString()} />
    </div>
  );
};
