/* ═══ v2.3.2612: WHAT THE STAT SCENES DRAW, AS A LIST ═══
 *
 * These URLs used to live inside StatDemo.jsx.  They are out here because the
 * PRELOADER has to know them (CLAUDE.md's animation-preloading law) and the
 * preloader must not import a React component to find out — pulling the sheet's
 * component graph into the loading path to learn four strings is the kind of
 * import that gets "cleaned up" later and silently takes the warm with it.
 *
 * One list, two readers: StatDemo draws from it, statDemoPreload warms it.
 * A scene that adds an asset adds it HERE and is preloaded for free.
 *
 * WHY THE `?v=` SUFFIXES MATTER, and why they are not all the same: a query
 * string is part of the cache key, so an asset is only warm if it is requested
 * at the URL something already fetched.  Each one below is pinned to the URL
 * its other owner uses, which is why they disagree with each other.
 */

/* The slime, at the URLs slimeSprites.js loads through Pixi (no suffix there,
   so none here).  Covered by preloadWorldAnimations' `slime` group. */
export const SLIME_PX = 128;
export const SLIME = {
  idle:  { url: '/sprites/monsters/slime-idle-v5.png',  frames: 24 },
  hit:   { url: '/sprites/monsters/slime-hit-v1.png',   frames: 24 },
  shoot: { url: '/sprites/monsters/slime-shoot-v2.png', frames: 8 },
};
export const ORB_URL = '/sprites/monsters/slime-projectile-v1.png';

/* What leaves the hero's hands, at effectsRenderer's own _fxLoad URLs —
   covered by the manifest's `fx` group. */
export const SHOT = {
  bow:   { url: '/sprites/projectiles/arrow-pine.png?v=2.3.1881', w: 30, h: 8, frames: 1 },
  staff: { url: '/sprites/projectiles/magic-bolt-v1.webp?v=2.3.1334', w: 34, h: 20, frames: 4 },
};

/* The combat renderer's popup icons.
   NOT all of these are warm from the renderer, and that is the reason
   statDemoPreload.js exists — see its header. */
export const ICON = {
  crit:   '/icons/ui/hero/crit.webp?v=2.3.1694',
  heart:  '/icons/popups/heart-256.webp?v=2.3.2201',
  shield: '/icons/popups/shield-defense.webp?v=2.3.2201',
};

/* Everything above as a flat list, for the preloader. The slime strips and the
   projectiles are already fetched by the world's own loaders at these exact
   URLs; warming them again is a cache hit, and listing them keeps this file
   the single answer to "what does a scene draw" rather than a partial one. */
export const STAT_DEMO_URLS = [
  ...Object.values(SLIME).map((s) => s.url),
  ORB_URL,
  ...Object.values(SHOT).map((s) => s.url),
  ...Object.values(ICON),
];
