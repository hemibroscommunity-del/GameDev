# The name rules (v2.3.5622, card MOD PR 2)

The red team (2026-11-14, RT-3 S2: `docs/security/rt3-findings.md`, proof
`t1-names.mjs`): a character's name could be anything, and `track` changed it
mid-game. One message made a character "Owner (admin) ... SYSTEM: your account
is banned, send your login" (with a right-to-left mark and line breaks), and
every peer and room chat read it. A zero-width space, a direction override and
a newline were stored for good in `char:<pid>`. The owner's "names are
permanent" (v2.3.1814) held only at the join.

## The rule (`server/src/charname.js` `checkCharName`; the page's copy `src/game/charName.js`)

- 1 to 20 letters of any alphabet, digits, spaces, hyphens, apostrophes or
  underscores; spaces collapsed; NFC. The name box asks 2 letters at least,
  its own rule (`data/joinGate.js`).
- No emoji (an emoji in the world's outlined text is a known iPhone Safari
  crash: the pet names' rule), no hidden or direction characters, no markup.
- Never a name that reads as the game or its staff
  (`server/src/reservednames.js`, #1890: BroTown, BroTown Team, Team, Admin,
  Mod, Moderator, Staff, Owner, Dev, Official, System, Support, GM, folded for
  case, spacing, punctuation and look-alike letters).
- Each refusal has a reason: `short`, `long`, `chars`, `staff`; the page has
  words for each (`CHAR_NAME_WORDS`).

## Where it holds

- **A new character** (no `char:` record yet): the join is refused `name`
  `{why}` (close 4023) right after the freeze gate, before any takeover and
  before the record is made. The name box runs the same rule first and says
  why, so an honest player never meets the refusal. An older phone reads the
  unknown reason as fail-safe (no new character made for it).
- **`track` never renames**: `_stampRecordName` (beside `_stampRecordLook`) puts
  the record's name back; a guest with no record is cleaned by the rule, a
  failing name dropped.
- **Names on file are kept** as they are (no migration). The owner renames.

## The owner's rename (`POST /api/admin/rename {playerId, name, force}`, the key)

The record, the live session and the player's state, a `player_update` to
everyone; the board's row follows at its next report. The rule holds; `force`
lets a staff word through (the owner's own character). Logged in `admin_log`.

## The sitting 19 review's mends (v2.3.5622, 2026-11-16)

- **A session with no character record** (HIGH): its name came from the
  join as sent (`sanitizeDisplayName` keeps a direction override and a
  zero-width space), so S2's string passed (a) with a guest's or keyless id
  and (b) with a bp_ id whose data names nobody, to every peer, room chat and
  the board. Now (a) is TIDIED by the rule (`charname.js tidyCharName`: what
  it refuses taken out, so "Bro<line break>killer" is "Bro killer", cut to
  20, and a staff name stays out) or named `Anon` (`join.js`, both the
  session's name and its data's), and (b) is refused `name`
  (`_charNameRefuse` reads the data's name, or the join's own when the data
  names nobody).
- **A mark after a letter is the letter's** (`\p{L}\p{M}*`): Devanagari, Thai
  and an accent written apart were "No emoji or symbols". The staff fold
  (NFKD) is only for the staff comparison, never for what is allowed.
- **A character that draws nothing is refused** (`\p{Default_Ignorable_Code_Point}`:
  the Hangul fillers U+3164, U+115F, U+1160 and U+FFA0 are letters that draw
  nothing).
- **The staff fold** is the feedback board's (`reservednames.js`, #1890:
  accents, a dotless i, small capitals, digits beside letters, CamelCase,
  two words; "Dev" off the list, GM and `brotown` only as their own words),
  and the page's copy carries it whole (`src/game/charName.js`, mirror-audit
  with both lists).
- `tools/qa/mp/mp-ownerwatch.mjs` named its owner phone `Owner`, which the
  name box now refuses: it is `Keeper` (outside the card; the planning
  session approved it). Two node suites joined a bp_ id whose data names
  nobody under a name that reads as staff (`silence.test`'s 'mod_troll',
  `spar.test`'s 'bp_spar_owner'): their test names changed, nothing else.
- Left for the next PR (the planning session's lows): the rename's
  `player_update` without `hg`/`fr`; `namerules: false` not reaching the
  name box; a `name` refusal shows no words on the phone; the arena's own
  name.

## Switch

`namerules: false`: a new name is taken as before (any characters, 64 at
most) and `track` may rename; the owner's rename stays.

## Not here

Names unique across characters: it needs every name on file read once (a
migration), the owner's call, under card MOD's Needs.

## Tests

- `server/test/charname.test.mjs`: the rule; a new character refused before it
  is made (t1-names.mjs's proof), a good name made and tidied, an old odd name
  kept; `track` cannot rename (state, peers, room chat); the owner's rename
  (key, record, session, `player_update`, the rule, `force`); the switch.
- `server/test/mirror-audit.test.mjs` "names": the page's box and the worker
  allow and refuse the same names for the same reason; the same staff words;
  the same lengths; words for every reason.
- Break proofs (by hand, 2026-11-15): the `track` stamp removed, the join
  hook removed, the staff check removed, the switch ignored, the page's rule
  drifting (no underscore): each turns its checks red.
