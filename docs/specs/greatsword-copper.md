# Old wooden greatswords become copper, and copper looks like copper (v2.3.4000)

> **Built (v2.3.4000).** The owner, 2026-11-03: *"'Copper great sword' when
> Smithed looks gray in color like iron. Fix that. Also just remove any of the
> 'wooden' swords. Right now it's just called 'great sword'."*
> Code: `server/src/gscopper.js`, migration v20 (`server/src/migrations.js`),
> the post's heal (`inbox.js`), the shelves' rebuilds (`store.js`,
> `market.js`); the other player's greatsword
> (`src/rendering/systems/entityRenderer.js`, the peer branch) and the peer's
> swing tint (`effectsRenderer.js`). Tests: `server/test/sword-convert.test.mjs`
> sections 9-16; the phone scenario `mp-greatswordcopper`. Pictures:
> `docs/shots/greatsword-copper.md`.

This follows docs/specs/sword-to-greatsword.md (v19) door for door: read that
first.

## In plain words

- Every greatsword a character still holds that is **wood**, or an old drop
  with **no metal at all** that is no stronger than copper, turns into a
  **Copper Great Sword** the next time the player logs in: copper's damage
  (1.12, up from wood's 1.00), its grade (Rare, Elite...), its hardening and
  its gems kept.
- An old drop with no metal that is **stronger** than copper (the old
  Elemental, Fusion and Shift rolls) gets the metal that matches its strength
  (v2.3.4000): 1.50 becomes **Black Steel**, 2.25 **Diamond**, 3.00
  **Shadowsteel**. It keeps its own damage exactly, and its grade, hardening
  and gems. No metal-less greatsword is left.
- The Forge already makes no wood greatsword (since v2.3.3524); that is
  unchanged.
- Another player's greatsword is drawn with the same per-facing blade you hold
  yourself, in its metal. It used to be the one-handed sword's single picture.
- The Pine Shield, the pine bow and staff, and every other wooden thing stay
  exactly as they are.

## 1. What was grey, and why

The forge has minted copper correctly since v2.3.3524 (gearBase `copper`), and
every drawing of your own blade tints by gearBase through `weaponTint`
(materialTints.js: copper is 0xFF9E58). What showed grey:

| What | Why it was grey | The fix |
|---|---|---|
| The old starter grant (v2.3.1681-1759) | a greatsword at gearBase **wood**; migration v12 renamed it "Copper Great Sword" by its NAME only, so it said copper and was wood. Wood has no metal (`weaponMaterial` returns none), so the blade drew in the native grey steel | migration v20 |
| A greatsword from the old Forge's wood tier | the same: wood, no metal | migration v20 |
| An old random drop (v2.3.1141-v2.3.3209) | no gearBase at all: named "Great Sword" (data.js `WEAPON_TYPE_LABELS`), drawn native grey | migration v20: copper, or the metal of its strength (v2.3.4000) |
| Another player's greatsword | drawn from the BARE greatsword sheet (the one-handed `Sword1` icon) at every facing, tinted with `materialTint` (which also drew black steel bright) | the per-facing art and `weaponTint` (section 4) |
| Another player's swing (the stand-in) | `materialTint(wpnMat)`: black steel drew bright | `weaponTint(wpnType, wpnMat)` |

Measured in the reproduction (`mp-greatswordcopper`, the build before this
change, pictures in docs/shots/greatsword-copper.md): a copper greatsword
smithed on the Forge was already copper in your own hand
(`__btWeaponTint().local` 0xFF9E58 standing, jogging and swinging), in the
character window and in the bag; the other player saw it tinted copper too
(0xFF9E58), but as the thin one-handed icon, not the blade you hold. The wood
greatsword from the old Forge, in the same hand, was grey steel, and its bag
icon the grey steel one. So the grey "Copper Great Sword" the owner saw is
most likely the old starter: named copper by v12, wood underneath. Copper on
the greatsword sheet reads as copper, so its tint is not deepened.

## 2. The mapping (`oldGreatswordToMetal`, gscopper.js)

One pure function used by every door, so they can never disagree.

| Field | Change |
|---|---|
| which | `type === 'greatsword'` AND (`gearBase === 'wood'` OR no gearBase). Nothing else: no shield, no bow, no staff, no one-handed sword (v19's), no greatsword that already has a metal |
| `gearBase`, `tierMult` | wood, or no gearBase at tierMult up to copper's 1.12: `'copper'`, 1.12. No gearBase above 1.12: the metal (below), `tierMult` KEPT |
| `quality`, `hardness`, `temper`, `reforgeBonus`, `hardenBonus`, `element1`, `element2`, `isVolatile`, `tier` | unchanged |
| `name` | a name the game gave ("Great Sword", "Copper Great Sword", "Bro's Sword", "Wood Great Sword", the Forge's "wood greatsword", a gem's name through `weaponGemName`) becomes `weaponGemName` of the converted blade: "Copper Great Sword", "Black Steel Flame Great Sword". A name given by hand is kept; one starting "Wood"/"Wooden" says the metal instead |
| `was` | `{ t: 'greatsword', name, gearBase, tierMult }`, what it was (null gearBase for an old drop), set once |

**The metal of a strong drop (v2.3.4000).** The owner's intent ("just remove
any of the 'wooden' swords. Right now it's just called 'great sword'") covers
the strong drops too. A greatsword with no gearBase and a tierMult ABOVE
copper's becomes the forge tier (`BLACKSMITH_TIERS`, never wood) whose
multiplier is the closest one NOT above its own (`metalForTierMult`), and keeps
its own tierMult, so its damage and sell value never drop:

| Its tierMult | Its metal (the metal's own multiplier) |
|---|---|
| 1.13 to 1.24 | Copper (1.12) |
| 1.25 (exact), 1.30 | Iron (1.25) |
| 1.50 (the old Elemental roll) | Black Steel (1.40) |
| 2.16 (exact), 2.25 (the old Fusion roll) | Diamond (2.16) |
| 3.00 (the old Shift roll) | Shadowsteel (2.98) |

**The wear gate.** A weapon's melee gate is its metal's rung (`_prog3EquipOk`:
5 a rung above copper, iron free). With no gearBase it was the tierMult curve
(`round((tierMult - 1) x 6) x 5`, from rung 0), which is never lower than the
metal's rung, so no one loses the right to wear a sword they wear today: the
gate can only get easier (the old Shift roll asked melee 60, as Shadowsteel 45;
the Elemental roll 15, as Black Steel 10). The gate is asked at equip time only
(prog3.js `_prog3GearOk`), so nothing is taken off anyone either way.
`sword-convert.test` 9b checks it for every band. On the server a converted
drop has as many gem slots as before or more (one for a metal-less weapon,
the metal's own from Mythril on), and its gems are kept as they are.

## 3. When it runs

- **Migration v20, `wooden-greatswords-become-copper`**: `RPG_SCHEMA_VERSION`
  19 -> 20; walks the three weapon slots and the bag as v12 and v19 do. Runs on
  the next load of each character. Idempotent (a copper greatsword is never
  touched). A failed one leaves the record at 19 and retries on the next load
  (`_rpgSaveVFor`, TRAPS §191).
- **Boundary heals**, as v19's: the post's weapon credit (a market refund, an
  Auction House sale, a trade, No man's land); the Auction House's wake-time
  rebuild (a listing escrowing one is rewritten once, weapon and `disp`); the
  Marketplace's (a sell order's weapon converted and the order re-filed under
  its new metal's `tierKey`; a buy order for a wood greatsword re-filed for
  copper; a new order for one placed for copper). A BUY order under an old
  drop's rarity key ('common', 'elemental', 'fusion'...) is left as it is: it
  holds gold and names no tierMult, so no metal can be chosen for it safely.
- **The Forge is not changed.** It has made no wood greatsword since
  v2.3.3524 (the wood tier is `forge: false`). `forgeladder: false`, the
  operator's rollback of that ladder, still forges one (forge-ladder.test §7c
  pins the rollback whole); such a blade converts when it next passes the
  post or a shelf, not at a load (v20 has already run for that record).
- **A worker rollback** after v20: a blob at 20 is refused at the join by an
  older worker unless `newersave: false` is set (migrations.md).

## 4. The other player's greatsword (client)

`_updateOtherPlayers`' held-weapon branch now picks the greatsword's
per-facing sheet (`greatsword-<dir>`, the one your own carry uses since
v2.3.942) for the canonical facing, with its grip (`handles.json`), its fit
height (`weaponFitH`, the widened sheets' 48), the local carry's flips
(resolveDirection's mirror, plus south and north) and the south tilt. Kept
local to that branch; the swing still uses the bare sheet (the effectsRenderer
stand-in draws a swinging peer). The sheets load behind the loading screen
(`loadWeaponSprites`, the preload law); until one has, the bare sheet stands
in. The texture changes only when the facing does (TRAPS §218). The tint is
`weaponTint(wpnType, wpnMat)`. The QA probe `__btPeerSword[id].art` names the
sheet drawn.

## 5. Safety

- **Kill switch** `gscopper: false` (live flags, lower case), for every
  metal-less greatsword (the wood ones and the base-less drops, weak or
  strong): stops the boundary heals, the shelves' rewrites and the
  Marketplace's mapping. The migration is not switchable (v19's reason).
- **No cap**: the client change draws what the relay already carries
  (`wpnType`, `wpnMat`) and is safe against either worker; nothing on the
  client gates on the conversion.
- **No storage key added; no rpg-blob field added; no shape number bumped**
  (`was` rides on the weapon). The registry rows for `store_listing:` and
  `mkt_order:` say they may be rewritten once more.
- **Cost**: no write of its own at the migration (the load's one re-put); one
  put per listing or order holding a wood greatsword, once, at the first wake.
- **Deploys the worker.**
