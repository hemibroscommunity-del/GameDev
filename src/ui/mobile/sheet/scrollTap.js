/* ═══ v2.3.2326: A TAP THE BROWSER THREW AWAY IS STILL A TAP ═══
 *
 * Owner: "For stat allocation build section tapping on the open accordion
 * doesn't close it again."
 *
 * The handler was not the bug.  v2.3.2315 had already turned it from a SET
 * into a real toggle, and mp-prog3 has had a three-tap test pinning that ever
 * since -- green the whole time.  The bug is that on a real phone the tap
 * never reaches the handler at all.
 *
 * MEASURED, with real CDP touch events against the running game, by sweeping
 * how far the finger drifts between touchstart and touchend:
 *
 *     drift  0px   pointerdown, touchstart, pointerup, touchend, click   CLOSES
 *     drift  8px   pointerdown, touchstart, pointerup, touchend, click   CLOSES
 *     drift 12px   pointerdown, touchstart, pointerup, touchend, click   CLOSES
 *     drift 16px   pointerdown, touchstart, POINTERCANCEL, touchend      nothing
 *     drift 24px   pointerdown, touchstart, POINTERCANCEL, touchend      nothing
 *     drift 32px   pointerdown, touchstart, POINTERCANCEL, touchend      nothing
 *
 * The lane header sits inside the sheet's scroller (overflow-y:auto,
 * touch-action:pan-y).  At about 15px of travel the browser decides the touch
 * is a scroll, fires pointercancel, and sends NO pointerup and NO click -- so
 * an onPointerUp handler simply never runs.  Every real thumb drifts that far
 * on a 28px row.
 *
 * And the cruel part, also measured: in the failing cases the panel did not
 * actually scroll.  scrollTop stayed 0 throughout, because the header is
 * pinned at the TOP of the scroller and the drift is downward, which is an
 * overscroll with nowhere to go.  So the browser confiscated the gesture for a
 * scroll that never happened, and from the player's seat the tap did nothing
 * at all.  That is exactly the report.
 *
 * ── WHY THIS SHAPE OF FIX ──
 *
 * `touch-action: none` on the header works -- measured, pointerup comes back
 * at every drift -- but it costs the header its ability to start a scroll, and
 * with no distance guard a deliberate 60px drag then toggles the lane instead
 * of scrolling.  Two new problems for one old one.
 *
 * Checking scrollTop inside `pointercancel` does NOT work, and it is worth
 * writing down why because it looks obviously correct: pointercancel fires the
 * moment the browser DECIDES to scroll, before it has scrolled, so scrollTop
 * always reads unchanged there.  Measured: a deliberate -70px drag reported
 * "moved 0" at pointercancel and closed the lane it should have scrolled past.
 *
 * `touchend` is the event that answers both questions at once.  It is
 * delivered even when the pointer was cancelled (see the sweep above), and it
 * arrives AFTER the scroll has happened.  So the rule is not a distance
 * threshold anybody has to argue about -- it is the real question:
 *
 *     the pointer was cancelled AND the scroller did not move
 *       => the browser took a gesture that turned out to be nothing,
 *          and that gesture was a tap.
 *
 * Verified both ways: drifts of 16/24/32px with scrollTop unmoved are
 * recovered and the lane closes; a -70px drag that genuinely moved the
 * scroller 55px is left alone and the lane stays open.
 *
 * Only fires when the pointer WAS cancelled, so on a normal tap the
 * component's own onPointerUp still runs and this adds nothing -- otherwise
 * every successful tap would toggle twice and land back where it started
 * (pointerup and touchend both fire on a clean tap; see the sweep).
 *
 * Reusable on purpose.  The seven stat controls in this same scroller carry
 * the same `touch-action: manipulation` and lose their taps the same way --
 * measured: pointercancel on [aria-label*=" of "] at 20px of drift.  Spread
 * these props onto anything in a scroller that must not lose a tap.
 */
import { useRef } from 'react';

/** The nearest ancestor that can actually scroll, or null. */
function scrollerOf(el) {
  for (let n = el; n; n = n.parentElement) {
    if (n.scrollHeight - n.clientHeight > 4) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === 'auto' || oy === 'scroll') return n;
    }
  }
  return null;
}

/**
 * Returns a factory: pass the tap handler, spread the result onto the element.
 *
 *   const scrollTap = useScrollTap();
 *   <div {...scrollTap(() => toggle())} />
 *
 * One ref for the whole component is enough — a finger does one gesture at a
 * time, and a second touch starting elsewhere replaces the first, which is the
 * behaviour you want anyway.
 */
export function useScrollTap() {
  const g = useRef(null);
  /* `inner` is for a control NESTED inside another one that also uses this --
     the ℹ️ button sits inside the stat row it describes.  Both would see the
     same bubbling touchstart, the outer one would run LAST and overwrite the
     record, and the tap would spend a point instead of opening the window.
     The handlers this replaced guarded that with their own stopPropagation on
     pointerdown/pointerup; the flag keeps that property rather than dropping
     it on the way through. */
  return (onTap, { inner = false } = {}) => ({
    onPointerDown: (e) => {
      if (inner) e.stopPropagation();
      g.current = { cancelled: false, x: e.clientX, y: e.clientY, sc: null, top: 0, onTap };
    },
    onPointerUp: (e) => {
      /* The ordinary path, unchanged: a tap the browser did not confiscate. */
      g.current = null;
      e.stopPropagation();
      if (inner) e.preventDefault();
      onTap();
    },
    onPointerCancel: () => { if (g.current) g.current.cancelled = true; },
    onTouchStart: (e) => {
      if (inner) e.stopPropagation();
      /* Read the scroller HERE, while the element is still on screen and the
         gesture has not moved anything — at touchend the answer would already
         include the scroll we are trying to detect. */
      const t = (e.touches && e.touches[0]) || null;
      const sc = scrollerOf(e.currentTarget);
      g.current = { cancelled: false, sc, top: sc ? sc.scrollTop : 0,
        x: t ? t.clientX : 0, y: t ? t.clientY : 0, onTap };
    },
    onTouchEnd: (e) => {
      if (inner) e.stopPropagation();
      const s = g.current;
      g.current = null;
      if (!s || !s.cancelled) return;   /* a clean tap already ran onPointerUp */
      if (s.sc && Math.abs(s.sc.scrollTop - s.top) > 0) return;  /* it scrolled */
      /* THE BACKSTOP, for when "did it scroll" cannot answer: a panel with
         nothing to scroll always reports moved:0, so without this a deliberate
         70px drag across a short panel would count as a tap.  Measured: the
         sloppy taps this fix exists to recover top out around 32px of travel,
         and a drag meant as a drag was 70px.  44 sits between them with room
         either side, and is the same 44pt figure the rest of the UI uses for
         "this is one finger's worth". */
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (t) {
        const dx = t.clientX - s.x, dy = t.clientY - s.y;
        if ((dx * dx + dy * dy) > (44 * 44)) return;
      }
      s.onTap();
    },
  });
}
