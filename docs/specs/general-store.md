# General Store (v2.3.2475) — spec + attach points

The server-wide store the owner asked for: **list anything from your bag,
at your own price, and let anyone buy it now or bid on it.** Phase 1.

Companion to — not a replacement for — the bucket order book
(`docs/specs/marketplace.md`). Both surfaces are live; the Exchange
building keeps working exactly as it did.

## Why a second surface instead of extending the order book

The order book matches on a five-field taxonomy bucket
(`category:subtype:tierKey:element1:element2`): a resting buy order is a
bid for *any* weapon in that bucket, and the first crossing order executes
at the resting price. That shape cannot express "bid on **this** sword",
and it can only ever list one kind of goods — the bucket key *is* a weapon
taxonomy. It also takes its taxonomy from the request body, which
`market.js:66-69` documents as an open hole ("a modified client can
advertise a copper blade as godly").

So the store is per-**listing**: one seller, one pile of goods, one ask
price, at most one live bid — and every field it displays is derived from
the server's own copy of the goods after escrow. Nothing in the request
names what an item *is*, only which of the caller's own goods to list.

## Scope — phase 1 only (owner decision D11)

| Listable | Not listable |
|---|---|
| stackable inventory items (`ps.inventory`) | armour, shield, legs, cosmetics, amulets |
| weapons from the server weapon stash (`ps.weaponStash`) | the equipped slots |

Those gear stashes are **client-local** — the server persists only the
equipped slot, and `grids.js:860` says so outright ("armor lives in a
client-only armorStash"). Handoff rule 16 forbids escrowing a blob the
client supplies, so listing them is not a small addition: phase 2 moves
those stashes server-side (fixed field list + migration + join load), and
phase 3 lets the store escrow them. **Do not add a gear branch here
first.**

## Wire surface (HTTP, `/api/store*`)

Routed by the outer worker to the shared room, same as `/api/market*`
(the escrow mutates the wallets and stashes this room owns, so the room
has to answer — handoff rule 9). Every mutating request carries the
caller's own session token (`x-bt-auth`, `httpauth.js`); every mutating
response carries `settled: true` (rule 19).

| Method + path | Body / query | Answers |
|---|---|---|
| `GET /api/store/browse` | `cat`, `cursor`, `limit` | `{ok, listings[], nextCursor, total}` |
| `GET /api/store/mine` | `playerId` | `{ok, listings[], bidding[]}` |
| `POST /api/store/list` | `{playerId, kind:'item'\|'weapon', invKey+qty \| stashIndex, price}` | `{ok, settled, listing}` |
| `POST /api/store/buy` | `{playerId, listingId}` | `{ok, settled, bought, price}` |
| `POST /api/store/bid` | `{playerId, listingId, amount}` | `{ok, settled, bid, amount}` |
| `POST /api/store/accept` | `{playerId, listingId}` | `{ok, settled, accepted, price}` |
| `DELETE /api/store/cancel` | `id`, `playerId` | `{ok, settled, cancelled}` |

A listing on the wire carries `{id, sellerId, sellerName, kind, cat, qty,
askPrice, createdAt, expiresAt, disp, topBid, bidCount}`. `cat` is one of
the bag's own filter categories (`all/weapon/armor/potion/crafting`) so
the store groups the way the bag does; `disp` is the server-derived
display record (a weapon's name/type/tier/elements/quality, an item's
key). **The escrowed weapon blob never goes on the wire.**

`caps.store` (join.js) advertises the whole surface. The client gates its
Sell button, its Store panel and every store fetch on it: against an older
worker there is no route at all, so an ungated panel would show an empty
shelf it could never fill.

## Settlement

- **List** — escrow at placement (rule 7). A stackable leaves through
  `_escrowTakeItem`; a weapon is spliced out of the *server's*
  `weaponStash` by index under `_sanitizeWeapon` (rule 16 — the request's
  own `item` field is ignored). If the record write throws, the goods are
  returned through `_creditPlayer` (`store:<id>:unwind`) — escrow that
  cannot be written never existed (market.js's v2.3.1971 incident).
- **Buy now** — the buyer's gold is debited (`store:<id>:pay`), then the
  goods are credited to the buyer (`store:<id>:goods`), then the seller is
  paid (`store:<id>:gold`), then the record is deleted. Goods first: it is
  the irreplaceable half of the trade (v2.3.1184's reasoning).
- **Bid** — gold at rest, so it escrows at placement
  (`store:<id>:bid:<seq>`) and the player it outbids is refunded in the
  same event (`store:<id>:bidref:<seq>`). A bid that reaches the ask is
  simply a purchase at the ask — there is nothing left for the seller to
  decide.
- **Accept** — the seller takes the top bid; the winner's gold is already
  escrowed, so the sale settles at the bid price and charges nothing more.
- **Cancel / expiry (24 h)** — the live bid is refunded and the goods are
  returned through `_creditPlayer`, so an offline seller gets them in the
  mail. Expiry is **lazy** (rule 12 — there are no alarms and the tick
  stops when the room empties): every store request runs a rate-limited,
  bounded sweep.
- **Sold notice** — the seller's gold leg is a `_creditPlayer` with
  `source: 'market'` and a note reading `<label> sold to <name> for
  <price>`. Online that arrives as `inbox_delivered`; offline it waits in
  `inbox:<pid>` until the next join. No new event type, so nothing to add
  to `PRIVILEGED_EVENTS`.

### The in-flight markers (read before editing any money path)

The order book escrows at placement, so its record names everything of
value the moment it lands. A store sale cannot: the buyer's gold arrives
at buy time, *after* the record exists, so there is a window where money
has moved and nothing on disk names whose it was. A restart there loses
it — the class of bug v2.3.1184 closed on the order book.

So every money move is preceded by a marker written into the record, and
the wake-time rebuild (`_stEnsureIndex` → `_stConverge`) resolves it:

| Marker | On the next wake |
|---|---|
| `rec.sale` | resume the settlement if the payment stamp is present (or the bid already paid); otherwise clear it and re-list |
| `rec.pendBid` | promote the bid if its debit stamp is present; otherwise drop it — no money moved |
| `rec.releasing` | finish the release (`_stRelease` re-runs; every leg is idempotent through its opId) and delete the record — never re-list it |

`rec.releasing` was added in **v2.3.2521**, after review. A cancel or an
expiry is also three separate disk writes — refund the bid, mail the
goods home, delete the record — and the worker restarts on every merge to
`main` touching `server/**`. Before the marker existed, a death between
the refunds and the delete left a record carrying *no* flag at all, so
the rebuild read it as healthy and put it back on the shelf holding goods
it had already returned and a bid it had already refunded: the item could
be bought a second time, and an accepted stale bid paid the seller gold
nobody paid. `market.js` `_mktEnsureIndex` checks its `refund:<id>` stamp
for exactly this reason (v2.3.1184); the store had copied the buy path's
protection and not the refund path's. Covered by `market.test.mjs` S8
(d) and (e).

Because only a record *carrying* a marker costs an oplog read, the
rebuild is one paged `list()` and (almost always) zero extra storage
reads. That matters: a storage await holds the whole room's input gate
(rule 9's second edge, v2.3.2438).

## Storage

| Key | Value |
|---|---|
| `store_listing:<listingId>` | the listing: escrowed goods, ask price, live bid, bid log (10), and any in-flight marker |

Registered in `docs/ARCHITECTURE-HANDOFF.md` Part 1.

## Constants (`STORE`, `server/src/store.js`)

24 h expiry · 10 listings per player · 2000 listings globally (the bound
that keeps the rebuild's `list()` finite) · 60 s sweep interval, 20
listings resolved per pass · browse page 20, capped at 40 · minimum bid
increment 1 · maximum price 999,999.

## The client (v2.3.2476)

| Where | What |
|---|---|
| `src/ui/storeApi.js` | the one door to the worker: room + token plumbing, `storeEnabled()` (the `_serverCaps.store` gate) |
| `src/ui/mobile/dash/ItemDetailPopup.jsx` | the **Sell** action and the inline price sheet; the anchor demoted to a header chip |
| `src/ui/panels/buildings/StorePanel.jsx` | the shelf: `buildingPanel === 'store'`, grouped by the bag's own `CATEGORIES` |
| `src/ui/panels/buildings/VendorPanel.jsx` | the **door** — a "Player store" row at the top of the general store building |
| `src/ui/panels/buildings/ExchangePanel.jsx` | the same link, and the deletion of the legacy self-credit path |
| `src/ui/mobile/StoreToast.jsx` + `storeToastBus.js` | "your thing sold", pushed from `gameEvents.js` on an `inbox_delivered` entry whose `source` is `market` |

**The door matters.** Twelve building panels are written and only two have a
prop on the current town map — the forge and the general store
(`worldProps.js`); the MARKETPLACE building that opens the Exchange has no
door at all, which is why `mp-market` has skipped its UI half for versions.
So the store hangs off the general store building, which is both the
building it belongs in and one a player can actually walk into.
Shopkeeper Bro's own shelf is unchanged; the player store is a row above it.

**The legacy self-credit path is gone** from `ExchangePanel` (v2.3.2476).
It ran whenever a response arrived without `settled: true` and moved coins
and stash entries itself — the deploy-order fallback from v2.3.1118, which
rule zero says exists "to be deleted once every worker in production
advertises the capability". Every worker has settled the order book for
hundreds of versions; what remained was a client that still knew how to pay
itself.

**One tap, one listing (v2.3.2507).** The Sell button's in-flight guard is
a ref, not the busy state: `setSellBusy(true)` only disables the button on
the next render, and on a phone the normal way to press something once is
to press it twice — two pointerups in one frame would otherwise both reach
the worker and escrow the goods twice.

**Selling never mutates locally.** The Sell sheet posts a key (or a stash
index) and a price; the goods leave the bag on the worker's side and the
client redraws off the `player_state` echo. The stash index is re-resolved
against the live stash immediately before sending, for the reason
v2.3.2341 records on the Equip button.

## Attach points

- `server/src/store.js` — the mixin (`Object.assign(GameRoom.prototype,
  storeMethods)` in `index.js`).
- `server/src/index.js` — the outer-worker route and the DO `fetch`
  branch, beside the market's.
- `server/src/join.js` — `caps.store`.
- `src/ui/panels/DevPanel.jsx` — `CAP_GATES` entry.
- `server/test/market.test.mjs` — the store section (both surfaces are
  tested in one file so they can be shown not to interfere).
- `tools/qa/mp/mp-market.mjs` — two real browsers against the real HTTP
  surface: list, bid, outbid refund, accept, buy now, take down, and the
  seller's notice.
- `tools/qa/mp/mp-store.mjs` — the screen: the bag's Sell button, the price
  sheet, the walk to the door, the shelf, and the take-down.

## Defaults taken (confirm)

- A seller may cancel a listing that has a live bid; the bidder is
  refunded.
- A bid at or above the ask buys outright rather than resting.
- Listings expire after 24 h, matching the order book.
- Any stackable the player holds is listable (the same posture trading
  takes — there is no blocked-key list).
- The store's door is the general store building (the marketplace building
  has no prop on the town map); the Exchange links across to it too.
- The sale notice fires for the old Exchange's sales as well, since both
  surfaces settle with `source: 'market'`.
