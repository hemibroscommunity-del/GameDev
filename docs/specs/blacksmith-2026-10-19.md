# The Blacksmith, from the owner's playtest notes (v2.3.3524)

The owner's notes at the Blacksmith, 2026-10-19, word for word:

- "On blacksmith don't have two tabs for sword and greatsword. Only
  greatswords are in the game."
- "Forging sword makes flesh hit sound wrong sound"
- "Also 'wood greatsword' is not an actual weapon in the game. Make the
  beginning weapon a copper greatsword (requiring smithing lvl 1) and an iron
  greatsword (requiring smithing lvl 2) after that. Also make a more realistic
  anvil for the animation when the character does smithing work."
- "Hardening should only require the same smithing level as it takes to
  smithing that item tier"
- "Make the upgrade tab icon different for smithing. Like a hammer"
- "Copper 1, iron 5, black steel 10 for smithing lvl req" (the later note: it
  wins over "iron greatsword (requiring smithing lvl 2)")
- "Make the xp pill for smith items a different icon (one that's more
  obviously 'xp')"

## What changed

| Note | Now | Was |
|---|---|---|
| Greatswords only | The Forge tab forges greatswords; no Greatsword / Sword switch | A switch; the one-handed sword was a bamboo stick in every picture |
| No wood greatsword | The Forge tab starts at the **copper greatsword, Smithing 1**. The worker refuses the wood tier | A first wood tier: 3 pine logs and 8 gold |
| The forge's levels | Copper 1, iron 5, black steel 10, then five more each tier (titanium 15, obsidian 20 ... worldbreaker 90) | Copper 6, iron 11, black steel 16 ... worldbreaker 96 (1 + 5 x the row's place) |
| (so copper can be forged at once) | The forge's Melee lock is what **wearing** the blade asks: copper and iron nothing, black steel Melee 10, titanium 15 ... | 5 x the row's place: copper Melee 5, iron 10, black steel 15. A new character with the Smithing for copper could not forge it |
| Hardening's level | The level that **makes** the weapon's tier: a copper greatsword Smithing 1, iron 5, black steel 10; a bow or staff its wood's Woodworking level (pine 1, softwood 6, hardwood 11 ...), the same principle on v2.3.3481's skill | 5 x the tier: the wood tier Smithing 5, copper 10, iron 15; a pine bow Woodworking 5 |
| The Upgrade tab's icon | A **hammer**, cut from the owner's crafting sheet (the one on its gold "Craft" button) | The currency strip's gold gem |
| The XP pill | The owner's **star with "XP"** (the XP buff badge's picture) on every Blacksmith XP pill, and every Forge row has one now (+800 / +1200 / +1600 for the bar metals) | A plain gold sparkle; the Forge rows showed no XP at all |
| A realistic anvil | The owner's **painted anvil** (the town's own, by the Blacksmith's door, in a copy of its own), standing in front of the smith with the hot bar on its face | An anvil drawn in flat colour, which the depth pass put **behind** the smith (since v2.3.2748), his legs and the rock painted under the mining pose drawn over it |
| The "flesh hit" sound | Every strike rings like metal (the sword's own metal hit, short and pitched up). The forge's finished-blade sound keeps its bright ring and takes a metal clang where its dull layer was. A hardening plays only its own win or loss sound | Each strike was the pickaxe recording with its click cut off, a dull thud. The finished blade layered a slowed pickaxe thud. A hardening played the forge's sound over its own |

Unchanged on purpose:

- The one-handed **sword** is still forged by the worker for an older page,
  and every sword already made is worn, hardened and salvaged as before.
- The **wood tier's row** stays in the tables. The starter Pine Shield and
  every old wooden weapon carry `gearBase: 'wood'` (their label and tierMult
  are read there), and every tier index after it counts it: the hardening
  bars (`HARDEN_BAR_BY_TIER`), the equip ladder (`_prog3BaseIdx`).
- **No tier's XP moved.** A tier pays its `xp`, else 5 x its level
  (gear.js). The three bar metals already had theirs (800 / 1,200 / 1,600);
  from titanium on, each row now carries its OLD level x 5 as `xp` (titanium
  105 ... worldbreaker 480), so the lower levels pay what they paid.
- The **Woodworker's** forge levels and its Bow lock are unchanged (its table
  starts at pine, the wear ladder's first rung, so its lock already was the
  wear gate).
- Hardening's **material** (bars or hardened wood) and its gold ladder are
  unchanged: the tier index that picks them did not move; only the level did.

## Where it lives

- **The worker:** `server/src/forgeladder.js` (a mixin):
  `FORGE_LADDER.OLD_LEVELS` (the levels before), `forgeLevelFor(tierKey,
  old)`, `forgeOffered(tierKey, old)`, `_forgeLadderOff()` (the kill switch)
  and `_hardenLevelFor(w, slot)`. `gear.js` `_handleForgeWeapon` refuses the
  wood tier, asks the new level and, for a trained character at the
  Blacksmith, `_prog3EquipOk(ps, 'weapon', blade)`. `hardening.js` asks
  `_hardenLevelFor`. The tables: `server/src/data.js` `BLACKSMITH_TIERS`
  (`forge: false` on wood, the new `minLvl`, the pinned `xp`).
- **The game:** `src/data/forgeLadder.js` (the mirror: `forgeLevelFor`,
  `forgeOffered`, `forgeStatReq`, the wear lock read from
  `getEquipReqLabel`, the badge that reads canEquipItem's own number) and
  `src/data/hardenCosts.js` `hardenLevelFor`; `src/data/gameSystems.js`
  `BLACKSMITH_TIERS` (the same rows). The panels:
  `src/ui/panels/buildings/SmithyPanel.jsx` (Forge, Upgrade, the pills, the
  hammer, the harden sound) and `WoodworkPanel.jsx` (the bow's hardening
  line). The Skills page's Smithing ladder and the Encyclopedia's metals leave
  the wood tier out.
- **The anvil:** `public/sprites/fx/smith-anvil.webp` (180 x 155, 9.8 KB,
  108 KB decoded), made by `tools/make_smith_anvil.py` from the town prop
  `public/sprites/props/anvil.png`: its own file, so freeing today's town's art
  never destroys the picture the smith draws (TRAPS §49); its alpha lifted to
  solid so the rock under the pose never shows through. Loaded through
  effectsRenderer's `_fxLoad`, so on the loading screen (the preloading law).
  effectsRenderer `_buildSmithFx` builds the anvil, the hot bar and the fire
  ONCE; `_updateSmithing` only moves, tints and stretches them (the bar's glow
  and cooling, each flame's height and sway by a shear) and shows the whole
  once as the work starts and hides it once as it ends -- the old Graphics was
  wiped and redrawn every frame in `gatherNodesFront`, a big layer whose draw
  list any change to a small Graphics rebuilds (TRAPS §218). Its ground line
  is the anvil's FOOT (`_groundDy`), so the depth pass puts it in front of the
  smith's boots. It is drawn 73 x 63 world px. Probe:
  `window.__btSmithAnvil` (painted, size, foot, layer).
- **The hammer:** `public/icons/ui/smith-hammer.webp` (66 x 63, 2.4 KB), cut
  by `tools/ui/cut-owner-icons.py` with a new `card` mode: the button is
  painted top to bottom in a gradient, so it is keyed row by row; within 3 px
  of what was keyed out, a pixel on the line from black to the row's colour
  is the dark outline mixed with the button (made black at the matching
  alpha), and a pixel of the button's own hue is its shading (dropped); only
  the biggest solid island, grown 2 px, is kept. `OWNER_ICON.smithHammer` in
  `src/data/ownerIcons.js`; drawn 22 x 21 CSS px; loaded with its window.
- **The XP star:** `BUFF_ICON.xp` (`/icons/ui/buff-xp.webp`), already warmed
  on the loading screen with the buff badges.

## The sounds, measured

Decoded at the file's own channels, read in mono as Web Audio downmixes (TRAPS
§230), sliced and pitched as the game plays them:

| Sound | Loudest 50 ms | Under 250 Hz | Centroid |
|---|---|---|---|
| Each strike, before: `mine-strike` from 0.08 s, 0.4 s, x0.45 | 0.034 | 40% | 1,587 Hz |
| The town anvil's ring: `mine-strike` from 0.58 s, 0.3 s, x0.3, rate 1.25 | 0.048 | 42% | 3,248 Hz |
| **Each strike, now:** `sword-hit2` from 0, 0.25 s, x0.22, rate 1.2 (± 0.03) | 0.037 | 16% | 2,900 Hz |
| The forge cue's second layer, before: `mine-strike` 0.58, x0.45, rate 0.9 | 0.084 | 48% | 1,986 Hz |
| **...now:** `armor-hit-2` from 0.06, 0.42 s, x0.22, rate 1.1 (the metal props' clang) | 0.101 | 7% | 1,000 Hz |
| The forge cue's first layer (unchanged): `sword-hit`, x0.6, rate 0.95 | 0.062 | 0% | 4,909 Hz |

Rendered through Web Audio by `mp-cuelevels` (every cue, as the game plays
it): the whole `forge` cue is 1.12 of the game's own hit (plain and by ear),
peak 0.29, 35% of its energy under 400 Hz -- in range, no clipping, all five
of its checks green.

The "flesh" is the dull body under 250 Hz. The town anvil's ring is brighter
on average (its click) but keeps the same 42% thud under it, so the sword's
metal hit was used for the strike, at about the old level. Only the `forge`
line of `src/data/eventSounds.js` changed. The strike is
effectsRenderer `_updateSmithing`; the harden press no longer plays `forge`
(SmithyPanel: `harden_result` plays `hardenOk` / `hardenFail`).

## Wire surface

| Message / field | Direction | Shape | Change |
|---|---|---|---|
| `state_sync.caps.forgeladder` | worker -> game | `true` | **new**: the worker forges no wood tier, asks the new levels, the wear gate and the hardening level; the game shows those only against it |
| `forge_weapon` | game -> worker | `{ weaponType, tierKey, isWoodwork }` | unchanged shape; the game sends `weaponType: 'greatsword'` only; the worker refuses `tierKey: 'wood'` against the ladder, still takes `'sword'` |
| `harden_weapon` / `harden_result` | both | unchanged | the refusal's level is the new one ("Need Blacksmithing Lv5 for this tier") |
| live flag `forgeladder: false` | operator | liveflags | **new kill switch**: the old ladder whole (the wood tier, 6/11/16..., Melee 5 x place, hardening 5 x tier) and `caps.forgeladder` false |

No new message types, no new storage keys, nothing new on the rpg record.

## Deploy order (rule 19)

- **New game, old worker:** no `caps.forgeladder`, so the Forge tab shows the
  wood tier and the old levels and locks, and Upgrade the old 5 x tier: what
  that worker asks. The switch is gone either way (the old worker forges
  greatswords too). The Skills page and Encyclopedia read the game's table, so
  they show the new levels against an old worker -- information only, for the
  hours between the two deploys.
- **Old game, new worker:** the old page shows the wood tier and Sword switch;
  the worker refuses a wood forge (the press times out: "Could not forge") and
  still forges a sword. The old page's locks show the higher old levels, so it
  never offers a forge the worker refuses for a level.
- **Kill switch:** `forgeladder: false` in liveflags, no deploy: the worker
  goes back whole and un-advertises the cap, and the next join's game shows
  the old numbers.

## Tests

- `server/test/forge-ladder.test.mjs` (38 checks, real messages through a real
  room): the cap and its name; the wood tier refused with nothing taken; copper
  at Smithing 1, iron refused at 4 and forged at 5, black steel at 9 / 10,
  titanium at 14 / 15 from ore paying its old 105 XP; the wear gate (copper at
  Melee 1, black steel refused at Melee 9 and forged at 10, exactly
  `_prog3EquipOk`'s answer); an older page's sword; hardening (a copper
  greatsword at Smithing 1, iron refused at 4 and taken at 5, black steel at 9,
  a pine bow at Woodworking 1, a softwood bow refused at 5 and taken at 6, a
  legacy blade ranked by tierMult, the material's tier index unmoved); the kill
  switch (cap off, wood forged again, copper at Smithing 6 and Melee 5,
  hardening back at 5 x tier); prototype keys on both ladders. Mutations: the
  ladder always off fails 16 checks; the wear gate off fails 7.
- `mirror-audit` (5 new checks): every tier forged or not and at the same
  level on both sides on both ladders; the owner's numbers; every tier's pay
  unchanged; the Forge tab's Melee lock is the worker's wear gate at every
  trained level 0-30; hardening's level the same on both sides for 17 weapons
  in 3 slots.
- Adapted: `hardening` (its forge is a copper greatsword; the gate tested on an
  iron blade; §8d on a softwood bow), `prog3` (the wear gate), `lifeskills-
  economy`, `anticheat` (the prototype key as a greatsword, so the KEY is what
  refuses it), `threat`, `salvage` (greatswords), `owner-icons` (seven icons;
  the hammer on the Upgrade tab, cut by `card`).
- Phone scenarios: `mp-smithy` (now at dpr 2: the hammer, the XP star on Smelt
  and Forge, the painted anvil in front of the smith, no switch, no wood,
  copper first at Smithing 1 with "+800", iron locked at Smithing 5, the copper
  greatsword minted, hardening it with no lock), `mp-hardenbars` (a copper
  greatsword, "8/1"; the bow's line "Needs Woodworking Lv1"), `mp-townforge`
  (four bars), `mp-armorforge` (the XP star); and the nine scenarios that
  forged a cheap wooden blade through the channel now forge a copper
  greatsword from four granted bars (mp-lootcue, mp-dashreal, mp-fightsoak,
  mp-tapswing, mp-lootmagnet, mp-dashhit, mp-fakenum, _lootfarm, _lootdup).

## For the owner's eye

- The anvil is the town's painted anvil, about waist-high to the bro (73 x 63
  world px), hiding his legs while he works -- he stands behind it. A
  hammer-and-anvil animation of his own would need new art; he still swings
  the mining pick.
- The strike sound: the sword's own metal hit, pitched up. If it reads as
  "combat", the other recording on hand is the metal props' clang
  (`armor-hit-2`), duller but with no thud at all (2% under 250 Hz).
- A pine bow's hardening line now says "Needs Woodworking Lv1" (the level that
  makes pine), true and always met.
