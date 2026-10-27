# The level-up's number, big under the banner, and half again as long (v2.3.3676)

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
