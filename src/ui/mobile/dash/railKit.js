import { useEffect, useState } from 'react';

/* ═══ v2.3.4356: A PAGE THAT IS A LIST BESIDE WHAT IT OPENS ═══
 * The Leaderboards (v2.3.4355) and the Quests page (v2.3.4356) are the same
 * shape: a list of pills down the left that scrolls by itself, and what the
 * lit one opens beside it, scrolling by itself too -- or, where the page is
 * too narrow or too short for both (a phone on its side, whose band is ~80
 * px tall; the old side column), the pills in one row over it.  This is the
 * measuring they share: the page's own box, never the window's (a
 * ResizeObserver; the sheet's size changes when a phone turns or the band
 * folds).  No JSX here: each page draws its own pills. */

/** The box of the element given to `ref`, measured: [ref, width, height]
 *  (0, 0 until the first measure). */
export function useBoxSize() {
  const [el, ref] = useState(null);
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize((old) => (Math.abs(old[0] - r.width) < 1 && Math.abs(old[1] - r.height) < 1 ? old : [Math.round(r.width), Math.round(r.height)]));
    };
    read();
    let ro = null;
    try { ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null; } catch (_e) { ro = null; }
    if (ro) ro.observe(el);
    else window.addEventListener('resize', read);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', read); };
  }, [el]);
  return [ref, size[0], size[1]];
}

/** Side by side?  Until the box is measured, the shape an upright phone
 *  gets.  `minW`: the list's width plus the least the other side needs;
 *  `minH`: enough height to show three pills of the list at once. */
export function sideBySide(w, h, minW, minH) {
  return w === 0 || (w >= minW && h >= minH);
}

/* the foot of a scroller fades over its last 18 px (common.js panelStyle's
   cue that there is more below), for each side of the page */
export const FOOT_FADE = 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)';
