# Chat guardrails: its own allowance, no repeats, clean text (v2.3.3367)

Phase 1 of the fun & social plan, the owner's "Go recommended": the three
guardrails the plan found missing on the server. **Server only. Nothing new
on the wire**, so it deploys in either order with any phone.
Code: `server/src/chatguard.js` (a mixin, handoff rule 22). Suite:
`server/test/chat-guard.test.mjs`.

## Why

What the chat had before this:

- **One allowance shared with combat.** Room chat and emotes ride the
  router's default branch, and every relay there spent ONE bucket per
  connection (`RELAY_BURST` 8, `RELAY_REFILL_PER_S` 4) -- the same bucket the
  player's own swings, arrows, rolls and jumps spend. A burst of chat or
  emotes emptied it, and the swings the other players should have seen next
  were dropped. The plan's rule 7: "a dance party must never eat the messages
  a fight needs".
- **No repeat filter.** The same line could be sent as fast as the bucket
  allowed.
- **No cleaning beyond control characters.** Every lane clamped a line to its
  length, turned control characters (`\x00`-`\x1f`, DEL) into spaces and
  trimmed it. Everything else went through:
  - stacked combining accents ("Zalgo"), drawn over the lines above them;
  - the direction overrides that print a line backwards (U+202E);
  - invisible characters: a line made of them is a blank speech bubble, and
    one hidden inside a word makes the same line look new;
  - a wall of emoji or of one key, up to 200 characters.

## The three guards

### 1. A social allowance, apart from combat's

`chat` and `emote` on the default branch spend their own allowance,
`SOCIAL` (chatguard.js): **five at once, then one more every 2 s** -- five
lines in ten seconds. They no longer spend the relay bucket at all, so a
player's chat can never use up the swings, arrows, rolls, jumps and
handshakes the others need to see. Every other relay spends the relay bucket
exactly as before.

**Party chat pays from the same allowance** (party.js `_handlePartyChat`, once
the line is cleaned and not blank). It had no limit of its own but the
connection's message budget (flood.js: 300 at once, then 120 a second), so a
script could send a party of up to 50 about 120 lines a second. One allowance
for room chat, emotes and party chat together, so a flood cannot be split
across them.

- One allowance for chat and emotes together: sending emotes does not buy
  more chat.
- Fractional, as the relay bucket is: exactly one every 2 s however the
  lines are spaced.
- A line past it is dropped silently, as a relay past the bucket always was
  (a refusal is a signal to a flooder and one more message to send).
- It is spent before the line is looked at, as the relay bucket was: an
  attempt costs, whatever it turns out to be.
- A bundle (up to 24 messages in one frame) buys nothing more: each part
  spends one.

### 2. A repeat filter for typed public lines

The same **room chat** or **area chat** line from the same player within
**30 s** (`REPEAT_MS`) is said once.

- Compared after the cleaning below, lower case, spaces collapsed, and
  without the invisible characters the cleaning keeps (a joiner, a variation
  selector, the grapheme joiner U+034F): "Hello  THERE", "hello there" with an
  invisible character in it, and "hello th(joiner)ere" are all the same line.
  "Broooooooooo" and "Brooooooooooooooo" are too: both are cleaned to
  "Broooooo".
- The window is from when the line was SAID. A repeat that is dropped does
  not restart it: the same line can go out once every 30 s.
- Per player and per lane: two players may say the same thing, and a line
  said in room chat may be said in area chat (another audience).
- Not filtered:
  - **whispers, party chat, friend DMs and the auction house's threads** --
    private, between people who chose to talk;
  - **emotes** -- each one is one of the listed emoji or quick lines, meant
    to be sent again ("GG" twice is a cheer).
- The memory is the connection's (`session.chatGuard.said`): nothing older
  than 30 s, and at most `REPEAT_KEEP` 24 lines. 24 is more than either lane
  lets a player say in 30 s at its steady rate (room chat 15, area chat 20),
  so cycling through more distinct lines than are remembered never gets one
  repeated inside the window. At most 24 x 200 characters a connection.

### 3. Clean text on every chat lane

Applied after each lane's own clamp, control strip and trim, by one pure
function, `cleanChatText`, on room chat, area chat, a whisper, party chat, a
friend DM, and the auction house's message threads (the one chat lane the
plan's list did not name; a thread is kept for days). It only ever takes
characters away, in this order:

1. **Half an emoji** is taken out (the clamp at 200 can cut one in two).
2. **Invisible and direction-changing characters** are taken out:
   - the owner's list: U+200B, U+200C, U+200E, U+200F, U+202A-U+202E,
     U+2060-U+2064, U+2066-U+2069, U+FEFF, U+00AD, U+061C, U+180E;
   - from Unicode's own "default ignorable" set, the deprecated format
     controls U+206A-U+206F and the four Hangul fillers U+115F, U+1160,
     U+3164, U+FFA0 (the classic blank-name and blank-bubble character;
     every keyboard types Korean as whole syllables);
   - the C1 controls U+0080-U+009F, which the lanes' own strip never reached.
   - **Kept**: U+200D (the zero-width joiner) and U+FE0F (the emoji variation
     selector). A family emoji and a red heart are made of them.
3. **At most 6 emoji** (`EMOJI_MAX`). The ones past six are dropped, with
   what belongs to them: their joiners, variation selectors, skin tones,
   tag letters and marks. An emoji is:
   - a pictograph (`\p{Extended_Pictographic}`), counted one by one as the
     plan says: a family of three people is three. A run of fifty pictographs
     joined by joiners is drawn as fifty on most phones, so counting a joined
     run as one would let a wall through;
   - a flag: two regional letters, one emoji;
   - a keycap (past six, the digit stays as a plain digit);
   - a skin tone on its own (drawn as a colour swatch; after a pictograph it
     is part of that one).
4. **A joiner that joins nothing** is taken out: at either end, beside a
   space, or beside another joiner.
5. **At most 2 combining marks in a row** after a letter (`MARKS_MAX`): the
   end of Zalgo text. A decomposed Vietnamese letter (two marks) and a Thai
   syllable with its vowel and tone mark are left alone.
6. **A run of one character longer than 6 is cut to 6** (`RUN_MAX`), so a
   wall of one key goes and "Broooooooooo" stays a very long "Broooooo". The
   plan said 3; 6 keeps BroTown's own joke. **Never in a number**: "selling
   for 10000000 gold" is ten million, and cut to six digits it would say one
   million.
7. **Every run of spaces is one space**, every kind of space (and the line
   separators that broke a bubble into lines) a plain one, the ends trimmed.
8. **A line with nothing visible left** (only spaces, marks and format
   characters) is not sent, as an empty line never was.

**The order matters.** Whatever takes characters out (steps 1-4) goes before
what measures runs (steps 5-6). Otherwise a removal could join two short runs
into one too long: "aaa" + an emoji past the cap + "aaaa" is seven a's once
the emoji is gone. Cleaning a cleaned line changes nothing; the suite holds
that, with every rule above, over 6,000 random lines.

Examples:

| Sent | Delivered |
|---|---|
| `Broooooooooo` | `Broooooo` |
| `lolllllll` | `lollllll` |
| `selling for 10000000 gold` | unchanged |
| `!!!!!!!!!!!!!!!!!!!!` | `!!!!!!` |
| `well      met` | `well met` |
| a letter with 9 accents stacked on it | the letter with its first 2 |
| `abc` + U+202E + `def` (prints "abcfed") | `abcdef` |
| nothing but invisible characters | nothing is sent |
| 9 different emoji | the first 6 |
| 6 emoji, then a family emoji | the 6 (the family goes whole) |
| a family emoji, a red heart, a flag, a keycap | unchanged |

The line a report quotes (chatmod.js) is the cleaned one: it is what was
really delivered. A line the repeat filter drops, or one with nothing visible
left, is never delivered and never remembered for a report.

## Wire surface

Nothing new is sent, and nothing new is accepted. What each chat message
meets now:

| Phone sends | Lane | Its allowance | Repeat filter | Cleaned |
|---|---|---|---|---|
| `chat` | room chat (default branch relay) | **`SOCIAL`**: 5, then 1 per 2 s, per connection (was the relay bucket) | **yes**, 30 s | **yes** |
| `emote` | default branch relay | **`SOCIAL`**, shared with chat (was the relay bucket) | no | no (a listed emote) |
| `area_chat` | chatlanes.js | `CHAT_LANES`: 6, then 1 per 1.5 s, per player, shared with whispers and DMs (unchanged) | **yes**, 30 s | **yes** |
| `whisper` | chatlanes.js | `CHAT_LANES` (unchanged) | no (private) | **yes** |
| `party_chat` | party.js | **`SOCIAL`**, shared with chat and emotes (had none) | no (private) | **yes** |
| `friend_dm` | friends.js | `CHAT_LANES` (unchanged) | no (private) | **yes** |
| `store_dm` | storechat.js | `STORE_CHAT` (unchanged) | no (one buyer, one seller) | **yes** |
| every other relay (`player_swing`, `player_projectile`, `player_dodge`, `player_jump`, the handshakes...) | default branch | the relay bucket, 8 then 4 a second (unchanged) | no | no |

Server to phone: nothing new. A line a guard stops is not answered.

State, all in memory on the connection (`session.chatGuard`), gone with it
(handoff rule 11: a deploy that wipes it loses nothing of value):

| Field | Meaning |
|---|---|
| `tokens`, `at` | the social allowance and when it was last refilled |
| `said` | `[{lane, key, at}]`, the lines said in the last 30 s, at most 24 |
| `dropped`, `repeats` | how many lines the allowance and the repeat filter stopped (evidence, as `relayDropped` is the relay bucket's) |

Nothing is stored. No caps flag: the phone needs to know nothing.

## Kill switch

`chatguard: false` in the live flags turns all three guards off at once: chat
and emotes spend the relay bucket again, and nothing is filtered or cleaned --
the room exactly as it was. `chatguard: true`, or no flag, is on.

## What it does not do

- **No word filter.** That is a later choice for the owner.
- **Look-alike letters** (a Cyrillic "а" for a Latin "a") and the Braille
  blank (U+2800) are not touched; Braille art is drawn with it.
- **U+200C, the zero-width non-joiner, is removed**, as the owner's list
  says. It is used inside some Persian words; without it the letters join,
  and the words still read.
- **The allowance and the repeat memory are the connection's**, as the relay
  bucket always was: a reconnect starts fresh. Opening sockets is limited on
  its own (flood.js: a join window, one join a socket, 20 opens a minute an
  address).
- **An emote's content** is checked against the listed emotes by the emote
  work (`docs/specs/emotes.md`, v2.3.3343), not here.

## Cost

A few regular-expression passes over at most 200 characters a line, and at
most five lines in ten seconds a player. Memory: a few numbers and at most 24
short lines a connection. No storage reads or writes, no new messages.

## Tests

`server/test/chat-guard.test.mjs` (145 checks):

- the owner's numbers (5 at once, 1 per 2 s, 30 s, 2 marks, 6 emoji, a run
  of 6) and the kill switch's name;
- the cleaning alone: ordinary lines, accents, other scripts and plain emoji
  untouched; stacked accents; each invisible character; a line printed
  backwards; blank lines; half an emoji; the joiner and the selector kept in
  a family, a heart, a rainbow flag, a skin tone, a keycap, a flag and a
  region's flag; loose joiners; the emoji cap with its tidy cut; runs, never
  in numbers, and runs joined up by a removal; spaces; and six properties
  over 6,000 random lines (never longer, idempotent, none of the removed
  characters, at most six emoji, no run of seven, no three marks, single
  spaces, no loose joiner, nothing invented, nothing blank);
- every lane through its real handler, and the room line as a phone in the
  room is sent it in the tick, and as a report would quote it;
- the social allowance: a burst stops at five, silently and counted; chat
  leaves the relay bucket alone; a swing still goes, the whole bucket, while
  chat is spent; an emote spends it too; chat goes with the relay bucket
  empty; the refill, one every 2 s, never past five; per connection; a bundle
  buys nothing more;
- the repeat filter: room and area, case, spaces, invisible and unseen
  characters, the window to the millisecond, a dropped repeat not restarting
  it, per player, per lane, the private lanes and emotes never filtered, and
  the memory's two bounds;
- the kill switch: chat on the relay bucket again, a repeat and garbled text
  relayed as before, on again, and the flag read as an own property only.

Breaking each guard in turn (32 mutations: each step of the cleaning, its
order, the allowance, its refill, the repeat filter's key, lane, window and
memory, and each lane's call) turns the suite red every time.

Four existing suites were adapted, their checks unchanged:

- `hardening` measures the relay bucket with swings (chat no longer spends
  it) and adds a check that a 60-line chat burst stops at `SOCIAL.BURST`;
- `relay` gives each relay a fresh social allowance too, and adds a check
  that the relay bucket's last token still carries a jump;
- `anticheat` and `party` clamp a long line that is not one key held down
  (a run of one key is cut to six now, which would hide the clamp), and
  `anticheat`'s `resetRelay` clears chat's allowance and repeat memory
  between its sanitiser checks.

**For whoever writes the next test:** resetting `session.relayTokens` no
longer refills chat or emotes. A test that sends more than five of them at
once, or the same room or area line twice, sets `session.chatGuard = null`
first (a fresh connection's allowance and memory), or it measures the guard
instead of what it meant to.
