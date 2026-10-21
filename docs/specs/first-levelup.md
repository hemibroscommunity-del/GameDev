# A first level-up at the first hand-in (v2.3.3542)

An OPTIONAL change, from the outside reviews of the game as built
(docs/GDD-AS-BUILT.md). One review: *"the tutorial ends before the player has
levelled anything"*. The owner, 2026-10-21: *"I value SIMPLICITY and
INTELLIGIBILITY"*: a player should see the points system in the first minutes,
not find it later.

## What it did

- Mayor Bro's first quest (tut_1, "Into the Blue": four exploding slimes'
  remains) paid 25 gold, the bow and the staff, and NO combat XP.
  - That was the owner's call in v2.3.3335: *"Makes no sense to have to choose
    xp in something you've never used yet. Just remove that little xp
    bonus."*
- Level 2 in a weapon costs 280 XP (`prog3XpRequired(1)`), which is 1,400
  damage at 0.2 XP a point. The quest's four slimes are about 232 damage, so
  about 46 XP.
- So a new player finished the tutorial, holding all three weapons, without a
  level-up or a single point to spend. The Points tab and the level-up burst came
  later, somewhere in the tour.

## What it does now

- **The first hand-in pays 300 XP into MELEE**, as well as the 25 gold, bow
  and staff (`server/src/data.js` and `src/data/gameSystems.js` tut_1:
  `xp: 300, xpTo: 'sword'`, held together by mirror-audit).
- **Exactly one level-up.** With the slimes' ~46, Melee reaches level 2 (280)
  and never 3 (605 in all). The Melee level-up burst plays at the hand-in,
  and the Points tab has 3 Melee points and 3 shared
  ones to spend (the same under one level, v2.3.3538, and the old sum).
- **Still nothing to choose.** The owner's v2.3.3335 rule was about the
  CHOICE (*"Makes no sense to have to choose xp in something you've never
  used yet"*). Melee is the one weapon a player has used by then, so the quest
  NAMES it:
  - the worker pays a quest with `xpTo` into that skill whatever the page
    sends (`quests.js` `_fixedCat`), so a hand-in that names no skill is not
    refused;
  - the page shows no "Choose where to train it" for such a quest
    (QuestPanel `_needsXpChoice`), so *Claim reward* is still the AUTO
    REWARD: it pays at once, no claim window;
  - the "+300 XP" over the XP bar says Melee (`turnInQuest`'s popup `cat`).
- Every other quest is unchanged. A quest that pays XP and names no skill
  still asks where to train it.

## Deploy order

Either half can go first:

- **A new page with an older worker:** the page treats tut_1 as the auto
  reward and sends Melee; the older worker pays no XP for tut_1 and ignores
  it. The page's "+300 XP" popup would be wrong for that hand-in, during the
  deploy only.
- **An older page with a new worker:** the old page sees no XP on tut_1, so
  it sends Melee (its v2.3.3335 fallback); the new worker pays 300 there.

No caps flag: there is nothing to switch on or off for either side.

## If the owner does not want it

Close the PR. The game stays as v2.3.3335 left it: no XP on the first quest.

## Tests

- **`tutorial` suite:** tut_1 pays 300 into Melee, named; a hand-in naming
  another skill (`staff`) still completes, pays its gold, and puts all 300 in
  Melee (counted in total XP, as this suite's player trained the sword
  before), the bow and staff untouched.
- **`tour` suite:** no step of the tour pays combat XP but the Mayor's
  snowmen and this fixed Melee XP.
- **mirror-audit:** the two quest tables agree on `xpTo` too.
- **`mp-questline`** (CI's "playable", a real phone and worker): the first
  hand-in is still the auto reward, with no claim window and no skill to
  choose, and afterwards Melee is level 2 with its points to spend.
