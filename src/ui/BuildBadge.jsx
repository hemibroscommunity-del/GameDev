import React from 'react';

// Build constants are injected at build time by Vite (see vite.config.js).
// Fall back gracefully if running in a context where they weren't replaced.
const VERSION = typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : 'dev';
const SHA     = typeof __BUILD_SHA__     === 'string' ? __BUILD_SHA__     : 'local';
const TIME    = typeof __BUILD_TIME__    === 'string' ? __BUILD_TIME__    : '';
/* v2.3.3481: the 2026-10-19 UI review -- the door and the creator said
   "v2.3.2324" on a v2.3.3439 game: VERSION is package.json's hand-kept number.
   GAME is the version a player is SHOWN, the newest v2.3.N in the build's
   commit titles (vite.config.js GAME_VERSION); COMMIT the commit it is of.
   VERSION stays exactly as it was: it is the `?v=` cache key on the door's
   and the creator's art, and must not move on every deploy. */
const GAME    = typeof __GAME_VERSION__  === 'string' ? __GAME_VERSION__  : VERSION;
const COMMIT  = typeof __BUILD_COMMIT__  === 'string' ? __BUILD_COMMIT__  : '';

export const BUILD_INFO = { version: VERSION, sha: SHA, time: TIME, game: GAME, commit: COMMIT };

// Sits below the Canvas 2D FPS HUD (which lives at canvas coords 90,6 / height ~18).
// Always visible regardless of renderer so deployments can be verified at a glance.
export const BuildBadge = () => (
  <div
    title={`Built ${TIME}`}
    style={{
      position: 'fixed',
      top: 28,
      left: 90,
      padding: '2px 6px',
      background: 'rgba(0,0,0,0.55)',
      color: '#ffffff',
      fontFamily: 'Source Sans 3, sans-serif',
      fontSize: 11,
      lineHeight: '14px',
      borderRadius: 3,
      pointerEvents: 'none',
      zIndex: 50,
      letterSpacing: 0.2,
    }}
  >
    {/* v2.3.3481: the version shown (GAME), not the cache key */}
    v{GAME} · {SHA}
  </div>
);
