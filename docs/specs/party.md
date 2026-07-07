# Party Roster — v2.3.1175

Handoff backlog item D, built to its own design note: a party is
**UI + a roster**, nothing more. Server kill credit was already GDD §7
damage-contribution (`xpRecipients`/shares in index.js) and pays co-op
groups today, so this system deliberately touches **no** XP, loot, or
combat math — the share predicates were not re-run because the share
math was not changed. What was missing was the social layer: a named
group with a leader, an invite handshake, and a server-truth member
list every client can render.

Server code: `server/src/party.js` (`partyMethods` mixin — invite/
accept/decline/leave/kick handlers, disconnect/rejoin hooks,
`_tickParties` sweep). Tests: `server/test/party.test.mjs`.
Client: `src/ui/panels/PartyRosterPanel.jsx` (pure renderer),
invite entry point in `InspectPlayerPanel.jsx`, inbound handling in
`gameEvents.js`, nameplate 🎉 marker in `entityRenderer.js`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `party_invite` | `{target}` | Explicit case. Leader-or-solo only; refused codes below. |
| c→s | `party_accept` | `{from}` | Honored only against a live recorded invite (rule 14); forged/expired accepts answered privately, never relayed (rule 15). |
| c→s | `party_decline` | `{from}` | Clears the invite; inviter told via `party_error {code:'declined', who}`. |
| c→s | `party_leave` | — | Leaving leader promotes next-oldest member; a party of two disbands. |
| c→s | `party_kick` | `{target}` | Leader only. |
| s→c | `party_state` | `{id, leader, state, members?, target?}` | Private, to every member on every roster change. `state:'active'` carries `members: [{id, name, level, away, z?}]`; `state:'invited'` is the invite-sent ack; terminal states (`left`/`kicked`/`timeout`/`disbanded`) clear the client frame. |
| s→c | `party_invited` | `{from, fromName, size}` | Private to the target; drives the accept/decline popup. |
| s→c | `party_error` | `{code, who?}` | Private feedback. Codes: `declined`, `busy`, `target-busy`, `full`, `not-leader`, `expired`, `target-gone`. |

All three s→c types are in `PRIVILEGED_EVENTS` (a forged `party_state`
could fake or clear a roster). Capability: `state_sync.caps.party` —
gates the client's invite button and all party UI, so an old worker
(which would relay the unknown c→s types to the whole room) never
receives them.

## Rules (`PARTY` config)

- `MAX_SIZE: 4` — matches the §55.7 dungeon boss-HP scaling table,
  which tops out at 4 present players.
- `INVITE_TTL: 60s` — invites are recorded per-sender-session as
  `'from>to' → ts` and swept on tick.
- `GRACE_MS: 120s` — a disconnected member is shown `away:true`
  (roster keeps their **cached** name/level — `webSocketClose` deletes
  `playerState`, so the wire builder can't read it live) and dropped
  by `_tickParties` only after the window lapses. Rejoin inside the
  window clears the flag; the resulting broadcast doubles as the
  reconnecting client's UI recovery, since parties are memory-only
  and the fresh client has nothing local to restore.

## State shape (in-memory, deploy voids it — rule 11)

- `this._parties`: `Map partyId → {id, leader, createdAt, members:
  [{id, name, level, awayUntil}]}`
- `this._partyByPlayer`: `Map playerId → partyId` (O(1) membership)
- `this._partyInvites`: `Map 'from>to' → ts`

Nothing is escrowed and nothing is persisted: a worker deploy simply
dissolves all parties, and every client's frame clears on its next
`party_state`-less session. This is the backlog's own call ("worthless
on deploy") and rule 7's — no value at rest, no storage keys.

## Validation posture

- Invite: sender alive, target online, self-target dropped, sender is
  leader (or solo — the first accept mints the party with the inviter
  as leader), party under cap, target not already partied (no
  poaching).
- Accept: live un-expired invite recorded from the inviter's own
  connection; accepter not already partied; inviter still online;
  party (if one exists now) still under cap. The accept payload
  carries nothing the server reads beyond `from`.
- Kick: sender is leader, target is a member, not self.
- All failures answer privately (`party_error`); no party half is
  ever relayed through the default branch.

## Client behavior

- `party_state {state:'active'}` → React `party` state + `S._party`
  (read by the entity renderer for the 🎉 nameplate prefix — rides
  the existing `_lastName` change-cache, zero new display objects).
- `state:'invited'` is a toast ONLY — replacing client state on it
  would blow away a leader's live roster when they invite a third.
- Terminal states / `party_error` → toast via `S.dmgNumbers`.
- The roster frame repaints on a 1s heartbeat so member HP (read live
  from `S.others[id].rpgHp/rpgMaxHp`) and zone tags stay honest
  between snapshots; same-zone members show 🟢, elsewhere 🌍 + zone
  name, leader ⭐.
- All party sends are in `PRIORITY_EVENTS` (instant flush, not the
  33ms input batch).

## Successor notes

- Party chat: no channel exists — a `party_chat` relay would need the
  same explicit-case + membership-check posture (do NOT ride the open
  `chat` relay with a client-side filter; that's a forgery surface).
- Dungeon integration: `dungeon.js` scales boss HP by players
  *present in the instance zone* and needs no roster — but a "party
  enters together" teleport button on the frame would be pure client
  sugar over the existing entry flow.
- Contribution-role weighting (the backlog's "optional later") would
  be the first thing to touch §7 share math — re-run its predicates
  if attempted (the danger the backlog flags).
