/* === orientationSync — keep isLandscape in sync with the viewport ===
   v2.3.902: extracted verbatim from a BroTown.jsx mount useEffect (empty
   deps). Updates the isLandscape React flag on window resize and
   screen-orientation change. Behavior-frozen; returns the listener-removal
   cleanup. Call from a useEffect with an empty dep array. */
export function wireOrientationSync(setIsLandscape) {
    var _window$screen;
    var onResize = function onResize() {
      return setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    if ((_window$screen = window.screen) !== null && _window$screen !== void 0 && _window$screen.orientation) window.screen.orientation.addEventListener('change', onResize);
    return function () {
      var _window$screen2;
      window.removeEventListener('resize', onResize);
      if ((_window$screen2 = window.screen) !== null && _window$screen2 !== void 0 && _window$screen2.orientation) window.screen.orientation.removeEventListener('change', onResize);
    };
}
