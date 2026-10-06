# Seven fixes from the owner's notes of 2026-10-05 (v2.3.3039, v2.3.3041–v2.3.3046)

The owner's list of notes, after a usage refill, held a run of small, separate
fixes. Each is its own version tag. Bigger items from the same list (resource
levels and labels, the quest flashes and markers, the points screen, balance,
No man's land) have their own specs.

## The loading screen says BroTown (v2.3.3039)

> Instead of "the Wheel" on the loading screen just call it "BroTown"

`ZONES.wheel.name` is the name players see, and it is now **BroTown**. Every
loading veil reads it ("Entering BroTown": the way in, a death's trip back,
the way out of a dungeon or the farm), and so do the world map's title, a
friend's whereabouts and the party HUD. `wheel` stays the zone's id, and "the
Wheel" its name in code and docs. `worldTrial.js` renames the zone the same
way for the `?trial=` path. `mp-wheelhome` asserts the veils say BroTown.

## A life skill's level-up says the level it really is (v2.3.3041)

> The level up notification shows the wrong skill level (shows level 1 was you
> level up from 1 to 2)

A new character's life skills started at **level 0** on the client. The
worker's `_addLifeSkillXp` has always read 0 as 1 (`level || 1`): the first
level cost 500 XP there and landed on 2. The client's `awardSkillXp` charged
the level-0 price, 463, and landed on 1, and the banner fires from the client's
prediction. So it said "Level 1" for a level the worker had made 2. The echo
could then roll the bar back and fire a second "Level 1".

- `awardSkillXp` (src/data/gameSystems.js) uses the worker's arithmetic,
  `level || 1`.
- New skills start at 1 (`createDefaultLifeSkills`), and `migrateLifeSkills`
  heals a stored 0 to 1 (XP kept).
- The worker heals a 0 to 1 at both join boundaries (`healLifeSkillLevels`,
  migrations.js): a record on file and a first join's payload.
- The banner's "from" is at least 1 (`levelCelebration.js`), and the Skills
  panel reads at least 1.

Tests: `mirror-audit` "life-skill levels" (client and worker agree from every
start level, 0 included), `lifeskills-economy` §7 (a 0 heals on both joins,
then levels 1 to 2).

## A death you feel and hear (v2.3.3042)

> Death sound effect and screen shake didn't take effect when character died

The player on the worker dies through one path, `player_died` (wsClient.js).
Its three cues were all too weak to notice:

| Cue | Before | Now |
|---|---|---|
| Sound | `deathBoom()`, made of `beep()`s, which play nothing since v2.3.1103 | `BT_AUDIO.playerDeath()` from recordings already in the game: the monster hit slowed into a heavy thud, the "lost" sting a beat after, the bones' rattle when the body crumbles (1.08 s) |
| Shake | 10 px of jitter, gone in ~150 ms | 18, plus a camera kick **away from the monster that killed you** (the cause names it) |
| Flash | never set on this path | the 500 ms dark flash (`S._deathFlash`) the old local paths had |

The killing blow was also thrown away: the worker sends `player_died` and the
hp-0 `player_state` at once and the blow in the next tick, which the client
dropped as a hit on a corpse. For 1.2 s after the death it still shows its
number and plays its sound (gameEvents.js `monster_attack`), and nothing else.
`deathBoom` is untouched: monster kills still use it.

## The magic special is 50% bigger (v2.3.3043)

> Increase the special magic projectile sprite size by 50%

`STAFF_BIG_BOLT_SCALE` 1.7 → **2.55**. It is one number on purpose: the bolt
is drawn AND hit-tested at it (projectiles.js `PROJ_BODY.magicBig`), so the
bolt you see is still the bolt that connects. Both are client-side only (the
worker never simulates a projectile; the burst's 90 px reach is its own). Its
halo (`BIG_HALO` 2.625), hot core and trail spread grew with it, and its
additive glow is softer again, so it does not wash out to white. `mp-staffcast`
pins 2.55.

## A slime's hit shows the leaf (v2.3.3044)

> Slime attack for combat messages should be floral icon. I think we're using
> leaf for that. Right now it's just the slime remnant sprite which is wrong.

v2.3.2996 read the owner's "slime for floral damage" as "draw the slime" and
put the slime's loot splat (`slime-remnants.webp`) on the number. A floral hit
now carries the floral element's own icon, `elem-flora` (the leaf), on the
number and on the "Stuck" chip (`elemHits.js` `ELEM_LOOK.flora`,
`ELEM_ICON_SRC`, `ElemStatusChips.jsx`). `mp-elemhits` counts the leaf.

## The daily chest's sounds are on its frames (v2.3.3045)

> Daily chest not synced with noise

The chest window had no sound of its own. The only one was the coin chime,
played by the loot-credit path the moment the worker answered, while the chest
was still shaking shut: 0.25–0.55 s before the lid moved and about 1 s before
the coins rose. A fish, gem or armour prize made no sound at all. Now
`chest_opened` credits the coins `quiet`, and ChestReveal plays the sounds on
its own frames:

- frame 4, the lid lifting in its burst of light: a wooden knock and a shimmer.
  It plays on the first frame drawn at or past 4, once. A busy phone can run
  several frame timers before it draws, so frame 4 itself may never be drawn;
  the first test run caught the knock going missing that way.
- the prize rising: the coins' chime for coins, the win sting for anything else.

All are recordings already decoded at the loading gate. `mp-polish` checks the
order and that no coin chime plays early.

## A crash's reload never lands a player in the creator (v2.3.3046)

> Game crashed and brought me to trait picker screen. killing mummies and
> destroyed prop.

There is no error boundary that leads to the creator. A page iPhone Safari
kills for memory is **reloaded from the address it had**, and the door's
"Create new character" puts `?create=1` there (v2.3.1861). Only backing out of
the creator ever took it away, and the boot check obeys it before anything
else. So a player who had made a character in that tab was sent, by the crash's
reload, to the creator.

- **Entering the world** removes `create`, `login` and `noresume` from the
  address (BroTown.jsx `joinTown`, `history.replaceState`).
- **At boot**, a `?create=1` on a key already in this device's roster (written
  the first time it entered the world) is stale: it is removed and the
  ordinary road is taken (`__btBootRoute` 'create-stale'). A genuinely new key
  still gets the creator.

The crash itself was most likely an iOS memory kill. A Wind Dunes fight holds
the mummies' and their skeletons' art. One real bug could add to it and
escalate:

- **The monster hit-chip cache** (`hitMaterialFx.js` `chipsFor`) destroyed its
  oldest entry past 24 picture sheets, oldest by first use, without checking
  whether a 5.4 s burst was still drawing those textures. A destroyed texture
  under a live sprite throws every frame ("reading 'alphaMode'"), and 90 in a
  row rebuild the renderer, uploading every texture again: on a phone at the
  edge, a kill. It is least-recently-used now, and never destroys an entry used
  within `BURST_MS` + 1 s, the guard the prop-chip cache beside it always had.
- **Scratch canvases** are released at once (width and height 0) instead of
  waiting for the collector: the shatter's full-size and quarter-size copies
  (`wheelShatter.js` `freeCanvas`), the hit chips' frames and windows, and the
  arrow-pin frame reader.
- **The arrow-pin frame cache** (`arrowPin.js`) holds at most 6 MB as well as
  160 frames. A mummy's and its skeleton's big frames, 160 deep, were about
  20 MB.

`mp-createflag` tests the address. The crash log (`[killed]` entries,
`/api/feedback/crashes`) is where the next one will show what the page held.
