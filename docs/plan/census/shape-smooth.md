# review-smooth: pillars 1-3 audit (see, adapt, never hold the page)

Worktree: /home/user/GameDev/.claude/worktrees/agent-a8a784e554c17b568 (HEAD 0aec6482). No browser run. Node only.
Scripts of mine: tools/dev/plants/govsim.mjs

## 0. Limits found
- The clone is SHALLOW: 1259 commits, oldest 2026-11-17 (boundary 5ab2260c / 37bb4911). `git log -p --follow`
  cannot reach 2026-11-13..16. History before that is read from the files' own version-tagged comments.
- CI runs only `questline` and `membudget` in a browser (.github/workflows/client-ci.yml:108, memory.yml:64-67, each
  with one retry). heldsweep, crowdsweep, desksmooth, phoneframe, governor are hand runs.

## 1. held-budget.mjs (the debt list, step 3.1)
- Today KNOWN = 3 rows: screen-check (box, 260), the frame itself (box, 70), gc (browser, 60). debtOf('ours') = [].
- Lines unchanged in the kept history: HOLD_MAX_MS 12, FRAME_JS_MAX_MS 16, WINDOW_MAX_MS 45, NOISE_K 1.5.
- Since 11-17 only two commits: a15f0471 (STATION_LINES {ride: 12}, the general line: no raise),
  d0a7d77a ('other: R > J' row deleted "by its own rule", v2.3.6287).
- Exits (from the file's comments, held-budget.mjs:66-165):
  - FIXED, work moved or sliced, each with a cited sample:
    body-bake 220->13->off (5049, worker); masked-bake 140->24->off (5043, the worker reads the sheet);
    pack-page 59->20->off (5253, packed on the worker); strip-made 24->off (5044, worker numbers the strip);
    gear-sheet 195 + portrait 40 -> off (5042, shirts on the worker, the figure sliced);
    ui:* 16->off (5047, cells as components, formatter warmed); foldToMono 20->off (5045, 4 ms slices);
    R > J 20->off (5046, equip redraw a transition); R > J again 16->off (6287: the door prompt placed after the
    paint, #2209; rule pre-declared in the row's `next` by J2: five runs of stand,town under 12 ms: 7.0-10.6).
  - LEFT ON A MEASUREMENT ALONE (no change named): other: createObjectURL 18 (4960, "9.3 at most"),
    other: _flushOutbox > ws.send 18 (4960, "4.7 at most").
  - LEFT BY RENAME + JUDGMENT: other: wrapped > sweepPicsOnce 16 -> off (5048); the hold is now named
    `wrapped > sweepPicsOnceTurn`; #1747's own sample had it at 18.3 once and 12.1 + 12.3 in one run (the judge
    fails n>=2 or >1.5x), kept off by "the planning session's call" (lines 126-130). Under budget-android it is
    27.6 ms x6 at armour (census/HB-holds.md row 17).
  - No family was re-marked box/browser; no threshold raised; no window changed except R > J's (pre-declared).
- What "ours = 0" does not mean:
  - not a gate: no PR runs the sweep; CLAUDE.md §8 itself lists it "by hand: hours-long browser sweep".
  - measured at the box's unthrottled JS ("about a phone's": a 91 ms bake here = 101 ms on an iPhone 14 Pro Max).
    Under O2's profiles (4x and 2x CPU) 49 families were over the line (census/HB-holds.md); "the profiles' rule:
    never a line". HB/HB2/EN mended about a dozen; the planning session skipped deskTeach's route and rememberChar.
  - family names are the top two stack frames; React's minified internals (`R > J`, `jg > Ek`, `Qj`) make a
    different "family" for each path, so a row covers one path only.
  - heldsweep is red on main on this box on a BOX row: screen-check 303 > 260 (status/EN.md:33). Tolerated.
- The four known over-lines:
  - World map first draw 57-64 ms (window line 45): status/HB2.md:32. The 102-120 -> 57-64 figures match
    HB-holds row 4's budget-android column (108.1 A). Profile number -> never a line -> not on KNOWN.
  - gearSheets.js _buildShirtOnWorker 34.7-40.6 ms "at peer on budget-android" (status/EN.md:27-29), family
    `gear-sheet` (which left the list as fixed at 5042). Profile number -> not on KNOWN.
  - other: jg > Ek: React's commit when a window opens (HB-holds row 3, 113.5 A before HB's fixes). Profile.
  - screen-check 303 > 260: ON the list as `box`, over its own line; nobody raised it, nobody fixed it.

## 2. memory-budget.mjs (the memory law)
Lines today (memory-budget.mjs:459-474) against the latest readings in the file's own notes / P2's census:
| line | 11-13 | now | latest reading | room |
| artCache | 112 | 79.3 | 11.2 (v2.3.6222) | 68.1 |
| gpu | 115 | 109.3 | 71-80 at its highest (6202) | ~29 |
| canvases | 56 | 54.3 | 13.7 (5982) | 40.6 |
| sound | 29 (22 from v2.3.5006, about 11-13) | 22 | 18.1 | 3.9 |
| heap | 38.5 | 40.0 | 38.6-39.2 | 0.8 |
| buffers | 22 | 24.8 | 24.7-24.8 | 0 |
| workers | 36 | 36 | 21.5 | 14.5 |
- Sum of lines 365.7 MB; sum of highest readings about 216 (census/P2-memory.md:31-40); the phone dies near 250.
  No total line. ~152 MB of room in four lines. P2's census said so ("Lowering it to the reading plus room locks
  in what is already saved. That is a question (Needs)"): not done.
- RAISED since 11-13: heap 38.5 -> 39.5 (46beb027) -> 40.0 (7c77c441, 2026-11-19): "main reads 37.4-39.2 run to
  run". buffers 22 -> 23.4 (v2.3.5248) -> 23.7 (5250) -> 24.2 (5252) -> 24.8 (ed0163cc, v2.3.6222): each by the
  colour numbers moved there while artCache fell more (5.6, 1.2, 2.0, 2.2).
- LOWERED: artCache 112 -> 79.3 (15 steps, card P), gpu 115 -> 114.3 (1d0c8f84 / 5981) -> 109.3 (26c2dc34),
  canvases 56 -> 54.3 (5982). Net lines -35.8 MB (-42.8 with sound).
- Real readings: artCache 48.7 -> 11.2 (-37.5), buffers +3.4, heap +2.5, canvases -1.7, gpu about -5 at its
  highest. So about 35 MB really saved page-side; the lines hide it because their room was never taken out.
- artCache's line is now FROZEN by the governor: "left at 79.3 (the frame pacer's quality line)" at v2.3.5982 and
  6222 though 3.9 MB was saved (framePacer.js:345 MEM_LINES is a copy, frame-pacer.test §23 holds them equal).
- HEAP: 36.0-36.4 after the trim (v2.3.5007 note, lines 188-197) -> 38.1-38.5 by v2.3.5982 -> 38.6-39.2 on 11-19
  (lines 441-458): +2.2 to +2.8 MB in about six days; the note says "about 1 MB". Sixth raise since late October
  (32 -> 33 -> 34 -> 36 -> 38 -> [37.5] -> 38.5 -> 40.0), every time "main's own code at the line". CI also
  retries a failed run once. Each PR adds less than the +-0.9 MB scatter, so no PR ever fails for its own creep.

## 3. Pillar 2: the ladder and the governor
- The ladder: src/game/drawLanes.js. KNOBS (:80) 12 knobs; LANES (:165) full, light, thirty; AXES (:184) work
  [crowd 30, crowd 15, rate 30fps], chip [rate, shine off, shadows off, water still], pixels [0.75, 0.5],
  mem [caches 0.5, crowd, crowd]. pickLane (:323): `thirty` where the screen is 30 Hz, else `full`. `light` is
  picked only by `?lane=light` (tests, and both slow profiles).
- Readers: framePacer.js (rate), renderRes.js (pixels), crowdCap.js, glint.js, lightFx.js, wheelWater.js,
  zoneTextures.js (queue), gearNumbers.js + maskedEvict.js (caches), BroTown.jsx (step), paletteTex.js (program),
  lookPaletteChoice.js (look). prewarm: no reader.
- ONE controller of "late": yes. The pacer's verdict (framePacer.js:189-203) calls gov.verdict; a fast screen's own
  rate steps first, the ladder only at the rate's floor; setRung has one writer (frame-pacer.test 17).
- On by default in production (governOn :320: no `?lane` in the address); held still in every phone test (each
  names its lane) except mp-governor (`govern=1`, a SCRIPTED clock, checks the first step only).
- A hot 60 Hz iPhone, step by step: 80 drawn frames judged; a frame is late past 25 ms; >25% late twice running
  (about 3-5 s) -> chip rung 1 = a steady 30. Clean for 20 s -> try 60; a failed try doubles the wait to 320 s.
  Only if still >25% late AT 30 (frames past 41.7 ms): shine off, then shadows, then water; pixels only behind a
  loading screen or a tab's return. Work-bound: crowd rungs (passed when nobody is near), then the rate.
- A nearly full phone: memFull only if the game's own count of art > 79.3 MB or chip textures > 109.3 MB
  (phones/tablets), read every 5 s, at a verdict; then caches 0.5 (two caches), 35 s later crowd 30, crowd 15.
  Art reads 11-16 MB on the trip, so that half can never fire; the chip half fires ~27 MB above the trip's peak.
  Nothing reads a total; nothing reacts to a lost context except the old watchdog.
- CLOSED-LOOP MODEL (mine; govsim.mjs; the suite's own model and numbers, heat made a state driven by the work
  done instead of a function of the clock; 11 runs of 60 minutes):
  - every run: the ONLY rung ever taken was chip:rate; seconds with a pass or pixels dropped: 0.
  - 60 Hz, hot x1.6 (5% too slow for 60 when hot): 30 fps 74-83% of the hour, 10-14 rate changes in the last 30 min.
  - 60 Hz, hot x2.1 (the suite's): 30 fps 92-97%. hot x3.2: 96-99%; the pacer reads the screen as 30 Hz 66-69%.
  - 120 Hz, hot x2.4: 60 fps 96-99% (the pacer's own step; it reads the screen as 60 Hz 68-90% of the time).
  - 120 Hz, hot x5.4 (the suite's): 40 fps 81-91%.
  The ticked proof (frame-pacer.test 13, :401-428) uses heat = f(time) and invented savings (EFFECT :398).
- The plan's 2.3: "waiting for the chip, then pixels and passes". Built: rate, passes, pixels. The owner's call 16
  (GRAND-PLAN:1429) was rate before PIXELS ("a third fewer pixels made no difference on your iPhone"); rate before
  the passes is the sessions' extension (docs/LANES.md:43-44).
- Device names: outside deviceProfile.js only 2 `navigator.userAgent` reads (networking/index.js:274 identity,
  DebugOverlay.jsx:452), onIOS() 2 callers (InstallHint, SettingsPanel), paletteTex.js:496/1015 asks windows/mac
  through devAsk. OVERRIDES (drawLanes.js:247-252) still decide look and program by windows/mac/software.
- docs/LANES.md: the pixels' and memory's axes are both headed "Waiting for the graphics chip" (lines 65, 72).
- Slow profiles (tools/qa/profiles.mjs): both `light` lane, governor held still, numbers "chosen, not measured".

## 4. Pillar 1: the report
- Phone: src/debug/report.js. On by default (reportOn :231; `?report=0`, About switch). One `report` through act()
  60 s after the first join, then every 5 min, >= 20 s seen. Fields: devClass (12 facts), drawLane, sw, build,
  secs/seen, drawn, gaps (10 bins), late [late, judged], split, holds (worst 5), where, near, mem [tex,gpu,snd],
  lost, died (once), rung, self, speed.
- Server: server/src/report.js -> daybook `dev` part, key `daybook:<yyyymmdd>`, cell =
  V|class|lane|sw|build (`preview` off the live site); sums only; no pid, no time finer than the day; 60 days;
  24 KB a part a day; one report a socket per 50 s; 2 cells a socket.
- Reader: GET /dev/daybook (admin; devtools.js:756) -> the Test panel's "Copy table" -> the owner pastes. No
  pasted table anywhere in docs/. Step 1.3 open.
- Build: in the cell key. Switches: only the worker's 15 CLIENT_SAVERS ids (report.js:461); the address-bar
  off-ramps (switch table: 619 rows) are not in the record, by design ("never a name read off the address bar").
- Heat after 24 min: NO. No minutes-up field; the day's sums erase the time course. Only `rung` [most rungs,
  seconds below the row] and a two-humped `gaps` hint at it.
- Skateboard stutter: NO. No riding flag (`where` is places). `holds` takes only names a job noted itself
  (holdNames.js:101 holdOf; MADE_AS: screen check, body/head/shirt/standin bakes, strips, page bases, ws.*).
  Long tasks are observed only where the browser supports `longtask` (perfTracker.js:62-65): not Safari. The
  families HB found (React commits, layout reads, timers) cannot appear from an iPhone.
- Black screen: mostly yes: `died` (killed/evicted, MB of art, minutes up, rebuilds, where), `lost`, `mem`.
- With the build in the key and 1.3's "blank under 20 reports", one player on a game that changes several
  times a day fills no cell (20 reports = 100 minutes on one build).

## 5. Rule 6 / step 8.7: the budget table
- docs/BUDGETS.md (484 lines) + tools/guards/lib/budgets.mjs + budgets.test.mjs. Check 4 ("a sum of spends over
  its line"): all 19 rows have `spends: {}`; the guard says so. Check 3 reads the hand-kept table, not the code;
  15 known second controllers remain (KNOWN_SECOND_LINE 15), incl. "MB: nothing reads a total".

## 6. Skateboard (card SB, done)
- census/SB-ride.md: the ride brings the same holds 1.5x as often; the ground does not keep up (37% of pieces on
  screen unlaid, plain; 79% budget-android). #2253 `?groundsend`: 6 pieces asked at a time, view unlaid 5.4 ->
  0.6% on the box. `?atlasrow` (the whole 256x256 atlas re-sent for a 1 KB row) parked as "a sliver" on the
  box's software chip. mp-skateboard is red on main (status/SB.md Found). Nothing checked on a phone.

## 7. Honest measurement
- No status file in scope records a real-device confirmation of the governor, the memory rung, the pixel budget,
  the holds work, or the skateboard change. Device facts in the record are the owner's four observations
  (106 -> 51 fps after 24 min, 2026-11-10; fewer pixels made no difference; the skateboard's grit, 2026-11-18;
  a bake's 91 vs 101 ms).

## 8. Not checked
- Any browser scenario; whether heldsweep is green unthrottled today; history before 11-17; the self-test (1.7),
  the room's row (1.6), the pixel budget's code (2.2a), the Speed test's code, LR's layout-read list, cards
  FX/P beyond their notes in memory-budget.mjs; what the `caches` rung frees in MB; server/src/report.js past
  its header and call sites.
