/* ═══ v2.3.6680: THE DESTINATION TILE (card UI2) ═══
 * Raised; the game's full-colour art over a readable label.  `size`:
 * 'primary' (art over the word) or 'compact' (art beside the word and its
 * line).  `selected` pushes it in (aria-pressed); `locked` greys the art and
 * keeps it inspectable; `badge` a count, `dot` a "new", `glow` the rare warm
 * light. */
import React from 'react';
import { stateClass } from './shine.js';
import { Ui2Badge } from './Badge.jsx';

export function Ui2Tile({ art, label, sub, size = 'primary', selected, locked, state, badge, dot, glow, onClick, style, artSize, ...rest }) {
  const cls = ['u2-raised', 'u2-tile', 'is-' + size].join(' ') + stateClass(state) + (locked ? ' is-off' : '') + (glow ? ' is-glow' : '');
  return (
    <button type="button" className={cls} aria-pressed={selected ? 'true' : undefined} onClick={onClick} style={style} {...rest}>
      {art ? <img className="u2-tile-art" src={art} alt="" draggable={false} style={artSize ? { width: artSize, height: artSize } : undefined} /> : null}
      <span className="u2-tile-words">
        <span className="u2-tile-label">{label}</span>
        {sub ? <span className="u2-tile-sub">{sub}</span> : null}
      </span>
      <Ui2Badge count={badge} dot={dot} />
    </button>
  );
}
