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
ticks." Then: "Just add it for every resource gathering process."

Applies to **mining, woodcutting and fishing**. Cooking is not gathering and
keeps its timer.

## What the player sees

- You tap a rock, tree or fishing spot and your character starts working, as
  before.
- Each swing that lands knocks a **number** off the node: your roll for that
  hit, between 1 and your level in that skill. Level 1 always hits for 1.
- The node wears **the monster's health bar** (same art, white ghost trail,
  damage flash, the HP number in the middle), and it drops with every hit. It
  hangs **over the crown** of a tree and **under** a rock or a pond, so it is
  never near your head, where your own HP bar is the same art.
- The bar over your head and the ring on the right button step up with each
  hit instead of creeping on a timer.
- When the node's HP reaches 0, the last blow lands (its clink and debris
  included) and a beat later (`GATHER_HIT_SETTLE_MS`, 220 ms) the window opens
  exactly as it always did: the character stops, the bar flashes, the button
  teaches the gesture, and the gesture finishes the harvest. Nothing about the
  gesture changed.
- Fishing has no blow, so each hit is a **nibble**: a ripple on the water, a
  soft plip and the number. The "fish on the hook" sound still marks the end.

## Numbers

| | |
|---|---|
| Node HP | `5 × (tier level + 1)`: 10 on the first tier (the owner's 10), 35 on a tier unlocked at 6. Every tier takes about ten hits at the level that unlocks it. Only tier 1 spawns today (`_placeGatherNode`). |
| A hit | 1..skill level, uniform. The last hit is the one that empties the node, so no hit lands on a broken node. |
| Pace | one hit per **swing of the art**: the pick's 650 ms loop, the axe's 540 ms, and a 650 ms nibble for the rod. The owner's "1 per second" was a placeholder ("or whatever interval makes the most sense"); a hit that lands on the blow you can see is the sense. |
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

### Where the pieces are

| Piece | File |
|---|---|
| Dice, HP, plan, window, kill switch | `server/src/gathering.js` (`GATHER_HITS`, `_planGatherHits`) |
| Operator view `hitPlan` | `server/src/admin.js` |
| Plan in, hits landed, timer fallback | `src/game/lifeSkillRewards.js` (`applyGatherHits`, `tickGatherHits`) |
| Hits before the window check | `src/ui/BroTown.jsx` (extraction tick) |
| Chunked meter (bar over head + ring) | `src/game/gesturePose.js` (`extractionMeter01`) |
| The node's HP bar | `src/rendering/systems/entityRenderer.js` (`drawNodeHpBar`, the art) + `effectsRenderer.js` (`_drawGatherHpBar`, the place) |
| Swing timing | `src/data/gameSystems.js` (`GATHER_SWING`, `gatherHitTimes`) |

## Wire surface

| Direction | Message | Payload |
|---|---|---|
| client → worker | `extraction_start` | existing `{nodeId, zone, skill}` + **`hitSeq`** (integer 1..1e9). Absent or malformed: the old timer, no reply. |
| worker → client | `gather_hits` *(new, privileged)* | `{seq, nodeId, zone, hp, hits: [..]}`, or `{seq, nodeId, zone, off: true}` when the kill switch is thrown |
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
| **No answer** (refused start, lost socket, a worker that ignores `hitSeq`) | After `GATHER_HIT_PLAN_WAIT_MS` (2.5 s) the client drops to the timer and **re-declares** the attempt without `hitSeq`, so the worker's record follows. |
| **Kill switch** `gatherhits: false` in liveflags (`POST /api/admin/flags`) | Un-advertises the cap for anyone who joins after, and answers a client that still asks with `off`, so it is on the timer at once. |
| **Bad plan** (cannot be played) | Same as no answer: timer + re-declare. |

## Tests

- `server/test/gather-hits.test.mjs`: the dice (ranges, last-hit-crosses-zero,
  the 82% one-shot rate at level 50, `MAX_HITS`), the round trip and the
  record's window, the node's skill over the payload's, the strike window one
  beat each side, the old client, junk `hitSeq`, the kill switch, re-roll
  fishing, the cap's name (TRAPS §117) and `PRIVILEGED_EVENTS`.
- `server/test/mirror-audit.test.mjs` "gather hits": worker and client paces
  and HP agree, and the renderer lines the swing timing is copied from
  (`MINE_DURATION_MS`, the pick's frame 4, `CHOP_FRAME_MS` × `CHOP_COUNT`,
  `CHOP_STRIKE_K`, the 200 ms chop lead, the `Date.now()` frame clock).
- `tools/qa/mp/mp-gatherhits.mjs`: mining, woodcutting and fishing in Frost
  Ridge on a phone. The plan equals the worker's, one number per hit, HP and
  both bars down to 0, each pick and axe hit within a frame or two of the
  renderer's own strike effect, the window on the last hit, paid. Then the
  no-answer, old-client and kill-switch paths, each paid. Screenshots:
  `tools/qa/mp/out/gatherhits-<skill>-hits.png`.
- `tools/qa/mp/mp-cueshow.mjs`: its wind-up read is now 1.4 s apart, since the
  bar steps per hit instead of creeping.

## Not in this change

- Higher-tier nodes. The HP formula is ready for them, but the worker still
  spawns tier 1 only, and the level gate is still switched off
  (`_desktopGather`'s `if (false)`). A level-1 player on a tier sized for level
  51 would face ~260 HP, so turning tiers on should come with a level lock.
- Other players do not see your hits or your node's bar; the hits are yours.
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
