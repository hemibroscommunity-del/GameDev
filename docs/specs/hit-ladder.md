# The hit ladder — each level adds a 10% chance of one more (v2.3.3229)

Owner, 2026-10-14: *"I want a different life skill progression system where
after the first level you get a 10% chance of hitting 1 number higher. The
next level you get a 10% chance of hitting 1 number higher than that. So lvl 2
has a 10% chance of hitting 2 otherwise 1. Lvl 3 has a 10% chance of hitting 3
otherwise 1. Etc. the number 1 will eventually get replaced by the 2 as more
10% chances get added with each level."*

Every harvest and every cook is a run of **hits** that knock a number off the
resource's HP bar (v2.3.2956, `docs/specs/gathering-hits.md`). Until now each
hit was an even roll from 1 to your skill level. Now it is the **hit ladder**.

## The rule

A hit is a ten-sided die read down from your level. Its top face hits for your
level, the face under it one less, and so on down to nine less. No face hits
for less than 1, so below level 10 every face that would be under 1 is a 1.

| Level | What one hit can be |
|---|---|
| 1 | always 1 |
| 2 | 1 (90%) · 2 (10%) |
| 3 | 1 (80%) · 2 (10%) · 3 (10%) |
| 5 | 1 (60%) · 2–5 (10% each) |
| 8 | 1 (30%) · 2–8 (10% each) |
| 10 | 1–10 (10% each) |
| 11 | 2–11 (10% each). The 1 is gone, "replaced by the 2". |
| 12 | 3–12 (10% each) |
| 20 | 11–20 (10% each) |
| L ≥ 10 | L−9 to L (10% each) |

In code that is `max(1, level − 9 + face)` for a face from 0 to 9
(`gatherHitRoll` in `server/src/gathering.js`).

## What it does to the pace

The average hit, against the old even roll:

| Level | 1 | 2 | 3 | 5 | 8 | 10 | 11 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|
| Old (1 to L) | 1.0 | 1.5 | 2.0 | 3.0 | 4.5 | 5.5 | 6.0 | 8.0 | 10.5 | 15.5 |
| **Ladder** | 1.0 | 1.1 | 1.3 | 2.0 | 3.8 | 5.5 | 6.5 | 10.5 | 15.5 | 25.5 |

**Slower than before below level 10, exactly the same at 10, faster above
it.** A slow start that pays off.

Hits to break a resource on average (each hit is one swing: 0.65 s for a pick,
rod or pan, 0.54 s for an axe):

| Resource (HP) | Opens at | At that level, old → ladder | Level 5 | Level 10 | Level 15 | Level 20 |
|---|---|---|---|---|---|---|
| Copper, pine, minnow (10) | 1 | 10 → 10 | 3.8 → 5.5 | 2.4 → 2.4 | 1.8 → 1.4 | 1.6 → 1.0 |
| Iron (35) | Mining 1 | 35 → 35 | 12.1 → 18.0 | 6.9 → 6.9 | 5.0 → 3.8 | 3.9 → 2.8 |
| Softwood, clownfish (35) | 5 | 12.1 → 18.0 | | | | |
| Black steel (60) | Mining 5 | 20.4 → 30.5 | | 11.5 → 11.5 | 8.1 → 6.2 | 6.3 → 4.3 |
| Hardwood, trout (60) | 10 | 11.5 → 11.5 | | | | |
| Titanium (85) | Mining 10 | 16.0 → 16.0 | | | 11.2 → 8.6 | 8.7 → 6.0 |
| Cedar, salmon (85) | 15 | 11.2 → 8.6 | | | | |
| Obsidian (110) | Mining 15 | 14.3 → 11.0 | | | | 11.1 → 7.6 |
| Maple, pike (110) | 20 | 11.1 → 7.6 | | | | |

The slowest new case is black steel at Mining 5: about 30 hits, ~20 s of
swinging (it was ~13 s). About one plan in 80 there meets the 40-hit bound
(`MAX_HITS`), whose 40th hit takes whatever is left, as it always has. A cook
uses the same table off the fish's tier and your Cooking level.

From level 19 a first-tier resource (copper, pine, minnow) is always one hit.
That was already possible before (10% of hits at level 10), so the fastest an
honest harvest can come round (`HONEST_CYCLE`) and the anti-bot caps sized from
it do not move.

## What changed

| Piece | File |
|---|---|
| The die, `gatherHitRoll(level, r, ladder)`, `GATHER_HITS.LADDER` 10, the kill switch `_hitLadderOff` | `server/src/gathering.js` |
| `caps.hitladder` | `server/src/join.js` |
| The game's copy of the odds, `gatherHitOdds` / `gatherHitOddsText` | `src/data/lifeSkills.js` |
| Skills → Mining, Woodcutting, Fishing, Cooking: **Each hit** and **At Lv N+1** lines | `src/ui/mobile/dash/SkillsPanel.jsx`, `src/ui/mobile/sheet/skillsModel.js` |
| A test lever: any life skill at any level, `/dev/lifeskill {skill or 'hits', level}` | `server/src/devtools.js`; the test panel's "Gathering + cooking level" buttons (`src/ui/panels/DevPanel.jsx`) |

Nothing else moves. The worker already rolled every hit and the game plays
whatever plan it is sent, so harvesting itself needed no client change: the
HP, the swing, the strike's window (read off the plan's own length), the
re-roll memory and the wire are all as they were.

The Skills page's old "Benefit: Node extraction opens 0.25s sooner per level
above its tier" line described the wind-up **timer**, which runs only when the
worker rolls no hits. It shows only then now; with hits on, the two odds lines
take its place.

## Deploy order and the kill switch

- **The dice are the worker's alone.** A new worker rolls the ladder for every
  client, old or new: the client only plays the plan.
- **The Skills page prints the odds this worker rolls.** With `caps.hitladder`
  it prints the ladder's; against an older worker (no flag) it prints the even
  1 to L that worker rolls; with no `caps.gatherhits` it prints no hit lines.
- **Kill switch:** `hitladder: false` in liveflags (`POST /api/admin/flags`,
  lower case, TRAPS §117) puts the dice back to 1 to L for every plan rolled
  after it, and un-advertises the cap, so the Skills page prints those odds at
  the player's next join. To turn the ladder back on, delete the flag.

## Tests

- `server/test/gather-hits.test.mjs` §11: every face of the die at levels
  1–120 (level 2 is 1 on nine faces and 2 on one; level 11 has no 1), a higher
  draw never a lower hit, junk levels and draws, real dice at level 3 (1 about
  80%, 2 and 3 about 10% each), the average at levels 5 and 15, the plans a
  level-11 miner is sent (no 1), a cook at Cooking 11 (no 1), the cap and its
  name, and the kill switch (even 1 to 3, level 50 one-shots a first-tier node
  82% again, 1s back in the plans). §1's high-level check is now "level 50
  always one-shots" (41–50). The test lever's checks follow.
- `server/test/mirror-audit.test.mjs` "hit ladder": the game's odds equal the
  worker's die face by face on both dice at every level, and the printed words
  for levels 1, 2, 3, 8, 10, 11 and 20.
- `tools/qa/mp/mp-hitladder.mjs` on a 390 and a 360 px phone: the Mining page
  at levels 3, 8 and 11 says exactly the odds above, whole and on the screen;
  Cooking too, Farming not; an older worker's even odds and the old timer's
  line; and a copper vein mined at Mining 11 plays the worker's own plan with
  no 1 in it, every number popped one of its hits, the bar down to 0.
  Pictures: `tools/qa/mp/out/hitladder-<width>-lv<L>.png`.

## Open for the owner

- **10%** is one number (`GATHER_HITS.LADDER`, the die's ten faces, and its
  mirror `GATHER_HIT_LADDER`). Twenty faces would be 5% a level and the 1 would
  last to level 20.
- **The resources' HP** were sized for the old dice. At the level each one
  opens, the ones that open at 5 now take about half as long again (softwood
  and clownfish 12 → 18 hits, black steel 20 → 30), the ones at 1 and 10 take
  the same, and the ones at 15 and 20 are quicker. If level 5's resources feel
  slow, their HP is the knob, not the ladder.
