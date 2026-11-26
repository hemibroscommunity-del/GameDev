/* ═══ v2.3.6680: THE RECESSED INFORMATION GROUP AND THE STAT HEADLINE (card UI2) ═══
 * A group is sunk and NOT pressable (information); a stat headline is raised
 * with a chevron (it opens its breakdown), so the two never read alike. */
import React from 'react';
import { stateClass } from './shine.js';

export function Ui2Group({ k, children, style, ...rest }) {
  return (
    <div className="u2-group" style={style} {...rest}>
      {k ? <span className="u2-group-k">{k}</span> : null}
      {children}
    </div>
  );
}

/** A value with its label; `none` draws the honest empty line ("No clan"). */
export function Ui2Value({ v, none }) {
  return <span className={'u2-group-v' + (none ? ' is-none' : '')}>{v}</span>;
}

export function Ui2Stat({ v, k, art, state, selected, onClick, style, ...rest }) {
  return (
    <button type="button" className={'u2-raised u2-stat' + stateClass(state)} aria-pressed={selected ? 'true' : undefined} onClick={onClick} style={style} {...rest}>
      {art ? <img className="u2-stat-art" src={art} alt="" draggable={false} /> : null}
      <span className="u2-stat-words"><span className="u2-stat-v">{v}</span><span className="u2-stat-k">{k}</span></span>
      <span className="u2-chev" aria-hidden="true">{'›'}</span>
    </button>
  );
}
