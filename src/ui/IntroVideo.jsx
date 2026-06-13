import React, { useEffect, useRef, useState } from 'react';
import { prewarmProgress } from '../rendering/systems/entityRenderer.js';

/* Bro Town intro overlay — shown once after character creation.
   Plays the intro clip, then fades to reveal the game world.

   Asset gating (v2.3.591): the overlay will NOT finish until `waitFor`
   resolves, so the player never drops into the world before their avatar's
   sheets (body, recolored skin, equipped gear for every direction, weapon,
   shield) are fully baked — that lazy-load was the armour->unarmoured flicker
   on first turn.  The clip plays for at least MIN_MS; if assets are still
   loading past that, the overlay holds (showing a subtle "Loading…") and only
   fades once they're ready.  Town zone music starts on mount. */
const MIN_MS = 3000;     // minimum clip display before we even consider fading
const FADE_MS = 1000;    // opacity fade duration

export const IntroVideo = ({ onComplete, waitFor, themeAudio }) => {
  const [fading, setFading] = useState(false);
  const [waiting, setWaiting] = useState(false);   // assets still loading past MIN_MS
  /* v2.3.700: real loading bar -- polls the renderer's prewarmProgress
     (every gear state is baked behind this overlay now, so the player
     joins with zero asset hitches and SEES why they're waiting). */
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const p = prewarmProgress;
      const next = p.total > 0 ? Math.min(1, p.done / p.total) : 0;
      /* v2.3.701: monotonic -- the bar may only grow (a late-registered
         workload must never read as a reset). */
      setProg((prev) => Math.max(prev, next));
    }, 150);
    return () => clearInterval(id);
  }, []);
  const finishedRef = useRef(false);
  const minDoneRef = useRef(false);
  const readyRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete && onComplete();
  };

  /* v2.3.818: the splash theme keeps playing across this loading screen
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
      cancelled = true;
      clearTimeout(minTimer);
      clearTimeout(hardCap);
    };
  }, []);

  return (
    <div className={'bt-intro' + (fading ? ' bt-intro--fading' : '')}>
      <video
        /* v2.3.809: ocean clip (owner art) — the loading screen leads into
           the planned opening beat of the player washing ashore.
           v2.3.810: swapped for the pixel-art underwater reef clip (owner);
           ocean-intro.mp4 and the original brotown-intro.mp4 both live in
           git history. */
        src="/intro/loading-reef.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        onError={() => { minDoneRef.current = true; readyRef.current = true; beginTransition(); finish(); }}
      />
      {/* v2.3.818: persistent LOADING . . . caption + progress bar on the
          loading screen (owner).  The bar shows real prewarm progress when
          it's reporting; before that it runs an indeterminate sweep so the
          screen always reads as actively loading. */}
      <div className="bt-intro__loadwrap">
        <div className="bt-intro__loadlabel">LOADING . . .</div>
        <div className="bt-intro__track">
          {prog > 0
            ? <div className="bt-intro__fill" style={{ width: `${Math.round(prog * 100)}%` }} />
            : <div className="bt-intro__fill bt-intro__fill--indet" />}
        </div>
      </div>
    </div>
  );
};
