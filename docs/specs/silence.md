# The owner's silence, and a freeze that holds the device (v2.3.5621, card MOD PR 1)

The red team (2026-11-14, RT-3 S1: `docs/security/rt3-findings.md`, proof
`t4-ban.mjs`): the owner could kick and freeze one character, nothing else.
There was no silence: a troll could only be put out of the game. A frozen
player was back in a second, because a new character on the same phone was
let in (the account check, Turnstile, is off). The About panel promises
"Harassment, hate and spam get muted or removed".

## A silence

- `silenced:<pid>` `{until, note, at}`: the character's words reach nobody
  until `until` (`0`: until lifted). Not a mute (`chatmod.js`, one player's
  own list): the owner's, for everyone. The room's export gives it with the
  character's other records, beside `frozen:` (`admin.js` `EXPORT.ALLOW`).
- **Which words**: the chat lanes, the wire table's rows whose trust has
  `text: 'words'`: room chat, area, whisper, party, a friend's message, a
  shop thread (`SILENCE_LANES`, made from the table, so a new lane is
  covered by its row; the page's shim sends a relayed event as its own type).
  Never every `speaks` row (card K, 2026-11-15: that is 39, `join`, `track`,
  a trade and a duel among them): a silenced character still logs in, moves,
  trades, invites, duels and emotes. v2.3.5625: `SILENCE_LANES` is card K's
  `CHAT_LANE_TYPES` (`wire/lists.js`, the one reader of the table).
- **Words outside the lanes** (v2.3.5625, card MOD PR 5; the sitting 19
  review's low): a name other players read (`pet_name`, `alliance_name`,
  `clan_create`, `clan_invite`: `SILENCE_WORDS`) and an emote's quick line
  ("GG", "EZ", "RIP": `EMOTE.LINES`) are dropped too; its emoji and moves go
  on. Every socket row whose trust names a `words` field is either closed or
  left open with why (`SILENCE_OPEN`: `join` and `track`, the record's name;
  `chat_mute`, one's own list; `friend_request`, the target reads the
  server's name; `dungeon_start`, the worker's own config), and
  `silence.test` fails a new one in neither. Told: "You can't give names
  others read right now: ...". The market's order label and seller name
  (free text from the page, `market.js`) are not a socket row: under the
  card's Needs.
- **Where**: `_silenceDoor`, one step in the router (`index.js _onMessage`)
  right after the wire door, never inside it (card K's word: the door
  refuses only what no page sends and sits behind `wiredoor`).
- **The silenced player is told** once a minute, in the game's voice
  (`server_announce` to that socket only: no new message type, no change on
  the phone): "You can't chat right now: the owner has silenced this
  character until 14:32 UTC." Nobody else is told anything.
- Every silence is loaded into memory once a room's life, at the first join
  (`_silenceEnsure`), so the check a message makes is a Map read; a deploy
  keeps them (they are rows).

## A freeze holds the device (the owner's lever, OFF until turned on)

- **OFF by default** (the sitting 19 review, the planning session's call):
  `freezedevice: true` in the live flags turns it on, from the Test panel's
  live switches. It can hold the OWNER out today (a `?guest=1` alt shares the
  main's phone id; a device reached with a new key is never recorded in
  `devs`), and "a freeze blocks the device" is the owner's decision.
- **Its devices, complete** (v2.3.5625, card MOD PR 5): a device's
  characters are read from botfp's own record, `device:<devId>` (every
  character that joined from it, whatever key it came with: its last 8 in
  30 days), beside `auth:<pid>.devs` (the device a character was made on).
  The owner's spare is complete the same way: a device is never held when
  its record (or a test-mode character's `devs`) shows one of the owner's
  own characters, nor is a join that names one (its key still decides). A
  refused join writes nothing, so new characters cannot push the frozen one
  out of the record once it holds.
- **The owner's devices, kept** (v2.3.5627, card MOD PR 7; sitting 22's
  review): botfp's record forgets (its last 8 characters, 30 days), so the
  owner's character could fall off it and the phone be held. A join that is
  in, by a character in test mode, marks its device `ownerdev:<device>`
  {pid, at}, once a device (the owner's handful of puts, ever), and a freeze
  never holds a marked device.
- **Every character on a held phone** is refused, new or old (the card's
  "whatever character it names"): a friend's own character on a phone the
  frozen troll once used is held with it. That is the device rule as the
  card has it; the switch row says so (sitting 22's review asked that the
  row and the code agree).
- The frozen characters' records are read 128 a get (`SILENCE.GET_MAX`, the
  runtime's most: 129 freezes threw, and the read failed open).

- A join from a device a frozen character has played on (`auth:<pid>.devs`,
  `devicelock.js`) is refused `frozen` (close 4004, which the phone never
  answers with a new character), whatever character it names, before the key
  is checked, so a refused join writes nothing.
- The `frozen:` rows (the owner's few) are listed at every join, so a freeze
  holds the very next join; their devices are read again when that list
  changes or a minute has passed. The freeze route itself is unchanged, and
  an unfreeze lifts the devices at once.
- **Never the owner's own phone**: a device a test-mode character
  (`testmode:<pid>`, the owner's own characters) has played on is never
  held, so freezing a test character cannot lock the owner out.
- A NEW device still gets in: the account check is that wall, the owner's to
  turn on.

## The owner's routes (`/api/admin/silence`, the admin key)

| | |
|---|---|
| `GET` | every silence still running |
| `POST {playerId, minutes, note}` | silence a character (`minutes` left out: until lifted; else a whole number from 1 to a year, anything else refused 400: the sitting 19 review, -60 and 0.5 were until lifted) |
| `DELETE ?id=` | lift it |

Each is logged in `admin_log`. The Test panel's buttons (Silence for a
minute, an hour, a day, until lifted; Lift) are card OPS's or the card that
holds `DevPanel.jsx`, routed by the planning session.

## Switches

- `silence: false`: no silence is checked; every character speaks (the rows
  are kept, and hold again when it is put back).
- `freezedevice` is the owner's LEVER: unset or false (the default) a freeze
  holds the frozen character only, as before; `true` turns the device half on.

## Not here (card MOD's later PRs, or the owner's)

A word list that silences by itself (the owner's words, built off until
then); the name rules (PR 2); what a reporter received (PR 3); invite pace
(PR 4).

## Tests

`server/test/silence.test.mjs`: the routes; every lane closed, the speaker
told once, others speak; it plays on; lifted, run out, kept across a deploy;
the switch; a new character on a frozen phone refused (t4-ban.mjs's proof),
another phone let in, the owner's phone spared, `freezedevice: false`,
unfreeze; 5b the words outside the lanes, 6b the device's characters from
botfp's record and the owner's complete spare (v2.3.5625); the lever OFF by default, 129 freezes read 128 a get, `minutes`
refused unless a positive whole number (the sitting 19 review, each with its
break proof in the suite's header). Break proofs (by hand, 2026-11-15): the router line removed, the
join hook removed, the owner's phone not spared, the switch ignored: each
turns its checks red; the first build's one-minute
cache of the frozen devices let a new character in for a minute (check 6
failed, mended by listing the freezes at each join).
