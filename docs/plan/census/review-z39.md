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
2 K2 #2051 a7bb41a33412b6faac6940e5561c7096f2bee2a5 -> 2b27c2eaede069e4d66f057627315496fa791220
3 K2 #2053 5ec4d137c132c4b50017ac57471de05651634fe5 -> bef3d0f3837786aa46e46fc67004b788a1995815
4 Z (this PR): its head and tree are in the list (`status/Z.md`).

The bases, step by step: #2054 9e228210 (SEC merged `main` in at 19:11);
#2051 9e228210 (K2 merged `main` in at 19:33); #2053 a7bb41a3 (#2051's
head, merged into #2053); this PR 9e228210. One line each.

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

REHEARSAL_RESULT

## Z (this PR, 5677)

The phase table's line 5 -> 4 (`TODO_LINE`), the count on `main` 9e228210
after L's #2046 (`node tools/guards/phase-table.test.mjs`: 4 at the line
4). The plan noted for #2046 (5.3b). After #2052, sitting 40 or later
lowers it to 3. Documents and the guard's one number: no deploy of its
own.
