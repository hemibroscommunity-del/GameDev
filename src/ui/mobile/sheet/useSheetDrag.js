import { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { sheetTransition } from './motion.js';

/* v2.3.1283: swipe-to-expand / swipe-to-collapse for the bottom sheet
   (nav-system spec §Direct manipulation).

   v2.3.1290 (three-state nav): THREE snaps — bar / compact / expanded.
   Settle: a flick (|v| >= 0.5 px/ms) moves ONE snap in its direction
   from the mode the drag started in; otherwise the nearest of the
   three snaps wins.  The final mode lands on the bus so toolbar state
   stays truthful.

   v2.3.1307 (owner): gestures moved OFF the band and ONTO the toolbar
   ribbon.  "It gets too ambiguous allowing swipes over interactive
   menus" — the old band-wide drag competed with panel scrolling,
   chip strips, and buttons, and needed a pile of opt-out guards
   (scroller walks, pull-down-from-top special cases) that still
   guessed wrong.  Now:
     - the gesture SURFACE is the toolbar frame (toolbarRef) — the one
       strip that is never a scroller; the band root (dashRef) remains
       the element whose height animates.
     - swipes work in ALL modes, including bar: swipe up on a
       destination icon opens THAT destination (the icon under the
       finger at touchstart, recorded via data-dest).
     - swiping is the ONLY resize method — tap-cycling and the header
       chevron are gone (BottomDashboard/dashboardPanelBus).
     - a recognized swipe stamps window.__btNavSwipeTs so IconButton
       swallows the pointerup that would otherwise ALSO fire the tap. */
export function useSheetDrag(dashRef, toolbarRef, getBarPx, getCompactPx, getExpandedPx) {
  useEffect(() => {
    const el = dashRef.current;
    const surface = toolbarRef.current;
    if (!el || !surface) return;

    let touchId = null;
    let startY = 0, startX = 0, lastY = 0, lastT = 0, vel = 0;
    let dragging = false;        /* recognition passed */
    let startHeight = 0;
    let startMode = 'compact';
    let startDest = null;        /* destination icon under the finger */

    const onStart = (e) => {
      if (touchId != null) return;
      const t = e.changedTouches[0];
      /* Which destination icon (if any) the swipe starts on — a swipe
         UP from the bar opens this destination. */
      const btn = t.target.closest && t.target.closest('.bt-dashboard-nav-button');
      startDest = (btn && btn.dataset && btn.dataset.dest) || null;
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
        dragging = true;
        el.style.transition = 'none';
      }
      /* Tell IconButton the pointerup ending this gesture is a swipe,
         not a tap (it fires on onPointerUp for iOS reasons).  Stamped
         on EVERY move, not just at recognition: pointerup dispatches
         BEFORE touchend, so a stale stamp from a slow >350ms drag
         would let the release fire the tap after all. */
      try { window.__btNavSwipeTs = Date.now(); } catch (err) {}
      /* v2.3.1307b (owner: opening compact from the bar "opens too
         large for a split second and snaps into place"): the live drag
         used to track the finger across the FULL bar..expanded range,
         so a natural flick from the bar carried the band past the
         compact snap before release, and the settle eased it back down
         — read as an overshoot-bounce.  A gesture now moves exactly
         ONE snap (matching the flick rule that always applied), and
         the drag clamps to that one-step range so the band physically
         cannot travel past where it will land:
           bar      -> [bar .. compact]
           compact  -> [bar .. expanded]   (one step either way)
           expanded -> [compact .. expanded]
         Fully closing from expanded is two short swipes — the ▼▼ cue
         re-advertises after the first. */
      const barPx = getBarPx();
      const compactPx = getCompactPx();
      const expandedPx = getExpandedPx();
      const lo = startMode === 'expanded' ? compactPx : barPx;
      const hi = startMode === 'bar' ? compactPx : expandedPx;
      const h = Math.max(lo, Math.min(hi, startHeight - dy));
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
      const dest = startDest;
      touchId = null;
      dragging = false;
      startDest = null;
      if (!wasDragging) return;
      try { window.__btNavSwipeTs = Date.now(); } catch (err) {}
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
      /* v2.3.1307: an OPENING swipe adopts the icon it started on — a
         swipe up on Quests opens Quests, regardless of which
         destination was remembered from last time.  Done before the
         settle so the one emit renders the right panel. */
      if (target.mode !== 'bar' && dest && dashboardPanelBus.root() !== dest) {
        dashboardPanelBus.state.stack = [dest];
      }
      el.style.transition = sheetTransition();
      /* Settle to the snap height — but write the EXACT string React
         renders for the target mode (BottomDashboard.jsx height
         ternary: 'var(--dash-h)' for bar, snap px otherwise).

         v2.3.1304: this string identity is load-bearing.  The old code
         always pinned raw px ('72px'), so on a collapse-to-bar the
         settle() re-render diffed height ('72px' -> 'var(--dash-h)',
         same computed value, different specified string) and re-wrote
         it MID-TRANSITION — interrupting the live 220ms ease and
         restarting it over the remaining distance, which read as a
         rubber-band bounce.  With identical strings React's re-render
         diffs height as unchanged and never touches it.  A pin (not
         '') is still required for the mode-UNCHANGED snap-back: settle
         no-ops, React doesn't re-render, and an emptied inline height
         would collapse the band to auto. */
      el.style.height = target.mode === 'bar' ? 'var(--dash-h)' : target.px + 'px';
      dashboardPanelBus.settle(target.mode);
    };

    surface.addEventListener('touchstart', onStart, { passive: true });
    surface.addEventListener('touchmove', onMove, { passive: false });
    surface.addEventListener('touchend', onEnd, { passive: true });
    surface.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      surface.removeEventListener('touchstart', onStart);
      surface.removeEventListener('touchmove', onMove);
      surface.removeEventListener('touchend', onEnd);
      surface.removeEventListener('touchcancel', onEnd);
    };
  }, []);
}
