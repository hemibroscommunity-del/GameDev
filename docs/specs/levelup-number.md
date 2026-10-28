# The level-up's number: in the medallion since v2.3.3693 (big under the banner, v2.3.3676)

## v2.3.3693: the number in the paper centre, in the owner's numerals

The owner, 2026-10-28:

> Also on the level up badge the number just needs to be inside that big paper
> colored center space. You can use numbers from sprite sheets I've given you
> to make it look better than just code drawn

What a player sees now:

- **The level is in the medallion's cream centre**, where the skill's icon
  was. It is drawn in the owner's gold numerals from the Points sheet
  (`public/icons/ui/points/gold-0..9.png`, the same digits as the Points tab's
  counts): gold with a dark edge, made to read on paper. Each digit is its own
  picture, laid side by side with their edges overlapping a little, so "14"
  reads as one number.
- It is 1.25x the old icon's radius tall (`LEVELUP_NUM_H`), about half the
  cream circle's width. It never runs wider than 1.75x that radius
  (`LEVELUP_NUM_W`): a wider number, like "100", is drawn smaller, never cut,
  and every corner stays inside the cream.
- It is pinned to the circle's centre on every frame of the art and grows with
  the circle as the burst plays, as the icon did.
- **The plate under the banner is one row**: the skill's icon (for a character
  level, your portrait, round) before the words saying whose level it is,
  "Bow Level", "Woodcutting · Skill Level (+2)", "Character Level". The plate
  is about 37 px tall, half of v2.3.3676's, so the art keeps more room on a
  short screen.
- How long it stays is unchanged (1.94 s).

Where:

- `src/data/levelUpBurst.js`: `LEVELUP_NUM_H` 1.25, `LEVELUP_NUM_W` 1.75,
  `LEVELUP_NUM_URLS` (the ten files), `LEVELUP_CAPTION_BOX_H` 74 -> 44 (the
  plate's room before it is measured).
- `src/ui/LevelUpBurst.jsx`: `goldNumber` draws the digits at their known
  widths (`POINTS_DIGIT_W.gold`), so nothing shifts as they load;
  `data-levelup-num` carries the level as `data-value`; the icon
  (`data-levelup-icon`) is on the plate.
- `src/rendering/levelUpBurstPreload.js`: the ten numerals are warmed and held
  decoded on the loading screen with the strip and the icons (about 62 KB), so
  nothing is fetched when a level-up lands.

Checked by `mp-levelupnum`, on a phone in the world:

1. A combat skill, a life skill (two levels at once), the character and a
   level of 100, each at rest:
   - the value drawn as its own digit pictures, all loaded;
   - centred on the circle within 1.5 px, every corner inside the cream void;
   - the exact height and width the circle gives it ("100" shrunk to fit).
   - The plate is one row with the icon loaded, level with the words and
     before them, no number on it, and above the dashboard's tray.
2. Held at the art's first frame and at its peak, the number is still in the
   void's middle, at that circle's size.
3. All ten numerals are held decoded before any level-up.
4. On screen as long as before. No page errors. Pictures:
   `levelupnum-one.png`, `levelupnum-two.png`.

`mp-skillup` (moved to the world) reads the number in the medallion and the
icon on the plate. `shot-levelup` checks that the number, not the icon, stays
locked to the circle across the eight frames and grows with it.
`mp-deskplace` finds the medallion's middle by the number.

## v2.3.3676: the number big under the banner, and half again as long

The owner, 2026-10-27:

> I think the level up message should stay on the screen about 50% longer and
> put the number of the level more prominently just below the icon label of
> the level up

## What a player sees

A level-up plays the owner's art in the middle of the screen: the medallion
with your weapon's, skill's or character's picture, the gold LEVEL UP banner
across it, then a small slate plate under it. Until now the plate said it all
on one 18 px line, the level last: "Bow · Level 9", "Woodcutting · Skill
Level 7", "Character · Level 14".

Now the plate leads with **the number**, alone on its own line:

- 42 px tall (32 when two level-ups share the screen side by side), in the
  game's chunky Baloo 2, gold like the banner's letters, with a dark edge so it
  reads at a glance on the plate;
- centred under the medallion, about 14 px below the banner's art;
- and under it, in smaller words (15 px, 13 side by side), whose level it is:
  "Bow Level", "Woodcutting · Skill Level (+2)" when two levels came at once,
  "Character Level".

It stays on screen **1.94 s**, where it was 1.30 s (v2.3.3608 had halved
2.59 s). All the extra time is in the hold, the moment the number stands still
to be read; the art's eight frames and the fade are as they were.

## Where

- `src/data/levelUpBurst.js`: `LEVELUP_HOLD_MS` 455 -> 1,100 (the total
  1,295 -> 1,940 ms), and `LEVELUP_CAPTION_BOX_H` 58 -> 74, the room the fit
  keeps for the plate (the art shrinks to leave it, so the plate never runs
  under the dashboard's tray).
- `src/ui/LevelUpBurst.jsx`: the plate's number line (`data-levelup-num`) and
  the words line under it.

Nothing on the wire changes, and every caller is untouched: the number comes
from the same message (`msg.level` for the character, the skill's level
otherwise).

## Checked

`mp-levelupnum`, on a phone (390 x 844) in the world, through the setter every
real level-up calls (`window._setLevelUpMsg`, shaped as the real senders shape
it):

1. a combat skill, a life skill two levels at once and the character: at rest
   the number is its own line, the level asked for, 42 px and about 2.5x the
   words' height, centred under the medallion, just below the banner's art, the
   words under it, the plate above the dashboard's tray;
2. on screen 1.94 s by the burst's own clock (between 1.45x and 1.55x of the
   old 1.30 s), mounted to gone measured in the page;
3. no page errors;
4. two pictures held in the hold (`window.__btLevelUpFreeze`), one burst and
   two side by side: `tools/qa/mp/out/levelupnum-one.png`,
   `levelupnum-two.png`.
