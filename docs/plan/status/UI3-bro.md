card: UI3-bro
branch: claude/plan-ui3-3-bro
prs: PR 3 of UI3 (tag 6782): draft, base claude/plan-ui3-1-kit (number in the orchestrator's message)
state: ready

## Done
- tag 6782 (stacked on the kit, Gear's PR 3 merged in first): Bro is ONE page for yourself. `src/game/broHub.js`: `BRO_HUB_DOORS` the six (Combat, Equipment, Life Skills / Feats, Pets, Journey); `BRO_STRIP`, `broStrip(r, who)` (built from `broPassport`), `broSelfPage(id, who)`; roads titles `bro:strip/title`, clan `bro:strip/clan`; `MORE_ROADS.journey` 'bro'. `sheet/BroLanding.jsx` draws the six and the new `sheet/BroStrip.jsx` (the kit's facts, a row of flat doors, `broStrip.css`); `BroCard.jsx` hands `readPassport(S)` and draws `CharacterPage` only for another player; `BroDoorPage` reads the frame entry's `who` and falls to the one page (no 'character' fallback).
- Guards: `bro-hub.test` D1/D2/D3/D5/D7, 1b, 3b rewritten; part 4 B1-B10 off the syntax tree, 15 plants each red; `dash-nav` 2f a function of the roads, its plant red.
- Tests: `mp-ui2bro` rewritten (1a-1e the six and the strip in four shapes and a computer, 2a-2c, 3a-3b, 4, 5, 6/6b, 7a-7b, 8a-8b, 9 another player's Character, 10); `mp-apchip` 3 reads the strip; `mp-ui2frame` 4d's words; `H.dashOpen` rows.
- `states.mjs` ui2-bro-landing / -character (another player) / -titles (from the strip); UI-DESIGN-NOTES "Bro: one page"; the decision log's part 2 line; pictures `docs/shots/ui2-bro-*.png` (before: `ui2-bro-before-*.png`).

- Runs on the final code (the test box, after merging the kit's branch and main once): mp-ui2bro 26/26, mp-apchip 4/4, mp-ui2frame 34/34, mp-ui2combat 51/51, mp-deskkeys 60/61 (8f, the sword's double-click lunge: main's own red, card CT's verdict); precheck 0 FAIL.

## Next
- Nothing: PR 3 waits for the gatekeeper.

## Found
- `BottomDashboard.jsx`:1811 hands Bro's pages only the id, never the stack entry's `who`: a push of another player's page drew yours. Worked round inside `BroDoorPage` (it reads the top entry's `who` from the nav bus); the frame handing it down is cleaner (not my file).
- `CharacterPage` for another player reads YOUR readings (`readPassport(S)`: name, title, levels, AP; seen in `docs/shots/ui2-bro-other.png`); only the label and face are theirs. Step 9 must hand theirs in (not my file: `CharacterPage.jsx` header only).
- A push of `broCharacter` for yourself (nothing does it now) draws the one page under the header word "Character" (FRAME_PAGES' word; the header is not my file).

## Needs
- The owner (FLAGGED): the page's word "Bro" or "Character"; pictures 46 to about 30 px upright; Journey a tile AND later Feats' records door; the strip's title entry interim.
