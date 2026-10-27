# On a computer, "tap" reads "click" (v2.3.3612)

The owner, 2026-10-26: the judges play the **desktop** version in two days
("trying to win best game"). The plan (docs/OWNER-LIST-2026-10-26.md,
section 2) put a desktop play-through first, and one of its checks is that
nothing on a computer's screen says "tap".

## What was wrong

The game's words were written for a phone. On a computer the very first
instruction read "Follow the gold road on your map, then tap him.", and the
same word ran through the townsfolk's lines ("Tap Race!", "tap a log in your
Bag", "tap TRAP"), the coach's cards ("Tap OPEN."), the first level-up tips,
the "New monster" card, the chat box ("Tap to type…") and a dozen windows.

## The rule

`deskWords(s)` (src/game/deskWords.js, no imports) swaps the word **as it is
shown**, only under a mouse -- `(pointer:fine)`, the house test for a computer
(game.css's key caps, QuestCoach, NameModal):

| written | on a computer |
|---|---|
| tap, Tap | click, Click |
| taps | clicks |
| tapped | clicked |
| tapping | clicking |
| double-tap | double-click |

Whole words only: "TAP" in capitals (the trap button's own name, which a
computer can also press with T) and words that merely contain the letters
("tapestry", "strap") stay. A phone reads every line exactly as written.

**Never in the data.** The townsfolk's lines stay as written: the server's
quest-lines suite counts their characters (300 at most, one tap each), and
they are the phone's words too.

## Where it is called

- the quest plate (BroTown's `questMsg`: the welcome, quest accepted and
  completed);
- the townsfolk's window (NpcDialogue.jsx, each line);
- the quest windows: the offer (QuestOfferPanel), the journal row and its
  detail page, the detail page's quoted line;
- the coach's cards (QuestCoach.jsx), the first level-up tips among them
  (pointsTips.js's words);
- the "New monster" card, the chat box's placeholder;
- the Cookhouse's fish note, the General Store's and Diego's selling hints,
  the Saloon's and Sheriff's hints, the codex's drop-table note, the
  equipment tab's empty slot, the pets' notes, the Skills page's earn hints,
  the points reset's confirm, the achievements' title note, the quest
  tracker's toggle, the settings' notifications row, the creator's preview
  tooltip.

A new line a computer player reads that says "tap" is shown through it.

## Tests

`server/test/desk-words.test.mjs`: the swap on a computer and none on a
phone, the words that stay, every townsperson's line that says "tap" read
through it, and each place above calling it.
