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

## Step 2b (v2.3.4902): the death's own notes, saved

(The "death's notes" bullet in the Step 2 list above. It is done as below: the
notes are saved in their own key, and not yet folded into `ps.life`.)

The dying seconds lived in memory only. v2.3.4374 (`joinstandup`,
`docs/specs/join-stands-up.md`) made a join that finds a record at 0 health
stand the player up at once, as the owner asked ("comes back standing in
BroTown at full health, and nothing is taken twice"). That stays for a join
AFTER the five seconds. A join INSIDE them (a signal blip, a quick reopen)
now comes back as **the same death**:

- the death puts a small note, `life:<pid>` = `{v, phase, until, keepsBag,
  cause}` (`LIFE_NOTE`, `lifeNoteOf`), in the same synchronous run as its own
  record save, so a restart finds both or neither;
- a join whose stored record is at 0 health reads it (`_lifeNoteRead`; an
  ordinary join reads nothing). If its `until` has not passed, the body goes
  back to dying through the door (`_lifeTo(..., 'join_dying')`) for exactly
  the seconds left (never more than 5), the phone gets its `player_died` card
  again after its `player_state` (with `keptBag` when the death kept the bag),
  and the ordinary respawn stands it up in town;
- the respawn after a rejoin never wipes the bag again. The death already
  wiped it, or kept it, and saved that; its pickup shield was memory only and
  is gone, so a second wipe could take what the first spared.

**Why its own key.** Handoff rule 1: never a new field in the rpg blob. The
key is in rule 2's registry.

**What it costs.** One row more per death (cost-guard §13's line is 4 rows a
death; a death is now record + note + pile). The respawn writes nothing more:
the note is left, its `until` passed, and the next death writes over it. The
join reads the note only for a record at 0 health.

**The switch.** `lifesave: false`: no note is written and none is read, and
the join stands up as v2.3.4374 did.

**Not done (on purpose).** The in-memory notes stay where they were
(`ps.respawnAt`, `ps._deathKeepsBag`). Folding them into one `ps.life` object
touches about ten readers, so it is its own change, and nothing a player sees
needs it. The phone's own four "stand back up" routines are the sweep's
U1-2, on the phone side.

**Proof.** `life-note.test` (31 checks against a real room and its counted
storage):

- the note and the record are one write, within the row line;
- a rejoin at 2.5 s is the same death: the card says 2,500 ms left, it is
  still dying at 4.9 s, then the respawn comes, with no second death, no
  second wipe and no pile;
- a rejoin after 6 s is the stand-up;
- no read on an ordinary join, and no write at the respawn;
- the switch;
- the pure note's edge cases;
- a restart deletes the note.
