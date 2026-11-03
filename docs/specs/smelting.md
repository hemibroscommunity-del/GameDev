# Smelting — ore into bars (v2.3.2822)

Owner, 2026-09-24, with the bar art: "Add this for the metal bar (that you can
recolor for different metal tiers). You can recolor this one to copper for
smelting the copper ore into. Make one bar require 5 copper ore. You get xp for
each time you smelt it into a bar."

This is the first half of the loop the owner asked for ("Make ore smelt in to
bars. Bars into armor."). Bars into armor is the next step and is NOT in this
change: the forge's weapon rows still take ore directly, as before.

**Since v2.3.3092 bars make armor** (the owner's "Yes"): iron and black steel
bars smelt too (Smithing 5 and 10, 600 and 800 XP a bar), and the Blacksmith's
Armor tab forges a torso or greaves in each metal. See
docs/specs/armor-forge.md.

**Since v2.3.3981 one ore makes one bar** (the owner: "Remove all references
to 5 resources requiring 25 of its inputs. I just want 5 raw to turn into 5
processed"). See "One ore, one bar" below; the numbers in this spec are the
one-to-one ones, with the old five-to-one beside them.

## What the player sees

- The Blacksmith panel (the door in town) has a **Smelting** section at the
  top: the Copper Bar, how many you hold, `ore/1 Copper Ore → 1 bar · +80
  Smithing XP` (v2.3.3981; `ore/5`, +400 before, and still against a worker
  without `caps.onetoone`), and **Smelt** / **Smelt all (n)**.
- Short of ore, the button reads "Need N more ore" and does nothing.
- Smelting shows "+1 Copper Bar" and "+80 Smithing XP" over the player with the
  collect chime, and a Smithing level-up gets the usual life-skill celebration.
- In the bag the bar is "Copper Bar" with its own picture. Copper ore's detail
  line says "Smelt 1 into a Copper Bar at the Blacksmith" (5 before v2.3.3981).
- The vendor buys a bar for more than the ore it cost (base 48 vs 40; it was
  240 vs 5 × 40).

## Numbers

| | |
|---|---|
| Ore per bar | 1 `ore_copper_ore` (5 until v2.3.3981) |
| XP per bar | 80 Smithing XP, paid per bar (400 until v2.3.3981) |
| Level needed | Smithing 1 |
| Smelt all | up to 50 bars per request, clamped to the ore on hand |

400 XP: a cooked fish pays 200 for one catch, and a bar was five trips to a
rock. Eight bars (forty ore) took Smithing from 1 to the copper forge tier (6).
Since v2.3.3981 a bar is one ore and 80 XP, so the same forty ore (forty bars)
reach the same level.
Every number is one line in `SMELT.RECIPES` (server) and its mirror
`SMELT_RECIPES` (client, `src/data/items.js`); the mirror-audit suite fails if
the two differ.

## How it is built

- **Server-settled** (`server/src/smelting.js`). The client sends
  `smelt_bar { barKey, count }`; the worker takes the ore from its own copy of
  the bag, pays the bars and the XP, saves, and answers `smelt_result`
  (privileged) followed by `player_state`. The client never edits its own bag.
- `barKey` is checked with `hasOwnProperty`, so `__proto__` / `constructor`
  smelt nothing (TRAPS #6).
- **Deploy order:** `caps.smelting` gates the Smelting section. An older worker
  has no `smelt_bar` case and would rebroadcast it, so without the cap the
  section is not drawn.
- **Kill switch:** `smelting: false` in liveflags refuses every smelt and
  un-advertises the cap. Ore and bars are untouched.
- A double-tap is one smelt: the buttons hold from the send until the ore count
  changes or 3 s pass.

## Art

`assets/items/metal-bar.png` is the owner's grey ingot. `tools/make_bar_icons.py`
gradient-maps it per metal (brightness → the metal's colour ramp), so the
painted shading survives and only the colour changes, and writes
`public/icons/items/bar-<metal>.webp` at 256×256. A new metal is one line in
its `METALS` table plus one line in `BAR_THUMBS` (`InventoryPanel.jsx`).

## Tests

- `server/test/smelting.test.mjs`: the 1-ore cost (§7: the 5-ore one with the switch off), one bar per
  smelt, XP per bar and the level-up, smelt-all clamping, refusals (short of
  ore, junk / inherited keys, forged huge or negative counts), the vendor price,
  and the kill switch.
- `mirror-audit`: client and server recipes match.
- `tools/qa/mp/mp-smelt.mjs` (`node tools/qa/mp/run.mjs smelt`, 14 checks): walks to
  the Blacksmith door, presses E, smelts, smelts all, double-taps, and checks
  the short-of-ore state and the art.

## One ore, one bar (v2.3.3981)

The owner, 2026-11-02, his "yes" to row 11 of docs/OWNER-LIST-2026-10-26.md:

> Remove all references to 5 resources requiring 25 of its inputs. I just
> want 5 raw to turn into 5 processed. So still wood to hardened wood but only
> require 5 instead of 25.

No recipe ever took 25: a gear piece takes five bars (or five hardened wood),
and a bar took five ore, so a piece was twenty-five ore. Now a bar is one ore
and a hardened wood one log (docs/specs/hardened-wood.md), so a piece is five.

| | Before | Now |
|---|---|---|
| Ore a bar | 5 | 1 |
| Smithing XP a bar (copper / iron / black steel) | 400 / 600 / 800 | 80 / 120 / 160 |
| Diego's bar (he asks / he pays into an empty pile) | 240 / 120 | 48 / 24 |
| A greatsword, a torso or greaves | 5 bars = 25 ore | 5 bars = 5 ore |
| A hardening attempt at H(n) | n bars = 5n ore | n bars = n ore |
| Salvage | 2 bars back | 2 bars back (2 ore's worth) |

- **XP a fifth**: the XP is tied to the ore, as the owner list suggested, so
  Smithing levels at the same pace per ore mined; the gear comes five times
  faster.
- **Diego's price**: the ore's 40 and the same fifth on top the bar always had
  (240 over 200). At 240 a 40-coin ore would have become a bar he pays 120
  for. The shop suite holds the rule for every bar and hardened wood, switch
  on and off: buying the ore from him to sell him the bar loses, and smelting
  before selling earns a little.
- **Unchanged**: five bars a piece (data.js, armorforge.js), hardening's n
  bars, salvage's 5-in-2-back, the level gates, 50 bars a request. Blacksmith
  Bro's first quest still swaps five ore for five bars; his line says one ore
  makes one bar now instead of "twenty-five ore ... the skinny-guy discount".
- **Bars already made** at five ore stay bars, worth 48 to Diego like any
  other.

**Either side first.** The worker settles from `_smeltRecipe` (RECIPES, or
with the switch off FIVE laid over it). It advertises `caps.onetoone`; the
game reads its rows through `smeltRecipe(key, caps.onetoone)`
(`src/data/items.js`): one ore with the cap, the old five (`SMELT_FIVE`)
without it, so an old worker and a new game agree. An old game against a new
worker still draws five ore a bar and asks for `floor(ore / 5)` bars: the
worker gives exactly that many, for that many ore, and the bag and the XP
come from the worker (no harm, only fewer bars than the ore could make).
mirror-audit holds both tables and both readers equal.

**Kill switch:** `onetoone: false` in liveflags brings back five ore a bar,
400 / 600 / 800 XP, Diego's 240 (and the same for hardened wood: five logs,
400 to 1,200 XP, 144), and un-advertises `caps.onetoone`, with no deploy.
Nothing held is touched. Throwing it after players have made bars at one ore
lets those bars sell at the old 120 once (a bounded windfall, not a loop: a
new bar costs five ore again); throw it only to undo the change.

Tests: `smelting` §7, `hardenedwood` §8, `shop` "no gold tap", `mirror-audit`
(smelting, hardened wood), `cost-guard` §11, `liveops` §8m.
