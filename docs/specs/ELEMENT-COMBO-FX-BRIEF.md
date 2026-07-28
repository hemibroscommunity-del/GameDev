# Element collision effects — sprite sheet brief

36 combos. Every one already exists in the game code with a name and a damage weight;
this list is generated from that table, not invented.

**Format for every sheet — this is what the game already loads:**

- One horizontal strip, **8 frames**, each frame **256 x 256** → final image **2048 x 256**
- Frames evenly spaced, effect centred in each frame, no frame borders or labels
- **Solid magenta background `#FF00FF`** (not transparent — image models are unreliable at
  alpha, and this repo already has a magenta knockout step that removes it cleanly)
- Chunky pixel-art, readable at ~64px on a phone. No text, no watermark, no drop shadow.


---

## The prompt (paste this, then add ONE combo line from the table)

```
Create a game visual-effect sprite sheet.

FORMAT (follow exactly):
- One image, 2048 x 256 pixels.
- A single horizontal row of 8 equal frames, each 256 x 256.
- Frames evenly spaced, no gaps, no borders, no numbers, no labels.
- Background: solid magenta #FF00FF across the whole image, including
  inside any enclosed loops of the effect.
- The effect is centred in each frame and stays inside its frame.

STYLE:
- Chunky 2D pixel art, bold shapes, high contrast, limited palette.
- Must read clearly when shrunk to 64 x 64 on a phone screen.
- No outlines around the whole effect, no drop shadow, no ground plane,
  no character, no background scenery.

ANIMATION (left to right, one impact burst):
- Frame 1: small bright seed of the effect appearing.
- Frames 2-3: rapid expansion to full size, brightest here.
- Frames 4-5: full size, the shape at its most readable.
- Frames 6-8: dissipating and fading out, smallest and dimmest at frame 8.
- It must loop-safe: frame 8 leaves nothing behind.

THE EFFECT:
<<< paste one line from the table here >>>
```


---

## HIGH IMPACT (base 55-120) — biggest, brightest, longest

| Name | Elements | Colours | Effect line to paste |
|---|---|---|---|
| **Eclipse** | dark + light | `#2C3E50` + `#F1C40F` | Eclipse: a black disc rimmed in white-gold fire, corona flaring outward then collapsing inward. Palette built from #2C3E50 and #F1C40F. |
| **Divine Strike** | light + storm | `#F1C40F` + `#8E44AD` | Divine Strike: a vertical pillar of white-gold light with violet lightning spiralling down it. Palette built from #F1C40F and #8E44AD. |
| **Overcharge** | flame + storm | `#C0392B` + `#8E44AD` | Overcharge: red-hot arcs whipping outward, sparks trailing embers. Palette built from #C0392B and #8E44AD. |
| **Shatter** | frost + venom | `#2980B9` + `#27AE60` | Shatter: a green-blue ice shell cracking apart into shards. Palette built from #2980B9 and #27AE60. |
| **Hellfire** | dark + flame | `#2C3E50` + `#C0392B` | Hellfire: crimson flame with a black smoke core, licking upward. Palette built from #2C3E50 and #C0392B. |
| **Blight** | venom + storm | `#27AE60` + `#8E44AD` | Blight: sickly green spores lit by violet static, spreading outward. Palette built from #27AE60 and #8E44AD. |
| **Hex** | dark + storm | `#2C3E50` + `#8E44AD` | Hex: violet runic sigils flaring in a dark cloud. Palette built from #2C3E50 and #8E44AD. |
| **Baptism** | light + water | `#F1C40F` + `#3498DB` | Baptism: a falling column of clear water lit gold from above, splashing outward. Palette built from #F1C40F and #3498DB. |
| **Conduit** | water + storm | `#3498DB` + `#8E44AD` | Conduit: a water ring with violet lightning skittering across its surface. Palette built from #3498DB and #8E44AD. |
| **Seismic Pulse** | storm + stone | `#8E44AD` + `#795548` | Seismic Pulse: a brown shockwave ring cracking the ground, violet sparks at the fracture lines. Palette built from #8E44AD and #795548. |
| **Shackle** | dark + stone | `#2C3E50` + `#795548` | Shackle: dark chains of stone snapping taut around a point. Palette built from #2C3E50 and #795548. |
| **Salvation** | light + wind | `#F1C40F` + `#7F8C8D` | Salvation: a soft gold updraft of light motes carried on a spiral of wind. Palette built from #F1C40F and #7F8C8D. |

---

## MID (base 35-50) — the everyday combos

| Name | Elements | Colours | Effect line to paste |
|---|---|---|---|
| **Magma** | flame + stone | `#C0392B` + `#795548` | Magma: a splitting rock burst with glowing orange lava in the cracks. Palette built from #C0392B and #795548. |
| **Hailstorm** | frost + storm | `#2980B9` + `#8E44AD` | Hailstorm: blue hailstones driven in a slanted violet-lit squall. Palette built from #2980B9 and #8E44AD. |
| **Tempest** | storm + wind | `#8E44AD` + `#7F8C8D` | Tempest: a grey-violet spiral vortex with debris and sparks. Palette built from #8E44AD and #7F8C8D. |
| **Wither** | dark + venom | `#2C3E50` + `#27AE60` | Wither: green decay curling to black ash and drifting away. Palette built from #2C3E50 and #27AE60. |
| **Radiant Fire** | light + flame | `#F1C40F` + `#C0392B` | Radiant Fire: gold-white flame with a clean bright core, no smoke. Palette built from #F1C40F and #C0392B. |
| **Quench** | flame + water | `#C0392B` + `#3498DB` | Quench: a red flame smothered into a burst of white steam. Palette built from #C0392B and #3498DB. |
| **Blizzard** | frost + wind | `#2980B9` + `#7F8C8D` | Blizzard: driving blue-white snow in a hard horizontal sweep. Palette built from #2980B9 and #7F8C8D. |
| **Drown** | dark + water | `#2C3E50` + `#3498DB` | Drown: dark water rising and closing over a point, bubbles escaping. Palette built from #2C3E50 and #3498DB. |
| **Cleansing Bloom** | light + venom | `#F1C40F` + `#27AE60` | Cleansing Bloom: green toxin turning into gold petals of light opening outward. Palette built from #F1C40F and #27AE60. |
| **Steam** | flame + frost | `#C0392B` + `#2980B9` | Steam: a hot white steam burst with a faint red-blue split at its base. Palette built from #C0392B and #2980B9. |
| **Mudslide** | water + stone | `#3498DB` + `#795548` | Mudslide: a brown sludge wave surging forward and slumping. Palette built from #3498DB and #795548. |
| **Dread** | dark + frost | `#2C3E50` + `#2980B9` | Dread: a pale blue mist curling out of a dark hollow core. Palette built from #2C3E50 and #2980B9. |
| **Purify** | light + frost | `#F1C40F` + `#2980B9` | Purify: blue ice sublimating into clean gold light. Palette built from #F1C40F and #2980B9. |
| **Firestorm** | flame + wind | `#C0392B` + `#7F8C8D` | Firestorm: red flame stretched into a whipping windborne streak. Palette built from #C0392B and #7F8C8D. |
| **Petrify** | venom + stone | `#27AE60` + `#795548` | Petrify: green ooze hardening into grey stone crust. Palette built from #27AE60 and #795548. |
| **Haunt** | dark + wind | `#2C3E50` + `#7F8C8D` | Haunt: a wispy dark trail streaking past and fading. Palette built from #2C3E50 and #7F8C8D. |
| **Consecrate** | light + stone | `#F1C40F` + `#795548` | Consecrate: a stone ring lighting up gold from within, glyphs igniting. Palette built from #F1C40F and #795548. |

---

## LOW (base 20-30) — quick, small, cheap

| Name | Elements | Colours | Effect line to paste |
|---|---|---|---|
| **Toxic Fumes** | flame + venom | `#C0392B` + `#27AE60` | Toxic Fumes: green-yellow smoke boiling upward with small flame flickers. Palette built from #C0392B and #27AE60. |
| **Dilute** | water + venom | `#3498DB` + `#27AE60` | Dilute: green toxin thinning and dispersing into pale water. Palette built from #3498DB and #27AE60. |
| **Miasma** | venom + wind | `#27AE60` + `#7F8C8D` | Miasma: a low green fog rolling outward in slow tendrils. Palette built from #27AE60 and #7F8C8D. |
| **Flash Freeze** | frost + water | `#2980B9` + `#3498DB` | Flash Freeze: water snapping instantly into blue ice spikes. Palette built from #2980B9 and #3498DB. |
| **Monsoon** | water + wind | `#3498DB` + `#7F8C8D` | Monsoon: slanted rain sheeting across with a wind curl. Palette built from #3498DB and #7F8C8D. |
| **Permafrost** | frost + stone | `#2980B9` + `#795548` | Permafrost: frost creeping across stone in crystalline fingers. Palette built from #2980B9 and #795548. |
| **Erosion** | stone + wind | `#795548` + `#7F8C8D` | Erosion: stone surface stripping away into blowing grit. Palette built from #795548 and #7F8C8D. |

---

## NOT IN THE CODE YET — Flora (9 more)  [v2.3.1567]

The GDD names a tenth element, **Flora** (status Thorn, `#2ECC71`, leaf motif), and the code
does not have it. These nine are its pairs. Generate them only if Flora is going to be built —
otherwise they are art for a system that will never fire.

| Name | Elements | Colours | Effect line to paste |
|---|---|---|---|
| **Wildfire** | flora + flame | `#2ECC71` + `#C0392B` | Wildfire: red flame racing along green vine lines, spreading outward through the foliage. Palette built from #2ECC71 and #C0392B. |
| **Overgrowth** | flora + water | `#2ECC71` + `#3498DB` | Overgrowth: green vines bursting up out of a splash of water and knotting into a field. Palette built from #2ECC71 and #3498DB. |
| **Blight Garden** | flora + venom | `#2ECC71` + `#27AE60` | Blight Garden: a wide sickly-green thorn cloud with dark spores boiling through it. Palette built from #2ECC71 and #27AE60. |
| **Lightning Rod** | flora + storm | `#2ECC71` + `#8E44AD` | Lightning Rod: a single violet bolt striking down a green thorn spire, discharging at the base. Palette built from #2ECC71 and #8E44AD. |
| **Petrified Wood** | flora + stone | `#2ECC71` + `#795548` | Petrified Wood: green branches hardening into grey petrified bark, cracking as they set. Palette built from #2ECC71 and #795548. |
| **Scatter Seed** | flora + wind | `#2ECC71` + `#7F8C8D` | Scatter Seed: green seed pods flung outward on a wind spiral, trailing leaf motes. Palette built from #2ECC71 and #7F8C8D. |
| **Thaw Bloom** | flora + frost | `#2ECC71` + `#2980B9` | Thaw Bloom: blue ice melting off a green bud that opens into a soft bloom. Palette built from #2ECC71 and #2980B9. |
| **Withering** | flora + dark | `#2ECC71` + `#2C3E50` | Withering: green growth curling black from the edges inward and crumbling to ash. Palette built from #2ECC71 and #2C3E50. |
| **Purifying Bloom** | flora + light | `#2ECC71` + `#F1C40F` | Purifying Bloom: a green flower opening into a burst of clean gold light. Palette built from #2ECC71 and #F1C40F. |
