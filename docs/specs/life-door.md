# The life door (v2.3.4820)

`server/src/life.js`; held by `server/test/life-door.test.mjs`. Modelled on the
gold door (`gold.js`, v2.3.4670) and the monster-hit door (`hits.js`).

## What it is

Two doors for a player's body on the worker:

- **Health.** Every write to a player's `hp` is `this._hpSet(ps, value, road)`.
  The road is a row in `HP_ROADS` (39 rows: one for each place that wrote
  `hp` by hand before, in 12 files). Each row says what kind of write it is
  (`hit`, `heal`, `fill`, `unset`, `clamp`, `load`, `keep`, `set`) and where
  its one caller is.
- **Life phase.** One field, `ps.life` (`'alive'` or `'dying'`), changed only
  by `this._lifeTo(ps, phase, road)` (rows in `LIFE_ROADS`: death, spar
  knockout, respawn, a new body, a spar clone made or revived, the Test
  panel's heal). `_lifeTo` writes the old booleans `ps.dying` and `ps.dead`
  from it, together, so the ~150 places that read them keep working.
  `lifeOf(ps)` reads the phase (a body made before the door, or a test's
  hand-made one, reads it from its booleans).
- **The one old road.** `_lifeDeadClaim(ps, v)`: the phone's move claiming
  `dead`, which only happens with the live flag `serverdead: false`
  (movement.js, v2.3.4373). With the flag on, the default, nothing but
  `_lifeTo` writes `dead`: dead is the server's word.

Not here on purpose: monsters' health (`m.hp`); the arithmetic of a hit (still
`_applyDamage` in combat.js, which writes its answer through the `hit` road);
the death's own notes (`respawnAt`, `_deathKeepsBag`, `_respawnOwed`).

## Step 1: nothing a player sees changes

- Each `_hpSet` call passes, text for text, the value its line wrote before
  (the test's `EXPECT_HP` table holds each call to its old line), and `_hpSet`
  writes it as it is.
- `_lifeTo` writes `dying` and `dead` exactly as the old pairs did (both true
  at a death or a spar knockout, both false at a respawn, a revive, a new
  body, the Test panel's heal).
- `ps.life` is memory only: not saved (persistence.js lists its fields), not
  on the wire (the peer copy and player_state list theirs).
- Two lines moved, same effect: the spar clone's `dead: false, dying: false`
  left its `Object.assign` for a `_lifeTo` right after it; the new body's
  `dying = false` at the join is now `_lifeTo(..., 'alive', 'join_new')`,
  which also writes `dead = false` on a body made a moment before with
  `dead: false` (the kept body of v2.3.4455 never reaches that line, and the
  body-take refuses a dying one).
- Proof: `life-door.test` (32 checks) and every server suite green, unchanged.

## What the test fails

- a write to a player's `.hp`, or to `.dying` / `.dead` / `.life`, anywhere in
  `server/src` but `life.js` (a monster's `m.hp` / `mn.hp`, and the notes that
  are not a body, are listed in `NOT_A_PLAYER` with why);
- a literal that sets `dying` or `life`;
- a call naming a road the table has not got, from another file than its row
  says, or a `_lifeTo` to the wrong phase;
- a road with no caller, or with two (one row, one place);
- `_lifeDeadClaim` anywhere but the move, behind `_serverDeadOff()`.

A new way to change a player's health or phase: a row in the table, one call
that names it, and its line in the test's `EXPECT_HP`.

## Step 2a (v2.3.4901): no heal on a dying body

`_hpSet` refuses every row whose `kind` is `heal` while the body is dying
(`lifeOf(ps) === 'dying'`): the hp stays where it is, and the call's answer is
that hp. One check for every heal row, today's and any added later.

- **What it fixes.** Most heals already checked for themselves (food, the regen
  tick, a PvP kill's heals). The melee lifesteal (`_applyMeleeLifesteal`) and
  lifeblood's on-kill heal did not, so a monster killed by a blow already in
  flight as you fell could raise a dying body's hp above 0 before the respawn.
- **What it leaves alone.** A `fill` (a level-up, a rest, the respawn), a
  `load`, a `clamp`, a `set` and a `hit`: none is a heal. A live body takes
  every road exactly as in step 1.
- **The switch.** `lifenoheal: false` in the live flags puts the step-1 write
  back at once.
- **Proof.** `life-door.test` §6: every heal row is refused on a dying body
  (both the door's phase and a body made before the door), nothing else is, a
  live body takes every road, the switch, and the real lifesteal path.

## Step 2 (the rest; each its own PR and lower-case live switch)

- **The death's notes in the one field.** `ps.life = { phase, until,
  keepsBag }`, folding `respawnAt` and `_deathKeepsBag`, saved with the
  record, so a close in the dying seconds comes back as the same death (the
  state-machine sweep's V2; v2.3.4374's `joinstandup` already stands such a
  join up).
- **The phase on the wire** behind a cap, so a phone follows it on every join
  instead of waiting for one message (the sweep's V2, phone side).
