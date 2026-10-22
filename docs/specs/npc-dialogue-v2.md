# NPC dialogue, the owner's rewrite (v2.3.3570)

The owner had every NPC line pulled into one manuscript, had it reviewed, and
sent back a new script: "Here's the new script to swap in". This swaps it in
word for word. Each townsperson now plays a sharper stereotype:

| Who | Voice |
| --- | --- |
| Mayor Bro | a sleazy but lovable small-town politician |
| Blacksmith Bro | a gym bro |
| Diego | a hustler writing a cookbook he cannot cook |
| Farmer Bro | an unhinged dirt hippie |
| Woodworker Bro | a pretentious artisanal sad boy |
| Lil Bro | a trash-talking kid |
| Beastmaster Bro | a whispering survival-show host |
| Ace | a back-alley bookie |

## What changed, and where

| Lines | File |
| --- | --- |
| The 18 live quests' offer, progress and hand-in (tut_1-4, mayor_2-3, smith_1-2, fish_1, farm_1-2, wood_1-2, race_1, beast_1-4) | `src/data/gameSystems.js` `QUEST_CHAINS` |
| Every townsperson's idle chatter | `src/data/gameDisplay.js` `NPC_DATA[].phrases` |
| Reactions to emotes and dances, Ace's dance-off call | `src/game/townsfolkReact.js` |
| Lil Bro's race barks | `src/game/race.js` |
| Ace's coin-flip window | `src/ui/panels/AceFlipPanel.jsx` |

Unchanged:
- The Mayor's welcome caption, which must match his recorded voice.
- The retired quests and the removed givers' quests.
- Every quest's objective, reward, order and rules.
- No server change.

## Kept from before

- Mayor Bro's first offer still never mentions the slimes bursting. His
  hand-in carries the warning that comes too late (the owner's joke since
  v2.3.2237).
- "Remains", never "remnants"; no "Wheel".
- A blank line in a speech is a tap (`\n\n` between chunks).

## Tests

- `townsfolk-react` reads the lines from `REACT_LINES` rather than repeating
  them, and holds the new dance-off call's format.
- `mp-joinin` waits for Diego's new first line.

## Two lines reworded at the owner's ask

The script had Mayor Bro's last two hand-ins say "your Life Skills are
officially uncapped past Lv10!" and "past Lv50!". No code caps a life skill
at those levels, so the lines promised an unlock that never happens. The
owner: "Yes reword those two lines." They now read:

- mayor_2: "...filed it under "Public Safety Miracles.""
- mayor_3: "I hereby declare you BroTown's Dungeon Delver of the Year. There's
  no trophy. Budget."
