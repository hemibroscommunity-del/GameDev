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
