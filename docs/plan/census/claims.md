# The claims' gains (card K PR 6, v2.3.5186)

Made by `node test/claims-gain.test.mjs --write` (from `server/`). Grand
plan step 4.2, step 1: each claim the worker believes inside a bound, its
gain measured by house bots (`server/test/claimbots.mjs`) on card E's test
room: the take of a maximal liar (it sends the most the judge accepts) an
hour, over an honest player's (it plays as a phone does). For the guard the
take is the damage kept off, so its gain is the honest damage over the
liar's. Where two honest ways exist the better one is the bar the liar is
held to. 1.5 is the bar at which step 4.2 ticks a claim; each gain is a line
that only falls (the suite's `LINES`). Nothing here tightens a judge: step
4.2's tightenings (card K's second block) each come behind its own live flag,
and this bench is how each is measured.

On main 82fb78d, seeded, 4 simulated minutes a run (the cook's an hour).

## The gains

| Claim | The judge | The take | Honest | Liar | Gain | Its spread | Over 1.5 |
|---|---|---|---|---|---|---|---|
| the sword's reach (`reach`) | a melee hit is taken from `PVE_MELEE_RANGE` (400 px, index.js; combat.js _handleMonsterDamage), and a miss never reaches the worker | kills an hour | 360 (the honest sword: in to 90 px, a swing every 600 ms) | 1,064 (every monster within 399 px, each every 210 ms (its lane), unshoved (`noKb`)) | **2.96** | 0.56 | yes |
| a sword's claim labelled a bow's (TRAPS §329) (`bowlabel`) | `slot: 'ranged'` with a bow worn takes the bow's reach (1,490 px, hitproof.js) and five claims a second, and never lowers the guard | kills an hour | 569 (the honest archer: in to 600 px, a shot every 495 ms, each claim when its arrow lands) | 2,228 (standing, five `ranged` claims a second over everything in the bow's reach) | **3.91** | 0.23 | yes |
| the guard beyond #1530's limits (`guard`) | `blocking` is believed with no shield worn (movement.js), and a guard sent with each swing stays up through it (moveclaims.js) | damage taken an hour | 84,339 (the honest sword, its guard down while it swings) | 61,380 (each swing sent with a raised guard pointed at its target, no shield) | **1.37** | 0.49 | no |
| the cooking shield beyond #1530's limits (`cookshield`) | `ex: 'cook'` is believed at a fire the worker saw lit, with no fish (moveclaims.js _cookShieldHolds): 3 s after any attack, 120 px from where it began | damage taken a kill | 224 (the honest sword, its guard down while it swings) | 335 (its own fire by the field; after each kill `ex: 'cook'` with no fish, the 3 s re-arm waited out) | **0.67** | 0.29 | no |
| the move (`move`) | `MOVE_BUDGET`: 500 px a second and a 3 s burst (movement.js), the sprint mark (sprint.js), and no walls on the worker | px of ground an hour | 538,534 (the honest walker: 150 px a second, point to point) | 2,343,073 (point to point at 660 px a second, every other step marked a sprint) | **4.35** | 0.01 | yes |
| the harvest's grade (`harvest`) | the phone's `accuracy` on `node_strike` (gathering.js), believed when its swipe looks a person's (botfp.js); a perfect pays 2 ore | ore an hour | 420 (a phone's grades (45% perfect, 44% good: the bot lab's guess)) | 780 (every strike perfect, at the earliest the worker takes it) | **1.86** | 0.32 | yes |
| the cook's result (`cook`) | the phone's `kind` on `cook_request` (cooking.js): no fire, no start and no gesture are asked of it, only 45 a minute and 2,400 an hour | fish cooked an hour | 1,508 (the honest cook: a fire, the start, its hits and the gesture) | 2,400 (`cook_request` alone, at 45 a minute) | **1.59** | 0.02 | yes |
| the quest hand-in (`quest`) | each objective is read on the worker's own record (quests.js _questObjectiveMet), and a quest pays once | gold (the run's whole take) | 50 (the honest hand-in of a quest it holds) | 50 (every quest the game has, twenty times) | **1** | 0 | no |
| the weapon sale with no take-back (`sale`) | the worker sells its own weapon at its own price (gear.js _weaponSellValue); the only claim is the place in the stash | gold (the run's whole take) | 30 (the honest sale of its five weapons) | 30 (places out of form and repeats, ten rounds) | **1** | 0 | no |
| the local-monster mode (`local`) | `monster_dmg_at` and `player_hurt_by_monster` are relays: the worker passes them on and writes nothing | gold, experience and kills | 0 (an honest phone in the world sends none) | 0 (six hundred of each, a kill and a heal in every one) | **1** | 0 | no |

The spread is the gain's highest less its lowest over five other seeds (`CLAIMS_SEED=a` to `e`, `--gains`): the suite fails a gain past its line by more than it.

### The other honest ways

- `bowlabel`: the honest sword: 329; the liar over it: **6.76**.
- `bowlabel`: the stepping archer: a shot every 495 ms, running in (250 px a second) while its arrows fly: 330; the liar over it: **6.75**.
- `harvest`: a computer holding E (never perfect): 313; the liar over it: **2.49**.

## Claims with no number yet, and why

- **gold taken on the page in two panels** (`pagegold`): FurniturePanel.jsx and DungeonCreatorPanel.jsx lower the gold on the page and send no message: the worker has no furniture or pack record and takes and pays nothing, so an honest phone and a liar keep the same purse. Nothing reaches the worker for a bot to send: the bench cannot reach it in node (the panels' own fix is the page's).

## The honest bots on each disturbance

Each run 30 simulated seconds (card E's `DISTURBANCES`; a hidden tab's minute is added to its run). A refusal is what the worker did not take of what an honest phone sent: a hit in reach that did not land, a strike not paid, a cook not cooked, a step not taken.

| Bot | `deploy` | `hidden` | `fps60` | `fps30` | `fps20` | `fps4` | `delay` | `loss` | `lane_full` |
|---|---|---|---|---|---|---|---|---|---|
| `reach`: the honest sword: in to 90 px, a swing every 600 ms | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `bowlabel`: the honest archer: in to 600 px, a shot every 495 ms, each claim when its arrow lands | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `bowlabel`: the stepping archer: a shot every 495 ms, running in (250 px a second) while its arrows fly | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `move`: the honest walker: 150 px a second, point to point | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `harvest`: a phone's grades (45% perfect, 44% good: the bot lab's guess) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `harvest`: a computer holding E (never perfect) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `cook`: the honest cook: a fire, the start, its hits and the gesture | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `quest`: the honest hand-in of a quest it holds | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `sale`: the honest sale of its five weapons | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `local`: an honest phone in the world sends none | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## What the bench leaves out, said once

- **The honest grades are a guess.** Nothing records the grades real thumbs get; the phone's mix is the bot lab's assumption, and the computer's held key (never perfect) is the other end. Both are listed.
- **Walls.** The worker has no map, so both walkers go in straight lines. An honest walker's way round a wall or the sea only lengthens its route, so the move's gain is a floor.
- **A join is a second door for a place** (lastplace.js): a reconnect is judged with no cap on the time it waited, and a join after a deploy is taken where it says. Not in the move's liar; its own line when its judge is tightened.
- **The healer.** In every fight the bots' health is put back after each blow, so a run measures its claim and never a death and the long walk back. The guard counts what the healer put back.
- **The cooking shield guards no swing**: the first attack ends it, and it comes back only 3 s after the last. Its liar is kept from blows only while it waits, among the monsters, so it is hurt more a kill than the honest sword: its gain is under 1, and the shield's worth is time out of a fight (no gold, ore or experience).
- **The guard's liar raises its guard with every swing**; one that times each raise to a blow's wind-up (a parry: free, 10 stamina back, the monster staggered) is not built, so the guard's gain is a floor.
- **The archer who steps in between shots** (the bow's third honest bot) lands two arrows on one monster closer together than it shot them. Until v2.3.5540 the 210 ms lane dropped the second (`combat.js` `_handleMonsterDamage`); the archer's lane (`arrowlane`) lets one in early, the same claims a minute: it keeps every arrow, and with the switch thrown it loses some (2b).
- **The Wheel's far monsters** are left out of the fights' rooms (claimbots.mjs `nearField`): they never meet a bot.
