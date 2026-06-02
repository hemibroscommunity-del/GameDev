#!/usr/bin/env python3
"""
audit-validator.py -- GDD 6.5 Kill-Time Audit Gate validator.

Reproduces the GDD's section 6.5 kill-time calculation from first principles
and checks it against the canonical audit gate ranges. This is the script the
GDD 6.5 methodology calls for ("proposed name audit-validator.py, not yet
authored") so the hits-to-kill math is reproducible by machine whenever the
4.2 / 4.4 / 6.1 / 6.3 / 24 sections change -- instead of being redone by hand.

It also has a --scale mode that is the verification tool for the proposed
"baseline-10" damage/HP normalization. A uniform rescale of every ABSOLUTE
damage and HP constant by the same factor is a units change (a gameplay
no-op). --scale divides those constants and reports two things:
  1. CONTINUOUS hits-to-kill -- exact match proves the rescale is a no-op.
  2. CEIL'd hits-to-kill -- the drift introduced by integer rounding once the
     numbers get small. This is a real cost of normalization, surfaced here.

All constants are quoted from the GDD with their section number. If a GDD
value changes, change it here too (this is the machine copy of those numbers).

Usage:
  python tools/audit-validator.py                  # validate canonical gates
  python tools/audit-validator.py --weapon-base 48 # try 4.2 Greatsword base
  python tools/audit-validator.py --scale 4.8      # check a 4.8x rescale
  python tools/audit-validator.py --starter        # show L1 per-type damage

Exit code 0 if every audit gate passes (and, with --scale, the continuous
rescale is exact), 1 otherwise.
"""

import argparse
import math
import sys

# ------------------------------ GDD constants ------------------------------
# 4.4 Weapon Damage:  weapon_damage = (weapon_base + Power*COEFF) * tier_mult
POWER_DMG_COEFF = 0.8         # 4.4 POWER_DMG_COEFF(0.8)
HARDNESS_BASE_BONUS = 5       # 4.4 HARDNESS_BASE_BONUS(5)
QUALITY_NORMAL = 1.00         # 4.6b Normal quality multiplier

# 4.2 base weapon damage table: name -> (weapon_base, attack_speed)
WEAPONS = {
    "greatsword": (48, 0.7),
    "sword":      (32, 1.4),
    "bow":        (35, 1.2),
    "staff":      (41, 1.0),   # plus Roll(0.75,1.25); avg 1.0 used here
}
# 6.5 methodology references a "reference Greatsword" weapon_base of 35.
# NOTE: this conflicts with the 4.2 Greatsword base of 48 (flagged on run).
AUDIT_REFERENCE_BASE = 35

# 4.1 material tier multiplier: linear 1.0x at T1 -> 6.2x at T20
TIER_MIN, TIER_MAX, TIER_AT_MIN, TIER_AT_MAX = 1, 20, 1.0, 6.2

# 6.1 Tri-Phase monster HP scaling (continuous, ceil()):
MON_BASE_HP = 40             # 6.1 base
R_RAMP, R_PLATEAU, R_ENDGAME = 1.065, 1.035, 1.025   # 6.1 HP rates
RAMP_END, PLATEAU_END = 30, 65   # ramp L1-30, plateau L31-65, endgame L66-100
MON_BASE_DMG = 8             # 6.1 base monster damage (separate axis from HP)

# 6.3 archetype HP / Dmg modifiers: name -> (hp_mult, dmg_mult)
ARCHETYPES = {
    "fodder":   (0.6, 0.8), "brute": (1.5, 1.3), "swarm": (0.4, 0.6),
    "sentinel": (1.0, 1.0), "volatile": (0.8, 1.0), "stalker": (0.7, 1.2),
    "hexer":    (0.9, 0.8),
}

# 6.5 median-Power reference: median_power(L) ~= 6 + (L-1)*1.05
POWER_BASE, POWER_PER_LEVEL = 6.0, 1.05

# 6.5 canonical audit rows: (level, tier, archetype, (gate_min, gate_max))
AUDIT_ROWS = [
    (15,  3, "brute", (1, 3)),
    (35,  7, "brute", (2, 3)),
    (65, 13, "brute", (3, 4)),
    (100, 20, "brute", (3, 5)),
]


def tier_mult(tier):
    """4.1 material tier multiplier, linear 1.0x@T1 -> 6.2x@T20."""
    t = max(TIER_MIN, min(TIER_MAX, tier))
    return TIER_AT_MIN + (t - TIER_MIN) * (TIER_AT_MAX - TIER_AT_MIN) / (TIER_MAX - TIER_MIN)


def median_power(level):
    """6.5 level-appropriate median Power."""
    return POWER_BASE + (level - 1) * POWER_PER_LEVEL


def monster_hp_continuous(level, archetype, c):
    """6.1 tri-phase HP * 6.3 archetype modifier, WITHOUT the final ceil()."""
    ramp = min(level, RAMP_END) - 1
    plateau = max(0, min(level, PLATEAU_END) - RAMP_END)
    endgame = max(0, level - PLATEAU_END)
    hp = c["MON_BASE_HP"] * (R_RAMP ** ramp) * (R_PLATEAU ** plateau) * (R_ENDGAME ** endgame)
    return hp * ARCHETYPES[archetype][0]


def monster_hp(level, archetype, c):
    """6.1 HP with the canonical ceil()."""
    return math.ceil(monster_hp_continuous(level, archetype, c))


def weapon_damage(weapon_base, power, tier, c, hardness=0, quality=QUALITY_NORMAL):
    """4.4 weapon damage.  c = (possibly scaled) constants dict."""
    eff_base = (weapon_base + hardness * c["HARDNESS_BASE_BONUS"]) * quality
    return (eff_base + power * c["POWER_DMG_COEFF"]) * tier_mult(tier)


def scaled_constants(k):
    """Divide every ABSOLUTE damage/HP constant by k (multipliers untouched)."""
    return {
        "POWER_DMG_COEFF":     POWER_DMG_COEFF / k,
        "HARDNESS_BASE_BONUS": HARDNESS_BASE_BONUS / k,
        "MON_BASE_HP":         MON_BASE_HP / k,
        "MON_BASE_DMG":        MON_BASE_DMG / k,
    }


def run_audit(weapon_base, c, label):
    print(f"\n=== Audit gates ({label}) ===")
    print(f"{'Lvl':>4} {'Tier':>4} {'Power':>6} {'WpnDmg':>8} {'BruteHP':>8} "
          f"{'Hits':>6} {'Gate':>7} {'Result':>7}")
    all_pass = True
    for level, tier, arch, (lo, hi) in AUDIT_ROWS:
        p = median_power(level)
        dmg = weapon_damage(weapon_base, p, tier, c)
        hp = monster_hp(level, arch, c)
        hits = hp / dmg
        ok = lo <= hits <= hi
        all_pass &= ok
        print(f"{level:>4} {tier:>4} {p:>6.0f} {dmg:>8.1f} {hp:>8.0f} "
              f"{hits:>6.2f} {str(lo)+'-'+str(hi):>7} {'PASS' if ok else 'FAIL':>7}")
    return all_pass


def show_starter(c, k=1.0):
    """L1 per-hit damage + DPS for each 4.2 weapon type at scale /k."""
    p = median_power(1)
    print(f"\n=== Level-1 starter damage (Power {p:.0f}, T1, Normal, H0, scale /{k:g}) ===")
    print(f"{'Weapon':>10} {'base':>6} {'per-hit':>8} {'atk/s':>6} {'DPS':>7}")
    for name, (base, spd) in WEAPONS.items():
        b = base / k
        dmg = weapon_damage(b, p, 1, c)
        print(f"{name:>10} {b:>6.1f} {dmg:>8.2f} {spd:>6.2f} {dmg*spd:>7.2f}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--weapon-base", type=float, default=AUDIT_REFERENCE_BASE,
                    help=f"reference weapon_base for the audit (default {AUDIT_REFERENCE_BASE}, "
                         f"the 6.5 reference; 4.2 Greatsword is 48)")
    ap.add_argument("--scale", type=float, default=None,
                    help="divide all absolute damage/HP constants by this factor and "
                         "report whether hits-to-kill are preserved")
    ap.add_argument("--starter", action="store_true",
                    help="also print L1 per-type starter damage")
    args = ap.parse_args()

    base_c = scaled_constants(1.0)

    if WEAPONS["greatsword"][0] != AUDIT_REFERENCE_BASE:
        print(f"[doc-drift] GDD 4.2 Greatsword base = {WEAPONS['greatsword'][0]} but the 6.5 "
              f"audit methodology references weapon_base = {AUDIT_REFERENCE_BASE}. "
              f"These should be reconciled in the GDD.")

    unscaled_pass = run_audit(args.weapon_base, base_c, "GDD baseline")
    if args.starter or args.scale:
        show_starter(base_c)

    ok = unscaled_pass
    if args.scale:
        k = args.scale
        c = scaled_constants(k)
        print(f"\n=== Rescale check: divide all absolute damage+HP by {k:g} ===")
        scaled_pass = run_audit(args.weapon_base / k, c, f"scaled /{k:g}")
        show_starter(c, k=k)

        # 1. Continuous (no-ceil) hits prove the unit-change is exact.
        # 2. Ceil'd hits show the rounding drift once numbers get small.
        cont_exact = True
        max_ceil_drift = 0.0
        for level, tier, arch, _ in AUDIT_ROWS:
            p = median_power(level)
            d0 = weapon_damage(args.weapon_base, p, tier, base_c)
            d1 = weapon_damage(args.weapon_base / k, p, tier, c)
            cont0 = monster_hp_continuous(level, arch, base_c) / d0
            cont1 = monster_hp_continuous(level, arch, c) / d1
            if abs(cont0 - cont1) > 1e-9:
                cont_exact = False
            ceil0 = monster_hp(level, arch, base_c) / d0
            ceil1 = monster_hp(level, arch, c) / d1
            max_ceil_drift = max(max_ceil_drift, abs(ceil0 - ceil1) / ceil0)
        print(f"\n  continuous hits-to-kill identical (rescale is a true no-op): "
              f"{'YES' if cont_exact else 'NO'}")
        print(f"  max ceil()-rounding drift once HP is small: {max_ceil_drift*100:.1f}% "
              f"(cost of small numbers: integer HP gets coarser; tune-ability drops)")
        ok = ok and scaled_pass and cont_exact

    print(f"\n{'ALL GATES PASS' if ok else 'AUDIT FAILED'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
