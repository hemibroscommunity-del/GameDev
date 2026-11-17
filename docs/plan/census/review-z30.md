# The gatekeeper's review, sitting 30 (card Z; tag 5668)

Taken 2026-11-17 on `main` 78f70f4a (sitting 29 merged: T #1994, #1996,
Z #1998). Late arrivals go to sitting 31. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main`, with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in as merge commits). The tree after each merge:

1 K #1997 9d16082d0f994fb23d7b16a9d696ad7fe3304a5e -> f14ec0753642434d5b144340c57918ca13ba9863
  (base 78f70f4a: main merged in)
2 K #1999 0a0d31191c31f6f1c1792171577216a12f04c86c -> 98a37eddfe6d3ea4a7850ff1415ec1e59fb43102
  (base 9d16082d: stacked on #1997, K.md resolved)
3 L #2000 c81646769177f68b0d9866654ac7e879620e5e7f -> 684ecfc4bae405d65234dd5f81dd5d93c55c9501
  (base 78f70f4a)
4 T #2001 a3804acb2c847ee802f7e5e1ec1b7bde465c6a67 -> 97c49d4d598b11ba9c4ed3e91f48ca25c16716d1
  (base 78f70f4a)
5 T #2002 6f9019d46c85b53c5783ae36d34ea178baf1a223 -> 80bfeb4476994d821d60f7d85cd3686b36a5aa2c
  (base a3804acb: stacked on #2001)

REHEARSAL

## K #1997 (5196): a weapon named by its id, never by its place

READY at 9d16082d (HELD at e317f5e5, mended in the sitting). Nine handlers
(gear, market, store, amulet, trade2, salvage x2, revealbag) call
`_gidPlace` and act only on its answer; no await between it and the
write; no map keyed by a client id. Live flag `gidnames` ON (row in the
switch table), cap `gidnames` on its own line and in `CAP_GATES`; the page
sends an id only against a worker that advertises it; the door lets an
older worker ignore the field ("a phone's extra field is not a fault"). No
stored shape: `gid` is card R's (5282). The `trust` rows are complete.
- HIGH, found at e317f5e5 and mended at 9d16082d: the three equips
  (`equipActions.js`, `ItemDetailPopup.jsx`, `InventoryPanel.jsx`) move
  the page's stash BEFORE they send, so the door's lookup by place named
  the NEXT weapon (stash [A,B,C], equip A -> gid B: refused, the weapon
  snapped back). Each now sends the gid taken from the weapon itself, and
  the door keeps a given gid; gid-names part 4 holds both.
- Low: these three panels are outside card K's files (the card's own job
  needed them, at the gatekeeper's finding); the PR's words still say
  "no panels touched".
- Low: `SmithyPanel.jsx:534` takes its id at press time, not draw time
  (its `sig` still guards it).

## K #1999 (5547): the wire door's request ids keep their own list

READY. `_reqSeenDoor` beside `_reqSeen` (its own `HEAP_FORGET` row, aged
like it), `DOOR_KEEP` 64: door messages no longer push a route's
remembered answer out (sitting 27's low). req-once-door part 6. Stacked on
#1997 (only K.md shared).

## L #2000 (5526): the window door

READY. The five writes of `_uiBusy` and `_npcProxLatch` in BroTown.jsx go
through `windowTo`, which writes the old field first, then keeps
`S._windows` (a Map); every reader unchanged; nothing a player sees.
Switch `?windowdoor` (page, ON, `=0` off, row and form in place). The
`window` phase row is `door`. phase-table, switches (539 rows),
window-door 13/13, state-ledger green. Low:
- `ui.js:114,163`: the two fields' ledger rows say `writers: []`, written
  through `S[WINDOW_WHYS[why]]` (the loading door's rows are made the
  same way).
- It also carries `social.js`'s `_drafts` ledger row (5524's low).
- Card L said the window door waits for card H's `done`; H says `ready`.
  Five one-line edits in BroTown.jsx; no H PR open on it.
- A new file in `server/test/`: it deploys the worker.

## T #2001 (5316) and #2002 (5317): look and render reads

READY. #2001: 13 reads to `sw`/`swHas`, each held to its old pattern by
the guard's `MOVED` (the `retrylooks` aliases by `NEEDS`), 15 keep their
test on `pageAddress()`; the outside line 144 -> 116. #2002: 45 render
reads on `pageAddress()`, each regular expression word for word (checked
line by line); 116 -> 71. Stacked: #2002 holds #2001's head.

## Not in

K 5197; J2's shopkeeper and flakes; R 5293 (after K's 5196/5197). No PR
open when the list went: sitting 31.
