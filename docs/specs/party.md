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
| `MAX_SIZE` | 4 | matches `dungeon.js PARTY_HP_SCALE`'s 4-slot table |
| `INVITE_TTL` | 60s | invite lifetime (tick-swept) |
| `VITALS_MS` | 2s | roster re-echo cadence (live HP/zone) |
| `OFFLINE_GRACE_MS` | 120s | 'away' window before a dropped member is removed |

## Storage: none, deliberately

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
