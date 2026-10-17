# Farming art: prompts to paste

Everything the farm needs drawn, as sprite sheets you can make in ChatGPT and send back in chat. I cut each sheet up, size the pieces and put them in the game.

There are two kinds, in two styles:

- **Bag icons (the crop sheet, then sheets 1 and 2), needed now.** The bag, the Feed & Seed window and the Cookhouse show emoji where these go. They match the painted icons the bag already uses.
- **The farm you walk on (sheets 4-6, the Barn, the Farmhouse and the Dungeon Workshop).** They are for the farm you walk around on (in the game since v2.3.3136: docs/specs/farm-walk.md). They follow the world's HD pixel-art rules (docs/WORLD-BIBLE.md §6), like every Object Studio picture.

## How

- **One sheet per chat.** Paste the prompt, attach the picture it names, and send.
- **Bag icons:** attach `docs/art/bag-icon-style-key.png`, eight of the game's own bag icons.
- **Farm pictures:** attach your style key, the one the Object Studio keeps (its Save link downloads it as `brotown-style-key`). Never attach the bro.
- **If one piece comes out wrong,** ask for the whole sheet again with that piece fixed. Don't mix pieces from different chats: they won't match.
- **Already in the game,** so not asked for: the tonic bottles (Fury Tonic, Mana Draught, Swift Draught, Stamina), cooked fish, and the fences, well, water trough, hay, carts, barrels and crates a farm map can borrow.

## Start here: the sixteen crops (v2.3.3135)

The owner: *"The main focus is just getting a good variety of crops to grow."*
One square sheet of all sixteen crops, as bag icons: the six the farm grew
before and the ten added in v2.3.3135. Attach your bag-icon reference picture.

```text
Square image: a sprite sheet of 16 crop icons for a 2D action RPG, in a 4×4 grid read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else. Every crop is shown freshly harvested.

Row 1: carrots (three orange carrots with feathery green tops, tied with twine) · potatoes (two plump brown potatoes) · pumpkin (round, ribbed, orange, curly green stem) · wheat (a sheaf of golden wheat tied with twine)
Row 2: corn (a yellow ear of corn, green husk peeled back) · tomatoes (two ripe red tomatoes on a short vine) · cabbage (a round, leafy green cabbage) · strawberries (three red strawberries with green tops)
Row 3: firebloom (three flowers whose red, orange and yellow petals curl like flames) · rock vine (a coiled grey-green vine with pebble-like leaves and dusky blue berries) · cloudpetal (a puff of white blossoms tipped with sky blue, like a little cloud) · frostberry (a sprig of round, icy pale-blue berries dusted with frost)
Row 4: thunder pepper (a crooked bright-yellow chili with dark blue lightning zigzags) · dewmelon (a round melon with a glassy sea-green rind beaded with water drops) · gloomcap (three toadstools with dark teal caps and pale spots) · heartroot (a plump, heart-shaped red root with a white tip, like a big radish, with green leaves)

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left, slight three-quarter view. All 16 the same size and weight so they read as one set, each easy to recognise at fingertip size.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta or pink. Do not copy the reference's items or background.
```

- **Why these colours:** no purple or beet-red anywhere. The cut-out treats
  magenta's hue as background, so the gloomcap is teal, not purple, and the
  heartroot is a radish red, not a beet's.
- **The two bag sheets below** (v2.3.3274) finish the bag: all sixteen seed
  packets, and the five dishes with compost. They replace the first three
  sheets, which covered only the first six crops and asked for things the game
  no longer needs (the hoe and watering can are the right stick's own pictures
  now, drawn by the owner). The growth stages for all sixteen crops are already
  in the game (`src/data/farmArt.js`).

## Bag icons

### Sheet 1: the sixteen seed packets (v2.3.3274)

- **In the game:** every seed in the bag and the Feed & Seed window. Today all sixteen wear one 🌱.
- **Attach:** `docs/art/bag-icon-style-key.png`.
- Everyday seeds in brown paper, magic seeds in navy and gold, so the two kinds tell apart at a glance; the crops in the order of the crop sheet above.

```text
Square image: a sprite sheet of 16 seed-packet icons for a 2D action RPG, in a 4×4 grid read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else.

Every packet is the same shape and size: a small paper seed packet with a crimped, folded-over top, seen at a slight three-quarter angle, with its crop painted big on the front so it reads at fingertip size. Rows 1 and 2 are everyday seeds in plain brown kraft paper. Rows 3 and 4 are magic seeds in deep navy-blue paper with a thin gold border.

Row 1: carrot (three orange carrots with green tops) · potato (two plump brown potatoes) · pumpkin (a round orange pumpkin) · wheat (a golden wheat sheaf)
Row 2: corn (a yellow ear of corn in its green husk) · tomato (two ripe red tomatoes) · cabbage (a round leafy green cabbage) · strawberry (three red strawberries with green tops)
Row 3: firebloom (a flower whose red, orange and yellow petals curl like flames) · rock vine (a grey-green vine with pebble-like leaves and dusky blue berries) · cloudpetal (a puff of white blossoms tipped with sky blue) · frostberry (round icy pale-blue berries dusted with frost)
Row 4: thunder pepper (a crooked bright-yellow chili with dark blue lightning zigzags) · dewmelon (a sea-green melon beaded with water drops) · gloomcap (three toadstools with dark teal caps and pale spots) · heartroot (a heart-shaped red root with a white tip and green leaves)

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. All 16 the same size and weight so they read as one set.

No text, letters or numbers anywhere, not even on the packets. No frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta or pink. Do not copy the reference's items or background.
```

### Sheet 2: the five dishes and compost (v2.3.3274)

- **In the game:** the five Cookhouse dishes in the bag, the Cookhouse window and the Quick Eat button; compost in the bag and the Feed & Seed window. Today they wear emoji.
- **Attach:** `docs/art/bag-icon-style-key.png`.

```text
Landscape image (wider than tall): a sprite sheet of 6 item icons for a 2D action RPG, in a 3×2 grid read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else.

Row 1: herb bread (a round, golden-brown rustic loaf with a crackled crust, flecked with green herbs and a few red petals baked into the top) · root stew (a wooden bowl of thick brown stew with chunks of root vegetables and small round green leaves, a wooden spoon resting in it) · pumpkin pie (a whole pie in a tin with a golden crimped crust and smooth orange filling, one slice missing)
Row 2: garden stew (a big clay bowl of hearty stew full of carrot slices and potato chunks, steaming gently, a hunk of bread on the side) · firebloom tea (a chunky clay mug of hot amber-red tea with a fiery red-and-orange flower floating in it, a curl of steam rising) · compost (a small open burlap sack full of rich dark-brown compost with bits of straw, and a brown earthworm peeking out)

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left, slight three-quarter view. All 6 the same size and weight; the dishes hearty, warm and appetising, a frontier cook's best.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta or pink. Do not copy the reference's items or background.
```

## The farm you walk on

For the farm map, where your beds and crops stand in the world: four growth stages for each crop, the beds under them, a few farm things, and its buildings. Sheets 4-6 and the Barn are in the game (v2.3.3136). The **Farmhouse** and the **Dungeon Workshop** are still to make: until they come, a haystack stands in as your bed ("Sleep in the hay") and a notice board as the Workshop.

The farm's GROUND needs no picture: the game lays it from your own Ground Studio pictures (the commons' grass, the yards' packed earth, Main Street's dirt), so it matches BroTown. One ChatGPT picture of a whole farm would come out far below the game's level of detail.

### Sheet 4: crops growing (carrot, firebloom, potato)

- **In the game:** each crop on its bed, from sprout to ripe.
- **Attach:** your style key.

```text
A wide picture (3:2, landscape): a SPRITE SHEET of 12 objects for BroTown, a top-down 2D action RPG, laid out in three neat rows and read like a page: each row left to right, the rows top to bottom. Every object stands on its own with plain background all round it: none touches another, and each row's ones stay together, in the order given.

Each row is ONE crop growing in a garden bed, at four stages, left to right: just sprouted (a tiny shoot with two leaves), young (a small plant), nearly grown (a full plant, not ripe yet) and ripe (ready to pick). The four are the same plant, growing: the ripe one is the biggest and the most colourful, and it should be plain at a glance that it is ready.
Row 1: a carrot plant -- feathery bright-green carrot tops; ripe, the orange shoulders of three carrots peek up among the leaves. Ripe it is about knee-high on a person.
Row 2: a firebloom -- a herb whose flowers have red, orange and yellow petals that curl like flames; young it is a closed green bud, ripe it is three open flowers on leafy stems. Ripe it is about waist-high on a person.
Row 3: a potato plant -- a bushy, leafy green plant; ripe it has small white flowers on top and two brown potatoes showing at its base. Ripe it is about knee-high on a person.

Every object is drawn whole and stands on nothing: no soil, ground, grass, pot or shadow under or around it, and the place where it meets the ground is plain to see -- the game draws the garden bed under it. Each plant fits on one garden bed about as wide as a person is tall.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture; each object is the size given in its row.
```

### Sheet 5: crops growing (rock vine, cloudpetal, pumpkin)

- **In the game:** each crop on its bed, from sprout to ripe.
- **Attach:** your style key.

```text
A wide picture (3:2, landscape): a SPRITE SHEET of 12 objects for BroTown, a top-down 2D action RPG, laid out in three neat rows and read like a page: each row left to right, the rows top to bottom. Every object stands on its own with plain background all round it: none touches another, and each row's ones stay together, in the order given.

Each row is ONE crop growing in a garden bed, at four stages, left to right: just sprouted (a tiny shoot with two leaves), young (a small plant), nearly grown (a full plant, not ripe yet) and ripe (ready to pick). The four are the same plant, growing: the ripe one is the biggest and the most colourful, and it should be plain at a glance that it is ready.
Row 1: a rock vine -- a tough vine that climbs over a small grey stone, its small round leaves like pebbles; ripe, it hangs heavy with clusters of dusky blue berries. Ripe it is about waist-high on a person.
Row 2: a cloudpetal -- a soft, airy flower on slim pale-green stems; young a tight white bud, ripe a puff of white blossoms tipped with sky blue, like a small cloud. Ripe it is about waist-high on a person.
Row 3: a pumpkin vine -- big rough green leaves and curling tendrils; young it has a small green pumpkin, ripe a big, round, ribbed orange pumpkin on a vine that sprawls as wide as the bed. Ripe it is about knee-high on a person.

Every object is drawn whole and stands on nothing: no soil, ground, grass, pot or shadow under or around it, and the place where it meets the ground is plain to see -- the game draws the garden bed under it. Each plant fits on one garden bed about as wide as a person is tall.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture; each object is the size given in its row.
```

### Sheet 6: garden beds and farm things

- **In the game:** a bed dug, watered or fertilized; a scarecrow, a compost bin, seed sacks, a wheelbarrow and a tool rack around the beds.
- **Attach:** your style key.

```text
A wide picture (3:2, landscape): a SPRITE SHEET of 9 objects for BroTown, a top-down 2D action RPG, laid out in three neat rows and read like a page: each row left to right, the rows top to bottom. Every object stands on its own with plain background all round it: none touches another, and each row's ones stay together, in the order given.

Row 1: three garden beds, each a low square patch of freshly dug, crumbly brown earth with a neat, slightly raised edge, seen from above at the steep angle of the game, each about as wide as a person is tall: dug and dry; watered (darker, damp earth with a soft wet sheen and two or three small puddles); fertilized (dark, rich compost worked into the earth, with bits of straw).
Row 2: a scarecrow built by Bros -- a cheerful scarecrow on a post, in a patched flannel shirt stuffed with straw and a battered straw hat, a burlap-sack head with a big stitched grin and dark sunglasses, one straw arm flexing, about one and a half times as tall as a person; a compost bin -- a wooden slatted bin full of dark compost and garden scraps, about waist-high on a person.
Row 3: seed sacks -- three plump burlap sacks slumped together, one open with seeds spilling onto the ground, about knee-high on a person; a wheelbarrow -- a wooden wheelbarrow with one iron-rimmed wheel, piled with carrots, potatoes and a pumpkin, about waist-high on a person; a tool rack -- a small wooden rack with a hoe, a rake and a spade leaning in it, about chest-high on a person.

Every object is drawn whole. The beds are flat patches of earth with nothing growing in them. Everything else stands on nothing: no ground, grass, path or shadow under or around it, and the place where it meets the ground is plain to see. Everything is built and used by Bros: well made, a little battered, with a proud repair or a dent here and there.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture; each object is the size given in its row.
```

### The Barn

- **In the game:** the farm's one building. A building always gets a picture of its own: two in one chat blend together.
- **Attach:** your style key.

```text
A square picture of ONE building for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Barn, which stands on a player's own farm, where they grow crops for the Cookhouse.

A classic barn of barn-red boards with white trim and a steep shingled roof, weathered and patched. In the middle of the front, a big double door of red boards with white cross-braces, slid half open on an iron rail; above it a hayloft door with a little pulley beam and a hay bale hanging from its rope. A rooster weathervane on the ridge. The bro touches, big and easy to read: a basketball hoop nailed above the hayloft door, and the rooster on the weathervane flexing its wings.

One big, simple sign over the big door reads "FARM" in chunky capital letters, easy to read at a glance. No other words, letters or numbers anywhere.

A wide ramp of packed earth leads up to the big door. The ramp is part of the building.

Drawn square-on, its front facing us straight: we see the whole front, and the roof from above at a steep angle, and no side walls. Every upright line runs straight up the picture. The whole building fits in the picture with plenty of background all round, nothing cut off. It stands on nothing: no ground, grass, path, fence or shadow under or around it.

Built by Bros: solid, handsome, well-made frontier architecture underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and on the roof, never on the ramp in front of the door, where people walk.

The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. The building is about three times as wide as a person is tall, so it fills about three fifths of the picture's width. Its door is a little taller than a person, and each storey is about one and a half times as tall as a person.
```

### The Farmhouse

- **In the game:** your bed for the night on your farm (the haystack stands in until it comes). A building always gets a picture of its own: two in one chat blend together.
- **Attach:** your style key.

```text
A square picture of ONE building for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Farmhouse, which stands on a player's own farm, where they sleep.

A cosy one-storey farmhouse of whitewashed boards with barn-red trim and a green tin roof, a fieldstone chimney with no smoke, and a front porch under the roof's overhang held up by two log posts. On the porch: a rocking chair, a welcome mat, a lantern hung by the door and a pair of muddy boots. Two windows with barn-red shutters, one with a window box of flowers. The bro touches, big and easy to read: a horseshoe nailed over the door for luck, and a barbell leaning by the steps.

One big, simple sign over the porch reads "HOME" in chunky capital letters, easy to read at a glance. No other words, letters or numbers anywhere.

Two wide wooden steps lead up to the door. The steps are part of the building.

Drawn square-on, its front facing us straight: we see the whole front, and the roof from above at a steep angle, and no side walls. Every upright line runs straight up the picture. The whole building fits in the picture with plenty of background all round, nothing cut off. It stands on nothing: no ground, grass, path, fence or shadow under or around it.

Built by Bros: solid, handsome, well-made frontier architecture underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and on the roof, never on the ramp in front of the door, where people walk.

The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. The building is about two and a half times as wide as a person is tall, so it fills about half of the picture's width. Its door is a little taller than a person.
```

### The Dungeon Workshop

- **In the game:** on your farm, a shed where you design and build your own dungeons (the notice board stands in until it comes). A building always gets a picture of its own.
- **Attach:** your style key.

```text
A square picture of ONE building for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Dungeon Workshop, which stands on a player's own farm, a shed where Bros design and build their own dungeons.

A sturdy workshop shed of rough-sawn planks on a fieldstone footing, with a shallow-pitched roof of tarred boards and a big wooden double door with iron strap hinges. A lean-to on one side shelters a workbench with a vice, hand saws and hammers on a pegboard, and on the bench a small wooden model of a dungeon tower. Rolled blueprints in a barrel, a stack of crates, and a lantern on a hook. The bro touches, big and easy to read: a dented iron padlock hanging open, and a proud patch nailed over a hole.

One big, simple sign over the door reads "WORKSHOP" in chunky capital letters, easy to read at a glance. No other words, letters or numbers anywhere.

A short ramp of packed earth leads up to the door. The ramp is part of the building.

Drawn square-on, its front facing us straight: we see the whole front, and the roof from above at a steep angle, and no side walls. Every upright line runs straight up the picture. The whole building fits in the picture with plenty of background all round, nothing cut off. It stands on nothing: no ground, grass, path, fence or shadow under or around it.

Built by Bros: solid, handsome, well-made frontier architecture underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and on the roof, never on the ramp in front of the door, where people walk.

The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. The building is about two and a half times as wide as a person is tall, so it fills about half of the picture's width. Its door is a little taller than a person.
```

## Where the words come from

- The farm pictures' style, background and scale lines are the game's own: `public/tools/style/bible.js` (`HD_STYLE`, `objectBackground`, `KEY_MATCH`, `personScale`), the words every Object Studio prompt uses.
- The sheet layout follows the Object Studio's sprite sheets (`public/tools/objects/sheets.js`): rows read like a page, at most seven kinds a sheet.
- The bag icons follow the owner's icon sheets of v2.3.1325 (256 x 256, `public/icons/items/`). They are cut out of a magenta background, not the white of the UI icons, because the cloudpetal's petals and the deed's parchment are nearly white.
