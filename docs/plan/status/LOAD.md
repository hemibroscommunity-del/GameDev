card: LOAD
branch: claude/plan-load-2-bakekeep
prs: #2386 (part 1, tag 6760: merged); #2401 (part 2, tag 6761: a draft, held in sitting 71, mended 2026-11-27)
state: ready

## Done
- Part 1 (#2386, 6760, merged): the Loading times readout says what the screen waited for and why it
  lifted ("ready" or "its 20 s limit"), the bro's six steps, the armour's frames at the lift.
- Part 2 (#2401, 6761): the masked bakes kept on the phone's disk by the bake worker (IndexedDB from the
  worker; `src/game/bakeKeep.js` the key and the store's rules; `?bakekeep=0`; `docs/specs/bake-keep.md`;
  `mp-bakekeep`).
- Part 2's mend (sitting 71's hold: the key's proof green at the worker's own readers, the store's cap
  and version unheld, held by text): `tools/guards/bake-keep.test.mjs` sections 6 and 7 now run the REAL
  worker in node (`tools/guards/lib/bakeWorkerRig.mjs`: a software canvas, fetch from a table of files,
  a stand-in IndexedDB kept across logins). 6a: every field the worker reads of a job is on the lists
  (an allow list; `type` added to JOB_FIELDS as `NONE`: the dispatch reads it, a job has none). 6b: each
  input the worker reads (in the job, and beside it: each file's bytes, a sheet of numbers, the look's
  row, the rod, its script, the browser), changed alone, makes the next login bake again; the same job is
  answered from the store, byte for byte. 7: the store's cap on the disk across logins, a version that
  empties it, a store that throws switched off. The gatekeeper's seven plants and two of the mend's own:
  all eleven RED (the guard's header). No plant showed a real fault in the key, the cap or the version.
- On the final code (main e8ccff26 merged), the test box, 2026-11-27: precheck OK (0 FAIL); bake-keep all ok
  (about 6 s); `membudget` 12/12; `bakekeep` 18/19: 266 kept answers and 24 baked at the second login,
  a kept frame the baked one 176 of 176, `?bakekeep=0` reads and writes nothing. RED as at the last run
  (the spec's numbers: 92 s then): `masks` 95 s after `loads` (the page asks for one job at a time and
  this box draws a few frames a second; the loads themselves 44.7 s, past the 20 s limit, here).

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
