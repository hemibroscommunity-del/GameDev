/* ═══ v2.3.3556: AFTER THE CLEAR, A CARD THAT COUNTS DOWN ═══
 *
 * game/dungeonClear.js keeps the clock: DUNGEON_LOOT_MS after "DUNGEON
 * CLEARED!" you are taken back out, where it used to be three seconds and the
 * boss's drop was left on the floor.  This is its face: a small card at the
 * top, where Lil Bro's race clock goes (RaceHud.jsx, NmlAskCard's cardPlace),
 * out of the thumbs' way -- "Dungeon cleared!", "Pick up your loot · out in
 * 27 s", and Leave now, which goes at once.  Only while you stand in the
 * cleared dungeon; read off the game's state four times a second while it is
 * up, woken by the clock's bus.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { dungeonClearBus, dungeonClearView, leaveClearedDungeon } from '@/game/dungeonClear.js';
import { cardPlace } from './NmlAskCard.jsx';

const CARD = {
  position: 'fixed', boxSizing: 'border-box', borderRadius: 12,
  background: 'rgba(17,25,29,.94)', border: '1px solid rgba(238,242,235,.24)',
  boxShadow: '0 14px 30px rgba(4,7,9,.38)', color: '#F7F2E7',
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 12px',
};
const BTN = {
  font: 'inherit', flex: '0 0 auto', minHeight: 40, padding: '0 12px', borderRadius: 11,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
  background: 'linear-gradient(180deg,#E2B866,#C9973F)', color: '#1A1408', border: '1px solid #F0CF86',
};

export default function DungeonClearHud({ stateRef }) {
  const [, setTick] = useState(0);
  const S = stateRef && stateRef.current;
  const v = dungeonClearView(S, Date.now());
  useEffect(() => dungeonClearBus.sub(() => setTick((n) => n + 1)), []);
  const live = !!v;
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [live]);
  if (!v) return null;
  const pl = cardPlace();
  const stop = (e) => { e.stopPropagation(); };
  const leave = (e) => { e.preventDefault(); e.stopPropagation(); leaveClearedDungeon(stateRef.current); };
  return createPortal(
    <div data-dungeon-clear={v.secs} role="status" aria-live="polite"
      onPointerDown={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={Object.assign({}, CARD, { left: pl.left, top: pl.top, width: pl.w, zIndex: Z_ABOVE_DASH_PROMPT })}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#F6D38B' }}>Dungeon cleared!</div>
        <div style={{ fontSize: 12, color: '#D9DEDB', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          Pick up your loot · out in {v.secs} s
        </div>
      </div>
      <button type="button" data-dungeon-leave="" onClick={leave} style={BTN}>Leave now</button>
    </div>,
    document.body
  );
}
