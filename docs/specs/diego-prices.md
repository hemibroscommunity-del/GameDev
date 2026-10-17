# Diego's prices: a family prices its own, and nothing else has a price (v2.3.3184)

Diego (Shopkeeper Bro, `server/src/shop.js`) prices every item by its
**family** in `SHOP.BASE`: `ore_`, `wood_`, `bar_`, `hardened_`, `shard_`,
the three `essence_<grade>_` grades, the monster remains (`remnants`), the
farm's seeds and crops, and a few exact names. He pays half of it, falling as
his pile grows, and asks the whole of it.

The overnight economy review (decision 8) found two problems in how a key
found its family:

- **A family matched anywhere in a key.** `_shopBaseValue` used
  `k.indexOf(pre) !== -1`, so a key merely *containing* `essence_godly_`
  priced at 250,000 and `crowbar_` priced as a bar. No path mints such keys
  today, but the rule was one new item name away from a gold printer.
- **Anything with no family had a price anyway: 20** (`SHOP.BASE_DEFAULT`; he
  paid 10). That priced:
  - the event **golden tickets** and **cape trophies**: a ticket he bought for
    10 was one of the contest's ten capes for whoever paid 20;
  - the quest **tools** (hatchet, rod, pickaxe): buying one skipped the
    Mayor's quest that hands it over;
  - the old **daily chest**, which pays more to open than 20;
  - the legacy **basic trap** (turned into a box trap at the join).

## The rule now (`shopFamilyMatch`, `_shopBaseValue`)

A family `pre` prices the lower-cased key `k` only as a family:

- `k` **is** the family (`snowman`, `whetstone`, `crop_carrot`, `manashard`);
- a family ending in `_` is the key's **start** (`ore_`, `bar_`, `shard_`,
  `hardened_`, `essence_godly_`);
- a whole name continued with `_` (`cooked_fish` → `cooked_fish_trout`);
- a monster's remains: `-` + family at the **end** (`remnants` →
  `slime-remnants`).

The longest matching family still wins. A key no family matches has **no
price** (`null`): he neither buys it ("He doesn't deal in those"), quotes it
(0, so his window says "He won't buy"), lists it, nor sells it out of a pile
that took it in under the old default (it stays in the pile, unsold).

Three keys that only ever had the default and are worth selling to him keep
exactly that price as their own: **`rare_gem`, `trap_box` and `burnt_dust`
at 20** (he pays 10). `BASE_DEFAULT` stays in the table as the number they
were held to, and is read by nothing else.

**Every key the game mints keeps its exact price**, except the five kinds
above that had only the default: the shop suite reads every minting table
(gathering, smelting, hardened wood, traps, salvage essences, farm, cooking,
the shop items, tools, remains, shards, the rare gem, the daily chest, the
event capes, the quests' items) and compares the new price with the old
substring rule's for each of them.

## Not changed (prices are the owner's)

The review also noted price *levels* that are choices, not holes, and left
them as they are: hardened wood sells for less than its five logs, a crop's
first unit at an empty pile is his best offer, and two of the order board's
orders can be filled from his own stock once a day.

## Tests

`server/test/shop.test.mjs`, the section after the quote list: every minted
key's price unchanged (81 keys), the five no-price kinds, the three kept at
20, look-alike keys (`xessence_godly_mithril`, `crowbar_`, `bat-wing` ...)
with no price, the families still pricing their own, a golden ticket and a
pickaxe neither bought nor quoted nor listed nor sold out of his pile, and a
rare gem still selling for 10. Two older checks used made-up keys the old
rule happened to price (`ok_key`, `bat-wing`); they use real ones now.

## v2.3.3301: the three tools he sells back

A death in No man's land takes the gathering tools now (no-mans-land.md
"Everything but what you wear"), and the owner chose "Drop them, sell
replacements". So Diego sells the axe, the rod and the pickaxe at a flat 100
gold each (`TOOL_SHELF`, server/src/shop.js), outside his pile and his price
families: one at a time, only to a player a quest gave that tool who holds
none. They stay **unpriced** for selling: he never buys one back, so a tool
taken from the dead is no gold at his counter, and the v2.3.3184 rule above (a
pickaxe neither bought nor sold out of his pile) still holds for the pile.
Tested in `server/test/shop.test.mjs` "a lost tool, bought back" and
`tools/qa/mp/mp-toolshelf.mjs`.
