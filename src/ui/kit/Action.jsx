/* ═══ v2.3.6680: THE ACTION BUTTON (card UI2) ═══
 * Five light metallic faces, ONE dark label (src/game/ui2Tokens.js
 * UI2_ACTIONS): gold routine, green accept, blue guide, red destroy (only a
 * truly destructive consequence), silver dismiss.  `wide`: the full-width
 * single action.  Ui2ActionRow puts a price or a requirement beside it;
 * Ui2Disabled shows the action unusable with its REASON beside it, readable
 * (the spec's Q83).  `pending` is the mark while the worker answers. */
import React from 'react';
import { stateClass } from './shine.js';
import { ui2Role } from '@/game/uiRoles.js';   /* v2.3.6840 (card UI4): the role, decided in one place */

/* v2.3.6840 (card UI4, V17:43-46): `intent` 'commit' (does the thing), 'danger' (cannot be undone), 'adjust'
   (a cancel, a setting), 'go' (takes you somewhere) or 'disabled'.  Without one, the colour `c` says it as
   before (src/game/uiRoles.js FACE_ROLE); with one and no colour, the role wears today's face for it. */
export function Ui2Action({ c, label, wide, state, pending, disabled, intent, onClick, style, ...rest }) {
  const r = ui2Role('Ui2Action', { intent, onClick, c, disabled });
  const off = !!disabled || r.role === 'disabled';
  const cls = 'u2-act' + (wide ? ' is-wide' : '') + stateClass(pending ? 'pending' : state);
  return (
    <button type="button" className={cls} data-c={r.face} data-u2-role={r.role} disabled={off || undefined} aria-busy={pending ? 'true' : undefined} onClick={pending ? undefined : onClick} style={style} {...rest}>
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
      <Ui2Action intent="disabled" c={c} label={label} disabled style={{ flex: '0 0 auto' }} {...rest} />
      <span className="u2-why" data-u2-why="">{why}</span>
    </div>
  );
}
