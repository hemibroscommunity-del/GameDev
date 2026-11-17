# The gatekeeper's review, sitting 23 (card Z; tag 5661)

Taken 2026-11-17 on `main` 8149d61 (sitting 22 merged). The owner asked
for speed: the PRs in hand reviewed and listed now, one reviewer a PR that
changes the game (the seven angles of `/repo-review` in one pass, each
candidate tried before it is reported). Later arrivals go to sitting 24.
Tags here are written bare.

## Heads: every one was behind `main`

Seven of the twelve heads in hand conflicted with 8149d61 (switch rows or
status files). Each session merged `main` in and sent a new head. Two stacks
were made so a status file's conflict could not stop the second PR: K #1949
on #1942, and MOD #1914 on #1909. R's #1950 was stacked on #1873, which
was then held. R could not force its branch back, so it opened #1961 at
exactly d9227c4 (the unstacked head) and closed #1950. **#1950 must not be
merged**: its history holds #1873's commits with their changes undone.

The ten listed, merged in order from 8149d61 as merge commits: no
conflict, one merge base at every step.

Rehearsed (`tools/dev/gatekeeper.mjs`, the ten in list order; the merged
tree a49f278): build PASS, questline 187/187. Precheck's one FAIL was
`server-tests` hitting its 5-minute limit while the machine was loaded
(load 11-19), twice, with every suite printed `ok`. The same tree's
`cd server && npm test`, run alone with no limit: 464 suites, all green in
256 s (`guards/switches-thrown` alone takes 198 s). Precheck's WARNs: the
branch list, and proto-safety on `party.js` 239/640's old `meta[pid] = {}`
lines (values, not a keyed object).

## MOD #1947 (5626, `mktwords` ON): the market's words are the worker's

Head 14943791 (ab8f574 + `main`; server files byte for byte ab8f574).
Flag off: the old expression exactly. Label lookups use `hasOwnProperty`,
and the name is cut to 24. Resting orders keep their words until they
expire (at most 24 h). Nothing found. For K (its files): `wire/http.js`
~66-75, the `market/place` row should name `mktwords` and say that
tierLabel/playerName are read only when it is off. A sell's `tierKey` is
still the seller's claim (already on file).

## L #1946 (5524, `?allydrafts` ON): the Saloon's drafts outlive a rejoin

Head 22037af1. Page memory only (no browser storage), keyed by party id
(a Map, capped at 8). Flag off: main's. Low: `allyDrafts.js:22` `_drafts`
is a new unlisted module variable (census 20 -> 21, line 22), for L's next
PR. The scope (outside L's PR list) was given to L by the planner's message
at 00:18.

## J2 #1948 (5641): mp-palette's two phones read ground lines alike

Head 90ba29f7. Test and status only (`?pagebases=0` on both pages). Card
check only.

## P #1943 (5565, `?fishspot` ON): the pond's twin

Head 0bc4138b. Flag off: Pixi's own loader, pixels as main's. The twin is
one column wider (transparent), placement ~0.1 px. The memory line is
lowered 84.5 -> 83.0. Lows: the row's `on` says 11-15 (should be the merge
day); status/P.md says "no PR"; asset-door.md and memory-budget.mjs name
entityRenderer.js for the pond's loader (it is effectsRenderer.js).

## K #1942 (5544, `heapforget` ON): the room forgets who left

Head 06a85618. A takeover never forgets. A close while lingering skips it,
and a quiet resume keeps all. Trade, escrow, party and duel are untouched.
A spent chat bucket and a day-young report log are kept until spent out,
so a rejoin hands back no allowance. Flag off: main's. Note: after a
reconnect, admin's `lastStrike`/`arrowBlast` read null (null also means
"rejoined since" now).

## K #1949 (5545, `roomceiling` ON, a cap): the room's ceiling on messages in

Head 4c86bd6f (on #1942). Per room, the share is 4000/s divided by the
room's sockets. One socket cannot starve the others. Flag off: main's. Two
lows, for the owner:
- a flooder at 95/s a socket is never closed (550 drops per 10 s, under 600),
  so N5's request bill is barely reduced (the room still receives ~9500/s);
- in a full room the share is 33/s, and a crowd fight is 35-40/s: honest
  phones then silently lose the tail of each second, any type (a trade or
  market tap included). Nothing is minted or lost; the act just does not run.

## MOD #1909 (5623, `reportring` ON) > #1914 (5624, `invitepace` ON)

Heads f6783133 and 457af0b2. Flag off: main's. The ring is memory only;
`to`/`tos` are never stored. Lows (MOD has them, and #1962 for sitting 24
answers all): 10 public lines after the abuse push the whispers out of a
report; the ring's "1 MB" leaves out `tos`; a repeat friend request in 5 s
gets no answer. For the owner: as built, a report carries what the
reporter received *instead of* the speaker's own lines (the card said
"beside"); #1962 puts them back beside.

## OPS #1944 (5610, `guestlazy` ON): a guest's join writes only what is worth keeping

Head 2aac0ffb. Earnings save as they happen, as on main. A guest with a
key later writes as before. A failed read marks nothing. No cost-guard
line raised (7 and 7b now join with a key: 6 rows, at the cap). Flag off:
main's. Lows:
- `cadence.js:135`: a guest who earned but never spun comes back at streak 1,
  not 2, a day behind until it breaks. For the owner.
- `friends.js:132`, `chatmod.js:345`: a guest who chatted and left without
  earning is `not-found` to a report.
- the row's `on` 11-15.
- `index.js` and the new `guestlazy.js` are outside the card's list.

## R #1961 (5292, replaces #1950): the arena's stakes write ledger rows

Head d9227c4a. `xferescrow` stays OFF: only its row's text widened. With
it off, no new writes. The rows are written in the plan's own run, so a
restart is all or none. Lows (R's follow-up, tag 5295, before the flag is
ever thrown):
- `share:` strings in `ids` are counted as items by econcard's
  `itemsOf`/`xferSummary`;
- `IDS_MAX` 32 cuts the shares when more than 32 sponsors win.

## Held

- **R #1873 (5282, the save shape 21 -> 22).** A worker rolled back past it
  destroys weapons carrying `gid` outside `rpg:`. Main's `gear.js:300`
  `_isGearNotWeapon` is true for any `gid`, so `_sanitizeWeapon` gives
  null, and `inbox.js:466` consumes the mail. The same goes for
  `mkt_order:` sells, `store_listing:` weapons and `trade2wpn:` escrow. With
  `newersave: false`, the old load drops every weapon in hand. The PR's
  words say otherwise. R's #1960 (5294, the tolerant reader) must deploy
  first: both are for sitting 24. Low: `worldsum.js:90` counts a settled
  sell's item twice.
- **O #1952 (5239, the fill/glint/clip falling back alone).** When the clip
  fails its self-test, it falls back to the alpha mask, but `p256.js`'s
  `HAIRMASKS_ON`/`CAPE_HOOD_ON` keep the masks as colour numbers (fixed at
  load, only `?alphaclip` drops them). Pixi's alpha mask then reads
  `r` = number/255, so hair under 31 of 40 hats and the hoods draws wrong on
  exactly the phone the fallback is for. mp-selftest page 13 cannot see it.
  Low: the two `_selfOff` are missing from `src/state/render.js`.

## Reviewed, for sitting 24

- **RT-1 #1940 (5584, `ip56`, `offdevs` ON).** It meets K #1942 and MOD #1914
  in the switch files, so it merges `main` after this list. Fixed since
  review (07f549b5): the login door counts a refused try in neither. Open:
  `ip56`'s `thrownFails` cannot name account.test (the guard finds suites
  by file name; `ip64` has the same gap: `systems.mjs`, not RT-1's).
  For the owner: with `devicelock` thrown off, `offdevs` ON starts a write
  pace (one `auth:` put per character and unlisted device), and a key
  holder can push the player's devices off the 12 list.
- Arrived after the review closed: P #1955 > #1959, J2 #1953 (both stacked
  over main and the PR below: they merge the new main first), T #1958,
  L #1956, R #1960, MOD #1954 (a new stored key, `ownerdev:`, a few puts
  ever: a cost line for the owner) and #1962, OPS #1951 (draft).
