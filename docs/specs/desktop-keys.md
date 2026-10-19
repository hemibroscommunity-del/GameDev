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
- **Since v2.3.3483 it is in the black margin beside the game** (the first
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
no strip.
