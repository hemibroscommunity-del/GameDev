# The farm: real crops at the Feed & Seed (v2.3.3127)

> Owner, 2026-10-06: *"mechanics similar to the old FarmVille game where you
> have to wait to harvest and each has a wait time different depending on what
> it is. Need to dig, plant seeds, fertilize, water, etc."* Then, on the
> research (`docs/FARMING-PLAN.md`, PR #816): *"Good. Go ahead and build it."*

This is the plan's **Phase 1**: the Feed & Seed's window becomes a farm the
**worker** owns and settles. Before this, the window planted and harvested in
the browser only. It sent nothing, so the next `player_state` undid every
harvest. Its "seeds" were item keys the worker has never minted, so a player
saw "No seeds" and nothing else. The private farm you walk around on, the Land
Office's paid land, and visits from friends are Phases 3 and 4.

## How it plays

| Step | Required? | What it does |
|---|---|---|
| **Dig** | yes | Grass becomes tilled soil. Newly owned beds start as grass, and a bed goes back to grass after each harvest. |
| **Plant** | yes | Uses one seed from the bag (sold in the window's **Seeds** tab). Sets the crop and its time. |
| **Water** | no | The crop is ready **25% sooner**: carrots in 6 minutes, not 8. Once per planting, any time before it ripens. Watering re-times the whole crop, so doing it late costs nothing. |
| **Fertilize** | no | Uses one bag of **compost** (4 coins). The harvest is **half again as big**: 3 instead of 2. |
| **Harvest** | — | Puts the crop in the bag and pays **Farming XP**. The bed goes back to grass. |

- **Nothing withers.** A ripe crop waits in the ground for as long as it takes.
  It also grows while you are logged out, and while the room is empty.
- **Since v2.3.3136 you take each step ON YOUR FARM,** kneeling at the bed
  (`docs/specs/farm-walk.md`): the owner, *"I don't want the game to just be
  reading a bunch of boring menus."* The window's Beds tab is gone. Until then
  you picked a tool in the window and tapped a bed, or dragged one finger
  across several (one message however many it crossed), and the tool followed
  the farm: Harvest if anything was ripe; Plant if a bed was dug and you had
  seeds; Water if anything grew dry; Dig if there was grass; Fertilize if you
  had compost. The worker still takes a list of beds in one `farm_act`; the
  farm sends one bed at a time.
- **The free deed:** six beds, created the first time the window opens.
- On join, if any beds are ripe, the game says so: *"🧺 3 beds are ready on
  your farm"* (*"at the Feed & Seed"* until v2.3.3136), in the chat log and
  over your head.
  - Once a page session, and again only when more beds are ripe than it last
    said (`farmFeedback.js` `toldRipe`). An iPhone rejoins on nearly every
    return to the app, and crops never wither, so the first cut repeated it
    each time.

## The crops

| Crop (bag key) | Farming level | Seed | Ready in (dry / watered) | Harvest (plain / fertilized) | XP per bed | Diego's value |
|---|---|---|---|---|---|---|
| Carrot (`crop_carrot`) | 1 | 2 | 8 m / 6 m | 2 / 3 | 25 | 8 |
| Firebloom (`herb_firebloom`) | 1 | 5 | 40 m / 30 m | 2 / 3 | 50 | 16 |
| Rock Vine (`herb_rock_vine`) | 5 | 10 | 5 h 20 m / 4 h | 2 / 3 | 120 | 30 |
| Cloudpetal (`herb_cloudpetal`) | 10 | 15 | 10 h 40 m / 8 h | 2 / 3 | 180 | 40 |
| Potato (`crop_potato`), v2.3.3131 | 5 | 6 | 2 h 40 m / 2 h | 3 / 4 or 5 | 90 | 12 |
| Pumpkin (`crop_pumpkin`), v2.3.3131 | 10 | 25 | 29 h 20 m / 22 h | 2 / 3 | 320 | 60 |
| Wheat (`crop_wheat`), v2.3.3135 | 1 | 3 | 20 m / 15 m | 3 / 4 or 5 | 35 | 6 |
| Strawberry (`crop_strawberry`), v2.3.3135 | 1 | 4 | 1 h / 45 m | 3 / 4 or 5 | 60 | 10 |
| Tomato (`crop_tomato`), v2.3.3135 | 5 | 5 | 1 h 40 m / 1 h 15 m | 3 / 4 or 5 | 75 | 11 |
| Frostberry (`herb_frostberry`), v2.3.3135 | 5 | 8 | 4 h / 3 h | 2 / 3 | 110 | 26 |
| Corn (`crop_corn`), v2.3.3135 | 10 | 9 | 5 h / 3 h 45 m | 2 / 3 | 125 | 28 |
| Cabbage (`crop_cabbage`), v2.3.3135 | 10 | 11 | 7 h / 5 h 15 m | 2 / 3 | 150 | 34 |
| Dewmelon (`herb_dewmelon`), v2.3.3135 | 10 | 18 | 15 h / 11 h 15 m | 2 / 3 | 220 | 48 |
| Thunder Pepper (`herb_thunder_pepper`), v2.3.3135 | 15 | 12 | 9 h / 6 h 45 m | 3 / 4 or 5 | 200 | 30 |
| Gloomcap (`herb_gloomcap`), v2.3.3135 | 15 | 20 | 18 h / 13 h 30 m | 2 / 3 | 270 | 55 |
| Heartroot (`herb_heartroot`), v2.3.3135 | 20 | 28 | 24 h / 18 h | 2 / 3 | 340 | 70 |

- **Seeds** are `seed_<crop>`. **Compost** is `compost`.
- **Where the table lives:** the worker's copy is `server/src/farm.js` `FARM`.
  The client's copy, `src/data/farmCrops.js`, only draws the window and the
  bag. mirror-audit's "THE FARM" section pins every field, both times and both
  yields to each other.
- **Level gates** follow the owner's "levels of 5". A locked crop can be
  neither bought nor planted.
- **The three herbs are the exact keys the Cookhouse's recipes already asked
  for**, which nothing in the game made until now.

### The sixteen crops (v2.3.3135)

The owner: *"The main focus is just getting a good variety of crops to grow.
Then the next step is deciding what each one does."* So ten more, appended to
the table:

- **Five everyday crops** (`crop_*`): wheat, strawberry, tomato, corn and
  cabbage. Quick to middling, cheap, the makings of everyday meals.
- **Five magic crops** (`herb_*`, beside firebloom, rock vine and cloudpetal),
  one for each land that had none: frostberry (frost), dewmelon (water),
  thunder pepper (storm), gloomcap (venom) and heartroot (flora). Slower,
  worth more, opening up to Farming 20.
- **What each one cooks into is the owner's next decision.** Until then they
  grow, pay Farming XP, sell to Diego and trade. The suggestion on the table:
  the everyday crops become everyday meals (health, stamina, XP), and each
  land's magic crop a meal against its monsters' hits (frostberry the chill,
  thunder pepper the shock, dewmelon the soak, gloomcap the poison, heartroot
  the vine hold, rock vine the daze, cloudpetal the gusts, firebloom the
  burns).
- **The numbers follow the first six:** a bed's worth to Diego is about
  7 × mins^0.38 coins, its XP about 9 × mins^0.48, a little more at the higher
  levels; every seed costs at least a coin a crop.
- **The art:** glyphs until the owner's crop sheet is made (the 16-crop
  prompt, docs/art/FARM-ART-PROMPTS.md). 🍠 stands in for the heartroot, as no
  radish or beet glyph is drawn by every phone.
- **The window:** the Seeds tab sells the crops open to your level and folds
  the rest into one line a level ("🔒 Farming 15: 🌶️ Thunder Pepper, 🍄
  Gloomcap"), and the Plant tool offers only the seeds you hold -- sixteen
  chips, most of them locked, stood between a new farmer and the beds. The
  trade window names and draws farm goods by the same table ("Wheat Seeds",
  not "📦 seed wheat").

### Diego and the farm's goods

Every farm key now has a value in Diego's table (`shop.js` `SHOP.BASE`, from
`farm.js` `FARM_SHOP_BASE`). Without it, each fell to his default of 20, and he
would have paid 10 coins for a 2-coin seed.

- A seed's value is its Feed & Seed price, and compost's is its own. With his
  half-price spread, **reselling one you just bought is always a loss**.
- A crop's value is the plan's: he pays 4 for the first carrot into an empty
  pile, and 20 for a Cloudpetal.
- His pile's decay does the rest.

## Wire surface

| Message | Direction | Payload | Answer |
|---|---|---|---|
| `farm_open` | client → worker | `{}` | `farm_state` with the beds. Creates the free deed on first use. |
| `farm_act` | client → worker | `{op, beds:[i…], crop?}`: `op` is one of `dig`, `plant`, `water`, `feed` (the Fertilize tool), `harvest`; `crop` is needed for `plant` | `farm_state` with the beds, plus `did` (what happened), or `err` (why nothing did). A `player_state` follows when the bag changed (plant, feed, harvest). |
| `farm_buy` | client → worker | `{item, count}`: a `seed_<crop>` or `compost`, `count` 1–50 | `farm_state` with `did` (`{op:'buy', item, n, cost}`) or `err`, and a `player_state`. |
| `farm_state` | worker → client | `{beds, plots:[{s, crop?, plantedAt?, readyAt?, water?, feed?}], now, did?, err?, login?}` | — (privileged: in `PRIVILEGED_EVENTS`). |

- **`did`:**
  - every op: `{op, n}`;
  - plant: also `crop` and `used`;
  - feed: also `used`;
  - harvest: also `items`, `xp`, `leveled`, `fromLevel` and `newLevel`.
- **`err`:** one of `no-seeds`, `no-compost`, `level`, `coins`, `nothing`,
  `off` or `newer` (the record is a newer worker's: see Storage). The client
  adds `timeout` itself when no answer comes within 4 s,
  and `timeout-buy` ("No answer yet. Check your bag") after 12 s for a buy.
  - A bed action is safe to send again (the bed guards it); a buy is not, so
    it waits longer and says to look in the bag.
  - The three farm sends are in wsClient's `SETTLED_SENDS`, so a socket that
    died after one is rejoined at 7 s and the bag comes back first.
- **`now`** is the worker's clock. The client counts down to `readyAt` against
  `Date.now() + (now − arrival)`, never against the phone's own idea of the date
  (`farmBus.serverNow`).
- **`login: true`** marks the farm as it stood at join (`_farmOnJoin`). It is
  sent only to a player who has a farm.

## Storage

`farm:<pid>` holds `{v, beds, plots}`. It is registered in
ARCHITECTURE-HANDOFF's storage-key table.

- **`v` is the record's shape** (`FARM.V`: 1, then 2 since v2.3.3131 added
  the potato and the pumpkin, then 3 since v2.3.3135 added the ten new
  crops). A worker refuses a record
  newer than it knows whole: opening, any action and the dev op answer
  `err: 'newer'`, the join says nothing, and nothing is read into it or
  written back.
  - Without that, this worker rebuilt a record from the fields it knows
    (`_farmHeal`) and wrote it back on the next action. So a Cloudflare
    rollback from a later phase would have turned every bed of a crop it has
    never heard of into grass, for good. The review showed it on a copy; the
    owner said yes to the guard (2026-10-06).
  - **A phase that adds a crop, a field or a state to the record must bump
    `FARM.V`.** A rollback then costs a farm visit, never a bed.
  - **A record is stamped with what its beds HOLD** (`_farmShape`, at every
    write): the highest `v` of the crops planted in it. A farm of the first
    four crops is a 1 that every farm worker reads; a potato or a pumpkin
    makes it a 2 while it grows, and its harvest a 1 again. Stamping `FARM.V`
    on every write (v2.3.3131 at first) closed every farm touched under the
    new worker after a rollback, carrot-only ones included (found by the
    review). `FARM.V` is the highest crop `v`; farm.test pins both.
- **`caps.farmCrops`** says how many crops the worker grows, in the order they
  came (`FARM_CROP_IDS`, append-only). The window offers a crop's seeds and
  planting only below it: `caps.farm` alone let a newer page offer an older
  worker the potato and the pumpkin, and the buy hung on "No answer yet"
  (TRAPS §9). Without it, the first four.

- It is never a field on the rpg blob (rule 1).
- It is one record rather than a key per bed, so each action writes one row.
- It is **never ticked**. A planted bed stores `readyAt` on the worker's clock,
  and it is ripe when `Date.now()` passes it.
  - That is read on opening the window, on every action, and on join.
  - There are no alarms, and the tick stops in an empty room (rule 12).
  - The pattern is the food buffs' `endsAt`.
- `_farmHeal` turns anything malformed into grass, so a planted bed that cannot
  be read is never a free harvest.
- **A character restart deletes it** (`persistence.js` `_resetCharacterData`,
  beside `rpg:` and `gear_prov:`). The beds and crops were bought with the gold
  and skills a restart resets; the next open hands out the free deed again.

## Settlement and safety

- **One event, both writes** (rules 8 and 9). An action loads the record, which
  awaits storage and so keeps the input gate closed. Then it changes the record
  and the bag in memory and issues **the farm record's put first, then
  `_saveRpg`**, with no await between. The Durable Object commits them as one
  batch. If they were ever split, putting the farm record first means a crash
  could lose a harvest but never pay one twice; a planting could keep its
  seed, never take two.
- **The bed is the replay guard.** A resent harvest finds grass and pays
  nothing, so no opId is needed. That holds only because **the bed turns
  before anything is paid** and nothing between the pay and the commit can
  throw:
  - the harvest turns each ripe bed to grass first, then adds the crops to the
    bag, then pays the Farming XP inside a `try`. A failure there costs the
    XP, never a second harvest.
  - The first cut paid each bed and its XP before turning it. A Farming skill
    stored as a bare number (a first join keeps the client's life skills as
    sent) made `_addLifeSkillXp` throw. The commit never ran and the router
    swallowed the error, so one bed paid on every message. The review proved
    it: one seed, 270 Firebloom a minute.
  - Such a skill now heals at the join (`migrations.js` `healLifeSkillLevels`:
    anything but an object becomes a fresh skill) and in `_addLifeSkillXp`
    itself. The router's catch logs what it caught.
- **What the client may say:**
  - Bed indexes must be whole numbers inside the farm. The list is
    de-duplicated and only its first 50 entries are read; the room's 16 KB
    frame gate drops anything bigger.
  - A crop or seed is looked up with `hasOwnProperty`, so `__proto__` resolves
    to nothing.
  - **Never a time, a yield or a bed's contents.**
- **XP only at harvest,** never for digging or planting. That closes
  FarmVille's plant-delete-replant power-levelling.
- **Rate limit:** 90 farm messages a minute per player (`FARM.MSG_PER_MIN`).
  It bounds a script, not a hand: a drag is one message.
- **Deploy order** (rule 19):
  - The client shows the new window, and sends any farm message, only against a
    worker that advertises `caps.farm`.
  - Against an old worker, `FarmPanel` keeps its old browser-only face (the
    legacy fallback, `LegacyFarmPanel`).
  - **Kill switch:** `farm: false` in liveflags un-advertises the cap and
    answers every farm message with `err: 'off'`. The beds keep their times.
    - A tab that joins while it is set gets the window **closed**: a card that
      sends nothing ("The farm is closed for now · Your beds keep growing"),
      plus Visit Your Farm. The client can tell this from an old worker,
      because an old worker leaves `farm` out of the caps and the switch sets
      it to false.
    - A tab that joined before keeps the window and gets `err: 'off'`.
    - To turn the farm back on, **delete** the flag; do not set it to `true`.
      Liveflags survive deploys and rollbacks, and a stored `farm: true`
      would advertise a farm on a worker rolled back past this one. The window
      would then send farm messages to a worker that rebroadcasts them to the
      room.

## The Cookhouse, now that herbs exist

- **Herb Bread heals.** Its `regen` timer had never been read by anything.
  `_tickPlayerRegen` now pays **2% of max HP a second** while it runs, in or
  out of a fight, which is what its card always said. It does not apply in a
  hub, where the 10% top-off is faster, or in an arena match or a duel.
  - **Changed in v2.3.3130** (`docs/specs/meals.md`): a carried meal lasts
    half an hour, so the bread now doubles the out-of-combat healing instead,
    and never heals mid-fight.
- **The recipes' Cooking levels are the worker's gate** (`cooking.js`
  `_handleCookRecipe`, `cookLvl` on `data.js`'s rows, pinned by mirror-audit):
  Root Stew at Cooking 3, Firebloom Tea at Cooking 6.
  - Before this, only the window locked them. That did not matter while nothing
    could make the herbs, but the farm grows them.
  - A refusal uses nothing, ends no running tonic and echoes the bag.
  - The Tea's +20% reaches monsters only: PvP damage is the client's number,
    capped by `_maxDmgForAttacker`, which reads no buff.
- **Firebloom Tea is +20% damage**:
  - its row's `power` is 0.20 on both sides (it was 0.05);
  - the card now says +20%;
  - the recipe handler now sets `damageMul = 1 + power`.

  The worker always applied ×1.20 through the combat reader's default, so
  nothing changes in play; the card, the table and the worker now agree.
  potions.test's one-effect check reads the meal's stated strength.

## Client pieces

| File | What |
|---|---|
| `src/ui/panels/buildings/FeedSeedPanel.jsx` | The window: "Visit Your Farm" with a line saying how your beds are doing, **Seeds** (buy ×1 / ×5, the times, yields and XP as chips) and **Orders**. Its **Beds** tab (five tools, the beds, "… all") is gone since v2.3.3136: the beds are worked on your farm (`docs/specs/farm-walk.md`). |
| `src/ui/panels/buildings/FarmPanel.jsx` | Picks the window: `FeedSeedPanel` with `caps.farm`; the same window **closed** when the caps say `farm: false` (the kill switch); `LegacyFarmPanel` (the old one, renamed) when the worker has never heard of the farm. |
| `src/ui/mobile/farmBus.js` | The worker's farm, outside React (`window.__btFarm`), with the clock offset and the in-flight request. |
| `src/game/farmFeedback.js` | The moment after an answer: popups, sounds (the dirt footstep, the lure's plop, the pickup chime), Farming's level celebration, the join notice. |
| `src/data/farmCrops.js` | The crop table's client copy, the glyphs, and the bag's names. |
| `src/networking/wsClient.js` | `farm_state` goes to the bus, then the feedback. It is handled in the **direct** switch, beside `smelt_result`, and never in `processGameEvent`, which the room's relayed events reach too. A worker from before the farm does not list `farm_state` as privileged, so it would relay a forged one (a "Farming 99" banner, words the forger chose) to every screen. Also here: the three sends' passthrough lines (TRAPS #18) and their place in `SETTLED_SENDS`. |
| `src/ui/mobile/dash/InventoryPanel.jsx` | "Carrot Seeds", "Firebloom", "Compost" and their glyphs in the bag. |
| `src/ui/panels/playerProfile.js` | The Inspect card's "plots ready" counts the worker's farm once this tab has heard of it (`farmBus.view`), else the legacy plots. |
| `src/ui/panels/DevPanel.jsx` | `farm` in CAP_GATES, and **Ripen my farm now**. |

The crops and the compost bin are the owner's pictures since v2.3.3136
(`public/world/farm/`, `docs/specs/farm-walk.md` "The owner's pictures"); a
crop a newer worker grows, with no picture here, keeps its glyph.

## Testing

- **Server:** `server/test/farm.test.mjs` (in `npm test`):
  - the deed;
  - dig, buy, plant, water, feed and harvest, on a movable clock;
  - growing offline and the join notice;
  - junk indexes and corrupt records;
  - the rate limit and the kill switch;
  - Diego's prices;
  - the three Cookhouse recipes, and their refusal below their Cooking levels;
  - §12: a Farming skill stored as a bare number (or `'x'`, `true`, `[]`)
    heals at the join, a ripe bed pays once however often it is harvested,
    and a harvest whose XP throws still lands once;
  - §13: a character restart deletes the farm, and the fresh character gets
    the free deed;
  - §14: a newer worker's record (`v` past `FARM.V`) is refused by opening,
    every action, the join and the dev op, and storage keeps it exactly.
  - §17 (v2.3.3135): sixteen crops, the ten new ones appended and each a 3;
    levels of 5 up to 20 (heartroot not sold at Farming 19, sold at 20); and
    EVERY crop bought at its price, planted, stamped with its version, ripe
    at its time, harvested for its yield and XP, and valued by Diego.
- **The Cookhouse's levels:** potions, shop and lifeskills-economy cook at the
  level each recipe asks; lifeskills-economy refuses one below it.
- **Mirror:** mirror-audit's "THE FARM".
- **On a phone:** `tools/qa/mp/mp-farm.mjs` (`node tools/qa/mp/run.mjs farm`),
  in the Wheel against a real worker. Since v2.3.3136 the window has no beds,
  so it runs:
  1. the window on its Seeds tab, no beds or tools, "Visit Your Farm" at the
     top and the line saying six beds to plant;
  2. buying, and the crops still to open under their levels;
  3. three beds dug and sown by `farm_act`, the line saying "3 growing";
  4. **`/api/admin/dev/farmripe`** (the dev panel's **Ripen my farm now**)
     ripens them, the line saying "3 ready to harvest" in green;
  5. harvested: 6 carrots, and the worker's own bag agrees;
  6. reopened, the line is the worker's;
  7. the kill switch.
- `mp-farmwalk` takes every step on the farm itself
  (`docs/specs/farm-walk.md`), and `mp-wheeldoors` walks "Visit Your Farm"
  and the farm's gate back out.

## Not yet (the plan's later phases)

- **Every later phase that changes `farm:<pid>` bumps `FARM.V`** (see
  Storage), so a rollback to the worker before it leaves the newer beds alone.

- **Phase 2:** done. Meals and brews you carry, and Diego's three tonics
  brewed from herbs, in v2.3.3130; the potato, the pumpkin and their dishes in
  v2.3.3131 (`docs/specs/meals.md`). A record holding a potato or a pumpkin
  is a 2 since then: a rollback to a v1 worker refuses that farm, which it
  would otherwise have turned to grass where they grew, and reads every other
  farm as before.
- **Phase 3:** your own farm to walk on -- **done in v2.3.3136**, as
  `farm_home` with the worker's six beds on it (`docs/specs/farm-walk.md`).
  Still to come: the Land Office's paid land (500 → 7,500 coins, up to 25
  beds) and Mayor Bro's farm errand.
- **Phase 4:** friends visiting and watering (+10% a friend, up to three).
- **Phase 5:** better compost, elemental seeds from monsters, the order board,
  quality, tool upgrades.
