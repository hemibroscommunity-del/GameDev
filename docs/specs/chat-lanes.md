# Chat lanes — @area and @user

Shipped v2.3.2136, from demo feedback: per-channel chat, `@user` / `@area` /
`@all`. Server: `server/src/chatlanes.js` (mixin, `chatLaneMethods`). Client:
`src/game/chat.js` (send + receive bodies), dispatcher cases in
`src/networking/gameEvents.js`, priority forwarding in
`src/networking/wsClient.js`. Tests: `server/test/chatlanes.test.mjs`.

## What already existed, and what this adds

The game had three text lanes before this and was missing two:

| lane | how you reach it | where it lives | added here? |
|---|---|---|---|
| `@all` — the whole room | type normally | default-branch relay, `index.js` (`CHAT_RELAY`) | no, untouched |
| party | `/p <msg>` | `party.js` (v2.3.1212) | no |
| friend DM | the friends panel | `friends.js` (v2.3.1323) | no |
| **`@area` — this zone only** | `/a <msg>` | **`chatlanes.js`** | **yes** |
| **`@user` — one player** | `/w <name> <msg>` | **`chatlanes.js`** | **yes** |

`@area` is the notable gap: `index.js`'s own note calls room chat *"the ONE
relay v2.3.1575's interest management deliberately did not zone-scope"*, so
there was no way to talk to just the people standing near you. `@user` fills
the other one — `friend_dm` requires an accepted friendship, so a stranger
could not be answered privately.

## Wire surface

| direction | type | payload | notes |
|---|---|---|---|
| c→s | `area_chat` | `{text}` | delivered to every session whose `playerState.z` matches the sender's; no zone ⇒ dropped, never widened to the room |
| c→s | `whisper` | `{to, text}` | `to` is a **display name**, resolved case-insensitively against live sessions |
| s→c | `area_chat` | `{from, fromName, zone, text, ts}` | PRIVILEGED; `from`/`fromName` stamped from the session |
| s→c | `whisper` | `{from, fromName, to, toName, text, ts}` | PRIVILEGED; sent to the one target only |
| s→c | `whisper_error` | `{reason: no-such-player\|ambiguous, to, count?}` | PRIVILEGED; returned to the sender only |

Caps gate: `state_sync.caps.areaChat` and `state_sync.caps.whisper` — two
**narrow** flags, not one shared one. The client sends `/a` and `/w` only
under the matching flag. This is the load-bearing half of the deploy-order
argument: an older worker has no case for either type, so the shim's
broadcast path would hand it to the default branch, which **rebroadcasts
unknown types to the whole room**. For `/a` that turns a quiet lane loud; for
`/w` it publishes a private line to everybody. When the flag is absent the
client sends nothing and says so in the chat log, exactly as `/p` does
(rule 19 / TRAPS #9).

## Constants (`CHAT_LANES` in chatlanes.js)

| constant | value | why |
|---|---|---|
| `TEXT_MAX` | 200 | matches `CHAT_RELAY.TEXT_MAX` and `PARTY.CHAT_MAX` — one line looks the same in every lane |
| `NAME_MAX` | 24 | the longest whisper target name that will be looked up |
| `BURST` | 6 | messages a sender may send back-to-back |
| `REFILL_MS` | 1500 | one token back every this often |

## Why the rate limit is in this module

Room chat rides the **default** branch, which owns the relay token bucket
("8 burst + 4/s absorbs a human hammering chat"). An **explicit** case in the
router switch never reaches it. That is not a theory — it is the hole
v2.3.1970 found in `party_invite`, whose note reads: *"party_invite is an
EXPLICIT case in the router switch, so the default branch's relay token
bucket never sees it, and there is no global inbound rate limit."* Both
lanes here are explicit cases and a whisper is a targeted lane pointed at one
person's screen, so the module carries its own bucket rather than repeating
that incident. One bucket per sender, **shared** by both lanes, so alternating
between them does not buy a fresh allowance.

## Safety properties

- **Sender identity is server-stamped.** The v2.3.1150 note on the room relay
  records that a client can forge `payload.id` / `payload.name` there. These
  lanes take `from` from the session, so it cannot be forged.
- **Payloads are rebuilt from an allowlist**, not filtered in place, so a
  field somebody adds to the send later is dropped rather than trusted
  (rule 16 / TRAPS #13).
- **Clamp before trim.** Raw length is clamped first, then control characters
  stripped, then trimmed — the order `party.js` settled on so a padded string
  cannot smuggle a long line.
- **An ambiguous whisper target is refused, not guessed.** Names are not
  unique in this game; delivering a private line to the wrong person is worse
  than not delivering it.
- **Mute is per-recipient** (`chatmod.js`), applied before the send rather
  than after. A muted **whisper** is silent to the sender on purpose — telling
  them would confirm to a harasser that they had reached someone.
- **Nothing is stored.** Chat is ephemeral (rule 11); the rate-limit buckets
  are in memory and a deploy wipes them (rule 12), which is correct.
- **No overhead bubble for a whisper**, at either end. The bubble is drawn
  above the speaker for everyone nearby to read, so bubbling a whisper would
  publish the line the player chose to say privately.

## What is deliberately not here

- ~~**No channel picker UI.**~~ **Shipped v2.3.2139** — and it moved no wire
  surface, exactly as this section predicted. `src/game/chatChannel.js` holds
  the selected lane and one `compose()` that turns "lane + what was typed"
  into the same line a player could have typed by hand; the chips
  (`src/ui/mobile/ChatChannelChips.jsx`) only set a mode. Slash commands are
  untouched and an explicitly typed one still wins.

  Three things about it are load-bearing rather than cosmetic:

  - **`compose()` is applied inside `sendChatMessage`, not by the composers.**
    There are two composers (the legacy `ChatPanel` and the mobile
    `ChatBubble` textarea), and applying it in the UI would have meant two
    call sites. Two call sites is precisely how `/p` once went out over the
    ROOM relay from the mobile composer. That is also why the module lives in
    `game/` rather than beside the chips.
  - **A lane whose cap is absent is not offered at all.** Against an older
    worker the picker is just the All chip — a selector that can choose a
    lane the server would rebroadcast is the failure this is shaped to avoid.
  - **Whisper is never persisted.** The two mistakes are not symmetric:
    thinking you are in All when you are in Whisper costs a line going to one
    person; thinking you are in Whisper when you are in All publishes to the
    world something you chose to say privately. The remembered value is lossy
    in the safe direction. A whisper with nobody named is **refused**, never
    downgraded to the room.

  Covered by `tools/qa/mp/mp-chatpicker.mjs`, which checks the received end
  rather than the sender's own log.
- **No history or backlog.** Unlike `friend_dm`, a whisper to an offline
  player is refused (`no-such-player`) rather than queued. Offline delivery is
  the friends system's job and it already does it.
