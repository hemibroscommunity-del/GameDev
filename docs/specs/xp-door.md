# One door for every change to experience and levels (v2.3.5289)

`server/src/xp.js`; held by `server/test/xp-door.test.mjs`. Grand plan step
4.3, card R PR 10.

## Why

A character's experience and levels are **tracks**, each an object holding
`{level, xp}`:

| Track | Where | What fills it |
|---|---|---|
| `life` | `ps.lifeSkills[key]` | a harvest, a craft, a cook (Mining, Cooking, Trapping, Woodworking...) |
| `skill` | `ps.prog3.sk[cat]` | a fight's damage, a quest's flat XP (Melee, Bow, Magic) |
| `char` | `ps.level`, `ps.xp` | the character level (the highest skill), the old grid's running XP total |

Before this version they were written by hand in about **thirty places across
ten files**, each reading the count its own way: `(s.xp || 0) + n`,
`sk.xp += n`, `sk.level++`, `ps.level += 1`, `(s.level || 1) + 1`. The same
shape the gold, bag, stash, build-point and quest doors fixed: a rule meant
for every level-up has to be copied into each place, and a copy that misses
it is a bug.

## The door

Four plain functions, each call naming its **road** in `XP_ROADS`:

| Function | What it does |
|---|---|
| `xpGive(t, n, road)` | experience INTO a track, read the road's way |
| `xpLevelUp(t, need, road)` | ONE level up: `need` taken from the XP, the level one more |
| `xpSet(t, field, v, road)` | the track's `level` or `xp` (the road's own field) made `v` |
| `xpMake(holder, key, level, road)` | a whole track made: `{level, xp: 0}` |

**A level-up is the door's** (the card's word): every level gained goes
through `xpLevelUp` (or, for the character level, which is read from the
skills or the build, `xpSet` on its road). The caller's loop says WHEN (its
threshold: `prog3XpRequired`, `_lifeSkillXpThreshold`) and does what a level
brings (the points door's `level_lane`, the messages); the door does the
level itself.

A road the table has not got, a road of another verb, a field the road does
not name, a track that is no object, or a key like `__proto__` throws,
nothing written.

The card named the function `_xpGive`; it is `xpGive`, a plain function, as
the bag's and the build points' doors are: nothing in it needs the room.

## Step 1: nothing a player sees changes

Each road keeps the exact read its place had (`XP_READS`): `plain`
(`sk.xp += n`), `inc` (`sk.level++`: always a number), `orZero`
(`(s.xp || 0) + n`), `orBoth` (`(ps.xp || 0) + (n || 0)`), `orOne`
(`(s.level || 1) + 1`). The suite replays each old line against the door for
every count a track can hold (whole, fractional, below 0, missing, NaN, a
string, Infinity) and they agree to the bit. Making them one read is a later
step, as the gold door's step 2 was.

## What is not here, and why

The suite lists each place with why; anything else that writes `xp` or
`level` fails it.

- **Shapers**: a stored record, or a fresh copy, shaped before it is a live
  player's: the migrations (`migrations.js`), `prog3FromLegacy` (a build made
  from the old grid's), `_sanitizeProg3` (the join's clean into a fresh
  block), `_sanitizeWeaponSkills` (a sanitized copy), and the power index's
  control build (`power.js`, made up in memory, no player's).
- **Whole maps**: a new, empty `lifeSkills` or `prog3.sk` (holds no
  experience); the join's load of the stored life skills, and a first join's
  claimed ones (held by `trapBootstrapGuard` and the gems' adopt); the old
  grid's `weaponSkills` and `defenseSkill`, loaded or a phone's copy
  sanitized (the Wheel's characters read `prog3`).
- **Not a character's experience**: a monster's XP reward (`devtools.js`,
  `dungeon.js`), **a pet's own experience** (`petbook.js`: the pet's, in its
  own record `pets:`, so out of this door, by the card's ask), a party
  roster's copy of a member's level, a hit's record of the opponent's level
  (`pvpextras.js`), a harvest's report (`farm.js`), a meal's XP buff timer
  (`cooking.js`), a lever's reply.

## What the test holds

1. **The door**: every give and level-up road against its old line, to the
   bit; a set writes its own field only; a make writes `{level, xp: 0}`; a
   wrong road, verb, field, track or key throws, nothing written.
2. **One door**: no `xp` or `level` written in `server/src` but `xp.js` and
   the listed places; a stale entry fails; eleven planted shapes of a second
   writer are each found, and a read is no write.
3. **One row, one place**: every call names a road the table has, with its
   verb, from its row's file; every road one caller; none uncalled.
4. **The room**: the stored character's XP at the join, a life skill's XP
   and its level-ups, a combat skill's XP, its level-ups and the points they
   bring.

Break proofs, tried by hand (its header): the old life-skill line put back
fails §2; the life level-up's read made `plain` fails §1; a second
`char_level` caller fails §3.

## Kill switch

None: the door changes no sum (step 1). A later step that changes one adds
its switch.
