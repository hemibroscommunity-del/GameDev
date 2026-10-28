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
- **The jump.** For 0.625 s the body rises up to 85 world px and comes back
  down on a smooth arc. The first cut went 34 px; the owner, having tried it:
  *"I'd also like it if the jump were about 2x as high"* (68 px, 0.56 s). Then,
  since v2.3.3499: *"Try making jump 25% higher"* -- 85 px, in the air
  sqrt(1.25) as long, the same pull of gravity (see the v2.3.3499 section).
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
  - bushes, stumps and driftwood;
  - since v2.3.3499, minecarts and rowboats (lower than the higher jump's top).

  You pass over one if the way you're going carries you out of it before you
  come down, give or take 0.16 s; once you have started across one you are
  never stopped half way over it, and feet that come down in it walk on out.
- **Everything else stops you in the air** as it does on the ground: trees,
  boulders, carts, haystacks, buildings, the resources, monsters, people and
  the open sea.
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

- **The rules** (`src/game/jump.js`, pure, no imports): `JUMP_MS` 625, `JUMP_PEAK`
  85 (560 and 68 until v2.3.3499), the arc `4t(1-t)`.
  - Low things are cleared while the lift is at least `JUMP_CLEAR` (0.36 since
    v2.3.3499, 0.45 before) of the peak, from about 62 ms to 563 ms.
  - `JUMP_OVER` is the catalog ids that are cleared, everything `JUMP_OVER_H`
    (87) px tall or less as drawn. `JUMP_NOT` names the low ones left off (none
    since v2.3.3499).
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
    `overLow` says the crossing finishes in time (and, since v2.3.3499, latches
    it: `jumpLatched` / `jumpLatch`, then `landedOver` after the landing).
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

## v2.3.3105: a tap on the right stick jumps, and the button is put away

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
  - ...and in a fight the PICTURE FOLLOWS THE THUMB on the disc too: the
    owner, "when I'm in combat the icon doesn't move to the edge of the disc
    like it does when I'm not in combat". In a fight the thumb presses the
    DISC, which does not steer (v2.3.2258), so its picture sat still. The knob
    and rod now follow the press from where it began (BroTown `rKnobFollow`,
    split out of `rJoyAim`), the look only -- no aim, no autoAttack -- so the
    flick for the special is judged as before; the release centres them.
  - `mp-tapact` (23 checks, holding the stick with a sword and a bow, and a
    drag on the lit disc in a real fight, among them): the door at the bank opens the bank, the bubble
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

## v2.3.3145: a tap that jumps shows nothing of the attack, and a far resource lets it jump

The owner: "When you tap jump with bow equipped it shows you and your line of
sight facing southward for a brief instant. Fix. Same for staff and sword",
and "Sometimes jumping doesn't work because 'too far away!' message. Make
jumping work and just remove the too far away message when too far away from
resource extraction areas."

- **The flash.** A press on the right stick with nothing to fight switched the
  attack on at once (`S.autoAttack`), and only its first SWING waited to see
  whether the press was a tap (v2.3.3105's `S._atkHoldUntil`). So for the
  length of every tap:
  - the body turned to `S._aimAngle`, whatever aim was left over -- a monster
    killed below you (its lock's aim outlives it) or an old drag of the stick
    (entityRenderer `aimAttackActive`);
  - the bow drew its sight line and the sword its swing preview
    (effectsRenderer);
  - the walk halved, and a sprint ended ("an attack ends it").
  - Measured on main (`mp-tapstance`): facing east with an old aim pointing
    south, a tap turned the bro south and drew the line, with all three
    weapons.
- **Now such a press is PENDING** (`S._atkPending`, set by BroTown's
  `handleRBtnPress` while the tap's window is open). It becomes the attack only
  when it turns out to be one: still held when the window closes, or dragged
  (`settleTapPress` in `src/game/tapJump.js`, once a frame at the top of the
  game loop). A release first -- the tap, the jump -- lets go of it, and
  nothing of the attack is ever shown. Raising the shield or going into the
  water lets go of it too. A hold pays nothing: its first swing already waited
  for the window.
- **A thumb that rolls on its tap no longer aims.** The aim's dead zone was 8
  px and a tap's 10, so a tap whose thumb rolled 9 px wrote the roll into
  `S._aimAngle` and `S._lastAimAngle` -- the way the body turned and the bow
  aimed from then on -- and still jumped. While the press is pending and the
  thumb is inside the tap's 10 px, the knob follows and nothing aims
  (`rKnobFollow`, not `rJoyAim`).
- **"Too far away!" is gone.** The right stick is the whole right half of the
  screen, so the thumb that taps it to jump is often over a tree or a rock
  across the screen, which took the tap, said "Too far away!" and ate the jump.
  `_tapHarvestAtCss` now passes over a resource out of reach, and over one you
  hold no tool for (it isn't drawn), so the tap goes on to the jump; one in
  reach still starts its harvest. v2.3.2273's "You need a tool for that" went
  with it: it existed because the scan found resources the renderer hides.
  A bed of your farm out of reach lets the tap through the same way.
- **And a resource you can't see stops nobody.** Not the jump's, but found
  beside it (the owner: "there are invisible areas that block movement near the
  town"): a resource you hold no tool for isn't drawn, but its rock or trunk
  was still solid (`nodeBlockEllipse`). The commons ring BroTown with six
  copper veins and six pines, and "Learn a Trade" hands you the hatchet and the
  rod but not the pickaxe, so each vein was a rock-sized patch of empty grass
  that stopped you. It is solid again the frame the tool reaches the bag.
- Tests: `mp-tapstance` (23 checks; its bow, staff, sword, rolled-thumb and
  sprint checks fail on main) and `mp-unseenwall` (10; 2 fail on main), test-world-core "the tap that jumps" (+3), and mp-tapjump,
  mp-tapprop, mp-tapact, mp-jump, mp-tapswing, mp-sprint, mp-aimpath,
  mp-cooktap, mp-nodelabels, mp-farmwalk and mp-wheelnodes pass as before --
  but for mp-wheelnodes' "where they swim is drawn as water" at
  wn-commons-15, one point of nine on dry ground, which fails on main too.

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

## v2.3.3499: 25% higher, and no more getting caught on a fence

The owner, after more play: *"Try making jump 25% higher. Gets stuck on some
props sometimes that it should be clearing."*

- **Higher.** `JUMP_PEAK` 68 -> 85 px, and `JUMP_MS` 560 -> 625: a height goes
  with the square of the time under one gravity, so 25% higher is sqrt(1.25) =
  1.118x as long in the air, and the bro still jumps like himself, only harder.
  `JUMP_CLEAR` 0.45 -> 0.36, so a crossing may start with the feet as high off
  the ground as before (0.36 x 85 = 0.45 x 68, ~31 px); the window is 500 ms
  where it was 415.
- **Why a jump got stuck** (measured off the code):
  - the crossing rule was asked again EVERY frame with that frame's speed, so
    anything that slowed you with your feet already over the fence -- a slow
    frame (a frame moves at most three 60 fps steps), a sprint running dry, a
    held attack's half pace, the stick eased or turned, the walk's x-then-y
    slide -- turned the answer to "no" half way, and the walk's "never deeper
    into a footprint" rule froze you there in the air: you came down IN the
    fence and had to back out;
  - and a jump taken a stride too far back reached the fence just after the
    last moment it could be out before landing, and stopped dead at its edge
    in mid-air (you had to take off within ~41 px of a fence, ~31 of a crate).
- **The fix:**
  - the first frame a jump may pass a low thing **latches** it on the jump
    (`jumpLatch`), and a latched thing is passed for the rest of the jump
    whatever the speed (`jumpLatched`);
  - a crossing that would come down up to `JUMP_LAND_GRACE_MS` (160 ms) short
    of clear is let start;
  - the jump's latches outlive it by `JUMP_LATCH_MS` (450 ms, `endJump` ->
    `S._jumpOver`, `landedOver`): feet that did come down inside one walk on
    out of it. Only feet ALREADY inside -- a step into a fence you have just
    cleared is refused as ever.
  - Only a `JUMP_OVER` thing is ever latched: a tree, a building or the sea is
    exactly as solid as before. With all three, a fence can be taken off for
    from ~76 px away (was 41) and a crate from ~66 (was 31), and a crate can be
    cleared on a diagonal.
- **Minecarts and rowboats are cleared now** (79 and 81 px tall, under the new
  85 px top; `JUMP_OVER_H` 87, 70 x 1.25). They were left off as "about as tall
  as a bro" while the jump was a bro's height. Shots fly over what you can
  jump (v2.3.3206, projectiles.js `_isLow`), so an arrow or a bolt now flies
  over a minecart or a rowboat too, unless it is what the shot is aimed at.
- Other players' screens draw the jump from the relay's own `dur` and `peak`
  (`peerJump` clamps to 900 ms and 120 px), so an older page sees the new jump
  too; nothing on the worker changes.
- Tests: test-world-core "jumping" (the new numbers, the latch, the grace, the
  landing, the longer list), `mp-jump` (the peak read as 85).

## v2.3.3499: a jump that moves, not one held frame

The owner, after the higher jump: *"Also is there any 'jump effect' you can
add just using code that would make it look more realistic than just the
static frame?"*

Four things, all drawn in code on the art the game already has. Nothing new is
loaded or held.

- **The stride, slowed.** The body no longer holds one leaping frame for the
  whole jump. It runs through four of the jog's own frames for the way it faces
  (`JUMP_FRAMES` in game/jump.js), each held for its share of the air
  (`JUMP_FRAME_AT`):
  - the push-off, a knee driving up off the back foot (the first 7%, about
    44 ms, a flash of the crouch);
  - the rise (to 40%);
  - the split over the top (to 70%);
  - the front foot reaching for the ground.

  They were picked off the sheets by eye and by each frame's lowest row of
  feet (128 px frames):

  | Sheet | Frames | Lowest feet row |
  |---|---|---|
  | east | 13, 1, 3, 4 | 109, 105, 97, 102 |
  | north | 2, 3, 5, 6 | 117, 107, 104, 115 |
  | northeast | 1, 3, 4, 5 | 113, 104, 103, 108 |
  | south | 13, 14, 15, 16 | 114, 101, 102, 111 |
  | southwest | 9, 10, 11, 12 | 118, 114, 103, 118 |

  In each, the push-off is planted, the middle two are the stride's highest
  feet, and the reach is coming down. The armour and the knight figure follow
  each frame by its phase, as they followed the one before. Other players'
  copies run the same frames from the relay's own clock.
- **Squash and stretch, about the feet** (rendering/jumpFx.js, numbers in
  game/jump.js):
  - **In the air** (`jumpStretchAt`): crouched to 0.9 of his height at the
    press, springing to 1.07 by 12% of the way (the push long), round again by
    45%, and a little long (1.04) reaching down.
  - **On the touch-down** (`jumpLandStretch`): squashed to 0.86 and springing
    back through a little stretch, settled after `JUMP_LAND_MS` (220 ms). That
    time is stretched with the air when `?jumpms=` lengthens a jump, so a slow
    test machine sees it.
  - **The width** (`jumpWidthFor`): wider as he squashes, thinner as he
    stretches, four fifths of what keeps the area.
- **The lean.** Into the way he goes across the screen
  (`jumpLeanAt` x `JUMP_LEAN`, 0.09 rad, about 5 degrees):
  - forward on the way up, nearly upright over the top, back a touch reaching
    down to land;
  - scaled by how fast he goes across (`JUMP_LEAN_PX_MS`, a walk's pace leans
    in full), so a standing jump does not lean, nor one straight up or down the
    screen;
  - the speed is his WALK (`S.player.vx`, or a peer's `_vx` off the wire),
    eased by the clock (jumpFx.js `ACROSS_TAU_MS`). The first cut timed where
    two frames drew him and gave up past 250 ms between them, so a phone
    drawing a few frames a second (and the QA box) never leant at all.
- **A kick of dust at the take-off** (rendering/worldFx.js `_takeOffDust`):
  three puffs back off the heels the way he was going, or two to the sides from
  a standing jump. The landing keeps its ring of six, and nothing is kicked up
  on water.

**How it is drawn.** It is the emotes' way, `placeEmote` and `holdMatrix` from
game/emoteMoves.js:

- The whole figure is lifted, then squashed and leaned **about its feet**, so
  the boots stay over the ground they stand on.
- The HUD inside it (name plate, HP bar, the spend bars) is given the inverse
  of the squash and lean. It rides up with the body but never squashes or
  tilts.
- `figureFeetY` reads the ground again through `_jumpLift` (now everything the
  jump moved the feet by: the lift and the squash and lean about them).
  `figureFeetX` reads it through `_jumpXFix`. So the shadows, the depth pass and
  anything standing on the feet are where they were.
- Everything jumpFx writes is put back at the start of the next frame wherever
  nothing has written since. The entity pass writes position and scale fresh
  every frame and the rotation never.
- A figure drawn another way is only lifted, as before: hidden behind a
  stand-in, tipped over in its death, or in the water.
- The squash plays on a jump that came down on its own (jumpActions.js
  `tickJump` sets `S._jumpLandFx`). One cut short by a death or a zone change
  does not squash. Another player's plays from the relay's own end.

**Not done.** A soft round shadow under the feet that shrinks with height:
the world's ellipse shadows were taken out for the sun's cast shadows
(entityRenderer's notes), and the sun's shadow already stays on the ground and
slides away from the body as it rises.

**Tests.**

- test-world-core "jumping":
  - the four frames in order, inside each sheet, and what each was chosen for,
    read off the PNGs;
  - the curves' ends, bounds and smoothness, the width, and the lean's sign
    and its stillness standing;
  - the landing's length, stretched with the jump.
- `mp-jump`:
  - the frames run through the four in order;
  - the squash drawn as the curve says;
  - the touch-down squashed;
  - the feet read where they stand under the lift and the squash;
  - the name plate never squashed or tilted;
  - a standing take-off puffs two puffs;
  - 2b, a running jump east leans forward and west the other way, as the rules
    give for the speed he really went, and kicks three puffs back.

## v2.3.3681: the jump button is back for everyone

The owner, 2026-10-27: "Also while I'm thinking of it: I want a dedicated
button for jumping".

- **Where:** v2.3.3017's button, in v2.3.3017's place. It is centred under
  the attack disc, one gap below it (`jumpAnchor`, ShieldButton.jsx), so the
  thumb slides straight down off ATTACK. `combatBandTopPx` has counted that
  slot all along, so nothing else had to move. It shows the owner's round
  jump picture (card 11), lit while you are in the air. It jumps on the
  press, and its touches never swing.
- **When:** always on a phone, except while you swim or are dead (as
  before). A computer jumps with X.
- **The switch:** `?jumpbtn=0` puts it away, which is the game of
  v2.3.3105-3680 (tapJump.js `jumpButtonWanted`). A plain `?jumpbtn` still
  works and changes nothing.
- **The tap stays.** A tap on the right stick still jumps when it has no
  other job, and the stick still shows the JUMP arrow when it would. Taking
  the tap jump away now that the button is back is the owner's call.

**Checked** by `mp-jumpbtn`, in the world, 20 of 20. On an upright phone
(390 x 844), a small one (360 x 640) and a sideways one (844 x 390), with a
sword, a Pine Shield and a fight on:

- the button is drawn with nothing in the address;
- it sits under the attack disc and centred on it, clear of the dashboard;
- it covers no other control, with the guard down and with it up (Shield
  Bash drawn);
- a real tap jumps and swings nothing;
- `?jumpbtn=0` hides it.

`mp-tapjump`'s first check now expects the button; its tap still jumps, 8 of
8.

## v2.3.3682: the double jump, a flip

The owner, 2026-10-27:

> Now I'm wondering about the feasibility of a double jump feature. You press
> jump then press jump again to do a little flip for a little more of a bounce.
> You have to time it right to get maximum horizontal distance and the jump
> effect will be greater if you're sprinting into the jump. See if you can use
> the roll or part of the roll for the double jump effect

and "I just uploaded the second jump (flip) sound effect to GitHub".

**What it is.** A second press while you are in the air (the jump button, X,
or a tap on the stick) is a FLIP, once a jump. It is a smaller push up from
where you are: `FLIP_PUSH` 0.6 of the jump's own, under the jump's own
gravity, so `?jumpms=` stretches it too. The record that replaces `S._jump`
is a jump of its own (`flip: true`), so everything that reads a jump reads it
unchanged: the lift, the low things cleared, the landing and its squash, the
peers' copy.

**It is drawn with the roll.** The dodge sheets' somersault (frames 2-6:
over, the tuck going round, coming out), by the flip's phase
(`FLIP_FRAMES`, `FLIP_FRAME_AT`), lifted by jumpFx as a jump is. The roll's
pose is borrowed the way the sword's dash borrows it (entityRenderer
`_flipRoll`): the look only, so no i-frames. As on the roll, the hair, hats
and glasses are not drawn during it.

**Timing is distance.** For the flip's time in the air you go faster across
the ground, from `FLIP_BOOST_MIN` 0.10 to `FLIP_BOOST_MAX` 0.45 by its grade
(`flipGrade`):

- 0 at `FLIP_FROM` (15% of the jump; a press before it is refused, "early");
- 1 at `FLIP_SWEET` (80%: coming down, about 0.12 s before the feet would
  touch);
- easing to 0.5 at `FLIP_TO` (96%), where it is too late ("late").

A later flip gives more time in the air, but past the sweet spot the boost
falls faster than the air grows. So the most ground is covered at the sweet
spot. Ground covered, in plain jumps (test-world-core works it out from the
rules):

| Flip pressed at | Ground covered |
|---|---|
| no flip | 1.0x |
| 20% (right after take-off) | about 1.1x |
| 50% (the top) | about 1.6x |
| 80% (the sweet spot) | about 2.0x |
| 95% (nearly down) | about 1.8x |

A grade of `FLIP_PERFECT` 0.8 or better says "Perfect!" over you, in gold.

**Sprinting into it** (a jump that took off in a sprint, or a sprint on at the
flip) makes the flip bigger: the push x1.25 and the boost x1.35. At the sweet
spot that is about 2.3x a plain jump's ground, on top of the sprint's own
1.33x pace.

**The worker** hears a walk, as for a jump. No server change. At its best a
flip is 1.45x the walk for about half a second (2.1x with the sprint's own
1.33). That is under the move budget's 500 px a second refill at the base
walk, and inside its three seconds of burst with every speed stat
(server/src/movement.js `MOVE_BUDGET`). mp-doublejump checks that a second
phone agrees where the flipper landed.

**Other players** see it. The relay is the jump's own `player_jump`, carrying
`flip: 1`, its height, push and pull, and which way it faces; a forged one is
clamped (`peerFlip`) and falls back to a plain hop. An older screen reads it as
a second hop of the flip's length and height.

**The sound** is the owner's recording, "sfx jump flip" (Freesound 563530),
cut by tools/audio/cut_owner_sounds.py: the cue `jumpFlip`, yours and another
player's at their share.

**Checked:**

- test-world-core "jumping": every rule above exactly: the grade, when a
  flip may start, the arc, where the most ground is, sprinting, "Perfect!",
  the boost only in the air, low things cleared while high enough, the roll's
  frames, a peer's flip clamped.
- `mp-doublejump` (two phones, in the world): the second press flips and is
  drawn with the roll's somersault, lifted; near the sweet spot it carries him
  1.5x+ a plain jump with "Perfect!"; a third press does nothing; too soon is
  refused and a later press still flips; an early flip covers less ground;
  sprinting makes it bigger; the watching phone sees the flip drawn and
  agrees where he landed. This box draws a few frames a second, so a timed
  press is made again (up to five times) until it lands in its window.
