/* ═══ v2.3.6840: THE OVERLAY, A TOWN WINDOW'S FRAME (card UI4 PR 1, the owner's V17) ═══
 * V17:63, "Town windows above band, shared fixed header/close and scrollable
 * supporting body, actual content-sized."  Today a building's window is
 * drawn in BroTown.jsx (its card, the ✕ kept in the corner by a sticky bar
 * while the menu scrolls: v2.3.3522, the owner's "a more prominent escape
 * icon in the corner").  This is that frame in the kit: the header (the
 * title, the ✕ that never scrolls away: the kit's header Close, data-esc,
 * the adjust role) and a body that scrolls under it.  It does NOT place
 * itself: the caller gives its size and where it sits (V17's budgets, ~500
 * wide sideways and ~600 on a computer, are "candidate budgets": not this
 * PR's).  No window is moved to it in this PR. */
import React from 'react';
import { ui2RootClass } from './shine.js';
import { Ui2Header } from './Header.jsx';   /* the kit's one header: its ✕ is Close, data-esc, the adjust role */

/**
 * title    the window's name
 * onClose  the ✕ (required: a window you cannot leave is a fault)
 * w, h     its size (h: at most; the body scrolls)
 * headH    the header's row (the frame's 52 by default)
 * label    a screen reader's name when the title is not words
 */
export function Ui2Overlay({ title, onClose, w, h, headH = 52, label, children, className, style, ...rest }) {
  return (
    <section className={ui2RootClass(['u2-frame', 'u2-over'].join(' ') + (className ? ' ' + className : ''))} role="dialog" aria-label={label || (typeof title === 'string' ? title : undefined)}
      style={{ width: w, maxHeight: h, ...(style || null) }} data-u2-overlay="" {...rest}>
      <div style={{ height: headH, display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
        <Ui2Header title={title} onBack={false} onMenu={false} onClose={onClose} />
      </div>
      <div className="u2-page u2-over-body" data-u2-overlay-body="">{children}</div>
    </section>
  );
}
