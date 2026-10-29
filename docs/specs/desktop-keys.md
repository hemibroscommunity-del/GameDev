# A computer's keys, on the buttons they press (v2.3.3407)

The owner, 2026-10-18: "For computer usage if there's a key that makes sense
to use for a certain action just put the letter next to the icon or action in
a tasteful way."

## What a player on a computer sees

A small key cap (a dark slate key, its letter in the game's text colour, a
heavier bottom edge so it reads as a key) on each button that has a key:

| where | key | what it does |
|---|---|---|
| the dashboard's Dashboard button | **I** | the bag (inventory): with a page open, back to the band at rest (where the bag is); at rest, folds the band away and brings it back |
| Character | **P** | opens your character; again, closes it |
| Quests | **J** | the quest journal; again, closes it |
| Life Skills | **L** | life skills; again, closes it |
| Codex | **K** | the codex; again, closes it |
| More | **O** | more (options); again, closes it |
| the minimap, beside its "tap me" mark | **M** | the world map; again, closes it |
| Mayor Bro's (and every character's) **Next** / Continue | **Enter** | his next line |
| the quest's **Accept Quest** / Claim Rewards | **Enter** | accepts it |
| the quest's **Not now** | **Esc** | lets it go |
| every window's **✕** -- the buildings, the player card, Diego, Ace, the daily rewards, the world map, an item card, the codex's item card, the trade window, chat, the tour, the emotes | **Esc** | closes it |
| the chat box's smiley (the emotes' button) | **B** | the emotes (v2.3.3391's key, "B for Bro"); again, closes them |
| the TRAP pop-up | **T** | arms the trap (or, grey, says why) |
| chat's **Send** | **Enter** | sends |

The interact prompts at doors, beds and dungeons already wore **E**, and the
harvest's button says "Drag ↔ or hold E" (v2.3.3407, desktop-harvest.md).
The keys strip in the corner lists the rest (WASD, Shift, Space, X, Q, R, F,
G, V, C, H, Tab) and now **1-3** (each weapon straight to hand), the one
weapon key no button on a computer wears.

The letters are the ones PC games give these places, kept clear of every key
the game already used (WASD, Q E R F G T V X C H B, Tab, 1-3, Space, Shift,
Esc): I for inventory, P for player, J for journal, L for life skills, K for
the codex (it sits between J and L on the keyboard's home row), O for
options, M for map.  This PR first gave the bag B; main gave B to the emotes
while it waited (v2.3.3391), so the bag took I, as many PC games have it, and
the emotes' own button, the chat box's smiley, wears the B.

## How it is built

- `src/game/deskKeys.js` is the ONE table (`NAV_KEYS`, `MAP_KEY`), read by
  both sides: `desktopControls.js` binds each key, and the button that does
  the same thing wears it -- `data-key="J"` on the button (NavRail, the
  world map's open button, ...). A letter can never promise one thing while
  its key does another.
- The letter is drawn by game.css (`[data-key]::after`, `content:
  attr(data-key)`) only under a mouse, `@media (pointer:fine)`. It is
  generated content, never a text node: the quest scenarios read the cards'
  words, and "Accept QuestEnter" would have broken them (TRAPS §213). A phone never shows
  one. It takes no clicks (`pointer-events: none`): a press on the letter is
  a press on its button.
- Where it sits, by `data-key-at`: nothing -- inside the bottom-right corner
  (the dashboard's buttons); `hang` -- centred under the button, over its
  bottom edge (a ✕); `end` -- inside the right end (Accept Quest); `inline`
  -- after the words (Next, Not now, Send, the trap); `xy` -- at `--key-x` /
  `--key-y` (the minimap, from `window.__btWheelMini.mark`, which
  wheelMinimap.js publishes beside its box).
- Every `.bt-inspect-close` (seventeen windows' ✕) wears "Esc" from its
  `::before` -- its `::after` is its 44 px touch target -- with no change to
  those files.
- **Esc presses the ✕ of the window in front** (`frontControl(ESC_SEL)`: on
  the screen, and a press at its middle reaches it; `data-esc` or
  `.bt-inspect-close`), so whatever closing a window does, Esc does: the
  world map, Diego, Ace, the item card and the codex's card were not closed
  by Esc at all before, and a window over a window now closes one at a time
  (the daily rewards over the bank: Esc shuts the rewards, Esc again the
  bank). Then, as before, any other window (`.bt-inspect`, Mayor Bro's
  dialogue) by the old sweep; then the dashboard's open page, back a step,
  then shut. Chat first, as before.
- The two ✕s that act on pointerup (the item card's header, InfoPopup) say
  `data-esc="up"`, and Esc gives them the pointer's press and release
  (`pressControl`).
- **Enter presses the dialogue's own button in front** (`data-enter`):
  Next / Continue and Accept Quest / Claim Rewards (not while it is
  disabled). With none up, Enter is left alone.
- **Never with Ctrl, Cmd or Alt held** (`browserChord`): Ctrl+P prints, Cmd+L
  is the address bar, Ctrl+J the downloads. Never while typing (the old
  INPUT / TEXTAREA guard): "jplkoibm" in chat is just words.
- The keys strip moved right of the bell (it sat over "Tab Swap" and "C
  Chat" on every computer), 310 px wide to keep five rows, and stands aside
  while the chat feed the bell opens is up over the same corner, and while
  the emote picker is up: its rows lay over the picker's second row of moves,
  so a click on Sit, Sleep, Flop or Bounce hid the strip instead.
- **Since v2.3.3526 it is in the black margin beside the game** (the first
  ChatGPT review's suggestion; the owner: "Go recommended on everything").
  Wherever the margin has room -- 190 px, and a window at least 520 px tall --
  KeyboardHintsPanel portals the strip and the ⌨ into the body (#root's
  `contain:paint` clips anything of its own to the column), one key a row,
  their right edge 16 px left of the column and the ⌨ under the rows
  (game.css `.bt-kb-side`, `data-kb-place="side"`). There it covers nothing,
  so it no longer stands aside for anything (`display` !important against the
  column rules). It moves the moment the window changes (a resize, or #root's
  size). A window without that room -- 1000 x 1200, say, its margins 173 px --
  or a computer window under 1000 px wide (no column) keeps it in the corner
  of the game as above (`data-kb-place="column"`).

## v2.3.3711: the owner's layout, and its combos

The owner, 2026-10-28: "Do your recommended keyboard layout. I still think
there are better layouts if you consider more creative combos (like keyboard
presses while a click is held down, double clicking, etc)."  The judges play
on computers.  The left hand stays on WASD, the right on the mouse:

| Does | Now | Before |
|---|---|---|
| Shield up (faces the pointer) | right mouse button HELD; let go lowers it | Q held |
| Shield bash | a left click while the right button is held | Q+E (E with the guard up still bashes, unlisted) |
| The weapon's special | Q | F, or a right click |
| Element Burst | F | G (G still works, unlisted) |
| Next / last weapon | the mouse wheel (down the next, up the one before) | Tab, 1-3 (both stay) |
| Dodge roll | a direction key tapped twice within 250 ms, that way | Space (stays) |
| Lock on | a double click on a monster (with the sword, the lunge) | a click (toggled: two clicks let it go again) |

Unchanged: Space, Shift, X, R, E, V, T, C, B, the page keys, Esc, Enter, the
left click's attack.  Phones are unchanged.

What gives way, and what keeps its old use:
- **A right click with no shield on the arm is still the special** (a new bro
  has no shield, and a right click that did nothing would read as broken).
  The special now fires on the right button's PRESS, not on the browser's
  `contextmenu` (which Windows sends on the release, where a held guard's
  let-go would have fired one).
- **The browser's right-click menu** never opens over the game on a computer
  (`desktopControls.js` refuses it on the whole page, `(pointer:fine)` only);
  a text field and a link keep their menu (paste, open in a new tab).
- With the shield up, a left click is the bash wherever it lands: you cannot
  talk, harvest or dig with your guard raised (as E said since v2.3.1733).
  Where the worker casts no abilities, the click is the swing it always was.
- The shield comes down when the right button is let go anywhere on the page
  (heard on the window), and when the window loses focus.
- The double tap counts presses only (a held key's repeats never), only the
  same key twice, and a roll forgets the pair, so a third quick tap starts the
  next pair. Its other axis is the keys held across it (W held, D tapped
  twice: up and right). `?dbltap=0` turns it off for a tab.
- The wheel adds a notch's or a trackpad flick's small deltas up to one step
  (50 px), then lets the rest of that flick go for 220 ms: one notch, one
  weapon. Over the world only: over a page or a window it scrolls as before.
  Ctrl with the wheel is the browser's zoom.
- A double click on a monster always ends locked on it (`src: 'tap'`): its
  second click no longer lets the first click's lock go.

Built in `src/game/deskCombos.js` (the double tap and the wheel, no imports,
node-tested), `desktopControls.js` (Q, F/G, the double tap, the right button's
release, the menu), `BroTown.jsx`'s canvas (`_deskRightPress`,
`_deskBashPress`, `onDoubleClick`, `onWheel`), `weaponSlots.js`
(`prevWeaponSlot`). Every place a player reads a key says the new one: the
controls column (`deskKeyList.js`: R-Click, +Click right under it, 2×WASD,
2×Click, Wheel), the Element Burst button's key cap (F), the shield's item
card ("Hold right-click to block").

Owner's calls, open: whether to keep the double tap's roll (a quick double
nudge of W rolls now; `?dbltap=0` is the off switch for a tab), and whether
the wheel's direction (down = next) reads right on their mouse.

## Adding a key

1. Bind it in `desktopControls.js`; if it opens a dashboard page or the map,
   add it to `deskKeys.js`'s table instead.
2. Put `data-key` (and `data-key-at`) on the button that does the same.
3. A new window: its ✕ takes `data-esc` (a `.bt-inspect-close` has it
   already), `data-esc="up"` if it acts on pointerup.
4. Extend `mp-deskkeys`.

## Tests

`mp-deskkeys` (a computer, real key presses; and a phone): the six letters
and the M, the strip clear of the bell and listing 1-3, in the margin beside
the game (and in the column on a 1000 x 1200 window, back in the margin
after); each key opens its
page and closes it, J then L swaps, I to rest and I folding the band; B
opens the emotes, whose ✕ wears Esc and Esc closes them, every button in the
picker answers a click (the strip stood over four), and the chat box's smiley
wears B; Esc on
More > Settings goes back a step, then shuts; Ctrl+J and Ctrl+M left to the
browser; typing in chat opens nothing; M and Esc on the world map; Esc on the
bank, Diego, Ace, the daily rewards, and on the rewards over the bank one at
a time; Enter as Mayor Bro's Next and as Accept Quest (the worker's record
says the quest is active), Esc as Not now; a phone wears no letter and has
no strip.  v2.3.3711, a second computer (the wide layout) at Frost Ridge with
a greatsword and a bow, Playwright's real mouse and keys: the wheel down and up
over the world (and nothing over the controls column), Q the special (no
shield), F and G the burst (F no special), the right button held raising the
shield toward the pointer with no browser menu, a left click with it the bash
(sent to the worker, no swing), the release lowering it, the right button
without a shield the special, D tapped twice rolling (once more, or A twice
slowly, not), a double click on a snowman locking on with the bow and lunging
with the sword.  `server/test/desk-keys.test.mjs` §7-9 hold the table, the
combos' rules and the weapon cycle backwards.

## v2.3.3844: Space jumps, X rolls

The owner, 2026-10-29: *"Also spacebar I think should be jump."* Space was the
dodge roll and X the jump (v2.3.3017, when Space was taken); they swap
(`src/game/desktopControls.js`):

- **Space jumps**: one press, one jump. A held Space jumps once (its repeats
  do nothing more); a second press in the air is the double jump's flip, as
  X's was. Space never scrolls the page, and never presses a button a click
  left focused: its keydown and its keyup both refuse the browser's default
  (except in a text field, where Space types a space).
- **X rolls**, exactly as Space rolled: the way WASD points, else toward the
  mouse, else the way you face, and a lock still turns it into the sword's
  lunge or the bow's retreat shot. A direction tapped twice still rolls.
- The controls list reads `Space Jump`, `X Dodge`, `2×WASD Dodge`.

Tests: `mp-spacejump` (a computer, the wide layout, real keys; fails on main:
there Space rolls and X jumps), `server/test/desk-keys.test.mjs` §10, and the
scenarios that pressed the old keys (`mp-jump`, `mp-ghostaudit`,
`mp-soundcues`, `mp-soundstudio`, `mp-armourflash`, `mp-garmentspecks`,
`mp-inkplace`, `mp-traitsoak`, `mp-deskwide`) press the new ones.

## v2.3.3847: the right button toggles the shield

The owner, 2026-10-29: *"Also I think right click should just hold up shield
until you click right click again. You should also be able to just hold it up
and point if there's no monsters around."*

- **A toggle.** A right press raises the guard (BroTown `_deskRightPress`), and
  letting go lowers nothing: v2.3.3711's `onMouseUp` in
  `src/game/desktopControls.js` is gone. The next right press lowers it.
- **Everything that lowered a guard still does**: an attack, a roll, a jump,
  a daze, the water, a block landing. `dropShield` clears `_shieldMouse`, so
  after any of them the next right press raises the guard again (never a
  press that does nothing).
- **Leaving the window lowers it** (`onBlur`, as before): alt-tab away and
  back and the guard you see is the guard you have, one right click from up.
- **With no shield on your arm** the right click is still the special.
- **Where it points.** With something near to face (a lock, the player who
  just hit you, the nearest monster or sparring fighter: `shieldTargetAngle`
  in `src/game/shieldToggle.js`, the same rungs a phone's guard uses), the
  guard faces it. With nothing near it follows the mouse pointer, live:
  `deskPointerAngle` (`src/game/deskShield.js`) reads where the pointer is on
  the screen and where the camera is now, so walking with the mouse still
  keeps it on the pointer.
  - **This is a change with monsters near.** Until now a guard held on the
    right button followed the pointer always, monsters or not (v2.3.1726's
    steer). `?shieldaim=mouse` puts that back for one tab: the owner's choice
    of "always follow the pointer".
- The list says `R-Click Shield ↕` (up and down): "Shield (toggle)" is 97 px
  and the column's words have 73.

Tests: `mp-shieldtoggle` (a computer, the wide layout, the real mouse; fails on
main, where the release lowers the guard), `mp-deskkeys` 8c (the release keeps
it up, the next press lowers it), `server/test/desk-keys.test.mjs` §11.

**Also in v2.3.3847, the weapon numbers.** The owner: *"instead of '1-3
weapon' just list which number represents which weapon (1 melee, 2 bow, 3
staff, etc)"*. The list's `1-3 Weapon` row is three: `1 Melee`, `2 Bow`,
`3 Staff`, always shown (every player's weapons row has the three slots;
3 does nothing until you carry a staff, as before).
