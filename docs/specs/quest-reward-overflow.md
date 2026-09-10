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
