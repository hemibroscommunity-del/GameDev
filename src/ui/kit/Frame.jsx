/* ═══ v2.3.6680: THE DASHBOARD'S FRAME (card UI2) ═══
 * Shallow, a thin restrained gold rim, a fine low-contrast brushed slate: all
 * CSS (ui2.css .u2-frame).  `head` is the contextual header (Ui2Header), the
 * children the page under it.  The frame is given its size: the band never
 * grows (the dashboard's height is the game's, sheetGeometry.js). */
import React from 'react';
import { ui2RootClass } from './shine.js';

export function Ui2Frame({ w, h, headH = 52, head, children, label, ...rest }) {
  return (
    <section className={ui2RootClass('u2-frame')} style={{ width: w, height: h }} aria-label={label} {...rest}>
      <div style={{ height: headH, display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>{head}</div>
      <div className="u2-page" data-u2-page="">{children}</div>
    </section>
  );
}
