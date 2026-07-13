import React, { useEffect, useRef } from 'react';

/* Mayor Bro welcome greeting (v2.3.1219) — a compact talking-head dialogue
   window shown ONCE per browser, right after the loading intro fades, when a
   freshly created player first lands in town. It's the payoff to the "washing
   ashore" opening beat the loading screen sets up (IntroVideo.jsx): the Mayor
   greets the newcomer with owner-supplied art + voice.

   Owner feedback:
   - A small dialogue window anchored over the DASHBOARD area at the bottom of
     the screen — not a fullscreen modal — so it reads like an RPG NPC dialogue
     box and doesn't cover the world. Non-blocking (no scrim).
   - AUTOPLAYS on appear and AUTO-DISMISSES when the ~6 s clip ends; no tap
     needed. iPhone Safari can block autoplay-WITH-SOUND unless it's driven by
     a tap — but the window opens seconds after the player taps PLAY to join,
     so the tap's activation usually still covers it. If Safari refuses sound,
     we retry MUTED so the clip still plays (and still auto-dismisses) with the
     caption carrying the line. A safety timer guarantees it disappears even if
     'ended' never fires (video error / stalled decode).

   v2.3.1221: swapped mayor-welcome.{mp4,poster.jpg} for the owner's preferred
   higher-detail Mayor clip (keyed white->black, downscaled to 544, audio
   loudnorm'd). Asset paths + all behaviour unchanged. */

const SEEN_KEY = 'bt_mayor_welcome_seen';   // localStorage flag — once per browser
const SAFETY_MS = 9000;                       // fallback close if 'ended' never fires; generous
                                              // (> clip's ~6 s) so a slightly delayed start still completes

/* Exported so the join flow can decide whether to queue the greeting after
   the loading intro without duplicating the storage-key string. */
export const mayorWelcomeSeen = () => {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
};
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} };

export const MayorGreeting = ({ onComplete }) => {
  const videoRef = useRef(null);
  const closedRef = useRef(false);
  const prevZoneRef = useRef('town');

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    markSeen();
    try { const v = videoRef.current; if (v) { v.pause(); v.src = ''; } } catch (e) {}
    onComplete && onComplete();
  };

  /* Mount: silence the zone music, autoplay the clip, and arm the safety
     timer. The Mayor speaks over SILENCE — fade the zone background music out
     so nothing competes with his voice (his audio rides the <video> element,
     not BT_AUDIO's Web Audio graph, so it's untouched); the town music resumes
     when the window closes. stopAmbient doesn't clear _currentZoneAmbient, so
     the resume must null it first or startZoneAmbient early-returns. */
  useEffect(() => {
    try {
      const A = window.BT_AUDIO;
      if (A) {
        prevZoneRef.current = A._currentZoneAmbient || 'town';
        A.stopAmbient(true);
      }
    } catch (e) {}

    const v = videoRef.current;
    if (v) {
      try {
        v.muted = false;
        v.currentTime = 0;
        const p = v.play();
        /* iOS refused sound outside a fresh gesture -> retry muted so it still
           plays and still auto-dismisses; the caption carries the line. */
        if (p && p.catch) p.catch(() => { try { v.muted = true; v.play().catch(() => {}); } catch (e) {} });
      } catch (e) {}
    }

    const safety = setTimeout(close, SAFETY_MS);
    return () => {
      clearTimeout(safety);
      try {
        const A = window.BT_AUDIO;
        if (A) { A._currentZoneAmbient = null; A.startZoneAmbient(prevZoneRef.current || 'town'); }
      } catch (e) {}
    };
  }, []);

  return (
    <div className="bt-mayor" role="dialog" aria-label="Mayor Bro welcome">
      <div className="bt-mayor__win">
        <div className="bt-mayor__portrait">
          <video
            ref={videoRef}
            src="/intro/mayor-welcome.mp4"
            poster="/intro/mayor-welcome-poster.jpg"
            playsInline
            preload="auto"
            onEnded={close}
            onError={close}
          />
        </div>
        <div className="bt-mayor__body">
          <div className="bt-mayor__name">Mayor Bro</div>
          <div className="bt-mayor__line">
            &ldquo;Another one washes ashore. Relax &mdash; everyone starts as driftwood.&rdquo;
          </div>
        </div>
        {/* v2.3.1239: owner feedback — SKIP dismisses the whole greeting
            immediately.  It calls the same close() the 'ended'/safety-timer
            path uses, so it marks the once-per-browser seen flag, restores
            the zone music, and fires onComplete — nothing downstream breaks. */}
        <button
          type="button"
          className="bt-mayor__skip"
          onClick={close}
          aria-label="Skip Mayor intro"
        >
          Skip
        </button>
      </div>
    </div>
  );
};
