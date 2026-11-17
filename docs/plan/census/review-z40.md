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

HEADS_PLACEHOLDER

## SEC #2055 (5712): the chain's sends have a day's budget

HOLD. Card SEC item 13; its "done when" says "the switch thrown sends
nothing".
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

## SEC #2056 (5713): the dev console shows no Login Key, device pass or token

READY by its review (`src/debug/`), held only by #2055 below it.
`join`'s `phrase`, `verify` and `device`, and the page's `_tabKey`,
`_tabKeyOld`, `_joinKey`, `_verifyToken`, `_httpToken`, all blanked
(read against wsClient.js); break proof 3 red on main's files. Nits:
`devblank` check 4 reads source by a pattern; `blankFrame` does not look
inside a bundled array (no secret rides one today). The popup half went
to L's #2033, as the card asked.

## SEC #2057 (5714): three guards and words

READY by its review, held only by #2055. `verifyUrlLocal` withstood a
login part before the host, `127.0.0.1.evil`, `[::1]` and a host only
starting "localhost"; `verifylocal: false`. `do-migrations` reads every
`wrangler.*` (a `.jsonc` parsed). The CLAUDE.md §4 and REPO-SAFETY lines
only add; the places they name exist. Nothing in `.github/` or
`server/wrangler.toml` anywhere in SEC's stack. Nits: the guard does not
read bindings set inside an `[env.x]` (the deploy names no `--env`); the
new CLAUDE.md line says "tell the owner" without its neighbour's "stop".

## SEC #2059 (5715): gear is worn only if the worker holds it

HOLD. Card SEC item 16; "done when: the suite's empty-bag character
gains no reduction and no stash piece".
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

## SEC #2060 (5716): an old key never works from a device not on the list

READY by its review, held by #2055 and #2059 below it.
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
game. `nosniff`: `public/` sends only `.js`, `.json` and media. Held by
#2055 and #2059 below it.

## SEC #2062 (5718): secrets in the browser stay on the real site

READY by its review (`src/`), held below. The owner keeps the admin key
over a reload and keeps every character (the list stays in
`localStorage`); a key saved before is still read. Nit: DevPanel about
979 says "Kept until this browser closes"; `sessionStorage` is a tab's.
PLAUSIBLE: `www.brotown.net` is a live host (report.js 200); a host-only
roster cookie no longer carries the characters between it and
`brotown.net`.

## SEC #2063 (5719): a character restart starts from nothing

HOLD. Card SEC item 20.
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
  restart's one run of writes; the switch restores both; the message
  fits an old phone; duel wagers, trades and the inbox no worse.

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

## L #2058, #2065, #2067 (5536 to 5538): to sitting 41

Drafts, each from 9e228210 and not stacked; L merges `main` in after
the one before lands (`status/L.md`).

## The rehearsal

REHEARSAL_PLACEHOLDER
