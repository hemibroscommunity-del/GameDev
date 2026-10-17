/* ═══ v2.3.3324: A STAT'S NAME, WHOLE OR SHORT -- NEVER CUT ═══
 *
 * The Points tab's grid captions each cell with the stat's `short` name
 * (data/prog3.js), its type sized off the cell (HeroExpanded CAP_FS, never
 * under 7.5 px).  Sideways the dashboard is one 238 px column for every
 * destination, the cells 19-24 px wide, and at the floor POWER, SPECIAL,
 * DODGE and RESIST need 23-28 px: they were drawn "PO…", "SPE…", "DO…" and
 * "RE…" (RANGE and MOVE a pixel short too) -- mp-landscape-dash's "every
 * label renders whole" check, and the owner's own rule for it (v2.3.2173:
 * "It's obvious that the labels are getting cut off").
 *
 * Smaller type is not the answer (7.5 px is the floor of what reads on a
 * phone) and the column is every destination's.  So a name that does not
 * fit its cell is written SHORT -- PWR, SPCL, DDG, RES -- and one that fits
 * is written whole.  Measured in the cell itself, so portrait, where every
 * name fits, draws exactly what it drew.
 *
 * TWO MEASURES, so neither has the last word alone: the canvas's width of
 * the whole name in the caption's own font (it can be asked while the short
 * form is showing), and the browser's own verdict on the whole name while it
 * is drawn (scrollWidth past its box).  A room the browser has seen the
 * whole name cut in is remembered (`cutAt`), or the two could disagree by a
 * pixel and swap the caption back and forth. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* The short forms, by prog3 stat key.  Only drawn where the whole name
   would be cut; a key with none (or the same word) is always whole. */
export const STAT_CAPTION_SHORT = Object.freeze({
  range: 'RNG', dmg: 'PWR', aspd: 'SPD', luck: 'LCK', special: 'SPCL', elem: 'ELE',
  hp: 'HP', def: 'DEF', mana: 'MP', stam: 'STA', dodge: 'DDG', move: 'MOV', eres: 'RES',
});

let _ctx = null;
function textWidth(text, el) {
  try {
    if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
    if (!_ctx) return 0;
    const cs = getComputedStyle(el);
    _ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return _ctx.measureText(text).width;
  } catch (e) { return 0; }
}

export function StatCaption({ full, short, style }) {
  const ref = useRef(null);
  const cutAt = useRef(0);
  const [tight, setTight] = useState(false);
  const [, bump] = useState(0);
  const can = !!short && short !== full;

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el && el.parentElement;
    if (!el || !box || !can) return;
    /* the cell's inner width: it has no side padding, inside a 1 px border */
    const room = box.clientWidth;
    if (!(room > 0)) return;
    if (!tight && el.scrollWidth > el.clientWidth + 0.5) cutAt.current = Math.max(cutAt.current, room);
    const need = textWidth(full, el);
    const t = room <= cutAt.current || need > room + 0.5;
    if (t !== tight) setTight(t);
  });

  /* Measured again when the cell changes width without a render here (a
     rotation, a resized window), and once the web font is in: measured in
     the fallback font, the canvas's answer is a different face's. */
  useEffect(() => {
    if (!can) return undefined;
    let gone = false;
    let ro = null;
    const box = ref.current && ref.current.parentElement;
    if (box && typeof ResizeObserver !== 'undefined') {
      let w = box.clientWidth;
      ro = new ResizeObserver(() => {
        if (gone || box.clientWidth === w) return;
        w = box.clientWidth;
        bump((n) => n + 1);
      });
      ro.observe(box);
    }
    try {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!gone) bump((n) => n + 1); });
    } catch (e) { /* no font loading API: the first measure stands */ }
    return () => { gone = true; if (ro) ro.disconnect(); };
  }, [can]);

  return <span ref={ref} data-stat-caption={tight ? 'short' : 'whole'} style={style}>{tight ? short : full}</span>;
}
