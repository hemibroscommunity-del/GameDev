card: EN
branch: claude/plan-en-bars (6206), then claude/plan-en-fishsword (6208)
prs: 6206 (the bars) #2358 ready; 6208 (a peer's sword while fishing) opening as a draft, stacked on it
state: working

## Done

- 6206 (`docs/plan/cards/EN-bars.md` PR 1): the mana and energy bars whole
  again, and no shadow of theirs. The frame's cap, middle and cap were given
  their pictures once, when the bar was made, and a bar made before the
  sheet was cut kept the blank for good (Texture.EMPTY): five loose blocks.
  Now the draw hands them their pictures as it does the blocks
  (`entity-ui.js _drawResourceBar`). The bars sat on the display, not its
  `_uiLayer`, so the sun's shadow walked them as body: marked
  `_castsNoShadow` and skipped (`lightfx/casters.js walkDisplay`).
  `mp-resbars` (new): red on main's code at res 1.5 and 3 (20 of 29: no
  frame pictures, 235 to 760 gutter pixels the ground's, 12 or 18 shadow
  pieces against 2), green on this branch at res 1, 1.5, 2 and 3 in both
  sprite programs, rows of 5 and 8, on the test box. Precheck passes.
  Earlier PRs of card EN (6200 to 6205, 6207): merged.

- 6208 (`docs/plan/cards/EN-bars.md` PR 2, on `claude/plan-en-fishsword`,
  stacked on #2358): another player's sword put away while they fish or
  mine.  One rule, `src/game/poseHides.js`, says what a pose that holds its
  own tool hides (the weapon, the held shield, the hand's cap, the arm's
  clones); my own bro's draw and a peer's both ask it (entityRenderer).  A
  peer's weapon was forced visible for every living peer; now it is hidden
  the frame their fish or mine pose starts and shown the frame it ends,
  written only on the change (TRAPS §218).  No weapon is carried on the
  back; the slung shield was already right on both paths.  Suite
  `tools/guards/pose-hides.test.mjs` (kills 25 of 25 mutants); phone test
  `mp-fishpeer`.

## Next

- (card EN's lines done once 6208 lands).

## Found

- (from 6200-6207, still true) the belt's gear sheet first built on the page,
  gearSheets.js `getGearFrame > buildSheet > _buildShirtOnWorker`
  (`gear-sheet`, 34.7-40.6 ms at peer on budget-android).
- `mp-membudget`'s heap line (38.5) is main's own edge (38.3-39.1).

## Needs

- (none). The orchestrator: part 19 (session_01LccHajeEAJmaq9tiJgpFT9).
