import React from 'react';
import { TRAPPING } from '@/data/trapping.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';

/* ═══ v2.3.3120: THE WOODWORKER'S TRAPS TAB ═══
 * Plan: docs/PET-TRAPPING-PLAN.md, "Making traps": one log of ANY kind makes
 * one box trap, up to 50 a press, and pays a little Woodworking XP.  The
 * worker takes the logs and gives the traps (server/src/trapping.js
 * make_traps); this only asks, and waits for its receipt
 * (make_traps_result, game/trapping.js onMakeTrapsResult -- the words over
 * your head) and the bag that comes with it.  The costs and the XP read from
 * the same table the worker settles from (data/trapping.js; mirror-audit).
 *
 * Shown only against a worker that makes traps (caps.trapcraft, read by
 * WoodworkPanel).  Test hooks: data-traps-row, data-traps-make. */
const C = {
  card: '#24363C', well: '#111E23', raised: '#293B41', text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98',
  brass: '#D8AA58', good: '#55B98A', line: 'rgba(229,237,233,.11)',
};
const NAMES = { wood_pine_log: 'Pine Log', wood_softwood: 'Softwood', wood_hardwood: 'Hardwood', wood_cedar_wood: 'Cedar Wood', wood_maple_wood: 'Maple Wood' };

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

export function TrapsTab({ rpgState, stateRef }) {
  const S = (stateRef && stateRef.current) || {};
  const inv = (rpgState && rpgState.inventory) || {};
  const traps = Math.floor(Number(inv[TRAPPING.TRAP]) || 0);
  const [busy, setBusy] = React.useState(null);
  const sentAt = React.useRef(0);
  /* the receipt's counter moves when the worker answers (game/trapping.js) */
  const madeSeen = React.useRef(S._trapsMade || 0);
  React.useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => {
      const s = stateRef.current || {};
      if ((s._trapsMade || 0) !== madeSeen.current || Date.now() - sentAt.current > 3500) {
        madeSeen.current = s._trapsMade || 0;
        setBusy(null);
      }
    }, 120);
    return () => clearInterval(t);
  }, [busy, stateRef]);

  const make = (log, n) => {
    if (!S.channel || busy) return;
    try { S.channel.send({ type: 'make_traps', payload: { log, count: n } }); } catch (e) { return; }
    sentAt.current = Date.now();
    madeSeen.current = S._trapsMade || 0;
    setBusy(log);
  };

  const logs = Object.keys(TRAPPING.LOGS);
  const held = logs.filter((k) => Math.floor(Number(inv[k]) || 0) > 0);
  return (
    <div data-traps-tab="1">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.well, borderRadius: 12, marginBottom: 10 }}>
        <img src={TRAP_ICON_URL} alt="" draggable={false} style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Box Trap <span data-traps-have={traps} style={{ color: C.mute, fontWeight: 700 }}>×{traps}</span></div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.35 }}>One log of any kind each. A trap is used every time it springs.</div>
        </div>
      </div>
      {held.length === 0 && (
        <div data-traps-nologs="1" style={{ fontSize: 13, color: C.sub, padding: '10px 12px', background: C.card, borderRadius: 12 }}>
          You have no logs. Chop any tree out in the lands, then come back.
        </div>
      )}
      {held.map((log) => {
        const have = Math.floor(Number(inv[log]) || 0);
        const per = TRAPPING.LOGS[log];
        const can = Math.min(TRAPPING.MAX_PER_REQUEST, Math.floor(have / per));
        const on = can > 0 && !busy;
        return (
          <div key={log} data-traps-row={log} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.card, borderRadius: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.well, display: 'grid', placeItems: 'center', flex: 'none' }}>
              <img src={thumbFor(log) || ''} alt="" draggable={false} style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{NAMES[log] || log}</div>
              <div style={{ fontSize: 12, color: C.mute, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: C.good }}>×{have}</span> · +{TRAPPING.MAKE_XP} XP each
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn on={on} primary data-traps-make={log} data-traps-n="1" onClick={() => make(log, 1)}>{busy === log ? '…' : 'Make'}</Btn>
              {can >= 10 && <Btn on={on} data-traps-n="10" onClick={() => make(log, 10)}>×10</Btn>}
              {can > 1 && <Btn on={on} data-traps-all={log} onClick={() => make(log, can)}>All {can}</Btn>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TrapsTab;
