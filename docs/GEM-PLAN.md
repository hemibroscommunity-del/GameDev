# Shards into gems, gems into weapons (v2.3.3497)

> Owner, 2026-10-19: *"Right now I don't have any way of applying elements to
> weapons in Brotown. There's shards that drop in each zone (by element). But I
> don't have a plan for how these shards become gems that then can be socketed
> into your weapon. Help write up a plan that makes sense with the jeweler I
> have in the game and these shards become gems."*

**This is a plan. Nothing in it is built yet.** It comes from reading the
game's code, and each fact names the file it comes from. Every choice has a
recommendation, and they are all listed under "Your decisions" near the end,
so "Go recommended" takes them all.

## The short answer

1. **Shards keep dropping as they do now.** A land's monsters drop its shard
   on 1 kill in 10. Its trees, rocks and fishing spots drop one on 1 harvest
   in 3.
2. **The Gem Cutter turns 10 shards into a gem.** At the Gem Works, on the
   *Cut gems* tab, 10 Frost Shards make a Frost Gem. A cut always works. A
   higher Gem Cutting level makes gems cheaper: 8 shards from level 15, 6 from
   35 and 5 from 60.
3. **The Gem Setter puts the gem in your weapon.** On the *Set gems* tab, the
   sword, bow or staff you have equipped takes the gem. The server keeps it
   there, through logging out, dying, trading and selling.
4. **Every hit then carries the gem's element.** A Frost Gem freezes what you
   hit, a Flame Gem burns it, and so on (see the table below). A gem also
   switches on the Element Burst button, the flame amulet's bonus and the
   ELEMENT points in the Points window.
5. **You can take the gem out again** on the same tab, for a little gold (25
   to 44 gold today, depending on the weapon's metal). The gem comes back to
   you.
6. **A Rare Gem cuts into any gem you choose**, with no shards needed. It drops
   on 1 kill in 200, anywhere. Today it has no use at all.

This is the story the Gem Works already tells. Its room picture has baskets of
rough crystals (the shards), trays of cut gems, and a setting bench with empty
sockets. The cutter and the setter are the two keepers you planned for the
building (docs/ART-WISHLIST.md, "The keepers"). The cutter turns shards into
gems, and the setter puts gems into gear.

## The eight lands, their shards and their gems

| Land | Its shard (today's name) | Its gem | What the gem does to what you hit |
|---|---|---|---|
| Frost Ridge | Frost Shard | Frost Gem | **Freeze**: stops it moving and attacking |
| Flame Fields | Ember Shard | Flame Gem | **Burn**: fire damage twice a second for 4 s |
| Wind Dunes | Wind Shard | Wind Gem | **Slow**: it moves at 40% speed |
| Stone Hollows | Stone Shard | Stone Gem | **Fracture**: it takes 6% more damage per stack, up to 30% |
| Electric Foundry | Thunder Shard | Storm Gem | **Shock**: nothing on its own today (Phase 4) |
| Water Caves | Tidal Shard | Water Gem | **Soak**: nothing on its own today (Phase 4) |
| Poison Forest | Mist Shard | Venom Gem | **Root**: stops it moving and attacking, and poisons it |
| Verdant Wilds | Flora Shard | Flora Gem (new) | **Thorn**: it takes damage every time it attacks |

- **The gem picks the element. Your points decide how hard it hits.** Burn,
  poison, thorn and the combos all grow with that weapon's ELEMENT points
  (server/src/prog3.js `PROG3.ATK.elem`).
- **Two different elements on one monster set off a combo.** There are 28
  combos between these eight elements, such as steam (flame and frost) and
  overcharge (flame and storm) (server/src/elemental.js `COLLISION_TABLE`).
  With one gem per weapon, combos come from a party whose gems differ, or from
  switching weapons: a frost sword, then a flame bow.
- **Dark and Light** belong to the realms past the gates (levels 80–100),
  which are not built yet. Their gems stay in the game's tables for then.
- **The Starting Meadow's shard** (labelled "Verdant Shard") comes from a land
  that is closed, so it cannot drop in the Wheel. You can still sell it.

## What the code does today

### What already works

- **Shards drop** as described above. The server rolls them
  (server/src/data.js `SHARD_MONSTER_DROP`, server/src/gathering.js
  `_rollHarvestShard`) and they go into the bag. Diego pays up to 55 gold for
  one: his price is 110 (server/src/shop.js `SHOP.BASE.shard_`), and he pays
  half.
- **The server settles the Gem Cutter's cut** (server/src/amulet.js
  `_handleGemCut`, v2.3.1198). A cut succeeds 60% of the time at Gem Cutting 1,
  75% from level 15, 90% from 35 and 98% from 60 (`GEM_CUT_TIERS`). A failed
  cut loses what was being cut. But it cuts **raw gems**, not shards (see
  below).
- **Amulets and shields take their gem on the server** (the gem step in
  amulet.js, v2.3.1192; server/src/shieldgem.js, v2.3.3187). The Blacksmith
  takes gems back out on the server too (amulet.js `op: 'extract'`,
  v2.3.1209).
- **The elements really work on the server's monsters**
  (server/src/elemental.js, v2.3.1114 onwards). Burns and poison tick, freeze
  and root stop a monster, fracture adds damage, and combos go off.

### What is missing or broken

1. **Shards make nothing.** Selling them to Diego is their only use. The
   Enchanting skill's card says "Infuse gear with elemental shards"
   (src/ui/mobile/sheet/skillsModel.js), but no code does that.
2. **The Gem Cutter cuts something else: raw gems.** They drop on 1 kill in
   20, and only to the player who lands the killing blow (amulet.js
   `_gemRawOnKill`, data.js `GEM_RAW_MONSTER_DROP`). None drop in the Verdant
   Wilds, because Flora is not one of the gem elements (data.js
   `AMULET_GEMS`). Raw and cut gems sit in a hidden pouch (`lifeSkills.gems`)
   that the bag never shows. You see a popup ("Raw Frost Gem!"), and after
   that the gem only appears on the Gem Works' tab.
3. **A gem put into a WEAPON exists only on the phone.** The *Set gems* tab
   changes only the phone's copy of the weapon
   (src/ui/panels/buildings/EnchantPanel.jsx), and no message tells the
   server. Shields and amulets were moved to the server, and weapons are the
   last ones left (docs/ARCHITECTURE-HANDOFF.md, backlog A). While the phone
   still shows the gem, your hits do carry its element, because the server
   takes each hit's element from what the phone says (server/src/combat.js
   `_handleMonsterDamage`, server/src/pvpextras.js `_pvpClaimElement`). But:
   - **The gem is never spent.** The next time the server sends your skills (a
     harvest, a cut, your next login), the gem is back in your count.
   - **The weapon comes back plain** at your next login, or the next time the
     server sends your weapons (after a forge, an equip or a hardening). The
     server's copy never had the gem: server/src/gear.js `_handleForgeWeapon`
     makes every weapon with `element1: null`, and src/networking/wsClient.js
     replaces the phone's weapon with the server's.
   - **The Element Burst button appears, and then the server refuses it** with
     "Element Burst needs an enchanted weapon" (server/src/burst.js
     `_burstRefusal` checks the server's copy).
   - **The flame amulet's damage bonus never counts**, because combat.js
     `_computeAttackDamage` looks for an element on the server's copy.
   - **The Blacksmith can't take the gem out**, because the server finds no
     gem there.
   - **"Elemental (1.5×)" on the tab was never real.** The window sets the
     weapon's damage multiplier to 1.5 on the phone, but the server's damage
     roll always used the metal's own number (copper 1.12, black steel 1.40).
     For metals above 1.5 the window would even have lowered it.
   - **The server takes the phone's word for each hit's element**, so a
     modified phone could claim any element without owning a gem.
4. **The Rare Gem has no use.** It drops on 1 kill in 200, from any monster
   (server/src/index.js `_rollRareGemForKill`). Diego pays 10 gold for it.
5. **ELEMENT points work only while a phone-only gem lasts.** The Points
   window offers them for each weapon ("Stronger burns and combos"). With no
   element that lasts, they mostly buy nothing.
6. **Freeze and root lock a monster down.** A frozen or rooted monster can't
   move or attack (index.js `_tickMonsters`, elemental.js `elementMoveMult`).
   Every hit tops the time back up, and nothing makes a monster immune, not
   even a boss. Today this hardly shows, because almost nobody has an element
   that lasts. With real gems, a frost or venom weapon would keep everything
   it hits standing still. This has to change in the same release (decision
   7).
7. **Water's soak and storm's shock do nothing on their own.** They only start
   a combo.
8. **"UP" over a hit is not real.** The game shows UP (or DN) when your element
   beats (or loses to) the monster's (src/game/monsterCombat.js), but the hit's
   damage does not change. Only combos read the matchup.
9. **Every weapon in the game has one gem slot.** Two-slot weapons start at
   mythril and crystalwood (data.js `BLACKSMITH_TIERS` and
   `WOODWORKING_TIERS`, `slots`), and nothing in the Wheel grows those yet. So a
   second gem in one weapon ("Fusion") is out of reach, and this plan leaves
   it for later.

## How it plays (recommended)

### Shards

- **They drop just as they do now.**
- **A shard's card says what it's for:** "10 make a Frost Gem at the Gem
  Works."
- **Optional (decision 11):** rename four shards after their element (Ember to
  Flame, Thunder to Storm, Tidal to Water, Mist to Venom), so "10 Flame Shards
  make a Flame Gem" reads at a glance. Only the name changes. It is the same
  item, and players keep every one they have.

### Cutting: the Gem Cutter's *Cut gems* tab

- **One row for each land you have shards from.** Each row shows the shard's
  picture, how many you have, "10 → Frost Gem", and a **Cut** button. If you
  are short of shards, the button is greyed out and says what you need: "Need
  10, you have 7".
- **A cut always works** (decision 3). Your Gem Cutting level lowers the cost,
  using today's four cutting steps (`GEM_CUT_TIERS`):

  | Gem Cutting level | Shards for one gem |
  |---|---|
  | 1–14 | 10 |
  | 15–34 | 8 |
  | 35–59 | 6 |
  | 60 and up | 5 |

- **Each cut pays 400 Gem Cutting XP** (decision 10).
- **A Rare Gem row** reads "Rare Gem ×2: cut into …", followed by the eight
  gems. One Rare Gem makes one gem of the element you tap (decision 5).
- **Raw gems stop dropping** (decision 1). Every raw gem a player already holds
  becomes a gem when gems move into the bag (next section), so nobody loses
  one.

### Gems live in your bag (decision 4)

- **A gem is an ordinary bag item** ("Frost Gem"), next to the shards it came
  from, with its own picture (Phase 3).
- **So you can trade it**, list it at the auction house, keep it in the bank,
  drop it, or sell it to Diego. He would pay up to 600, more than the 10
  shards it took.
- **Like everything you carry, it goes with your bag** if another player kills
  you in No man's land.
- **The hidden pouch is emptied into the bag once**, at each player's next
  login.

### Setting: the Gem Setter's *Set gems* tab

- **It shows the three weapons you have equipped** (melee, bow and staff),
  each with its one slot. Tap a gem you hold to set it. The window waits for
  the server's answer, as the shield's slot has since v2.3.3187, and if the
  server says no, the window says why.
- **The server keeps the gem in the weapon.** It stays through logging out,
  dying and the bank. A weapon you trade, sell or list keeps its gem.
- **The weapon keeps its metal's damage** (decision 8). What the gem adds is
  its element.
- **A full slot is not overwritten** (decision 9). **Take out** is on this tab
  too (and still at the Blacksmith), at today's price, and the gem comes back.
- **Salvaging a weapon** at the Blacksmith gives its gem back along with the
  bars.
- **Each gem you set pays 400 Enchanting XP** (decision 10).
- **Amulets and shields work as they do now**, and take their gem from the
  bag. The Flora Gem has no amulet or shield bonus yet (decision 6), so the
  window doesn't offer it for those.

### In a fight

- **Every hit with that weapon** puts the gem's element on what it hits:
  swings, arrows, bolts and the specials. Today a special skips the element on
  the phone.
- **The Element Burst button** shows up when the weapon in your hand has a gem,
  and it works.
- **The flame amulet** adds its damage to any weapon with a gem, as its card
  always said.
- **The sword's lunge** carries the element too. server/src/abilities.js
  already reads the server's copy of the weapon.
- **Against other players** (duels and No man's land) it works the same way,
  under the hold rule players already have.
- **The server reads the element from its own copy of the weapon**, never from
  the phone.

### The hold rule for monsters (decision 7)

- A **freeze** stops a monster for 1.5 s. For the rest of the freeze, the
  monster is chilled and moves at half speed.
- A **root** stops a monster for 1.5 s, and its poison keeps ticking for the
  full 5 s.
- After a monster has been stopped, it can't be stopped again for 3 s. Bosses
  are stopped for half as long.
- Players already have a rule like this against each other (pvpextras.js,
  v2.3.3264). A freeze holds a player for 0.5 s, then they can't be held again
  for 2.5 s. A root holds a player for 0.7 s, then 2 s.

### Pictures

- **Gems need pictures.** docs/ART-WISHLIST.md has a prompt (v2.3.3481) for
  raw and cut gems in nine elements, without Flora. Under this plan only cut
  gems are needed, plus Flora. A ready prompt is at the end of this plan. Until
  the pictures come, the bag and the Gem Works show each element's own icon
  (public/icons/ui/elem-*.webp), which is already drawn in the gem's shape.
- **The two keepers** already have their prompts (docs/ART-WISHLIST.md, "The
  keepers, sheet 2 of 2").

## The numbers (each is a one-line change)

| What | Today | Recommended |
|---|---|---|
| Shard from a kill | 1 in 10 (in the loot pile) | the same |
| Shard from a harvest | 1 in 3 | the same |
| Shards for one gem | — | 10; 8 from Gem Cutting 15, 6 from 35, 5 from 60 |
| Chance a cut fails | 40% at Gem Cutting 1 (raw gems) | never |
| Gem Cutting XP per cut | 15 | 400 |
| Enchanting XP per gem set | 25 for a weapon (phone only); 20 for an amulet or shield | 400 for each |
| Taking a gem out | 25 × the weapon's metal multiplier: 25–44 gold today | the same |
| Raw gem drop | 1 kill in 20, to the killing blow | none |
| Rare Gem | 1 kill in 200; no use | the same drop; cuts into any of the eight gems |
| What Diego pays for a gem | — | up to 600 (his price is 1,200) |
| How long a freeze or root stops a monster | as long as the hits keep coming | 1.5 s, then 3 s before it can happen again; bosses half |

**How long a gem takes** (an *estimate* from the drop rates, not from measured
play): killing about 200 monsters an hour in one land and harvesting there
about 30 times gives roughly 20 + 10 = 30 of its shards an hour. That's a first
gem in about 20 minutes, and a gem for each of your three weapons in about an
hour. At 20 shards per gem it would take twice as long.

**Why 400 XP:** a life skill level costs 1,000 XP at level 1, and 8% more at
each level after that (src/data/items.js `skillXpRequired`). At 15 XP per cut,
reaching Gem Cutting level 2 would take 67 cuts, which is 670 shards. At 400 XP
it takes three cuts, and level 15 takes about 60. A smelted copper bar also
pays 400.

## Phases, one PR each

1. **The server keeps weapon gems, plus the hold rule.** This fixes every gem
   players already have, and switches on the ELEMENT points, the Element Burst
   and the flame amulet. It goes first because a gem made from shards is no use
   until a weapon can keep it.
2. **Shards into gems:** the cut from shards, the Rare Gem's cut, the Flora
   Gem, gems moving into the bag, and an end to the raw-gem drop.
3. **Gem pictures**, once you send the sheet.
4. **Every gem pulls its weight:** soak and shock get an effect of their own,
   and "UP" becomes real (decisions 12 and 13).
5. **The two keepers outside the Gem Works, and a short gem quest**, once their
   pictures come (decision 14).

Phases 1 and 2 can ship on the same day.

Later, each as its own question:

- **A second gem in one weapon** ("Fusion": both elements on one weapon, and
  their combo), once two-slot weapons exist.
- **Dark and Light gems**, along with the realms.
- **Gem grades** (a better cut makes a stronger gem), if you want something
  long-term to spend shards on.

## Why this shape

- **Why gems, and not shards straight into a weapon?** The Gem Works already
  has two jobs, cutting and setting, and two keepers planned for it. Amulets
  and shields already take gems. A gem is something you can hold, trade, and
  take back out of a weapon.
- **Why the raw gem goes:** a raw gem and a shard are both a land's crystal
  dropped by a monster. Two look-alike materials for one gem is harder to
  learn. And raw gems dropped five times as often as a gem's worth of shards,
  which would make shards pointless. One raw material and one product is
  simpler.
- **Why a cut always works:** ten shards is about twenty minutes of play.
  Losing them four times in ten at Gem Cutting 1 would feel bad on a player's
  first gem, and the level still matters through the cost.
- **Why the bag:** a gem you can't see in your bag is a gem you don't know you
  have. And if gems can be traded, every land's shards are worth something to
  everyone, not only to players who want that element.
- **Why the hold rule has to come now:** once gems are real, every frost or
  venom weapon would stop every monster it hits.

## Your decisions

The first answer in each row is the recommended one. "Go recommended" takes
them all.

| # | Question | Recommended | Or |
|---|---|---|---|
| 1 | What does the Gem Cutter cut? | Shards. Raw gems stop dropping, and the ones players hold become gems | Both, side by side |
| 2 | How many shards make one gem? | 10, fewer with Gem Cutting (8 / 6 / 5) | 20; or always 10 |
| 3 | Can a cut fail? | No. The level lowers the cost instead | Today's 60–98% chance, with the shards lost on a fail |
| 4 | Where do gems live? | In the bag: tradeable, sellable, bankable, droppable, and lost with the bag in No man's land | Today's hidden pouch: never lost, never traded |
| 5 | What is the Rare Gem for? | It cuts into any of the eight gems | It makes one cut certain; or, later, it opens a second slot |
| 6 | A Flora Gem for the Verdant Wilds? | Yes, for weapons now; its amulet and shield bonus later (your idea?) | No Flora Gem |
| 7 | The hold rule for monsters | Stopped for 1.5 s, then 3 s before another stop; bosses half | Only shorter stops; or leave it as it is |
| 8 | Does a gem change the weapon's damage? | No. The metal's damage stays, and the element is the gain | A small bonus for any gem (+10%) |
| 9 | Setting a gem over another gem | Not allowed: take it out first (you get it back) | Allowed, with the old gem lost (as for amulets and shields) |
| 10 | XP for cutting and setting | 400 per cut, 400 per gem set | Leave them at 15 and 20–25 |
| 11 | Shard names | Rename four after their element (Flame, Storm, Water and Venom Shard) | Keep the land names |
| 12 | Phase 4: soak and shock on their own | A soaked monster hits 20% softer. A hit on a shocked monster sparks to one more monster within 150 px, for a quarter of the hit | Leave them as combo starters |
| 13 | Phase 4: "UP" over a hit | Make it real: a gem that beats the monster's element hits 25% harder. No penalty for a bad matchup, and "DN" goes away | Take the popup away |
| 14 | Phase 5: a gem quest | The two keepers give three steps (bring 10 shards, cut a gem, set it), paying gold and a Rare Gem | No quest |

## For the builder

Everything below follows ARCHITECTURE-HANDOFF's rules. The server decides and
the phone asks. New messages are refused unless they are added on purpose.
Every new server event goes in `PRIVILEGED_EVENTS`. Caps flags keep both
sides deployable in either order. Kill switches have lower-case names (TRAPS
§117).

### Phase 1: weapon gems on the server

**The worker** (a new `server/src/weapongem.js`, built like `shieldgem.js`):

- `weapon_gem {slot, gem}`, where `slot` is `weapon`, `rangedWeapon` or
  `staffWeapon`. The answer is `weapon_gem_result` (PRIVILEGED, private),
  followed by a `player_state`.
- Refusals: `off` (the kill switch), `down` (dying, dead or disconnected),
  `locked` (`_threatGearLocked`), `bad_gem` (not an own key of the weapon gems,
  which are the eight elements), `no_weapon`, `full` (no open slot) and
  `no_gem`.
- Slots come from the weapon's `gearBase` (`slots` in `BLACKSMITH_TIERS` and
  `WOODWORKING_TIERS`). A weapon with no `gearBase` gets 1. The phone's 2
  (EnchantPanel's `wpn ? 2 : 0`) was meant for random weapon drops, which are
  gone.
- Set `element1`. Set `element2` only on a weapon with two slots and with
  Enchanting 20 (today's rule, out of reach for now). Set `tier: 'elemental'`
  (or `'fusion'`) for the colour only. Never touch `tierMult` (decision 8).
  Work out `isVolatile` from the volatile pairs, for a second gem only.
- Pay the Enchanting XP, call `_saveRpg` before answering (rule 10), and send
  `weapon_gem_result`.
- `_sanitizeWeapon` (gear.js): `element1` and `element2` must be own keys of
  `ELEMENT_STATUS`, or else null, and `isVolatile` must be a boolean (TRAPS
  #6).
- **The element in a fight:** `_handleMonsterDamage` (combat.js) uses the
  server's copy of the weapon (`element2 || element1` on a special, `element1`
  otherwise) and ignores the payload's `element`. `_pvpClaimElement`
  (pvpextras.js) does the same. The burst and the abilities already read the
  server's copy.
- **Salvage** (salvage.js, the weapon-bag branch): a weapon's gems go back to
  the player along with its bars. `weaponSig` doesn't change.
- **Take out** on the Set gems tab sends the existing `amulet_forge_request
  {op: 'extract'}` (caps.gemExtract). The price doesn't change.
- **The hold rule** (elemental.js): a new freeze or root starts a hold
  (`m._holdUntil`) unless the monster is immune (`m._holdImmuneUntil`).
  `elementMoveMult` returns 0 only during a hold, 0.5 for a freeze after its
  hold, and 1 for a root after its hold. The numbers live in one table
  (`HOLD`: 1,500 ms held, 3,000 ms immune, 0.5 for bosses). Attunement makes
  the status last longer, not the hold. The phone's prediction (monsterCombat.js
  moveMult) uses the same numbers, held equal by mirror-audit. Players keep
  pvpextras.js's own rule.
- Add a router case in index.js that awaits the handler (quiet-phone §9), and
  a line in the channel's allowlist (TRAPS #18). Add `caps.weapongem` and
  `caps.monsterhold` in join.js. Kill switches: `weapongem: false` refuses
  sets and makes the fight read the phone's claimed element again (today's
  behaviour); `monsterhold: false` brings back today's lock.

**The phone:**

- A new `src/game/weaponGem.js` (built like `shieldGem.js`): ask the server,
  wait up to 4 s, and put any refusal into words.
- EnchantPanel's weapon sections ask and wait, and change nothing on the phone
  when the worker has `caps.weapongem`. The old phone-only set stays only for
  a worker without it. Remove the "(1.5×)" line, add one line saying what the
  element does, and add a Take out row.
- monsterCombat.js: a special's element is `element2 || element1`.
- The Element Burst button needs no change. It reads the phone's weapon, which
  the server's answer now makes true.

**Tests:**

- A `weapon-gem` suite:
  - each refusal;
  - a gem stays set through a rejoin;
  - one gem is spent only once (two quick asks with one gem: one set, one
    `no_gem`);
  - the claimed element is ignored and the server's is used, on a monster and
    on a player;
  - a special with one gem carries the element;
  - the burst casts, and the flame amulet counts;
  - take out and salvage give the gem back;
  - the hold rule (a freeze stops for 1.5 s, not again for 3 s, and half as
    long for a boss);
  - both kill switches.
- `cost-guard`: one row written per gem set.
- A phone test, `mp-weapongem`:
  - set a gem at the Gem Works, reload, and it is still set;
  - hit a monster and see the burn tick on the server's monster;
  - cast the Element Burst;
  - take the gem out and see it back.
- When this ships, the PR body should say that players who put a gem into a
  weapon on the phone before must set it again. That gem was never spent, so
  they still have it.

### Phase 2: shards into gems

**The worker** (a new `server/src/shardcut.js`):

- `shard_cut {element}` or `{element, rare: true}`. This must be a new
  message, never `gem_cut_request`: an older worker would read that as a
  raw-gem cut (TRAPS §9, the caps.gems lesson). The answer is `gem_cut_result`
  (already PRIVILEGED) with `from: 'shards' | 'rare'` and `cost`, followed by
  a `player_state`.
- One table pairs each land with its element: frost–frost, ember–flame,
  sky–wind, hollows–stone, thunder–storm, tidal–water, mist–venom and
  verdant–flora. The phone's copy sits next to `ZONE_SHARDS`
  (src/data/shards.js), held equal by mirror-audit.
- The cost comes from the server's own Gem Cutting level. Refusals: `off`,
  `down`, `bad_gem`, `short` (with `need` and `have`) and `no_rare`. A cut
  takes the shards (or one `rare_gem`), adds `gem_<element>`, pays the XP,
  calls `_saveRpg` and answers. A Rare Gem can make only the eight elements.
- **Gems into the bag:** the keys are `gem_<element>`. A migration
  (server/src/migrations.js, the next `RPG_SCHEMA_VERSION`,
  docs/specs/migrations.md) moves `raw_X` and `polished_X` from
  `lifeSkills.gems` into `inventory.gem_X`, one for one, and empties the
  pouch. `_gemsAdoptOnJoin` (an old record's one-time capture) writes to the
  bag too, so nothing lands in the pouch after the move. amulet.js (the gem
  step, take out, the old cut), shieldgem.js and devtools.js's kit read and
  write the bag, and weapon gems (Phase 1) are taken from the bag.
- **The raw gem goes:** `rawgem` comes out of killroll.js's `ORDER`, `KILLER`
  and `MAYBE`, and `_gemRawOnKill` is no longer called. The codex's drop table
  (src/data/codexDrops.js) and mirror-audit follow. On every monster that had a
  raw gem, the shard's numbers on the kill roll move from 612–1,611 to
  112–1,111.
- The weapon gems include Flora, and `AMULET_GEMS` doesn't. The amulet and
  shield pickers already skip a gem with no bonus.
- Diego gets a `gem_` family at 1,200 (shop.js `SHOP.BASE`), more than the
  shards it took, so cutting before selling never loses money.
- `caps.shardcut`, with the kill switch `shardcut: false`.

**The phone:**

- GemcutPanel: a row for each land you have shards from, the Rare Gem row, and
  the reason on a greyed button. GemWorksPanel's tab lines become "Shards to
  gems" and "Gems into gear".
- InventoryPanel: `thumbFor` for `gem_` (the element's icon until Phase 3),
  the name ("Frost Gem") and the materials chip.
- ItemDetailPopup: a shard's card says what it makes, and a gem's card says
  what it does and where to set it.
- EnchantPanel reads gem counts from the bag. A "Frost Gem!" popup comes from
  the cut's answer.

**Tests:**

- A `shard-cut` suite: each cost step, each refusal, the Rare Gem (the eight
  elements only), Flora, the move into the bag (it happens once, covers raw
  and cut gems, and loses nothing) and the kill roll's new layout.
- migrations (for the move: a failed move stays unfinished, and a newer save
  is left alone), drops §9 (the kill roll), codex, mirror-audit and shop.
- A phone test, `mp-shardcut`: cut 10 shards into a gem, find it in the bag,
  and set it.

### Phase 3: pictures

Cut the owner's sheet with a tool like `tools/ui/cut-bag-icons.py` into
`public/icons/items/gem-<element>.webp` (256 × 256, the bag's frame), for the
bag, the Gem Works rows and the item cards. They are small pictures shown only
in windows, so they add nothing to the loading screen, but check
mp-membudget anyway.

### Phase 4: every gem pulls its weight

Give soak and shock an effect on monsters (elemental.js, index.js
`_tickMonsters`, combat.js), and make "UP" real: the hit is multiplied by 1.25
when the server's element beats the monster's (`getEffectiveness`). Widen the
anticheat ceiling (`_maxDmgForAttacker`) in the same commit (the handoff's
anticheat lockstep). The phone's popups and prediction follow.

### Phase 5: keepers and the quest

Add Gem Cutter Bro and Gem Setter Bro as `WHEEL_TOWNSFOLK` rows and
`WHEEL_KEEPERS` entries, each opening his own tab (docs/specs/gem-works.md,
"Not done"). Add a three-step chain in data.js next to `beast_1..4`, with its
mirror in the client's `QUEST_CHAINS`, and have the worker check its goals
(shards brought, a gem cut, a gem set) in quests.js `_questObjectiveMet`.

## Things found in the code along the way

- The Enchanting card's hint, "Infuse gear with elemental shards"
  (skillsModel.js), promises something no code does.
- burst.js says `element1` "is written by the enchant/forge path", but no
  server path writes it.
- The lunge reads the server's copy of the weapon for its element
  (abilities.js), so today it never carries one.
- On a special, the phone applies `element2` (empty with one gem), while the
  claim sends `element1`.
- EnchantPanel gives a weapon with no `gearBase` two slots, a leftover from
  the random weapon drops that are gone.
- `GEM_DROP_RATES` (items.js) has woodcutting, fishing and mining rates that
  nothing reads.
- The old quest chains of the Enchantress (`enchant_1–3`) and Blacksmith Bron
  (`bron_1–4`, whose last step is "Gem Setter: cut a gem and slot it into a
  weapon") are barred (data.js `QUEST_DORMANT`), because their givers are not
  in the world. Phase 5's quest takes their place, with goals the worker can
  check.
- The Starting Meadow's shard is labelled "Verdant Shard", while the Verdant
  Wilds' shard is the "Flora Shard" (src/data/shards.js; the meadow is closed).
- Raw and cut gems can't be traded, because they aren't bag items.
- A shard goes to whoever picks up the loot pile, but a raw gem goes only to
  the killing blow (killroll.js `KILLER`).
- Nothing makes a monster immune to holds, so bosses can be frozen solid.

## A ready prompt for the gem pictures

If you say yes to decisions 1 and 6, this replaces docs/ART-WISHLIST.md's
"Gems: raw and polished" prompt: only cut gems, with Flora added. Storm is
violet and Dark has violet glints, which a magenta background would swallow,
so those two go on green in a second chat. The Light and Dark gems are for the
realms, later; asking for them now costs nothing extra.

- **Attach to both chats:** `docs/art/bag-icon-style-key.png` (the game's own
  bag icons).
- **Send both pictures in chat**, and a session will cut them into the game.

**Chat 1 of 2: eight gems on magenta**

```text
Landscape image (wider than tall): a sprite sheet of 8 item icons for a 2D action RPG, in a grid of 4 columns and 2 rows read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else.

Each icon is one magical GEM, cut and polished from an elemental crystal: faceted, glossy, with one bright highlight, cut in its own shape. No setting, ring or chain.
Row 1, left to right:
1. FROST: pale icy blue, almost white at the edges; cut as a hexagon.
2. FLAME: deep ember red with an orange heart; cut as a diamond (a rhombus standing on its point).
3. WIND: pale silver-grey, almost clear like quartz; cut as a triangle, point up.
4. STONE: warm amber-brown; cut as a square.
Row 2, left to right:
5. WATER: clear ocean blue with a ripple of light inside; cut as a round dome (a cabochon).
6. VENOM: poison green; cut as a teardrop, point up.
7. FLORA: fresh leaf green, lighter and more yellow than the venom gem, with a faint vein down its middle; cut as a leaf.
8. LIGHT: radiant golden yellow; cut as a starburst (a sun with eight short sharp points).

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. All 8 the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta, pink or purple. Do not copy the reference's items or background.
```

**Chat 2 of 2: two gems on green**

```text
Landscape image (wider than tall): a sprite sheet of 2 item icons for a 2D action RPG, side by side in 2 equal square cells. Each icon sits centered in its own cell, fills about three quarters of it, and touches nothing else.

Each icon is one magical GEM, cut and polished from an elemental crystal: faceted, glossy, with one bright highlight, cut in its own shape. No setting, ring or chain.
1. STORM: bright violet with a tiny spark of light inside; cut as a five-pointed star.
2. DARK: deep shadowy navy, nearly black, with faint violet glints; cut as a trefoil (three rounded lobes, like a club).

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. Both the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat pure green (#00FF00) everywhere, no gradient or texture. Nothing in the icons is green. Do not copy the reference's items or background.
```

## Sources

The code read for this plan:

- **Server:** amulet.js, shieldgem.js, combat.js, elemental.js, burst.js,
  pvpextras.js, abilities.js, gear.js, salvage.js, killroll.js, index.js
  (`_spawnLootForKill`, `_rollShardForKill`, `_rollRareGemForKill`,
  `_tickMonsters`), data.js, shop.js, gathering.js, prog3.js, quests.js and
  migrations.js.
- **Client data:** src/data/shards.js, elements.js, items.js, gameSystems.js,
  prog3.js, wheelLands.js, zones.js and codexDrops.js.
- **Screens:** src/ui/panels/buildings/GemWorksPanel.jsx, GemcutPanel.jsx,
  EnchantPanel.jsx and SmithyPanel.jsx; src/ui/mobile/ElementBurstButton.jsx,
  sheet/skillsModel.js, sheet/equipModel.js, dash/InventoryPanel.jsx and
  dash/ItemDetailPopup.jsx.
- **Game code:** src/game/monsterCombat.js and playerActions.js;
  src/networking/wsClient.js.
- **Docs:** docs/specs/gem-works.md, shield-gems.md, elemental-completion.md
  and monster-drops.md; docs/ARCHITECTURE-HANDOFF.md (backlog A);
  docs/ART-WISHLIST.md; docs/UI-DESIGN-NOTES.md.
