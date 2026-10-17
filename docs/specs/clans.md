# Clan Registry + Server-Scored Wars (v2.3.1125) — spec + attach points

> **v2.3.3320: clans are parties now.** Every clan becomes a stored party at
> the first join after that worker's deploy, keeping its name and tag, and no
> new clan can be made, joined or taken to war (`server/src/clanparty.js`,
> docs/specs/alliance.md "Step 3"). What follows is the registry the kill
> switch `clanparty: false` keeps.

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
  `clan_war_end {warId, winner, paid}` (winner = tag, null on draw; `paid`
  since v2.3.3180, below). Rewards: flat gold per member (winner 500 /
  loser 50; draw pays loser rate to both) via `_creditPlayer` opId
  `clanwar:<warId>:<pid>` — offline members get mail. **Since v2.3.3180
  only the members who fought are paid** (next section). **AP is
  deliberately not granted** (GDD §27.3 deleted AP; the client popup text
  is cosmetic). MVP bonus: deferred (handoff backlog).

## A war pays who fought, and a clan rests an hour (v2.3.3180)

A war paid every member of the roster frozen at declare. So a 0–0 war paid
50 to everyone in both clans (two 20-member clans: 2,000 gold every 30
minutes for doing nothing), one staged kill paid all 20 winners 500 (10,000),
and the next war could be declared the moment one ended. Now:

- **Only who fought is paid.** Each war kill puts its killer on their side's
  `fought` list and its victim on theirs (roster members only, so the lists
  are no bigger than the rosters). At the end a roster member is paid only if
  they are on `fought` AND still in the clan — a member **kicked mid-war is
  not paid**, even if they fought. The rates are unchanged (500 / 50, a draw
  50 to both sides' fighters).
- **A 0–0 war pays nobody.**
- **An hour's rest** (`CLANS.WAR_COOLDOWN`): a clan can't declare or be
  declared on until an hour after its last war's end (the scheduled end, so
  a war resolved late on the next wake still counts from when it ended). The
  end is kept as `lastWarEnd` on the `clan:<id>` record.
- `clan_war_end` carries `paid` (the player ids paid); the game shows the
  gold only to them ("No pay: only those who fought are paid" to the rest).
  An older worker sends no list and the game shows the gold to everyone, as
  it paid everyone.
- A war declared before v2.3.3180 has no `fought` lists: it pays its roster
  the old way, once, unless it is 0–0.

What is left for a farmer: each payment needs a real kill in the war zone,
so 500 per staged kill per winning alt, once a war, a war at most every 90
minutes per pair of clans (500 gold each to make).


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

`server/test/clans.test.mjs` (59 assertions, in `npm test`): creation
economics + validation + persistence, handshake forgery immunity, tag
stamping/stripping, leader-only war declares, lawless-zone requirement,
score-by-server-death only (zone/duel/monster/non-clan exclusions),
endsAt resolution + flat rewards + offline-mail payout + double-resolve
guard, kick/leave/succession/dissolution.

v2.3.2301 adds section 9, the wire-driven leave: the command routed
through the real message switch rather than called directly (section 4
calls the handler, so it cannot catch a typo'd `case`), the tag cleared
from `playerState` and session data and every peer's screen, and the
mid-war refusal. Its fixture order matters — the refusal case runs LAST
on its own clan, because when the guard is missing the leave succeeds and
every later "her tag is gone" assertion then passes for the wrong reason,
about a player who is in no clan at all.

v2.3.3175 adds 9.7c-9.7d: **one war roster at a time.** A war pays the
roster it froze at declare, and a kick mid-war (allowed on purpose, for a
griefer) leaves the kicked member on it, clanless and free to join another
clan, whose next declare froze them onto a second war's roster, paid by
both (or onto the other side of the same war). `_handleClanJoinAccept` now
refuses a player who is on any active war's roster ("Cannot join during a
clan war"), the same reason v2.3.2301 refuses leaving mid-war. A kicked
member waits out that war, 30 minutes at most. Found by the overnight
economy review (2026-10-12). Whether a member kicked mid-war should still
be paid by that war is left as it is, an owner call.
