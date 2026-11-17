# The gatekeeper's review, sitting 39 (card Z; tag 5677)

Taken 2026-11-17 on `main` 9e228210 (sitting 38 merged: SEC #2042, #2043,
#2045, #2047, #2049; K2 #2048; L #2046; Z #2050). SEC, K2 and L were told
this sitting's session at its start (19:08 UTC). Gathered 19:08 to about
20:15 UTC. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open, not a draft, with
one merge base at every step (`git merge-base --all`, each against `main`
with the PRs above it merged in as merge commits). The tree after each
merge:

1 SEC #2054 75579c1152afc2d5623bef041a9be913683605b2 -> 8b9bf6e355848c1dbf0b554534e16b46db036fa1
2 K2 #2051 8542c104971ecee9a8c067802cdcf56fe3d3cfc8 -> 9440b5871639a177bffb60da683182aa8e3684c6
3 K2 #2053 08bc3ecd350b8e24cab8bd4e2983030fc49e4b30 -> 3ee187725494522cc13b51e463d07bc26fd836f6
4 Z (this PR): its head and tree are in the list (`status/Z.md`).

The bases, step by step: #2054 9e228210 (SEC merged `main` in at 19:11);
#2051 9e228210 (K2 merged `main` in at 19:33); #2053 8542c104 (#2051's
head, merged into #2053 at 20:09); this PR 9e228210. One line each.

## SEC #2054 (5711): the owner can see a flood

READY (reviewed in full: `server/`), after a HOLD this sitting. Card SEC
PR 12.
- At b18ad6c7, held on one finding: `closed` was counted at every
  `_playerLeaves(ws, 'flood')`, and `_floodClose` takes that way for three
  reasons: too many messages (index.js 4834), a second join (index.js
  4925) and no join within 15 s (tick.js 167, a slow phone included). The
  docs and the owner's rule of thumb ("hundreds in an hour is someone
  hammering") read it as floods only. Nit: `since` was stamped only by a
  close.
- SEC's fix, 75579c11: `_floodTallyLeave` counts only a session past the
  message budget (`msgDropped > FLOOD.MSG_CLOSE_AFTER`, the same test that
  closes it), at the leave door (leave.js; flood.js and index.js are K2's);
  `since` is documented as the first count's time, the relay counts as
  relay.js's since the room woke; `ip` reads the tally's own number
  (K2's PR 10 adds with `_floodTallyAdd('ip')`). `floodtally.test` §6: no
  join and a second join add nothing (b18ad6c7 fails it). Re-read: the
  room-ceiling path drops through `_floodDropped` too, so a socket closed
  by the room's ceiling also counts (a flood: right).
- Memory only (no row; §3 holds it). `ip` reads `null` until K2's PR 10.
  OPERATIONS: a free uptime monitor on `/health/room`, and Cloudflare's
  usage notice (the owner's own, in the dashboard). `floodtally: false`.
  DEPLOYS.

## K2 #2051 (5725): three small guards

READY (reviewed in full). Card K2 PR 6.
- (a) A frame of its own whose handler throws is caught and logged as a
  bundle's part was (`try { return await this._onMessage(...) }`): only
  that message dropped. No switch (a throw is no behaviour).
- (b) A Workshop `dungeon_start` (no mouth) on the Wheel is refused off
  safe ground (`_wheelSafeAt`), with the door's own `not-now` words. The
  page's Workshop is on the farm (`S._nearWorkshop` only in `farm_home`;
  gameDisplay.js `FARM_SPOTS.workshop`), so on the Wheel only a forged
  start meets the guard: nothing a player sees. The comment said BroTown's
  commons at f464bf34 (a nit); K2 mended the words at a7bb41a3, no code.
  `dungeonground: false`.
- (c) `reqId` left off the market's two public reads (`mktPublicOrders`);
  the stored order keeps it for the repeat check. Read against `src/`: no
  page reads `reqId` from an order. No switch (nothing reads it).
- adb2de6d (19:48, after the rehearsal began; read in full): only
  `heap-forget.test` check 4, sitting 38's Found (j). The absolute line
  RAISED 2,560 -> 4,096 B a guest (CI's runner read 2,563 to 2,573, this
  box 247 to 1,628), and a new line that does not hang on the runner:
  the zone forgotten, `off - on >= 3,500` (CI 5,350 to 5,756). The break
  proof (the forget taken out of leave.js) reads about 0 forgotten: both
  lines red. A test only, no code. Run twice in the merged tree: on 1,560
  and 1,628, all three of check 4 green.
- adb2de6d's `test` went RED on CI (job 134324361790), its own cause:
  `guards/switches-thrown` with `heapforget` thrown, the new second line
  of check 4 not on the row's `thrownFails` (told to K2 at 20:06). K2's
  8542c104 (20:09) names it in `switches.mjs`, one line. In the final
  merged tree: `switches-thrown --only heapforget`, `switches.test` and
  `heap-forget` green.
- DEPLOYS.

## K2 #2053 (5726): the owner's routes with no key, and the public reads, at the edge

READY (reviewed in full). Card K2 PR 7 (the planning session's addendum).
- `edgeKeyRefusal`: `/api/admin*` with no `Authorization: Bearer x` gets
  the room's own answer at the outer router (404 `Not found` with no
  ADMIN_KEY, else 401 `Unauthorized`); `/api/botstat*` with neither
  header its plain 404. Read against `_adminAuth` and `_adminFetch`: every
  admin path checks the key first, a bare `Bearer ` is `denied` in the
  room too, and an OPTIONS goes on. The Test panel always sends the
  Bearer header (DevPanel.jsx 450, 480), so the owner's page is unchanged.
- `edgeCacheRead`: the market's book and `/my`, the store's browse and
  the arena's status, kept 3 s in `caches.default` for a request whose
  Origin is NOT the game's (`originAllowed` `site` or `local`), never one
  carrying a key, only a 200. The page always sends its Origin, so a
  player always reads through the room (its copies drop on any write).
- The two levers are worker settings, as `ORIGIN_LOCK` and `BODY_CAP`:
  `EDGE_GUARD = "off"`, `EDGE_CACHE = "off"` (absent means on), thrown in
  Cloudflare's dashboard, not the Test panel; nothing in `wrangler.toml`.
- DEPLOYS.

## L #2052 (5535): to sitting 40

Reviewed in full (`src/`): READ CLEAN, no hold. `dungeonTo` (`enter`,
`complete`, `leave`), the one writer of `S._inDungeon` and its notes
`S._inCustomDungeon`, `S._dungeonComplete`, in place of twenty-four writes
in seven files; each enter's `complete: false` moved up past lines that do
not read it. The phase row `dungeon` `todo` -> `door` (4 -> 3). Nit: the
break proof is numbered 50, above 49 (as #2046's).

Not on this list: its `?dungeondoor` row and #2051's `dungeonground` row
both land right after `dungeondoor` in `docs/SWITCHES.md`, so the second
to merge conflicts (git says so on b2acfa3f over #2051). The planning
session's queue put K2 first, and K2's heads came at 19:33. L merges the
new `main` in after #2051 lands (each row its own line, by
`switches.test --write`) and goes to sitting 40.

## The rehearsal

`tools/dev/gatekeeper.mjs` on 9e228210 with #2054 (75579c11), #2051
(a7bb41a3) and #2053 (5ec4d137), in that order: tree bef3d0f3 (the same
as the step-by-step merges); build PASS (17 s); questline 187/187 (534
s); precheck the one 5-minute server-tests limit (the settled one) and
nothing else red (its WARNs: SEC's stacked branches 13 to 18 carry
#2054's 5711, as each holds it; the branch count). `cd server && npm
test` alone in that tree: 500 suites, all green (530.6 s). Every guard in
`tools/guards/` green there (34). #2051's adb2de6d and 8542c104 came after
(a test's line and its switch row, above), and #2053 took them in at
08bc3ecd: those suites green in the final tree (3ee18772); the rest of
the tree is the rehearsed one. This PR on top (one base,
9e228210): the phase table 4 `todo` under the line 4.

CI on the listed heads: #2054 `test`, playable, lint-build green; its
memory-budget hit the job's 20-minute timeout (a cancel), its one rerun
green. #2053 at 5ec4d137 all green (`test`, playable, memory-budget,
lint-build). #2051 red once at a7bb41a3 on heap-forget check 4 (2,571
against 2,560), the cause of adb2de6d; adb2de6d red on
switches-thrown (above), the cause of 8542c104. #2051 8542c104 and #2053
08bc3ecd (8542c104 merged in, nothing else): see the list.

Two rehearsals before this one were stopped: the first met L's #2052
over #2051 in `docs/SWITCHES.md`; the second, K2's heads moved (19:33).

Late, to sitting 40: L #2052 (5535; reviewed clean, merges the new `main`
in after #2051), #2058 (5536, the worker's guard door) and #2065 (5537,
the worker's zone door), in that order (`status/L.md`); SEC #2055 (5712), #2056 (5713), #2057 (5714; CLAUDE.md
§4 and REPO-SAFETY words, nothing in `.github/` or `wrangler.toml`),
stacked on #2054; K2's #2066 (5723, `movefields`, index.js; on #2053).

No two listed PRs share a file but: K2's stack (`status/K2.md`,
`index.js`, `dungeon.js`, `market.js`, `testmode.js`, the switch table:
#2053 holds #2051); the switch table (`switches.mjs`, `SWITCHES.md`:
`floodtally`, `dungeonground`, each its own line, merged clean);
`server/src/admin.js` and `leave.js` are SEC's alone.

## Z (this PR, 5677)

The phase table's line 5 -> 4 (`TODO_LINE`), the count on `main` 9e228210
after L's #2046 (`node tools/guards/phase-table.test.mjs`: 4 at the line
4). The plan noted for #2046 (5.3b). After #2052, sitting 40 or later
lowers it to 3. Documents and the guard's one number: no deploy of its
own.
