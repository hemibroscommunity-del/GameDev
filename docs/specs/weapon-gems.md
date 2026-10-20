# A gem goes into a weapon on the worker, and the hold rule (v2.3.3513)

The owner, 2026-10-20, on `docs/GEM-PLAN.md`: *"All of that sounds good"*,
every recommended answer. This is the plan's **Phase 1**. It is also the last
item of ARCHITECTURE-HANDOFF backlog A: weapons were the last gear whose gem
slot only the browser knew about.

## What was wrong

The Set gems tab (`src/ui/panels/buildings/EnchantPanel.jsx`) changed only the
browser's own copy of the weapon and told the worker nothing. As a result:

- **The gem was never spent.** The worker owns the gem count (v2.3.1198), and
  its next `player_state` put the gem back.
- **The weapon came back plain** at the next join, or whenever the worker next
  sent its weapons (a forge, an equip or a hardening).
- **Features that read the worker's copy of the weapon saw no gem:**
  - the Element Burst was refused ("needs an enchanted weapon", `burst.js`);
  - the flame amulet's bonus never counted (`combat.js _computeAttackDamage`);
  - the Blacksmith's Take out found nothing to take out.
- **Each hit's element came from what the phone said.** A modified phone could
  claim any element without owning a gem (`combat.js _handleMonsterDamage`,
  `pvpextras.js _pvpClaimElement`).

## What the worker does now (`server/src/weapongem.js`)

**The request and the answer:**

```
weapon_gem { slot, gem }            slot: 'weapon' | 'rangedWeapon' | 'staffWeapon'
  -> weapon_gem_result { ok: true, slot, gem, name, element1, element2,
                         xp, leveled, newLevel, fromLevel }
  -> weapon_gem_result { ok: false, slot, gem, reason }
```

Then a `player_state` follows with the weapon, the gem count and the XP.
`weapon_gem_result` is PRIVILEGED.

**What happens on a set:**

- **The gem:** one polished gem comes off the worker's own count
  (`lifeSkills.gems`) and goes into the weapon's first open slot. That is
  `element1`, or `element2` on a weapon with two slots.
- **Damage is unchanged (decision 9):** `tierMult` is never touched. The old
  browser-only slot wrote 1.5, which the worker's damage roll never read.
- **Colour:** `tier` becomes `'elemental'`, or `'fusion'` with two gems. This
  only sets the colour the weapon is drawn in.
- **Name:** the weapon is renamed `"<metal> <Element> <type>"`, for example
  "Copper Flame Great Sword". This is the shield's rule. A weapon with no metal
  is named like the old drops ("Flame Sword"). Take out gives back the plain
  name (`amulet.js _stripGems`).
- **XP and saving:** the set pays 400 Enchanting XP, then saves before it
  answers (handoff rule 10).

**Slot rules:**

- **Number of slots:** each forge tier's `slots` value, looked up by the
  weapon's `gearBase` (`data.js BLACKSMITH_TIERS` / `WOODWORKING_TIERS`). Every
  metal and wood up to obsidian or ironbark has 1. A weapon with no known base
  has 1.
- **A full weapon is not overwritten** (decision 10). The refusal is `full`;
  Take out first.
- **The second slot** needs all of these:
  - Enchanting 20;
  - a different element from the first gem;
  - for a volatile pair, a fusion-ready base (Worldbreaker).

  These are the Enchanter's existing rules, now checked by the worker.

**Refusals:** `off`, `down`, `bad_slot`, `bad_gem`, `locked` (a guard's gear
lock), `no_weapon`, `full`, `level`, `same`, `volatile`, `no_gem`.

### Which gems fit a weapon

`data.js WEAPON_GEMS` lists the eight lands' elements: flame, frost, water,
venom, storm, stone, wind and flora.

- **Dark and Light are not allowed.** They belong to the realms, which are not
  built. Their collisions (eclipse is the biggest number in the table) are not
  meant to reach a weapon yet.
- **No Flora gem exists until Phase 2.** The gem pouch still keeps
  `AMULET_GEMS` only.

### In a fight: the worker's copy, never the claim

`_weaponHitElement(ps, kind, special)` returns the gem in the worker's copy of
the weapon the hit was made with. On a special it returns the second gem if
there is one, otherwise the first.

- **Hits on monsters:** `_handleMonsterDamage` uses it for the status and the
  collision.
- **Hits on players:** `_pvpClaimElement` uses it too, given the special the
  blow was actually counted as.
- **On the phone:** a special now carries `element2 || element1`
  (`monsterCombat.js`). It used to carry only `element2`, which left a one-gem
  weapon's special with no element on the phone while the worker applied one.
- **Already correct:** the burst, the lunge and the flame amulet always read
  the worker's copy. They work now because that copy holds the gem.

### Each gem pays its XP once

Decision 11 sets the XP at 400 Enchanting XP per gem set, whether the gem goes
into a weapon, an amulet or a shield (`data.js GEM_SET_XP`; it was 20 for an
amulet or shield). But Take out returns the gem to the count. Without a rule,
"set, take out, set again" would turn gold into Enchanting levels, and
Enchanting appears on the leaderboard and in the chain score.

So the worker counts gems that came back:

- **Counted:** `lifeSkills.gemsBack`, by element. Take out adds to it
  (`amulet.js` op `extract`, for weapons and shields), and so does a salvaged
  weapon.
- **Used:** setting a gem that came back pays nothing and lowers the count by
  one (`_gemSetXp`). It is used by all three set paths: weapon, amulet and
  shield.
- **Healed at each join** (`amulet.js _gemsAdoptOnJoin`): only elements are
  kept, and never more than the gems of that element you hold.

### Getting a gem back

- **Take out** is now offered on the Set gems tab too. It sends the
  Blacksmith's own request (`amulet_forge_request {op: 'extract', target}`,
  `caps.gemExtract`), at the Blacksmith's price.
- **Salvage:** a weapon salvaged at the Blacksmith returns its gems along with
  its bars (`salvage.js`, the result's `gems`).

### The sanitizer (`gear.js _sanitizeWeapon`)

A weapon's gems are now worker state, so every weapon that passes the
sanitizer is checked:

- Each element must be an own key of the status table (TRAPS #6); anything
  else becomes none.
- A second gem with no first moves up into the first slot.
- The same element twice counts as one gem.
- `isVolatile` (collisions hit 1.3x) is worked out from the pair, never taken
  from a stored flag.
- Nothing else changes. Gems on older weapons stay: an old server drop's gems,
  or a claim taken at a first join before v2.3.3138.

### A sell order lists the gems its weapon holds (`market.js`)

A sell order's `element1`/`element2` decide where it sits in the book, which
buy orders it matches, and what the listing shows. They used to be whatever
the seller typed, so a plain blade could be listed as a Flame one. A sell now
takes them from the weapon it escrows. A buy order still names what it wants.

### Sparring clones (`spar.js`)

A clone fights with your weapon as the worker copies it, gem included. The
gem named in your look is used only with `weapongem: false`.

## The hold rule for monsters (`server/src/elemental.js HOLD`)

Decision 8: *"Stopped for 1.5 s, then 3 s before another stop; bosses half."*

**What was wrong:** a freeze or root stopped a monster for as long as the
status lasted, and every hit refreshed the status. Once gems were real, a frost
or venom weapon would have kept everything it hit standing still.

**What happens now:**

- **The stop:** a freeze or root that lands starts a stop of `HOLD.MS` 1,500
  ms. A dungeon boss (`_dungeonBoss`) is stopped for half that.
- **Immunity:** after the stop, the monster cannot be stopped again for
  `HOLD.IMMUNE_MS` 3,000 ms. A freeze or root that lands during the stop or the
  immune time starts nothing.
- **After the stop, the status still runs its full length:**
  - a frozen monster is **chilled**: it moves at `HOLD.CHILL_MULT` 0.5 and can
    attack;
  - a rooted monster walks normally while the root's poison keeps ticking;
  - slow is 0.4 either way; if a monster is both chilled and slowed, it takes
    the stronger of the two.
- **Attunement** lengthens the status, never the stop.
- **Where it's applied:** `startElementHold` runs inside `applyElementStatus`,
  so every source stops a monster the same way: a hit, the lunge, the burst.
  `elementMoveMult(m, now, hold)` is read by `_tickMonsters`, which reads the
  switch once per tick.
- **Respawn:** a respawn clears both stamps.
- **Players are unchanged.** They keep their own rule (`pvpextras.js
  _pvpHold`: a daze of 0.5 s then 2.5 s, stuck for 0.7 s then 2 s).
- **Not on the phone:** the phone's own monster AI (`monsterCombat.js`
  moveMult) runs only for monsters the worker does not run, and in the Wheel
  there are none. So the plan's client mirror of the hold was not built. The
  phone draws where the worker puts each monster.

## The phone

- **`src/game/weaponGem.js`:**
  - asks the worker (`weapon_gem`) and waits up to 4 s;
  - asks for Take out;
  - puts any refusal into words;
  - celebrates an Enchanting level;
  - sets the browser's own quest flags (`_questFlags.enchantedWeapon` /
    `slottedGem`; handoff rule 18).
- **`src/data/weaponGems.js`:** the worker's rules for the window: the gems,
  the slots, the pairs, the second slot's level and the XP. `mirror-audit`
  holds it equal to the worker's.
- **The Set gems tab (`EnchantPanel.jsx`)**, against `caps.weapongem`:
  - the gem buttons ask the worker and wait;
  - a refusal is written under the weapon it was about;
  - each gem gets one line saying what it does on a hit, in the worker's words
    (`weaponGemEffect`). The frost and venom lines mention the 1.5 s stop when
    `caps.monsterhold` is on;
  - the "(1.5×)" after the rarity is gone, because it was never true;
  - Take out appears with its price.
  - Against an older worker, or with the switch off, the old browser-only slot
    is kept.
- **The Element Burst button** (`ElementBurstButton.jsx`) now hides while a
  window is open (`uiBusyBus`). It is drawn outside `.brotown-wrap`, so it
  painted over the windows. With gems that last it would have stayed up for
  good, on top of the very window that set the gem (mp-weapongem's picture).

## Switches

- **`weapongem: false`** in liveflags:
  - takes `caps.weapongem` away, so the phone goes back to its old slot;
  - refuses every request (`off`);
  - puts the fight back on the claimed element.

  Weapons that already hold a gem keep it.
- **`monsterhold: false`:** brings back the old lock (stopped for as long as
  the status lasts). The worker reads it once per tick.

## Tests

- **`server/test/weapon-gem.test.mjs`** (13 sections). It catches four planted
  mistakes: the fight taking the claim, XP paid on every set, the hold without
  immunity, and a full weapon being overwritten.
- **Changed for the new rules:** `combat-lifecycle`, `pvp-extras` (its
  mutation check now catches the claim winning), `amulet` and `shieldgem`
  (400 XP).
- **`mirror-audit`:** the weapon gem rules, both sides.
- **`cost-guard` §10:** a gem set writes one row, and a refused request writes
  none.
- **`tools/qa/mp/mp-weapongem.mjs`** (14 checks, on a phone): the Set gems tab
  asks the worker; a refusal says why; a reload keeps the gem; the Element
  Burst goes; at the Flame Fields the worker burns the goblins although every
  swing claimed frost; Take out returns the gem; setting it again pays no XP.
- **`mp-pvpextras`** now sets its gems the way a player does
  (`H.weaponGem`: a gem from the kit, Take out, `weapon_gem`). Writing the gem
  on the page alone no longer carries an element (TRAPS §240).

## For players

Anyone who put a gem into a weapon on the phone before this version must set
it again. That gem was never spent, so they still have it.
