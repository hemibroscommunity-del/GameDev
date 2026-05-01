import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const Row = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    borderBottom: `1px solid ${COL.divider}`,
    fontSize: 15,
  }}>
    <span style={{ color: COL.muted }}>{label}</span>
    <span style={{ color: COL.text }}>{value}</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div>
          <Row label="Level"     value={R.level ?? 1} />
          <Row label="HP"        value={`${R.hp ?? 0} / ${R.maxHp ?? 1}`} />
          <Row label="MP"        value={`${R.mana ?? 0} / ${R.maxMana ?? 1}`} />
          <Row label="Stamina"   value={`${R.stamina ?? 0} / ${R.maxStamina ?? 1}`} />
          <Row label="XP"        value={R.xp ?? 0} />
        </div>
        <div>
          <Row label="Power"     value={R.power ?? 0} />
          <Row label="Vitality"  value={R.vitality ?? 0} />
          <Row label="Endurance" value={R.endurance ?? 0} />
          <Row label="Agility"   value={R.agility ?? 0} />
          <Row label="Mind"      value={R.mind ?? 0} />
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 15, color: COL.muted }}>
        Kills {cs.kills ?? 0} · Deaths {cs.deaths ?? 0} · Gold earned {(cs.totalGoldEarned ?? 0).toLocaleString()}
      </div>
    </div>
  );
};
