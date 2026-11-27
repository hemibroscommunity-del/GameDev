card: UI3-corner
branch: claude/plan-ui3-10-corner
prs: (the draft PR, base claude/plan-ui3-2-hud: opened with this commit)
state: working

## Done
- tag 6790: the corner holds the character HUD alone. `src/game/hudCorner.js`
  (the rule, `?questline=1` remembered), QuestCard draws nothing by default
  with the HUD, game.css moves the status column and the party chip into the
  line's place, the coach keeps clear of the HUD's own box;
  `tools/guards/hud-corner.test.mjs` (the dodges planted, each red);
  mp-charhud 4 and 5 on the running page; the switch's row; states.mjs,
  UI-DESIGN-NOTES and `docs/specs/hud-corner.md`.

## Next
- the phone runs on the final code; the PR; one message to the orchestrator.

## Found
- the coach's 5th first step `questPill` rings `[data-quest-hud]`: with the
  line gone it is skipped as unreachable and never done, so `passkey` (the
  Login Key lesson, QuestCoach.jsx near 1592) would never come. Asked the
  orchestrator (QuestCoach.jsx is UI3-tutor's beyond the charHudSpan lines).

## Needs
- the orchestrator's answer on `questPill` (see Found).
