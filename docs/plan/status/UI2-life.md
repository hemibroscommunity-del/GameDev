card: UI2-life
branch: claude/plan-ui2-15-life
prs: Life Skills' draft PR (tag 6694; base claude/plan-ui2-13-ranks)
state: ready

## Done
- v2.3.6694 (card UI2-life, the build's step 6): Life Skills under the new frame. The landing (page id `skills` kept: PANELS.skills draws `LifeSkillsDoor`, the new page under ui2FrameOn, today's SkillsPanel under `?ui2=0`): "Total level" the recessed stat, the ten raised doors filling the page (five by two; one row of eleven sideways), "Lv N", the thin bar and the dot INSIDE each; a skill's page (ten frame pages lifeWoodcutting..lifeEnchanting: level and the worker's XP need, facts: next, latest, the guild's line, doors All unlocks (n) and How it works); All unlocks (`lifeUnlocks`, the whole ladder, farming's crops, the honest empty for trapping and enchanting); How it works (`lifeHow`: today's detail lines moved whole into `sheet/SkillHow.jsx`, which SkillsPanel calls too). The rules `src/game/lifeProfile.js`; BroCard's sum one call (a missing skill reads 1, not 0); BroDoorPage threads the entry's `sel` beside `who`.
- `tools/guards/life-profile.test.mjs` (A1-A10, B1-B6; plants P1-P15 each red); 41 hand mutants of lifeProfile.js, 0 survivors. `tools/guards/life-mount.test.mjs` on jsxMount.mjs (M1-M7 each red).
- `mp-ui2life`; mp-hitladder and mp-xpfade moved to How it works; states ui2-life-landing, ui2-life-skill, ui2-life-unlocks (dash-bro-skill-detail is How it works under the frame); UI-DESIGN-NOTES "Life Skills under the new dashboard"; the decision log's line (UI_ARCHITECTURE_V2.md part 13).

## Next
- Nothing: the PR waits for the gatekeeper's sitting 73.  THE MEND OF SITTING 72 (held: "the card's dodge 'another player's XP shown' is green"; the drawing's `who` was tested only in the rule): `life-profile.test` C1-C4 read each page's syntax tree (every lifeSkillProgress, lifeTiles and lifeTotal of a page with a `who` handed that who; the How it works door only under `self`; the How it works page only under `who == null`, and it takes no who; "Not shared" first), plants Q1-Q7 each red (Q1-Q3 the held head's three places). And a `who` with no `lifeSkills` (the Ranks row's) now has NO level (`lifeShared`, null; A8d said 1 each, a number the worker never sent): the landing, a skill's page and All unlocks say "Not shared" (a new say key). 10 hand mutants of the changed lines, 0 survivors. Then the Ranks branch's mended head merged in (it carries main 5ab943fe).
- Before the mend: ui2life 28/28, hitladder 50/50, xpfade 31/31, membudget 12/12.

## Found
- The names do not fit five across at the navigation size (Woodworking 91 px, a tile 72-83 upright, 57 sideways at 667 x 375): they break at their joint; told to the orchestrator.
- mp-ui2bro 9 (another player's Character: no `[data-char-portrait] img`, whose "Sunburn's Bro" where it wants "Sunburn"): red on this stack from UI2-ranks' 975373fb (CharacterPage.jsx); this PR touches neither file.
- Woodcutting's and Mining's rungs past 20 are in the tables but grow nowhere on the Wheel (GATHER_REQ_LVL); shown as the game's ladder, as today's detail did.

## Needs
- Nothing (the orchestrator's yes, 2026-11-27, for 12 case lines at the end of `dash/MenuGrid.jsx` doorWord).
