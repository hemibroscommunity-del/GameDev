# BroTown art & audio wishlist

What the game could use from the owner next, each with a prompt ready to paste.

- Attach what each item lists, and never the bro (docs/WORLD-BIBLE.md §6).
- Send the result in chat, and a session fits it in: the "In the game" line says where each one goes.
- Generated from `public/tools/style/bible.js` and the Object Studio's `promptFor` (`public/tools/objects/prompts.js`). The dungeon-entrance prompts are the studio's own.
- **The farm's art** (seed, crop and dish icons, crops growing, beds and farm things, the Barn) has its own page: `docs/art/FARM-ART-PROMPTS.md`, with `docs/art/bag-icon-style-key.png` to attach to the icon sheets (v2.3.3132).

## What's left, in the order I'd make it (v2.3.3282)

Each of these is drawn in code, borrowed from somewhere else, or missing today. Each is one chat; the reference pictures to attach are in `docs/art/` (and the banners' in `docs/triage-2026-09-17/assets/`). The same prompts are on a page with a Copy button each, built from this file: https://claude.ai/artifact/9wqSAqMoa4DXfWRvYcVk1L (the owner's).

1. **The keepers** (3 chats): two sheets of six townsfolk, then Beastmaster Bro. Every building gets a person at its door.
2. **The monsters** (5 chats): the Foundry Slime and the Mire Wisp, the Bog Lurker, and real walks for the rock monster and the fishman. Then, if you like them, a slam, hurt and death sheet for each walking one (up to 3 more).
3. **The four land banners** (4 chats): Stone Hollows, Electric Foundry, Water Caves, Poison Forest.
4. **The three dungeons** (6 chats): each mouth, then each arena's walls.
5. **The Farmhouse and the Dungeon Workshop** (2 chats): their prompts are in `docs/art/FARM-ART-PROMPTS.md`.
6. **Small icons, sheet 5, and the spin wheel** (2 chats).
7. ~~**The ore veins, one a tier**~~: done in v2.3.3345 from your picture, with the trees (below, "Trees and ore, one a tier").

Not on the list unless you want them: each land's levels 21-40 monsters (recoloured today; the monster prompts make them), the Gem Works' inside with two stations, and the four lands' music (below).

## Inside the buildings

**All seventeen were in the game (v2.3.3258)**, from the pictures you sent: sixteen behind their windows' menus, the Hotel's held until it has a window (docs/specs/building-rooms.md). **Since v2.3.3259 it is sixteen** (the Assay Office is gone; the Gem Works, the Gem Cutter's building, does both gem jobs, docs/specs/gem-works.md): fifteen behind their sixteen windows, the Hotel's held. The prompts stay here for redoing one: send the new picture in chat and a session replaces it (`tools/ui/make-room-pictures.py`). Rooms are empty of people on purpose: the game draws its own characters in. The Auction House's clerk is the first; the spec says what each other room would need.

### Blacksmith: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the forge).
- **Attach:** your style key + the outside of the Blacksmith (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Blacksmith, where players forge their gear. It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.

A smithy of heavy fieldstone walls and soot-blackened timber beams bound with iron straps. On the left a big stone forge with glowing orange coals, a leather bellows and a hood above it; behind the counter in the middle a huge anvil on a tree stump; a barrel of water for quenching; hammers and tongs on hooks; a rack of finished swords, axes and shields on the back wall; iron bars and ingots stacked in a crate. The bro touches, big and easy to read: a dumbbell made of two anvils on an iron bar lying in a corner, and a dented anvil on a stone plinth with a little brass plate, like a trophy. On the back wall hangs one big, simple sign that reads "BLACKSMITH" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "BLACKSMITH": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### General Store: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the market).
- **Attach:** your style key + the outside of the General Store (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the General Store, where players buy and sell their goods. It is at the money end of town, toward the mines: red brick, pale cut sandstone, brass fittings and iron bars.

A big, busy general store of red brick and dark wood. Shelves from floor to ceiling of goods: jars, tins, tools, lanterns, rope and bolts of cloth; barrels of pickles and crackers; the counter with a brass cash register and a big candy jar; a pot-bellied stove; a rolling ladder along the shelves. The bro touches, big and easy to read: a leaning tower of crates in a corner propped up with a plank, and a sign as big as the whole back wall. On the back wall hangs one big, simple sign that reads "DEALS" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "DEALS": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Bank: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the bank).
- **Attach:** your style key + the outside of the Bank (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Bank, where players keep their things safe. It is at the money end of town, toward the mines: red brick, pale cut sandstone, brass fittings and iron bars.

A grand bank hall of pale cut sandstone with columns and a polished stone floor. A long counter with brass teller cages; behind it a huge round steel vault door, open, showing shelves of gold bars and locked chests inside; a wall of small safe-deposit boxes with keyholes; a brass clock on the wall. The bro touches, big and easy to read: gold bars stacked on an iron bar like barbell weights on a bench press, and two small stone lions in sunglasses on the counter as bookends. On the back wall hangs one big, simple sign that reads "BANK" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "BANK": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Cookhouse: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (cooking).
- **Attach:** your style key + the outside of the Cookhouse (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Cookhouse, where players cook food that makes them stronger. It is at the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs.

A warm whitewashed kitchen with a low beamed ceiling. A big stone hearth with a bubbling pot on a hook; a round stone bread oven; a long chopping table behind the counter with vegetables, fish and a cleaver; strings of sausages, garlic and dried herbs hanging from the beams; copper pots and pans on hooks; a pantry shelf of jars. The bro touches, big and easy to read: a hot-sauce challenge shelf of pepper jars from small and green to huge and red, and a giant fork and spoon crossed over the hearth like swords. On the back wall hangs one big, simple sign that reads "COOKHOUSE" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "COOKHOUSE": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Saloon: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (your party, and finding one).
- **Attach:** your style key + the outside of the Saloon (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Saloon, where players meet and form parties. It is at the saloon end of town, where buildings are painted boards in warm, bold colours, with fancy trim and balconies.

A classic frontier saloon of red-brown painted boards with cream trim. A long polished bar counter with a brass foot rail and tall stools; shelves of bottles in many colours and a big mirror behind the bar; round tables with chairs and playing cards; an upright piano in a corner; a staircase up to a balcony with a railing; a notice board of party-wanted posters with drawings only (a sword, a bow, a staff). The bro touches, big and easy to read: a moose head wearing sunglasses mounted over the bar, and an arm-wrestling table with two stools and a chalk tally beside it. On the back wall hangs one big, simple sign that reads "SALOON" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "SALOON": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Woodworker: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the woodworker's bench).
- **Attach:** your style key + the outside of the Woodworker (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Woodworker, where players craft bows and staves. It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.

A timber workshop of rough-sawn planks and big log posts. A long workbench across the room with a vice, hand planes, chisels and clamps; curled wood shavings and sawdust on the floor; bows and staves racked along the back wall, some finished and some half-carved; planks and logs stacked in a corner; a foot-powered lathe by the window. The bro touches, big and easy to read: a carved wooden bear in sunglasses flexing in the corner, and a chopping log with an axe stuck in it beside a tally board of chopping scores, one row far longer than the rest. On the back wall hangs one big, simple sign that reads "WOODWORKER" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "WOODWORKER": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Gem Cutter: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (gem cutting). Since v2.3.3259 this building is the **Gem Works** and this picture is the room behind both of its tabs, "Cut gems" and "Set gems".
- **Attach:** your style key + the outside of the Gem Cutter (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Gem Cutter, where players cut raw gems. It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.

A narrow, tidy workshop of fieldstone and dark timber, lit by one big bay window of small glass panes. A workbench with a spinning grinding wheel and a gem-cutting lathe; trays of cut gems sparkling in many colours on velvet cloth; baskets of rough, cloudy crystals on the floor; a jeweller's loupe on a brass stand; tiny tools in neat rows on the wall. The bro touches, big and easy to read: a cut amethyst the size of a barrel on a velvet cushion inside a glass case, like a trophy, and a jeweller's magnifying glass as big as a cartwheel leaning against the wall. On the back wall hangs one big, simple sign that reads "GEMS" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "GEMS": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Gem Works: inside (optional: a new picture with two stations)

- **In the game:** Not made yet, and nothing needs it: the Gem Works shows the Gem Cutter's picture (the one above) behind both tabs (v2.3.3259). This would give the cutter and the setter a station each in the picture. It replaces the Assay Office's prompt, which went with that building.
- **Attach:** your style key + the outside of the Gem Works (the Gem Cutter's Object Studio picture, sign GEMS)
- **How:** Ask ChatGPT for a wide 3:2 picture. Send it in chat as the Gem Works' and a session replaces `gemcutter.webp` (`tools/ui/make-room-pictures.py`).

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Gem Works, where players cut raw gems and have them set into their gear. It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.

A tidy workshop of fieldstone and dark timber, lit by one big bay window of small glass panes, with one long workbench across the room and two work stations on it, side by side. The left station is for CUTTING: a spinning grinding wheel and a gem-cutting lathe, a jeweller's loupe on a brass stand, trays of cut gems sparkling in many colours on velvet cloth, and baskets of rough, cloudy crystals on the floor beside it. The right station is for SETTING: a small anvil and a row of fine setting tools, a sword, a helmet and a ring laid on dark velvet with empty round gem sockets, glass vials of coloured liquid on a shelf above, and a little furnace with a crucible. The bro touches, big and easy to read: a cut amethyst the size of a barrel on a velvet cushion inside a glass case, like a trophy, and a sword with a huge gem in its hilt stuck in a rock in a corner. On the back wall hangs one big, simple sign that reads "GEMS" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in two places, a little left and a little right of the middle, one at each station, for the two keepers to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "GEMS": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Gambling Den: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the gambling panel).
- **Attach:** your style key + the outside of the Gambling Den (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Gambling Den, where players test their luck. It is at the saloon end of town, where buildings are painted boards in warm, bold colours, with fancy trim and balconies.

A flashy little gambling den with dark green walls and gold trim, under hanging lamps. A tall wheel of fortune on the back wall; a card table with stacks of chips; a dice table with cups and dice; the counter with one big coin on it for coin flips; red velvet curtains at the sides. The bro touches, big and easy to read: a giant red die as big as a crate used as a side table, and a lucky horseshoe as big as a door hung over the wheel of fortune. On the back wall hangs one big, simple sign that reads "GAMBLING" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "GAMBLING": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Feed & Seed: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the farm panel).
- **Attach:** your style key + the outside of the Feed & Seed (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Feed & Seed, where players buy seeds and grow their crops. It is at the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs.

A barn-like farm store of barn-red upright boards with white trim. Sacks of seed and feed stacked by the counter; open bins of seeds and grain with scoops; hoes, rakes and watering cans hanging on the wall; a big weighing scale on the counter; a ladder up to a hayloft with hay poking out; seed packets with drawings of vegetables on a rack. The bro touches, big and easy to read: a giant prize pumpkin with a blue ribbon sitting on a crate, and a scarecrow in sunglasses flexing in the corner. On the back wall hangs one big, simple sign that reads "FEED & SEED" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "FEED & SEED": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Land Office: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (the trip to your farm).
- **Attach:** your style key + the outside of the Land Office (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Land Office, where players get to their own farm. It is at the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs.

A small, tidy office of whitewashed boards, fields showing through its window. A big framed map of farm plots on the back wall, drawings only; a desk with ledgers, an inkwell and a stamp; a surveyor's tripod and measuring chain; a rack of keys on hooks, each with a little tag. The bro touches, big and easy to read: a huge wooden key hung over the map, the key to your farm, and a trophy cup holding a turnip as big as a barrel. On the back wall hangs one big, simple sign that reads "LAND OFFICE" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "LAND OFFICE": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Post Office & Telegraph: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (mail and your inbox).
- **Attach:** your style key + the outside of the Post Office & Telegraph (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Post Office & Telegraph, where players send and collect their mail. It is at the saloon end of town, where buildings are painted boards in warm, bold colours, with fancy trim and balconies.

A neat post office of deep blue painted boards with white trim. A counter with a brass grille window; a wall of little wooden pigeonhole mailboxes behind it, some with letters in them; parcels tied with string and bulging mail sacks on the floor; a telegraph key on the desk with wires running up the wall; a rack of rubber stamps. The bro touches, big and easy to read: a mail sack hung from the ceiling as a punching bag, well dented, and a giant mailbox in a corner, dented and proudly patched. On the back wall hangs one big, simple sign that reads "POST OFFICE" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "POST OFFICE": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Guild Hall: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (clans and guilds).
- **Attach:** your style key + the outside of the Guild Hall (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Guild Hall, where players found and run their clans. It is at the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs.

A great hall of huge round logs under a steep roof of carved crossed beams. A long feasting table with benches and tankards; clan banners in many different colours hanging from the rafters, one for each clan, with no writing on them; a big stone hearth with a fire; a map table; shields on the walls. The bro touches, big and easy to read: a giant golden cup on a pedestal, and a wall of mounted monster horns and tusks like hunting trophies. On the back wall hangs one big, simple sign that reads "GUILD HALL" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "GUILD HALL": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Sheriff's Office: inside

- **In the game:** Done (v2.3.3258): behind its window's menu (duels, the arena and bounties).
- **Attach:** your style key + the outside of the Sheriff's Office (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Sheriff's Office, where players sign up for duels and the arena, and take bounties. It is at the workshop end of town, where buildings are sturdy: fieldstone, heavy timber blackened by soot, iron straps and bolts.

A squat jailhouse office with fieldstone walls. A heavy wooden desk with a lantern and a sheriff's star paperweight; behind it an empty jail cell with iron bars, its door standing open; a rack of practice swords, wooden shields and a bow on the wall; a board of wanted posters of monsters, drawings only, with small bounty pouches pinned under them; a hat stand with a cowboy hat. The bro touches, big and easy to read: the biggest wanted poster, a green slime wearing a cowboy hat, and a chalkboard showing one big 0 (days since the last slime incident). On the back wall hangs one big, simple sign that reads "SHERIFF" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "SHERIFF" and the one big 0 on the chalkboard: every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Hotel: inside

- **In the game:** Done (v2.3.3258) as a picture, held until the Hotel opens (a bed and a rest; today it stands shut).
- **Attach:** your style key + the outside of the Hotel (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Hotel, where players rest, and come back after a fall. It is at the saloon end of town, where buildings are painted boards in warm, bold colours, with fancy trim and balconies.

A cosy hotel lobby of cream-painted clapboard with sky-blue shutters on the windows. A front desk with a brass bell and a board of room keys on hooks behind it; a staircase going up; two worn armchairs by a stone fireplace; a grandfather clock; a rag rug on the plank floor; a potted plant. The bro touches, big and easy to read: a hammock strung across one corner of the lobby with a pair of boots sticking out of it, and a framed picture sign of a dragon crossed out in red. On the back wall hangs one big, simple sign that reads "HOTEL" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "HOTEL": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Auction House: inside

*Optional: it already has your painting of its counter. Make this only if you want it to match the others in pixel art.*

- **In the game:** Done (v2.3.3258): replaced your first painting of it, and the clerk stays behind the counter.
- **Attach:** your style key + the outside of the Auction House (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Auction House, where players buy and sell with each other. It is at the money end of town, toward the mines: red brick, pale cut sandstone, brass fittings and iron bars.

A tall, proud hall of red brick with sandstone trim and tall arched windows. An auctioneer's podium with a gavel and a brass gong; rows of benches; display stands holding a sword, a helmet and a gem under glass covers; a big chalkboard of bids with drawings only; a counter with a ledger. The bro touches, big and easy to read: a bidding paddle as big as a door leaning against the wall. On the back wall hangs one big, simple sign that reads "AUCTION" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "AUCTION": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

### Town Hall: inside

*For later: nothing opens at the Town Hall yet.*

- **In the game:** Done (v2.3.3258): behind the Town Hall's window (the leaderboard, its trophy case, and the world map, the map on its wall); Mayor Bro still stands on its steps.
- **Attach:** your style key + the outside of the Town Hall (your Object Studio picture)
- **How:** Ask ChatGPT for a wide 3:2 picture.

```text
A wide picture (3:2, landscape) of the INSIDE of one building in BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the Town Hall, where Mayor Bro stands and the town is run. It stands alone in the middle of the town square, the grandest building in town.

A handsome civic hall of pale cut stone and white clapboard. The mayor's big desk with a quill and an inkwell; a big map of the Wheel's eight lands on the back wall, drawings only; red and gold bunting along the walls; a staircase up to a gallery; tall windows. The bro touches, big and easy to read: a portrait of Mayor Bro flexing both arms in a gold frame, and a glass trophy case crammed with trophies of every size. On the back wall hangs one big, simple sign that reads "TOWN HALL" in chunky capital letters, easy to read at a glance.

The view: we stand just inside the front door at a grown man's eye height, looking straight across the room at its back wall, square-on like a stage set, with no tilted or fish-eye perspective. A counter (or the room's main workbench) runs across the room about a third of the way up from the bottom of the picture, waist-high on a person, with clear space behind it in the middle for the keeper to stand, and open floor in front of it where visitors stand. A person standing here would be about half as tall as the picture. The picture is wide (landscape, 3:2) and the room fills it edge to edge: no border, frame, vignette or caption.

Built by Bros: a solid, well-made frontier room underneath, with the personality in what was added later -- things bolted on, bragged about, or patched after an adventure went wrong. Nothing is new: proud repairs and adventure dents everywhere. One or two big jokes, big enough to read on a phone, rather than many small ones. Clutter only at the sides and in the corners, never in the middle of the floor where visitors stand.

No people or animals anywhere: the game draws its own characters into the room. The only writing in the picture is the sign that reads "TOWN HALL": every other poster, label, map, ledger and price tag has drawings only, with no letters or numbers.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, cloth in soft folds, and glass with one or two crisp reflections. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Everything has a one-pixel outline in a darker shade of its own colour, never black. Moderate saturation. Warm, even light from the windows and lamps, with no glow, bloom, haze or light rays.

Attached are the game's style key and the outside of this building. Match the style key's pixel size, colours, shading and the way it draws each material exactly, and make this room the inside of that building, in the same materials, colours and character. Do not copy either picture's layout.
```

## The keepers

Since v2.3.3258 you talk to a building's keeper, who stands outside it, and its window opens with your picture of the room behind the menu. Blacksmith Bro opens the forge and Mayor Bro the Town Hall; Diego and Ace keep their own windows. The other eleven buildings have nobody outside yet, so they open from their door. The Gem Works gets two keepers, the owner's "two different NPCs in the same building" (v2.3.3259): the cutter opens its Cut gems tab and the setter its Set gems tab.

Since v2.3.3282 they come as **two sheets of six**, so each sheet's six match each other and it is two chats instead of twelve. The one-at-a-time prompt is kept below the sheets, for redoing one.

### The keepers, sheet 1 of 2: Bank, Saloon, Woodworker, Cookhouse, Feed & Seed, Land Office

- **In the game:** each stands beside his building's steps in BroTown. A tap on him, E or the right stick opens his building, and his head shows in the dialogue window (a crop of the same picture).
- **Attach:** `docs/art/townsfolk-key.png`: four of the game's townsfolk (Blacksmith Bro, Diego, the Auction House's clerk and Mayor Bro), so the six come out the same style and size.
- **How:** One landscape picture. Send it in chat and a session cuts each man out, stands his feet on the townsfolk's line (256 × 256, feet 223 px down), crops his head for the dialogue and puts him at his steps.

```text
Landscape image (wider than tall): a sheet of 6 townsfolk for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros, in a 3×2 grid read like a page (each row left to right, rows top to bottom). Each man stands in the middle of his own equal square cell, his whole body from hat to boots, his feet near the bottom of the cell, and touches nothing else. All six are drawn in exactly the same style, size and proportions as the attached townsfolk: the same big heads, chunky bodies and height.

Each stands facing the viewer, relaxed and welcoming, his arms at his sides or holding what he works with:
1. Banker Bro, the town's banker: a portly, well-groomed man in his fifties with a neat grey mustache and round gold spectacles, a black bowler hat, a dark green waistcoat with a gold watch chain over a white shirt with sleeve garters, a ledger under one arm and a big brass key on a ring at his belt.
2. Barkeep Bro, the saloon's barkeep: a big, friendly man with a handlebar mustache and slicked-back hair, a white shirt with rolled sleeves and red sleeve garters, a black vest, a bar towel over one shoulder and a glass mug in one hand.
3. Woodworker Bro, the town's carpenter and bowyer: a lean man with a short beard and sawdust in his hair, a canvas apron full of chisels, a pencil behind his ear and a half-finished longbow in one hand.
4. Cook Bro, the cookhouse cook: a round, jolly man in a tall white chef's hat and a stained white apron over a checkered shirt, a wooden ladle in one hand and a towel tucked in his belt.
5. Farmer Bro, the feed-and-seed man: a sunburnt farmer with a wide straw hat, blue denim overalls over a red plaid shirt, a sack of seed on one shoulder and a stalk of wheat between his teeth.
6. Land Agent Bro, the land agent: a neat clerk with a green eyeshade visor and spectacles, a brown suit with arm garters, a rolled-up deed tied with ribbon in one hand and a fountain pen behind his ear.

Every man looks different at a glance: his own face, hair, build and colours.

Style: crisp pixel art exactly like the attached townsfolk: hard-edged square pixels, no blur, no anti-aliasing, no soft gradients; each colour shaded with a few flat tones; the same outline as the attached townsfolk. Cloth, leather, metal and wood each drawn as themselves.

No text, signs, frames, cell lines, floor or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing on the men is magenta or pink.
```

### The keepers, sheet 2 of 2: Gem Works (two), Post Office, Sheriff's Office, Guild Hall, Auction House

- **In the game:** as sheet 1. The Gem Works' cutter opens its Cut gems tab and its setter the Set gems tab.
- **Attach:** `docs/art/townsfolk-key.png`.
- **How:** as sheet 1. The Auctioneer is the one you could skip: the clerk behind the counter in your Auction House picture already exists as a figure (`storekeeper-bro.webp`, third in the attached picture) and could stand outside instead. If you skip him, ask for "a sheet of 5" and leave out line 6.

```text
Landscape image (wider than tall): a sheet of 6 townsfolk for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros, in a 3×2 grid read like a page (each row left to right, rows top to bottom). Each man stands in the middle of his own equal square cell, his whole body from hat to boots, his feet near the bottom of the cell, and touches nothing else. All six are drawn in exactly the same style, size and proportions as the attached townsfolk: the same big heads, chunky bodies and height.

Each stands facing the viewer, relaxed and welcoming, his arms at his sides or holding what he works with:
1. Gem Cutter Bro, the gem cutter: a careful, quiet man with a jeweler's loupe over one eye, fingerless leather gloves and a deep blue vest, holding a small velvet tray of glittering cut gems in front of him.
2. Gem Setter Bro, who sets polished gems into gear: a thin, curious man with brass goggles pushed up on his forehead, a long brown work coat with pockets full of little vials, a small setting hammer in one hand and a sword with an empty gem socket in its hilt in the other.
3. Postmaster Bro, the postmaster and telegraph man: a cheerful man in a blue postal cap and a blue jacket with brass buttons, a leather mailbag across his chest full of letters, and a stamped letter in one hand.
4. Sheriff Bro, the town sheriff: a tall, steady man with a thick mustache, a wide brown cowboy hat, a long tan duster over a vest with a shiny gold star badge, a coiled lasso on his belt and his thumbs hooked in his belt.
5. Guildmaster Bro, the guildmaster: a broad-shouldered veteran with a grey beard and a small scar over one eyebrow, a heavy red cloak with a round brass clasp over worn leather armour, a guild banner on a pole in one hand.
6. Auctioneer Bro, the auctioneer: a sharp-dressed man with slicked hair and a thin mustache, a burgundy suit with a bow tie, a wooden gavel in one hand.

Every man looks different at a glance: his own face, hair, build and colours.

Style: crisp pixel art exactly like the attached townsfolk: hard-edged square pixels, no blur, no anti-aliasing, no soft gradients; each colour shaded with a few flat tones; the same outline as the attached townsfolk. Cloth, leather, metal and wood each drawn as themselves.

No text, signs, frames, cell lines, floor or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing on the men is magenta or pink.
```

### One keeper at a time (for a redo)

- **Attach:** `docs/art/townsfolk-key.png`.
- **How:** paste the prompt below and replace `[WHO]` with one line from the table. It comes on one flat magenta background (#FF00FF), and a session fits him in as with the sheets.

```text
A full-body picture of one character for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros, drawn in exactly the same style, size and proportions as the attached townsfolk: [WHO] He stands facing the viewer, relaxed and welcoming, his arms at his sides or holding what he works with.

The picture is square. He stands in the middle, his whole body in the picture with his feet near the bottom and a little space above his head. The background is ONE flat magenta colour (#FF00FF) with nothing else on it: no floor, no shadow, no border, no text.

Style: crisp pixel art like the attached townsfolk: hard-edged square pixels, no blur, no anti-aliasing, no soft gradients; each colour shaded with a few flat tones; the same outline as the attached townsfolk. Cloth, leather, metal and wood each drawn as themselves.
```

| Building | Replace `[WHO]` with |
|---|---|
| Bank | Banker Bro, the town's banker: a portly, well-groomed man in his fifties with a neat grey mustache and round gold spectacles, a black bowler hat, a dark green waistcoat with a gold watch chain over a white shirt with sleeve garters, a ledger under one arm and a big brass key on a ring at his belt. |
| Saloon | Barkeep Bro, the saloon's barkeep: a big, friendly man with a handlebar mustache and slicked-back hair, a white shirt with rolled sleeves and red sleeve garters, a black vest, a bar towel over one shoulder and a glass mug in one hand. |
| Woodworker | Woodworker Bro, the town's carpenter and bowyer: a lean man with a short beard and sawdust in his hair, a canvas apron full of chisels, a pencil behind his ear and a half-finished longbow in one hand. |
| Gem Works (Cut gems) | Gem Cutter Bro, the gem cutter: a careful, quiet man with a jeweler's loupe over one eye, fingerless leather gloves and a deep blue vest, holding a small velvet tray of glittering cut gems in front of him. |
| Cookhouse | Cook Bro, the cookhouse cook: a round, jolly man in a tall white chef's hat and a stained white apron over a checkered shirt, a wooden ladle in one hand and a towel tucked in his belt. |
| Gem Works (Set gems) | Gem Setter Bro, who sets polished gems into gear: a thin, curious man with brass goggles pushed up on his forehead, a long brown work coat with pockets full of little vials, a small setting hammer in one hand and a sword with an empty gem socket in its hilt in the other, a faint blue glow on his fingertips. |
| Feed & Seed | Farmer Bro, the feed-and-seed man: a sunburnt farmer with a wide straw hat, blue denim overalls over a red plaid shirt, a sack of seed on one shoulder and a stalk of wheat between his teeth. |
| Land Office | Land Agent Bro, the land agent: a neat clerk with a green eyeshade visor and spectacles, a brown suit with arm garters, a rolled-up deed tied with ribbon in one hand and a fountain pen behind his ear. |
| Post Office | Postmaster Bro, the postmaster and telegraph man: a cheerful man in a blue postal cap and a blue jacket with brass buttons, a leather mailbag across his chest full of letters, and a stamped letter in one hand. |
| Sheriff's Office | Sheriff Bro, the town sheriff: a tall, steady man with a thick mustache, a wide brown cowboy hat, a long tan duster over a vest with a shiny gold star badge, a coiled lasso on his belt and his thumbs hooked in his belt. |
| Guild Hall | Guildmaster Bro, the guildmaster: a broad-shouldered veteran with a grey beard and a small scar over one eyebrow, a heavy red cloak with a round brass emblem clasp over worn leather armour, a guild banner on a pole in one hand. |
| Auction House | Auctioneer Bro, the auctioneer: a sharp-dressed man with slicked hair and a thin mustache, a burgundy suit with a bow tie, a wooden gavel in one hand. |

## Pet trapping

Beastmaster Bro stands beside the Woodworker and gives the trapping quests (v2.3.3121). Until your picture comes he wears Diego's coat in green with a Snowling at his side, made by `tools/make_beastmaster.py` from art the game already has.

Since v2.3.3519 **Woodworker Bro** and **Farmer Bro** stand in the Wheel's BroTown too, as givers of the tour's quests (docs/specs/demo-quest-line.md) and keepers of the Woodworker and the Feed & Seed. Until your pictures come they are stand-ins made by `tools/make_tour_townsfolk.py` from art the game already has: Woodworker Bro is the old shop clerk in a green cap and a canvas apron, Farmer Bro is Diego's figure in a straw hat and denim. The prompts above (sheet 1: numbers 3 and 5) are theirs; when a picture arrives, it replaces `public/sprites/npc/woodworker-bro.webp` or `farmer-bro.webp` (256 x 256, feet on y = 223, and the head crop beside it).

### Beastmaster Bro: his figure

- **In the game:** Standing east of the Woodworker's steps in BroTown, and his head in the dialogue window (a crop of the same picture).
- **Attach:** `docs/art/townsfolk-key.png` (four of the game's townsfolk), so he comes out the same style and size as the other townsfolk.
- **How:** Ask ChatGPT for a square picture on one flat magenta background (#FF00FF). A session cuts him out, stands his feet on the townsfolk's line (256 × 256, feet 223 px down) and crops his head for the dialogue.

```text
A full-body picture of one character for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros, drawn in exactly the same style, size and proportions as the attached townsfolk: Beastmaster Bro, the town's trapper and keeper of tamed monsters. A broad, cheerful frontiersman in his thirties with a short beard, a wide-brimmed leather hat with a few feathers and a small animal tooth on its band, a long moss-green oilskin coat over a fur-trimmed vest, an orange neckerchief, sturdy leather gloves and boots, and a coil of rope and a little wooden box trap hanging from his belt. A small, friendly snowman creature (about knee-high, with a tiny top hat and a red scarf) sits at his feet, looking up at him. He stands facing the viewer, relaxed and welcoming, arms at his sides.

The picture is square. He stands in the middle, his whole body in the picture with his feet near the bottom and a little space above his hat. The background is ONE flat magenta colour (#FF00FF) with nothing else on it: no floor, no shadow, no border, no text.

Style: crisp pixel art like the attached townsfolk: hard-edged square pixels, no blur, no anti-aliasing, no soft gradients; each colour shaded with a few flat tones; the same outline as the attached townsfolk. Leather, fur, cloth and snow each drawn as themselves.
```

### Box trap: item icon

- **In the game (v2.3.3281):** your box trap, in the bag, on the Woodworker's Traps tab and on the TRAP button (they borrowed the Trapping skill's icon until then).
- **Made on the hardened wood sheet below** (v2.3.3279): one sheet for the five hardened woods and the trap, so they match.

## Hardened wood

Five logs make one hardened wood at the Woodworker (v2.3.3139, docs/specs/hardened-wood.md). Today each icon is its tree's log picture with the sprigs taken off, the wood darkened and two iron bands drawn round it by `tools/make_hardened_wood_icons.py`.

### Hardened wood and the box trap: one sheet of six (v2.3.3279)

- **In the game (v2.3.3281):** your sheet, cut by `tools/ui/cut-bag-icons.py` (it keeps the sheet in `assets/icons-source/sheet-bag-wood.png`): the bag and the Woodworker's Harden tab (Hardened Pine Wood, Hardened Softwood, Hardened Hardwood, Hardened Cedar Wood, Hardened Maple Wood), and the Box Trap in the bag, the Traps tab and on the TRAP button. The prompt stays for a redo: send the new sheet in chat.
- **Attach:** `docs/art/log-icons-key.png`, the game's five log icons in a row (pine, softwood, hardwood, cedar, maple), so each hardened wood keeps its log's colour and the style matches the bag.
- **How:** One landscape picture; send it in chat and a session cuts it into the game's icons. It replaces the white-background prompt that was here: a white ground cuts out badly round pale wood, and the trap's old prompt asked for pixel art, which the bag is not.

```text
Landscape image (wider than tall): a sprite sheet of 6 item icons for a 2D action RPG, in a 3×2 grid read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else.

The first five are HARDENED WOOD, made from the five attached logs (left to right: pine, softwood, hardwood, cedar, maple), each keeping its own log's colours: the same log, but worked -- bark trimmed smooth and darkened by fire-hardening, the end grain dark at its rim, oiled to a soft sheen, and bound with two riveted iron bands. No leaves or sprigs.
Row 1: hardened pine · hardened softwood · hardened hardwood
Row 2: hardened cedar · hardened maple · a box trap (a small crate of rough pine planks, its door propped open on a stick tied to a string, a carrot inside as bait)

Style: exactly the attached log icons: glossy hand-painted item icons with the same bold dark outline, shading, highlights and angle. All 6 the same size and weight.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta (cedar's warm reddish wood is fine). Do not copy the attached logs' leaves or background.
```

## Land banners

Four of the eight lands play only a plain plaque when you cross in. Attach the Frost Ridge sheet and ChatGPT copies its layout, so I can cut each sheet into the banner exactly as with the first four.

Fixed in v2.3.3282: the prompts said "the same flat black background", but your Frost Ridge sheet is see-through (no background at all), and the tool that cuts the banners (`tools/process_zone_banner_sheets.py`) reads its see-through edge; and "saved on this page" pointed at nothing. The sheet is `docs/triage-2026-09-17/assets/zonebanner-frost-ridge-ornament.png`.

### Stone Hollows: land banner

- **In the game:** Plays across the top of the screen as you cross into the Stone Hollows. Today it shows the plain plaque only.
- **Attach:** the Frost Ridge ornament sheet, `docs/triage-2026-09-17/assets/zonebanner-frost-ridge-ornament.png`
- **How:** Ask for the same shape of picture as the attached sheet.

```text
Attached is the ornament sheet of one of the zone-entry banners in my game BroTown (Frost Ridge). Make the same sheet for another land, the Stone Hollows.

Keep its layout exactly: the same nine stages of a pair of ornaments, a LEFT piece and a RIGHT piece, in the same rows and spacing, on the same transparent background (no background at all, like the attached sheet). The pieces grow from a faint wisp in the first stage to the full scene in the last, in the same painted style, size and glow as the attached sheet.

Theme them on grey stone and the mine: rock spires and boulders, a cave mouth, crossed pickaxes and a stretch of mine-cart rail, swirling dust, and small glowing blue and violet crystals.

No plaque, no bar, no frame, no writing and no numbers: only the two ornaments in each stage.
```

### Electric Foundry: land banner

- **In the game:** Plays across the top of the screen as you cross into the Electric Foundry. Today it shows the plain plaque only.
- **Attach:** the Frost Ridge ornament sheet, `docs/triage-2026-09-17/assets/zonebanner-frost-ridge-ornament.png`
- **How:** Ask for the same shape of picture as the attached sheet.

```text
Attached is the ornament sheet of one of the zone-entry banners in my game BroTown (Frost Ridge). Make the same sheet for another land, the Electric Foundry.

Keep its layout exactly: the same nine stages of a pair of ornaments, a LEFT piece and a RIGHT piece, in the same rows and spacing, on the same transparent background (no background at all, like the attached sheet). The pieces grow from a faint wisp in the first stage to the full scene in the last, in the same painted style, size and glow as the attached sheet.

Theme them on iron and lightning: gears, riveted iron plates, copper coils and a small Tesla-coil tower crackling with blue-violet sparks and arcs.

No plaque, no bar, no frame, no writing and no numbers: only the two ornaments in each stage.
```

### Water Caves: land banner

- **In the game:** Plays across the top of the screen as you cross into the Water Caves. Today it shows the plain plaque only.
- **Attach:** the Frost Ridge ornament sheet, `docs/triage-2026-09-17/assets/zonebanner-frost-ridge-ornament.png`
- **How:** Ask for the same shape of picture as the attached sheet.

```text
Attached is the ornament sheet of one of the zone-entry banners in my game BroTown (Frost Ridge). Make the same sheet for another land, the Water Caves.

Keep its layout exactly: the same nine stages of a pair of ornaments, a LEFT piece and a RIGHT piece, in the same rows and spacing, on the same transparent background (no background at all, like the attached sheet). The pieces grow from a faint wisp in the first stage to the full scene in the last, in the same painted style, size and glow as the attached sheet.

Theme them on the sea: a curling wave, sea-cave rocks with dripping stalactites, coral, shells and bubbles, in turquoise and deep blue water.

No plaque, no bar, no frame, no writing and no numbers: only the two ornaments in each stage.
```

### Poison Forest: land banner

- **In the game:** Plays across the top of the screen as you cross into the Poison Forest. Today it shows the plain plaque only.
- **Attach:** the Frost Ridge ornament sheet, `docs/triage-2026-09-17/assets/zonebanner-frost-ridge-ornament.png`
- **How:** Ask for the same shape of picture as the attached sheet.

```text
Attached is the ornament sheet of one of the zone-entry banners in my game BroTown (Frost Ridge). Make the same sheet for another land, the Poison Forest.

Keep its layout exactly: the same nine stages of a pair of ornaments, a LEFT piece and a RIGHT piece, in the same rows and spacing, on the same transparent background (no background at all, like the attached sheet). The pieces grow from a faint wisp in the first stage to the full scene in the last, in the same painted style, size and glow as the attached sheet.

Theme them on venom: twisted dark trees and roots, purple-and-green toxic mushrooms, dripping slime and floating spores in a sickly green mist.

No plaque, no bar, no frame, no writing and no numbers: only the two ornaments in each stage.
```

## Dungeon entrances

The three dungeons' ways in are drawn in code until they have pictures. These are the Object Studio's own prompts, so the pictures go through the studio like every other object.

### The Great Cave: dungeon entrance

- **In the game:** Where the Stone Hollows' dungeon starts. Today it is a dark oval drawn in code.
- **Attach:** your style key
- **How:** Ask for a wide 3:2 picture, as the Object Studio does.

```text
A wide picture (3:2, landscape) of ONE object for BroTown, a top-down 2D action RPG: the entrance to a dungeon: the mouth of a huge cave in a grey rock outcrop, framed by glowing blue and violet crystals, with mine-cart rails running out of the dark opening, which is wide enough for three people to walk in side by side. It is drawn whole in the middle of the picture, with plenty of background all round and nothing cut off. It stands on nothing: no ground, grass, path or shadow under or around it, and the place where it meets the ground is plain to see.

No text, letters or numbers anywhere. The background is ONE flat bright green colour (#00FF00) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is bright green. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. It is about five and a half times as wide as a person is tall, so it fills about three quarters of the picture's width.
```

### The Foundry Dome: dungeon entrance

- **In the game:** Where the Electric Foundry' dungeon starts. Today it is a dark oval drawn in code.
- **Attach:** your style key
- **How:** Ask for a wide 3:2 picture, as the Object Studio does.

```text
A wide picture (3:2, landscape) of ONE object for BroTown, a top-down 2D action RPG: the entrance to a dungeon: a great riveted iron dome with glowing blue windows and a big round doorway at the front, wide enough for three people to walk in side by side, ringed by small iron pylons with blue sparks at their tips. It is drawn whole in the middle of the picture, with plenty of background all round and nothing cut off. It stands on nothing: no ground, grass, path or shadow under or around it, and the place where it meets the ground is plain to see.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. It is about five and a half times as wide as a person is tall, so it fills about three quarters of the picture's width.
```

### The Buried City: dungeon entrance

- **In the game:** Where the Wind Dunes' dungeon starts. Today it is a dark oval drawn in code.
- **Attach:** your style key
- **How:** Ask for a wide 3:2 picture, as the Object Studio does.

```text
A wide picture (3:2, landscape) of ONE object for BroTown, a top-down 2D action RPG: the entrance to a dungeon: half-buried terracotta sandstone ruins, broken columns and a giant carved stone face half sunk in sand, its open mouth a dark doorway wide enough for three people to walk in side by side. It is drawn whole in the middle of the picture, with plenty of background all round and nothing cut off. It stands on nothing: no ground, grass, path or shadow under or around it, and the place where it meets the ground is plain to see.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Scale: a person standing here would be about one fifth as tall as this picture. It is about five and a half times as wide as a person is tall, so it fills about four fifths of the picture's width.
```

## Dungeon walls

The three dungeons' arenas are floored with their land's own ground picture (v2.3.3016), but their walls are one flat dark colour drawn in code. These give each arena real walls: the wall's front, seen along the top of the arena, and the top of the wall all round it (v2.3.3282).

- **How:** One wide picture per dungeon. Send it in chat: a session makes each strip repeat seamlessly (the Ground Studio's cut) and draws the arena's walls from it. Drawing walls from a picture is new code, done when the first picture comes.

### The Great Cave: dungeon walls

- **In the game:** the walls of the Great Cave's arena. Today they are one flat colour.
- **Attach:** your style key, and `docs/art/dungeon-floors-key.png` (the three dungeons' floors, left to right: the Great Cave, the Foundry Dome, the Buried City).
- **Green, not magenta:** the crystals are violet, which a magenta background would eat into.

```text
A wide picture (3:2, landscape) for BroTown, a top-down 2D action RPG: two strips of dungeon wall for the Great Cave, the dungeon under the Stone Hollows, one above the other with a band of background between them, each running the full width of the picture.

1. The top strip is the wall's FRONT, seen from a steep three-quarter top-down angle: rough grey cave rock in big faceted blocks with cracks and chips, a few small blue and violet crystals poking out, and an old wooden mine timber propping it here and there. It is a little taller than a person, its top edge level and its bottom edge where it meets the floor.
2. The bottom strip is the TOP of the same wall, seen from above: the same grey rock, rubbly and uneven, with no front and no edges.

Both strips repeat side by side: their left and right ends must join with no visible seam. No doors, gaps, torches, creatures or people.

No text, letters or numbers anywhere. The background is ONE flat bright green colour (#00FF00) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is bright green. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached are the game's style key and the three dungeons' floors (left to right: the Great Cave, the Foundry Dome, the Buried City). Match the style key's pixel size, colours, shading and the way it draws each material, and make the wall belong on the first floor, the Great Cave's grey rock, but do not copy their tiles. Scale: a person standing beside the wall would be a little shorter than its front.
```

### The Foundry Dome: dungeon walls

- **In the game:** the walls of the Foundry Dome's arena. Today they are one flat colour.
- **Attach:** your style key, and `docs/art/dungeon-floors-key.png` (the three dungeons' floors, left to right: the Great Cave, the Foundry Dome, the Buried City).
- **Background:** magenta, as the Object Studio's pictures.

```text
A wide picture (3:2, landscape) for BroTown, a top-down 2D action RPG: two strips of dungeon wall for the Foundry Dome, the dungeon of the Electric Foundry, one above the other with a band of background between them, each running the full width of the picture.

1. The top strip is the wall's FRONT, seen from a steep three-quarter top-down angle: dark riveted iron wall plates joined by brass seams, a thick iron pipe running along it, and a small round porthole of blue glass here and there. It is a little taller than a person, its top edge level and its bottom edge where it meets the floor.
2. The bottom strip is the TOP of the same wall, seen from above: the same dark iron, riveted plates joined by brass seams, with no front and no edges.

Both strips repeat side by side: their left and right ends must join with no visible seam. No doors, gaps, torches, creatures or people.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached are the game's style key and the three dungeons' floors (left to right: the Great Cave, the Foundry Dome, the Buried City). Match the style key's pixel size, colours, shading and the way it draws each material, and make the wall belong on the second floor, the Foundry Dome's dark iron plates and brass seams, but do not copy their tiles. Scale: a person standing beside the wall would be a little shorter than its front.
```

### The Buried City: dungeon walls

- **In the game:** the walls of the Buried City's arena. Today they are one flat colour.
- **Attach:** your style key, and `docs/art/dungeon-floors-key.png` (the three dungeons' floors, left to right: the Great Cave, the Foundry Dome, the Buried City).
- **Background:** magenta, as the Object Studio's pictures.

```text
A wide picture (3:2, landscape) for BroTown, a top-down 2D action RPG: two strips of dungeon wall for the Buried City, the dungeon under the Wind Dunes, one above the other with a band of background between them, each running the full width of the picture.

1. The top strip is the wall's FRONT, seen from a steep three-quarter top-down angle: big blocks of red-orange sandstone, worn smooth and chipped, a carved band of simple worn patterns (no letters), and sand drifted against its foot. It is a little taller than a person, its top edge level and its bottom edge where it meets the floor.
2. The bottom strip is the TOP of the same wall, seen from above: the same red sandstone, its blocks' tops worn and dusted with sand, with no front and no edges.

Both strips repeat side by side: their left and right ends must join with no visible seam. No doors, gaps, torches, creatures or people.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached are the game's style key and the three dungeons' floors (left to right: the Great Cave, the Foundry Dome, the Buried City). Match the style key's pixel size, colours, shading and the way it draws each material, and make the wall belong on the third floor, the Buried City's red sandstone, but do not copy their tiles. Scale: a person standing beside the wall would be a little shorter than its front.
```

## Monsters

Two lands still wear another land's monster, and two monsters have one still picture for every direction (v2.3.3282):

| Land | Its monster today | What it gets |
|---|---|---|
| Electric Foundry | the starter green slime, unchanged | its own slime, made of leaked lightning (its codex story) |
| Poison Forest | the Mire Wisp is the green slime tinted violet; the Bog Lurker is the fishman tinted murky | a wisp of poisoned light, and a bog-rotted fishman (their codex stories) |
| Stone Hollows | the rock monster: one picture, used for all four directions, so it slides | a hop in four directions |
| Water Caves | the fishman: the same, one picture that slides | a walk in four directions |

The Verdant Wilds keeps your blue slimes (your call, v2.3.1675), the Wind Dunes its mummies, Frost Ridge its snowmen and the Flame Fields its goblins. Levels 21-40 wear each land's monster recoloured (v2.3.3093) until you want each stage's own: the same prompts make them.

- **Attach:** `docs/art/monster-style-key.png` (the game's slime, fire goblin, fishman, rock monster, mummy and snowman), or the monster's own picture where the prompt says so.
- **How:** One square picture per chat; send it in chat. A session cuts the frames, lines each up by its feet, sizes them to the monster set and wires them in. A monster's new walk also becomes its pet's look (the pet sheet is made from the walk frames).
- **Be ready for a retry or two.** ChatGPT keeps a single picture steadier than a run of animation frames. If a frame is off, ask for the whole sheet again with that frame fixed; a session can also drop a bad frame and play the good ones.
- **Memory:** a monster made this way holds about 4 MB when it is near you, 8 with the optional sheet (the fire goblin's full set holds about 30), loaded as you walk toward it and let go behind you, like every Wheel monster.

### The Foundry Slime (Electric Foundry)

- **In the game:** the Electric Foundry's monsters at levels 1-20, and the Foundry Dome's. It keeps the slime's moves: it bobs, spits globs and lunges.
- **Attach:** `docs/art/monster-style-key.png`.

```text
Square image: a sprite sheet of ONE monster for BroTown, a top-down 2D action RPG, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). The monster is the same size in every cell, sits on the same invisible line near the bottom of its cell, faces the viewer, and touches nothing else.

The monster is the Foundry Slime: a living blob of bottled lightning that leaked out of the Electric Foundry, pooled on the floor and one morning got up and wobbled off on its own. A wobbly dome of glowing electric-blue and violet jelly crackling with tiny white sparks, a broken glass bottle neck stuck in its top like a little hat, and two angry white eyes.

Row 1: bobbing in place, four frames that loop: squashed low, rising, at its tallest, coming down.
Row 2: spitting a glob at the viewer, four frames: swelling up, squeezing, the glob bursting out, settling.
Row 3: hurt, two frames (flattened and flinching, wobbling back); then its glob alone: a crackling ball of blue lightning; then what it leaves when it dies, alone: a scorched puddle with a few sparks.
Row 4: dying, four frames: shuddering, collapsing, bursting apart in sparks, melted into its puddle.

Style: exactly the attached monsters: chunky, bold pixel art with a dark outline, a few flat tones per colour, bright readable colours, lit from the upper left, seen from a steep three-quarter top-down angle. The same size and weight as the attached slime.

No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink.
```

### The Mire Wisp (Poison Forest)

- **In the game:** the Poison Forest's wisps at levels 1-20. It keeps the slime's moves: it bobs, spits globs and lunges.
- **Attach:** `docs/art/monster-style-key.png`.

```text
Square image: a sprite sheet of ONE monster for BroTown, a top-down 2D action RPG, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). The monster is the same size in every cell, floats at the same height above the same invisible line near the bottom of its cell, faces the viewer, and touches nothing else.

The monster is the Mire Wisp: a drifting blob of poisoned light from the Poison Forest, which lost travellers followed thinking it was a lantern. A glowing sickly-green and violet wisp with a ghostly, grinning face, its bottom trailing off into dripping wisps, floating just above the ground.

Row 1: bobbing in the air, four frames that loop: low, rising, at its highest, sinking.
Row 2: spitting a glob at the viewer, four frames: swelling up, squeezing, the glob bursting out, settling.
Row 3: hurt, two frames (squashed and flinching, wobbling back); then its glob alone: a dripping ball of green venom; then what it leaves when it dies, alone: a small bubbling green puddle.
Row 4: dying, four frames: flickering, shrinking, bursting into green drops, gone to its puddle.

Style: exactly the attached monsters: chunky, bold pixel art with a dark outline, a few flat tones per colour, bright readable colours, lit from the upper left, seen from a steep three-quarter top-down angle. The same size and weight as the attached slime.

No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink (its violet is a deep blue-violet, not pink).
```

### The Bog Lurker (Poison Forest)

- **In the game:** the Poison Forest's lurkers at levels 1-20. It keeps the fishman's moves: it walks up to you and slams.
- **Attach:** `docs/art/monster-style-key.png`.

```text
Square image: a sprite sheet of ONE monster for BroTown, a top-down 2D action RPG, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). The monster is the same size in every cell, stands on the same invisible line near the bottom of its cell, and touches nothing else.

The monster is the Bog Lurker: a fishman who left the sea caves for wetter ground, found the Poison Forest's bog and stayed until the bog moved in. Hunched and heavy, with mottled grey-green skin, a wide fish mouth full of needle teeth, small glowing yellow-green eyes, pond weed and lily pads draped over its shoulders, two little purple toadstools growing on its back, ragged dark fins, long arms with webbed claws, and faded, torn swim trunks.

Each row is one walk cycle of four frames that loops:
Row 1: walking toward the viewer.
Row 2: walking to the right.
Row 3: walking away from the viewer (we see its back).
Row 4: walking to the left.

Style: exactly the attached monsters: chunky, bold pixel art with a dark outline, a few flat tones per colour, bright readable colours, lit from the upper left, seen from a steep three-quarter top-down angle. The same size and weight as the attached fishman.

No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink.
```

### The rock monster: a hop in four directions (Stone Hollows)

- **In the game:** the Stone Hollows' monsters and the Great Cave's. Today one picture faces every way and slides.
- **Attach:** `docs/art/rockmonster-key.png` (its picture).

```text
Square image: a sprite sheet of the attached monster for my game BroTown, a top-down 2D action RPG, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). Keep the monster exactly as it is: an egg-shaped boulder of grey stone blocks with glowing red eyes and a huge mouth of fangs. It is the same size in every cell, on the same invisible line near the bottom of its cell, and touches nothing else.

It has no legs: it moves by hopping. Each row is one hop of four frames that loops: crouched low, springing up off the ground, at the top of the hop, landing with a small puff of dust.
Row 1: hopping toward the viewer (we see its face).
Row 2: hopping to the right (we see its side).
Row 3: hopping away from the viewer (we see the back of the rock, no face).
Row 4: hopping to the left.

Style: exactly the attached picture: the same pixel art, outline, colours and lighting. No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink.
```

### The fishman: a walk in four directions (Water Caves)

- **In the game:** the Water Caves' monsters. Today one picture faces every way and slides.
- **Attach:** `docs/art/fishman-key.png` (its picture).

```text
Square image: a sprite sheet of the attached monster for my game BroTown, a top-down 2D action RPG, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). Keep the monster exactly as it is: a muscular fish-man with a fierce fish head full of teeth, red eyes, golden-brown scales, fins on its back and arms, and blue swim trunks. It is the same size in every cell, standing on the same invisible line near the bottom of its cell, and touches nothing else.

Each row is one walk cycle of four frames that loops, walking on its two finned legs:
Row 1: walking toward the viewer.
Row 2: walking to the right.
Row 3: walking away from the viewer (we see its back and its back fins).
Row 4: walking to the left.

Style: exactly the attached picture: the same pixel art, outline, colours and lighting. No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink.
```

### Optional: a walking monster's slam, hurt and death

- **In the game:** the Bog Lurker, the rock monster or the fishman, after its walk is in. Today they have no slam, hurt or death pictures of their own.
- **Attach:** that monster's walk sheet (the picture ChatGPT made).
- **How:** one chat per monster.

```text
Square image: a sprite sheet of the SAME monster as the attached sheet, for the same game, in a 4×4 grid of equal square cells read like a page (each row left to right, rows top to bottom). It is exactly the same monster, at the same size, on the same invisible line near the bottom of its cell, in the same style, and touches nothing else.

Row 1: its slam, facing the viewer, four frames: rising up as high as it can, at the top, crashing down hard with a burst of dust, recovering.
Row 2: the same slam, facing right.
Row 3: hurt, facing the viewer, two frames (knocked back and flinching, recovering); then two frames of starting to fall.
Row 4: dying, four frames: falling, hitting the ground, lying still, then only what it leaves behind: a small pile of its remains.

No text, cell lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the monster is magenta or pink.
```

## Small icons, sheet 5 (v2.3.3282)

Eight marks still drawn in code or shown as emoji, in the style of your four small-icon sheets (docs/specs/small-icons.md).

- **In the game:**
  1. to 3. the quest badges over the townsfolk's heads: a quest to offer (gold "!"), one you are on (grey "?"), one ready to hand in (green check). Drawn in code today, as three rings so they show on any ground; your picture keeps the rings.
  4. the season star: the ★ on the Daily Rewards window and the Quests tab.
  5. a bonus spin: the little wheel drawn in code on the Daily Rewards window.
  6. locked: the 🔒 on locked crops and rows.
  7. home: the minimap's way-home badge, drawn in code today.
  8. a dungeon: its mouth on the world map (a plain dot today).
- **Attach:** `assets/icons-source/sheet-small-1-party.png`, your first small-icon sheet, so the new ones match.
- **How:** One landscape picture; send it in chat. A session cuts it as it cut your other four (by each icon's own see-through edge) and puts each in its place.

```text
Landscape image (wider than tall): a sheet of 8 small game icons for BroTown, a 2D action RPG, in a 4×2 grid read like a page (each row left to right, rows top to bottom). Each icon sits centred in its own equal square cell, fills about three quarters of it, and touches nothing else.

Row 1:
1. A quest to offer: a round badge made of a thin dark outline, then a thick white ring, then a bright gold disc with a bold dark exclamation mark in the middle.
2. A quest you are on: the same round badge with a grey disc and a bold white question mark.
3. A quest ready to hand in: the same round badge with a bright green disc and a bold white check mark.
4. A season star: a fat, shiny gold star.
Row 2:
5. A bonus spin: a small fairground prize wheel with eight coloured slices, a brass rim and a little gold pointer on top.
6. Locked: a closed brass padlock.
7. Home: a little white house with a red roof and a lit window.
8. A dungeon: a dark cave mouth in grey rock with two crossed swords over it.

Style: exactly the attached icons: chunky pixel art with a bold dark outline, a few flat tones per colour, bright and readable at a small size, lit from the upper left. All 8 the same weight, and the three badges exactly the same size and shape.

No words or letters (the ! ? and check mark are the only marks), no frames, cell lines or shadows. Background: transparent, like the attached icons.
```

## The daily spin wheel (v2.3.3282)

The Gambling Den's free daily spin is a wheel drawn in code: eight flat slices, a plain border, a plain triangle for its pointer (v2.3.3140). The slices stay in code, so they stay exact and keep their prize colours and numbers; your picture gives them a real fairground frame.

- **In the game:** the top of the Gambling Den's window: the rim round the slices, the cap over the middle and the pointer over the top. It turns as the wheel spins; the pointer stays.
- **Attach:** `assets/icons-source/sheet-small-1-party.png`, your first small-icon sheet, for the style.
- **How:** One square picture; send it in chat.

```text
Square image: three separate pieces of a fairground prize wheel for the Gambling Den in BroTown, a 2D action RPG, each on its own with space between them:
1. Top, large: the wheel's RIM alone: a round brass ring set with 16 little round light bulbs evenly spaced all the way round, warm yellow-white, riveted and a little worn. The ring is a perfect circle seen straight on, its band the same thickness all the way round, and its middle is EMPTY: no slices, no spokes, nothing inside the ring, only background.
2. Bottom left: the HUB, the round brass cap that covers the wheel's middle, with a ring of rivets and a small red jewel at its centre.
3. Bottom right: the POINTER that stands over the top of the wheel: a brass arrowhead pointing straight down, with a small red jewel at its top.

Style: exactly the attached icons: chunky pixel art with a bold dark outline, a few flat tones per colour, bright and readable at a small size, lit from the upper left.

No words, numbers, frames or shadows. Background: transparent, like the attached icons.
```

## Music

Four lands have no track of their own yet. Make them with the same tool and settings as your other land themes so the set matches.

### Stone Hollows: land music

- **In the game:** Plays while you are in the Stone Hollows. Today it plays the game's login theme there.
- **How:** In the music tool you used for the other land themes.

```text
Instrumental background music for BroTown, a cozy-but-adventurous pixel-art action RPG. It plays quietly under the sound effects while players explore and fight in one land, so: no vocals, a steady tempo, a clear melody that is not tiring on repeat, and nothing sudden or very loud. 1 minute 30 seconds to 2 minutes long, and it must LOOP: no fade-in, no fade-out and no ending -- the last bar leads straight back into the first. The same feel, instruments and mix as the game's other land themes (Icy Peaks, Volcano Watch, Desert, Floral).

Deep and earthy, for a land of quarries, badlands, granite canyons and old mine tunnels: plucked low strings and marimba, a slow steady rhythm of wood blocks and a distant hammer on an anvil, cave echoes and a few glowing-crystal chimes. A minor key that feels sturdy rather than scary. About 90 BPM.
```

### Electric Foundry: land music

- **In the game:** Plays while you are in the Electric Foundry. Today it plays the game's login theme there.
- **How:** In the music tool you used for the other land themes.

```text
Instrumental background music for BroTown, a cozy-but-adventurous pixel-art action RPG. It plays quietly under the sound effects while players explore and fight in one land, so: no vocals, a steady tempo, a clear melody that is not tiring on repeat, and nothing sudden or very loud. 1 minute 30 seconds to 2 minutes long, and it must LOOP: no fade-in, no fade-out and no ending -- the last bar leads straight back into the first. The same feel, instruments and mix as the game's other land themes (Icy Peaks, Volcano Watch, Desert, Floral).

Industrial and electric, for a land of smelter yards, iron works and crackling coil fields: a driving mechanical groove of clanks, pistons and hammered metal, a buzzing synth bass, crackling arpeggios and bright brass stabs. Energetic but steady. About 110 BPM.
```

### Water Caves: land music

- **In the game:** Plays while you are in the Water Caves. Today it plays the game's login theme there.
- **How:** In the music tool you used for the other land themes.

```text
Instrumental background music for BroTown, a cozy-but-adventurous pixel-art action RPG. It plays quietly under the sound effects while players explore and fight in one land, so: no vocals, a steady tempo, a clear melody that is not tiring on repeat, and nothing sudden or very loud. 1 minute 30 seconds to 2 minutes long, and it must LOOP: no fade-in, no fade-out and no ending -- the last bar leads straight back into the first. The same feel, instruments and mix as the game's other land themes (Icy Peaks, Volcano Watch, Desert, Floral).

Flowing and watery, for a land of lagoons, sea caves and a drowned reef: harp and soft kalimba or steel-drum arpeggios over warm pads, gentle wave-like swells, dripping-cave plinks and a calm, curious melody. About 85 BPM.
```

### Poison Forest: land music

- **In the game:** Plays while you are in the Poison Forest. Today it plays the game's login theme there.
- **How:** In the music tool you used for the other land themes.

```text
Instrumental background music for BroTown, a cozy-but-adventurous pixel-art action RPG. It plays quietly under the sound effects while players explore and fight in one land, so: no vocals, a steady tempo, a clear melody that is not tiring on repeat, and nothing sudden or very loud. 1 minute 30 seconds to 2 minutes long, and it must LOOP: no fade-in, no fade-out and no ending -- the last bar leads straight back into the first. The same feel, instruments and mix as the game's other land themes (Icy Peaks, Volcano Watch, Desert, Floral).

Eerie and swampy, for a land of blighted farms, slime woods and a mangrove marsh: a creeping, slightly off-kilter rhythm of plucked strings and bubbling percussion, a low clarinet or bassoon melody, buzzing insects and squelchy bubbles in the texture. Mischievous rather than horror. About 95 BPM.
```

## Trees and ore, one a tier (v2.3.3345)

The owner, 2026-10-18: every resource tier grows in every land, and a wood's (or an ore's) colour must be the same in all of them, so each tier is ONE picture everywhere: its shape and size say the tier (small by town, huge at the far end), its colour matches its bag icon. The land is to be shown by effects drawn in code, not by another picture (docs/specs/tier-trees.md). Plain pictures only: no snow, embers or moss on them.

### The five trees

- **In the game (v2.3.3345):** done, from the owner's two pictures (kept in `assets/prop-source/trees/`), cut by `tools/world/add-tree-art.mjs`: pine on the commons, a willow (softwood) at levels 1-10, a gnarled hardwood at 11-20, a cedar at 21-30, a huge maple at 31-40, 1.5 to 4 people tall. The prompts stay for a redo: send the new pictures in chat.
- **Attach:** your style key + `docs/art/log-icons-key.png` (the five log icons, for the bark colours).
- **How:** two pictures in ONE chat: paste the first prompt, then the second. The hardwood is not an oak on purpose: the commons has scenery oaks you can't chop.

```text
A wide picture (3:2, landscape) of a set of three trees for BroTown, a top-down 2D action RPG, in a row, side by side and not touching, growing from the smallest on the left to the biggest on the right. Players chop these trees for logs, so each must be easy to tell apart at a glance by its shape, and its bark must be the same colour as its log in the second attached picture (the logs from left to right: pine, softwood, hardwood, cedar, maple).

1. Pine: a young pine, a slim cone of dark green needles on a straight trunk, with warm reddish-brown bark like the first log. About one and a half times as tall as a person.
2. Softwood: a willow, a rounded crown of long, drooping light-green leaves hanging down like a curtain, on a short, sturdy trunk, with olive-tan bark like the second log. About twice as tall as a person.
3. Hardwood: a gnarled old hardwood tree with a thick, twisted trunk and a wide, spreading, flat-topped crown of dark green leaves, with dark chocolate-brown bark like the third log. About two and a half times as tall as a person, so about half as tall as the picture.

Each is drawn whole, with plenty of background around it and nothing cut off by the picture's edge. They stand on nothing: no ground, grass, path or shadow under or around them, and the place where each meets the ground is plain to see. Plain trees only: no snow, fruit, flowers, vines or moss on them.

No text, letters or numbers anywhere. The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is magenta or bright pink. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached are the game's style key and the game's five log icons. Match the style key's pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Take only the bark colours from the log icons, not their painted style. Scale: a person standing here would be about one fifth as tall as this picture.
```

Then, in the same chat:

```text
Now a second picture to match the first exactly: the same style, pixel size, outline, lighting and background, and the same scale (a person standing here would be about one fifth as tall as this picture).

A wide picture (3:2, landscape) of two more trees in a row, side by side and not touching, the smaller on the left:

1. Cedar: a tall cedar, flat, layered shelves of blue-green needles stacked up a tall, straight trunk, with red-brown bark like the fourth log. About three times as tall as a person.
2. Maple: a huge old maple, a vast, round crown of orange and golden autumn leaves on a massive trunk with thick roots, with orange-brown bark like the fifth log. About four times as tall as a person, so about four fifths as tall as the picture: the biggest tree in the game.

Each is drawn whole, with plenty of background around it and nothing cut off. They stand on nothing, and the place where each meets the ground is plain to see. Plain trees only: no snow, fruit, flowers, vines or moss. No text. The background is ONE flat magenta colour (#FF00FF) everywhere. Nothing in the picture is magenta or bright pink. No border.
```

### The five ore veins

- **In the game (v2.3.3345):** done, from the owner's picture (kept in `assets/prop-source/ore/`), cut by `tools/world/add-ore-art.mjs`: copper 58 game px wide up to an obsidian boulder 127 wide, each sized and placed to hide the rock baked into the miner's swing (docs/specs/tier-ore.md). The prompt stays for a redo: send the new picture in chat.
- **Attach:** your style key + `docs/art/ore-icons-key.png` (the five ore icons, for each ore's colours).
- **Background green, not magenta:** obsidian is violet, which a magenta background would eat into.

```text
A wide picture (3:2, landscape) of a set of five ore rocks for BroTown, a top-down 2D action RPG, in a row, side by side and not touching, growing from the smallest on the left to the biggest on the right. Players mine these for ore. Each is a chunk of plain grey rock with its ore showing in big, clear patches, in the same colours as its ore in the second attached picture (from left to right: copper, iron, black steel, titanium, obsidian), so each is easy to tell apart at a glance.

1. Copper: bright orange copper with dull blue-teal patches. About knee-high on a person.
2. Iron: rust-orange and dark grey. A little bigger.
3. Black steel: deep steel-blue and black. Bigger again.
4. Titanium: pale silvery blue and grey. Bigger again.
5. Obsidian: deep violet and glassy black. The biggest: about chest-high on a person and about one and a half times as wide as a person is tall.

Each grows wider more than taller. Each is drawn whole, with plenty of background around it and nothing cut off by the picture's edge. They stand on nothing: no ground, grass, path or shadow under or around them, and the place where each meets the ground is plain to see.

No text, letters or numbers anywhere. The background is ONE flat bright green colour (#00FF00) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the picture is bright green. No border.

Style: BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars. Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow. Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones. Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those. The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side. Moderate saturation, with the ground calm and mid-toned so characters stand out. Seen from a steep three-quarter top-down angle, with no perspective.

Attached are the game's style key and the game's five ore icons. Match the style key's pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles. Take only each ore's colours from the ore icons, not their painted style or shape. Scale: a person standing here would be about one fifth as tall as this picture.
```

## Item icons

### Essences (v2.3.3141; one sheet of nine since v2.3.3279)

- **In the game (v2.3.3281):** your sheet, cut by `tools/ui/cut-bag-icons.py` (kept as `assets/icons-source/sheet-bag-essences.png`): the nine essences salvage leaves (Rare, Elite and Godly, each in copper, iron and black steel), in the bag and on the Blacksmith's Salvage tab. They were glowing orbs drawn by `tools/make_essence_icons.py`, which now refuses to draw over yours.
- **Attach:** `docs/art/bag-icon-style-key.png` (the game's own bag icons). The earlier prompt asked for HD pixel art against the world's style key; the bag's icons are painted, so this one matches them.
- **How:** One square picture of all nine: the light's colour says the grade, the little bar at its heart says the metal. They become `public/icons/items/essence-<grade>-<metal>.webp`.

```text
Square image: a sprite sheet of 9 item icons for a 2D action RPG, in a 3×3 grid read like a page (each row left to right, rows top to bottom). Each icon sits centered in its own equal square cell, fills about three quarters of it, and touches nothing else.

Each icon is a magical ESSENCE: a fist-sized orb of swirling glowing light inside a clean dark outline, a small bar of metal floating at its heart, and a few tiny sparkles around it. The glow stays inside the orb: no halo or haze on the background.
Columns, left to right, by the light's colour: RARE in cool blue light · ELITE in warm orange light · GODLY in shifting rainbow light (gold, green, cyan and blue only).
Rows, top to bottom, by the metal bar at the heart: COPPER (reddish-orange metal) · IRON (cool silver-grey metal) · BLACK STEEL (near-black metal with a cold blue sheen).

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. All 9 the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta, pink or purple. Do not copy the reference's items or background.
```

### Gems: raw and polished, for every element (v2.3.3481; two chats)

- **Why (the 2026-10-19 icon review):** the element gems have no picture anywhere: the Gem Works writes "◇ Raw" and "◆ Polished" beside a coloured name, and the bag draws a ◇. The sheets of 2026-10-19 had eight cut gems, but not in the game's shapes, so they were left out (the Rare Gem already has its picture).
- **The shapes are the game's own** (`src/data/elements.js`, each element's `shape`): a polished gem is cut in its element's shape and colour, so it reads the same as the element's other marks. A raw gem is the same stone before cutting: a rough chunk with that colour breaking through.
- **Two pictures, because of the background:** the storm gem is violet and the dark gem has violet glints, which a magenta background would eat, so those three go on green.
- **Attach (both chats):** `docs/art/bag-icon-style-key.png` (the game's own bag icons).
- **In the game:** not yet. Send both pictures in chat; a session cuts them (like `tools/ui/cut-bag-icons.py`) into `public/icons/items/gem-raw-<element>.webp` and `gem-polished-<element>.webp` and puts them on the Gem Works' rows, the Set gems tab and the bag.

**Chat 1 of 2: six elements on magenta**

```text
Landscape image (wider than tall): a sprite sheet of 12 item icons for a 2D action RPG, in a grid of 6 columns and 2 rows. Each icon sits centered in its own equal cell, fills about three quarters of it, and touches nothing else.

Each column is one magical gem. The TOP row is the RAW gem: a rough, uncut chunk of plain grey stone with the gem's crystal breaking out of it in a few sharp points. The BOTTOM row is the same gem POLISHED: cut and faceted in its own shape, glossy, with one bright highlight. The polished gem has no setting, ring or chain.
Columns, left to right:
1. FLAME: deep ember red; polished as a diamond shape (a rhombus standing on its point).
2. FROST: pale icy blue, almost white at the edges, with a little frost on the raw one; polished as a hexagon.
3. WATER: clear ocean blue with a ripple of light inside; polished as a round dome (a cabochon).
4. VENOM: poison green; polished as a teardrop, point up.
5. STONE: warm amber-brown; polished as a square.
6. WIND: pale silver-grey, almost clear like quartz; polished as a triangle, point up.

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. All 12 the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the icons is magenta, pink or purple. Do not copy the reference's items or background.
```

**Chat 2 of 2: three elements on green**

```text
Landscape image (wider than tall): a sprite sheet of 6 item icons for a 2D action RPG, in a grid of 3 columns and 2 rows. Each icon sits centered in its own equal cell, fills about three quarters of it, and touches nothing else.

Each column is one magical gem. The TOP row is the RAW gem: a rough, uncut chunk of plain grey stone with the gem's crystal breaking out of it in a few sharp points. The BOTTOM row is the same gem POLISHED: cut and faceted in its own shape, glossy, with one bright highlight. The polished gem has no setting, ring or chain.
Columns, left to right:
1. STORM: bright violet with a tiny spark of light inside; polished as a five-pointed star.
2. DARK: deep shadowy navy, nearly black, with faint violet glints; polished as a trefoil (three rounded lobes, like a club).
3. LIGHT: radiant golden yellow; polished as a starburst (a sun with eight short sharp points).

Style: exactly the attached reference: glossy hand-painted item icons, clean dark outline, soft shading, small bright highlights, lit from the upper left. All 6 the same size so they read as one set.

No text, frames, cell lines or shadows. Background: one flat pure green (#00FF00) everywhere, no gradient or texture. Nothing in the icons is green. Do not copy the reference's items or background.
```

## The farm

The Feed & Seed's farm (v2.3.3127, docs/specs/farm.md) draws its crops, seeds and compost with emoji until these exist: the window's beds, the Seeds tab and the bag all use them.

### Farm goods: bag icons

- **Moved to `docs/art/FARM-ART-PROMPTS.md`** (v2.3.3279): the sixteen crops, the sixteen seed packets, and the five dishes with compost, three sheets on the bag's own style key. The white-background prompt that was here is retired: a white ground cuts out badly round the cloudpetal's and frostberry's pale colours.
- **In the game (v2.3.3281):** all three sheets, cut by `tools/ui/cut-bag-icons.py` (docs/specs/bag-icons.md).

### The farmer's moves: hoe, watering can, kneel (v2.3.3439)

- **In the game (v2.3.3439):** your three sheets, kept as you sent them in `tools/farm_anim_src/` and cut by `tools/make_farm_anims.py` (docs/specs/farm-walk.md, "The farmer's own moves"). Digging plays the hoe, watering the can, and planting, fertilizing and harvesting the kneel. The game repaints the man in each player's skin, trousers and boots, dresses him in their shirt and armour (cut from the six dressed copies below), and puts their hair, hat and beard on him.
- **Attach:** `docs/art/farm-moves-reference.png`, the bro from your fire-lighting sheet with the log taken out. Attach nothing else. (Here the bro is attached on purpose: these are his own moves, not world art.)
- **How:** One sheet a chat. If one frame is wrong, ask for the whole sheet again: frames from different chats won't line up. Send the new sheet in chat and a session puts it in.
- **Not made yet: the shirt and the armour drawn on him** (below). Until they are, the game cuts a shirt out of the bare body itself, and where an arm is in front of his body the whole arm comes out in the shirt's colour; a player in armour shows that shirt.

**Kneel** (plant, fertilize, harvest):

```text
Landscape image, 1536 × 1024: a pixel-art sprite sheet of ONE looping animation for a 2D action RPG, 8 frames in a grid of 4 columns × 2 rows, read like a page (top row left to right, then the bottom row). Every frame is an equal 384 × 512 cell.

The character is exactly the bald, shirtless man in the attached picture: the same orange skin, face, olive-green trousers and dark grey boots, the same body shape and size, the same pixel-art style and black outline. Keep him identical in all 8 frames. Do not give him a shirt, hair, hat, gloves or anything else to wear: the game dresses him itself.

He faces the viewer (we see his front) and works on the ground just in front of him. In every frame he stays in the same spot in his cell, at the same size, his knee and boots resting on the same line near the bottom of the cell. Leave empty space around him in each cell; nothing crosses into the next cell.

The action: kneeling at a garden bed, working the soil with his bare hands.
Frame 1: kneeling on one knee, upright, hands resting on his thighs.
Frame 2: leaning forward, both hands reaching down to the ground in front of his knees.
Frame 3: both hands pressing into the soil.
Frame 4: both hands patting the soil flat.
Frame 5: one hand lifting a little, as if dropping something into the ground.
Frame 6: both hands patting the soil again.
Frame 7: sitting back up.
Frame 8: back to the pose of frame 1.
His hands are empty in every frame.

No text, numbers, frame borders, grid lines, ground, grass, soil patch or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the picture is magenta, pink or purple.
```

**Hoe** (dig):

```text
Landscape image, 1536 × 1024: a pixel-art sprite sheet of ONE looping animation for a 2D action RPG, 8 frames in a grid of 4 columns × 2 rows, read like a page (top row left to right, then the bottom row). Every frame is an equal 384 × 512 cell.

The character is exactly the bald, shirtless man in the attached picture: the same orange skin, face, olive-green trousers and dark grey boots, the same body shape and size, the same pixel-art style and black outline. Keep him identical in all 8 frames. Do not give him a shirt, hair, hat, gloves or anything else to wear: the game dresses him itself.

He faces the viewer (we see his front) and works on the ground just in front of his feet. In every frame he stays in the same spot in his cell, at the same size, his boots on the same line near the bottom of the cell. Leave empty space around him in each cell; nothing crosses into the next cell.

The action: digging garden soil with a hoe, a plain wooden handle with a dark iron blade.
Frame 1: standing, holding the hoe across his body with both hands.
Frame 2: lifting the hoe up beside his shoulder.
Frame 3: the hoe raised high over his head.
Frame 4: swinging it down in front of him.
Frame 5: the blade striking the ground just in front of his feet, a small burst of brown dirt.
Frame 6: pulling the hoe back toward him.
Frame 7: lifting it a little, a few clods of dirt falling.
Frame 8: back to the pose of frame 1.

No text, numbers, frame borders, grid lines, ground, grass, soil patch or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the picture is magenta, pink or purple.
```

**Watering can** (water):

```text
Landscape image, 1536 × 1024: a pixel-art sprite sheet of ONE looping animation for a 2D action RPG, 8 frames in a grid of 4 columns × 2 rows, read like a page (top row left to right, then the bottom row). Every frame is an equal 384 × 512 cell.

The character is exactly the bald, shirtless man in the attached picture: the same orange skin, face, olive-green trousers and dark grey boots, the same body shape and size, the same pixel-art style and black outline. Keep him identical in all 8 frames. Do not give him a shirt, hair, hat, gloves or anything else to wear: the game dresses him itself.

He faces the viewer (we see his front) and works on the ground just in front of his feet. In every frame he stays in the same spot in his cell, at the same size, his boots on the same line near the bottom of the cell. Leave empty space around him in each cell; nothing crosses into the next cell.

The action: watering the garden with a watering can, a green-painted tin can with a long spout.
Frame 1: standing, holding the can in front of him with both hands, upright.
Frame 2: tipping it forward.
Frame 3: water starting to pour from the spout.
Frames 4 to 6: a steady stream of light blue water pouring onto the ground just in front of his feet, wavering a little from frame to frame, with small splashes where it lands.
Frame 7: tipping the can back up, the last drops falling.
Frame 8: back to the pose of frame 1.

No text, numbers, frame borders, grid lines, ground, grass, soil patch or shadows. Background: one flat magenta (#FF00FF) everywhere, no gradient or texture. Nothing in the picture is magenta, pink or purple.
```

### The farmer's moves, dressed: the T-shirt and the armour (six chats)

- **In the game:** yes, since v2.3.3439: the owner's six sheets are in `tools/farm_anim_src/` (`<move>-tee.png`, `<move>-armour.png`), cut by `tools/make_farm_anims.py` into the shirt, plate and greaves the farmer wears (docs/specs/farm-walk.md "The farmer's own moves"). The owner asked (2026-10-18): *"Do you want to give me the south facing idle character wearing each and give me a prompt to put it on each of the 3 outputs?"* Yes. Garments drawn on their own never lined up with the body: the fire-lighter's shirt, plate and greaves (v2.3.1715) still need a nudge every frame (`FIRE_GEAR_REG`). Drawn ON him, in a copy of each sheet, they follow his arms in every frame.
- **Attach, in this order:** (1) your own sheet for the move (`tools/farm_anim_src/hoe.png`, `water.png` or `kneel.png`); (2) `docs/art/farm-moves-reference-tee.png` or `docs/art/farm-moves-reference-armour.png`. They are the game's own walking bro, standing and facing south (`public/sprites/player-naked/stand-south.png`, his face from `player/stand-south.png`: the bare body's eyes are left for the game to draw), in the game's own white tee and its own steel plate and greaves, drawn on him as the game draws them (`gear/*/stand-south.png`), three times their size. The owner's notes on the first pair (2026-10-18), made from the fire-lighter: the eyes were keyed out (his body leaves them for the game to draw too), the shirt and armour sat off the body (his garments need `FIRE_GEAR_REG`), and his own boots showed under the armour.
- **How:** one chat a sheet and outfit, six in all. Before sending, hold the new sheet next to the original: the same pose, size and place in every frame, or ask again in a new chat.
- **Why white and plain grey:** the game recolours the shirt to the player's own and lays their print or pattern on it, and tints the armour for each metal.
- **How the game uses them:** the farmer's body is always the bare sheet, repainted in your colours. Each dressed frame is laid on its bare frame by the skin of his head, and the clothes are cut out of it: the tee, and the steel split into the plate (over his skin) and the greaves (over his trousers and boots). Any mix can be worn: the tee alone, plate and greaves, greaves under the tee, the plate over trousers. Under greaves he wears a copy of the bare body with the trousers and boots they leave bare taken out. A redo of one sheet needs only that sheet: re-run the tool.

**T-shirt:**

```text
Two pictures are attached. The first is a finished pixel-art sprite sheet: one animation of 8 frames in a grid of 4 columns × 2 rows, on a flat magenta background. Make that same sprite sheet again as a landscape image, 1536 × 1024, keeping everything exactly as it is: the same 8 frames in the same cells, the man in the same pose, at the same size and in the same place in every cell, the same tool, dirt and water, the same pixel-art style and black outline.

The only change: in every frame the man wears the plain white T-shirt that the man in the second picture wears. Short sleeves that end halfway down his upper arm, a round neck, the hem over the top of his trousers. White with light grey shading and a black outline; no logo, print or pattern. His forearms and hands stay bare skin, and wherever an arm is in front of his body, the arm is drawn in front of the shirt.

Take only the T-shirt from the second picture: keep the first picture's drawing style and the man's head, face and proportions exactly as they are. Change nothing else: not his face, skin, trousers or boots, not his pose, not the tool. No text, numbers, borders, grid lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere. Nothing else in the picture is magenta, pink or purple.
```

**Armour:**

```text
Two pictures are attached. The first is a finished pixel-art sprite sheet: one animation of 8 frames in a grid of 4 columns × 2 rows, on a flat magenta background. Make that same sprite sheet again as a landscape image, 1536 × 1024, keeping everything exactly as it is: the same 8 frames in the same cells, the man in the same pose, at the same size and in the same place in every cell, the same tool, dirt and water, the same pixel-art style and black outline.

The only change: in every frame the man wears the steel armour that the man in the second picture wears, from his shoulders to his feet: a steel breastplate with round shoulder plates, steel plates down both arms to his hands, a chain-mail belt, and steel leg plates that cover his trousers and his boots completely. Plain grey steel, shaded like the second picture, with a black outline. No shirt, trousers or boots show anywhere; his head stays bare. Wherever an arm is in front of his body, the armoured arm is drawn in front of the breastplate.

Take only the armour from the second picture: keep the first picture's drawing style and the man's head, face and proportions exactly as they are. Change nothing else: not his face, not his pose, not the tool. No text, numbers, borders, grid lines, ground or shadows. Background: one flat magenta (#FF00FF) everywhere. Nothing else in the picture is magenta, pink or purple.
```

## Sounds

One footstep the Wheel still borrows.

### Forest floor: footstep

- **In the game:** Each step on the Wheel's forest floor. Today it plays the grass step.
- **How:** From Freesound or Pixabay (CC0 or CC BY only, never "NC"), or a sound tool.

```text
A single footstep on a forest floor: a boot on dry leaves and small twigs over soft earth. Close, dry and short (about half a second), with no reverb, no music and no other sounds.
```

## Quick checks only the owner can do

Where did each sound come from: Pixabay or Freesound? If Freesound, which licence (CC0 or CC BY)? Anything "NC" must be replaced (CREDITS.md).

- Flip win / lose stings: `flip-win.mp3, flip-lose.mp3`
- Coin flip sound: `coin-flip.mp3`
- Coin pickup sound: `coin-pickup.mp3`
- Menu click / close ticks: `click.mp3, close.mp3`
- Item equip tick: `equip.mp3`
- Ore crack: `ore-crack.mp3 (cut from your mining minigame clip)`
- Footstep: sand: `step-sand.mp3`
- Footstep: grass: `step-grass.mp3`
- Footstep: gravel: `step-gravel.mp3`
- Footstep: mud: `step-mud.mp3`
- Footstep: ash: `step-ash.mp3`
- Footstep: wood: `step-wood.mp3`
