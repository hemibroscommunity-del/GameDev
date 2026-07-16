import React, { useEffect, useRef, useState } from 'react';
import { COL } from '../dash/common.js';
import { getBagEntries } from '../dash/bagModel.js';
import { subscribe as subscribeInvLocks } from '../dash/inventoryLocks.js';
import { BagTile } from '../dash/InventoryPanel.jsx';
import { prefersReducedMotion } from './motion.js';
import { bagUnseen, bagEntryKey } from './bagUnseenModel.js';

/* v2.3.1285: the DEFAULT home view of the nav-system — one full-width
   panel, strict 6-col x 2-row grid, no headers, no labels (spec
   §Default State).
   v2.3.1327 (owner: "move the equipped item row out of the compact
   view and replace it with just the standard row of inventory
   slots"): the equipped positions now live ONLY on the expanded Bag's
   Equipped tab (v2.3.1326) — the compact view is twelve standard
   inventory slots, newest LEFT (bagModel's shared order — anchored
   items outrank recency by design, so this grid and the expanded
   inventory always agree).  The v2.3.1312 recent-row darkening is
   retired with the equipped row: with one surface there is no second
   row to distinguish.  Sparkle markers, the arrival pulse, and the
   touch-freeze all stay.

   The band's compact height is DERIVED from this grid's algebra
   (sheetGeometry.js) — 1fr tracks are exact by construction; no
   container queries needed. */

const CELL_GAP = 8;
const SLOTS = 12;

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

  const live = getBagEntries(R).slice(0, SLOTS);

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
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '8px 8px',
      }}>
      <div style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: CELL_GAP }}>
        {entries.map((e) => {
          const k = keyOf(e);
          return (
            <div key={k}
              className={newKeys.has(k) && !prefersReducedMotion() ? 'bt-arrive-pulse' : undefined}
              style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
              <BagTile entry={e} />
              {/* v2.3.1293: unread marker — stays until inspected (the
                  pulse alone vanished before the player looked).
                  v2.3.1312: the owner's sparkle art replaces the brass
                  dot (round-8: "brass dot or corner sparkle").  No
                  drop-shadow filter: the sheet composites over the
                  WebGL canvas and iOS filter compositing is the
                  v2.3.948 static-noise trap. */}
              {bagUnseen.has(k) && (
                <img aria-hidden="true" alt="" draggable={false}
                  src="/icons/bag/bag-new-item.webp?v=2.3.1312"
                  style={{
                    position: 'absolute', top: 1, left: 1,
                    width: 14, height: 14,
                    pointerEvents: 'none', zIndex: 1,
                  }} />
              )}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, SLOTS - entries.length) }).map((_, i) => (
          /* Empty cells match the expanded inventory's standard empty
             slots — one surface, one language (v2.3.1327). */
          <div key={`pe-${i}`} aria-hidden="true" style={{
            aspectRatio: '1 / 1',
            width: '100%',
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(238, 242, 235, 0.24)',
            borderRadius: 8,
          }} />
        ))}
      </div>
    </div>
  );
};
