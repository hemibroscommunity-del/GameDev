# Sealed gear: rare-or-better pieces stay a "?" until you open them (PLAN, v2.3.3749)

> **Status: a plan, not built.** Docs only. Building waits until after the
> showing and the owner's yes. The lane that builds it reads this whole file
> first, then `docs/specs/rarity-reveal.md`, `docs/specs/gear-provenance.md`,
> `docs/specs/gear-stash.md` and `docs/specs/auction-house.md`.

Owner, 2026-10-28: *"I want to be able to pick up items as question mark
silhouettes if they're rare or better. That way they can run for a premium in
the auction house"*

Owner, the same night, on the four rules this plan asked about: *"Can't wear
sealed, can't salvage, can trade, can't forge"*

## Part 1: the plan in plain words

**Today.** When a monster drops an armour piece or the Iron Great Sword whose
grade is Rare or better, the pile on the ground shows a "?" and nobody can see
the grade. When you pick it up, the reveal plays at once: the "?" spins and
lands on Rare (blue), Elite (orange) or Godly (prismatic).

**After this change.** Picking it up no longer opens it. The piece goes into
your bag **sealed**: a dark silhouette of the item under a "?", named
"Sealed Iron Torso", with "Rare or better" under it in blue. Nobody knows the
grade, and that includes you. The server has known it since the monster
died, and it tells nobody until the piece is opened.

With a sealed piece you can:

- **Open it.** Tap it in the bag, then tap **Reveal**. The same reveal you
  know plays, and the piece becomes a normal Rare, Elite or Godly piece for
  good. Only the player holding it can open it.
- **Sell it sealed at the Auction House.** It is listed as "Sealed Iron Torso,
  rare or better". The buyer gets it still sealed and opens it themselves. The
  seller never learns what it was.
- **Trade it to another player, still sealed** (your rule: "can trade"). The
  other player sees the "?" in the trade window, the same as you do.

Things you cannot do with it until it is opened (your rules):

- **Wear it.** The bag offers "Reveal first". Your armour's grade shows on
  your body and changes how much damage you take, so wearing it would give
  the grade away.
- **Salvage it.** Salvage pays an essence by grade, so salvaging would give
  the grade away.
- **Forge or harden with it**, or put an essence on it.

**What a buyer is paying for.** Of every 11 sealed pieces, about 10 open as
Rare and about 1 as Elite. Godly is about 1 in 200,000 sealed pieces (it is
1 in 2,000,000 of all drops, and about 1 drop in 10 is rare or better). The
premium is mostly the 1-in-11 chance of Elite, plus the dream of Godly. This
is the same gamble as opening it yourself, so nobody is cheated, and the codex
already prints the odds.

**What does not change.** Normal drops (about 9 in 10) arrive open, as they
do today. The pile on the ground looks as it does today. Pieces you already
own stay as they are: they were opened when you picked them up.

### The rules you have decided

| Rule | Your answer | What it means in the game |
|---|---|---|
| Wear a sealed piece? | **No** ("Can't wear sealed") | Equip is replaced by "Reveal first". |
| Salvage a sealed piece? | **No** ("can't salvage") | The Salvage tab lists it as "Reveal first". |
| Trade a sealed piece player to player? | **Yes** ("can trade") | It moves still sealed and nobody sees the grade. |
| Forge or harden with it? | **No** ("can't forge") | No bench takes a sealed piece, and no essence goes on one. |

### Smaller rules, with my recommendation for each (yours to change)

1. **Which pieces seal.** Recommend: only pieces **picked up from a monster's
   pile** (armour and the Iron Great Sword), because that is what you asked
   about. Armour you smith at the forge, the daily chest's armour and quest
   armour keep opening at once, as they do today.
2. **The arena's wager window, if it is built** (fighters stake items).
   Recommend: **yes, a sealed piece can be staked, still sealed**, under the
   same rules as a trade. The winner gets it sealed.
3. **Re-sealing.** Recommend: **never.** Once a piece is opened it stays open.
   Otherwise someone could open a piece, see "Rare" and seal it again to sell
   as a mystery.
4. **The order book (the Marketplace's buy and sell orders).** Recommend: a
   sealed sword **cannot** go on it. The Auction House is the place for sealed
   pieces. The order book shows the whole sword to anyone who asks, so it
   would need its own rebuild to keep the secret.
5. **Weapon bag full when you pick up a sealed sword.** Today a sword that
   does not fit is sold on the spot. Recommend: keep that. It opens (the
   reveal plays) and sells as it does today, so nothing is lost silently.
6. **Armour trading in general.** Armour has never been tradeable player to
   player (only swords, bag items, gold and pets). Your "can trade" needs an
   armour lane in the trade window, and once it exists it would be odd for it
   to take only sealed armour. Recommend: the new lane takes **any armour the
   server has a record of**, open or sealed (the same pieces the Auction House
   can sell). Old armour with no record stays untradeable, as it stays
   unsellable.

### How big it is

**Four PRs, two lanes**, after the showing (Part 3, section 7). The first PR
is the safety one: it makes the server keep the secret on every message
before any player can own a sealed piece.

---

## Part 2: the technical design (for the building lane)

### 0. Words and one function

- A piece is **sealed** when the server's copy carries `sealed: 1`. Only the
  server ever writes it. It is set in exactly one place, the pile pickup
  (`index.js` `_handleLootPickup`, the claim block near the `loot_credit`
  send), and cleared in exactly one place, the unseal handler (section 2).
  Absent means open. So every piece stored before this change is open with no
  migration (section 6.4).
- **`sealedPublic(piece)`**, in a new `server/src/sealedgear.js` mixin (handoff
  rule 22): returns a copy with `quality` **deleted** when `piece.sealed`, plus
  `sealed: true`. It is written as a strip and not a pick, for the reason
  `_mysteryPiece` gives (index.js, v2.3.1925): a field added to pieces later
  then leaks in the harmless direction, and the grade never leaks through
  being left off a list. An open piece passes through unchanged. **Every
  outbound site in the table below calls it.** There is no second way to make
  a piece public.
- `sealed` is **write-only from the server**, like `prov` (gearprov.js header,
  point 2). Every inbound path strips it from the claim (`stripProv` grows to
  `delete out.sealed`; the weapon sanitizer's strict branch too). Otherwise a
  modified client could stamp `sealed` on a Normal piece and sell it as a
  mystery, which is fraud against buyers. A sealed piece's seal survives a
  join because the piece is **rebuilt from the server's own copy** (the
  ledger row's `p`, or the server's `weaponStash`), never from the claim.

### 1. Where the hidden grade lives, and how each message keeps it

**The grade lives only on the server's own copies of the piece**, at
`quality` beside `sealed: 1`:

| Piece | Where the server holds it | Storage key |
|---|---|---|
| Armour / legs | the provenance row `row.p` (the ownership proof; every inbound path rebuilds from it), and the server's stash entry with the same `gid` | `gear_prov:<playerId>`, `rpg:<playerId>` (`armorStash` / `legsStash`) |
| Iron Great Sword | the server's `weaponStash` entry (authoritative: the phone mirrors it from the `player_state` echo) | `rpg:<playerId>` |
| Listed at the Auction House | the escrowed `gearRow.p` / `weapon` inside the listing | `store_listing:<id>` |
| Staged in a trade (sword) | the escrow record | `trade2wpn:<pid>:<seq>` |
| In the post | the credit's payload | `inbox:<pid>` |

**The phone's own bag** (`S.rpg.armorStash` / `legsStash`, saved to the
browser as `bt_rpg`) holds the sealed piece **without** `quality`, with its
`gid` and `sealed: true`. Today the server accepts a client's armour grade on
the join path in two places (`gearstash.js` `sanitizeGearPiece` non-strict and
the v2.3.2527 backfill, `healGradeFromClaim`). For a sealed piece both
must be skipped: the server already holds the grade, and a claim of
"no grade" or "godly" from a phone must change nothing. A sealed piece always
has a `gid` (it is minted at the pickup), so it resolves through the ledger.
The legacy lane (no `gid`) cannot carry a seal: `sealed` is stripped there
with everything else.

**Every message that carries a gear piece today**, and how each keeps the
secret. (Inventory taken against `main` at abe121a; the builder re-greps for
`quality` across `server/src` before the PR, because a door added after this
plan is the likeliest leak.)

| # | Message / route | Who sees it | Today | With sealing |
|---|---|---|---|---|
| 1 | `player_state` (`_sendPlayerState`, persistence.js): `weaponStash`, `armorStash`, `legsStash`, also `weapon`/`armor`/`legsArmor` | holder | full pieces, `quality` included | each stash entry through `sealedPublic`. A worn slot cannot hold a sealed piece (section 4). The v2 delta compares the **public** form, so a seal changing to open counts as a change. |
| 2 | `loot_credit` (index.js) | picker | `armor[]` and `weapon` in full; `reveals[]` with the grade and ladder | sealed pieces through `sealedPublic`; **no `reveals` entry** for a sealed piece (it moves to the unseal answer). An open (normal) piece is unchanged. |
| 3 | `loot_drop`, the join/zone pile list (`_serializePile`) | zone | grade stripped; `mystery` bits say "rare or better" | **unchanged.** "Rare or better" is the public fact the product sells. |
| 4 | `inbox_delivered` (inbox.js), every `_creditPlayer` of `kind: 'gear'` / `'weapon'` (an Auction House buy, a refund, an expiry, a trade, No man's land loot, overflow) | receiver | `payload.piece`, `payload.weapon`, `row.p` in full | through `sealedPublic` at the send, **not** at the store: the stored entry keeps the grade so the credit can rebuild the piece. |
| 5 | `GET /api/store/browse`, `GET /api/store/mine` (no auth), and the `listing` each store POST returns (`_stPublic` → `disp`) | **anyone over HTTP** | `disp.quality` for swords and armour (store.js `_stDisplay`, storegear.js `_stGearDisplay`) | both display builders delete `quality` and set `sealed: true` when the escrowed piece is sealed. `tierMult` stays: it is the metal's step, not the grade. `hardness` is 0 (a sealed sword cannot be hardened). |
| 6 | `store_dm_thread` (storechat.js) | buyer and seller | `item: rec.disp` | already `disp`, so row 5 covers it. The test still drives it. |
| 7 | `GET /api/market/orders`, `/api/market/my` (market.js) | **anyone over HTTP** | the whole escrowed sword | a sealed sword is **refused** at order placement (`sealed`, smaller rule 4), so none is ever there. |
| 8 | `trade2_state.weapons` (trade2.js `_t2Wire`) | both partners | the full staged sword | through `sealedPublic`. |
| 9 | `trade2_state.gear` (new, section 3b) | both partners | (armour has no trade lane) | the new lane's wire is built through `sealedPublic` from the start. |
| 10 | `achv_state` (achievements.js `_achvOnPiece`, fired at pickup) | holder; then `ap` and `rarest` reach **peers** via the inspect card, the near-join lists and the leaderboard | fires on Elite / Godly **at pickup** | `_achvOnPiece` is **not called** for a sealed piece at pickup. It is called by the unseal handler, riding the same save. Otherwise "Elite piece!" pops before the reveal, and peers see `rarest: 'godly'`. |
| 11 | `tick.players[].eqg` (gearprov.js `armourGradeWire`, both tick builders), spar clones (spar.js) | zone, room rosters | worn grade letters | nothing to do: a sealed piece cannot be worn (section 4). The test asserts that a sealed `armorRef` in `stats_update` leaves `ps.armor` alone. |
| 12 | `monster_attack {dmg, dmgTaken}`, `monster_hit`, `pvp_hit` | zone | damage numbers carry the grade's multiplier | nothing to do, for the same reason: only a worn piece or a wielded sword counts. |
| 13 | `smith_salvage_result`, `essence_result` (salvage.js) | holder | name the grade; `not_lower` answers "is it already this grade or higher?" | a sealed piece is refused **first**, with `sealed`, before any grade is read, so the reason is the same for every grade (section 4). |
| 14 | `forge_armor_result`, `chest_opened`, `quest_reward_stashed`, the weapon forge | holder | full pieces | unchanged: these never seal (smaller rule 1). |
| 15 | `state_sync`, `player_join`, `player_update`, the inspect card's `rpgData` | room | no grade (`PEER_PUBLIC_KEYS`, `_gearProvCropPeer`); names only | unchanged, plus row 10's fix. The inspect card names worn gear only. |
| 16 | `GET /api/admin/player` (admin key) | the owner | everything | unchanged: the owner sees grades. |
| 17 | the codex, duels, the arena, the leaderboard (except row 10), `server_announce`, the server's logs | — | no grade | unchanged. The builder's grep confirms it. |

Nothing above sends a grade-dependent **size** for a sealed piece either: the
field is absent, not blanked, so "rare" and "godly" are the same length on the
wire (both absent).

### 2. The reveal

**Client → server: `gear_unseal`**, handled on purpose in `_onMessage` (deny
by default: until this case exists the room drops the type, it is not
relayed, and it is not in `RELAY.TYPES`). Awaited like every case (TRAPS
#182). Paced with `flood.js` `PACE` (it is a player's own tap, rule 27).

```
gear_unseal { field: 'armorStash' | 'legsStash', gid }
gear_unseal { field: 'weaponStash', stashIdx, expectName }   // swords have no gid
```

`field` is matched by value against a frozen list (TRAPS #6). The handler:

1. **The holder only.** Armour: `_gearSellable(playerId, slot, gid)` must say
   held (the row is this player's, not worn, not in the post, not escrowed in
   a listing; a listed piece's row is not in the ledger at all). Sword: the
   server's own `weaponStash[stashIdx]` with the `expectName` tiebreak, as the
   trade's weapon lane does. **And not staged in an open trade or wager**
   (refused `in_trade`, section 3b). Anything else answers a refusal
   (`not_held`, `in_trade`) whose reason never depends on the grade.
2. **Already open → the same answer, no ceremony** (`already: true`). Two tabs
   share one `bp_` id; the second tab's tap must not fail or replay the
   ceremony. Nothing is paid, so no opId: the operation is idempotent by its
   nature (handoff rule 8, single mutation).
3. **One write.** Delete `sealed` on `row.p` and on the server's stash entry
   carrying the same `gid` (or on the `weaponStash` entry), call
   `_achvOnPiece` (row 10), then `_gearProvSave` and `_saveRpg` in one
   synchronous run with no `await` between them. The output gate commits them
   together (handoff rules 5, 7, 9; `inbox.test` §8c). This is the shape of
   `_gearProvSetQuality`, which already edits both copies.
4. **Answer `gear_unsealed`** directly to the holder:
   `{ field, gid | stashIdx, piece, reveals }`. `piece` is now open, with
   `quality`. `reveals` is the one entry `_revealsFor` builds today, so the
   client plays the existing `RevealOverlay` through `revealBus` with no new
   animation. `gear_unsealed` goes in `PRIVILEGED_EVENTS`
   (`server/src/index.js`) and in `wsClient.js`'s DIRECT switch. The
   `player_state` echo that follows carries the open piece too.
5. **A lost answer** (the phone dropped between the write and the send): the
   next echo shows the piece open in its colour. The ceremony is lost and the
   piece is not. Acceptable, and stated so nobody builds a pending-reveals
   store for it.

**Traded or sold mid-way.** Whoever **holds** the piece at the moment of the
tap may open it, and nobody else:

- **Listed** at the Auction House: the row is in the listing, so the seller
  cannot open it (`not_held`). A cancel or an expiry returns it still sealed.
  A buyer receives it sealed and can open it once it lands (live or from the
  post).
- **Staged in a trade or a wager:** neither side can open it while the window
  is open (`in_trade`). Otherwise the giver could peek and cancel. Cancel →
  it is still sealed and still theirs. Commit → the receiver holds it sealed.
- The DO handles one event at a time (rule 9), so a `gear_unseal` and a list
  or stage request cannot interleave. Whichever lands first wins, and the
  other is refused or sees the new state (section 3's `expectSealed`).

### 3. The Auction House, and trades

#### 3a. The Auction House (store.js, storegear.js)

A sealed listing is an **ordinary listing** travelling the same paths
(auction-house.md, "Settlement" and "Gear listings"). No new storage key, no
new money leg, no new opId shapes:

- **List**: `POST /api/store/list { kind: 'gear', field, gid, price,
  expectSealed: true }` (swords: `kind: 'weapon', stashIndex, expectSealed`).
  `expectSealed` is new: the worker refuses (`opened`) when the piece is no
  longer sealed (it was opened in another tab a moment ago), so a seller
  never lists an opened Elite at a mystery price or a Rare as a mystery by
  mistake. The gate is still `_gearSellable`. Escrow is unchanged: the row
  leaves the ledger into `store_listing:<id>.gearRow`, and `p.sealed` and
  `p.quality` ride inside it on the server.
- **Shown**: `disp` is stripped (section 1, row 5). The client labels it
  "Sealed Iron Torso", "Rare or better", with the "?" tile. `cat` is the
  armour or weapon category, as for any piece, plus a **"Sealed" filter** in
  the store panel.
- **Buy / bid / accept**: the same settle (`store:<id>:pay`, `:goods`,
  `:gold`, the `sale` / `pendBid` / `releasing` markers, the wake-time
  rebuild). The goods leg credits the row to the buyer's ledger with `p`
  intact, so it arrives sealed. Its `inbox_delivered` goes through
  `sealedPublic` (row 4).
- **Cancel / expiry**: back to the seller through the same release, still
  sealed.
- **Nobody, seller included, can learn the grade.** The seller's phone never
  held it (rows 1 and 2), the listing never shows it (row 5), the seller
  cannot open it while it is listed (section 2), and no refusal or result
  differs by grade.

#### 3b. Trades player to player (the owner's "can trade")

**Swords** already trade through the escrow-at-stage weapon lane
(`trade2wpn:`). The sealed sword needs only: `_t2Wire` through
`sealedPublic` (row 8); `_sanitizeWeapon` keeping `sealed` in its non-strict
branch (it spreads the piece, so it does; the test pins it, and the strict
branch strips it); and delivery's `inbox_delivered` stripped (row 4).

**Armour** has no trade lane today (trade2.js header: "inventory items + gold
only", weapons and pets added since). The new **gear lane** copies the **pet
lane**'s shape (v2.3.3122: validate at commit, nothing escrowed at stage, the
move inside the commit's one write), not the weapon lane's. It needs no new
storage key and no restart sweep, and the ledger row is the thing that moves:

- `trade2_stage_gear { field, gid }` / `trade2_unstage_gear { field, gid }`:
  new client messages, handled on purpose and paced. At stage:
  `_gearSellable` must say held. Up to `TRADE2.GEAR_MAX` (recommend 4, as
  weapons). Staging, unstaging **or any change to a staged piece** resets
  both confirms and both readies (the anti-switch rule). The piece's
  `sealed` state is recorded at stage.
- **Wire**: `trade2_state.gear: { [pid]: [ public piece ] }`, each through
  `sealedPublic`. A piece gone from its owner's ledger shows `missing`, as a
  pet does.
- **Commit** (`_handleTrade2Confirm`, both confirmed): for each staged piece,
  re-ask `_gearSellable` and check its seal matches what was staged; any
  miss cancels the whole trade. Then detach each row from the giver's ledger
  and give it to the receiver (the store's own primitives, the ones a sale
  and a refund use), remove it from the giver's server stash, and credit the
  receiver `kind: 'gear'` with opId `trade2:<sid>:gear:<gid>`. **All of it
  inside `_creditLiveTogether`'s one write** with the bag items, gold and
  pets (v2.3.3294). The receiver's phone gets the piece through the credit
  (stripped). The giver's phone is told which `gid`s left (`settled: true,
  gearMoved: [...]`) and drops them from its own bag. A phone that misses it
  drops them on the next join: the server's adoption no longer finds those
  rows in this player's ledger (the v2.3.2532 "stop showing what it sold"
  lesson, auction-house.md).
- **Not both in the room** at commit: the trade cancels and nothing moves.
  The trade window already requires both online.

**The arena's wager window**, if it is built: the stakes use this same gear
lane (a stake is a staged piece, the win is the commit), so a sealed piece can
be staked **still sealed** under the same rules. Its spec says so when it is
written.

### 4. The decided rules, and where each is enforced

All four are **server refusals**. The phone hides the buttons too, but the
server is the authority. Each refusal checks `sealed` **before** reading
`quality`, and answers `sealed` for every grade.

| Rule (owner: *"Can't wear sealed, can't salvage, can trade, can't forge"*) | Door | Refusal |
|---|---|---|
| Can't wear | `stats_update` armour / legs (grids.js: `armorRef` resolve and the whole-piece path); `equip_request` for a sword (index.js `_handleEquipRequest`) | the slot is left as it was. The answer reuses the existing equip refusal toast with the reason `sealed` ("Reveal it first"). |
| Can't salvage | `smith_salvage` (salvage.js) | `sealed` |
| Can't forge or harden | `harden_weapon` (hardening.js), `essence_apply` (salvage.js, before the `not_lower` compare), any bench that takes a piece as input | `sealed` |
| Can trade | section 3b | — |

Also refused: the order book (`sealed`, smaller rule 4). The vendor: recommend
**refused** too ("Reveal it first"). It pays no grade-dependent price today,
but selling a mystery for scrap by mistake is a loss a player would report.

### 5. What a phone shows

- **The bag** (`InventoryTile.jsx`, `ItemDetailPopup.jsx`, `InventoryPanel.jsx`):
  the item's own art drawn dark as a silhouette (a tint on the existing
  sprite: **no new texture**, so nothing for the memory check) under a "?",
  the name "Sealed Iron Torso", and "Rare or better" in the rare blue
  (`QUALITY_COLOR.rare`, `ui/mobile/dash/common.js`). The popup's buttons:
  **Reveal** (primary), **Sell** (the Auction House, when `caps.sealedGear`),
  and Equip and Salvage shown disabled with "Reveal it first". Every place
  that reads `quality` for display must treat "sealed" before "no quality =
  normal": `QUALITY_LABEL`, `ItemTooltip`, `EquippedTab`, `equipModel.js`,
  the damage-reduction line (`getArmorPieceDr` must not print a Normal number
  for a sealed piece: it prints "?"), and `glint.js` `seenGrade` (no grade
  glint on a sealed piece).
- **Reveal**: `gear_unsealed` → `revealBus.push(reveals)` → the existing
  `RevealOverlay`, then the tile turns into the graded piece.
- **The trade window** (`TradeWindowPanel.jsx`): the same tile in both
  columns.
- **The Auction House** (`StorePanel.jsx`, which prints `d.quality` today):
  the same tile and words, and the "Sealed" filter.
- **The drop line** (the loot-shine lane, v2.3.3746, colours a rare-or-better
  drop blue): "Sealed Iron Torso · rare or better" in blue. The pickup
  popup's "[RARE]" weapon tag (wsClient.js `_applyLootCredit`) becomes
  "[SEALED]".
- **Desktop**: Reveal takes a key in `src/game/deskKeys.js` (`data-key`); the
  words say "click" through `deskWords()`.
- **Same-change rules**: the bag popup's sealed state goes in
  `tools/qa/ui-review/states.mjs`, and its section in
  `docs/UI-DESIGN-NOTES.md` is updated (`--check-notes`). Every new control
  is `touch-action: manipulation`; a control that closes the popup on
  `pointerup` calls `swallowTapClick(e)` (TRAPS §247).

### 6. Safety

**6.1 The cap.** `caps.sealedGear` (join.js `state_sync.caps`, registered in
`CAP_GATES`; precheck `cap-registry`). And the other direction: the worker
seals a pickup **only for a session whose join said it can show one**
(`join.data.seal: 1`, read like `msg.ws`, sent by a client that read
`caps.sealedGear`). The reason: the worker and Pages deploy separately, and an
old tab that received a sealed piece would show it as a plain Normal and
offer Equip. So:

- new worker + old client → pickups open at once, exactly as today;
- old worker + new client → no cap, so the client sends no `seal`, shows no
  Reveal and no sealed listing;
- a sealed piece reaching an **old** client's session (bought, then the buyer
  logs in on an old tab) → that join opens it (the same write as section 2,
  `_achvOnPiece` included) and the old client's own reveal path plays it from
  the `loot_credit`-shaped data it already understands, or simply shows it
  open. The buyer loses nothing: opening is all they could do with it.

**6.2 The kill switches** (live flags, `liveops.js`, lower case,
`liveops.test` §8):

- **`sealedgear: false`** stops new seals (pickups open at once, today's
  ceremony), un-advertises `caps.sealedGear` (no new sealed listings, no
  sealed staging), and refuses `expectSealed` listings. **It never stops
  `gear_unseal`.** Opening is the safe direction and always works, so a piece
  sealed before the switch was thrown can always be opened. Sealed listings
  already on the shelf stay buyable: they are ordinary escrow, and stranding
  them would be worse.
- **`sealedgear_open: true`** opens everything: each player's sealed pieces
  are opened at their next join (section 2's write, one per piece, same
  save), and a sealed piece arriving by a credit while it is on is opened on
  delivery. Listings stay sealed until bought, then open on delivery.
  Opening clears one mark and moves nothing, so it cannot duplicate or lose a
  piece.

**6.3 The storage-key registry** (ARCHITECTURE-HANDOFF rule 2). **No new
prefix and no new rpg-blob field** (rule 1): `sealed` rides on the gear
objects, as `gid` does. The rows to amend in the same PR:

- `rpg:<playerId>`: stash entries (`weaponStash`, `armorStash`, `legsStash`)
  may carry `sealed: 1`, with `quality` held server-side;
- `gear_prov:<playerId>`: `p.sealed`. **The FIFO cap must never age out a
  sealed row** (at 256 the oldest *open* row goes first). A sealed row
  forgotten would lose the only record of the grade, since the phone does not
  have it;
- `store_listing:<id>`, `trade2wpn:<pid>:<seq>`, `inbox:<pid>`: the escrowed
  or posted piece keeps `sealed` and `quality`.

**6.4 The migration: none needed, on purpose.** Every piece picked up before
the change was opened at pickup (its reveal played), so all existing data is
open, and "no `sealed` field" means open. Nothing is rewritten.
`GEAR_PROV_V` stays 1: the field is optional and additive, and bumping it
would make a rolled-back worker refuse every ledger and stop every gear sale.
**The honest cost of a rollback:** an older worker ignores `sealed`, so it
would show sealed grades early (in the bag, and in the Auction House's
`disp`). Nothing is duplicated or lost, but the market's secret is out until
the new worker is back. Written down so a rollback during the feature is a
choice made knowingly.

**6.5 The economy guard rails.**

- **No duplication.** The seal is a mark on a piece, not a piece. Opening
  moves nothing. Every move of a sealed piece uses a primitive that already
  moves open pieces once: the store's escrow and settle, the trade's one
  write, the credit's opIds. The new armour trade lane adds no escrow
  record, so there is nothing for a restart to refund twice.
- **No re-seal.** No message sets `sealed`. Only the pile pickup does
  (smaller rule 3).
- **No forged seal.** `sealed` is stripped from every inbound claim (section
  0). A Normal piece can never be sold as a mystery.
- **No grade peeking.** The oracles found in the inventory are each closed:
  the essence `not_lower` refusal (refused `sealed` first), the pickup
  achievement (moved to the reveal), the damage maths and the worn-grade
  letters (cannot wear), salvage (refused). Refusal reasons never vary by
  grade. No message's size varies by grade. No grade-dependent work runs
  before the reveal, so there is no timing to read.
- **No peek-and-cancel.** A piece cannot be opened while it is listed or
  staged; `expectSealed` and the commit's seal check catch an opening that
  races a listing or a trade.
- **Test mode** asks nothing new: no honesty check is added, and nothing in
  `testmode.js` changes. For testing, a dev lever (`devtools.js`,
  `/dev/seal`) seals a piece the owner's character holds, so the QA scenario
  does not wait for a 1-in-11 drop.

### 7. Tests, and an honest size

**Server suites (`server/test/`):**

- **`sealedgear.test.mjs`** (new):
  1. a rare-or-better pickup seals for a `seal: 1` session; a Normal one does
     not; an old session (no `seal`) gets today's open piece and ceremony;
  2. **the wire audit**: mint a sealed **godly** piece, then drive every door
     in section 1's table through the real `webSocketMessage` / `fetch`
     (pickup, `player_state` v1 and v2, a rejoin, list, browse, mine, the DM
     thread, buy, bid, cancel, expiry, post delivery, trade stage and commit
     for a sword and for armour, a wager stake if built, the tick, `achv_state`,
     the inspect card). Capture **every frame and HTTP body** and assert that
     the string `godly` and the ladder never appear before the unseal, and do
     appear in its answer. Build it as a frame scanner, not one assert per
     door, so a door added later is caught by default;
  3. unseal: holder only; `not_held` for a listed piece, one in the post,
     another player's `gid`; `in_trade` while staged; already open answers
     `already` with no ceremony; the achievement fires at the unseal and not
     at the pickup; ledger and rpg written in the same synchronous run (a
     throwing save leaves both sealed);
  4. the four rules: `stats_update` with a sealed `armorRef` and with the whole
     piece leaves `ps.armor` unchanged; `equip_request` of a sealed sword is
     refused; salvage, essence (all three essence grades give the same
     `sealed` reason), harden, the order book and the vendor are refused;
  5. a forged `sealed` on a join claim, a listing body or a trade stage seals
     nothing;
  6. the ledger cap never ages out a sealed row;
  7. both kill switches, and that `gear_unseal` works with `sealedgear: false`.
- **`market.test.mjs`**: the S8 crash cases (a restart at each marker) re-run
  with a sealed piece. The seal survives every rebuild, and the buyer
  receives exactly one sealed copy.
- **The trade suite**: the new gear lane (stage, wire, anti-switch reset,
  commit in one write, a restart mid-commit, a piece listed or opened
  between stage and commit cancels the trade).
- **Extend**: `drops.test.mjs` (the credit's `reveals` empty for a sealed
  piece), `gearprov.test.mjs` (strip on inbound), `gearstash.test.mjs` (the
  quality backfill skips a sealed piece), `caps-audit`, `liveops.test` §8,
  the `PRIVILEGED_EVENTS` audit.

**Phone scenario: `tools/qa/mp/mp-sealedgear.mjs`** (registered in run.mjs
`SCENARIOS`; `world: 'wheel'`; a second pass with `wide: true`). Player A's
character is seeded with a sealed piece through `/dev/seal`. The bag shows
the "?" tile, "Rare or better" in blue, no grade colour anywhere, Equip and
Salvage disabled. A lists it; B (a second browser) sees the sealed listing,
buys it, receives it sealed, taps Reveal, the overlay plays and lands on the
grade. A second piece is traded A → B still sealed. Any `window.__bt*` probe
it reads is added (precheck `qa-handles`). `mp-membudget` is unaffected (no
new art).

**Size: four PRs across two lanes**, each behind the cap:

| PR | Lane | What | Size |
|---|---|---|---|
| 1 | server | `sealedgear.js`, the seal at pickup (only for `seal: 1`), `sealedPublic` at every door in section 1 (including the store's `disp`, the trade's sword wire, the post), the inbound strip, `gear_unseal` / `gear_unsealed`, the four refusals, both switches, the cap, the registry rows, `sealedgear.test.mjs` with the wire audit. **No player can own a sealed piece yet** (no client sends `seal`), so this PR changes nothing for players and can merge alone. | large |
| 2 | client | the bag tile and popup, Reveal, `gear_unsealed` in the direct switch, the drop line words, `seal: 1` on the join (gated on the cap), the UI states and notes, the first half of `mp-sealedgear`. **This is the PR that turns it on.** | medium |
| 3 | both (small server) | the Auction House: `expectSealed`, the sealed labels and filter in `StorePanel.jsx`, the market crash cases, the scenario's store half. | small to medium |
| 4 | both | the armour trade lane (section 3b), the sealed tile in the trade window, the scenario's trade half. The biggest client-facing change: armour has never traded before, open or sealed. | large |

PRs 1 and 2 can be built in parallel once section 1's wire shapes are agreed
(the client can be built against the dev lever). PR 3 follows 2. PR 4 can
follow 1 in the server lane while 2 and 3 land. About two evenings for two
lanes, with review between.
