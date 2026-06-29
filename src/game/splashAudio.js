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

/* Splash theme music — DISABLED (v2.3.1103). The owner removed all
   background music to shrink the download (theme.m4a was 3.5 MB; the zone
   tracks ~40 MB). This is now a no-op: themeAudioRef stays null, which every
   reader already guards (`if (themeAudioRef.current)`), so the loading-screen
   hand-off and modal cleanup are unaffected. The export + signature are kept
   so call sites in BroTown.jsx don't need to change. */
export function wireThemeMusic(showNameModal, themeAudioRef) {
  return undefined;
}
