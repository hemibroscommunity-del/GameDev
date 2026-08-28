# Monster drops — iron gear and the rare gem (v2.3.1924)

Owner: *"make it so monsters now have a 1 in 500 chance to drop an iron
chest and 1 in 500 of dropping iron legs. Add a 1 in 200 chance to drop a
rare gem (find a gem icon to use)."* — then: *"Also add iron greatsword 1 in
500 chance to drop."*

## What ships

| Drop | Rate | Rolled | Lands in |
|---|---|---|---|
| Iron Torso | 1 / 500 | per kill, own roll | client `armorStash` (via the private credit) |
| Iron Greaves | 1 / 500 | per kill, own roll | client `legsStash` |
| Iron Greatsword | 1 / 500 | per kill, own roll | server `weaponStash` (the existing weapon lane) |
| Rare Gem (`rare_gem`) | 1 / 200 | per kill | server `ps.inventory` |

All three roll on **any** monster in any zone, only when the pile has at
least one recipient who could claim them.

## Why this needed no new item system

A dropped armour piece is the **same record a quest piece is** —
`{name, tierMult, slot, mat}` (`quests.js _grantQuestItem`). `mat` is what
picks the world art, the bag icon and the tint (`gearVariants.js`,
`materialTints.js`); `tierMult` is what `getArmorPieceDr` turns into damage
reduction. So tier two cost two rows in `GEAR_VARIANTS` and two map entries,
and no new table anywhere.

Iron was already fully authored and simply unobtainable: it has had a
material and a tint since v2.3.1760 and finished icons
(`chest-plate-iron.webp`, `greaves-iron.webp` — .png until v2.3.2068) the
whole time.

**Two ladders, one metal (v2.3.1925b).** The armour pieces carry
`tierMult: 2.0` and the greatsword `1.25`, and that is deliberate:

- `getArmorPieceDr` is `base + perTier × (tierMult − 1)`, with copper at
  exactly 1.0 and `_armorDrMult` clamping at 8 — *eight whole steps*. Iron is
  tier two, so 2.0. (v2.3.1924 shipped 1.25 off the blacksmith table; that is
  a quarter of one step and moved a full set from 44.0% to 45.6%. At 2.0 it is
  **50.3%**.)
- A weapon multiplies its base damage by `tierMult` straight off
  `BLACKSMITH_TIERS`, where iron genuinely is 1.25.

The gem is a plain stackable. `prettyName('rare_gem')` already renders
"Rare Gem"; the only client addition is one `thumbFor` row pointing at
`/icons/ui/cur-gem.webp`, the gem picture the bag panel already uses for its
GEM stat row.

## The iron greatsword, and which weapon wins

Minted in the **forge's own shape**, field for field (`gear.js
_handleForgeWeapon`): `gearBase: 'iron'` is what the client rebuilds the
display name from and what `weaponMaterial()` turns into the blade's tint and
its icon, so a dropped blade and a crafted one are the same object. Quality
is still **rolled**, exactly as the forge and the ordinary weapon drop roll
it — which also hands this the pile's existing hidden-until-pickup reveal for
free.

Flat rate, like the armour and unlike the ordinary weapon drop next door:
that one is a cubic level curve because the *rarity tier* it mints scales
with the monster, and this mints one fixed item.

**A pile carries one weapon** (its own claim lane, v2.3.1141), so when both
weapon rolls land, one has to win. **The iron blade wins**, which keeps the
owner's number exact: 1 in 500 kills drop it, full stop.

The cost, stated rather than waved at: on a kill where both hit, an ordinary
weapon that would have dropped is replaced. The ordinary rate runs 0.05% at
level 1 to ~3% at level 100, so the overlap is 1-in-2,000,000 kills at the
bottom and 1-in-17,000 at the very top — and only at the top can the thing
replaced be rarer than iron. Both alternatives cost more than that: letting
the ordinary roll win makes the owner's 1-in-500 quietly 1-in-515 at level
100, and carrying two weapons means reworking an established claim lane and
its client credit on both sides for an event this rare.

It is gated by `disable_weapon_drops` (v2.3.1150) along with the ordinary
roll — that kill switch exists to stop weapons entering the economy, and a
drop that ignored it would be a hole in the lever rather than a new feature.

### The rare gem is NOT the elemental gem

`GEM_RAW_MONSTER_DROP` (5%, v2.3.1198) drops `raw_<element>` into
`lifeSkills.gems` in element zones, feeding the Gem Cutter and the amulet
forge. `RARE_GEM_MONSTER_DROP` is a different thing on purpose: any zone, any
monster, and it lands in the bag. Keeping them apart is what stops a change
to one rate silently retuning the amulet economy.

## Wire surface

No new event types — `loot_drop`, `loot_credit` and `loot_claimed` carry
everything, so `PRIVILEGED_EVENTS` is unchanged.

| Field | On | Notes |
|---|---|---|
| `armor` | pile, `_serializePile`, `loot_credit` | array of pieces (0–2) |
| `armorClaimed` | pile, `_serializePile` | own claim lane, like the weapon's |
| `gem` | pile, `_serializePile`, `loot_credit` | inventory key, or null |
| `armorClaimedNow` | `loot_claimed` | so watchers drop the pile's label |

**The armour and gem are broadcast in full**, unlike the weapon. The weapon
withholds `quality` because it is rolled at mint and revealed at pickup
(§4.6b.ii); these have no hidden roll at all — every field is fixed in
`MONSTER_ARMOR_DROPS` — so a pile the player can see says what is on it, and
that is what makes it worth walking to.

## Claim lanes

The pile now has three, and they are independent by design:

1. **the one-of inventory slot** — `skull`, `shard` and now `gem`, taken by
   the first picker (`inventoryClaimed`);
2. **the weapon** — its own flag since v2.3.1141;
3. **the armour** — its own flag, for the same reason: it must not consume,
   or be consumed by, lane 1.

## Where the armour is stored, and why it is the client

There is no server-side armour stash and handoff rule 1 forbids adding one
to the rpg blob. Quest armour settled this at v2.3.1695 — it goes to the
client's own `armourStash` / `legsStash` and the player equips it — and a
dropped piece follows the same road. Two consequences worth stating:

- Unlike the weapon there is **no stash-full auto-sell**: the bag that
  receives these is not the worker's to measure.
- `_applyLootCredit` is the only writer, so it carries the resend guard the
  quest adopt has (a reconnect that replays a credit must not mint a second
  copy).

The worker still learns what ends up worn, because equipping sends
`stats_update`.

## Tests

`server/test/drops.test.mjs` (33 assertions) — the rates read from the table
**and** from the roll with `Math.random` stubbed either side of each
threshold; independence (both pieces mint when both pass, one can mint
alone); the three claim lanes not eating each other; the gem credited to the
authoritative inventory; the armour deliberately **not** stashed server-side;
the blade carrying every field the forge mint sets (without `gearBase` it is
a nameless grey greatsword); and which weapon wins, pinned in **both**
directions plus the kill switch.

`tools/qa/mp/mp-drops.mjs` (12 assertions) — the halves no server test can
see: the chest piece into `armorStash` and the legs piece into `legsStash`
(filing legs under the chest stash equips them to the torso and mitigates
nothing — v2.3.1701), both carrying `mat` and `tierMult`, no duplication on a
resend, and the gem granted through the **real operator endpoint** then read
off the rendered bag tile as a picture rather than a fallback glyph.

`window.__btLootCredit` (wsClient.js) is a QA seam in the same family as
`window.__btDispatch`: a 1-in-500 drop cannot be waited for, so the handler
is driven directly with the payload the worker emits — and that payload's
shape is pinned by the server suite, so the two together cover the join
neither covers alone.
