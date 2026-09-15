# Server-side gear stashes (v2.3.2523) — spec + attach points

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
| `amuletStash` | amulet blobs (`_sanitizeAmulet` shape) | **none yet** |
| `gearStashCaptured` | `true` once adoption has run | — |

No new storage prefix: these ride `rpg:<playerId>`, whose registry row in
`ARCHITECTURE-HANDOFF` rule 2 now names them.

`amuletStash` ships empty and on the same rails because an amulet has no
unequip flow today (`InventoryPanel.jsx`: *"amulet/cape have no unequip
flow, so no button"*). Adding it now costs one always-empty array; adding
it later would cost a second migration and a second field-list edit —
and a field-list edit that is forgotten is how a slot's contents vanish
on the next save (the v2.3.1679 legs lesson).

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

> **Numbering.** This is **v16, not v15.** PR #624 is open and unmerged
> and claimed v15 for the attributes restructure; shipped entries are
> appended, never renumbered. If #624 merges after this, `MIGRATIONS`
> runs 14 → 16 for a while and a blob stamped 16 will never run a v15
> that arrives later — so #624 should merge first, or its entry needs a
> fresh number.

## Adoption (`_gearStashAdoptOnJoin`, `gearstash.js`)

Called from `_handleJoin` for **both** branches (stored record and
first-connect bootstrap), immediately after `_gemsAdoptOnJoin` and before
the join path's final `_saveRpg` — the same seam, for the same reason:
the stamp must ride the same put as the data.

1. **Always** — the server's own copy is loaded and healed (stored
   clamped non-strict; a first connect starts empty).
2. **Once** — if the stored record carries no `gearStashCaptured` stamp,
   the client's claim is folded in by **multiset union**.
3. **Stamp** — set only when the payload actually carried at least one
   stash array.

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

**Lose the stash.** A stamp written when nothing was adopted burns the
one-time capture forever. That is what would happen against a client that
has not shipped the seed yet (the worker deploys on merge; Pages deploys
separately; old tabs stay open for days). Closed by stamping only on a
real claim: no claim, no stamp, next join adopts.

`market.test.mjs` S8's crash cases are mirrored in
`server/test/gearstash.test.mjs` §4: the save is made to throw, the
in-memory adoption is proven to have reached storage nowhere, and the
retry in a fresh room is proven to land exactly one copy — plus the
half-written case (stash stored, stamp lost) converging rather than
doubling.

## Wire surface

| Direction | Field | Note |
|---|---|---|
| client → server (`join.data`) | `rpgArmorStash`, `rpgLegsStash`, `rpgShieldStash`, `rpgGearStash` | one-time seed; **ingest-only** |
| server → client (`player_state`) | `armorStash`, `legsStash`, `shieldStash`, `gearStash`, `amuletStash` | echo; no client reads them yet |

No new message type, so nothing to add to `PRIVILEGED_EVENTS`.

**Ingest-only** means what it says: unlike every other `rpg*` seed, these
four are excluded from `cleanJoinData` (`JOIN_RPG_INGEST_ONLY`,
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
| old client, new worker | no seed → nothing adopted, **no stamp**, echo carries empty lists the old client ignores (`player_state` is merged field-by-field behind `'x' in msg.payload` guards, never wholesale) |
| new, new | adopted once, on the first join |

The echo can therefore ship before any client reads it, which is the
v2.3.1624 raw-stats pattern.

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

> **v2.3.2528 — M3 has shipped the escrow half**
> (`docs/specs/general-store.md`, "Gear listings"). It did *not* make the
> client a reader of the echo; that is still open. Two consequences of
> the drift above became live problems the moment a piece could be sold,
> and both are handled there rather than here:
> - **A piece equipped after adoption is recorded twice** — once as the
>   worn slot, still in the stash — so escrowing from the stash sells the
>   armour off the player's own back. `_stGearReconcileWorn` (storegear.js)
>   removes one matching entry per worn slot immediately before escrow.
>   `gearStash` has no worn counterpart on the server at all, so cosmetics
>   are the one case that cannot be reconciled.
> - **The two lists are in different orders**, so a gear listing names its
>   piece with a *selector* the server turns into a `stashSig` against its
>   own copy, never with an index.
>
> And the open trust boundary below is now load-bearing rather than
> theoretical: the store accepts the risk deliberately behind
> `caps.storeGear`, which live-ops can switch off without a deploy. Read
> "Being in the stash is not proof of ownership" in the store spec before
> changing anything about adoption.

## Tests

`server/test/gearstash.test.mjs` (33 assertions): migration shape +
idempotence + one re-put; adoption and survival of the fixed field list;
re-adoption after a restart; the stamped record ignoring a later, larger
claim; the crash window in both halves; the merge's own algebra
(surplus-not-sum, idempotence, cap, `'__proto__'` as a piece name —
TRAPS #6); empty / malformed / never-had-gear characters; the
no-seed-no-stamp deploy-order case and a later adopting join; and the
ingest-only property asserted against `getAllPlayerData()`.
