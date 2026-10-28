import React from 'react';
import { createPortal } from 'react-dom';
import { deskKeyRows, deskKeyGroups, deskKeyStamp } from '@/game/deskKeyList.js';   /* v2.3.3687: the keys that work now */
import { deskWideActive, DESK_KEYS_W, DESK_KEYS_FOLDED_W } from '@/ui/deskWide.js';   /* v2.3.3687: a computer playing wide */
import { abilityUnlocked, isAbilitiesEnabled } from '@/data/abilities.js';
import { prog3CharLevel, prog3ActiveCat, burstRefusal, burstWeapon } from '@/data/prog3.js';
import { quickEatChoices } from '@/game/quickEat.js';
import { calcDisplayHeal } from '@/data/gameSystems.js';
import { sprintSupported } from '@/game/sprint.js';
import { trappingOn, trapsHeld } from '@/game/trapping.js';

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
/* v2.3.3687: the table moved to src/game/deskKeyList.js (DESK_KEY_ROWS), and a
   key with a requirement is listed only while it is met -- the owner: "Keyboard
   instructions need to be dynamic since "whirl" doesn't work if you don't have
   your sword equipped".  The notes above are its history. */

/* What you have, by the rules each key's touch button follows (deskKeyList.js
   says which). */
export function deskKeyHave(S) {
  const R = S && S.rpg;
  if (!R) return {};
  let level = 0;
  try { level = prog3CharLevel(R) || 0; } catch (_e) { /* no level: nothing unlocked */ }
  const on = (kind) => { try { return isAbilitiesEnabled() && abilityUnlocked(level, kind); } catch (_e) { return false; } };
  let burst = false;
  try { const why = burstRefusal(R, burstWeapon(R), 0); burst = !why || why === 'mana'; } catch (_e) { /* no burst */ }
  let food = false;
  try { food = quickEatChoices(S, calcDisplayHeal, Date.now()).length > 0; } catch (_e) { /* no food */ }
  let sword = false;
  try { sword = prog3ActiveCat(R) === 'sword' && !!R.weapon; } catch (_e) { /* no sword */ }
  let trap = false;
  try { trap = trappingOn(S) && trapsHeld(S) > 0; } catch (_e) { /* no traps */ }
  return {
    sprint: sprintSupported(S),
    shield: !!R.shield,
    bash: !!R.shield && on('bash'),
    whirl: sword && on('whirl'),
    burst: burst,
    trap: trap,
    food: food,
  };
}

/* QA: what the rules say you have now, and the keys that lists (mp-deskwide) */
if (typeof window !== 'undefined') {
  window.__btDeskKeys = function () {
    const S = window._gameState ? window._gameState.current : null;
    const have = deskKeyHave(S);
    return { have, keys: deskKeyRows(have).map((r) => r[0]) };
  };
}

/* The rows, re-read once a second (a weapon swap, a shield equipped, food
   eaten): re-rendered only when what is listed changes. */
function useDeskHave() {
  const read = () => { const S = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null; return deskKeyHave(S); };
  const [have, setHave] = React.useState(read);
  React.useEffect(() => {
    const t = setInterval(() => {
      const now = read();
      setHave((was) => (deskKeyStamp(was) === deskKeyStamp(now) ? was : now));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return have;
}
/* the floating strip's rows: the menus' letters are on their own buttons, and
   only the column has the height for them too */
function useDeskKeys() {
  return deskKeyRows(useDeskHave()).filter((r) => r[3] !== 'menus');
}

/* ═══ v2.3.3687: ON A COMPUTER PLAYING WIDE, THE CONTROLS HAVE THEIR OWN COLUMN ═══
   The owner: "find a good place to keep a list of all the controls", then,
   seeing it under the bag, "If you split the keyboard shortcuts on its own
   strip to the right and kept the inventory on the left it might look
   better. You need to modify the containers to fit that shape better", and
   "I meant the right side of the screen consists of the black strip with the
   shortcuts.  Not just on the right side of the left black strip."  On a
   computer the game plays the sideways layout now (deskWide.js): the pages a
   column at one edge, and this list a column at the OTHER, the screen's
   height, its keys in groups spread down it (game.css .bt-desk-keys), with
   the world between them.  Hidden (H, or its ⌨) it folds to the ⌨ alone,
   DESK_KEYS_FOLDED_W wide, and the world takes the rest (sheetGeometry's
   bandFootprint reads the same choice).  `hidden` is the choice the ⌨ and H
   make (bt_kb_hints_off), told to the column by the 'bt-kb-hints' event the
   toggle sends.  It stands there whether the pages are open or folded away,
   so the floating strip below never shows on such a computer. */
function readHidden() {
  try { return localStorage.getItem('bt_kb_hints_off') === '1'; } catch (_e) { return false; }
}
export function DeskKeysList({ side = 'right' } = {}) {
  const groups = deskKeyGroups(useDeskHave());
  const [hidden, setHidden] = React.useState(readHidden);
  React.useEffect(() => {
    const on = () => setHidden(readHidden());
    window.addEventListener('bt-kb-hints', on);
    return () => window.removeEventListener('bt-kb-hints', on);
  }, []);
  const toggle = (e) => {
    e.stopPropagation();
    try { window.dispatchEvent(new CustomEvent('bt-kb-hints-toggle')); } catch (_e) { /* old browser: H still works */ }
  };
  return React.createElement('div', {
    className: 'bt-desk-keys bt-noselect', 'data-desk-keys': hidden ? 'folded' : 'open', 'data-desk-keys-side': side,
    style: { width: hidden ? DESK_KEYS_FOLDED_W : DESK_KEYS_W, [side === 'left' ? 'left' : 'right']: 0 },
    onPointerDown: (e) => e.stopPropagation(),
  },
  React.createElement('button', {
    type: 'button', className: 'bt-desk-keys-head', onClick: toggle,
    'aria-expanded': hidden ? 'false' : 'true',
    'aria-label': hidden ? 'Show the keyboard controls' : 'Hide the keyboard controls',
    title: hidden ? 'Show the keyboard controls (H)' : 'Hide the keyboard controls (H)',
  }, React.createElement('span', { className: 'bt-desk-keys-icon', 'aria-hidden': 'true' }, '⌨'),
    hidden ? null : React.createElement('span', { className: 'bt-desk-keys-title' }, 'Controls'),
    hidden ? null : React.createElement('span', { className: 'bt-desk-keys-chev', 'aria-hidden': 'true' }, '‹')),
  hidden ? null : React.createElement('div', { className: 'bt-desk-keys-list' },
    groups.map((g) => React.createElement('div', { className: 'bt-desk-keys-group', key: g.id, 'data-desk-keys-group': g.id, style: { '--rows': g.rows.length } },
      React.createElement('div', { className: 'bt-desk-keys-group-head' }, g.label),
      g.rows.map(([k, label]) => React.createElement('div', { className: 'bt-desk-key', key: k },
        React.createElement('kbd', null, k), React.createElement('span', null, label)))))));
}

/* ═══ v2.3.3526: IN THE BLACK MARGIN, BESIDE THE GAME ═══
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
  const rows = useDeskKeys();   /* v2.3.3687: the keys that work now */
  /* v2.3.3687: on a computer playing wide the list is a column of its own at
     the screen's far edge (DeskKeysList, BottomDashboard), with its own ⌨:
     neither the strip nor the chip here */
  const [desk, setDesk] = React.useState(deskWideActive);
  React.useEffect(() => {
    const read = () => setDesk(deskWideActive());
    window.addEventListener('resize', read);
    read();
    return () => window.removeEventListener('resize', read);
  }, []);
  if (desk) return null;

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
  }, rows.map(([k, label]) => React.createElement('span', {
    className: 'bt-kb-key', key: k,
  }, React.createElement('kbd', null, k), ' ' + label)));

  /* v2.3.3526: in the margin, the ⌨ under the rows (game.css .bt-kb-side:
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
