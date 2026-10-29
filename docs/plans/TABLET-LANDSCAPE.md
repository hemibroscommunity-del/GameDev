# Tablet in landscape: the computer's layout, with touch controls (a plan)

Status: **PLAN ONLY**, for the owner's decision after the showing. Nothing here is built.

The owner, on an iPad, 2026-10-29: *"I'm also questioning if the desktop layout should just be the de facto landscape layout. I think it's better."*

## 1. What a tablet gets today

Captured on main cdee525 against a local worker, a new player in BroTown. Each size was shot with a touch screen (what an iPad gets) and with a mouse (the computer's layout at the same size), with the dashboard folded and then open.

| Size | iPad today | Computer layout |
|---|---|---|
| 1180x820 (iPad Air / 11" Pro) | `ipad-1180x820.png`, `ipad-1180x820-dash.png` | `desk-1180x820.png`, `desk-1180x820-dash.png` |
| 1366x1024 (12.9" iPad Pro) | `ipad-1366x1024.png`, `ipad-1366x1024-dash.png` | `desk-1366x1024.png`, `desk-1366x1024-dash.png` |

The pictures are in the session's scratchpad (`tablet/`); `sheet-1180x820.png` and `sheet-1366x1024.png` put all four side by side.

What the iPad shows:

- **It gets the sideways-phone layout.** That layout was sized for a phone about 390 px tall. Opened, the dashboard is a ~200 px column of big empty bag cells. Its page buttons are tiny icons at the foot of the column (about 20 px), and its lower half is black. The world is drawn wide, with the phone's controls bottom right.
- **At 1366x1024 it is worse: a half-styled layout.**
  - The sideways phone's CSS rule (`game.css`: `(orientation:landscape) and (pointer:coarse) and (max-height:1000px)`) stops at 1000 px tall.
  - But the JavaScript still picks the sideways layout from the play area's shape (`playViewport.js playIsLandscape`).
  - So the 12.9" iPad gets the sideways layout without the CSS written for it.

  This is a small bug on its own, whatever the owner decides.
- **The computer layout at the same sizes is the three columns.** The pages are a 330–390 px column at full height, with the bag at a usable size and labelled page tabs. Then the world, then the 156 px keys strip. The pages read much better on a screen this size. Neither touch control set is shown there (the sticks, the attack disc, jump, roll, ride and special are hidden by `.bt-desktop-hide`).

## 2. What "a tablet in landscape gets the computer layout, plus its touch controls" takes

### a. One switch for "the big-screen shell"

Today one media query plays two roles: `(pointer:fine) and (min-width:1000px)` means both "a mouse" and "a big screen".
- `game.css` has 4 blocks gated on it, plus 1 for short computer windows.
- JavaScript asks the same question: `deskWide.js FRAME_QUERY`/`deskWideActive()`, and `BroTown.jsx` around line 3625 (`_shellMq`).

**Split the two meanings:**
- **The shell** becomes a class on `<html>`, `bt-shell`, set by `deskWide.js`. It is on for a computer (as today) or for a touch tablet in landscape that passes a size gate.
  - The 5 layout blocks in `game.css` move from the media query to `html.bt-shell`.
  - `deskWideActive()` reads the class.
  - The class is recomputed on resize and rotation, through `matchMedia` listeners, so an iPad turned upright gets the upright layout back live.
- **The mouse** stays `(pointer:fine)`. These readers are about the mouse, not the layout, and must not change:
  - the hover rules in `game.css`;
  - the words ("click" vs "tap", `deskWords.js`);
  - `S._isDesktop` (16 reads: the click-is-not-a-swing rule `_deskPressTarget`, the cursor aim);
  - the name modal's placeholder;
  - the special, jump and trap buttons' fine-pointer branches;
  - the item popup;
  - the step size in `gameDisplay.js`.

  Each of these ~10 readers gets checked by hand: "mouse" or "layout"?

**The size gate that keeps phones out:** landscape, coarse pointer, at least **1000 px wide and at least 700 px tall**.
- A sideways phone is at most about 932x430 (iPhone Pro Max), so it never qualifies; the height alone rules phones out by a wide margin.
- iPad mini landscape (1133x744) and Android tablets (1280x800) qualify.
- A foldable opened sideways (about 880–900 px wide) stays on the sideways-phone layout.
- The pages column alone needs 390 px, so 1000 px wide leaves the world at least about 600 px.

### b. The keys strip

On touch it has nothing to say: there are no keys. A tablet in the shell gets **no strip** (`deskKeysW()` returns 0), and the world takes the width.

A Bluetooth keyboard on an iPad does work with the game's keys, so the strip's `⌨` button could stay as an opt-in. Not for the first cut.

### c. The touch controls in the shell

- `.bt-desktop-hide` stops hiding them when the shell is on a touch screen. It is keyed to the mouse, not the shell.
- They must sit **inside the world column**, not at the window's edges.
  - The left stick's zone (`[data-joyzone="L"]`) starts where the world starts, to the right of the pages column.
  - The right zone, the attack disc, jump, roll, ride and special sit at the world's right edge (the window's edge once there is no keys strip).
  - Today these are placed against the window or the play area. In the shell they are placed with `fixedBox(layer)` and the world's rectangle (`sheetGeometry`'s band footprint), the way the computer layout already places its overlays.
- The left stick must not start a drag inside the pages column: tapping a bag cell is not a walk.

**Sizes.** The phone's controls were made for a 390 px-tall screen. On an 820 px-tall iPad they look small (see the iPad shots). They should scale with the world column's height, with a cap so they never pass about 1.4x the phone's size.

### d. What stays the same

- Phones, upright and sideways: untouched (they never pass the gate).
- Computers: unchanged (the shell as today, a mouse).
- An iPad held upright: the upright phone layout, as today.
- Also: one dashboard; the same pages; no new art and no memory change.

## 3. Risks

1. **Touch controls in a new place on a device judges or players use.**
   - The biggest risk is a stick or button that sits under the pages column, or a drag that starts in the column and walks the bro.
   - Each control needs a real-touch test: CDP touch, which hit-tests (TRAPS §67).
2. **"Mouse" and "layout" confused in one of the ~10 JavaScript readers.**
   - Example: a tablet that says "click", or that loses the tap-to-swing rule because it reads as a desktop.
   - Each reader is decided by hand and covered by the test below.
3. **Rotation mid-game.**
   - The shell switches live; the PixiJS canvas, the sheet geometry and the touch zones must all follow.
   - The upright/sideways switch already does this for phones, so the path exists, but the shell has only ever been tested at load on a computer.
4. **iPad Safari only.**
   - This box has Chromium, not Safari: `100dvh`, the safe areas and the touch timing must be checked on the owner's iPad before it is on for everyone.
   - So: ship behind a switch first.
5. **Overlays positioned against the window.**
   - TRAPS §214: sizes come from the play column, not the window.
   - Every window and dialogue that today assumes "touch means the sideways or upright phone" needs a look in the UI review at the tablet sizes.

## 4. How it would ship (the owner's rule: on by default, with an off-ramp)

1. **PR 1, behind `?tabwide=1`.** The class split, the gate, touch controls placed in the world column, no keys strip on touch.
   - Also the 1366x1024 half-styled fix: the sideways rule's height limit no longer leaves a 12.9" iPad in between, because it gets the shell.
   - The owner tries it on their iPad.
2. **PR 2, on by default**, with `?tabwide=0` as the one-device off-ramp and a live kill switch in the Test panel's client-off list (like the memory savers' row).
3. **Tests in the same PRs:**
   - A new phone scenario at 1180x820, 1366x1024 and 1133x744 (iPad mini), with `touch: true`:
     - the shell is on and has no keys strip;
     - each control is tapped and does its job (walk, attack, jump, roll, ride);
     - a drag in the pages column does not walk;
     - a bag cell tap opens the item;
     - turning the tablet upright mid-game gets the upright layout back, and turning it sideways again gets the shell.
   - Plus 844x390 (a sideways phone: unchanged) and a 1280x800 computer (unchanged).
   - The tablet sizes added to the UI review's `states.mjs`, and `UI-DESIGN-NOTES.md` updated.
   - `mp-membudget` (not expected to move) and `playable`.

## 5. Time, honestly

| | |
|---|---|
| The class split and gate, auditing the ~10 JavaScript readers | half a day |
| Touch controls placed in the world column, scaled; no keys strip on touch | half a day to a day |
| The new phone test and UI review states at four sizes | half a day |
| Fixes the tests turn up (overlays, rotation) | half a day to a day |
| The owner's check on a real iPad, then the default flip | a short second PR |

**About 2–3 days of work** for one session, plus the owner's iPad check. It is not a one-hour change: the layout and the controls were each built assuming "touch means a phone".

There is a cheaper middle step (about half a day): leave tablets on the sideways layout, but on a tablet that passes the same gate:
- widen its dashboard column to the computer's 390 px;
- give its page buttons their labels;
- scale the controls up.

It fixes most of what looks wrong on the iPad (the narrow column, the tiny icons) without moving any control. But it is not what the owner asked for, and it does not give the full-height pages column.

## 6. Recommendation

**Do it after the showing, not before.**
- The judges play on computers, so it changes nothing they see.
- It moves touch controls on real devices, the riskiest kind of change to make the night before.

Build it as described, behind `?tabwide=1` first, so the owner can try it on their iPad. Then turn it on by default with `?tabwide=0` and a live off switch, the owner's usual pattern.

Before then, one small fix is worth doing on its own: the 12.9" iPad's half-styled layout (the sideways CSS stops at 1000 px tall while the JavaScript still chooses the sideways layout). Raising that rule's height limit, or gating the JavaScript the same way, fixes a visibly broken screen. It is about an hour with a test, but it is wasted work if the tablet shell is coming soon anyway: let the owner choose.
