import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from './ui/GameApp.jsx';
import { debugBus } from './debug/debugBus.js';
import { installPerfHud } from './debug/perfHud.js';
import { installCrashTrap } from './debug/crashTrap.js';
import './styles/game.css';

/* Debug console intercept is handled by debugBus.initFromUrl() alone now.
   The earlier installDiagBanner() stacked a SECOND interceptor on top of
   debugBus's, doubling per-call cost (JSON.stringify + array push + DOM
   refresh) on every console.log/warn/error/info -- visible in Chrome
   call stacks as `diagBanner.js:166 -> debugBus.js:55`.  debugBus already
   provides log capture + WS sniff + command bus, and the React
   DebugOverlay is the user-facing surface, so the vanilla-JS banner is
   redundant.  Re-add if the React overlay regresses. */
debugBus.initFromUrl();

/* v2.3.763: crash evidence capture (see crashTrap.js) -- owner reported
   black-canvas + kicked-to-login instability on iPhone; this records JS
   errors, promise rejections and WebGL context loss across reloads. */
installCrashTrap();

/* On-screen perf HUD (vanilla DOM, reads perfTracker, no console hook).
   Activates with ?perf=1 or ?debug=1.  Survives the React overlay
   vanishing after PLAY -- used to diagnose the reported 2x slowdown. */
installPerfHud();

createRoot(document.getElementById('root')).render(<GameApp />);
