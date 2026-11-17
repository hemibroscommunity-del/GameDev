# The gatekeeper's review, sitting 28 (card Z; tag 5666)

Taken 2026-11-17 on `main` 7b629a91 (sitting 27 merged: J2 #1984, #1986,
#1987; R #1980; K #1989; T #1978; O #1985, #1991; P #1988; Z #1990).
The owner asked for speed: late arrivals go to sitting 29. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main`, with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in). `test` green on each head. The tree after each merge:
1 #1981 b6703cd4bbec54086fba616e10999afd309967de -> dcc49e4c8bee0561a7ec34537c4645bde4b319b4
2 #1992 c937d7d8a9acc63417053f6efa2d3fb2edc2c085 -> d4a87588cffda6b89057c42a297afb75faf82638
3 #1993 353a7e4ae7444e62b903eb49a8cd5f65360a9eae -> ad17f46721fd40847196d30e00060f3c211332ca

Rehearsed (`tools/dev/gatekeeper.mjs` on 7b629a91), K #1981 + T #1992
(tree d4a87588): build PASS, questline 187/187, precheck 1 FAIL only
`server-tests`' 5-minute limit; the server suite by itself in that tree:
471 suites all green (282 s). Then T #1993 on top (tree ad17f467):
build PASS, questline 187/187, precheck OK (0 FAIL, 4 WARN: K's unopened
k-10 branch also carries 5546; eventcapes.js:348,550 proto-safety, on
`main` already). T #1994 (5314) came after: sitting 29. A first run was lost to a container
restart; T's 48b25487 (`const search` reassigned: no build) was replaced
by c937d7d8 before it was rehearsed.

## K #1981 (5546): the page's re-send, sitting 27's hold mended

Sitting 27's medium is closed. `RESEND_ROWS` (actions.js:516): the page
re-sends only the store's list, buy, bid and accept; never the market's
`place` (a matched sale leaves no record: a re-send after a restart would
sell the next weapon) nor the arena's `join` (its repeat reads "Already
queued"). Each of the four is safe without the sitting's memory: a listing
finds its own `reqId` on its record (store.js:706); a buy finds the
listing sold (`rec.sale`) or gone; a bid of the same amount is under
`topBid + MIN_BID_STEP`; an accept finds the sale. So the `_reqSeen`
32-slot low (door entries pushing a route's answer out) no longer reaches
a second sale. req-once 38/38 (§14: place and join tried once; break
proof). New live: the cap `reqid` (join.js; `reqonce: false`), the page's
one re-send (1.5 s, once), a first that threw kept `interrupted`. Low:
- a listing re-sent after a restart whose first listing already SOLD and
  was deleted inside those 1.5 s lists a second item of the seller's own
  (no gold made, no item copied; the window is a restart plus a sale in
  1.5 s).

## T #1992 (5312): sitting 27's two lows on #1978

READY. switch-table.md "sixteen files"; wheelTrial.js `let search =
pageAddress()` (a `let`: the Memory savers' row appends to it; T's first
head made it `const` and broke the build, replaced before review).

## T #1993 (5313): eleven reads into the page's reader

READY. Stacked on #1992. `sw` for warmonce, banners, sharp, figround (each
a page row with its form; the guard's `MOVED` holds each to its old
pattern); `pageAddress()` in deviceProfile, picsOnce, worldViewport x2,
bodyBake, p256, stripRead. `pageAddress()` now falls back to
`window.location` when `location` is undefined (a node suite that stubs
only `window`); on a page the two are one object. switches.js stays
import-free, so deviceProfile's node test still loads (37/37). Guards:
switch-reader (outside line 172 -> 161), switches, switches-thrown,
owner-switches all green; banner-reach, warm-once green.
