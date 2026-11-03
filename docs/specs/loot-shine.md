# The loot shine (v2.3.3746), now thin beams (v2.3.3916)

> **v2.3.3916 replaces the glow and the falling beam below** with thin beams
> that rise and stay (the last section). The older sections are kept as the
> history of the ask; the pile's colour (`pileShine`) is unchanged.

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

## v2.3.3805: a beam comes down into the glow

The owner, 2026-10-29: "for the loot drop add a vertical shine that starts at
its peak and climbs downward to just end at the normal glow".

![The beam over its second, 0 to 1 s: coins (white) and a Frost Shard (green)](../shots/lootbeam-strip.webp)

- **What a player sees.** The moment YOUR pile lands, a narrow column of light
  stands on it in the shine's colour (the pile's best line's), 230 world px
  tall (a pile is ~60). Its top comes down to the pile over the shine's own
  second (`SHINE_SETTLE_S`), easing in and out, fading a little as it comes,
  and it is gone just as the round shine settles into the glow. Then nothing
  of it is left but the glow.
- **Only a pile seen landing.** A pile already lying when it reached your
  phone (a zone's list on the way in) glows, with no beam (`_shine.late`, set
  where a pile is given its shine on first drawing rather than at its
  `loot_drop`). Another player's pile has neither.
- **How it is drawn.** ONE soft column picture per effects renderer
  (`makeBeamTexture`: 32 x 128, a bright core and soft sides, fading toward
  its top), kept on the graphics chip only (`_gpuWaiting`, its canvas let go
  once drawn). A sprite of it per landing pile, anchored at its foot, added
  light like the shine; each frame changes only its height and alpha (TRAPS
  §218). At the settle it is destroyed, once; `_disposeLoot` takes it with
  the pile if the pile goes first. The picture goes with the renderer.
- **Off for one phone:** `?lootbeam=0`.
- **Checked:** `mp-lootbeam` (7, a phone in BroTown, piles through the game's
  own `loot_drop` handler): the beam at its peak as the pile lands (the first
  frame drawn at the height due at its age); its whole fall, the page's clock
  held at each 100 ms (230, 224, 206, 180, 149, 115, 81, 50, 24, 6 px, gone
  at 1 s), never rising; destroyed after, the glow still there; none on a
  pile already lying; two rarity colours side by side; no page errors.

## v2.3.3916: thin beams rise from the pile and stay

The owner, 2026-11-02: "Redo the loot drop lighting. Instead of the glow I
just want it to be thin beams of vertical light shining upwards." This
reverses v2.3.3746's "a bright shine ... that lowers to a glow" and
v2.3.3805's beam that "climbs downward to just end at the normal glow": his
newest words win. The round shine and its glow are gone.

![Three piles: coins (white), a Frost Shard (green), a mystery piece (two rare-blue beams)](../shots/lootbeam-strip-3916.webp)

- **What a player sees.** YOUR pile has thin vertical beams of light in its
  best line's colour (`pileShine`, unchanged), standing at its foot. As it
  lands they RISE to their height over 0.35 s (`BEAM_RISE_S`, eased out), then
  stay for as long as the pile lies there, shimmering gently (alpha and a
  little width and height). They are the "walk over and pick it up" cue.
- **How many: by how rare** (`LOOT_BEAMS_BY_RANK`, the best line's rank):
  Normal (coins, remains) 1, Uncommon (a shard) 1, Rare (a gem, a mystery gear
  piece) 2, Very rare 3. Side beams are a little shorter and pulse out of step.
- **Size:** 6 world px wide (a pile is ~60), the tallest 200 world px.
- **A pile already lying** when it reached your phone (`_shine.late`) has its
  beams standing at once, no rise. Another player's pile: none (alpha 0).
- **Drawn:** ONE thin column picture per effects renderer (`makeBeamTexture`,
  8 x 128, a bright core fading toward its top), kept on the graphics chip only
  (`_gpuWaiting`, its canvas let go once drawn: 4 KB on the chip). A sprite
  per beam, tinted, added light (blend set once), on `l._pixiShine` (now an
  array); each frame changes only alpha, scale and place (TRAPS §218).
  `_disposeLoot` takes them with the pile.
- **Capped:** at most 36 beams on screen (`LOOT_BEAMS_MAX`); a pile past it
  waits for room. The count is `_lootBeamCount` (probe
  `window.__btLootBeamCount()`).
- **Off for one phone:** `?lootbeam=0` (no beams; there is no glow to fall
  back to).
- **Checked:** `mp-lootbeam` (rewritten: the rise frame by frame on a held
  clock, 3 s standing with a shimmer, 1/1/2/3 beams in their colours, thin,
  standing at once on a pile already lying, none on another's, the count
  going with the piles); `mp-droplines` §7 (rises and stays, white, the
  shard's green, none on another's, gone on pickup) and §8 (a mystery piece
  through the real `loot_drop`: two rare-blue beams, drawn). The probe
  `window.__btLootShine()` now gives `n`, `beams` (each `h`, `w`, `a`), `px`
  the tallest and `alpha` the brightest.
