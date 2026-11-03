/* ═══ v2.3.4012: THE ONE BAND'S COLUMNS ROW, LAID OUT FROM ITS OWN BOX ═══
 *
 * Under the one band (?oneband=1, src/ui/oneBand.js) the band is every
 * screen's: an upright phone's 390 x 191 row, a sideways phone's 844 x 82, a
 * computer's 1280 x 192.  The upright row's counts are fixed for one shape
 * (BAG_VIEW_COLS 4, DASH_ROWS 2), so here the row MEASURES the box it is
 * given -- never a device check -- and hands it to DashColumns (`box`), which
 * takes its tile, its slot counts and its combat cards from sheetGeometry's
 * oneBandLayout.  A ResizeObserver, so a rotation, a window drag or the
 * Island's insets (game.css's html.bt-one-band block narrows the band) lay it
 * out again; it only sets state when the whole-pixel box moved.
 *
 * Kept apart from DashColumns (Lane A's) and BottomDashboard so the switch is
 * one line in each: when the Gear tab lays itself out from its own box, this
 * hands it the same box. */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { DashColumns } from './DashColumns.jsx';
import { oneBandLayout } from '../sheet/sheetGeometry.js';

export function OneBandColumns({ R }) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = Math.floor(el.clientWidth), h = Math.floor(el.clientHeight);
      if (!(w > 0 && h > 0)) return;
      setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    if (ro) ro.observe(el);
    else window.addEventListener('resize', read);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', read); };
  }, []);
  /* the layout rides on the element for the QA probe (window.__btOneBand) */
  const L = box ? oneBandLayout(box.w, box.h) : null;
  return (
    <div ref={ref} data-one-band-cols=""
      data-one-band-layout={L ? JSON.stringify({ w: box.w, h: box.h, ...L }) : undefined}
      style={{ position: 'absolute', inset: 0, touchAction: 'manipulation' }}>
      {box ? <DashColumns R={R} box={box} /> : null}
    </div>
  );
}
