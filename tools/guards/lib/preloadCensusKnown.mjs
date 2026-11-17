/* v2.3.5782: THE CENSUS of the drawing's loads the name graph does not reach
   from the loading screen, the zone overlay or wheelMonsterArt.js
   (./preloadCensus.mjs says the reading), on main at 2026-11-17: 31 of 87.
   Each file with its count and why.  "not read" means U2 did not open the
   code behind the reading: the load may be preloaded through a path the graph
   cannot follow (a function passed by name), or a real first-use load: for
   whoever takes it off.  A census (the plan's rule 3): the TOTAL only falls
   (a load moved to another file by a split is the same load).
   `node tools/guards/preload-census.test.mjs --write` takes the gone ones
   off; it never adds one.  Never add a line by hand: a new loader is
   reached from the loading screen, or its PR says why not. */
export const KNOWN = Object.freeze({
  'src/rendering/fireGoblinSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/fxStrips.js': [2, 'the portal beam and the owner\'s strips, whose promises fxStripsReady() (on the loading screen) may await: not read'],
  'src/rendering/gearLookProbe.js': [2, 'a QA probe of the gear\'s looks: not read'],
  'src/rendering/lookSets/gear.js': [1, 'a look set\'s loader (the palette bakes): not read'],
  'src/rendering/lookSets/skills.js': [1, 'a look set\'s loader (the palette bakes): not read'],
  'src/rendering/lookSets/weapons.js': [1, 'a look set\'s loader (the palette bakes): not read'],
  'src/rendering/mummySprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/nftAvatars.js': [1, 'the wallet\'s Hemi Bro pictures, loaded when a wallet shows them: not read'],
  'src/rendering/rockGolemSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/rotcapSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/shieldSprites.js': [1, 'a loader handed to loadSetLater by name: the graph does not follow it'],
  'src/rendering/skeletonSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/slimeSprites.js': [2, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/snowmanSprites.js': [2, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/stormEyeSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/systems/effectsRenderer.js': [3, 'the chop strips and a farm prop, loaded in the renderer\'s methods: not read'],
  'src/rendering/systems/entityRenderer.js': [1, 'a loader handed to loadSetLater by name: the graph does not follow it'],
  'src/rendering/systems/tileRenderer.js': [3, 'a zone\'s tile pictures (preloadZoneAssets may load them first): not read'],
  'src/rendering/tiledMaps.js': [1, 'a zone\'s map (preloadZoneAssets may load it first): not read'],
  'src/rendering/waterFrogSprites.js': [1, 'a monster\'s strip (loadTrackedStrip; the Wheel\'s monsters load as you walk, CLAUDE.md §7\'s exception) in a function the graph does not reach from wheelMonsterArt.js: not read'],
  'src/rendering/weaponSprites.js': [1, 'a loader handed to loadSetLater by name: the graph does not follow it'],
  'src/rendering/wheelDoors.js': [1, 'a Wheel building\'s door picture: not read'],
  'src/rendering/wheelObjects.js': [1, 'the Wheel\'s object sheets (wheelGround\'s blocks): not read'],
});
