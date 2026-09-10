# Live-ops rail (v2.3.1150)

Config-over-deploy for a solo operator. Until now every capability was
baked into the worker at deploy time and the owner had no in-game voice.
Three primitives, all riding the admin rail's auth (`admin.md` — same
Bearer key, same fail-closed 404 posture); routes hook into `_adminFetch`
via `_liveopsRoutes` just before its final 404. Owner-facing curl guide:
`docs/OPERATIONS.md`.

## 1. Flags (`server/src/liveops.js`)

- Storage: one `liveflags` key = `{name: boolean|number}` (registered in
  handoff rule 2). Names `^[a-z0-9_]{1,32}$`, budget 64.
- Cache: `this._liveFlags` is a lazy read-through cache
  (`_liveFlagsEnsure()`); admin writes are **write-through into the same
  object**, so an already-cached room sees flag changes immediately — no
  rejoin, no deploy. A worker deploy wipes memory and simply re-reads.
- Hot-path reads are **synchronous**: `_flagOn(name)` and
  `_flagNum(name, dflt, lo, hi)` (clamped at read time as the wall, in
  case storage is ever hand-edited; the write path clamps too). Fail-open
  before the first cache load is safe because every gated path requires a
  joined player and the join handler awaits `_liveFlagsEnsure()` first.

### Kill switches shipped (server-side gates)

| Flag | Gate | Behavior when on |
|---|---|---|
| `disable_jackpot` | `_handleJackpotDeposit` first line | deposits ignored; nothing debited; pool + existing entries untouched; the draw still resolves on schedule |
| `disable_weapon_drops` | `_spawnLootForKill` weapon roll | monsters drop no weapons (gold/XP unaffected); `caps.weaponDrops` stays `true` so clients don't fall back to legacy client-side minting |
| `disable_dungeons` | `_handleDungeonStart` | `dungeon_error` code `'disabled'` with a player-readable message |
| `disable_threats` | `_interceptThreat` | returns `null` — the threat is **dropped, not relayed** (rule 15; relaying would trigger legacy client-side threat handling on the receiving end) |

### Value flags

`xp_mult` — consumed at the kill-XP grant in `_resolveMonsterKill`,
clamped to [1, 4] at write AND read. The multiplied value flows through
the authoritative grant and `combat_credit`; the broadcast `monster_kill`
payload stays base (the private echo corrects, rule 20). This is the
"2x XP weekend" primitive.

`max_players` (v2.3.1982) — the room's admission ceiling, read through
`_roomCap()` (join.js) in the DO's `fetch()` and clamped to
**[1, MAX_PLAYERS]** at read. It can only ever LOWER the cap: 60 is a
receiver-bandwidth number (~4KB/s of download per co-located moving peer
on a phone), not a server one, so nothing above it is safe to hand out no
matter what is written into storage. Set it to run a smaller, smoother
room for a demo — or, in a headless test, to 1, which is how the
61st-player refusal is exercised without 61 browsers
(`tools/qa/mp/mp-roomfull.mjs`). Refused joiners get `room_full` and keep
retrying, so RAISING the flag again lets the waiting queue in with no
action from them. See room-full.md.

### Caps override (the emergency lever — read the warning)

The whole flag map is also spread over the `state_sync.caps` literal,
**flags last**, so `{"name":"jackpot","value":false}` overrides the baked
`jackpot: true` on the next join. WARNING: caps mean "the server claims
this job" (handoff rule 19) — overriding one to `false` tells clients the
server does NOT settle that system, which re-enables legacy client-side
fallback paths where they still exist (e.g. `weaponDrops: false` would
resurrect client-minted weapons). The `disable_*` server switches are the
normal lever; a caps override is for emergencies where you need clients to
stop *sending* a message family entirely. Safe to override: `jackpot`
(clients just hide the panel — the stub burned coins into nothing, and the
deposit gate is server-side anyway). Dangerous: `weaponDrops`, `settled`,
`market`, `trade` — these all have legacy client paths.

## 2. Announce + MOTD

- `POST /api/admin/announce {text, sticky?}` → `_announce()` broadcasts
  `server_announce {text, ts}` to every connected socket **directly** (not
  via `eventBuffer` — the buffer only drains while the tick loop runs, and
  an announcement must reach a quiet room). Text trimmed + capped at 200.
- `server_announce` is in `PRIVILEGED_EVENTS` (rule 13). This is why it
  does not ride the existing `chat` relay: `chat` is deliberately
  un-privileged, so an "official" message on it would be forgeable by any
  client.
- `sticky: true` also writes the `motd` storage key; every subsequent join
  gets the announcement (with `motd: true` in the payload) right after its
  `player_state`, until `DELETE /api/admin/announce` clears it.
- Client (`gameEvents.js`): pushes a chat-log line, shows a gold "📢"
  banner (the `gear_locked` dmgNumbers pattern — the chat log itself
  currently renders nowhere, a known dead-UI gap), and beeps. Old clients
  silently drop the unknown type — deployable in either order.

## 3. Daily economy metrics (the dupe tripwire)

- `_economySnapshot()` — the `/economy` aggregation factored out of
  admin.js so the endpoint and the daily writer share one implementation
  (full-prefix lists; fine at room scale, revisit past ~thousands of
  blobs).
- `_metricsMaybe(now)` writes `metrics:<yyyymmdd>` = `{totalGold,
  playerBlobs, escrowedGold, pendingEntries, ts}` at most once per UTC day
  (key-existence idempotent; `_lastMetricsDay` is just the fast path),
  prunes the ring to 30, and never throws. Called lazily (rule 12): from
  every join (fire-and-forget) and from the tick's rate-limited ~60s slot.
  No alarms — a day with zero logins simply has no snapshot, which is
  fine: no players means no economy movement.
- `GET /api/admin/economy` now also returns `history` (last 7 snapshots),
  `delta.totalGoldPct` (day-over-day), and `alert: true` when
  |Δ totalGold| > 25% — a sudden supply jump is the dupe-exploit
  signature. The alert is surfaced in the response only (no push channel
  exists); check it when something feels off, or after any economy-adjacent
  deploy.

## Invariants honored

- No new client→server events at all; the only new server→client type is
  registered in `PRIVILEGED_EVENTS` (rule 13).
- All storage keys registered in handoff rule 2; nothing added to the rpg
  blob (rule 1).
- Every await between validation and commit is a storage await (rule 9);
  flag reads on hot paths are synchronous by design.
- Metrics/MOTD/flags all survive deploys (storage); the in-memory cache is
  reconstruction, not truth.

## Tests

`server/test/liveops.test.mjs` (29 checks): flag CRUD + validation + auth
inheritance; caps merge/override composition and restore-on-delete; all
four kill switches gating their real handlers and re-enabling live via the
write-through cache; `xp_mult` write- and read-clamps plus a real
`_resolveMonsterKill` proving grant×4 with base broadcast; announce
reaching two live sockets, sticky MOTD on join, delete, and the forged
`server_announce` dropped by the deny-list; metrics once-daily
idempotency, `/economy` history/delta/alert math, ring prune.

## Live flags in the owner's panel (v2.3.2412)

The FLAGS primitive above has had read, write and clear routes since
v2.3.1150. This adds the only thing that was missing: **a way to reach them
without a computer.**

### The incident that forced it

2026-09-09, production. The owner reported combat levels reading 0. Two
screenshots settled it in one step: Character → Points showed
**Melee/Bow/Magic at Lv 0**, and tapping into that same tile read
**"Melee skill · Lv 1"** for the same character in the same second.

That pair is a diagnosis, not a symptom. The tile grid is gated on
`prog3Live` (worker cap **AND** blob); the panel behind it on
`prog3HasSkills` (blob only). So the character's trained-skill blob was
healthy and **`caps.prog3` was false**. A clean worker built from the same
commit advertises 42 caps with `prog3: true`, measured — so the source was
never wrong.

The mechanism is the one this file's own header warns about: the `liveflags`
map is spread over the `state_sync` caps literal **last**, so a flag named
after a capability overrides the baked-in `true`, and *"overriding a cap to
false … can re-enable legacy client-side fallback paths for some systems."*
The legacy path is the one that prints Lv 0.

**So the flags were working exactly as designed, and the defect was
operational**: the repair needed `curl` and an admin key, the owner runs this
game from a phone, and a flag set once in an emergency can sit in Durable
Object storage indefinitely — silently disabling a system, with no surface
anywhere that says so. Three separate rounds of investigation have now been
spent on a symptom whose cause was one unreadable line of stored config.

### What was added

**Client only.** No server change: `GET`, `POST` and `DELETE
/api/admin/flags` all already existed. That matters — it ships through Pages
without a worker deploy, so it cannot disturb live players.

`src/ui/panels/DevPanel.jsx`, a **Live flags** section in the existing
admin-key-gated panel (1.2s press on the zone name). It lists the map, and
for each flag offers **Clear**. `call()` gained a `method` argument so the
section can `DELETE`; the default is derived from `body` exactly as before,
so every existing call site is untouched.

**The warning line is the actual feature.** A list of twelve flags with
`prog3  false` among them is not a diagnosis. So a flag is detected as
**overriding a capability** when its name is also a key in the client's
`_serverCaps` — which is precisely what the spread does — *and* its value is
`false`, the harmful direction. Those get named in an amber banner that says
the game has fallen back to its old behaviour, and that this usually looks
like **wrong numbers rather than a missing feature**.

`disable_*` kill switches are server-side and never collide with a cap name,
so they list as ordinary. Keeping them out of the warning is deliberate: a
banner that fires on every routine kill switch is a banner the owner learns
to ignore.

Loaded on demand rather than with the panel's state refresh — it is another
admin round trip and most panel opens are not about flags.

### The pin

`tools/qa/mp/mp-devflags.mjs`, **19 assertions**. Controls first (the worker
starts with `caps.prog3` true and no flags at all, so the test cannot pass by
measuring a broken baseline), then: an empty map says so in words rather than
rendering blank; a cap-named flag and a `disable_*` switch set together are
both listed; the warning names the first and **not** the second; and Clear
reaches the **worker**, verified by an independent admin `GET`, not by
reading the screen it just updated.

Mutation-tested twice, because the two failure modes are different:

- make nothing detectable as an override → **3 red** (the warning vanishes)
- drop the `n in caps` test so kill switches count too → **2 red**, isolating
  the discriminator assertion while the other two stay green

