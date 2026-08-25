# The mystery reveal — rarity on drops (v2.3.1925)

Owner: *"I also want the drop to consider a rarity system... The idea is
that the item rolls between normal and rare... If it's on rare tier or above,
the item becomes a silhouette with a question mark. You get to roll again to
see if it reaches the next tier. Once the roll is complete it's a short
celebration message. The item is identified in font color of its rarity
tier."*

## The ladder (unchanged — it already existed)

| Grade | Multiplier | Rate | Colour |
|---|---|---|---|
| Normal | 1.00× | ~90.0998% | — (the panel's own white) |
| Rare | 1.20× | 9% | `#5B99DE` blue |
| Elite | 1.50× | 0.9% (1 in 111) | `#A477DF` purple |
| Godly | 3.00× | 1 in 400,000 | `#F0C45F` gold |

`Q_RARE` / `Q_ELITE` / `Q_GODLY` in `server/src/hardening.js`; multipliers
mirrored client↔server and pinned by `mirror-audit.test.mjs`.

## What v2.3.1925 adds

1. **Armour rolls quality**, through the same `_rollWeaponQuality` weapons
   use. One distribution, so a grade means the same thing on a breastplate as
   on a blade, and there is one place to retune.
2. **Quality reaches the armour maths.** It multiplies the piece's
   **tierMult**, not its reduction — see below.
3. **The pile hides the grade and says so.** `_serializePile` strips
   `quality` from armour (weapons never carried it) and adds a `mystery` bit.
4. **The reveal ceremony** — `src/ui/reveal/RevealOverlay.jsx`, fed by
   `revealBus` from the private loot credit.

## Why quality multiplies the tier, not the reduction

`getArmorPieceDr` is `base + perTier × (tierMult − 1)`, chest 30%/+5%, legs
20%/+3.5%, whole thing clamped at 0.75.

Multiplying the **reduction** would put a godly chest at 0.30 × 3 = **90%** —
straight into the clamp, with the clamp doing all the work. That is the exact
failure `_armorDrMult`'s own comment records for multiplying the base by an
8× tierMult.

Multiplying the **tier** puts a godly iron chest at tm 6.0 → **55%**, inside
the ladder the formula was built for, and keeps quality meaning what it means
on a weapon: *the item is exceptional, your character is unchanged*.

**Where that lands, stated because it is close to the ceiling.** With iron at
tier step 2.0 (v2.3.1925b), a full *godly* iron set is 55% + 37.5% combining
to **71.9%** — just under the 0.75 cap. That is intended rather than
overlooked: godly is 1 in 400,000 and *should* read as skipping several tiers,
and the cap is what holds the top no matter what tier or grade arrives. Both
implementations clamp `tierMult` to [0,8] before the arithmetic, and
`drops.test.mjs` includes a `tierMult: 8 × godly` case precisely to catch an
implementation that forgot to.

Both sides implement it and `drops.test.mjs` compares them **directly** —
`_armorDrMult` against the client's `getArmorPieceDr` across every grade —
because a drift here is invisible on screen: the card promises one number and
the hits deliver another.

## The reveal is a presentation, not a roll

The grade is committed by the worker **at mint** and is already sitting in the
loot pile before anyone touches it. What the credit carries is a **ladder** —
the sequence of stages to play — and its last rung is the answer:

```
rare   -> ['rare']              one stage, settles on the floor
elite  -> ['elite']             one stage, escalates past rare
godly  -> ['elite','godly']     two stages
normal -> null                  no ceremony
```

The server sends the ladder rather than letting the client derive it from the
grade, for the same reason the grade is withheld from the pile: the client
should never hold the answer before the animation reaches it. GDD §4.6b.ii
makes the same argument — an animation calibrated to land on a pre-committed
result and one showing live rolls are mathematically indistinguishable, and
only the first is safe to let a client draw.

## Two deliberate departures from GDD §4.6b.ii

**Timing.** The spec asks ~9 seconds per stage (18s for an Elite). The owner
asked for "a short celebration" and this is a phone game whose loop is
kill-loot-move. `STAGE_MS` is **2000** — 1500 of fast spin at the spec's own
12 ticks/second, then 500 of deceleration showing its three discrete ticks.

The per-tick delay is **clamped to the stage's end**, and that is not a
nicety: the last decelerated tick is ~7× the base interval, so an unclamped
schedule overshoots by ~580ms *per stage* and a godly ran ~5.2s against the 4s
this file documents. Caught by `mp-drops`, which read the overlay at 4.4s and
found it still spinning.

**Colours.** The spec says silver / gold / prismatic. The code has had
`QUALITY_COLOR` since v2.3.1845 and the bag and equip card already draw rare
blue, elite purple, godly gold. Two palettes for one ladder means the reveal
and the inventory disagree about an item thirty seconds apart, so the code's
palette wins (CLAUDE.md: the GDD is early thinking; code is truth).

## Wire surface

No new event types. `loot_credit` gains `reveals`; the pile gains `mystery`,
`weaponMystery`, and `mystery` per armour piece.

| Field | On | Notes |
|---|---|---|
| `mystery` | pile | any unclaimed lane holds a hidden grade |
| `weaponMystery` | pile | the blade's grade is rare-or-better |
| `armor[].mystery` | pile | per piece; `quality` is **stripped** |
| `reveals` | `loot_credit` | `[{kind, name, itemType, mat, quality, ladder}]`, or null |

Claimed lanes are excluded from `mystery` — once someone takes the blade the
pile stops advertising a secret it no longer holds.

## Where it shows

- **On the ground:** a mystery pile pulses faster and harder, and its label
  reads `Iron Greaves ?`. The spec hides the **grade**, not the item — you
  know what dropped, not whether it is a 1-in-11 or a 1-in-400,000.
  The weapon's `?` is now *earned*: it used to sit on every weapon drop
  because the pile could not say whether anything was withheld worth having,
  so ~90% of the question marks in the game were asking about a Normal.
- **On pickup:** the overlay — silhouetted item art under a question mark,
  cycling between the floor and the escalation, landing on the grade with a
  short celebration and the item named in its colour. Deliberately **not** a
  modal: the world keeps playing behind it, because a 2-second flourish that
  you cannot dodge during is 2 seconds of being hit.
- **Afterwards:** the Hero equip card already colours an item's name by
  `quality` (v2.3.1847, built for exactly this) — so armour picks it up with
  no change. The bag's item popup still distinguishes grades only by the "%
  damage reduced" line; colouring that surface too is a follow-up.

## Tests

`server/test/drops.test.mjs` (+17, 50 total) — every piece carries a grade;
the grade never reaches the wire while the name still does; only rare+ is
flagged as a mystery and a pile of normals is not; each ladder shape; the
credit carries a reveal for the hidden piece and none for the normal one on
the same pickup; and the client/server damage-reduction parity above, plus
that a godly actually mitigates more **and** stays clear of the clamp.

`tools/qa/mp/mp-drops.mjs` (+15, 27 total) — driven through the real socket
handler with the payload the worker emits. The overlay opens on a rare, shows
a question mark over a silhouette, **does not show the grade while it is still
rolling**, lands on its grade in the same blue the bag uses, and clears
itself. A godly is still rolling at the moment a one-stage reveal would have
finished, lands gold after the second stage, and lifts the silhouette. A
normal opens no ceremony at all.
