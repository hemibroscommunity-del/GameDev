# Parties — server-authoritative roster + cross-zone vitals HUD

Shipped v2.3.1185 (handoff backlog item D). Server: `server/src/party.js`
(mixin, `partyMethods`). Client: `src/ui/panels/PartyHUD.jsx` (pure
renderer), invite button in `InspectPlayerPanel.jsx`, dispatcher cases in
`src/networking/gameEvents.js`. Tests: `server/test/party.test.mjs`.

## What it is (and deliberately is not)

A social roster: up to 4 players, invite/accept handshake, a HUD strip
showing every member's live HP, level, and zone — even from another zone
(the server re-echoes the roster every ~2s; that cadence is the feature,
since you can't see a partymate's sprite across zones).

It changes **no combat, XP, or loot math**. Item D's charter is explicit:
kill credit is already damage-contribution (GDD §7) and dungeon bosses
already scale by players present (`dungeon.js PARTY_HP_SCALE`, a 4-slot
table — which is where `MAX_SIZE: 4` comes from). The party is the UI
layer those systems were missing.

## Wire surface

| direction | type | payload | notes |
|---|---|---|---|
| c→s | `party_invite` | `{target}` | any member (or partyless player) may invite; errors: `target-gone`, `target-busy`, `full` |
| c→s | `party_accept` | `{target: inviterId}` | honored only against a live invite recorded from the inviter's own session (rule 14); forged/expired accepts are dropped silently (rule 15 posture) |
| c→s | `party_decline` | `{target: inviterId}` | only a real pending invite produces a decline notice (anti popup-spam) |
| c→s | `party_leave` | — | leadership promotes to the oldest remaining member; 1-member party disbands |
| c→s | `party_kick` | `{target}` | leader only |
| s→c | `party_invited` | `{from, fromName, partySize}` | private, PRIVILEGED |
| s→c | `party_state` | `{id, leader, state:'open', members:[{id, name, level, hp, maxHp, zone, away, dead}], joined?/removed?}` or terminal `{state:'none', reason: left\|kicked\|disbanded\|offline}` | private per member, PRIVILEGED; re-echoed every `VITALS_MS` (2s) by the tick |
| s→c | `party_error` | `{reason: declined\|target-busy\|target-gone\|busy\|full, name?}` | private, PRIVILEGED; display-only |

Caps gate: `state_sync.caps.party`. The client shows its invite surface
only under it — an old worker would rebroadcast `party_*` commands as
unknown types instead of validating them.

## Constants (`PARTY` in party.js)

| constant | value | why |
|---|---|---|
| `MAX_SIZE` | 4 | matches `dungeon.js PARTY_HP_SCALE`'s 4-slot table (v2.3.3284: the cap under `partykeep: false`; `KEEP_MAX` 50 otherwise, and a dungeon still takes four) |
| `INVITE_TTL` | 60s | invite lifetime (tick-swept) |
| `VITALS_MS` | 2s | roster re-echo cadence (live HP/zone) |
| `OFFLINE_GRACE_MS` | 120s | 'away' window before a dropped member is removed |

Client mirror: `PARTY_INVITE_TTL_MS` in `src/networking/gameEvents.js`
(v2.3.1970) must track `INVITE_TTL`; a shorter client clock would hide a
still-valid invite.

## Storage: none, deliberately (until v2.3.3284)

**Since v2.3.3284 a party is stored and lasts** -- see "A party that lasts"
below; what follows is the party of four in memory, which the kill switch
`partykeep: false` puts back.

A party holds no escrowed value, so per handoff rule 11 in-memory is the
correct tier — a worker deploy wipes rosters and loses nothing but a
re-invite. Ghost-HUD prevention is a two-sided contract:

- The client clears its party state on **every `state_sync`**
  (`wsClient.js`) — a deploy or room hop can have wiped the roster.
- The join path calls `_partyOnRejoin` **after** the `state_sync` send
  (`join.js`; ordering is load-bearing and pinned by a test), so a
  roster that survived pops straight back.

All five handlers are synchronous (no storage awaits), so there is no
input-gate interleaving to reason about at all.

## Lifecycle details

- **Disconnect** (`_partyOnDisconnect`, from `webSocketClose`): member is
  marked `awaySince` and shown greyed-out `away:true` — NOT removed (iOS
  tab suspends and deploy bounces are routine; the duel-grace lesson).
  The tick sweep removes them after `OFFLINE_GRACE_MS`, reason
  `offline`.
- **Removal core** (`_partyRemoveMember`) is shared by leave/kick/grace
  expiry: removed player gets terminal `party_state {state:'none'}`;
  leader removal promotes `members[0]` (oldest); a party left with one
  member disbands (a solo "party" is just a player).
- **Capacity is checked at accept too** — the invite's snapshot is not
  authoritative; a party can fill between invite and accept.
- **The invite CARD expires on the client too (v2.3.1970).** The worker
  forgets a recorded invite after `INVITE_TTL` and answers a late Join
  with `party_error {reason:'expired'}`, but the card carried a `ts` that
  nothing read — an invite nobody answered sat on screen for the rest of
  the session. Since v2.3.1966 that card is portalled to `document.body`
  above the dashboard on purpose, so a dead one parks a 240px panel over
  the top of a 390px phone. `gameEvents.js` now clears the stub after
  `PARTY_INVITE_TTL_MS` (mirrors `INVITE_TTL`), using the functional
  setter plus a `{from, ts}` identity check so a newer invite — or the
  roster, which shares the same state slot — is never swept away by an
  older invite's timer.

## Client anchors

- `PartyHUD.jsx` renders BOTH the incoming-invite card (accept sends
  `party_accept`) and the persistent roster strip (top-left, under the
  top bar; WarBanner owns top-center). Not to be confused with the
  tavern's `panels/buildings/PartyPanel.jsx` — that name was already
  taken by the arena spectator-betting UI; the tavern building's own
  label ("Form parties") is the promise this component keeps.
- Commands ride the channelShim PRIORITY_EVENTS lane (no 33ms batch
  delay on invite/accept clicks).

## Party chat — SHIPPED v2.3.1212

A party-scoped chat channel. Per the handoff note it is its **own
validated relay case** (rule 13), never the default room-wide
rebroadcast:

| direction | type | payload | notes |
|---|---|---|---|
| c→s | `party_chat` | `{text}` | `_handlePartyChat` (party.js): sender must be in a party (else dropped); `text` is control-stripped + clamped to `PARTY.CHAT_MAX` (200) + trimmed; relayed to that party's members only |
| s→c | `party_chat` | `{from, fromName, text, ts}` | PRIVILEGED; `from`/`fromName` are the SERVER's identity for the sender — a client-supplied `from` is ignored, so the origin can't be forged |

- **Client** (`src/game/chat.js`): typing `/p <msg>` in the normal chat
  input routes to party chat (a local hint if you're not in a party);
  incoming lines render in the shared chat log tagged with a 🛡 + party
  green, honoring the same block/mute lists as room chat. Own messages
  are echoed optimistically and de-duped on `from === myId`.
- Rides the `party_*` PRIORITY_EVENTS lane (no batch delay). Gated on
  its **own narrow `caps.partyChat`** (rule 19 / TRAPS #9), NOT
  `caps.party`: a worker that has parties (v2.3.1185) but predates
  party_chat (≤v2.3.1211) would fall through to the **room-wide
  rebroadcast** and leak the line — so the client sends `/p` only when
  `caps.partyChat` is advertised, and otherwise keeps the message local
  with a hint (never leaks it). No storage (ephemeral, rule 11).

## Successor follow-ups

- Party member map markers / off-screen direction arrows (the vitals
  echo already carries `zone`; x/y could ride it for a same-zone
  arrow).
- "Enter dungeon as party" flow: a leader-initiated `dungeon_start`
  that teleports members in together (today everyone walks in).
- Contribution-role weighting (item D's "optional later"; touching the
  §7 share math needs its predicates re-run — see the danger note).
- Contribution-role weighting (item D's "optional later"; touching the
  §7 share math needs its predicates re-run — see the danger note).

## A party that lasts (v2.3.3284) — step 1 of the party → alliance plan

**Step 2 shipped v2.3.3310**: a party of 20 active members is an ALLIANCE --
a name and a tag on every member, wars in No man's land, a board
(docs/specs/alliance.md). A record that has been one is shape `v: 2`.

The owner, on clans: *"I think I'd rather skip clans altogether and just go
from party to alliances. Maybe it just gets called "party" that stays
persistent until you remove yourself from the party and it becomes
"alliance" at 20+ people which opens up the new features you're talking
about"*, then *"Go recommended"* to the plan's five recommendations:

1. only ACTIVE members count toward 20 (played in the last 7 days, level 5+);
2. it becomes an alliance at 20 and stays one until it drops below 15;
3. dungeons stay 4 at a time: the 4 nearest the entrance go in together;
4. the party window shows about 6 members, online first, then nearest;
5. existing clans become parties with the same members and keep their tag.

The build order: **1. the party lasts and grows** (this section), 2. the
alliance at 20+ (tag, wars, leaderboard), 3. clans retire into it.

### What changes

- **Kept by the server.** A party is stored (`party:<partyId>`, with
  `party_by_player:<pid>` naming each member's party): it outlives a
  logout, a reconnect and a worker deploy. You stay in it until you leave,
  or the leader removes you. An offline member is no longer removed after
  `OFFLINE_GRACE_MS`; they stay on the roster, shown offline with when they
  were last on (`off: 1`, `seen` seconds ago).
- **Bigger.** Up to `PARTY.KEEP_MAX` (50). The roster each member is sent
  carries `max`.
- **The leader.** Leaving passes it to the member who has been in longest
  (as before). A leader not seen for `PARTY.LEADER_IDLE_MS` (7 days) hands it
  on at the next join of a member: to the longest-standing member online
  then. Lazy, never on a timer (handoff rule 12).
- **Dungeons stay 4.** A leader's `dungeon_start` pulls at most
  `DUNGEONS.PARTY_HP_SCALE.length - 1` (3) members, the eligible ones
  nearest the leader (`_dungeonPullPartyMembers`): the boss table is sized
  for 4.
- **The window shows 6.** The party strip (PartyHUD.jsx) shows you, then the
  members online nearest you, then the rest online, then the offline ones
  most recently seen first, at most `PARTY_ROWS` 6 rows and "+N more"; the
  Saloon's window lists everyone. Leaving takes two taps now (you stay until
  you leave, so a stray tap must not drop you).

### Storage

| key | value |
|---|---|
| `party:<partyId>` | `{v, id, leader, members: [pid, oldest first], meta: {pid: {name, level, at, seen}}, ts}` |
| `party_by_player:<pid>` | the partyId: the member's own word for which party they are in |

- **Written only when the roster changes** (a join, a leave, a kick, a new
  leader, a disband) and at a member's join when their `seen` is older than
  `PARTY.SEEN_WRITE_MS` (6 h) or their level or name changed: no write on a
  move, a vital or a reconnect storm (cost-guard). Fire-and-forget (handoff
  rule 10).
- **Read at a join**, after state_sync as before: the member's index, then
  the record if no member of it has loaded it yet; one record in memory per
  party (`_parties`, `_partyByPlayer` index every member, online or not).
  A record whose `v` is newer than `PARTY.V` is left whole and untouched; a
  record that does not list its reader drops the reader's index.
- **A failed read fails closed** (`session._partyUnknown`): that session can
  neither accept nor send invites ("Party not loaded") until it rejoins, so a
  lost read can never put a player in two parties.
- **A character restart** (`_resetCharacterData`) leaves the party.

### Deploy order and the switch

- `caps.partykeep` tells the game parties last and how big they get; an
  older game shows offline members as "away" and every member in its strip.
- Kill switch `partykeep: false`: parties are as before v2.3.3284 for
  everything after it — in memory only, 4 at most for a new member, an
  offline member removed after the grace — and nothing is read or written.
  Records stored before stay as they were and are read again when it is
  turned back on.
