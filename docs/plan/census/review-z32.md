# The gatekeeper's review, sitting 32 (card Z; tag 5670)

Taken 2026-11-17 on `main` a0b24f2e (sitting 31 merged: T #2007; J2
#2005, #2008, #2009; K #2006, #2003; L #2010; Z #2011). Late arrivals go
to sitting 33. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2013 5098a44a5c11f79fffe6202e6e8c8e9853f2e95c -> 4817dafc1c91ae5ef72baccb607524e1841cb6ee
  (base a0b24f2e)
2 K #2014 72049a823887c245a46bcc4865b5f31d5e75683c -> a9d6266f403d0a92226f6912e87b4a0d491f1a58
  (base 5098a44a: stacked on #2013)
3 R #2015 de28f5a50e49910650aee6bb14235783ec3c4dac -> 5d13730aa6b620ffd6e435018086035d920ee3e4
  (base a0b24f2e)
4 L #2012 f48e41b035922fce023f64a1b84676ef3309ef82 -> 414c1b095f72863942da628a5257982abf55899d
  (base a0b24f2e)

Rehearsed (`tools/dev/gatekeeper.mjs` on a0b24f2e), all four at the heads
above: tree 414c1b09 (the same as the step-by-step merges): precheck OK
(0 FAIL, 1 WARN, the server suites inside its limit, 298 s), build PASS,
questline 187/187. Earlier, #2012 alone at f48e41b0: tree 0526ce55,
precheck, build, questline 187/187. At its first head (74373430) #2012
conflicted with `main` in `docs/SYSTEMS.md` and `tools/guards/lib/systems.mjs`
(K's #2003); L merged `main` in (f48e41b0). No two of the four PRs share
a file but the switch table (`docs/SWITCHES.md`, `switches.mjs`: R edits
`xferescrow`'s row, L adds `conndoor`'s): they merge clean. `test` green
on every listed head.

## K #2013 (5198): the worker's sends through the door, batch 1

READY (reviewed in full: `server/`). Card K item 13, the files no card
holds: 38 files, every `ws.send(JSON.stringify(x))` now `this._send(ws, x)`
(or `room._send` in `fightlock.js` and `valuepause.js`'s table rows, whose
`room` is their first argument); the tick's frames already made go as
`_send(ws, s, 'zone_state' | 'zone_monsters' | 'zone_nodes')`, written as
they are. `origin.js`'s refusal, before any room, goes through
`sendOutside` (`send.js`: no room, so uncounted; the same
`JSON.stringify`). Each frame byte for byte; `_send` throws as `ws.send`
does, so every caller's own catch is unchanged.
- `this` checked by parser over both batches: 103 `this._send` calls,
  each inside a method of a room mixin (`*Methods`) or `GameRoom`; none in
  a nested `function` (a throw there would be swallowed by its `try` and
  the frame silently lost).
- No write, no flag, no cap (`sendcount` counts; nothing a phone sees
  changes). Census of raw writes 93 -> 28.

## K #2014 (5199): batch 2, card L's and card R's files

READY (reviewed in full). Stacked on #2013 (its head merges #2013's: one
base at its step). `cooking.js`, `dungeon.js`, `gathering.js`,
`gladiator.js`, `join.js`, `persistence.js`, `prog3.js`, `quests.js`; the
room-full refusal's frame on a fresh `WebSocketPair` goes through
`this._send` inside `_roomFullRefusal` (a room method). Census 0. Card K
says the gatekeeper then makes the census strict: after it merges
(sitting 33). `test` green at 72049a82 (K: its playable and memory-budget
were still running when it wrote; `test` is the gate).

## R #2015 (5293): the market's and the Auction House's ledger rows

READY (reviewed in full: `server/`). Card R item 11's last rows (after
K's 5194, 5196, 5197, merged). One `xfer:` row a sale, seller to buyer,
the goods one way and the price the other, only with `xferescrow: true`
(OFF by default; the owner's cost question, unchanged):
- market cross (`market`, id `mkt-<maker>`): the row's put issued
  beside the maker's `settle` note, in the same synchronous run
  (`xferRow` puts before any await); a maker crosses once, so the id is
  unique; the old order (`mktsettle: false`) writes none (low);
- Auction House buy-now (`auction_sale`): through `_escrowDebitGoldTogether`'s
  new `also`, called only after every check has passed, its put in the
  payment's run; a bid accepted (`auction_bid`) and an offer taken
  (`auction_offer`) beside the listing's sale mark (as the duel pot's);
- `XFER.ROADS` comes from `PLAYER_ROADS` (`ledger: 'xfer'` on the four
  rows), so the roads are known to `xferRow`. `cost-guard` §23: off, no
  row; on, ONE row more a sale. No stored shape changes (the row's shape
  is 5092's). DEPLOYS the worker.

## L #2012 (5528): the connection door

READY (reviewed in full: `src/`). Card L item 5's `connection` door: the
21 writes of `S._realtimeStatus` in `wsClient.js` go through `connTo`
(`src/game/connectionDoor.js`); its one rule, a word of `CONN_PHASES`,
is what every caller already writes, so nothing a player sees changes.
`?conndoor=0` writes any word (its row in the switch table). The phase
table's row turns `door` (12 `todo` -> 11 once merged). New
`connection-door.test` (a second writer fails it); `socket-one.test` rigs
the real door. Its `server/test/` change DEPLOYS the worker (no behaviour
change). Low: the ledger row (`src/state/wire.js`) now lists five phases
of the fourteen (the ones its reader saw written as literals), as 5527's
rows did.

## Not in (sitting 33)

- J2's mp-itemdrop tap fix: no branch or PR by the cut-off (11:29 UTC).
- K 14 (the claims, the reach and the bow first): after #2013 and #2014.
- After #2014: the send-door census made strict (card K: the gatekeeper).
