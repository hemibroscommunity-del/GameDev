import React, { useEffect, useRef, useState } from 'react';

/* Bro Town intro overlay — shown once after character creation.
   Plays the intro clip, then fades to reveal the game world.

   Asset gating (v2.3.591): the overlay will NOT finish until `waitFor`
   resolves, so the player never drops into the world before their avatar's
   sheets (body, recolored skin, equipped gear for every direction, weapon,
   shield) are fully baked — that lazy-load was the armour->unarmoured flicker
   on first turn.  The clip plays for at least MIN_MS; if assets are still
   loading past that, the overlay holds and only fades once they're ready.
   Town zone music starts on mount.

   v2.3.1220: swapped to the owner's portrait "washed ashore" beach clip,
   which bakes its own LOADING caption + progress bar into the art — so the
   JS-drawn caption/bar (and the prewarmProgress poll that fed it) were
   removed to avoid a doubled "LOADING". The asset gate above is unchanged;
   it just holds silently on the clip until the avatar sheets are ready. */
const MIN_MS = 3000;     // minimum clip display before we even consider fading
const FADE_MS = 1000;    // opacity fade duration

export const IntroVideo = ({ onComplete, waitFor, themeAudio }) => {
  const [fading, setFading] = useState(false);
  const [waiting, setWaiting] = useState(false);   // assets still loading past MIN_MS
  const finishedRef = useRef(false);
  const minDoneRef = useRef(false);
  const readyRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    /* v2.3.1866 probe: WHO took the loading screen down, and when.  Chasing
       the owner's black screen, the overlay was measured coming off in under
       a second against a 3000ms floor — which is either this finish() running
       early or the overlay never really being up.  One is a timer bug and the
       other is a mount bug, and nothing distinguished them. */
    try {
      window.__btIntro = window.__btIntro || [];
      window.__btIntro.push({ ev: 'finish', at: Date.now(),
        minDone: minDoneRef.current, ready: readyRef.current });
    } catch (e) {}
    onComplete && onComplete();
  };

  /* v2.3.831: the splash theme keeps playing across this loading screen
     (passed in via themeAudio).  At the transition we crossfade: ramp the
     theme down over the visual fade while the town ambience starts up, so
     the music dissolves into the town's sound instead of cutting.  Guarded
     so it only runs once. */
  const transitionedRef = useRef(false);
  const beginTransition = () => {
    if (transitionedRef.current) return;
    transitionedRef.current = true;
    try { window.BT_AUDIO && window.BT_AUDIO.startZoneAmbient('town'); } catch (e) {}
    const a = themeAudio && themeAudio.current;
    if (a) {
      const v0 = a.volume;
      const steps = 24;
      let i = 0;
      const id = setInterval(() => {
        i++;
        try { a.volume = Math.max(0, v0 * (1 - i / steps)); } catch (e) {}
        if (i >= steps) {
          clearInterval(id);
          try { a.pause(); a.src = ''; } catch (e) {}
          if (themeAudio) themeAudio.current = null;
        }
      }, FADE_MS / steps);
    }
  };

  useEffect(() => {
    try {
      window.__btIntro = window.__btIntro || [];
      window.__btIntro.push({ ev: 'mount', at: Date.now(), hasWaitFor: !!waitFor });
    } catch (e) {}
    let cancelled = false;
    const maybeFinish = () => {
      if (cancelled || finishedRef.current) return;
      if (minDoneRef.current && readyRef.current) {
        setWaiting(false);
        beginTransition();
        setFading(true);
        setTimeout(finish, FADE_MS);
      } else if (minDoneRef.current && !readyRef.current) {
        setWaiting(true);   // clip done but assets not ready -> hold
      }
    };

    const minTimer = setTimeout(() => { minDoneRef.current = true; maybeFinish(); }, MIN_MS);

    /* No waitFor supplied -> behave like the old fixed-duration intro. */
    Promise.resolve(waitFor).catch(() => {}).then(() => {
      readyRef.current = true;
      maybeFinish();
    });
    /* Safety net: never trap the player on the overlay forever if a preload
       somehow never settles (network stall). */
    const hardCap = setTimeout(() => { readyRef.current = true; maybeFinish(); }, 20000);

    return () => {
      /* An UNMOUNT here is the interesting case: the overlay disappearing
         without finish() ever running means something above it stopped
         rendering it, and the world is then on screen with none of the
         assets this screen exists to wait for. */
      try {
        window.__btIntro = window.__btIntro || [];
        window.__btIntro.push({ ev: 'unmount', at: Date.now(), finished: finishedRef.current });
      } catch (e) {}
      cancelled = true;
      clearTimeout(minTimer);
      clearTimeout(hardCap);
    };
  }, []);

  return (
    <div className={'bt-intro' + (fading ? ' bt-intro--fading' : '')}>
      <video
        /* v2.3.822: ocean clip (owner art) — the loading screen leads into
           the planned opening beat of the player washing ashore.
           v2.3.823: swapped for the pixel-art underwater reef clip (owner);
           ocean-intro.mp4 and the original brotown-intro.mp4 both live in
           git history.
           v2.3.854: swapped for the owner's painted island vista (the volcano
           island the town sits on), re-encoded muted/no-audio, 900px wide,
           H.264 yuv420p + faststart (~1 MB, was 14.8 MB) so it loads fast on
           iPhone Safari.  loading-reef.mp4 stays in git history.
           v2.3.1220: swapped for the owner's portrait "washed ashore" beach
           clip (400x736, driftwood + shells at sunset), re-encoded muted/
           no-audio + thumbnail stream stripped, H.264 yuv420p + faststart
           (~0.6 MB). It carries its OWN LOADING caption + bar in the art, so
           the JS overlay was dropped.  loading-island.mp4 stays in git
           history.
           v2.3.1347: `loop` removed — the bar is baked into the frames, so
           looping replayed the "loading" fill from empty after it had
           visually completed (owner playtest: "shows it load all the way
           then replays it loading halfway"). The clip now plays once and
           holds its final (bar-full) frame while the asset gate resolves. */
        src="/intro/loading-ashore.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={(e) => { try { e.target.pause(); } catch (err) {} }}
        onError={() => { minDoneRef.current = true; readyRef.current = true; beginTransition(); finish(); }}
      />
    </div>
  );
};
