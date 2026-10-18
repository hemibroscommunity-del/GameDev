# A hit on a monster needs its weapon, its reach, and a paid special, and a bow lands no more a second than its shots (v2.3.3334)

> The owner, 2026-10-17, to "Want me to merge #948 and then start on the bot
> farming holes?": *"Yes"*.

This is fix 8 of the anti-bot review (docs/specs/antibot-review.md §5, "hits
are limited per monster, not per player, and 'ranged' reaches 3,600 px without
a bow").

## What was wrong

Your phone tells the server which monster it hit and with what. The server
rolls the damage itself, but four things were the phone's word:

- **The weapon.** A "bow" hit needed no bow. With no bow, the server rolled a
  bare greatsword's numbers and the hit landed. In the bot lab, a script with
  no weapon at all killed **6,009 monsters an hour**. An honest sword fighter
  killed 471.
- **The reach.** A bow or staff hit could come from anywhere in a zone, or
  from 3,600 px in the Wheel. That's about three times a maxed bow's reach. It
  was that wide because a bow special's stuck arrows keep chipping while you
  kite away.
- **The special.** Against a player, a hit marked "special" has counted only
  after a paid special since v2.3.3260. Against a monster it was free: three
  specials a monster every 1.2 seconds, never paid for.
- **How many.** The only limit was per monster: one hit on each monster every
  210 ms. A script standing among a pack claimed a hit on every one of them
  that often.

## What happens now

`server/src/hitproof.js`, called by combat.js `_handleMonsterDamage`:

1. **The weapon.** A bow hit needs a bow in the server's own bow slot, and a
   staff hit a staff. Only the server's equip and forge write those slots; the
   phone's "I'm holding the bow" is never asked. Without the weapon, nothing
   happens. A sword hit with no sword is still a bare fist: an unarmed player
   is held in the safe commons until Mayor Bro arms them.
2. **The reach**, measured from the server's own copy of the player, which is
   honest since the move budget and the reconnect check (v2.3.3325, v2.3.3327):
   - **a bow**: 675 px × its Range stat, plus 150 px for the monster's body and
     the arrow, plus a second of the fastest honest run. An arrow flies at most
     0.47 s whatever its range, so the second covers that twice. With no Range
     points that's 1,490 px; at the Range stat's top, about 1,860. An older
     character's bow (the old Longshot channel, up to ×2.0) gets 2,165.
   - **a staff**: its bolt stays tied to where its caster is now (the phone's
     own projectiles.js), so 675 px × the staff's Range, plus 250, plus 0.3 s of
     the run: 1,124 px with no points.
   - **inside a paid bow special's window**: the Wheel's old 3,600, because the
     volley's stuck arrows chip, and a missed one planted in the ground ticks,
     while the archer kites away.
   - This applies in **every zone**. Before, only the Wheel had a cap, and a
     dungeon had none.
3. **A special is a special only after one was paid for.** A special the
   server charged mana for (`ability_use swipe`) opens a window of 4.5 seconds
   worth **one special's shape**:
   - the sword's special swing: each monster in it once (up to 24: a
     whirlwind pulls 16 together);
   - the bow volley's three arrows;
   - the big staff bolt (its three orbs).

   Up to four windows can be open at once, the oldest with room used first, so
   two big bolts in the air both count. A "special" outside a window **rolls as
   an ordinary hit**, under the ordinary per-monster limit. It's never dropped:
   the phone fires its special even when the server refused the mana (it checks
   its own mana), and the old tutorial's free swipe sends none.

4. **Hits a second, per player, across every monster.** The per-monster
   limits allow a hit on each monster every 210 ms, so a script among a pack
   claimed every one of them that often. Now:
   - **a bow** lands at most 5 hits a second (the phone's fastest shot is every
     200 ms, whatever the build), times one plus its Piercing: an arrow hits
     every monster it passes through. Piercing is an older character's channel,
     read from the server's own copy; a newer character has none.
   - **a staff** lands at most 2 a second: its bolts come 300 ms slower and
     never pierce.
   - Three seconds of them may wait, for a phone's backlog after a stall.
   - A paid special adds 48 for its stuck arrows' chips and a missed volley's
     burning patch: the patch hits every monster within 100 px every half
     second for 2.5 seconds, so eight packed in it, with the archer firing at
     the quickest real pace, are about 50 hits. A script in a fight can pay
     for a special only about every 19 seconds (that's how slowly mana comes
     back), so this buys it about 2.5 hits a second.
   - A paid retreat adds its shot (an arrow, or three bolts).
   - Specials inside their window, and the sword, are left to their own limits:
     a sword's swing hits what its ring holds.

And the per-monster hit limits are now trimmed by **last use**, not first hit.
Before, a fight across more than 32 monsters wiped the limits of the monsters
being hit right then.

## Measured

The bot lab, 20 simulated minutes a fighter (`tools/qa/load/bot-lab.mjs`;
before is `--flags=hitproof:false`):

| | Before | After |
|---|---|---|
| An honest sword, one monster at a time | 471 kills/h | 471 |
| An honest archer: a shot every 600 ms, a paid volley every 6 s | 378 kills/h | 378 |
| A script with no bow, hitting every monster in reach | 6,009 kills/h | **0** |
| A script with a bow, under the message limit (100 claims a second, the nearest first), never paying for a special | 6,111 kills/h | **2,109** |

What's left for the script with a bow is an archer firing at the phone's
absolute fastest (every 200 ms) who never walks. An honest player at the top
attack speed with the best amulet fires every 285 ms. Holding each player to
their own build's shot rate (their Speed stat and amulet) would take it the
rest of the way; the 200 ms floor is used for now because no honest build can
be clipped by it.

The lab's old aimbot (no limit on how many claims a second) is now logged out
by the one-socket message limit (v2.3.3274) within seconds: hits refused leave
more monsters alive around it, so it claims more and goes over. A real script
stays under the limit, so the lab's aimbots now do too.

The server suite `hit-proof` (66 checks). I broke the code on purpose in 26
different ways and the suite caught every one, including putting back the
smaller allowance a paid special first had (24), which clipped the packed
burning patch.

## The switch

`hitproof: false` in the live flags is all of it as before: no weapon needed,
the Wheel's 3,600 and no cap elsewhere, specials free, no limit a player, the
per-monster limits trimmed by first hit.

`/api/admin/overview`'s `hitProof` counts hits refused for want of the weapon
(`noWeapon`), from too far (`far`), past the player's hits a second (`rate`),
specials rolled ordinary for want of a paid swipe (`unpaid`), and paid ones
(`paid`).

## Files

- `server/src/hitproof.js` (new): `HIT_PROOF`, `_hitProofOn`, `_hitWeaponOk`,
  `_pveSpecialPaid`, `_pveRetreatPaid`, `_pveVolleyLive`, `_pveSpecialTake`,
  `_hitReach`, `_hitPierce`, `_hitRate`, `_hitRateTake`, `_hitRateGrant`,
  `_hitProofInfo`.
- `server/src/combat.js` `_handleMonsterDamage`: the four gates, the
  per-monster lanes by last use, and an unpaid special's knockback is an
  ordinary hit's.
- `server/src/index.js` `_handleAbilityUse`: a charged swipe opens a window, a
  charged retreat brings its shot.
- `server/src/admin.js`: the overview.
- `server/test/hit-proof.test.mjs` (new); anticheat, combat-lifecycle, prog3,
  pvp-balance and statsim now pay for their specials (and the far chip, its
  volley), as a phone does.
- `tools/qa/load/bot-lab.mjs`: `aimbot-bow` and `honest-archer`.
- `tools/qa/mp/harness.mjs` `armWorker`, used by `mp-orbrange` and
  `mp-bowmark`: a phone test whose bow or staff hits must land gives the
  weapon to the server the way a player gets one (the test panel's starter
  weapons, then the game's own equip), not only to the page (TRAPS §207).

## Phone tests

Real game pages on a real local server, before and after:

- `mp-hitreal`, every weapon and its special in four zones: 125 checks passed
  and 4 failed, exactly as on main, and **no hit the phone sent was lost by
  the server** in any of its 24 rows. Its 4 misses, here and on main, are
  shots the phone never sent.
- Two tests gave the bow or staff to the page alone, so the server now refused
  their hits: `mp-orbrange` (unhurt mummies crowded the player and its aimed
  orb ended on the wrong one) and `mp-bowmark` (no number on the monster).
  They now arm the server too, and pass in full.
- 26 more tests that fight with a bow, staff or sword pass (`mp-questline`,
  the check every pull request runs, among them: 99 of 99), apart from checks
  that fail the same way on main (`mp-questkill`, `mp-firefight`,
  `mp-joyfade`, `mp-orbline`) and two that missed once on a busy machine and
  passed on a rerun (`mp-lockchip`, `mp-solospecial`).
