import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from './ui/GameApp.jsx';
import { debugBus } from './debug/debugBus.js';
import { installDiagBanner } from './debug/diagBanner.js';
import './styles/game.css';

/* Install the vanilla-JS diagnostic banner BEFORE React mounts.  Hooks
   console.log/warn/error and renders a fixed-position div directly to
   document.body at z-index 2147483647 (max int).  Bypasses React entirely
   so it can't be hidden by any React component, stacking context, or
   canvas size weirdness.  Activates only on ?debug=1. */
installDiagBanner();
debugBus.initFromUrl();

createRoot(document.getElementById('root')).render(<GameApp />);
