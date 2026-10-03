# Sprint (v2.3.3006)

> Owner, 2026-10-03: *"Also adding a sprint button by the left joystick that
> drains down stamina but makes you run about 33% faster until it drains out.
> Maybe just to the right of the left joystick"*.

## What the player sees

- **On a phone:** a round button with the winged boot (the game's own "move
  speed" picture), just right of the movement stick and level with its middle.
  - Tap it and it lights up. While you move, you run **1.33 times** your walk.
  - **The button's rim is your stamina**: lit round the edge for what is
    left, dark for what is spent, so you can watch it run down.
  - Tap it again to stop.
  - It works with a thumb already on the stick: tap it with the other hand
    and keep running.
- **On a keyboard:** hold **Shift**. You sprint while it is held, and the
  keyboard hints list it as "Shift Sprint".
- **It costs stamina:** **11 a second**, but only while you are actually
  moving. Standing with it switched on costs nothing.
  - A full bar of 100 lasts about 9 seconds.
  - Stamina does not refill while you sprint, as with a raised shield.
  - Once you stop, it refills at the usual rate, about 10 seconds for a full
    bar.
- **It ends on its own when:**
  - your stamina runs out (the owner's "until it drains out");
  - you stand still for 0.7 s. Before your first step you get 2 s, because the
    thumb that tapped the button has to get back to the stick;
  - you raise the shield, attack, go into the water, die or change zone.
- **Starting a sprint needs 5 stamina.** One already running carries on to
  zero.
  - Below 5 the button fades.
  - A tap then shakes the button and shows **"Not enough energy!"** over your
    head. These are the abilities' own words.
- **The legs keep up:** the run animation plays 1.33 times quicker.
- **The button is hidden** while you swim (like the special and shield
  buttons), while you are dead, and against a server that cannot settle a
  sprint.

## Where the button is

`sprintAnchor` in `src/ui/panels/ShieldButton.jsx`, the file that holds every
touch control's place:

| | upright | sideways |
|---|---|---|
| size | 48 px | 54 px |
| left edge | 105 px (the stick's right edge + 10) | 124 px |
| right edge | 153 px | 178 px |
| height | level with the stick's centre | the same |

- That patch beside the stick was empty. Element Burst is *above* the stick.
  The weapon button and the notification bell are in the band *below* it.
- The button stays inside the movement half of the screen, even on a 320 px
  phone, so it never reaches toward the attack controls.
- It sits on the movement half's touch layer, so **it swallows its own
  touches**. It switches on a real tap: lifted within 14 px and 600 ms of
  where it was pressed. A thumb landing on it while starting a walk does not
  switch the sprint, and a tap on it never rolls or walks. The weapon button
  works the same way.
- It is drawn by `TouchControls` (the stick's own component), not in
  BroTown's list of buttons.

## How it works

**The stamina is the server's.**

- The client marks each move it sends while sprinting with **`sp: 1`**
  (`networking/wsClient.js`). There is no new message type.
- For a marked move, the server (`server/src/sprint.js`):
  - checks the player may sprint: not switched off, alive, not blocking, the
    guard not broken, and 5+ stamina, or already sprinting with any left;
  - widens the anti-teleport bound by 1.33 for that move
    (`server/src/movement.js`);
  - bills 11 a second for the time since the **previous move**, when that
    move was a paid sprint step too, so the player ran through the gap. At
    most 1 s is billed for one step, and only if the move actually moved the
    player. Whole points come off; the fraction carries over;
  - treats any other move as the end of a run: the client's "stopped" move
    when you stop, its keep-alive while you stand, a walk. So the first step
    after it bills nothing, and standing still is never billed.

    An earlier version called any gap over 0.4 s a pause and billed nothing.
    On a phone drawing a few frames a second, whose moves arrive ~400 ms
    apart, that sprinted for free. `mp-sprint`'s test machine is such a
    machine and caught it;
  - holds off the stamina refill for 1 s after the last sprint step. Both
    refills are held: the combat one and the hub's top-off.
- At zero the next marked move is an ordinary one.
  - For 1.5 s after the last paid step the bound stays wide. The client
    running a moment past the server's zero is never snapped back.
  - After that, a client that kept running fast would be judged at walking
    speed.
- **A forged `sp: 1`** buys only the sprint it pays for: the stamina is spent
  on the server and the 1.33 is a constant. **An old client** never sends it,
  and walks.

**The client** (`src/game/sprint.js`, no imports so node can test it):

- decides when a sprint starts and ends, once a frame before the walk
  (`BroTown.jsx`);
- multiplies the walk by 1.33 while you are moving;
- **predicts** the drain between the server's updates, so the bar moves
  smoothly and the sprint stops on time. The server's own number overwrites
  the prediction each time it arrives;
- holds off its own local refill (town) the same way the server does.

**Release order is safe either way round** (handoff rule 19):

- The server advertises `caps.sprint` (`join.js`). The client shows the button
  and marks moves only when it sees that.
- An old server would judge the faster moves at walking speed and snap every
  sprint back, which is why the client waits for the cap.

**Kill switch:** `sprint: false` in liveflags.

- The server stops advertising the cap and stops every sprint step.
- A tab that joined earlier gets ordinary bounds, and its sprint ends at the
  next zero.

**Nothing is saved.** The sprint lives in underscore fields on the server's
player state (handoff rule 1).

## The numbers

Each pair is checked by `server/test/mirror-audit.test.mjs`:

| | server `SPRINT` | client |
|---|---|---|
| speed | `MULT` 1.33 | `SPRINT_MULT` |
| drain | `DRAIN_PER_S` 11 | `SPRINT_DRAIN_PER_S` |
| least to start | `MIN_START` 5 | `SPRINT_MIN_START` |
| refill held | `REGEN_PAUSE_MS` 1000 | `REGEN_PAUSE_MS` |

These are the server's alone:

- `GRACE_MS` 1500: the wide bound after the last paid step;
- `STEP_MAX_MS` 1000: the most one step is billed for.

These are the client's alone:

- `IDLE_STOP_MS` 700: standing still this long ends a tapped sprint;
- `START_WAIT_MS` 2000: a tapped sprint waits this long for its first step.

## Small fixes that came with it

- **Holding Shift could leave you walking.** A letter key changes case while
  Shift is held, so pressing W, then Shift, then letting go of W sent the
  release as 'W' and left 'w' held. You walked on with no key down. A letter's
  release now clears both cases (`game/desktopControls.js`).
- **Keys held when the window loses focus** (alt-tab) are let go. Their
  release never arrives.
- **The run animation no longer jumps a frame** when its speed changes:
  starting or ending a sprint, raising the shield, or turning to a direction
  with a longer loop. The loop carries on from where it was
  (`entityRenderer._updatePlayer`).
- **The QA scenarios' keep-alive key** is now Control rather than Shift.
- **QA tools:**
  - the admin player view shows stamina;
  - `dev/vitals` takes a `stamina` level to test against.

## Tests

- **`server/test/sprint.test.mjs`** (47 checks):
  - the cap and its kill switch;
  - the bound: a sprinting step is refused when walking, and accepted as a
    sprint step, by 1.33 and no more;
  - the bill: 11 a second, at a phone's pace and at a slow phone's (moves
    450 ms apart); nothing for standing still, for the run after a stop, or
    for an unmarked walk; at most 1 s for one step;
  - empty: stops at zero, the 1.5 s grace, then the walking bound;
  - who may sprint: 5 to start, one under way runs to zero, not while
    blocking, broken-guarded or dying;
  - the refill held, the hub's too, and back after 1 s;
  - the kill switch;
  - only `sp === 1` counts, and nothing new is sent;
  - **the client's rules**: the refusals, the speed, the predicted drain, the
    2 s and 0.7 s waits, everything that ends a sprint, running dry, and Shift
    (held, let go, tired, never ending a tapped sprint).
- **`server/test/mirror-audit.test.mjs`**: the four pairs above.
- **`tools/qa/mp/mp-sprint.mjs`** (33 checks), on a phone-sized touch page
  against a real worker:
  - the button's place, upright and sideways, on no other control, the word
    SPRINT inside its rim;
  - a tap is only a tap;
  - 1.33x over the same ground, with the legs keeping up;
  - **the phone's way**: a thumb holding the stick (the disc drawn), a second
    finger's tap turns it on, 1.33x the stick's walk, no roll;
  - the server takes every sprinting move it gets as a paid step, billed 11 a
    second for the time between them, the bar shows the server's number, and
    every move is accepted.
    - The test machine draws only ~8 frames a second and its client drops
      every other move. So the browser test checks the billing rule against
      the moves the server actually got, and the rate itself is the sprint
      suite's;
  - standing still ends it;
  - running dry ends it, fades the button, and refuses a tap;
  - Shift;
  - an attack ends it;
  - no page errors.

  Pictures are in `tools/qa/mp/out/sprint-*.png`.

## Not done (could come next)

- **Other players' legs** play at the walking pace when they sprint. They
  cover the ground faster, so they look a little smooth-footed. Telling peers
  would need a field on the move relay.
- **No sound or dust** at the feet. Any sound would come from recordings
  already in the game.
- **Stamina use is shared.** The sprint and the abilities spend the same bar,
  so a long sprint before a fight leaves less for Shield Bash and Whirlwind.
  That is by design, but it is the first thing to tune if it feels harsh.
