card: UI2-pets
branch: claude/plan-ui2-14-pets
prs: the Pets PR (tag 6696; draft, base claude/plan-ui2-12-codex)
state: ready

## Done
- tag 6696, the build's step 6, Pets as Bro's door: the companion's landing (`pets`: the kit's zones and showcase; its name, kind, Golden and Big over Owned and All, its level, XP and ward flat under them; Put away), Owned (`petsOwned`: More room, a card a pet), a pet's page (`petsOne`: Take out or Put away, Rename, Release asked once, Sell where the store sells pets), All (`petsAll`: the journal by stage; the Codex's Pets door opens it); another player's built and tested, opened by nothing.
- The rules: src/game/petPages.js; suite tools/guards/pet-pages.test.mjs (R1-R15, D1-D17 red); mutation-run by hand: 147 mutants, 6 left alive, each equivalent (listed in the PR).
- The mount guard tools/guards/pets-mount.test.mjs (M1-M6 red), on jsxMount.mjs.
- Today's page under `?ui2=0` (PetsPanel.jsx's choice; its journal read through petPages.js).
- Kit lines: Ui2Collection draws no kinds row with no kinds; Ui2Showcase `head`, and a fact's `attrs`.
- The phone test mp-ui2pets; the four older tests moved to Bro's door (mp-beastmaster, mp-devpet, mp-petsmatter, mp-trapping).
- The mend of sitting 72 (HELD: "'Release with no confirmation' (PetsPage.jsx ~263) and 'a second press of Take out sent while the first is out' (no `press()`)", D7 and D16 red only in petPages.js, green planted at the page): pet-pages.test now reads the drawing's tree too. W1: every sendPetRelease sits in the kit's Ui2Confirm `onYes` (irreversible, the card's words, its way back "Keep"), the kit's dialog answers Enter and Esc, and no other send but the Pet House's sits in a Confirm. W2: every send is the arrow handed to `press(hold, ...)`, press the page's usePress through petsPressNow. Plants E1-E9 at the page, each red. The kit's Ui2Confirm takes `no`, the no button's label (outside the card, the orchestrator's leave; default "Cancel" unchanged), so Release's question reads "Release <name> for good?" with Release and Keep, as today's page. Screen `dash-pets-release` (states.mjs, packets.mjs, UI-DESIGN-NOTES); mp-ui2pets 4g reads "Keep". The Codex branch's mend and main merged.

## Next
- Nothing: the PR waits for the gatekeeper.  The mend's runs on its final code (the Codex branch 9a222dc8 merged, which carries main 5ab943fe; the test box): pet-pages 44/44 (W1, W2; E1-E9 red), screen-zones and ui2-tokens green, precheck 0 FAIL; ui2pets 30/30 (4g: "Release Ember for good? Release Keep", Keep keeps it).

## Found
- mp-beastmaster: "stands east of the Woodworker's steps" and "drawn ... loaded behind the loading screen" red on this branch; no world, NPC or drawing file is touched here: not mended (TRAPS §177: a question about the test first).
- storeListPet posts "/list", a route with no action row (traps-economy-social §288's own note): selling a pet never leaves the page, today's page and the new one alike. Not mended (outside the card).

## Needs
- Nothing.
