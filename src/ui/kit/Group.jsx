/* ═══ v2.3.6680: THE RECESSED INFORMATION GROUP AND THE STAT HEADLINE (card UI2) ═══
 * A group is sunk and NOT pressable (information).
 *
 * v2.3.6780 (card UI3-kit; the owner, 2026-11-26: "Important statistics:
 * Recessed surfaces with large numbers. No heavy beveling."): THE STAT is
 * sunk too, its number large and gold, never raised.  With a handler it is a
 * button and wears the chevron (the owner's mock-up, "120.5 DPS ›"); with none
 * it is a div and wears none, so nothing looks pressable that is not.
 * `size="pill"`: one line, a picture and the number, round ends.  A caller's
 * className is JOINED to the kit's, never put in its place (a className once
 * replaced the kit's, which is how a stat stayed raised:
 * tools/guards/ui3-weights.test.mjs). */
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

export function Ui2Stat({ v, k, art, size, state, selected, onClick, className, style, ...rest }) {
  const opens = typeof onClick === 'function';
  const cls = 'u2-stat' + (size === 'pill' ? ' is-pill' : '') + stateClass(state) + (className ? ' ' + className : '');
  const words = size === 'pill'
    ? <><span className="u2-stat-v">{v}</span>{k ? <span className="u2-stat-k">{k}</span> : null}</>
    : <span className="u2-stat-words"><span className="u2-stat-v">{v}</span>{k ? <span className="u2-stat-k">{k}</span> : null}</span>;
  const chev = opens ? <span className="u2-chev" aria-hidden="true">{'›'}</span> : null;
  const art_ = art ? <img className="u2-stat-art" src={art} alt="" draggable={false} /> : null;
  if (opens) {
    return (
      <button type="button" className={cls} aria-pressed={selected ? 'true' : undefined} onClick={onClick} style={style} {...rest}>
        {art_}{words}{chev}
      </button>
    );
  }
  return <div className={cls} style={style} {...rest}>{art_}{words}{chev}</div>;
}
