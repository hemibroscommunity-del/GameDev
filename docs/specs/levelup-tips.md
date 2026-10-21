# Your first points, shown (v2.3.3551)

## What the owner asked

On 2026-10-21, given two ways to teach a first level-up (a quest that pays a
level's XP into a combat skill you pick, or tips at the first level-up you
earn yourself), the owner said:

> "Leave tips for first natural level up. I don't want players choosing xp to
> train in for weapons they haven't used yet. Go with your guided level up."

So the game never picks a weapon or a stat for you, and XP still goes only
into the weapon you fight with. What changes is that your first level-up is
**explained**.

## What a player sees

Before this, a first level-up said "Melee · Level 2" over your bro and put a
number on the Character button. Nothing said what points are, where they go,
or that trying one is safe.

Now, the first time you have points to spend and have never placed one, the
quest coach (the same one-card-at-a-time helper that teaches the controls)
walks you there, one step at a time:

Every card is titled **Level up!**, and says:

| Where you are | The ring is on | The card says |
| --- | --- | --- |
| Dashboard folded | OPEN | "You have 6 points to spend. Tap OPEN." |
| Dashboard sideways, folded | its open arrow | "You have 6 points to spend. Open your dashboard." |
| Dashboard open | Character | "You have 6 points to spend. Tap Character." |
| Character, another tab | its Points tab | "Your 6 points are on the Points tab." |
| The Points grid | the top row | "Top row: 3 weapon points for your weapon's stats. Bottom row: 3 shared points for any stat there. Tap a stat to see what it does." |

The numbers are your own: the card counts the points waiting.

Then, when you **Spend** your first point in a stat's window, the window's
"✓ 1 point spent" line gets a second line under it:

> "Not sure? Reset points (free), under the grid, gives them all back."

That line comes only on your first spend, and only against a server that has
the free reset (v2.3.3541).

The stat windows already explain each stat with a before-and-after fight, so
the tip stops at "Tap a stat to see what it does".

## The rules

- **When:** points waiting, none ever placed, and a quiet moment: no blow dealt
  or taken in the last 5 seconds. Mid-fight the card steps aside and comes back
  after.
- **Done for good** the moment any point is placed (the reset's own count of
  placed points), or when you tap the card, as with every coach card. It is
  remembered per browser, like every lesson.
- **Not a nag:** a card left on the same step for 45 seconds steps aside for 5
  minutes. After 3 times unanswered it is put away for good, as a tap would.
  Players who want to keep their points for later are left alone.
- **Past the Mayor's tutorial too.** A first level-up usually comes around the
  Mayor's third quest, but it can come after his fourth, when the coach has
  otherwise retired. This lesson is the coach's only `anytime` lesson: past the
  tutorial it is the only one considered, so no other lesson comes back with
  it.
- **"Skip tutorial" turns it off**, like every coach card.
- **Order:** in the tutorial it comes after the control lessons and before
  "Tap yourself to say something" and "Save your Login Key". Those two are
  important but not urgent, and the level-up is the moment.
- **Nothing is sent:** the tips only point. The XP and the spending are the
  server's, exactly as before.

## Where it lives

- `src/game/pointsTips.js`: the rules and the words (no imports but the
  reset's own, so node runs it).
- `src/ui/mobile/QuestCoach.jsx`: the `points` lesson, the anytime gate, the
  snooze and its give-up, and `__btCoach().points` for tests.
- `src/ui/mobile/sheet/HeroExpanded.jsx` and `src/ui/mobile/InfoPopup.jsx`: the
  reset hint after a first spend (`spentHint`, `data-infopopup-spent-hint`).

## Tests

- `server/test/points-tips.test.mjs`: the rules, the words (singular and
  plural, never a weapon or stat named, never "Wheel"), the first-spend hint,
  and that the coach carries the lesson in the right place with the right
  anchors.
- `tools/qa/mp/mp-pointstips.mjs` (a phone, real fingers, a real server):
  - **A**, in the Mayor's tutorial: no tip before a level-up; after one, the
    ring and words on OPEN, Character, the Points tab and the grid; it steps
    aside for a blow and comes back; a real Spend shows the reset hint, a
    second Spend does not; then never again.
  - **B**, past the tutorial: the card comes alone, and a tap puts it away for
    good.
  - **C**, a point already placed: never a card.
