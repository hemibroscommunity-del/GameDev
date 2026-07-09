import React, { useEffect, useRef, useState } from 'react';

/* Mayor Bro welcome greeting (v2.3.1219) — a talking-head dialog card shown
   ONCE per browser, right after the loading intro fades, when a freshly
   created player first lands in town. It's the payoff to the "washing
   ashore" opening beat the loading screen sets up (IntroVideo.jsx): the
   Mayor greets the newcomer with owner-supplied art + voice.

   iPhone Safari (the primary platform) blocks autoplay-WITH-SOUND unless the
   play() call is driven by a user tap, so this is deliberately tap-to-play:
   the poster frame + caption are on screen immediately, and a tap starts the
   clip with sound. The caption is ALWAYS visible, so the line lands even if
   the player skips before (or without) hearing the audio. */

const SEEN_KEY = 'bt_mayor_welcome_seen';   // localStorage flag — once per browser

/* Exported so the join flow can decide whether to queue the greeting after
   the loading intro without duplicating the storage-key string. */
export const mayorWelcomeSeen = () => {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
};
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} };

export const MayorGreeting = ({ onComplete }) => {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);   // player tapped play at least once
  const [ended, setEnded] = useState(false);       // clip finished
  const closedRef = useRef(false);
  const prevZoneRef = useRef('town');

  /* v2.3.1219: the Mayor speaks over SILENCE — fade the zone background music
     out while the card is up so nothing competes with his voice (his audio
     rides the <video> element, not BT_AUDIO's Web Audio graph, so it's
     untouched).  The town music resumes when the card closes.  stopAmbient
     doesn't clear _currentZoneAmbient, so the resume must null it first or
     startZoneAmbient early-returns. */
  useEffect(() => {
    try {
      const A = window.BT_AUDIO;
      if (A) {
        prevZoneRef.current = A._currentZoneAmbient || 'town';
        A.stopAmbient(true);
      }
    } catch (e) {}
    return () => {
      try {
        const A = window.BT_AUDIO;
        if (A) { A._currentZoneAmbient = null; A.startZoneAmbient(prevZoneRef.current || 'town'); }
      } catch (e) {}
    };
  }, []);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    markSeen();
    try { const v = videoRef.current; if (v) { v.pause(); v.src = ''; } } catch (e) {}
    onComplete && onComplete();
  };

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    try {
      v.muted = false;
      v.currentTime = 0;
      const p = v.play();
      /* If iOS still refuses sound, fall back to a muted play so the animation
         at least runs; the caption already carries the message. */
      if (p && p.catch) p.catch(() => {
        try { v.muted = true; v.play(); } catch (e) {}
      });
    } catch (e) {}
  };

  return (
    <div className="bt-mayor" role="dialog" aria-label="Mayor Bro welcome">
      <div className="bt-mayor__scrim" onClick={close} />
      <div className="bt-mayor__card">
        <div className="bt-mayor__portrait" onClick={started ? undefined : play}>
          <video
            ref={videoRef}
            src="/intro/mayor-welcome.mp4"
            poster="/intro/mayor-welcome-poster.jpg"
            playsInline
            preload="auto"
            onEnded={() => setEnded(true)}
          />
          {!started && (
            <button className="bt-mayor__play" onClick={play} aria-label="Play the Mayor's greeting">
              <span className="bt-mayor__playicon">▶</span>
              <span className="bt-mayor__playhint">Tap to hear the Mayor</span>
            </button>
          )}
        </div>
        <div className="bt-mayor__name">Mayor Bro</div>
        <div className="bt-mayor__bubble">
          &ldquo;Another one washes ashore. Relax &mdash; everyone starts as driftwood.&rdquo;
        </div>
        <button className="bt-mayor__continue" onClick={close}>
          {ended ? 'Enter Bro Town →' : 'Skip →'}
        </button>
      </div>
    </div>
  );
};
