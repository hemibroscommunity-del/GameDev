# A tap that closes a window taps nothing under it (v2.3.3560)

Found while building the Points tab's new heads (#1070): on a 390 px phone,
tapping ✕ on a shared stat's window (Max HP, Defense...) closed the window and
opened the world map. Main did the same. The owner: "Yes begin the fix".

## What was happening

A tap is a press, a lift and then, a moment later, a click (on a touch screen
also a mousedown and a mouseup just before the click), all where the finger
was. The stat window (`src/ui/mobile/InfoPopup.jsx`) closes on the **lift**,
and has since it was made (v2.3.2131). That is on purpose: the window is
opened by a lift too, and that opening tap's own click lands on the window just
put up. A window that closed on a click would close the moment it opened.

React takes the window off the page before the browser sends the click, and
the browser sends it to whatever is under the finger **then**:

- **A shared stat's ✕ on a 390 px phone** lies over the minimap, whose
  invisible "open the world map" button (`WorldMapOverlay.jsx`, a body-level
  portal that opens on a click) took the click. The world map opened.
- **A weapon stat's window** is taller, and its ✕ is clear of the minimap.
  Its click, and the clicks of "Got it" and the gear picker's ✕, landed on the
  joystick's zone instead.
- game.css already lets taps through the map button while a window is up
  (`body:has(.bt-inspect) [data-world-map-open]{pointer-events:none}`). That
  cannot help here: the rule stops holding the moment the window goes, before
  the click comes.

**On a computer it was worse.** The game's `#root` has `contain: paint` there,
which makes the whole game one layer under that body-level button. At
1366 x 768 the Points tab's stat windows are tall, so their ✕ lay **under** the
map button. A click on the ✕ opened the world map and the window stayed up.

## The fix

- **`src/ui/swallowTapClick.js`.** A control that takes its window away on a
  lift calls `swallowTapClick(e)` first. That eats the mousedown, mouseup and
  click this same tap is still to send, and nothing else:
  - only within 32 px of where the finger lifted (a tap that moved further is
    a drag, and sends no click);
  - only for 0.7 s (every element is `touch-action: manipulation` since
    v2.3.3454, so the click comes at once; measured, 3-4 ms after the lift);
  - only until the next press: a new tap is the player's, even on the same
    spot a moment later;
  - only events the browser made: never a test's synthetic events or the Esc
    key's press of a ✕, and never a click made by a key;
  - once: the click ends it.

  It eats them on the document in the capture phase, so the game's own
  listeners there and on the window (the sound recovery, the come-back)
  still hear them, and nothing in the game's tree does.
- **Where it is called:**
  - the stat window's ✕, the dim round it, "Got it", and an action button
    that closes it (a Spend that stays, the Points window's, does not close
    and arms nothing);
  - the gear picker's ✕ (`ItemDetailPopup.jsx`);
  - the old spend confirm's three ways out (`SpendPointConfirm.jsx`);
  - the sale notice, dismissed by a tap (`StoreToast.jsx`).
- **game.css:** `body:has([data-infopopup]) [data-world-map-open]` joins the
  pointer-events list. While the stat window is up on a computer, the map
  button lets the click through to the ✕. Its key cap was already hidden there.

**`?tapthrough`** in the address is the game as it was: nothing is armed and
the click goes where the browser sends it. **`window.__btTapClicks`** is
`{ armed, eaten, last, off }`, where `last` is the element the last eaten click
was headed for and how long after the lift it came.

## The rule for new code

A window (or anything) that takes itself off the page on `pointerup` calls
`swallowTapClick(e)` in that handler. Two kinds need nothing:

- a window that closes on a **click**, since the click is the tap's last event
  (`tapDismiss.js`, the door prompt in BroTown);
- a lift that leaves its control where it was, since the click lands on the
  control again.

On a computer, a window that can lie over the minimap goes in game.css's
pointer-events list. TRAPS §247.

## Not changed

Some layers close on a **press** and let the tap carry on. The gear picker's
see-through backdrop is one: "tapping the play area closes it". That tap's
click still reaches the world under it. Whether such a tap should also act on
the world is a design question, not this bug, so they are left as they were.

## Tests

`mp-tapthrough` has 22 checks, played in the world. On main, 10 of them fail.

On a phone at 390 x 844:
- The shared stat's ✕ lies in the minimap's box.
- A finger on it closes the window, the world map stays shut, and the eaten
  click was headed for the map's button.
- The dim round the window over the minimap does the same.
- "Got it" closes the window with nothing opened and no click getting past.
- A new tap on the minimap 0.15 s later opens the map.
- A weapon stat's ✕ and the gear picker's ✕ let no click past.

With `?tapthrough`, the same ✕ opens the map.

On a computer at 1366 x 768, a click on the ✕ hits the ✕, closes the window,
and the map stays shut.
