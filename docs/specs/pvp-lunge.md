# The sword's opening lunge works on players too (v2.3.3262)

The owner, on v2.3.3260's honest limit (a sword could not catch a bow or a
staff that keeps its distance, because everyone runs at the same speed):
*"Yes make opening lunge work on players too"*.

The lunge (`sworddash`) is the sword's first attack of a fight: you press
attack, the bro zooms to the target and swings when he arrives. It is free,
it has a 2.5 s cooldown, and it reaches 900 px. Until now it only ever went
for a monster. Now it goes for a player you may fight too: the same move, the
same cooldown, the same reach, the same hit.

## What happens

1. **The press.** With a player locked whom you may fight, pressing attack
   lunges at them, exactly as at a monster. That means a duel opponent (a duel
   locks you on them), or a player you aimed at in No man's land. In town or
   on safe ground with no duel, the press does not lunge at a player. The
   phone sends the lunge naming the player (`pid`), never a monster's id.
2. **The worker checks** that the player is someone you may fight: the same
   rule every hit between players goes through (No man's land, a duel, an
   arena match). They must be in your zone, alive, and within 900 px. Then it
   puts you at contact (46 px from them), as it does at a monster.
3. **The hit** goes through the one door for every hit between players
   (`_resolvePvPAttack`). That includes the shield's arc, a roll's dodge,
   armour, No man's land's skulls, the eating clock and a death. The worker
   rolls it itself with the one calculation a monster's hit uses too
   (v2.3.3263's one version: the same number on a monster and on a player of
   that level, no cap of a player's own).
4. **The daze.** A lunge that lands (not blocked, not dodged) dazes the player
   hit. This is the **rock monsters' daze**, the very same numbers:
   - 0.5 s of no walking, swinging, rolling or raising the shield;
   - then 2.5 s in which no daze lands again, the lunge's or a rock
     monster's (they share it). At the lunge's 2.5 s cooldown, about every
     other lunge that lands dazes.

   The dazed player sees the stars and the "Dazed" chip, and everyone else
   sees the stars on them.
5. **No shove.** A monster takes the lunge's 40 px knockback; a player does
   not. It would push them back out of the reach the lunge just closed.

A lunge that reaches nobody, or is refused, is a miss ("Missed!"), and the
cooldown is spent, as at a monster. A blocked or dodged lunge is not a miss:
it connected, and it says "Blocked" or "Dodged".

### While dazed, against players

The phone already refuses a dazed player's swing, roll, shield and lunge.
Now the worker refuses them too, against players:

- a dazed player's sword swing lands nothing on a player;
- a dazed player's lunge goes nowhere (it does not move them);
- a roll in a daze gives no dodge against a player's hit.

An **arrow or bolt already flying still lands.** Its hit is reported when it
lands, so a shot loosed before the daze arrives inside it. The worker cannot
tell it from one loosed after, so it lets it land, as the screen showed it.

A daze from a rock monster counts the same: you are dazed either way.

## What it does to fights

Measured on the fight simulator (`tools/pvp-sim/lunge.mjs`), which runs the
worker's own combat code. The rows are two equal players with no points spent
and no food. Each figure is how often the **sword wins** at low / average /
top skill, before and after. Re-measured on top of v2.3.3263 (one version: no
cap, the level rule both ways); the sword-against-bow figures did not move,
and the staff's moved by a point or two.

| | Sword v bow, before | after | Sword v staff, before | after |
| --- | --- | --- | --- | --- |
| Level 7, copper set | 74 / 88 / 0 | 94 / 88 / 99 | 13 / 37 / 0 | 22 / 34 / 78 |
| Level 12, no armour | 8 / 12 / 0 | 30 / 31 / 30 | 2 / 12 / 0 | 8 / 17 / 31 |
| **Level 12, copper set** | **8 / 19 / 0** | **32 / 39 / 89** | **3 / 24 / 0** | **12 / 21 / 66** |
| Level 12, iron set | 24 / 38 / 0 | 59 / 46 / 96 | 4 / 28 / 0 | 13 / 28 / 80 |
| Level 22, copper set | 8 / 54 / 0 | 46 / 63 / 89 | 1 / 8 / 0 | 6 / 12 / 19 |

(The level 12 and 22 copper rows are 1,000 fights a cell; the rest 300.)

- **The top-skill sword is no longer helpless.** Before, a skilled bow or
  staff player who backed off at full speed was never caught. Now the sword
  catches them every 2.5 s.
- **Fights that never ended now end.** Before, 18% of sword-against-staff
  fights at level 12 hit the simulator's 2-minute limit; now none do.
- **Sword v sword** is the same length as before (10 s at level 12 with the
  copper set), and the better player still wins 98-99%.
- **Bow v staff** is untouched (no lunge in it).
- The biggest single hit the simulator saw at level 12 with the copper set
  was 47% of a bar, with or without the lunge (v2.3.3263 took the 30% cap
  away: one version for monsters and players).

### Why the rock monsters' daze

The lunge itself is what lets a sword catch a kiting bow or staff. The daze
adds little on top: a few points at average skill, more at the top.
Level 12, copper set, 300 fights a cell, sword wins at top skill (and at
average skill):

| Daze on a player | Sword v bow | Sword v staff |
| --- | --- | --- |
| none (the lunge alone) | 83% (35%) | 52% (20%) |
| 0.3 s, every lunge | 85% (37%) | 56% (21%) |
| **0.5 s, every other lunge: the rock monsters' (shipped)** | **90% (39%)** | **68% (23%)** |
| 0.5 s, every lunge | 91% (39%) | 70% (23%) |
| 1 s, every lunge | 96% (38%) | 78% (24%) |

The monster version's 1.6 s stun, every 2.5 s, would hold a bow or staff
player still for two thirds of the fight. The rock monsters' half second is
one daze in the game, at a length players already know. A longer daze, or one
on every lunge, tips top-skill fights further toward the sword.

## Honest limits

- **A top-skill sword now beats a top-skill bow most of the time (about
  90%).** A bow can only shoot about half a phone's screen; the lunge
  reaches the whole screen. If that is too strong once played, the lever is a
  longer lunge cooldown against players. 6 s brings it to about two thirds,
  but it also costs the top-skill sword against a staff (66% to about 36% at
  level 12). No single cooldown evens out both.
  v2.3.3532: re-measured once the simulator fought again (`pvp-fights.md`,
  "the simulator fights again"): 96% at skill 10; 6 s brings it to 64%, and
  the sword against a staff from 68% to 33%.
- **An average sword against a staff that stands its ground does slightly
  worse (24% to 21% at level 12).** The lunge goes off on the press whenever
  it is ready, and it carries the sword into the staff's point-blank big
  bolt. A staff that does not run is better met on foot.
- **A modified phone can skip the dash's travel.** The worker puts the sword
  at contact either way, as it does at a monster (the phone's dash is faster
  than the worker's movement check can follow). What it gains is the 0.2-0.6 s
  in which the target sees the tumble coming, once every 2.5 s. The damage,
  the reach and the cooldown are the worker's.
- **On a device drawing fewer than about 7 frames a second**, the dash's
  window can run out before it arrives. It then swings from where it got to,
  and the worker still lands it if the player is within reach, as at a
  monster. The QA box is that slow; a phone is not.

## Wire

| Message | From | What |
| --- | --- | --- |
| `ability {kind: 'sworddash', pid}` | phone | a lunge at player `pid` (never `targetId`, which is a monster's) |
| `pvp_hit {..., ability: 'sworddash', st: 'daze', stMs}` | worker | the lunge's hit; `st`/`stMs` only when it dazed (the fields a rock monster's `monster_attack` carries) |
| `ability_rejected {kind: 'sworddash', reason: 'whiff'}` | worker | a lunge that reached nobody, or was refused |

`pvp_hit` was already server-only (PRIVILEGED_EVENTS). No storage, no new
message type.

## Switch

Live flag `pvplunge: false`:

- `caps.pvplunge` goes false, so the phone sends no lunge at a player;
- a lunge that names a player is a miss;
- the worker's daze rules against players are off.

That is the game as it was.

## Deploy order

- **A new phone against an older worker:** no `caps.pvplunge`, so the phone
  never lunges at a player (its lunge against monsters is unchanged).
- **An older phone against this worker:** it never names a player, so its own
  lunges are unchanged. Lunged at by a newer phone, it does not show the daze
  (it ignores `st`), but the worker still holds it for the half second. Its
  swings land nothing on a player and a roll gives no dodge, until it reloads
  into the new game.

## Code

- `server/src/pvplunge.js`: the lunge at a player (`_swordDashPlayer`), its
  daze (`_pvpLungeDaze`, `PVP_LUNGE` = the rock monsters' `DAZE`), the
  dazed check (`_pvpDazed`), the switch.
- `server/src/abilities.js` `_abilityResolve`: a `sworddash` with a `pid`
  goes there, before the monster scan (a monster beside the swordsman is
  never hit by a lunge at a player).
- `server/src/combat.js` `_resolvePvPAttack`: no swing from a dazed player,
  no dodge for a roll in a daze.
- `src/game/abilities.js`: `pvpLungeTarget` (the swing's own PvP gate: a duel
  anywhere, a lock outside safe ground, `caps.pvplunge`), `castAbility`,
  `applyAbilityStrike` and `maybeSwordDash` take a player.
- `src/ui/BroTown.jsx`: the dash follows the player by id (the roster
  replaces the objects), ends without a swing if they died or left.
- `src/networking/gameEvents.js` `pvp_hit`: the daze on you or on the player
  hit (`applyElemHit`, the rock monster's code).

## Tests

- `server/test/pvp-lunge.test.mjs` (38 checks) covers:
  - the lunge lands through the one door with the worker's roll, at contact;
  - the daze, its window, and that it is the rock monsters' numbers;
  - a dazed player's swing and lunge refused, a roll in a daze undodged, a
    shot still landing;
  - the refusals: no consent, out of reach, yourself, another zone, dead,
    `__proto__`;
  - a shield, a roll, the cooldown and the sword's lane;
  - a monster beside the swordsman not hit;
  - No man's land's skulls;
  - the switch.
- `mp-pvplunge` (18 checks, two phones) covers:
  - no lunge in town without a duel;
  - in a duel, the dash to contact, the worker's hit and daze;
  - B dazed for exactly 500 ms, its walk stopped with a key held and its
    own lunge refused;
  - A drawing the stars;
  - the cooldown.
- The simulator: `node tools/pvp-sim/lunge.mjs 300 5,10,20 both` (the
  tables above; `LUNGE_SETTINGS` tries other dazes, `lungeCd` a longer
  cooldown). Its model of the lunge:
  - the dash, 26 px a frame to contact;
  - a skilled sword throws the special from the lunge's stop, its real
    50 px reach;
  - the one lunged at answers after a reaction, and a press refused in a
    daze is pressed again after it;
  - a skilled sword does not lunge into a big bolt in the air.
