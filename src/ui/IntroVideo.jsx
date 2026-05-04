import React, { useEffect, useRef, useState } from 'react';

/* Bro Town intro overlay — shown once after character creation.
   ~3 s of video, then a 1 s opacity fade reveals the game world.
   Town zone music starts on mount; BT_AUDIO.startZoneAmbient
   dedupes per-zone, so the game loop's later auto-start is a no-op. */
export const IntroVideo = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete && onComplete();
  };

  useEffect(() => {
    try { window.BT_AUDIO && window.BT_AUDIO.startZoneAmbient('town'); } catch (e) {}

    const fadeTimer = setTimeout(() => setFading(true), 3000);
    const doneTimer = setTimeout(finish, 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className={'bt-intro' + (fading ? ' bt-intro--fading' : '')}>
      <video
        src="/intro/brotown-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onError={finish}
      />
    </div>
  );
};
