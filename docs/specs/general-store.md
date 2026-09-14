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

## Attach points

- `server/src/store.js` — the mixin (`Object.assign(GameRoom.prototype,
  storeMethods)` in `index.js`).
- `server/src/index.js` — the outer-worker route and the DO `fetch`
  branch, beside the market's.
- `server/src/join.js` — `caps.store`.
- `src/ui/panels/DevPanel.jsx` — `CAP_GATES` entry.
- `server/test/market.test.mjs` — the store section (both surfaces are
  tested in one file so they can be shown not to interfere).

## Defaults taken (confirm)

- A seller may cancel a listing that has a live bid; the bidder is
  refunded.
- A bid at or above the ask buys outright rather than resting.
- Listings expire after 24 h, matching the order book.
- Any stackable the player holds is listable (the same posture trading
  takes — there is no blocked-key list).
