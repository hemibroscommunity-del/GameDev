# Gathering hits — the node has HP (v2.3.2956)

Owner, 2026-09-30: "a resource extraction experience in a game where the
resource has something akin to an hp bar and the player ticks away at it and
the tick range is determined by their skill level in harvesting that resource.
So like level 1 would do 1 tick per second (or whatever interval makes the most
sense) until the 10 ticks assigned to the resource are exhausted. At that point
the user would have to do the gesture to complete the resource extraction.
Level 2 might be a tick from 1-2 now where extracting the resource is quicker.
Level 3 (mining let's say) is now a 1-3 tick out of the 10 assigned to the
basic tier resource. The next tier resource would have a higher max number of
ticks." Then: "Just add it for every resource gathering process." And then:
"Make it appear for cooking too. And you can remove the status bar above the
player head now since the HP-like bar will replace that."

Applies to **mining, woodcutting, fishing and cooking**. The wind-up bar that
hung over your head (v2.3.2514) is gone: the node's HP bar does its job now,
in every phase (below).

## What the player sees

- You tap a rock, tree, fishing spot or your campfire and your character
  starts working, as before.
- Each swing that lands knocks a **number** off the node: your roll for that
  hit, between 1 and your level in that skill. Level 1 always hits for 1.
- The node wears **the monster's health bar** (same art, white ghost trail,
  damage flash, the HP number in the middle), and it drops with every hit. It
  appears the moment the worker's plan does (one round trip, well inside the
  first swing).
  - ~~It hangs **over the crown** of a tree and **under** a rock, a pond or the
    campfire, so it is never near your head, where your own HP bar is the
    same art.~~
  - **Since v2.3.3027 it is over the gatherer's head, as large as your HP
    bar.** The owner: *"Ticks for the resource extraction is too hard to see.
    You can make it as large as the normal hp bar and just hide the player
    name plate and health bar during extraction."* While the harvest is open
    (`waiting` or `ready`, and not over a corpse), your name plate and HP bar
    step off the band over your head (`entityRenderer selfGathering`). The
    node's bar takes their place at your HP bar's 76 x 22, against the
    monster's 44 x 13, with its number in your HP number's type
    (`drawNodeHpBar` `big`).
    - The miner and the angler are your own figure (`S._selfBand`).
    - The lumberjack and the cook stand in for it with your figure hidden, so
      the band is put over the stand-in's boots (`bandOverBoots`, at
      `chopStandInSpot` / `cookStandInSpot`).
    - The plate and the bar come back the frame the harvest ends.
- The ring on the right button steps up with each hit instead of creeping on
  a timer. **There is no bar over your head any more** — the node's bar
  replaced it (owner, second message).
- When the node's HP reaches 0, the last blow lands (its clink and debris
  included) and a beat later (`GATHER_HIT_SETTLE_MS`, 220 ms) the window opens
  exactly as it always did: the character stops, the button teaches the
  gesture, and the gesture finishes the harvest. The node's empty bar stays up
  and **calls for the gesture** — it pulses in a gold halo while nobody is
  gesturing, the flash the bar over the head used to give (v2.3.2514/2760's
  reason holds: a frozen character over a still bar reads as a game that has
  stopped). It holds still while you gesture, and goes when the harvest pays
  or is abandoned. The gesture's own progress is the ring's, as it always was.
- Fishing has no blow, so each hit is a **nibble**: the number and the
  pond's bar, nothing else. No splash and no sound: "reeling is the ONLY splash
  moment" (owner, v2.3.1445), and the wait before the bite has always been
  quiet. The "fish on the hook" sound still marks the end.
- **Cooking**: the fish on the pan has the hit points, and each hit is a
  **grease pop** — the pan's one beat — with its number over the pan. The
  grease used to pop on its own 650 ms clock through the wind-up; in a cook
  with hits it pops on the hits instead, at the same pace, so the number and
  the pop are one event. The bar hangs under the fire.
- On the old timer (see "the ways back" below) the node's bar still shows,
  draining smoothly with the clock and with **no number**, because nothing
  was hit.

## Numbers

| | |
|---|---|
| Node HP | `5 × (tier level + 1)`: 10 on the first tier (the owner's 10), 35 on a tier unlocked at 6. Every tier takes about ten hits at the level that unlocks it. Only tier 1 spawns today (`_placeGatherNode`). |
| A cook's HP | the same formula off the FISH's tier (`_fishTierLvl`): a minnow 10, a clownfish 35, a trout 60. Fishing spots are tier 1, so a minnow is all a player catches today; the others are older catches or trades. A level-1 cook on a trout meets `MAX_HITS` (26 s of hits). |
| A hit | 1..skill level, uniform. The last hit is the one that empties the node, so no hit lands on a broken node. |
| Pace | one hit per **swing of the art**: the pick's 650 ms loop, the axe's 540 ms, a 650 ms nibble for the rod, and the pan's 650 ms grease beat. The owner's "1 per second" was a placeholder ("or whatever interval makes the most sense"); a hit that lands on the blow you can see is the sense. |
| Level 1, first tier | 10 hits: ~6.5 s on a rock (the old timer was 4 s), ~5.4 s on a tree |
| Average hits on 10 HP | level 1: 10 · 2: 6.9 · 3: 5.3 · 5: 3.8 · 10: 2.4 (10% one-shot) · 20: 1.6 (55% one-shot) |
| `MAX_HITS` | 40: a bound no live node can reach. A far-under-levelled player on a future high tier would otherwise get a plan hundreds of hits long; the 40th hit takes whatever is left. |
| Resources per hour | unchanged in kind: one node per skill per zone and a 20 s respawn still set the ceiling, so the anti-bot hour cap (`HARVEST_HOUR_CAP`) needs no change. |

All of it lives in `GATHER_HITS` (`server/src/gathering.js`) and its client
mirror `GATHER_SWING` / `gatherNodeHp` (`src/data/gameSystems.js`).
`mirror-audit.test.mjs` fails if the two drift, and also pins the renderer
lines the swing timing is copied from (below).

## How it is built

### The worker rolls, the client plays

- `extraction_start` carries **`hitSeq`**, a per-attempt counter. The worker
  (`_planGatherHits`) rolls the hits off the **node's** skill (`tree` →
  woodcutting), never the payload's `skill`, so a tree cannot be cut at your
  mining level. It answers **`gather_hits`** `{seq, nodeId, zone, hp, hits}`
  privately and rewrites the extraction record's window to the plan:
  `(hits − 1) × swing ms`, no jitter.
- The strike that follows the gesture is validated against that window by the
  existing too-early check (`_handleNodeStrike`), now reading the record's
  own `jitter` (0 for a plan, ±15% for the timer). The per-session
  `_extractionLatencies` telemetry is measured from that same bound, so for a
  plan it reads "settle beat + first-hit phase + gesture time". Nothing scores
  it (botfp reads the swipe fingerprint, not latency); it is for offline
  review only, as before.
- **Why the worker rolls (and why this is not TRAPS #4).** #4 forbids
  server-rolling the cook minigame because its outcome is the player's
  timing. These hits are pure dice off the skill level, with no player input,
  which is exactly the kind of number rule zero gives the server. The gesture,
  which is timing, stays client-graded.
- **A cook** (`_planCookHits`) asks the same way, naming its fish instead of
  a node — `extraction_start {skill: 'cooking', fishKey, hitSeq}`; the worker
  has never seen a campfire — and gets the same `gather_hits`, carrying the
  `fishKey` back. The dice are the cooking level, the HP the fish's tier.
  **Nothing holds the cook to it**: the worker keeps no record, and
  `cook_request` is unchanged (its bounds stay the flat 1.2 s floor, 20 a
  minute and botfp). Refusing cooks whose client and worker disagree is what
  v2.3.1432 removed — a floor read off the worker's view of the level
  silently ate legit cooks — so these are numbers to watch, rolled by the
  worker because dice are the worker's. For the same reason a cook has no
  re-roll memory: with nothing enforced, a short plan is a modified client's
  to skip anyway. Before this change a cook sent no `extraction_start` at
  all, and an old client still does not.
- **The cook's shield had to grow.** "Monsters leave a cook alone"
  (`_extractionShielded`, v2.3.1765) lapsed 30 s after a cook began
  (`COOK_SHIELD_MS`), sized for a cook of "an open delay (≤10 s) plus a 3.5 s
  window". Hits make the wind-up up to 26 s (`MAX_HITS`), the gesture is ~6 s
  since v2.3.2761, and `ready` has waited for you since v2.3.1416, so the
  shield ran out mid-flip. Measured on a headless cook: it dropped exactly
  30 s in, with the pan still being flipped; in `mp-gatherhits`' first
  cooking run (in Frost Ridge) the cook was never paid and the player woke in
  town. It is the node path's 120 s now, for the node path's reason (what a
  liar buys is standing still, unable to attack); every other bound is
  unchanged.
- **No re-rolling by restarting.** Restarting on the same node within 60 s
  (`REUSE_MS`) replays the same hits with a fresh clock, so starting again to
  shop for a short plan buys nothing. A paid harvest clears it, so the next
  harvest of the respawned node rolls fresh. It is not a wall: the memory is
  the single extraction record, so a start on another node, a start without
  `hitSeq`, an attack or a reconnect in between clears it. A per-node memory
  would buy nothing yet, because a modified client can already strike with no
  record at all, which the worker accepts with no timing check (the lenient
  legacy branch of `_handleNodeStrike`). Harden both together when that branch
  is retired.

### Landing on the blow

The wind-up animations are **free-running loops on `Date.now()`**, the frame
clock (`pixiRenderer`): the miner's pose loop (650 ms, 14 frames, the pick
lands entering frame 4) and the lumberjack stand-in's (12 frames × 45 ms, the
axe bites on frame 9, its sound and chips 200 ms later). So `gatherHitTimes`
schedules each hit on **the next blow instant of that clock**, one swing
apart, no sooner than 90 ms after the plan arrives. No animation is restarted
or retimed, and nothing pops when a plan lands. The window opens 220 ms after
the last hit rather than on it: at `ready` the body freezes on the raised pose,
and opening on the very frame of the last hit froze the pick a hair before it
landed (the browser test caught the missing strike). That is always later than
the worker's bound, so it costs the anticheat nothing. The pick's clink, the debris
and the wood chips already fire on those exact frames, so the number arrives
with them. The browser test measures this against the renderer's own effect
timestamps, not against the arithmetic above.

A cook has no blow and no clock-bound loop to land on (the cook's 24-frame
pan-shake runs at 60 ms a frame with no strike in it), so its hits run on the
same even 650 ms beat as the rod's, and the renderer turns the pan's grease
over to them: from the plan's arrival the grease pops on each hit as it lands
and on nothing else, and before the plan (one round trip) and at `ready` it
runs on its own clock as it always did. `mirror-audit` pins the grease beat to
the cook's swing, and `mp-gatherhits` holds each hit against the grease the
renderer actually stamped.

Back from a backgrounded tab (an iPhone app switch), every hit that fell due
while away still counts, but only the latest one pops, so there is no burst of
ten numbers in one frame. No hits land while the player is dead (the same test
as `selfCorpseUp`, including its 3.5 s bound), and the node's bar steps aside
for the corpse like every other harvest visual.

### Where the pieces are

| Piece | File |
|---|---|
| Dice, HP, plan, window, kill switch | `server/src/gathering.js` (`GATHER_HITS`, `_planGatherHits`, `_planCookHits`) |
| Operator view `hitPlan` (the latest attempt, node or cook) | `server/src/admin.js` + `_gatherHitPlanFor` |
| Plan in, hits landed, timer fallback | `src/game/lifeSkillRewards.js` (`applyGatherHits`, `tickGatherHits`) |
| Hits before the window check | `src/ui/BroTown.jsx` (extraction tick) |
| Chunked meter (the ring; the node's bar reads it too) | `src/game/gesturePose.js` (`extractionMeter01`) |
| The node's HP bar: hits, timer drain, the call at ready | `src/rendering/systems/entityRenderer.js` (`drawNodeHpBar`, the art; v2.3.3027 `big`, `selfGathering`, `bandOverBoots`, `S._selfBand`) + `effectsRenderer.js` (`_drawGatherHpBar` / `_gatherBand` / `_nodeHpBarAt`, the place and the phase) |
| A cook's grease on its hits | `src/rendering/systems/effectsRenderer.js` (`_updateExtractionCue`, the grease beat) |
| Swing timing | `src/data/gameSystems.js` (`GATHER_SWING`, `gatherHitTimes`) |
| The bar over the head | removed: `_drawWindupBar` and `window.__btWindupBar` are gone |

## Wire surface

| Direction | Message | Payload |
|---|---|---|
| client → worker | `extraction_start` | existing `{nodeId, zone, skill}` + **`hitSeq`** (integer 1..1e9). Absent or malformed: the old timer, no reply. A cook: `{skill: 'cooking', fishKey, hitSeq}`, answered and not recorded. |
| worker → client | `gather_hits` *(new, privileged)* | `{seq, nodeId, zone, hp, hits: [..]}`, or `{seq, nodeId, zone, off: true}` when the kill switch is thrown; for a cook `{seq, fishKey, hp, hits}` / `{seq, fishKey, off: true}` |
| `state_sync.caps` | **`gatherhits`** | the client asks for hits only when it is advertised |

`extraction_start` was already on the client's send allowlist (TRAPS #18), so
no new passthrough was needed.

## Deploy order and the ways back to the timer

Every way out of the hits ends on the old `computeOpenDelay` timer, and every
one ends in a paid harvest (checked live by `mp-gatherhits`):

| Case | What happens |
|---|---|
| **Old worker** (no cap) | The client never asks; the timer, exactly as before. |
| **Old client** (no `hitSeq`) | The worker keeps that client's timer record and never holds it to a plan it did not play. |
| **No answer** (refused start, lost socket, a worker that ignores `hitSeq`) | After `GATHER_HIT_PLAN_WAIT_MS` (2.5 s) the client drops to the timer and **re-declares** the attempt without `hitSeq`, so the worker's record follows. A cook does not re-declare: the worker keeps no cook record to re-stamp. |
| **Kill switch** `gatherhits: false` in liveflags (`POST /api/admin/flags`) | Un-advertises the cap for anyone who joins after, and answers a client that still asks with `off`, so it is on the timer at once. **To turn hits back on, DELETE the flag** (the test panel does): every worker spreads its liveflags over its caps, so a stored `gatherhits: true` would make a worker rolled back to before this change advertise a cap it cannot honour. Its clients would then wait the 2.5 s plan timeout on every harvest before the timer, paid but slow. |
| **Bad plan** (cannot be played) | Same as no answer: timer + re-declare. |

## Tests

- `server/test/gather-hits.test.mjs`: the dice (ranges, last-hit-crosses-zero,
  the 82% one-shot rate at level 50, `MAX_HITS`), the round trip and the
  record's window, the node's skill over the payload's, the strike window one
  beat each side, the old client, junk `hitSeq`, the kill switch, re-roll
  fishing, the cap's name (TRAPS §117) and `PRIVILEGED_EVENTS`; and a cook's
  hits (section 10): the fish's HP by tier, the cooking level's dice, the
  fishKey echoed, no record kept, `cook_request` held to nothing new, the
  operator view, junk, the kill switch.
- `server/test/mirror-audit.test.mjs` "gather hits": worker and client paces
  and HP agree, and the renderer lines the swing timing is copied from
  (`MINE_DURATION_MS`, the pick's frame 4, `CHOP_FRAME_MS` × `CHOP_COUNT`,
  `CHOP_STRIKE_K`, the 200 ms chop lead, the `Date.now()` frame clock, the
  pan's grease beat and its hit-driven pop).
- `tools/qa/mp/mp-gatherhits.mjs`: mining, woodcutting, fishing and a cook in
  Frost Ridge on a phone. The plan equals the worker's, one number per hit,
  the node's bar and the button's ring (read off its SVG) down to 0, each pick
  and axe hit within a frame or two of the renderer's own strike effect, each
  cook hit on a grease pop and no grease between them, the window on the last
  hit with the empty bar calling for the gesture, paid. Then the no-answer
  path for a node and for a cook (the bar drains on the timer with no
  number; the cook does not re-declare), the old client and the kill switch,
  each paid. Screenshots: `tools/qa/mp/out/gatherhits-<skill>-hits.png`.
- `tools/qa/mp/mp-cueshow.mjs` and `mp-gcue.mjs` read the node's bar where
  they read the bar over the head: it drains through the wind-up and, empty,
  calls for the gesture at `ready`.

## Not in this change

- Higher-tier nodes. The HP formula is ready for them, but the worker still
  spawns tier 1 only, and the level gate is still switched off
  (`_desktopGather`'s `if (false)`). A level-1 player on a tier sized for level
  51 would face ~260 HP, so turning tiers on should come with a level lock.
- Other players do not see your hits or your node's bar; the hits are yours.
- Holding a cook to its plan. `cook_request` keeps its own bounds; see "The
  worker rolls, the client plays" for why that is a choice, not a gap.
- **A pre-existing trust hole this gives a new payoff (found in review).** On a
  player's FIRST connect, `join.js` copies `lifeSkills` from the client
  unchecked (`{ ...msg.data.rpgLifeSkills }`), while every sibling field in
  that bootstrap block is capped, and the block's own comment names the threat
  ("Cheaters who localStorage-tamper before their first ever connect"). A
  forged mining 1000 now rolls 1-hit plans, so it wins a contested node by ~6 s
  against a level-1 player (the old timer's 2 s floor capped that at ~2 s).
  Resources per hour are unchanged (respawn and `HARVEST_HOUR_CAP`). The same
  hole already pays far more elsewhere: forged blacksmithing opens the weapon
  forge, amulet and hardening tiers, and the blob can carry pets and gems. The
  fix is a sanitizer for the whole bootstrap `lifeSkills` (levels, pets, gems),
  which is its own change and needs an owner decision on the cap for migrating
  single-player veterans, so it is not folded in here.
