# Emotes you can see (v2.3.3391)

Phase 0 of the fun & social plan (docs/FUN-SOCIAL-PLAN.md). The owner: "Go
recommended".

## What was wrong

The game has had 30 emoji and 12 quick lines since the prototype
(`EMOTES` / `TEXT_EMOTES`, src/data/gameDisplay.js), and none of it worked:

- **No way in.** The picker's only button was the 😀 in the bottom toolbar,
  and that toolbar has been `display: none` since v14 (MenuBar.jsx).
- **Nothing drawn.** A sent emote played a beep for you and a two-tone chirp
  for players in your zone, and stamped `S.emote` / `other.emote`, which no
  renderer read.
- **Sent twice.** Each button acted on React's `onTouchStart` and on
  `onMouseDown`. React's touchstart is passive, so its `preventDefault` did
  nothing and a real finger sent the emote twice (TRAPS §131).
- **Any string.** The worker relayed `emoji` as whatever the phone sent, up to
  the 16 KB frame gate. That was harmless while nothing drew it. Once it is
  drawn, it would be free text over a head, past everything the chat does to a
  line.

## What happens now

| | |
|---|---|
| Open the picker | Tap your bro to open the chat box, then the smiley (`data-chat-emotes`). On a keyboard, B toggles it. 1-3 already pick weapons, so the plan's "1-8 for emotes" was not possible. |
| Pick an emoji | It pops over your head for the players near you: in from small with a little overshoot and a wobble, rising a few px, gone in 2.6 s. It is 30 CSS px on any screen, twice the chat's 14 px, and sits just over the name band, or over your speech bubble when one is up. |
| Pick a quick line | "GG", "Bruh", "67"... is your speech bubble, as a typed line is (5 s). |
| Limits | One emote a second from a phone. The relay allowance it spends (8 at once, 4 a second) is the same one your swings and arrows spend. |
| Who sees it | The players near you: an emote is a placed event (eventplace.js), heard within 2,800 px in the Wheel and in your zone elsewhere. |
| Muted or blocked | A muted player's emote never reaches you (the worker drops it per recipient). A blocked one is not drawn: both shapes of the block list count, plain ids and the friends list's `{id, name}`. |
| The chirp | It carries as far as a hit does (hitSounds.js `earVol`: full within 220 px, nothing past 1,150). It used to ring at full volume from anywhere in your zone, which in the Wheel is everywhere. |

## The wire

No new message. `emote` is the same phone relay as before (relay.js
`RELAY.TYPES`), now checked:

| field | before | now |
|---|---|---|
| `payload.emoji` | any string | one of the 42 listed emotes, byte for byte (several carry U+FE0F) |
| the rest of `payload` | passed through, in the sender's name | dropped: the relay is exactly `{id, emoji}` |
| delivery | the whole room | placed: the phones near the sender (eventplace.js `RELAY_PLACED`) |

The worker's list is `EMOTE` in server/src/emotes.js. mirror-audit holds it
equal to the phone's lists. The phone draws only listed emotes too
(src/game/emotes.js `emoteKind`), so either side may deploy first.

## Switches

- `emotes: false` in the live flags: the worker relays no emote, and a phone
  that joins is told `caps.emotes: false`, which takes the chat box's smiley
  away and makes B do nothing.
- `eventplace: false` sends emotes (and every placed event) to the whole room
  again.

## Files

- `src/game/emotes.js`: `emoteKind`, `emotesLive`, `EMOTE_POP_MS`,
  `EMOTE_COOLDOWN_MS`.
- `src/game/interactions.js` `sendEmote`: listed only, one a second; a quick
  line also sets your bubble.
- `src/game/chat.js` `handleEmoteEvent`: listed only, not from a blocked or
  muted player, the chirp by distance; a quick line also sets the speaker's
  bubble.
- `src/rendering/systems/effectsRenderer.js` `_updateEmotePops`: the pop.
  Each one is destroyed the frame it ends (TRAPS §192). The probe is
  `window.__btEmotePops` (id to {emoji, x, y, alpha, screenPx, band,
  overBubble}).
- `src/ui/panels/EmotePanel.jsx`: the picker. Buttons act on `click`, there is
  a close button, and a tap in the play area closes it.
- `src/ui/mobile/ChatBubble.jsx`: the smiley.
- `src/game/desktopControls.js`: B. `KeyboardHintsPanel.jsx` lists it.
- `src/ui/BroTown.jsx`: `__broLegacyUI.emotes` / `emotesOpen`.
- `server/src/emotes.js`: `EMOTE`, `emoteListed`, `_sanitizeEmoteRelay`,
  `_emotesOff`.
- `server/src/eventplace.js`: `'emote'` placed.
- `server/src/join.js`: `caps.emotes`.

## Tests

- `server/test/emotes.test.mjs` (46): listed emotes relay as exactly
  `{id, emoji}` in the sender's name; anything else relays nothing; the kill
  switch and the cap; through the tick in the Wheel, a near phone hears it and
  a far phone, a phone in today's town and a muter do not.
- `server/test/mirror-audit.test.mjs`: the two lists are equal.
- `server/test/event-place.test.mjs` 1i2: an emote is placed where the room
  has its sender.
- `server/test/relay.test.mjs`, `chatmod`, `feedback`, `quiet-phone`: their
  generic relays use a listed emoji or another relay type now.
- `tools/qa/mp/mp-emotes.mjs`: two phones with real finger taps. One tap
  sends one emote; the emoji shows over your head on both screens and is gone
  after 2.6 s; a quick line shows as a bubble; an unlisted relay draws
  nothing; there is a one-a-second limit; a block from the friends list hides
  it; B works; the kill switch hides the smiley.

## The chat's three fixes

Found by the same check and fixed in the same change, because they are in the
same chat code:

| | before | now |
|---|---|---|
| Block | `bt_blocked` holds plain ids (inspect card, old Social panel) or `{id, name}` (the dashboard's friends list), but every reader asked `includes(id)`. A block made from the friends list hid nothing, and the old Social panel threw on one (`bid.slice`). | One reading of both shapes (src/game/chatMute.js `blockedIdOf`, `readBlockedIds`, `isBlockedId`), used by the four chat handlers, emotes, the inspect card and the old Social panel. The lists already on phones stay as they are. The popup no longer says "no interactions": it says "Blocked: their chat and emotes are hidden", which is what a block does. Stopping trades and duel challenges too is Phase 4's server-side block (since v2.3.3490 the phone drops a blocked player's duel, trade and party requests itself: gameEvents.js). |
| A name with a lane's mark | The feed reads the lane off the front of the name (`chatLaneOf`), so a player named "✉ Mayor" had every room line drawn as a whisper ("📍" as area, "🛡" as party). | The marks come off the front of a sender's name on the worker (index.js `stripChatLaneMarks`) and on the phone (smallIcons.js `stripLaneMarks`), so either side can deploy first. |
| The name colour | Any string up to 32 characters; "transparent" made a name invisible in everyone's feed. | The worker keeps a `#rgb` / `#rrggbb` or nothing (index.js `CHAT_COLOR_RE`). The phone draws a hex that reads on the feed (src/game/chatColor.js, 3:1 against its dark surface), lifting one that is too dark toward white. All 16 `PLAYER_COLORS` are drawn unchanged. |

Tests: `server/test/chat-fixes.test.mjs` (29) for the phone's helpers and that
the worker and phone strip the same marks; `anticheat.test.mjs` for the
relay's colour and name.

## Next

Phase 1 of the plan moves the whole bro in code: wave, laugh, flex, sit,
dances. The emote wheel replaces this picker, and held poses (sit, sleep, a
dance) become state the worker keeps on the player, not messages.
