# Card UI3, PR 7: the gold on the top bar, between BroTown and the daily spin (one PR)

Model and effort: the strong model, high. Tag: 6786, block UI3. Branch `claude/plan-ui3-7-purse`, STACKED on `claude/plan-ui3-2-hud` (UI3-hud holds `ZoneHeader.jsx`:173 and moves `mp-topbarplace`; you start only after its ready message, on its head): base that branch. ONE draft PR, ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No server file, no cap, no live flag.

## Purpose

The owner, 2026-11-26, in the orchestrator's session: *"Move gold amount in between daily spin and brotown on top bar"*. The top bar (`src/ui/mobile/ZoneHeader.jsx`:200-329; game.css :2238-2411) is today: the Log Out chip at the left (`__left`), the place's name "BroTown" with its logo in the middle (`__mid`, `[data-zone-title]`), and at the right (`__balance`, :317) only the daily spin's button (`[data-login-spin-btn]`, shown while the account has the spin's cap) and its note. The gold is NOT on the bar today: it is in Gear's label row (`GearPanels.jsx`:130-133 `[data-gear-gold]`; UI3-menus is making it a pill). THE HISTORY, read it first (the comments at ZoneHeader.jsx :300-308, `docs/specs/ap-on-the-bar.md`, `git show` of v2.3.4183's commit): v2.3.2320 put the purse at the very top right by the owner's word; v2.3.4183 took it away by their word (*"I don't like the placement of where the gold count is (top right)"*). Today's word is their later one and names the place: BETWEEN the name and the spin, not the corner.

## The readings, chosen so you do not guess

1. **Where**: inside `__balance`, to the LEFT of the spin's button: a coin and the number, `[data-topbar-gold]`. With no spin button shown (no cap, the window open) the gold keeps its place and the corner right of it stays EMPTY, as wide as the spin's button: the gold never slides into the corner the owner disliked.
2. **The bar's centre stays the screen's centre** (what the empty right column was made for, v2.3.1333): the name is centred on the SCREEN at 375 x 667, 390 x 844, sideways and on a computer, with the gold at 0 and at 9,999,999. If the right side grows, the left's `min-width` grows with it; nothing overlaps the name, TEST MODE's tag, the No man's land pill or (under `?hud=0`) the XP bar's slot.
3. **The number**: the purse the page already holds (the same source and the same form as Gear's: `barNumber`), so the two never disagree; it changes when the server's event lands (a prediction is never drawn here that Gear does not draw). The face and colour: the bar's own (game.css :2295 was the old purse's: gold `#EAC675`, Source Sans 3, tabular numbers). Not pressable. An `aria-label` through the say table (`src/data/say/zoneHeader.js`): "Gold: N".
4. **A change is seen**: reuse what v2.3.2320 to 4183 had if git still shows it (a brief pop on a gain or a spend), transform and opacity only (this rail is over the WebGL canvas: TRAPS §42), no timer redraw outside a `startTransition`; if nothing is left to reuse, a plain number and SAY so.
5. **Gear's gold stays** (UI3-menus' pill): "move" is read as "show it on the bar"; whether Gear's goes is flagged to the owner, never settled here. You do not touch `GearPanels.jsx`.
6. **A way back**: `?topgold=0` hides it on one phone (remembered as the bar's other switches are); its row in the switch table (`tools/guards/lib/switches.mjs`, `--write`).
7. No layout read in a frame (`docs/specs/layout-reads.md`); no new art (the coin is the bar's or Gear's existing icon); a Text that is gone is destroyed is not at issue (DOM).

## How it is built (finish.md part 5)

- The rule (shown or not, the words, the number's form) is a small module under `src/game/` (`topGold.js`) with a suite in `tools/guards/` that tests what it DOES: 0, 999, 1000, 9,999,999, a missing purse (shows nothing, never "NaN" or "undefined"), `?topgold=0`. THE DODGES, each planted and seen red: the number read from a second source than Gear's; a missing purse drawn as 0 before the state has come; the switch read backwards.
- `tools/qa/mp/mp-topgold.mjs` (`world: 'wheel'`, its `lane`; a computer run `wide: true`): 1 the gold's DRAWN box lies between the name's box and the spin's box, on the bar, at the four phone shapes and a computer; 2 the name's centre is the screen's centre within 1 px with the gold at 0 and at a seven-figure purse (a record on file first), nothing overlapping; 3 buy or sell at Diego's (`H.approachNpc`): the bar's number equals Gear's after the server's event; 4 with the spin's button gone the gold has not moved; 5 `?topgold=0`: no gold, the bar as on your base; 6 no page errors. Move in this PR, or name as your base's own reds: `mp-topbarplace`, any step that pins the right column empty.
- `states.mjs` and `docs/UI-DESIGN-NOTES.md`'s top bar section (the owner's three words on the purse, in order, with dates).

## Files

Yours: `src/ui/mobile/ZoneHeader.jsx` (the `__balance` block :300-328 and an import; NOT :173 nor the XP slot), game.css's `.bt-zone-header__*` lines for the left and right columns and the gold, `src/game/topGold.js`, its suite, `src/data/say/zoneHeader.js`, `mp-topgold.mjs`, `mp-topbarplace.mjs` where it pins the column, the switch table, `states.mjs`, the notes. NOT yours: `src/ui/hud/*`, `src/game/charHud.js` (UI3-hud's), `GearPanels.jsx`, `src/ui/kit/*`, `src/ui/BroTown.jsx`, a renderer, the daily spin's own code (`loginSpinBus`, its button's rule).

## Done when

Precheck 0 FAIL; the suite's dodges seen red and back; `mp-topgold` green on the final code, `mp-charhud` and `mp-topbarplace` as green as on your base; `playable` and `memory-budget` green on the PR. Your ONE message: the PR, its full head, the preview's address, pictures of the bar at 390 x 844 and 844 x 390 (deviceScaleFactor 2) with and without the spin's button, what reading 4 found, and for the owner: that Gear still shows the gold too (theirs to say if it goes).
