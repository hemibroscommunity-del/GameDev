card: MOD
branch: claude/plan-mod-<n>-<topic> (one line: #1878 > #1890 > #1897 > #1907 > #1909 > #1914, each carrying the one before, every PR against main)
prs: #1883 (5620, the card), #1897 (5621, silence), #1907 (5622, names), #1909 (5623, report evidence), #1914 (5624, invite pace): ready; RT-3's #1878 (5593), #1890 (5594): ready; #1869 (findings): draft
state: ready

## Done

- RT-3 red team: findings #1869 (draft); the feedback board #1878 (5593) and its staff names #1890 (5594).
- PR 1 (5621, #1897): the owner's silence (the chat lanes, its own router step after the wire door) and a freeze that holds the device.
- PR 2 (5622, #1907): the name rules: a new name by the rule (the box says why first), `track` never renames, the owner's rename.
- PR 3 (5623, #1909): a report carries what the reporter received (the reported player's lines to the reporter: a whisper, the party, a friend, a shop's chat, the room or the area), not only the room's last lines; switch `reportring`. K said: build it.
- PR 4 (5624, #1914): invite pace: one trade card and one friend request card a target per 5 s (the invite is kept, only the repeat card is held; the pair's pace resets when a trade opens); switch `invitepace`. The planning session gave trade2.js's lines to this card (no open branch touches them); friends.js has no card.

## Next

- Nothing built is waiting: the line merges in order, #1878 first.
- Switch `silence.js`'s SILENCE_LANES to K's CHAT_LANES import in whichever of #1897 and #1899 lands second.

## Found

- `mp-lazyfail` is red on main: it cannot find the More page's "achievements" tile on a local worker (routed to J2).
- `boards.test` and others join with one-letter names ("T"): the name rule's minimum is 1 (the box keeps its 2) so honest tests and names pass.

## Needs

- The owner (through the planning session): the slur list's words; new-player protection in No man's land; friends-only whispers for a new character; a hold on a new character's trades; names unique across characters (a migration: every name on file read once).
- Card OPS: the Test panel's buttons for silence, lift, rename (after its feedback rows).
