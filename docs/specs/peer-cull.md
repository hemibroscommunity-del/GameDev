# A crowd costs the phone less: far players not drawn, at most 50 in full (v2.3.3221)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."*

## What the stress test found

`mp-crowdbots` puts one phone page in the Wheel's BroTown and walks the load
test's bots around it, step by step, timing the page's own frame work. Run with
the bots spread 2,400 px around the square, so that only 12 of 150 were on the
phone's screen, the frame cost as much as it did with all 150 on screen:

| Other players in the Wheel | 0 | 50 | 100 | 150 |
|---|---|---|---|---|
| on screen | 0 | 6 | 9 | 12 |
| the frame's work, ms (half the frames under) | 6.5 | 18.0 | 27.6 | 36.1 |

The QA box draws in software, so its numbers are not a phone's. What carries
over is how the cost grows with players (`mp-crowdbots`' own rule).

A profile of the page at 150 showed two causes.

1. **Every other player in the zone was posed, dressed and handed to Pixi every
   frame, wherever they stood.** That is 43 display objects each. The monsters
   have been skipped when far off screen since v2.3.2978 (`FAR_MARGIN`); the
   players never were.
2. **Two pieces of the renderer moved every player south of you back and forth
   between two layers, every frame.**
   - The depth pass (`depthSort.js` `applyDepthBuckets`, v2.3.2635) moves
     everyone standing south of you into the front layer, so they draw over
     your body.
   - The peer loop (`entityRenderer.js` `_updateOtherPlayers`, v2.3.2304)
     moved each player back into the entity layer the next frame, because
     that was "their" layer. Then the depth pass moved them out again.
   - Where they ended each frame was always right, so nothing looked wrong.
     But every move made Pixi rebuild the whole world's draw list.

## What changed

- **In the Wheel, a player past the view's half-diagonal plus
  `PEER_FAR_MARGIN` (400 px) from its middle is not drawn**, the monsters' rule.
  - Their figure is hidden, and nothing else is done for them that frame.
  - A figure is not even made until they come that near. So joining a full
    Wheel no longer builds every player's figure in one frame.
  - A figure once made is kept, so walking back costs nothing. The frame they
    come in range, they are drawn again.
  - Nothing of theirs is drawn either (`S._peersNotDrawn`): not their pet
    (`_updatePeerPets`), their armour's glint (`lightfx/glint.js`), their
    gathering, swing, shot or block stand-in, their dodge trail, their status
    looks, a windup ring or a chat bubble (`effectsRenderer`). For a player far
    off the screen this saves work; for one past the crowd cap, below, it
    keeps a sword swing or a lumberjack from appearing where nobody is
    drawn.
  - Only in the Wheel: an ordinary zone is a screen or two across.
  - `?nopeercull` draws everyone, as before.
- **A player in the depth pass's front layer is left there.** The peer loop
  accepts either sorted layer as a walking player's place; the depth pass moves
  them back when they cross your line. A player who mines or fishes still moves
  to the gesture layer and back, as before.

- **The crowd cap (Phase 0a of `docs/SERVER-SPLIT-PLAN.md`, the owner's
  choices).** Of the players near enough to be drawn, the nearest
  `CROWD_K` = 50 are drawn in full, and always:
  - your party;
  - your target;
  - your duel;
  - whoever is fighting you (a threat skull, or hit in a fight in the last
    8 seconds).
  The rest are not drawn; the minimap still shows them.
  - A player drawn last frame keeps their place until 8 more players
    (`CROWD_HOLD`) are nearer than the nearest 50, so the edge of the crowd
    does not flicker as people walk across it. At most 58 are drawn.
  - The pick is `src/game/crowdCap.js`, with no imports, tested in node.
  - `?crowd=K` tries another number on your own phone; `?crowd=all` draws
    everyone.

Nothing changes on the server. Under 50 players near you, nothing changes in
what a phone shows on its screen.

## Measured

`mp-crowdbots` with the bots spread out (`BT_CROWD_WALKR=2400`), the frame's
work in ms, half the frames under (95% under in brackets):

| Other players in the Wheel | 50 | 100 | 150 |
|---|---|---|---|
| before | 18.0 (29.2) | 27.6 (53.7) | 36.1 (52.9) |
| the layer fix alone (`?nopeercull`) | 14.9 (21.6) | 26.1 (48.6) | 36.1 (46.1) |
| **both** | **13.0 (19.0)** | **21.6 (42.3)** | **19.8 (40.2)** |
| players not drawn, with both | 24 | 74 | 88 |

With everyone on the screen (`BT_CROWD_WALKR=420`) there is nothing to cull,
and the layer fix alone saves a little. The same build both ways, `?nopeercull`
against the default, the frame's work in ms (half the frames under):

| Other players on the screen | about 50 | about 100 | about 145 |
|---|---|---|---|
| before (`?nopeercull`) | 15.9 | 25.8 | 36.1 |
| after, without the crowd cap | 15.0 | 23.3 | 34.2 |

With the crowd cap on (the default) against `?crowd=all`, the same build, the
bots walking round the phone:

| Other players on the screen | about 50 | about 100 | about 145 |
|---|---|---|---|
| `?crowd=all` (everyone drawn) | 12.6 | 21.7 | 30.6 |
| **the crowd cap** | **13.1** | **17.2** | **20.8** |
| players past the cap, not drawn | 0 | 45 | 96 |

With the cap, a phone with 150 players on its screen does about the work of
one with 55: the 50 nearest, and the few held at the edge.

The page's own profile at 150 players spread out, in ms of work a second:

| | before | after |
|---|---|---|
| the peer loop (`_updateOtherPlayers`) | 9.5 | 3.2 |
| Pixi's render | 20.2 | 13.2 |
| rebuilding the draw list (`_buildInstructions`) | 10.8 | 5.7 |
| moving figures between layers (`addChild`, `removeChild`) | 5.4 | 0 |
| garbage collection | 3.4 | 0.4 |

The draw list is still rebuilt most frames. In Pixi 8 any change of a
`zIndex` or of `visible` anywhere in the world marks it for rebuilding, and the
world is one render group (v2.3.3079); a crowd walking changes many `zIndex`es.
What the cull changes is how much each rebuild has to walk.

## Tests

- `mp-peercull`, two phones in the Wheel:
  - near, the other player is drawn, with a body;
  - standing still south of you, they are drawn over you and never moved
    between layers in 60 frames (the old code: about two moves a frame);
  - walked 1,800 px off, they are not drawn, and their figure is kept;
  - walked back, they are drawn again, with a body, where they stand.
  - `BT_PEERCULL_QUERY=nopeercull` runs it the old way: it fails the layer
    check (120 moves in 60 frames) and the far check, as it should.
- `server/test/crowd-cap.test.mjs`, 19 checks of `src/game/crowdCap.js`:
  - under K everyone; over K the nearest K, the always-drawn on top, equal
    distances by id; the edge held for those already drawn, up to 8 places;
  - 2,000 frames of 119 players walking: never more than 58 drawn, the party
    and the duel every frame, the nearest 50 always among the drawn, and 1
    player drawn again within a second of going, against 79 without the hold;
  - `?crowd=`.
- `mp-crowdbots` takes `BT_CROWD_QUERY` (`nopeercull`, `crowd=K`, `crowd=all`)
  and reports how many players each step left undrawn, far off the screen
  (`farHidden`) or past the cap (`crowdHidden`). The steps past 119 bots above
  were run with #895's `BT_MAX_PLAYERS=300` (the harness's copy of the server
  with a higher cap).
