# Smelting — ore into bars (v2.3.2822)

Owner, 2026-09-24, with the bar art: "Add this for the metal bar (that you can
recolor for different metal tiers). You can recolor this one to copper for
smelting the copper ore into. Make one bar require 5 copper ore. You get xp for
each time you smelt it into a bar."

This is the first half of the loop the owner asked for ("Make ore smelt in to
bars. Bars into armor."). Bars into armor is the next step and is NOT in this
change: the forge's weapon rows still take ore directly, as before.

## What the player sees

- The Blacksmith panel (the door in town) has a **Smelting** section at the
  top: the Copper Bar, how many you hold, `ore/5 Copper Ore → 1 bar · +400
  Smithing XP`, and **Smelt** / **Smelt all (n)**.
- Short of ore, the button reads "Need N more ore" and does nothing.
- Smelting shows "+1 Copper Bar" and "+400 Smithing XP" over the player with the
  collect chime, and a Smithing level-up gets the usual life-skill celebration.
- In the bag the bar is "Copper Bar" with its own picture. Copper ore's detail
  line says "Smelt 5 into a Copper Bar at the Blacksmith".
- The vendor buys a bar for more than the five ore it cost (base 240 vs 5 × 40).

## Numbers

| | |
|---|---|
| Ore per bar | 5 `ore_copper_ore` |
| XP per bar | 400 Smithing XP, paid per bar |
| Level needed | Smithing 1 |
| Smelt all | up to 50 bars per request, clamped to the ore on hand |

400 XP: a cooked fish pays 200 for one catch, and a bar is five trips to a
rock. Eight bars (forty ore) take Smithing from 1 to the copper forge tier (6).
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

- `server/test/smelting.test.mjs` (23 checks): the 5-ore cost, one bar per
  smelt, XP per bar and the level-up, smelt-all clamping, refusals (short of
  ore, junk / inherited keys, forged huge or negative counts), the vendor price,
  and the kill switch.
- `mirror-audit`: client and server recipes match.
- `tools/qa/mp/mp-smelt.mjs` (`node tools/qa/mp/run.mjs smelt`, 14 checks): walks to
  the Blacksmith door, presses E, smelts, smelts all, double-taps, and checks
  the short-of-ore state and the art.
