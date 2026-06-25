/* Shared cache-bust version for the layered gear/armor sprite sheets under
 * public/sprites/gear/<slot>/<item>/<pose>-<dir>.png.  Bump this whenever a
 * gear PNG changes so clients refetch it.  Lives in its own leaf module so
 * both the renderer (effectsRenderer) and the preloader (combatGear) can share
 * the exact same string without importing each other (avoids an import cycle)
 * and without the two URLs drifting out of sync (which would double-fetch). */
export const GEARLAYER_VER = '1022';   /* 1022: add shirt swing-east.png (also serves mirrored west) -- tinted shirt now shows on east/west sword swings, neck/waist-anchored; 1021: shirt swing-south uses ONE constant transform for all frames (collar pinned, fixed scale) -> no per-frame bounce/flicker; 1020: collar lock */
