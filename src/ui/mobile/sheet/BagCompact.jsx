import React, { useEffect, useRef, useState } from 'react';
import { COL } from '../dash/common.js';
import { getBagEntries } from '../dash/bagModel.js';
import { subscribe as subscribeInvLocks } from '../dash/inventoryLocks.js';
import { itemDetailBus } from '../dash/itemDetailBus.js';
import { BagTile } from '../dash/InventoryPanel.jsx';
import { getEquippedSlots, GHOST_SRC } from './equipModel.js';
import { SlotTile } from './SlotTile.jsx';
import { prefersReducedMotion } from './motion.js';

/* v2.3.1285: the DEFAULT home view of the nav-system — one full-width
   panel, strict 6-col x 2-row grid, no headers, no labels (spec
   §Default State).  Top row: the six equipped positions in fixed order
   Weapon · Shield · Chest · Legs · Cape · Amulet (ghost pictograms
   when empty).  Bottom row: the six most recent bag stacks, newest
   LEFT (bagModel's shared order — anchored items outrank recency by
   design, so both this row and the expanded inventory always agree).

   The band's compact height is DERIVED from this grid's algebra
   (sheetGeometry.js) — 1fr tracks are exact by construction; no
   container queries needed. */

const CELL_GAP = 8;

/* v2.3.1293 (ChatGPT round-3 §4 Bag): unread pickups.  The brief
   arrival pulse stays, but a pickup you haven't LOOKED at keeps a
   small brass dot until its detail card is opened — session-scoped
   module state (a marker, not a save file). */
const UNSEEN = new Set();

export const BagCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);
  useEffect(() => subscribeInvLocks(() => force(v => v + 1)), []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};

  const equipped = getEquippedSlots(R);
  const live = getBagEntries(R).slice(0, 6);

  /* Touch-freeze (spec §Bottom row): while a finger is down on the
     panel, render from a snapshot so a mid-tap pickup can't move the
     target under the finger.  Released with a small settle delay. */
  const frozenRef = useRef(null);
  const holdTimer = useRef(0);
  const onTouchStart = () => {
    if (!frozenRef.current) frozenRef.current = live;
    clearTimeout(holdTimer.current);
  };
  const onTouchEnd = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => { frozenRef.current = null; force(v => v + 1); }, 150);
  };
  const entries = frozenRef.current || live;

  /* Arrival pulse: a key that wasn't in the previous render's set gets
     one brief highlight (no persistent animation — spec §Motion). */
  const prevKeys = useRef(new Set());
  /* v2.3.1293: `seeded` replaces the old prevKeys.size guard — an EMPTY
     bag is still a valid baseline, so the first-ever pickup gets its
     marker too (the size guard silently skipped it). */
  const seeded = useRef(false);
  const newKeys = new Set();
  const keyOf = (e) => e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}`;
  for (const e of entries) {
    const k = keyOf(e);
    if (seeded.current && !prevKeys.current.has(k)) { newKeys.add(k); UNSEEN.add(k); }
  }
  useEffect(() => { prevKeys.current = new Set(entries.map(keyOf)); seeded.current = true; });
  /* v2.3.1293: opening any detail card marks that entry seen (item
     tiles open kind:'inventory'; stash tiles open kind:'stash*' with
     the same index keyOf uses). */
  useEffect(() => itemDetailBus.subscribe(() => {
    const t = itemDetailBus.state.open && itemDetailBus.state.target;
    if (!t) return;
    if (t.kind === 'inventory' && t.key) UNSEEN.delete(`i-${t.key}`);
    else if (typeof t.kind === 'string' && t.kind.startsWith('stash')) UNSEEN.delete(`${t.kind}-${t.index}`);
    force(v => v + 1);
  }), []);

  const openPicker = (pickerSlot) => (anchor) => {
    const st = itemDetailBus.state;
    if (st && st.open && st.target && st.target.kind === 'loadout' && st.target.slot === pickerSlot) {
      itemDetailBus.close();
      return;
    }
    /* v2.3.1285: the picker is no longer docked over the retired Build
       column — anchor-only positioning (ItemDetailPopup handles a null
       panel). */
    itemDetailBus.open({ kind: 'loadout', slot: pickerSlot, anchor, panel: null });
  };
  const openAmulet = (anchor) => {
    if (R.amulet) itemDetailBus.open({ kind: 'amulet', amulet: R.amulet, anchor });
  };

  return (
    /* id="bt-bag-target": the fishing catch-flight landing point
       (effectsRenderer._updateCatchFlights) — moved here from the
       retired quick-bag preview.  Silent breakage if dropped. */
    <div
      id="bt-bag-target"
      data-tut="dash-bag"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: CELL_GAP,
        padding: '8px 8px',
        alignContent: 'start',
      }}>
      {/* Row 1 — equipped, fixed order. */}
      {equipped.map(sl => (
        <SlotTile
          key={`eq-${sl.slot}`}
          k={`eq-${sl.slot}`}
          label={sl.label}
          iconSrc={sl.iconSrc}
          ghostSrc={sl.ghost ? GHOST_SRC[sl.slot] : null}
          occupied={!sl.ghost}
          quality={sl.quality}
          onTap={sl.pickerSlot ? openPicker(sl.pickerSlot)
            : sl.slot === 'amulet' && R.amulet ? openAmulet
            : undefined}
        />
      ))}
      {/* Row 2 — recent bag stacks, newest left. */}
      {entries.map((e) => {
        const k = keyOf(e);
        return (
          <div key={k}
            className={newKeys.has(k) && !prefersReducedMotion() ? 'bt-arrive-pulse' : undefined}
            style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
            <BagTile entry={e} />
            {/* v2.3.1293: unread marker — stays until inspected (the
                pulse alone vanished before the player looked). */}
            {UNSEEN.has(k) && (
              <span aria-hidden="true" style={{
                position: 'absolute', top: 3, left: 3,
                width: 7, height: 7, borderRadius: '50%',
                background: COL.accent,
                border: '1px solid rgba(0,0,0,.45)',
                pointerEvents: 'none', zIndex: 1,
              }} />
            )}
          </div>
        );
      })}
      {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
        <div key={`pe-${i}`} aria-hidden="true" style={{
          aspectRatio: '1 / 1',
          width: '100%',
          background: COL.wellSoft,
          border: `1px solid ${COL.tileBor}`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)',
          borderRadius: 8,
        }} />
      ))}
    </div>
  );
};
