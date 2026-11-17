# A repeat acts once (v2.3.5194)

Grand plan step 11.3, step 1; card K PR 9. A phone on a bad line re-sends a
request it never heard back from. Until now some requests that move value
acted again on a re-send: a market order escrowed the next weapon, a store
buy paid twice. The page's action door already gives each such request an id
(`reqId`, `docs/SHAPES.md` part 2: one tap, and every re-send of it). Now the
worker reads it.

## The promise

- **A repeat with the same `reqId` acts once and gets the first answer
  again.** The answer echoes the id.
- **Its reach is the player's own.** The worker reads an id only together
  with the player who sent it: one character's ids never meet another's.
- **Either side ships first.** A request with no id is served as today. The
  five that read the phone's `opId` (the bank's two moves, the chest, the
  cape's redeem, the daily spin) read `reqId` first, and `opId` from an
  older phone.

## Where it is remembered

| Request | Where |
|---|---|
| The market's place (`POST /api/market/place`) | On the order it makes (`mkt_order:<id>`.`reqId`), in the same put: a repeat after a restart finds its order still resting and escrows nothing |
| The store's listing (`POST /api/store/list`) | On the listing it makes (`store_listing:<id>`.`reqId`), the same way |
| The bank's deposit and withdraw | The vault's `ops` (the last 32), as the phone's `opId` was |
| The chest, the cape's redeem, the daily spin | Their stamp (`oplog:chestop:`, `capered:`, `spinop:`), now `<pid>:<reqId>` |
| Every first answer, and the requests with no record of their own (the market's cancel; the store's buy, bid, accept and cancel; the auction house's offer, its cancel and the seller's reply) | In memory for the sitting (`reqonce.js` `_reqSeen`: the last 32 a player, 10 minutes; `heapforget.js` ages it out). A repeat while the first still runs waits for its answer |

`server/src/reqonce.js` holds the memory and `_reqOnce`, the routes' way.

## The lasting stamp (built OFF)

A request with no record of its own is remembered only for the sitting: a
retry across a deploy is the rare case. The live flag `reqstamp: true` writes
a lasting stamp row for each (`oplog:rq:<pid>:<reqId>`, pruned with the oplog
at 48 hours), and a repeat the sitting has forgotten then answers `repeat:
true`. It is **one row a request** (a store buy, a cancel): the owner's cost
question, so it is off. `cost-guard.test` §22 holds both: no row more while
off, one while on.

## The switches

- `reqonce: false`: no id is read, nothing is remembered or echoed: a repeat
  acts again, as before (the five still read an older phone's `opId`).
- `reqstamp: true`: the lasting stamp above (off by default).

## Not done here (5194b, once the files other cards hold are free)

- The cap `reqid` (`join.js`, `CAP_GATES`) that tells the page the worker
  answers once; only then may the action door re-send a timed-out request
  with the same id (`src/game/actions.js`), and send a DELETE's id in its
  query.
- The market's and the store's rows of the wire table (`wire/http.js`): their
  `reqId` column `none` -> `reqId`, and `reqId` in their `trust`.
- `docs/SHAPES.md` part 2's "Where it is remembered" row, for each request.

## What holds it

`server/test/req-once.test.mjs`, and its break proof (the market's place with
the id ignored sells the next weapon); `cost-guard.test` §22.

## 5195: every other value request, at the wire door (v2.3.5195)

Card K PR 10. The other 31 socket rows a player may start whose `doesWhat`
holds `value-out` or `final` (a weapon sold or forged, a cook, a gamble, a
shop's buy and sell, a trade's staged weapon, a report...) read `reqId`
through ONE step, not 31 handlers: the wire door (`wire/door.js`
`_wireDoor`, after its checks) asks `reqonce.js` `_reqOnceDoor`. A message
whose id the player sent before (the sitting's memory, `_reqSeen`) reaches no
handler and is answered the player's state again (every field, not the
delta): what these rows change. The first is remembered before its handler
runs: a socket's messages run one at a time, so its repeat finds it whatever
the first's outcome.

- The rows that keep their own record and answer (5194: the bank's two, the
  chest, the cape, the spin, the auction house's three offers) are left to
  them (`REQ_OWN`); the door's list is made from the table (`reqDoorTypes`).
- Left `none`, with its reason (`req-once-door.test` §4): the account
  reset's route, which knows no player until it has read the phrase.
- It sits behind the wire door: `wiredoor: false` or `reqonce: false` turns
  it off.

`server/test/req-once-door.test.mjs` holds it (its break proof in its header).

