<!-- ═══ HOW TO READ THIS DOCUMENT (v2.3.2632) ═══

     This is the owner's WORLD ART CONSTITUTION: what a BroTown map should
     feel like.  It is art direction, and it is aspirational.

     IT DOES NOT DESCRIBE THE ENGINE.  Several things it asks for the
     renderer cannot do today -- most importantly dynamic occlusion, which
     §4 calls the most important depth tool and which needs depth sorting
     that does not exist yet.  Read it as a target, never as a description,
     and never as evidence that a feature exists.  (docs/ARCHITECTURE.md and
     the GDD are stale for exactly this reason; this file is new, but the
     same rule applies to any document that states intent rather than code.)

     THE COSTED, CODE-AWARE VERSION IS docs/DEPTH-ROADMAP.md.  That is the
     one to work from: it maps these principles onto the actual renderer,
     orders them by cost against payoff, and says which apply to existing
     maps and which only to new ones.  This file answers "what are we aiming
     at"; that file answers "what do we do on Tuesday".
-->

# BroTown World Depth & Immersion Master Plan

## Purpose

BroTown’s maps should feel like **places the player is inside**, not painted surfaces the player is moving across.

The goal of this document is to establish the visual and spatial design principles that every outdoor map, town, dungeon, interior, biome, and special area should follow so the entire world feels layered, dimensional, grounded, and immersive.

This is intentionally **not an implementation document**. It defines the world-building rules and artistic standards that should guide future map design, environment art, prop creation, encounter placement, and map review.

---

# 1. The North Star: Build Dioramas, Not Canvases

Every BroTown map should feel like a small living **diorama** viewed from above.

A flat map says:

> “This is an image with objects placed on it.”

An immersive map says:

> “This is a physical place with ground, height, mass, distance, cover, atmosphere, and spaces that continue beyond the camera.”

The player should constantly receive visual evidence that:

- objects occupy physical space;
- some things are closer than others;
- some things are above or below others;
- terrain has height and thickness;
- the player can move behind, around, between, and beneath things;
- the world continues outside the visible screen;
- the environment has a shared atmosphere and lighting condition;
- the character belongs inside the environment rather than sitting on top of it.

This is the core standard for every BroTown map.

---

# 2. Depth Must Come From Relationships, Not Detail

More detail does not automatically create more immersion.

A map can have thousands of rocks, plants, cracks, and textures and still feel completely flat.

Depth comes primarily from **relationships between elements**:

- one object covering another;
- a path climbing above or dropping below another surface;
- a tree canopy sitting in front of a character;
- a distant mountain fading into haze;
- a wall having a visible face instead of only a top surface;
- a large foreground object entering the frame;
- an enemy standing behind a rock rather than beside it;
- a bridge crossing over water;
- snow or dust moving through multiple visual layers.

BroTown should prioritize these relationships before adding decorative density.

---

# 3. Every Map Needs a Clear Depth Stack

Every map should be composed mentally as a stack of visual planes.

The exact art may vary by biome, but the principle should remain consistent.

## Far Background

This establishes distance and world scale.

Examples:

- distant mountains;
- far cliffs;
- skyline silhouettes;
- large structures on the horizon;
- distant tree lines;
- fog-shrouded landmarks;
- volcanic peaks;
- glaciers;
- ocean horizon.

The far background should generally have:

- less contrast;
- less fine detail;
- weaker saturation;
- more atmospheric tint;
- fewer sharp edges.

Its purpose is to feel far away, not to compete with gameplay.

## Background Terrain

This is the playable world beyond the immediate player area.

Examples:

- upper plateaus;
- distant paths;
- cliffs;
- forests;
- streams;
- ruins;
- snow fields;
- village structures.

It should establish the larger physical setting without overpowering the player.

## Gameplay Plane

This is the primary layer where movement, combat, harvesting, NPC interaction, and exploration occur.

It should remain visually readable while still feeling embedded inside the environment.

## Midground Occluders

These are objects that can sit between the player and the camera.

Examples:

- tree canopies;
- roof edges;
- tall grass;
- cliff overhangs;
- archways;
- signs;
- large rocks;
- banners;
- branches.

These are critical because they prove that the player occupies the same physical space as the environment.

## Foreground

The foreground should occasionally contain elements that feel very close to the viewer.

Examples:

- cropped branches;
- nearby rocks;
- walls entering from the bottom edge;
- hanging vines;
- fog banks;
- snowdrifts;
- fences;
- architectural trim.

Foreground elements make the screen feel like a camera looking into a world instead of a complete rectangular board.

## Atmosphere

Atmosphere should exist across more than one depth plane.

Examples:

- snow;
- dust;
- embers;
- drifting leaves;
- insects;
- mist;
- rain;
- ash;
- spores;
- magical particles.

Some atmospheric elements should pass behind characters while others pass in front.

That simple layering cue is one of the strongest ways to make a 2D world feel volumetric.

---

# 4. Occlusion Is One of BroTown’s Most Important Depth Tools

Objects should frequently overlap each other in believable ways.

A player should not always see every object in full.

Examples of healthy occlusion:

- part of a tree hidden behind another tree;
- a character partially hidden behind a trunk;
- a snowman partly hidden behind a ridge;
- a building partially blocked by a foreground prop;
- a path disappearing behind a rock;
- a fence passing behind vegetation;
- a pond edge hidden beneath reeds;
- a bridge blocking the water beneath it.

Occlusion creates depth because the brain interprets overlap as spatial ordering.

## Design Rule

If a map can be viewed for several seconds without one meaningful environmental element overlapping another, it is probably too flat.

BroTown maps should feel composed in layers, not arranged as isolated stickers.

---

# 5. Elevation Should Be Visible, Not Implied

BroTown does not need fully simulated 3D terrain to feel dimensional.

It does need **visible height differences**.

Every major biome should regularly use terrain forms such as:

- cliffs;
- raised plateaus;
- ramps;
- terraces;
- depressions;
- trenches;
- ledges;
- embankments;
- stairs;
- bridges;
- balconies;
- rooftops;
- raised foundations;
- cave mouths;
- riverbanks.

The key principle is that elevation must show its **vertical face**.

A color change from snow to grass is not elevation.

A raised snowy platform with a visible cliff face beneath it is elevation.

A darker patch is not a depression.

A basin whose rim visibly rises around it is a depression.

## Design Rule

When terrain changes height, the player should be able to visually identify:

1. the upper surface;
2. the vertical transition;
3. the lower surface.

This creates physical thickness.

---

# 6. Terrain Should Have Mass

Ground should not look like a painted sheet.

Every major terrain feature should communicate weight and volume.

Instead of:

- a flat rock texture;

prefer:

- boulders with visible bases, shadow, and height.

Instead of:

- a painted snow border;

prefer:

- a snowbank with a raised lip and visible underside.

Instead of:

- a flat shoreline;

prefer:

- reeds, stones, erosion, wet edges, small banks, and slight elevation changes.

Instead of:

- a colored path;

prefer:

- worn terrain that cuts through the surrounding landscape and reacts to nearby objects.

Terrain should feel like something that exists physically, not just a surface pattern.

---

# 7. Ground Every Character, Enemy, NPC, and Prop

Every object should appear to touch the ground.

The player should never feel like characters are floating or pasted onto scenery.

Grounding can come from:

- contact shadows;
- snow compression;
- footprints;
- displaced grass;
- dust;
- water ripples;
- mud;
- slight ambient darkening at an object’s base;
- roots entering soil;
- stones partially buried in terrain.

The exact effect can vary, but the principle should be universal.

## Design Rule

If an object has weight, the environment should visually react to its presence.

This is especially important because BroTown combines crisp pixel characters with painterly environments. Shared grounding cues help those styles feel like one world.

---

# 8. The World Must Continue Beyond the Screen

A rectangular composition can easily feel like a game board.

BroTown should deliberately break that feeling.

Large objects should sometimes:

- begin outside the screen;
- extend beyond the screen;
- be partially cropped;
- continue under the HUD;
- enter from a screen edge;
- suggest a larger structure beyond what is currently visible.

Examples:

- a giant tree canopy entering from the upper-right;
- a cliff wall continuing past the left edge;
- a building whose full width is not visible;
- a bridge continuing off-screen;
- a large foreground rock cut off by the bottom edge.

## Design Rule

Do not frame every important object comfortably inside the screen.

The camera should feel like it is revealing one portion of a larger place.

---

# 9. Avoid “Object Spacing” That Looks Deliberately Arranged

One of the fastest ways to make a map feel artificial is to space props evenly.

Flat game-board composition often looks like:

- tree;
- empty space;
- rock;
- empty space;
- enemy;
- empty space;
- ore node.

Natural environments are usually clustered and uneven.

BroTown should use:

- clusters;
- overlaps;
- empty breathing spaces;
- dense pockets;
- narrow passages;
- open clearings;
- irregular edges.

A forest should feel like a forest mass with openings inside it, not a collection of individual trees.

A rocky zone should have rock formations, not evenly distributed rocks.

A snowy zone should have drifts, exposed patches, ridges, and wind-shaped areas.

---

# 10. Use Large Forms Before Small Details

Every map should work visually when squinted at or viewed as a thumbnail.

Its composition should be built from large shapes first:

- a cliff band;
- a forest mass;
- a river;
- a central clearing;
- a ridge;
- a village block;
- a canyon;
- a frozen lake;
- a volcanic shelf.

Then medium structures:

- buildings;
- large rocks;
- tree clusters;
- bridges;
- ruins;
- enemy camps.

Only after that should small detail be added:

- grass;
- cracks;
- flowers;
- debris;
- small stones;
- footprints.

## Design Rule

Small details should reinforce the shape of the world, not substitute for shape.

---

# 11. Paths Should Be Physical Features

Paths are especially important in BroTown because they guide the player.

They should not look painted onto the ground.

A good path should interact with terrain.

It might:

- pass between two large rocks;
- disappear under a tree canopy;
- climb a ramp;
- cross a bridge;
- narrow through a canyon;
- curve around a pond;
- pass behind a building;
- cut into a slope;
- widen into a clearing;
- descend into a basin.

Paths should help tell the player how the land itself is shaped.

---

# 12. Build Depth Through Scale Variation

Objects should not all exist at similar visual scale.

BroTown should intentionally mix:

- tiny environmental detail;
- player-sized objects;
- medium landmarks;
- very large environment forms.

For example, a forest might include:

- mushrooms;
- shrubs;
- normal trees;
- massive ancient trees.

A town might include:

- crates;
- stalls;
- houses;
- a huge bank or mayor’s structure.

Large forms create a sense of world scale.

Without them, every object feels like an item on a tabletop.

---

# 13. Use Atmospheric Perspective

Distance should affect appearance.

Elements farther from the player should generally become:

- lighter or more atmosphere-tinted;
- slightly lower contrast;
- slightly less saturated;
- less detailed;
- softer around the edges.

The exact tint should depend on biome.

Examples:

- Frost areas: pale blue-white haze;
- Fire areas: smoke, heat, and warm atmospheric tint;
- Floral areas: warm mist, pollen, or green-gold haze;
- Desert areas: dusty desaturation and heat;
- Swamps: humid fog and murky green atmosphere.

This makes the background recede naturally.

---

# 14. Each Biome Should Have Its Own “Depth Language”

All maps should follow the same core depth principles, but each biome should express them differently.

## Frost

Depth can come from:

- snowbanks;
- ice shelves;
- frozen cliffs;
- fog;
- blowing snow;
- pine canopies;
- exposed rocky valleys;
- frozen rivers;
- icy overhangs.

## Floral / Earth

Depth can come from:

- tree masses;
- roots;
- vines;
- terraces;
- overgrown ruins;
- flower fields interrupted by rocks;
- layered hills;
- canopies.

## Fire

Depth can come from:

- lava shelves;
- volcanic cliffs;
- smoke;
- heat distortion;
- ash;
- black rock overhangs;
- glowing cracks;
- deep pits.

## Wind / Desert

Depth can come from:

- dunes;
- wind-carved cliffs;
- sandstone arches;
- dust layers;
- canyon walls;
- buried ruins;
- ridges;
- long shadows.

## Towns

Depth can come from:

- overlapping buildings;
- alleys;
- awnings;
- balconies;
- rooflines;
- fences;
- signs;
- stairs;
- raised foundations;
- streets passing behind structures.

The biome should determine the vocabulary, but not the underlying principles.

---

# 15. Lighting Must Belong to the Whole Scene

Characters, enemies, props, and terrain should feel as though they are illuminated by the same world.

Every map should have a clear lighting condition.

Examples:

- cold diffuse daylight;
- warm sunset;
- torch-lit interior;
- moonlight;
- volcanic glow;
- magical forest light.

The goal is not realism.

The goal is consistency.

A character should not look lit independently from the ground beneath them.

A tree should not cast a visual shadow in a completely different direction than a nearby rock.

Shared lighting makes separate assets feel like one environment.

---

# 16. Environmental Motion Should Reinforce Space

Movement is a major opportunity to make BroTown feel alive.

The environment should not be completely static while only characters move.

Useful motion includes:

- snow blowing sideways;
- trees swaying;
- grass reacting to wind;
- smoke drifting;
- lava bubbling;
- water flowing;
- fog moving;
- banners fluttering;
- falling leaves;
- sparks;
- dust;
- insects;
- drifting pollen.

The most important rule is that motion should exist at different depths.

For example:

- distant snow behind the player;
- nearby flakes in front of the player;
- a tree moving between those layers.

That creates spatial depth through motion.

---

# 17. Design Every Screen Around a Foreground, Subject, and Background

A strong BroTown composition should usually contain three readable components:

## Foreground

Something close enough to frame the scene.

## Subject Area

The region where the player, enemies, harvest nodes, NPCs, or objective are currently interacting.

## Background

A visible continuation of the environment beyond the immediate encounter.

This creates a visual tunnel into the world.

A map without foreground framing often feels exposed and flat.

A map without background continuation often feels boxed in.

A map without a clear subject area becomes visually noisy.

---

# 18. Use Framing to Create “Rooms” in Outdoor Maps

Outdoor maps should not feel like one uninterrupted open canvas.

Use environmental forms to create natural rooms:

- tree walls;
- cliffs;
- rock formations;
- ruins;
- rivers;
- hedges;
- snowbanks;
- fences;
- canyon walls.

These rooms can contain:

- enemies;
- gathering spots;
- NPCs;
- landmarks;
- hidden areas;
- mini-events.

A sequence of visually distinct spaces feels more like traveling through a world.

---

# 19. Landmarks Should Anchor the Player in Space

Each meaningful map should contain one or more large, memorable spatial anchors.

Examples:

- giant dead tree;
- frozen waterfall;
- volcanic skull formation;
- enormous windmill;
- ruined tower;
- huge statue;
- glowing crystal;
- giant Bro monument.

A landmark serves several purposes:

- gives the map identity;
- helps orientation;
- creates scale;
- gives distant space meaning;
- prevents the environment from feeling procedurally scattered.

A good landmark should influence the nearby terrain rather than simply sit on top of it.

---

# 20. Build Environmental Stories Through Spatial Relationships

BroTown environments should occasionally imply what happened there.

This does not require dialogue.

Examples:

- broken cart beside a cliff;
- footprints leading toward a cave;
- abandoned campsite behind rocks;
- shattered fence near enemy territory;
- snow partially covering old ruins;
- trees burned away around a lava vent;
- a collapsed bridge with a makeshift crossing.

These details make the map feel inhabited and persistent.

The important distinction is that environmental storytelling should be integrated into space, not added as decorative clutter.

---

# 21. Transition Between Materials Gradually

Abrupt texture changes can reinforce the feeling of a painted map.

Terrain materials should blend through physical transition zones.

Examples:

Snow → muddy slush → exposed soil → grass

Grass → cracked dirt → dry sand

Stone → moss → soil

Lava → scorched rock → ash

Water → wet shoreline → stones → grass

The world should feel formed by environmental processes rather than painted with separate brushes.

---

# 22. Negative Space Is Necessary

Immersion does not mean filling every tile.

Some areas should be quiet.

Useful negative space includes:

- a broad snowy field;
- a calm lake;
- a large town square;
- an empty canyon stretch;
- a grassy clearing.

Open space:

- improves readability;
- makes dense areas feel denser;
- gives landmarks more impact;
- creates rhythm;
- prevents visual exhaustion.

The goal is controlled contrast between open and dense spaces.

---

# 23. Use Visual Density in Waves

Maps should have a rhythm.

For example:

open field  
→ narrow wooded path  
→ enemy clearing  
→ cliff passage  
→ open overlook  
→ town entrance

This sequence feels much more like travel than a map with uniform density everywhere.

BroTown maps should be designed as a series of spatial beats.

---

# 24. Every Major Object Should Have a Role in the Composition

Environment assets should not exist only because the map has empty space.

A large prop should ideally serve one or more purposes:

- frame the player;
- guide movement;
- create cover;
- create a landmark;
- signal biome identity;
- establish scale;
- create foreground depth;
- divide spaces;
- conceal something;
- direct the eye.

Decorative props can still exist, but major objects should help shape the experience.

---

# 25. Characters Must Feel Embedded in the Environment

Because BroTown uses crisp pixel characters against painterly environments, it needs stronger integration cues than a single-style game would.

The character should visually interact with the world through:

- shared lighting;
- shared shadow direction;
- contact with the ground;
- foreground occlusion;
- environmental particles;
- terrain reactions;
- footprints;
- water effects;
- nearby vegetation;
- atmospheric tint.

The contrast between character and world can remain part of BroTown’s identity.

The goal is not to blur that difference.

The goal is to make it clear that both exist in the same place.

---

# 26. Map Edges Should Feel Natural

Avoid visible compositions that feel like:

> “Here is where the image ends.”

Map boundaries should instead feel caused by the world.

Examples:

- cliff edge;
- dense forest;
- ocean;
- mountain wall;
- building wall;
- canyon;
- thick fog;
- lava;
- rock formation.

Even when the game technically has a rectangular boundary, the environment should disguise it.

---

# 27. Interiors Need the Same Depth Principles

Indoor spaces should not become flat rooms.

Interiors should use:

- foreground walls;
- furniture overlap;
- ceiling or roof-edge framing;
- shelves that partially block characters;
- counters;
- raised platforms;
- stairs;
- rugs with furniture sitting on them;
- windows revealing exterior depth;
- strong light sources.

A small interior can feel more dimensional than a huge exterior if its layering is strong.

---

# 28. BroTown Should Prefer Depth Over Decorative Complexity

Whenever there is a choice between:

### Option A
Adding twenty more decorative objects

### Option B
Adding one strong cliff, foreground tree, bridge, overhang, or layered structure

BroTown should usually choose **Option B**.

Depth-producing features have much higher visual value than additional surface decoration.

---

# 29. The “Physical Believability” Test

Every map should pass a simple thought experiment:

> If this scene were turned into a miniature physical model, would its structure make sense?

Ask:

- What is higher?
- What is lower?
- What is behind what?
- What is holding this object up?
- Where does this path go?
- Why does this terrain change here?
- Does this tree actually occupy space?
- Where would water flow?
- Does this wall have thickness?
- Does the player appear to stand on the ground?

If those questions cannot be answered visually, the scene is probably too flat.

---

# 30. The “Screenshot Test”

A map should still feel dimensional in a completely static screenshot.

Without animation, combat, or player movement, the image should communicate:

- near;
- middle;
- far;
- high;
- low;
- behind;
- in front;
- open;
- enclosed.

If those relationships are not visible in a screenshot, movement alone will not fully solve the problem.

---

# 31. The “Movement Test”

While moving through a BroTown map, the player should regularly experience moments where the scene changes because of their position.

Examples:

- passing behind a tree;
- emerging from under an arch;
- descending from a ridge;
- entering fog;
- crossing a bridge;
- walking between tall rocks;
- entering a clearing;
- moving behind a building;
- passing through blowing snow.

These moments make traversal itself feel spatial.

---

# 32. The “No Sticker” Rule

Any asset that appears visually pasted onto the map should be challenged.

Common sticker problems:

- character floating above terrain;
- enemy with no ground relationship;
- ore rock sitting cleanly on top of grass;
- tree with no roots, shadow, or overlap;
- pond drawn as an isolated oval;
- building sitting on ground without foundation;
- path painted across every object instead of interacting with them.

Every major asset should appear to belong to the world around it.

---

# 33. The “No Tabletop” Rule

BroTown should avoid visual arrangements that resemble pieces placed on a board.

Warning signs include:

- objects evenly spaced;
- every prop fully visible;
- every object facing the viewer;
- no foreground cropping;
- no overlap;
- no visible terrain height;
- all objects sharing the same visual scale;
- no distant haze;
- no large environmental forms.

A map containing several of these warning signs should be reworked before decorative polish continues.

---

# 34. The “One Hero Depth Moment” Rule

Every map should contain at least one area where BroTown’s dimensionality is especially obvious.

Examples:

- player walks beneath a giant tree canopy;
- path descends between tall cliffs;
- bridge passes over a lower area;
- player approaches a massive building framed by foreground props;
- player crosses behind a waterfall;
- volcanic overhang covers part of the character;
- snowy path winds down from an upper ridge into a valley.

This creates memorable environmental moments and ensures that every map demonstrates depth rather than merely suggesting it.

---

# 35. World Consistency Matters More Than Perfect Realism

BroTown does not need realistic geography.

It needs consistent visual logic.

Ridiculous buildings, oversized fantasy objects, exaggerated cliffs, giant trees, and strange terrain are all welcome.

In fact, they fit BroTown well.

But they should still obey simple spatial rules:

- things have weight;
- things overlap;
- things cast or receive visual grounding;
- surfaces connect;
- height changes have thickness;
- distance affects appearance.

BroTown can be absurd and physically believable at the same time.

---

# 36. Map Composition Standard

As a general design target, most BroTown maps should contain:

- at least one large-scale environmental form;
- multiple meaningful overlaps;
- at least one visible elevation change;
- a distinct foreground layer;
- a readable gameplay area;
- a visible background or continuation of space;
- one or more environmental motion elements;
- one landmark or dominant composition feature;
- some open negative space;
- at least one dense or enclosed region;
- terrain transitions that feel physical;
- environmental interaction with the player silhouette.

Not every map must use the same formula, but maps should rarely lack most of these ingredients.

---

# 37. Recommended World-Building Order

When designing a new BroTown map, the team should think in this order:

## 1. World Shape

What are the major masses?

Cliffs, forests, rivers, structures, open spaces.

## 2. Elevation

Where is the world higher and lower?

## 3. Player Journey

How does the player move through the space?

## 4. Occlusion

What will the player move behind, beneath, between, and in front of?

## 5. Landmark

What makes this place memorable?

## 6. Foreground / Background

How does the screen communicate near and far?

## 7. Lighting / Atmosphere

What environmental condition unifies the scene?

## 8. Gameplay Objects

Enemies, resources, NPCs, interactables.

## 9. Supporting Props

Rocks, vegetation, debris, furniture.

## 10. Surface Detail

Grass, cracks, flowers, footprints, small stones.

This order prevents BroTown from creating a beautiful flat background and then trying to add depth afterward.

Depth should be part of the map’s architecture from the beginning.

---

# 38. Review Checklist for Every BroTown Map

Before a map is considered visually complete, review it against these questions.

## Depth

- Can I clearly identify foreground, gameplay plane, and background?
- Does anything meaningfully pass in front of the player?
- Are there visible overlaps between environment objects?
- Is there at least one obvious height difference?
- Do elevated areas show thickness?

## Grounding

- Do characters visually touch the ground?
- Do large props feel anchored?
- Do buildings feel connected to their foundations?
- Do enemies feel embedded in terrain?

## Composition

- Is there a strong large-scale shape?
- Is there a recognizable landmark?
- Does the map avoid even object spacing?
- Is there useful negative space?
- Are dense and open areas balanced?

## Traversal

- Does the path interact with the world?
- Does movement create changing spatial relationships?
- Does the player pass behind, beneath, between, or around environmental forms?
- Does the map feel like a sequence of places rather than one open board?

## Atmosphere

- Is the background visually pushed away?
- Does the biome have atmospheric depth?
- Is there environmental motion?
- Are atmospheric effects present at multiple depths?

## World Continuity

- Do some objects extend beyond the camera?
- Do map edges feel like natural world boundaries?
- Does the environment imply continuation beyond the visible screen?

## Style Integration

- Do pixel characters feel physically present in the painterly world?
- Is lighting direction coherent?
- Are shadows and grounding consistent?
- Do characters interact visually with local weather and terrain?

---

# 39. Common Failure Modes to Avoid

## Flat Background Syndrome

A beautiful landscape is painted as one image, then gameplay objects are placed on top.

**Fix conceptually:** Separate the scene into physical layers and spatial relationships.

## Sticker Props

Rocks, trees, buildings, characters, and resources appear pasted onto terrain.

**Fix conceptually:** Give them grounding, overlap, integration, and environmental context.

## Decorative Overload

More tiny details are added because the map still feels empty.

**Fix conceptually:** Add larger forms, depth, and spatial structure instead.

## Even Distribution

Props are distributed uniformly across the map.

**Fix conceptually:** Use clusters, masses, openings, and irregularity.

## No Foreground

Nothing ever exists between the player and the camera.

**Fix conceptually:** Introduce canopies, walls, branches, structures, fog, or other near-camera elements.

## Fake Elevation

Different terrain colors imply height without showing a vertical transition.

**Fix conceptually:** Show the face and thickness of the terrain change.

## Background Competition

Distant terrain is as sharp and contrast-heavy as gameplay elements.

**Fix conceptually:** Use atmospheric perspective and visual hierarchy.

## Perfect Framing

Every object is fully visible and comfortably inside the screen.

**Fix conceptually:** Crop large objects and imply continuation.

---

# 40. BroTown’s World Design Principle in One Sentence

> **Every BroTown map should feel like a layered miniature world the player moves through, not a painted surface the player moves across.**

Everything else in this document supports that idea.

---

# Final Creative Standard

When a BroTown map is successful, the player should feel that they could:

- walk behind things;
- climb above things;
- descend below things;
- disappear beneath things;
- look into the distance;
- move through weather;
- enter spaces;
- leave spaces;
- discover places beyond the current camera.

The map should have enough visual depth that the player stops thinking about the background as artwork.

It should simply feel like **the world**.
