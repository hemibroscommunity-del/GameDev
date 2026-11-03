# A weapon level-up sends bubbles to your points (v2.3.4042)

The owner, 2026-11-02:

> When a level up on one of the 3 primary combat all weapons happens do a 'jump
> to bag' effect that just shows bubbles in representing xp or something jump to
> the character button or the character button's points section if that menu
> already open.

## What it does
- A melee, bow or staff level-up (`prog3_level` → one LEVEL UP medallion,
  `LevelUpBurst.jsx`): as the medallion starts to fade (`LEVELUP_RUN_MS +
  LEVELUP_HOLD_MS`), 5-7 small glowing bubbles (`pointsBubbleCount`: 5 plus the
  level mod 3) leave it in staggered arcs.
- They fly to the 'points' target (`game/questFly.js QUEST_FLY_TARGETS.points`),
  the first one on screen of: the Character page's Points tab
  (`[data-section="Build"]`), the Character button (`[data-nav="hero"]`), the
  dashboard's fold handle (`[data-dash-fold]`); else the game's bottom-left
  corner. Each lands with the quest rewards' small pop (`.bt-qw-landed`).
- Bubbles are CSS circles (`.bt-qw-bubble`: a gold-white radial fill and a
  box-shadow glow, no filter), so there is nothing to preload. The flight is
  `flyPicture`'s, in its `bubble` mode: Web Animations on transform and
  opacity, the computer's column handled the same way.
- None for a life skill or a character level. Reduced motion: none
  (`flyPicture`). Off for one tab: `?pointsfly=0`.

## Why the place is read once
On a slow phone the 250 ms fade can fall between two drawn frames: the next
render is past the end and draws nothing, and the stack can take the burst away
on its last frame with no render at all. So the medallion's rect is read once
while it holds (one layout read a burst), and the bubbles fly from it at the
fade, or from the unmount if no frame of the fade came. And if a frame hitch stepped from before the hold straight past the end (the
place never read), they leave from where the medallion is pinned: the middle of
the game's column, `LEVELUP_PIN_Y_FRAC` down it (v2.3.4042).

## Where
`src/ui/pointsFly.js` (the flight), `src/game/pointsBubbles.js` (the rules, no
imports), `src/game/questFly.js` (the target, the bubble mode),
`src/ui/LevelUpBurst.jsx` (the trigger), `src/styles/game.css` (`.bt-qw-bubble`).
QA probes: `window.__btPointsFly`, `window.__btQuestFly`.

## Tests
- `server/test/points-fly.test.mjs`: the skills, the off-ramp, 5-7 bubbles,
  the targets' order (and the rewards' own targets unchanged).
- `node tools/qa/mp/run.mjs pointsfly`: a real level-up (the dev kit's levels)
  sends 5-7 bubbles to the Character button; with the Character page open they
  go to the Points tab; none for a life skill or with `?pointsfly=0`; a computer
  playing wide, to its Character button in the column.
