# Drop an item (v2.3.3473)

The owner, 2026-10-18:

> "add an option to "drop" items in game. After about a minute they become
> visible to other players. After 2 minutes it begins flashing and disappears"

## What a player sees

- **The bag's item card has a Drop button**, beside Sell. A stack asks "How
  many" (− / + / All, up to what you hold); the card then says what will
  happen ("Only you can see it for a minute, then anyone can pick it up. At
  two minutes it starts flashing, then it's gone."), and **Drop it** (or
  **Drop 3**) drops it. The card closes at once.
- The item lies **just in front of your feet as its own bag picture** (34 px
  toward the camera: right at your feet your own legs hid it): the log, the
  ore, the fish, with "×3" beside it when there is more than one. A bob and a
  shadow like any pile. Until its picture has loaded (usually at once: the bag
  already showed it), a plain tied bundle stands in.
- **For a minute only you see it** and only you may take it back. You do not
  pick it straight back up: it waits until you have stepped about 60 px away
  from it, then walking onto it takes it back like any pile of yours. Your pet
  never fetches your own drop.
- **After a minute everyone in the zone sees it**, and anyone who walks onto
  it takes it, all of it.
- **At two minutes it flashes**, on and off, faster as its end comes, for ten
  seconds, then it is gone, in nobody's bag.
- **Where Drop is greyed:** today's town, the old World View and your farm
  (the card says "Nothing can be dropped here" / "on your farm"). Those are
  the game's safe zones, whose piles are never shown.
- **Refused, in words over your head:** in a fight with a player ("Not in a
  fight with a player": a losing bag is the killer's, as for a trade or a
  sale), twelve of your things already on the ground, and the rest.

Any bag item can be dropped, as any bag item can be traded. Gear (weapons,
armour, shields) is not in the bag's item list and cannot be dropped: a piece
of gear has a receipt on the worker (its ledger id), and a drop would have to
move that receipt to whoever picks it up.

## How it works

**The worker owns everything** (`server/src/itemdrop.js`):

- `item_drop {key, qty}` takes the count out of the worker's own copy of the
  bag, lays a pile at the player's feet and saves the bag, in one synchronous
  run (handoff rule 5): one row written, as a pickup is. It lands
  `AHEAD_PX` 34 in front of the feet (+y), where the dropper can see it. The pile is the death
  pile's own shape (`isDeathDrop`, its `deathItems`, `recipients`,
  `ownerOnlyUntil`, `expiry`), so the pickup (`_handleLootPickup`: the first
  picker takes it whole, the pile goes), the owner gate and the despawn
  (`_tickLoot`) are code every death pile already runs. What a drop adds:
  `dropped`, `dropBy`, `privateUntil`, `revealed`, `flashAt`.
- **Private means never sent.** The pile goes to the dropper's socket alone,
  and every pile list (`_zoneLootForWire(zone, viewer)`: a join's
  `state_sync`, a zone change's `zone_state`, a roster's re-send) leaves it
  out for everyone but the dropper (`_pileHiddenFrom`). A phone that was never
  sent it cannot show it, however it is modded.
- **At a minute** `_tickLoot` marks it revealed and tells the room
  (`loot_drop`, once). From then on anyone in the zone may pick it up.
- **The clocks go as time left** (`openLeft`, `flashLeft`, `left`), and the
  phone puts them on its own clock as the pile arrives
  (`wsClient.js _buildServerPile`), so a phone whose clock is off still
  opens, flashes and ends it when the worker does. A `loot_drop` of a drop a
  phone already holds refreshes its clocks (gameEvents.js): the reveal reaches
  its dropper too.
- **Nothing is stored**: like every pile it lives in the room's memory
  (handoff rule 11). A room restart in those two minutes loses the pile, and
  the bag's save has already left the item out, so nothing is ever in two
  places.
- **Refusals** (`item_drop_result {ok:false, reason}`, PRIVILEGED): `off`,
  `dead`, `not-here` (town, worldview, farm_home: `ITEM_DROP.NO_DROP_ZONES`),
  `fight` (`_bagLockedByFight`), `bad`, `none`, `slow` (one drop every
  400 ms), `too-many` (12 of your piles on the ground at once).

**The phone** (`src/game/itemDrop.js`, `src/data/itemDrop.js`):

- the card (`ItemDetailPopup.jsx`): Drop on `caps.itemdrop`, greyed with the
  reason in a no-drop zone; the sheet's stepper; `sendItemDrop`, never into a
  dead socket (`offlineRefused`);
- the answer (`applyItemDropResult`): the drop's coin rattle, or the reason
  over your head with the "denied" tick;
- your own drop waits for you to step off it (`dropWaitsForYou`, in
  groundLoot.js; the pet's vacuum in BroTown.jsx skips your own drops);
- the drawing (`effectsRenderer.js _renderDroppedItem`): the bag picture from
  `src/rendering/dropIcons.js` (the bag's `thumbFor`, handed over through the
  import-free `src/game/dropLook.js`), shrunk once to 64 px, held by the pile
  and let go with its sprites; at most 24 kept when no pile holds them. A drop
  lives to its own end in the renderer, not the 30 s every other pile gets.

**Kill switch:** `itemdrop: false` in the live flags: no drop is taken, and
`caps.itemdrop` is false at a phone's next join (its Drop button goes).

**Test lever:** `POST /api/admin/dev/dropage {playerId, ms}` makes a player's
drops `ms` older and tells the phones their new clocks (mp-itemdrop).

## Tests

- `server/test/itemdrop.test.mjs` (65 checks): the ask, the drop (one row,
  the clocks), private (no tick, list or roster re-send carries it; nobody
  else may take it; the dropper may), the reveal (once), the pickup by
  anyone, the flash time and the end (to nobody), every refusal (nothing
  refused leaves the bag), the wire (no drop field on any other pile), the
  cap and its kill switch, a death after a drop.
- `mirror-audit`: the phone's `NO_DROP_ZONES` and clocks are the worker's.
- `tools/qa/mp/mp-itemdrop.mjs` (18 checks, two phones in the Wheel): the
  card's Drop and "How many" (its row of four buttons inside the card, none
  under 44 px), one `item_drop`, the bag, the pile just in front of the
  dropper's feet drawn as the item with "×2" and nothing on the other phone;
  not picked straight back up; at a minute the other phone draws it and takes
  it; at two minutes it flashes on both and is gone from both ten seconds
  later; walked away from and back onto, it is the dropper's again.

## A dead player's pile (v2.3.3476)

Found while building the drop, and fixed when the owner said "Yes do the fix".
A death pile is the worker's for `DEATH_PILE_TOTAL_MS` 120 s: the dead
player's alone for `DEATH_PILE_OWNER_MS` 60, then anyone's in the zone. Its
countdown under the skull counts those two minutes. Two faults stopped it,
the second hidden under the first.

**The 30 s cut (the phone).** The renderer (`effectsRenderer.js
_updateGroundLoot`) took every pile off every screen 30 s after it landed, the
life of a monster's pile. So its owner lost the last 90 s the countdown said
they had, and nobody else ever saw the minute it is theirs to take. Now a death
pile goes at its own `expiry`, as a drop does, and its last-call pulse is the
last ten seconds of its own life (counted from 30 s it would have pulsed at its
end's full speed for 90 s). Its clocks are the worker's, sent as times, as
`groundLoot.js` and the pickup gate already read them. A monster's pile keeps
its 30 s.

**The corpse took its own pile (the worker).** Found by the phone test for the
first fix: with the cut gone, the pile was still gone from every screen and
from the worker about a second after the death. The pickup refused a dead
player by `ps.dead`, which is the phone's word: movement.js writes it from
every move, and the move a phone sends as it handles `player_died` still says
alive (the HP-0 `player_state` comes after). The pile is laid at the corpse's
feet, so the dead player's phone asked for it as soon as it landed and was
given it; five seconds later the respawn's wipe took it out of the bag again.
**Every monster death destroyed the bag's items.** Measured on the old code
(`room._handlePlayerDeath`, then the corpse's pickup, then the respawn): the
bag empty, the pile holding the items; then the bag holding them and no pile;
then after the respawn neither. Now:

- `_handleLootPickup` refuses while `ps.dying` too, the worker's own word
  (`ps.dead || ps.dying`, as nearly every other handler already asks: TRAPS
  §150, §233);
- the phone asks for nothing while it is dead (`groundLoot.js`: `S._dying`),
  so a death no longer sends a refused `loot_pickup` a second for five
  seconds.

A death costs the bag as it was meant to: the pile lies where you fell for two
minutes, yours to walk back to for the first one, then anyone's.

`tools/qa/mp/mp-deathpile.mjs`, two phones in the Wheel and a real death (1 HP
among the Flame Fields' level 1s), in real time: the watcher's screen draws the
pile with its countdown; at 36 s it is still drawn and steady, its owner, back
in BroTown, still holds it, the worker still has it and the dead player's
phone sent no `loot_pickup`; the watcher on it inside its minute takes
nothing, and past it takes it, gone from both screens; a second death's pile
left alone is steady at 100 s, pulses in its last ten seconds and is gone from
both screens at its end, in nobody's bag. `BT_DP_TRACE=1` prints the pile's
first 40 s and every pile message each phone received and sent (how the
corpse's ask was found). `combat-lifecycle` §5: the corpse on its pile is
refused whatever its move said.

## Not done

- Gear (weapons, armour, shields): see above. It would need the worker to
  move a piece's receipt to whoever picks it up.
- A death pile's clocks are the worker's own times, not time left as a drop's
  are, so a phone whose clock is off sees its minute open and its end that
  much off (as it always has).
- Other places that ask only `ps.dead` were not changed here; one is a kill's
  share (combat.js: a player whose damage is on a monster that dies in the
  five seconds after their death is still counted for a share).
