import React from 'react';

/* === KeyboardHintsPanel — the desktop keyboard-hints overlay === */
/* v2.3.889: extracted verbatim from the bt-kb-hints JSX subtree in
   BroTown.jsx (the desktop-only WASD / hotkey help strip). Behavior-
   frozen UI decomposition; the desktop-detection gate (the
   window.matchMedia check) stays in BroTown. Zero props — the subtree
   is fully static markup.

   v2.3.1715: no longer static, and no longer always on.
   Owner, playing on desktop: the strip was invisible — .bt-kb-hints was
   pinned at a hardcoded bottom:140px while --dash-h's smallest value is
   145px, so it rendered UNDER the dashboard band at every viewport size.
   Probing its own bounding box at 1920x1080 returned the inventory tab
   strip painted over it. CSS now anchors it off var(--dash-h).

   With it finally visible, the owner asked for a way to turn it off. Both
   doors do the same thing: tap the strip, or press H. Dismissed, it leaves
   a small keyboard chip in the same corner rather than vanishing outright
   — a toggle you cannot find your way back from is a delete, and these are
   the only on-screen record of the controls a desktop player has.
   The choice persists (bt_kb_hints_off), read in the initialiser in
   BroTown so there is no one-frame flash of the wrong state. */

/* v2.3.1733: E and R gained ability duties (Shield Bash while blocking,
   Whirlwind).  Listed here because this strip is the ONLY on-screen record
   of the controls a desktop player has — an unlisted key is an unfindable
   ability.  They are listed unconditionally, unlocked or not: the label
   teaches the key, and pressing it before level 4/8 floats the reason. */
const KEYS = [
  /* v2.3.3006: Shift, held -- the sprint (game/sprint.js); listed beside the
     move it speeds up.  The touch button's twin, so it is listed on the
     same terms as the rest: always, and the worker decides the rest. */
  ['WASD', 'Move'], ['Shift', 'Sprint'], ['Click', 'Attack'], ['R-Click', 'Special'], ['Space', 'Dodge'], ['X', 'Jump'] /* v2.3.3017 */,
  ['E', 'Interact'], ['Q', 'Shield'], ['Q+E', 'Bash'], ['R', 'Whirl'],
  /* v2.3.3343: 1 2 3 -- each weapon straight to hand (desktopControls), keys
     with no button on a computer's screen to wear them (the weapon chip is a
     touch control).  The dashboard's keys (B P J L K O), M's map, Enter and
     Esc are worn by their own buttons (game/deskKeys.js), so they are not
     repeated here. */
  ['Tab', 'Swap'], ['1-3', 'Weapon'], ['F', 'Special'],
  /* v2.3.1734: G — Element Burst.  Listed on the same terms v2.3.1733 set
     for Bash and Whirl one line above: unconditionally, unlocked or not.
     The label teaches the key, and pressing it before level 6 (or without
     an enchanted weapon) floats the reason — a key that only appears once
     you already own the ability is a key nobody discovers. */
  ['G', 'Burst'],
  /* v2.3.3260: V -- quick eat (game/quickEat.js), the touch button's twin */
  ['V', 'Eat'],
  ['C', 'Chat'], ['H', 'Hide'], ['Esc', 'Close'],
];

export function KeyboardHintsPanel({ hidden, onToggle }) {
  /* The tap must not reach the world underneath — the canvas takes clicks as
     attack/aim, so a bare onClick here would also swing the sword. */
  const swallow = (e) => { e.stopPropagation(); };
  const toggle = (e) => { e.stopPropagation(); if (onToggle) onToggle(); };

  if (hidden) {
    return React.createElement('div', {
      className: 'bt-kb-chip',
      onPointerDown: swallow,
      onClick: toggle,
      title: 'Show the keyboard controls (H)',
      role: 'button',
      'aria-label': 'Show keyboard controls',
    }, '⌨');
  }

  return React.createElement('div', {
    className: 'bt-kb-hints',
    onPointerDown: swallow,
    onClick: toggle,
    title: 'Hide these (H)',
    role: 'button',
    'aria-label': 'Hide keyboard controls',
  }, KEYS.map(([k, label]) => React.createElement('span', {
    className: 'bt-kb-key', key: k,
  }, React.createElement('kbd', null, k), ' ' + label)));
}
