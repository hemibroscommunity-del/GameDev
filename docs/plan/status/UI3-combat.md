card: UI3-combat
branch: claude/plan-ui3-4-combat
prs: PR 4, Combat's hub and the one template (tag 6783): draft, base claude/plan-ui3-1-kit (number in the orchestrator's message)
state: ready

## Done
- tag 6783, PR 4 (UI3-combat; branch claude/plan-ui3-4-combat from claude/plan-ui3-1-kit dd44d30e, the kit's last commit 50727384 and main eb90c6fd merged in once): the hub's pictures sized from its room (`hubArtSize`: 48 px at 390 x 844, 44 at 375 x 667, 45 / 40 sideways; 32 / 26 before), the level 24 px, a 3 px bar, a count drawn only while > 0 (`pointsShown`); ONE template `sheet/attrTemplate.jsx` (SummaryStrip, AttrLine, AttrGrid) drawn by WeaponPage (Sword, Bow, Staff: no branch on the weapon) and SharedPage: DPS / Max HP the kit's sunk stat, Damage, Attack speed, Crit chance, Range (Defense) facts in one container, the full-width line over the six (seven), gold with points and muted at 0 (`pointsTone`), a gold "+" on each while points wait (`attrPlus`); the left column and its CSS gone; `weaponPageFold(h)` folds the line onto the level row under 172 px; the raised-forms allow list falls by WeaponPage and SharedPage; `combat-hub.test` C13-C20 with 29 new plants, each red; `metric-tree.test` T9 re-anchored on the new strip (asked of the orchestrator); `mp-ui2combat` rewritten (1b, 1b0, 1e, 2a1, 2b, 2e, 2f, 3h2, 4a1, 4b1, 4b2, 4f); states, the notes' section, the decision log's line; pictures in docs/shots/ui2-combat-*.png (before: *-before.png).

## Next
- Nothing: the PR waits for the gatekeeper.

## Found
- The real room at 375 x 667 on the test box holds the four bands (the page is taller than 172 px there; the master notes measured 168 before the kit's lower bevels), so the fold does not trigger on that phone; it is built, guarded (C18) and shown on a page held to 168 px (4b2, `ui2-combat-sword-fold-168.png`).
- A weapon's points cannot all be Spent from one page: each attribute has its cap (Sword 12's six took 21 of 33), so the "pool at 0" case is the dealt Staff (no points of its own, none free).

## Needs
- The owner (FLAGGED): the mock-up's "points available", "Critical", "Speed" against the game's "points to spend", "Crit chance", "Attack speed" (the game's kept); the fold under 172 px and the road line leaving the row there (read in the bar's label); the mock-up's commas ("4,393": the game prints none); the hub's level 24 px sideways with the count beside the name.
