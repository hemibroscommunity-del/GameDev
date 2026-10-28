# The loot shine (v2.3.3746)

**The ask** (owner, 2026-10-28). First: "Wondering what method will give visual
cue that the loot message still means you need to walk over and pick up the
pile". Then: "I'd prefer a bright shine the moment it drops that lowers to a
glow", "Shine color same color as rarity tier (uses best)", and "I'd rather
the gear in the drop just match the rarity tier ... I want the loot message
font color to match the loot shine effect color".

**What it is.** The moment YOUR pile lands, a bright shine on it eases down
over 1 s (`SHINE_SETTLE_S`) to a soft, steady glow. The glow stays while the
pile lies there and goes when it's picked up or gone (`_disposeLoot`).
Another player's pile has none: it keeps the watcher's grey.

**Its colour is the pile's best drop line's** (`game/dropLines.js`
`pileShine`), so the words and the shine always match:

- coins and remains: white;
- a shard: green;
- a rare gem: blue;
- a mystery gear piece: rare blue (`QUALITY_COLOR.rare`, the armour's own);
- a normal gear piece: white.

The killing blow's nugget and raw gem go straight to the bag, so they don't
count. `notePileShine` sets it on the pile at its `loot_drop` (`gameEvents`).
A pile that reaches the phone another way first (a tick, a zone's list) gets
it the first time it's drawn.

**Gear on the drop line.** A mystery piece was purple; it is now rare blue
(see `rarity-reveal.md`). The reveal on pickup still climbs to elite's orange
or godly. Godly never shows at a drop: the pile only promises "rare or
better".

**Drawn** (`effectsRenderer` `_renderPileShine`):

- one soft round picture, 64 px, made in code by each effects renderer;
- its canvas let go once drawn (`_gpuWaiting`, `gpuOnly.js` `emptyOnceDrawn`);
- one sprite of it per pile, tinted, added (light, not paint, so it shows on
  dirt, grass and water alike), just over the remains and under the coins,
  shard and gear;
- size: 260 world px at the landing, 150 settled; alpha 1, then 0.7;
- each frame changes only its alpha, size and place (TRAPS §218); the blend
  is set once, when the sprite is made.

No new art files; one 16 KB picture on the chip.

**Tests.**

- `drop-lines.test` §2: `pileShine` and `notePileShine`.
- `mp-droplines` §7: bright then steady, white, the shard's green, none on
  another's pile, gone on pickup.
- `mp-droplines` §8: a mystery piece, through the real `loot_drop` handler
  (`__btDispatch`), has a blue line and a blue shine, which is drawn: the
  screen around it changes with `window.__btShineOff`. Its reveal lands on
  elite (`__btReveal`).

`BT_QA_SIDEWAYS=1` runs it sideways. Probe: `window.__btLootShine()`.
