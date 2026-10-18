# A computer's clicks, flights and keys strip (v2.3.3465)

Three things the owner found playing on a computer, 2026-10-18:

> "when you click on a resource on pc it tries to do a combat swing first (or
> at least plays the combat audio). I hear a bow shot every time I click on an
> ore to harvest it." ... "I'm having trouble of the combat swings while
> interacting with different objects in the world including farming plots too."

> "On PC the jump to bag also flies off screen (to far left where black area is
> not where bag area is)"

> "The computer keyboard icon is a nice touch for showing and hiding the
> computer controls. But once the computer controls are open it's hidden
> behind the shortcut keys the menu shows. Move it over so you can still see
> where to click it to hide it again"

## 1. A click on something you use is not a swing

**What was wrong.** On a phone a tap waits to see what it is
(`settleTapPress`, v2.3.3145). With a mouse, the PRESS was the attack at once:
the canvas's `onMouseDown` aimed at the cursor, armed the attack and swung -- a
sword's whoosh, a bow's arrow and its draw along the cursor's line, a staff's
bolt. Only the CLICK that follows the release found the ore, the tree, the bed
or the townsperson and started the harvest. So every click on an ore with a
bow in hand loosed an arrow first.

**The fix.** The press asks the click's own question first
(`src/ui/BroTown.jsx` `_deskPressTarget`), in the click's own order:

| under the cursor | the press | the click |
|---|---|---|
| a monster | the attack (unchanged) | locks it |
| a townsperson, near or far | nothing | talks to him (far: "Too far away!") |
| another player | the attack (unchanged) | their card, or the fight's own rules |
| a resource IN REACH that you hold the tool for | nothing | starts the harvest |
| a bed of your farm, in reach or not | nothing | works it (in reach) |
| anything else | the attack (unchanged) | -- |

* The scans are shared, so the press and the click cannot disagree:
  `monsterAtCss` (the click's monster scan, moved out of it),
  `_harvestNodeAtCss` (the harvest tap's scan, out of `_tapHarvestAtCss`),
  `_farmBedAtCss` (out of `_tapFarmBedAtCss`), and the existing `npcAtCss`.
* A resource OUT of reach is left to the attack, as the click passes it over
  (v2.3.3145): a tree's tap box is its whole picture, a maple's 428 px across,
  and in a wood a bow aimed past a crown must still loose.
* A far bed is the click's all the same: the farm has no monsters, so a swing
  there is only noise.
* While you kneel at a bed (`S._farmWork`) no press arms anything; its click is
  the farm's.
* `window.__btDeskPress` (under `__btProbe`) says what the last press was:
  `talk`, `gather`, `farm` or `attack`.

## 2. What you get flies from where the game is, to where the bag is

**What was wrong.** Three flights are drawn on the page, over the game:

* the harvest's prize flying to the bag (`lifeSkillRewards.js`
  `_flyResourceToInventory`);
* the XP label flying to its card (`XpFlyOverlay.jsx`);
* a quest's reward flying to the gold or the bag when its target is not on the
  screen (`questFly.js` `fallbackRect`).

Each worked out its ends as if the game began at the window's top-left corner.
On a phone the game IS the window, so they were right. On a computer the game is
a column in the middle of the window (x 422 to 858 on a 1280 x 800 window), so:

* the prize rose from the node's place on the canvas with no canvas offset --
  in the black margin -- and flew to a toolbar Bag button that has not existed
  since v2.3.1654, so every flight ended at the fallback, 46 px from the
  WINDOW's left: the owner's "flies off screen";
* the XP label is `position: fixed` inside `#root`, which on a computer has
  `contain: paint` (game.css, v2.3.1768) and so is the corner every fixed child
  measures from: the label was drawn the column's left edge too far right, past
  the column, where the paint box cut it off;
* a quest reward with nowhere on screen to land flew to the window's corners.

**The fix.**

* `canvasPageRect()` and `bagFlightTarget()` (lifeSkillRewards.js): the prize
  starts at the node's place on the canvas plus the canvas's own place on the
  page (TRAPS §210, the harvest gesture's same mistake), and ends on the bag as
  the page draws it -- the dashboard's Bag panel when its row is up; folded,
  the band's OPEN / CLOSE pill, the way back to the bag; else the bottom-left of
  the game's column. Only what is really on the screen counts.
* The XP label takes off the corner `position: fixed` measures from
  (`fixedCorner`: its own overlay's root, else `#root`), and finds the game's
  own canvas (`canvas.brotown-canvas`), not the first canvas on the page.
* A quest reward's fallback is the corners of the game's column.
* `window.__btBagFlights` (under `__btProbe`) keeps the last 12 flights: from,
  to and what it aimed at (`bag`, `fold` or `column`).

## 3. The ⌨ stays beside the open keys strip

**What was wrong.** The keys strip (KeyboardHintsPanel.jsx) and the ⌨ chip were
one or the other in one corner: opening the strip took the ⌨ away, and five
rows of keys grew over the spot. The way back was a click on the strip itself,
or H -- neither of which says so.

**The fix.** The ⌨ is always there, the switch both ways, lit while the strip is
open; the open strip starts just right of it (game.css
`.bt-kb-hints[data-beside]`, sideways too), and never runs past the game's
column.

## Tests

* `mp-deskclick` (new): on a computer, a bow in hand, a real click on a copper
  vein starts mining with no arrow, no draw and no swing; a sword's click on a
  tree chops with no swing; a click on Ace talks; a click on a farm bed digs it
  with no swing, and a press while kneeling arms nothing; on empty ground the
  press is still the attack (the guard: the sword swings, the bow looses); the
  ore's flight starts on the vein in the game's column and ends on the bag; an
  XP label stays in the column; and on a phone the flight still starts on the
  vein and lands on the bag.
* `mp-deskkeys` 1b: the ⌨ is on screen beside the open strip, clear of it and
  of the bell, in the column, the thing a click there reaches; one click hides
  the strip, one more brings it back.
* `mp-deskharvest`, `mp-deskreach`: unchanged, still green.
