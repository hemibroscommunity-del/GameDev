# Card UI3, PR 10: only the character HUD in the top-left corner; quests stay in the Quests area (one PR)

Model and effort: the strong model, high. Tag: 6790 (block UI3, 6780 to 6799). Branch `claude/plan-ui3-10-corner`, STACKED on `claude/plan-ui3-2-hud` (UI3-hud, #2406, mended head 5ecce925, main e8ccff26 in it; it lands in sitting 72). ONE draft PR, base `claude/plan-ui3-2-hud`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No server file, no cap, no live flag: the PR deploys nothing. You commit this card as `docs/plan/cards/UI3-corner.md` in the PR.

## Purpose

The owner, 2026-11-27 (about 04:36 UTC), typed in the orchestrator's session: *"When is the character hud going in top left? Also move stuff out of the way. Maybe just keep quests in quest area for now. Leave only character hud in top left corner. Needs to fix tutorial messages over new controller area."*

This card is the middle sentences: IN PLAY THE TOP-LEFT CORNER HOLDS THE CHARACTER HUD AND NOTHING ELSE THAT IS ALWAYS THERE. The last sentence (the tutorial messages and the controller) is card UI3-tutor's, built beside you: not yours.

## What is there today (on your branch; read by range, never BroTown.jsx whole)

- The HUD: `src/ui/hud/CharacterHud.jsx`, `charHud.css` (`.bt-charhud`, top `var(--bt-hud-base,56px)`, left 8, 184 x 52; sideways 176 x 48), rules `src/game/charHud.js`, the column's place `src/ui/hud/hudColumn.js`. Its switch `?hud=0`.
- THE QUEST LINE under the HUD: `src/ui/QuestCard.jsx` (UI3-hud made it a one-line tracker; `data-quest-hud`; top `var(--bt-hud-top)`, left 8), mounted in `BroTown.jsx` beside the HUD's mount. It shows quest information outside the Quests page.
- The status column (`ElemStatusChips` wrapper in BroTown.jsx: elemental chips, buff chips, the TrapButton; top `calc(var(--bt-hud-top) - 12px)`, left 8) and the party chip (`src/ui/panels/PartyHUD.jsx`, `--bt-party-top` / `--bt-party-left`). They show only at times (a status on you, a party).
- `src/styles/game.css`: `--bt-hud-top` is the base plus `--bt-charhud-h` while `html[data-charhud="1"]`.
- `src/ui/mobile/QuestCoach.jsx` lines near 279 and 303 use `charHudSpan()` (the HUD plus the quest line as one box).

## The readings chosen (the orchestrator's; the owner is told each and may change it)

1. THE QUEST LINE LEAVES THE WORLD. With the HUD on, no quest tracker is drawn over the play area: the tracked quest, its steps and its "ready" state live on the Quests page (the Quests button and its pinned cards). Nothing else a quest does changes: the world's markers, the minimap's marks, the coach's lessons (UI3-tutor's), the turn-in, the Quests button's own badge if it has one. If the Quests button has NO sign that a quest is ready to hand in once the line is gone, give it the smallest one the kit has (a dot), and say so.
2. A SWITCH BRINGS IT BACK: `?questline=1` (remembered like `?hud=0`; its row in the switch table). Default: gone. With `?hud=0` the old quest card is as it is on main today.
3. THE THINGS THAT SHOW ONLY AT TIMES (status and buff chips, the trap button, the party chip) take the place the quest line leaves: directly under the HUD, the same left edge, no gap where the line was; sideways the party chip stays beside the HUD as today. Nothing permanent sits in the corner but the HUD. Take the owner's pictures of this (below): where these go is THEIRS TO CHANGE.
4. `charHudSpan()` and `--bt-hud-top` follow: the span is the HUD alone when the line is gone.

## Dodges (each must turn a check RED; a guard reads the syntax tree or the running page, never a pattern of text)

- the quest line still drawn in play with the HUD on and no `?questline=1` (hidden by opacity, moved off-screen, or drawn with no text);
- `?questline=1` bringing nothing back, or `?hud=0` no longer giving main's quest card;
- the status column or the party chip left where it was, with an empty band the height of the quest line between it and the HUD (upright AND sideways);
- a quest's ready state shown nowhere outside the Quests page (if reading 1's dot was needed);
- the coach measuring a quest line that is not there (its card jumping to the corner).

## Done when

- A rule module under `src/game/` (in `charHud.js` or beside it) says what the corner holds for a given state (HUD on or off, questline on or off, upright or sideways), with a node suite on what it does; the big file gains calls, not logic.
- `mp-charhud` (and the phone tests the line's removal touches: `mp-trackquest`, `mp-firststeps`, `mp-topbarplace`, `mp-questguide` if it reads the line) are green on the FINAL code, `world: 'wheel'`, upright 375 x 667 and sideways; every changed step says why. The questline's `playable` test (mp-questline) still passes: it runs on every PR.
- Pictures for the owner in `docs/shots/`: before and after, 375 x 667 upright and one sideways, one with a status chip and the party chip showing.
- The switch's row; `states.mjs` and `docs/UI-DESIGN-NOTES.md`'s HUD section say the corner's new rule; `docs/specs/` the HUD's spec one paragraph.

## Not yours

`CharacterHud.jsx`'s look and `charHud.css`'s art (UI3-hudart, #2414, on the same base), the purse (#2410), the nameplate (#2411), the coach's cards and every tutorial message's place (UI3-tutor, branch `claude/plan-ui3-11-tutor`, built beside you: it works in QuestCoach.jsx near 1924 and 2160 to 2180, ControlsTutorial.jsx, the welcome text in BroTown.jsx near 14005 and 14326, InstallHint.jsx, QuestStepNudge.jsx). In QuestCoach.jsx you touch ONLY the `charHudSpan` lines. A file outside this card that the job truly needs: ask the orchestrator first, one message, your recommendation in it.
