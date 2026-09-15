# Death recovery shield, and the burst you never saw (v2.3.2491)

Owner, two reports:

> *"I died and recovered at the same time and lost my bag."*

> *"I never see the [blue slime] death animation play, it swells then
> freezes."*

Two systems, one PR, because both are the same shape of defect: a window
measured against the wrong clock.

---

## 1. Recovering your bag and dying at once

### Why the two events are not a coincidence

A death pile spawns **where you died**, which is inside the pack that killed
you. You respawn, walk back, and step onto it. The pickup credit sets a
**500 ms pickup freeze** on the client — movement locked, facing locked to
the camera, auto-swing suppressed — so the pickup animation reads
(`wsClient.js` `_applyLootCredit`, `groundLoot.js`, and the renderer's
`pose === 'pickup'` timing, which reads `S._lootFreezeUntil` directly).

The pack is still standing there. You die during the freeze the game
imposed on you, and `_spawnDeathPile` drops the bag you just picked up
straight back on the ground, in the same pack, where it can be taken by
anyone or expire. Then you do it again.

The freeze itself is **not** removable: four separate systems read
`S._lootFreezeUntil` (the movement gate in `BroTown.jsx`, the facing
override and the pickup-animation frame index in `entityRenderer.js`, and
the auto-swing suppression in `monsterCombat.js`). The animation's frame
index is derived from the deadline, so deleting the freeze deletes the
pickup animation. The guard therefore goes on the **server**, which is
where the re-drop happens.

### What ships

| Piece | Where | What it does |
|---|---|---|
| `DEATH_REDROP_GRACE_MS = 1000` | `index.js` constants | How long a credit is shielded |
| `_stampLootRecovered(ps, items)` | `index.js` | Records `{at, items}` on the player when a pickup credits items |
| `_deathRecoveryShield(ps)` | `index.js` | Returns the shielded `{key: qty}` map if the stamp is inside the grace |
| `_wipeInventoryOnDeath(ps)` | `index.js` | The death wipe with **both** carve-outs applied in one place |
| `ps._deathShield` | in-memory | The shield **frozen at the moment of death** |

Stamped by both credit paths, because both set the same client freeze:

- the death-pile recovery branch of `_handleLootPickup` (the reported case);
- the kill-pile trophy / shard / gem credit further down the same handler.

Coins are **not** shielded — they are not in the death pile to begin with
(`_spawnDeathPile` sets `coins: 0`).

### The two rules it has to obey

**Kept and dropped must sum to what the player had.** `_spawnDeathPile`
*subtracts* the shielded quantity rather than skipping the key, because the
player may already have been carrying some of that key and only the newly
credited part is shielded. `_wipeInventoryOnDeath` then adds back exactly
that quantity (`Math.max` against `_keepGatherTools`, which already keeps
the full quantity of anything that survives death outright). Any
disagreement here mints a duplicate on the ground — the hazard the v2.3.1688
gathering-tool pass and the v2.3.1701 quest-objective pass both had to
avoid, and the reason `_keptThroughDeath` is a single predicate read by both
sides.

**There are two wipes, not one.** `_handlePlayerDeath` wipes, and
`_tickPlayerRespawn` wipes again five seconds later, unconditionally. An
exemption that covers only the first is cosmetic (v2.3.1616: the duel's "no
item loss" promise was broken by exactly that). So the shield is **decided
once, at death**, and stored on `ps` — the respawn wipe would fail any
freshness test against the clock by the time it runs. It is cleared at
respawn, so one death spends one shield.

### Deliberate limits

- **In-memory only** (handoff rule 11). `_saveRpg` writes from a fixed field
  list, so neither `_lootRecovered` nor `_deathShield` is persisted, and
  neither reaches the client (`_sendPlayerState` is also a fixed list). A
  deploy between the pickup and the death costs one bag's worth of
  shielding — which is exactly what happens today, and not worth a storage
  key.
- **1000 ms**, being the 500 ms freeze plus room for the round trip that set
  it. Long enough to cover the window the game took away from the player,
  short enough that it cannot be aimed at deliberately.
- **No new wire types, no new caps flag, no client change.** An old client
  against a new worker simply stops losing the bag.

### Tests

`server/test/combat-lifecycle.test.mjs`, alongside the gathering-tool and
quest-objective carve-outs it mirrors. It drives the **real**
`_handleLootPickup`, not a hand-set flag, and every "kept" assertion has a
"not in the pile" partner. The control is the point: a recovery older than
the grace is **not** shielded and the bag drops exactly as it always has —
without it, a build that simply stopped dropping anything would pass.

---

## 2. The blue slime's burst

### What was wrong

The burst window ran on **wall clock** from the first frame that *observed*
`alive === false` (`entityRenderer.js` `_updateMonsters`), whether or not
anything was ever drawn in it. It is 400 ms long. That is shorter than
plenty of real frames on a phone — a per-zone texture upload, a GC pause,
the loot pile's own sprite landing — and shorter than waiting for the death
sheet to load, or for the corpse's display to exist at all (the draw is
gated on `display && display._spriteBody`, and a display is created lazily).

So the window could elapse with zero burst frames rendered. What the player
sees then is the last **alive** frame — the swollen slime — sitting there
and then vanishing: "it swells then freezes".

### What ships

The clock is now **driven by rendered frames**:

- it **starts** on the frame the burst first draws, not on the frame the
  death is noticed. Until then the corpse is held for its window plus
  `BURST_START_GRACE_MS` (2000) instead of being culled.
- it then **advances by drawn frames**, each step capped at `BURST_MAX_SKIP`
  (2) frames of the sheet. A long frame stretches the burst instead of
  eating it. At a normal frame rate the cap never binds and the timing is
  unchanged.

Both halves are needed and they fix different failures: starting the clock
later does nothing about a hitch that lands *after* the first frame.

Three details that are load-bearing:

- **The clock is keyed on `m._slimeDeathStart`**, which both respawn paths
  already null (`wsClient.js` monster delta, `monsterCombat.js` local
  respawn). A new life therefore gets a fresh clock without either of them
  learning about the new field — a second field would have had to be added
  to both, and whichever got missed would have surfaced as "the burst only
  plays the first time a slime dies".
- **The drawing branch's window is the authority for every caller.** A blue
  slime is a `MONSTER_VARIANTS` entry with no death sheet of its own, so it
  falls through to the 400 ms slime splat while its *variant* keep-alive
  guard asks about 1000 ms. Without this the 1000 ms guard would hold a
  peak-scaled corpse on the field long after the splat that really played
  had ended.
- **`BURST_MAX_STRETCH_MS` (2000) is an absolute ceiling.** A hold that
  cannot be skipped must still be able to end, including when the clock
  stops advancing for a reason nobody predicted.

### Tests

`tools/qa/mp/mp-slimeburst.mjs` gains two cases, and the hitch in them is
real rather than simulated: a busy-wait blocks the main thread so no `rAF`
callback can run, which is what a long frame is. One before the first drawn
frame and one after, because those are the two different failures. Each is
paired with an assertion that the burst still *finishes*.

Against `main` both fail, and the second fails hardest: the corpse is gone
entirely, `sx` and `visible` both null, with no burst frame ever drawn.

The suite's existing assertion that `_updateMonsters` does not throw during
a slime death (matching `[pixi-render] entityRenderer threw` in the console,
not `pageerror` — `pixiRenderer.js` catches and logs once per session) is
kept and still passes.

---

## Not done here, on purpose

The **client-local death path** (`monsterCombat.js` pushes `S._deathDrops`,
`zoneTransitions.js` re-mints local piles on zone re-entry,
`groundLoot.js` self-credits with no dead guard) is still unmigrated. It
runs only where `S._serverMonsters` is false — town and dungeons — which is
TRAPS §32 territory and a migration rather than a guard. The server shield
above does not cover it, and it should be migrated with the rest of the
client-local combat remnant rather than patched in place.
