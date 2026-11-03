# The stat families (the Character page's stat pills)

`src/ui/mobile/sheet/heroStatPills.js` `heroStatFamilies`, drawn by
`HeroExpanded.jsx` `famPill`. Four families, each a pill with its headline
number that opens on what it is made of: **Damage** (DPS), **Defense**,
**Health** (max HP), **Energy** (stamina / mana). Every number is read through
the reader the Points tab prints it with (v2.3.3605).

## Defense: the real damage cut (v2.3.3896)

The owner, 2026-11-02: *"64% redux from armor, 42% reduced from def points. It
says '42%' as the aggregate defense in the little pill on my equipment screen.
How are these percentages calculating things?"* The head showed the Defense
POINTS alone and left armour out.

What the worker does to a normal hit (`server/src/combat.js` `_applyDamage`),
in order:

1. a held block takes nothing;
2. Dodge may miss it entirely (a chance, not a cut);
3. Defense multiplies it by `max(1 - def, FLOOR / (1 - dodge))` (the combined
   floor, `PROG3.FLOOR`, v2.3.2680), fading against monsters above your level
   (-20% a level, gone at +5);
4. armour multiplies it by `1 - armour` (`_armorDrMult`, mirrored by
   `getArmorDrPct`); armour never fades.

Elemental hits skip Dodge and Defense and meet Resist; armour still applies.

So the head is `combinedDamageCut(def, armour, dodge)` = `1 - cut x (1 - armour)`
for a same-level monster's normal hit: Defense 42% and armour 64% read
**"-79% damage"** (0.58 x 0.36 = 0.21 gets through). The rows: "Defense points
-42%", "Armour -64%", "Dodge 8%", "Resist"; one plain line under them: "Your
Defense points block 42% of a hit, then your armour blocks 64% of what's
left." The (i) (`infoGlossary.js` `Defense`) says Defense fades above your
level and that elemental hits use Resist.

Tests: `server/test/damage-cut.test.mjs` (the combine, the floor, the family);
`mp-statfamilies` (the head equals the combine of the rows, on the phone,
upright and sideways).
