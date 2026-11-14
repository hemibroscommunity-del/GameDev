# The gatekeeper's review, sitting 5 (card Z; v2.3.5361)

Taken 2026-11-14 on `main` at 75946b7. What sitting 4 reviewed in full
(`review-z4.md`) was not reviewed again: this sitting read the MENDS made
since, and the PRs new since, that change `server/` or `src/`. A finder and
its own disproof pass a target, each reading the code around the diff:
card A's three mends (#1706 0b40299d0, #1708 205d62945, #1711 217d40420 and
aa0410dec), card H's #1700 mend (fad1b967c), then #1709's and #1712's mends
(81b26b8d9, b9e5d6e6c, pushed during the sitting) and #1714 (78d4d2c4f,
never read before), card P's #1718 (0f2b610fe, the gate and the move of a
look sheet's shape) and #1719 (the 19 `.m4a`). Card N's mends (tests and
guards only), card G's (one line joined in `BroTown.jsx`, the same
statements), card Y's harness change and card V's guards were read by the
gatekeeper. Card U's PRs were not reviewed: held on a conflict, they are
next sitting's.

VERIFIED: the story runs, on the code path named. PLAUSIBLE: the code does
it, what sets it off is unproven (it says what would settle it). DISPROVED
lines are kept where the code is confusing enough to be found again. The
probes the reviewers ran are not in the repository.

## Card P: #1718 HELD, #1719 with it (stacked)

- **#1718, VERIFIED (reproduced), medium: a false red the named mend
  cannot clear.** `tools/guards/asset-door.test.mjs` hold 6 reads only a
  `.png` with the game's reader (`readPng8Chunks`); any `.webp` of a
  supplied family with a bar counts as over it. But `finish.mjs` writes a
  lossless WebP where the family's address is `.webp` (`world-interiors`,
  16 of 16; `weapons-greatsword`, `fx-coinflip`, `tool-pan`,
  `icons-verified-full`). A scratch `finish.mjs world-interiors
  newhall.webp`, then the guard: `FAIL 6 world-interiors now 17, was 16`.
  A new building's interior goes red, the message says "finish it", and
  finishing it is what made it red; those counts can never fall.
- **#1718, VERIFIED by structure, medium: every PR under `public/` would
  conflict with the next.** Once the gate is on, a PR that changes a file
  in reach must write `shipped.json` again (holds 1 and 3), and the file's
  totals are single lines at its top (`"files"`, `"bytes"`, `"kinds"`):
  two such PRs both rewrite `"bytes"`, and the second cannot merge with
  one press (CLAUDE.md §1). Wheel re-bakes, townsfolk looks, sounds, sprites.
  Mend: totals computed (or held by the guard from the rows), not stored.
- **#1718, VERIFIED on a branch, PLAUSIBLE on `main`, low/high: the sprite
  bot's twins.** A push touching `public/sprites/player/**` or `gear/**`
  gets a `github-actions[bot]` `.webp` twin (CLAUDE.md §4) with no row: the
  PR is red (hold 1) until a push runs `shipped.mjs --write`, and a new
  path also needs its family in `families.mjs` (`player/chop-east.png`,
  `gear/helmet/**` match none). `optimize-assets.yml` runs on a push to ANY
  branch, `main` included (no branch filter): a twin the branch did not
  carry is committed onto `main` after the merge, and hold 1 then turns
  every PR's `test` red and holds the worker's deploy. Settle it: the
  twins the gate expects, or the gate reading a sprite's `.webp` twin as
  its PNG's row.
- **#1718, PLAUSIBLE, low.** Hold 7 picks the look sheets by
  `families.mjs`'s `kind` and `draw`: a one-line change of the kind takes
  the 223 sheets out of holds 7 and 6 with nothing failing.
- **#1718, VERIFIED, low.** Hold 6 checks a picture's size only where the
  family's rule reads `frame WxH` / `cells WxH`: 11 of the 36 supplied
  families with a bar; 25 are never size-checked. Nit: `lookUnpack.js` 54
  still points at "lookPalette.js sheetRows".
- Clean: the move of `lookSheetSpec`, `lookSheetRows` and `LOOK_KIND_IDS`
  is the same expressions (the book's offset still read at call time),
  `lookPalette.js` re-exports `LOOK_KIND_IDS`, `lookUnpack.js` still has no
  imports, no cycle; the guard needs only node's own modules and lists by
  `git ls-files -z`. **#1719 is clean**: nothing names the 19 files
  (`src`, `server/src`, `public/tools`, `_headers`, the manifest,
  `CREDITS.md`, the Sound Studio), every `SFX_MANIFEST` key is an `.mp3`,
  no code swaps an extension; the empty `sfx-m4a` family trips nothing.
  It waits only because it is begun from #1718.

## Card H: #1700

Sitting 4's three: (1) MENDED: every `sheetOf` fetch starts before the
`Promise.all` (`maskedBakeWorker.js` `urlInputs` ~202); on a stuck kill
the page refuses the addresses of the one job not yet `urlsRead`
(`bakeByAddress.js` ~58; one job runs at a time, `_BAKE_BUSY_MAX` 1), and
a refused sheet is cut on the page again (the old 5-15 ms), never drawn
without its armour. Loose ends: the 4 s cut does not cover the decode, the
look sheet's wait runs before the reads, `_bakeStartedAt` is not reset on
the `urlFail` retry. (2) PARTLY, within the memory law: at most 4 sheets
and 4 MB, all let go 15 s after the last job (`sheetsIdleSoon`); the page
still sends no "forget" on a revoke. A stale frame after a revoke is
DISPROVED (a `blob:` address is never reused; `destroy()` drops the
resource). (3) NOT mended, still very unlikely (`?v=` on https sheets).

- **PLAUSIBLE, low-medium.** `bakeByAddress.js` ~41/75: past 1024 refused
  addresses a new failing one is not added, its retry fails again, and the
  frame is baked on the page (17-107 ms). Needs Safari's worker unable to
  fetch the page's `blob:` addresses at all. Settle: one iPhone reading of
  `__btBakeWorker().byUrl` (refused against sent).
- **VERIFIED path, rare, low (speed only).** `entityRenderer.js` ~3556/3631
  with ~3916-3925: the worker is taken before the page's wait; a stuck kill
  inside it posts the job to a dead worker (dropped since v2.3.4870), its
  addresses stay `_reading`, the next worker is killed at once (old
  `_bakeStartedAt`) and the dropped job's good addresses are refused.
  Trigger: a return from the background with a page cut pending.
- **VERIFIED, low.** `urlsRead` is per job, so a stuck kill refuses a job's
  addresses that read fine too; the header says "only those still being
  read". Speed only.
- **PLAUSIBLE, low.** A worn piece freed between the send and the worker's
  fetch: `urlFail`, the retry's `frameInput` null, and `_runBake` has no
  `inps.some(!x)` check (`_runLookBake` has): a frame baked without that
  piece, cached under the whole set's key. The window already existed for
  a queued job; new is only the worker's read time.
- Nit: `maskedBakeWorker.js` 147 and `picture-door.test.mjs` 304 still name
  `entityRenderer.js _frameInput`.
- Clean: a restart does not loop (the refused set is the page's); per-job
  memory freed (`_reading` capped at 64, cleared three ways; `jobDone` on
  every way out); nothing new measured or read back inside a frame; the
  move into `bakeByAddress.js` is the same returns, fallbacks and counters.

## Card H: #1709, #1712 (mended during the sitting), #1714

- **#1709 MENDED** (81b26b8d9): `picsNumbers.js` `stripAsNumbers` calls
  `_rowsMoved(bundle)` when the page grows or adds a row, before it makes
  the source; `releaseBundleNumbers` goes through it too (the epoch moves,
  the waiting plans are dropped). `rowFor` has one caller; `p256:` bundles
  carry no plans; a row belongs to one bundle; the worker keeps nothing
  between reads. Simulated in node (the palette stubbed; asks, answers,
  takes, failed reads finished on the page, releases interleaved): the
  code before the mend scrambled colours on 2 of 6 seeds, the mend on 0 of
  40. Cost, low: one failed read inside a look makes 5 to 10 of its 11 later
  plans stale (each stale take changes the row on the page again): what
  `main` costs today for those strips, and only after a failure.
- **#1712 MENDED** (b9e5d6e6c): `foldToMonoSliced` returns a one-channel
  sound (or an empty one) at once, before the fold's line (sound-fold 4g).
  The move into `soundFold.js` `foldForGame` is the same behaviour
  (`?foldgentle=0` folds at once; `_folded` only when the result differs);
  its one caller is `BT_AUDIO._fold` from `loadSample`; no new
  `getChannelData` (only the old fallback for a buffer with no
  `copyFromChannel`); a sound is stored only after its fold, so it never
  plays early or twice.
- **#1712, PLAUSIBLE, low, memory.** `gameDisplay.js` ~4359 deletes
  `_tagLoads[tag]` before the fold, and the fold now takes frames, not a
  microtask: a second key for the same file asking in that window fetches,
  decodes and folds it again, two copies held (v2.3.3462's one decode a
  file undone): `fish-on-hook` / `fishing-fish-on-hook` (stereo, 2.59 s,
  about 1 MB), `lure-drop` / `fishing-lure-drop`. Mend: delete after the
  fold. (Sitting 4 DISPROVED this for the shared files' keys loading
  together; the slices widen the window.)
- **#1714, nothing of weight** (78d4d2c4f, first read this sitting).
  `gearWorn`'s only reader is the legacy `panels/InventoryPanel.jsx` ~308,
  opened by nothing in `src/`; the bro's look and the renderers read
  `getEquip` / `onEquipChange`, never React state; the `player_state` echo
  still sets the root's state with a new object (`wsClient.js` ~3372);
  reconnects, trades and deaths reach the renderer through
  `syncArmorLayers`. DISPROVED for players: `toggleGearSlot`'s updater
  calls `setEquip` inside itself, and a pending transition could run it
  twice (the legacy panel only).

## Card V: #1724, #1726, #1729 (opened during the sitting; step 3)

Guards and tests only: `tools/guards/traps-*.test.mjs`, their helpers
(`lib/maskCode.mjs`, `lib/loadSrc.mjs`), the scoreboard's row, the README's
section, `server/test/party.test.mjs` (§3) and `mirror-audit.test.mjs`
(§43), and only "Held by" lines in `docs/TRAPS.md`. Tags 5320 to 5322, the
card's (card V is in #1720). Each lands as a census where its card says so.

## Card A: #1706 listed; #1708 HELD, #1711 with it (stacked)

Sitting 4's five: (1) #1708's lost tail MENDED: `leave.js` ~275 calls
`_roomRowLastOut` on every leave way that empties the room (close, error,
afk, flood, kick, device, reset, joinFailed, bodyTakeFailed, takeoverFight;
takeover and refused through the runtime's close), a put running is
followed (`b.putting.then(run, run)`), only storage awaits. (2) #1706's
`dev` part PARTLY: a first report's cell is 1,208 B (19 a day, as said),
but a cell grows over the day with its `where` and `holds` maps: 1,850 B
at 4 places and 8 holds (13 a day), 3,871 B full (6 a day); a busy merge
day's newest builds still go to `over` (written, and printed).
`gamedev-aix.pages.dev` now reads as live. (3) #1711's Speed card MENDED:
`caps.report` is a count (`_reportCap` 2, 1 under `reportspeed: false`,
none under `report: false`), the phone puts the card only on a 2
(`takesSpeed`), each cap on its own line (TRAPS §316, §333). (4) a thaw
MENDED (`pageshow`, a late poll, `THAW_MS` 8 s). (5) MENDED (`_poll` drops
the open report when switched off; `died` only on a socket's first).

- **#1708, VERIFIED (a probe), low-medium, cost: the last one out's put has
  no pace.** `roomrow.js` `bookNow` (~107-119) sets the door's `lastPut`
  but never reads it, and the book's own put is counted in the room row's
  `rows`, so after the first put something always waits: every socket
  opened and closed into an empty room writes the whole day's record (up
  to ~100 KB). No join is needed; `flood.js` allows 20 opens a minute an
  address. Probe: 10 unjoined open/close cycles 3 s apart, 10 book puts;
  up to 28,800 a day from one address where the book wrote at most 288.
  The book's row in `docs/SHAPES.md` says "at most one put a pace while
  the room is awake ... with a line in `cost-guard.test.mjs`": an empty
  room woken by a socket that never joins now puts once a wake, and
  handoff rule 27 paces what a client's word writes; `cost-guard` has no
  line for it, and roomrow §9's "nothing waits" runs with
  `roomrow: false`, which hides it. Mend: pace the last-out put, or leave
  the book's own put out of `rows` (and write at the last out only when a
  report or a joined player's counts wait).
- **#1708, VERIFIED (a probe), low.** A kick, an AFK or an error that
  empties the room writes the book, and the runtime's close after it
  writes again, carrying the first put's row count: two puts an emptying.
- **#1708, low.** `bookNow` writes the door's own pace state (`lastPut`,
  `putting`) and calls `bookPut` itself: a second pacer outside
  `daybook.js`, tied to it only by roomrow §9's shape check. Negligible:
  the chained `run` does not check `b.putting` again (two last-outs inside
  one put across UTC midnight run two `bookPut`s side by side; the first's
  rejection is caught by no one).
- **#1711, PLAUSIBLE, low.** A socket's third cell is refused (`'cells'`,
  `report.js` ~358) with any Speed card riding it, after the card told the
  player it "goes to the game": a computer's window moved between monitors
  may change the class's size, density or rate bucket. Settle it: does a
  desktop reach three classes on one socket?
- **#1706, PLAUSIBLE, negligible.** A real hang of 8 s or more on a seen
  page now reads as a thaw (out of `gaps` and `seen`; `holds` may catch it).
- **#1706, low.** `CELLS_A_SOCKET` bounds a socket, not a player: a script
  reconnecting (20 sockets a minute an address, a forged Origin) gets
  fresh cells each socket and fills the day's `dev` part in about a
  minute. The refusal is by design (`over`); the size is the gap.
- Process: #1711's mend is inside the merge commit 217d40420, so a reading
  commit by commit misses it; its lines carry tag 5127, as #1706's do
  (#1711's own is 5125).
- Clean: no new type the worker sends; `report` is its own case, never
  relayed; closed lists and clamped whole numbers, `Object.create(null)`;
  `GET /dev/daybook` behind the admin key (`admin.js`), at most 60 days,
  writes nothing; both deploy orders safe; `report`, `reportspeed`,
  `roomrow` lower case (`roomrow: false` also stops the self-feeding put);
  no alarm, no timer assumed. 21 server suites green on #1711's head.

## Cards N, G, Y (read by the gatekeeper)

- N: #1684's walker reads `.mjs`, `LEFT_OUT_HOLDS` pins `vendor/`'s two
  files; #1695's three test-mode holes are notes in `in.js`; #1697's guard
  reads its switches by system. The guard is held only for what it finds
  on the whole (card A's two rows), not for a fault of its own.
- G: the mend joins `noteCanvasCss`, `renderDpr` and `var tw` on one line;
  the same statements in the same order. Sitting 4's note (a window drag
  sets a new resolution each frame) is unchanged, low, not a hold.
- Y: `hopTo` returns false when the zone changes mid-walk. Only
  `changeZone` writes `S.currentZone` (doors, dungeons, the farm, a
  respawn): walking between the Wheel's lands does not, so the long walks
  of `mp-wheeldeep`, `-wheelpast20`, `-monstermoves`, `-wheelnear` are
  untouched. It is a file the card put out of reach (`tools/qa/mp/*`, J's):
  the planning session chose it, and J is finished.
