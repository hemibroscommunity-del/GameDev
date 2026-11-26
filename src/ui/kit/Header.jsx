/* ═══ v2.3.6680: THE CONTEXTUAL HEADER (card UI2) ═══
 * Back with its label, the title, Menu, Close: raised controls on the slate,
 * no title plate (the spec, part 2).  Each control is 44 px (the least to
 * tap); Close carries data-esc (CLAUDE.md §7, Desktop).  `states` shows a
 * control's still state on the fixture ({ back: 'pressed' }). */
import React from 'react';
import { stateClass } from './shine.js';
import { SAY } from '@/data/say/ui2Kit.js';   /* the kit's words, in the one table */
import { say } from '@/game/say.js';

export function Ui2Header({ title, backLabel = say(SAY, 'ui2Kit.back'), onBack, onMenu, onClose, states = {} }) {
  return (
    <div className="u2-head" style={{ width: '100%' }}>
      <span className="u2-head-side is-start">
        {onBack !== false ? (
          <button type="button" className={'u2-raised u2-ctl' + stateClass(states.back)} data-u2="back" onClick={onBack || undefined} aria-label={say(SAY, 'ui2Kit.backAria', { label: backLabel })}>
            <span className="u2-ctl-glyph" aria-hidden="true">{'‹'}</span><span>{backLabel}</span>
          </button>
        ) : null}
      </span>
      <h2 className="u2-head-title" data-u2="title" style={{ margin: 0 }}>{title}</h2>
      <span className="u2-head-side">
        <button type="button" className={'u2-raised u2-ctl' + stateClass(states.menu)} data-u2="menu" onClick={onMenu || undefined}>{say(SAY, 'ui2Kit.menu')}</button>
        <button type="button" className={'u2-raised u2-ctl is-round' + stateClass(states.close)} data-u2="close" data-esc="" aria-label={say(SAY, 'ui2Kit.close')} onClick={onClose || undefined}>{'\u2715'}</button>
      </span>
    </div>
  );
}
