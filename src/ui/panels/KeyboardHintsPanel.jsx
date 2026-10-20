import React from 'react';
import { createPortal } from 'react-dom';

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
  /* v2.3.3407: 1 2 3 -- each weapon straight to hand (desktopControls), keys
     with no button on a computer's screen to wear them (the weapon chip is a
     touch control).  The dashboard's keys (I P J L K O), M's map, Enter and
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
  /* v2.3.3391: B -- the emotes (game/emotes.js), the chat box's smiley's twin */
  ['B', 'Emotes'],
  ['C', 'Chat'], ['H', 'Hide'], ['Esc', 'Close'],
];

/* ═══ v2.3.3505: IN THE BLACK MARGIN, BESIDE THE GAME ═══
   The owner, of the 2026-10-19 review's "move the keyboard keys strip into the
   black margin beside the game on a computer": "Go recommended on everything".
   On a computer the game is a phone-shaped column in the middle of the window
   (game.css, the `(pointer:fine) and (min-width:1000px)` #root rule), and this
   strip lay over the column's bottom-left -- outside .brotown-wrap, so over
   anything there whatever its z-index -- which is why it had to stand aside
   for windows, prompts, the harvest's button, the emotes, a level-up, the chat
   feed and the trade drawer (seven game.css rules), and still hid the bottom
   of the world when it did not.  The margin beside the column is empty black.
   Where it has room the strip is drawn there instead: portalled to the body
   (#root's contain:paint clips anything of its own to the column), one key a
   row, its right edge SIDE_GAP left of the column and the ⌨ under it, so it
   covers nothing and never has to stand aside.  A window too narrow or too
   short for it, or no column at all (a computer window under 1000 px), keeps
   the strip in the column as before. */
const COLUMN_QUERY = '(pointer:fine) and (min-width:1000px)';   /* game.css's column rule */
const SIDE_GAP = 16;     /* between the strip and the column, and the window's bottom */
const SIDE_MIN = 190;    /* the margin it needs: its 150 px + a gap each side */
const SIDE_MIN_H = 520;  /* the window height its rows and the ⌨ need */

function sideRoom() {
  try {
    if (typeof window === 'undefined' || !window.matchMedia || !window.matchMedia(COLUMN_QUERY).matches) return null;
    if (window.innerHeight < SIDE_MIN_H) return null;
    const root = document.getElementById('root');
    const r = root && root.getBoundingClientRect();
    if (!r || !(r.width > 0) || r.left < SIDE_MIN) return null;
    return { right: Math.round(window.innerWidth - r.left + SIDE_GAP), bottom: Math.round(Math.max(0, window.innerHeight - r.bottom) + SIDE_GAP) };
  } catch (_e) { return null; }
}

function useSideRoom() {
  const [room, setRoom] = React.useState(sideRoom);
  React.useEffect(() => {
    let raf = 0;
    const again = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRoom((was) => {
        const now = sideRoom();
        return was && now && was.right === now.right && was.bottom === now.bottom ? was : now;
      }));
    };
    window.addEventListener('resize', again);
    let ro = null;
    try {
      const root = document.getElementById('root');
      if (root && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(again); ro.observe(root); }
    } catch (_e) { /* no observer: the window's resize is enough */ }
    again();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', again); if (ro) ro.disconnect(); };
  }, []);
  return room;
}

export function KeyboardHintsPanel({ hidden, onToggle }) {
  /* The tap must not reach the world underneath — the canvas takes clicks as
     attack/aim, so a bare onClick here would also swing the sword. */
  const swallow = (e) => { e.stopPropagation(); };
  const toggle = (e) => { e.stopPropagation(); if (onToggle) onToggle(); };
  const room = useSideRoom();
  const place = room ? 'side' : 'column';

  /* ═══ v2.3.3470: THE ⌨ STAYS, BESIDE THE STRIP ═══
     The owner: "The computer keyboard icon is a nice touch for showing and
     hiding the computer controls. But once the computer controls are open
     it's hidden behind the shortcut keys the menu shows. Move it over so you
     can still see where to click it to hide it again".  It was the strip OR
     the chip, both pinned to one corner, so opening the strip took the ⌨
     away and its five rows of keys grew over the spot -- the way back was a
     click on a key chip, or H.  Now the ⌨ is always there, the toggle both
     ways (lit while the strip is open), and the strip starts just right of
     it (game.css .bt-kb-hints[data-beside]). */
  const chip = React.createElement('div', {
    className: 'bt-kb-chip',
    key: 'chip',
    'data-open': hidden ? '0' : '1',
    'data-kb-place': place,
    onPointerDown: swallow,
    onClick: toggle,
    title: hidden ? 'Show the keyboard controls (H)' : 'Hide the keyboard controls (H)',
    role: 'button',
    'aria-pressed': hidden ? 'false' : 'true',
    'aria-label': hidden ? 'Show keyboard controls' : 'Hide keyboard controls',
  }, '⌨');
  const strip = hidden ? null : React.createElement('div', {
    className: 'bt-kb-hints',
    key: 'strip',
    'data-beside': '1',
    'data-kb-place': place,
    onPointerDown: swallow,
    onClick: toggle,
    title: 'Hide these (H)',
    role: 'button',
    'aria-label': 'Hide keyboard controls',
  }, KEYS.map(([k, label]) => React.createElement('span', {
    className: 'bt-kb-key', key: k,
  }, React.createElement('kbd', null, k), ' ' + label)));

  /* v2.3.3505: in the margin, the ⌨ under the rows (game.css .bt-kb-side:
     column-reverse), so it stays where it is when the rows go */
  if (room && typeof document !== 'undefined' && document.body) {
    return createPortal(React.createElement('div', {
      className: 'bt-kb-side', 'data-kb-side': '1',
      style: { right: room.right + 'px', bottom: room.bottom + 'px' },
    }, chip, strip), document.body);
  }
  if (hidden) return chip;
  return React.createElement(React.Fragment, null, chip, strip);
}
