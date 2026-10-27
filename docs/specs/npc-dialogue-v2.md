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

## v2.3.3575: the satire pass replaces it

The owner sent a second script, "BroTown NPC Script — Satire Pass" ("Actually
use this script instead"), and it replaces v2.3.3570's lines in the same
places:

- all 18 quests;
- the idle chatter;
- the emote and dance reactions;
- Ace's dance-off call, now "Dance-off! I've got [player] at 3 to 1! Who
  wants in?";
- Lil Bro's race barks;
- Ace's coin-flip window.

The cast changes a little:

- Woodworker Bro is now an overthinking genius rather than a sad boy.
- Every townsperson has more idle lines (four to six each).

It is word for word, with one exception. The satire pass brought back the
Life Skills claims the owner had just had reworded, and added a third
("raise the limit on your Life Skills"). Those three sentences keep the
earlier fix, because no code caps a life skill:

- mayor_2's offer says "Before I sign off on you".
- mayor_2's hand-in says "Your paperwork is officially stamped".
- mayor_3's hand-in names you Dungeon Delver of the Year.

## v2.3.3579: the Mayor's Goo Grotto aside

The owner: "Yes add mayors line pointing to grotto as a party challenge but
keep the wittiness of the new dialog." Mayor Bro's slime hand-in (tut_1) gains
one tap, the fourth, while the worker runs the Goo Grotto as a level-16 party
dungeon (v2.3.3573):

> Oh, and that cave with goo pouring out? The Goo Grotto. Everything in it is
> level 16, and the giant slime at the bottom splits when you hit it, like the
> town council. Don't go in alone. That's not bravery, it's a funeral I'd have
> to speak at, and I'm out of material. Bring a party of 2 or 3.

The other six taps are word for word as the satire pass wrote them. Where and
why: docs/specs/grotto-party.md "v2.3.3579".

## v2.3.3583: Lil Bro, once he has beaten you

The owner: "lil bro should also have dialog change to acknowledge the race has
been lost and to try again if you've lost already (but said in his
personality)". His "how's it going" line (race_1's progress line, the one his
Race! button sits on) now depends on how many races he has won off you this
visit. With none it is the satire pass's line, word for word:

> Scared?! Tap Race! and we go on three! Touch all 4 corner flags and beat me
> back here, or it's a skill issue!

After one lost race (two taps):

> GG EZ! I wasn't even trying! I was watching a video the whole time!
>
> Fine, you get a rematch, because I'm nice. Tap Race! and touch all 4 corner
> flags before I get back. Try sprinting this time, grandpa.

After two:

> You lost AGAIN?! Bro, I'm nine! I eat cereal for dinner! How are you this
> slow?
>
> Tap Race! and run it back. All 4 corner flags, then back here. Farmer Bro's
> Zoom Juice makes you way faster, but you'd probably spill it.

After three or more, counting them:

> That's 3 wins for me and zero for you. I'm making a montage. It's called
> "Hero Gets Destroyed by a Literal Child, Part 3."
>
> Tap Race! when you're ready to lose again. Sprint the whole way and drink
> Zoom Juice first, or just admit I'm faster.

Every one still says what to do (tap Race!, the 4 corner flags, back to him)
and names what helps (sprinting, Zoom Juice). His race start line already
names both.

How it works:

- A race counts as lost when the server says you finished behind him or ran
  out of time (`game/race.js` `onRaceEnd`, counted in
  `src/data/raceTally.js`). A false start, or leaving mid-race, is not a loss.
- The count lives in memory, like the race itself, so it starts again on the
  next visit.
- The line is a getter, `lilBroRaceLine` in `src/data/gameSystems.js`, read
  each time his window opens, as the Mayor's slime hand-in is.
- His bubble at a race's end ("Easy! Skill issue, bro!") is unchanged.
- No server change.

Tested by `mp-race`: a race lost by standing still, then his window opens on
the "GG EZ!" line and still offers Race!.

## v2.3.3591: one message, a dry line and the job

The owner: "I want just one message of dialog before the next quest triggers.
npc messages are too long. I also still think the dialog is pretty corny so
just a dry wisecrack while telling the character to do a quest task is
better."

- Every live quest's offer, progress line and hand-in is now ONE tap (no blank
  line inside it, which is where `dialogueChunks` splits). Each is one deadpan
  line and the job. The counts, places and hand-overs are unchanged: the sword
  and shield, the bow and staff, the pickaxe, axe, rod, logs, seeds and
  compost, the Copper Greaves, the clownfish and the box traps.
- The tour's offers went from 2-4 taps to 1, and the Mayor's first hand-in
  went from 6 (7 with the Grotto) to 1.
- The Mayor's slime warning that comes too late (v2.3.2237, the owner's idea)
  is now a sentence: "I was meant to warn you they explode, so consider
  yourself warned."
- The Goo Grotto's aside (v2.3.3579) is the hand-in's last sentence: "The Goo
  Grotto is level 16 inside, so take 2 or 3 friends. I'm out of eulogies."
  With it, the hand-in is 287 characters. The old longest tap was 297.
- Lil Bro's line after a lost race (v2.3.3583) is one tap for any number of
  losses ("I wasn't even trying. ..."). Before any loss it is still "Scared?
  Tap Race! ...".
- No line sends you to a "gold !" any more. The town's work is "on your map".
- The idle chatter, the reactions and the race barks are unchanged.

Tests: `server/test/quest-lines.test.mjs` (every live quest's three lines are
one tap of at most 300 characters, Lil Bro's after any loss, the Grotto's
hand-in, the words), `mayor-grotto` and `mp-mayorgrotto` (the one tap and its
last sentence), `mp-race` §6 (the new loss line), `mp-questline` (the whole
tour, paged through as written).

## v2.3.3611: the zingers back, still one message

The owner, 2026-10-26: "add back the clever zingers in the Npc dialog but
still keep it to just one message before the next call to action. You should
understand the npc's specific personality from just one message."

v2.3.3591 made every line one tap but cut the jokes down to a dry aside. Now
each of the tour's lines is still one tap, with the joke that tells you who is
talking, then the job:

- **Mayor Bro**, the politician: four elections, "thank the voters. Both of
  them", the sword and shield from the school budget, the tourism board that is
  him, the City Council "in a different hat", a parade "right after the bank
  and a guy named Steve".
- **Blacksmith Bro**, the gym bro: he hurt his back picking up a protein shake,
  "every swing's a rep", the "skinny-guy discount", a protein nap he doesn't
  skip.
- **Woodworker Bro**, the scientist: "BroTown's most advanced woodworking lab,
  which is also the only one, which is also my garage", eleven years of pine,
  his wall of beginners' mistakes.
- **Diego**, the hustler: a cookbook he can't cook for ("Chapter One: Fish, But
  Hot"), "that's called passive income, amigo".
- **Farmer Bro**, the hippie: he sang his carrots to sleep, "the rest is a
  feeling", Lil Bro beat his scarecrow in a race.
- **Lil Bro**, the gamer kid: "you have zero aura", "one percent battery",
  "Hacker! That was lag!", and after a lost race "GG EZ! I wasn't even trying."
  and a montage, "Part 7".
- **Beastmaster Bro**, the survivalist: "we're deep in the danger zone. ...Okay,
  it's behind the bakery", boxes under his bed.

What did not change: one tap each (no blank line), 300 characters at most (the
Mayor's slimes hand-in with the Goo Grotto's sentence is the longest at 291),
and every count, place and hand-over the job had: the 4 Slime Remains, the 5
Copper Ore at the orange rocks, the 5 Pine Logs, the 2 cooked fish and the
logs, the 3 carrots, the 4 corner flags, the 3 Box Traps, and the rest.

Tests: `quest-lines` §5 (every offer and progress line with a count still says
it; the tour's first offers carry their joke), `mayor-grotto`, `mp-race` §6 and
`mp-mayorgrotto` 2d read the new lines.
