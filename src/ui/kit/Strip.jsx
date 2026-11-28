/* ═══ v2.3.6843: THE STRIP THAT PAGES (card UI4 PR 4, the owner's V17) ═══
 * One quiet row of entries (V17:13, "supporting read-only information,
 * visually quieter and later in the reading order") that NEVER cuts a word
 * at its edge: where the width does not hold every entry, it shows the WHOLE
 * entries it holds and a "more" control (the adjust role, 44 x 44: V17:43,
 * "Neutral slate, clear control state") that turns to the next ones, the page
 * after the last the first.  Its pages are worked out by the caller's rule
 * (src/game/broV17.js broV17StripPages: whole entries, each as wide as the
 * room shares out); this piece only draws them.  V17:31 "No global
 * shrink-to-fit": the entries keep their words' size; the room decides how
 * many show, never how small.
 *   page, pages   which page, of how many (pages 1: no control)
 *   onPage        (next page) => void
 *   more          the control's words for a screen reader ("More, page 1 of 2")
 *   count         the control's visible count ("1/2") */
import React from 'react';
import { Ui2Action } from './Action.jsx';
import './levelTile.css';

export function Ui2Strip({ children, page = 0, pages = 1, onPage, more, count, className, style, ...rest }) {
  const many = pages > 1;   /* one page: no control (the caller's rule says how many) */
  return (
    <div className={'u2-strip' + (className ? ' ' + className : '')} style={style} {...rest}>
      <div className="u2-strip-row">{children}</div>
      {many ? (
        <Ui2Action intent="adjust" aria-label={more} data-u2-strip-more={page + 1 + '/' + pages}
          onClick={() => { try { onPage((page + 1) % pages); } catch (e) { /* no pager: the first page stays */ } }}
          label={<><span className="u2-strip-chev" aria-hidden="true">{'›'}</span>{count ? <span className="u2-strip-n" aria-hidden="true">{count}</span> : null}</>} />
      ) : null}
    </div>
  );
}

export default Ui2Strip;
