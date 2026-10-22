# The Goo Grotto's giant slime splits (v2.3.3558), and the Foundry Dome's (v2.3.3562)

The owner, 2026-10-22:

> Also for the dungeon boss I think a giant slime that explodes and spawns
> small (normal size slimes) like 8-10 maybe but shrinks in size afterwards
> would be a good boss. Maybe it does 3 rounds of that before it finally just
> becomes a normal slime then after you kill that you defeat the dungeon

## What a player meets

The Goo Grotto (the starter dungeon, levels 1-5) still has three waves of the
Verdant Wilds' blue slimes, then its boss: the giant Blue Slime of v2.3.3556,
drawn twice your height, with four wave slimes' worth of health.

1. Its HP bar wears three thin dark marks, at 75%, 50% and 25%: where it will
   burst.
2. When its health reaches a mark it **swells** for 1.6 s with "BURSTING!" over
   it, the same warning a blue slime gives before it bursts. It can't be hurt
   and doesn't move or attack while it swells.
3. Then it **goes off** as a blue slime does: the shockwave, the blast's sound,
   and the blast itself, which hurts anyone inside it (a blue slime's 60, scaled
   to your level, never more than half your bar).
4. **10 slimes fly out of it** in an arc (then 9, then 8): the Grotto's own blue
   slimes, at the dungeon's level, paying like any.
5. It **shrinks a step**: x4.59 a slime, then x2.76, x1.66, and after the third
   split a normal slime's size, still wearing its "Boss Blue Slime" plate. Its
   last quarter of health is exactly one wave slime's health.
6. **Killing that last form is the win.** It dies as any blue slime does (it
   swells and goes off). Every slime it threw out that still stands pops with
   it, unpaid, and the run clears.

No hit can skip a split: a hit that would take it past its next mark stops at
the mark, however big, and at the mark nothing hurts it until it has split.

## The numbers (`server/src/slimeboss.js` `SLIME_BOSS`)

| | Value | Why |
|---|---|---|
| Which dungeons | `LANDS: { verdant: 1, thunder: 1 }`: the Goo Grotto and, since v2.3.3562, the Foundry Dome | their bosses are giant slimes; a land here is one line |
| Splits | 3, at 75%, 50%, 25% of its health (`splitShare(i, n) = (n - i) / (n + 1)`) | "3 rounds"; every quarter, so the last quarter is one wave slime |
| Slimes out | 10, 9, 8 (27 in all) | "like 8-10"; fewer as it shrinks |
| Swell | 1,600 ms (`SLIME_BURST.SWELL_MS`), drawn 1.3x | the blue slime's own warning; it is already huge |
| Blast | a blue slime's: `SLIME_BURST.DMG` 60 x the hit scale, the hit door's `burst` row (cap: half your bar) | "explodes", as every blue slime does; every splitting boss's since v2.3.3562, whatever its kind |
| Blast reach | 180, 115, 110 px | its swollen body: 24 px x its size x 1.3, x 1.3 (never under a slime's own 110) |
| Where they land | a ring 125-230 px round it, inside the arena | out past its body (24 x 4.59 = 110) |
| Landing | still for 600 ms, no swing for 1,100 ms | so they land before they fight |
| Its size | x k0^((bn - bs) / bn), k0 = 4.59 for a slime | a step smaller each split, x1 after the third |

A run at level 3 held 2,310 health (three waves of six at 105, the boss 420).
It now holds 5,145: the 27 slimes add 2,835. Kill XP is the damage dealt, so a
run takes about twice as long and pays about twice the XP and the slimes' gold
and drops.

## Decided here, and why

- **The Goo Grotto only.** The owner's giant slime is its boss (the "Boss Blue
  Slime" of "Make boss slime huge"). The Foundry Dome's boss is a slime too;
  adding a land to `LANDS` gives it the same fight. (Done in v2.3.3562, below.)
- **One health bar, split at every quarter.** The boss keeps v2.3.3556's
  health, and the last quarter is a wave slime's health, so "it finally just
  becomes a normal slime" is true of its health as well as its size. One bar
  with marks says the whole fight at a glance; a fresh bar per form would hide
  how far along you are.
- **The blast is a blue slime's.** Every blue slime in the game goes off when
  it pops, with the same warning; the giant one does too, sized to its body.
- **Its slimes are the Grotto's own.** "normal size slimes": the wave monster's
  maker, with their health, hits, shards, quest credit and their own burst.
  It summons nothing else, as they are its adds.
- **The leftovers pop, unpaid.** "after you kill that you defeat the dungeon":
  the run waits for every monster, so the slimes still standing pop as its last
  form dies. Nobody killed them, so nobody is paid. One already swelling (a
  player killed it) goes off and pays as any, and the clear waits for it.
- **It can't be hurt while it swells** because it sits at its mark, and the
  damageable gate refuses a boss at its mark. One mechanism, not a timer beside
  it.

## Server

- `server/src/slimeboss.js` (a mixin, `slimeBossMethods`):
  - `_slimeBossArm(inst, m)`: called by `dungeon.js` `_dungeonSpawnBoss` once its
    health is set; a Goo Grotto boss gets `_split = { n: 0, of: 3, until: 0 }`
    and `_splitFloor` (its next mark). Its kit loses `summon`.
  - `_slimeBossTick(inst, players, now)`: each dungeon tick before its ability
    script. At the mark it swells (`split` / `telegraph`); after the swell,
    `_slimeBossSplit`: the blast (only a kind that bursts on death,
    `_burstsOnDeath`), the slimes (`_slimeBossSpawn`), the next mark, the
    zone's re-push, then `split` / `execute`. True while it swells, so it
    casts nothing.
  - `_slimeBossCleanup(inst)`: once its last form is dead, the slimes it threw
    out that still stand pop (`split` / `pop`); one mid-burst is left.
- `combat.js`: `_monsterHpFloor(m)` (its next mark, else 0) beside
  `_monsterDamageable`, which refuses a monster at its mark. The five places a
  monster loses health clamp to the floor: `_handleMonsterDamage` and its
  collision (combat.js), `_abilityStrikeMonster` (abilities.js),
  `_applyMonsterDot` (index.js), the thorns reflect (hits.js).
- `dungeon.js` `_tickDungeons`: the split tick, then the ability script only
  when it is not swelling, then the cleanup, all before "every monster dead".
- Kill switch: `slimeboss: false` in the live flags: a boss made after it is
  the one big boss of v2.3.3556.
- QA: `POST /api/admin/dev/hurt {playerId, boss: true | id, dmg}` hurts a live
  monster of the player's zone through `_applyMonsterDot`, so the floor and the
  gate hold (devtools.js `_devHurt`).

## The wire

| Where | Field / event | Meaning |
|---|---|---|
| a splitting boss's full mapping: `dungeon.js` `_dungeonPushZoneState`, `spawnscale.js` `monsterSnapWire`, `join.js` `state_sync` | `bs`, `bn` beside `boss: 1` | splits done, splits in all (`bossSplitWire`); on that boss alone, every other monster's wire byte for byte as it was |
| `dungeon_boss_ability` (already privileged) | `ability: 'split', phase: 'telegraph'`, `ms`, `scale`, `stage`, `of` | it swells |
| | `ability: 'split', phase: 'execute'`, `stage`, `of`, `radius`, `hit`, `count`, `ids` | it went off; sent after the re-push that brings the slimes and its new `bs` |
| | `ability: 'split', phase: 'pop'`, `count`, `ids` | the slimes that popped with its last form; sent before the tick that says they are dead |

No new message type and no caps flag. An **older phone** with a new worker draws
nothing for `split` (its handler names the abilities it knows and drops the rest):
the boss stays drawn huge to the end and the slimes simply appear. A **new phone**
with an older worker gets no `bn`, so the boss is drawn whole as before.

## Phone

- `src/data/gameSystems.js` `bossSizeK(m)`: x k0^((bn - bs) / bn) for a splitting
  boss. Everything that measures a boss's body goes through it, so the drawing,
  the swing, the shots, the taps and the rings shrink with it.
  `bossSplitShare(i, n)` is the worker's rule for the marks.
- `src/networking/gameEvents.js` `dungeon_boss_ability` / `split`:
  - telegraph: the boss swells by `_burstUntil`, the same field a dying blue
    slime swells by, which also makes it intangible on the phone
    (`isIntangible`), as on the worker; "BURSTING!" and the swell's sound;
  - execute: the shockwave at `radius`, a shake (10 inside it, 4 outside), the
    burst's sound, and each slime it named flown out of its middle (`_popFrom`);
  - pop: those slimes die quietly (`_quietDeath`), and one splat plays for all.
    Twenty at once on a bus with no limiter is a roar.
- `src/game/monsterCombat.js`: a slime with `_popFrom` is drawn from the boss's
  middle to where it is, in an arc (46 px), over 420 ms.
- `src/rendering/systems/entityRenderer.js`: the marks on its bar, a Graphics
  of their own redrawn only when they change (TRAPS §218); the probe
  `window.__btBossMarks(id)`; a monster with `_quietDeath` splats without its
  own sound.
- **A re-push is not a new arrival** (`src/game/monsterCarry.js`
  `carryMonsterState`, used by wsClient.js; found building this; TRAPS §245).
  A dungeon re-sends its whole
  monster list, dead ones too, whenever it adds monsters: each wave, each
  summon, and now each split. The phone built every monster afresh from it, so
  the renderer met each one as just arrived. Each one standing played its
  arrival again, and each one already dead played its death again: the splat
  and its sound, a dozen at once by the third wave. A monster the phone already
  holds, in the same life or the same death, now keeps the phone's own state of
  it: those clocks, where it is drawn, that you are fighting it (its bar stays
  up), the arrows in it, a swell or a flight under way. The join's list
  (`state_sync`) does the same for a rejoin. A boss that has split since (its
  `bs` moved) lets its swell go: the split's execute ends it, and a phone that
  missed that (a rejoin over the split) would otherwise hold it swollen and
  untouchable, as a swelling monster is to the phone (`isIntangible`).
- `src/data/soundStudio.js`: the swell's and the burst's labels name the boss.

## Its shine, whole (the owner's second look)

> There's actually a transparent hole on the slime i don't think that came with
> the original art. You can change it to the green slime if the green doesn't
> have the hole on the top left side

They were right, and the green slime had it too: the blue one is the green
one's picture recoloured (`src/rendering/monsterRecolor.js` keeps every
pixel's see-through amount), so swapping colours could not help.

- **Where it came from.** The slime was cut off the near-white background of
  its videos (`assets/monster animations/slime-*.mp4`) by colour. Its shine, a
  solid pale mint oval on its top-left (about (221, 235, 202) in the video), was
  near enough to white to go with the background: its core became the palette's
  background entry (index 0, (254, 254, 254), see-through) and its rim partly
  see-through. In every frame of idle, shoot and hit: 374, 100 and 119 pixels.
  A few pixels at a slime's own size, unseen; at x4.6 you saw the floor
  through it. TRAPS §246.
- **The mend** (`tools/mend_slime_shine.py`, run once; `--check` asks the
  question without writing). In each 128 px frame of the three living sheets,
  a pixel that is not fully opaque and that the frame's edge cannot reach
  through others like it (8-connected) is inside the slime; every one of those
  is in the shine (the outline's soft edge and the gaps round the drips all
  reach the edge). One with some opacity keeps its own colour, made solid; one
  with none takes its brightest solid neighbour's colour, from the rim inward.
  The sheets stay palette PNGs (the few solid colours needed are added), and
  nothing outside the slime changed: its outline, its anchor rows and its hit
  box are where they were. A second run changes nothing. The death burst is
  left as it is: it is cut by a strict key, and its gaps are a splash's.
- **What else changed with it.** The blue retint's reference brightness on the
  idle sheet moves from 132.55 to 133.06 (the shine's pixels count now), so the
  blue is 0.4% darker, too little to see. The pet sheet is made from the idle sheet
  (`tools/make_pet_sheet.py`), so it was made again: only the two slime pets'
  rows changed, and the game asks for it at a new address (`?v=2.3.3558`).
- Before and after on a phone: `docs/shots/slime-shine.webp`.

## The Foundry Dome too (v2.3.3562)

The owner's "Yes" to the recommendation that the Foundry Dome gets the
splitting slime boss (the dungeons' status of 2026-10-22).

- **Its boss splits the same.** `SLIME_BOSS.LANDS: { verdant: 1, thunder: 1 }`.
  The Foundry Dome (the Electric Foundry's dungeon, levels 26-30) has slime
  waves too: the Electric Foundry's plain slime, drawn as a "Storm Slime" past
  level 20 (`src/data/wheelStageLooks.js`). Its boss is now a giant Storm Slime
  with the Grotto's whole fight: the three marks, the swell, the blast's reach,
  10, 9 then 8 of its own slimes at the dungeon's level, a step smaller each
  time.
- **Every split goes off.** v2.3.3558 dealt the blast only for a kind that
  bursts on death (`_burstsOnDeath`, the blue slime alone). A storm slime does
  not, so the Foundry's giant would have swelled, drawn its shockwave and hurt
  nobody. The blast is now part of every split (`_slimeBossSplit`). Through the
  hit door's `burst` row it carries its land's status: a storm slime's shock
  arcs to the other players near the one it hits.
- **Its last form just dies.** A storm slime never bursts, so killing its last
  form ends it at once. The slimes still standing pop and the run clears, as in
  the Grotto.
- **Nothing changed on the phone.** The swell, the marks, the shrink and the
  flights read only the wire's `bs` and `bn` and the `split` events, whatever
  the slime. The Sound studio's swell and burst labels name both bosses.
- **Tested:** `slime-boss` §10 (22 checks) covers:
  - the boss arms with three splits, though its kind does not burst on death;
  - each split's blast hits a player inside it and not one outside;
  - 10, 9 then 8 of the Foundry's own slimes come out at the dungeon's level;
  - its last form dies at once, the 27 pop and the run clears;
  - the Buried City's boss does not split.

  Taking out either change fails it: the first check without the land, the
  first blast without the unconditional split. `mp-foundryboss` runs
  mp-slimeboss's whole phone check at the Foundry Dome, the walker at level 28.

## Tested

- `server/test/slime-boss.test.mjs` (60 checks): armed in the Grotto only, the
  marks, no summon, the owner's numbers; the wire on the re-push, the snapshot
  and the join, nothing on any other monster, the phone's marks rule and sizes;
  a hit of ten times its health stops at 75%, at the mark it can't be hurt,
  every place a monster loses health reads the floor and there are no others;
  the swell (unhittable, still, casting nothing); each split's blast (a player
  inside hit, one outside not), its 10, 9, 8 of the Grotto's own slimes inside
  the arena on their ring, held while they land, its next mark, the re-push;
  the end (its last form bursts and dies, the rest pop unpaid and the phones are
  told, one mid-burst is left, the run waits for it, then clears); the Great
  Cave's boss unchanged; the kill switch; and the phone's carry
  (`monsterCarry.js`): same life and same death kept, a monster that came back
  or died met afresh, a boss's swell kept through a re-push of its stage and
  let go once it has split, a blue slime's kept; and the shine (§9): no
  see-through pixel inside a living slime in any frame of idle, shoot or hit
  (on the sheets before the mend it fails with 374, 100 and 119).
- Twenty mutations, each failing the suite: the floor left out of a damage
  over time, the gate open at the mark, no floor, always 10 slimes, a slime
  mid-burst popped, not armed, no `bs`/`bn` on the re-push, nor on the
  snapshot, no blast, popping while it lives, leftovers never dying, no
  cleanup, the switch ignored, slimes not held, the phone never shrinking it,
  the phone's marks off, and the phone's carry: a swell kept past a split,
  state carried across a death, nothing carried, every swell dropped. (A
  twenty-first, a timer of its own for the swell, was redundant and is gone.)
- `wheeldungeon.test.mjs` reads the join's wire with the split fields beside
  `boss: 1`.
- `tools/qa/mp/mp-slimeboss.mjs`, a phone in the world at the Goo Grotto: the
  boss said `bn 3` and drawn x4.59; hurt past its first mark it stops at 75%,
  its bar's three marks showing; each split swells ("BURSTING!") then goes
  off, 10, 9 and 8 slimes, x2.76, x1.66, x1; watched every frame, neither it
  nor the slimes already standing arrive again in a split's re-push while
  each new slime does (the watch's own control), and two of its slimes killed
  before don't die again in the next; a slime's flight run slowly; its last
  form killed, the rest popping quietly and the clear card (16 checks).
  Pictures: `tools/qa/mp/out/slimeboss-*.png`, and the strip in
  `docs/shots/slime-boss.webp`.
