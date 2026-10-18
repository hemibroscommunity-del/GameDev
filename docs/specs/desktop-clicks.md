# A computer's clicks, flights, keys strip, footsteps, and what is drawn over the game (v2.3.3466)

Four things the owner found playing on a computer, 2026-10-18:

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

> "I can't hear footsteps on pc"

And a sixth, found while fixing the second: the same mistake in the tutorial,
the level-up celebration, the bag's item card, the chat card, the minimap's
place and the reconnect spinner (section 5).

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

## 4. Footsteps you can hear on a computer

**What was wrong.** Nothing was skipped: a walk on a computer asks for and
plays every footstep a phone does, at the same volume (measured: 14 steps in
6 s on both, `ctx` running, every clip loaded). They were simply under the
music. Each step's loudest 50 ms, at the volume `footstep()` plays it, against
the town's score (village.mp3 at `ZONE_MUSIC_VOL`, its whole-track average),
each measured per speaker side, as the game plays it (TRAPS §230):

| sound | level |
|---|---|
| a sword swing | -12.0 dB |
| the bow's draw | -24.2 dB |
| a step on dirt | -47.3 dB |
| the town's music, on average | **-47.5 dB** |
| a step on snow | -49.2 dB |
| a step on gravel, grass or sand (the Wheel's commons) | **-50.6 to -52.3 dB** |

So a step on the commons sat 3-5 dB UNDER the music. A phone's small speaker
loses most of the music's bass and the steps' crunch comes through; a
computer's speakers or headphones play the music whole, and it buried them.

**The fix.** On a computer (`pointer:fine`, the game's own desktop test) every
step -- yours, a jump's landing, another player's at their share -- is played
`BT_AUDIO.DESK_STEP_K` (2.5x, +8 dB) louder (`gameDisplay.js`
`_deskStepK`): gravel, grass and sand 3-5 dB over the music's average, dirt
8 dB over it, all still 15 dB and more under a bow's draw. A phone is unchanged:
the owner halved the steps there (v2.3.1237). `?stepvol=k` (0 to 4) sets the
multiplier on any device, to try a level.

## 5. What is drawn over the game is placed where the game is

**What was wrong.** Section 2's mistake (TRAPS §232) in seven more places, found
by measuring every overlay on a 1280 x 800 window, where the game's column runs
from x 422 to 858:

| | where it should be | where it was |
|---|---|---|
| a new bro's "Tap OPEN" ring (QuestCoach) | round OPEN, x 426 | x 838, past the column's edge: cut off |
| ...its card | over OPEN | the column's far side |
| the gear lesson's ring | round the bag's first tile, x 431 | x 848: cut off |
| the controls tour's spotlights (Settings -> Controls) | on the bag and More | 421.8 px right of them |
| the level-up celebration | the column's middle | medallion at x 1062, caption 1,280 px wide: **none of it seen** |
| the bag's item card | beside the tile you clicked | x 605-845 whatever the tile, over it in the column's right half |
| the chat card | inside the column | 460 px in a 436 px column: 12 px cut off each side |
| the world map's button over the minimap, after the window is made only narrower or wider | over the minimap | where the minimap was (90 px off at 1,100 wide) |
| the spinner while a reload rejoins | beside the exit arrow | x 52 of the window: in the black margin |

The tutorial, the tour and the item card read controls with
`getBoundingClientRect` -- the window's numbers -- and draw in a `position:
fixed` layer that, inside `#root`, measures from the column. The celebration
sized and pinned itself from `window.innerWidth` and `innerHeight` (so a
computer also counted as sideways: no dashboard band under its caption), the
chat card was `92vw` wide, the minimap re-measured its place only when the
canvas changed size (on a computer a window made narrower moves the column, not
its size), and the spinner is the body's, so its `left` is the window's.

**The fix.**

* `fixedBox(layer)` (`src/ui/fixedBox.js`): the box a fixed layer's children
  are placed in, in the window's numbers -- the layer's own when it is laid out,
  else `#root`'s, else the window's. The coach, the tour and the item card take
  its corner off every rect before placing it, and measure from its bottom; the
  XP label's corner (section 2) is the same helper now.
* The celebration measures its own box (its parent's client size) when it
  appears, in a layout effect so the first frame painted has it, and again only
  on a resize or rotation -- never every frame (`LevelUpBurst.jsx`).
* While it plays, the keys strip stands aside (`body:has([data-levelup-kind])
  .bt-kb-hints`, game.css): it paints over the game whatever its z-index, and
  its last rows lay over the caption. It is back when the 2.6 s are over.
* The chat card is `min(92%, 460px)`: 92% of the box it is fixed in.
* The minimap's place is measured again when the window's width or the
  dashboard's side changes (`wheelMinimap.js`, both read without a layout).
* The spinner is put the column's left edge + 52 px across when the column
  does not start at the window's edge.

On a phone each of these boxes is the window: nothing there moves (the last
part of `mp-deskplace`).

## Tests

* `mp-deskclick` (new): on a computer, a bow in hand, a real click on a copper
  vein starts mining with no arrow, no draw and no swing; a sword's click on a
  tree chops with no swing; a click on Ace talks; a click on a farm bed digs it
  with no swing, and a press while kneeling arms nothing; on empty ground the
  press is still the attack (the guard: the sword swings, the bow looses); the
  ore's flight starts on the vein in the game's column and ends on the bag; an
  XP label stays in the column; and on a phone the flight still starts on the
  vein and lands on the bag.
* `mp-deskclick` 9-10: a computer's footsteps play at 2.5x, a phone's at its
  own level.
* `mp-deskkeys` 1b: the ⌨ is on screen beside the open strip, clear of it and
  of the bell, in the column, the thing a click there reaches; one click hides
  the strip, one more brings it back.
* `mp-deskplace` (new), on a computer: the "Tap OPEN" ring round the OPEN
  button inside the column, a click at its middle reaching the button, its card
  over it; a real click answering it; the gear lesson's ring on the gear tile;
  every spotlight of the controls tour on its control; the celebration's
  medallion in the column's middle, its art and caption inside the column, the
  keys strip aside while it plays and back after; an item's card beside the
  tile clicked, in the column; the chat card inside the column; in the Wheel,
  the world map's button over the minimap before and after the window is made
  narrower; a reload's spinner beside the exit arrow. On a phone: the
  celebration and the first tile's card where they were. On main 12 of its 23
  checks fail, each by the amounts in the table above (the item card's two
  find it by a test handle this adds, so main's read "none").
* `mp-questcoach`, `mp-coachearly`, `mp-ctltut`, `mp-skillup`, `mp-chatbubble`,
  `mp-chatcompose`, `mp-cardreach`, `mp-wheelmap`, `mp-north` (phones),
  `mp-xpfly`, `mp-deskkeys`: unchanged, still green.
* `mp-deskharvest`, `mp-deskreach`: unchanged, still green.
