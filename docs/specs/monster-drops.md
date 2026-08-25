# Monster drops — iron armour and the rare gem (v2.3.1924)

Owner: *"make it so monsters now have a 1 in 500 chance to drop an iron
chest and 1 in 500 of dropping iron legs. Add a 1 in 200 chance to drop a
rare gem (find a gem icon to use)."*

## What ships

| Drop | Rate | Rolled | Lands in |
|---|---|---|---|
| Iron Torso | 1 / 500 | per kill, own roll | client `armorStash` (via the private credit) |
| Iron Greaves | 1 / 500 | per kill, own roll | client `legsStash` |
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
(`chest-plate-iron.png`, `greaves-iron.png`) the whole time. `tierMult` is
**1.25 — iron's own `BLACKSMITH_TIERS` multiplier**, so armour and weapons
price the metal from one number instead of two hand-kept ones.

The gem is a plain stackable. `prettyName('rare_gem')` already renders
"Rare Gem"; the only client addition is one `thumbFor` row pointing at
`/icons/ui/cur-gem.webp`, the gem picture the bag panel already uses for its
GEM stat row.

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

`server/test/drops.test.mjs` (22 assertions) — the rates read from the table
**and** from the roll with `Math.random` stubbed either side of each
threshold; independence (both pieces mint when both pass, one can mint
alone); the three claim lanes not eating each other; the gem credited to the
authoritative inventory; the armour deliberately **not** stashed server-side.

`tools/qa/mp/mp-drops.mjs` (10 assertions) — the halves no server test can
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
