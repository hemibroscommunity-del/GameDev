/* ═══ v2.3.6843: THE LEVEL TILE (card UI4 PR 4, the owner's V17) ═══
 * A way to go (V17:41, the raised slate) that carries what it leads to: the
 * game's picture, its name and level, its progress bar, and a line under
 * them: the points to spend (V17:20 "Available points deserve a priority cue
 * but not commit-style gold"; drawn ONLY while there are some: never a plus
 * that does nothing at zero) and a state in words (`mark`: "In hand",
 * "Worn", "Not worn"; V17:55 "Distinguish equipped weapon from in-hand
 * weapon", and V17:49 "color alone must not communicate meaning": the held
 * one is framed AND says so).  Bro's Sword, Bow and Staff (sheet/BroV17.jsx)
 * are the first; V17:49's NavigationTile and Progress in one piece, so a
 * weapon's tile is never a passive fact dressed as a button.
 *   shape   'stack' (the picture over the words: a tile taller than wide) or
 *           'row' (the picture beside them: a phone on its side)
 *   frac    the bar's fill (0..1); `max` a level at its top (the bar full)
 *   cue     the points' words (null: none to spend, nothing drawn)
 *   mark    the state's words; `held` frames the tile (Gear's `is-hand`)
 * Its words are centred where they stand alone (the owner, 22:20 UTC
 * 2026-11-27: "I'd prefer centered"). */
import React from 'react';
import { ui2Role } from '@/game/uiRoles.js';
import './levelTile.css';

export function Ui2LevelTile({ art, label, level, frac, max, cue, mark, held, shape = 'stack', artSize, intent, onClick, className, style, ...rest }) {
  const r = ui2Role('Ui2LevelTile', { intent, onClick });
  const v = max ? 1 : Math.max(0, Math.min(1, Number(frac) || 0));
  const cls = ['u2-raised', 'u2-lt', shape === 'row' ? 'is-row' : 'is-stack'].join(' ') + (held ? ' is-hand' : '') + (cue ? ' is-cue' : '') + (className ? ' ' + className : '');
  return (
    <button type="button" className={cls} data-u2-role={r.role} onClick={onClick} style={style} {...rest}>
      {art ? <img className="u2-lt-art" src={art} alt="" draggable={false} style={artSize ? { width: artSize, height: artSize } : undefined} /> : null}
      <span className="u2-lt-words">
        <span className="u2-lt-top">
          <span className="u2-lt-name">{label}</span>
          {level != null ? <span className="u2-lt-lv">{level}</span> : null}
        </span>
        <span className="u2-track u2-lt-track" aria-hidden="true"><span className="u2-fill" style={{ width: (v * 100).toFixed(1) + '%' }} /></span>
        {mark || cue ? (
          <span className="u2-lt-line">
            {mark ? <span className={'u2-lt-mark' + (held ? ' is-hand' : '')}>{mark}</span> : null}
            {cue ? <span className="u2-lt-cue">{cue}</span> : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default Ui2LevelTile;
