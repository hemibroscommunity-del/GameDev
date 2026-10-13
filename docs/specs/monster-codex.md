# The monster codex (v2.3.3198)

Owner, 2026-10-12: *"Begin working on the monster section of the codex. After
you kill a monster you learn more about it, what it does, where it's from,
elemental type, special attack, (make up a backstory) etc. it'll be another
dashboard section that just displays information. Maybe an animation similar
to how the skills preview window currently works."*

Then, with a mockup of the page: *"I want all the facts revealed after just 1
kill. I also want to change the structure of each monster entry to look like
this. This is just a mockup with fake items but the structure is correct."*

More → Codex → **Monsters** (the tab that used to be "Bestiary"). One card for
each of the Wheel's nine kinds of monster, its shape alone until you kill one;
**the first kill opens its whole page**.

## The page (the owner's mockup)

The page lives on the dashboard's own sheet, at the one height every
destination has (v2.3.1638), and SCROLLS in it. It grew tall at first, as the
mockup draws it; asked, the owner: *"Stay short and scroll."* On a 390 x 844
phone the sheet shows ~167 px of it at a time, so what a tap brings up is put
where it can be seen (`reveal` in MonsterCodex.jsx):

- a page opens at its top, however far the monsters were scrolled;
- a tap on a tab (the open one's too) puts what it opened at the top of the
  sheet -- Info's stage comes first on its tab, its elder toggle under it, as
  the stage (150 px) is nearly the whole view;
- an item's card opens at its top; its X brings the list back with that row in
  view;
- back on the monsters, the card you came from is in view.

The Codex's own Monsters / Codex / Materials / Zones tabs step aside while a
page is open (EncyclopediaPanel holds which page, so both change in one
render), "‹ All monsters" bringing them back.

- **The header**: its portrait, its name, and three badges -- its levels
  (`Lv 1–40`), its element with its icon, and its type of creature, by its
  body (`CODEX_TYPES`; the owner: *"more along the lines of humanoid, beast,
  (some word along those lines that means flying creature, bug-like creature,
  swimming creature)"*): **Humanoid** (the snowman, the fire goblin, the
  mummy), **Beast** (the rock monster, a boulder with a mouth), **Aquatic**
  (the fishman, the bog lurker) and **Ooze** (the two slimes and the mire wisp,
  drawn as one -- the one word the owner's list did not have); **Winged** and
  **Insectoid** wait for a monster that flies or a bug. And how many you have
  defeated. (The first set, Elemental, Goblin, Undead, Golem, Slime, Aquatic
  and Spirit, was replaced.)
- **Drops** (the first tab): ITEM / TYPE / CHANCE, every item a kill can drop,
  most often first, a bar for each chance and its dice, on a near-black panel of its own
  (the owner: *"The drops table needs a different background so the
  information can stand out more from the dashboard background. Maybe
  black?"* -- `#05090B`, the stage's own black). Then *"Make the codex section
  that has the table more readable with the background"*: every other row a
  shade lighter and no lines between them, the headings on a band of their
  own, names and chances a size up and brighter, a long name in two lines
  instead of cut short ("Fire Goblin Remnants"), and the bar HOW COMMON over
  the chance's powers of ten (`barWidth`: every kill full, 10% 77%, 0.2% 38%,
  1 in 10,000 a stub) -- on a straight scale every drop rarer than the shard
  was the same sliver. The number beside it is exact. Then *"Wrap text for the
  item name and increase the usable area for the bar size. Looks like the
  chance column reserves too much space"*: the chance column was 76 px for the
  one long chance, the random weapon's "0.05–0.24%", so every other number
  stood far from its bar (a "100%" ~50 px, a "5%" ~63). It is one number wide
  now (`PCT_W` 40), that range taking two lines at its dash (`pctLines`), the
  numbers still lined up on their right; the type column its longest word's,
  "Currency" (52 px); and the name and the bar share the rest, the bar the
  bigger part (`minmax(0, 1fr)` and `minmax(0, 1.2fr)`): on a 390 px phone the
  bars are 117 px long (were 44) and the names 97 px wide, "Snowman Remnants"
  and "Iron Great Sword" on two lines. Then *"Remove 'a random weapon' drop.
  All drop chances should be a single value. Also make the percentage bars out
  of 100%. The 10% bar almost looks as long as the 100%. I also thought about
  maybe a 'roll-based system' where you see dice and number ... The rarest
  drop in the table is the lowest number beginning at 1"*, and asked, the
  random weapon out of the GAME ("Remove it from the game", below) and "Each
  drop's own roll": every chance one number; the bar its share of 100%
  (`barWidth`: 10% is a tenth of the bar, a 2 px nub for anything under a
  pixel's worth); and each drop under 100% its DICE: the numbers of a kill's
  roll of 1 to 10,000 for it that drop it (`codexRoll`, `CODEX_ROLL_SIDES`).
  Then *"Actually 'roll' column with a number range and drop chance percentage
  in parentheses might be better"*: the chance column is a **ROLL** column
  (`ROLL_W` 50), the Gambling Den's two dice in its heading, each row its range
  over its chance in parentheses, "Always" for an every-kill drop (nothing to
  roll); the bars stay, 111 px on a 390 px phone:

  | Drop | Roll |
  |---|---|
  | Gold, its remnants | Always (100%) |
  | Its land's shard | 1–1,000 (10%) |
  | Raw gem | 1–500 (5%) |
  | Rare Gem | 1–50 (0.5%) |
  | Iron Torso, Iron Greaves, Iron Great Sword | 1–20 (0.2%) each |
  | Gold Nugget | 1 (0.01%) |

  That is the worker's own roll (`Math.random() < chance`, each drop on its
  own, so one kill can still give a shard and a gem) said on a 10,000-sided
  die, and a key under the table says so: "Each kill rolls 1–10,000 for every
  item. A roll in its range drops it." A tap on a row opens the item's
  **card**: its picture, name, type and base rarity ("Common" for a weapon or
  armour piece), what it is, FOUND FROM (the monster), BASE DROP CHANCE, for a
  weapon or armour piece the POSSIBLE RARITY it rolls after it drops (Normal
  90.09995%, Rare 9%, Elite 0.9%, Godly 0.00005%, each tile the item in that
  grade's frame), and a note of how it drops. Its BASE DROP CHANCE says its
  roll too ("drops on a roll of 1–20 out of 10,000"). Its X comes back to the
  list with that row marked.
- **Info**: the stage (below), a toggle for its elder form under it, and what
  it does, its element, its special attack with a tip, its story, and its
  elder form.
- **Locations**: its land and levels, the first stage's levels and the elder
  form's past the first pass, the way there from BroTown (which gate, which
  road: `CODEX_ROADS`, the plan's own road names), and its land's dungeon with
  its levels where it has one (`dungeonLevels`, the worker's baked
  `WHEEL_DOORS`).

## When it opens

| Kills of that kind | What the page shows |
|---|---|
| 0 | its shape only, "???" |
| 1 | **everything**: its drops, what it does, its element, its special attack, its story, its elder form and where it lives |

Until the owner's "all the facts after just 1 kill" the facts opened at 1, 3,
10 and 25 kills and the elder form at a kill past level 20. `CODEX_OPEN_AT` /
`CODEX_TIERS` in `src/data/monsterCodex.js` are held to the worker's
`CODEX.TIERS` ([1], server/src/codex.js) by mirror-audit: the first kill of a
kind is the one the worker writes to storage at once. Kills past level 20 are
still counted (the header's "past Lv 20").

A party's kill teaches every player it pays XP to, as it counts for their
quests. A monster with no land (the closed old zones) teaches nothing.

## The kinds

The pets' nine (`PET_KINDS`, server/src/petbook.js and src/data/trapping.js),
so a codex page and a pet journal page are always about the same monster: one
a land, the Poison Forest's wisps and lurkers apart. The kind of a live monster is
the worker's `petKindOf` (its land, and the look it spawned in — a mummy torn
down to its skeleton is still a mummy); its stage is `petStageOf` (2 from level
21).

## The drop table

Owner, 2026-10-12: *"Also include drop tables for all items that monster can
drop."* Every row is the worker's own roll (`src/data/codexDrops.js`), most
often first, open with the page at the first kill (the Drops tab):

| Drop | Chance | Where it is rolled |
|---|---|---|
| Gold | every kill, 5–18 by level (Lv 1–40) | the monster's own (`_makeZoneMonster`), split by damage |
| Its remnants | every kill (6 of the 9 kinds) | `_isRemnantSkullArch` / `_invKeyForSkull`; none from the rock monster, fishman, bog lurker |
| Its land's shard | 1 in 10 | `SHARD_MONSTER_DROP` |
| Raw gem of its element | 1 in 20, killing blow | `GEM_RAW_MONSTER_DROP`; only the Gem Cutter's elements (`AMULET_GEMS`), so none from the Verdant Wilds' Flora |
| Rare Gem | 1 in 200 | `RARE_GEM_MONSTER_DROP` |
| Iron Torso, Iron Greaves | 1 in 500 each | `MONSTER_ARMOR_DROPS` |
| Iron Great Sword | 1 in 500 | `MONSTER_IRON_WEAPON_DROP` |
| Gold Nugget | 1 in 10,000, killing blow | `GOLD_NUGGET_MONSTER_DROP` |

Every weapon and armour piece rolls its grade as it drops (Rare 1 in 11, Elite
1 in 110, Godly 1 in 2,000,000: hardening.js `WEAPON_QUALITY_ODDS`). Only
players who did 5% of its damage can loot the pile; they split the gold by
damage, and everything else on it goes to whoever picks it up first.

**No random weapon off a kill (v2.3.3198).** The owner: *"Remove 'a random
weapon' drop"*, and asked whether from the table or the game: *"Remove it from
the game"*. v2.3.1141's server-minted random weapon (a sword, great sword, bow
or staff, its element and rarity by the land, 0.05% a kill at Lv 1 rising on a
cubic curve to 0.24% at Lv 40 and ~3% at Lv 100) is gone: `_rollWeaponDropForKill`
and data.js `monsterWeaponDropOdds` are deleted, and a kill's one weapon is the
Iron Great Sword's 1 in 500 (`_rollIronWeaponForKill`). So elemental, fusion
and prismatic weapons no longer come off monsters. `disable_weapon_drops` still
stops the iron blade, and `caps.weaponDrops` stays true, so no page mints a
weapon itself (the client's legacy mint runs only without it). `drops` suite
§6b pins it gone: a level-40 kill whose every roll is 0.0021 (over the iron
blade's 0.2%, under the old weapon's 0.24%) drops no weapon.

The number that was inline on the worker is named in `server/src/data.js` for
this (`SHARD_MONSTER_DROP`), the roll reading the same name, and the grade odds
exported from hardening.js. mirror-audit holds
the page's copy to all of them, and the per-monster facts to the worker's real
Wheel: every one of its 384 monsters' gold at its level, each kind's remnants,
its shard and whether its element gives a gem. A rate changed on the worker and
not on the page fails the audit.

## The stage

`src/ui/mobile/dash/CodexStage.jsx`, drawn from `src/data/codexStage.js`: the
Points window preview's make (`sheet/StatDemo.jsx`). Your own character on the
left (the Equipment screen's `CharacterView`), the monster on the right in its
own strips at the URLs the world loads them from, one ground line, and every
motion CSS: a beat is one `setState`, a strip steps through its cells
(`bt-sd-strip`), a walk is a transition. Nothing is drawn a frame at a time.

**One box, and everyone stands inside it.** The owner, of the first look: *"the
animation shows the player and monster in a layer above the container they're
supposed to be in and the bottom of the characters are visible on the
dashboard container"*. The stage's bottom 40 px were the land's tint at .2 --
the dashboard's own slate -- with the feet on a line 9 px up and your boots on
the box's very edge, so both stood half out of a dark box onto the dashboard.
Now the stage is a near-black scene in a visible frame (game.css `bt-cx-stage`)
with a GROUND STRIP of the land's colour exactly `GROUND` (16) px tall and a
bright top edge, and every foot stands on that edge: yours where the figure
says it drew your boots (`onDrawn`, `__btFigure`, as StatDemo plants its
fighter), the monster's strips CUT at their art's lowest row so their boxes end
there, and its body standing on the strip so a swell or the blue slime's 2.4x
burst grows from its feet (from the box's bottom edge, the burst came out
10 px past the frame's top). Your figure is 18 px in, so a gust's shove keeps it
inside. The stage is isolated (its own stacking context) and nothing in it asks
for a compositing layer of its own (no `will-change`), so nothing drawn there
can paint outside the frame on a phone, whether or not its compositor clips a
moving layer at a rounded edge. `mp-codex` measures every stage: your figure's
painted pixels and the monster's art never past the frame, both at rest within
1.5 px of the ground strip's edge.

What it plays:

- its ordinary attack -- a snowball, a fireball or a glob crossing the gap, or
  a walk up to you and a swing -- and the hit says what its element does to
  you (the element's icon and its status over your head; a gust shoves you);
- and every other round its **special**, with the world's own word for
  it (SLAM!, LUNGE!), the world's wind-up times (`CODEX_WINDUP_MS`, from
  `server/src/telegraph.js`), and for a slam or a lunge the world's own
  WARNING CIRCLE under you, filling as it winds up (effectsRenderer's
  `_telegraphZones`) -- so the page teaches the tell the fight will show. No
  ring is drawn as anything lands (the slime's burst never had one: v2.3.2226,
  "remove code drawn impact areas for slime death"); a slam or a burst kicks
  the stage, as the world kicks its camera. The blue slime backs away as it
  swells so it grows away from you, and bursts at its swelled size, as the
  world plays it (v2.3.2227). The mummy's bones are drawn bigger, as the world
  draws them, and keep their own reach.
- **elder form**: a toggle puts it in its second stage's colour and name.

Under `prefers-reduced-motion` nothing runs: the monster stands still.

It plays on the **Info** tab. **Its pictures load when that tab opens and go when it closes** -- one
monster's strips at a time, and what it throws, all in before the first beat
(a fireball loading as it was thrown crossed the gap undrawn). Until they are
in, the monster stands as its portrait from the pet sheet, which the loading
screen already fetched. A recoloured monster (the wisp, the lurker, the blue
slime, every elder form) is baked onto the stage's own copies, revoked on
close. This was the OWNER'S CALL (the preloading law, Conventions), made on
2026-10-12: asked whether to hold all nine monsters' strips for the session
instead -- ~20 MB of decoded pictures, most of them the very looks the Wheel
loads only as you walk toward them -- the owner: *"I think loading only when
you open the info tab"*. Nothing loads during play, so the law's purpose -- no
hitch in a fight -- is kept. Do not move them onto the loading screen.

## Storage: `codex:<pid>`

`{ v, k: { <kind>: [kills, killsPastLevel20] } }` — its own key (handoff rule
1: never a new field on the rpg blob), registered in ARCHITECTURE-HANDOFF.

- One GET at join, cached for the session (`_codexLoadOnJoin`).
- A kill that crosses a threshold -- the first of its kind, which opens the
  page -- or a first second-stage kill, is written at once. Any other kill at most once every `CODEX.SAVE_MS` (60 s), on the next
  kill after it, and on disconnect (index.js `webSocketClose`). A deploy (rule
  11) loses at most a minute of counting and never a fact.
- A record a **newer** worker wrote (`v` above `CODEX.V`) is LOCKED: never
  counted into, never overwritten (a rollback must not shrink it). So is one
  whose **read failed** — a failed read must never become a fresh record
  written over the real one. The phone is told `unavailable`.
- Deleted by `_resetCharacterData` (a restarted character has killed nothing),
  its cache dropped without a flush.

## Wire

| Message | Direction | Payload | Notes |
|---|---|---|---|
| `codex_state` | worker → phone | `{v, k}` or `{unavailable: true}` | at join, after the pets record; PRIVILEGED |
| `combat_credit.cx` | worker → phone | `{k, n, n2}` | the kill's kind and its new counts, on the credit message the recipient already gets — no new message per kill |
| `caps.codex` | worker → phone | `true` | advertised at join; `codex: false` in liveflags turns it off |

No phone → worker message: the codex is read-only.

Deploy order: an old phone ignores `cx` and `codex_state`; a new phone against
an old worker (no `caps.codex`) shows the cards with a line saying the codex
opens after the next update.

## Kill switch

`codex: false` in liveflags: the join's spread un-advertises `caps.codex`,
`_codexOff` stops the counting, and what was already learned is still sent and
shown.

## The dev lever

`POST /api/admin/dev/codex {playerId, kind | all, n, n2}` sets a kind's counts
(or every kind's), writes and tells the phone — for looking at every page
without walking out to kill one of all nine kinds. `n: 0` forgets a kind. Audit-logged like every
dev op.

## Tests

- `server/test/codex.test.mjs` (45 checks): caps and the first look; a kill counted on its
  credit and its first kill written at once; coalesced counting, the first
  kill the one threshold; the Poison Forest's two kinds, a party's kill, the second stage, a
  monster with no land (and a land named `__proto__`); disconnect and rejoin;
  a newer record and a failed read left alone; the kill switch; a restart; the
  dev lever; `normalizeCodex`; and the drop table's odds are the ones rolled (a
  shard drops just under its line and not just over it; no random weapon is
  rolled at all).
- `drops` §6b: the iron blade is a kill's one weapon, and a level-40 kill whose
  every roll would have dropped the old random weapon drops none.
- `mirror-audit`: `CODEX_TIERS` and the client's nine kinds against the
  worker's; each page's dungeon and levels against `WHEEL_DOORS` and its road
  against the plan's; every drop rate, the grade odds, no random weapon on
  either side, every chance one number and its dice a whole number of the
  1–10,000 roll, and each of the Wheel's monsters' gold and remnants against
  the page's drop table.
- `mp-codex` (phone, 36 checks): the Monsters tab; a real kill opening the
  whole page on the sheet's own height, scrolling in it from its top, its
  header badges (a Humanoid snowman) and tabs; its drop table; scrolled to
  its end, the Iron Great Sword's card opening at its top (Common, 0.2%, the
  four grades) and a shard's (no grades), the X back to the marked row in
  view; the table's near-black panel, darker than the sheet, its stripes and
  heading band; nine rows and no random weapon, the ROLL column (its heading
  and its dice) with every row's range over its chance in parentheses (the
  shard's "1–1,000 (10%)" to the nugget's "1 (0.01%)", "Always (100%)" for
  gold and remnants; each a line, right edges together, inside its row) and
  the key under the table; each bar's fill its chance's share of the track
  (10% a tenth, a 2 px nub under that); the bars at least 100 px long, the
  roll column its widest text's width, a long name wrapping to two lines; the
  cards' roll ("drops on a roll of 1–20 out of 10,000"); no name, type or
  chance cut short on any page; a tap on a tab, the open one's too, putting its content at the
  sheet's top, Info's whole stage in view; every fact open on Info from one
  kill, the stage playing its special, your character and the monster on its
  ground strip and never past its frame (the stage isolated, nothing in it
  with `will-change`), on every one of the nine; Locations (the land, both stages, the
  way there, the dungeons); the sheet never growing and the card you came
  from in view on the list; every page's type badge by its body and each page
  opening at its top; every page's own drop table, every stage playing its
  own special, a
  slam's or a lunge's warning circle, what it throws in before its first
  flight, no monster ever standing over your character, nothing left behind
  on close, the counts back after a reload.
