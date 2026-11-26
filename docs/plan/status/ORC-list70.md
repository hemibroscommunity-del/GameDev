# Sitting 70's list (gatekeeper session_01LccHajan3Ye4sHJ9ijucvv, STOPPED: never message; it reached part 29 at 22:27 UTC 2026-11-26; saved by part 29, who did NOT begin the merge: it was past its memory line)

Main at the rehearsal: eb90c6fdee49d274303b82d2c665147e301dc7b5, tree 84ecad697a4587f4a6611a4b1a8852469607f4fa. TWO HELD (below). Every PR is an open DRAFT: mark each ready just before merging it, "Create a merge commit", BOTTOM FIRST. A PR whose base is not main is retargeted to main AFTER the PR under it lands. The orchestrator makes every mend (merge origin/main, resolve as written, precheck 0 FAIL, push). Before merging, check the head's TREE and main's tree after are the ones given. Every line was counted landing with ONE merge base. Every head's checks were GREEN (test, lint-build, playable, memory-budget, Pages); part 29 fetched all seven heads at 22:29 and each is the one below.

DEPLOYS: in THIS order NO MERGE DEPLOYS THE WORKER (#2380's filter is on main before #2393's server/test file).

LINE 1, TD (it changes .github/workflows/deploy-worker.yml; the owner's approval is quoted in ORC.md: "I can't approve in GitHub. I'll approve here.", 20:27 11-26, part 28's session). PART 29 READ THE DIFF at 22:29: under .github/ and server/wrangler.toml the WHOLE stack #2380 to #2383 changes ONE thing: deploy-worker.yml's `paths: ['server/**']` becomes `paths: ['server/**', '!server/test/**', '!server/README.md']` with a comment above it; #2381 to #2383 add nothing there; #2393, #2390, #2404 touch neither. If a re-read shows anything else, STOP and tell the owner.
 a. #2380 claude/codebase-inventory-gaps-pz4bpa, head 59033267dc5e55968a8027ec123b79e1353598eb, base main. MEND FIRST:
    - merge origin/main into it. ONE conflict, tools/dev/tag-blocks.json: `git checkout --theirs tools/dev/tag-blocks.json`.
    - then add the line `    "TD": [[6700, 6719]],` straight after `    "UI2": [[6680, 6699]],`. The end then reads UI2, TD, PRT, KEEP, LOAD, nextBlock 6780.
    - `node tools/guards/systems.test.mjs --write` and `node tools/guards/switches.test.mjs --write` (they change nothing); precheck; push.
    - Tree 7bd0bbefaf95b209259d2bb104a64aba2be1807f (= main's tree after).
 b. #2381 claude/plan-td-2-lint, head 3ae3c9ec077da8a43b6d1105919678676bd4be75. Retarget; UNCHANGED. Main's tree after: 26309e41bfd2a3fa87f7a6ca5cbd77516cea26bb.
 c. #2382 claude/plan-td-3-unused, head 7dea131f5ba98ac04795091fd0f9838a83356c29. Retarget; UNCHANGED. Main's tree after: 67448f156df51b9561f3525f59e78cf93222a964.
 d. #2383 claude/plan-td-4-archive, head 860ae8303ddbbae318699c70c9b418fb0e005c73. Retarget; UNCHANGED. Main's tree after: 0ad31b8e84597f0ca4574283fed1c68c1c3d30fd.
LINE 2, PAD #2393 claude/plan-pad-9-rimsprint, head 8258c770880e367851b44502e35df21a14a1d6c5. Retarget to main (its base plan-pad-8-nojump is on main); UNCHANGED. Main's tree after: 3e563c906cb26c283ababd9e4caf2319fc6ce206. No deploy, because #2380 is on main.
LINE 3, UI2-grip #2390 claude/plan-ui2-grip, head 240a46ed7889bbcaee6c07b63789adf765b30d3e, base main. UNCHANGED. Main's tree after: f5f4d55b180e12e52925ab6b6e4a9f164b8584de = THE FINAL TREE (rehearsed).
LINE 4, Z #2404 claude/plan-z-sitting-70, head c6d0e00fa556df369170771c7abc6875fae8b9f6 (documents and tag-blocks.json; tag 5664; checks green). Mark it ready; it lands clean. Main's tree after: bcf33a17b4c54f86bfbee638cf3a7b3696aab6ea. It registers UI3 6780-6799, SHOP 6800-6819, LOCK 6820-6839 (nextBlock 6840); it writes the owner's standing leave (19:54) into finish.md part 6 rule 7 and orchestrator.md, and "No tapping in monsters" under debts.md LOCK (70).

IF #2380 IS LEFT OUT (its mend fails): the TD stack waits whole.
 - #2393, retargeted and unchanged: main's tree 3df4021d2cc7b73cc52f11688266bb580d7fb9d4. IT DEPLOYS (server/test/).
 - #2390, unchanged: 1b2361757be8ebc89afe18d50cb2994e1774dc7f (rehearsed: precheck 0 FAIL, switches-thrown --whole, claims-gain --whole, build PASS).
 - Z #2404: a962b052c469b440b3611497ea80d053eabad0bf, clean.

HELD (by finish.md part 8; neither is a bug in today's game):
 - KEEP #2392 (fb1ccdd5): RED ON TODAY'S MAIN. `tools/guards/keep-sfx.test.mjs` 3-4 fails on main + #2392 alone. Two icon addresses that UI2's merges put on main after its base are unstamped: src/ui/kit/UiKitPage.jsx:131 builds `/icons/items/`, and src/ui/mobile/dash/GearPanels.jsx:159 hand-keys `/icons/bag/equip-` with `?v=2.3.4199`. Its mend is KEEP's: merge main, put both addresses through assetUrl, push. Its review: dodges C1 to C4 RED; the metalIconPath mend right; the memory raise said honestly. Sitting 69's slash-less-template and `.join` plants still GREEN: debts.md KEEP (70).
 - UI2-gear #2391 (aaebaafd): THE CARD'S OWN DODGE "Equip offered on another player's item" stays GREEN when planted at the PR's own roads (`openItemPage` dropping `owner`; the showcase's tap building its own `{R, cell}` with no owner). tools/guards/gear-showcase.test.mjs 2b to 2d read the wiring as text. Also tools/qa/mp/mp-ui2bro.mjs:215 step 2c is left red, against its card. Its mend is UI2-gear's: the guard reads the tap and openCardItem off the syntax tree and holds openItemPage to keeping owner; mend 2c. When it comes back, its merge of main has two conflicts, rehearsed: keep both sides, main's first (InspectPlayerPanel.jsx's imports: #2392's assetUrl line, then its two; docs/plan/status/UI2.md: the head's two lines the branch's, then each section main's then the branch's).

REHEARSED on f5f4d55b (the mend made as above): precheck 0 FAIL 2 WARN; switches-thrown --whole; claims-gain --whole; build; questline 187/187: all PASS. heldsweep's sample is NOISE, main's own (a different job over its line in each red). REVIEW (top model): #2393 10 of 10 plants RED, no bug; #2390 no bug. Next jobs (not holds), in #2404: debts.md KEEP (70), UI2 (70), PAD (70).
KNOWN REDS, MAIN'S OWN: heldsweep's noise; contextbuttons 5; onboarding's flake; oneband's sideways fit; questguide 7, pointstips 1, dmgsize 4.
SITTING 71's: UI3-kit #2395 (50727384) and LOCK #2397 (68f6dfd4): their tags count on #2404's blocks, so #2404 lands first. KEEP #2396 is behind #2392's hold.
