# The free points reset (v2.3.3541)

The owner, 2026-10-21: *"I value SIMPLICITY and INTELLIGIBILITY"*. This is
item 2 of the after-review list agreed with the outside evaluation: *"Today,
points you spend are spent for good. After the change one button gives them
back, so you can try a different build ... It lets players learn the points
system by trying it."*

It builds on one level (v2.3.3538, docs/specs/one-level.md): the deal it uses
is that change's own.

## What it did

- Every point you placed in the Points tab was placed for good.
- The only way to try another build was a full restart of the character.

## What it does now

**One button, at the foot of the Points tab's grid: "↺ Reset points (free)".**

- **Two taps.**
  - The first arms it, and the button says what it does: "Tap again: every
    point comes back".
  - A second tap within 4 seconds resets. Left alone, the button goes back to
    how it was and nothing is sent.
  - There is no second window: the button's own words are the confirm.
- **Shown only when it can do something:** against a server that resets
  (`caps.pointsreset`), and with at least one point placed.
- **The reset** (`server/src/pointsreset.js`, `points_reset`) gives every
  placed point back:
  - every shared stat and every weapon's offense stats go to 0;
  - each weapon's lane pool and the shared pool are dealt again from your
    levels, by the one deal there is (`prog3.js` `prog3RespecPoints`, the
    one-level re-deal's own): 3 a weapon level past 1 for its lane, and 3 a
    character level past 1 for the shared pool;
  - the max HP that Max HP points bought goes with them;
  - levels, XP, gear, gold and everything else are kept.
- **Free.** No gold, no item.
- **Refused**, with an answer over your bro and nothing changed or written:
  - **in a fight**, meaning a blow dealt or taken in the last 10 s, or a fight
    with a player (`cooking.js` `_anyFightAt`, the one-bite rule's window): a
    build is never swapped mid-duel;
  - **within a minute of your last reset** (`POINTS_RESET.GAP_MS`): each reset
    is one saved row (the cost guard), and a minute is nothing when trying a
    build;
  - **nothing placed** to give back.
  - A dead player is answered nothing.
- **Worn gear stays worn.** A requirement is asked when you put a piece on
  (`_prog3GearOk`: "gates apply at equip time only"), so a reset never strips
  armour that asked for Defense points. Putting it back on later asks again.
- **The answer** is `points_reset_result {ok, err?, wait?, pool, poolBy,
  shared}`, server-only (`PRIVILEGED_EVENTS`).
  - The new points ride the `player_state` echo, so the grid redraws itself.
  - Over your bro: "Points reset!" and "N points to spend", with the points'
    own chime; or "Can't reset in a fight", "You just reset your points",
    "No points to give back".

## The test lever

The admin test lever `/dev/combat {skill | 'all', level}` takes `deal: true`.
That also deals the points the new levels give, so the Points tab has
something to spend. Without it a level set by the lever left the pools where
they were.

## Switch and deploy order

- **Kill switch:** `pointsreset: false` in the live flags.
  - Every reset is refused (`off`).
  - `caps.pointsreset` is false at the next join, so the button is not shown.
- **Deploy order:** either half can go live first.
  - A new page against an older server sees no `caps.pointsreset`, so it
    shows no button.
  - An older page never sends `points_reset`.
- **It merges after #1055 (one level),** whose deal it uses.

## Tests

- **`points-reset` suite** (31 checks):
  - a reset after real spends: nothing placed, the pools what the levels give,
    the max HP gone, levels and XP untouched, saved (one row), echoed and
    answered;
  - the points spend again after it;
  - every refusal (a fight either way, within the minute, nothing placed, a
    dead player), each changing and writing nothing;
  - worn armour stays on;
  - the switch, the caps, and `onelevel: false`'s old shared rule;
  - the wire: routed, never relayed, privileged, the page's allowlist;
  - the page's half (`src/game/pointsReset.js`): when the button shows, the
    count of placed points, one ask at a time, the answer in words.

  Broken eight ways on purpose (no fight check, no gap, no recompute, no
  save, no "nothing placed" check, no clock, no switch, the old rule
  ignored), the suite fails every time.
- **`mp-pointsreset`** (new, an upright phone, real server, 7 checks):
  - the button at the foot of the grid, 44 px tall;
  - one tap arms it and it goes back on its own;
  - two taps give every point back, with "Points reset!";
  - a second reset within the minute is refused in words.
