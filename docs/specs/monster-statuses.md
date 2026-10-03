# A monster's hit carries its element (v2.3.2996; the other four, v2.3.3013)

> Owner, 2026-10-03: "eventually I want elemental damage per monster type so
> using a snowflake icon for instance when hit by a snowman's snowball and
> slowing down for a second or having burning tick damage from a fire goblin
> with a fire icon as the damage type. From desert winds mummy an air icon that
> blows the character back. Etc" — and then: "Yeah and slime for floral damage.
> You can [use] a brief held in place effect, then push to main".

## What it does

A monster's **landed** hit now does what its element does. The element is the
one its home zone gives it (`_makeZoneMonster` → `element`), so the Wheel's
monsters carry their land's.

| element | monster | status | what you feel | icon on the number |
|---|---|---|---|---|
| frost | the snowman | **chill** | you walk at 55% for 1 s | the snowflake (`elem-frost`) |
| flame | the fire goblin | **burn** | three ticks of damage, one a second | the flame (`elem-flame`) |
| wind | the mummies (all three kinds) | **gust** | shoved 48 px straight away from it | the wind swirl (`elem-wind`) |
| flora | the blue slime | **stuck** | held in place for 0.7 s: no walk, no roll | the slime (`slime-remnants`) |

The other four elements (stone, storm, water, venom) carried nothing at
first: each was the owner's "Etc" to choose. **Since v2.3.3013 they do** (below,
"The other four"). Only an element that does something is named on the wire, so
an element icon on a number always means "this did something".

"Landed" means: not dodged, not blocked, more than 0 damage (the zone-entry
grace and god mode land nothing), and not the killing blow. Those carry the
element's name at most, never a status.

The telegraphed hits (a lunge, a slime's burst) carry it too: a blue slime's
burst holds you, a fire goblin's lunge sets you burning. The fire goblin's
fire trail (`firetrail.js`) was already a burn, so it gets no second one.
Its ticks now name the flame, so they show the flame icon.

## The numbers

All in `server/src/monsterstatus.js`, one place each.

| | value | why |
|---|---|---|
| `CHILL.MS` | 1000 | "slowing down for a second" |
| `CHILL.MULT` | 0.55 | about half pace; the client's `CHILL_MULT` mirrors it (mirror-audit) |
| `BURN.TICKS` × `EVERY_MS` | 3 × 1000 | a burn you can watch, over in three seconds |
| `BURN.PCT` | 0.2 | a tick is 20% of the goblin's hit: 2 hp at levels 1-2 |
| `BURN.MAX_HP_PCT` | 0.1 | no tick above 10% of your max HP (the no-one-shot rail) |
| `GUST.PX` | 48 | a step and a half: out of a mummy's ~45 px reach, not across the screen |
| `GUST.MS` | 240 | how long the client takes to carry the shove out |
| `GUST.ALLOW_MS` / `ALLOW_MAX` | 1500 / 96 | how long, and how far, the worker's speed bound widens for it |
| `STUCK.MS` | 700 | "a brief held in place" |
| `STUCK.IMMUNE_MS` | 2000 | after a hold ends, no new hold for 2 s |

**The burn** is refreshed by the next hit and never stacked. A goblin
swinging once a second keeps one burn alight; it does not pile up a second
one. A hit while burning restarts the count of ticks but not the clock, so a
fast goblin cannot hold the next tick off forever. It was tried at 30% first.
With a pack of six on you, that made the Flame Fields' first goblins hit about
45% harder, and they are among the first monsters a new player meets.

**The hold** has an immunity window because blue slimes are fast and come in
sixes. Without it, three of them would hold you for good.

**The gust** goes straight away from the monster that struck, and is scaled by
the zone's depth where you stand (`_depthK`). Standing exactly on top of it
there is no "away", so there is no shove.

## The other four (v2.3.3013)

Offered *"stone stuns briefly; storm shocks nearby players; water slows stamina
refill; venom poisons over time"*, the owner: *"Yes continue working on those
items."*

| element | monster | status | what you feel | icon on the number |
|---|---|---|---|---|
| stone | the rock monster (the Rock Hollows) | **daze** | 0.5 s: no walk, swing, roll or shield; stars wheel round your head | the stone (`elem-stone`) |
| storm | the Storm Peaks' slimes | **shock** | a crackle on you; the hit **arcs** to every other player within 150 px of you, half its damage each | the lightning (`elem-storm`) |
| water | the fishman (the Tidal Coast) | **soak** | 4 s: your stamina refills at 40% of its pace; drips fall off you | the drop (`elem-water`) |
| venom | the Mire's wisps and bog lurkers | **poison** | five ticks of damage, one a second; bubbles rise off you | the venom (`elem-venom`) |

### The numbers

All in `server/src/monsterstatus.js`.

| | value | why |
|---|---|---|
| `DAZE.MS` | 500 | "briefly": shorter than the slime's 0.7 s hold, and it takes more (your swing and shield too) |
| `DAZE.IMMUNE_MS` | 2500 | the rock monsters come in sixes and hit hard: after a daze, no new one for 2.5 s |
| `SHOCK.R` | 150 | a little more than a body or two apart: "spread out" |
| `SHOCK.PCT` | 0.5 | each arc is half the hit |
| `SHOCK.MAX_HP_PCT` | 0.15 | no arc above 15% of the victim's max HP (the no-one-shot rail) |
| `SHOCK.MAX_ARCS` | 4 | the nearest four, ties by id |
| `SHOCK.MS` | 450 | how long the crackle shows |
| `SOAK.MS` | 4000 | each hit starts it again |
| `SOAK.REGEN_MULT` | 0.4 | the stamina refill while soaked: +3 a regen tick instead of +7 at base |
| `POISON.TICKS` × `EVERY_MS` | 5 × 1000 | slower and longer than the burn's 3 × 1000 |
| `POISON.PCT` | 0.12 | a tick is 12% of the hit: the burn's 60% of a hit again, over five seconds |
| `POISON.MAX_HP_PCT` | 0.08 | no tick above 8% of your max HP |

### How each works

- **The daze** is carried out by the client, as the hold is. `elemMoveMult` is
  0 while dazed, and `combatHelpers.dazeRefused` turns down a swing, a special,
  an ability, a roll and the shield, saying "Dazed!" (not more than every
  600 ms). It sits beside `swimRefused` on every one of its paths, plus the
  auto-attack loop that fires bow and staff shots itself (monsterCombat.js).
  Like the hold, the worker does not enforce it.
- **The shock** is damage, so it is the worker's: `_shockArcs` finds the other
  players within `SHOCK.R` of the one struck, in the same zone. It skips the
  dead, the dying, the disconnected, a harvester (the v2.3.1704 shield) and
  anyone on the Wheel's safe ground. Each arc is priced through `_applyDamage`
  as elemental (Resist reads it, Dodge does not), credited to the monster, and
  announced as that player's own `monster_attack` with `ability: 'shock'` (the
  v2.3.2235 bypass). Its `attackerX/Y` is where the struck player stands: the
  arc's start, which the clients draw a bolt from. An arc that kills goes
  through the death path. The struck player's own hit carries `arcs: n`.
- **The soak** is the worker's: the regen tick multiplies the stamina refill by
  `_soakRegenMult` (exactly 1 when dry, so the line is unchanged then). The
  client has no stamina prediction in server zones, so the bar it draws is the
  worker's own number.
- **The poison** is the burn's machinery in a Map of its own, `this._poisons`:
  one a player, refreshed by the next hit (the count, not the clock), never
  stacked, put out by death, a zone change, a disconnect or the safe ground,
  skipped on a harvester. A player can burn and be poisoned at once; each ticks
  on its own clock. Its ticks say `ability: 'poison'`, `elem: 'venom'`.
  `_tickMonsterBurns` (the name tick.js calls) now ticks both.

### On the client

- **Ticks that are not blows.** A poison's tick and a storm's arc on you join
  the burn's: no flinch, no camera kick, no blood, no armour clang
  (`elemHits.tickKind`). Their sparks are green or yellow-white; the poison's
  bubbles and the arc crackles.
- **The looks** (effectsRenderer `_updateElemStatusFx`, round you and peers):
  - daze: five stars wheeling round the head, the half behind it drawn under
    the figure and the half in front over it, and grit off the blow;
  - shock: lightning crackling round the body, new every 50 ms, a pale core
    over a blue glow. For an arc, a bolt from the player it came off;
  - soak: a puddle at the feet with ripples running out, drips falling off you;
  - poison: a sick green glow underfoot, bubbles rising, two popping over the
    head.
- **The chips:** Dazed (the stone), Soaked (the drop), Poisoned (the venom).
  The storm's crackle is over before a chip could say so, like the gust's
  shove; its icon rides the number.
- **Sounds** (`BT_AUDIO.ELEM_SOUNDS`), from recordings already in the game,
  each slice picked off the recording's own loudness curve:
  - daze: the pickaxe's first strike, slowed to a stony knock;
  - shock: the magic hit sped up to a zap, and the cast's flicker for an arc;
  - soak: the fishing catch's splash;
  - poison: the slime's death pop, and the lure's small plop, deeper, for
    each tick.
- **Icons:** `elem-stone`, `elem-storm`, `elem-water`, `elem-venom` (256 px each,
  about 1 MB more in all), loaded at start with the other popup icons.

### Deploy order

As before, every field is additive and no cap is needed.

- An old client ignores `st: 'daze' | 'shock' | 'soak' | 'poison'` (its
  `applyElemHit` knows only the first four) and draws the heart for the new
  elements.
- It shows a poison tick and a storm's arc as ordinary hits, through the same
  `ability` bypass the burn uses.
- The soak and the arcs' damage are the worker's, so they happen whatever the
  client.

## Who owns what

The **worker** decides every status: whether the hit landed, what it does, for
how long, and which way a gust goes. It says so on the hit's own
`monster_attack`, in four optional fields:

| field | meaning |
|---|---|
| `elem` | `'frost'` / `'flame'` / `'wind'` / `'flora'`: the damage type, i.e. the icon |
| `st` | `'chill'` / `'burn'` / `'gust'` / `'stuck'`: what it did, when it did something |
| `stMs` | how long it lasts (for a gust, how long the shove takes) |
| `kb` | `[dx, dy]`, the gust's shove in whole world px |

**Movement is the client's** (`movement.js`), so the client carries out the
slow, the hold and the shove (`src/game/elemHits.js`). It acts **only** on
those fields, never on a monster's element it looked up for itself. A client
therefore never shoves itself against a worker that did not grant room for it.

- The worker does **not** enforce the slow or the hold. Rejecting a move means
  a snap-back, and timed by one round trip that would rubber-band an honest
  player.
- It **does** widen its own speed bound for a gust it granted
  (`_gustAllowance`, read by `movement.js`). The extra room is spent as the
  shove is walked out, and nothing on the wire can raise it.

**The burn is damage**, so it is the worker's alone. `_tickMonsterBurns` runs
once per tick (`tick.js`). Each tick is priced through `_applyDamage` as
elemental damage: Resist reads it, Dodge does not (combat.js v2.3.2680). It is
announced as an ordinary `monster_attack` stamped `ability: 'burn'`. That is
the v2.3.2235 "the worker resolved this one" bypass, so a tick shows its number
even with the goblin dead or across the map, exactly as the fire trail's ticks
do.

A burn goes out when:

- the player dies, disconnects or changes zone;
- they step onto the Wheel's safe ground, where no monster damage lands;
- its ticks run out.

A harvester (the v2.3.1704 shield) takes no tick, but the burn still counts
down.

## On the client

- **The walk.** `BroTown.jsx` multiplies the walk speed by `elemMoveMult`:
  0 while held, 0.55 while chilled.
- **The shove.** `gustStep` hands out the gust's push over its 240 ms, eased.
  It goes through the ice slide's own per-axis collision, so a wall, a
  monster, a node or a prop stops it on that axis. A dead player is not
  shoved.
- **Telling the worker where you landed.** The gust joins the dodge roll and
  the bash dash in the move broadcast's "moving" term. Without that, a shove
  while standing still reached the worker only with the 1 s keepalive, and for
  that second a monster's next swing was measured from where the hit found
  you. mp-elemhits caught them 46 px apart.
- **No roll while held.** `game/dodge.js` refuses one, says "Stuck!", and
  spends no stamina.
- **The number's icon.** The element's icon replaces the heart (gameEvents.js).
  The icons load at start with the other popup icons (effectsRenderer
  `POPUP_ICON_SRC`).
- **A burn's tick** (and the fire trail's) is fire on you, not a blow. It
  carries the flame and flame-coloured sparks, and plays a sizzle. It has no
  flinch, no camera kick, no blood and no armour clang.
- **The looks** are drawn in code round whoever was hit (effectsRenderer
  `_updateElemStatusFx`). That includes peers: their record carries the times,
  though their movement is their own client's.
  - chill: a ring of frost and ice spikes at the feet, frost up the shins,
    snow falling;
  - stuck: a puddle of goo, and goo over the boots;
  - burn: a glow underfoot, flames at the feet and up both sides, embers rising;
  - gust: dark-edged streaks blowing past the way you were blown, with a curl,
    and a puff of dust.
- **The HUD chips.** `src/ui/ElemStatusChips.jsx` shows the snowflake, the
  flame or the slime with the seconds left. It runs on its own 150 ms clock,
  because BroTown's buff row redraws only when BroTown does, and a one-second
  chill would have sat there saying "1s" long after it ended.
- **Sounds.** `BT_AUDIO.elemHit` uses only recordings already in the game:
  the snowball's crunch, the pan's sizzle (quieter for each tick), the
  whirlwind's rush and the slime orb's splat. They sit under the hit's own
  clang.

## Deploy order (rule 19)

Every field is additive.

- **Old client, new worker:** the client ignores the fields and takes exactly
  the damage it always did. A burn's tick shows as an ordinary hit, through the
  same `ability` bypass the fire trail uses.
- **New client, old worker:** no field ever arrives, so nothing moves.

No caps flag is needed: the client acts on what the worker says happened, not
on what it guesses the worker supports.

**Kill switch:** `elemhits: false` in liveflags stops every new status at once.
A burn already burning finishes its ticks.

## Not persisted

Nothing here touches the rpg blob (handoff rule 1).

- The burns live in `this._burns`. It is a `Map`, because player ids are
  client-supplied (the `'__proto__'` rule).
- Everything else is underscore fields on `playerState`.

A worker restart forgetting a second of slow is correct, not a bug.

## Tests

- **`server/test/monsterstatus.test.mjs`:**
  - which monsters carry what;
  - what lands and what does not;
  - each status's numbers;
  - the burn's ticks, refresh and no-one-shot rail, and everything that puts it
    out (including the harvester and a killing tick);
  - the gust's direction and length, and the movement bound (granted, spent,
    expired, never without one);
  - the hold's immunity;
  - the telegraphed hits, the fire trail's flame and the kill switch;
  - the wire: a plain hit's payload is exactly what it was.
- **`server/test/mirror-audit.test.mjs`:** the chill's pace, the status names
  and an icon for every element, both sides, plus the icon files in `public/`.
- **v2.3.3013:** `monsterstatus.test.mjs` §10–13:
  - the daze and its window;
  - the shock: alone, one friend near and one far, the nearest four of six,
    never the dead, the dying, the disconnected, another zone, a harvester or
    the safe ground, the rail, and an arc that kills;
  - the soak, measured on the regen tick itself, soaked and dry;
  - the poison: ticks, refresh, rail, put out, and beside a burn.
  §1, §8 and §9 now cover all eight elements, and the plain hit is a meadow
  monster's.
- **`tools/qa/mp/mp-elemhits.mjs`** (a phone viewport, a real worker):
  - each status through the game's own dispatcher: the chill's pace read off
    the walk itself (x0.55), the hold (0 px, no roll, "Stuck!", nothing
    spent), the gust's length and direction, a shove the wire could not mean
    ignored, a burn's tick with the flame and no flinch;
  - every icon on its number, the chips in the HUD, the looks drawn (pictures:
    `look-*.png`);
  - then the real monsters of all four lands on a real worker, the mummy's
    shove with the worker agreeing where you landed.
