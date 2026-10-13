# Far players less often, positions in whole pixels (v2.3.3196)

> Owner, 2026-10-13, on the load test's next steps (`docs/specs/load-test.md`):
> *"Send far away players less often and using shorter position numbers make
> sense go ahead with it"*.

## What changed (the worker only)

`server/src/tick.js`, `FAR_PLAYERS`:

- **Far players less often.** In the Wheel, a v2 session (every phone today)
  is sent the players moving within **2,400 px** of it (`NEAR_R`) on every
  tick, as before. The ones further off are sent at most every **250 ms**
  (`EVERY_MS`), each time at where they are now, so nothing is lost but the
  steps in between. Everyone who moved since the last such send waits in
  `_farPending`; when 250 ms have passed, every v2 session in the Wheel gets
  all of them at once (`farList`, one string for everyone). The 1 Hz presence
  roster is untouched.
- **Positions in whole pixels.** Every player entry's `x`, `y`, `vx` and `vy`
  go out as whole numbers (`rp`), in every zone.

What does not change: v1 sessions, today's town, the farm and the dungeon
arenas get every mover on every tick; a player's own moves reach them every
tick (they are 0 px from themselves); events and monsters are as they were.

## Why nobody sees the difference

- **2,400 px is past the screen and the minimap.** The minimap is 3,200 game
  px across (`wheelMinimap.js` `WHEEL_WINDOW`), so everyone on it is within
  about 2,263 px of you, and a phone's screen shows less than that
  (`worldViewport.js`). 2,400 is also the distance the worker already uses for
  monsters (`WHEEL.INTEREST_R`).
- **Coming closer is seen in time.** A player who walks into the 2,400 px
  circle is sent on that very tick, still a long way off your screen.
- **The game already copes with a player it hears from less often.** It
  carries another player along on their last speed between updates
  (`visualSystems.js`), and drops one only after 10 s of silence (`wsClient.js`,
  the ghost sweep). A far player who stops is sent where they stopped within
  250 ms, even if nothing else happens that tick.
- **Whole pixels are half a game pixel off at most**, under one CSS pixel on a
  phone, and the drawn figure is smoothed anyway.

The only places a far player is drawn are the **world map**, when opened and
zoomed in on them, where their dot now moves four times a second instead of
about thirty, and snow footprints a far player leaves while you are too far
to see them, which come out further apart.

## Shorter numbers: the honest size of it

The load test's bots (#883) sent positions to a hundredth of a pixel and their
speed as a 16-digit fraction, and the estimate that shorter numbers would cut
"about a quarter" of the bytes came from those. Real phones already send
positions to a tenth of a pixel and speeds as whole numbers (BroTown.jsx's
move broadcast), so on real phones whole pixels save **about 2.4%** of each
player entry (153 -> 149 bytes for a typical one). The change is kept because
it is free, invisible, and bounds what any other client can put on everyone's
download. The bots now send what a phone sends.

## What it buys

RESULTS

## How we know it works

- `server/test/far-players.test.mjs` (27 checks, in `npm test`): whole
  numbers, and `roundpos: false`; a near mover on every tick and a far one
  only after 250 ms, at its latest position, and not again while it stands;
  about four far updates a second over two seconds of walking; a far player
  who stopped still sent within 250 ms on otherwise quiet ticks; 2,400 px
  exactly is near, one more is far; a player coming into reach is sent that
  tick; v1 sessions and today's town as before; `farplayers: false`; a player
  who left the Wheel before the far send is not sent as still in it, and the
  presence roster still carries everyone; and both message builders byte for
  byte, with ids that are array indexes (they change JSON's key order).
- `server/test/tick-share.test.mjs` (v2.3.3195) still compares every message
  both ways over 300 ticks of a busy mixed room: the far rule is in both
  builders.
- `tools/qa/mp/mp-farpeer.mjs`: two phones in the Wheel. PHONE

## Turning it off

Live flags, no deploy: `farplayers: false` sends every mover every tick again;
`roundpos: false` sends positions as the phones sent them.

## Not done (each changes what the phones must understand)

- **Leave out what did not change.** A player's entry repeats their zone,
  gear and activity (`z`, `eqc`, `eql`, `eqs`, `ex`) on every move: about 60
  of its ~150 bytes. Sending them only when they change would cut each
  entry by about 40%, but today's phones read a missing `z` as "no zone" and
  would lose the player, so the phone must say it understands first (a new
  join flag) -- a change to both sides.
- **The message diet** (`docs/WORLD-ARCHITECTURE.md` §11): fewer moves from
  each phone, with the worker filling in between.
