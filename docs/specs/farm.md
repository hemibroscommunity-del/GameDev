# The farm: real crops at the Feed & Seed (v2.3.3083)

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
- **Pick a tool, then tap a bed, or drag one finger across several.** A drag is
  one message to the worker however many beds it crosses.
  - Until you pick one, the tool follows the farm, in this order: Harvest if
    anything is ripe; Plant if a bed is dug and you have seeds; Water if
    anything is growing dry; Dig if there is grass; Fertilize if you have compost.
  - A tool you pick holds until the worker answers and it has nothing left to
    do. Then the tool follows the farm again.
  - The **"… all"** button applies the tool to every bed it fits.
- **The free deed:** six beds, created the first time the window opens.
- On join, if any beds are ripe, the game says so: *"🧺 3 beds are ready at
  the Feed & Seed"*, in the chat log and over your head.

## The crops

| Crop (bag key) | Farming level | Seed | Ready in (dry / watered) | Harvest (plain / fertilized) | XP per bed | Diego's value |
|---|---|---|---|---|---|---|
| Carrot (`crop_carrot`) | 1 | 2 | 8 m / 6 m | 2 / 3 | 25 | 8 |
| Firebloom (`herb_firebloom`) | 1 | 5 | 40 m / 30 m | 2 / 3 | 50 | 16 |
| Rock Vine (`herb_rock_vine`) | 5 | 10 | 5 h 20 m / 4 h | 2 / 3 | 120 | 30 |
| Cloudpetal (`herb_cloudpetal`) | 10 | 15 | 10 h 40 m / 8 h | 2 / 3 | 180 | 40 |

- **Seeds** are `seed_<crop>`. **Compost** is `compost`.
- **Where the table lives:** the worker's copy is `server/src/farm.js` `FARM`.
  The client's copy, `src/data/farmCrops.js`, only draws the window and the
  bag. mirror-audit's "THE FARM" section pins every field, both times and both
  yields to each other.
- **Level gates** follow the owner's "levels of 5". A locked crop can be
  neither bought nor planted.
- **The three herbs are the exact keys the Cookhouse's recipes already asked
  for**, which nothing in the game made until now.

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
- **`err`:** one of `no-seeds`, `no-compost`, `level`, `coins`, `nothing` or
  `off`. The client adds `timeout` itself when no answer comes within 4 s.
- **`now`** is the worker's clock. The client counts down to `readyAt` against
  `Date.now() + (now − arrival)`, never against the phone's own idea of the date
  (`farmBus.serverNow`).
- **`login: true`** marks the farm as it stood at join (`_farmOnJoin`). It is
  sent only to a player who has a farm.

## Storage

`farm:<pid>` holds `{v, beds, plots}`. It is registered in
ARCHITECTURE-HANDOFF's storage-key table.

- It is never a field on the rpg blob (rule 1).
- It is one record rather than a key per bed, so each action writes one row.
- It is **never ticked**. A planted bed stores `readyAt` on the worker's clock,
  and it is ripe when `Date.now()` passes it.
  - That is read on opening the window, on every action, and on join.
  - There are no alarms, and the tick stops in an empty room (rule 12).
  - The pattern is the food buffs' `endsAt`.
- `_farmHeal` turns anything malformed into grass, so a planted bed that cannot
  be read is never a free harvest.

## Settlement and safety

- **One event, both writes** (rules 8 and 9). An action loads the record, which
  awaits storage and so keeps the input gate closed. Then it changes the record
  and the bag in memory and issues **the farm record's put first, then
  `_saveRpg`**, with no await between. The Durable Object commits them as one
  batch. If they were ever split, putting the farm record first means a crash
  can cost a harvest but never pay one twice.
- **The bed is the replay guard.** A resent harvest finds grass and pays
  nothing, so no opId is needed.
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

## The Cookhouse, now that herbs exist

- **Herb Bread heals.** Its `regen` timer had never been read by anything.
  `_tickPlayerRegen` now pays **2% of max HP a second** while it runs, in or
  out of a fight, which is what its card always said. It does not apply in a
  hub, where the 10% top-off is faster, or in an arena match or a duel.
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
| `src/ui/panels/buildings/FeedSeedPanel.jsx` | The window: **Beds** (five tools, the beds, the status line, "… all") and **Seeds** (buy ×1 / ×5, the times, yields and XP as chips), plus "Visit Your Farm". |
| `src/ui/panels/buildings/FarmPanel.jsx` | Picks the window: `FeedSeedPanel` with `caps.farm`, `LegacyFarmPanel` (the old one, renamed) without it. |
| `src/ui/mobile/farmBus.js` | The worker's farm, outside React (`window.__btFarm`), with the clock offset and the in-flight request. |
| `src/game/farmFeedback.js` | The moment after an answer: popups, sounds (the dirt footstep, the lure's plop, the pickup chime), Farming's level celebration, the join notice. |
| `src/data/farmCrops.js` | The crop table's client copy, the glyphs, and the bag's names. |
| `src/networking/gameEvents.js` | `farm_state` → the bus, then the feedback. |
| `src/networking/wsClient.js` | The three sends' passthrough lines (TRAPS #18). |
| `src/ui/mobile/dash/InventoryPanel.jsx` | "Carrot Seeds", "Firebloom", "Compost" and their glyphs in the bag. |
| `src/ui/panels/playerProfile.js` | The Inspect card's "plots ready" counts the worker's farm. |
| `src/ui/panels/DevPanel.jsx` | `farm` in CAP_GATES, and **Ripen my farm now**. |

The crops, seeds and compost are emoji until the art exists:
`docs/ART-WISHLIST.md` "The farm" has the prompt.

## Testing

- **Server:** `server/test/farm.test.mjs` (in `npm test`):
  - the deed;
  - dig, buy, plant, water, feed and harvest, on a movable clock;
  - growing offline and the join notice;
  - junk indexes and corrupt records;
  - the rate limit and the kill switch;
  - Diego's prices;
  - the three Cookhouse recipes.
- **Mirror:** mirror-audit's "THE FARM".
- **On a phone:** `tools/qa/mp/mp-farm.mjs` (`node tools/qa/mp/run.mjs farm`).
  It runs the whole loop in the Wheel against a real worker:
  1. one drag digs three beds in one message;
  2. buying;
  3. Plant all;
  4. water and feed;
  5. **`/api/admin/dev/farmripe`** (the dev panel's **Ripen my farm now**)
     ripens them;
  6. Harvest all pays 7 carrots and 75 XP, and the worker's own bag agrees;
  7. reopened, the window shows the worker's farm.
- `mp-wheeldoors` still walks "Visit Your Farm".

## Not yet (the plan's later phases)

- **Phase 2:** potatoes and pumpkins; meals and brews you carry; Diego's three
  tonics brewed from herbs and taken off his shelf.
- **Phase 3:** your own farm to walk on (`farm:<id>` zones), the Land Office's
  free deed and paid land (500 → 7,500 coins, up to 25 beds), Mayor Bro's farm
  errand.
- **Phase 4:** friends visiting and watering (+10% a friend, up to three).
- **Phase 5:** better compost, elemental seeds from monsters, the order board,
  quality, tool upgrades.
