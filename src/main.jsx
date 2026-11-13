import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from './ui/GameApp.jsx';
import { debugBus } from './debug/debugBus.js';
import { installPerfHud } from './debug/perfHud.js';
import { installCrashTrap } from './debug/crashTrap.js';
import { installUiSfxDelegate } from './ui/uiSfxDelegate.js';
import { applyWorldTrial } from './game/worldTrial.js';
import { applyDeskWide } from './ui/deskWide.js';
import { applyOneBand } from './ui/oneBand.js';   /* v2.3.4072 */
import { markLoad } from './game/loadTimes.js';   /* v2.3.5019: the load timer (the Test panel's "Loading times") */
import { startBandSideways } from './ui/mobile/bandSideways.js';   /* v2.3.4152 */
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

/* v2.3.5019: the game's code is running -- the first step of the load timer */
markLoad('app');

/* v2.3.2658: the menu click / dialog close sounds (owner: "Use the click
   sound for navigating through the menus ... Use the close sound for closing
   the dialog window that appear in game").  ONE delegated listener rather
   than a handler per button -- see src/ui/uiSfxDelegate.js for why, and for
   what it deliberately cannot reach (the world controls).
   Installed HERE, beside the other document-level installers, and BEFORE the
   render: it listens in the capture phase on `document`, so it needs no
   element to exist yet and it catches panels that mount into portals. */
installUiSfxDelegate();

/* v2.3.2932: the world trial (src/game/worldTrial.js); since v2.3.4676 always
   the Wheel, the world ("Close it", the owner, 2026-11-11: no `?trial=off`, no
   `?trial=world`).  BEFORE the render: it rewrites the World View's shared
   tables (size, exits, arrival) into the Wheel's, and nothing may read them
   first. */
applyWorldTrial();

/* v2.3.3687: a computer plays the sideways layout (src/ui/deskWide.js; `?narrow`
   is the upright column).  BEFORE the render: the first layout reads #root's
   shape. */
applyDeskWide();

/* v2.3.4072: one dashboard on every screen (src/ui/oneBand.js); v2.3.4152: the
   default, `?oneband=0` the side column for one device.  BEFORE the render,
   for the same reason. */
applyOneBand();
/* v2.3.4152: a phone on its side rests the band folded, the controls step
   aside while it is open (src/ui/mobile/bandSideways.js) */
startBandSideways();

createRoot(document.getElementById('root')).render(<GameApp />);
