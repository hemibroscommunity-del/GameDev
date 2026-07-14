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
   Settle: velocity >= 0.5 px/ms wins in its direction; otherwise the
   nearest snap past the midpoint.  The final mode lands on the bus so
   toolbar state stays truthful. */
export function useSheetDrag(dashRef, getCompactPx, getExpandedPx) {
  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;

    let touchId = null;
    let startY = 0, startX = 0, lastY = 0, lastT = 0, vel = 0;
    let dragging = false;        /* recognition passed */
    let startHeight = 0;
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
      const t = e.changedTouches[0];
      /* Toolbar buttons keep their own tap handling — a drag starting
         there would eat the click synthesis. */
      if (t.target.closest && t.target.closest('.bt-dashboard-nav-button')) return;
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
      const compactPx = getCompactPx();
      const expandedPx = getExpandedPx();
      const h = Math.max(compactPx, Math.min(expandedPx, startHeight - dy));
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
      const compactPx = getCompactPx();
      const expandedPx = getExpandedPx();
      const h = el.getBoundingClientRect().height;
      let expand;
      if (Math.abs(vel) >= 0.5) expand = vel < 0;               /* flick */
      else expand = h > (compactPx + expandedPx) / 2;            /* midpoint */
      el.style.transition = sheetTransition();
      /* Settle to the explicit snap px: when the mode DIDN'T change the
         bus won't emit and React won't re-render, so an emptied inline
         height would leave the band collapsed to auto.  The next React
         render re-asserts the style prop anyway. */
      el.style.height = (expand ? expandedPx : compactPx) + 'px';
      if (expand) dashboardPanelBus.expand(); else dashboardPanelBus.collapse();
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
