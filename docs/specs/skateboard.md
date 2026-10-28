# The skateboard (v2.3.3776)

The owner, 2026-10-28: "I just added a skateboard to the root. I want to be
able to ride around on this just in the safe Brotown area. You can tap it to
ride (maybe a button somewhere on screen). When outside of town it makes you
get off." And on the owner's list (docs/OWNER-LIST-2026-10-26.md, item 26):
"faster than sprinting, off when you fight, swim or get hit".

## What a player sees

- In BroTown and its safe commons, a round button with the board on it. A tap
  gets you on, a tap again gets you off. On a computer the button shows too,
  wearing **Z**, and Z does the same.
- On the board you roll at **1.6x** your walk (a sprint is 1.33x). There is
  no sprint while riding: the board is the faster.
- The board is drawn under your boots, in the owner's three views: from above
  going north or south, from the side going east or west, angled on the
  diagonals (mirrored for south-west and north-east). The body keeps its
  standing pose. A jump lifts the board with your feet (an ollie), and it
  stays level in a lean or a flip.
- Everyone near you sees you on your board.
- You get off, with one short line, when you:
  - roll out of BroTown's safe ground ("Off the board: boards stay in BroTown.")
    or leave the world for a dungeon, a building's room or the farm;
  - are hit ("Knocked off the board!"), fight (a swing, an ability, a burst, a
    roll, the shield up, a harvest, a pose: "Off the board to fight."), or
    start a duel or an arena match;
  - go into the water, or die.
- The button is not shown while a fight is near (the shield up, the Block
  button showing, a monster targeted), in the water, dead, or anywhere but the
  safe ground.
- No sound yet (none was uploaded).

## How it works

- **The worker decides** (`server/src/ride.js`). The phone sends `ride` {on:
  1 | 0}; the worker answers `ride_state` {on, why} (privileged), and sends one
  when it puts you off. It lets you on only in the world, on its own safe
  ground (`wheelzone.js` `_wheelSafeAt`, where IT has you), alive, and not in a
  duel, a race, a harvest, a pose, a roll or a block; a toggle within 400 ms of
  the last is answered `soon`.
- **The speed**: while `ps._ride`, the walk's bound is judged at `RIDE.MULT`
  (1.6) in the move budget, the follow and the glide's cap (`movement.js`,
  `movepath.js`); with a sprint the larger of the two counts, never both.
  The phone's `RIDE_MULT` (`src/game/ride.js`) mirrors it
  (`mirror-audit.test`).
- **What ends it on the worker**: an accepted move off the safe ground, out of
  the world or a zone change; death (`_handlePlayerDeath`); a hit that lands
  (`combat.js` `_applyDamage`, after the dodge); a fighting, gathering or
  posing message (`RIDE_ENDS_ON`, before its handler in `_onMessage`); the
  shield, a roll, a harvest or a pose on a move; a duel or arena match made
  (`duel.js` `_makeDuel`); the kill switch.
- **The phone steps off itself**, a beat ahead of the worker
  (`game/ride.js` `rideCheck`, every frame in BroTown.jsx): past the safe
  ground's edge (`game/rideGround.js`: the world's middle and `zones.js`
  `wheel.safeR`, never a coordinate in code), out of the world, in the water,
  dead or fighting. The worker's word then agrees.
- **The others**: the tick's player carries `brd: 1` while the worker has you
  riding (`tick.js` `playerWire`, the one builder both tick paths use),
  absent otherwise; `wsClient.js` reads it into `other._brd`.
- **Nothing is stored**: `ps._ride` is an underscore field, no storage key; a
  reconnect or a worker restart leaves you on foot, and the phone forgets the
  board on every join.
- **Deploy order**: `caps.ride`. The button shows only against a worker that
  says it; an old worker refuses the unknown message (deny by default). Kill
  switch: `ride: false` in the live flags un-advertises the cap AND ends every
  ride (no board on the tick at once; the rider is told on their next move).

## Where the button is

Shield Bash's place (`ctlColumn`, `CTL_SLOT.bash`): upright beside Sprint, up
and left of the attack disc; sideways and on a computer beside the disc, level
with its middle. It can share that place because it never shows while a fight
is near: Bash shows only with the shield up, TRAP only with a monster
targeted, Block only with a fight near. `mp-skateboard` checks it lies on no
other control, upright and sideways.

## The art

The owner's picture is kept in `assets/prop-source/skateboard/skateboard-views.png`.
`node tools/art/cut-skateboard.mjs` cuts it again:
- the black ground is taken away by a flood from the border (the deck is
  near-black too, so a global black key would eat it);
- the three views are found by the empty columns between them;
- each is shrunk to 2 picture px a game px, the board 88 game px long (about four fifths of a bro: 70 read small under him);
- each gets its own 32 colours (`public/tools/style/process.js` ownPalette
  and mapPixels: hard alpha, despeckled) and is written as a see-through
  palette PNG, `public/sprites/ride/skateboard-{top,angled,side}.png`;
- `src/data/skateboardArt.js` is GENERATED with each view's size and deck line.

They load behind the loading screen (`rendering/rideFx.js` preloadRideArt in
`preloadWorldAnimations`), about 105 KB on the graphics chip in all
(docs/MEMORY-MAP.md, "the skateboard"). A rider's board is one small Sprite
added to their figure when they get on and destroyed when they get off.

## Tests

- `server/test/ride.test.mjs`:
  - caps, and `ride_state` privileged;
  - getting on and off, and each refusal (off the safe ground, out of the world, dead, the switch off, mid-harvest, too soon);
  - the widened bound, and the walk's again after;
  - every way it ends (the edge, a zone change, death, a hit, a swing, the shield, a duel, the kill switch);
  - `brd` on the real tick and absent otherwise;
  - the phone's rules.
- `liveops.test` §8j (the switch), `mirror-audit.test` (the speed).
- `node tools/qa/mp/run.mjs skateboard`: a phone upright and a computer, against
  a real worker:
  - a real tap gets on;
  - the other player sees the board;
  - off at the edge, and the button gone;
  - Z on and off;
  - the button on no other control, upright and sideways.

  Pictures: `tools/qa/mp/out/skateboard-*.png`; the owner's sheet is
  `docs/specs/skateboard/`.
