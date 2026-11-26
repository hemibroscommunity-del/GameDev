/* ═══ v2.3.6680: THE ACTION BUTTON (card UI2) ═══
 * Five light metallic faces, ONE dark label (src/game/ui2Tokens.js
 * UI2_ACTIONS): gold routine, green accept, blue guide, red destroy (only a
 * truly destructive consequence), silver dismiss.  `wide`: the full-width
 * single action.  Ui2ActionRow puts a price or a requirement beside it;
 * Ui2Disabled shows the action unusable with its REASON beside it, readable
 * (the spec's Q83).  `pending` is the mark while the worker answers. */
import React from 'react';
import { stateClass } from './shine.js';

export function Ui2Action({ c = 'gold', label, wide, state, pending, disabled, onClick, style, ...rest }) {
  const cls = 'u2-act' + (wide ? ' is-wide' : '') + stateClass(pending ? 'pending' : state);
  return (
    <button type="button" className={cls} data-c={c} disabled={disabled || undefined} aria-busy={pending ? 'true' : undefined} onClick={pending ? undefined : onClick} style={style} {...rest}>
      <span>{label}</span>
      {pending ? <span className="u2-spin" data-u2-pending="" aria-hidden="true" /> : null}
    </button>
  );
}

/** The bottom row: the action, and beside it what it costs or needs.
    `aside`: { art, text, short } (short: you do not have it). */
export function Ui2ActionRow({ aside, children }) {
  return (
    <div className="u2-actrow">
      {children}
      {aside ? (
        <span className={'u2-aside' + (aside.short ? ' is-short' : '')} data-u2-aside="">
          {aside.art ? <img src={aside.art} alt="" draggable={false} /> : null}{aside.text}
        </span>
      ) : null}
    </div>
  );
}

export function Ui2Disabled({ c = 'gold', label, why, ...rest }) {
  return (
    <div className="u2-actrow">
      <Ui2Action c={c} label={label} disabled style={{ flex: '0 0 auto' }} {...rest} />
      <span className="u2-why" data-u2-why="">{why}</span>
    </div>
  );
}
