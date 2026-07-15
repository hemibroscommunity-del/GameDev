import React, { useEffect, useRef, useState } from 'react';
import { COL } from '../dash/common.js';
import { getBagEntries } from '../dash/bagModel.js';
import { subscribe as subscribeInvLocks } from '../dash/inventoryLocks.js';
import { itemDetailBus } from '../dash/itemDetailBus.js';
import { BagTile } from '../dash/InventoryPanel.jsx';
import { getEquippedSlots, GHOST_SRC } from './equipModel.js';
import { SlotTile } from './SlotTile.jsx';
import { prefersReducedMotion } from './motion.js';
import { bagUnseen, bagEntryKey } from './bagUnseenModel.js';

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

/* v2.3.1293 (ChatGPT round-3 §4 Bag): unread pickups — a pickup you
   haven't LOOKED at keeps a marker until its detail card is opened.
   v2.3.1312 (round-8): the registry moved to bagUnseenModel.js so the
   toolbar Bag badge + pickup pulse share it. */

export const BagCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);
  useEffect(() => subscribeInvLocks(() => force(v => v + 1)), []);
  useEffect(() => bagUnseen.subscribe(() => force(v => v + 1)), []);

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
     one brief highlight (no persistent animation — spec §Motion).
     LOCAL detection only drives the pulse — unseen REGISTRATION and
     the detail-card markSeen both moved to the BottomDashboard watcher
     (v2.3.1312), which is mounted in every mode; this component isn't
     (bar + expanded unmount it), and a compact-only watcher missed
     every pickup made while the sheet was resting. */
  const prevKeys = useRef(new Set());
  /* v2.3.1293: `seeded` replaces the old prevKeys.size guard — an EMPTY
     bag is still a valid baseline, so the first-ever pickup gets its
     marker too (the size guard silently skipped it). */
  const seeded = useRef(false);
  const newKeys = new Set();
  const keyOf = bagEntryKey;
  for (const e of entries) {
    const k = keyOf(e);
    if (seeded.current && !prevKeys.current.has(k)) newKeys.add(k);
  }
  useEffect(() => { prevKeys.current = new Set(entries.map(keyOf)); seeded.current = true; });

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

  /* v2.3.1315 (owner round-8b): "the equipped row needs to be more
     obvious" — a slim labeled header with the owner's bag-equipped
     icon and an open-slot count.  Cape counts as open until it gets a
     data field (it IS an empty position). */
  const openSlots = equipped.filter(sl => sl.ghost).length;

  return (
    /* id="bt-bag-target": the fishing catch-flight landing point
       (effectsRenderer._updateCatchFlights) — moved here from the
       retired quick-bag preview.  Silent breakage if dropped. */
    /* v2.3.1315: grid -> flex column (label row / equipped grid /
       hairline / recent grid) so the label and separator have natural
       homes; tiles stay square via their own aspect-ratio, and the
       compact height algebra moved with it (sheetGeometry DASH_BASE). */
    <div
      id="bt-bag-target"
      data-tut="dash-bag"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 8px',
      }}>
      <div style={{
        height: 14,
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flex: 'none',
      }}>
        <img src="/icons/bag/bag-equipped.webp?v=2.3.1315" alt="" aria-hidden="true"
          draggable={false} style={{ width: 13, height: 13, objectFit: 'contain' }} />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.09em',
          textTransform: 'uppercase', color: COL.text2, lineHeight: 1,
        }}>Equipped</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
          textTransform: 'uppercase', color: COL.muted, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{openSlots === 0 ? 'Full' : `${openSlots} ${openSlots === 1 ? 'slot' : 'slots'} open`}</span>
      </div>
      {/* Row 1 — equipped, fixed order. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: CELL_GAP, flex: 'none' }}>
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
      </div>
      {/* v2.3.1312 (round-8 §3): hairline between the equipped row and
          the recent-pickups row. */}
      <div aria-hidden="true" style={{
        height: 1, margin: '7px 2px',
        background: 'rgba(0,0,0,.35)',
        boxShadow: '0 1px 0 rgba(229,237,233,.06)',
        flex: 'none',
      }} />
      {/* Row 2 — recent bag stacks, newest left. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: CELL_GAP, flex: 'none' }}>
      {/* v2.3.1315: recent row keeps its darker treatment + sparkle
          markers (round-8 §3) inside its own grid now. */}
      {entries.map((e) => {
        const k = keyOf(e);
        return (
          <div key={k}
            className={newKeys.has(k) && !prefersReducedMotion() ? 'bt-arrive-pulse' : undefined}
            style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
            <BagTile entry={e} />
            {/* v2.3.1312 (round-8 §3): recent-row cells sit a shade
                darker than the equipped row — plain overlay, never a
                CSS filter (iOS WebGL compositing trap, v2.3.948). */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, borderRadius: 8,
              background: 'rgba(0,0,0,.07)',
              pointerEvents: 'none',
            }} />
            {/* v2.3.1293: unread marker — stays until inspected (the
                pulse alone vanished before the player looked).
                v2.3.1312: the owner's sparkle art replaces the brass
                dot (round-8: "brass dot or corner sparkle"). */}
            {bagUnseen.has(k) && (
              <img aria-hidden="true" alt="" draggable={false}
                src="/icons/bag/bag-new-item.webp?v=2.3.1312"
                style={{
                  /* No drop-shadow filter here: the sheet composites
                     over the WebGL canvas and iOS filter compositing
                     is the v2.3.948 static-noise trap. */
                  position: 'absolute', top: 1, left: 1,
                  width: 14, height: 14,
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
          /* v2.3.1312: empty recent cells carry the same darkening as
             occupied ones so the row reads as one surface. */
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 0 0 999px rgba(0,0,0,.07)',
          borderRadius: 8,
        }} />
      ))}
      </div>
    </div>
  );
};
