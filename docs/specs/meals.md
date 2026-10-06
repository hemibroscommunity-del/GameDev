# Meals and brews you carry (v2.3.3105)

> Owner, 2026-10-06: *"Not sure what benefit farming will provide. Maybe
> temporary stat boosts, required quest items and selling for gold. I might
> remove Diego's potions."* Then, on the research (`docs/FARMING-PLAN.md`,
> PR #816): *"Good. Go ahead and build it."*

This is the plan's **Phase 2a**. Phase 1 (`docs/specs/farm.md`) grows the
herbs; this makes them worth growing. **Phase 2b** adds the potato, the pumpkin
and their two dishes.

## What changes for a player

- **The Cookhouse makes things you carry.** A cook used to apply its buff on
  the spot. Now **Cook** puts the dish in your bag, to eat or drink when you
  want it, give to a friend, or sell on the auction house. A player who never
  farms can still buy a farmer's food.
- **One meal and one brew can run at once.** Eating replaces the meal you had.
  Drinking replaces the brew. Neither touches the other. Before, any effect
  replaced every other effect (v2.3.2063).
- **Diego's three tonics are brewed, not sold.** The Fury Tonic, Mana Draught
  and Swift Draught come off his shelf and onto the Cookhouse's.
  - He keeps the **Cooked Minnow** and the **Stamina Salts**. Both are instant,
    so neither competes with a meal or a brew. They are also something a new
    player can buy at a quiet hour.
  - **He still buys no potion back**, the tonics included (`shop.js`
    `isShopPotion`). Otherwise a bottle sold to him would reappear on the
    shelf he just stopped selling them from. His pile pricing would also pay
    more for a bottle than for its three herbs, which would turn the farm into
    a coin faucet. His sell quote for one now says 0, and his window says
    **"He won't buy"** instead of offering a Sell button the sale then refused.
    His own staples always had that problem; the 0 quote fixes them too.
  - **A bottle bought before the change still drinks.** The brewed tonics are
    the same bag keys with the same effects (`SHOP_ITEMS`).

## The dishes

| Dish (bag key) | Kind | Made from | Cooking level | When eaten or drunk | Lasts |
|---|---|---|---|---|---|
| Herb Bread (`meal_herb_bread`) | meal | 1 Firebloom | 1 | heal **twice as fast** out of a fight | 30 min |
| Root Stew (`meal_root_stew`) | meal | 1 Rock Vine + 1 Cloudpetal | 3 | take **5% less** damage | 30 min |
| Firebloom Tea (`brew_firebloom_tea`) | brew | 2 Firebloom | 6 | **+20%** damage | 30 min |
| Fury Tonic (`whetstone`) | brew | 3 Firebloom | 10 | **double** damage | 3 min |
| Mana Draught (`manaShard`) | brew | 2 Rock Vine | 5 | specials nonstop | 3 min |
| Swift Draught (`swiftDraught`) | brew | 2 Cloudpetal | 5 | run **1.5×** as fast | 3 min |

- **Cooking XP** is paid at the cook, tier × 25 (25, 25, 50, 75, 75, 75), as
  before.
- **Damage is only ever a brew.** `combat.js`'s cheat-check ceiling was sized
  at the Fury Tonic's ×2 (90.5% of it at the measured peak). A ×1.2 meal on
  top of a tonic would have crossed it (about 109%). So no meal raises damage,
  and the most anyone can run is one brew's multiplier. mirror-audit fails a
  meal that raises damage.
- **The Herb Bread changed.** Phase 1 made it heal 2% of max HP a second, in
  or out of a fight, for 60 seconds. As a meal you carry for half an hour,
  that would refill a bar every fifty seconds mid-fight. It is now the plan's
  version: the **out-of-combat healing** in the Wheel (1% of max HP a tick
  after six quiet seconds) runs **twice as fast** (`index.js` `HERB_REGEN_MULT`,
  from `DISHES.meal_herb_bread.power`). It never heals mid-fight, in a duel,
  or in an arena match.
  - Its timer is saved as **`rest`**, not `regen`. Phase 1's server
    (v2.3.3102) reads `regen` as 2% of max HP a second, in a fight too. If
    the game were ever rolled back to it, a half-hour `regen` would have
    healed that fast for up to 30 minutes. Under its own name, a rollback
    simply drops the bread's effect.
- **The Root Stew's 5%** is what the worker always took off (`combat.js`
  ×0.95). The HUD chip said −15% and the client predicted ×0.85; both now say
  5%.
- **Diego buys no dish** (`shop.js` `isCookhouseDish`). He would pay for each
  dish from a pile of its own, which starts at the top of his price curve
  while the herbs' piles may be low. With 400 Rock Vine and 400 Cloudpetal
  already in his piles, ten of each sold as herbs paid 30 coins, and the same
  herbs cooked into ten Root Stews paid 315. So, like the tonics, dishes are
  for eating, giving and the auction house. Cooking pays in use, Cooking XP and
  something you can trade, not in coins at his counter.
- **The Firebloom Tea** is the long, gentle damage drink. It sits in the brew
  slot beside the Fury Tonic's short ×2, and only one of them runs at a time.

## How it works

- **Tables** (`server/src/data.js`; client mirrors in
  `src/data/gameSystems.js` and `src/data/dishes.js`, pinned by mirror-audit):
  - `COOKING_RECIPES` gains `makes`, and rows 3–5 are the tonics. The index is
    the wire key (`cook_recipe {recipeIdx}`), so rows are appended, never
    reordered.
  - `DISHES` says what a dish does: `slot` (`meal` / `brew`), `buff`, `power`
    and `duration` in seconds.
  - `DIEGO_SHELF` is what Diego sells.
- **Cook** (`cooking.js` `_handleCookRecipe`):
  - A client that knows (`caps.meals`) sends `carry: true`. The worker uses
    the herbs, puts `makes` in the bag, pays the Cooking XP, saves and echoes.
  - Without `carry` (an old client), the dish is made and used at once by the
    same rules. That is the effect the old client predicted, only longer.
  - The Cooking-level gate and the kill switch both refuse **before** anything
    is used, and echo the bag.
- **Eat and drink:**
  - `eat_request` takes a meal key as well as a cooked fish.
  - `potion_drink` takes a brew key as well as a `SHOP_ITEMS` bottle.
  - Neither takes the other kind. The effect is applied before the item is
    used, so a refusal costs nothing.
- **The two slots** (`cooking.js` `_clearBuffSlot`):
  - A meal owns `rest` and `resist` (and Phase 1's old `regen`, so a leftover
    one is cleared).
  - A brew owns `damage`, `damageMul`, `mana`, `manaFlat`, `spd`, `spdMul` and
    the retired `hp`.
  - A slot is cleared whole, magnitudes with their timers, so nothing is left
    stranded. That was the reason the old rule was wholesale.
  - Timers extend from now and never stack.
- **The vendor building's `shop_purchase`** (no live client sends it) sells
  only `DIEGO_SHELF` now.
- **Deploy order** (rule 19):
  - The client sends `carry` and stops predicting a buff only when
    `caps.meals` is advertised.
  - **`caps.cookRows`** says how many recipes the worker cooks. The Cookhouse
    and the campfire offer a row, and the bag offers Eat or Drink on its dish,
    only below that number. `caps.meals` alone could not say it: every later
    worker advertises it too, and a newer page in front of an older worker (a
    rollback) offered rows that worker had not got, whose cooks vanished (the
    `caps.gems` lesson, TRAPS §9; found reviewing the potato's phase). It is a
    number that only grows, never a kill switch. Without it, only the old
    three rows.
  - In front of an old worker it cooks the old way, which that worker applies
    itself; the brewed tonics are hidden (it has no recipe 3–5). The bag offers
    Eat on a meal and Drink on a brew only under `caps.meals`.
  - A new worker gives an old client's cook the dish at once.
- **Kill switch:** `meals: false` in the live flags.
  - It un-advertises `caps.meals` and refuses a carry cook, and any cook of
    a row an old server never had (the tonics).
  - Dishes already in bags still eat and drink. The bag keeps Eat and Drink
    on them, because the switch makes `caps.meals` **false**, while a server
    from before dishes sends no `caps.meals` at all.
  - To turn it back on, delete the flag.
- **Every refusal is sent back.** A refused cook, meal or drink resends the
  bag, the skills or HP, and the effects (`persistence.js`
  `_resendPlayerState`). A v2 client only gets the fields that changed, and a
  refusal changes nothing, so a plain echo would send nothing and leave the
  phone's guess on screen. That includes a recipe row, a meal or a brew this
  worker has never heard of, and a cooked fish refused in an arena match (it
  was silent before).
- **A rollback from the next phase keeps a running pie whole.** This worker
  cooks no Pumpkin Pie, but its meal slot owns the pie's `xp` and `xpMul`, and
  `BUFF_MAGNITUDES` keeps `xpMul` through a save. A rollback onto it no longer
  prunes the pie's strength as an expired timer, and a meal eaten here
  replaces the pie.

## On the phone

- **The Cookhouse window:**
  - It is headed "Meals & Brews" and lists all six recipes.
  - Each row says what its dish does and how many you already carry.
  - **Cook** says "+1 Herb Bread" and the bread appears in the bag.
- **The bag:**
  - Meals and cooked fish file under the bottle chip, now called
    **Consumable**, with the potions. It is not a sixth chip: the bag's header
    is one chip per slot column, five across (owner, v2.3.1652).
  - The auction house files them the same way (`store.js` `_stCategory`).
  - A meal's popup says what it does, "· replaces your meal", and has
    **Eat**. A brew's says "· replaces your brew" and has **Drink**.
- **The HUD's effect chips** count in minutes from a minute up ("30m", not
  "1800s"). The Regen chip says "x2 rest", the Resist chip "−5%".
- **The campfire's field cook** makes **meals** only, into the bag. It picks
  the recipe for you, and picking the last one would now brew a tonic from
  herbs you meant for bread.

## Tests

- `server/test/meals.test.mjs` (new, in `npm test`) covers:
  - cooking into the bag;
  - eating and drinking, and neither the other way;
  - one meal and one brew;
  - the tonics' recipes and levels;
  - the Herb Bread's healing (never mid-fight or in an arena);
  - the kill switch;
  - Diego's shelf, refusals and dish prices;
  - forged keys;
  - a save.

  Each of six rules, broken on purpose, fails it.
- Updated:
  - `potions` and `shop`: bottles are drunk from the bag; the shelf is two
    staples; a meal runs beside a brew.
  - `farm` §11: the bread's new healing, the stew beside the tea, a carried
    cook.
  - `mirror-audit` §4/§4b: recipes by what they make, `DISHES` both ways, no
    damage meal, the shelf.
- Phone (`tools/qa/mp`):
  - `mp-meals` (new) covers:
    - the Cookhouse's door and window;
    - Cook into the bag, settled by the worker;
    - the Consumable chip;
    - Eat and the half-hour meal in minutes on the HUD;
    - a tea drunk beside it;
    - Diego's shelf and his "He won't buy".
  - `mp-potions`, `mp-shopkeeper` and `mp-marketonly` changed to the
    two-staple shelf, with the draughts arriving as brewed bottles.

## Not yet

- **Phase 2b:**
  - the potato and the pumpkin (`FARM.V` 2);
  - Garden Stew, which heals 150 at once;
  - Pumpkin Pie, +10% combat XP for half an hour, the first meal the worker's
    XP code reads.
- A meal's timer keeps running while you are logged out, as every effect
  always has. Pausing it is later polish (the plan's "Decisions").
- Meals and brews drop on death like other bag items. They are not quest
  objectives.
