# The shapes: one row for each thing two steps of the plan share

Step 8.6 of `docs/GRAND-PLAN.md`, and rule 2 at the top of its part 5: *a
shape is designed once.* Written by card S (`docs/plan/cards/S.md`), tag
5025, written bare as the plan's cards write theirs.

Read at `main` 2d4138e (the grand plan's own commit). Every "today" below was
read in the code at that commit, not in a document.

## 0. How to read this page

A **shape** is anything two steps of the plan both touch: an id, a stored
record, a column of the wire's table, a feed of numbers. Before a step builds
one, the shape has one row here. A step that needs a shape another card owns
asks for a column (under Needs in its status file) and never builds a twin.

Each row says:

| Column | What it holds |
|---|---|
| **Name** | The one name the shape has in code, on the wire and in storage. |
| **One writer** | The one function or file that may make or change it. |
| **Readers** | Who reads it. |
| **Where** | The file it lives in. A path, not a system's name: system names come with card B's map. |
| **Rows** | What it costs in storage rows written (a row a put). `none`: memory only. `rides X`: inside a put that already happens. `1 a <thing>`: a new row each time. |

Two marks:

- **TODAY**: the shape exists in the code under this name.
- **NEW**: nothing in the code has it. Its name was checked free (part 8)
  and nothing may use that name for anything else.

**No card builds anything on this page by reading it.** A row marked NEW is
built by the card named in its section, in that card's own PR.

**Frozen** means merged to `main`. After that:

- a card that builds a NEW shape may add what the row left open (a number, a
  list's members), in the PR that builds it;
- a change to a name, a writer or a closed list that another card reads is
  asked for under Needs, and lands in a PR that says so in its title.

The plan's words and the code's names differ in four places, because the
plan's word was already taken in the code. Part 8 has the proof.

| The plan says | The code will say | Because |
|---|---|---|
| the account (above characters) | `principal` | `acct` is the device in the daily spin; `account` is one character's login |
| the sitting's id | `stint` | `sess` is a sparring clone's made-up session; `sid` has four meanings |
| the grant | `permit` | `grant` is the owner's gift route and the anti-bot's verdict |
| the lane (a device's row of knobs) | `drawLane` | `lane` is a chat lane, a trade lane, a skill lane and a pace lane |

## 1. The actor

Steps 10.1 and 11.2. **Described here; no card builds it yet.** It is built
with the first thing that reads it: the wire table's check of who may start a
row (card K) or the sitting's card (card Q), whichever comes first.

### What the server knows today about who is acting

| The way in | Who is known | Where |
|---|---|---|
| The game's socket (`/ws`) | A session object, one a socket, in `this.sessions` (a Map). Its "who" fields: `phase` (`open`, `joined`, `gone`), `id` (the character's id: the phone's own choice, proved by its key), `name`, `char`, `device`, `ip`, `asn`, `asOrg`. | Made in `GameRoom.fetch` (`server/src/index.js`), named in `_handleJoin` (`server/src/join.js`), ended in `_playerLeaves` (`server/src/leave.js`) |
| A player's HTTP call (the market, the auction house, the arena) | The header `x-bt-auth` must equal the live session's `httpToken` (made new at each join, memory only). `_httpAuthCheck(playerId, request)` answers yes or no and passes nothing on: the handler reads `playerId` from the body again. | `server/src/httpauth.js` |
| The login door's HTTP call (`/api/account/login`, `/reset`) | The Login Key itself, in the body. | `server/src/account.js` |
| The owner's HTTP call (`/api/admin/*`, the Test panel's `/api/admin/dev/*`) | `Authorization: Bearer` the admin key. One key, one owner. A change is noted in `admin_log` (a ring of 100) with the TARGET's id and no "who". | `server/src/admin.js` `_adminAuth`, `_adminLog` |
| A public HTTP read (`/api/lobby`, the boards, the market's book, `/api/feedback/*`) | Nobody. A `playerId` in the address is a bare claim. | `server/src/index.js` `routeHttp` |
| The worker itself (the tick, a sweep, a rebuild as it wakes) | Nothing. Where a handler wants a session, one is made up on the spot: `{ id }` (`abilities.js`, `pvplunge.js`), a sparring clone's `sess` (`spar.js`). | `server/src/tick.js` and those three |

What that leaves out:

- **Nothing written anywhere says what kind of actor did it, or by which way
  in.** A gold move names its road and not its hand. The nearest traces are a
  mail credit's `source` (15 values, `admin` one of them) and `admin_log`.
- **Nothing marks QA.** A test or a bot is told from a player by nothing. (The
  join's `ws: [1, 5]` is the Wheel sizes a phone draws, not a mark.)
- **Test mode marks a character, not a hand**: `ps._testMode`, read from
  `testmode:<id>` at the join. Whoever holds that character's key plays in it.
- **A deploy loses every session.** Nothing is kept on the socket
  (`serializeAttachment` is used nowhere), and the room closes every socket it
  still holds as it wakes.

### The shape

One small object, made **once** as a connection or a request comes in, and
read by every door after that.

| Field | What it is | Values | Mark |
|---|---|---|---|
| `kind` | What is acting. | `person`, `qa`, `owner`, `system`, `helper` | NEW |
| `pid` | The character it acts as. Empty for `owner` and `system`: the character an owner's route changes is its target, not its actor. | A character's id (part 2) | TODAY's name for it |
| `principal` | The account above the character. | Empty on every actor until call 14 is answered (part 2) | NEW |
| `stint` | The sitting it belongs to. Empty where there is none (`owner`, `system`, a login door's call). | A sitting's id (part 2) | NEW |
| `wayIn` | Where it came in. | `socket`, `http`, `admin`, `room` | NEW |
| `permit` | The grant it acts under. | Empty for everything but a `helper` | NEW |

| Name | One writer | Readers | Where | Rows |
|---|---|---|---|---|
| `actor` (NEW) | The three places below, one for each way in. Nothing else makes or changes one. | The wire table's check of who may start a row (card K); the sitting's card (card Q); a ledger row's "who started it" (card E); the helper door (step 11.7) | On the session for a socket; a value handed to the handler for a request | none |

The kinds:

| Kind | What it is | How it would be known | Today |
|---|---|---|---|
| `person` | A player's own hand. | The default for a joined socket, and for an HTTP call that passed `_httpAuthCheck` or the Login Key's proof. | Not written down: it is everyone. |
| `qa` | The project's own tests and bots. | By proof the server holds, never by a field a phone sends. | No mark exists. What a program looks like today, none of it a proof: no `Origin` header, a local host, `session.ip` empty. |
| `owner` | The owner's hand on an admin route. The owner's own PLAY is a `person`'s. | `_adminAuth` answers `ok`. | Known on HTTP only; never on the socket. |
| `system` | The worker with no hand behind it: the tick, a sweep, a rebuild, a sparring clone, an ability the tick finishes. | Made by the room itself. | A made-up session, or nothing. |
| `helper` | A declared assistant acting for a player (pillar 11). | By its `permit`. | Nothing uses it. |

### Where it would be set

Three places, and no fourth:

1. **The socket.** Begun where the session is made (`GameRoom.fetch`: `wayIn`
   is `socket`) and finished once, where the join names the character
   (`_handleJoin`, beside `session.id` and `session.phase`): `kind`, `pid`,
   `stint`. A second join on a socket is already closed with 4011, so it is
   never set twice.
2. **The HTTP check.** `_httpAuthCheck` would hand back the actor of the live
   session it matched (today a yes or a no), so a handler stops reading
   `playerId` from the body a second time. `_accountLogin` gives an actor with
   a `pid` and no `stint`. `_adminAuth` gives `{ kind: 'owner', wayIn:
   'admin' }`. A public read has no actor at all.
3. **The room.** One constant, `{ kind: 'system', wayIn: 'room' }`, for the
   tick, the sweeps and the wake, in place of the made-up sessions.

### What holds for every actor

- **The server sets it from proof it holds. No field a phone sends names a
  kind.** A claimed `qa` would hide a bot from every record that leaves QA
  out; a claimed `helper` would buy a marked lane.
- **It is never changed after it is made.** A new socket is a new actor in
  the same sitting.
- **Calls 14 and 15 are not decided**, and the shape fits either answer:
  `principal` is an empty field, and `helper` is a kind nothing makes.
- `kind` is a name a credit, an ability and a pet already use for their own
  sort. It is the actor's only inside the actor: a record that keeps who acted
  keeps the actor under one key, never its fields flat beside the record's
  own.

## 2. Ids

Step 11.3: *whatever can be listed has a server id, never a place in a
list.*

### Ids that exist today

| Name | What it names | Made by | One writer | Readers | Where it is kept | Rows |
|---|---|---|---|---|---|---|
| `bp_…` (in code `pid`, `playerId`, `session.id`) | A character. Player and character are one id. Never changes. | **The phone**, from its first Login Key: `passphraseToId` (`src/networking/index.js`). The worker never makes one. A guest's id is any other string, with no key. | the phone | everything | the key of `auth:`, `char:`, `rpg:` and every other per-player prefix of the storage registry | none of its own |
| the device id | A browser's storage. A fleet signal, and what the device lock counts; not ownership: clearing storage makes a new one. | The phone: `getDeviceNonce` (`src/networking/index.js`), kept in `bt_device` | the phone | `devicelock.js`, `botfp.js`, `loginspin.js` | `device:<id>`, `auth:<pid>.devs`, `lspin:d:<id>` | exist |
| a Login Key's fingerprint `h` | A new 8-word key. | The worker: `_keyHash` (`server/src/loginkeys.js`) | `loginkeys.js` | the login door | `keyidx:<h>`, `auth:<pid>.keys` | exist |
| `gid` | A piece of gear: armour, legs, a shield, an amulet. **Not a weapon.** | The worker: `_gearProvMintId` (`server/src/gearprov.js`) | `gearprov.js` | equip, the auction house, salvage | `gear_prov:<pid>` (256 rows at most; a piece older than the ledger has none) | exist |
| a pet's id `p_…` | A pet. Moves owner with its id. | The worker: `_petbookMintId` (`server/src/petbook.js`) | `petbook.js` | the Pets page, the auction house, trades | `pets:<pid>` | exist |
| a listing's id | An auction-house listing. | The worker (`store.js`), a random id | `store.js` | buy, bid, accept, cancel | `store_listing:<id>` | exist |
| an order's id | A market order. | The worker (`market.js`), a random id | `market.js` | cancel, the book | `mkt_order:<id>` | exist |
| `opId` | **One leg of a payment the worker makes.** Deterministic, built from the worker's own ids (`settle:<orderId>:gold`, `duelpot:<duelId>`), so a retry after a crash finds its stamp. A mail entry's id is its `opId`. | The worker | each settlement's own file; `_creditPlayer` and `_opStamp` (`server/src/inbox.js`) stamp it | sweeps (`_opSeen`) | `oplog:<opId>`, 48 hours | 1 a leg, in the payment's own run of writes |
| a trade's, duel's, party's, war's, tournament's and match's id | That thing. | The worker, a random id | its own file | its own file | memory, or its own prefix | exist |
| a pile's id on the ground | A drop. | The worker (`mk-`, `dr-`, `dd-` and a counter or the clock) | `index.js`, `itemdrop.js` | `loot_pickup` | memory; a death pile in `death_pile:<id>` | exist |

Three more that look like ids and are not the kind this page needs:

- `session.httpToken`: a secret, not a name. New at every join.
- The crash road's `sid`: a random string the PHONE makes for one page load
  (`src/debug/crashTrap.js`). It is the only "one visit" id that exists, and
  the sender invents it.
- `sid`, `seq`, `mid`, `tid`: each has more than one meaning in the code
  (part 8). No new shape is named with them.

### Ids that are new

| Name | What it names | Made by | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|---|
| `principal` (NEW) | The account above characters: call 14's "one person, one account". | The worker, never the phone. | Not built. An empty field on every actor until call 14 is answered. If the answer is no, the field stays empty for good and nothing else changes. | The actor | Not built | none until built |
| `stint` (NEW) | One sitting: one visit of one character. It spans reconnects and deploys, and ends after a quiet gap. | The worker, at the join that begins it: the worker's own clock at that moment, in ms. Unique with `pid` (a character has one live session), and it is the sitting's "when". | The join (`server/src/join.js`), through the sitting's card (part 7) | The actor; the sitting's card; the report's second sink | Kept with the sitting's card, so a join after a deploy finds it | rides the card |
| `gid` on a weapon (NEW use of a TODAY name) | A weapon. | The worker, by the minter gear has: `_gearProvMintId`. | `gearprov.js`, or a ledger beside it: card R's (step 4.3). Either way the field on the piece is `gid`, and no second name is made for "the id of a made thing". | Every handler that takes a weapon from a phone (below) | Card R's | Card R's |
| `reqId` (NEW) | One request of a player's: one tap, and every re-send of it. | **The phone**, in one place: the action door (`src/game/actions.js`, step 5.8). | the action door | The handler it rides to, and the answer, which echoes it | below | below |

**What a sitting is, so the id means one thing.** Rule 5: *a session is a
sitting, not a socket.* A join by the same character inside the gap goes on
with the same `stint`; a join after it begins a new one, and the old card is
closed at the last moment it was saved. The gap's length is card Q's number.
The nearest rule in the code today is the anti-bot's activity streak: five
quiet minutes begin a new one (`BOTSIG.BREAK_MS`, `server/src/botsig.js`), and
it is saved in `botstat:<pid>`, so it already spans deploys.

**Nothing links two connections today but the character's id**, and each
system that waits for a player to come back has a clock of its own: a body
that lingers 20 s, a duel 15 s, a body take 60 s, a harvest 10 minutes, a last
place an hour. None of them is a sitting, and `stint` replaces none of them.

### The request id: one name, and why it is not `opId`

The card asks whether one name can serve the socket, the HTTP routes and the
phone's action door. **It can: `reqId`.** It cannot be `opId`.

Today:

- A phone makes an id and calls it `opId` in five message types:
  `bank_deposit`, `bank_withdraw`, `daily_spin`, `chest_open`, `cape_redeem`.
  (`loginspin_go` sends one and the worker never reads it.)
- Each maker makes a new id for every tap, and a reading found no path that
  sends one a second time. So today they stop a doubled frame and not a
  retry.
- **No HTTP route takes one.** `POST /api/market/place` names its weapon by
  its place in the stash and carries nothing else: a repeat after a timeout
  sells the next weapon. `POST /api/store/list` is the same for a weapon, and
  a stack listed twice is two listings.
- The socket has no way to tell which request an answer is for. Each feature
  matches its own way: the bank's `last.opId`, the login wheel's `k`, the
  harvest's `hitSeq`, an echoed place.

Why not `opId`:

1. **`opId` has a maker already, and it is the worker.** It names a payment's
   leg, and a sweep trusts its stamp: "never refund over a stamped payout".
   A string a phone chose must never be able to stand where a payout's stamp
   stands.
2. **Two makers under one name is rule 2's second definition.** Three of the
   five put the phone's string into `oplog:` under a prefix of their own
   (`spinop:`, `chestop:`, `capered:`), as keys for the whole room and not for
   one player.

So:

| | |
|---|---|
| The name | `reqId`, on the socket as `payload.reqId`, in an HTTP body as `reqId`. One name, one maker. |
| The form | A string of 1 to 64 of `A-Z a-z 0-9 _ -`. The bank's form today (`bk-<clock>-<count>-<random>`) fits. |
| Its reach | The worker reads it only together with the actor's `pid`. One character's ids never meet another's. |
| What it promises | A repeat with the same `reqId` acts once and gets the first answer again. An answer to a request that carried one echoes it. |
| Where it is remembered | In the record the request changes, in the same put, as the bank does (`bank:<pid>.ops`, the last 32): no new row. Where a request changes only the character's record (`rpg:` takes no new field: handoff rule 1), one stamp row, as the three `oplog:` prefixes cost today. Card K chooses for each row of the wire table, and `cost-guard.test.mjs` holds the count. |
| `opId` | Stays the worker's. A payment a request starts gets its `opId` from the worker's own ids, as today. |
| Either side first | The five types keep reading `opId` from an older phone, and read `reqId` first once they move. |

### Things a phone names by their place today

Each is a row of the wire table whose request must name the thing by its id
once it has one (card K, after card R's weapon id):

| Request | Names a weapon by | A check beside it |
|---|---|---|
| `sell_weapon` | its place in the stash | none |
| `equip_request` | its place, and a slot | the type must fit the slot |
| `POST /api/market/place` | its place | none |
| `POST /api/store/list` (a weapon) | its place | none |
| `amulet_forge_request` (extract, from the stash) | its place | none |
| `trade2_stage_weapon` | its place | the weapon's name, if sent |
| `smith_salvage`, `essence_apply` | its place | a signature of what it is (`weaponSig`): two alike pass for each other |
| `reveal_item` | its place | its name, if sent |

Gear is named by `gid` and a pet by its id already.

## 3. The roads' classes

Step 4.4. **The words only.** Card E fills the rows of `GOLD_ROADS` and
`BAG_ROADS`; this page fills none.

Today a road's row says its verb and how it reads the purse or the stack:
`GOLD_ROADS` (`server/src/gold.js`, 44 rows: 17 give, 24 take, 3 set) and
`BAG_ROADS` (`server/src/bag.js`, 69 rows: 33 give, 32 take, 4 set). No row
says where the value came from or went. That is the column card E adds.

### What is summed

The world's sum is taken **one kind of value at a time**:

- gold;
- each bag key by itself (carrots, copper ore);
- a made thing with an id, counted as that one thing: a piece of gear (`gid`),
  a pet, and a weapon once it has its `gid`.

For each kind: **everything held equals the start, plus what was minted, less
what was burned.** "Held" is every record the registry marks as holding value
(below): purses, vaults, mail waiting, every escrow. "The start" is the sum at
the moment the count begins. A character's gold is counted once: live when
they are in the room, stored when they are away.

So a cook is two roads of two classes: raw fish burned, cooked fish minted.

### The four classes

A road has **exactly one**.

| Class | What it means | The sum | Its other side |
|---|---|---|---|
| `mint` | The road makes value that was in no record before. | rises | none |
| `burn` | The road ends value: no record holds it after. | falls | none |
| `move` | The road is one side of value passing from one player's holding to ANOTHER player's. | unchanged | the road the other player's side runs |
| `escrow` | The road is one side of value passing between a player's holding and a record the WORKER keeps for a stated purpose, to pay on or to give back. | unchanged | that record's storage prefix |

**A road's other side** is the name of where the value is, after a `move`
or an `escrow` road has run:

- for `move`, the road that lands it on the other player (for a trade:
  `trade_window` takes, and the mail's `mail_gold` lands);
- for `escrow`, a storage prefix: `bank:`, `mkt_order:`, `store_listing:`,
  `duelEscrow:`, `arena_entry:`, `arena_stake:`, `bounty:`, `jackpot:draw`,
  `trade2wpn:`, `death_pile:`, `inbox:`.

A `move` or an `escrow` road with no other side named is not classed yet.
That is what the planted double pay of step 4.4 turns on: the sum of every
`move` and `escrow` road and its other side is nothing.

| Name | One writer | Readers | Where | Rows |
|---|---|---|---|---|
| a road's `class` and `other` (NEW columns) | card E, in the two road tables | the world's sum (4.4), the sitting's card ("gold by road class", 10.2), the day's book ("minted and burned by road class", 10.4), the transfer ledger (a row a `move`, 10.3) | `server/src/gold.js`, `server/src/bag.js` | none |
| `MAIL_CLASSES` (built: 5081) | card E | the counting of a credit (4.4), the transfer ledger (10.3) | `server/src/gold.js` | none |
| `ESCROW_PLACES` (built: 5081) | card E | an escrow road's `other`; the registry's marks (card E's next PR) | `server/src/gold.js` | none |
| `BAG_WHOLE` (built: 5081) | card E | the world's sum, for the bag's whole assigns | `server/src/bag.js` | none |

**Built (tag 5081).** Every row of `GOLD_ROADS` (44: 14 mint, 14 burn, 13
escrow, 3 move) and `BAG_ROADS` (69: 32 mint, 25 burn, 10 escrow, 2 move)
has `class` and `other`; `gold-door.test` and `bag-door.test` §8 fail a row
with none, a `move` or an `escrow` with no other side, and a credit whose
word has no class. Two words the first draft of this page did not have:

- **`other` may be a list** for an escrow road behind ONE shared helper that
  feeds several records (`escrow_debit`, `escrow_debit_stored`,
  `escrow_debit_group`: `duelEscrow:`, `arena_stake:`, `store_listing:`;
  the opId says which). A `move`'s other side is always one road.
- **The places an escrow names** are one closed list, `ESCROW_PLACES`: the
  prefixes above, less `trade2wpn:` (it holds weapons, which no gold or bag
  road carries), and with `shop_stock`, Diego's one pile (`shop_sell` puts
  in it what he buys and `shop_pile` sells it on, so goods pass through it
  from one player to another). `death_pile:` means a player's pile on the
  ground: its row when one is saved, the room's memory while it is up (a
  dropped item's pile is a death pile's own and is never saved,
  `itemdrop.js`).

### Four edges the words must cover, left for card E to rule on here

1. **A `set` road is judged by its difference.** `join_new` makes the start
   gold: a mint. `nml_loss` empties a purse into the killer's mail: a move.
   `join_stored` loads what storage held: nothing, but for the fraction of a
   coin step 2 of the gold door heals, which is a burn.
2. **The mail's roads have no class of their own.** `mail_gold` and
   `mail_item` are the one place every credit lands (`_applyCreditToPs`,
   `server/src/inbox.js`), so their class is the CREDIT's: a refund is an
   escrow coming back, a trade is a move, a prize is a mint. The review chose
   not to split the road: *its class comes from the credit's source, a closed
   table.* Today a credit's `source` has 15 values and is too coarse to carry
   one: `arena` is a refund, a pot, a stake's cut, a stake won and a stake
   lost. The finer closed list that exists is the first word of the worker's
   `opId` (`arenarefund:`, `arenapot:`, `arenastakewin:`). Card E says which
   of the two becomes the table's key.
3. **One class a row means a mixed payment is two.** The arena champion's
   prize is the entries held (an escrow paid on) plus the house's gold (a
   mint), paid today as one credit. It becomes two credits, or one row that
   carries two amounts: card E's choice, written here.
4. **Three changes to a bag are not roads at all today.** `bag.js` leaves out
   the whole-bag assigns on purpose: a new bag, the join's load, and the
   death's wipe. The death's wipe moves a whole bag to the ground
   (`death_pile:`), so the sum needs it classed.


#### Ruled (card E, tag 5081)

1. **A `set` road is judged by its difference**: the purse (or count) after,
   less what the world held for that character before the road ran: the live
   purse, or for a LOAD the stored record it loads (a character is counted
   once: stored while away, live while here). Its class is its honest
   difference's, and its counter books the difference signed. So
   `join_stored` is a `burn` (it heals a coin's fraction away; a negative
   purse healed to 0 books a negative burn), `join_new` a `mint`, `nml_loss`
   a `move` (the purse to the killer's mail, credit `nmlloot:`), the bag's
   `shop_tool` a `mint` (one tool, from none), `trap_legacy_out` a `burn`,
   and the Test panel's `dev_traps` and `dev_logs` `mint`s (signed: lowered,
   a negative mint).
   **Not ruled, asked (card E's status file):** a red skull killed by a
   MONSTER loses the purse through `nml_loss` too, to nobody: a burn by a
   `move` road. One road, two classes; splitting it is one line in
   `nomansland.js`, a file card E does not own.
2. **The mail's class is the credit's, keyed by the FIRST WORD OF ITS
   `opId`**, in the closed table `MAIL_CLASSES` (`gold.js`). Not `source`:
   its 15 values are too coarse (`arena` alone is an entry refunded, a pot,
   a stake's cut, a stake won and a stake lost). The first word is finer
   (every gold or goods credit under one word has one class: the auction
   house's eight legs are all its listing paid on or given back), it is a
   literal in every caller, and it is the credit's identity already: the
   same on a retry, written on the inbox entry with it. `mail_gold` and
   `mail_item` themselves are an `escrow` of `inbox:`: the mail paid on. A
   credit to a player away waits there (its class counted as it is parked),
   one to a player here lands at once (its class counted as it lands). 27
   words today; the door test fails a credit whose word has no row, and a
   row no credit uses. The operator's grant (`admin.js`) builds its opId a
   line above the call, `admin:` and a uuid, and is listed so.
3. **A mixed payment is ONE credit that carries two amounts**, not two
   credits: two credits are two writes a restart can split (handoff rule
   5), one credit keeps one opId and one stamp. The champion's prize
   (`arenapot:`) is the only one today: its row is an `escrow` of
   `arena_entry:` with `house` set, and the credit's `payload.house` is the
   part the house minted. The PR that counts the mail writes that field in
   `gladiator.js`.
4. **The whole-bag assigns are classed in `BAG_WHOLE`** (`bag.js`), each tied
   to its line by `bag-door.test`'s `WHOLE_BAG`: a new, empty bag and the
   join's load hold nothing the world did not (class `null`); a new
   character's first bag is empty since v2.3.3138 (were a starter kit put
   there, a `mint`); **the death's wipe is an `escrow` into `death_pile:`**
   (the bag, less the tools and the pickup shield it keeps, to the pile);
   and the RESPAWN's wipe, the same helper five seconds on, is a `burn`
   (whatever came into a dead player's bag after the death's wipe: nothing,
   for an honest death).

**Where value leaves an escrow by no road** (for the sum's PR, not a class):
a stale fine is deleted (`bounty:`, `_bountySweep`: "the gold evaporates"),
and a pile on the ground nobody takes runs out (`_tickLoot`) or its dungeon
run closes. Each is a burn the world's sum counts at the record's end.

### The mark on a record that holds value

Step 4.4: *the storage registry marks every record that holds value.* Step
4.7: *a player's restore is made from the registry: every record of theirs.*
One mark serves both.

| Name | Values | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|
| `value` (NEW column of the registry; built 5082) | `gold`, `goods`, `both`, `none` | card E | the world's sum; a guard that fails a value record nobody counts | `server/src/storagemarks.js` (below) | none |
| `whose` (NEW column of the registry; built 5082) | `player` (keyed by one character: restored with them), `between` (held between two or more: an escrow, a listing, a pot), `room` (the room's own: a board, the shop's pile, a flag) | card E | the restore and the paged export (card R, 4.7) | the same | none |

Today's registry is a table in `docs/ARCHITECTURE-HANDOFF.md` (rule 2), and
precheck's `storage-keys` check PARSES it: a new column there can break the
gate. Whether the marks become columns of that table or a table in code that
the document is checked against is card E's to decide and to write here.

**Ruled and built (card E, tag 5082): a table in code.** The marks are
`STORAGE_MARKS` in `server/src/storagemarks.js` (no imports), one row a
record, keyed by the registry's own spelling: a prefix up to its first `<`
(`rpg:` for `rpg:<playerId>`), or a single key whole (`shop_stock`,
`jackpot:draw`). The handoff's markdown table gets no new column. A gate is
a test GitHub runs, so `tools/guards/storage-marks.test.mjs` holds the two
together: it fails a record registered and not marked, a mark for a record
not registered, a value or a `whose` off its closed list, and an escrow's
place (`ESCROW_PLACES`, part 3 above) marked as holding nothing.

- **A copy of value is `none`**: a snapshot (`rpgsnap:`) and the provenance
  ledger's copy of a piece (`gear_prov:`) hold what another record holds,
  and counting them would count it twice.
- **The daily spin's open pot (`daily_rewards:`) is `none`**: a stake in a
  game still being played (double or nothing can end it), paid by
  `spinpot:` as a mint (`MAIL_CLASSES`).
- **14 records hold value** at tag 5082: `rpg:`, `bank:`, `inbox:`, `pets:`
  (a player's); `mkt_order:`, `store_listing:`, `duelEscrow:`,
  `arena_entry:`, `arena_stake:`, `bounty:`, `jackpot:draw`, `trade2wpn:`,
  `death_pile:` (between players); `shop_stock` (the room's). The guard
  holds the count, so a change to what the sum reads is seen.
- `marksOf(key)` finds a stored key's marks by its longest marked prefix:
  what the world's sum (4.4) and the restore (4.7) call.

## 4. The report's fields and sinks

Step 1.1, built by card A. One message, type `report`, from a phone to the
worker on the game's own socket. **Numbers and closed lists only.** A value
that is not a number in its range, or not a member of its list, is dropped by
the worker; nothing a phone wrote reaches a table a coding session reads.

`report` is free as a message type: no case in the router, not in
`PRIVILEGED_EVENTS`, not in `RELAY.TYPES`, and an older worker drops it at its
default branch, so either side can ship first. It is not the chat's abuse
report (`chat_report`, `chat_report:<id>`) and not the crash road
(`POST /api/feedback/crash`), and it shares no field and no sink with either.

### What each instrument measures today

So that each field below is defined by something that exists.

| The plan's words | Today | Where |
|---|---|---|
| frame times | A sample of every drawn frame, for every player: the time since the last drawn frame (`totalMs`) and the game's own parts of it (`simMs`, `tileMs`, `entityMs`, `effectsMs`, `fpsMs`, `appMs`). A ring of 600, in memory. | `src/game/renderFrame.js`, `src/debug/perfTracker.js` |
| late frames | **Five definitions.** The pacer's (a frame more than half a refresh late; counted only on a screen faster than about 70 a second), the strip's (over 1.5 times the middle frame of the last 600), `perfTracker`'s (over 30 ms, over 100 ms), the loop's own (over 20 ms), and the frame counter's dips (`?dev=1`). | `src/game/framePacer.js`, `src/debug/perfHud.js`, `src/debug/perfTracker.js`, `src/ui/BroTown.jsx` |
| the strip's split of a late frame | The game's own work (and under it sim, tile, entity, effects, pixi) against the rest. The rest splits into "the page was busy" and "waiting" only where the busy beat runs, and it runs only with `?perf=1`. | `src/debug/perfHud.js`, `src/debug/busyBeat.js` |
| the worst holds by name | `noteMade(name, ms)` keeps anything over 4 ms in a ring of 60, for every player. **The names are free strings** (a pose and a facing, a file's name, a message's type), and they are not the names the sweep or the debt list use. | `src/debug/madeLog.js`; `tools/qa/mp/mp-heldsweep.mjs` `FAMILIES`; `tools/qa/mp/held-budget.mjs` `KNOWN` |
| the game's own memory count | No single count. Three a page can read on an iPhone: art from files (`__btTex().mb`), pictures on the chip (`__btGpuTex().mb`), decoded sound (`BT_AUDIO.decodedMB().mb`). The heap, the raw buffers and the workers cannot be read by a page there. | `src/rendering/pixiApp.js`, `src/data/gameDisplay.js` |
| lost graphics | No count of losses. A count of renderers rebuilt (`window.__btGlRebuilds`), and the crash ring's entries. | `src/ui/BroTown.jsx`, `src/debug/crashTrap.js` |
| "the tab died last time" | Exists. A mark every 5 s while in the world (`bt-alive`), removed on a clean exit; the next load finds it and writes a SENTENCE into the crash ring (`killed`: on screen; `evicted`: in the background). The numbers in the mark are not kept. | `src/debug/crashTrap.js` `markAlive`, `_checkLastAlive` |
| the line's delay | Measured by the WORKER, not the phone: `session.rtt`, a smoothed round trip from its own ping, 0 to 300 ms, memory only. | `server/src/index.js` `case 'pong'` |
| how much it wavers | Measured nowhere. | |
| the build | The page knows its own (`__GAME_VERSION__`, the newest `v2.3.N` in its commits; `__BUILD_COMMIT__`). The join carries neither: the worker learns a build only from a crash report. | `vite.config.js`, `src/ui/BuildBadge.jsx` |
| the switches thrown | No one reader and no list: about 186 address names read in 132 files. One closed list exists: the 14 memory savers the owner can turn off from the Test panel. | `src/game/clientOff.js` `CLIENT_SAVERS` |
| the zone | `S.currentZone`, and inside the world the land by direction (`wheelLandAt`). | `src/data/zones.js` |
| how many players were near | Nothing that works: the sample's `others` reads the length of a map and is always 0. | `src/game/renderFrame.js` |

### The fields

A report covers the seconds since the last one. `v` is 1.

| Field | What it is | Type or closed list | Sink |
|---|---|---|---|
| `v` | The report's shape number. A sink keeps it beside what it adds, so a new shape never adds into an old one's bins. | whole number | both |
| `devClass` | The device class. | part 6's fields | smoothness (the cell); its `soft` also to the card |
| `drawLane` | The lane the page draws in. | card O's closed list (step 2.1); until lanes exist, the one value `full` | smoothness (the cell) |
| `sw` | The switches thrown. | ids from ONE closed list: `CLIENT_SAVERS` today, the switch table's ids once step 7.1 has made it. Never a name read off the address bar. | smoothness (the cell: `none`, the one id, or `many`: rule 4's two configurations, and the rest apart) |
| `build` | The page's build. | whole number: the N of its `v2.3.N` | smoothness (the cell); the card |
| `secs` | Seconds this report covers. | whole number | both |
| `seen` | Of those, seconds the page was visible. | whole number, at most `secs` | the card |
| `drawn` | Frames drawn in those seconds. | whole number | the card (against the moves the worker counted itself) |
| `gaps` | The time between drawn frames, as counts in fixed bins. | 10 whole numbers; the bins' edges are 10, 12.5, 15, 18.5, 24, 29, 42, 75 and 150 ms | smoothness |
| `late` | Late frames by the ONE definition: the pacer's. | 2 whole numbers, late and judged. **Absent** where the pacer gives no verdict, which today is every screen at 60 a second or slower. Never the strip's count or `perfTracker`'s under this name. | smoothness |
| `split` | Where the late frames' time went, each part summed. | whole ms, in this order: `sim`, `tile`, `entity`, `effects`, `fps`, `app`, `outside`. Where the busy beat runs, `busy` and `wait` in place of `outside`. | smoothness |
| `holds` | The worst holds. | at most 5 of `[name, ms, where, near]`: `name` from the one list of hold names (step 1.0, part 7), `ms` whole, `where` and `near` as below | smoothness |
| `where` | Where the player was for most of those seconds. | `town`, `farm`, `dungeon`, `commons`, `frost`, `ember`, `sky`, `hollows`, `thunder`, `tidal`, `mist`, `verdant`, `other` | smoothness |
| `near` | The most other players drawn at once in those seconds. | whole number | smoothness |
| `mem` | The game's own memory count. | 3 whole MB: `tex`, `gpu`, `snd` | smoothness |
| `lost` | Graphics lost in those seconds. | 2 whole numbers: contexts lost, renderers rebuilt | smoothness |
| `died` | The tab died last time. Sent once, in the first report after a join. | `no`, `killed`, `evicted`; then the dead page's last mark as 3 whole numbers (MB of art, minutes up, renderers rebuilt) and its `where` | smoothness |
| `self` | Drawing programs that failed their self-test (step 1.7). | names from the closed list of the game's own drawing programs (card O's) | smoothness |
| `speed` | The Speed test's card (step 1.2). Only after a player runs it. | rows of `[step, fps, p50, p95, work]`: `step` from the test's own list (`all`, `noshadow`, `noshine`, `shinepass`, `threeprog`, `shadowpass`, `still`, `res2`, `bare`), the rest whole numbers; and `model`, a place in a list the player picks from (card A's list: a page cannot read its model) | the day's book, part `speed` |

Three numbers the plan lists in the report are **the worker's own, and a
phone is not asked for them** (pillar 4: the server believes nothing it cannot
bound):

| Field | What it is | Writer | Sink |
|---|---|---|---|
| `delay` | The line's round trip, in whole ms. | the worker, from `session.rtt`, as the report arrives | smoothness |
| `waver` | How much the round trip wavers: the mean distance of the worker's own samples from their smoothed value, in whole ms. NEW: nothing computes it. | the worker, `case 'pong'` | smoothness |
| `moves` | Moves this sitting sent in those seconds. | the worker's own count | the card (against `drawn`) |

Why the bins are fixed, and these: fixed bins can be added across phones and
days, and a percentile cannot. Each bin holds one rate a frame can come at:
120 a second or faster, 90, 72, 60, 45 to 48, 40, 30, 20, 10, and a freeze.
Those are the rates the pacer draws at on screens of 60, 90, 120 and 144 a
second (every refresh, every second, every third). Each edge sits between the
whole-ms readings of two rates, because Safari's clock ticks in whole ms: a
60-a-second frame reads 16 or 17 there, and neither is an edge.

### The two sinks

| Name | What it holds | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|
| smoothness (NEW) | The day's bins by cell. A cell is a device class, a lane, a switch state and a build. **It loses its player**: no `pid`, no `stint`, no address reaches it. | the `report` handler (card A) | the reader and the device table (step 1.3); the owner's card (10.4) | the day's book, part `dev` (part 7) | rides the day's book |
| the sitting's card (part 7) | A few integrity facts of one sitting: `soft`, `build`, `seen`, `drawn` against `moves`. | the `report` handler, through the card's one writer | card Q's signals | part 7 | rides the card |

A cell prints how many reports it holds, and the reader shows it blank under
20 (step 1.3).

What card A owns and this page does not name: the kill switch (a live flag,
lower case), the cap the phone gates on (on a line of its own in the join's
`caps`), how often a phone may send one, the About panel's row, and how many
days a book is kept. `metrics:` keeps 30 days and `accday:` 60 today.

## 5. The wire's columns

Steps 4.1 and 11.1. Card C reads every message and every route once and fills
these columns as a document (`docs/plan/census/wire.md`). Card N makes that
the one table in code (`server/src/wire/`). Card K then makes today's lists
FROM the table.

### What a row is

One row for each of:

- a message a phone sends that the worker takes: a case of the router (139
  today) or a relay (26);
- a message the worker sends (163 in `PRIVILEGED_EVENTS`, and the 9 relay
  types the worker also sends itself);
- an HTTP route.

Seven names are both a case of the router and a message the worker sends
(`whisper`, `party_chat`, `friend_dm` and four more), so a row's key is its
name AND its direction.

### The columns that need the handler read

Filled in the one reading. The first twelve are the plan's; the last is added
by this page.

| Column | In one sentence | Values |
|---|---|---|
| `name` | The message's type, or for a route `http:` and its path, as `FIGHT_LOCK` already writes its six (`http:/api/store/buy`); a path that answers more than one method is a row a method, the method after a space. | |
| `dir` | Which way it travels. | `in` (phone to worker), `out` (worker to phone), `relay` (phone to phones, through the worker: one row for both ways) |
| `at` | The file and function that handle it: the worker's for an `in` row; for an `out` row the function that sends it and the phone's switch that takes it. | |
| `wayIn` | Where it comes in: the actor's own list (part 1). | `socket`, `http`, `admin`; `room` for an `out` row the worker starts by itself |
| `envelope` | How it is wrapped as it travels. | below |
| `phase` | The sender's phase: the states the handler demands of the sender before it acts. | below |
| `mayStart` | Who may start it. | below |
| `doesWhat` | What it does: every word that applies. | below |
| `reqId` | What makes a repeat act once. | the field's name today (`opId`, `k`, `hitSeq`); `state` (a repeat finds the thing done or gone); `none` (a repeat acts twice); `harmless` (a repeat changes nothing: a read, a set to the same value) |
| `trust` | For each field of its body, how far the worker believes it. | below |
| `absent` | What a missing field or a missing body means to the handler. | a default, an older phone, or a refusal: in words |
| `bad` | What a wrong value gets. | `clamped`; `dropped` (nothing is said: with its code from the closed list that exists, `CODES` in `server/test/refusal-door-list.mjs`); `refused` (an answer says so); `taken` (used as sent) |
| `answer` (added) | The message that tells the sender what happened. | a type; `player_state` (the worker's echo); `none` |

**`envelope`**, a closed list for each direction:

| Value | Means |
|---|---|
| `alone` | In. A frame of its own, and never a part of a bundle. Today only `join`. |
| `frame` | In. A frame of its own, or one part of a bundle: a JSON array of at most 24 messages, each taken in order as if it had come alone (`server/src/bundle.js`). |
| `relay` | In and out. It has no case in the router: the default branch takes it if its type is in `RELAY.TYPES`, rebuilds it in the sender's name (`server/src/relay.js`), and sends it on as an event. |
| `direct` | Out. A frame to one socket. |
| `group` | Out. A frame each to a named few: a party, the two sides of a trade or a duel. |
| `room` | Out. A frame to every socket in the room, now (`broadcastAll`, `broadcastExcept`). |
| `event` | Out. It rides the next tick's events: to the room, or by place for the types in `ROOM_PLACED` and `RELAY_PLACED` (`server/src/eventplace.js`). |
| `tick` | Out. A section of the tick message itself. |
| `close` | Out. A close code and no message (4003 to 4018). |
| `http` | A request and its answer. |

**`phase`**: each demand is written as one of the state machines of step
5.3b's phase table and the state it must be in. `none checked` when the
handler acts whatever the sender's state.

| Has one field and one function that changes it today | Its states |
|---|---|
| `session` (`session.phase`, `server/src/leave.js`) | `open`, `joined` |
| `life` (`ps.life`, `server/src/life.js`) | `alive`, `dying` |
| `zone` | a named zone, the safe ground, No man's land, a dungeon |

Not one field yet, so written by name and marked `implicit`: `fight` (a fight
with a player), `duel`, `trade`, `party` (and its `leader`), `ride`,
`harvest`, `cook`, `guard`, `pose`, `race`, `arena`, `fishing`.

v2.3.5202: every machine, these and the plan's (`dungeon`, `connection`,
`loading`, `window`, `monster`), is a row of step 5.3b's phase table,
`src/state/phases.js` (card L; `docs/specs/phase-table.md`): its field, its
states, its one function, `door` or `todo`. A name a row of the wire table
writes here is a row there (`tools/guards/phase-table.test.mjs` §4). An
`implicit` machine leaves this list when its row turns `door`.

What a handler tests that is NOT the sender's phase goes in another column:
"can pay" and "well-formed" in `bad`, "too soon" in `pace`, "the system is on"
in `flag`, "seen before" in `reqId`.

**`mayStart`**:

| Value | Means |
|---|---|
| `never-helper` | A person, and never a helper: combat, movement, gathering, chat, trades, wagers, the account itself (step 11.1's list). |
| `helper` | A person, or a helper whose permit names it. Only where pillar 11 names the errand: the market, the bank, payments, and reading the player's own things. |
| `person` | A person starts it today, and nobody has ruled on a helper. When unsure between this and `helper`, write this one. |
| `owner` | Only the admin key. |
| `system` | The worker starts it. No phone can. |
| `anyone` (added) | Nobody is known: a public read. The plan's five words have no place for `/api/lobby` or the boards. |

**`doesWhat`**:

| Value | Means |
|---|---|
| `reads` | It answers from what is there and changes nothing. |
| `own` | It changes only the sender's own state, and nothing of value leaves them. |
| `value-out` | Gold or goods leave the sender's holding: to another player, to an escrow, or to nothing. |
| `final` | Nothing the sender can send afterwards puts it back. |
| `speaks` | It carries words or a drawing a player made to other players. |
| `plays` | It is play itself: a hit, a step, a harvest, a pose. |
| `others` (added) | It changes another player's state without speaking, playing or moving value: a kick from a party, a mute, a block. The plan's six words have no place for it. |

**`trust`**, one for each field:

| Value | Means |
|---|---|
| `request` | The worker judges it against its own state and may refuse: a place in a list, an amount, a target. |
| `look` | It is shown to others and decides nothing. |
| `claim` | The worker believes it as sent. Nothing checks it. |
| `bounded` | Believed inside a bound, with the name of its judge (`MOVE_BUDGET`, `PVE_MELEE_RANGE`). Step 4.2 adds its gain (part 7). |
| `words` | Text or a drawing a player wrote. It never sits inside a sentence the game speaks (step 11.4). |

### The columns a machine fills, from lists that exist

No reading: each is a list in the code today. It becomes a column so that the
list can be made from the table and a guard can fail a second copy of it.

| Column | Today's list | Where |
|---|---|---|
| `privileged` | `PRIVILEGED_EVENTS` (163), and the 9 relay types the worker also sends (`RELAY_ECHO_ALLOWLIST`) | `server/src/index.js`; `server/test/wire-audit.test.mjs` |
| `relayed` | `RELAY.TYPES` (26), and what the default branch does on the way: a clean of its words (`chat`, `emote`), a settlement (the trade's, the duel's, the threat's, the clan invite's), a stamp (`player_projectile`) | `server/src/relay.js`, `server/src/index.js` |
| `body` | Where its fields sit. In: the top level (6 types), `payload`, `data` (`track`), or no body (16). Out: `payload`, or flat (about 20). | each handler |
| `fight` | `FIGHT_LOCK` (38 rows, 6 of them routes: its switch) or `FIGHT_OPEN` (133: its reason) | `server/src/fightlock.js` |
| `rideEnds` | `RIDE_ENDS_ON` (13) | `server/src/ride.js` |
| `idle` | What stamps the idle clock: every type but `pong` (never), `track` (only when its `aw` is 0) and `move` (only when something changed). A rule written in line, in no list. | `server/src/index.js` `_onMessage` |
| `pace` | The allowance it spends beside the socket's own: a `PACE` lane (6, and `reveal` beside them), the social allowance (`SOCIAL.TYPES`, 2), the relay bucket, or a gap of its handler's own | `server/src/flood.js`, `server/src/chatguard.js` |
| `placed` | `ROOM_PLACED` (10) and `RELAY_PLACED` (8): sent by place, not to the room | `server/src/eventplace.js` |
| `muted` | `MUTABLE_RELAY_TYPES` (3) on the worker; `BLOCKED_SOCIAL` (14) on the phone, with the field that names the sender | `server/src/chatmod.js`; `src/game/blockedAsks.js` |
| `watch` | The anti-bot hook that counts it (6 types) | `server/src/index.js`, `server/src/botsig.js` |
| `cap` | The cap the phone gates it on (`CAP_GATES`, 167 names) | `server/src/join.js` `caps`; `src/ui/panels/DevPanel.jsx` |
| `flag` | The live flag that turns it off. **No list of flag names exists**: any name is stored, and about 120 `_xxxOff()` functions each read their own. The switch table (step 7.1) makes the list. | `server/src/liveops.js` |
| `roads` | The gold, bag and health roads its handler names (the `at` of each road's row) | `server/src/gold.js`, `bag.js`, `life.js` |
| `silent` | Its handler's silent exits, by code (`ALLOW`: 96 handlers, 270 exits, 19 codes) | `server/test/refusal-door-list.mjs` |
| `phoneSend` | How the phone sends it: a send of its own (`join`, `pong`, `track`, `move`), the shim's pass-through (93 types: an allowlist), a priority event (31), the 33 ms batch; a rider (3); held for the rejoin (`node_strike`); expects an answer (`SETTLED_SENDS`, 9) | `src/networking/wsClient.js` |
| `phoneCase` | Where the phone takes it: the direct switch (87 cases) or `processGameEvent` (106) | `src/networking/wsClient.js`, `gameEvents.js` |
| `rejoin` | Sent again at a join: the join's own train of about 13 messages, and the two re-sends of `REJOIN.COUNT` | `server/src/join.js`, `server/src/rejoinresend.js` |
| `pv` | The protocol version it belongs to: both, v1 only (`zone_monsters`, `zone_nodes`, `zone_loot`), v2 only (`zone_state`) | `server/src/movement.js` |

### The table itself

| Name | One writer | Readers | Where | Rows |
|---|---|---|---|---|
| the wire census (NEW) | card C, once, as a document | card N | `docs/plan/census/wire.md` | none |
| the wire table (NEW) | card N: one row a message or route, in code | the door tests; the lists made from it (card K); the action door (5.8); the send door (4.1b) | `server/src/wire/` (the folder does not exist yet) | none |

Three things no list holds today, for cards N and K:

- **No test lists the HTTP routes.** The only list with a route in it is
  `FIGHT_LOCK`'s six, and its own test skips them. The socket's message
  budget applies to no route.
- **No test holds which of the phone's two switches takes a type.**
- **There is no single send**: 132 places write to a socket, through about 36
  helpers of the systems' own.

## 6. The device class

Step 2.1, built by card O. **Facts only**: what the device can do, read from
the device. Never a system's or a browser's name, never the chip's name, never
a model, and never a timed bake or a timed program build (a cold phone behind
the loading screen always answers "fast", and timing the look palette's build
is the freeze a Windows laptop met).

### What decides by device today

| What | Reads | A fact or a name |
|---|---|---|
| mouse or touch; a computer's window | `(pointer:fine)`, and the window's width | fact (`src/game/deviceProfile.js`) |
| the "add to home screen" hint | the user agent: iPhone, iPad | name (`onIOS`; no drawing reads it) |
| **the look palette, on or off** | the user agent: Windows, Macintosh | **name** (`src/game/lookPaletteChoice.js`: off on both) |
| **one drawing program or three** | the same two names; and the chip's name against a list of software renderers | **name**, and one fact (`src/rendering/paletteTex.js` `oneBatchChoice`, `SOFTWARE_GL`) |
| the colour numbers, the look palette, one program, moving water | WebGL 2 or not; whether the program built | fact |
| how many bake workers | the processor's threads | fact (`src/rendering/bodyBake.js`) |
| the crowd's shared picture's size | the largest picture the chip takes | fact (`src/rendering/peerImpostor.js`) |
| the screen's rate | the gaps between animation frames | fact (`src/game/framePacer.js` `refreshOf`) |

There is no test for Android, Safari, Firefox or Chrome anywhere in `src/`.
The two rows in bold are the whole of "a name decides a quality choice".

`deviceProfile()` returns `{ input, computerFrame, ios, windows, mac, palette,
dpr }` today: no fact about the chip, no rate, no cores, nothing timed.

### The fields

| Field | The fact | Values | Read today? |
|---|---|---|---|
| `gl` | The WebGL the page got. | `1`, `2` | yes, in three files, each for itself |
| `soft` | The page draws in software. | `0`, `1` | yes, for one decision (`SOFTWARE_GL`) |
| `maxTex` | The largest picture side the chip takes. | `2048`, `4096`, `8192`, `16384` (the power of two at or under it) | yes, in two files |
| `prec` | The bits a drawing program keeps at middle precision. | `16`, `32` | **no**: nothing asks the chip. The body that vanished on four facings was this fact, and it was met by writing `highp` into the programs. |
| `units` | The pictures one batch can hold. | `8`, `16`, `32` (at or under) | yes, by three batchers (Pixi's own limit) |
| `mp` | The pixels the screen asks for: its size times its device ratio, before any budget lowers it. | megapixels: `1`, `2`, `3`, `4`, `6`, `9`, `12` (the first at or over) | the parts are (`src/game/renderRes.js`) |
| `dpr` | Device pixels to a CSS pixel. | `1`, `1.5`, `2`, `3`, `4` (the nearest) | yes |
| `hz` | The screen's rate. | `30`, `60`, `90`, `120`, `144`, `other` | yes: the pacer's `read().hz`, the same meaning |
| `fill` | A coarse timed fill of the screen. | `fast`, `mid`, `slow`, `none` (not run) | **no**: no timing of any kind runs at the start today |
| `input` | Mouse or touch. | `mouse`, `touch` | yes |
| `frame` | A computer's window. | `0`, `1` | yes (`computerFrame`) |
| `cores` | The processor threads the browser tells. | `2`, `4`, `8`, `16` (at or under) | yes, once |

Every value is one of a short list, so the class has a **key**: its values in
the order above, joined. That key is a smoothness cell's first part, and it
is why a class is coarse: a finer one makes cells that never reach 20
reports.

| Name | One writer | Readers | Where | Rows |
|---|---|---|---|---|
| `devClass` (NEW) | `src/game/deviceProfile.js`, grown: the one file allowed to ask the device a question (`server/test/device-profile.test.mjs`) | the lane's choice (card O), the report (card A), the Speed test's card | the phone's memory | none |
| `drawLane` (NEW) | card O (step 2.1): one function that reads `devClass` and picks a row of knobs | every knob; the report; every phone test, which names its lane | card O's | none |

Not in the class, and not to be added:

- `ios`, `windows`, `mac` and the user agent (names);
- the chip's name (hidden on an iPhone, and free text);
- the model (a page cannot read it; the Speed test asks the player);
- how long a program took to build, or a bake took;
- the heap's size (a page cannot read it on an iPhone).

`device` on the wire already means the login's device id (`join.device`, the
refusal `device`). The class is never sent under that name.

## 7. The other shapes pillars 1, 4, 10 and 11 name

One row each. A shape marked NEXT or LATER in the plan is NAMED here so
nothing else takes its name or builds its twin; **its fields are added to its
row by the card that builds it, before it builds.**

### Records and feeds

| Shape (step) | Name | What it holds | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|---|
| The hold names (1.0) | one list (NEW as one list) | The names a hold may have. Today there are three lists that do not agree: the debt list's 13 (`KNOWN`), the sweep's 20 families (`FAMILIES`), and `noteMade`'s free strings (`'strip made'` on the phone is `strip-made` in the sweep). | `tools/qa/mp/held-budget.mjs` (card H's file; step 1.0 is card A's, with H for the names) | `noteMade` (`src/debug/madeLog.js`), `mp-heldsweep`, the report's `holds` | that file | none |
| The room's own row (1.6) | part `room` of the day's book (NEW) | The tick's 95th, rows written, saves refused, joins by protocol version, restarts; with 4.1b, bytes and messages sent by type; with 4.7, the storage's size. **None of these is counted today**: the room never counts its own puts, a save a newer worker refuses is only logged, a failed put is swallowed, and nothing marks a restart. | card A (1.6); `_send` adds its counts (card K, 4.1b) | the owner's card; the reader | `server/src/`, a file of card A's | rides the day's book |
| The day's book (10.4) | `daybook:<yyyymmdd>` (NEW) | One record a UTC day, in parts: `econ` (minted and burned by road class), `room` (above), `dev` (the smoothness cells, part 4), `speed` (the Speed test's rows). | each part's own writer: card E `econ`, card A `room`, `dev` and `speed` | the owner's card in the Test panel; the reader of step 1.3; the restore's check | `server/src/`, a file of card E's | at most one put a pace while the room is awake (card E's number, with a line in `cost-guard.test.mjs`); see "Open" below for `econ` |
| The device table (1.3) | no name in the room | The day's books' `dev` and `speed` parts, added over days, a cell blank under 20 reports. | the reader: a workflow, which is the owner's call 6 | every perf PR | the repository, once a road into it exists | none in the room |
| The sitting's card (10.2) | the card of a `stint` (NEW) | About 120 bytes: when (the `stint`), how long, active seconds, the longest gap, the network (`asn`), the build; moves and moves over budget; hits claimed, landed, refused by reason; gold by road class; the hours of the day played; and the report's `soft`, `seen`, `drawn`. The last 32 of a character are kept (call 13). | one function of card Q's. Card A's handler hands it facts and writes no field itself. **Until card Q has built it, the report's card facts are dropped**: they still ride the message, so the phone's side is built once. | card Q's signals; the owner's cases | "Open" below | none new: it rides a save that is already paced |
| The transfer ledger (10.3) | `xfer:` (NEW) | One lasting row each time value settles between two players: when, the road, from, to, gold, goods and their ids, the price, and the actor that started it. Kept 90 days. | the settlement's own write (card E): the row goes out in the same run as the payment and its stamp (handoff rule 5) | the owner's cases ("unwind this transfer"); card Q | `server/src/`, card E's; its key begins with the day, so old days are pruned a page a tick slot (handoff rule 9) | 1 a settlement, none a kill (`cost-guard`) |
| A trace (10.8) | `play_trace:` (NEW) | A recording of play with a label from a closed list. The one label for now is `human`: the first ten active minutes of a sitting of the owner's, with the owner's yes. | card Q | card Q's league (10.7) | card Q's | 1 a sitting recorded |
| A flag's evidence (10.9) | on the flag itself | The detector's version, the hidden settings' date (`hidden_settings.at`), and the numbers it fired on: enough to explain the flag from its record alone. | `server/src/botsig.js`, `botfp.js` (card Q) | the owner's cases | inside `botstat:<pid>` (TODAY's record) | rides `botstat:` |
| A case (10.9) | not named yet | The owner's act on one account: a hold on its transfers, a take, an unwind, the mail with the reason; undone in one tap. | card Q, through an admin route | the owner | a prefix card Q registers | 1 a case |
| A helper's permit (11.2, 11.7) | `permit:` (NEW) | Whose it is (`principal`, or the character until there is one), its scopes from a closed list (`read`, `list`, `buy`), a gold limit a day, an end date, a mark other players can see. Taken back by deleting the row. **Never a row among the login keys** (`auth:<pid>.keys`): an older worker would honour it as a full login. | the helper door (step 11.7); nothing before it | the actor | a prefix of its own | 1 a permit |

### Lists and tables

| Shape (step) | Name | What it is | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|---|
| A bounded claim's gain (4.2) | `liarGain` (NEW) | For one bounded claim: what a liar who pushes it to its bound takes in an hour, over what an honest player takes. A number; the line is 1.5. | the house bot written for that claim (card K) | `npm test` | beside the claim's judge, in the wire table's `trust` | none |
| The world's sum (4.4) | a suite, not a record | Part 3's sum, played. | card E | the required check | `server/test/` | none |
| The known losses of a restart (4.5) | `KNOWN` (TODAY) | The cases the restart test finds red today, each with its reason. The line is empty. | card E | the required check | `server/test/chaos-restart.test.mjs` | none |
| The test room (4.5) | not named yet | One room for tests: a batch that commits or does not, a queue that knows the room's gates, a seeded clock. Today each suite carries its own storage mock (handoff rule 24). | card E | every suite that plays the room | `server/test/`, a helper | none |
| The disturbances (4.5, 10.6, 10.7, 1.5) | one closed list (NEW) | What changes how an honest player looks without any cheating: a deploy (at any message), a hidden tab, the frame rate (60, 30, 20 and 4 a second), the line (its delay and its loss), and each `drawLane`. **Four steps name this list in four ways; it is one list.** Step 1.5's two slow profiles are two named members of it. | card E, with the test room | the storm of 4.5; each signal's honest troubles (10.6); the league's replays (10.7); the sweeps under a slow profile (1.5) | `server/test/`, beside the test room | none |
| The doors of 4.3 | a table a door, as `GOLD_ROADS` | Experience and levels, the stashes, quest state, skill points. | card R | their own tests | a file a door | none |
| The roads between players (10.5) | three columns, not a table | For each way value passes from one player to another: its `fee`, its `hold`, its `pace`, all nothing today, and whether it writes an `xfer:` row. Its rows are the `move` rows card E classes (part 3): the same key, so no second list of roads. | card R, on card E's table | a guard that fails a `move` row without them | with the classes | none |
| A signal's honest troubles (10.6) | a column of the signals' list | For each anti-bot signal (`SIG_REASONS`, 8 today, and the fingerprint's flags), the disturbances that move it. | card Q | card Q's scoring | `server/src/botsig.js` | none |
| The league's rungs (10.7) | one closed list (NEW) | The house's own bots, each harder: a script on the wire; one with noise; the real page driven by a script; a person's recorded play replayed; a model driving the browser. | card Q | `npm test` | `tools/qa/` | none |
| A report's reason (10.9) | `REPORT_REASONS` (TODAY) | `spam`, `abuse`, `harassment`, `cheating`, `other`. Step 10.9 adds `scam`. | `server/src/chatmod.js` | the Test panel's reports | that file | none |
| A block (10.9) | not named yet | Today a block is the PHONE's (`BLOCKED_SOCIAL`, `src/game/blockedAsks.js`: 14 types dropped on arrival) and only a chat mute is the worker's (`chat_mute:<pid>`). Step 10.9 asks for one the server keeps. | card Q | the fan-out | beside `chat_mute:` | 1 a change, paced as the mute is |
| A spoken line (11.4) | not named yet | A message the game speaks that carries a player's words: a template's id and its parts, a part that is a player's words marked as one. Today the worker builds the sentence itself (`server/src/store.js`: `label + ' sold to ' + buyerName + ' for ' + price`). The templates are step 8.8's table of every word a player reads. | card K | the phone; another player's assistant | the wire table's `trust: words` rows | none |
| The public facts (11.6) | not named yet | The game's facts in players' words, made in the build from the shared tables, with a version. | the build | assistants | the build's output | none |
| The pass's quote and receipt (11.8) | not named yet | A signed quote, a receipt, a public way to check. | the pass's own build | a helper | `docs/SUPPORTER-PASS-PLAN.md` | not built |
| The phase table (5.3b; v2.3.5202) | `PHASES`, `NOT_A_MACHINE` (NEW) | One row a state machine a side: its one field, its states, its one transition function, what clears it, what a rejoin re-sends, `door` or `todo`. A page row names the state ledger's rows and never copies their writers. | card L, by hand (a row turns `door` in its machine's PR) | `tools/guards/phase-table.test.mjs`; part 5's `phase` column; the next door's card | `src/state/phases.js` | none |

### The asset door (step 9.1, card P; tag 5241)

Two shapes of the asset door (`docs/specs/asset-door.md`), each written by
one tool and read by the gate. Neither is on the wire or in storage: they are
files in the repository, and cost no rows.

| Shape (step) | Name | What it holds | One writer | Readers | Where | Rows |
|---|---|---|---|---|---|---|
| The family table (9.1) | `ASSET_FAMILIES` (NEW) | One row a family of files under `public/`: its path pattern (never a folder), its kind (`supplied`, `made`, `data`: closed, `ASSET_KINDS`), its tool and sources when made, its draw path (closed, `ASSET_DRAWS`), its bundle of colours, its pixel-size rule, its bar. With it, `ASSET_REACH`: which files are in reach. Data: no I/O, no imports. | a person, by hand, in `tools/assets/families.mjs` | `tools/assets/shipped.mjs`; `tools/assets/fightmb.mjs` (9.1, part two); `tools/assets/finish.mjs` (9.2); `tools/guards/asset-door.test.mjs` (9.3) | `tools/assets/families.mjs` | none |
| The record of what ships (9.1) | `tools/assets/shipped.json` (NEW) | One row a file in reach: `path`, `bytes`, `sha256`, `family`, `kind`; a file the door made adds `door` (its sources' hashes, its recipe, the tool's tag). The head: the totals made from the rows, and the count of `unsorted` (a census: it only falls). | `node tools/assets/shipped.mjs --write` (never by hand); `finish.mjs` writes a made file's row | the gate (9.3); the census `docs/plan/census/assets.md` | `tools/assets/shipped.json` | none |

### Open, to be ruled before the card that meets it builds (ruled below, 5083)

**Where a per-player count that the sums read is kept.** Two rules meet:

- rule 5 of the plan: *what the sums read is written with what it counts, in
  the same put*;
- rule 1 of the server's law: *never add a field to the rpg blob*
  (`rpg:<pid>`, the one record that IS written with a player's gold).

The sitting's card ("gold by road class") and the day's book's `econ` part
both count what the purse's own put writes. There are two ways, and each has a
cost:

| Way | Cost |
|---|---|
| A second named exception to rule 1 (the first is `_v`): one field on the rpg blob for the open sitting's card and the running minted and burned. | Nothing in rows. Rule 1 is bent a second time; the field must be in `_saveRpg`'s fixed list and in the migrations' registry. |
| A sibling record written in the same run as every `rpg:` put. | One more row for every save of a player: `cost-guard`'s line for a kill goes from 1 row to 2. |

`botstat:<pid>` is paced at five minutes and is not written with the purse,
so it can hold the card's other counters and cannot hold anything the sums
read. This page does not choose. Card E meets it first (step 10.4's `econ`),
then card Q (10.2).

**Ruled (the planning session, for the owner, who asked that server costs
not go up; built by card E, tag 5083): the first way.** One field on the
`rpg:` record, `_econ`, the second named exception to rule 1 beside `_v`: no
new row. It holds the character's running minted and burned:

```
_econ: { v: 1, g: { m, b }, i: { <bag key>: { m, b } } }
```

`g` the gold, `i` each bag key by itself (part 3, "What is summed"); `m`
minted, `b` burned, whole numbers, signed (a `set` road books its difference
signed, part 3's edge 1). `move` and `escrow` roads change no world total
and are not kept. Its one writer is the two doors (`gold.js`, `bag.js`, card
E's next PR), through the purse's own put; `_saveRpg` writes it from its
fixed list (`econClean`: known keys, finite numbers, at most 512 bag keys,
a newer `v` kept whole); the `econ-field` migration (schema 21) gives every
record one, so a worker rolled back past it refuses the record at the join
rather than saving it without its counts. **The sitting's card (10.2) goes
inside `_econ`, under a key of its own**: there is no third exception, and
`migrations.test` §econ fails one.

## 8. Names: what is taken, and what was chosen

Checked at `main` 2d4138e with a whole-word search of the code:
`grep -rwn --include=*.js --include=*.jsx --include=*.mjs NAME server/src src
server/test tools public/tools`.

### Taken: what each already means

| Name | What it means today | Where |
|---|---|---|
| `acct` | The DEVICE (or the character, when a phone sends no device) that the daily spin counts as one account: `d:<device>` or `p:<pid>`. Also `_acctIp`, the login door's limit by address. | `server/src/loginspin.js` `_loginSpinAcct`; `server/src/account.js` |
| `account` | Never a field or a key. In words it means one character's login (`/api/account/*`), or the device, or the line a player reads ("This account connected from another window"). "The account check" is the human check (Turnstile). | `server/src/account.js`, `verify.js`; `src/networking/wsClient.js` |
| `acc:` | A character's accuracy record. | `server/src/accuracy.js` |
| `sess` | A sparring clone's made-up session; elsewhere a local for a live one. | `server/src/spar.js` |
| `session` | The socket's object. Also a trade window. `_sessionById(sessionId)` takes a PLAYER's id. | `server/src/index.js`, `trade2.js` |
| `sid` | Four things: a local for the player's id, a trade window's id in `trade2wpn:`, a status's id, and the crash road's id for one page load. | `server/src/trade2.js`, `feedback.js`; `src/debug/crashTrap.js` |
| `sitting`, `visit` | Words only; `sit` is a pose; players read "this visit" in the Wheel Hall. | `server/src/poses.js`; `src/ui/panels/buildings/WheelHallPanel.jsx` |
| `inbox` | The game's mail: `inbox:<pid>`, `inbox_delivered`. | `server/src/inbox.js` |
| `grant` | The owner's gift route (`POST /api/admin/grant`, `op: 'grant'` in `admin_log`), the anti-bot's verdict on a harvest (`grant: true`), an achievement given; `capegrant:` is a storage prefix. | `server/src/admin.js`, `botfp.js`, `achievements.js`, `eventcapes.js` |
| `scope` | The daily rewards' key part (`cadence:<scope>:<subject>`), and a stat's `scope`. | `server/src/cadence.js`, `prog3.js` |
| `lane` | A chat lane, a trade lane, a skill lane, a PvP hit lane, a `PACE` lane. Never a device's. | `server/src/chatlanes.js`, `flood.js`, `combat.js`; `src/ui/panels/TradeWindowPanel.jsx` |
| `rung`, `ladder`, `tier`, `quality`, `profile` | Guild and armour rungs; the hit ladder; a gear tier; an item's grade (on the wire and in saves); a player's profile card. Never a device's. | `server/src/guilds.js`, `data.js`; `src/data/lifeSkills.js` |
| `device` | The login's device id on the wire (`join.device`), the refusal `device`, `bt_device`. | `server/src/devicelock.js`, `join.js` |
| `opId` | The worker's id for one leg of a payment; and, in five message types, an id a phone makes (part 2). | `server/src/inbox.js` |
| `op` | The verb inside a message (`farm_act {op}`, `amulet_forge_request {op}`), and `admin_log`'s `op`. | `server/src/farm.js`, `amulet.js`, `admin.js` |
| `rid` | A local: the id of a player who shares a kill. | `server/src/combat.js` |
| `kind` | The sort of almost anything: a credit, an ability, a pet, a gear piece. | everywhere |
| `via` | Which Login Key a join came in with (a local, dropped); a bot flag's detail. | `server/src/join.js`, `botfp.js` |
| `owner` | In words, the project's owner. In code, a sparring clone's player, a dungeon's, a pile's, a cache's. | `server/src/spar.js`, `dungeon.js` |
| `holder` | In words, someone who holds a Hemi Bro. A local on the client. | `server/src/onchain.js` |
| `card` | Every card on the screen. So "the sitting's card" is a phrase on this page and never an identifier. | `src/ui/` |
| `ledger`, `book`, `budget`, `tally`, `gain`, `judge`, `flag`, `hold`, `starter`, `effect` | Each is in use: `harden_ledger:`, a pets `book`, `MOVE_BUDGET`, `_mvTally`, XP and sound gain, `ZONE_JUDGE`, the live flags, `_steadyHold`, starter gear, a status effect. | `server/src/` |
| `window.__btPace` | Defined twice: the onboarding's referee and the frame pacer's reading. The second overwrites the first. | `src/ui/onboardingPace.js`, `src/ui/BroTown.jsx` |

### Chosen: free at that commit

Twelve of these have no hit at all in `server/src`, `src`, `server/test`,
`tools` or `public/tools`. Two are met only as English words in comments, and
never as a name: `principal` seven times in two art tools ("the limb's
principal axis"), `permit` once as a verb (`server/src/gathering.js`).

| Name | For | Part |
|---|---|---|
| `actor` | who is acting | 1 |
| `principal` | the account above characters | 1, 2 |
| `stint` | a sitting's id | 1, 2 |
| `wayIn` | where an actor, or a row of the wire, comes in | 1, 5 |
| `permit`, `permit:` | a helper's grant, and its storage prefix | 1, 7 |
| `reqId` | a request's id | 2 |
| `devClass` | the device class | 6 |
| `drawLane` | a device's row of knobs | 4, 6 |
| `mayStart`, `doesWhat` | two columns of the wire table | 5 |
| `daybook:` | the day's book | 7 |
| `xfer:` | the transfer ledger | 7 |
| `play_trace:` | a recording of play | 7 |
| `liarGain` | a bounded claim's gain | 7 |

**Chosen by card P (step 9.1, tag 5241), free at its commit** (the same
search, with `docs`): `ASSET_FAMILIES`, `ASSET_REACH`, `ASSET_KINDS` and
`ASSET_DRAWS` have no hit outside `tools/assets/`. The plain `FAMILIES` was
taken (the held sweep's, `mp-heldsweep.mjs`, and the hero sheet's stat
families), as were `REACH` and `DRAWS`. `shipped` is a common word in code;
the record is named by its path, `tools/assets/shipped.json`.

| Name | For | Part |
|---|---|---|
| `ASSET_FAMILIES`, `ASSET_REACH`, `ASSET_KINDS`, `ASSET_DRAWS` | the family table and its closed lists | 7 |
| `tools/assets/shipped.json` | the record of what ships | 7 |

**Chosen by card L (step 5.3b, tag 5202), free at its commit** (the same
search): `PHASES` and `NOT_A_MACHINE`, the phase table's two lists, have no hit
as a name (`PHASES` only inside other words: `GOO_PHASES`, `ART-ASSET-PHASES`).
The table's machine names are words of a table, as the wire's `phase` column
writes them, never identifiers: `dungeon`, `connection`, `loading` and
`window` are common words in code and keep every meaning they have there;
`monster`, a monster's life, is the one name the plan had not given.

| Name | For | Part |
|---|---|---|
| `PHASES`, `NOT_A_MACHINE` | the phase table and the marked fields that are no machine's (`src/state/phases.js`) | 5 |
| `dungeon`, `connection`, `loading`, `window`, `monster` | the phase table's machines beyond part 5's list (a row's `name`) | 5 |

`report` is free as a message type and a common word elsewhere; part 4 says
what it is not. `gid`, `pid` and `hz` are TODAY's names, used here for the
thing they already mean.

A storage prefix named here is **not registered** in the server's registry
(`docs/ARCHITECTURE-HANDOFF.md`, rule 2): the card that first writes the key
registers it, in the same PR.

## 9. Every shape the four pillars name, and its row

So "done" can be checked: each step of pillars 1, 4, 10 and 11, and where its
shape is on this page. A step with no shape of its own says so.

| Step | Shape | Part |
|---|---|---|
| 1.0 | the hold names | 7 |
| 1.1 | the `report`, its fields, its two sinks | 4 |
| 1.2 | the Speed test's card (`speed`) | 4 |
| 1.3 | the device table | 7 |
| 1.4 | none (engines to test in) | |
| 1.5 | two members of the disturbances | 7 |
| 1.6 | the room's own row | 7 |
| 1.7 | the report's `self` | 4 |
| 2.1 (named by the card) | the device class; `drawLane` | 6 |
| 4.1 | the wire's columns; the census; the table | 5 |
| 4.1b | the send counts, in the room's row | 7 |
| 4.2 | `trust: bounded`, its judge, its `liarGain` | 5, 7 |
| 4.3 | a weapon's `gid`; a table a door | 2, 7 |
| 4.4 | the roads' classes; a road's other side; `value` and `whose` | 3 |
| 4.5 | the test room; `KNOWN`; the disturbances | 7 |
| 4.7 | `whose` (the restore reads it); the storage's size in the room's row | 3, 7 |
| 10.1 | the actor; `stint`; `reqId`; the classes | 1, 2, 3 |
| 10.2 | the sitting's card | 7 |
| 10.3 | the transfer ledger | 7 |
| 10.4 | the day's book | 7 |
| 10.5 | the roads between players | 7 |
| 10.6 | a signal's honest troubles; the disturbances | 7 |
| 10.7 | the league's rungs | 7 |
| 10.8 | a trace | 7 |
| 10.9 | a flag's evidence; a case; a report's reason; a block | 7 |
| 10.10 | none (it waits for 10.3 and 10.9) | |
| 11.1 | the `mayStart` column | 5 |
| 11.2 | the actor; `principal`; `permit` | 1, 2, 7 |
| 11.3 | `reqId`; things named by their place | 2 |
| 11.4 | a spoken line; `trust: words` | 5, 7 |
| 11.5 | none (two faults found on the way) | |
| 11.6 | the public facts | 7 |
| 11.7 | the permit's fields | 7 |
| 11.8 | the pass's quote and receipt | 7 |

## 10. What a guard would hold

Rule 2 asks for a guard that fails a second definition. Guards are code, in
`tools/guards/`, and that folder is card B's. What this page would have it
read, for card B:

- each NEW name of part 8 is defined in exactly one file of `server/src` or
  `src`, and that file is the row's "Where";
- no code writes a storage key with a prefix of this page (`daybook:`,
  `xfer:`, `play_trace:`, `permit:`) outside its row's one writer;
- nothing but the action door makes a `reqId`, and nothing a phone sends is
  stamped into `oplog:` without the worker's own prefix and the sender's
  `pid`;
- no field named `kind`, `wayIn` or `permit` is read off a message as an
  actor's;
- `deviceProfile.js` stays the one file that asks the device a question, and
  no file but it returns a `devClass` field.
