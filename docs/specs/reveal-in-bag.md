# A mystery piece waits in your bag until you reveal it (v2.3.4012)

The owner, 2026-11-01: *"Mystery item launched automatically. Should go to
inventory then have reveal option."*

Read with `docs/specs/rarity-reveal.md` (the grades, the ladder, the overlay)
and `docs/specs/sealed-gear.md` (the larger plan this is the first half of).

## In plain words

**Before.** A monster drops an Iron Torso, Iron Greaves or Iron Great Sword
whose grade is Rare or better. The pile shows a "?". The moment you picked it
up, the reveal played: the "?" spun and landed on Rare (blue), Elite (orange)
or Godly (rainbow).

**Now.** Picking it up puts it in your bag **still a "?"**: the piece's own
picture as a dark silhouette, a "?" over it, and the rare-blue edge (the pile
only ever promised "rare or better"). Tap it: its card says "Rare or better"
and has two buttons:

- **Reveal**: the card closes and the same reveal you know plays. When it
  lands, the piece in your bag shows its grade.
- **Equip**: reveals it first (the same reveal), then puts it on once the
  grade has landed. Nothing you wear is a secret: your armour's grade shows on
  your body and changes the fight's numbers.

Until it is revealed a "?" cannot be sold, traded, salvaged or given an
essence: its card offers only Reveal and Equip, and the trade, salvage and
market lists leave it out.

**What does not change.** Normal drops (about 9 in 10) arrive as they do
today. Forge pieces, the daily chest's and quest gear reveal as they do
today. A sword picked up into a full weapon bag is sold on the spot and shows
its grade at once, as before. Pieces you already own are untouched.

**The switch.** `revealbag: false` in the live flags puts the old behaviour
back: pickups reveal at once, and any "?" a player still holds is revealed
(with its ceremony) the next time they sign in. Revealing always works,
switch or no switch, so nobody is left holding a "?" they cannot open.

## How it works

### Where the grade lives

The grade is still rolled at the kill (index.js `_rollArmorDropsForKill`,
`_rollIronWeaponForKill`). At the pickup (`_handleLootPickup`) a piece whose
grade is a mystery grade gets a mark, `unrevealed: 1`, on the **server's own
copies**, beside its `quality`:

| Piece | The server's copy | Storage |
|---|---|---|
| Iron Great Sword | the `ps.weaponStash` entry (the phone mirrors this list from the `player_state` echo) | `rpg:<pid>` |
| Armour | the provenance row's `p` (every inbound path rebuilds from it) and the server's stash copy with the same `gid` (adopted at join) | `gear_prov:<pid>`, `rpg:<pid>` |

The phone's bag holds the piece **without** `quality`, with `unrevealed:
true` (and, for armour, its `gid`).

### Only for a phone that can show it

The worker and Pages deploy separately. A phone that says `rb: 1` in its join
(`session.revealBag`) is one that draws a "?" and can open it. Any other
session gets today's at-once reveal, and a join from a phone without `rb`
opens everything that player still holds marked (so a "?" picked up in a new
tab is revealed, not shown as a Normal, in an old one).

### The one public face

`revealPublic(piece)` (`server/src/revealbag.js`) returns a copy with
`quality` deleted and `unrevealed: true`; an open piece comes back unchanged.
A strip, not a pick (the reason `_mysteryPiece` gives). It is used by:

- `loot_credit`: `armor[]` and `weapon`; `reveals` leaves the marked piece out;
- `player_state` (`_sendPlayerState`, persistence.js): `weaponStash`,
  `armorStash`, `legsStash`, and the worn slots (never marked, passed through
  anyway). The v2 delta compares the public forms, so an opened piece is a
  change and goes out.

### The mark is the server's

- Set in one place: the pickup (`_revealBagMark`), and the test lever.
- Cleared in one function: `_revealBagOpen`.
- Stripped from every claim: `stripProv` (gearprov.js) for an armour claim
  with no recorded id; `_sanitizeWeapon`'s strict branch for a weapon. A claim
  WITH a recorded id is rebuilt from its row, so its mark is the row's.

### Revealing

`reveal_item {field: 'armorStash'|'legsStash', gid}` or `{field:
'weaponStash', idx, name}` (handled on purpose in `_onMessage`; paced on
`PACE.RPG`; `field` matched by value). `_revealBagOpen`, in one synchronous
run: clears the mark on the row and every copy carrying its id (or the stash
entry), grants the achievement the grade earns (`_achvOnPiece(..., 'reveal')`),
saves the ledger and the record. The answer, `item_reveal` (PRIVILEGED), goes
to the holder:

```
{ ok: true, field, gid | idx, name, piece, reveals }   reveals: loot_credit's shape
{ ok: true, ..., piece, reveals: null, already: true } it was already open (two tabs)
{ ok: false, reason }                                  busy | bad | not_held | changed
```

The phone puts the grade on its bag copy and pushes `reveals` onto the same
`revealBus` the pickup used to feed (`src/game/revealBag.js`
`applyItemReveal`). The bag keeps drawing the piece as a "?" until the
overlay lands (`shownUnrevealed`), because a blade's opened copy arrives on
the echo right behind the answer.

**Achievements.** At the pickup a marked piece earns only what its grade does
not say (the Iron Great Sword itself); Elite piece, Godly and Elite iron are
earned at the reveal. Otherwise "Elite piece!" would pop, and peers would read
your rarest, before the "?" was opened.

### Equipping reveals

- Armour: `stats_update` (`armorRef` or the piece) reaches `_gridsApplyArmor`
  (grids.js); after its gates say yes, a marked piece is opened
  (`_revealBagOnWear`) and `item_reveal` sent, then worn.
- The blade: `equip_request` (gear.js `_handleEquipRequest`), the same.
- The phone asks first: Equip on a "?" sends `reveal_item` and puts the piece
  on when the overlay's last stage lands (`revealBus` entry `onDone`, with a
  9 s limit so a ceremony that never plays never holds the equip back).
- A join opens anything worn that is still marked.

### The ledger cap

`GEAR_PROV_CAP` (256) drops the oldest row. A marked row is the only copy of
that piece's grade, so `capProvLedger` drops the oldest OPEN rows first, and a
marked row only if every row is marked.

### Deploy order and rollback

| Order | Behaviour |
|---|---|
| new phone, old worker | `rb` ignored; pickups reveal at once; no `caps.revealbag`, so no Reveal button |
| old phone, new worker | no `rb`: pickups reveal at once; anything marked is opened at its join |
| new, new | the "?" in the bag |

No migration: the field is optional and absent means open. `GEAR_PROV_V`
stays 1 (bumping it would make a rolled-back worker refuse every ledger). An
older worker ignores the mark: a rollback would show held grades in the echo
early. Nothing is duplicated or lost.

## What this does not do (yet)

The server doors that sell, trade, salvage or put an essence on a piece
(store.js, storegear.js, trade2.js, market.js, salvage.js) are not changed:
the phone does not offer them for a "?". A modified phone that forces one
through learns only its own piece's grade (which Reveal would show it), and
the piece keeps its mark wherever it goes, so whoever holds it can still open
it. Selling and trading a "?" on purpose, with every one of those doors
keeping the secret, is `docs/specs/sealed-gear.md`.

## The switch and the cap

- `caps.revealbag` (join.js `state_sync.caps`; `CAP_GATES`): the phone offers
  Reveal only against a worker that says this.
- `revealbag: false` (live flags, lower case): un-advertises the cap, pickups
  reveal at once, and every marked piece is opened at its holder's next join.
  `reveal_item` keeps working.

## Tests

- `server/test/reveal-bag.test.mjs`: the public face; a pickup with no grade
  on the wire in any frame (a frame scanner) and the grade kept server-side; a
  rejoin keeps it; reveal once, `already`, the refusals, another player's id;
  the one synchronous run of writes; equipping reveals (armorRef and
  equip_request); no forged "?"; an old phone; the kill switch; the ledger
  cap; the test lever.
- `tools/qa/mp/mp-revealbag.mjs` (a Wheel phone): a real kill and pickup
  (`/dev/killroll`, the grade by `/dev/revealbag`), the "?" tile, its card,
  Reveal, the overlay, the graded tile.
- The UI review's `bag-unrevealed` state (the "?" tile and its card).

The test lever: `POST /dev/revealbag {playerId, grade}` (the next
mystery-capable drop's grade, once) or `{playerId, grade, give: 'armor' |
'legsArmor' | 'weapon'}` (a "?" in the bag now, through the pickup's own
credit).
