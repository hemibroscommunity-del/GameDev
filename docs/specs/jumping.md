# Jumping (v2.3.3017)

> *"Start working on real jumping. Might be able to just use the jog
> directions instead of a custom jump animation."* — the owner, 2026-10-03.
> And of its button: *"put it beneath the right joystick"*.

## What the player sees

- **A JUMP button under the attack disc.** It's centred beneath the disc, at
  Block's height, so the thumb slides straight down off ATTACK. Block is in the
  same band but left of the disc, about 28 px clear. Pressing it jumps at once:
  it fires on the press, not the release.
- **X on a keyboard.** Space is already the dodge roll and Shift the sprint, so
  the jump is X, under the left hand. The key hints list it.
- **The jump.** For 0.56 s the body rises up to 68 world px (about a bro's own
  height) and comes back down on a smooth arc. The first cut went half as high;
  the owner, having tried it: *"I'd also like it if the jump were about 2x as
  high"*. The time in the air didn't change, so what it clears didn't either.
  It holds one leaping frame of the jog for the way you face (one knee up, the
  other leg trailing): the owner's "jog directions", not a new animation. The
  weapon, cape and name plate rise with it.
- **The shadow stays on the ground.** In daylight (always, in the Wheel) the
  sun shadow is cast from where you stand, so it slides away from the body as
  you rise. The gap is the height.
- **Sound and dust.** One step as you push off, none in the air, one where you
  land, on the ground you land on, and a small ring of dust there. Landing in
  the water gives the water's splash instead, and you're swimming. No snow
  prints or dust in the air.
- **Real jumping: you clear low things.** While you're high enough, these don't
  stop your feet:
  - fences (both directions), stone walls and hitching rails;
  - barrels, crates, benches, troughs and hay bales;
  - stones, snow rocks, basalt, sea rocks, coal and scrap;
  - bushes, stumps and driftwood.

  You only pass over one if the way you're going carries you out of it before
  you come down, so you never land inside one.
- **Everything else stops you in the air** as it does on the ground: trees,
  boulders, carts, minecarts, rowboats, haystacks, buildings, the resources,
  monsters, people and the open sea.
- **In the air you keep going.** Let go of the stick and you carry on the way
  you took off. Hold it and you steer. You never go faster than your walk (or
  your sprint).
- **What waits for the landing:** a second jump, a roll, a swing or shot, a
  special, an ability, the shield and starting a harvest. They're refused
  quietly, because you're down again before a note could be read. A held attack
  just goes on after you land. Jumping lowers a raised shield, as a roll does.
- **When you can't jump:** while swimming (the button isn't drawn; climb out
  first), dead, rolling, dashing, held by a slime's goo, stunned, harvesting, on
  the sled, or for 0.12 s after landing.
- **Other players see it.** Your jump is relayed, and on their screens your
  body rises with the same held frame.

## How it works

The idea: **your position never leaves the ground.** Only the picture does.

- **The rules** (`src/game/jump.js`, pure, no imports): `JUMP_MS` 560, `JUMP_PEAK`
  68, the arc `4t(1-t)`.
  - Low things are cleared while the lift is at least `JUMP_CLEAR` (0.45) of the
    peak, from about 72 ms to 488 ms.
  - `JUMP_OVER` is the catalog ids that are cleared. `JUMP_NOT` names the low
    ones left off (minecart, rowboat).
  - `jumpRefusal` says why a jump may not start. `overLow` is the crossing rule.
    `JUMP_FRAME` is the held frame per sheet (east 1, north 8, northeast 4,
    south 7, southwest 6; mirrored facings share them).
- **Taking off and landing** (`src/game/jumpActions.js`):
  - `triggerJump`, from the button and the X key: checks the gates, drops the
    shield, takes off with the stick as the momentum, plays the push-off step
    and sends the relay.
  - `tickJump`, once a frame, lands you (or cuts the jump short on a death or a
    zone change).
  - `landJump` plays the landing step.
- **The walk** (`BroTown.jsx`):
  - In the air the water isn't checked at all, so you fly over a stream.
  - With no stick you take the take-off direction.
  - `propFeetBlocked` lets the feet into a `JUMP_OVER` footprint only when
    `overLow` says the crossing finishes in time.
  - The speed it checks against is what this frame really moves (`S._frameMs`):
    below 20 fps the game's clock caps a step, and a crossing judged on the wall
    clock would come down inside the fence.
  - The move broadcast counts a jump as moving.
- **The picture** (`src/rendering/jumpFx.js`, after the depth pass and the
  swimmers, before the lights): each jumping figure is lifted by `jumpHeight`.
  `figureFeetY` adds the lift back while the y is still the one jumpFx left, so
  the depth sort, the shadows and the stand point all read the ground.
  `entityRenderer` holds the leaping frame (local and peers) and plays no
  footstep in the air.
- **Dust and prints**: `worldFx` carries the walker along in the air and puffs a
  ring on landing (none on water). `visualSystems` restarts the snow trail where
  you land.
- **Refusals**: `combatHelpers.airRefused` sits beside `swimRefused` at the
  swing, the special, the burst, the shield (both doors), the roll and the
  abilities. `monsterCombat`'s held attack and `startExtraction` check
  `jumpAirborne`.
- **Other players**: a `player_jump` relay `{ id, ts, dur, peak }`.
  - The router's default branch fans it out like `player_dodge`, so there's no
    worker change.
  - Game events set `other._jump` (`peerJump` clamps the numbers).
  - `swimFx` doesn't sink a jumper over water.
- **The server** sees nothing new. The ground track is a walk, inside the move
  bound, and the worker relays the picture.

## Deploy order

There's nothing to gate. An old worker relays `player_jump` like any
non-privileged event, and an old client ignores it: it sees you glide a step.

## Tests

- `tools/world/test-world-core.mjs` "jumping", 17 checks:
  - the arc and the clearing window;
  - every refusal, take-off and touch-down;
  - the crossing rule: a fence is cleared straight over, but not running along
    it, not late in the jump, not on the ground and not standing still over it;
  - trees, boulders and buildings are never cleared;
  - `JUMP_OVER`/`JUMP_NOT` against the real catalog: every id exists, every low
    thing with a footprint is named, nothing taller than 70 px but the
    north–south fence, nothing big or crowned;
  - the held frames fit the sheets, and peers' numbers are clamped.
- `mp-jump` (phone, real worker, `?jumpms=1800` so the slow test machine gets
  enough frames of it):
  - the button's place, upright and sideways;
  - the lift, the held frame, and the feet and shadow pivot on the ground;
  - one step up, one down, none in the air, and dust on landing;
  - a second press, a roll and an attack wait in the air;
  - another player sees it;
  - walking into a fence stops you, and jumping it carries you over and down
    clear of it;
  - a tree's trunk stops a jump;
  - no button and no jump in the water;
  - X jumps;
  - no page errors.
  - Pictures: `jump-{layout,air,fence-stopped,fence-over,fence-over-landed}.png`.

## Not in this round

- **Jumping over attacks.** A jump doesn't dodge anything: the worker decides
  hits, and it doesn't know you're in the air. That's the planned next step:
  the worker stamps an airborne window on a validated jump and lets ground
  attacks miss inside it.
- Jumping onto things (ledges, the elevation plan's terraces) and over gaps of
  water.
- Today's town: its props are stamped into its walk grid, so a jump there
  clears nothing. The Wheel's objects are separate, and they're where clearing
  works.
