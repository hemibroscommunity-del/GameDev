# A crowd on the screen: what the lanes found, and the armour's garbage (v2.3.4878)

> Owner, 2026-11-12: *"Orchestrate token efficient lanes looking for
> performance improvements particularly when lots of players are on screen."*

## How it was run

Four read-only lanes, each with one part of the work a crowd costs. Each was
told what is already done (`peer-cull.md`, `far-players.md`, `slim-roster.md`,
the look bakes in `held-budget.mjs`), so it would not find that again:

- **A**: the body loop (`entityRenderer.js` `_updateOtherPlayers`, `depthSort.js`).
- **B**: what is drawn around each player (effects, the glint, pets, the
  minimap, sound, React).
- **C**: the phone taking in other players' messages (`wsClient.js`, `presence2.js`).
- **D**: the worker's sends to a crowd (`tick.js`, `relay.js`).

Each lane wrote its findings to a file as it went and reported at most six.
The orchestrator read the code behind each finding before listing it below;
"checked" says so, "lane" means the lane's reading only.

## What shipped: an armoured crowd makes no garbage while nothing changes

**Before.** Every armoured player on your screen, every frame, built:

- the armour prewarm's signature (an array joined);
- its gear list (a `map`, and a `split` for each piece);
- a closure to look up their body.

It then called the prewarm, an `async` function, so each call made a
Promise. The prewarm returned at once, because the signature had not changed.
On top of that came two `some` closures, and the worn keys `map(...).join`
twice. That is about ten objects for each armoured player, each frame, for
nothing. The crowd tour's collector line (`held-sweep.md` "The crowd tour",
row h) is the one that grows with armoured players.

**Now** (`entityRenderer.js`, the armoured block in `_updateOtherPlayers`, and
`_peerArmourSig`):

- the signature is kept on the player's display, together with the eight
  things it is made from. It is made again only when one of them changes, and
  it is the same string as before;
- the prewarm, and what is handed to it, are made only when the signature
  differs from the last one the prewarm took. That is the same test each
  prewarm runs first, so the prewarms behave exactly as before;
- the worn keys and the slots worn are gathered in the one loop, and the held
  frame's key is made once.

**Measured** (a node script running the old and new block on the same inputs,
with the texture lookups stubbed; one armoured player whose look has not
changed, three rounds of 3 million frames each):

| | time a player a frame | collections in 3 million frames |
|---|---|---|
| before | 820 to 900 ns | 393 (1,444 in the first round) |
| after | 98 to 146 ns | 104 |

The same script checks that the new block makes the same signature and the
same held-frame key as the old.

- **At 50 armoured players and 60 frames a second:** about 2.6 ms of work a
  second becomes about 0.35 ms on a computer. A phone is several times slower,
  so the saving there is larger in absolute terms.
- **About a quarter of the collections** this code caused.
- **This box cannot show it in a phone test.** It draws 2 to 5 frames a second,
  so garbage made per frame barely shows. The phone tests here (`armorgrade`,
  the crowd tour's armour stations) check that nothing changed on the screen.

Off-ramp: none needed. The draw does not change, only how often the same
strings and lists are rebuilt.

## The second wave: six lanes, six pull requests

The owner then allowed up to 20 lanes, "token efficient". Six items had clear,
separate, low-risk work. Each went to a lane in its own worktree, which made
one local commit after the precheck. The orchestrator read every diff, pushed
each one, and opened its PR. All are client only.

| § below | what | tag | PR |
|---|---|---|---|
| 2 | the phone's tick does less for each player | v2.3.4879 | #1615 |
| 3 | the glint keeps each armoured player's slots | v2.3.4880 | #1614 |
| 4 | other players' drawings checked once, not every frame | v2.3.4881 | #1613 |
| 5 | the chat-bubble and emote passes | v2.3.4882 | #1618 |
| 5 | the crowd pick makes nothing new each frame | v2.3.4883 | #1616 |
| 5 | the player list, and the party re-send | v2.3.4884 | #1617 |

- **They merge together cleanly.** All six, and this PR, were merged into one
  scratch tree, in the order above.
- **Phone checks.** The precheck and a sample of phone scenarios ran on that
  merged build, one scenario per system touched. Each PR says what ran.
- **Not built:**
  - §1, the owner's answer was "not now";
  - `_orderTraitsAndWeapon`, which risks the trait order;
  - ticks applied once a frame, which is larger and moves the sounds.

### A lesson for the next orchestrator: a suite that imports a client module

Server CI installs only `server/`'s packages. A suite that imports a client
module whose graph reaches `pixi.js` passes on this box, where `pixi.js` is
installed, and fails in CI. #1614's first push did exactly that. The deploy
workflow runs the same suite, so a red one would also hold the worker.

Read the file as text, or register a stand-in for `pixi.js` before the import
(`glint-peer-slots.test.mjs` shows how). Check it in a copy outside the repo,
where `pixi.js` cannot resolve.

## One picture per player, stage 1 (v2.3.4885, `?onepic=1`, off by default)

> Owner, 2026-11-12: *"I'd rather just take the heavy work head on first"*,
> *"I want to make this game ultra efficient"*.

### The idea

Every other player on the screen is a stack of about 31 to 43 layers: body,
head, hair, hat, armour, weapon, name plate and so on. Each layer is posed,
sorted and drawn every frame.

A standing player's stack does not change from frame to frame: a stand is
frame 0 until they turn. Stage 1 paints that stack ONCE into a slot of one
shared picture, and draws the player as one sprite until it changes.

**Who becomes a picture** (`src/game/onePic.js`):

- standing players past the nearest ten;
- never your party, target, duel, or anyone fighting you
  (`entityRenderer.peerAlwaysDrawn`, the crowd cap's rule);
- not anyone moving, gathering, riding, swimming, in a held pose, faded, or
  wearing a grade glow, whose filter is a pass of its own and, when godly,
  moves.

### Measured first (lane P2, a standalone prototype with the real sheets)

The page's main-thread ms a second, 43 layers a figure (software GL, so read
the ratio):

| players | standing: layers / one picture | walking: layers / one picture |
|---|---|---|
| 25 | 634 / 185 | 691 / 429 |
| 50 | 982 / 258 | 969 / 647 |
| 100 | 1005 / 373 (30 fps back to 60) | 1003 / 964 |

Walking gains less because a jog changes picture about 26 times a second.
That is why stage 1 takes the standing players.

### How it works (`src/rendering/peerImpostor.js`)

**The figure stays where it is.** Lane P1 mapped the figure (in the PR). The
shadows (`casters.js`), the glint, the depth pass, jumpFx, emoteFx, swimFx
and the stand-ins' geometry all read the figure's display. So it is left in
its layer, posed by the peer loop as before, and only not DRAWN:

- it becomes its own render group as it turns into a picture;
- it is set `renderable = false`, and Pixi then paints its root anyway
  (P2: one rebuild of the layer at entry, none per paint; 40 hidden groups
  cost the layer nothing);
- on leaving it is a plain part of its layer again.

**Painted only when it changes:**

- Pixi's own change counters over the whole figure (`checkChildrenDidChange`);
- its device transform, and any change of its place inside a device pixel;
- a slow refresh every ~4 s, staggered across slots;
- a few new pictures a frame at most;
- all paints in one place, after the lights and just before the frame is drawn.

**Where it sits.** The figure's device transform comes from
`getGlobalTransform` x the pixel ratio. It is painted at that fraction of a
pixel. The sprite goes on the whole device pixel, through its layer's own
transform. The shared picture is made at the screen's resolution, with
slots in CSS px.

**Memory.** 24 slots of 96 x 140 CSS px: about 13 MB at 3x and 6 MB at 2x,
made with the scene behind the loading screen; nothing when off
(MEMORY-MAP's slot).

### What it took to get right (for the next one)

1. **The layers' scale x the figure's place missed what sits above the
   layers.** The picture was a device pixel off; use `getGlobalTransform`.
2. **The picture at resolution 1 drew every edge differently.** The figure's
   sharp-pixel shader (`dFdx`) and the rounding read the target's
   resolution; make it at the screen's.
3. **A 1/64 px allowance before repainting.** A figure painted while still
   settling rounded a plate's border a row off; repaint at any change.
4. **The test, not the painter, was then wrong three times.**
   - Screenshots catch what changes between shots and what the page draws
     over the canvas: a 💬 at the feet, the sun's shadows, the watcher's own
     plate.
   - `mp-onepic` now reads the game's own picture three times in one moment
     (`renderer.extract`: picture, layers, figure not drawn), over the
     picture's rectangle only.
5. **Not bit for bit, and that is the layers' doing.** They are drawn from
   the world's coordinates (x about 87,000 in BroTown) in the chip's 32-bit
   numbers, about 0.02 of a device px apart there; the picture is drawn in
   the figure's own small coordinates.
   - The differences were only ever thin vertical lines along edges, with no
     shift and the inside the same.
   - The check is: the inside's colours the same to the eye, no shift, and
     99.5% of pixels matched within their 3 x 3.
   - The last run, with the in-game reads: of 20,554 of the figure's pixels,
     143 off by more than 2 of 255 (0.7%) and 15 by more than 8. None of
     them is inside the figure, none is unmatched, and there is no shift.
     Nine paints in the whole test.

### Stage 1 measured in the game

(`mp-crowdbots`, `BT_CROWD_SETTLE=1`: bots walk to their spots round the phone
and stand; off against `?onepic=1`, the same build.)

A standing crowd on the phone's screen (`BT_CROWD_WALKR=420`), the same build,
`?onepic` off / on. This box draws in software at a few frames a second, so
read the draw counts and the growth, not the absolute ms:

| | 25 players: off / on | 50 players: off / on |
|---|---|---|
| players drawn as one picture | 0 / 15 | 0 / 24 (all the slots) |
| draw calls a frame | 140 / 102 | 202 / 146 |
| texture binds a frame | 543 / 417 | 763 / 564 |
| the game's own work a frame, median (95%) | 7.9 (12.1) / 7.5 (11.1) ms | 11.4 (17.0) / **8.7 (12.8)** ms |
| render-target switches a frame | 2.5 / 3.4 | 2.5 / 4.1 |

With nobody about, the frame's work is 5.4 ms. So at 50 standing players, what
the crowd adds to the frame went from 6.0 to 3.3 ms, **45% less**. That is with
only 24 of the 45 on screen as pictures: the nearest 10 stay layers, and 11
had no slot.

The switches left are mostly the safety refresh: 55 of the 94 paints in the
sample, one a picture every ~10 s.

**The first measurement was worse with pictures on** (the frame 11.7 to 13.6
ms; 9 paints and 11.5 switches a frame). A player who stops keeps easing
their drawn place onto their real one for some 15 frames, and each frame of
it was a new place inside a pixel, so a paint. A picture is now made only
once the figure is at rest (`settling`), and the refresh went from 4 to 10 s.

### Stage 2 (not built)

- **Effects in the picture:** the grade glow painted in, so graded players
  can be pictures too.
- **A slower picture for walkers far off:** e.g. half their steps, if the
  owner likes the look.
- **The refresh rarer, or gone** if nothing is ever found that only it
  catches: it is most of the switches left.
- **More, smaller slots:** a figure's bounds are well inside 96 x 140; more
  slots means more of a big crowd as pictures, for the same memory.
- **On by default with `?onepic=0`,** once the owner has tried it on their
  iPhone.

## What is left, ranked (none of it built)

### 1. Fewer messages to a crowd: the worker (lane D, checked)

**What.** In BroTown every phone is within `NEAR_R`, so each one gets its own
message on every tick that has a mover: 45 a second.

**The evidence.** TRAPS §169 measured it. The cost is the number of messages,
because deflate runs once per message per socket. Half the messages (every
other tick, each carrying both ticks' changes) took the room from 79.5% to
61.5% of its thread at 100 players. That was never shipped for the sends.

**The fix.** On a tick that carries only players (no events, no monsters),
leave the dirty players queued and send every 2nd or 3rd tick.
`STEADY.MAX_MS` (66 ms) already holds a straight walker to about 15 entries a
second. The phone parses a third as many messages for the same news.

**The owner's call.** Another player's start or stop reaches you up to 22 to
44 ms later. It needs a lower-case kill switch, and it is a worker deploy.

### 2. The phone's tick does less for each player (lane C, checked)

All of it is in `wsClient.js`, the `tick` case's players loop:

- **A dead buffer.** `_posBuffer` gets an object, a `performance.now()` and a
  `shift()` for every player, every tick. Nothing reads it: only
  `presence2.js` and `nearJoin.js` clear it, and `near-join.test` seeds it.
  `smooth-peer-damage-numbers.md` still names it as if it were used.
- **The same checks twice.** `peerEntrySlim` (`broWallet.js`, an
  `Object.keys` each time) runs twice for each player.
- **A new `equip` every tick.** It is rebuilt for every player, every tick,
  even when nothing changed.
- **Repeated lookups.** `S.others[pid]` is looked up about 25 times, with
  2 to 3 `Date.now()` calls.

Small and safe, one PR. Then perhaps ticks applied once a frame, not once a
message (a slow phone gets 2 to 4 between frames). That one is larger: the
start-of-fishing and sprint sounds ride on arrival.

### 3. The rest of the armoured crowd's garbage: the glint (lane B, lane)

`lightfx/glint.js` `_targets` (~744-800): every drawn armoured player, every
frame, gets 3 arrays, 3 key strings, 3 slot objects and a new `Map`, plus
transform walks. The fix is to cache them per player and refresh on an equip,
grade or stand-in change. `mp-armorgrade` (another player's grade glow) and
`mp-crowdbots` with `BT_CROWD_LOOK` in iron (its `shine` counts) hold it.

### 4. Every drawn player's drawings checked every frame (lane A, checked)

`_remoteBodyArt` runs `sanitizeShirtArt` 7 times (9 with the shirt). Each is a
regular expression over 256 characters and a scan, and the result is a new
object, for every drawn player with a tattoo or print, every frame. A player
with none costs nine quick type checks.

The fix is to remember the answer on the display, keyed by the raw strings.
Sanitising stays at the one door.

### 5. Smaller, each a few lines

- **The player list** (`BroTown.jsx` ~9081, lane B and C, checked) is built
  twice a second with its panel closed. Only the `setPlayerList` is gated.
- **The chat-bubble and emote passes** (`effectsRenderer.js` ~9788, ~9910,
  lane B) build an `Object.entries` of everyone each frame, with nothing to
  draw most frames. Loop the bubbles, and only players with an emote.
- **The crowd pick** (`entityRenderer.js` ~12323) makes its candidates, an
  `Object.entries` and a `new Set` each frame (lane A).
- **`_orderTraitsAndWeapon`** runs up to ten `getChildIndex` scans for each
  player, each frame (lane A). Run it only when facing, headwear or equip
  changes.
- **A `party_state` echo** sets the party with a new object about every 2 s
  (lane B, the server side not checked), so the whole of BroTown re-renders.
  Compare it first.

### Looked at and not worth it

- **Parked copies in the smoothing loop** (lane B's first finding,
  `visualSystems.js` 222). A parked copy has stopped and sits on its server
  place, so each costs a few sums a frame, not the full smoothing.
- **A depth-sort tolerance** (lane A, `depthSort.js applyGroundSort`).
  Letting a 3 px error stand would delay a real crossing, not prevent it, so a
  walking crowd still re-sorts. It also touches the contact-line rules
  (TRAPS §104, §115).
- **Relays and events.** `eventplace.js` already places them (P6 item 2 is
  done). Leaving the unchanged gear keys out was measured and saves the room
  nothing (TRAPS §169).

The big costs are known and listed elsewhere:

- Pixi's render and the draw-list rebuild in a walking crowd (`peer-cull.md`
  "Measured");
- the first-sight look bakes (`held-budget.mjs`).
