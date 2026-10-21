# Every crop is food (v2.3.3537)

The owner, 2026-10-21, a week before reviewers play the game: *"I value
SIMPLICITY and INTELLIGIBILITY"*. This is item 3 of the after-review list
agreed with the outside evaluation: every crop gets one use a player can
guess.

## What it did

The farm grows sixteen crops. Six of them had a use: a recipe cooks them or
the order board asks for them. The other ten (v2.3.3135: wheat, strawberry,
tomato, corn, cabbage, frostberry, dewmelon, thunder pepper, gloomcap,
heartroot) only grew, paid Farming XP, and sold to Diego. The plan had left
"what each one does" for later.

## What it does now

**Any crop can be eaten raw for a small heal: half what a fish heals at the
same level.**

A crop's level is the Farming level it asks. A fish's level is the Fishing
level its spot asks. The crops open at exactly the five fishing levels, so:

| Crop's Farming level | Crops | Fish at that level | Fish heals | Crop heals | On screen |
|---|---|---|---|---|---|
| 1 | carrot, firebloom, wheat, strawberry | minnow | 100 | 50 | +10 |
| 5 | rock vine, potato, tomato, frostberry | clownfish | 150 | 75 | +15 |
| 10 | cloudpetal, pumpkin, corn, cabbage, dewmelon | trout | 225 | 113 | +23 |
| 15 | thunder pepper, gloomcap | salmon | 325 | 163 | +33 |
| 20 | heartroot | pike | 475 | 238 | +48 |

(The game shows HP divided by 5.)

- **On the server** (`server/src/farm.js` `CROP_HEAL`, `cropHealFor`;
  `cooking.js` `_handleEatRequest`), a crop is eaten by the same road as a
  cooked fish:
  - it must be in the bag;
  - no healing in an arena match;
  - one bite at a time in a fight (the 15 s rule);
  - the heal is fixed, saved and echoed.

  A crop eaten starts the one-bite clock too, so a fish right after it in a
  fight waits.
- **On the phone**, a crop's card in the bag says "+10 HP when eaten" and has
  **Eat** (`ItemDetailPopup.jsx`); eating says "+10 HP" and "Ate Carrot".
  `src/data/farmCrops.js` mirrors the table (mirror-audit).
- **Quick eat never picks a crop** (`src/game/quickEat.js`). A crop is also a
  recipe's makings and a quest's errand (the carrots for Zoom Juice), and one
  tap in a fight must not use those up. The one tap eats cooked food. With
  only crops in the bag there is no quick-eat button, and crops are eaten
  from the bag.
- Crops stay under the bag's **Crafting** chip, because recipes and the order
  board use them.

## Switch and tests

- Kill switch: `cropeat: false` in the live flags. The server refuses a crop
  (the bag is resent, nothing taken), and `caps.cropeat` reads false at the
  next join, so the bag offers no Eat on a crop. A cooked fish still eats.
- Deploy order: the bag offers Eat on a crop only against a server that
  advertises `caps.cropeat`. An older server never sees a crop eaten.
- `crop-food` suite (29 checks):
  - the table against the fish ladder and the fishing levels, and the page's
    copy;
  - all sixteen crops eaten;
  - the refusals (none in the bag, dead, arena, the one-bite rule);
  - seeds and compost not eaten;
  - the switch and the caps;
  - the page's one-bite rule, heal prediction and quick eat.

  Five broken versions each fail it.
- `mirror-audit` pins the table and every crop's heal on both sides.
- `mp-cropfood`, a phone in BroTown (10 checks): a carrot's card, eating it
  through the real Eat button, the heartroot's promise, quick eat, and the
  switch.
