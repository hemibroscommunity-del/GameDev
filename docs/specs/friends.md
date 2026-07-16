# Friends — mutual friendships, requests, direct messages

Shipped v2.3.1323 (`server/src/friends.js`, mixin per handoff rule 22).
Suite: `server/test/friends.test.mjs`.

## Why

Friends were a one-directional localStorage list per client
(`bt_friends`, written by InspectPlayerPanel) — no consent, no
cross-device persistence, no messaging. The ChatGPT Friends review
(2026-07-15) asked for a Requests tab, direct messages, and unread
badges; all three need friendship to be a server fact.

## Storage

| Key | Value |
|---|---|
| `friends:<pid>` | `{list, reqIn, reqOut}` — each an id-keyed map of `{name, since\|at}` |
| `friend_msg:<pid>` | `[{from, fromName, text, ts}]` offline DM backlog, capped 50 (oldest dropped), deleted after join delivery |

Docs load into **null-proto maps** (rule H — pids are client-supplied
keys). No value escrow, so no opIds: every mutation is a plain state
change re-synced to both parties.

## Wire surface

Client → server (own validated cases in the router, never rebroadcast):

| Type | Payload | Behavior |
|---|---|---|
| `friend_request` | `{target, name?}` | Validates target is a real player (online or has `rpg:` blob). Duplicate = idempotent no-op; crossing requests auto-accept; caps: 25 outgoing, 100 friends. `name` is display-only for the REQUESTER's own reqOut row (clamped/stripped); the target always sees the server's identity for the sender. |
| `friend_accept` | `{from}` | Honored only against a stored `reqIn` from that player (rule 14); forged accepts drop silently (rule 15). Forms the mutual edge, clears both request sides. |
| `friend_decline` | `{from}` | Clears both request sides. Deliberately NO notification to the requester (declining is private). |
| `friend_remove` | `{fid}` | Removes both edge halves. |
| `friend_dm` | `{to, text}` | Friend-gated (sender's own list checked). party_chat text hygiene: raw-length clamp 280 → control-strip → trim. Online → live event; offline → backlog. |

Server → client (all in `PRIVILEGED_EVENTS`):

| Type | Payload | When |
|---|---|---|
| `friend_sync` | `{list, reqIn, reqOut}` | On join and after every mutation, to each affected online party |
| `friend_request_in` | `{from, fromName, at}` | Live notification to an online target |
| `friend_accepted` | `{by, byName, at}` | To the original requester when accepted |
| `friend_error` | `{reason, target?}` | `not-found`, `already-friends`, `too-many-requests`, `target-full`, `not-friends` |
| `friend_dm` | `{from, fromName, text, ts}` | Live delivery; sender is server-stamped (unforgeable) |
| `friend_dm_backlog` | `{messages: [...]}` | On join when offline DMs are waiting; storage cleared after send |

## Deploy-order (rule 19)

`state_sync.caps.friends` gates every client server-flow. Old client +
new worker: the localStorage list keeps working (client never sends
friend_*). New client + old worker: no caps flag → client stays on the
legacy local list; the five friend_* sends are never emitted.

Client merge posture: with `caps.friends` the client displays the
UNION of the server list and the legacy local list (presence works for
both via `S.others`); a one-time migration sends `friend_request` for
each legacy entry (localStorage `bt_friendsMigrated` stamp) so old
one-way follows graduate to mutual edges when the other side accepts.

## Presence / away (client-only, no server surface)

Online/away/offline all derive from existing channels: `S.others`
membership (whole-room, ≥1Hz ticks) with a 20s grace, and an `aw` flag
on the 2s `track` cosmetics relay (set after 2min without input;
peers receive it via the existing `player_update` Object.assign). The
server never interprets `aw`.

## Dangers

- The DM backlog is delivered-once then deleted; the client persists
  threads locally (`bt_dm:<fid>`). Do not re-deliver from storage.
- `friend_request` does a storage read for offline targets — keep it
  behind the join gate (it is; `session.id` required).
- Never notify on decline; silent-drop forged accepts (no oracle).
