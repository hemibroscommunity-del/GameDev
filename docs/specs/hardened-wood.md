# Hardened wood — v2.3.3139

The owner, after hardening was put on metal bars (docs/specs/hardening.md):

> Maybe 5 logs of the raw material can make one "hardened (name) wood" raw
> material so it mirrors the same structure. Also for the number required and
> gold too

So the Woodworker gets the Blacksmith's smelting (docs/specs/blacksmith-rebuild.md,
`server/src/smelting.js`): five logs of one tree make one **hardened wood** of
that tree, and a bow or a staff is hardened with its own wood's hardened wood,
one more each level, for the same doubling gold a sword pays in bars.

Server: `server/src/hardenedwood.js` (`HARDENED_WOOD`). Game's copy:
`src/data/hardenedWood.js` (held to it by mirror-audit). Tab:
`src/ui/panels/buildings/HardenedWoodTab.jsx`. Tests: `server/test/hardenedwood.test.mjs`,
`hardening` suite §8c, `mp-hardenbars`.

## The five woods

| Hardened wood | Made from | Woodworking | XP each | Hardens |
|---|---|---|---|---|
| Hardened Pine Wood (`hardened_pine`) | 5 Pine Logs (`wood_pine_log`) | 1 | 400 | pine bows and staffs |
| Hardened Softwood (`hardened_softwood`) | 5 Softwood (`wood_softwood`) | 5 | 600 | softwood |
| Hardened Hardwood (`hardened_hardwood`) | 5 Hardwood (`wood_hardwood`) | 10 | 800 | hardwood |
| Hardened Cedar Wood (`hardened_cedar`) | 5 Cedar Wood (`wood_cedar_wood`) | 15 | 1,000 | cedar |
| Hardened Maple Wood (`hardened_maple`) | 5 Maple Wood (`wood_maple_wood`) | 20 | 1,200 | maple, and every wood past it until its own logs grow |

- **Mirrors the bars**: five of the raw material each, the levels five apart
  (smelting is Smithing 1 / 5 / 10), and the XP the bars pay (400 / 600 / 800)
  carried on two more steps: each log earns 80 XP when it is hardened, as each
  ore does when it is smelted.
- **Names**: the owner's "hardened (name) wood", the tree's own bag name in the
  middle; Softwood and Hardwood already say wood.
- **Keys are `hardened_<wood>`, never `wood_`**: every `wood_` key is a log to
  the rest of the game (the campfire burns one, the bag files it with the
  logs, the shop prices it as one).

## Making it

The Woodworker has a fourth choice beside Bow, Staff and Traps: **Harden**
(the four go two by two on a phone). Its tab lists the five woods: the picture,
how many you hold, your logs against the five needed, the XP, or the
Woodworking level it waits on; **Make** makes one and **All n** as many as the
logs pay for (up to 50).

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `make_hardened_wood` | `{key, count}` | An explicit case in the room's switch; allowlisted in wsClient. |
| s→c | `hardened_wood_result` | `{key, count, xp, leveled, fromLevel, newLevel, have}` or `{error, key?, need?, have?}` | Private, in `PRIVILEGED_EVENTS`. Errors: `off`, `bad-key`, `skill` (`need`), `no-logs` (`need`, `have`). The bag rides the `player_state` that follows. |

- **Server-settled** (rule 20): the worker takes the logs out of its own
  copy, pays the wood and the Woodworking XP (per piece, as smelting pays per
  bar), saves, answers, and sends the player_state. The game only asks.
- `key` is looked up as the table's own key (`hasOwnProperty`), so
  `__proto__` and friends make nothing; `count` is clamped to 1-50 and then to
  what the logs on hand pay for.
- The game says it over your head: "+2 Hardened Pine Wood", "+800
  Woodworking XP", a level's celebration; a refusal's reason ("Need 5 Pine
  Logs", "Requires Woodworking 5").

## Around the game

- **Bag**: Crafting, named from the table, its own picture
  (`public/icons/items/hardened-<wood>.webp`, made from the tree's own log
  picture by `tools/make_hardened_wood_icons.py`: the sprigs taken off, the
  wood darkened, two iron bands round it). A log's card says "Light a
  campfire, or harden 5 into Hardened Pine Wood at the Woodworker"; a hardened
  wood's says "Hardens a pine bow or staff at the Woodworker".
- **Shop**: the `hardened_` family at 144, above the five logs it cost (5 × 24)
  by the bar's margin over its ore.
- **Trade, mail and the auction house** take it like any bag item.
- **Memory**: five ~10 KB icons, loaded only when a bag tile or the tab shows
  one.

## Switches

- `caps.hardenedwood` gates the Harden tab and, with `caps.hardenmats`, a bow's
  or a staff's hardening material.
- `hardenedwood: false` in liveflags refuses every make (`off`), un-advertises
  the cap, and puts bows and staffs back on hardening for gold alone (the old
  ladder), so nothing asks for a material that can no longer be made. Logs and
  hardened wood held are untouched.

## Not done

- **The hardening skill gate is unchanged**: bows and staffs are still gated
  on Blacksmithing (the Woodworker's Harden row says so), as before this
  change. Moving it to Woodworking is a separate call.
- **The old "Reforge & Harden" row** at the Woodworker (paid in raw wood, a
  client-only affix, docs/specs/hardening.md "Name collision") is untouched.
- Painted art: the icons are processed from the log paintings; a prompt for
  painted ones is in docs/ART-WISHLIST.md.
