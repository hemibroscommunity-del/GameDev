# The monster codex (v2.3.3209)

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
phone the sheet shows ~167 px of it at a time (191 since v2.3.3215, the Codex
its own destination: "Its own button" below), so what a tap brings up is put
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
  in parentheses might be better"*: the chance column is a **ROLL** column,
  the Gambling Den's two dice in its heading, each row its range over its
  chance in parentheses, "Always" for an every-kill drop (nothing to roll);
  the bars stay. Each drop rolled on its own then, so every range began at 1.
  And then *"Shouldn't these numbers not overlap each other? Getting a roll of
  1 implies you'd get all the loot with 1, but it's really just the gold
  nugget. I think these should be number ranges. That way a player hunting for
  something can also be looking for a roll number within that range"*: the
  worker rolls **once a kill** and each drop owns its own numbers (*One roll a
  kill*, below), so the column (`ROLL_W` 64, for "612–1,611"; the bars 104 px
  on a 390 px phone) reads, for a snowman:

  | Drop | Roll |
  |---|---|
  | Gold, its remnants | Always (100%) |
  | Its land's shard | 612–1,611 (10%) |
  | Raw gem | 112–611 (5%) |
  | Rare Gem | 62–111 (0.5%) |
  | Iron Torso | 42–61 (0.2%) |
  | Iron Greaves | 22–41 (0.2%) |
  | Iron Great Sword | 2–21 (0.2%) |
  | Gold Nugget | 1 (0.01%) |

  The blue slime has no raw gem, so its shard is 112–1,111. A key under the
  table says it: "Each kill rolls once, 1–10,000. The item whose numbers it
  lands on drops; 1,612–10,000 drops nothing more." (Against a worker that
  does not roll once a kill, an older one or `killroll: false`, every range is
  1 to its drop's own number and the key says each drop rolls on its own:
  `codexDropsFor(kind, { shared: false })`, read off `caps.killroll`.) A tap
  on a row opens the item's
  **card**: its picture, name, type and base rarity ("Common" for a weapon or
  armour piece), what it is, FOUND FROM (the monster), BASE DROP CHANCE, for a
  weapon or armour piece the POSSIBLE RARITY it rolls after it drops (Normal
  90.09995%, Rare 9%, Elite 0.9%, Godly 0.00005%, each tile the item in that
  grade's frame), and a note of how it drops. Its BASE DROP CHANCE says its
  numbers too ("drops on a roll of 2–21 out of 10,000"). Its X comes back to
  the list with that row marked.
- **Info**: the stage (below), a toggle for its elder form under it, and what
  it does, its element, its special attack with a tip, its story, and its
  elder form.
- **Locations**: its land and levels, the first stage's levels and the elder
  form's past the first pass, the way there from BroTown (which gate, which
  road: `CODEX_ROADS`, the plan's own road names), and its land's dungeon with
  its levels where it has one (`dungeonLevels`, the worker's baked
  `WHEEL_DOORS`).

## Its own button, and more of it on the sheet (v2.3.3215)

The owner, after the codex shipped (#880): *"Are you able to fit the codex as
another dashboard button? Also is there a way to display more data without
needing to scroll down so much?"*

**The button.** The dashboard's row is six buttons now -- Dashboard,
Character, Quests, Life Skills, **Codex**, More -- More's own Codex picture
(`panel-encyclopedia`), with a count of the monsters whose page has something
you have not looked at (the cards' NEW, `codexFreshCount`). It opens the codex
as its own destination; More's Codex tile opens the same screen.

The width came from the drill's back chip. On a screen opened from More
(Settings, Login Key, Build, a quest...) the row held the CLOSE pill, the
◂ chip and the buttons, and was full. Asked whether to make all six narrower
(38 px on a 390 phone) or move the arrow down beside the screen's title, the
owner: *"Move back arrow"*. So a drilled panel's header is one button,
"◂ SETTINGS" (BottomDashboard `data-dash-back`, as landscape's side sheet has
carried it since v2.3.2168), and the row is the CLOSE pill and the six buttons
in every mode: **44 px each on a 390 phone** (the five were 46), 41 at 375, 39
at 360, 51 at 430 (sheetGeometry `IDENTITY_MIN_LINE` 122 -> 84,
`RAIL_COUNT` 6). The buttons no longer step 38 px right when a drill opens.
Sideways the dock is seven slots (the fold chip and six), `LAND_NAV_BTN_W`
28 -> 26 so the side column grows 18 px, not 32.

**More on the sheet.** Measured on the QA phone before (mp-codexfit), the
sheet's box was 167 px and:

| | before | after |
|---|---|---|
| the box (the Codex as its own destination: no drill header) | 167 px | 191 px |
| the monster list: cards whole without scrolling | 0 of 9 | **9 of 9** |
| ...and its scroll | 331 px | 18 px |
| a page's first look: where its tab's content begins | 172 px down (none of it seen) | 93 px (80 px of it seen) |
| Drops: whole rows after a tap on the tab | 2-3, the tabs scrolled away | 3, under the tabs |
| Drops / Info / Locations scroll | 482 / 907 / 266 px | 301 / 730 / 131 px |
| the tabs, scrolled to the end | gone off the top | **pinned at the top** |

What changed, all in MonsterCodex.jsx and EncyclopediaPanel.jsx:

- **The list**: a card is its picture beside its name, its land and its count
  (~45 px, was 122), three across; two across in a narrow sheet (sideways),
  their words wrapping rather than cut.
- **The Codex's own tabs** (Monsters / Codex / Materials / Zones) show only
  once one of the three others has something in it: they read lists nothing
  in the game writes any more (`_seenCollisions`, `_seenMaterials`,
  `_visitedZones`), "Nothing discovered" for every player. Kept, not deleted.
- **The header**: 78 -> ~48 px -- the portrait 44 (was 60), the count on the
  name's line, the badges a size down.
- **The tabs stay pinned** to the sheet's top while you scroll (`Tabs`,
  `position: sticky` on its own opaque ground, game.css `.bt-cx-tabbar`), and
  "‹ All monsters", a 40 px row of its own above the header, is the bar's
  first button (`data-cx-back`). `reveal` puts what a tap brings up just
  under the bar (`barInset`).
- **Info's stage is drawn as big as fits under the pinned bar** (`StageFit`:
  one CSS scale of the whole stage, never bigger than it was, never wider
  than the sheet -- sideways it used to be cut off): 0.93 on the QA phone,
  278 x 139. Its feet still stand on the ground strip (mp-codex measures it
  in screen px by the scale the stage's rect shows).
- **Tighter rows**: drop rows 42 -> 34-36 px (two-line names 36), the facts'
  and location rows' padding and line heights a step down.

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

**No random weapon off a kill (v2.3.3209).** The owner: *"Remove 'a random
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

## One roll a kill (v2.3.3209)

The owner, on the Roll column when every range began at 1: *"Shouldn't these
numbers not overlap each other? Getting a roll of 1 implies you'd get all the
loot with 1, but it's really just the gold nugget. I think these should be
number ranges. That way a player hunting for something can also be looking for
a roll number within that range."*

So a kill rolls **one** number, 1 to 10,000 (`server/src/killroll.js`), and
every drop that is not on every kill owns a run of those numbers: its chance x
10,000 of them, laid from 1 up, the rarest first (`KILL_ROLL.ORDER`; the three
1-in-500s the reverse of the codex's rows, so its table reads straight down).
A drop a monster cannot give has no numbers (`_killRollCan`: its land's shard,
and a raw gem only for a Gem Cutter element), so every number of a monster's
table is one drop's or none (`killRollLayout`, `killRollHit`).

- **Each drop's chance is what it was** (its numbers over 10,000; mirror-audit
  holds every chance to a whole number of them), so over many kills each drops
  as often as before. What changed: a kill drops **one of them at most**. Each
  had its own roll, and about one kill in 170 dropped two.
- **Who gets it is as before**: the pile's drops (the shard, the rare gem, the
  iron pieces) whoever picks the pile up; the raw gem and the nugget the
  killing blow, into the bag. The pile's and the killing blow's rolls all read
  the kill's one (`_spawnLootForKill(..., kr)`, `_amuletNuggetOnKill(ps, hit)`,
  `_gemRawOnKill(ps, zone, hit)`); called with no roll they roll on their own,
  as the kill switch does.
- **A Workshop run** (dungeon.js `_workshopDropScale`): a roll on a flat drop's
  numbers drops it at the run's share, one more draw only when the share is
  under 1; the shard and the raw gem are never scaled there (they were not).
- **`disable_weapon_drops`** leaves the iron blade's numbers where they are,
  dropping nothing; every other drop keeps the numbers the codex shows.

**The roll is shown.** Every player the kill credits gets it on the kill's
`combat_credit`: `roll`, and `rh` (the drop's codex row id) when that drop is
theirs (a pile's for anyone who may pick the pile up, the killing blow's for
the killer: `_killRollTheirs`). The game shows it over the monster
(`src/game/killRoll.js`), the Gambling Den's dice in front of it
(`/icons/popups/dice.webp`, effectsRenderer's `dice` mark, `iconLead`):

- nothing more: "7,431" in a quiet grey (`KILL_ROLL_MISS`), held 1 s, gone in
  2.4 (a damage number fades from its first frame, in 1.5);
- on a drop: "640 Frost Shard" in gold (`KILL_ROLL_HIT`), held 1.8 s, gone in
  3.2, the name the codex's own row's (`killRollDropName`);
- drawn as a message (`roll: true`): the plain hit's size, never a number's
  white;
- a kill off your screen (a burn finishing it, a party's kill across the
  field): over your own head.

`caps.killroll`; `killroll: false` in liveflags is the kill switch (every drop
on its own roll again, nothing sent, the codex's ranges back to 1 to each
drop's own number). The dev lever `/dev/killroll {next, kill}`: `next` is this
player's next kill's roll (1 to 10,000), `kill` a live monster's id in their
zone, killed now through `_resolveMonsterKill`.

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
| `combat_credit.roll` | worker → phone | 1 to 10,000 | the kill's one roll (killroll.js), to everyone the kill credits |
| `combat_credit.rh` | worker → phone | a codex row id | the drop it landed on, when that drop is this player's |
| `caps.killroll` | worker → phone | `true` | the worker rolls once a kill; `killroll: false` in liveflags turns it off |

No phone → worker message: the codex is read-only.

Deploy order: an old phone ignores `cx` and `codex_state`; a new phone against
an old worker (no `caps.codex`) shows the cards with a line saying the codex
opens after the next update.

## Kill switch

`codex: false` in liveflags: the join's spread un-advertises `caps.codex`,
`_codexOff` stops the counting, and what was already learned is still sent and
shown.

`killroll: false`: the join's spread un-advertises `caps.killroll`,
`_killRollOff` puts every drop back on its own roll, no `roll` is sent, and the
codex's ranges go back to 1 to each drop's own number.

## The dev lever

`POST /api/admin/dev/codex {playerId, kind | all, n, n2}` sets a kind's counts
(or every kind's), writes and tells the phone — for looking at every page
without walking out to kill one of all nine kinds. `n: 0` forgets a kind. Audit-logged like every
dev op.

`POST /api/admin/dev/killroll {playerId, next, kill}`: `next` (1 to 10,000) is
the roll of this player's next kill as its killing blow; `kill`, a live
monster's id in their zone, killed at once through `_resolveMonsterKill` (the
answer carries that monster's `layout`).

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
- `server/test/killroll.test.mjs` (29 checks): each drop's numbers (its chance
  x 10,000, from 1 with no gap and none shared, the very constants it rolled
  at; the blue slime's shard 112–1,111); caps.killroll; a roll on each drop's
  first and last number dropping that drop and nothing else, past 1,611
  nothing, its combat_credit saying the roll and the drop; where each one goes
  (the raw gem into the killer's bag, the shard in the pile, the torso the
  pile's one armour piece); with every other draw of the kill forced to 0, a
  roll of 7,777 dropping nothing; a party (everyone told the roll, `rh` only to
  whom the drop is for); the Workshop's share; `disable_weapon_drops`; the
  kill switch (no roll, every drop back on its own roll); the dev lever; and
  over 300,000 rolls each drop at its chance.
- `mirror-audit`: `CODEX_TIERS` and the client's nine kinds against the
  worker's; each page's dungeon and levels against `WHEEL_DOORS` and its road
  against the plan's; every drop rate, the grade odds, no random weapon on
  either side, every chance one number and its dice a whole number of the
  1–10,000 roll, and each of the Wheel's monsters' gold and remnants against
  the page's drop table; and the one roll: the same order, die and chances on
  both sides, and every kind's numbers on the page the worker's own
  (`killRollLayout` for a real Wheel monster of that kind).
- `mp-codex` (phone, 37 checks; v2.3.3215: opened by the Codex's own button,
  whose count says the first kill's new page and clears when it is looked at;
  a tab's content just under the pinned tabs; the stage's feet measured in
  screen px by its scale): the Monsters tab; a real kill opening the
  whole page on the sheet's own height, scrolling in it from its top, its
  header badges (a Humanoid snowman) and tabs; its drop table; scrolled to
  its end, the Iron Great Sword's card opening at its top (Common, 0.2%, the
  four grades) and a shard's (no grades), the X back to the marked row in
  view; the table's near-black panel, darker than the sheet, its stripes and
  heading band; nine rows and no random weapon, the ROLL column (its heading
  and its dice) with every row's own numbers over its chance in parentheses
  (the shard's "612–1,611 (10%)" down to the nugget's "1 (0.01%)", "Always
  (100%)" for gold and remnants, the blue slime's shard "112–1,111"; each a
  line, right edges together, inside its row) and the key under the table
  ("Each kill rolls once ... 1,612–10,000 drops nothing more"); each bar's
  fill its chance's share of the track (10% a tenth, a 2 px nub under that);
  the bars at least 100 px long, the roll column its widest text's width, a
  long name wrapping to two lines; the cards' numbers ("drops on a roll of
  2–21 out of 10,000", the shard's "612–1,611"); no name, type or
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
- `mp-killroll` (phone, 11 checks): caps.killroll; walked out to Frost
  Ridge's first snowmen, a kill showing its own roll over the snowman; a roll
  of 7,431 "7,431" in grey, no drop; 640 "640 Frost Shard" in gold, held
  longer, the shard on the ground; 300 "300 Raw Frost Gem", the gem in the
  bag; 1 "1 Gold Nugget"; drawn as a message (the plain hit's size, its own
  colour) with the dice drawn in front of the number; a kill off your screen
  over you; no page errors -- pictures in tools/qa/mp/out/killroll-*.png.
- `mp-codexfit` (phones, 36 checks, v2.3.3215): the dashboard's six buttons
  (the Codex fifth, More last), 44 px at 390 and 39 at 360, on screen, apart,
  answering at their centres, and in the same places at rest, with the Codex
  open and on a drilled screen; the Codex button and More's tile opening the
  codex as its own destination, lit; a drilled screen's way back the panel's
  "◂ SETTINGS" header, back to More; the list's nine cards whole without
  scrolling, no name cut, the empty Codex tabs aside; a page's first look
  showing its table; each tab's content just under the pinned bar, three drop
  rows whole, Info's whole stage, the bar pinned at the end, every tab
  scrolling less than before; the bar's ‹; sideways, the six buttons in the
  side container (238 px), the list two across with no word cut -- numbers in
  tools/qa/mp/out/codexfit.json, pictures codexfit-*.png.
