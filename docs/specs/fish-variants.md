# Rare fish: albino and large, weighed, with records (v2.3.3948)

The owner, 2026-11-02 (the playtest list, lane M):

> *"Add a 1% chance of catching an albino version of whatever fish you're
> trying to catch. Consuming adds a one time 5 achievement point bonus. Also
> add a 0.1% chance of catching 'large' whatever fish you're fishing.
> Consuming adds 10 achievement points (one time). It also heals double.
> Doing an 'inspect' will roll for finding the weight of the fish. Include
> leaderboards for largest caught types of fish (triggered by inspection)."*

The decisions below were made up front by the orchestrating session (the
owner asked it to), and this PR builds them.

## What a player sees

- **The catch.** Each fish caught rolls on the server: **0.1% large**, else
  **1% albino**, else the plain fish -- never both. The popup over your head
  says it: *"An albino Trout!"* (pale pink) or *"A LARGE Salmon!"* (gold).
- **The bag.** A rare fish is its own item: "Albino Trout", "Large Trout",
  never stacked with the plain trout, and still so cooked ("Cooked Albino
  Trout"). No new art: an albino is the species' picture washed pale and a
  little pink (a CSS filter, in the bag only), a large one wears a small brass
  **L**.
- **Eating.** A large fish heals **double** (raw or cooked; both heal ladders).
  The first albino of each species you eat: **+5 AP**; the first large of each
  species: **+10 AP** (one time each, ten achievements: "Albino Trout",
  "Large Pike"...). A fish bought or traded counts too.
- **Inspect.** On any fish in the bag (raw or cooked), the item card's
  **Inspect** weighs ONE catch of it, once: *"This Trout weighs 2.4 kg"*, your
  best of the kind, a place on its board if it took one, and how many more you
  have to weigh. A fish that was not caught (bought, traded, from the daily
  chest) has no catch to weigh: *"You've weighed all your Trout."* A cooked
  fish weighs its raw catch.
- **Records.** More → Ranks → **Biggest fish**: one board a species, the ten
  heaviest weighed, one row a player (their best), name and kilos, an albino or
  large one tagged. The weigh-in card's **Records** opens it on that species.
- **Diego** pays and charges an albino **x5**, a large one **x10** the plain
  fish (he still pays half what he charges).

## The numbers (server/src/fishlog.js `FISHLOG`, mirrored in src/data/fishVariants.js)

| fish | plain (and albino) | large (3-5x the plain biggest) |
|---|---|---|
| Minnow | 0.05 - 0.2 kg | 0.6 - 1.0 kg |
| Clownfish | 0.1 - 0.4 kg | 1.2 - 2.0 kg |
| Trout | 0.5 - 3 kg | 9 - 15 kg |
| Salmon | 2 - 8 kg | 24 - 40 kg |
| Pike | 2 - 12 kg | 36 - 60 kg |

Kept in grams (whole numbers: no float on the boards), rolled uniformly in the
range. Shown as "0.12 kg" under a kilo and "2.4 kg" above.

## How it is built

- **A variant is its own bag key**, the species' key with a suffix:
  `fish_trout_albino`, `fish_pike_large`; cooking.js prefixes `cooked_` to
  whatever it cooks, so `cooked_fish_trout_albino`. Every rule that reads a
  fish by its prefix (`fish_`, `cooked_fish_`: the cook, the eat, quests, the
  shop, the store's tab, the bag's Fish chip) keeps working; the species
  lookups (`species.includes(name)`) still find the trout. The campfire cooks
  plain fish first (BroTown's `_fishOrder`: a variant sorts last), so an
  albino is not burnt by accident.
- **The roll** is at the one place a fish is paid, gathering.js
  `_handleNodeStrike`, through `_fishCatch` (fishlog.js): it puts the fish in
  the bag, counts the catch to weigh, and returns `{key, sp, v}` for
  `harvest_credit.fish`. The dice are `Math.random`, or `room._fishDice` in the
  suite.
- **The heal**: cooking.js `_fishHealAmount` doubles a key ending `_large`
  (over `_fishHealBase`, the old function); the phone's copy is
  gameSystems.js `getFishHealAmount` (mirror-audit checks every variant both
  ladders).
- **The points**: `_handleEatRequest` grants `albino_<sp>` / `large_<sp>`
  through `_achvGrant`, in the run before the save that carries the points
  (achievements.md). Each row carries its own `ap` (5, 10); `achvAp` reads it
  on both sides.
- **The fish log** `fishlog:<pid>` (ARCHITECTURE-HANDOFF rule 2):
  `{v, u: {<raw key>: catches not weighed}, b: {<species>: best grams}}`. One
  GET at the join (beside the codex), cached for the session. A catch counts
  in memory, written at most once a `SAVE_MS` (a minute) and on disconnect
  (index.js `webSocketClose`, linger.js `_lingerEnd`) -- a deploy loses at most
  a minute of catches to weigh, never a fish. A weigh-in is written at once,
  before its answer (a lost one would be a second roll of the same catch). A
  newer `v` or a failed read locks it. Deleted by `_resetCharacterData`.
- **The boards** `fish_board` (one GameRoom key, the Ace board's way, never the
  Leaderboard DO, which ranks skills every 5 minutes and forgets a player
  after 7 days): `{v, b: {<species>: [{pid, name, g, v?, at}]}}`, ten a
  species, one row a player. Read once a worker's life (the room is the only
  writer); a weigh-in that beats the tenth (or the player's own row) enters it,
  written in the same run. Ties keep the earlier row above. A restart of a
  character leaves its rows (a record of a moment).
- **Writes** (cost-guard §11): fishing writes the log at most once a minute;
  a weigh-in needs a catch, so Inspect tapped any number of times writes no
  more rows than fish were caught, and a refused one writes nothing.

## The wire

| message | direction | |
|---|---|---|
| `harvest_credit.fish` `{key, sp, v}` | worker → phone | the catch's key and variant (v null for a plain fish) |
| `fish_inspect {key}` | phone → worker | handled on purpose: anything not one of the game's fish is answered with nothing |
| `fish_weight` | worker → phone, PRIVILEGED | `{key, sp, v, g, best, newBest, rank, left}`, or `{none}`, `{off}`, `{unavailable}` |
| `fish_board_request {}` | phone → worker | |
| `fish_board` | worker → phone, PRIVILEGED | `{boards: {<sp>: [...]}}`, or `{off}`, `{unavailable}` |

The phone takes both answers in wsClient's direct switch (never a relayed
copy), and passes both asks through the channel shim (TRAPS #18).

## Caps and kill switches

- `caps.fishvariants` -- the rolls. `fishvariants: false` in the live flags:
  every fish plain (what was caught stays). The phone says the catch's words
  only against it.
- `caps.fishweigh` -- weighing and the boards. `fishweigh: false`: no catch
  counted, no weigh-in, no board (what was weighed stays). The phone offers
  Inspect and the Biggest fish tab only against it.

Both in `CAP_GATES` (DevPanel).

## The owner's lever (the Test panel's "Rare fish" row)

`POST /api/admin/dev/fish` (devtools.js → `_fishDev`):

- `{next: 'albino' | 'large' | 'normal' | null}` -- the next fish you catch is
  that (one fish, in memory, gone on a deploy);
- `{give: <fish key>, n}` -- that many in the bag; a raw key AS CATCHES (each
  one weighable), a cooked key in the bag alone. The panel's buttons: "Next
  fish: albino", "Next fish: large", "Cooked albino trout", "Cooked large
  trout", "Albino trout (to weigh)", "Large pike (to weigh)".

## Not built (left for the owner)

- Painted pictures for albino and large fish, and badges for the ten
  achievements (today: the filter, the "L", and the fish's bag picture).
- The item card is being rebuilt around one shared action list (lane A): the
  Inspect button is one line in today's `actions`, to move into that list.

## Tests

- `server/test/fish-variants.test.mjs`: the rolls with held dice (and the odds
  over 200,000), a real strike at a Wheel fish spot, no stacking, the cook's
  suffix, the double heal, the points once each, weigh once a catch (a bought
  one none, a cooked one its raw catch), the boards (top ten, one row a
  player, ties, a locked board), the record (paced, flushed on close, locked,
  normalised, deleted on restart), deny by default, the switches, Diego, the
  lever.
- `mirror-audit` (the weights, odds and species; every variant's heal; every
  achievement's points), `achievements` and `achievements-client` (33 rows,
  7,545 AP, the rare fish's own points), `cost-guard` §11.
- Phone: `node tools/qa/mp/run.mjs fishvariants` (mp-fishvariants: the lever
  makes the next catch albino, the catch is real, eaten cooked for +5 AP;
  Inspect weighs it; Ranks' Biggest fish shows it).
- UI review: `fish-weigh`, `fish-board` (states.mjs; UI-DESIGN-NOTES "Rare
  fish").
