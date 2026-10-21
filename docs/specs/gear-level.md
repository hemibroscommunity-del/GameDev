# What you wear asks your level (v2.3.3544)

An OPTIONAL change, built on one level (v2.3.3538, docs/specs/one-level.md),
which it needs.

The owner, 2026-10-21, of one level: *"I'm thinking of gating armor and
weapons on combat level instead of primary combat skill level and defense
level. What're your thoughts"*. The answer given that night: yes for what you
**wear**, no for **weapons**. This is that half, as a PR the owner can merge
or close.

## What it did

- **Armour and shields** asked allocated **Defense points**. To wear a Black
  Steel Torso you had to spend 5 shared points on Defense: a build choice
  forced on anyone who wanted better armour, and a rule a player had to
  discover.
- **Amulets** asked the **Magic (staff) level**, so a sword player could never
  wear a better amulet.
- **Weapons** asked their own skill (Melee, Bow, Magic).

## What it does now

- **Armour, shields and amulets ask your character level**: under one level,
  the best weapon's level.
  - **The numbers are the ones they asked before**, now read as your level:
    copper and iron free, then 5 a tier past iron (`armorDefReq`); shields and
    amulets their tier × 5.
  - A Black Steel Torso is **"Level 5 to wear"** (it was "Defense 5 to
    wear"). A level-5 archer or mage wears it as a swordsman does.
  - Defense points no longer count toward wearing anything; they still do
    everything else they did (the damage they stop).
- **Weapons keep their own skill.** A weapon's XP comes from the damage it
  deals, so a top blade wearable at Melee 1 would train Melee by the tier.
  Three weapons stay three ladders.
- **In play it changes one thing today**: black steel armour, the only armour
  past iron the forge makes, asks level 5 instead of 5 Defense points. Higher
  tiers only drop, and ask 10, 15 ... 30 the same way. The only shield is the
  Pine Shield (free). No amulet asks anything on the worker today: amulets
  carry no tier the gate reads. The page's own amulet rule reads the level
  too, but no screen shows it.
- **The words follow:**
  - the Blacksmith's Armor tab: "Level 5 to wear";
  - the item card: "Needs level 5 (you are 1)";
  - Equip when short: "NEEDS LEVEL 5".
- **As before:**
  - a requirement is asked when you put a piece on, so nothing worn is ever
    taken off by this;
  - a character from before prog3 passes.

## How it works

- **Worker** (`gear.js` `_gearOnLevel`): armour, shields and amulets ask
  `_prog3GearOk(ps, 'level', req)`, the character level (`prog3.js`
  `_prog3CharLevel`). Only with one level on: a sum of three reads 3 for a new
  character, so "level 5" would mean little.
- **Page** (`gameSystems.js` `wearHave` / `wearReqWords`): `canEquipItem`,
  `getEquipReqLabel` and `prog3GearReq` read the same, against
  `caps.gearlevel` (`oneFormula.js` `setGearOnLevel`, set by wsClient at the
  join).
- **Kill switch:** `gearlevel: false` in the live flags, or `onelevel: false`,
  puts Defense points and Magic back on both sides (caps.gearlevel false at
  the next join).
- **Deploy order:** either half first.
  - A new page with an older worker sees no `caps.gearlevel`, so it keeps
    "Defense 5".
  - An older page with a new worker would say "Defense 5" while the worker
    asks level 5. A level-5 character with no Defense points would be refused
    by the old page's own gate before anything was sent, and the next page
    load fixes it. Merging both halves together (one PR) avoids it.

## Tests

- **`gear-level` suite** (15 checks), through the real doors:
  - the forge, then `stats_update {armorRef}`;
  - refused at level 1 and at level 4 with 30 Defense points;
  - worn at level 5 with none, and at Bow 5;
  - the switch thrown through the admin route;
  - `onelevel: false`;
  - the page's gate and words both ways.
- **`drops`** §8b (the Defense rule, under the switch) and §8c (the level:
  every tier on both sides of its boundary, the best weapon, shields,
  amulets, weapons unchanged).
- **mirror-audit:** worker and page agree for armour and shields on every
  tier, every best weapon and every level 1-35, and the card's words.
- **Broken five ways on purpose** (never on, the switch ignored, one level
  ignored, Melee only, shields left on Defense), the suites fail every time.
- **`mp-gearlevel`** (a real page and worker, 7 checks):
  - the Armor tab's "Level 5 to wear";
  - the torso forged with its id;
  - the card's "Needs level 5 (you are 1)" and Equip's "NEEDS LEVEL 5", the
    worker wearing nothing;
  - at Melee 5 with no Defense point it goes on, and the worker holds it.
