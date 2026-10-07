import React from 'react';
import { HARDENED_WOOD_RECIPES, HARDENED_WOOD_MAX_PER_REQUEST } from '@/data/hardenedWood.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';

/* ═══ v2.3.3139: THE WOODWORKER'S HARDEN TAB ═══
 * The owner: "Maybe 5 logs of the raw material can make one 'hardened (name)
 * wood' raw material so it mirrors the same structure."  The Blacksmith's
 * Smelt tab, at the Woodworker: one row a wood, five of its logs make one
 * hardened wood and pay Woodworking XP, each wood at its own Woodworking
 * level.  A bow or a staff is hardened with its own wood's (the Bow and Staff
 * views' Harden button).
 *
 * The worker takes the logs and gives the wood (server/src/hardenedwood.js
 * make_hardened_wood); this only asks, and waits for its receipt
 * (hardened_wood_result in wsClient -- the words over your head, and
 * S._hardenedWoodSeen, which clears the busy state) and the bag that comes
 * with it.  Logs, levels and XP read from the table the worker settles from
 * (data/hardenedWood.js; mirror-audit).
 *
 * Shown only against a worker that makes it (caps.hardenedwood, read by
 * WoodworkPanel).  Test hooks: data-hw-tab, data-hw-row, data-hw-make,
 * data-hw-all, data-hw-have. */
const C = {
  card: '#24363C', well: '#111E23', raised: '#293B41', text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98',
  brass: '#D8AA58', good: '#55B98A', bad: '#D8635D', line: 'rgba(229,237,233,.11)',
};

function Btn({ on, onClick, children, primary, ...rest }) {
  return (
    <button disabled={!on} onClick={() => { if (on) onClick(); }} {...rest}
      style={{ minHeight: 40, minWidth: 58, padding: '0 10px', borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
        cursor: on ? 'pointer' : 'default', fontVariantNumeric: 'tabular-nums',
        border: on ? (primary ? '1px solid #EAC675' : '1px solid rgba(229,237,233,.20)') : '1px solid ' + C.line,
        background: on ? (primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : C.raised) : '#1A292F',
        color: on ? (primary ? '#172126' : C.text) : C.mute }}>
      {children}
    </button>
  );
}

export function HardenedWoodTab({ rpgState, stateRef }) {
  const S = (stateRef && stateRef.current) || {};
  const inv = (rpgState && rpgState.inventory) || {};
  const lvl = Math.max(1, Math.floor(Number(((rpgState && rpgState.lifeSkills) || {}).woodworking && rpgState.lifeSkills.woodworking.level) || 1));
  const [busy, setBusy] = React.useState(null);
  const sentAt = React.useRef(0);
  /* the receipt's counter moves when the worker answers (wsClient) */
  const seen = React.useRef(S._hardenedWoodSeen || 0);
  React.useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => {
      const s = stateRef.current || {};
      if ((s._hardenedWoodSeen || 0) !== seen.current || Date.now() - sentAt.current > 3500) {
        seen.current = s._hardenedWoodSeen || 0;
        setBusy(null);
      }
    }, 120);
    return () => clearInterval(t);
  }, [busy, stateRef]);

  const make = (key, n) => {
    if (!S.channel || busy) return;
    try { S.channel.send({ type: 'make_hardened_wood', payload: { key, count: n } }); } catch (e) { return; }
    sentAt.current = Date.now();
    seen.current = S._hardenedWoodSeen || 0;
    setBusy(key);
  };

  return (
    <div data-hw-tab="1">
      {Object.keys(HARDENED_WOOD_RECIPES).map((key) => {
        const r = HARDENED_WOOD_RECIPES[key];
        const logs = Math.floor(Number(inv[r.log]) || 0);
        const have = Math.floor(Number(inv[key]) || 0);
        const locked = lvl < r.minLvl;
        const can = locked ? 0 : Math.min(HARDENED_WOOD_MAX_PER_REQUEST, Math.floor(logs / r.logCost));
        const on = can > 0 && !busy;
        return (
          <div key={key} data-hw-row={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.card, borderRadius: 12, marginBottom: 8, opacity: locked ? 0.72 : 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.well, display: 'grid', placeItems: 'center', flex: 'none' }}>
              <img src={thumbFor(key) || thumbFor(r.log) || ''} alt="" draggable={false} style={{ width: 38, height: 38, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name} <span data-hw-have={have} style={{ color: C.mute, fontWeight: 700 }}>×{have}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.mute, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                <img src={thumbFor(r.log) || ''} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                <span data-hw-logs={logs} style={{ color: logs >= r.logCost ? C.good : C.bad, fontWeight: 700 }}>{logs}/{r.logCost}</span>
                {locked
                  ? <span data-hw-lock={r.minLvl} style={{ color: C.brass, fontWeight: 700 }}>· Woodworking {r.minLvl}</span>
                  : <span>· +{r.xp} XP</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn on={on} primary data-hw-make={key} onClick={() => make(key, 1)}>{busy === key ? '…' : locked ? 'Locked' : 'Make'}</Btn>
              {can > 1 && <Btn on={on} data-hw-all={key} onClick={() => make(key, can)}>All {can}</Btn>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default HardenedWoodTab;
