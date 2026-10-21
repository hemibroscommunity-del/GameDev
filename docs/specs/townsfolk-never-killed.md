# A townsperson is never killed (v2.3.3534)

The owner, 2026-10-21, a week before reviewers play the game for 20-30
minutes each: *"I value SIMPLICITY and INTELLIGIBILITY it's far more
important for me that the player understands the game than to have precise
finely tuned details."*

## What it did

Swinging a sword at anyone in town (Mayor Bro, Diego, Lil Bro, Blacksmith
Bro, any of them) took their health down on your phone only. A few swings
and they "died":

- a skull and a boom, and they were gone for ten seconds: no quest, no
  shop, nobody to talk to (the talk scan skips the dead);
- a pile with 5 gold on the ground, picked up at once, with an unknown
  "npc" item into the bag;
- "+5 XP" over the XP bar.

None of it was real. Nothing about a townsperson goes on the wire, so the
worker never heard of the death, the gold, the item or the XP. They sat on
your screen until the worker next sent your gold, XP or bag, and then
vanished. Measured on the build before this change (`mp-npchit`): three
townsfolk swung at, four "deaths", gold 50 -> 70, XP 0 -> 20, four "npc"
items, and about twenty moments each with nobody to talk to. A reviewer who
swings at the Mayor sees him die, gets paid, then sees the pay vanish: the
game teaching the wrong thing.

## What it does now

`src/game/monsterCombat.js`, the swing's townsfolk loop:

- a `noHp` townsperson (every one in `NPC_DATA`) loses no health, so never
  dies;
- the swing still LANDS: the hit sound, the red bits, the little shove. He
  walks back to his spot (`pathRadius` 0 in the Wheel);
- the 5-gold pile and the "+5 XP" are gone for anyone, as the worker pays
  nothing for an NPC.

An NPC without `noHp` (none today) would still lose health and fall, with no
pile and no XP. Only sword swings ever touched townsfolk; arrows and bolts
fly past them. No worker change.

## Tests

`mp-npchit` (a phone in the Wheel's BroTown with the dev kit's great sword):
24 swings each at Mayor Bro, Lil Bro and Blacksmith Bro. The swings land and
shove him (the guard), and through all of them he never dies or loses
health, is always the one you'd talk to, drops no pile and pays no XP, and
your gold and XP stay put; afterwards he walks back to his spot: 19 of 19.
On the build before this change, 9 of the 19 fail: each of the three dies
within the swings (Lil Bro twice), drops a pile and pays "+5 XP", and is
nobody to talk to while dead.
