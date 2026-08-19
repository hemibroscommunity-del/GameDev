/* ═══ CORE CONSTANTS ═══ */
export const TILE = 32;

/* v2.3.1090: world zoom-out factor. The logical viewport (W/H) is enlarged by
   this factor so the renderer shows WORLD_ZOOM× more world than CSS pixels,
   which makes the world scale = cssW/viewW = 1/WORLD_ZOOM (e.g. 0.8 at 1.25).
   Restores the historical "0.8 world scale" feel the game shipped with before
   the viewport lost its 1.25 factor and everything read 20% too big/zoomed-in.
   Consumed by BOTH the render call (src/game/renderFrame.js) and the camera
   centering (src/ui/BroTown.jsx) so the two stay consistent; world<->screen
   conversions (tap-to-lock) read the published S._worldScaleX/Y instead of
   assuming 1.0, so they track this automatically. Tune on the preview. */
export const WORLD_ZOOM = 1.25;

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
   Open cobble just south-east of the fountain at world (977, 625), clear of
   the basin and both lamp posts (checked against town_v16.walk.json). */
export const TOWN_SPAWN = { x: 1050, y: 780 };
