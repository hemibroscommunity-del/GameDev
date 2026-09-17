# The level-up follow-up — the answer, and the pictures

v2.3.2610. Companion page to the PR, because GitHub's PR-body API mangles
markdown image syntax and most of this is pictures.

---

## 1. The "impossible" level — you were right, and nothing is broken in the game's maths

**Your level did not go up.** Nothing was minted, the server was never
involved, and no combat skill quietly moved. What went up was an old counter
that the game stopped using a long time ago and forgot to stop *talking* about.

Here is the whole thing in plain terms.

The game has two things it calls a level:

- **Your character level.** This is the number on your dashboard. It is worked
  out as *Melee level + Bow level + Magic level*, added together. That is all
  it is. It is computed the same way on your phone and on the server, from the
  same three numbers.
- **Your combat skill levels.** Melee, Bow and Magic each have their own.

Because your character level is just those three added up, it **cannot** move
unless one of them moves. You were right that what you saw should be
impossible.

There is also a **third**, much older thing, left over from how the game worked
before the current skill system: five hidden training counters called Melee,
Bow, Magic, Vitality and Stamina. They still tick up every time you kill
something. They buy you nothing — your health, stamina, mana and level all come
from the new system now — but when one of them ticked over, the game still put
a big gold **LEVEL UP!** on your screen, with **Level 24** underneath it, and
never said which of the three "levels" it meant.

That is what you saw. Same gold banner, same words, for a counter that does
nothing.

### Proof, from a real kill in the running game

`docs/triage-2026-09-17/assets/levelup/before-main-t1-tick.jpg`

That is today's live build. One monster kill. The hidden Melee counter went
from 23 to 24, **the character level stayed at 3**, no combat skill moved — and
the screen said `LEVEL UP!` / `Level 24`. (It is faint in the shot because gold
text over town's pale sand washes out, which is its own old problem and part of
why the new art exists.)

### After

`docs/triage-2026-09-17/assets/levelup/after-t1-tick-prog3.jpg`

Same kill, same counter crossing, this branch: **nothing is shown at all.** The
counter still ticks — it is still there as a safety net for very old save files
— but the game no longer claims you levelled when you did not.

`docs/triage-2026-09-17/assets/levelup/after-t1-tick-legacy.jpg`

For a character still genuinely running on the old system, the tick is real, so
it keeps a message — but it now reads `SKILL UP!` / `Melee Level 24`, which is
what it always meant.

**So: nothing to fix in the progression maths. The problem was that the
notification never said which kind of level it was talking about — which is
exactly what points 2 and 3 fix.**

---

## 2. Why the old level-up was still playing

Two separate reasons, both now fixed.

**The banner.** The new art (PR #660) replaced the old one for messages tagged
`combat` and `life`. The hidden-counter message is tagged `power` / `vitality` /
`agility` / `mind` / `endurance`, so it was never on that list, and it kept the
old banner. That is the same thing as point 1 above — one bug, two symptoms.

**The sound, on every level-up.** This one was hitting you every single time,
not just on the odd one. The old fanfare — a seven-note bleepy arpeggio with a
chord at the end — was still being fired from five places alongside the new
sting. Both played, every level-up. They are gone; the new sting is now the only
thing that makes a sound when you level, and it is fired from inside the art
itself so it starts on the same frame.

The old floating text at your feet (`LEVEL 12!` and `HP/MANA RESTORED`) is gone
with it. The refill is now written on the new notification's caption instead, so
you have not lost the information. The screen shake and the gold particle burst
stay — nothing in the new art replaces those.

**Every place in the game that can raise a level-up message was checked**, and
each one is now accounted for:

| Where | What it is | What it does now |
|---|---|---|
| `levelCelebration.js` (4 client paths) | character level | new art, portrait |
| worker `combat_credit` | character level (old build-point path) | new art, portrait |
| worker `prog3_level` | skill level **and** character level | new art, **two of them** |
| `gameEvents.js` client loop | character level (single-player/dungeon) | new art, portrait |
| `celebrateLifeSkillLevel` + 7 crafting panels | life skill level | new art, skill icon |
| `combatHelpers.pushStatIncreaseNotice` | the hidden counter | **silent** (see point 1) |
| `zoneTransitions.js` (3 places) | red "you can't go there yet" warning | old banner, on purpose — not a level-up |
| `awardWeaponXp` (2 places) | old weapon-skill level | already switched off for your character since v2.3.1660 |

---

## 3. Both playing side by side, with your face in the character one

When you level a combat skill, two things actually happen at once: **Bow goes to
7**, and because your character level is those three added up, **your character
level goes to 14**. The game was sending both of those into a single slot in the
same instant, so the second one deleted the first. That is the overwrite you
guessed at.

They now play together, in two columns, and the character one wears your
character's portrait in the middle circle instead of a skill icon — the same
picture the Shared button uses in the points screen, read from the same place,
so the two can never disagree.

### Both, at your sizes

`docs/triage-2026-09-17/assets/levelup/pair-360-portrait.jpg`

`docs/triage-2026-09-17/assets/levelup/pair-390-portrait.jpg`

`docs/triage-2026-09-17/assets/levelup/pair-360-landscape.jpg`

`docs/triage-2026-09-17/assets/levelup/pair-390-landscape.jpg`

### Both, actually playing — filmed, not posed

These are frames the game really painted, taken off Chromium's screen recorder
rather than by a screenshot timer, because "they both played" is a claim about
*time* and a screenshot takes longer than a frame of the animation does. Each
tile is labelled with the millisecond it was captured at. You can watch the two
medallions grow together, the two captions arrive together, and both fade out
together.

`docs/triage-2026-09-17/assets/levelup/film-390-portrait.jpg`

`docs/triage-2026-09-17/assets/levelup/film-360-portrait.jpg`

`docs/triage-2026-09-17/assets/levelup/film-390-landscape.jpg`

`docs/triage-2026-09-17/assets/levelup/film-360-landscape.jpg`

### The choices I made without asking

- **Two at most.** 360px wide is the narrowest phone the game supports, and two
  columns already take the art to about half size. A third would either overlap
  the other two or shrink all of them past the point where you can tell which
  skill the icon is.
- **A third one arriving replaces the older of the two**, rather than queueing
  behind it. Queueing sounds fairer but a ten-point spend in the Build sheet
  would owe you half a minute of overlay.
- **The same skill levelling twice in a row replaces itself** instead of taking
  the second column. Two Woodcutting banners side by side say nothing that one
  says.
- **The column count does not shrink back to one mid-celebration.** If one of
  the two finishes first the other stays in its column until both are done —
  a banner that jumped back to the middle would read as a glitch.
- **Both bursts make one sound.** The sting is already limited to one per 450ms
  so that a flurry cannot machine-gun it, and that is what stops a pair that
  starts on the same frame doubling the fanfare.
- **The character one is not announced twice.** The server tells you the moment
  it happens; your own copy of the level catches up a second or two later, when
  the next batch of state arrives, and the old client-side celebration would
  then have announced the same level again on your next kill. It no longer
  does — though the screen shake, the pool refill and the gold particle burst
  still fire, because the server does not send those.

### The measurements

Measured on the live DOM at each of the four framings, not judged from the
pictures:

```
  4/4 framings showed BOTH notifications from one prog3_level message
  tightest gap between any two painted boxes, across all four:  14.0px
  nothing off-screen, no caption crossing into the dashboard tray
  both medallions animate (6 distinct sizes each over one run)
  character medallion is the portrait:  yes, all four
  character level marked as announced:  yes, all four (this is what stops the
                                        second announcement described above)
```

The 14px is at 360 and 390 portrait, between the two caption plates; landscape
has 119px and 221px. Nothing here is tappable, so it is a readability number
rather than a mis-tap one — but it is printed rather than hidden behind a
"passed", because whether 14px looks cramped to you is your call, not mine.

### Loading

The portrait is decoded and held before you can ever level up — checked
directly, by value, in the running game rather than assumed:

```
  preloadWorldAnimations().levelUpBurst = fulfilled
  sting DECODED before any level-up = true
  character portrait published = true
  portrait DECODED before any level-up = true
```

---

## How to re-run all of this

```
npm run build && node tools/qa/mp/shot-levelup.mjs
```

It starts a real worker, joins a real character, drives real messages through
the real handlers, and fails the run if any of the numbers above stop being
true.
