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

- tag 6790: the coach's 5th first step "Your quest" rings the Menu button
  ("Your quests are in the Menu.") when no quest card is drawn (the
  orchestrator's answer, part 34: "fallback anchor"); main 5b30c929 merged.

## Next
- the phone runs on the final code (helpers); one message to the orchestrator.

## Found
- (answered) the coach's `questPill` rang only `[data-quest-hud]`: with the
  line gone it would never be done and the Login Key lesson never come.

## Needs
- nothing.
