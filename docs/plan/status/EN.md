card: EN
branch: claude/plan-en-bars (6206), then claude/plan-en-fishsword (6208)
prs: 6206 (the bars) #2358 ready; 6208 (a peer's sword while fishing) opening as a draft, stacked on it
state: working

## Done

- 6206 (#2358, card PR 1): the mana and energy bars whole again, no
  shadow of theirs (`entity-ui.js _drawResourceBar`, `casters.js`);
  `mp-resbars` red on main, green on the branch at res 1 to 3, on the test
  box. Earlier PRs of card EN (6200 to 6205, 6207): merged.
- 6208 (card PR 2, `claude/plan-en-fishsword`, stacked on #2358): another
  player's weapon put away while they fish or mine. One rule,
  `src/game/poseHides.js`, asked by my bro's draw and a peer's; hidden the
  frame the pose starts, shown the frame it ends, written only on the
  change (TRAPS §218). Suite `pose-hides` (25 of 25 mutants); `mp-fishpeer`
  red on PR 1's code, green on this; ghost-audit sample (fish, mine) green.

## Next

- (card EN's lines done once 6208 lands).

## Found

- (from 6200-6207, still true) the belt's gear sheet first built on the page,
  gearSheets.js `getGearFrame > buildSheet > _buildShirtOnWorker`
  (`gear-sheet`, 34.7-40.6 ms at peer on budget-android).
- `mp-membudget`'s heap line (38.5) is main's own edge (38.3-39.1).

## Needs

- (none). The orchestrator: part 19 (session_01LccHajeEAJmaq9tiJgpFT9).
