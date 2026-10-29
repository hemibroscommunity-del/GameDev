/* ═══ v2.3.3739: THE XP BAR'S TRACK -- WHITE FOR WHAT YOU JUST EARNED ═══
   The owner, 2026-10-28: "use a white bar to show how the xp will grow and
   fill it up to that point.  It should also show the number of xp needed for
   the next level somewhere on the bar."

   Inside the top bar's XP bar (ZoneHeader.jsx).  Two fills, one over the
   other: the white shows AT ONCE from the old fill to where the worker now
   has you, and the gold grows up to it (XP_FILL_DELAY_MS, then XP_FILL_MS,
   eased) and covers it.  A level-up runs both to the end, then the new level
   starts empty, the white at what carried over and the gold growing to it
   (game/xpBar.js xpFillSteps decides which).  Gains that keep coming move the
   white on and the gold grows on from where it is, never from zero.

   CSS transitions on transform: scaleX only (origin left): no layout and no
   JavaScript per frame, as this rail is over the WebGL canvas (TRAPS section
   42).  JavaScript only says where each fill goes, at most three times a
   gain.  Over both, "45 / 120": the worker's XP into this level over what
   the next needs (xpToNextWords), never a predicted number.

   ═══ v2.3.3796: SLOWER, AND THE NUMBER COUNTS ═══
   The owner: "when you gain xp show the white bar longer (the added xp that
   the bar climbs to) and make the fill up to that white portion slower.  Also
   instead of changing the whole xp number make it count up".  The timing is
   xpBar.js's (white alone 600 ms, the climb 1200 ms eased out).  The number
   counts from where it stands to the worker's XP on the gold's own clock and
   curve (xpCountAt): a level-up counts to the old level's end, then from 0 to
   what carried over with the bar's wrap; a gain mid-count counts on from the
   number on screen, never back.  It is written straight into its text node
   by a requestAnimationFrame loop that stops when the count is done -- React
   never re-renders for it, and nothing is laid out but that one line of
   text. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { xpFillSteps, xpToNextWords, xpCountAt, XP_FILL_DELAY_MS, XP_FILL_MS, XP_WRAP_MS, XP_FILL_EASE } from '../../game/xpBar.js';

/* QA only: `window.__btXpWrapMs` stretches the level-up's first step, so a
   screenshot on a slow box can catch the white at the end (mp-xpbar) */
const wrapMs = () => {
  const q = typeof window !== 'undefined' ? Number(window.__btXpWrapMs) : 0;
  return q > 0 ? q : XP_WRAP_MS * slow();
};

/* QA only: `window.__btXpSlow` (a factor) stretches the whole fill and
   count, so a second hit on a slow box lands mid-count (mp-xpbar 2c) */
const slow = () => {
  const q = typeof window !== 'undefined' ? Number(window.__btXpSlow) : 0;
  return q > 1 ? q : 1;
};
const grow = () => `transform ${XP_FILL_MS * slow()}ms ${XP_FILL_EASE} ${XP_FILL_DELAY_MS * slow()}ms`;
/* reduced motion: the number says the worker's XP at once, as the gold jumps */
const still = () => {
  try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_e) { return false; }
};

export function XpTrack({ bar }) {
  const goldRef = useRef(null);
  const numRef = useRef(null);
  /* the bar this track last drew ({cat, level, at, up}) */
  const drawn = useRef(null);
  /* a level-up's second step, waiting; and the XP it starts the new level at */
  const wrapT = useRef(0);
  const target = useRef({ frac: bar.frac, xp: bar.xp, need: bar.need });
  /* v2.3.3796: the counting number: where it stands (`v`), its count's
     start, end and clock, and the frame it waits on */
  const cnt = useRef({ v: bar.xp, from: bar.xp, to: bar.xp, need: bar.need, t0: 0, raf: 0 });
  /* `snap`: the gold stands at `gold` with no transition for one paint, so
     the next move grows from there */
  const [v, setV] = useState(() => ({ gold: bar.frac, white: bar.frac, snap: true, then: bar.frac }));

  const write = (val, need) => {
    const el = numRef.current;
    if (el) el.textContent = xpToNextWords(val, need);
  };
  const tick = () => {
    const c = cnt.current;
    const t = (performance.now() - c.t0) / slow();
    c.v = xpCountAt(c.from, c.to, t);
    write(c.v, c.need);
    c.raf = t < XP_FILL_DELAY_MS + XP_FILL_MS ? requestAnimationFrame(tick) : 0;
  };
  /* count to `to` (of `need`), from `from` or from the number on screen */
  const countTo = (to, need, from) => {
    const c = cnt.current;
    c.from = from != null ? from : c.v;
    c.to = to;
    c.need = need;
    c.t0 = performance.now();
    if (still()) {
      if (c.raf) { cancelAnimationFrame(c.raf); c.raf = 0; }
      c.v = to;
      write(to, need);
      return;
    }
    c.v = c.from;
    write(c.v, need);
    if (!c.raf) c.raf = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    const plan = xpFillSteps(drawn.current, bar);
    target.current = { frac: bar.frac, xp: bar.xp, need: bar.need };
    /* mid level-up: the gold is already running to the end, and the new
       level starts from the latest XP when its turn comes */
    if (wrapT.current && !plan.fresh) { drawn.current = { cat: bar.cat, level: bar.level, at: bar.at, up: !!bar.up }; return; }
    drawn.current = { cat: bar.cat, level: bar.level, at: bar.at, up: !!bar.up };
    if (wrapT.current) { clearTimeout(wrapT.current); wrapT.current = 0; }
    const fromNeed = Math.max(1, Number(bar.fromNeed) || bar.need);
    if (plan.wrap) {
      setV((s) => ({ gold: plan.fresh ? plan.from : s.gold, white: 1, snap: plan.fresh, then: 1 }));
      /* the old level's count runs to its end */
      countTo(fromNeed, fromNeed, plan.fresh ? (Number(bar.fromXp) || 0) : undefined);
      wrapT.current = setTimeout(() => {
        wrapT.current = 0;
        const tg = target.current;
        setV({ gold: 0, white: tg.frac, snap: true, then: tg.frac });
        /* ...and the new level's from 0 to what carried over */
        countTo(tg.xp, tg.need, 0);
      }, wrapMs());
    } else {
      setV((s) => ({ gold: plan.fresh ? plan.from : s.gold, white: bar.frac, snap: plan.fresh, then: bar.frac }));
      countTo(bar.xp, bar.need, plan.fresh ? (Number(bar.fromXp) || 0) : undefined);
    }
  }, [bar]);

  /* after a snap is on the page: make the browser take the snapped place
     (one style read, once per gain at most), then grow to the target */
  useLayoutEffect(() => {
    if (!v.snap) return;
    try { if (goldRef.current) void getComputedStyle(goldRef.current).transform; } catch (_e) { /* fine */ }
    /* only the state on the page now: a newer one queued (the first
       gain's snap, set in the same commit as the mount) is drawn first */
    setV((s) => (s === v ? { gold: s.then, white: s.white, snap: false, then: s.then } : s));
  }, [v]);

  useEffect(() => () => {
    if (wrapT.current) clearTimeout(wrapT.current);
    if (cnt.current.raf) cancelAnimationFrame(cnt.current.raf);
  }, []);

  const gold = v.snap ? v.gold : v.then;
  /* the number's text is the counting loop's (no React child: a re-render
     would write the end value over the count) */
  return (
    <span className="bt-xp-bar__track" data-xp-white={v.white.toFixed(3)} data-xp-gold={gold.toFixed(3)}>
      <span className="bt-xp-bar__white" style={{ transform: `scaleX(${v.white})` }} />
      <span ref={goldRef} className="bt-xp-bar__fill"
        style={{ transform: `scaleX(${gold})`, transition: v.snap ? 'none' : grow() }} />
      <span ref={numRef} className="bt-xp-bar__num" data-xp-num="1" />
    </span>
  );
}
