# ARCHITECTURE HANDOFF — read this before touching the server

Written 2026-07-02 at the end of the heavy-systems build-out (v2.3.1116–
v2.3.1123, PRs #178–#185). This is the charter for whoever continues the
work — human or model. It exists because the conventions below are
load-bearing: each one closes a specific incident class, and code that
ignores one usually looks correct while destroying player value later.

Status refreshed 2026-07-07 (v2.3.1191), after the P4 GameRoom
decomposition (v2.3.1162–1175) finished: the rules in Part 1 stand
unchanged; Part 2 item L and rule 22 were brought up to date. The
server module map lives in `docs/OPTIMIZATION-ROADMAP.md` §P4 — that
is the one place it's maintained.

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
   storage key. ONE blessed exception (v2.3.1152): `_v`, the save-format
   schema stamp — `_saveRpg` writes the `RPG_SCHEMA_VERSION` constant and
   `_loadRpg` runs `runRpgMigrations` against it (server/src/migrations.js,
   spec docs/specs/migrations.md). Shape changes to the blob now ship as
   registry migrations, not ad-hoc heal-on-load branches.
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
   | `clan:<clanId>` / `clan_by_player:<pid>` / `clan_war:<warId>` | clan registry + war snapshots | clans.md |
   | `arena_entry:<tid>:<pid>` | escrowed 100g tournament entry | arena.md |
   | `arena_stake:<tid>:<mid>:<pid>` | escrowed sponsorship stake | sponsorship.md |
   | `guild_claims:<pid>` | `{skillKey: completedCount}` quest-ladder claims | guild-quests.md |
   | `gearlock:<pid>` | guard gear-lock expiry timestamp | threats.md |
   | `harden_ledger:<pid>` | last 50 hardening attempts (§17.5) | hardening.md |
   | `harden_h5_log` | global H5-mint timestamps, 90-day window (INV-27) | hardening.md |
   | `botstat:<playerId>` | anti-bot evidence: counters, hour caps, replay-hash tail, shadow flags | anticheat-botfp.md |
   | `device:<deviceId>` | identity list per device nonce (fleet correlation) | anticheat-botfp.md |
   | `frozen:<pid>` | `{ts, note}` operator freeze — join gate | admin.md |
   | `rpgsnap:<pid>:<yyyymmdd>` | daily rpg-blob snapshot (ring of 7) | admin.md |
   | `rpgsnap_at:<pid>` | snapshot throttle timestamp (20h) | admin.md |
   | `admin_log` | capped ring (100) of mutating admin ops | admin.md |
   | `cadence:<scope>:<subject>` | `{period, streak, ts}` lazy daily/weekly settle | cadence.md |
   | `jackpot:draw` | `{period, pool, entries}` weekly pool (escrowed) | cadence.md |
   | `liveflags` | `{name: bool\|num}` live-ops flags (kill switches, xp_mult) | liveops.md |
   | `motd` | `{text, ts}` sticky announcement, delivered on join | liveops.md |
   | `metrics:<yyyymmdd>` | daily economy snapshot (ring of 30) | liveops.md |

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
    v2.3.1151: mechanically enforced by `test/wire-audit.test.mjs`
    (emission-site extraction; the four legitimate relay-echo types
    live in its allowlist — see docs/specs/conformance-audit.md).
    Mirror-table drift (server/src/data.js vs client tables) is
    likewise pinned by `test/mirror-audit.test.mjs`.
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
    future room re-shard mechanical. As of v2.3.1162–1175 (P4) the
    WHOLE GameRoom works this way — index.js (~2.6k lines) keeps only
    the router switch, monster spawn/AI, loot piles, death/respawn/
    regen, PvP consent bookkeeping, and the weapon channel helpers;
    everything else is a mixin (module map: OPTIMIZATION-ROADMAP §P4).
    Extraction discipline if you move more: byte-identical hoist,
    one slice per commit, all suites green per slice, tombstone
    comment at the old site.
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

### C. Threat machine — SHIPPED v2.3.1129
Built as specced: `server/src/threat.js`, spec in
`docs/specs/threats.md`. The interim `_observePvpConsent` is removed
(it was dead anyway — required `payload.accepted`, which the client
never sent). Countdown 2min + 2min/level-above capped at 10min;
ignore/expiry grant the consent pair; Call Guards = 10% coin sink +
30-min gear lock under `gearlock:<pid>` (storage-backed — relog can't
shed it) gating the four equip mutators (equip/unequip/armor-swap/
forge). Skull rendering SHIPPED v2.3.1193 (client-only, no wire
change: `S._threatMarks` + the formerly orphaned `S._pvpSkull*`
anchors, written in gameEvents.js from the relayed handshake, drive a
tinted 💀 per player display in entityRenderer on the party-marker
change-cache budget — red while the countdown runs, white for the
10-min fight window after ignore/expiry, cleared by guards; see the
spec's "Skull rendering" section). Successor follow-ups: guards fines
evaporate — a bounty pool is the natural next step.

### D. Parties — SHIPPED v2.3.1185
Built as specced: `server/src/party.js` (roster + invite handshake on
the duel/trade2 pattern, memory-only per rule 11), spec in
`docs/specs/party.md`, HUD in `src/ui/panels/PartyHUD.jsx` (NOT the
tavern's PartyPanel — that name was taken by the arena-betting UI).
The §7 share math is untouched, per this item's original danger note.
Ghost-HUD contract: clients clear party state on every state_sync;
the join path re-sends the roster AFTER state_sync (ordering pinned by
a test). Successor follow-ups: same-zone member arrows / map markers,
leader-initiated group dungeon entry, party chat (NOTE: a chat relay
must be its own explicit switch case with sender validation — the
default rebroadcast branch is deny-listed territory, rule 13), and the
original "optional later" contribution-role weighting (re-run the §7
predicates if attempted).

### E. Hardening v1 + quality grades — SHIPPED v2.3.1131
Built per the adopted BALANCE-PLAN numbers: `server/src/hardening.js`,
spec in `docs/specs/hardening.md`. Quality rolls at the FORGE only
(the sole server weapon mint — monster weapon drops are still
client-minted, so join-ingested client blobs are STRIPPED of the new
fields; a forged godly would raise its own damage ceiling). Hardening
ladder + temper pity + `floor(skill/5)` access gate + ledgers
(`harden_ledger:<pid>`, global `harden_h5_log` INV-27 window). The
sanitizer learned the fields with a two-posture contract (clamp stored
/ strip client-supplied). NAME COLLISION: the client's legacy "Harden"
button is the hardenBonus AFFIX system — distinct fields, never merge.
Successor follow-ups: ~~server-side weapon-drop migration unlocks
drop-time quality + mystery reveals (§4.6b.ii)~~ — SHIPPED v2.3.1141
(`_rollWeaponDropForKill` rides the loot pile with its own claim flag;
pile broadcast hides quality, the private `loot_credit` reveals it;
legacy client mints stay as `!caps.weaponDrops` fallback; the
projectiles path's divergent generous drop table was deliberately
unified down to the §4.6 cubic). Sell value still deliberately ignores
the new layers.

### F. Dungeon instancing — SHIPPED v2.3.1127 (folded instances)
Built as recommended: `server/src/dungeon.js`, spec in
`docs/specs/dungeons.md`. Instance = zone id `dungeon:<id>` riding the
unmodified combat stack (`_activeZones` ticks it, zone_state delivers
waves, `_resolveMonsterKill` pays kills; one-line `noRespawn` guard was
the only core change). Client registers a synthetic `ZONES[zone]` entry
while inside (deleted on every exit path) — that was the unknown-zone
audit's answer. Successor follow-ups: ~~boss ABILITIES are not ported
(server bosses are stat-scaled chase-and-swing only — slam/charge/
summon live in dead client AI)~~ — SHIPPED v2.3.1194
(`_dungeonTickBossAbilities` rides `_tickDungeons`, no `_tickMonsters`
fork; telegraphs via the display-only `dungeon_boss_ability` event,
damage via the normal `monster_attack`/`_applyDamage` rails with a
≤50%-maxHp no-oneshot clamp; summons capped at 4 with halved rewards —
see dungeons.md); runs are memory-only (deploy mid-run
evaporates it, exit tile always works); loot piles die with the
instance sweep.

### G. Pet capture validation — SHIPPED v2.3.1130
Built (and the exploration found it worse than this note assumed:
traps were NEVER consumed, and the captured monster only died on the
capturer's screen). `server/src/pets.js`, spec in `docs/specs/pets.md`:
pet_capture validates the SERVER's monster hp/range + consumes one
basic_trap per attempt + rolls server-side + removes the monster for
everyone; join-time `_sanitizePets` + one-time legacy adoption; the
lifeSkills-echo "stomp" is now the intended authoritative flow under
caps.pets. Successor follow-ups: pet evolution/enchant are still
client blob edits (sanitize-on-join covers them); the pet loot vacuum
is echo-stomped theatre — route it through the real loot_pickup path
to make pets economically real.

### H. Two-sided trade window — SHIPPED v2.3.1132
Built as specced: `server/src/trade2.js` (mutual-open, anti-switch
confirm resets, atomic both-debits-before-any-credit commit) +
`TradeWindowPanel.jsx` (pure renderer of the trade2_state snapshot);
spec addendum in trading.md. The gift handshake is untouched.
Successor note: weapons still trade via marketplace escrow only —
a weapon lane here needs escrow-at-stage, not validate-at-commit.

### I. Elemental completion — SHIPPED v2.3.1139
Built: CC gates the real monster AI (freeze/root stop movement AND
attacks, slow ×0.4 — `elementMoveMult`), resonance-streak mana restore
settles server-side off the collision `resonating` flag, amulet
elemDmg + hexer curse are in `_computeAttackDamage`. Spec:
`docs/specs/elemental-completion.md`. Follow-ups: ~~amulets are a
client-crafted blob (forgery ceiling = legit mythic +10.5%; a server
amulet-forge handler is the real fix)~~ — SHIPPED v2.3.1192
(`server/src/amulet.js` + the server-owned goldNuggets/goldBars
ledger and server-rolled kill nuggets, `caps.amuletForge`; spec
`docs/specs/amulet-forge.md`). Residuals documented there: the
polished-gem economy (drops/polishing) is still client-local inside
the opaque lifeSkills.gems map — migrating gem income server-side is
the natural next slice — and the first-connect amulet bootstrap stays
as the legacy migration path (fresh-identity one-time ceiling).
Still open: peer-visible status FX are cosmetic and unported,
shock/fracture/soak remain mechanically inert.

### J. Jackpot draw — SHIPPED v2.3.1149
Built on the new time-cadence framework (`server/src/cadence.js`, spec
`docs/specs/cadence.md`) — the reusable lazy daily/weekly primitive this
item's "lazy pattern" note asked for. One `jackpot:draw {period, pool,
entries}` record (single-key deviation from the sketch: atomic under the
input gate), ISO-week periods, resolve on join/deposit/rate-limited
tick, pay via `_creditPlayer` opId `jackpotwin:<period>` (double-resolve
tested to converge). Ships with the second consumer: the daily login
reward (streak-scaled, rides inbox_delivered — zero client code).
Successor note: daily quests / weekend events are now one cadence scope
+ one settle call each.

### K. Zone-level unpinning — SHIPPED v2.3.1140
BF-1 fixed by flattening the monster HP ramp 1.065 → **1.052** (BALANCE-
PLAN's suggested ~1.055 still failed the L35 gate; the sim is the referee).
The curve is now ONE exported object: `MONSTER_HP_CURVE` in
`src/data/gameSystems.js`, mirrored in `server/src/data.js`, IMPORTED by
`tools/balance-sim.mjs` (which had silently hardcoded a copy). Zone bands
raised per MAP-REDESIGN in BOTH `server/src/data.js` and
`src/data/zones.js` (lockstep rule: the client clamps server monster
levels to its own band). The ±5 valid-threat gate on `trainDefense` is
re-enabled at all six client call sites (§7's condition). Follow-ups:
~~no zone ENTRY gating yet~~ — v2.3.1147 shipped SOFT gating (first
approach to a zone whose floor exceeds level+5 bounces with a warning;
second approach passes), populated the empty [22,40] zones
(verdant/mist — the L25-38 dead band), added a −4 entrance ramp in the
shallowest 15% of every zone, re-enabled the tutorial banner, and added
a CI lockstep test pinning both ZONES tables together (spec:
docs/specs/zone-progression.md). Hard entry gating remains optional.

### L. Smaller known items (statuses refreshed 2026-07-07)
- ~~Cook minigame outcome (`kind`) client-trusted~~ — resolved as a
  DOCUMENTED trust posture, not a gap: the outcome is player timing,
  not a skill roll, so it stays client-reported; v2.3.1167 added a
  physics floor (sub-window `cook_request` bursts dropped) on top of
  the v2.3.1104 rate limit. See docs/specs/cooking.md.
- ~~Event buffer drops events past 500/tick~~ — FIXED v2.3.1163:
  overflow is spliced and delayed to the next tick, not dropped
  (tick.js; pinned by test/tick.test.mjs §10).
- ~~Duplicate `case 'arena_bet'` in gameEvents~~ — RESOLVED v2.3.1176,
  but NOT by un-shadowing. The FIRST case was the dead one (keyed on
  `bettorId`, which only one send site carries; fed an unread
  `S._remoteBets`) and it shadowed the setArenaBets handler — but
  reviving that handler is unsafe: the arenaBets consumers in
  PartyPanel predate remote delivery (Active Bets crashes on
  bettorId-shaped bets, 'Your Bets' has no ownership filter, the
  sender's own tick echo double-counts, and the `!caps.sponsor`
  legacy pot-split mint would count forged remote amounts into
  `S.rpg.coins`). The relay is now ONE explicitly-ignoring case;
  `no-duplicate-case` is enabled in the correctness lint so the
  shadowing class can't recur. A real spectator stake board is item
  A's caps-gated follow-up (server-owned, validated feed).
- ~~Duel `awayId` single-slot~~ — FIXED v2.3.1175: `duel.away` is now
  a per-player map of forfeit deadlines (null-prototype — ids are
  client strings, `'__proto__'` must not no-op the clock), built by
  the `_makeDuel` factory that owns the duel-record shape for both
  social duels and arena matches (duels.md). The single slot was
  worse than cosmetic for social duels: both players dropping and
  only the second rejoining erased the first's clock, leaving the
  duel 'active' forever and blocking both from any new duel.
- ~~T2 retirement cleanup~~ — SHIPPED v2.3.1155 as the coordinated
  whole-PR edit that migrations.md §"Why v3 was not shipped" called
  for (with the v2.3.1156 uniform caps + v2.3.1157 1000-point ceiling
  landing right behind it).
- ~~index.js is ~5.4k lines — continue strangler-fig extraction~~ —
  DONE v2.3.1162–1191: the decomposition is complete, including the
  do-last tick-loop slice (v2.3.1174) and the combat/damage core
  (v2.3.1191). index.js is ~2.6k lines; module map in
  OPTIMIZATION-ROADMAP §P4.
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
