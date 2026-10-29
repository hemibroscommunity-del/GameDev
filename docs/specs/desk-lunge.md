# A computer's sword click lunges, as a phone's press does (v2.3.3694)

The owner, 2026-10-28, testing the desktop version:

> The melee needs the "zoom to attack monster" behavior that exists on phones
> when you get close enough.

## What was different

- **On a phone**, the attack press (the disc, or the right stick) first makes
  the game's own lock a deliberate one. It then asks for the sword's opening
  lunge (`maybeSwordDash`, game/abilities.js). The lunge dashes to the locked
  monster and strikes on arrival in place of the swing (v2.3.2258, v2.3.2260).
- **On a computer**, a left click only swung (`doSwing`). The lunge was never
  asked for.
- On a computer, a click on the monster you were locked onto also toggled the
  lock off ("tap same = unlock"). A click on empty ground let it go.

## What a computer does now

A left click with the sword in hand (BroTown.jsx `onMouseDown`,
`_deskLungePress`):

1. A click on a townsperson, a resource or a bed is still theirs
   (`_deskPressTarget`, v2.3.3470): no attack.
2. (v2.3.3763) Another player under the cursor, and no monster: no lunge and
   no lock taken. The press swings as before, and the click does its job: in
   No man's land the "Attack?" window asks about them, elsewhere their card
   opens. See "A click on a player" below.
3. A monster under the cursor is the one the click means. It is locked there
   and then, as the click would have.
4. Otherwise the game's own lock (the nearest monster within the sword's ring)
   becomes a deliberate one: the phone's rule, `near` and all.
5. Then the lunge is asked for, with every rule of its own unchanged:
   - the sword only, never the bow or staff;
   - the shield down;
   - off its 2.5 s cooldown;
   - a living target within its 900 px reach.

   If it goes, the dash leaves at once and strikes on arrival, and the press's
   swing is skipped. If not, the click swings as before.
6. The click that ends the press keeps the lock it took (`_deskPressLock`):
   - it no longer toggles the monster you are locked onto off;
   - it no longer lets the lock go as a click on empty ground.
   - A sword's lock still lets go as it always did: when you walk out of the
     ring (after being in it), or when the monster dies or is far away.
7. A phone is unchanged: its mouse handlers never run there.

## A click on a player (v2.3.3763)

The night before the judges, the long soak (`mp-longplay`, a computer's No
man's land fight: 0 of 2) and `mp-nomansland` (15 checks red from step 2) both
saw a computer click another player in No man's land and get no "Attack?"
window. Instead the press lunged at a monster nearby.

What happened, step by step:

- With no monster under the cursor, step 4 above promoted the game's own
  monster lock and noted it as the press's lock.
- The click that ends the press returns early when the press's lock is the
  lock (step 6). That return comes before the click's own checks: a monster,
  a townsperson, another player.
- So the click on the player never reached `nmlAsk(S, id, 'tap')`.

Phones never had it (their press is the disc's). `mp-nmlfoe` never saw it:
its players are phones, and it picks a spot with no monster near.

The fix is step 2: a player under the cursor means the player.

The other things a click can mean were already safe:

- Townsfolk, resources and beds stop the press before the lunge (step 1).
- Doors and loot piles have no click: you walk through a door, or press E, and
  you walk onto a pile to take it.

So only a monster, or empty ground, lunges.

## Checked

`mp-desklunge`, a computer (1280 x 800, a real mouse), in the world at Frost
Ridge's first snowmen, the dev kit's greatsword in hand:

1. With the game's own lock and a click on empty ground:
   - the dash leaves for that snowman;
   - the worker lands the hit (its HP 119 -> 104);
   - the lunge goes on its cooldown;
   - the lock stays on it, a deliberate one.
2. Off cooldown again, a click on another snowman lunges at that one (HP
   119 -> 104) and keeps its lock.
   - 2b. A second click on it keeps the lock too.
3. Inside the cooldown a click swings, with no dash.
4. With the bow in hand, a click on a snowman never lunges.
5. No page errors.

12/12 on this build. On main's build (v2.3.3681) the same test fails 1, 2 and
2b: no dash, the snowman's HP unchanged by the press, and the second click
toggled the lock off.

v2.3.3763: `mp-nomansland` (a computer that clicks, a monster wandering near)
failed on main from step 2: the window only from a stray swing, never from
the click, and the later swings locking a monster. With the fix it passes,
28 of 28. `mp-nmlfoe`, `mp-deskreach` and `mp-questline` were re-run.

## v2.3.3837: a click on another player's body or head finds them

Re-checked after v2.3.3763 (the judge pass, 2026-10-29): with both bros in No
man's land, a real click on the other bro's BODY or HEAD raised no "Attack?"
on main and fell through to the swing. A player was found only within 25 px
of their feet (`renderX`, `renderY`), while a player clicks the body or head.
`otherPlayerAtCss` and the click's own player loop (`onClick`) now ask one
distance (`otherPlayerDistCss`): the townsfolk's (npcAtCss), rising 26 px to
the body and reaching 44. A monster under the pointer is still asked first:
with a monster beside a player, a click on the monster locks the monster.
A computer's click only; a phone's tap is the touch path's.

Test: `mp-mayordoor` step 3 (both bros on a quiet spot of No man's land's
first ring in the Earth Forest; a real click on the body and on the head each
asks "Attack?"; a click on a monster 41-76 px from the other bro locks the
monster). On main the body and head clicks asked nothing.
