card: UI3-corner
branch: claude/plan-ui3-10-corner
prs: #2419 (draft, base main; ready)
state: ready

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

- phone runs on the final app code (helpers, ccc14870): charhud, firststeps,
  questline, coachdesk, topbarplace, trackquest, race, weaponswap, membudget
  all green; questguide 7 red, the same 7 on main. main 380317e6 merged.

## Next
- the new head's checks; then one ready message to the orchestrator.

## Found
- (answered) the coach's `questPill` rang only `[data-quest-hud]`: with the
  line gone it would never be done and the Login Key lesson never come.
- mp-questguide is red on main 02966bcb (7: the tutorial quest never reaches
  "ready"); not this card's.

## Needs
- nothing.
