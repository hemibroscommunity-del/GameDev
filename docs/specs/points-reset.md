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
    since v2.3.4372 the minute is the character's, not the connection's: a
    rejoin keeps it (see "The minute survives a rejoin" below);
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

## The minute survives a rejoin (v2.3.4372)

Found by the state-machine sweep (2026-11-03, V9c, the M3-14 cost addition).

- **What it did.** The minute was kept only on the player's in-memory state
  (`ps._pointsResetAt`), and every join builds that state again. Rejoining
  forgot the minute, so a script could reset, spend every point again and
  rejoin, over and over.
  - Each reset is one saved row, and each point spent again is one more
    (`_handleProg3Allocate` saves once a point). For a level-L one-weapon
    character that is 1 + 6(L-1) rows a reset: 91 at level 16.
  - The join limits allow up to 20 joins a minute from one address, so the
    loop could write about 20 times that.
- **What it does now.** The room also keeps the time of each character's
  last reset (`_pointsResetAts`, a `Map` keyed by player id), and a join
  never rebuilds it. A reset is refused (`soon`, with the wait) while either
  stamp, the connection's or the room's, is under a minute old.
  - It lives in memory only and is never saved. A worker deploy forgets it
    (handoff rule 11), which costs one early reset at most.
  - It stays small. Each reset drops the stamps more than a minute old from
    the front (the Map is kept in time order), and it never holds more than
    `POINTS_RESET.RESET_MAX` (2,048).
- **What a player notices.** Almost always nothing. A player who resets,
  reconnects within the minute and taps Reset again now gets "You just reset
  your points" over their bro, as they would have without the reconnect.
- **What it does not close.** One reset a minute, with every point spent
  again, still writes 1 + 6(L-1) rows a minute (91 at level 16, about
  131,000 a day for one script running all day). This change takes away the
  reconnect's multiplier. A longer wait, paced spends, or one message per
  spend are the owner's call (the sweep's "points: one message per spend").
- **Test mode keeps the minute.** It is a cost guard (rows), not an honesty
  check, and test mode leaves "every save and payment rule" on
  (`testmode.js`). The Test panel's `/dev/combat deal: true` deals points
  without a reset.
- **Kill switch:** `pointsresetroom: false` in the live flags. The room's Map
  is neither read nor written, and the minute is the connection's alone, as
  before.
- **The lesson** (for any "once every N" limit): a stamp on `ps` lasts one
  connection, because every join rebuilds `ps`. A limit meant for the
  character keeps its stamp where a join does not reach: a room `Map` keyed
  by player id (as `lastplace.js` keeps `_lastPlaces`), or the record if it
  must survive a deploy. A test that fakes "a minute later" by editing
  `ps._pointsResetAt` must move the room's stamp too (the suite's
  `roomMinute`).

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

- **`points-reset` suite** (41 checks; v2.3.4372 added §8, the eleven of the
  rejoin: refused inside the minute and nothing written, allowed after it,
  the Map bounded, a level-16 minute counted at 91 rows, the switch):
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
