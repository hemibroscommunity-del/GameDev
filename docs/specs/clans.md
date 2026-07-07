# Clan Registry + Server-Scored Wars (v2.3.1125) — spec + attach points

Wave 2 PR9. Clans move out of localStorage into the GameRoom; clan wars
are scored by the server's own PvP death resolution.

## The holes this closes

- **Membership was localStorage** (`bt_clan`) — no server registry, no
  validation of who's in a clan, the 500g creation fee debited locally.
- **The clan tag was fully forgeable** — the client stuffed `clanTag`
  into its join/track cosmetics and peers rendered it blindly.
- **Wars were peer-scored**: each client broadcast its own kills
  (`clan_war_kill`) and self-credited the war reward at the end,
  winner decided by whichever client's local tally was higher.

## How it works now

**Registry** (`server/src/clans.js`, GameRoom mixin; storage keys
`clan:<id>`, `clan_by_player:<pid>`, `clan_war:<id>` — registered in
ARCHITECTURE-HANDOFF; v2.3.1179: ended `clan_war:` snapshots are swept
48 h after `endTime` on the registry load — they were never deleted
before, one orphan key per war ever declared):

- `clan_create {name, tag, color1, color2, logo}` — server validates
  (name 3-16, tag 1-4 alnum uppercased, unique tag AND name, not already
  clanned), debits 500g on live state, persists, echoes `clan_state`,
  stamps the tag.
- Invites: `clan_invite` keeps relaying (the target's popup already
  works); the server records the pending half (leader-only, clan not
  full, target unclanned). `clan_join_accept {inviter}` is honored only
  against that recorded half (the duel-handshake pattern) — forged
  accepts join nothing.
- `clan_leave` / `clan_kick {target}` (leader-only). Leadership succeeds
  to the oldest member; the last leave dissolves the clan.
- **Authoritative tag**: the server stamps `clanTag`/`clanColor1` from
  the registry into session data at join and on every `track` update —
  and strips them from clanless players. Tag forgery is dead with zero
  rendering changes.

**Wars:**

- `clan_war_declare {defenderTag, zone}` — leader-only, defender must be
  a registered clan, one active war per clan, and the zone must be
  **lawless** (the client's CLAN_WAR_ZONES are exactly the 8 lawless
  zones) — which is why no consent machinery is needed: war kills
  already land through `_resolvePvPAttack`.
- The server BUILDS the war object (30 min, scores, member snapshots)
  and re-emits `clan_war_declare` in the exact shape the client already
  renders. Scoring hooks `_handlePlayerDeath`: only the server's own
  `pvp:<attacker>` causes count, only in the war zone, and **never
  between duelists** (no farming war points in a consensual duel). Each
  kill re-emits the client's existing `clan_war_kill` shape and
  snapshots the war to storage.
- Resolution at `endsAt` on the tick AND lazily on the next wake
  (ARCHITECTURE-HANDOFF rule 12 — no alarms, tick stops when empty).
  `clan_war_end {warId, winner}` (winner = tag, null on draw). Rewards:
  flat gold per member (winner 500 / loser 50; draw pays loser rate to
  both) via `_creditPlayer` opId `clanwar:<warId>:<pid>` — offline
  members get mail. **AP is deliberately not granted** (GDD §27.3
  deleted AP; the client popup text is cosmetic). MVP bonus: deferred
  (handoff backlog).

**War deaths are full deaths** (pile + inventory wipe) — that is the
lawless-zone contract the war zone implies. Extending duel-style no-drop
protection to wars is an owner decision, noted for later.

## Deploy-order safety

`caps.clans` in `state_sync`. Gated legacy client sites: the war-end
self-credit (gameEvents), the kill self-scoring broadcast (gameEvents),
and the create flow's local debit+mint (ClanPanel → sends `clan_create`
instead). `clan_state`/`clan_error`/`clan_war_kill`/`clan_war_end` join
`PRIVILEGED_EVENTS`. **Note:** deny-listing `clan_war_kill/end` breaks
OLD-client peer-scored wars against a new worker — accepted, that relay
was pure forgery surface.

## Wire surface

| Message | Direction | Payload |
|---|---|---|
| `clan_create` | c→s | `{name, tag, color1, color2, logo}` |
| `clan_join_accept` | c→s | `{inviter}` |
| `clan_leave` / `clan_kick` | c→s | `{}` / `{target}` |
| `clan_war_declare` | c→s AND s→c (rebuilt) | in: `{defenderTag, zone}` (legacy `{war}` shape also parsed); out: the client's existing shape |
| `clan_invite` | relay | unchanged (observed server-side) |
| `clan_state` | s→c (private) | `{clan\|null}` — client caches to `S._clanData` + `bt_clan` |
| `clan_error` | s→c (private) | `{text}` |
| `clan_war_kill` / `clan_war_end` | s→c | client's existing shapes |
| `state_sync.caps` | s→c | gains `clans: true` |

## Tests

`server/test/clans.test.mjs` (33 assertions, in `npm test`): creation
economics + validation + persistence, handshake forgery immunity, tag
stamping/stripping, leader-only war declares, lawless-zone requirement,
score-by-server-death only (zone/duel/monster/non-clan exclusions),
endsAt resolution + flat rewards + offline-mail payout + double-resolve
guard, kick/leave/succession/dissolution.
