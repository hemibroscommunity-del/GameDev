# The Woodworker, rebuilt after the Blacksmith (v2.3.3667)

Owner, 2026-10-27: "I also want the woodworking menu rehauled and modeled
after the blacksmith menu."

## The window (`src/ui/panels/buildings/WoodworkPanel.jsx`)

The old window was the v2.3.1232 restyle of the panel cut out of BroTown.jsx:
four big choices two by two (Bow, Staff, Traps, Harden), each with a note
under it, then a list of wood tiers with prices in the row and a hardening
button at the foot of the Bow and Staff views.  It is rewritten on the
Blacksmith's pattern (docs/specs/blacksmith-rebuild.md):

- **A header:** the Woodworking icon, "WOODWORKER", your level and its XP bar
  (`data-woodwork-level`).
- **One row of tabs, an icon and one word each:** Bow, Staff, Hardened,
  Upgrade, Traps (`data-ww-type`).  Hardened shows only against
  `caps.hardenedwood`, Upgrade against `caps.harden`, Traps against
  `caps.trapcraft`, as before.  The tab you were on is kept for the visit
  (`S._wwType`).
- **Bow and Staff** list the woods you can work now plus only the next one,
  locked (the Blacksmith's rule).  Each row: the weapon's picture (a "2◆" badge
  when its wood gives more than one gem slot), its name, its costs as chips
  (the hardened wood with HAVE/NEED, green or red, then the gold), the XP pill
  with the owner's XP star, and Make.  What stops you is ONE lock chip: the
  Woodworking level, or what wearing the weapon asks (the equip gate's own
  badge, `getEquipReqLabel`).  A "Holding Pine Bow" line above says what Make
  will move to the weapon bag, with a "Weapon bag full" lock when the bag
  cannot take it (the worker refuses then).
- **Hardened** is the hardened-wood tab as it was (`HardenedWoodTab.jsx`),
  only renamed from "Harden", which now read as hardening the weapon.
- **Upgrade** is new: hardening the bow and the staff you hold, the
  Blacksmith's Upgrade tab for this bench's two weapons.  A row each: H0 → H1,
  its hardened wood and gold as chips, the odds, "Fail keeps H1" (or "Fail →
  H0" against a worker before v2.3.3529), and Harden.  A short Woodworking
  level is a LOCK chip now, as the Blacksmith shows a short Smithing level
  (the old button could be pressed and the worker refused it).  Holding
  neither: "Hold a bow or a staff to upgrade it."
- **Traps** is the box-trap tab as it was (`TrapsTab.jsx`).

The Blacksmith's parts (the palette, the picture, the cost and lock chips,
the button and the row) moved into `BenchParts.jsx`, which both windows
import: the two benches are drawn by the same code, so they cannot drift
apart.  SmithyPanel.jsx is otherwise unchanged.

## Nothing is shown that the worker did not do

The old Make sent `forge_weapon` AND took the hardened wood and gold, moved
your old weapon into the bag, added the XP and said "Crafted Pine Bow!", all
in the browser before the worker answered; the next update from the worker put
right whatever it had refused.  Make now only asks (the Blacksmith's
`ask(key, msg, {sig, done, fail})`): the row waits ("…") until the worker's
update changes what it watches (the hand, the weapon bag's size), then says
"Made Pine Bow!", plays the woodwork sound, sets the quest flag and the level
celebration.  After 3.5 s with no change it says "Could not make it".  Harden
waits the same way; its result is the worker's `harden_result`, said as before.

| Tab | Message | Server |
|---|---|---|
| Bow, Staff | `forge_weapon {weaponType, tierKey, isWoodwork: true}` | gear.js `_handleForgeWeapon` |
| Hardened | `make_hardened_wood {key, count}` | hardenedwood.js |
| Upgrade | `harden_weapon {slot}` | hardening.js |
| Traps | `make_traps {log, count}` | trapping.js |

No worker change.

## Tests

- **`mp-woodwork`** (new, 17 checks, in the world): the header and the one row
  of five tabs; the Pine Bow's row with no hardened wood ("0/5" in red, Make
  off) and Softwood locked at Woodworking 5; with five hardened pine, "5/5" in
  green; Make sends `forge_weapon` and takes nothing at the press; the worker's
  answer (the old bow in the bag, the new one in hand, the wood and 8 gold
  gone, +1,000 Woodworking XP, "Made Pine Bow!"); the Staff tab; Upgrade's
  bow and staff rows; Traps with no logs, then with two; sideways (844 x 390)
  the five tabs still one row, none cut off; no page errors.
- **`mp-hardenbars`** section 6 reads the new window: the five tabs, the
  Upgrade tab's bow row ("0/1" red, Harden off, then "2/1" and Harden on), the
  gate it names (`woodworking:1`), the Hardened tab as before, and the worker
  taking one hardened pine wood and 500 gold.  24 of 24.
- **`mp-smithy`** (the Blacksmith, on the shared parts): 25 of 25.

## Still open

- The woodworker has no animation of his own at the bench (the Blacksmith
  borrows the mining swing); one would need art.
