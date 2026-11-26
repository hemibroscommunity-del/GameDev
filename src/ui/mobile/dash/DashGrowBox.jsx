import React, { useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import './dashGrow.css';

/* ═══ v2.3.6682: THE BAND'S PAGE CONTAINER WEARS THE MOTION (card UI2-frame PR 2) ═══
   The band's page box (and Gear's root, the resting columns) drawn as before,
   a div with the same attributes and style, wearing the last step's motion
   (dashboardPanelBus.grow(): src/game/dashGrow.js) as a class and its
   transform-origin, until the animation's OWN end: animationend (or
   animationcancel) takes it off.  An event, never a timer: a test reads the
   class as a state (TRAPS §200), on and then off, at whatever pace the
   renderer draws.  `data-dash-grow` names the kind while it is worn.
   A motion that ran to its end is never worn again: the number of the last
   one is kept here, not in the component, so a box mounted again (the page
   closed and opened, the phone turned) does not replay it.
   Taps are never held: a transform moves where the page is drawn, nothing
   stops a press (no pointer-events, no overlay), and a page asked mid-motion
   starts its own (the a and b names in turn, dashGrow.css).
   Its state is its own: the end re-draws this box alone, its children (the
   page) are the parent's elements, unchanged. */
let _played = 0;

const nameOf = (m) => `btDashGrow-${m.kind}-${m.n % 2 ? 'a' : 'b'}`;

export function DashGrowBox({ boxRef, style, children, ...rest }) {
  const m = dashboardPanelBus.grow();
  const [, setEnded] = useState(0);
  const on = !!m && m.n > _played;
  const end = (e) => {
    if (!m || e.target !== e.currentTarget || e.animationName !== nameOf(m)) return;
    if (m.n > _played) _played = m.n;
    setEnded(m.n);
  };
  return (
    <div {...rest} ref={boxRef}
      className={on ? `bt-dash-grow bt-dash-grow--${m.kind}-${m.n % 2 ? 'a' : 'b'}` : undefined}
      data-dash-grow={on ? m.kind : undefined}
      style={on ? { ...style, transformOrigin: m.origin } : style}
      onAnimationEnd={end} onAnimationCancel={end}>
      {children}
    </div>
  );
}
