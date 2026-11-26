/* ═══ v2.3.6683: A SCREEN'S ZONES (card UI2-bro, the build's step 3) ═══
 * The specification's 1.2.1: "predictable screen zones: contextual header;
 * identity/context; primary summary; secondary information and deeper
 * destinations; contextual actions at bottom ... Empty/unneeded zones
 * collapse and useful content reclaims the space."  The header is the
 * frame's (DashHeader); these are the four under it, in that order, drawn
 * only where they hold something (src/game/screenZones.js screenZones): an
 * empty zone gives its room back, the last zone above the actions takes what
 * is left, and the actions sit at the bottom. */
import React from 'react';
import { screenZones } from '@/game/screenZones.js';

export function Ui2Zones({ identity, summary, doors, actions, style, ...rest }) {
  const parts = { identity, summary, doors, actions };
  const zones = screenZones(parts);
  return (
    <div className="u2-zones" data-u2-zones={zones.map((z) => z.id).join(' ')} style={style} {...rest}>
      {zones.map((z) => (
        <div key={z.id} className={'u2-zone is-' + z.id + (z.grow ? ' is-grow' : '')} data-u2-zone={z.id}>{parts[z.id]}</div>
      ))}
    </div>
  );
}
