import React, { useEffect, useRef, useState } from 'react';

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

export const IntroVideo = ({ onComplete, waitFor }) => {
  const [fading, setFading] = useState(false);
  const [waiting, setWaiting] = useState(false);   // assets still loading past MIN_MS
  const finishedRef = useRef(false);
  const minDoneRef = useRef(false);
  const readyRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete && onComplete();
  };

  useEffect(() => {
    try { window.BT_AUDIO && window.BT_AUDIO.startZoneAmbient('town'); } catch (e) {}

    let cancelled = false;
    const maybeFinish = () => {
      if (cancelled || finishedRef.current) return;
      if (minDoneRef.current && readyRef.current) {
        setWaiting(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={'bt-intro' + (fading ? ' bt-intro--fading' : '')}>
      <video
        src="/intro/brotown-intro.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        onError={() => { minDoneRef.current = true; readyRef.current = true; finish(); }}
      />
      {waiting && (
        <div className="bt-intro__loading">Loading…</div>
      )}
    </div>
  );
};
