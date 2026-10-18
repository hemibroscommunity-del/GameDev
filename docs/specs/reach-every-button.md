# Every button, sideways and on a computer (v2.3.3343)

The owner, 2026-10-18: "Make sure all actions/buttons can be completed in
landscape mode and on the computer. For instance I don't think you can harvest
lifeskills right now on the computer. Make a fix for that."

The harvest is docs/specs/desktop-harvest.md. This is the rest: what the UI
review (docs/specs/ui-review.md) found when it walked a player through every
screen as an upright phone, a sideways phone and a computer and asked, of every
button on every screen, "is it on the screen, and does a press there reach it?"

## Found and fixed

| where | what was wrong | fix | test |
|---|---|---|---|
| sideways (and upright at the edge) | An invisible 18 px strip down the screen's left edge (the iOS swipe-back guard, v2.3.112) lay over every control there: the logout, a page's ◂ back arrow, the ▴/▼ fold chip; upright the band's CLOSE pill and first bag column. Their left part took no tap. | The guard is a listener now (BroTown.jsx `EDGE_CONTROL`): a touch starting at the edge is still swallowed on the world, but goes to a control it lands on. TRAPS §210. | mp-edgeguard 1-5 |
| sideways | Diego's shop: nothing could be **sold**. The bag is the side column sideways, the shop's drawer covered the ▴ chip that opens it, and opening it closed the shop. His shelf also overflowed its drawer (111 px slots), pushing "His shelf" under his name. | The shop opens your bag column with it and sits beside it (ShopkeeperPanel, BroTown keeps the shop open for that page); shelf slots at most 68 px (an upright phone's are 67.6, unchanged). TRAPS §211. | mp-shopkeeper (sideways part) |
| sideways | Ace's coin flip: the window was ~600 px tall on a 390 px screen and did not scroll, so its **Flip** button was below the screen. | The window holds itself to the screen and its body scrolls (AceFlipPanel). | mp-edgeguard 6 |
| computer | At a building's door the **Enter** button lay under the keyboard-keys strip, which took the click. | The strip steps aside while a door's/character's prompt is up -- the prompt shows its own key, E (game.css). | mp-deskreach 1 |
| computer | The Daily Rewards window's **✕** lay under the minimap's invisible "open map" button: a click opened the world map. Sideways, Diego's ✕ the same. | That button lets clicks through while either window is up, as it already did for every building window (game.css). | mp-deskreach 2, mp-shopkeeper |
| computer | Two farm buttons answered only a finger: "😴 Sleep" at the farm's bed and "🔥 Cook … (Field)". A mouse click did nothing (E still worked for the bed). | One click, the v2.3.2617 rule for a finger and a mouse alike. The Furniture Workshop's button fired twice on a finger; now once. | (by reading; no scenario reaches the farm's bed with the field cook) |
| every view | The notification bell was drawn over the bottom row of any window in its corner (the Forge tab, a marketplace filter) while it could not be pressed. | Shut and under a window, the bell is hidden (WorldChatFeed). | mp-notifbell |
| sideways | The ◂ back arrow had no name for screen readers or the review. | `aria-label="Back from …"`. | -- |
| computer | The character creator on a **laptop**: on a 1366 x 768 window **Enter Bro Town** lay at y 847-903, below the screen, and the creator does not scroll -- a new player could not begin (1536 x 864, 1280 x 800 and 1280 x 720 the same; 1440 x 900 cut it 3 px). Its sizes were fractions of the *window's* width (`44vw`...), so the character's column took its 360 px ceiling inside the 419 px play column and the trait picker got 31 px (its labels "H…", "S…"). | On a computer the creator's sizes are fractions of the play column (game.css "THE CREATOR SIZES ITSELF FROM THE COLUMN"): it lays out as a phone of the column's shape. Every window from 1280 x 650 to 1920 x 1080 fits it. TRAPS §213. | mp-deskreach 3 |

## Checked and fine

- Every dashboard page, sideways: its last row scrolls clear of the button row
  at the bottom (probe: every list's end at 334 against the row's 342).
- Upright, the bag's fourth row scrolls into view.
- Every touch-only control on a computer has a key or a click: Space dodge, X
  jump, Shift sprint, Q shield, E interact/bash/harvest, F / right-click
  special, R whirlwind, G burst, T trap, V quick eat, Tab and 1-3 weapons, C
  chat, Esc close; the left/right sticks are WASD and the mouse.
- Clicks on the world reach people, players, resources and farm beds.
- The world map drags and zooms with a mouse (wheel, +/-).
- The white "…pping." box at a harvest's left edge is a townsperson's speech
  bubble drawn by the game, half off the screen -- not a menu.

## Not changed (for the owner, and for ChatGPT's review)

- Many buttons are smaller than Apple's 44 px guide; the review lists them as
  "small" or "under the 44 px touch guide". None is unreachable.
- On a computer the keyboard strip covers the bottom-left of the world (the
  bell no longer sits on its chips: desktop-keys.md). The black margins beside
  the game's column (~470 px at 1440 wide) could hold the strip instead.
- The NPC dialogue, the quest offer and the world map are drawn over the whole
  window on a computer, a little wider than the game's column.
