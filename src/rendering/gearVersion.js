/* Shared cache-bust version for the layered gear/armor sprite sheets under
 * public/sprites/gear/<slot>/<item>/<pose>-<dir>.png.  Bump this whenever a
 * gear PNG changes so clients refetch it.  Lives in its own leaf module so
 * both the renderer (effectsRenderer) and the preloader (combatGear) can share
 * the exact same string without importing each other (avoids an import cycle)
 * and without the two URLs drifting out of sync (which would double-fetch). */
export const GEARLAYER_VER = '1025';   /* 1025: chop shirt nudged +10px on frames 2,3,4,7,8,11,12 to sit on the torso; 1024: woodcutting chop-west gear layers (chest/legs/shirt); chop shirt is a grayscale tintable base so it recolours to the player's shirt colour; 1023: add shirt swing-north.png (serves north + northeast + mirrored northwest) -- tinted shirt now shows on north sword swings too, neck/waist-anchored; 1022: add shirt swing-east.png (also serves mirrored west); 1021: shirt swing-south uses ONE constant transform for all frames (collar pinned, fixed scale) -> no per-frame bounce/flicker; 1020: collar lock */
