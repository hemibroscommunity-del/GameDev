# Zone progression — mid-band content, entry gating, tutorial (v2.3.1143)

Closes the L25–L38 dead band exposed by zone unpinning (v2.3.1140): verdant and
mist owned [22,40] but spawned nothing, so a player who outgrew frost/tidal
(max 25) had no in-band combat until hollows/sky (min 38) — whose entrances
spawned flat band-floor monsters (~71 dmg brutes vs a typical L26's ~162 HP).

## New monsters (tinted reskins — zero new art)

| Zone | Spawn | Variant | Source sheets | Tint |
|---|---|---|---|---|
| verdant | fodder×8 | mossSlime | slime state sheets | 0x55cc44 |
| verdant | brute×4 | thornShambler | rockmonster | 0x4f9a3f |
| mist | fodder×6 | mireWisp | slime state sheets | 0x7a5fa8 |
| mist | brute×4 | bogLurker | fishman | 0x5f7a5a |

Mechanism: `MONSTER_VARIANTS[key].tint` (plain Pixi sprite tint) consumed at
the four entityRenderer sites that previously hard-reset `0xffffff`. Fodder
skins set `useSlimeSheets: true` and ride the slime state branch (no
VARIANT_SPRITES entry); brute skins re-point at the cached rockmonster/fishman
loaders in `monsterVariantSprites.js` (shared textures, per-sprite tint).

**Stats are 100% base-archetype + zone level band.** Deliberately NO
`incomingDmgScalar` / `xpMult` / `dmgMult` on the new variants — those fields
are client-prediction-only relics from the pre-v2.3.912 era (the server rolls
authoritative damage via `_computeAttackDamage` and pays base-archetype XP);
setting them desyncs prediction from `monster_hit` truth. Variant speeds are
mirrored in the server's `_variantSpeed` (all four at 0.5). NOTE: legacy
tidal/hollows brutes have no server speed entry and move at 0.35 — a
pre-existing disagreement left untouched to preserve shipped zones' feel.

## Entrance ramp

`_spawnZoneMonsters` (server) and `spawnMonstersForZone` (client mirror): the
shallowest 15% of a zone spawns up to 4 levels BELOW the band floor
(`ramp = round((1 - depthPct/0.15) * 4)`), so hollows entry reads L34–38
instead of flat 38. The client's `applyZoneVariant` level floor clamp was
relaxed to `minLv - 4` to match.

## Soft entry gating (client)

`zoneTransitions.js` hub-exit path: if the target zone's band floor exceeds
`player level + 5` (the ±5 valid-threat convention), the first approach
bounces the player 2 tiles back toward hub center with a red warning
("⚠️ <zone> is Lv X–Y! Walk in again to enter"). A second approach within
10 s passes — informed consent, not a wall. Hard gating remains a
MAP-REDESIGN follow-up if wanted.

## Tutorial re-enable

The hint banner was hard-disabled behind a literal `false &&`
(BroTown.jsx) while the step machine kept running — veterans' `bt_tutorial`
already reads 7/10 so only genuinely fresh profiles see it. Two step-machine
bugs fixed: the level-3 trigger jumped 5→7 (permanently skipping the step-6
"Tutorial complete" message), and step 6 auto-advanced the next frame; it now
dwells ~6 s.

## Lockstep enforcement

`server/test/tick.test.mjs` §9 imports BOTH ZONES tables (server
`server/src/data.js`, client `src/data/zones.js`) and asserts per-zone level
bands and spawn arch/count equality. This check immediately caught a real
pre-existing drift (client sky listed a fodder×6 entry the server never had;
client corrected to mirror the authoritative table). Any future zone change
that touches one table without the other fails CI.

## Anti-forgery fix (en route)

`monster_transform` has been server-emitted since the mummy→skeleton
transform moved server-side, but was never added to `PRIVILEGED_EVENTS` — a
client could forge cosmetic transforms on everyone's screen. Closed.
