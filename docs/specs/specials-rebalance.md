# The specials, rebalanced (v2.3.2849)

The owner, on the three weapon specials: "the specials probably need rebalanced". Asked which weapon should do the most damage to a single monster: **"staff, but with high variance (can have lowest damage hits)"**. Asked whether the sword keeps its wide swing: **"Yes"**.

The archetypes are the owner's own, from the bow volley ([bow-volley.md](bow-volley.md)): *"the archetype for bow will be speed and DPS as opposed to staff which is area damage and high damage variance"*.

- **Staff:** the biggest single hit on average, with the widest spread in the game, and area damage.
- **Bow:** steady single-target damage that lands fast.
- **Sword:** the reliable wide swing, unchanged.

## What was wrong

Measured through the worker's own handler (`_handleMonsterDamage`: lanes, ceilings, `part`, `orbs`, splash). The character is fresh: skill 1, the starter kit (Copper Great Sword, Pine Bow, Pine Staff), no points spent.

| Special | Hits | Damage | Spread |
|---|---|---|---|
| Greatsword | every monster in its ring | ~41 each | 31–49 (±15 %) |
| Bow volley (v2.3.2848) | one monster | ~30 from the arrows + ~71 from the 4 s burn = **~101** | ±4 % |
| Staff big bolt (v2.3.2842) | one monster only | **~99** | 49–163 (±18 %) |

- **The staff was not the hardest single hit.** The bow's volley plus its burn out-damaged it.
- **The staff had no area.** Specials are excluded from the basic bolt's splash, so the sword was the only special that hit a group.
- **The big bolt swung less than a single orb.** It summed three rolls, and adding three draws evens them out: ±18 % against one orb's ±32 %. That is the opposite of "high damage variance".
- **The bow's hit felt light.** The burn did about twice what the three arrows did.

## What changed

### Staff: one roll, a wide band, then it explodes (`server/src/combat.js` `STAFF_BOLT`)

- **One roll.** The big bolt (`orbs: 3`, `caps.bigorb`) is ONE draw from its own band, **0.3–2.5**. The basic bolt's band is 0.5–1.65. The draw is multiplied by the special's 2× and by the three orbs it stands for. The mean goes from ×1.075 to ×1.4 (+30 %), and the spread is the widest of any hit.
- **The ceiling.** The roll is capped at the special ceiling × the orbs it spent in the special lane (the bound three separately-capped orbs always had) × **`CAP_K` = 2.5 / 1.65**. The special ceiling was sized for a roll that tops out at the staff's own 1.65, so a band that reaches 2.5 needs that much more room. The loosest legitimate build is skill 100, luck/dmg/special maxed, a top-tier volatile godly staff, a mythic flame amulet, and the Fury Tonic. For that build the bolt peaks at **63 %** of its ceiling, exactly the old orb's figure. Without `CAP_K` it would sit at 96 %. `combat-lifecycle` §6i rolls that build at the top of the band.
- **The blast.** Every other monster within **90 px** of the impact takes **a third** of the bolt's capped roll (`BLAST`, up to 6 monsters, × Detonation like the basic splash). This is `_staffSplash` with the bolt's own radius, share and bound. Each blast hit is its own `monster_hit` tagged `splash: true`.
  - It is a third rather than the basic bolt's half so the greatsword keeps the reliable wide swing the owner kept for it.
  - The blast inherits the bolt's roll: a lucky bolt blasts the pack, an unlucky one fizzles.
- **On screen.** The crash draws a third ring that opens out to the blast's reach (`orbCrashFx` `blastR`), so the area you see is the area that was hit.
- **The client's prediction** (client-only zones, a duel's `dmgBase`) draws from the same band (`gameSystems.js` `STAFF_BIG_BOLT_BAND`).

### Bow: more of it in the hit (`combat.js` `BOW_VOLLEY_WORTH`, `bowVolley.js`)

- **Each arrow** (`part: 3`) lands `WORTH / part` = **two-thirds** of the special roll, where it was a third. The volley is worth two of the old arrow.
  - `Math.min(1, …)` keeps an arrow at or below a plain special for any `part`, so `part` stays cheat-neutral.
- **A volley burns for 2.5 s** (`BOW_VOLLEY.BURN_MS`): four 500 ms ticks, where it was seven over 4 s.
  - The embers now burn out over the last 450 ms of the 2.5 s (`hotArrowFx.js` `burnOut`), in a rock too (`effectsRenderer`).
  - A peer's copy carries `volley: 1` so it burns out on the same clock.
- **The lone arrow** an old worker gets (no `caps.bowvolley`) keeps its 4 s burn and its blast (`burnLifeMs`).

### Sword: unchanged

## After

Same character, same harness (`node tools/specials-measure.mjs`):

| Special | Hits | Damage | Spread |
|---|---|---|---|
| Greatsword | every monster in its ring | ~41 each | 31–49 |
| Bow volley | one monster | ~60 from the arrows + ~40 from the 2.5 s burn = **~101** | ±4 % |
| Staff big bolt | its target | **~129** | 27–330 (±46 %) |
| …its blast | every other monster within 90 px | ~43 each | 9–110 |

At skill 20 the shape holds:

- Greatsword: ~143 on each monster in its ring.
- Bow: 180 + 121 = ~302.
- Staff: ~426 on its target (90–1110) and ~142 on each monster around it.

The bolt is the hardest single hit **on average**, and it is also the weakest special there is on a bad roll. About one bolt in three lands under the bow volley's total, and about one in twenty under the greatsword's per-monster hit.

## Deploy order

| | Old worker | New worker |
|---|---|---|
| **Old client** | unchanged | three orbs (no `orbs`), each rolled and capped as before, no blast; the single bow arrow with its 4 s burn, blast refused (v2.3.2848) |
| **New client** | no `caps.bigorb` / `caps.bowvolley`: the three-orb staff special and the single arrow with its burn and blast, exactly as before | the big bolt and its blast; the volley at two-thirds an arrow, 2.5 s burn |

Neither special had shipped before this version, so no client in the wild sends `orbs` or `part` yet.

## Kill switches

Both are lower case so `POST /api/admin/flags` accepts them (TRAPS §117). `caps.bigorb` was `bigOrb` until this version and never shipped.

- **`bigorb: false`** un-advertises the big bolt. A client that joins after it fires the old three orbs, each rolled and capped as before, with no blast.
- **`bowvolley: false`** does the same for the volley. A client that joins after it gets the single arrow, its 4 s burn and its blast.

A tab that joined earlier keeps what it joined with until it reconnects: the worker honours `orbs` and `part` whatever the flags say.

## Tuning knobs

Each knob is one number, with its client mirror beside it.

| Knob | Server | Client mirror | Moves |
|---|---|---|---|
| Staff spread and mean | `STAFF_BOLT.BAND` [0.3, 2.5] | `STAFF_BIG_BOLT_BAND` | the bolt's floor, ceiling and average. Retune `CAP_K` with it; §6i fails if they drift |
| Staff area | `STAFF_BOLT.BLAST` {90 px, ⅓, 6} | `STAFF_BIG_BOLT_BLAST_PX` (the ring) | how far the blast reaches and how hard |
| Bow split | `BOW_VOLLEY_WORTH` 2 | `BOW_VOLLEY.WORTH` | how much of the volley is in the hit |
| Bow burn | — (client-timed ticks) | `BOW_VOLLEY.BURN_MS` 2500 | how long a volley burns; the worker rolls each tick |

## Measuring it

The before/after tables come from `tools/specials-measure.mjs` (`[N] [--level L] [--ticks T]`), which joins a real `GameRoom` with the mocked storage the server suites use. It gives the character the starter kit and drives `monster_damage` through `webSocketMessage` a few thousand times per special.

**Stub `_prog3AwardXp` before you measure.** Every hit trains the skill that dealt it, so a few thousand measured hits level the character up mid-measurement: the first cut read the greatsword's special at ~166, not ~41 (TRAPS §118).

## Tests

- **`server/test/combat-lifecycle` §6i** covers the big bolt:
  - one draw worth three orbs, the lane, the clamps, junk values;
  - `bigorb` advertised under a name the admin route accepts;
  - old orbs don't explode;
  - the blast: a third at 50 and 80 px, nothing at 400, the target never twice, the basic splash unchanged;
  - the band's floor and ceiling by value;
  - the loosest build's best crit under its ceiling with ≤ 70 % used, and `CAP_K` moving with the band.
- **§12** covers the volley:
  - two-thirds an arrow, twice the old arrow in all, capped before shared;
  - junk values;
  - never more than a plain special for any honoured `part`.
- **`mp-bowvolley`** and **`mp-hotarrow`** check the live volley on a real worker: two-thirds per arrow, four burn ticks, and the burn-out at 2.5 s.
