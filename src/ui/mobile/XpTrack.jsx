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
   the next needs (xpToNextWords), never a predicted number. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { xpFillSteps, xpToNextWords, XP_FILL_DELAY_MS, XP_FILL_MS, XP_WRAP_MS } from '../../game/xpBar.js';

/* QA only: `window.__btXpWrapMs` stretches the level-up's first step, so a
   screenshot on a slow box can catch the white at the end (mp-xpbar) */
const wrapMs = () => {
  const q = typeof window !== 'undefined' ? Number(window.__btXpWrapMs) : 0;
  return q > 0 ? q : XP_WRAP_MS;
};

const GROW = `transform ${XP_FILL_MS}ms cubic-bezier(.2,.8,.2,1) ${XP_FILL_DELAY_MS}ms`;

export function XpTrack({ bar }) {
  const goldRef = useRef(null);
  /* the bar this track last drew ({cat, level, at}) */
  const drawn = useRef(null);
  /* a level-up's second step, waiting; and the XP it starts the new level at */
  const wrapT = useRef(0);
  const target = useRef(bar.frac);
  /* `snap`: the gold stands at `gold` with no transition for one paint, so
     the next move grows from there */
  const [v, setV] = useState(() => ({ gold: bar.frac, white: bar.frac, snap: true, then: bar.frac }));

  useLayoutEffect(() => {
    const plan = xpFillSteps(drawn.current, bar);
    target.current = bar.frac;
    /* mid level-up: the gold is already running to the end, and the new
       level starts from the latest XP when its turn comes */
    if (wrapT.current && !plan.fresh) { drawn.current = { cat: bar.cat, level: bar.level, at: bar.at }; return; }
    drawn.current = { cat: bar.cat, level: bar.level, at: bar.at };
    if (wrapT.current) { clearTimeout(wrapT.current); wrapT.current = 0; }
    if (plan.wrap) {
      setV((s) => ({ gold: plan.fresh ? plan.from : s.gold, white: 1, snap: plan.fresh, then: 1 }));
      wrapT.current = setTimeout(() => {
        wrapT.current = 0;
        setV({ gold: 0, white: target.current, snap: true, then: target.current });
      }, wrapMs());
    } else {
      setV((s) => ({ gold: plan.fresh ? plan.from : s.gold, white: bar.frac, snap: plan.fresh, then: bar.frac }));
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

  useEffect(() => () => { if (wrapT.current) clearTimeout(wrapT.current); }, []);

  const gold = v.snap ? v.gold : v.then;
  return (
    <span className="bt-xp-bar__track" data-xp-white={v.white.toFixed(3)} data-xp-gold={gold.toFixed(3)}>
      <span className="bt-xp-bar__white" style={{ transform: `scaleX(${v.white})` }} />
      <span ref={goldRef} className="bt-xp-bar__fill"
        style={{ transform: `scaleX(${gold})`, transition: v.snap ? 'none' : GROW }} />
      <span className="bt-xp-bar__num" data-xp-num="1">{xpToNextWords(bar.xp, bar.need)}</span>
    </span>
  );
}
