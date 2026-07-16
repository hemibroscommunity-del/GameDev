# ARCHITECTURE HANDOFF — read this before touching the server

Written 2026-07-02 at the end of the heavy-systems build-out (v2.3.1116–
v2.3.1123, PRs #178–#185). This is the charter for whoever continues the
work — human or model. It exists because the conventions below are
load-bearing: each one closes a specific incident class, and code that
ignores one usually looks correct while destroying player value later.

Status refreshed 2026-07-07 (v2.3.1191), after the P4 GameRoom
decomposition (v2.3.1162–1175) finished: the rules in Part 1 stand
unchanged. Later the same day, v2.3.1208 rewrote Part 2 as
**successor backlog v2** — the v1 items A–L all shipped and are kept
as a letter-frozen "Shipped" list, because `docs/TRAPS.md` and the
spec docs cite them by letter. The server module map lives in
`docs/OPTIMIZATION-ROADMAP.md` §P4 — that is the one place it's
maintained.

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
   | `bounty:<pid>` | `{amount, by, ts}` escrowed Call-Guards fine on this head, paid to the killer | threats.md |
   | `trade2wpn:<pid>:<seq>` | `{pid, sid, seq, weapon, ts}` weapon escrowed into a live trade window | trading.md |
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
   | `friends:<pid>` | `{list, reqIn, reqOut}` mutual-friend graph + pending requests | friends.md |
   | `friend_msg:<pid>` | offline DM backlog, capped 50, cleared on join delivery | friends.md |

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

## Part 2 — Successor backlog v2 (2026-07-07)

Rewritten v2.3.1208. The 2026-07-07 push moved main v2.3.1174 →
v2.3.1207 in 22 merged PRs (#215–#238): the economy is now fully
server-authoritative (amulet forge v2.3.1192, gem income v2.3.1198,
pet loot v2.3.1200, market crash-window closed v2.3.1181–84, HTTP
economy auth v2.3.1177–80), dungeons fight back (boss abilities
v2.3.1194 + enrage v2.3.1199), parties (v2.3.1185) and threat skulls
(v2.3.1193) shipped, the client was de-monolithed (gameSystems split,
pushDmgPopup, eslint debt zeroed — v2.3.1186–90), displays conform to
server math (`calcDisplayDps`/`calcDisplayHeal` in
`src/data/gameSystems.js`, pinned by the 33-assertion
`server/test/display-dps.test.mjs`), and session tooling exists
(SessionStart auto-brief, precheck gate, `/repo-review`,
`docs/TRAPS.md`, caps/opId conformance audits). Server deploys on any
merge to main touching `server/**`; client via Pages.

Each entry: what, why, the shape to build, and dangers. Higher =
sooner. The shipped v1 backlog is collapsed at the end of this part —
its letters are frozen (TRAPS.md and the specs cite them).

### A. Gem-slot consume settlement
Gem EXTRACTION shipped v2.3.1209 (amulet.js `op:'extract'`,
`caps.gemExtract`): ForgePanel's two Extract buttons — the four
equipped gearBase slots (weapon/rangedWeapon/staffWeapon/shield) and
stash weapons — now strip the SERVER blob, credit polished gems, and
charge coins server-side, name-rebuilt from mirror-pinned label tables
(amulet-forge.md "Gem extraction"). The amulet extract button is dead
code (gearBase filter), so it's excluded per the dormant-content rule. What
remains is the **EnchantPanel shield/weapon gem-SLOT consume**: still a
client-local `lifeSkills.gems` edit, echo-restored. Blocked, not just
unbuilt — non-flame gem bonuses are client-side point-of-use effects
(v2.3.1139 posture), so the server has nothing authoritative to
validate at the slot yet; it migrates ALONGSIDE the slots' stat
migration (fold the gem consume into that slice, on the
`op:'extract'`/gem-op template — validate/consume from SERVER state,
gate on a narrow caps flag). Danger: the shield and weapon slot paths
differ (elements vs a single gem — check both consume sites); the
amulet gem slot is already server-settled (the v2.3.1192 gem op).

### B. Spectator stake board
Old item A's residue: sponsorship stakes are private — spectators see
nothing. Shape: a server-owned feed (a PRIVILEGED event or a
state_sync section), display-only client, caps-gated. Danger:
TRAPS #1 — do NOT revive the legacy `arena_bet` relay for this; its
consumers were proven unsafe in #220's adversarial review.

### C. Threat bounty pool — SHIPPED v2.3.1211
The Call-Guards 10% fine no longer evaporates: it escrows into
`bounty:<pid>` (registered above) and pays the killer of that
threatener, via `_bountyOnDeath` hung off the `_handlePlayerDeath`
choke point (threat.js; threats.md "Bounty board"). Fed only by the
server's own `pvp:<killerId>` cause, so the killer can't be forged;
self / non-PvP (monster) / consensual-duel / same-clan kills are all
excluded (the `_warOnDeath` anti-farm posture), leaving the bounty in
place for a legit hunter. `_creditPlayer` opId `bountypay:<victim>:<ts>`
is the double-pay guard; `_bountySweep` (join-path, rate-limited)
deletes bounties gone stale past `THREAT.BOUNTY_STALE_MS`. No caps flag
(server-only, the threat-machine posture).

### D. Party follow-ups
**Party chat SHIPPED v2.3.1212** (`_handlePartyChat`, party.js;
party.md "Party chat") — its own validated `party_chat` case (rule 13,
NOT the room rebroadcast), server-stamped unforgeable sender, delivered
to party members only, `/p <msg>` client route. **Group dungeon entry
SHIPPED v2.3.1218:** a party LEADER starting a dungeon pulls their
co-located members into the same instance — `_dungeonPullPartyMembers`
(dungeon.js) re-sends the SAME `dungeon_started` to each connected,
alive member standing in the leader's zone, so their client runs the
existing entry path (no new client code, no teleport primitive, no caps
flag — an old client already enters on `dungeon_started`, so it's
deploy-order safe both ways). Members in another zone (or their own
dungeon) are left where they are; a non-leader start pulls nobody.
Instances were already shared by design (rewards + boss HP scale to
everyone present), so this just gives parties an entry path. Remaining
follow-up: same-zone member arrows / map markers (the vitals echo
carries `zone` at VITALS_MS=2s; x/y could ride it, but 2s cadence suits
a coarse minimap dot better than a smooth in-world arrow — needs a
faster position channel or a minimap first). Danger: do not touch the
§7 share math (TRAPS #3; party.md's danger note stands).

### E. Trade2 weapon lane — SHIPPED v2.3.1213
Weapons trade in the two-sided window now (trading.md addendum "Weapon
lane"): escrow-at-STAGE (`trade2_stage_weapon` → storage-backed
`trade2wpn:<pid>:<seq>`, registered above), commit delivers to the
other side, and cancel/disconnect/idle/deploy all refund — every leg
`_creditPlayer(kind:'weapon')` (stash or inbox if full, rule 3),
opId-idempotent, sweep checks the deliver stamp before refunding
(rule 6). Gated on its own narrow `caps.trade2Weapons` (rule 19 /
TRAPS #9). The item/gold path stays memory-only validate-at-commit.

### F. Promote the report-only CI trio
qa-gear-smoke, qa-party-smoke, qa-combat-predict run
`continue-on-error` in `.github/workflows/client-ci.yml`; the
promotion criteria live as comments on those steps (~10 consecutive
green runs — including the built-in retry — then delete that
harness's `continue-on-error` line). Check the Actions history per
harness; promote individually. Danger: a flaky BLOCKING check is
worse than none — if one still flakes, tune it first (v2.3.1196b,
commit 4d31448f, is the tuning pattern).

### G. PNG → WebP conversion
325 PNGs, ~20MB under `public/`. Needs a machine with `cwebp` — the
sandbox has no lossless WebP encoder (`tools/webp_convert.mjs` drives
canvas, whose WebP is lossy and would corrupt the recolor-keyed
player/gear sheets). `find public -name '*.png' -exec sh -c
'cwebp -lossless "$1" -o "${1%.png}.webp"' _ {} \;`, then delete the
.png twins in a follow-up once verified; `loadWebpOrPng`
(`src/rendering/webpImage.js`) already prefers .webp per-file.
Danger: sprites/player + sprites/gear MUST be `-lossless` — the tint
pipeline (playerSkins.js brightness-ratio retint) reads exact RGB.

### H. Proto-WARN triage — SHIPPED v2.3.1214
All 16 flagged plain-`{}` sites triaged; the whole-tree sweep
(`node tools/dev/precheck.mjs <root-commit>`) is now quiet. One was a
GENUINE hole: `quests.js` validated `questId` with a truthiness lookup
(`QUEST_REWARDS[questId]`), so an inherited key (`'constructor'`,
`'toString'`, …) passed and farmed the unconditional AP reward at
turn-in + polluted `_quests` — fixed with the amulet.js own-property
guard (`hasOwnProperty.call`) in both quest handlers, `_quests`/
`_questKills` made null-proto, pinned by quests.test §7. The rest were
safe (server monster/zone keys, not-a-map payload structs, or
join-gate-protected player ids v2.3.1202); each carries an inline
`// proto-ok:<reason>` marker that precheck now honors (so a triaged
site stops WARNing without churning a safe map). Adding a new plain
`{}` id-keyed map still WARNs until you fix or mark it.

### I. Boss ability extensions — per-archetype kits SHIPPED v2.3.1215
`BOSS_ABILITIES.KITS` (`server/src/dungeon.js`): each boss archetype
now leads with a SIGNATURE ability from level 1 (swarm summons,
sentinel/hexer sweep, stalker charges) via `_dungeonBossKit`; the
legacy summon/sweep level gates still layer the full rotation on at
depth, so `bossArchetype` finally changes behaviour, not just stats.
Archetype-distinct boss glyph too (rides the monster emoji wire, no
client code). All EXISTING ability kinds — no new wire surface; every
hit still routes through the MAX_HIT_PCT clamp. **New ability kind
SHIPPED v2.3.1217:** `siphon` (`BOSS_ABILITIES.SIPHON`, dungeon.js) —
hexer's signature life-drain, a single-target clamped hit that heals
the boss `HEAL_PCT` of maxHp ONLY on a landed hit (block denies both
hit and heal); reuses `dungeon_boss_ability` with a new `ability`
string + a `_dbaLabels`/`_dbaColors` whitelist entry (gameEvents.js,
graceful-degrades on old clients — no caps flag, like enrage). To add
the NEXT ability kind, follow the same seam: a new execute branch in
`_dungeonTickBossAbilities`, a kit entry, and a client whitelist pair.
`_dungeonBossHitPlayer` now returns the landed damage (0 on
block/dodge/grace) for drain-style gating. Remaining follow-ups:
telegraph variety (per-ability wind-up) and standard-zone minibosses.
Danger unchanged: MAX_HIT_PCT stays authoritative over EVERYTHING.

### J. Hard zone entry gating + collectibles — owner calls
Soft gating shipped v2.3.1147 (zone-progression.md); hard gating
remains optional. Collectibles are dormant content — confirm with the
owner before building on either (CLAUDE.md doc-trust note).

### K. Arena economics check-in
The house faucet is deliberate: CHAMPION_REWARD 2000g vs ≤800g of
entries (gladiator.js economics note; STAKE_MULT carries the same
posture). `metrics:<yyyymmdd>` snapshots (liveops.md) give the owner
the data; when they decide, it's a one-constant change.

### L. index.js residue
~2.7k lines: the router switch, monster spawn/AI, loot piles,
death/respawn/regen, PvP consent bookkeeping, weapon channel helpers.
Only extract if a clean seam appears — the P4 mixin pattern (rule 22)
is the template; don't force it.

### M. Client test growth
Extend `server/test/display-dps.test.mjs` whenever a new display
formula ships (the conformance pattern: the client prints what the
server settles). Use the qa-gear-sheet contact boards during the art
blitz; wire qa-combat-predict learnings back into the harness.

### N. Consumables caps flag (low)
v2.3.1207's mobile eat fix gates `eat_request` on connection presence
— `if (S._serverMonsters && S.channel)` in BroTown.jsx's eatBus
handler — not on a caps flag. Consider an explicit `caps.consume` for
strict deploy-order symmetry (rule 19). Danger: the current gate is
adequate (local heal is prediction, the echo is the tiebreaker,
rule 20) — this is symmetry polish, not a hole.

### Shipped (v1 backlog — letters frozen, cited elsewhere)
TRAPS.md and the spec docs cite these as "handoff item X"; the full
design notes live in each item's spec.

- **A. Arena sponsorship** — v2.3.1128 (sponsorship.md; `_arenaWire`
  emits a SUPERSET of both tournament shapes — keep it that way).
  Residue → v2 item B.
- **B. Guild-quest verification** — v2.3.1128 (guild-quests.md;
  count-based objectives still need a server counter).
- **C. Threat machine** — v2.3.1129; skull rendering v2.3.1193
  (threats.md). Residue → v2 item C.
- **D. Parties** — v2.3.1185 (party.md). Residue → v2 item D.
- **E. Hardening v1 + quality grades** — v2.3.1131; server weapon
  drops v2.3.1141 (hardening.md).
- **F. Dungeon instancing** — v2.3.1127; boss abilities v2.3.1194,
  enrage v2.3.1199 (dungeons.md). Residue → v2 item I.
- **G. Pet capture validation** — v2.3.1130; pet loot vacuum
  v2.3.1200 (pets.md).
- **H. Two-sided trade window** — v2.3.1132 (trading.md addendum).
  Residue → v2 item E.
- **I. Elemental completion** — v2.3.1139; amulet forge v2.3.1192;
  gem income v2.3.1198 (elemental-completion.md, amulet-forge.md).
  Residue → v2 item A; status FX still cosmetic/unported.
- **J. Jackpot draw + cadence framework** — v2.3.1149 (cadence.md;
  daily quests / weekend events are one cadence scope each).
- **K. Zone-level unpinning** — v2.3.1140; soft entry gating
  v2.3.1147 (zone-progression.md). Residue → v2 item J.
- **L. Smaller items** — all resolved by v2.3.1191: cook outcome =
  documented trust posture (cooking.md), event-buffer overflow
  delayed not dropped v2.3.1163, duplicate arena_bet case removed
  v2.3.1176 (the full story now lives in TRAPS #1), duel away map
  v2.3.1175 (duels.md), T2 retirement v2.3.1155, P4 decomposition
  v2.3.1162–1191. Remaining line item — "client has no unit suite" —
  graduated to v2 items F and M.

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

- Sessions start with the auto-brief: a SessionStart hook runs
  `tools/dev/session-brief.mjs` (version high-water, next free
  `v2.3.N` tag, in-flight `claude/*` branches). Claim ONE tag above
  high-water and check the branch list for your topic before building
  — on 2026-07-07 five parallel sessions claimed one tag and two
  built the same feature.
- Run `node tools/dev/precheck.mjs` before EVERY push. The sandbox
  blocks npm install, so it is the only local gate (syntax, dup
  switch cases, tag collisions, storage-key registry, proto-safety,
  server suite). It PARSES the rule-2 registry table above — breaking
  that table's format fails the gate.
- Before merging a risky diff, run `/repo-review`
  (`.claude/commands/repo-review.md` — adversarial multi-angle
  protocol). When a fix feels obviously right, check `docs/TRAPS.md`
  first — it is the registry of plausible-but-wrong moves, each one
  attempted by a competent session. Details on all of the tooling:
  `docs/DEV-TOOLS.md`.
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
