import { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { sheetTransition } from './motion.js';

/* v2.3.1283: swipe-to-expand / swipe-to-collapse for the bottom sheet
   (nav-system spec §Direct manipulation).  Native touch listeners on
   the band root, passive:false, mounted alongside the existing
   rubber-band preventDefault walker — this hook OWNS vertical drags
   that start on non-scrolling chrome; touches inside a scrollable
   panel keep scrolling (unless the scroller sits at scrollTop 0 and
   the finger pulls DOWN, which reads as "collapse").

   Recognition: candidate until |dy| > 12px AND |dy| > |dx|; then the
   hook takes over — transition is disabled and the band height tracks
   the finger directly (same-panel-growing feel, not a page swap).

   v2.3.1290 (three-state nav): THREE snaps — bar / compact / expanded.
   Drags are disabled while resting in bar mode (the band is all
   toolbar buttons there; destinations open by tap).  Settle: a flick
   (|v| >= 0.5 px/ms) moves ONE snap in its direction from the mode the
   drag started in; otherwise the nearest of the three snaps wins.  The
   final mode lands on the bus so toolbar state stays truthful. */
export function useSheetDrag(dashRef, getBarPx, getCompactPx, getExpandedPx) {
  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;

    let touchId = null;
    let startY = 0, startX = 0, lastY = 0, lastT = 0, vel = 0;
    let dragging = false;        /* recognition passed */
    let startHeight = 0;
    let startMode = 'compact';
    let allowCollapseFromScroller = false;

    const scrollerUnder = (target) => {
      let node = target;
      while (node && node !== el && node.nodeType === 1) {
        try {
          const cs = window.getComputedStyle(node);
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return node;
        } catch (_) {}
        node = node.parentNode;
      }
      return null;
    };

    const onStart = (e) => {
      if (touchId != null) return;
      /* v2.3.1290: no drags from the bar — the resting band is just the
         toolbar; a vertical swipe there is almost always a mis-aimed
         world touch, and eating it would also delay button taps. */
      if (dashboardPanelBus.state.mode === 'bar') return;
      const t = e.changedTouches[0];
      /* Toolbar buttons keep their own tap handling — a drag starting
         there would eat the click synthesis. */
      if (t.target.closest && t.target.closest('.bt-dashboard-nav-button')) return;
      /* v2.3.1290: a touch inside a HORIZONTAL scroller (the Bag filter
         chip strip) is a chip scroll, never a sheet drag. */
      let hn = t.target;
      while (hn && hn !== el && hn.nodeType === 1) {
        try {
          const cs = window.getComputedStyle(hn);
          if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && hn.scrollWidth > hn.clientWidth) return;
        } catch (_) {}
        hn = hn.parentNode;
      }
      const scroller = scrollerUnder(t.target);
      if (scroller) {
        /* Inside a scroller: only a pull-down from the very top may
           become a collapse drag; everything else is a scroll. */
        if (scroller.scrollTop > 0) return;
        allowCollapseFromScroller = true;
      } else {
        allowCollapseFromScroller = false;
      }
      touchId = t.identifier;
      startY = lastY = t.clientY;
      startX = t.clientX;
      lastT = e.timeStamp;
      vel = 0;
      dragging = false;
      startHeight = el.getBoundingClientRect().height;
      startMode = dashboardPanelBus.state.mode;
    };

    const findTouch = (e) => {
      for (const t of e.changedTouches) if (t.identifier === touchId) return t;
      return null;
    };

    const onMove = (e) => {
      const t = findTouch(e);
      if (!t) return;
      const dy = t.clientY - startY;
      const dx = t.clientX - startX;
      if (!dragging) {
        if (Math.abs(dy) <= 12 || Math.abs(dy) <= Math.abs(dx)) return;
        /* A scroller-origin touch may only DRAG DOWN (collapse). */
        if (allowCollapseFromScroller === true && dy < 0) { touchId = null; return; }
        dragging = true;
        el.style.transition = 'none';
      }
      const barPx = getBarPx();
      const expandedPx = getExpandedPx();
      const h = Math.max(barPx, Math.min(expandedPx, startHeight - dy));
      el.style.height = h + 'px';
      const dt = Math.max(1, e.timeStamp - lastT);
      vel = (t.clientY - lastY) / dt; /* +down / -up, px per ms */
      lastY = t.clientY;
      lastT = e.timeStamp;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };

    const onEnd = (e) => {
      const t = findTouch(e);
      if (!t) return;
      const wasDragging = dragging;
      touchId = null;
      dragging = false;
      if (!wasDragging) return;
      const snaps = [
        { mode: 'bar', px: getBarPx() },
        { mode: 'compact', px: getCompactPx() },
        { mode: 'expanded', px: getExpandedPx() },
      ];
      const h = el.getBoundingClientRect().height;
      let target;
      if (Math.abs(vel) >= 0.5) {
        /* Flick: one snap in the flick's direction from the start mode. */
        const idx = snaps.findIndex(s => s.mode === startMode);
        target = snaps[Math.max(0, Math.min(snaps.length - 1, idx + (vel < 0 ? 1 : -1)))];
      } else {
        /* Nearest snap to the released height. */
        target = snaps.reduce((a, b) => (Math.abs(b.px - h) < Math.abs(a.px - h) ? b : a));
      }
      el.style.transition = sheetTransition();
      /* Settle to the explicit snap px: when the mode DIDN'T change the
         bus won't emit and React won't re-render, so an emptied inline
         height would leave the band collapsed to auto.  The next React
         render re-asserts the style prop anyway. */
      el.style.height = target.px + 'px';
      dashboardPanelBus.settle(target.mode);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);
}
