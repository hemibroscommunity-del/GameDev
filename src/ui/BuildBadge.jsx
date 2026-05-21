import React from 'react';

// Build constants are injected at build time by Vite (see vite.config.js).
// Fall back gracefully if running in a context where they weren't replaced.
const VERSION = typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : 'dev';
const SHA     = typeof __BUILD_SHA__     === 'string' ? __BUILD_SHA__     : 'local';
const TIME    = typeof __BUILD_TIME__    === 'string' ? __BUILD_TIME__    : '';

export const BUILD_INFO = { version: VERSION, sha: SHA, time: TIME };

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
      color: '#cfd8dc',
      fontFamily: 'Atkinson Hyperlegible, sans-serif',
      fontSize: 10,
      lineHeight: '14px',
      borderRadius: 3,
      pointerEvents: 'none',
      zIndex: 50,
      letterSpacing: 0.2,
    }}
  >
    v{VERSION} · {SHA}
  </div>
);
