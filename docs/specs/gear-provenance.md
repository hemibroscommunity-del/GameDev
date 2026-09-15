# Gear provenance — the server records what it mints (v2.3.2534–2536, repaired v2.3.2537–2539)

Spec + attach points for `server/src/gearprov.js`. Phase 1 of the gear
provenance lane (PR 1 of 3: **record at mint** → equip names a recorded
piece → the store sells only what the server recorded).

## Why

The server has always handed out armour, legs, shields and amulets and
written down **nothing** about having done so. The pieces went to the
player's browser (`loot_credit`'s `armor` array, `quest_reward_stashed`)
or into a worn slot, and the only record that a piece existed at all was
the client's own copy of it.

Three separate review findings are that one fact:

| Finding | Where | What it really was |
|---|---|---|
| "a player can claim gear they never earned" | #640 finding 4, #641's *checked for SHAPE, never for OWNERSHIP* | there is nothing to check a claim against |
| reconciliation deleted real spares | #643 finding 2 (`_stGearReconcileWorn`) | a stale duplicate and a genuine second copy are indistinguishable without an id |
| the store cannot sell gear | #643 parked | both of the above |

## What it does

Every piece the server mints gets a server-assigned id (`gid`) and a row
in `gear_prov:<playerId>` naming the player it was minted for and a
verbatim copy of the minted blob. That row is the ownership proof.

**Nothing player-visible changes in this version.** No new op, no new
wire verb, no store change, no client change. Existing gear keeps
working exactly as it does today.

## The two properties that make it worth having

1. **The id is a key into server state, not a claim.** An inbound piece
   carrying a `gid` is never trusted: the id is looked up in *that
   player's own* ledger and, on a hit, the piece is **rebuilt from the
   ledger's copy** (handoff rule 16 — the server's own copy by
   reference, never the wire blob). Forging a gid therefore buys
   nothing. An id not in your ledger is dropped; an id that *is* in your
   ledger names a piece you already own, at the stats it was minted
   with. Attaching your Copper Torso's id to a claimed Godly Iron Plate
   hands you back your Copper Torso.
2. **`prov` is write-only server-side.** The `minted` / `legacy` mark is
   never read back off the wire — it is recomputed from the ledger on
   every inbound path and stripped from every claim. #643's `_sv` was
   forgeable precisely because it was a self-asserting boolean that one
   path happened not to strip; a derived field has no forgeable form.

## Trusted vs claimed — the one place the resolve branches

`_gearProvResolve(playerId, slot, piece, sanitize, trusted)`:

- **claimed** (default): the piece is rebuilt from the ledger row. This
  is what makes a forged gid worthless.
- **trusted** (the server's own stored rpg blob): the piece keeps its own
  fields and only has its id *verified*.

The distinction is load-bearing because a minted piece can legitimately
**change** after it is minted: slotting a gem rewrites an amulet's `gem`
and `name`. The first cut rebuilt every path and a Mythic Flame Amulet
came back from a reconnect with `gem: null` — caught by
`amulet.test.mjs`, not by reasoning. Any server-side op that mutates a
minted piece must call **`_gearProvTouch`** so the row follows it
(`amulet.js` op `'gem'` does).

## The mint paths — the full enumeration

Every path in the tree that creates a piece of gear, and what it now does.

| # | Path | File | Records? | Note |
|---|---|---|---|---|
| 1 | monster armour drop, chest | `_rollArmorDropsForKill` → `_handleLootPickup` | ✅ `src:'drop'` | recorded at **pickup**, not at the kill — a pile can expire unclaimed and the claimant is not always the killer |
| 2 | monster armour drop, legs | same | ✅ `src:'drop'` | |
| 3 | quest armour / legs (`kind:'armor'`, `kind:'legs'`, and `kind:'armorSet'` recursing into both) | `_grantQuestItem`, quests.js | ✅ `src:'quest'` | goes straight to the client's bag; the server keeps no copy, which is exactly why it needed an id |
| 4 | quest shield (`kind:'shield'`) | `_grantQuestItem` | ✅ `src:'quest'` | tut_1's Pine Shield — the first gear most characters ever own, and the whole of "character-creation starting gear": a new character's own defaults are all `null` (`gameSystems.js`), so the starter kit *is* this quest grant |
| 5 | amulet forge craft | `_handleAmuletForge` op `'craft'`, amulet.js | ✅ `src:'forge'` | the only path in the game that mints an amulet |
| 6 | amulet gem slot | `_handleAmuletForge` op `'gem'` | ↻ touches the row | a mutation, not a mint |
| 7 | dev kit | `_devKit`, devtools.js | ✅ via 3/4 | weapons only today, but it passes its target id so a future gear entry records |

Paths that **look** like mints and are not — each checked, each stated so
the next reader does not have to re-derive it:

- **First-connect bootstrap** (`rpgArmor` / `rpgShield` / `rpgAmulet`,
  join.js) — a *claim*, not a mint. Resolved against an empty ledger, so
  everything lands `legacy`. This is the widest gear-trust surface in the
  game and this version **labels** it rather than closing it.
- **Gear-stash adoption** (`_gearStashAdoptOnJoin`) — a claim. Same.
- **Cosmetic `gearStash`** — there is **no server mint path for cosmetics
  at all**. The catalog is client art (`gearCatalog.js`) and the list is
  filled by unequipping a worn layer (`syncArmorLayers`). Every cosmetic
  entry is `legacy` and will stay that way until something server-side
  mints one.
- **Weapons** — deliberately out of scope. `weaponStash` is already
  server-held by reference and the store already sells from it. The
  *same* minting hole exists for weapons (the first-connect bootstrap
  adopts client weapons too); it is a known adjacent hole, not this
  lane's.
- **Event capes** — already ledger-backed (`capegrant:<capeId>`) and not
  one of the five gear lists.
- **Arena / clan / sponsorship / cadence / threat rewards** — every
  `_creditPlayer` call in those modules is `kind:'gold'` or `kind:'item'`.
  No gear.
- **Shopkeeper Bro (`shop.js`)** — sells no gear.
- **The general store (`store.js`)** — delivers stackables and stash
  weapons only today. Gear delivery arrives with PR 3 / #643.

## Storage

`gear_prov:<playerId>` (registered in ARCHITECTURE-HANDOFF rule 2):

```
{ _v: 1, seq: <number>, forgotten: <number>,
  list: [ { id, slot, src, at, p: <the minted blob> } ] }
```

One key per player. Read once on join (a bounded `get`, never a prefix
scan — rule 9), written fire-and-forget on mint (the `_saveRpg` posture,
rule 10: the output gate holds outbound messages until prior writes
commit, so a client can never be shown a gid whose row has not landed).

`list` is an **array**, not a map keyed by id: ids come back from
clients, and an array cannot be poisoned by a key named `'__proto__'` at
all — TRAPS #6 closed by shape rather than by discipline.

Nothing is added to the rpg blob (rule 1). `gid` and `prov` ride **on**
the existing gear objects, which are already stored whole.

## Merging v2.3.2527 (#641) — what was kept, and why (v2.3.2540)

`main` gained the lane-M2 gear-stash repair while this stack was in
review, and it lands in the same function this lane edits
(`_gearStashAdoptOnJoin`). The two changes **compose rather than
disagree**, and the merge is resolved to keep each side's whole job:

- **#641 decides *whether* the claim is read.** Its open door, its
  `report.truncated` accounting, its `took`-based stamp and its removal
  of `amuletStash` from the seed keys are kept verbatim. The stamp is a
  record now, not a gate — which is precisely the thing #648's reviewer
  said this lane needed.
- **This lane decides *how* each entry resolves.** Every entry, stored
  and claimed, still goes through `_gearProvResolve`.

One mechanical detail worth knowing, because it looks like a divergence
and is not: #641 records truncation *inside* `sanitizeStashList`, but
the provenance resolve has to read `gid` **before** any sanitizer runs
(`_sanitizeAmulet` and `sanitizeCosmeticEntry` rebuild a whitelisted
object and would drop it). So the resolve is per-entry and the
truncation check — the same `raw.length > GEAR_STASH_CAP` predicate, at
the same point in the flow — sits beside it. Same condition, same
effect on the stamp.

**One behaviour of this lane's tests changed, in #641's favour.** #641
stopped stripping `quality` from an adopted piece, because deleting it
wrote every graded plate anyone had earned down as plain, permanently.
A `gearprov.test.mjs` assertion required the strip and now pins what
actually matters instead: a claimed piece keeps its grade and is still
`legacy`, so it can never be listed whatever grade it claims. Armour has
no anti-cheat damage ceiling for a forged grade to raise — the `[0,8]`
clamp applies after the grade, with the 75% DR cap above it — so this
opens nothing here.

## Four repairs from the review of #648 (v2.3.2537)

1. **The gem-EXTRACT op now touches the row.** `_stripGems` rewrites a worn
   shield in place (clears `gem`, rebuilds the name) and is the second
   mutation of a minted piece in `amulet.js`; the gem-SLOT op one function
   above already called `_gearProvTouch` and this one did not, so the row
   kept the gem that had just been pulled out. Latent while nothing rebuilds
   routinely — and v2.3.2535 makes rebuilding the normal way to equip, at
   which point extract → unequip → re-equip returns the gem. Free gems on a
   loop. Called unconditionally, since `_gearProvTouch` no-ops on a piece
   with no id and the op also serves weapon targets.
2. **A character restart deletes the ledger.** `_resetCharacterData`
   (persistence.js) wipes `rpg:<pid>` and the quest-reward stamps but left
   `gear_prov:<pid>` behind — and rows are keyed by player id, which a
   restart does not change. The old wardrobe came back marked `minted` on a
   brand-new level-1 character, and two tabs share one identity by design, so
   the other tab hands it straight back. Nothing was multiplied; it came back
   *provable*, which v2.3.2536 turns into sellable. The key and the cached
   copy now go with the character.
3. **Ids no longer ride the room-wide broadcast.** `getAllPlayerData()`
   spreads a player's whole state into every other player's `state_sync`, so
   every minted `gid` went out. Not exploitable — a gid is only ever resolved
   against its own sender's ledger — but it contradicts this lane's own
   decision to keep gids off the loot-pile broadcast, and test §8 ("the
   ledger does not leak to other players") searched the message for
   `gear_prov` and `forgotten` and never for `gid`, so it passed while they
   went out.

   The crop is **by shape, not by a list of field names**. The first cut
   named the four worn slots and the five stash lists and missed
   `_questGrantOverflow` — the in-memory scratch a quest turn-in parks minted
   armour on, which is on playerState like everything else. An allowlist here
   is a list somebody must remember to extend; a sweep cannot be forgotten.
   §8 now sets a minted piece up first (otherwise the assertion is vacuous
   whatever it greps for), searches for `gid` and `prov`, names the scratch
   field explicitly, and asserts the crop does **not** damage the live state
   or the player's own `player_state`.
4. **The cap's size estimate was about half of what a row costs.** A row
   stores the whole minted blob verbatim plus id/slot/source/timestamp:
   ~180–200 bytes, so 256 rows is ~50 KB, not the ~28 KB the comment
   claimed. Still well inside the limit; corrected so nobody raises the cap
   on the strength of the wrong number.

Also hardened in the same pass, from the review's tidiness notes: a rebuilt
piece and its ledger row were shallow copies of each other and aliased any
nested value, so mutating the live piece would have silently edited the
record. Flat today, a real bug the first day a piece gains a nested field —
`clonePiece` now separates them.

## There is no "done" stamp

Deliberately, and it is the first thing to check when reading this.
#640's `gearStashCaptured` stamped "captured" for players whose gear it
had never seen, and needed a repair plus a healing migration (#641).

Provenance has no one-shot of any kind: the ledger is append-on-mint, the
resolve runs on every inbound path every time, and a piece with no row
resolves as `legacy` again next join. There is nothing here that can be
burned, so there is nothing to recover from. No rpg-blob shape changed,
so **no migration is needed either**.

## One mint, one piece

`_gearProvDedupe(ps)` runs at the end of the join path, once the worn
slots and all five stash lists are resolved — the only point that can see
them together. A `gid` may appear at most **once** across a player's
wardrobe: the first sighting (worn beats stashed) keeps its proof, and
any later copy of the same id is **demoted** to `legacy`.

**Demoted, never deleted.** The three ways a second copy of one id
appears are a stale client list, a half-applied equip, and a forged
claim — and only the third deserves to lose anything. A demoted piece
keeps every stat it had and loses only the ability to be sold, so the
honest cases cost a player nothing they can see and the forged one gets
exactly what it would have got without the id. That is why the pass can
be unconditional: **there is no case where being wrong destroys gear.**

This is deliberately *not* #643's reconciliation-by-signature, which
guessed that a stash entry matching the worn piece by
`name|gearBase|tierMult|tier` was a stale duplicate and deleted genuine
spares. An id is not a guess.

`stashSig` (gearstash.js) now keys on the gid when there is one, for the
same reason: two pieces with different ids are two different pieces
however identically they are named.

## Legacy gear: usable, not sellable

The owner's decision, and the one thing most worth understanding.

A piece minted before this version has no row and never will. The two
alternatives are both worse: adopting the client's current claims
wholesale re-opens the exact minting hole this work exists to close, and
deleting unrecorded gear destroys things people earned. So an unrecorded
piece keeps working in **every** way — worn, rendered, counted in the
damage maths, traded, everything it does today — and carries
`prov: 'legacy'` so the client can say *why* it cannot be listed instead
of failing silently.

## Equipping by name (v2.3.2535)

`stats_update` can now say what you are wearing in two ways:

| Shape | Meaning | Who sends it |
|---|---|---|
| `armorRef: '<gid>'` / `legsArmorRef: '<gid>'` | equip the piece the server recorded under that id | a client that has seen `caps.gearRef`, for a piece that HAS an id |
| `armorRef: null` | unequip | same |
| `armor: {...}` / `legsArmor: {...}` | the legacy describe-a-piece shape | everything else |

A ref carries **nothing but the id**, so there is no blob on the wire to
inflate: the piece that ends up worn is the server's own copy of what it
minted (`_gearProvPieceByRef`).

**A ref that names nothing is a refusal, not a fall-through.** It keeps
whatever is currently worn, and it explicitly does *not* fall back to an
`armor` object sent in the same message — otherwise a client could name a
modest piece and describe a godly one and have the second honoured. The
`player_state` echo that follows snaps the client's own list back, which
is the self-correction the threat gear-lock and the defence-point gate
have always relied on.

**Both lanes go through one gate.** `_gridsApplyArmor` (grids.js) holds
the JSON compare, the v2.3.1129 threat gear-lock, the v2.3.1661
defence-point gate and the assignment, hoisted out of the legacy block
rather than copied — a copied gate is exactly the shape where a new lane
silently skips a check nobody re-read. The suite proves it by turning each
gate on and watching the ref lane obey.

### Retiring the describe path

`caps.gearRef` is narrow and is **not** folded into `store` (TRAPS #9, the
`caps.gems` lesson: a v2.3.2475 worker advertises the store and knows
nothing about refs). Deploy-order safety both ways: an old worker never
advertises it so the client keeps describing, and a new worker still
accepts a description from an old client.

The describe path can be deleted when **both** of these are true:

1. every worker in production advertises `gearRef` — the ordinary rule-19
   condition, and the easy half; and
2. **every piece a player can equip is one the server holds by
   reference.** This is the hard half and it is not satisfied today:
   legacy gear has no id, so it *can only* be equipped by describing it.
   Legacy gear never expires, so waiting does not fix this. It needs the
   server's stash to be the authority for what a player owns (PR 3) plus
   a way to name an unrecorded piece the server holds — addressing a
   stash entry by index, the way the marketplace already does.

Until (2), the describe path is load-bearing, and **this version does not
close the equip trust hole** — it builds the path that will. A modified
client can still describe a legacy piece with any stats it likes. What it
cannot do, since v2.3.2534, is describe a piece and have it come out
*provable*.

## Custody — selling only what the server recorded (v2.3.2536)

This is the foundation #643 (gear listings) was parked waiting for. It
ships the custody layer, not the listings themselves.

### The one definition, with a reason

`_gearSellable(playerId, slot, pieceOrGid)` → `{ok, reason, gid}`. The
reasons are stable strings so the client can say **why** a Sell button is
greyed rather than failing silently — which is the other half of the
owner's "legacy gear is usable, not sellable" decision:

| reason | meaning |
|---|---|
| `ok` | the server minted it, and this player is actually holding it |
| `legacy` | no id — minted before the ledger existed, or claimed and never proved. **Permanent** |
| `cosmetic` | an outfit layer. **Never** sellable, by design — deliberately *not* the same answer as `legacy`, which would invite someone to "fix" cosmetics by adding a mint path nobody wants |
| `worn` | it is on your body right now; take it off first |
| `in_mail` | it is a delivery still waiting in your inbox |
| `wrong_slot` | the id names a piece for a different slot |
| `not_held` | we minted it, but the record is no longer in this player's ledger: sold, escrowed into a live listing, or aged out past the cap |
| `no_player` | no session, so no loaded ledger |

### The gate asks two questions, not one (v2.3.2539)

It first asked only *"is there a row?"*, treating a row as proof of
**possession**. A row records a **mint**. The review of #650 ran both
consequences against a real `GameRoom` rather than reasoning about them, and
both print gear the moment #643 wires this up:

- **A worn piece passed.** `quests.js` mints the tut_1 shield straight into
  `ps.shield` and records it there, so worn pieces have rows. The gate said
  yes, `_gearProvTake` removed the row and best-effort spliced the *stash*
  list — where a worn piece is not — and the seller kept wearing theirs while
  the buyer received a copy. Now refused with `worn`: a listing must never
  take what someone is using, and "unequip it first" is something a player
  can act on.
- **A piece parked in the mail passed.** The row was granted *before*
  delivery was attempted, and `_applyCreditToPs` declines on a full stash
  while the player is **online** — so the ledger claimed they held a piece
  sitting in their inbox. Closed at the source: the row is now granted only
  when the piece actually lands, and otherwise travels **inside** the durable
  inbox entry (just as durable, and impossible to sell from). The gate checks
  the mail anyway, because a gate that depends on another file's ordering
  staying correct is not a gate.

### Escrow moves the record, it does not flag it

`_gearProvTake(playerId, slot, gid)` returns `{piece, row}` — the
server's own copy of the piece plus its **detached** provenance row — and
removes the row from the player's ledger (and the piece from the server's
own stash list, where it happens to be present).

The row is *returned*, not flagged in place, so the caller escrows it
**inside the listing record** alongside the goods (rule 7: money at rest
lives in storage). That means:

- the store's existing wake-time rebuild is what recovers it — **no second
  recovery mechanism**, and no `escrowed: true` flag that could strand a
  piece forever if a listing record went missing;
- the same piece cannot be listed twice (`not_held`);
- **it cannot be equipped by name while it is on the shelf**, because
  `_gearProvPieceByRef` has no row to find. That closes the hole
  v2.3.2535 left open and named.

`_gearProvTake` is **synchronous** — one in-memory ledger edit plus a
fire-and-forget put — so a caller can validate and commit inside one
event (rule 9).

**Crash shape, stated because it is a real cost:** if the room dies
between the take and the listing record landing, the row is gone and the
piece reverts to `legacy` — usable, unsellable. That direction is
deliberate. The other ordering (write the listing, take the row after)
fails toward the piece existing in *both* places, which is a duplicate,
which is money.

### Handing it over

`_gearProvGrantRow(playerId, row)` — **async**, read-modify-write, because
the recipient may be offline. A sale hands the row to the **buyer**; a
cancel or an expiry hands it back to the **seller**. Same function,
because they are the same operation. The row keeps its id, so **the piece
keeps its identity across the counter** and nothing has to guess whether
two pieces are "the same piece" by name — the #643 trap, closed by
construction. Idempotent, so a settlement retry converges on one row.

### Gear rides `_creditPlayer` like everything else

New `kind: 'gear'`, payload `{field, piece, row}`. Handoff rule 4 — every
payout goes through `_creditPlayer`, which gets offline delivery, the
oplog idempotency stamp and the `inbox_delivered` notice for free. Rule
3's contract is honoured exactly as the weapon branch does it: a **full
stash returns false so the entry stays queued**, because `_saveRpg`
truncates these lists at the cap and pushing past it would silently
destroy the piece.

The row lands **first** and is awaited (there is no output gate holding a
message for an offline player, so an unawaited put could be lost to
eviction). A record without a piece converges on the next drain; a piece
without a record silently stops being sellable, which is worse. The
`minted` mark on a delivered piece is then **derived by asking the
ledger**, not taken from the payload — the same discipline as everywhere
else in this module.

### What #643 must change to use this

#643's `storegear.js` currently validates a listing against the stash by
index and keeps its own `_sv` mark and its own `_stGearReconcileWorn`.
Against this foundation it should instead:

1. **Take the listing request as `{field, gid}`**, not an index. An index
   into a drifting snapshot is what made "which piece did you mean" a
   guess in the first place.
2. **Gate on `_gearSellable(playerId, slot, gid)`** — it is the *whole*
   gate, worn/mail/cosmetic checks included, so do not add a second one
   beside it — and return its `reason` to the client so the Sell button can
   explain a refusal (`legacy` → "earned before the game kept receipts";
   `worn` → "take it off first"; `in_mail` → "still in the post";
   `cosmetic` → "outfits aren't sellable").
3. **Escrow with `_gearProvTake`** and store the returned `row` in the
   `store_listing:<id>` record next to the goods, exactly as `rec.weapon`
   is stored today.
4. **Deliver with `_creditPlayer({kind:'gear', payload:{field, piece,
   row}})`** on the goods leg — which replaces its hand-rolled gear
   delivery and its own `inbox_delivered` branch.
5. **Refund the same way** on cancel, expiry and the failed-write unwind:
   the same `{field, piece, row}` back to the seller.
6. **Delete `_stGearReconcileWorn` entirely.** Its job was to guess
   whether a stash entry was a stale copy of a worn piece. With ids there
   is nothing to guess: a piece is on the shelf or it is not, and the
   ledger says which.
7. **Delete the `_sv` mark and `carryProv`.** `prov` supersedes them and
   is derived rather than asserted.
8. Keep its client-side splice and its `inbox_delivered` `kind:'gear'`
   branch — both are still needed, because the client still does not read
   the echoed stash.

## Wire surface

| Direction | Field | Note |
|---|---|---|
| server → client (`player_state`, `loot_credit`, `quest_reward_stashed`) | `gid`, `prov` on each gear object | **v2.3.2544:** the client now stores `gid` when it ingests a piece, which is what makes `armorRef` able to fire at all; `prov` is still read by nobody (the "tell the player why" half is owed by the store UI) |
| server → peers (`state_sync`) | — | **cropped**: `gid` and `prov` are stripped from every player's copy before it goes out (v2.3.2537) |
| client → server (join seeds, `stats_update`) | `gid` | **looked up, never trusted**; `prov` is stripped unconditionally |
| client → server (`stats_update`, v2.3.2535) | `armorRef`, `legsArmorRef` | a bare id, or `null` to unequip; gated client-side on `caps.gearRef` |

A `gid` is not a secret: it is only usable by the player whose ledger
holds it. No new message type, so nothing is owed to `PRIVILEGED_EVENTS`.

v2.3.2534 shipped no caps flag, deliberately: nothing client-side gated
on it, and `caps-audit.test.mjs` treats an advertised-but-unread flag as
dead weight that *looks* like a live gate. v2.3.2535 adds `caps.gearRef`,
which the client genuinely reads.

### Rollback, and the one thing that would lose a piece

Deploying **forward** is safe in both orders — no client behaviour depends on
any of this. **Rolling the worker BACK** past v2.3.2536 is not, once a
producer exists: `_applyCreditToPs` returns `true` for a kind it does not
recognise, meaning "delivered, drop it", so an old worker draining an inbox
that holds a `kind: 'gear'` entry would discard the piece. Nothing produces
those entries yet, so there is nothing to lose today — but if #643 has
shipped, a rollback needs the inbox drained first.

## Deploy-order safety (rule 19/20)

| Order | Behaviour |
|---|---|
| new client, old worker | the client never sends `gid` (no client reads or writes it yet); nothing changes |
| old client, new worker | pieces come back carrying `gid`/`prov` in the echo, which today's client merges field-by-field and ignores; the client's own copies gain the fields and hand them back, where they are resolved — which is the intended path |
| new, new | as designed |

Both halves ship in either order. Nothing gates on anything.

## What this does NOT solve

Written here so PR 2 and PR 3 inherit them on purpose.

0. **This is the custody layer, not the listings.** #643 is what turns it
   into a Sell button; the checklist above is exactly what it must change.
1. **The ledger's FIFO cap.** At 256 recorded pieces the oldest row is
   dropped and `forgotten` is incremented, so a very long-lived
   character's oldest piece reverts to `legacy`. 256 is on the order of
   64,000 monster kills at the live drop rates, so it is unreachable in
   any realistic play today — but it is a real hole. The honest fix is
   to prune against what the player still actually holds, which needs
   PR 2 (the server owns equipping) and PR 3 (the stash is the
   authority) first.
2. ~~**Provenance only reaches the server's stash while adoption is
   open.**~~ **RESOLVED (v2.3.2540).** This said a minted piece in the
   client's bag could not reach the server's own `armorStash` once
   `gearStashCaptured` was set, because #640's capture was one-shot, and
   named #641 as the open PR that would reopen the door. **#641 has
   merged** (v2.3.2527): the claim is now read on *every* join, the stamp
   records rather than gates, and the merge below keeps that control flow
   exactly. So a minted piece in the bag reaches the server's list on the
   next login, on a stamped character or not. Worn pieces were never
   affected — they resolve on every join regardless.
3. **Weapons have the same hole and are not covered** (see the
   enumeration above).
4. **Cosmetics can never be proved** until something server-side mints
   one (see the enumeration above).
5. **A piece can still be worn and stashed at once.** Dedupe demotes the
   duplicate rather than deciding which is real, because deciding is
   PR 2's job (equipping names a recorded piece) and PR 3's (the stash
   is the authority for selling).

## Tests

`server/test/gearprov.test.mjs` (153 assertions). Structured around the
three ways this family of change has gone wrong here rather than around
the happy path:

- §1 the ledger's own shape: heals junk, caps FIFO, **counts what it
  forgot** rather than forgetting silently;
- §2 every mint path writes a row — quest shield, quest armour, both
  drop pieces through the real `loot_pickup` handler, the amulet forge —
  and the public pile carries neither `gid` nor `prov`;
- §3 the inbound **join** claim, driven through `webSocketMessage` and
  read back out of durable storage: a self-asserted `prov`, a real id on
  the wrong slot, an id never issued, and an id of `'__proto__'` all land
  `legacy`; a real id on the right slot returns *our* piece with the
  claimed grade discarded;
- §4 the inbound **`stats_update`** claim — the path that actually feeds
  the damage maths, and the shape of #643's missed strip;
- §4b **equipping by name** (v2.3.2535): a ref equips the server's own
  copy; a ref that names nothing, or names another slot, or is
  `'__proto__'`, keeps what is worn; a ref does **not** fall through to an
  object sent alongside it; both lanes obey the same two gates; the
  describe lane still equips a legacy piece, and an old client sending
  only objects is still understood;
- §5 one mint, one piece: three copies of one id give one proof and two
  demotions, the piece **count never falls**, worn beats stashed, and two
  genuinely different pieces with identical names both stay provable;
- §6 the owner's decision: a whole legacy wardrobe still works, keeps its
  multipliers, and is marked;
- §7 **no stamp**: an empty-handed join writes no "handled this player"
  mark, a later join still resolves, and a mint whose ledger write is
  lost to a crash comes back **usable and unproven** — never missing,
  never trusted — with the next mint recording normally;
- §9 **custody** (v2.3.2536): every `_gearSellable` reason; taking a piece
  returns the server's copy and its detached row, empties the ledger entry
  and the stash slot, and makes the piece unlistable *and* unequippable
  while it is on the shelf; an offline buyer's **record** lands durably at
  once while the piece waits in the mail and arrives at their next login
  under the same id; a settlement retry converges on one row; a cancel
  hands it straight back; a full stash keeps the delivery queued rather
  than eating it; a piece with no row arrives legacy rather than being
  refused; a bogus stash name (`'__proto__'`) and a bogus piece are
  dropped without wedging the mail; and selling one of two
  identical-looking pieces leaves the other alone;
- §8 the ledger never rides the room-wide `state_sync`.

§3 and §4 never call `stripProv`. #643's strip test passed while the hole
stayed open because it called the helper directly; every forgery
assertion here goes through the real message path.
