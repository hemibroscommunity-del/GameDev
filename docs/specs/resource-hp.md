# Each tier takes twice as long as the one before (v2.3.3251)

Owner, 2026-10-14: *"I want each tiers unlocks (lvl 5 required, lvl 10
required, etc) to take about 2x longer on average than the previous tier's
lowest level extraction time. You can figure out what "hp" to give the
resources during extraction. Make sense? Go ahead and determine all of those
hp lvls per resource. You can change black steel etc to whatever these values
are."*

## The rule

Each resource is harvested at the level it opens (`GATHER_REQ_LVL`: copper and
iron Mining 1, black steel 5, titanium 10, obsidian 15; minnow and pine 1,
then 5, 10, 15, 20). At that level, each tier takes **twice the swings** of the
tier before it, on average:

| Tier | Hits at its opening level | Mining / fishing (0.65 s a hit) | Woodcutting (0.54 s a hit) |
|---|---|---|---|
| 1 | 10 | 6.5 s | 5.4 s |
| 2 | 20 | 13 s | 11 s |
| 3 | 40 | 26 s | 22 s |
| 4 | 80 | 52 s | 43 s |
| 5 | 160 | 104 s | 87 s |

The times are the swinging only. Every harvest then ends with the same ~1.5 s
gesture, which does not grow.

## The HP that does it

The hits are the hit ladder's (`docs/specs/hit-ladder.md`), so a tier that
opens at a higher level needs more HP for the same number of swings. Iron opens
at Mining 1 beside copper, so its twenty hits are twenty 1s; clownfish and
softwood open at level 5. Each value was solved exactly over the ladder's dice
and rounded to tens (`GATHER_NODE_HP` in `server/src/gathering.js`):

| Tier | Mining | HP | Woodcutting | HP | Fishing | HP |
|---|---|---|---|---|---|---|
| 1 | Copper (1) | 10 | Pine (1) | 10 | Minnow (1) | 10 |
| 2 | Iron (1) | **20** | Softwood (5) | **40** | Clownfish (5) | **40** |
| 3 | Black steel (5) | **80** | Hardwood (10) | **220** | Trout (10) | **220** |
| 4 | Titanium (10) | **440** | Cedar (15) | **840** | Salmon (15) | **840** |
| 5 | Obsidian (15) | **1,680** | Maple (20) | **2,480** | Pike (20) | **2,480** |

It was 5 × (tier + 1) for all three: 10, 35, 60, 85, 110. Rounding keeps every
tier within 2.5% of exactly double: 10, 20, 40.5, 80.5, 160.5 hits on mining;
10, 20.5, 40.5, 80.5, 160.5 on the other two.

### How long it takes, then and now

At the level each one opens:

| Resource | Before | Now | 5 levels on | 10 levels on | 20 levels on |
|---|---|---|---|---|---|
| Iron (Mining 1) | 22.7 s | 13 s | 5.6 s | 2.3 s | 1.2 s |
| Black steel (Mining 5) | 19.8 s | 26 s | 9.8 s | 5.3 s | 2.8 s |
| Titanium (Mining 10) | 10.4 s | 52 s | 28 s | 19 s | 11.5 s |
| Obsidian (Mining 15) | 7.1 s | 104 s | 71 s | 54 s | 36 s |
| Softwood (Woodcutting 5) | 9.7 s | 11 s | 4.2 s | 2.3 s | 1.3 s |
| Hardwood (Woodcutting 10) | 6.2 s | 22 s | 12 s | 7.9 s | 4.9 s |
| Cedar (Woodcutting 15) | 4.6 s | 44 s | 30 s | 22 s | 15 s |
| Maple (Woodcutting 20) | 4.1 s | 87 s | 66 s | 53 s | 38 s |
| Clownfish (Fishing 5) | 11.7 s | 13 s | 5.1 s | 2.8 s | 1.5 s |
| Trout (Fishing 10) | 7.4 s | 26 s | 14 s | 9.5 s | 5.9 s |
| Salmon (Fishing 15) | 5.6 s | 52 s | 36 s | 27 s | 18 s |
| Pike (Fishing 20) | 4.9 s | 104 s | 79 s | 64 s | 46 s |

## What else changed to fit

- **The longest plan.** `GATHER_HITS.MAX_HITS` 40 → 200. At its own opening
  level a top-tier plan is ~160 hits; all but one plan in a million end by 178.
  200 is also the most the game plays (`GATHER_PLAN_MAX`, which mirror-audit
  holds to `MAX_HITS`), so the game plays every plan it is sent.
- **Cooking is unchanged.** Cooking has no levels to unlock per fish, so a
  cook's fish keeps 5 × (tier + 1) and its own 40-hit bound
  (`GATHER_HITS.COOK_MAX_HITS`).
- **The monster shield** (monsters leave a harvester alone) had a 120 s ceiling
  counted from the first swing, and 104 s of hits used up most of it. For a
  planned harvest it now counts from the moment the hits end
  (`_extractionShielded`), so the time after the hits is as long as it always
  was. The timer path, which old clients use, is unchanged.
- **The 2-minute idle logout** now counts a harvest's running hits as play
  (BroTown.jsx). Before, a player watching a 104 s harvest without touching the
  screen would have been logged out just as it finished. Waiting at the gesture
  still counts as idle.

## Deploy order and the kill switch

- The worker sends every plan's own `hp`, so harvests need nothing new from the
  game. The game reads the table only for the HP bar before a plan lands, on
  the timer, and on a locked try (`gatherNodeHpFor`), and only when the worker
  advertises `caps.nodehp`. Without it, the game uses 5 × (tier + 1).
- **Kill switch:** `nodehp: false` in liveflags puts every node back on
  5 × (tier + 1) for every plan after it. To turn the table back on, delete the
  flag.

## Tests

- `server/test/gather-hits.test.mjs` §12 solves the rule again exactly over the
  worker's dice and holds every tier at 1.94–2.06× the one before, each within
  3% of 10, 20, 40, 80 or 160 hits. It also checks: no plan at a resource's own
  level meets `MAX_HITS`; the owner's table; junk types and tiers; plans by the
  node's type (black steel 80, maple 2,480, clownfish 40); cooks unchanged; the
  shield for long and timer plans; the cap; and the kill switch.
- `server/test/mirror-audit.test.mjs` "tier hp": the game's table and function
  equal the worker's for every type and tier, with the table on and off, and
  `GATHER_PLAN_MAX` ≥ `MAX_HITS`.
- `tools/qa/mp/mp-tierhp.mjs` on a phone: an iron vein at Mining 1 plays the
  worker's 20 HP plan of twenty 1s, its bar going from 20/20 to 0/20. The idle
  clock is stamped fresh while the hits run. A softwood tree tried at
  Woodcutting 1 shows a locked try at 40/40.

## Open for the owner

- ~~**XP per harvest does not double.**~~ Answered: the owner said "Yes adjust
  the xp", and it doubles a tier now (163, 326, 652, 1,304, 2,608), so every
  tier pays about the same XP a second at the level it opens. XP also fades for
  what is 5+ levels below you, harvests and fights: `docs/specs/xp-decay.md`.
- **2× is one rule.** Every number above comes from the "twice the tier before"
  target, so 1.5× per tier would be a one-line change to the solver's target and
  the table.
