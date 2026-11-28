card: Z
branch: claude/plan-z-sitting-75
prs: this PR (tag 6880, Z's fifth block 6880 to 6899: its four older ones used up), the only line
state: ready

## Done (sitting 75, main 46740533; 11-28's second sitting, a READING)
- No PR open: nothing listed, nothing rehearsed.
- Read the fast lane's seven merges on the top model (finish.md part 8
  rule 4): #2435 UI4 Combat, #2438 `?comboaim`, #2437 `?bighud`, card MN's
  #2439 shell, #2440 Bag, #2441 Quests, #2442 Power. Condition 1 held for
  each (their `server/` files only suites importing `src/game` rules).
## BUGS IN BEHAVIOUR, mends owed on main (the orchestrator's)
1 MN Power: `src/ui/menus3/Menus3Power.jsx`:165-185: a point the worker
  takes after the 3 s wait is called refused and stays in the draft; the
  next Apply sends it again (two spent for one staged; the free Reset undoes).
2 MN Quests: `src/ui/menus3/menus3Wire.js`:190-199 (`dashNav.js`:115): a
  quest's link to Codex, the band's "Menu", then X: the Quests panel reopens.
3 MN keys: `src/game/deskKeys.js`:76-80: I (the Bro button wears it), P, L,
  K, U, O open today's pages with the new panel still open (card MN flagged P).
4 MN drawer (sideways, computer; by reading): `Menus3Gear.jsx`:44 and
  `WorldMapOverlay.jsx`:225 at z 45 over the panel layer's 40
  (`game.css`:7308): the gear over the Bag; a click under the minimap opens
  the World map.
5 UI4 `?bighud`: `src/game/bigHud.js`:64 reads `swValue`, never `sw()`:
  with `?padskin=0` the HUD still grows (`switches.js`:372 NEEDS unread).
6 MN Power (minor): `Menus3Power.jsx`:272-280: a timeout after leaving
  shows a stale "refused" note on the next opening.
## Judged debts
deskKeys' UI import cosmetic; the Bag's pictures main's own; camera-follow
and gear-socket allows narrow; systems.mjs lines and menus3-bag 7c honest;
Power's queue: no double send by a tap, a render, a reconnect or leaving.
## Found
- debts.md (75): the green plants, a line a card. QuestCoach.jsx:780
  (sitting 73) not re-read.
