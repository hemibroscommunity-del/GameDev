card: UI2
branch: claude/plan-ui2-5-kit
prs: the kit's draft PR (ready)
state: ready

## Done
- v2.3.6680, the build's step 1: the tokens (`src/game/ui2Tokens.js`), the kit's style sheet with its block written from them (`src/ui/kit/ui2.css`), the pieces (`src/ui/kit/`), the page `?uikit=1` with the Bro landing and Character samples, `?ui2shine=0`, the suite `tools/guards/ui2-tokens.test.mjs` (all pass; 188 mutants of the token module, one survivor: `c <= 0.03928` as `<`, equivalent: no 8-bit colour lands on 0.03928), `mp-uikit` (23 PASS, 0 FAIL, on the test box; run twice, the second after the guards' fixes), pictures `docs/shots/ui2-kit-*.png`.

## Next
- Nothing: the PR waits for the gatekeeper.

## Found
- Part 1's (the audit's, 6401) four facts stand: `git show 06a11e09:docs/plan/status/UI2.md` (main's copy, merged here), and its documents in docs/design/.
- `tools/qa/ui-review/capture.mjs --check-notes` already fails on main: 18 screens in no ChatGPT packet and two packets over 9 pictures (`tools/qa/ui-review/packets.mjs`); this PR adds its own screen to a packet of its own, so the count stays 18.

## Needs
- The samples' real data is HANDED to the page by the QA harness (`window.__btUiKitHand(S)`): open-hand.test closes `window._gameState` to any new reader, and the fixture lies outside the game's tree. The live Bro screens (the next card) are handed the state by their parent, as BroCard is.
