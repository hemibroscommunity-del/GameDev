# The pinned quest card (v2.3.3918)

The card at the top left of the world. Files: `src/ui/QuestCard.jsx` (the
drawing, mounted from BroTown.jsx in one line), `src/game/questCard.js` (its
words, no imports), `server/test/quest-card.test.mjs`.

## Why

The owner, 2026-11-02: "I'm not confident about the current quest objective of
the top left." The design review they adopted: "The green checkmark next to
'Into the Wild' makes the objective look completed, while the instruction below
still says to kill five monsters. There's also no visible progress count. I'd
change it to a single compact, tappable tracker [Into the Wild · 3/5 · Defeat 5
monsters] ... I wouldn't automatically display every quest. One primary
objective, with meaningful progress, is enough."

## What it shows

One quest: the tracked one (`game/trackedQuest.js`), else the first active.

- **In progress**: the quest's picture (the Quests button's scroll), the title,
  the count at the right when the quest counts (`need` in QUEST_CHAINS: a bag
  key, or `progress: true` for the worker's own counter in `_questKills`), and
  the objective, or for a quest with steps "Next: <step>". No check.
- **Ready to hand in** (`questObjectiveDone`): the painted green check
  (`QUEST_ART.check`, it pops once), the full count ("5/5"), and
  "Done! Go back to <giver>".
- **No quest in hand**: the tour's next step and who gives it (v2.3.3525,
  unchanged; takes no taps).

mayor_2 ("Into the Wild") gained `need: { progress: true, n: 5 }`: the worker
already counted its kills (server/src/quests.js) and echoed them in
`player_state`. trader_2 was left without one: quest-lines §5a needs every
quest with a count to name it in its progress line, and its words are the
questline lane's.

## A tap

Opens that quest's page in the quest screens (`openQuestPage`: questDetailBus,
then the Quests destination and its detail page). The v2.3.1714 fold to the
title is retired; its stored preference `bt_quest_hud_collapsed` is no longer
read. The press stops at the card, so it never walks the bro to the corner.

## Placement

`top: var(--bt-hud-top, 56px)`, left 8, max 248 px wide, at least 44 px tall
(UI-BIBLE's hit area). A frame above it (the top bar's player status) pushes it
down by setting `--bt-hud-top`. The quest coach and the player list find it by
`[data-quest-hud]`; tests read `data-quest-hud-mark` (quest / ready),
`data-quest-hud-count`, `data-quest-hud-quest` and `data-quest-hud-ready`.
