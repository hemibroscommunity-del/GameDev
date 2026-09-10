# The quest reward that did not fit

**v2.3.2420.** Server fix + pin.

> Owner, 2026-09-09: *"Also didn't receive bow and staff after completing first
> quest."* — and, on the same character: *"It also had a bug where it didn't
> receive the items for the first quest so I had to reset the character."*

## What happened

`WEAPON_STASH_CAP` is **8**. `tut_1` pays a **bow** and a **staff** at turn-in,
and a **greatsword** on accept. The character was old enough to be carrying
eight weapons already.

`_grantQuestItem`'s weapon branch:

```js
if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return false;
```

and its caller:

```js
for (const _it of _items) { this._grantQuestItem(ps, _it); }   // return value discarded
```

So: the quest went to `turnedIn`, the gold and XP paid, and **both weapons
were deleted**. A turned-in quest cannot be retried, so there was no way to
recover them. Resetting the character was the only exit — which is what the
owner did.

Nothing said anything. Not a popup, not a log line, not a wire event.

## This exact class was already fixed once — for armour

v2.3.1687, from the owner's *"I turned in the fire goblin remnants and never
received the quest reward"*: an occupied armour slot refused the grant and
returned false in silence. The fix routed it to the client's bag and announced
it with `quest_reward_stashed`.

**Weapons were left behind.** Same bug, same function, same discarded return
value, two years of version tags apart.

## The fix

The refused weapon now goes through **`_creditPlayer`** — handoff **rule 4**,
*"all payouts go through `_creditPlayer` … never hand-roll an inbox write"*.
Online with a full stash, `_applyCreditToPs` returns false and the entry parks
in `inbox:<id>`; the next join drains it once a slot is free. Weapons that
still don't fit stay queued. **Nothing is lost, ever.**

Three pieces:

1. **`_grantQuestItem`** records the minted weapon on `ps._questWeaponUnfit`
   instead of dropping it, and still returns false — so no caller's semantics
   change. This is **in-memory scratch**: `_saveRpg` rewrites from a fixed
   field list (**rule 1**), so it cannot reach the blob, which the pin asserts.
2. **`_questDrainUnfitWeapons(playerId, ps, tag)`** drains it, one
   `_creditPlayer` per weapon, under a deterministic opId
   `questitem:<pid>:<tag>:<i>` stamped in `oplog:` (**rule 5**) — so a
   reconnect or crash-retry converges instead of minting a second bow.
3. Both **`_handleQuestTurnIn`** and **`_handleQuestAccept`** call it. The
   accept path had the identical hole for `grantOnAccept`'s sword.

### Why awaiting here is safe

Both handlers became `async` and are now awaited in `webSocketMessage` —
which is what `_handleGuildTurnIn`, `_handleTrade2Confirm` and a dozen others
already do in the same switch.

Every await inside is a **storage** await (`_opSeen`, `_opStamp`,
`_inboxAppend`), and storage awaits hold the input gate **closed** (**rule 9**).
No other event interleaves, so nothing lands between a validation and the
commit that depends on it. There is no cross-DO fetch anywhere on this path.

### No new wire type

The client's `quest_reward_stashed` handler is armour-specific — it routes into
`armorStash` / `legsStash`. Reusing it for a weapon would put a bow in the
armour bag. The delivery notice the player does get is the existing
`inbox_delivered` at the next join, which every client version already handles,
so this is a **server-only** change with no deploy-order gate needed.

The honest limitation: **the player is not told at the moment it happens.**
They are told when it arrives. Fixing that needs a new privileged event and a
client handler — worth doing, out of scope here.

## The pin

`test/tutorial.test.mjs`. The block was already titled *"Occupied slot + full
stash: the grant fails but must NOT eat the rest"*, and every assertion in it
passed before this fix: the stash stayed at cap, the equipped gear survived,
the gold paid, the quest completed. **All of that was true while both weapons
were being deleted.** Seven assertions added:

- the bow is in the inbox, read from **storage** — not from a return value,
  because storage is what survives the deploy rule 4 exists for
- so is the staff (tut_1 pays both; one entry would not prove it)
- so is the sword from the **accept** path
- each carries a forge-shaped weapon (`type`, `gearBase`, `tierMult`), not a
  bare name
- each under a deterministic opId, stamped in `oplog:`
- the scratch never reaches the saved blob

**Mutation-tested.** Restore the one-line silent drop and exactly three
assertions go red with an empty inbox `[]`; everything else stays green — the
fix is additive and the surrounding behaviour is unchanged.

Full server suite: **ALL PASS**.

## One thing the fix changed about the test, and why it is not a weakening

The gold assertion was `ps.coins === QUEST_REWARDS.tut_1.gold` — an absolute.
Now that the handlers await storage, an await is where the room's own floating
background work gets to run, and `_arenaEntrySweep` refunds a 100g entry for
this player mid-turn-in. The absolute read that as the quest paying 125.

The property being pinned is *"a failed item grant still pays the gold"*, which
is a **delta**. It is measured as one now, and the block settles pending sweeps
before zeroing the purse so the coins measured are the quest's and nothing
else's — under either branch. Worth knowing generally: **an absolute-value
assertion in this suite is fragile**, because the room credits in the
background and any new await moves where that lands.

---

# v2.3.2421 — three defects an adversarial pre-merge review found in the above

The v2.3.2420 change was green, mutation-tested, and about to auto-deploy to the
live worker. Two independent review lenses, given different briefs, found the
same two defects; a third fell out of writing the pins. All three are corrected
here.

## 1. The opId named an array index, not a weapon (high)

```js
opId: 'questitem:' + playerId + ':' + tag + ':' + i    // i = the loop counter
```

A deduped credit returns `'dup'` and **drops the weapon** — the exact silent
loss this whole change exists to stop. The index says nothing about *which*
weapon it is, so:

- change the reward list and index 0 names a different weapon than the stamp in
  `oplog:` was written for. **tut_1's staff already moved here from tut_2** at
  v2.3.1692, so this is not hypothetical.
- a weapon only fails to fit *sometimes*. Granted with a full stash it inboxes
  at index 0; free a slot, and the next quest's first unfit weapon takes 0 too.

Now the key is the weapon's own identity — `type.gearBase` — with an occurrence
counter scoped **within** that identity, which is the only thing the index was
ever legitimately for (two identical weapons in one reward, where the second
must not dedup against the first). Content first means a shifted position is
harmless: a moved weapon carries its key with it. Sanitised, because it lands in
a storage key.

## 2. The stamp outlived the character (high)

Stamps are keyed by **player id**, and a restart does not change it — the
passphrase *is* the character. So a restarted character walks the tutorial
again, turns tut_1 in, and the credit finds its own stamp from the **previous
life**, returns `'dup'`, and the bow and staff vanish.

That is the original bug, reintroduced for precisely the player who already hit
it hard enough to restart — **which is the owner**, and which is how the
severity was judged.

`_resetCharacterData` now sweeps `oplog:questitem:<pid>:`. Deleting is the
honest repair rather than adding a generation counter: a restarted character
*has* received nothing, so the correct state of its payout journal is empty.
Scoped to that prefix and that pid, so no other producer's idempotency is
touched. Best-effort — a failed sweep must not block the wipe, since a stamp
only ever causes a re-grant to be skipped, never a double-pay.

## 3. The dev kit left a loaded gun on the scratch (medium)

`devtools.js` calls `_grantQuestItem` directly and is not a quest handler, so it
never drains. On a full stash its rejects sat on `ps._questWeaponUnfit` until
the player's **next quest turn-in** drained them and paid them out as that
quest's reward, under that quest's opIds — a debug tool minting real weapons
into a real inbox, and shifting the quest's own occurrence counters while it
did. It clears the scratch now; the kit's existing contract is already "a full
stash is not fatal", and a debug affordance has no business writing to the
journal real payouts converge on.

## And a test-infrastructure defect underneath all of it

`storage.list` in three suites was `async () => new Map(store)` — **it ignored
the prefix and returned the whole store**. Any code scoping a sweep by prefix
was untested there and behaved differently than against real DO storage;
**twelve-plus production call sites pass a prefix**. It surfaced when the reset
sweep deleted every key in the mock and the scoping assertions failed against a
mock that cannot express scoping.

`tutorial`, `chainscore` and `hiscores` now use the same faithful implementation
the other suites already had. **The full suite still passes**, so this revealed
no other latent bug — but it means the sweep's scoping is now actually proven
rather than assumed.

## Pins

Seven more assertions. Each mutation-tested **individually**: restore the index
opId, or the reset sweep, or the devtools clear, and exactly one assertion goes
red — its own — with everything else still green.

The devtools pin runs against a stash **already at cap**, which is the only
state where the leak exists; §8 above it runs on an empty stash and could not
see this however many assertions it grew.

The restart pin runs on a **throwaway id**: `_resetCharacterData` deletes
`playerState[pid]`, and the first cut ran it on the shared fixture, detaching
the `ps` four later sections still held.
