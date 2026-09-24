# The Blacksmith, rebuilt (v2.3.2826–2827)

Owner, 2026-09-24: "I hate the blacksmithing menu. I almost want to Delete it
and start from scratch. Nobody wants to read a novel to know how it works."
And: "is there an existing animation that I can repurpose for the act of
smelting ore into armor? Maybe you can add code effects for the flame part too."

## The menu (`src/ui/panels/buildings/SmithyPanel.jsx`)

`ForgePanel.jsx` (1,488 lines) is deleted. The new panel:

- **Four tabs:** Smelt, Forge, Upgrade, Amulet. Each has an icon and one word.
- **Costs are chips:** the item's icon and HAVE/NEED, green or red. A lock is a
  chip naming the one thing missing ("Smithing 6", "Melee 5").
- **Forge** lists the tiers you can make plus the next one only. The old list
  ran ten levels ahead.
- **Sits low** (BroTown gives the forge card `align-items: flex-end`, a light
  scrim, and a height that keeps its top below the player's feet), so the
  smith is seen working above it.
- **No local prediction.** A press asks the worker. The panel waits for the
  `player_state` that answers and turns the change into the popup, or says
  "Could not …" after 3.5 s of silence.

### What was removed, and why

These four ran only in the browser (they wrote `localStorage`, and the worker
has no handler for any of them), so the next `player_state` undid them:

- **Reforge**
- the legacy **"Harden" affix**
- **shield forging**
- **Salvage**

A button that lies is worse than no button. If they are wanted back, they need
server handlers first.

### What remains (all server-settled)

| Tab | Message | Server |
|---|---|---|
| Smelt | `smelt_bar` | smelting.js |
| Forge | `forge_weapon` | gear.js |
| Upgrade | `harden_weapon` (H0–H5); `amulet_forge_request {op:'extract'}` | hardening.js; amulet.js |
| Amulet | `amulet_forge_request {op:'smelt' \| 'craft'}` | amulet.js |

Upgrade mirrors the worker's access gate: Smithing ≥ 5 × the weapon's tier,
shown as a lock rather than a button the worker refuses. Gem removal is
priced with the one-argument `gemExtractCost(item)`, which is what the worker
charges.

## The smith at work (`src/game/smithing.js`)

There is no hammer or anvil animation in the game. The mining swing is the
closest (a two-handed overhead strike on the player's own body), so
`S._smithing` borrows it:

- **The pose:** entityRenderer draws `mine` (facing south, weapon and shield
  put away) while the work lasts.
- **The anvil and fire:** effectsRenderer `_updateSmithing` draws, all in code:
  - an iron anvil over the rock painted under the mine pose's boots;
  - a white-hot bar on the anvil that cools as the work runs;
  - a forge fire beside it (coals, four flame tongues, embers).
- **The strike:** sparks and the pick clink on every strike frame.
- **The forge building:** its chimney and furnace sparks run ×7 while you
  work (worldLife).
- **Visual only.** Walking off or dying ends it.

## Tests

- `tools/qa/mp/mp-smithy.mjs` (`run.mjs smithy`, 17 checks) opens the real
  door, then checks:
  - four tabs, and a text budget per tab;
  - the panel's top is below the smith's feet;
  - the smith works (strike count);
  - a real forge, a real harden (after earning Smithing 5 by smelting), and
    the amulet rows.
- `mp-smelt` was updated for the new rows.
