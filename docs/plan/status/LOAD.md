card: LOAD
branch: claude/plan-load-3b-sparelater (part 3b; part 2 on claude/plan-load-2-bakekeep)
prs: #2386 (part 1, tag 6760: merged); #2401 (part 2, tag 6761: in the merge round); part 3b (tag 6763: a draft, base part 2)
state: working (part 3b: pushed, its phone run on the final code running)

## Done
- Part 1 (#2386, 6760, merged): the Loading times readout says what the screen waited for and why it
  lifted ("ready" or "its 20 s limit"), the bro's six steps, the armour's frames at the lift.
- Part 2 (#2401, 6761): the masked bakes kept on the phone's disk by the bake worker (IndexedDB from the
  worker; `src/game/bakeKeep.js` the key and the store's rules; `?bakekeep=0`; `docs/specs/bake-keep.md`;
  `mp-bakekeep`).
- Part 2's mend (sitting 71): `tools/guards/bake-keep.test.mjs` 6 and 7 run the REAL worker in node (the
  key's every input, the store's cap and version); eleven plants RED; no real fault found.
- Part 2 on its final code (main e8ccff26): precheck 0 FAIL; bake-keep ok; membudget 12/12; bakekeep 18/19
  (RED as before: `masks` 95 s after `loads` on this slow box).
- Part 3b (6763, the owner's "Yes" 05:30 11-27): the loading screen no longer waits for the spare armour
  sets; they bake after it lifts (`src/game/spareLater.js` the chain's order, `src/game/spareTime.js` the gate
  and the pace: one job at a time, the page's share at the top of a frame), the readout lists them last
  "after the loading screen"; `?sparelater=0` the old order. The GPU uploads moved unchanged to
  `src/rendering/bakeUpload.js` (entityRenderer's four-lines line). `sparelater` guard all ok, 6 plants RED.
  On this box (first logins, `mp-sparelater` runs 1-2): the screen lifts on its limit either way (42 to 49 s;
  the worn set's masks take 5 min here), the spare pass shut at the lift, `?sparelater=0` the old order.

## Next
- The gatekeeper's next sitting reads #2401. Part 3 (6762) only if part 2's numbers call for it.

## Found (not mended: outside the mend)
- `_tables` / `_bms` are not dropped when a sheet of numbers is replaced under the same key
  (`maskedBakeWorker.js` onmessage `lookSheet`): the key reads the new numbers, the bake draws the old
  (a stale picture kept under the new key, within one session). The gatekeeper's next job (debts, LOAD 71).
- `prewarmAltWornSets` waits on `_wornPass` with no limit (`entityRenderer.js`): the debts' next job.
- `loads` in the owner's phone paste is the "pictures ready" step; the loading-screen mark is noted at the
  start of preloadPlayerAssets, not at IntroVideo's mount.

## Needs
- One more Loading times paste from the owner's iPhone after part 2 lands (a second login in copper).
