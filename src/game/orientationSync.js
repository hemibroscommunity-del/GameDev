/* === orientationSync — keep isLandscape in sync with the viewport ===
   v2.3.902: extracted verbatim from a BroTown.jsx mount useEffect (empty
   deps). Updates the isLandscape React flag on window resize and
   screen-orientation change. Behavior-frozen; returns the listener-removal
   cleanup. Call from a useEffect with an empty dep array. */
import { playIsLandscape } from '@/ui/mobile/playViewport.js';

export function wireOrientationSync(setIsLandscape) {
    var _window$screen;
    var onResize = function onResize() {
      /* v2.3.1715: the SHELL's orientation.  On a 1920x1080 desktop the
         window is landscape but the 960x1080 play shell is portrait, and
         this flag swings the whole control layout. */
      return setIsLandscape(playIsLandscape());
    };
    window.addEventListener('resize', onResize);
    if ((_window$screen = window.screen) !== null && _window$screen !== void 0 && _window$screen.orientation) window.screen.orientation.addEventListener('change', onResize);
    return function () {
      var _window$screen2;
      window.removeEventListener('resize', onResize);
      if ((_window$screen2 = window.screen) !== null && _window$screen2 !== void 0 && _window$screen2.orientation) window.screen.orientation.removeEventListener('change', onResize);
    };
}
