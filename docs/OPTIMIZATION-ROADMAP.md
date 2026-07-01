# Optimization Roadmap (2026-07-01 codebase analysis)

A full-repo review (client, server, docs, tooling) with priorities for where
work pays off most. Written for the repo owner in plain language; file/line
references are for whoever implements each item. Line numbers drift as code
changes — treat them as "near here", not exact.

**TL;DR: the client is in good shape; the highest-leverage work is on the
server — first a test safety net, then closing the remaining trust gaps,
then splitting the big server file the same way BroTown.jsx was split.**

---

## What's already healthy (no action needed)

- **Client rendering.** No per-frame texture/text recreation, no filter
  compositing issues, lazy asset loading behind the intro, perf tracker with
  slow-frame logging already built in (`src/game/renderFrame.js`,
  `src/ui/BroTown.jsx` ~2765). The BroTown.jsx decomposition (33k → ~8.3k
  lines) did its job.
- **iOS Safari defenses.** Audio unlock, WebGL context-loss recovery,
  ImageBitmap purge workaround, wake-stall resync — all handled and
  documented with version tags.
- **Server tick loop.** 45Hz with delta encoding, aggregated player-state
  flush, per-entity dirty tracking for v2 clients, no per-tick storage
  writes. Estimated well under the tick budget at current player counts.
- **Server-computed damage already shipped.** `_computeAttackDamage`
  (`server/src/index.js` ~3332) rolls player→monster damage from
  server-tracked stats; the client only sends intent (slot + special). The
  old "client claims 99999 damage" cheat is closed.

## P1 — Server test safety net (this PR)

The game ships ~5 commits/day, but until now only the wire protocol had
tests. The anti-cheat and combat code was correct but unguarded — a
regression would ship silently. This PR adds two suites alongside
`server/test/protocol-v2.test.mjs`:

- `server/test/anticheat.test.mjs` — movement anti-teleport gate, PvP
  geometry/damage/crit clamping, stats_update stat caps (incl. armor
  tierMult and the ignored client maxHp), harvest "perfect" rate limit,
  loot-pickup gates (recipient, range, zone, dead, double-claim, shares).
- `server/test/combat-lifecycle.test.mjs` — server damage roll respects the
  cap and overkill clamp, kill credit + contribution shares, block/dodge/
  grace in `_applyDamage`, melee lifesteal refund + reason codes, death →
  death-pile → inventory wipe → respawn flow, town HP regen + shield
  stamina drain, event-buffer cap behavior.

`npm test` in `server/` now runs all three files, so the existing
`server-ci.yml` gate picks them up with no workflow change.

## P2 — Remaining trust gaps (one small PR each, after P1)

In order of impact:

1. **Equipment ownership on sell** (`_handleSellWeapon`, ~line 1250): the
   server trusts that the weapon at the given stash index is legitimate.
   Validate the stash slot contents against server-known weapon shapes
   (type in the known table, tierMult within forge bounds) before paying
   coins.
2. **Weapon/armor object trust on join and stats_update**: `tierMult` is
   clamped (armor ≤ 8) but the weapon object itself is client-supplied.
   Same validation as (1) applies.
3. **Minigame outcomes** (cook/fish/mine accuracy): partially mitigated —
   "perfect" claims are rate-limited to 10/min (`_ratedHarvestAccuracy`,
   ~line 947) and fishing/wood yield is capped at 1 regardless. Cooking
   (`cook_request`) still assumes the client won the minigame; add a
   plausibility rate limit like the harvest one.
4. **Elemental damage follow-up**: `_computeAttackDamage` deliberately
   omits amulet elemDmg / elementalMastery / combo damage (comment at
   ~line 3325). Elemental builds currently do weapon-only authoritative
   damage. Needs a server-side elemental status model — bigger slice.

## P3 — Client smoke test in CI

`tools/qa/qa-smoke.mjs` (Playwright: boot, join, walk, capture crash log)
exists but never runs automatically. Wire it into `client-ci.yml`:
build → `vite preview` → run the smoke script against it. Playwright +
Chromium install cleanly on GitHub Actions runners. This is the only
automated runtime check the client can have (there is no unit suite), and
it would have caught the v2.3.756 class of shipped ReferenceError at PR
time.

## P4 — Server decomposition (only after P1 is merged)

`server/src/index.js` is 5,434 lines; the GameRoom class alone is ~4,500.
Repeat the proven BroTown strangler-fig playbook: behavior-frozen
extraction into modules (tick loop, monster AI, combat/damage, harvest,
progression/persistence, loot), one slice per PR, full test suite green on
every slice. Do not start this before the P1 tests exist — refactoring an
untested monolith is how the 2026-06-10 production incident class happens
again.

## P5 — Small findings & opportunistic cleanups

- **Event-buffer overflow drops events** (`server/src/index.js` ~4542):
  when more than 500 events queue in one tick, the excess is silently
  discarded rather than deferred to the next tick. At current scale this
  never triggers, but a big AoE moment in a full room would eat
  `monster_hit`/`monster_kill` notifications. Cheap fix: keep the
  remainder in the buffer (`this.eventBuffer = this.eventBuffer.slice(CAP)`).
- **Duplicate `case 'arena_bet'`** in the message switch (second one
  unreachable) — known quirk, remove when touching that area.
- **Dead code**: old pre-Phase-5 `src/networking/wsClient.js`, disabled
  tile-10 dungeon entrance, zeroed collectibles. Quests/collectibles are
  dormant by design — owner decision needed before removing or reviving.
- **Grandfathered globals burn-down**: 27 entries left for BroTown.jsx in
  `eslint.config.js`; each is a latent ReferenceError in a rare path.
- **Client damage-number helper**: the
  `S.dmgNumbers.push({...})` pattern repeats 40+ times across BroTown.jsx;
  a `pushDamageNumber()` helper would shrink the file and prevent drift.
- **Runtime perf: nothing actionable now.** The monster-AI
  nearest-player scan is O(monsters × players) per tick but only in
  player-occupied zones; revisit with a spatial grid only if rooms
  approach the 60-player cap.
