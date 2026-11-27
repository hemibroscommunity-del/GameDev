card: UI2-pets
branch: claude/plan-ui2-14-pets
prs: the Pets PR (tag 6696; draft, base claude/plan-ui2-12-codex)
state: working

## Done
- tag 6696, the build's step 6, Pets as Bro's door: the companion's landing (`pets`: the kit's zones and showcase; its name, kind, Golden and Big over Owned and All, its level, XP and ward flat under them; Put away), Owned (`petsOwned`: More room, a card a pet), a pet's page (`petsOne`: Take out or Put away, Rename, Release asked once, Sell where the store sells pets), All (`petsAll`: the journal by stage; the Codex's Pets door opens it); another player's built and tested, opened by nothing.
- The rules: src/game/petPages.js; suite tools/guards/pet-pages.test.mjs (R1-R15, D1-D17 red); mutation-run by hand: 147 mutants, 6 left alive, each equivalent (listed in the PR).
- The mount guard tools/guards/pets-mount.test.mjs (M1-M6 red), on jsxMount.mjs.
- Today's page under `?ui2=0` (PetsPanel.jsx's choice; its journal read through petPages.js).
- Kit lines: Ui2Collection draws no kinds row with no kinds; Ui2Showcase `head`, and a fact's `attrs`.
- The phone test mp-ui2pets; the four older tests moved to Bro's door (mp-beastmaster, mp-devpet, mp-petsmatter, mp-trapping).

## Next
- The phone run on the final code; the four moved tests on helpers; merge main, codex and ui3-bro; push; the ready message.

## Found
- storeListPet posts "/list", a route with no action row (traps-economy-social §288's own note): selling a pet never leaves the page, today's page and the new one alike. Not mended (outside the card).

## Needs
- Nothing.
