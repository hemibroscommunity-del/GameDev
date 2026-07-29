/* === splashAudio — character-creator splash sound wiring ===
   v2.3.896: extracted verbatim from two BroTown.jsx useEffects (the
   character-creator audio glue; effect bodies move to src/game/). Browsers
   block un-muted autoplay, so each arms on the splash's first pointerdown
   (once) and loops. Behavior-frozen — the listener arm/disarm and the
   audio lifecycle are unchanged. Call each from a useEffect with
   [showNameModal] and return its result as the cleanup; both early-return
   (no cleanup) when the modal isn't showing, exactly as before. */

/* Torch crackle — DISABLED (v2.3.1580, owner: "disable the torch burning
   noise on login screen").  Same treatment wireThemeMusic got in v2.3.1103
   and for the same reason: a no-op that keeps its export and signature, so the
   BroTown.jsx call site and its useEffect cleanup contract are untouched
   (returning undefined means "no cleanup", which is exactly what the
   not-showing branch already returned).

   It had also become the wrong sound in the wrong place.  v2.3.1577 gave the
   login screen a real music track that starts on the same first pointerdown
   this crackle armed itself on, so the two layered — a looping 50KB fire
   effect under the theme, both at roughly the same level.

   The asset is deleted with it; nothing else references it. */
export function wireTorchCrackle(showNameModal) {
  return undefined;
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
