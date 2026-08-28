# Chat moderation — persistent mute + abuse reports

Shipped v2.3.1981 (`server/src/chatmod.js`, mixin per handoff rule 22).
Suite: `server/test/chatmod.test.mjs`. Client: `src/game/chatMute.js`.

## Why

Muting and blocking were a **localStorage array** (`bt_muted` /
`bt_blocked`, read by `src/game/chat.js`). Three consequences, all of
them wrong for a public demo:

1. **The mute did not follow the player.** Mute a harasser on your
   phone, meet them unmuted on a laptop or after clearing site data.
   Identity has been durable since v2.3.1116 (stable `bp_` ids,
   `identity.md`) — the mute was the last piece still living in a
   browser.
2. **The line still arrived.** Filtering happened after the worker had
   already fanned the message out, so "mute" meant the abuse was
   rendered as `[muted]` rather than not delivered. Anything a client
   chooses to hide, a modified client chooses to show.
3. **There was no report path at all.** The operator had no record of
   who said what — only whatever a player thought to screenshot.

## Storage

| Key | Value |
|---|---|
| `chat_mute:<pid>` | `{list: {mutedId: {name, at}}, at}` — the muter's own list. Loaded into a **null-proto** map + a `Set` on join (rule H: pids are client-supplied keys). |
| `chat_report:<id>` | `{at, reason, by, byName, target, targetName, zone, targetOnline, lines}`. `id` is `<base36 ms>-<random>`. Pruned past `CHATMOD.RETAIN_MS` (30 d) on the admin read (rule 12 — no alarms, so retention resolves lazily). |

No coins or items move, so no opIds (rule 5 is about settlement); every
mutation is a last-write state change that re-syncs the muter's own doc.

**In memory only, deliberately** (rule 11 — a deploy wipe must lose
nothing of value): the mute `Set`s (join reloads them), the per-speaker
line ring (a wipe costs at most the last few lines of context; the
reports themselves are durable), and the report rate-limit counters (a
wipe hands a reporter a fresh budget — the cheapest possible thing to
lose, and nobody can force a deploy to get it).

## Enforcement — where the drop happens

A mute is applied **per recipient at fan-out**, never at production:

| Lane | Site | Note |
|---|---|---|
| Room chat / emote | `tick.js`, the batched `events` fan-out | This is the one relay family interest management deliberately does **not** zone-scope (v2.3.1575): one `eventBuffer` push serves every socket, so the filter can only live at the send loop. |
| Party chat | `party.js` `_handlePartyChat` member loop | Already per-recipient. |
| Friend DM | `friends.js` `_handleFriendDm` | Dropped, **not** backlogged — a mute that still filled your inbox for the next login is a mute in name only. |

`MUTABLE_RELAY_TYPES` is `{chat, emote}` and nothing else. Mute is a
chat control; block is an interaction control. Silently dropping a muted
player's trade/duel/threat halves would turn one into the other and
break handshakes mid-flight. The speaker is read from the
**server-stamped `msg.from`**, never `payload.id`.

**Serialization cost.** The tick's group cache key gains a mute suffix
that is `''` for everyone who mutes nobody who spoke this tick — i.e.
almost every session, every tick — so the "serialize once per (zone,
protocolVersion), send many" property is unchanged. Two players who mute
the same flooder share one serialization, because the key names the
intersection rather than the session.

## The report's evidence is the server's copy

`_chatModRemember` records each line **as the sanitiser finished with
it** (`_sanitizeChatRelay` in `index.js`, `_handlePartyChat`,
`_handleFriendDm`): clamped, control-stripped, sender stamped from the
session. A report attaches the last `CONTEXT_LINES` (3) of those, no
older than `CONTEXT_AGE_MS` (15 min).

The report message therefore carries only **who** and **why** — a
client-supplied `text` / `lines` / `byName` is ignored outright (rule
16). A report cannot be used to plant words in somebody else's mouth,
which is the failure mode that makes a naive report button worse than
none.

## Wire surface

Client → server (own validated cases in the router; **neither
rebroadcasts** — a mute is private, and a report must never be visible
to the person reported):

| Type | Payload | Behavior |
|---|---|---|
| `chat_mute` | `{target, on, name?}` | Adds/removes one id. Self-mute, non-string and >`ID_MAX` (64) ids drop. Cap `MUTE_MAX` (200) answers `chat_mute_list` with `error:'list-full'` instead of growing. `name` is display-only for the muter's own list row, clamped/stripped — it is used only when the target is offline (the friends `reqOut` precedent) and never enters a report. |
| `chat_report` | `{target, reason?}` | Target must be a real player (online, or has an `rpg:` blob). `reason` is clamped to `REPORT_REASONS` (`spam`, `abuse`, `harassment`, `cheating`, `other`) — an **allowlist**, not free text, because free text from a client is a place to put a slur, a URL or 16 KB of padding. Rate-limited per reporter: `REPORT_DUP_MS` 60 s on the same target, `REPORT_PER_HOUR` 5, `REPORT_PER_DAY` 20. |

Server → client (both in `PRIVILEGED_EVENTS`):

| Type | Payload | When |
|---|---|---|
| `chat_mute_list` | `{list: [{id, name, at}], settled: true, error?}` | On join and after every mutation. A forged one could paint (or silently empty) a mute list in the UI while the server enforced something else — the most confusing possible failure for a safety control. |
| `chat_report_ack` | `{ok, id?, lines?, error?, settled?}` | Answer to one report. `error` ∈ `bad-target`, `not-found`, `duplicate`, `rate-hour`, `rate-day`. A forged one would tell a harassed player their report was filed when nothing was written. |

## Operator surface

Mounted under the existing owner-keyed admin API (`admin.md`: Bearer
`ADMIN_KEY`, fail-closed 404 when unconfigured), so it inherits the auth
and the `admin_log` rather than growing a second secret.

| Route | Behavior |
|---|---|
| `GET /api/admin/reports?limit=&target=` | Newest first, `limit` clamped to `ADMIN_LIST_MAX` (200). `target` matches either side of a report. Prunes anything past `RETAIN_MS` and reports how many. Each row carries its storage `key`. |
| `DELETE /api/admin/reports?id=` | Dismiss one handled report (id with or without the `chat_report:` prefix). Logged to `admin_log`. |

No moderation UI is claimed: the operator acts with the levers that
already exist (`/freeze`, `/kick`, `/player`).

## Deploy-order (rule 19)

`state_sync.caps.chatMute` gates **every** client send and the report
button's existence.

- **New client + old worker.** The flag is absent, so nothing is sent —
  and this matters more than usual: an old worker has no case for
  `chat_mute`, so it would fall through to the default branch and
  **rebroadcast it to the room**, i.e. muting somebody would announce to
  everyone that you had muted them. The localStorage list and the
  `[muted]` rendering in `chat.js` keep doing exactly what they always
  did.
- **Old client + new worker.** It never mutes server-side; its local
  list still filters. Harmless.
- **The local filter in `chat.js` is FALLBACK, not dead code.** Deleting
  it as "the server does this now" would silently un-mute every player
  on any worker that predates the flag. Muting is one of the few
  controls where failing open is a harm rather than an inconvenience.

## Client

`src/game/chatMute.js` owns the localStorage mirror (`bt_muted`), which
is simultaneously the legacy fallback and what the existing UI reads
(`mutedList` in `BroTown.jsx`, the Social panel's Muted list, the
inspect card's Mute button). `chat_mute_list` from the worker **replaces**
that mirror and republishes it to subscribers, so a mute made on a phone
is visibly in force on a laptop.

One-time migration (`bt_mutesMigrated`, the `bt_friendsMigrated`
precedent): mutes made before this browser ever met a chatMute-capable
worker are pushed up once, after which the server's list is the truth —
which is what makes an unmute performed on one device stick on another.

UI: `InspectPlayerPanel` (Mute/Unmute, and a two-tap Report row —
opening it shows the four reason chips; a one-tap report beside Mute
would be mis-fired constantly on a 390 px phone, and the reason is what
makes the record actionable). `SocialPanel` lists who you have muted and
unmutes server-side.
