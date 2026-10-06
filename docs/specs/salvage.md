# Salvage, essences and four bars a piece (v2.3.3126)

> Owner, 2026-10-06: *"I'm thinking all items like iron armor, bronze armor,
> etc should be salvageable at the blacksmith for 50% of the bars it took to
> make them. So maybe chest, legs, and sword each take 4 bars to make (5 ore
> makes 1 bar). If you salvage them you get 2 bars back. I'm planning to have
> bars required for the chance at hardening your blade ... and also
> considering other uses within various skills. This prevents flooding of cheap
> bars and armor for lower level players at the auction house and should give
> them a pretty good source of income from higher level richer players."*
>
> *"I'm thinking smithed armor should also follow the rules at getting the
> chance at rare, elite, and godly too. Maybe if you salvage the rare, elite,
> and godly armor you can get back that tier's 'essence' and use it on
> whatever same tier armor or weapon you want."*

Smithed armor already rolls its grade like every piece does (9% Rare, 0.9%
Elite, 1 in 2,000,000 Godly; armorforge.js since v2.3.3092), so that part
needed no change.

The owner's other ask in the same message, a visible outline on worn Rare,
Elite and Godly armor, is its own change after this one.

## What the player sees

### Four bars a piece

| Piece | Copper | Iron | Black Steel | Smithing XP |
|---|---|---|---|---|
| Torso (Armor tab) | 4 bars | 4 bars | 4 bars | 800 / 1,200 / 1,600 |
| Greaves (Armor tab) | 4 bars | 4 bars | 4 bars | 800 / 1,200 / 1,600 |
| Sword or greatsword (Forge tab) | 4 bars + 20 gold | 4 bars + 35 gold | 4 bars + 55 gold | 800 / 1,200 / 1,600 |

- A torso was 5 bars and greaves 3. A copper, iron or black steel sword was 3,
  4 or 5 raw ORE; it is four bars now (twenty ore smelted), and pays the same
  XP as armor made from the same bars (it paid 30 / 55 / 80).
- The wood tier (pine logs) and the metals past black steel (no bar exists
  yet) are unchanged.

### The Blacksmith's Salvage tab

- It lists every copper, iron or black steel piece you CARRY: torsos and
  greaves from the bag, swords and greatswords from the weapon bag. Each row
  says what it gives back: **+2 bars**, and **+1 essence** if it is Rare,
  Elite or Godly.
- **Salvage** asks once ("Sure?"), and the second tap does it. The line at the
  top says what came back ("Salvaged Iron Torso: +2 Iron Bars, +1 Rare Iron
  Essence") or why not.
- What you wear is not listed. Take it off first.
- A piece made before the forge kept records (no server id) shows "Too old to
  salvage". It still works as armor. It cannot be sold either, for the same
  reason.

### Essences

- Nine kinds: **Rare, Elite and Godly**, each in **copper, iron and black
  steel** ("Rare Iron Essence"). Each is a glowing orb in its grade's colour
  (rare blue, elite orange, godly prismatic: the owner's colours for gear)
  with its metal's bar.
- Under **Essences** on the Salvage tab, each one you hold lists the carried
  pieces it can improve: the same metal, a lower grade. **Use** asks once,
  then the piece becomes that grade and the essence is used up.
- So a lucky roll can move: salvage a Rare iron greaves, and make an iron
  sword Rare. It can never climb a metal, and one Rare piece only ever makes
  one Rare piece again.
- Essences sit in the bag like any item: the shopkeeper buys them (750, 4,000
  and 125,000 for a Rare, Elite and Godly), and they can be listed on the
  auction house.

## Numbers, and why

- **Two bars back of four** is the owner's "50%".
- **Forge, then salvage, costs two bars for the forge's XP**: 800 XP for two
  copper bars, the same 400 a bar that smelting pays. Smithing for XP is no
  better or worse a deal than smelting, and the armor does not have to go to
  the auction house.
- **The shopkeeper prices essences by the grade, not the bars.** He SELLS what
  he buys, so a low price would turn gold into Rare gear at his counter. A Rare
  weapon hits 1.3x, an Elite 1.75x and a Godly 5x (QUALITY_GRADES).

Every number is one line: `SALVAGE` in `server/src/salvage.js`, the recipes in
`armorforge.js` and `data.js` `BLACKSMITH_TIERS`, the prices in `shop.js`.

## How it works

### Server: `server/src/salvage.js`

`salvageMethods` is mixed into GameRoom.

- **What counts.** `SALVAGE.METALS` names the metals that have a bar: an armor
  piece's `mat` (`copper`, `iron`, `blacksteel`) and a forged weapon's
  `gearBase` (`copper`, `iron`, `steel`, black steel's tier key). A dropped
  weapon has no `gearBase`, so it is never salvaged.
- **Armor is proven by its ledger id.** `smith_salvage {field, gid}` asks the
  same gate selling asks, `_gearSellable` (gearprov.js): minted for you, still
  yours, not worn, not in the mail. Then `_gearProvTake` takes the row and the
  server's own stash entry, the auction house's escrow step. The metal is
  checked on the ledger's own copy BEFORE anything is taken.
- **Weapons are named by index and signature.** `ps.weaponStash` is the
  authoritative list, so `{field: 'weaponStash', idx, sig}` names an entry,
  and `sig` (`weaponSig`: gearBase, type, grade, hardness, tierMult) must match
  it, or the request is refused (`changed`) and nothing moves.
- **Paid in one event.** The piece leaves, the bars and the essence arrive and
  `_saveRpg` runs in one input-gated event, with no await (the shape of
  `smelt_bar` and `forge_armor`).
- **Crash shape.** `_gearProvTake` writes the ledger before the rpg blob. A
  room that dies between them leaves the piece out of the ledger and the bars
  unpaid. The browser still holds its copy, which comes back as `legacy` on
  the next join: usable, never salvaged again. That is never a duplicate, the
  same walk storegear.js makes for a listing.
- **An essence changes the record.** `essence_apply` checks the essence, the
  metal and that the piece's grade is lower. For armor it changes the ledger
  row's `p.quality` (`_gearProvSetQuality`) and the server's stash entry, so
  every later join rebuilds the piece at its new grade. For a weapon it changes
  the weapon-bag entry. One essence is used.
- **Refusals answer**, with a reason, so the tab can say why. A 250 ms
  cooldown is stamped on every ask that gets that far.

### Client

- `src/data/salvage.js` mirrors the rules (mirror-audit pins every constant
  and helper), and names and pictures the essences.
- `src/game/salvage.js` handles the receipts: a salvaged torso or greaves
  leaves the browser's own armor list by its id, and a raised one takes its new
  grade there (the armor lists are the browser's own, gear-stash.md). The
  weapon bag rides the player_state echo.
- `SmithyPanel.jsx` `SalvageTab`, and the Forge tab's cost chip reads `bar` and
  `bars` for the three metals.
- The bag names essences (`ITEM_NAMES`), pictures them (`thumbFor`) and says
  what they do (ItemDetailPopup). The auction house shows the bag's name.
- Icons: `tools/make_essence_icons.py` (nine webps, about 15 KB each, drawn in
  code until painted art comes; ART-WISHLIST.md has the prompt).

## Wire

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `smith_salvage` | `{field: 'armorStash' \| 'legsStash', gid}` or `{field: 'weaponStash', idx, sig}` | two bars back, and an essence for a Rare/Elite/Godly piece |
| c→s | `essence_apply` | `{essence, field, gid}` or `{essence, field: 'weaponStash', idx, sig}` | the piece takes the essence's grade |
| s→c | `smith_salvage_result` | `{ok, field, gid \| idx, name, bar, bars, essence, grade, metal}` or `{ok: false, reason}` | PRIVILEGED, private; a player_state follows a paid one |
| s→c | `essence_result` | `{ok, field, gid \| idx, essence, grade, metal, piece}` or `{ok: false, reason}` | PRIVILEGED, private |

Reasons: `worn`, `in_mail`, `legacy`, `not_held`, `wrong_slot`, `gone`,
`changed`, `not_metal`, `no_essence`, `wrong_metal`, `not_lower`, `bad`.

Both c→s types are passthrough lines in the client's `channelShim` allowlist
(TRAPS #18) and router cases in `index.js`.

## Deploy order and kill switch (rule 19, TRAPS §117)

- **`caps.salvage`** gates the Salvage tab and both sends. An old worker has no
  case for either and would rebroadcast it, so the tab is never shown against
  one. An old client against the new worker simply never shows the tab.
- **`salvage: false`** in the live flags un-advertises the cap and refuses both
  acts. Pieces, bars and essences already held are untouched.
- The four-bar recipes need no gate: the worker charges what its own tables
  say, and the client draws the cost from its mirror of them. A client older
  than the worker shows the old cost for a sword until Pages redeploys; the
  worker refuses the forge if the bars are short.

## Tests

- **`server/test/salvage.test.mjs`** (55 checks): the numbers everywhere a
  piece is made; the helpers and junk keys; a sword from four bars (and not
  from ore); armor salvaged (bars, ledger row and stash entry gone, never
  twice) and the essence a Rare / Godly piece leaves; every armor refusal
  leaving everything as it was (worn, mail, wrong list, no id, not yours, not
  a metal, junk, dead); weapons by index and signature (a moved list, a
  dropped weapon, a bow, titanium, an empty slot, the hand); essences on armor
  (the ledger as stored) and weapons, and their refusals; the shopkeeper's
  prices, the cooldown and the kill switch.
- Updated: `armorforge` (four bars), `forgekeys` (a bar is the forge's key),
  `lifeskills-economy` and `prog3` (the iron and copper swords take bars),
  `mirror-audit` (the salvage rules on both sides).
- **`mp-salvage`** (phone, 16 checks): the tab and its empty state; four bars
  a torso and four the greaves; Salvage's "Sure?" and the second tap; an
  essence raising the greaves and coming back when they are salvaged; a copper
  greatsword from the weapon bag; the nine pictures; no page errors.
- Updated: `mp-armorforge` (four bars), `mp-smithy` (six tabs; and its harden
  step, which had needed more Smithing XP since v2.3.3090 doubled each level).
