# The gatekeeper's review, sitting 29 (card Z; tag 5667)

Taken 2026-11-17 on `main` 657d7f7f (sitting 28 merged: K #1981, T #1992,
#1993, Z #1995). The owner asked for speed: late arrivals go to sitting
30. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main`, with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in). The tree after each merge:
1 #1994 7f664d6d952483255271fa1045812b3458aad3e7 -> 4281756fdbc47de0552dfff00189eda632cfe749
  (base 657d7f7f: main merged in)
2 #1996 dd7aca5adddd3fdca53a9faf1597a6365177a488 -> 53334cada0370098bf925177962ea145c7285b7a
  (base 7f664d6d: #1994's head merged in)

Rehearsed (`tools/dev/gatekeeper.mjs` on 657d7f7f): #1994 at 996a6da0
(tree ff78ac40; the head 7f664d6d differs from it only in
`docs/plan/status/T.md`): precheck OK (0 FAIL, 1 WARN), build PASS,
questline 187/187. Then #1994 + #1996 at the heads above: REHEARSAL2.

## T #1994 (5314): six debug reads into the page's one reader

READY. `sw('dev')` twice in crashTrap.js (the page row `dev: '1'`),
`sw('report')` in report.js (`report: '0'`; `reportOn` loses its own
`typeof window` test, which `pageAddress()` already makes), and
`pageAddress()` in debugBus.js and perfHud.js (two). The guard's `MOVED`
holds `dev` and `report` to their old patterns; the outside line 161 ->
155. `gameDisplay.js`'s eight stay (four-lines, tests-by-system, and five
read in its text by sound-fold and sound-cues): said in the spec.

## T #1996 (5315): eleven memory reads into the page's one reader

READY. Stacked on #1994. `sw` for canvascheck, gfxlean, heaptrim, held,
treenumbers; `swHas` for gpucopies, nopalette, loudclear, textkeep,
poolkeep; `pageAddress()` in picsNumbers.js. switches.js is import-free,
so the "no imports: node can read it" files (canvasWitness, heapTrim)
still load in node (said in their headers). `keepAsImage.js`'s
`?keepimage` stays (keep-as-image 7h). Guards on the branch:
switch-reader, switches (538 rows), switches-thrown, owner-switches all
green; the outside line 155 -> 144. Low:
- paletteTex.js now imports switches.js on two lines (`readerFor,
  swValue` and `swHas`); one line would do. lint-build is green.

## Not in

K 5196/5197 and the `_reqSeen` slots (K's unopened k-10 branch still
carries 5546: precheck's one WARN), L's window door, J2's shopkeeper and
flakes, R 5293: no PR open when the list went. Sitting 30.
