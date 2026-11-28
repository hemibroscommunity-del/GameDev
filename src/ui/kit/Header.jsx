/* ═══ v2.3.6680: THE CONTEXTUAL HEADER (card UI2) ═══
 * Back with its label, the title, Menu, Close: raised controls on the slate,
 * no title plate (the spec, part 2).  Each control is 44 px (the least to
 * tap); Close carries data-esc (CLAUDE.md §7, Desktop).  `states` shows a
 * control's still state on the fixture ({ back: 'pressed' }).
 * v2.3.6681 (card UI2-frame): the frame's three roots, by props and nothing
 * restyled (the specification's part 1.1: "[Close] Gear [Menu >]",
 * "[< Gear] Menu [Close]", "[< Combat] Sword [Menu] [X]"):
 *   onBack === false   no Back;
 *   onMenu === false   no Menu (the Menu's own root);
 *   closeStart         Close at the start, where Back would be (Gear's root);
 *   menuNext           Menu reads "Menu ›" (a workspace beside this one);
 *   ctl                more props for a control ({ back, menu, close }: the
 *                      frame's pointer handling, its QA hooks, data-key);
 *   menuMark           what waits behind the Menu ({ count, dot, glow }: the
 *                      badge that climbs from a door inside it, the audit's
 *                      part 2, BUILD 6).
 * v2.3.6681 (part 3): Close is the OUTER ✕ (`data-esc-outer`): Esc presses it
 * only when no ✕ inside the page is in front (deskKeys.js frontControl). */
import React from 'react';
import { stateClass } from './shine.js';
import { Ui2Badge } from './Badge.jsx';
import { HEADER_ROLES } from '@/game/uiRoles.js';   /* v2.3.6840 (card UI4): Back and Menu go, Close adjusts (a dismiss, V17:43) */
import { SAY } from '@/data/say/ui2Kit.js';   /* the kit's words, in the one table */
import { say } from '@/game/say.js';

export function Ui2Header({ title, backLabel = say(SAY, 'ui2Kit.back'), onBack, onMenu, onClose, states = {}, closeStart, menuNext, ctl = {}, menuMark = null }) {
  const close = (
    <button type="button" className={'u2-raised u2-ctl is-round' + stateClass(states.close)} data-u2="close" data-u2-role={HEADER_ROLES.close} data-esc="" data-esc-outer="" aria-label={say(SAY, 'ui2Kit.close')} onClick={onClose || undefined} {...(ctl.close || {})}>{'✕'}</button>
  );
  return (
    <div className="u2-head" style={{ width: '100%' }}>
      <span className="u2-head-side is-start">
        {closeStart ? close : onBack !== false ? (
          <button type="button" className={'u2-raised u2-ctl' + stateClass(states.back)} data-u2="back" data-u2-role={HEADER_ROLES.back} onClick={onBack || undefined} aria-label={say(SAY, 'ui2Kit.backAria', { label: backLabel })} {...(ctl.back || {})}>
            <span className="u2-ctl-glyph" aria-hidden="true">{'‹'}</span><span>{backLabel}</span>
          </button>
        ) : null}
      </span>
      <h2 className="u2-head-title" data-u2="title" style={{ margin: 0 }}>{title}</h2>
      <span className="u2-head-side">
        {onMenu !== false ? (
          <button type="button" className={'u2-raised u2-ctl' + stateClass(states.menu) + (menuMark && menuMark.glow ? ' is-glow' : '')} data-u2="menu" data-u2-role={HEADER_ROLES.menu} onClick={onMenu || undefined} {...(ctl.menu || {})}>
            <span>{say(SAY, 'ui2Kit.menu')}</span>{menuNext ? <span className="u2-ctl-glyph" aria-hidden="true">{'›'}</span> : null}
            {menuMark ? <Ui2Badge count={menuMark.count} dot={menuMark.dot} /> : null}
          </button>
        ) : null}
        {closeStart ? null : close}
      </span>
    </div>
  );
}
