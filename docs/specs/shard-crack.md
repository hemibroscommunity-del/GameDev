# Shards cracked for raw gems, three combined into a gem, gems in the bag (v2.3.3516)

The owner, 2026-10-19: *"a fun method would be for the shards to have a
certain percent chance of containing that elements raw gem. Like maybe a 10%
chance. Then after collecting a certain number of raw gems they can be
combined into an elemental gem."* And on `docs/GEM-PLAN.md`, 2026-10-20: *"All
of that sounds good"*, every recommended answer. This is the plan's
**Phase 2**. Phase 1 (v2.3.3513) put a weapon's gem on the worker:
`docs/specs/weapon-gems.md`.

## What a player sees

- **The Gem Works' first tab cracks shards.** Its line under the tab name says
  "Shards to gems" (the Set gems tab says "Gems into gear"). There is a row for
  each land you hold shards of. Each row shows how many you hold and your
  chance per shard, with two buttons: **Crack** (one shard) and **All** (up to
  50, sent as one request).
- **The crack plays out under the row you tapped.** There is one tile per
  shard, and the tiles come from the server's own dice. Each tile appears, then
  either crumbles or splits open to show the land's raw gem. A found gem rings,
  and the first few empty shards make a breaking sound. The window scrolls the
  result into view.
- **Raw gems combine.** Each element you hold raw gems of has a row: "×4 · 3
  make a Frost Gem", or "1 more for a Frost Gem". **Combine** takes three raw
  gems and makes one elemental gem. It never fails.
- **The Rare Gem cuts into the gem you pick.** If you hold one, a row shows the
  eight lands' gems. Tap one, then tap **Cut into a Frost Gem**. Two taps, so a
  4,000-gold stone is never turned into the wrong gem by a single slip.
- **"Your gems"** lists the elemental gems in your bag, with a pointer to the
  Set gems tab.
- **Gems are bag items.** The names are "Raw Frost Gem" and "Frost Gem", shown
  with the element's own picture until the owner's gem art arrives (Phase 3). A
  raw gem is drawn smaller and dimmer than a finished gem.
  - The item card says what each one is for:
    - a shard: "Crack at the Gem Works: 10% hold a Raw Frost Gem";
    - a raw gem: "3 make a Frost Gem";
    - a gem: "Set into your gear at the Gem Works · on a weapon: freezes what
      it hits…";
    - the Rare Gem: "Cut into any elemental gem".
  - Gems can be traded, listed at the auction house, sold to Diego, dropped, or
    sent in the mail like any bag item.
- **The Set gems tab shows the XP owed.** It says "Gems you made pay 400
  Enchanting XP when set: N still to come". If you have made none, it says that
  bought, traded and taken-out gems pay no XP.
- **The codex** has no raw gem row, because nothing drops one any more. On
  every page the shard's numbers on the kill roll moved from 612–1,611 down to
  112–1,111, where the raw gem's used to start.
- **The test panel** has two new buttons: "20 shards each" and "3 raw gems
  each".

## The worker

`server/src/shardcrack.js` handles the crack and the combine. `server/src/gems.js`
is the one place that counts, takes and gives gems.

```
shard_crack { land, count }             count 1-50
  -> shard_crack_result { ok: true, land, element, chance, rolls, found, left,
                          xp, leveled, newLevel, fromLevel }
  -> shard_crack_result { ok: false, land, reason }      off | down | bad_land | short
gem_combine { element }                 three raw gems -> one gem
gem_combine { element, rare: true }     one Rare Gem -> one gem (the eight lands only)
  -> gem_combine_result { ok: true, element, rare, made, xp, ... }
  -> gem_combine_result { ok: false, element, rare, reason, need?, have? }
                                        off | down | bad_gem | short | no_rare
```

Each answer is followed by a `player_state` carrying the bag and the XP. Both
answers are PRIVILEGED. Both handlers are synchronous, so two asks in one
bundle are settled one after the other, and one shard (or three raw gems) can
never be spent twice. Each act is saved once (`_saveRpg`, rule 10). A refusal
writes nothing.

| What | Number | Where |
|---|---|---|
| Lands that crack, each with its own element | frost–frost, ember–flame, sky–wind, hollows–stone, thunder–storm, tidal–water, mist–venom, verdant–flora (the meadow's shard has no element, so it holds no gem) | `SHARD_CRACK.LANDS` |
| Chance per shard | 10% at Gem Cutting 1, 12% from 15, 15% from 35, 20% from 60 (the old cut's four steps) | `SHARD_CRACK.CHANCE` |
| The roll | 1–100 per shard; a roll at or under the chance holds a gem | `SIDES` |
| Most shards per ask | 50, and never more than the bag holds | `MAX_PER_ASK` |
| Raw gems per gem | 3 | `RAW_PER_GEM` |
| Gem Cutting XP | 40 per crack, found or not; 200 per combine | `CRACK_XP`, `COMBINE_XP` |
| Diego's price | raw gem 1,200, gem 4,000, Rare Gem 4,000 (he pays half) | shop.js `SHOP.BASE` |

The phone's copy lives in `src/data/shards.js` (the crack) and `src/data/gems.js`
(the keys). `mirror-audit` holds both equal to the worker's, including the
chance at every level from 0 to 101 and that each land's gem is its own
element (data.js `ZONES`).

### Gems in the bag (`gems.js`)

- `gem_raw_<element>` is a raw gem and `gem_<element>` is an elemental gem.
  There are ten elements: the amulets' nine plus Flora.
- `gemCount` reads the bag **and** any old pouch (`lifeSkills.gems`,
  `raw_<e>` / `polished_<e>`). `gemTake` takes from the bag first, then the
  pouch. `gemGive` always gives into the bag.
- Every place that spends or pays a gem goes through these three. That
  includes the crack and the combine, a weapon's gem (weapongem.js), the
  amulet's and the shield's gems, Take out, salvage, the old cut and the dev
  kit.
- **The move into the bag happens at the join** (`gemsIntoBag`, called from
  amulet.js `_gemsAdoptOnJoin` on every join). The plan called for a
  registry migration, but this is a heal instead, for two reasons:
  - The join's one-time capture of an old browser's pouch writes gems into the
    pouch *after* any migration would have run. That is the "boundary heal"
    rule in docs/specs/migrations.md.
  - A migration bumps `RPG_SCHEMA_VERSION`. A rollback would then refuse every
    character saved since (the v2.3.3303 "newer save" rule). The move changes
    no field's shape, so an older worker still reads the character whole.
  - The heal is idempotent: an empty pouch moves nothing.

### The XP is for gems you made

v2.3.3513 paid 400 Enchanting XP once per gem by counting the gems that
**came back** to a player (`lifeSkills.gemsBack`). Now that gems trade, that
count cannot work. A gem that came back to one player and was handed to
another was "new" to the second player. So two players could pass one gem
(or one gemmed sword) back and forth and be paid 400 XP every round, for the
cost of a take-out (25–44 gold). That is about 60 times the honest rate, on a
skill shown on the leaderboard.

The count is now kept the other way round, based on something that cannot
change hands:

- `lifeSkills.gemsUnpaid`, by element, counts the gems a player **made** whose
  XP is still to come.
- These add to it: a combine, a Rare Gem's cut, the old cut (behind the kill
  switch) and the dev kit's gems.
- Setting a gem of that element pays 400 XP and uses one up. With none left,
  the set pays nothing.
- Gems that are bought, traded, won from Ace, picked up or taken out set the
  same way but pay no XP.
- Every gem still pays its XP exactly once, to the player who made it.
- At the move, each polished gem in the old pouch is owed its XP, minus the
  ones v2.3.3513 counted as having come back. The pouch never traded, so every
  gem in it was made by its owner. `gemsBack` is deleted in the same step.
- The join heals the count: only an element's own key, whole numbers of 1 or
  more, at most `WEAPON_GEM.UNPAID_MAX` (100,000).
- The map is always sent as an object, even when empty. The phone merges
  lifeSkills one key at a time and never drops a key the worker leaves out.

### What changed around it

- **No raw gem off a kill** (decision 1). `_killRollCan` reports no raw gem, so
  the shard's numbers move down to 112–1,111 on every monster. `_gemRawOnKill`
  pays nothing.
- **The old one-raw-gem cut is refused.** `gem_cut_request` would let a page
  from before this version make a gem from one raw gem, a third of the new
  price. The refusal sends the bag and life skills back to the page, because
  its own prediction took a raw gem away.
- **A death keeps gems** (gathering.js `_keptThroughDeath`).
  - The pouch was never lost. The owner's plan says gems go with the bag only
    "if another player kills you in No man's land".
  - No man's land's whole-bag loss (`all`) ignores the carve-outs, so gems
    still go to the killer there. The same applies to a red skull's death.
  - Without this, an elemental gem (about an hour's cracking) would have been
    lost to an ordinary monster kill, unless you ran back within 60 seconds.
- **Diego prices them** (`gem_raw_` 1,200, `gem_` 4,000; the longer name
  wins). Each is worth more than what went into it: 10 × 110 for a raw gem and
  3 × 1,200 for a gem. The Rare Gem goes from 20 to 4,000, an elemental gem's
  price, because it becomes one. At 20 he would have sold, for 20, a stone the
  Gem Works turns into a gem he pays 2,000 for.
- **Salvage's receipt** names the gems it gave back by their bag key
  (`gem_stone`).
- **Take out and salvage put gems into the bag.** `_extractableGems` pays any
  gem element now, so a Flora gem comes back too (decision 7).

### The kill switch

- `shardcrack: false` in the live flags un-advertises the cap and refuses every
  crack and combine (`off`).
- It brings back the old cut, which now works from the bag into the bag and
  counts as a gem made.
- It also brings back the kill's raw gem, into the bag, on the kill roll's
  numbers 112–611 with the shard at 612–1,611.
- Gems stay in the bag either way. The phone shows the old cut under the
  switch (GemcutPanel), and the codex shows the raw gem row again.

## Not done

- **Ace's coin flip takes gems like any other bag item** (45% to double,
  `gamble.js`). It loses value on average, as it does for ore, shards and
  the Rare Gem. Nothing about a gem needs a special rule there.
- **"Bankable"** (decision 5) has no code path. The Bank keeps gold and
  equipped gear, not bag items. Gems are kept through a death instead.
- **The gem pictures** are Phase 3.

## Tests

- **`server/test/shard-crack.test.mjs`** (47 checks) covers:
  - the flags;
  - a crack's rolls are the rolls credited;
  - one row written per ask, and Crack all's limits;
  - the chance at each step over 20,000 cracks;
  - every refusal;
  - the combine, including Flora and an old pouch's raw gem;
  - the Rare Gem;
  - the old cut refused;
  - the kill switch;
  - the move into the bag, once;
  - a death keeping gems while No man's land takes them;
  - two combines in one bundle.
  - Five deliberate bugs, each caught: a gem only under the chance, a Rare Gem
    into Dark, a combined gem owed no XP, gems lost on every death, and the old
    pouch not counted.
- **`weapon-gem` §9b**: one gem passed between two players pays once. §10
  covers the move and the debt at the join.
- **`killroll` §11**: no raw gem on the roll, and the shard at 112–1,111. §1–10
  run with the switch thrown.
- **`amulet`, `shieldgem`, `gearprov`** read the bag now.
- **`shop`**: the gems' prices, the Rare Gem's, and their sums.
- **`mirror-audit`**: the crack's tables and the gem keys. The codex's layout
  is checked with the crack on and with it off.
- **`caps-audit`**.
- **`mp-shardcrack`** (10 checks, a phone against a real worker):
  - fifty shards cracked in one ask, the reveal drawn tile by tile from the
    worker's rolls, and the gems in the bag and in the worker's record;
  - Combine;
  - the Frost Gem named and drawn in the bag, with its card;
  - set into a sword for its 400 XP;
  - a Rare Gem cut into Flora;
  - no page errors.
- **Updated for it:**
  - `mp-killroll`: 300 is the shard's number now.
  - `mp-codex`: eight rows.
  - `mp-weapongem` and `mp-shieldgem` read gem counts from the bag.
