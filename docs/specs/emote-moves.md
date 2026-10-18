# Your bro moves (v2.3.3345)

Phase 1 of the fun & social plan (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
recommended": twelve emotes that move the whole bro, with no new art and no
new memory.

## What you can do

Open the emote picker (tap your bro, then the smiley; or B on a keyboard). It
opens on a **Moves** tab; the emoji and quick lines are the second tab.

| Move | What your bro does | Pops over you | Lasts |
|---|---|---|---|
| Wave | three quick side-to-side tilts | 👋 | 1.3 s |
| Laugh | a fast up-and-down shake, a little sway | 😂 | 1.5 s |
| Flex | squashes down, stretches tall and holds | 💪 | 1.6 s |
| Shrug | a small hop with a tilt | 🤷 | 1 s |
| Facepalm | leans in, holds, a slow head shake | 🤦 | 1.7 s |
| Cheer | two big hops | 🎉 | 1.1 s |
| Sit | down to 70% of his height | | until you move |
| Sleep | tips over flat, breathing | 💤 every 1.8 s | until you move |
| Flop | a face-plant with a bounce | 💨 | until you move |
| Bounce (dance) | bobs on every beat, leans left and right | 🎵 every 2 s | until you move |
| Robot (dance) | snappy steps on the quarter beats | 🎶 every 2 s | until you move |
| Sprinkler (dance) | face-flips in steps, then one long sweep | 🎵 every 2 s | until you move |

Or type it in the chat: `/wave` (`/hi`), `/laugh` (`/lol`), `/flex`,
`/shrug`, `/facepalm`, `/cheer`, `/sit`, `/sleep` (`/nap`), `/flop`,
`/dance` (`/bounce`), `/robot`, `/sprinkler`. A message that is only one of
these is the move and says nothing in the chat.

A held pose ends when you walk, swing or shoot, raise the shield, swim, jump,
start a harvest, are moved (a gust, a knock-back, a door) or a blow lands on
you or from you. Moves are refused while you swim, are in the air, are dead
or are harvesting. One move or emote a second.

The three dances keep time by the clock (120 beats a minute), so bros dancing
side by side bob together, as near as their phones' clocks agree. Phase 2 of
the plan brings the server's beat.

## How it is drawn

`src/rendering/emoteFx.js`, once a frame after the depth pass, the swimmers
and the jumpers, before the lights (jumpFx's order and reasons). The moves and
their curves are `src/game/emoteMoves.js` (no imports; the server suite reads
it).

- **The whole figure moves.** Body, gear, hat, cape, weapon: one transform on
  the display container (an offset, a squash or stretch, a tilt, a mirror), so
  every look works and nothing new is loaded.
- **About the feet.** The boots stay where the server knows they are; only a
  hop lifts them, and its shadow stays on the ground (figureFeetY / the new
  figureFeetX take the emote's fix off, as they do a jump's lift).
- **The name plate never tilts.** The HUD inside the figure (the plate and
  HP bar, the threat skull, the spend bars) is given the inverse of the
  emote, so it is drawn exactly as without it. It only comes down as far as
  the top of the figure does: a sitter's plate 30% of his height, a sleeper's
  to just over him (a lying bro is about 0.4 of his height deep). A hop or a
  dance's lean leaves it where it was. The speech bubble and the popped emoji
  stand on the plate, so they come down with it (`_emoteHudDrop`,
  effectsRenderer `bandWithEmote`).
- **Put back every frame.** Whatever it wrote is restored the next frame unless
  something else wrote it since (the swim's and the jump's rule). Nothing is
  touched on a figure that is hidden (a combat or gathering stand-in is drawn
  in its place), dead, in the air or swimming, and nothing at all while nobody
  emotes.

## The wire

| | Message | The worker |
|---|---|---|
| A moment (wave ... cheer) | the `emote` relay with `{move}` | relays it only if `move` is on `EMOTE.MOVES` (emotes.js), as exactly `{id, move}` in the sender's name, to the phones near (a placed event, as an emoji emote) |
| A held pose (sit ... sprinkler) | `pose {id}` (or `{id: null}` to stand up) | keeps it on the player as `ps.po` if `id` is on `POSE.IDS` (server/src/poses.js), and the tick sends it as `po` on the player's entry, absent when not posing |

**Why a held pose is state and not an event.** A relay reaches the phones near
at the moment it is sent. A player who walks up a minute later would hear
nothing and see the sitter standing (TRAPS §176, the rule events-by-place was
built on). So `po` rides the player's tick entry like the sprint's legs and
the skull, and the once-a-second roster carries it to anyone near, a late
joiner included.

**The worker stands its copy up** on an accepted move that steps more than
1.5 px, changes zone, carries a speed, raises the shield, rolls, starts a
harvest or is dead (movement.js `_poseEndsOn`). So a phone that never says
"stand up" cannot leave a walker drawn sitting. The phone says it anyway
(`pose {id: null}`) whenever it ends a pose: a first step into a wall moves
nobody.

A pose set is held to one every 300 ms from a socket; standing up never is.
In memory only: nothing is stored, a deploy stands everyone up, and no coins,
items or XP come near it.

Old phones ignore `po` and `move`. A worker without poses never says
`caps.emotemoves`, and the phone then shows no Moves tab.

## Switches

- `emotemoves: false` in the live flags: no move relayed, no pose kept, and
  `caps.emotemoves` false at a phone's next join (no Moves tab). The emoji and
  quick lines go on.
- `emotes: false` turns off the moves too.

## Files

- `src/game/emoteMoves.js`: `EMOTE_MOVES` (the twelve), `onceFrame`,
  `holdFrame`, `emoteFrameFor`, `settleFrame`, `placeEmote` (the feet and the
  HUD), `holdMatrix`, `slashMove`.
- `src/rendering/emoteFx.js`: the drawing. Probes: `window.__btEmoteFx()` and
  `window.__btEmoteFigure('self' | id)` (where a figure stands, its scale and
  tilt, its plate's whole transform, its body).
- `src/rendering/pixiRenderer.js`: runs it after jumpFx.
- `src/rendering/systems/entityRenderer.js`: `figureFeetY` takes the emote's
  fix off; `figureFeetX`, `figureFeetUnits` new.
- `src/rendering/lightfx/casters.js`: a shadow is pivoted at `figureFeetX`.
- `src/rendering/systems/effectsRenderer.js`: `bandWithEmote` (the bubble and
  the pop come down with the plate); a move's own emoji pops (`trusted`, set by
  this phone's code from the table, never from the wire).
- `src/game/interactions.js`: `movesLive`, `sendMove`, `endOwnPose`,
  `updateOwnEmote` (when your pose ends), `updatePeerEmotes` (another
  player's Zzz and notes).
- `src/game/chat.js`: `/wave` and the rest (`setChatMoveSender`); a received
  move (`handleEmoteEvent`).
- `src/networking/wsClient.js`: `pose` through the shim (TRAPS #18), `po` off
  the tick into `other._po`.
- `src/ui/panels/EmotePanel.jsx`: the Moves tab (`data-emote-move`), the tabs
  (`data-emote-tab`, the last one remembered on the phone).
- `src/ui/BroTown.jsx`: the frame's call, `__broLegacyUI.moveSend`.
- `server/src/emotes.js`: `EMOTE.MOVES`, `emoteMoveListed`, `_movesOff`.
- `server/src/poses.js`: `POSE`, `_handlePose`, `_poseEndsOn`.
- `server/src/movement.js`, `tick.js`, `join.js` (`caps.emotemoves`),
  `index.js` (`case 'pose'`), `admin.js` (the operator view's `po`).

## Tests

- `server/test/emotes.test.mjs` §5-7: moves relay as exactly `{id, move}`;
  poses on the tick, kept, ended by a step, the shield, a zone change, death,
  standing up; a late phone sees one; the switches; and the math: every move
  starts and ends at rest, a tilt never squashes, a dance is the same frame on
  two phones, and over 20,000 random figures the boots stay put and the plate
  is exactly as it was, untilted, only lower and never higher.
- `server/test/mirror-audit.test.mjs`: the worker's moves and poses are the
  phone's.
- `tools/qa/mp/mp-emotemoves.mjs` (three phones): the Moves tab; a real finger's
  Wave sends one relay and tilts the bro, feet and plate still, on both phones;
  Sit is one pose the worker keeps, drawn on both phones for as long as he
  sits; a phone that joins later sees him sitting; a step stands him up
  everywhere; `/dance` and `/sleep` from the chat; no `caps.emotemoves`, no
  Moves tab. Pictures in `tools/qa/mp/out/emotemoves-*.png`.

## Not yet

- Your pet copying your sit, dance and flop; the townsfolk reacting; the
  server's `/roll` and `/flip`; an emote wheel you choose: the plan's other
  Phase 1 items.
- A real sitting picture: the sit is a squash in code. If it reads too much
  like a short bro, one picture of the bro sitting (south, east, north) would
  replace it.
