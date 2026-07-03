# ARCHITECTURE HANDOFF — read this before touching the server

Written 2026-07-02 at the end of the heavy-systems build-out (v2.3.1116–
v2.3.1123, PRs #178–#185). This is the charter for whoever continues the
work — human or model. It exists because the conventions below are
load-bearing: each one closes a specific incident class, and code that
ignores one usually looks correct while destroying player value later.

Companion docs: `docs/specs/*.md` (one per shipped system, each with its
wire surface and attach points), `docs/WIRE-PROTOCOL.md` (message
reference), `docs/BALANCE-PLAN.md` (combat/economy numbers + phase plan),
`CLAUDE.md` (repo orientation). The GDD (`gdd.md`/`README.md`) is design
intent ONLY — never a description of what's built; code is truth.

---

## Part 1 — The hard rules (violate none of these)

### Rule zero — this is a 100% server-based multiplayer game

**There is no single-player mode and never will be (owner directive,
2026-07-02).** Every piece of client-local game logic you find —
localStorage-first flows, client-side spawning, self-credited rewards,
comments about "SP players" in the bootstrap caps — is a LEGACY REMNANT
of the prototype era, not a mode to preserve. The migration direction is
always client→server. The only legitimate reasons for client-side game
logic are: (a) prediction for responsiveness (server echo overwrites),
and (b) legacy-worker fallbacks behind `caps`/`settled` flags for
deploy-order safety (rule 19) — and those fallbacks exist to be deleted
once every worker in production advertises the capability, not to be
extended.

### Storage

1. **Never add a field to the rpg blob.** `_saveRpg` (server/src/index.js)
   rewrites `rpg:<playerId>` from a fixed field list; any foreign field is
   silently dropped on the next save. New persistent state gets its own
   storage key.
2. **Storage-key registry** (all GameRoom DO storage; prefix + `:` + id,
   enumerable via `storage.list({prefix})`):

   | Prefix | Value | Owner (spec) |
   |---|---|---|
   | `rpg:<playerId>` | the player blob (fixed field list) | core |
   | `auth:<playerId>` | `{pfHash, createdAt}` SHA-256 of `btv1\|phrase` | identity.md |
   | `inbox:<playerId>` | pending credit entries (offline mail) | inbox-escrow.md |
   | `oplog:<opId>` | timestamp; idempotency journal, pruned >48h | inbox-escrow.md |
   | `mkt_order:<orderId>` | resting order w/ escrowed item | marketplace.md |
   | `mkt_hist:<indexKey>` | rolling last-50 executed prices | marketplace.md |
   | `duelEscrow:<duelId>` | `{a, b, wager, startedAt}` | duels.md |

   Naming convention going forward: **lowercase_snake prefixes**
   (`duelEscrow:` predates the rule; don't imitate it). Register every
   new prefix in this table.
3. **`_saveRpg` truncates `weaponStash` at cap.** Anything delivering
   weapons must check capacity or partial-drain (`_applyCreditToPs`
   returns false for exactly this case) — pushing past cap silently
   destroys the weapon.

### Settlement and idempotency

4. **All payouts go through `_creditPlayer`.** It applies to live
   playerState when online (+ `inbox_delivered`) and parks in
   `inbox:<id>` when offline — every producer gets offline-safe payment
   for free. Never hand-roll an inbox write or credit coins directly in
   a settlement path.
5. **Every settlement op carries a deterministic opId** (`settle:<id>:leg`,
   `refund:<orderId>`, `duelpot:<id>`, `clanwar:<warId>:<pid>`), stamped
   in `oplog:`. A crash-retry finds the stamp and converges instead of
   double-paying; duplicate debits return `{ok:true, dup:true}`.
6. **Sweeps never refund over a stamped payout.** Any orphan-escrow sweep
   must check the payout's oplog stamp first (`_duelEscrowSweep` is the
   reference implementation) — a crash between pot-credit and
   record-delete must not become a double-pay.
7. **Escrow-at-placement vs validate-at-commit** — choose by whether value
   must survive a deploy:
   - Money **at rest** (market listings, wagers, entry fees): escrow at
     placement, record in storage, sweep-refund orphans.
   - **Instantaneous** two-party swaps (trades) or single-event mutations
     (gambling): validate-at-commit inside one input-gated event; nothing
     escrowed, a deploy loses nothing.
8. **Single-mutation over two-phase where possible.** If an operation can
   settle in one event on live state (gamble: roll, then one coins
   delta), do that — a debit…credit sequence creates a crash window that
   then needs a sweep.

### Durable Object concurrency (why the above is safe)

9. **One event at a time; interleaving only at awaits. Storage awaits
   keep the input gate CLOSED; any other await (cross-DO fetch, timers)
   opens it.** Therefore: **no cross-DO await between a validation and
   the commit that depends on it.** This is why the order book was folded
   INTO the GameRoom rather than living in its own DO.
10. **Fire-and-forget `_saveRpg` is correct** — output gates hold
    outbound messages until prior writes durably commit, so clients can
    never observe state that later rolls back.
11. **A worker deploy restarts the DO and wipes ALL memory** (sessions,
    tick loop, in-memory maps). In-memory state is acceptable only when a
    wipe loses nothing of value (pending trade offers, duel challenges,
    brackets); anything holding escrowed value must be in storage.
12. **There are NO alarms in this codebase, and the tick loop stops when
    the room empties.** Anything time-based (expiries, war endings,
    weekly draws) must resolve lazily: check on tick AND on next activity
    (join, relevant handler). Never assume a timer fires in an empty room.

### Trust boundary

13. **Every server-emitted event type goes in `PRIVILEGED_EVENTS`**
    (server/src/index.js ~line 122). The default branch rebroadcasts
    unknown types; an unlisted server event is a forgery surface.
    (`player_respawned` is deliberately omitted — documented there.)
14. **Handshake halves are validated per-sender-session.** An accept is
    honored only against a live challenge/offer recorded from the OTHER
    side's own connection (trades, duels, threat, clan invites). The
    challenge's numbers are authoritative — an edited accept can't
    inflate the opponent's stake.
15. **An accept with no matching live offer is DROPPED, not relayed** —
    relaying it triggers legacy client-side minting on the other side.
    Intercepts return `null` to mean "don't relay."
16. **Never trust client-supplied value blobs.** The marketplace ignores
    the request's `item` and takes from the server's own stash by index;
    imitate this shape (server's copy by reference, never the wire blob).
17. **PvP fails closed**: `_pvpAllowed` requires `ZONES[zone].lawless`
    (server/src/data.js) or a live consent pair. Town and unknown zones
    deny by default.
18. **`_questKills` is server-sole-writer** (client sites gated on
    `caps.questTrack`), which is what makes its wholesale echo safe.
    **Do NOT make the server write `_questFlags` mid-session** — the
    client keeps live counters there (crits, blocks, zones visited) that
    the server never sees after the join snapshot; a server write
    re-echoes the whole map and resets them. Verify flag-based quests
    only after their signals move into a server-owned structure.

### Deploy-order safety (both sides shippable in either order)

19. **WS flows advertise capabilities in `state_sync.caps`**
    (`{trade, questTrack, ...}`); clients store `S._serverCaps` and run
    their legacy self-credit paths only when the server hasn't claimed
    the job. **HTTP flows use a per-response `settled: true`.** Relayed
    accepts carry `settled` on the message.
20. **The authoritative `player_state` echo is the tiebreaker**: old
    client + new worker double-applies locally, but echoed
    coins/inventory overwrite it. Preserve this property on both sides —
    it is what makes every deploy order safe.
21. **Protocol v1/v2 dual support is untouchable** (see CLAUDE.md wire
    section). Phraseless joins on unregistered ids stay allowed — that IS
    the legacy-client path.

### Code and test shape

22. **New GameRoom subsystems are mixin modules** (`market.js`,
    `trade.js`, `duel.js`): export a `*Methods` object, mix in via
    `Object.assign(GameRoom.prototype, …)` at the bottom of index.js,
    hook via named integration points (default-branch intercepts, death
    hooks like `_duelOnDeath`, join hooks, `_tick*` calls). Keeps a
    future room re-shard mechanical.
23. **Do not rename or repurpose behavior-frozen files.**
    `server/src/arena.js` / `marketplace.js` keep exporting their DO
    classes for the wrangler bindings even though they're retired from
    routing. New logic gets a new module.
24. **Every PR ships: a test suite + a spec doc.** Test harness shape
    (see any `server/test/*.test.mjs`): stateful Map-backed storage mock
    with prefix `list`, `fakeWs` collecting sent JSON, `check()`
    counters, a real `webSocketMessage` join helper, exit 1 on failure,
    registered in `server/package.json` `npm test`. Spec docs go in
    `docs/specs/<system>.md` with the wire surface tabled.
25. **Comment discipline**: every change carries a `v2.3.NNNN:` tag
    explaining WHY, often with incident history; constants live in
    ALL-CAPS config objects (`MARKET`, `DUEL`). This is the project's
    institutional memory — keep it.
26. **The build sandbox may have no node_modules and a blocked npm
    registry.** Local verification = `node --check` on plain JS (copy to
    .mjs first), a string-first bracket-balance script for JSX, and the
    server test suite (zero deps). Lint/build/smoke run in CI. Validate
    new mixins pre-wiring with a "premix" wrapper that
    `Object.assign`s the methods and imports the test file.

---

## Part 2 — Successor backlog (prioritized, with design notes)

Each entry: what, why, the shape to build, and dangers. Higher = sooner.

### A. Arena sponsorship — SHIPPED v2.3.1128 (PR-B2)
Built as specced: `_handleArenaSponsor` / `_arenaSettleStakes` /
`_arenaStakeSweep` in gladiator.js, spec in `docs/specs/sponsorship.md`.
Also fixed en route: PR10's `_arenaWire` only partially matched the old
sanitizeTournament contract (status 'running' vs 'active', playerId vs
id/name/level/color, no recentMatches/champion.id) so the whole
spectator-betting UI rendered nothing — the wire now emits a SUPERSET
of both shapes; keep it that way. Successor follow-ups: tournament-
champion blind bets (pot-split/2× UIs) stay caps-gated off — they need
a champion_stake pool settled in `_arenaCrown`; stakes are private
(no spectator stake board yet).

### B. Guild-quest verification — SHIPPED v2.3.1128
Built as specced: `server/src/guilds.js`, ladder in data.js
(`GUILD_QUESTS`/`GUILD_SKILLS`), claims under `guild_claims:<pid>`,
spec in `docs/specs/guild-quests.md`. Only LEVEL objectives exist;
count-based guild work ("cook 50 meals") needs a server counter via
the `_questKills` sole-writer pattern — never read client `_compStats`.

### C. Threat machine (red-skull PvP, GDD §19)
Interim consent observer already handles pvp_threat/threat_response pairs
(index.js `_observePvpConsent` — threat only since v2.3.1121). Full
machine: countdown = 2min + 2min/level-diff, Ignore (white-skull
still-attackable state) vs Call Guards (10% gold levy via
`_escrowDebitGold` + 30-min gear lock), 30-min threat cooldown. Build it
like duel.js (own mixin, storage only for the levy). Danger: gear lock
needs an equip-handler gate that doesn't exist yet.

### D. Parties
Do NOT build a party XP system — server kill credit is already GDD §7
damage-contribution (index.js xpRecipients/shares) and works co-op today.
A party system is UI + a roster: invite/accept handshake (duel pattern),
`party:<id>` in memory (worthless on deploy), member list echoed in caps
or a privileged event. Optional later: contribution-role weighting.
Danger: don't touch the share math without re-running the §7 predicates.

### E. Hardening v1 + quality grades (BALANCE-PLAN §4/§5 — numbers ready)
Quality: server-rolls at loot/craft time (§4.6b table: 90.1/9/0.9%,
Godly 1-in-400k, roll once, immutable); mystery reveal = server
pre-commits grade at drop (anti-cheat §17.4). Hardening: §4.6c ladder
80/20/5/1/0.5%, cost `500g × 4^level`, Temper counters at 20/50/100,
failure resets (depth softened by Temper), Blacksmith gate
`floor(skill/5)`, INV-27 rate counter. Both live server-side in the
forge/loot handlers; weapon blobs gain `quality`/`hardness`/`temper`
fields (they're opaque blobs — sanitizers must learn the new fields or
they'll strip them: check `_sanitizeWeapon`).

### F. Dungeon instancing — SHIPPED v2.3.1127 (folded instances)
Built as recommended: `server/src/dungeon.js`, spec in
`docs/specs/dungeons.md`. Instance = zone id `dungeon:<id>` riding the
unmodified combat stack (`_activeZones` ticks it, zone_state delivers
waves, `_resolveMonsterKill` pays kills; one-line `noRespawn` guard was
the only core change). Client registers a synthetic `ZONES[zone]` entry
while inside (deleted on every exit path) — that was the unknown-zone
audit's answer. Successor follow-ups: boss ABILITIES are not ported
(server bosses are stat-scaled chase-and-swing only — slam/charge/
summon live in dead client AI); runs are memory-only (deploy mid-run
evaporates it, exit tile always works); loot piles die with the
instance sweep.

### G. Pet capture validation
Client-only today (`MenuBar.jsx:233-297`): trap consumed + `createPet`
locally; server passively persists `lifeSkills.pets`. Server slice:
`pet_capture {monsterId}` handler validating monster <20% hp + trap in
inventory + Trapping level vs tier, then writing the pet server-side.
Danger: `lifeSkills` sub-maps (pets/gems) are client-merge-preserved —
moving them to server-authored requires the same sole-writer transition
used for `_questKills` (caps flag + gate client writers).

### H. Two-sided trade window
The current trade is a one-directional gift. Build a both-stage-both-
confirm session on trade.js's validate-at-commit core (see trading.md
"future UI" note). Don't extend the gift handshake.

### I. Elemental completion (BALANCE-PLAN §6 leftovers)
Server-side: CC actually slowing server monsters (freeze/root/slow are
client-visual), resonance-streak mana restore, amulet elemDmg into
`_computeAttackDamage`, peer-visible status FX. INV-13/16 caps already
enforced server-side.

### J. Jackpot draw
Deposits are trivial (`jackpot:pool` key + debit). The DRAW needs the
lazy pattern (rule 12): store `jackpot:draw {closesAt, entries}` and
resolve on the first activity after closesAt; pay via `_creditPlayer`.
The GamblePanel jackpot UI is currently a dead local stub.

### K. Zone-level unpinning (BLOCKED)
All zones are `level:[1,1]`. Unpinning is blocked on the BF-1 mid-band
TTK sag (L35/L65 gates FAIL in `tools/balance-sim.mjs`). Fix the curve
per BALANCE-PLAN, re-run the sim gates, then raise zone bands.

### L. Smaller known items
- Cook minigame outcome (`kind`) still client-trusted (rate-limited only).
- Event buffer drops events past 500/tick — keep the remainder instead.
- Duplicate `case 'arena_bet'` in gameEvents (second unreachable).
- Duel `awayId` is single-slot: both players disconnecting overwrites the
  first — self-healing in arena (shot-clock), cosmetic for social duels.
- T2 retirement cleanup: drop the 5 retired stats from wire/save/clamps.
- index.js is ~5.4k lines — continue strangler-fig extraction (data.js,
  elemental.js, market/trade/duel are the pattern; tick loop is the
  riskiest slice, do it last with the smoke harness watching).
- Client has no test suite; the CI smoke harness (tools/qa/*.mjs) is the
  only automated client check — extend it when touching input/net code.

### GDD contradictions (resolved: code is truth)
- AP "deleted" in GDD §27.3 but still awarded by §42/§43 and by code —
  code keeps AP; a titles migration is a future product decision.
- Furniture has no buffs (§41) vs `furniture.json buffs` (§21.4) — no
  buffs.
- "Betting" vs "sponsorship" naming — the mechanic is §44 sponsorship
  (3×); the client's old `arena_bet` relay is display-only.
- GDD marketplace said both 1h and 48h listings — shipped: 24h
  (owner-approved deviation, marketplace.md).

---

## Part 3 — How to work here (process)

- One system per PR; each PR independently valuable; extend the test
  suite and write/update the spec doc in the same PR.
- The owner is new to coding: PR bodies in plain language, no terminal
  steps, one-button merge. Merge authorization patterns: ask, or rely on
  an explicit standing authorization if the owner has given one.
- Never deploy the worker locally (see CLAUDE.md incident). Server
  deploys happen via merge to main touching `server/**`.
- Primary platform is iPhone Safari — touch first. Two tabs in one
  browser share one identity by design; test multiplayer with `?guest=1`.
- When in doubt about a convention, the spec docs in `docs/specs/` are
  the precedent library — find the nearest shipped analog and copy its
  shape.
