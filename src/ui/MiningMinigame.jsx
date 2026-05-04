import React, { useEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '../data/gameSystems.js';

/* Mining minigame.  Three phases:
   - "aim":      rocks-bg image is the backdrop, vertical slider on the
                 right ping-pongs.  A green band sits at a random Y; the
                 copper-ore image is centred inside the band so the
                 player can see what they're aiming for.  Tap MINE! to
                 lock the indicator.
   - "success":  indicator landed inside the band.  extract-success.mp4
                 plays (top-left ore extracted).  onComplete fires after
                 the video ends with accuracy='good'.
   - "fail":     missed the band.  extract-fail.mp4 plays (gray rock
                 smashed).  onComplete fires with accuracy='miss'.
*/

const W = 280;
const H = 290;

const ROCKS_BG = '/minigames/mining/rocks-bg.jpg';
const COPPER_THUMB = '/minigames/mining/copper-ore.png';
const SUCCESS_VIDEO = '/minigames/mining/extract-success.mp4';
const FAIL_VIDEO = '/minigames/mining/extract-fail.mp4';

const STAGE_W = 170;
const STAGE_H = 190;
const SLIDER_W = 22;
const SLIDER_H = 190;
const OSC_MS = 1400;
const BAND_FRAC = 0.22;

export const MiningMinigame = ({ node, skill, onComplete, onCancel }) => {
  const [phase, setPhase] = useState('aim');
  const phaseRef = useRef('aim');
  const indicatorRef = useRef(0);
  const trackRef = useRef(null);
  const [, force] = useState(0);

  const bandCentre = useRef(0.3 + Math.random() * 0.4);
  const startTime = useRef(Date.now());

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (phaseRef.current !== 'aim') return;
      const t = (Date.now() - startTime.current) / OSC_MS;
      const x = (t % 2);
      indicatorRef.current = x < 1 ? x : 2 - x;
      force(n => (n + 1) & 0xff);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const strike = () => {
    if (phaseRef.current !== 'aim') return;
    const pos = indicatorRef.current;
    const dist = Math.abs(pos - bandCentre.current);
    const hit = dist <= BAND_FRAC / 2;
    BT_AUDIO.beep(hit ? 700 : 200, 0.04, 0.06, hit ? 'square' : 'sawtooth');
    setPhase(hit ? 'success' : 'fail');
  };

  const finish = (accuracy) => {
    if (phaseRef.current === 'done') return;
    phaseRef.current = 'done';
    setPhase('done');
    onComplete && onComplete({ accuracy });
  };

  const bandTop = (bandCentre.current - BAND_FRAC / 2) * SLIDER_H;
  const bandH = BAND_FRAC * SLIDER_H;
  const indicatorY = indicatorRef.current * SLIDER_H;

  return (
    <div className="bt-mining" style={{ width: W, height: H }}>
      <div className="bt-mining-row">
        <div className="bt-mining-stage" style={{ width: STAGE_W, height: STAGE_H }}>
          {phase === 'aim' && (
            <img src={ROCKS_BG} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          )}
          {phase === 'success' && (
            <video src={SUCCESS_VIDEO} autoPlay playsInline preload="auto"
              onEnded={() => finish('good')} onError={() => finish('good')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {phase === 'fail' && (
            <video src={FAIL_VIDEO} autoPlay playsInline preload="auto"
              onEnded={() => finish('miss')} onError={() => finish('miss')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {phase === 'aim' && (
          <div className="bt-mining-slider" ref={trackRef} style={{ width: SLIDER_W, height: SLIDER_H }}>
            <div className="bt-mining-band" style={{ top: bandTop, height: bandH }}>
              <img src={COPPER_THUMB} alt="" />
            </div>
            <div className="bt-mining-indicator" style={{ top: indicatorY }} />
          </div>
        )}
      </div>

      <div className="bt-mining-controls">
        {phase === 'aim' && (
          <>
            <button className="bt-mining-strike" onClick={strike}>⛏ MINE!</button>
            <button className="bt-mining-cancel" onClick={onCancel}>✕</button>
          </>
        )}
        {phase !== 'aim' && phase !== 'done' && (
          <div className="bt-mining-status">{phase === 'success' ? 'Extracting…' : 'Missed!'}</div>
        )}
      </div>
    </div>
  );
};
