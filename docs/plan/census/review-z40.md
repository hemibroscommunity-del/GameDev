# The gatekeeper's review, sitting 40 (card Z; tag 5678)

Taken 2026-11-17 on `main` 17f749b1 (sitting 39 merged: SEC #2054, K2
#2051, #2053; Z #2064). SEC, K2 and L were told this sitting's session at
its start (20:22 UTC), M when the planning session named it (20:25).
Gathered 20:22 to about 21:30 UTC. Tags bare.

Reviews in full (`server/` or `src/`): four readers, each over two or
three PRs, the angles of `/repo-review` in one pass with each finding
put to its own disproof against the code and the suites; every VERIFIED
finding below was re-read here at the line named.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open, not a draft, with
one merge base at every step (`git merge-base --all`, each against `main`
with the PRs above it merged in as merge commits). The tree after each
merge:

1 SEC #2055 cb74e8e1b0076cc656ae1b07b25cd43a5a828526 -> aec370c479967a901463b68729e0dacd595448c7 (base 17f749b1)
2 SEC #2056 5550180bd2cff6cf25ca8d5a44e41d6b5b942bcc -> 40fa495ec0a95269448c19e18d0712260ead0e26 (base cb74e8e1)
3 SEC #2057 e54b2340743557cd1de427859515da9bb5520076 -> 7384f1b5f40eb31af445a46c42811dc4c217640c (base 5550180b)
4 SEC #2059 45a1625bfbf2ba849fd603dddb26b9804834764f -> da661e3cbc8fba3f86400f85bf653395df5ad85a (base e54b2340)
5 SEC #2060 8854cecf683197d21ed6f85d90bdac755cf0034a -> 2098ec261da9687d04197b46125f18069ecf57b0 (base 45a1625b)
6 SEC #2061 04d550d93bcb669ab4f789cd8b4f4bb77406edb8 -> d977f8c34b058189c09eadde4fe1c5844c63d5df (base 8854cecf)
7 SEC #2062 7c1c0c224deda85ca19d2bd7b9c1735682743992 -> 2e426d3bf715d4463b7c583e81cf9449c11bfb04 (base 04d550d9)
8 SEC #2063 71ba0da532c528e18d8ed2b2f44292cf91051fcd -> 9956d7e158d3a2eeb0d82a5b4d2bfbd21f8ccbb2 (base 7c1c0c22)
9 K2 #2066 932cdbf37832762a13e6f0bbed9929f48d191263 -> a8cc7442c23e9fba9c1255ef22f79b2dfc4680e4 (base 17f749b1)
10 L #2052 eba7de64ca67326255f8204e2c3d9a3bb2305c1c -> b9e586554f205c1376418d2818ee8c246b44094b (base 17f749b1)
11 Z (this PR): its head and tree are in the list (`status/Z.md`).

SEC's stack is one line of branches (each on the one before, `main`
17f749b1 merged in at 20:22, the mends merged up at about 20:44 and
20:57); K2 merged `main` in at 20:30, L at 20:33.

## SEC #2055 (5712): the chain's sends have a day's budget

READY at cb74e8e1, after a HOLD this sitting. Card SEC item 13; its
"done when" says "the switch thrown sends nothing". At 571379ef:
- VERIFIED: `_chainScoreOn()` is read once, at `_chainScoreCheckpoint`'s
  entry (chainscore.js 272), never inside the job queued on
  `_chainEnqueue` (about 333). Each job holds the queue 6 to 60 s for its
  receipt, so checkpoints queued before the switch is thrown are still
  sent and pay their fees (the reader's probe: five queued, `chainscore:
  false`, all five sent). The mend: the switch read again at the job's
  top, with a `chainday` case.
- Nit: past the day's ceiling a queued job still makes its preflight and
  nonce read before `_chainDayTake` refuses it.
- PLAUSIBLE: the fee ceiling (1e15 wei) sends a first write of fourteen
  skills only at about 0.33 gwei or less (the suite's stub price moved
  1 -> 0.01 gwei to pass); `/chainstatus` counts no `fee-over-ceiling` or
  `day-ceiling` refusal, so if Hemi's price sits above the line the
  writes stop with nothing to show it. Hemi's real price was not
  checkable offline.
- Clean: the break proof (main's two files: `chainday` 9 of 10 red), the
  switch's rows, no new write (memory only, as the card allows), tags.
- SEC's mend, cb74e8e1 (read here in full): each queued job asks
  `_chainScoreOn()` when it runs and again before it signs; the day's
  place is taken first, before the preflight and nonce read, and given
  back if the job then fails; `/chainstatus`'s day counts `refused` by
  reason (memory only). `chainday` §5 (five queued, switched off, none
  sent) and §6 (past the ceiling, no call to the node): the first build
  fails both. CI all green. #2056 and #2057 changed only by that merge.

## SEC #2056 (5713): the dev console shows no Login Key, device pass or token

READY by its review (`src/debug/`).
`join`'s `phrase`, `verify` and `device`, and the page's `_tabKey`,
`_tabKeyOld`, `_joinKey`, `_verifyToken`, `_httpToken`, all blanked
(read against wsClient.js); break proof 3 red on main's files. Nits:
`devblank` check 4 reads source by a pattern; `blankFrame` does not look
inside a bundled array (no secret rides one today). The popup half went
to L's #2033, as the card asked.

## SEC #2057 (5714): three guards and words

READY by its review. `verifyUrlLocal` withstood a
login part before the host, `127.0.0.1.evil`, `[::1]` and a host only
starting "localhost"; `verifylocal: false`. `do-migrations` reads every
`wrangler.*` (a `.jsonc` parsed). The CLAUDE.md §4 and REPO-SAFETY lines
only add; the places they name exist. Nothing in `.github/` or
`server/wrangler.toml` anywhere in SEC's stack. Nits: the guard does not
read bindings set inside an `[env.x]` (the deploy names no `--env`); the
new CLAUDE.md line says "tell the owner" without its neighbour's "stop".

## SEC #2059 (5715): gear is worn only if the worker holds it

READY at 45a1625b, after a HOLD this sitting. Card SEC item 16; "done
when: the suite's empty-bag character gains no reduction and no stash
piece". At da23eed4:
- VERIFIED: `claimsClosed` (gearstash.js 590) needs
  `stored.gearStashCaptured`, and the stamp is set only when a join's
  merge TOOK something (637, `took > 0`). Since v2.3.4840 the worker adds
  every piece itself, so an honest record usually stays uncaptured: one
  join with a forged `rpgArmorStash` naming an elite chest merges it,
  stamps the record, and the describe then wears it (`_armorDrMult` 0.2;
  the reader's probe). `gearheld.test` seeds captured records only. The
  mend: the armour and legs claims closed whenever `gearheld` is on (or
  a record stamped at its first merge), and a case with an uncaptured
  record.
- VERIFIED in code: a piece with no `tierMult` never matches
  (`sanitizeGearPiece` gives the stash copy 1, the describe path keeps it
  undefined: grids.js 1029, gearstash.js 491), so it can never be worn
  again. How many stored pieces lack one is not known.
- PLAUSIBLE: at 48 chest pieces the worker refuses the 49th (index.js
  4462, the `stashGive` cap) while the phone adds it (wsClient.js 4426);
  with the merge closed the worker never learns it.
- Clean: weapons untouched; test mode rightly not asked; the switch
  restores both the describe and the join (`gearheld` §5).
- SEC's mend, 091860f8 (read here): `claimsClosed` is `_gearHeldOn()`,
  captured or not; `_gearHeld` and `_gearStashLiveTake` read both sides
  through `sanitizeGearPiece`. `gearheld` §3 (the probe) and §6 (no
  `tierMult`): the first build fails 6 of 21. `gearstash` and `gearprov`
  play the claim door with the switch thrown. Note: the sanitized
  signature also reaches grids.js 138's swap-on (on main, not under the
  switch): a piece with no `tierMult` now leaves the stash when put on,
  as it should. The honest loss, a piece only a phone made before
  v2.3.4840, and the 49th chest piece go to SEC's Found (the phone's).
  CI green on #2060's head, which carries it.

## SEC #2060 (5716): an old key never works from a device not on the list

READY by its review.
- VERIFIED, the owner's tool: DevPanel.jsx about 1477 ("Let one new
  device in (30 min)"), its success words (about 788) and the Forget hint
  (about 1488) still promise a new device can join; with `oldkeyheld` on,
  `_deviceDecide` (devicelock.js 223) never returns `pass`. SEC lists it
  under Found: a DevPanel PR next.
- Nits: loginkeys.js 144's re-check after a join runs only with
  `devicelock` on; the harness's `letDeviceIn` does nothing for an old key
  now (`mp-traitswitch` 194 passes by order).

## SEC #2061 (5717): the site ships its protective headers

READY (a file of headers and a guard). The policy is `frame-ancestors
'none'` alone: no script, connect, image, worker or style rule, so the
worker's socket, Turnstile's frame inside the page, blob and data
pictures, module workers and inline styles all go on. Nothing embeds the
game. `nosniff`: `public/` sends only `.js`, `.json` and media. It moves
the old `src/public/_headers` (which never shipped) to `public/`, so the
headers go live with the next Pages build of `main`.

## SEC #2062 (5718): secrets in the browser stay on the real site

READY by its review (`src/`). The owner keeps the admin key
over a reload and keeps every character (the list stays in
`localStorage`); a key saved before is still read. Nit: DevPanel about
979 said "Kept until this browser closes"; `sessionStorage` is a tab's
(7c1c0c22: "Kept in this tab until it closes").
PLAUSIBLE: `www.brotown.net` is a live host (report.js 200); a host-only
roster cookie no longer carries the characters between it and
`brotown.net` (the planner: keep host-only; named for the owner).

## SEC #2063 (5719): a character restart starts from nothing

READY at 71ba0da5, after a HOLD this sitting (twice). Card SEC item 20.
At e31fc7c2:
- VERIFIED: `_resetMarketHold` (persistence.js 560) counts one page of
  `betweenOf` (200 a prefix; playerrestore.js) and ignores its
  `betweenFull`; the store holds up to 2,000 listings. The reader's
  probe: 201 other players' listings, then the player's own: the restart
  was not refused, the record wiped, the listing kept (list, restart,
  cancel). The mend: the room's own counts a player (`_stCounts`,
  `_mktOrderCounts`), or a refusal when `betweenFull`.
- VERIFIED (the daily quests on, or after a failed save): `_drMap` and
  `_drDirtyMap` are not forgotten with the other caches; the restart
  leaves through `reset: FULL` (leave.js), which runs `_drOnClose` and
  writes the old `daily_rewards:` row back when it is dirty (probed).
- PLAUSIBLE: the top bidder on another's listing is held too, but a bid
  cannot be withdrawn: "cancel your listings and orders first", stuck up
  to 7 days.
- Nits: the rows call `daily_rewards:` "the login streak's row" (the
  streak lives in `cadence:login:`, which a restart keeps);
  `RESET_REFUSED_WORDS.fight` copies `FIGHT_WORDS`' text; the
  `character_reset_refused` out row (wire/out.js 227) names only the
  fight.
- Clean: the key's registry row and marks; its delete inside the
  restart's one run of writes; the switch restores both; duel wagers,
  trades and the inbox no worse.
- SEC's mend, c84af285 (read here): the hold counts the room's own
  indexes (`_mktOrderCounts`, every `_stIndex` listing the player sells,
  leads the bid on or has an offer on); `_drForget` drops the cached
  daily record unwritten; the words name offers and top bids; the fight
  words are `FIGHT_WORDS`. HELD again here: the market words grew to 129
  characters, and the phone shows a refusal's words only up to 120
  (wsClient.js 1629), else "Not while you are fighting a player".
  71ba0da5: 110 characters, the picker's to match, `resetclean` §1 pins
  every refusal at 120 or less. SEC's full suite on a9c570cd: 507 green.

## K2 #2066 (5723): a move's fields held to their form

READY (reviewed in full). Card K2 PR 4. Every page that sends a move
stays inside the new forms (BroTown.jsx 8155 and 5239, wsClient.js's
shim about 5926): gear ids `none` or up to 13 characters, a dodge's
600 against 10,000, a numeric facing still taken, v1 and v2 the same
move. The AFK signature unchanged for an honest move; dodging, blocking,
`ba`, `ex` untouched; `movepath.js` 136 agrees on `vx`. `movefields:
false` is the old path. The move row's `trust` unchanged (the door
checks no type for these fields; the handler does). Its last index.js
change: L's worker doors stack after it. 932cdbf3 (20:30) is 26ac79eb
with `main` merged in and K2's status lines: the same merged tree.

## L #2052 (5535): the dungeon's page door

READY. Reviewed in full at sitting 39 (b2acfa3f: clean). eba7de64
(20:33) merges `main` 17f749b in; the one conflict, `docs/SWITCHES.md`
beside #2051's `dungeondoor`/`dungeonground` rows, mended by
`switches.test --write` (each row its own line, read here). Nothing else
moved (21 files, +231 -47, as at b2acfa3f).

## L #2058 (5536): the guard door; READY, to sitting 41

Marked ready at 20:48, stacked on #2052 (893dd068). Reviewed in full:
READY. All fifteen former writes of the guard go through `_guardTo`
(moveclaims.js 156) with the same values and order (movement.js 943's
raise only from down; the breaks' `Date.now()`; the stamina drain and
the flush outside the door); `guarddoor: false` lifts only the latch
refusal, which every raise checks first anyway; no honest path newly
refused. Break proofs: a write put back in linger.js, a latch write in
combat.js: `guard-door` red. Nits: spar.js 530 and 596 now also zero
the clone's `blockStartT` (unseen: `_parryOpen` reads `blocking`
first); docs/SHAPES.md 1035's new row has 2 cells of 3 and claims
`guardPhase`, which the page's row holds.

Not on this list: merged step by step after #2059, its `guarddoor` row
in `docs/SWITCHES.md` lands on the line #2059's `gearheld` takes (git
says so). The second merges `main` first. With #2065 (meets #2066 in
`server/src/movement.js`) and #2067, L merges `main` in up the stack
after this list lands.

## L #2065, #2067 (5537, 5538); K2 #2068 (5724): to sitting 41

L's two marked ready at 20:48, stacked on #2058. K2's #2068
(`relaytyped`, b8b5f721, on #2066) came at 21:06, after the planning
session asked for the list within 15 minutes. Not reviewed this sitting.

## The rehearsal

REHEARSAL_PLACEHOLDER
