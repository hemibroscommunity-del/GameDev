/* Shared cache-bust version for the layered gear/armor sprite sheets under
 * public/sprites/gear/<slot>/<item>/<pose>-<dir>.png.  Bump this whenever a
 * gear PNG changes so clients refetch it.  Lives in its own leaf module so
 * both the renderer (effectsRenderer) and the preloader (combatGear) can share
 * the exact same string without importing each other (avoids an import cycle)
 * and without the two URLs drifting out of sync (which would double-fetch). */
export const GEARLAYER_VER = '1018';   /* 1018: shirt swing-south re-anchored to body landmarks (collar under chin, hem at the real waist/pants-top, two-point vertical lock); 1016: shirt swing-south layer added */
