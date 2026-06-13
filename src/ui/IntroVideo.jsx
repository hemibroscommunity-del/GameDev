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

export const IntroVideo = ({ onComplete, waitFor }) => {
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
  }, []);

  return (
    <div className={'bt-intro' + (fading ? ' bt-intro--fading' : '')}>
      <video
        /* v2.3.809: ocean clip (owner art) — the loading screen now leads
           into the planned opening beat of the player washing ashore.
           Replaces the original brotown-intro.mp4 (in git history). */
        src="/intro/ocean-intro.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        onError={() => { minDoneRef.current = true; readyRef.current = true; finish(); }}
      />
      {prog > 0 && prog < 1 && (
        <div style={{
          position: 'absolute',
          left: '20%',
          right: '20%',
          bottom: 36,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            height: 5,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.round(prog * 100)}%`,
              height: '100%',
              borderRadius: 3,
              background: '#5b52ff',
              transition: 'width .15s linear',
            }} />
          </div>
          <div style={{
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            color: 'rgba(232,234,248,0.75)',
            fontFamily: "'Source Sans 3', sans-serif",
          }}>LOADING {Math.round(prog * 100)}%</div>
        </div>
      )}
      {waiting && prog >= 1 && (
        <div className="bt-intro__loading">Loading…</div>
      )}
    </div>
  );
};
