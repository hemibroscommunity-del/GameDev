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

## Scope (owner decision D11; gear added v2.3.2528)

| Listable | Not listable |
|---|---|
| stackable inventory items (`ps.inventory`) | the equipped slots |
| weapons from the server weapon stash (`ps.weaponStash`) | anything the server does not hold a copy of |
| **gear from the five server gear stashes** (v2.3.2528) | |

The rule behind that table has not changed and is the only rule here:
**the store can escrow exactly what the server already holds by
reference.** Handoff rule 16 forbids taking custody of a blob the client
supplies, so for two phases gear was unlistable simply because the server
did not have it — it held one worn piece per slot and `grids.js:860` said
so outright ("armor lives in a client-only armorStash"). Phase 2 gave the
server its own copy; phase 3 lets the store take it. Nothing was relaxed
to get there.

> v2.3.2523: phase 2 shipped — the five gear stashes are rpg-blob
> fields now (`docs/specs/gear-stash.md`).
> **v2.3.2528: phase 3 has shipped too** — the store escrows them. The
> section "Gear listings" below is the whole of it; read its first two
> subsections before touching any gear path, because they are the two
> ways this feature duplicates player property.

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
| `POST /api/store/list` | `{playerId, kind:'item'\|'weapon'\|'gear', invKey+qty \| stashIndex \| field+sel+hint, price}` | `{ok, settled, listing}` |
| `POST /api/store/buy` | `{playerId, listingId}` | `{ok, settled, bought, price}` |
| `POST /api/store/bid` | `{playerId, listingId, amount}` | `{ok, settled, bid, amount}` |
| `POST /api/store/accept` | `{playerId, listingId}` | `{ok, settled, accepted, price}` |
| `DELETE /api/store/cancel` | `id`, `playerId` | `{ok, settled, cancelled}` |

A listing on the wire carries `{id, sellerId, sellerName, kind, cat, qty,
askPrice, createdAt, expiresAt, disp, topBid, bidCount}`. `cat` is one of
the bag's own filter categories (`all/weapon/armor/potion/crafting`) so
the store groups the way the bag does; `disp` is the server-derived
display record (a weapon's name/type/tier/elements/quality, an item's
key, a gear piece's name/slot/tier/grade). **The escrowed weapon blob
never goes on the wire, and neither does the escrowed gear piece** —
`_stPublic` is a whitelist and `gear` is not on it.

`caps.storeGear` (v2.3.2528) advertises the GEAR half specifically, and
is separately switchable — see "Gear listings" below.

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


## Gear listings (v2.3.2528) — `server/src/storegear.js`

Phase 3. Armour, legs, shields, cosmetic layers and amulets can be put up
like anything else. A gear listing is `kind: 'gear'` and is the **same
record travelling the same paths** as a stackable or a weapon — the
`sale`/`pendBid`/`releasing` markers, the wake-time rebuild, credit-first
settlement, the opId journal are all unchanged and shared, not copied.
`_stGoodsCredit` is the one place that says what a listing is made of, and
the settle, the release and the create-path unwind all read it; that is
what puts gear under the `releasing` marker for free rather than under a
second mechanism beside it.

What is genuinely different is small and is all in `storegear.js`.

### A piece is NAMED, not indexed

A stash weapon is addressed by index because `ps.weaponStash` *is* the
authoritative list and the client mirrors it off the echo. The gear
stashes are not that yet — `gear-stash.md`'s own "What this does NOT
solve" says the client is still the authority for its own stashes and the
server's copy "is a point-in-time snapshot and drifts". The two lists are
in different orders, so an index from the client points at whatever
happens to sit there on our side: that is how a player sells a different
piece from the one they tapped.

So a gear request carries `{field, sel, hint}`. `sel` is the piece's own
identifying fields; the server derives `stashSig` from it (the client's
own `_shSig`, so both sides call the same two pieces the same piece) and
finds a matching entry in **its own** list. `hint` is the client's index,
believed only when the signature at that index agrees. **`sel` is a
selector, never the goods** — what is escrowed is the server's own object
by reference (rule 16), and `sel` is sanitized in strict mode before its
signature is taken, so a 200 KB name cannot build a 200 KB key and a
claimed provenance mark cannot be compared.

A consequence worth knowing: the fields the signature reads must be
truthful, because they *are* the identity. A selector claiming a bigger
`tierMult` does not list a bigger piece — it names a piece nobody holds,
and is refused having taken nothing.

### The worn slot — a known open hole (v2.3.2529)

**A piece equipped after the hand-over is recorded twice.** Adoption
writes the stash as it stood; equipping is client-local and the client
tells the server about the worn slot alone (`stats_update`, grids.js), so
the server now holds the plate as `ps.armor` *and* as an entry in
`ps.armorStash`. List the stash copy and the player keeps wearing the
armour they were paid for — one plate, two owners, and the buyer paid
real gold for a copy. No modified client is needed: equipping a spare is
the normal way to play.

v2.3.2528 shipped `_stGearReconcileWorn` for this and **v2.3.2529 removed
it**, because it was worse than the hole it closed. It deleted one stash
entry whose signature matched the worn piece, assuming such an entry is
the stale duplicate adoption left behind. Often it is not:

- Every player already wearing armour when the hand-over ran holds only
  **real spares** — the worn piece was never double-recorded for them —
  and the sweep ate one.
- It ran on every listing **request**, so it was not idempotent against a
  real wardrobe: three requests ate three identical spares.
- It swept all four slots regardless of which list was being sold from,
  so listing a shield deleted an armour spare.
- The deletion persisted even when the listing then failed.
- And it did not close the hole anyway: unequip → list → re-equip is
  three buttons in the game and walks straight past it.

The root problem is that `name|gearBase|tierMult|tier` cannot tell a stale
copy of what you are wearing from a second identical plate you really own.
**Deleting gear a player owns is strictly worse than the duplication it
was meant to prevent**, so there is no replacement heuristic and none
should be added. `server/test/market.test.mjs` §S12e asserts the removal
and the spares it must not eat.

So, plainly: **a player can sell the armour off their own back.** What
bounds it is `caps.storeGear` — the same live-ops kill switch that bounds
the accepted risk below, one flag write, no deploy. The real fix is a
ledger rather than a guess: the server has to know what is in a stash
because *it* put it there (see the two mint sites named below), and until
then the worn slot cannot be reconciled against a list the server never
wrote. That is the owner's call to make separately.

**Cosmetics have the same hole for a second, independent reason.** The
server stores no worn-cosmetic slot at all — there is no such field in
`_saveRpg`'s fixed list — so even a ledger would have nothing to compare a
`gearStash` entry against until one exists. Cosmetics carry no stats (they
are appearance), so what leaks there is a duplicate *look* and the buyer's
gold, not power.

### The client has to stop showing what it sold (v2.3.2529)

The client does **not** read `armorStash` / `legsStash` / `shieldStash` /
`gearStash` off the `player_state` echo — `gear-stash.md` names that as
"M3's first problem" and it is still open. v2.3.2528 relied on a redraw
that therefore never happened: the listed piece stayed on its card and in
localStorage, and tapping **Equip** on it made the worker accept it
through `stats_update`, so the buyer got the escrowed plate and the seller
wore an identical one. With the hand-over running on every login (#641)
the surviving copy folds back into the server stash on reload, which turns
a one-off into a loop.

`removeGearLocal` (`src/ui/mobile/dash/gearSellLocal.js`) splices the piece
out of the client's own list on a **successful** listing only — identity
first, then the tile's index checked by signature, then the first
signature match, never a blind index. A refused listing leaves the bag
exactly as it was, because the worker took nothing. This is the smaller
fix and it is named as such: **making the client a reader of the echoed
stash is the real one, and it remains open.**

### Being in the stash is not proof of ownership — an accepted risk

Adoption validates the **shape** of what a client claims and never whether
the player ever held it; it reaches every existing character and
(v2.3.2527) never closes. So a modified client can put gear into its own
stash list, and from this version that gear can be sold.

The three ways to close it were weighed:

- **Corroborate the piece.** The one that would really work, and it is
  nearly available. The server *does* mint armour —
  `_rollArmorDropsForKill` (index.js) builds a dropped piece out of
  `MONSTER_ARMOR_DROPS`, `_grantQuestItem` (quests.js) builds quest armour
  out of `QUEST_REWARDS` — but both were written when there was no
  server-side stash to put them in, so both hand the piece to the *client*
  (`loot_credit.armor`, `quest_reward_stashed`) and never record it in
  `ps`. The server mints gear and then forgets it. Until those two sites
  also write the stash, "list only corroborated pieces" lists **nothing**.
  (The forge-minted fields a client claim cannot fake — `hardness`,
  `temper` — are weapons-only: `hardening.js` refuses any non-weapon slot.)
- **Require the piece across more than one session.** Rejected as theatre
  with a real cost: adoption runs on every join, so an attacker pays one
  extra login while an honest player waits a session to sell armour they
  just earned.
- **Accept it, and bound it.** Taken.

So: **the risk is accepted deliberately for the demo**, and hedged three
ways.

1. `caps.storeGear` is the kill switch. `join.js` spreads `..._liveFlags`
   last over the baked caps, so writing `storeGear: false` into the
   `liveflags` key un-advertises the surface *and* (`_stGearOff`) stops
   the route accepting a listing — so a client that kept its button is
   refused too. No deploy, and the rest of the store is untouched.
   Existing gear listings are deliberately **not** cancelled by it: a kill
   switch that destroyed live escrow would be worse than the thing it
   switches off.
2. `store_gear_strict` is the tighter rule, already wired: turn that live
   flag on and only pieces the **server itself wrote** are listable.
3. Which the server now marks. Every piece delivered through
   `_creditPlayer(kind: 'gear')` — a refund, the goods leg of a sale, an
   unwind — is stamped `_sv`. A client cannot award itself one: strict
   sanitizing strips it by name (`_stGearStrip`), because
   `sanitizeGearPiece` deliberately keeps unknown fields.

Nothing carries `_sv` at the moment this ships, so **strict mode lists
nothing and must stay off.** It becomes usable the moment the two mint
sites above also write the stash they already fill on the client — the
named next slice, and a small one, because the merge `gear-stash.md` ships
is a multiset union: a piece written to both sides converges to one copy
on the next join rather than doubling.

### Prices

**There is no gear sell-value formula, and none was invented.** The store
is seller-priced by design — the item card says so in as many words
("Your price, nobody else's — the store has no suggested value") — so a
gear listing takes the seller's own number under the same 1..999,999
bounds as every other listing, and `_weaponSellValue` (the vendor
price a weapon fetches from Shopkeeper Bro, `gear.js`) is not consulted
because nothing here sells to a vendor. Armour has no vendor price
anywhere in the game, so deriving one would be a **balance decision**
about what a plate is worth, taken silently inside a plumbing PR. If the
owner wants a suggested number on the sheet, that is a deliberate one-line
follow-up, not a default.

### The credit kind

`_creditPlayer` gains `kind: 'gear'`, payload `{field, piece}` (inbox.js
dispatches to `_stGearApplyCredit`). Like the weapon kind it returns
false — and only false — for a **full stash**, so the entry waits in the
mail rather than being destroyed by `_saveRpg`'s cap (handoff rule 3).
Which sanitizer a piece needs depends on its list: an amulet reaches the
authoritative damage roll and goes through `_sanitizeAmulet`; a cosmetic
is a `{slot, gearId}` pair.

### Deploy-order safety

| Order | Behaviour |
|---|---|
| new client, old worker | `caps.storeGear` is absent, so no gear Sell button appears and nothing is sent; an old worker would refuse `kind: 'gear'` anyway |
| old client, new worker | never sends `kind: 'gear'`; every other listing behaves exactly as before |
| new, new | gear lists, sells, cancels and expires |

**A worker ROLLBACK across this version is the one unsafe direction**, and
it is named here rather than left to be discovered. A `kind: 'gear'`
record written by this worker and read by an older one falls into that
worker's `kind === 'weapon' ? weapon : item` ternary as an *item*, and
credits `{invKey: null}` — which `_applyCreditToPs` accepts and discards.
The escrowed piece would be lost. Exposure is bounded by the 24 h expiry;
if the worker is rolled back, roll gear listings off first (flag 1 above
stops new ones) or accept that live gear escrow is lost. This is a
property of every new record shape the store has ever added, not of gear
specifically, but gear is the first one worth writing down.

### A latent bug found on the way

`_stCreateListing` dispatched on kind as `if (kind === 'item') { … } else
{ …weapon… }`. A bare `else` was correct while `'weapon'` was the only
other kind; the gear branch fell straight into it and went looking for
`body.stashIndex` in the weapon stash. Harmless in that path because it
refuses an out-of-range index — but a third kind landing in a branch that
**spliced first** would have escrowed the wrong goods. It is `else if
(kind === 'weapon')` now.

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

**Gear on the client (v2.3.2528).** Three small edits, no new screen:
`storeApi.storeGearEnabled()` (the `_serverCaps.storeGear` gate); a Sell
action on the four gear cards in `ItemDetailPopup.jsx` (`stashArmor`,
`stashLegs`, `stashShield`, `stashGear`), whose confirm sends
`{kind:'gear', field, sel, hint, price}` off a `GEAR_SELL` **Map** —
a Map and not an object because `'constructor'` is a legal string
(TRAPS #6); and `StorePanel.jsx` drawing a gear row (the painted icon the
bag uses for that piece, via `armorIconFor`/`gearIdIcon`, with a
per-slot glyph fallback). Gear files under the bag's own **armor** chip,
so it groups with `bagFilterBus.CATEGORIES` like everything else.
`amuletStash` has no card, because an amulet still has no unequip flow to
put one in (`InventoryPanel.jsx`).

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

**Selling never mutates locally — except where nothing would redraw.**
The Sell sheet posts a key (or a stash index) and a price; a stackable or
a weapon leaves the bag on the worker's side and the client redraws off
the `player_state` echo. The stash index is re-resolved against the live
stash immediately before sending, for the reason v2.3.2341 records on the
Equip button. **Gear is the exception (v2.3.2529)**: the client is not a
reader of the echoed gear stashes, so a successful gear listing splices
the piece out of the local list itself (`gearSellLocal.js`, above). Still
nothing on failure, and still nothing before the worker has answered.

## Attach points

- `server/src/store.js` — the mixin (`Object.assign(GameRoom.prototype,
  storeMethods)` in `index.js`).
- `server/src/storegear.js` — the gear mixin (v2.3.2528), assigned
  immediately after it; `server/src/inbox.js` — `kind: 'gear'`.
- `server/src/index.js` — the outer-worker route and the DO `fetch`
  branch, beside the market's.
- `server/src/join.js` — `caps.store`, `caps.storeGear`.
- `src/ui/mobile/dash/gearSellLocal.js` — the gear cards' stash table and
  the local splice (v2.3.2529); pure, so `market.test.mjs` §S12j can
  import it.
- `src/ui/panels/DevPanel.jsx` — `CAP_GATES` entries.
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

Gear (v2.3.2528):

- **Gear may be listed even though the server cannot prove you own it.**
  The reasoning and the kill switch are in "Gear listings" above; this is
  the one default worth a second look before the game has real players.
- **A worn piece IS listable** — the worn-slot hole is open and bounded by
  the kill switch, not closed by a heuristic (v2.3.2529, above)
- Cosmetic layers *are* listable even though their worn state is invisible
  to the server; they carry no stats.
- Gear files under the bag's **armor** chip, all five lists.
- The seller sets the price. No suggested value was invented for gear.
- The strict-provenance flag ships **off**, because nothing carries the
  mark yet.
