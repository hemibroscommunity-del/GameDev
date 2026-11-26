/* ═══ v2.3.6780: FACTS, THE THIRD WEIGHT (card UI3-kit) ═══
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md part 3):
 * "Supporting information: Flat, aligned within shared containers. No
 * individual heavy borders."  `Ui2Facts` is the ONE container (sunk, like a
 * group); `Ui2Fact` a row in it: the label muted on the left, the value on
 * the right, every value on one column, the row with no border, background or
 * shadow of its own.  A row that opens is a button with the chevron, still
 * flat (card UI3-bro's strip: AP, Quests, Clan, Guilds).  `dir="row"` lays
 * the rows side by side, each a label over its value (card UI3-combat's
 * summary strip; a phone on its side). */
import React from 'react';
import { stateClass } from './shine.js';

export function Ui2Facts({ dir, children, className, style, ...rest }) {
  return (
    <div className={'u2-facts' + (dir === 'row' ? ' is-row' : '') + (className ? ' ' + className : '')} style={style} {...rest}>
      {children}
    </div>
  );
}

/** One row: `k` the label, `v` the value; `none` the honest empty value ("No clan"); `gold` a value
    that is progression; `art` a small picture before the value; `onClick` makes it a door. */
export function Ui2Fact({ k, v, none, gold, art, state, onClick, className, style, ...rest }) {
  const opens = typeof onClick === 'function';
  const cls = 'u2-fact' + stateClass(state) + (className ? ' ' + className : '');
  const inner = (
    <>
      <span className="u2-fact-k">{k}</span>
      <span className="u2-fact-end">
        {art ? <img className="u2-fact-art" src={art} alt="" draggable={false} /> : null}
        <span className={'u2-fact-v' + (none ? ' is-none' : '') + (gold ? ' is-gold' : '')}>{v}</span>
        {opens ? <span className="u2-chev" aria-hidden="true">{'›'}</span> : null}
      </span>
    </>
  );
  if (opens) return <button type="button" className={cls} onClick={onClick} style={style} {...rest}>{inner}</button>;
  return <div className={cls} style={style} {...rest}>{inner}</div>;
}
