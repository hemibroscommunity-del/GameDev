# Card MOD: the moderator's tools and the name rules

**Why (the red team, 2026-11-14, the owner's "Run the red team"):** RT-3's
findings (`docs/security/rt3-findings.md`, PR #1869), proven on the node room:
the owner cannot stop a troll (no silence, and a frozen player is back in a
second with a new character on the same phone: S1); a name can be anything,
and is changed mid-game through `track` into "Owner (admin) ... SYSTEM: your
account is banned, send your login" (S2); a report's evidence is the
speaker's last three lines across all lanes, flushed by three harmless ones
(S4); trade requests come 100 in 10 seconds, each with a popup and a sound
(S5). The About panel promises "Harassment, hate and spam get muted or
removed": this card gives the owner the levers that promise needs.

**Starts:** now (the planning session, 2026-11-15). **Tags:** 5620 (this
card's own PR), 5621 to 5624 (PRs 1 to 4), 5625 to 5639 spare; the block is
written in `tools/dev/tag-blocks.json` by card P (#1868), never here.
**Browser:** light (a phone test where a PR changes what a player sees: the
name box, a rename). **Effort:** extra (identity, chat, every player's name).
**Your questions, and "ready":** by message to the planning session,
`session_01LccHak9SKjatMy6sijchun`. Anything decided for the owner while
away goes in the PR's words under **"Decided for the owner while away"**.
**Read first:** `CLAUDE.md` (§5 the wire's rules, the doors; §8 the
checklist); `docs/security/rt3-findings.md` S1, S2, S4, S5 and their proofs
(`docs/security/rt3-proofs/t1-names.mjs`, `t4-ban.mjs`, `t5-evidence.mjs`,
`t6-invites.mjs`: each becomes a suite's check here); `server/src/chatmod.js`
(the mute, the reports), `chatguard.js` (`cleanChatText`), `chatlanes.js`,
`admin.js` (kick, freeze), `devicelock.js` (`auth:<pid>.devs`), `join.js`
(`sanitizeDisplayName`, the frozen gate, "names are permanent" ~855-867),
`index.js` (`TRACK_COSMETIC_KEYS` ~588, the `track` merge ~5010-5070),
`petbook.js` `cleanPetName` (the model), `party.js` `INVITE_REPEAT_MS`,
`trade2.js` ~216, `friends.js`; `docs/specs/chat-moderation.md`,
`chat-guard.md`, `block-list.md`; `docs/FUN-SOCIAL-PLAN.md` Phase 4;
`grep -n -i "name\|mute\|freeze" docs/TRAPS.md`.

## The readings chosen

- **Levers, not judgements.** Every lever is the owner's hand (the Test
  panel or the admin key); nothing here acts by itself ("flag, never act"
  stands for the bot signals). A silence and a freeze say nothing to other
  players.
- **A silence is not a mute.** A mute is one player's list (`chat_mute:`);
  a silence is the owner's, for everyone: the silenced player's words reach
  nobody (room, area, whisper, party, friend message, shop thread, emote
  text), and the silenced player is told once, plainly, until when.
- **A name is the character's, written once.** The worker owns it as it owns
  the look (`_stampRecordLook`): `track` never changes it; the owner's rename
  is the one way, and it writes `char:<pid>` and the board's row together.
- **The owner's decisions wait** (the planning session sends their word):
  the slur list's words, protection for a new character in No man's land,
  whispers from friends only for a new character, a hold on a new
  character's trades. Build none of them. Each PR may leave the seam (a
  list that is empty, a switch that is off) only if the owner has said so.

## PRs, in order

Each PR's branch starts from `main` and opens against `main`, ready for
review; a PR touching `server/**` deploys the worker on merge (say so in its
first line). Each new behaviour has a lower-case kill switch and its row in
the switch table (`tools/guards/lib/switches.mjs`, with `on`; `node
tools/guards/switches.test.mjs --write`), and every route or message its row
in the wire table (`server/src/wire/`).

0. **(tag 5620) This card.** Words only.
1. **(tag 5621) The silence lever, and a freeze that holds the device (S1,
   without the word list).**
   - New `server/src/silence.js`: `silenced:<pid>` `{until, note, by}`
     (a storage-key registry row), loaded into the session on join, checked
     where a player's words leave: ask card K first whether that is one check
     in the wire door for every row whose `doesWhat` holds `speaks` (the
     cleanest: one door) or a call at each lane (`_sanitizeChatRelay`,
     `chatlanes.js`, `party.js`'s chat, `friends.js`'s message,
     `storechat.js`). Refused silently to others; the speaker gets one
     `chat_silenced {until}` (an `out` row, the phone's direct switch, words
     in `deskWords()` where a computer reads them).
   - The owner's routes `POST/DELETE /api/admin/silence` (a minute, an hour,
     a day, until lifted), as `_liveopsRoutes` is called from `admin.js`'s
     final 404 (one line in admin.js: ask K and R, who hold it).
   - The freeze also refuses the frozen character's known devices: at the
     freeze, each `auth:<pid>.devs` device marked `frozendev:<device>`
     (registry row); `devicelock.js` (no card holds it) refuses a join from a
     marked device with `frozen`, whatever character it names; unfreeze lifts
     them. A new device still gets in: the account check (Turnstile, the
     owner's to turn on) is that wall, and the PR says so.
   - The Test panel's buttons (Silence for..., Lift) beside Chat reports'
     Freeze: `DevPanel.jsx` is held by cards A, E, K, L, T and V; ask the
     planning session which may take the few lines, else the routes ship
     first and the buttons follow.
   - Switches: `silence`, `freezedevice`. Suite `silence.test.mjs`
     (t4-ban.mjs's proof as a check: a new character on a frozen device is
     refused; every lane silent; a lifted silence speaks; a deploy keeps it).
2. **(tag 5622) The name rules (S2).**
   - New `server/src/charname.js`: `cleanCharName` modelled on
     `cleanPetName` (letters in any script, digits, space, `'` and `-`; 3 to
     16; no zero-width, direction or control characters; NFC), and a
     RESERVED list matched after folding look-alikes and digits for letters
     (system, admin, owner, mod, moderator, gm, brotown, brotown team,
     official, support, the owner's own character names from the owner).
   - `name` out of `track`'s look keys (`index.js` `TRACK_COSMETIC_KEYS`), or
     stamped back from `session.char.name` as `_stampRecordLook` stamps the
     look: ask the planning session which card holds `index.js`'s lines at the
     time. The join takes the record's name; a new character's name goes
     through `cleanCharName` (join.js: the same ask), refused with words the
     name box shows (`NameModal.jsx`, no card holds it).
   - The owner's rename lever, `POST /api/admin/rename`: `char:<pid>.name`,
     the session, the board's row (`leaderboard.js`: cards LB and PW), one
     write each, logged in `admin_log`.
   - Names already taken: kept as they are (no migration). Uniqueness only
     if it needs no migration of existing names (a `name:<folded>` key for
     names made from now, the old ones grandfathered); else it goes under
     **Needs** in the status file for the owner.
   - Switch `namerules`. Suite `charname.test.mjs` (t1-names.mjs's proof as a
     check: `track` cannot rename; a direction override, a zero-width space
     and a newline are refused; "BroTown Team" and "0wner" are refused).
3. **(tag 5623) What a reporter received goes with the report (S4).**
   `chatmod.js` is card K's: ask K first (it may take the change itself).
   A ring of the last 10 lines each player RECEIVED (in memory, by lane,
   the server's sanitised copy, never the client's), attached to a report
   about the speaker beside the speaker's own lines. Switch `reportring`.
   Suite: t5-evidence.mjs's proof as a check (two abusive whispers then
   three harmless lines elsewhere: the report holds the two).
4. **(tag 5624) Invite pace (S5).** `party.js`'s `INVITE_REPEAT_MS` rule
   copied into `trade2.js`'s open (cards E, K and R hold it: ask the
   planning session which) and `friends.js`'s request (no card): one card
   per inviter and target per few seconds; a repeat answered as sent, never
   shown again. Switch `invitepace`. Suite: t6-invites.mjs's proof as a check
   (10 presses a second for 10 s: at most 3 cards).

## Not yours

The word list's words, new-player protection, friends-only whispers, a trade
hold (the owner's, through the planning session); the feedback board (RT-3's
PR #1878); the account check's keys (the owner's); a block the server keeps
and "Scam" as a report reason (step 10.9, card Q's); the doors (card L and
R's tables: a rename moves no value).
