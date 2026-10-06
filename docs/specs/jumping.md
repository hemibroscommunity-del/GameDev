# Jumping (v2.3.3017)

> *"Start working on real jumping. Might be able to just use the jog
> directions instead of a custom jump animation."* — the owner, 2026-10-03.
> And of its button: *"put it beneath the right joystick"*.

## What the player sees

- **A JUMP button under the attack disc.** It's centred beneath the disc, at
  Block's height, so the thumb slides straight down off ATTACK. Block is in the
  same band but left of the disc, about 28 px clear. Pressing it jumps at once:
  it fires on the press, not the release. Since v2.3.3018 it wears the owner's
  mockup's look like every touch control: a gold ring round the blue up arrow,
  no word, lit on a warm face while you are in the air
  (`docs/specs/control-redesign.md` §14).
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
  first), dead, rolling, dashing, held by a slime's goo, dazed by a rock
  monster, stunned, harvesting, on the sled, or for 0.12 s after landing.
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

## v2.3.3087: a tap on the right stick jumps, and the button is put away

The owner: "Do you think the right virtual joystick tap can be the jump
button? I think this would work well instead of the smaller dedicated jump
button", then "Try moving jump as tap on right joystick but prioritize other
contextual uses for the tap instead of jump first if any apply".

- A tap on the right stick (its zone, `[data-joyzone="R"]`) still does
  everything it did first. In order: a flick is the special; a resource under
  the thumb starts its harvest; a character talks; your own bro opens chat;
  then the tap is forwarded to the world, where a monster locks on and
  another player opens his card.
- Only a tap that reaches the world's last line, "tap on empty space", can
  jump (BroTown's canvas onClick counts it, `S._tapEmptySeq`).
- And not then if the right side had a job when the tap began or ended
  (`rightTapBusy` in `src/game/tapJump.js`): a harvest under way, the disc
  pressable (a monster in the perimeter, a resource in reach), or a lock,
  which an empty tap lets go of instead.
- The jump is decided on the release (a tap, a drag and a flick are only told
  apart there), so it costs the tap's own length, under 200 ms.
- The old button is drawn only with `?jumpbtn` in the address
  (`jumpButtonWanted`); `__btJumpBtn()` says `button` and counts `tapJumps`.
  X still jumps on a keyboard.
- mp-jump, mp-btnlayout, mp-btnskin and mp-firefight run with `?jumpbtn`.
  Tests: test-world-core "the tap that jumps", `mp-tapjump` (an empty tap
  jumps; a lock, a busy disc, a drag and a tap on yourself don't).
- mp-jump's "jumping the fence" check fails on main too on this test box: the
  page draws so few frames that the bro barely moves in the air.

### Then: beside a prop a tap jumps, and the stick wears the owner's JUMP button

The owner, on #821: "it needs priority near props instead of attack. If
players want to attack props they can still hold the right joystick towards
it but a tap should jump", and with a picture of a JUMP button, "On the right
joystick".

- **A thumb's tap was swinging.** The first swing of a press waited 200 ms
  (`ATK_PRESS_GRACE_MS`), and so did the tap window. A relaxed tap runs longer
  than that, and beside a barrel it chopped the barrel.
  - With no job on the right side (`rightTapBusy`), a tap may now last
    `TAP_JUMP_MAX_MS` 320 ms.
  - The first swing waits as long (`S._atkHoldUntil`, read by
    monsterCombat's auto-attack loop).
  - A drag ends the wait at once: it aims and attacks.
  - A hold past the window attacks, toward the prop as before.
  - `?tapms=` stretches the window for a slow test page.
- **A swing never landed on a prop north of you.** propSwingHit asked from
  the player's position, the body's centre, while a footprint is on the ground
  52px lower. It now asks from the boots (`playerGroundDy`), as movement,
  depth, prints and the doors already did. mp-propfx's sword stand moved 52px
  closer to keep its 30px gap at the boots.
- **The JUMP arrow.** The arrow and the word JUMP are cut off the owner's
  picture's red face and gold ring (`public/ui/controls/jump-glyph.webp`,
  192px). They show as the stick's picture (`RDISC_ICONS` 'jump',
  `data-ricon="jump"`) at 0.7, over the disc as it is, whenever a tap would
  jump.
  - The first cut used the whole button as the stick's face at full strength.
    The owner: "way too intense it should just be a semi transparent overlay
    on the existing disc".
  - The disc keeps its grey 0.5 rest. It stays painted, but is never lit and
    never pressable, so the thumb still lands on the stick's zone, which is
    what jumps.
  - The weapon or harvest picture is back whenever the stick has a job, and
    while the coach's ATTACK lesson holds the disc.
- **The stick's picture is the tap's act.** The owner: "I'd like the right
  joystick button to have an icon that represents the action like this
  current jump, the sword for attack, etc. so maybe chat bubble for speaking
  [to NPCs], door for entering door".
  - With no fight or harvest on the stick, a tap now does what the E key does
    there, and the stick shows it (`tapActIcon`, desktopControls
    `interactKind`):
    - a speech BUBBLE beside a character (their quest, Ace's flip, Diego's
      shop);
    - a DOOR at a building's steps, a hall, a dungeon's mouth, the Workshop
      or the Pet House;
    - the MOON at the farm's bed;
    - else the JUMP arrow.
  - The E key's chain is now one function, `runInteract`, shared through
    `S._interactNow`, so the picture and the tap cannot disagree.
  - The stick asks for the character FIRST (`npcFirst`). Ace and Diego stand
    by their doors, and a door has its own Enter button. The E key keeps its
    own order, door first.
  - The three pictures are SVGs in the JUMP arrow's white-and-outline style
    (`public/ui/controls/{talk,door,sleep}.svg`), see-through at 0.7 like it.
  - When the tap ATTACKS, the stick wears the WEAPON IN YOUR HAND, its bag
    picture (controlSkin `weaponDiscIcon`, InventoryPanel's own rule): a sword
    or a greatsword in its metal (plain, copper, iron, black steel), the bow,
    the staff. The owner: "when attacking it should show the weapon type
    depending on what weapon is used". An empty slot keeps the old plain
    picture. All ten pictures are in the disc from the start and warmed on
    the loading screen with the rest (controlsPreload), so a weapon swap never
    waits on a download.
  - ...and WHILE YOU ATTACK the weapon wins over the JUMP arrow (tapJump.js
    `attackingNow`): the owner, on the preview, "it just showed the new jump
    ... even when attacking". The arrow was picked by the context alone, so
    a hold or a drag at nothing, or a bow or staff shooting with no lock (a
    ranged player is found no targets on purpose), attacked under it. Now a
    thumb held past the tap's window or dragging, a swing or shot under way,
    and `ATTACK_FACE_MS` 1.2 s after the last one all show the weapon; then
    the arrow comes back.
  - `mp-tapact` (22 checks, holding the stick with a sword and a bow among them): the door at the bank opens the bank, the bubble
    beside Ace opens his flip, the arrow on the open commons jumps, each slot's
    weapon on the disc, and the lit disc wearing an iron greatsword beside a
    real monster.
- **The orbit is gone.** v2.3.3018's two faint arcs round the attack button
  (TouchControls `OrbitArcs`, from the mockup) went with the owner's "remove
  the strange lines to the left and right of the button". mp-btnskin now
  checks that none is drawn.
- mp-joyfade and mp-rbutton expected the right stick to vanish at rest; they
  now expect its JUMP face.
- Tests: `mp-tapprop` (12 checks: beside a bench, a quick tap, a slower one,
  a tap on the disc and a tap on the bench jump with no swing; a hold lands
  blows; the face shows JUMP, then the weapon with a job), test-world-core
  "the tap that jumps".

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
