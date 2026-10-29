# One-handed swords become greatswords (PLAN, v2.3.3889)

> **Status: a plan, not built.** Docs only; no code until the orchestrator
> (and the owner, for the four calls at the end) says go.

The owner decided: the old one-handed swords that older characters still hold
become greatswords, so nobody is left holding a retired weapon. The Forge has
made only greatswords since v2.3.3524 (docs/specs/blacksmith-2026-10-19.md:
"the one-handed sword was a bamboo stick in every picture"), but the worker
still forges a one-handed sword for an older page that asks.

## In plain words

- Every one-handed sword a character owns turns into a greatsword of the **same
  metal**, keeping its grade (Rare, Elite...), its hardening, its temper and
  its gems. The conversion happens once, by itself, the next time the player
  logs in.
- It is a **buff**: a greatsword's base damage is 10 against the sword's 6.67,
  the same bars and the same skill. Its sell price rises a little (copper 4 → 6
  gold).
- **Shields are not touched.** There is no two-handed rule anywhere in the game:
  the starter kit is a greatsword AND a shield. So no shield comes off, and no
  full bag can be a problem.
- A sword sitting in the post, the Auction House or the Marketplace becomes a
  greatsword when it is delivered, and the shelves show it as one.
- An older page that still asks the Forge for a sword gets a greatsword.

## 1. Where a one-handed sword can be today

The two types share one tier table (`BLACKSMITH_TIERS`, data.js; mirrored in
src/data/gameSystems.js). A sword is a weapon blob with `type: 'sword'`. Only
three things on the server read the type differently: the base damage
(`_weaponBase`, gear.js: 6.67 vs 10, which also feeds the anti-cheat cap and the
sell value), the old pre-prog3 forge gate (`_equipStatFor`: agility vs power),
and the label ('Sword' / 'Great Sword', `WEAPON_TYPE_LABELS`). The skill, the
weapon category, the slot, salvage, hardening's material, the equip gate and
the special all treat both as the sword family, so **what a player can equip
does not change**.

| Where | Field | How it converts |
|---|---|---|
| The character (`rpg:<pid>`) | `weapon`, `rangedWeapon`, `staffWeapon`, `weaponStash` (8) | **migration v19** on load (section 3) |
| Snapshots (`rpgsnap:<pid>:*`) | the whole blob | nothing at rest: a restored snapshot carries its old `_v` and migrates on its next load |
| The post (`inbox:<pid>`) | `{kind: 'weapon', payload: {weapon}}` from the market, the Auction House, a trade, No man's land, a quest overflow | **heal on delivery** in the weapon credit (inbox.js `_applyCreditToPs`). The post is drained AFTER the join's migration, so the migration alone would miss these |
| Auction House (`store_listing:<id>`) | `rec.weapon`, `rec.disp` | **at rest**, in the wake-time rebuild (`_stConverge`) that already pages every listing: a listing holding a sword is rewritten once. And the delivery heal catches it anyway |
| Marketplace (`mkt_order:<id>`) | a sell order's `item`; `subtype` in the book's key | **at rest**, in `_mktEnsureIndex`: a sell order's item converted and its `subtype` 'sword' moved to 'greatsword' and re-keyed; a buy order for 'sword' re-keyed the same way (it holds gold only) |
| Trade escrow (`trade2wpn:`) | the staged weapon | nothing: short-lived, and every way out goes through the credit, which heals |
| Ground piles | `pile.weapon` (memory) | nothing: only the iron greatsword drops now |
| The Forge | `forge_weapon {weaponType: 'sword'}` from an old page | **mapped to 'greatsword'** (gear.js, the type check), so the old page still gets a weapon, and no new sword is ever made |

Nowhere else: the bank vault holds stackables and gold only; Diego's stock,
the farm and duel stakes hold no weapons; gear_prov holds no weapons; no
stackable bag key is a sword; the devtools kit and every quest grant a
greatsword already.

**Careful:** `'sword'` is also the SKILL key (`prog3.sk.sword`,
`weaponSpecs.sword`, `t2Flat.sword`, `atk.sword`). The conversion changes a
weapon's `type` and nothing else named `sword`.

## 2. The mapping

One pure function, `swordToGreatsword(w)` (new, in gear.js beside
`_sanitizeWeapon`), used by every door above, so the migration, the delivery
heal, the shelves and the forge can never disagree:

| Field | Change |
|---|---|
| `type` | `'sword'` → `'greatsword'` |
| `gearBase`, `tier`, `tierMult` | unchanged (the same metal and tier; owner call 1 for wood) |
| `quality`, `hardness`, `temper`, `reforgeBonus`, `hardenBonus` | unchanged |
| `element1`, `element2`, `isVolatile` (gems) | unchanged |
| `name` | rebuilt only when it is a name the game made for a sword (owner call 3): the forge's "copper sword" → "copper greatsword"; a gem name through `weaponGemName`; the old drops' "Flame Sword" → "Flame Great Sword". A name given by hand (a quest's "Iron Longsword") is kept. The client's shown name comes from the tier and the type anyway (equipModel.js `weaponDisplayName`) |
| `was` | new: `'sword'` (owner call 4), so a later change of mind can be undone and a test can tell a converted weapon from a forged one |

Legacy swords with no `gearBase` (the old random drops, v2.3.1141-v2.3.3209:
tiers common / elemental / fusion / shift) convert the same way; their
`tierMult` stays.

## 3. When it runs

- **Migration v19, `swords-become-greatswords`** (migrations.js; the recipe in
  docs/specs/migrations.md): bump `RPG_SCHEMA_VERSION` to 19, append the entry,
  walk the four fields exactly as v12 (`starter-weapons-named-for-their-metal`)
  does. It runs on the next load of each character (`_loadRpg`), so on join and
  on an offline escrow read; an offline character converts when next loaded.
- **Never twice**: `_v` is stamped at 19, and the function itself is idempotent
  (a greatsword stays a greatsword; `was` is set once). Partial-tolerant: a
  blob already half-converted finishes.
- **A failed one** (it throws): the registry fails open. The blob stays at v18,
  the save records the version really reached (`_rpgSaveVFor`, TRAPS §191),
  the log names it, and the next load tries again. Meanwhile the player plays
  with the sword, which still works: nothing is lost.
- **Boundary heals** (migrations.md's rule for writers the migration never
  sees): the delivery heal, the shelves' rebuilds, and the forge mapping.
- **A worker rollback** after v19: a blob at v19 is refused at the join by an
  older worker (close 1011, "a save from a NEWER worker is refused") unless the
  live flag `newersave: false` is set. That is the existing posture for every
  migration; written here so a rollback during this change is done knowingly.

## 4. The client

- The client keeps its own copy (`bt_rpg`) and sends it at join, but the server
  ignores it (a stored record wins; a join with no record reads no `rpg*`
  claim), and the first `player_state` replaces the slots and the bag
  wholesale. An old page holding a cached sword is corrected on join.
- The client's tables keep their `'sword'` entries (old pages, the QA
  scenarios that put a sword on the page, the mirror-audit fixtures): removing
  them is a cleanup for later, not part of this change. **mirror-audit stays
  as it is.**
- The Marketplace's subtype list (`MKT_CATEGORIES.weapon.subtypes`) loses
  'sword' in the same change, so nobody can post a new sword buy order.

## 5. Safety

- **Kill switch** `swordconvert: false` (live flags, lower case): stops the
  boundary heals and the shelves' rewrites, and the forge goes back to making
  what it is asked for. The migration itself is not switchable: it is the
  record's shape, stamped by `_v`, and a switch that turned it off part-way
  through the players would leave two shapes of the same thing.
- **No duplication**: every door converts a weapon in place, inside the write
  it was already making (a store listing's rewrite is its own one put; a
  credit's conversion rides the credit's own save). Nothing is copied.
- **No storage key added**; no rpg-blob field added (`was` rides on the weapon,
  as `quality` does). The registry rows for `store_listing:` and `mkt_order:`
  gain a line saying they may be rewritten once.
- **Cost**: the migration adds no write of its own (a changed blob is re-put
  once on load, and the join saves anyway). One put per Auction House listing
  or Marketplace order that holds a sword, once, at the first wake after the
  deploy. The delivery heal writes nothing extra.

## 6. Tests

- `migrations.test` v19: each of the four fields; the stash full (8); a legacy
  sword with no gearBase; a gemmed one (name through `weaponGemName`); a
  hand-named one kept; wood per owner call 1; idempotent (run twice); a
  half-converted blob; a migration that throws stays at 18 and runs on the next
  load. The v12 case keeps passing because a hand-given name is kept.
- A new `sword-convert.test`: the post (a market refund, an Auction House sale,
  a No man's land loot, a trade refund each deliver a greatsword); a store
  listing rewritten once at the rebuild and shown as a Great Sword; a
  Marketplace sell order converted and re-keyed, and a 'sword' buy order
  re-keyed; `forge_weapon {weaponType: 'sword'}` mints a greatsword; the kill
  switch; `'sword'` skill keys untouched; damage at the greatsword's base after
  conversion.
- Suites that use `type: 'sword'` as a generic melee fixture (display-dps,
  protocol-v2, hardening, anticheat...) keep passing: `_weaponBase('sword')`
  stays for old blobs.
- A phone scenario `mp-swordconvert` (world: 'wheel'; upright, and a computer
  with wide: true): a character put on file with a copper sword in hand and a
  gemmed iron sword in the bag joins; the hand shows a Copper Great Sword, the
  bag a Great Sword with its gem; a swing deals greatsword damage; a reload
  keeps it.

**Size:** one PR, one lane, mostly server (migrations.js, gear.js, inbox.js,
store.js, market.js, liveops) plus the Marketplace's subtype list, the tests and
this spec. Deploys the worker.

## 7. For the owner

1. **Wood swords** (the bamboo stick, including the very old "Bro's Sword").
   The owner said "'wood greatsword' is not an actual weapon in the game".
   *Recommend:* they become **copper greatswords**, the game's first weapon
   (a small gift: tier 1.00 → 1.12). The alternative is wood greatswords, a
   weapon the game otherwise no longer has.
2. **The buff.** Every converted sword hits about 50% harder (base 6.67 → 10),
   because that is what a greatsword of the same metal does. *Recommend:*
   accept it; it is what the Forge makes from the same bars today.
3. **Names.** *Recommend:* rebuild the names the game made ("copper sword" →
   "copper greatsword", "Flame Sword" → "Flame Great Sword"), keep names given
   by hand ("Iron Longsword").
4. **A mark on converted weapons** (`was: 'sword'`). *Recommend:* yes. It
   costs a few bytes a weapon and lets this be undone exactly.
