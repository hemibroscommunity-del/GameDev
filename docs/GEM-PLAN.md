# Shards into gems, gems into weapons (v2.3.3504)

> Owner, 2026-10-19: *"Right now I don't have any way of applying elements to
> weapons in Brotown. There's shards that drop in each zone (by element). But I
> don't have a plan for how these shards become gems that then can be socketed
> into your weapon. Help write up a plan that makes sense with the jeweler I
> have in the game and these shards become gems."*
>
> And, having read the first draft: *"Actually I think a fun method would be
> for the shards to have a certain percent chance of containing that elements
> raw gem. Like maybe a 10% chance. Then after collecting a certain number of
> raw gems they can be combined into an elemental gem."*

**This is a plan. Nothing in it is built yet.** It comes from reading the
game's code, and each fact names the file it comes from. The loop is the
owner's (the second quote above). Every remaining choice had a
recommendation, listed under "Your decisions" near the end, and **the owner
took them all** on 2026-10-20: *"All of that sounds good."* The phases are
built one PR each, Phase 1 first.

**Phase 1 is built (v2.3.3513):** the worker keeps a weapon's gem and every
hit reads it from there, plus the hold rule. What was built and where it went
beyond this plan (each gem pays its XP once, the Element Burst button stands
aside under a window, a sell order lists the gems its weapon holds, no phone
copy of the hold): docs/specs/weapon-gems.md.

## The short answer

1. **Shards keep dropping as they do now.** A land's monsters drop its shard
   on 1 kill in 10. Its trees, rocks and fishing spots drop one on 1 harvest
   in 3.
2. **The Gem Cutter cracks shards open.** At the Gem Works, on the *Cut gems*
   tab, each shard you crack has a 1 in 10 chance of holding that land's
   **raw gem**. A Frost Shard can hold a Raw Frost Gem. If there is nothing
   inside, the shard crumbles. Each crack shows its roll, the way a kill does.
   A higher Gem Cutting level finds raw gems more often.
3. **Three raw gems combine into an elemental gem.** On the same tab, three
   Raw Frost Gems make one Frost Gem. A combine always works.
4. **The Gem Setter puts the elemental gem in your weapon.** On the *Set gems*
   tab, the sword, bow or staff you have equipped takes the gem. The server
   keeps it there, through logging out, dying, trading and selling.
5. **Every hit then carries the gem's element.** A Frost Gem freezes what you
   hit, a Flame Gem burns it, and so on (see the table below). A gem also
   switches on the Element Burst button, the flame amulet's bonus and the
   ELEMENT points in the Points window.
6. **You can take the gem out again** on the same tab, for a little gold (25
   to 44 gold today, depending on the weapon's metal). The gem comes back to
   you.
7. **A Rare Gem cuts into any elemental gem you choose.** It drops on 1 kill
   in 200, anywhere. Today it has no use at all.

This is the story the Gem Works already tells. Its room picture has baskets of
rough crystals (the shards), trays of cut gems, and a setting bench with empty
sockets. The cutter and the setter are the two keepers you planned for the
building (docs/ART-WISHLIST.md, "The keepers"). The cutter cracks shards and
combines raw gems, and the setter puts the finished gems into gear.

And the game already has the middle piece. **Raw gems exist today**: the Gem
Cutter's tab already cuts them, and players may already hold some (see "What
the code does today"). The new loop changes where raw gems come from (inside
shards, instead of off monsters) and what they make (three combine into a gem,
instead of one being cut at a chance).

## The eight lands, their shards and their gems

| Land | Its shard (today's name) | Raw gem inside 1 in 10 | Three of those make | What the gem does to what you hit |
|---|---|---|---|---|
| Frost Ridge | Frost Shard | Raw Frost Gem | Frost Gem | **Freeze**: stops it moving and attacking |
| Flame Fields | Ember Shard | Raw Flame Gem | Flame Gem | **Burn**: fire damage twice a second for 4 s |
| Wind Dunes | Wind Shard | Raw Wind Gem | Wind Gem | **Slow**: it moves at 40% speed |
| Stone Hollows | Stone Shard | Raw Stone Gem | Stone Gem | **Fracture**: it takes 6% more damage per stack, up to 30% |
| Electric Foundry | Thunder Shard | Raw Storm Gem | Storm Gem | **Shock**: nothing on its own today (Phase 4) |
| Water Caves | Tidal Shard | Raw Water Gem | Water Gem | **Soak**: nothing on its own today (Phase 4) |
| Poison Forest | Mist Shard | Raw Venom Gem | Venom Gem | **Root**: stops it moving and attacking, and poisons it |
| Verdant Wilds | Flora Shard | Raw Flora Gem (new) | Flora Gem (new) | **Thorn**: it takes damage every time it attacks |

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
  that is closed, so it cannot drop in the Wheel. It holds no raw gem (the
  meadow has no element). You can still sell it.

## What the code does today

### What already works

- **Shards drop** as described above. The server rolls them
  (server/src/data.js `SHARD_MONSTER_DROP`, server/src/gathering.js
  `_rollHarvestShard`) and they go into the bag. Diego pays up to 55 gold for
  one: his price is 110 (server/src/shop.js `SHOP.BASE.shard_`), and he pays
  half.
- **Raw gems exist, and the server settles the Gem Cutter's cut**
  (server/src/amulet.js `_handleGemCut`, v2.3.1198). One raw gem is cut into
  one finished ("polished") gem. A cut succeeds 60% of the time at Gem Cutting
  1, 75% from level 15, 90% from 35 and 98% from 60 (`GEM_CUT_TIERS`), and a
  failed cut loses the raw gem.
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
2. **Raw gems come off monsters, unseen.** They drop on 1 kill in 20, and only
   to the player who lands the killing blow (amulet.js `_gemRawOnKill`,
   data.js `GEM_RAW_MONSTER_DROP`). None drop in the Verdant Wilds, because
   Flora is not one of the gem elements (data.js `AMULET_GEMS`). Raw and cut
   gems sit in a hidden pouch (`lifeSkills.gems`) that the bag never shows.
   You see a popup ("Raw Frost Gem!"), and after that the gem only appears on
   the Gem Works' tab.
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
   8).
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
- **A shard's card says what it's for:** "Crack it at the Gem Works: 1 in 10
  holds a Raw Frost Gem."
- **Selling or cracking is now a real choice.** A shard is up to 55 gold at
  Diego's, or a chance at a raw gem.
- **Optional (decision 12):** rename four shards after their element (Ember to
  Flame, Thunder to Storm, Tidal to Water, Mist to Venom), so "a Flame Shard
  holds a Raw Flame Gem" reads at a glance. Only the name changes. It is the
  same item, and players keep every one they have.

### Cracking: the Gem Cutter, the *Cut gems* tab

- **One row for each land you have shards from.** It shows the shard's
  picture, how many you have, your chance ("1 in 10"), a **Crack** button and
  a **Crack all** button.
- **The crack is the fun part, so it gets a moment.** The shard shakes and
  splits on the counter. Either a raw gem tumbles out with a glint and the
  game's existing "gem cut" sound, or the shard crumbles to dust with the
  "shatter" sound (both already in src/data/eventSounds.js). **Crack all**
  plays them one after another, quickly, then sums up: "12 cracked: 2 Raw
  Frost Gems".
- **Each crack shows its roll, like a kill's.** It rolls a number from 1 to
  100, and 1 to 10 holds a raw gem. A player can watch for low numbers the
  same way they watch the kill roll.
- **Your Gem Cutting level raises the chance** (decision 2), on today's four
  cutting steps (`GEM_CUT_TIERS`):

  | Gem Cutting level | A shard holds a raw gem | Shards for one elemental gem, on average |
  |---|---|---|
  | 1–14 | 1 in 10 (10%) | 30 |
  | 15–34 | 12% | 25 |
  | 35–59 | 15% | 20 |
  | 60 and up | 20% | 15 |

- **Every crack pays Gem Cutting XP, found or not** (decision 11), so no crack
  is wasted, as with trapping.
- **The server rolls every crack**, so the odds are the same for everyone at
  the same level, and the window shows the true chance.

### Combining: the same tab

- **Each land's row shows your raw gems toward the next elemental gem**, as
  "Raw Frost Gems 2 / 3", and a **Combine** button that lights up at three
  (decision 3).
- **A combine always works** (decision 4). The luck is all in the crack, so
  the last step never takes away what luck gave you. Today's 60–98% cut of a
  single raw gem goes away.
- **A Rare Gem row** reads "Rare Gem ×2: cut into …", followed by the eight
  gems. One Rare Gem makes one elemental gem of the element you tap (decision
  6).
- **Raw gems stop dropping off monsters** (decision 1). They come from shards
  now. Every raw gem a player already holds keeps counting toward a combine,
  and every finished gem stays a finished gem, so nobody loses anything.

### Gems live in your bag (decision 5)

- **Raw gems and elemental gems are ordinary bag items** ("Raw Frost Gem",
  "Frost Gem"), next to the shards they came from, each with its own picture
  (Phase 3).
- **So you can trade them**, list them at the auction house, keep them in the
  bank, drop them, or sell them to Diego. He would pay more than the shards
  they took (see "The numbers").
- **Like everything you carry, they go with your bag** if another player kills
  you in No man's land.
- **The hidden pouch is emptied into the bag once**, at each player's next
  login, one for one.

### Setting: the Gem Setter, the *Set gems* tab

- **It shows the three weapons you have equipped** (melee, bow and staff),
  each with its one slot. Tap an elemental gem you hold to set it. The window
  waits for the server's answer, as the shield's slot has since v2.3.3187, and
  if the server says no, the window says why.
- **The server keeps the gem in the weapon.** It stays through logging out,
  dying and the bank. A weapon you trade, sell or list keeps its gem.
- **The weapon keeps its metal's damage** (decision 9). What the gem adds is
  its element.
- **A full slot is not overwritten** (decision 10). **Take out** is on this tab
  too (and still at the Blacksmith), at today's price, and the gem comes back.
- **Salvaging a weapon** at the Blacksmith gives its gem back along with the
  bars.
- **Each gem you set pays 400 Enchanting XP** (decision 11).
- **Amulets and shields work as they do now**, and take their gem from the
  bag. The Flora Gem has no amulet or shield bonus yet (decision 7), so the
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

### The hold rule for monsters (decision 8)

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

- **Raw and finished gems both need pictures.** docs/ART-WISHLIST.md already
  has the right prompt, "Gems: raw and polished" (v2.3.3481): a raw gem and
  its cut gem for nine elements, in two chats. Only Flora is missing, and a
  third chat for it is at the end of this plan. Until the pictures come, the
  bag and the Gem Works show each element's own icon
  (public/icons/ui/elem-*.webp), which is already drawn in the gem's shape.
- **The crack needs no new art.** The shard splitting and crumbling can be
  drawn in code from the shard's own picture.
- **The two keepers** already have their prompts (docs/ART-WISHLIST.md, "The
  keepers, sheet 2 of 2").

## The numbers (each is a one-line change)

| What | Today | Recommended |
|---|---|---|
| Shard from a kill | 1 in 10 (in the loot pile) | the same |
| Shard from a harvest | 1 in 3 | the same |
| A shard holds a raw gem | — | 1 in 10 at Gem Cutting 1; 12% from 15, 15% from 35, 20% from 60 |
| Raw gem straight off a monster | 1 kill in 20, to the killing blow | none |
| Raw gems for one elemental gem | 1, cut at a 60–98% chance | 3, always works |
| Gem Cutting XP | 15 per cut | 40 per crack (found or not), 200 per combine |
| Enchanting XP per gem set | 25 for a weapon (phone only); 20 for an amulet or shield | 400 for each |
| Taking a gem out | 25 × the weapon's metal multiplier: 25–44 gold today | the same |
| Rare Gem | 1 kill in 200; no use | the same drop; cuts into any of the eight elemental gems |
| What Diego pays | a shard up to 55 | a raw gem up to 600, an elemental gem up to 2,000 (he asks twice that) |
| How long a freeze or root stops a monster | as long as the hits keep coming | 1.5 s, then 3 s before it can happen again; bosses half |

Diego's prices sit above what went in (ten shards for a raw gem, three raw
gems for an elemental gem), so cracking and combining never lose money
against selling the shards.

**How long a gem takes** (an *estimate* from the drop rates, not from measured
play): killing about 200 monsters an hour in one land and harvesting there
about 30 times gives roughly 20 + 10 = 30 of its shards an hour. At 1 in 10,
that's about 3 raw gems an hour, so **about one elemental gem an hour**.

**And the luck:** with 1 in 10, about one player in five finds their first
three raw gems within 15 shards (half the usual time), and about one in twenty
needs more than 60 (twice the usual time). That spread is the fun the crack
adds. At five raw gems per elemental gem it would take about 1 hour 40
minutes, and at two, about 40 minutes.

**Why these XP numbers:** a life skill level costs 1,000 XP at level 1, and 8%
more at each level after that (src/data/items.js `skillXpRequired`). At 40 XP a
crack, Gem Cutting level 2 takes 25 cracks, and level 15 takes about 600 (some
20 elemental gems' worth). At today's 15 XP per action, level 2 would take 67.
Setting a gem happens rarely, so it pays more.

## Phases, one PR each

1. **The server keeps weapon gems, plus the hold rule.** This fixes every gem
   players already have, and switches on the ELEMENT points, the Element Burst
   and the flame amulet. It goes first because a gem is no use until a weapon
   can keep it.
2. **Shards into raw gems into elemental gems:** the crack and its roll, the
   combine, the Rare Gem's cut, the Flora gems, gems moving into the bag, and
   an end to the raw gems that drop off monsters.
3. **Gem pictures**, once you send the sheets.
4. **Every gem pulls its weight:** soak and shock get an effect of their own,
   and "UP" becomes real (decisions 13 and 14).
5. **The two keepers outside the Gem Works, and a short gem quest**, once their
   pictures come (decision 15).

Phases 1 and 2 can ship on the same day.

Later, each as its own question:

- **A second gem in one weapon** ("Fusion": both elements on one weapon, and
  their combo), once two-slot weapons exist.
- **Dark and Light gems**, along with the realms.
- **Gem grades** (more raw gems in a combine make a stronger gem), if you want
  something long-term to spend shards on.

## Why this shape

- **Why gems, and not shards straight into a weapon?** The Gem Works already
  has two jobs, cutting and setting, and two keepers planned for it. Amulets
  and shields already take gems. A gem is something you can hold, trade, and
  take back out of a weapon.
- **Why the crack is the gamble and the combine is certain:** a shard is cheap
  and plentiful, so a 1 in 10 crack is exciting and costs little when it
  misses. Three raw gems are an hour's luck, so losing them to a failed
  combine would sting.
- **Why raw gems stop dropping off monsters:** at 1 kill in 20 they come five
  times as often as raw gems from shards would (1 kill in 10 drops a shard,
  and 1 shard in 10 holds a gem). Shards would hardly matter. Raw gems coming
  only from shards keeps them as the one road.
- **Why the level raises the chance:** otherwise Gem Cutting's level would do
  nothing. A better cutter finding more inside each shard is easy to
  understand.
- **Why the bag:** you collect raw gems toward a goal, so you should be able to
  see them. A gem you can't see in your bag is a gem you don't know you have.
  And if gems can be traded, every land's shards are worth something to
  everyone, not only to players who want that element.
- **Why the hold rule has to come now:** once gems are real, every frost or
  venom weapon would stop every monster it hits.

## Your decisions

**Decided, 2026-10-20.** The owner, on this list: *"All of that sounds
good."* Every recommended answer below stands, and the "Or" column is what
was turned down.

The first answer in each row is the recommended one.

| # | Question | Recommended | Or |
|---|---|---|---|
| 1 | Where do raw gems come from? | Only from cracking shards; they stop dropping off monsters, and the ones players hold still count | From shards and from monsters (1 kill in 20, as now) |
| 2 | The chance a shard holds a raw gem | 1 in 10, rising with Gem Cutting (12%, 15%, 20%) | Always 1 in 10 |
| 3 | Raw gems for one elemental gem | 3 | 5 (slower); 2 (faster) |
| 4 | Can a combine fail? | No. The luck is in the crack | A chance, rising with Gem Cutting, with the raw gems lost on a fail |
| 5 | Where do gems live? | In the bag, raw and finished: tradeable, sellable, bankable, droppable, and lost with the bag in No man's land | Today's hidden pouch: never lost, never traded |
| 6 | What is the Rare Gem for? | It cuts into any of the eight elemental gems | It counts as one raw gem of any element; or, later, it opens a second slot |
| 7 | A Flora Gem for the Verdant Wilds? | Yes, for weapons now; its amulet and shield bonus later (your idea?) | No Flora Gem |
| 8 | The hold rule for monsters | Stopped for 1.5 s, then 3 s before another stop; bosses half | Only shorter stops; or leave it as it is |
| 9 | Does a gem change the weapon's damage? | No. The metal's damage stays, and the element is the gain | A small bonus for any gem (+10%) |
| 10 | Setting a gem over another gem | Not allowed: take it out first (you get it back) | Allowed, with the old gem lost (as for amulets and shields) |
| 11 | XP | 40 Gem Cutting XP per crack, 200 per combine, 400 Enchanting XP per gem set | Leave today's 15 and 20–25 |
| 12 | Shard names | Rename four after their element (Flame, Storm, Water and Venom Shard) | Keep the land names |
| 13 | Phase 4: soak and shock on their own | A soaked monster hits 20% softer. A hit on a shocked monster sparks to one more monster within 150 px, for a quarter of the hit | Leave them as combo starters |
| 14 | Phase 4: "UP" over a hit | Make it real: a gem that beats the monster's element hits 25% harder. No penalty for a bad matchup, and "DN" goes away | Take the popup away |
| 15 | Phase 5: a gem quest | The two keepers give three steps (crack shards until you find a raw gem, combine three into a gem, set it), paying gold and a Rare Gem | No quest |

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
  (or `'fusion'`) for the colour only. Never touch `tierMult` (decision 9).
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

### Phase 2: shards into raw gems into elemental gems

**The worker** (a new `server/src/shardcrack.js`):

- **The crack:** `shard_crack {land, count}`, where `count` is 1 to 50 (one
  message for Crack all). The server takes up to `count` shards of that land
  (`shard_<land>`, never more than the bag holds), rolls each one from 1 to
  100 against the chance for the player's own Gem Cutting level, adds what was
  found as raw gems, pays the XP for every crack, calls `_saveRpg` once, and
  answers `shard_crack_result {land, element, rolls, found}` (PRIVILEGED,
  private), followed by a `player_state`. `rolls` is every number in order, so
  the phone can play the reveal. Refusals: `off`, `down`, `bad_land` (no
  element: the meadow, the commons) and `short`.
- **The combine:** `gem_combine {element}` takes three raw gems of that
  element and makes one elemental gem. `gem_combine {element, rare: true}`
  takes one `rare_gem` instead (the eight elements only). It pays the XP,
  calls `_saveRpg` and answers `gem_combine_result` (PRIVILEGED, private),
  followed by a `player_state`. Refusals: `off`, `down`, `bad_gem`, `short`
  (with `need` and `have`) and `no_rare`.
- **The old one-raw-gem cut** (`gem_cut_request`, amulet.js `_handleGemCut`)
  is refused while the combine is on. A page from before this would otherwise
  cut one raw gem into a finished gem, a third of the new price (TRAPS §9, the
  caps.gems lesson, for why the new acts are new messages).
- One table pairs each land with its element: frost–frost, ember–flame,
  sky–wind, hollows–stone, thunder–storm, tidal–water, mist–venom and
  verdant–flora. The crack chance by Gem Cutting level is a second table
  (`SHARD_CRACK.CHANCE`, on `GEM_CUT_TIERS`' four steps), and the raw gems per
  combine is one number. The phone's copies sit next to `ZONE_SHARDS`
  (src/data/shards.js), held equal by mirror-audit.
- **Gems into the bag:** the keys are `gem_raw_<element>` and `gem_<element>`.
  Diego's families are `gem_raw_` (1,200) and `gem_` (4,000) in shop.js
  `SHOP.BASE` (the longer family wins). A migration (server/src/migrations.js,
  the next `RPG_SCHEMA_VERSION`, docs/specs/migrations.md) moves `raw_X` and
  `polished_X` from `lifeSkills.gems` into `gem_raw_X` and `gem_X`, one for
  one, and empties the pouch. `_gemsAdoptOnJoin` (an old record's one-time
  capture) writes to the bag too, so nothing lands in the pouch after the
  move. amulet.js (the gem step and take out), shieldgem.js and devtools.js's
  kit read and write the bag, and weapon gems (Phase 1) are taken from the bag.
- **Raw gems stop dropping off monsters:** `rawgem` comes out of killroll.js's
  `ORDER`, `KILLER` and `MAYBE`, and `_gemRawOnKill` is no longer called. The
  codex's drop table (src/data/codexDrops.js) and mirror-audit follow. On
  every monster that had a raw gem, the shard's numbers on the kill roll move
  from 612–1,611 to 112–1,111.
- The weapon gems include Flora, and `AMULET_GEMS` doesn't. The amulet and
  shield pickers already skip a gem with no bonus.
- `caps.shardcrack`, with the kill switch `shardcrack: false` (no cracks, no
  combines; the old cut comes back).

**The phone:**

- GemcutPanel: a row for each land with shards (count, chance, Crack, Crack
  all) and its raw gems toward the next combine (Combine), the Rare Gem row,
  and the reason on a greyed button. The crack's reveal is drawn in code from
  the shard's picture, played from the server's `rolls`, with the existing
  `gemCut` and `gemShatter` sounds. GemWorksPanel's tab lines become "Shards to
  gems" and "Gems into gear".
- InventoryPanel: `thumbFor` for `gem_raw_` and `gem_` (the element's icon
  until Phase 3), the names ("Raw Frost Gem", "Frost Gem") and the materials
  chip.
- ItemDetailPopup: a shard's card says it can be cracked, a raw gem's says how
  many make a gem, and a finished gem's says what it does and where to set it.
- EnchantPanel reads gem counts from the bag.

**Tests:**

- A `shard-crack` suite:
  - the crack rate over many rolls sits at each level's chance;
  - the rolls sent are the rolls credited;
  - XP for every crack, found or not;
  - Crack all takes no more shards than the bag holds, and writes one row;
  - each refusal;
  - the combine (three, then nothing left over), the Rare Gem (the eight
    elements only) and Flora;
  - the old cut refused while the combine is on;
  - the move into the bag (it happens once, covers raw and finished gems, and
    loses nothing);
  - the kill roll's new layout.
- migrations (for the move: a failed move stays unfinished, and a newer save
  is left alone), drops §9 (the kill roll), codex, mirror-audit and shop.
- A phone test, `mp-shardcrack`: crack shards until a raw gem appears, combine
  three, find the gem in the bag, and set it.

### Phase 3: pictures

Cut the owner's sheets with a tool like `tools/ui/cut-bag-icons.py` into
`public/icons/items/gem-raw-<element>.webp` and `gem-<element>.webp` (256 ×
256, the bag's frame), for the bag, the Gem Works rows and the item cards.
They are small pictures shown only in windows, so they add nothing to the
loading screen, but check mp-membudget anyway.

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
mirror in the client's `QUEST_CHAINS`, and have the worker check its goals (a
raw gem found by cracking, a gem combined, a gem set) in quests.js
`_questObjectiveMet`.

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

## A prompt for the Flora gems

docs/ART-WISHLIST.md's "Gems: raw and polished" (v2.3.3481) already covers
nine elements' raw and cut gems, in two chats. If you say yes to the Flora Gem
(decision 7), this is a third chat for it. Flora is green, so it goes on
magenta.

- **Attach:** `docs/art/bag-icon-style-key.png` (the game's own bag icons).
- **Send the picture in chat**, and a session will cut it into the game with
  the other two.

**Chat 3 of 3: Flora on magenta**

```text
Landscape image (wider than tall): a sprite sheet of 2 item icons for a 2D action RPG, side by side in 2 equal square cells. Each icon sits centered in its own cell, fills about three quarters of it, and touches nothing else.

Both icons are the FLORA gem: fresh leaf green, lighter and more yellow than a poison-green gem, with a faint vein down its middle like a leaf.
1. LEFT, the RAW gem: a rough, uncut chunk of plain grey stone with the green crystal breaking out of it in a few sharp points, and a tiny sprouting leaf on the stone.
2. RIGHT, the same gem POLISHED: cut and faceted in the shape of a leaf, glossy, with one bright highlight. No setting, ring or chain.

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. Both the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta, pink or purple. Do not copy the reference's items or background.
```

## Sources

The code read for this plan:

- **Server:** amulet.js, shieldgem.js, combat.js, elemental.js, burst.js,
  pvpextras.js, abilities.js, gear.js, salvage.js, killroll.js, index.js
  (`_spawnLootForKill`, `_rollShardForKill`, `_rollRareGemForKill`,
  `_tickMonsters`), data.js, shop.js, gathering.js, prog3.js, quests.js and
  migrations.js.
- **Client data:** src/data/shards.js, elements.js, items.js, gameSystems.js,
  prog3.js, wheelLands.js, zones.js, codexDrops.js and eventSounds.js.
- **Screens:** src/ui/panels/buildings/GemWorksPanel.jsx, GemcutPanel.jsx,
  EnchantPanel.jsx and SmithyPanel.jsx; src/ui/mobile/ElementBurstButton.jsx,
  sheet/skillsModel.js, sheet/equipModel.js, dash/InventoryPanel.jsx and
  dash/ItemDetailPopup.jsx.
- **Game code:** src/game/monsterCombat.js and playerActions.js;
  src/networking/wsClient.js.
- **Docs:** docs/specs/gem-works.md, shield-gems.md, elemental-completion.md
  and monster-drops.md; docs/ARCHITECTURE-HANDOFF.md (backlog A);
  docs/ART-WISHLIST.md; docs/UI-DESIGN-NOTES.md.
