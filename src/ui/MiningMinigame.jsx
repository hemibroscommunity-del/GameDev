import React, { useEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '../data/gameSystems.js';

/* Mining minigame.  Phases:
   - "aim":      rocks-bg image with a vertical slider on the right.
                 Indicator ping-pongs at 60 fps via direct DOM transform
                 (no React re-render per frame — keeps the parent game
                 frame budget intact).  A green band sits at a random Y
                 with the copper-ore image inside.  Tap MINE! to lock.
   - "success":  extract-success.mp4 plays.  When it ends, the copper
                 thumbnail flies from the stage centre to the inventory
                 bag icon (mirrors the WoodChopMinigame fly-to-bag).
   - "flying":   CSS transition on the thumbnail; onTransitionEnd of
                 opacity calls finish('good').
   - "fail":     extract-fail.mp4 plays.  finish('miss') on end. */

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
  const indicatorPos = useRef(0);
  const indicatorElRef = useRef(null);

  const bandCentre = useRef(0.3 + Math.random() * 0.4);
  const startTime = useRef(Date.now());

  const [flying, setFlying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* Animate the indicator by writing transform directly to the DOM.
     Avoids React re-renders at 60 fps. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (phaseRef.current !== 'aim') return;
      const t = (Date.now() - startTime.current) / OSC_MS;
      const x = t % 2;
      const pos = x < 1 ? x : 2 - x;
      indicatorPos.current = pos;
      const el = indicatorElRef.current;
      if (el) el.style.transform = 'translate3d(0,' + (pos * SLIDER_H - 1.5) + 'px,0)';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const strike = () => {
    if (phaseRef.current !== 'aim') return;
    const pos = indicatorPos.current;
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

  /* Schedule the fly transition next frame so the start values render
     first. */
  useEffect(() => {
    if (!flying) return;
    const id = requestAnimationFrame(() => setFlyTarget(true));
    return () => cancelAnimationFrame(id);
  }, [flying]);

  const bandTop = (bandCentre.current - BAND_FRAC / 2) * SLIDER_H;
  const bandH = BAND_FRAC * SLIDER_H;

  return (
    <>
      <div className="bt-mining" style={{ width: W, height: H }}>
        <div className="bt-mining-row">
          <div className="bt-mining-stage" style={{ width: STAGE_W, height: STAGE_H }}>
            {phase === 'aim' && (
              <img src={ROCKS_BG} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
            )}
            {phase === 'success' && (
              <video src={SUCCESS_VIDEO} autoPlay playsInline preload="auto"
                onEnded={() => setFlying(true)} onError={() => setFlying(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {phase === 'fail' && (
              <video src={FAIL_VIDEO} autoPlay playsInline preload="auto"
                onEnded={() => finish('miss')} onError={() => finish('miss')}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {phase === 'aim' && (
            <div className="bt-mining-slider" style={{ width: SLIDER_W, height: SLIDER_H }}>
              <div className="bt-mining-band" style={{ top: bandTop, height: bandH }}>
                <img src={COPPER_THUMB} alt="" />
              </div>
              <div className="bt-mining-indicator" ref={indicatorElRef} />
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

      {/* Fly-to-bag — copper thumbnail glides from the stage centre to
          the bag icon in the bottom-left of the dashboard.  Five
          properties transition; gate finish() to onTransitionEnd of
          opacity so it only fires once. */}
      {flying && (
        <img
          src={COPPER_THUMB}
          alt=""
          onTransitionEnd={(e) => { if (e.propertyName === 'opacity') finish('good'); }}
          style={{
            position: 'fixed',
            left: flyTarget ? 'calc(100vw / 12)' : '50%',
            bottom: flyTarget ? '4vh' : 'calc(var(--dash-h) + 50px + 80px)',
            width: flyTarget ? 28 : 56,
            height: flyTarget ? 28 : 56,
            opacity: flyTarget ? 0 : 1,
            transform: 'translate(-50%, 0)',
            transition: 'left 380ms cubic-bezier(.4,0,.6,1), bottom 380ms cubic-bezier(.4,0,.6,1), width 380ms ease-out, height 380ms ease-out, opacity 380ms ease-in 80ms',
            pointerEvents: 'none',
            zIndex: 200,
            imageRendering: 'pixelated',
          }}
        />
      )}
    </>
  );
};
