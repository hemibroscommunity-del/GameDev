# Pet trapping: arm a trap, then kill it (v2.3.3120, Phase 2 v2.3.3121, Phase 3 v2.3.3122)

The plan, with every choice the owner made, is `docs/PET-TRAPPING-PLAN.md`.
This spec says what is built and how it works. Code is the truth where the two
differ.

## In one paragraph

Make **box traps** at the Woodworker, one log of any kind each. Target a monster
out in the lands and tap **TRAP**: the button shows your true odds and how many
traps you carry, or says why not ("Requires Trapping 18"). For 15 seconds the
monster is marked; if it dies in that time, however it dies, the trap springs for
every player who armed it and did at least 5% of its damage. The trap shakes 0
to 3 times and then breaks, or, about once in a hundred tries at best, snaps
shut: the monster is your pet. A roll uses one trap. Every roll pays Trapping XP.
The kill pays everyone exactly as it did before.

## The odds (server `trapping.js`, phone `src/data/trapping.js`)

- **Stretch** = the monster's level in fives: 1-5 is stretch 1, 6-10 stretch 2...
- **Best chance** = 1% × 0.8^(stretch − 1): 1%, 0.8%, 0.64%, 0.51%, 0.41%,
  0.33%, 0.26%, 0.21% for stretches 1-8.
- **Your chance** = best × (½ + ½ × (Trapping − monster level) / 20), at most
  the best. Half the best when you first reach the monster's level, the best
  20 levels above it.
- **Above your Trapping level: no arm at all** (the phone greys the button and
  sends nothing; the worker refuses `level`).
- **Nothing else moves the odds.** No count of misses, no combat level, no
  damage or health. The worker keeps no number that could tilt the roll (owner,
  2026-10-06: "leave the odds exactly the same for everyone").
- **The roll** is four checks at the chance's fourth root (Pokémon's shakes):
  P(catch) is exactly the chance, and the checks passed before one failed are
  the shakes the phone draws (0-3). At 1%: 68% break at once, 22% shake once,
  7% twice, 2% three times, 1% catch.

The phone's copy of the table is held to the worker's by mirror-audit at every
Trapping level 1-60 against every monster level 1-45.

## Trapping XP

Every roll pays, caught or not: a harvest's base at the stretch's tier
(`ceil((tier × 1.5 + 5) × 25)`: 163, 350, 538, 725 ... for stretches 1, 2, 3,
4), so a roll pays what a tree of the same stretch pays. Full up to 20 levels
above the monster, then 3% less a level, never under a quarter. A catch pays ten
rolls more. Making a trap pays 40 Woodworking XP. Tune in `TRAPPING` (the XP
section) once real rates are measured; the phone's copy must move with it.

## Pets

- **The record** is `pets:<playerId>` (`server/src/petbook.js`), its own storage
  key: `{v, cap, active, moved, list, journal}`. One GET at join. A worker that
  finds a newer `v` leaves it whole and refuses to touch it (arms and the Pets
  page are refused for that session). Deleted by a character restart. Not in the
  daily `rpgsnap:`.
- **A pet**: `{id, kind, look, home, stage, gold, size, name, lv, xp, at,
  caughtBy, owners, tradeAfter, legacy?}`. The id (`p_...`) is the worker's and
  never changes. `kind` is one of nine (Snowling, Gobling, Mumling, Pebbling,
  Sparklet, Finling, Wisplet, Lurkling, Dewdrop), from the monster's land and the
  look it spawned in; `stage` 2 for levels 21-40 (the land's second-stage
  colours). `lv` starts at the monster's level. About one catch in fifty is
  golden; `size` is 0.85-1.25, Big from 1.18. `tradeAfter` is a day after the
  catch (for Phase 3). `name` is null until its owner names it.
- **Written**: a catch and every page action at once; a miss only counts a try
  (`journal`), in memory, written at most once a minute and on disconnect (the
  regen lesson, handoff rule 4).
- **Old pets** (`lifeSkills.pets`) move in once (`moved`), only from a STORED
  blob, marked `legacy` (they may have been made by a browser in the years the
  join adopted them: usable, never tradeable, like gear with no provenance row),
  their level capped at the owner's Trapping level. The old fields stay empty
  from then on.
- **Names**: 2-16 letters (any alphabet), numbers, spaces, `-` or `'`; spaces
  collapsed; at least one letter or number; no emoji (an emoji in the world's
  outlined text is a known iPhone Safari crash). The same rule on both sides
  (mirror-audit).
- **The pet out with you** follows you, drawn from the pet sheet, and widens
  your loot pickup to 240 px (the v2.3.1200 vacuum, which now reads the record's
  active pet). Pets don't fight: the old "pet combat" (fake bites on your screen
  only) is gone.

## Pet levels (Phase 2, v2.3.3121)

- **The pet out with you earns a tenth of the combat XP each kill pays you**
  (`PETBOOK.XP_SHARE` 0.1, `server/src/petbook.js` `_petbookAddXp`, called from
  the kill's XP loop in `combat.js`). A party share pays the pet a tenth of the
  share. The part under 1 XP is kept on the book in memory (`xpFrac`) for the
  next kill. Only kills: no quest XP, no dungeon-clear bonus.
- **The next level** needs `petXpToNext(lv)` = ⌈25 × 1.08^(lv − 1)⌉: 25 at Lv 1,
  50 at Lv 10, 108 at Lv 20, 503 at Lv 40. A kill pays 10 combat XP at Lv 1 and
  about 23 at Lv 20, so a pet takes about 25 kills of its own level's monsters a
  level at first and about 50 at Lv 20.
- **Never past your Trapping level.** At it the pet earns nothing and holds no
  XP (`petGainXp` sets it to 0 there), so it starts its next level from nothing
  when your Trapping rises. A pet above your level (a trade, Phase 3) earns
  nothing until you catch up.
- **Written** like a try: in memory, at most once a minute (`SAVE_MS`) and on
  disconnect, never per kill (handoff rule 4). A level-up is written at once.
- **Told on the kill's `combat_credit`**: `pet: {id, lv, xp, gain, leveled, cap}`
  when the pet gained (absent otherwise, so the message is what it always was).
  The phone writes the worker's numbers over its copy (`src/game/trapping.js`
  `onPetXp`) and says a level-up over the pet ("Snowball is Lv 5!").
- **On the phone**: each pet's XP bar on the Pets page ("12 / 27 XP", or "At
  your Trapping level"), from the same rule (`src/data/trapping.js` `PET_XP`,
  `petXpView`; mirror-audit at every level to 120). A pet is drawn a little
  bigger as it levels (`petLevelScale`, up to a fifth, Phase 1).

## The journal (Phase 2)

Every kind at both stages, 18 in all, on the Pets page under the pets: its
picture (its shape alone, dark, until you catch one), its land, how many you
caught, your tries, how many golden and your biggest ("Biggest 112%"). "3 of 18
caught" over it. All from the record's `journal` (`kind.stage` → `{tries, n,
gold, big}`), which Phase 1 already kept.

## Beastmaster Bro and his quests (Phase 2)

He stands east of the Woodworker's steps in the Wheel's Brotown
(`src/data/wheelBuildingDoors.js` `WHEEL_TOWNSFOLK`, `cap: 'beastmaster'`), only
against a worker that advertises `caps.beastmaster`. Not "Beastmaster Kai": a
dormant Kai chain keys on that name (`getNpcQuest`).

| Quest | Asks | The worker checks | Pays |
|---|---|---|---|
| `beast_1` Box Traps | make 3 box traps at the Woodworker | `traps_made`, counted by `make_traps` (each trap of a request) | 40 gold, 2 box traps; 3 pine logs on accept |
| `beast_2` Set and Spring | spring 5 traps | `trap_roll`, one a roll at a kill (an arm alone counts nothing) | 100 gold, 5 box traps |
| `beast_3` A Trapper's Eye | reach Trapping 6 | `skill`: `lifeSkills.trapping.level >= 6` at the hand-in | 250 gold, 10 box traps |
| `beast_4` Your Own Beast | catch a pet | `catch`, on a catch | 500 gold, 15 box traps |

- The four objective types are the worker's (`server/src/quests.js`
  `_questObjectiveMet`, one check for every type; an unknown type is never paid).
  Counters live in `_questKills` like a kill quest's and count only while the
  quest is active. `_creditQuestObjective` takes an amount now (a request that
  makes five traps is five).
- **No combat XP** (`xp: 0`): no Melee/Bow/Magic to choose; the hand-in is the
  auto reward. The Trapping XP is in the doing.
- **His line waits on the Mayor's first quest** (`after: 'tut_1'` in
  `QUEST_CHAINS`, read by `getNpcQuest`), so a new player's first steps stay the
  Mayor's.
- **Walking past him** to the Woodworker's door does not stop you to say how his
  quest is going: `quietProgress` (BroTown's proximity opener) opens him by
  himself only to offer or to pay. A tap or E still answers.
- **His line done**, a tap or E on him opens the Pets page (`pets` on his row).
- **His picture** is made by `python3 tools/make_beastmaster.py` from art the
  game has (Diego's figure mirrored, coat green, scarf the Lodge's orange, a
  Snowling at his side) until the owner's own comes (`docs/ART-WISHLIST.md`).
  One 256 × 256 picture, ~0.25 MB decoded, loaded with the Wheel's cast behind
  its loading screen and never in today's town (`wheelOnly`).

## Trading pets (Phase 3, v2.3.3122)

Pets change hands three ways, each through a system that already moves things
of value, and nothing writes a pet into a record but a catch and these:

- **The gate** (`server/src/petbook.js` `_petSellable`): the pet must be yours,
  not out with you ("the pet that's out with you can't be listed"), not an old
  pet moved in from the browser years (`legacy`: usable, never tradeable), and a
  day past its catch (`tradeAfter`). The Pets page says which of yours may go
  and why the others may not (`src/data/trapping.js` `petTradeView`).
- **The trade window** (`trade2.js`, `trade2_pets {ids}`, at most 4 a side):
  validate-at-commit. A staged pet stays in its owner's record until both
  accept; then it is checked again and all the pets move, out then in, in one
  synchronous run with the trade's other debits. A pet released, taken out or
  listed meanwhile, or no room on the other side, cancels the whole trade with
  nothing moved. See `docs/specs/trading.md`, "Pet lane".
- **The auction house** (`store.js` `kind: 'pet'`), listed from the Pets page:
  escrowed in the listing record; bought, taken down or expired, it goes on
  through the same paths as every listing. See `docs/specs/auction-house.md`,
  "Pet listings".
- **The mail** (`inbox.js` `pet`): a buyer with a full collection, or a seller
  offline when a listing ends, gets the pet in the mail. It STAYS QUEUED while
  there is no room (an unknown kind used to be consumed and lost) and lands at
  the next join, which loads the pets record before it drains the mail. The
  Post Office shows it ("Snowball the Snowling, Lv 4").
- A pet keeps its id, name, level, XP and story; the new owner is one more
  owner (`owners`), and a seller taking an unsold pet back is not. Its journal
  entry stays with whoever caught it.
- Kill switch `pettrade: false` (`caps.pettrade`): no new trade or listing; a pet
  already on its way still arrives.

## Where you can trap

Only the Wheel's own monsters (`home`, zone `wheel`): never in a dungeon, never
with you or the monster on the safe ground. You must be within 480 px when you
arm (a bow's or staff's range; a monster tapped on a phone's screen is inside
it). One mark at a time: arming another monster moves it. At most 20 arms a
minute and 10 catches an hour (an arm past the hour's cap is refused, so every
roll that happens stays honest).

## Messages

| Direction | Type | Payload |
|---|---|---|
| phone → worker | `make_traps` | `{log, count}` (count 1-50, clamped to the logs held) |
| worker → phone | `make_traps_result` | `{made, log, xp, leveled, newLevel, traps}` or `{error}` |
| phone → worker | `trap_arm` | `{monsterId}` |
| worker → phone | `trap_armed` | `{monsterId, until, ms, chance, stretch, traps}` or `{monsterId, error, need?}` |
| worker → phone | `trap_result` | `{monsterId, sprung, caught, shakes, pet, chance, stretch, xp, leveled, newLevel, tries, traps}` or `{monsterId, sprung: false, why}` |
| phone → worker | `pet_active` | `{id}` (null: put away) |
| phone → worker | `pet_name` | `{id, name}` |
| phone → worker | `pet_release` | `{id, confirm: true}` |
| worker → phone | `pets_state` | the record `{v, cap, active, list, journal}` (+ `op`, `id`, `error`), or `{unavailable: true}` |
| phone → worker | `trade2_pets` | `{ids}` (v2.3.3122: the pets you offer in the trade window, at most 4) |

Every worker-sent type is in `PRIVILEGED_EVENTS`; every phone-sent type has an
explicit router case and a channel-shim line. `pet_capture` (the old 20% capture)
answers `{captured: false, error: 'retired'}` and touches nothing.

Refusal codes and the phone's words for each: `src/data/trapping.js` `TRAP_WORDS`.

## Caps and kill switches

All lower case; each read in the handler from `_liveFlags` (TRAPS §117):

- `caps.trapping`: the TRAP pop-up, the mark, the shakes. `trapping: false`
  stops every arm and every roll (a mark then costs nothing).
- `caps.trapcraft`: the Woodworker's Traps tab. `trapcraft: false` stops making.
- `caps.petbook`: the Pets page and `pets_state`. `petbook: false` stops naming,
  setting active and releasing; pets stay, catches still land, the vacuum works.
- `caps.petlevels` (v2.3.3121): pets earn XP. `petlevels: false` stops it; levels
  earned stay.
- `caps.pettrade` (v2.3.3122): the trade window's pet lane, pet listings and
  the Pets page's Sell. `pettrade: false` refuses new ones; deliveries continue.
- `caps.beastmaster` (v2.3.3121): Beastmaster Bro stands by the Woodworker.
  `beastmaster: false` un-advertises him (a joining phone does not spawn him);
  quests already active still count and hand in.

`caps.pets` is no longer advertised (nothing reads it since the old trap button
went). Against an old worker the phone shows none of this, and the farm's Pet
House opens the old panel.

## On the phone

- **TRAP pop-up** (`src/ui/panels/TrapButton.jsx`, `src/game/trapping.js`): the
  door prompt's slot, shown while a Wheel monster is targeted. T on a keyboard.
- **The mark and the shakes** (`src/rendering/trapFx.js`): drawn in code, no
  pictures. The new pet stays in the trap until it snaps, then walks out to you.
- **The card** (`src/ui/panels/TrapCatchCard.jsx`): what you caught, its level,
  Golden / Big, and a name field.
- **The Traps tab** (`src/ui/panels/buildings/TrapsTab.jsx`), a third choice
  beside Bow and Staff at the Woodworker.
- **The Pets page** (`src/ui/mobile/dash/PetsPanel.jsx`): More → Pets, and the
  farm's Pet House. Take out / put away, rename, release (asks first), and your
  tries at each kind.
- **The pet sheet**: `public/sprites/pets/pet-sheet.png` (768 × 448, 1.31 MB
  decoded), made by `python3 tools/make_pet_sheet.py` from the monsters' own walk
  art, loaded on the loading screen (`preloadWorldAnimations`). Colours are
  sprite tints (stage two, golden); only the blue slime's recolour is baked.
- **Profile cards** show your real pet, or none (the sample Frost Fox is gone).

## Tests

- `server/test/trapping.test.mjs` (121 checks): caps, the first-connect guard,
  making traps (forged logs, clamps), every arm refusal costing nothing, the
  Trapping-level boundary, rolls at the armer's kill and at someone else's, the
  5% rule at its edge, the mark running out, one trap a roll, the kill's payouts
  unchanged, a catch written at once, the slime's deferred death, the odds table
  at every stretch, the odds unchanged after 60 misses, the shakes' split
  (stubbed and sampled), XP, a broken skill shape, the Pets page's actions and
  name rule, `__proto__` everywhere, old pets moving in once, a newer record left
  whole, the disconnect flush, a restart, a respawn, the retired capture, forged
  events, and the test kit's lever.
- `server/test/pets.test.mjs`: the retired capture and the loot vacuum on the
  record's active pet.
- `server/test/mirror-audit.test.mjs`: the odds, XP, recipe, kinds, name rule
  and refusal words, phone against worker.
- `tools/qa/mp/mp-trapping.mjs` (24 checks on a phone against a real worker):
  `node tools/qa/mp/run.mjs trapping`.
- Phase 2: `trapping.test.mjs` §16 (pet XP: the share, the fraction kept, the
  cap, combat_credit, written on a level-up, once a minute and on disconnect,
  the switch) and §17 (Beastmaster Bro's four quests through the real
  messages, an unknown objective type never paid, `__proto__`) -- 155 checks in
  all; mirror-audit's pet XP rule; test-world-core's "Beastmaster Bro stands by
  the Woodworker"; `tools/qa/mp/mp-beastmaster.mjs` (16 checks on a phone: him
  by the Woodworker with his badge, "Box Traps" accepted, made and claimed, a
  pet's level-up from a kill, the XP bar, the journal, a tap opening the Pets
  page): `node tools/qa/mp/run.mjs beastmaster`.

The admin test kit's lever, `POST /api/admin/dev/trapping` (`level`, `traps`,
`logs`, `next: 'catch' | 'miss'`, `kill`, and since v2.3.3121 `xp`: what that
kill pays in combat XP), sets up a catch without a hundred kills. `POST
/api/admin/dev/quests` takes `except` (a quest-id prefix left alone: `beast_`).
They are the admin key's, like every dev op: no socket message.

- Phase 3: `server/test/pettrade.test.mjs` (51 checks: the gate, the trade
  window's lane at full collections and when a pet goes meanwhile, a
  disconnect, the auction house's list / buy / take-down / expiry, a full
  buyer's mail landing at the next join, never twice, `__proto__`) and
  `tools/qa/mp/mp-pettrade.mjs` (14 checks on two phones: the Pets page, the
  trade window's lane, review and receipt, a listing bought at the auction
  house). The test kit's `/dev/trapping` takes `pet: {home, level, tradeable}`.

## Not built yet (later phases of the plan)

The land wards, other players seeing your pet, more Pet House space (Phase 4).
