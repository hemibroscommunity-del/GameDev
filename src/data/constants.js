/* ═══ CORE CONSTANTS ═══ */
export const TILE = 32;

/* v2.3.1090: world zoom-out factor. The logical viewport (W/H) is enlarged by
   this factor so the renderer shows WORLD_ZOOM× more world than CSS pixels,
   which makes the world scale = cssW/viewW = 1/WORLD_ZOOM (e.g. 0.8 at 1.25).
   Consumed by BOTH the render call (src/game/renderFrame.js) and the camera
   centering (src/ui/BroTown.jsx) so the two stay consistent; world<->screen
   conversions (tap-to-lock) read the published S._worldScaleX/Y instead of
   assuming 1.0, so they track this automatically. Tune on the preview.

   v2.3.1780: 1.25 -> 1.5.

   ═══ v2.3.2247: 1.5 -> 3.0, AND THE CEILING MOVED INTO worldViewport ═══

   Owner: "the game is too zoomed in ... zoom out the game screen area by 50%
   (this should make player smaller)", then, on being shown the ceiling below,
   "don't zoom out larger than the screen area would show."

   3.0 is exactly half the old world scale, i.e. the requested 50%: on a 390pt
   phone 1/1.5 = 0.667 becomes 1/3 = 0.333 and the bro renders half as tall.

   WHY THIS IS NO LONGER THE WHOLE STORY.  The v2.3.1780 note that used to live
   here capped this constant at ~1.5 because "at 1.875 the viewport is TALLER
   THAN THE TOWN ... a town plateau only 30 tiles = 960 px deep".  That was
   true of the 96x30 plateau and has been WRONG since v2.3.1813 re-fused the
   town from a new pair of halves: town is 52x55 tiles = 1664x1760 world px,
   so it is now the DEEPEST zone in the game, not the shallowest.  The owner
   is the one who caught it ("the town is actually larger, its two images
   fused together").  Deleted rather than corrected in place, because the
   conclusion it fed -- that ONE number can be checked against ONE map -- is
   the part that was wrong.

   The real ceiling is PER ZONE and belongs to the zone, not to this constant:

       town       1664x1760      worldview  1536x1536
       shadow/radiant 1280x1280  farm_home   960x 800
       the nine combat zones     1024x1024

   A 1024px-deep zone does not CONTAIN 1845px of world to show, so past its own
   limit zooming out buys void, not view -- the camera clamp's "map smaller
   than the viewport" branch (BroTown, v2.3.819) centres it and draws empty
   tray above and below.  So worldViewport() now floors the scale per zone and
   this number is a TARGET the zone is allowed to refuse: town takes nearly all
   of it (scale 0.349, bro 48% smaller), a combat zone stops at its own edge
   (0.60, 10% smaller).  Raising this further only ever moves the town and the
   hubs; the combat zones move when their ART gets bigger, and nowhere else. */
export const WORLD_ZOOM = 3.0;

/* Ore is mined from one tile NORTH of the vein (so the south-facing swing
   lines up over the rock). The player must stand within MINE_SPOT_R of that
   spot for the Mine action to be offered. Shared by the marker + the gate. */
export const MINE_SPOT_R = 42;

/* v2.3.1470: fishing's gather cue anchors on the PLAYER (the rod's reel
   is at the hands), not on the fish spot — world-y offset from
   S.player.y.  It lives here because BOTH the render (effectsRenderer's
   cue block) and the touch hit-test (ExtractionSwipeLayer.cueScreenPos)
   must use the identical value: they each hard-coded -24, so any tweak
   to one silently moved the drawn reel away from the zone that accepts
   the swipe.  POSITIVE = down: at -24 the cue sat squarely on the
   angler's face (owner), and the v2.3.1449 70% shrink had been a
   workaround for exactly that; +24 clears the chin so the marker and
   its finger ring can be full size again. */
export const FISH_CUE_DY = 24;

export const PLAYER_COLORS = ['#5b52ff', '#00d4b8', '#ff5e6c', '#f5c542', '#3dd497', '#ff8a5c', '#a78bfa', '#38bdf8', '#fb7185', '#4ade80', '#facc15', '#c084fc', '#22d3ee', '#f97316', '#e879f9', '#34d399'];

/* ═══ PERSONAL FARM + HOUSE ═══ */
export const FARM_PLOT_MAX = 12;
export const HOUSE_SLEEP_MS = 3000;
export const WELL_RESTED_DURATION = 1800000;
export const WELL_RESTED_XP_MULT = 1.10;
export const HOUSE_TILE = 13;
export const FARM_PLOT_TILE = 14;
export const FARM_BED_TILE = 15;

/* ═══ CLAN SYSTEM — from index.html line 9057 ═══ */
export const CLAN_COLORS = ['#ffffff', '#000000', '#ff5e6c', '#5b52ff', '#3dd497', '#f5c542', '#a78bfa', '#ea580c', '#38bdf8', '#e879f9', '#34d399', '#fb7185', '#dc2626', '#8B6914', '#1a8a4a', '#4a3a8a'];
export const CLAN_CREATE_COST = 500;
export const CLAN_MAX_MEMBERS = 20;
export const CLAN_TAG_MAX = 4;
export const CLAN_NAME_MAX = 16;
export const CLAN_LOGO_SIZE = 8;

/* ═══ v2.3.1777: WHERE YOU ARRIVE IN TOWN ═══
   The clifftop map moved the plaza, and this point was written out longhand in
   THREE places — the initial player state and both death-respawn paths — as
   `24 * TILE`.  Three copies of a coordinate is how two of them end up stale;
   the new map is also not square, so the old one is not even on the plaza any
   more.  One definition, imported by all three.
   v2.3.1813: the re-fused map (town_v17) is a different SHAPE — nearly square
   where v16 was wide — so the old point is off the plaza again, exactly as the
   comment above predicted would keep happening.  Now the middle of the open
   cobble: measured against the art rather than converted from the old
   coordinate, and every sample within a 48px disc of it is open ground. */
/* ═══ v2.3.2078: AND OUT OF THE FOUNTAIN'S COLLISION CELL ═══
   The note above is about the ART — every sample within 48px is open cobble,
   and that is still true. What it could not know is that v2.3.2073 gave the
   fountain a FOOTPRINT (owner: "make sure the objects are unwalkable"), and
   the prop grid is stamped in 16px cells: the basin's footprint starts at
   y 1018, which lands in the same cell row as y 1010. So the spawn point was
   inside a wall.

   That is worse than it sounds, because isSolid has a never-trap escape
   hatch (v2.3.2075) — a player standing in a blocked cell is allowed to move
   in every direction, or they would be stuck for good. So EVERY player
   spawned with collision switched off, and kept it off until they happened
   to step onto a clear cell: you could walk through the fountain, the
   forge, the mayor's house, anything, straight off the spawn.

   Proved from outside with window.__btIsSolid (v2.3.2078): asked from the
   spawn it reported nothing in town as solid; asked again from open ground
   the fountain, the forge and the gate all came back solid.

   Moved SOUTH of the fountain rather than north of it, and the reason is the
   walk out of town. North of the basin the plaza is nearly sealed: the two
   benches end at y 975 and the fountain's collision starts at y 1008, a 33px
   corridor for a body 24px across. A spawn up there is clear to STAND on and
   boxed in — driven from (815, 975) the player walks 23px south and stops
   dead against the basin, which is correct and useless.

   AND CLEAR OF THE TOWNSFOLK, which (815, 1140) — the first attempt at this —
   was not. Walking within NPC_PROX_OPEN (90px) of a shopkeeper opens his
   trade drawer, and it stays open until you are NPC_PROX_CLEAR (125px) away.
   That spawn sat 99px from Diego, so a new player arrived with the shop
   drawer already across the bottom of their screen — and the drawer covers
   the inspect card's Trade / Duel / Add Friend row. Measured on a 390x844
   phone: three of those four buttons unreachable by a real finger
   (mp-cardreach), which is what mp-rehearsal had been reporting as four
   unrelated failures.

   (910, 1130) is on the south side with the fountain directly north of it —
   the view the plaza was laid out for — 170px from the nearest townsperson,
   outside the CLEAR radius with room for one to be nudged, its whole ±24px
   disc clear of all twelve footprints at the player's own half-width, and an
   unobstructed straight run south to the gate stairs. All three properties
   are checked by walking, not by eye (mp-townexit). */
export const TOWN_SPAWN = { x: 910, y: 1130 };
