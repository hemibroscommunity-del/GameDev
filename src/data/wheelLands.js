/* ═══ v2.3.3024: EACH LAND OF THE WHEEL, ITS OWN COLOUR AND ELEMENT ═══
 *
 * Owner, 2026-10-04: "There might need to be flat colors on the minimap to
 * help orient you to what elemental zone you're in" -- and "I'm also thinking
 * elemental zones need something more obvious that the player is in that
 * elemental zone".
 *
 * One table, read by everything that says which land you are in: the
 * minimap's and the world map's flat land colours (wheelTrial.js
 * landsCanvas), the top bar's element icon and the land's name in its colour
 * (ZoneHeader.jsx), and the banner as you cross into a land
 * (wheelLandBanner.js).  Keyed by the plan's region ids
 * (public/tools/world/plan.js SPOKES: frost NW, ember N, sky NE, hollows E,
 * thunder SE, tidal S, mist SW, verdant W); the town and the commons have a
 * colour and no element.
 *
 * The colours are mid-tones, flat, one a land and far apart round the colour
 * wheel, so a glance at the minimap says which land is which and the cream
 * roads, the white house and the red skulls still read on every one.  The
 * icons are the element icons the hits already use (public/icons/ui/).
 */
const LOOK = Object.create(null);
LOOK.frost = Object.freeze({ element: 'frost', color: '#7fbfe0', icon: '/icons/ui/elem-frost.webp' });
LOOK.ember = Object.freeze({ element: 'flame', color: '#d85a36', icon: '/icons/ui/elem-flame.webp' });
LOOK.sky = Object.freeze({ element: 'wind', color: '#d9b452', icon: '/icons/ui/elem-wind.webp' });
LOOK.hollows = Object.freeze({ element: 'stone', color: '#94806a', icon: '/icons/ui/elem-stone.webp' });
LOOK.thunder = Object.freeze({ element: 'storm', color: '#8a72e0', icon: '/icons/ui/elem-storm.webp' });
LOOK.tidal = Object.freeze({ element: 'water', color: '#2fa3b6', icon: '/icons/ui/elem-water.webp' });
LOOK.mist = Object.freeze({ element: 'venom', color: '#a052c0', icon: '/icons/ui/elem-venom.webp' });
LOOK.verdant = Object.freeze({ element: 'flora', color: '#4fae47', icon: '/icons/ui/elem-flora.webp' });
/* home: no element */
LOOK.town = Object.freeze({ element: null, color: '#d8cba0', icon: null });
LOOK.commons = Object.freeze({ element: null, color: '#b9ad80', icon: null });
export const WHEEL_LAND_LOOK = Object.freeze(LOOK);

/* the eight elemental lands, in the plan's order round the Wheel */
export const WHEEL_LANDS = Object.freeze(['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant']);

/** The look of region `id` ({ element, color, icon }), or null (the sea, a
 *  realm past a gate, anything unknown). */
export function landLook(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(LOOK, id) ? LOOK[id] : null;
}

/** Is region `id` one of the eight elemental lands? */
export function isElementLand(id) {
  return WHEEL_LANDS.includes(id);
}

/** '#rrggbb' -> [r, g, b] */
export function hexRgb(hex) {
  const v = parseInt(String(hex).slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
