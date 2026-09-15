# Server-side gear stashes (v2.3.2523, repaired v2.3.2527) — spec + attach points

> **v2.3.2527** is the repair pass from the review of PR #640. It fixes
> the capture being one-shot and lossy (finding 1), armour grades being
> destroyed on adoption (finding 2), the amulet list accepting a claim no
> honest client sends (finding 3), and this spec's migration-numbering
> box contradicting the code (finding 6) — and, because v2.3.2523
> merged and deployed before this repair, it also **heals** the records
> that version has already written: a stamped-but-empty capture reopens
> and a stripped armour grade is backfilled on the player's next join.
> Findings 4 and 5 are
> deliberately **not** fixed here and are written down under *What this
> does NOT solve* for M3 to inherit on purpose rather than by accident.

The five gear lists a player owns but is not wearing now live in the rpg
blob, on the server. Phase 2 of the general-store lane (backlog
§2.2, M1 → **M2** → M3): it moves the *holding*, not the selling.

## Why

`docs/specs/general-store.md` states the blocker in its own scope table:
the store can list stackables and stash weapons and nothing else, because
armour, legs, shields, cosmetic gear and amulets were **client-local**.
Handoff rule 16 forbids taking custody of a value blob the client
supplied, and escrow means custody — so the server can only escrow what
it already holds by reference. It held one worn piece per slot and
nothing else.

wsClient's shield-rescue comment recorded the reason it had stayed that
way: *"there is no server-side shield stash (handoff rule 1 forbids a new
rpg-blob field)"*. Rule 1 forbids an **ad-hoc** field (TRAPS #2); a field
added to `_saveRpg`'s fixed list is the sanctioned route, and is exactly
how `goldNuggets`/`goldBars` shipped in v2.3.1192. This slice takes that
route.

**Nothing a player can do changes in this version.** No new op, no new
wire verb, no store change, no client UI. `server/src/store.js` is not
touched. The stashes the player sees are still the ones in their browser;
the server simply now has a copy of its own.

## The fields (rpg blob, fixed field list — `persistence.js`)

| Field | Entries | Client source |
|---|---|---|
| `armorStash` | gear blobs (chest) | `rpg.armorStash` (v2.3.228) |
| `legsStash` | gear blobs (legs) | `rpg.legsStash` (v2.3.1701) |
| `shieldStash` | gear blobs (shield) | `rpg.shieldStash` |
| `gearStash` | `{slot, gearId, name}` cosmetic layers | `rpg.gearStash` (gearCatalog.js) |
| `amuletStash` | amulet blobs (`_sanitizeAmulet` shape) | **none, and none is accepted** (v2.3.2527) |
| `gearStashCaptured` | `true` once a real, complete capture has landed — a record, not a gate (v2.3.2527) | — |

No new storage prefix: these ride `rpg:<playerId>`, whose registry row in
`ARCHITECTURE-HANDOFF` rule 2 now names them.

`amuletStash` ships empty and on the same rails because an amulet has no
unequip flow today (`InventoryPanel.jsx`: *"amulet/cape have no unequip
flow, so no button"*). Adding it now costs one always-empty array; adding
it later would cost a second migration and a second field-list edit —
and a field-list edit that is forgotten is how a slot's contents vanish
on the next save (the v2.3.1679 legs lesson).

> **v2.3.2527 (review finding 3): the amulet list has no seed key.**
> v2.3.2523 shipped `rpgAmuletStash` in `GEAR_STASH_SEED_KEYS` and the
> adoption loop read it — so a modified client could hand itself up to
> `GEAR_STASH_CAP` amulets which, being validated against the real tier
> and gem tables, came out as *legitimate* top-tier ones: the most
> expensive thing in the forge. Nothing reads the list today so nothing
> was lost, but a seed key for a list with no client source is a claim
> the server should never have been willing to hear. The field and the
> migration stay; only the ear for it is gone. `rpgAmuletStash` remains
> in `JOIN_RPG_INGEST_ONLY` so that dropping the ear does not instead
> let the key fall through onto `playerState` and out on the room-wide
> `state_sync`. When an unequip flow ships, the key comes back in that
> same PR.

Cap: `GEAR_STASH_CAP = 32` per list, applied at ingest, at merge and at
save. The client has no cap on these lists at all, so this is the first
bound they have had; it is sized to be unreachable in honest play (four
times the weapon-stash cap). A player somehow holding more keeps their
whole local list — this slice takes nothing away — but only the first 32
per list become server-known.

## Migration v16 — `gear-stash-fields`

Shape only: every stored blob gets the five containers as arrays of plain
objects, capped; non-arrays and junk entries heal to empty. Idempotent,
partial-tolerant, fail-open like every entry in the registry.

It deliberately does **not** clamp values (that lives on the join path
with every other clamp — the v2.3.1104 heal-on-load posture) and does
**not** adopt anything (a migration cannot see the client).

> **Numbering.** This is **v16, not v15** — and that is settled, not
> pending. PR #624 (the attributes restructure) claimed v15 while this
> slice was in flight; **#624 has merged, so v15 is on `main`** and the
> sequence runs 1 … 15, 16 with no gaps. `migrations.js`'s own comment
> says the same. Nothing here needs doing before this merges. *(Noted
> because an earlier draft of this box said #624 was still open and
> should merge first; it was left behind when it merged, and a spec that
> contradicts the code misleads the next reader — v2.3.2527, review
> finding 6.)*

## Adoption (`_gearStashAdoptOnJoin`, `gearstash.js`)

Called from `_handleJoin` for **both** branches (stored record and
first-connect bootstrap), immediately after `_gemsAdoptOnJoin` and before
the join path's final `_saveRpg` — the same seam, for the same reason:
the stamp must ride the same put as the data.

1. **Always** — the server's own copy is loaded and healed (stored
   clamped non-strict; a first connect starts empty).
2. **Always** — whatever the client offers is folded in by **multiset
   union**. v2.3.2527: this is *not* gated on the stamp. See below.
3. **Stamp** — `gearStashCaptured` is set only when the merge actually
   **took** something *and* the cap did not cut the claim short. It is
   monotone: once true it stays true.

### v2.3.2527 — the door stays open (review finding 1)

v2.3.2523 made this a **one-shot** capture, gated on the stamp, and set
the stamp on the mere *presence* of a claim. Together those lost gear,
silently and permanently, for ordinary players:

- **A browser that does not have your gear burns the capture.** Sign in
  on a second device with your Login Key, use a private tab, clear
  Safari's site data, reinstall — that browser has no stash, the old
  client sent four empty arrays anyway, and the server stamped
  *captured* over a wardrobe it had never seen. Reproduced directly in
  review: two plates and a shield gone from the server's record, for
  good.
- **A partial capture stamped as done.** Same ending when the client's
  shared seed budget ran out part-way down the four lists, or when a
  list overflowed `GEAR_STASH_CAP`.

This is the #615 shape after all — a broken record that *looks* healthy
on the next wake, so nothing ever retries it. The crash half was closed
in v2.3.2523; this half was not. Three changes close it, and all three
are needed:

1. **The stamp no longer gates adoption.** The merge runs on every join.
   This is safe *by construction*, not by care: the merge is a multiset
   union, so re-running it against a claim already held adds nothing.
   Idempotence is exactly the property that lets a door stay open — it
   is why this is the right fix and not merely a wider one.
2. **The stamp records, it does not authorise.** It now means what it
   says: a real, complete capture landed. A device with nothing to offer
   writes nothing at all rather than writing *"this player owns
   nothing"*.
3. **The client omits an empty list's key** (`wsClient.js`), so *"I have
   nothing"* and *"I am not telling you about this"* stop arriving as
   the same four empty arrays.

A list the cap truncates therefore leaves the record **visibly open**
rather than quietly closed, and the client's budget running out costs a
player nothing permanent: the next join that can carry those pieces
adopts them.

### The two ways this could lose a player's property

**Adopt twice.** #615's refund/delete crash window paid a listing out
twice; the same shape here duplicates armour on every reconnect. Closed
by the merge being a multiset union: the count for one signature is
`max(held, claimed)`, never the sum, so `merge(merge(a,b),b) ===
merge(a,b)`. It converges whether it runs once, twice, or after a
half-written restart. Signatures are the client's own
(`wsClient.js _shSig`: name|gearBase|tierMult|tier) so both sides call
the same two pieces the same piece — and genuine duplicates survive,
because counts are compared, not signatures.

**Lose the stash.** A capture marked done for a browser whose gear it
never saw throws that wardrobe away for good. v2.3.2523 closed only the
narrowest version of this (a client that predates the seed, the
deploy-order case: the worker deploys on merge, Pages deploys separately,
old tabs stay open for days) and shipped three wider ones. v2.3.2527
closes the rest — see *the door stays open* above.

`market.test.mjs` S8's crash cases are mirrored in
`server/test/gearstash.test.mjs` §4: the save is made to throw, the
in-memory adoption is proven to have reached storage nowhere, and the
retry in a fresh room is proven to land exactly one copy — plus the
half-written case (stash stored, stamp lost) converging rather than
doubling.

## Wire surface

| Direction | Field | Note |
|---|---|---|
| client → server (`join.data`) | `rpgArmorStash`, `rpgLegsStash`, `rpgShieldStash`, `rpgGearStash` | sent every join; **ingest-only**; a key is **omitted entirely when its list is empty** (v2.3.2527) |
| client → server (`join.data`) | `rpgAmuletStash` | **refused** — excluded from `cleanJoinData` and read by nothing (v2.3.2527) |
| server → client (`player_state`) | `armorStash`, `legsStash`, `shieldStash`, `gearStash`, `amuletStash` | echo; no client reads them yet |

No new message type, so nothing to add to `PRIVILEGED_EVENTS`.

**Ingest-only** means what it says: unlike every other `rpg*` seed, these
five are excluded from `cleanJoinData` (`JOIN_RPG_INGEST_ONLY`,
`join.js`) and never reach `playerState`. `getAllPlayerData()` spreads
`playerState` into the `state_sync` every other player receives, so
without that exclusion one player's whole wardrobe would ride a room-wide
broadcast for fields no peer renders. `_handleJoin` reads them straight
off `msg.data` instead. Bounded by `MAX_INBOUND_BYTES` (16 KB, whole
frame) and then by `GEAR_STASH_CAP`.

## Deploy-order safety (handoff rule 19/20)

**No caps flag, deliberately.** A flag exists to gate a client path;
nothing client-side gates on this, and `caps-audit.test.mjs` treats an
advertised-but-unread flag as dead weight that *looks* like a live gate.
M3 adds one when there is an op to gate.

| Order | Behaviour |
|---|---|
| new client, old worker | unknown join keys are dropped by the old worker's allowlist; the client keeps its local stashes exactly as before |
| old client, new worker | no seed → nothing adopted, **no stamp**, echo carries empty lists the old client ignores (`player_state` is merged field-by-field behind `'x' in msg.payload` guards, never wholesale). An old client that sends four *empty* arrays is equally harmless since v2.3.2527: an empty claim adopts nothing and stamps nothing |
| new, new | adopted on the first join that actually carries gear, and on every join after — the union means a repeat claim adds nothing (v2.3.2527) |

The echo can therefore ship before any client reads it, which is the
v2.3.1624 raw-stats pattern.

## Armour grades survive adoption (v2.3.2527, review finding 2)

`sanitizeGearPiece` originally copied `_sanitizeWeapon`'s **strict**
posture wholesale and deleted `quality` off a client-supplied piece.
That was wrong for armour, and wrong destructively: adoption is the only
moment the server ever sees a legacy wardrobe, so every graded plate
anyone had earned would have been written down ungraded, for good — and
M3 prices listings off the server's copy (rule 16), so every pre-existing
piece would have priced as plain.

Quality is not decoration on armour. `_armorDrMult` (`combat.js`,
v2.3.1925) multiplies the piece's **tier** by the grade — an Elite plate
really does stop more damage — and the item card mirrors it to the digit.

It is safe to keep for the exact reason the weapon strip is not: the
weapon path strips because quality feeds the anti-cheat *damage* ceiling,
so a forged `godly` would raise its own cap. Armour has no such loop —
`_armorDrMult` applies the identical `[0, 8]` clamp **after** multiplying
by the grade, with the 75% DR cap above that as the last word, so no
grade can escape either. `grids.js`'s `stats_update` already accepts a
client-supplied armour `quality` on the path that actually feeds combat,
for that same reason; this is the same value arriving by a colder route
into a list nothing wears. Both modes now apply the **enum clamp** from
`_sanitizeWeapon`'s non-strict branch instead: a grade `QUALITY_GRADES`
does not know is dropped. `hardness` and `temper` stay stripped in strict
mode — those really are forge-minted (v2.3.1141).

**And the grades already destroyed heal.** v2.3.2523 merged and deployed
before this repair did, so armour sits on real stored records right now
with its grade stripped. Re-opening the door does not fix that on its
own, and the reason is worth stating precisely: `stashSig` keys armour on
`name|gearBase|tierMult|tier` and deliberately **not** on quality — a
grade must not make one plate look like two — so the merge recognises the
player's graded plate as a plate it already holds, takes no surplus, and
the stripped copy would sit there ungraded forever. A matched pair
therefore **backfills**: if the server holds the piece with no grade and
the claim carries a valid one, it takes the grade. One-directional and
absent-only, so a claim can never overwrite or downgrade a grade the
server already has; idempotent, like everything else on this path; and it
grants a client no power it did not already have, since it could always
claim a whole graded piece instead (finding 4).

## What this does NOT solve

The client is still the authority for its own stashes: it equips and
unequips locally and tells the server nothing. So after adoption the
server's copy is a **point-in-time snapshot** and drifts as the player
rearranges their gear. That is correct for this slice — nothing consumes
the server copy yet — and it is M3's first problem: a listing path has to
be the writer (escrow removes the piece server-side), and the client has
to read the echoed list instead of its own. Do not add a
client-tells-server sync verb here; the direction of travel is
client-local → server-owned (rule zero), not a two-way mirror.

### ⚠ Two things M3 inherits — read these before writing a listing path

Both were raised in the review of #640 and left **deliberately unfixed**
in this slice (neither costs anything while nothing reads these lists),
and both become real money the moment the store can sell from them.

**1. A player can claim gear they never earned.** The claim is checked
for *shape*, never for *ownership*: tier multipliers are clamped, forge
fields stripped, amulets refused outright — but nothing anywhere asks
whether the player ever had the item. Up to `GEAR_STASH_CAP` per list.
This is the same posture the weapon stash has used on first connect for
a long time, and it is a deliberate trade for a migration that has to
accept a wardrobe it cannot verify. Two things make it wider than that
precedent:

- it reaches **every existing character**, not only brand-new ones;
- **it never closes.** v2.3.2523's one-shot gate did not close it either
  (a brand-new character gets a free injection too, and new characters
  are free to make); v2.3.2527's open door simply stops pretending
  otherwise.

> **Whoever builds the store listings must not treat "it is in the
> adopted list" as proof of ownership.** A sellable list needs a
> provenance the server minted, not a list the client handed over.

**2. A piece equipped after the capture is recorded twice.** The client
never tells the server when you equip something, so a piece you put on
*after* adoption is on the server's books in **both** places: as the
armour you are wearing (`ps.armor` / `ps.legsArmor` / `ps.shield`) and
still sitting in the stash list. That is not merely staleness — it is a
**duplication route**: the moment anything sells from that list, a player
can sell the armour off their own back and keep wearing it. Escrow in M3
must reconcile the worn slot against the list, or make the server the
writer for equip/unequip first.

## Tests

`server/test/gearstash.test.mjs` (60 assertions): migration shape +
idempotence + one re-put; adoption and survival of the fixed field list;
re-adoption after a restart; the stamped record ignoring a later, larger
claim; the crash window in both halves; the merge's own algebra
(surplus-not-sum, idempotence, cap, `'__proto__'` as a piece name —
TRAPS #6); empty / malformed / never-had-gear characters; the
no-seed-no-stamp deploy-order case and a later adopting join; and the
ingest-only property asserted against `getAllPlayerData()`.

§8 is the v2.3.2527 review repair, and each case is one the old code
passed only because no test asked:

- **a pre-existing character joining from a browser with an empty
  stash** — the gap that hid finding 1, since the original empty-claim
  test used a brand-new character id where *"they own nothing"* is
  actually true. Both client shapes (four empty arrays, and no keys at
  all), then the main phone being heard again afterwards, then a piece
  it had never sent still being adopted;
- **a claim that overflows the cap**, asserting 32 land *and* that the
  stamp does not — including in storage, so the record stays visibly
  open — and that a later claim which fits does stamp;
- **an amulet list arriving from a client**, asserting the server
  refuses it, that it never reaches storage, that the other lists still
  adopt, and that the refused key does not leak onto `playerState`.

§6 additionally asserts that a real armour **grade** survives adoption
(finding 2) and that an empty claim does not stamp (finding 1a); §3's
"stored wins forever" case is now the open door taking a later claim's
surplus.
