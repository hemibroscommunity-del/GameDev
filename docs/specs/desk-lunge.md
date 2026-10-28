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
2. A monster under the cursor is the one the click means. It is locked there
   and then, as the click would have.
3. Otherwise the game's own lock (the nearest monster within the sword's ring)
   becomes a deliberate one: the phone's rule, `near` and all.
4. Then the lunge is asked for, with every rule of its own unchanged:
   - the sword only, never the bow or staff;
   - the shield down;
   - off its 2.5 s cooldown;
   - a living target within its 900 px reach.

   If it goes, the dash leaves at once and strikes on arrival, and the press's
   swing is skipped. If not, the click swings as before.
5. The click that ends the press keeps the lock it took (`_deskPressLock`):
   - it no longer toggles the monster you are locked onto off;
   - it no longer lets the lock go as a click on empty ground.
   - A sword's lock still lets go as it always did: when you walk out of the
     ring (after being in it), or when the monster dies or is far away.
6. A phone is unchanged: its mouse handlers never run there.

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
