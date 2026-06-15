/* === splashAudio — character-creator splash sound wiring ===
   v2.3.896: extracted verbatim from two BroTown.jsx useEffects (the
   character-creator audio glue; effect bodies move to src/game/). Browsers
   block un-muted autoplay, so each arms on the splash's first pointerdown
   (once) and loops. Behavior-frozen — the listener arm/disarm and the
   audio lifecycle are unchanged. Call each from a useEffect with
   [showNameModal] and return its result as the cleanup; both early-return
   (no cleanup) when the modal isn't showing, exactly as before. */

/* Torch crackle — quiet looping ambience; stopped when the modal closes. */
export function wireTorchCrackle(showNameModal) {
  if (!showNameModal) return;
  var au = null;
  var start = function () {
    try {
      au = new Audio('/ui/welcome/torch-crackle.m4a');
      au.loop = true;
      au.volume = 0.22;
      au.play().catch(function () {});
    } catch (e) {}
  };
  window.addEventListener('pointerdown', start, { once: true });
  return function () {
    window.removeEventListener('pointerdown', start);
    try { if (au) { au.pause(); au.src = ''; au = null; } } catch (e) {}
  };
}

/* Splash theme music — held in themeAudioRef so it KEEPS PLAYING through
   the loading screen (IntroVideo hands it off); deliberately NOT stopped on
   the modal's cleanup. start() is a no-op if already armed. */
export function wireThemeMusic(showNameModal, themeAudioRef) {
  if (!showNameModal) return;
  var start = function () {
    try {
      if (themeAudioRef.current) return;
      var au = new Audio('/ui/welcome/theme.m4a');
      au.loop = true;
      au.volume = 0.4;
      au.play().catch(function () {});
      themeAudioRef.current = au;
    } catch (e) {}
  };
  window.addEventListener('pointerdown', start, { once: true });
  return function () {
    window.removeEventListener('pointerdown', start);
    /* deliberately NOT stopping the theme here — it carries into the
       loading screen; IntroVideo (or the skip-intro path) hands it off. */
  };
}
