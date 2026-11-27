/* ═══ v2.3.6680: THE DESTINATION TILE (card UI2) ═══
 * Raised; the game's full-colour art over a readable label.  `size`:
 * 'primary' (art over the word) or 'compact' (art beside the word and its
 * line).  `selected` pushes it in (aria-pressed); `locked` greys the art and
 * keeps it inspectable; `badge` a count, `dot` a "new", `glow` the rare warm
 * light. */
import React from 'react';
import { stateClass } from './shine.js';
import { Ui2Badge } from './Badge.jsx';
import { ui2Role } from '@/game/uiRoles.js';   /* v2.3.6840 (card UI4): the role, decided in one place */

/* v2.3.6840 (card UI4, V17:41-42, 46): `intent` 'go' (a destination), 'selected' (the one now chosen) or
   'disabled'; without one, src/game/uiRoles.js maps `selected`.  The look is today's for each. */
export function Ui2Tile({ art, label, sub, size = 'primary', selected, locked, state, badge, dot, glow, intent, onClick, className, style, artSize, ...rest }) {
  const r = ui2Role('Ui2Tile', { intent, onClick, selected });
  /* v2.3.6780 (card UI3-kit): RAISED, so a destination or an action only: a tile with no handler is red in
     tools/guards/ui3-weights.test.mjs.  A caller's className is joined to the kit's, never put in its place. */
  const cls = ['u2-raised', 'u2-tile', 'is-' + size].join(' ') + stateClass(state) + (locked ? ' is-off' : '') + (glow ? ' is-glow' : '') + (className ? ' ' + className : '');
  return (
    <button type="button" className={cls} data-u2-role={r.role} aria-pressed={selected ? 'true' : undefined} onClick={onClick} style={style} {...rest}>
      {art ? <img className="u2-tile-art" src={art} alt="" draggable={false} style={artSize ? { width: artSize, height: artSize } : undefined} /> : null}
      <span className="u2-tile-words">
        <span className="u2-tile-label">{label}</span>
        {sub ? <span className="u2-tile-sub">{sub}</span> : null}
      </span>
      <Ui2Badge count={badge} dot={dot} />
    </button>
  );
}
