import React, { useEffect, useRef, useState } from 'react';

/* Fishing minigame.  Two phases:
   - "strike":  fish swims back-and-forth across a contextual rectangle
                with a hook + bait dangling from above. Player taps anywhere
                in the overlay to set the hook. Closer the fish's mouth is
                to the hook X at strike time, better the result.
   - "reeling": fish is hooked. Player drags upward to pull it out. When the
                drag distance reaches REEL_DISTANCE, the catch completes and
                onComplete(result) fires with the strike accuracy.

   `result` shape mirrors the global MINIGAME_REWARDS keys ('perfect' /
   'good' / 'ok' / 'miss') so the parent can route through the same reward
   path the gather-mini already uses. */

/* Sized + positioned to sit BETWEEN the two virtual joysticks at the
   bottom-center of the screen.  Joysticks live at bottom: calc(25vh + 70px),
   left/right: ~12px, width 110-130px — so we keep this overlay narrow (260px)
   and seat it in the same vertical band so the player can read the
   minigame without losing thumb position on either stick. */
const W = 260;
const H = 150;
const FISH_SHEET_SRC = '/sprites/fish/fish-08.png';   // 1024×72, 16 frames @ 64×72 (yellow tang)
const FISH_FRAME_W = 64;
const FISH_FRAME_H = 72;
/* The source AI-generated frames sweep through a yaw rotation rather
   than a true side-swim animation — frames 5..15 show the fish turning
   away from the camera, which reads weird on a side-scrolling minigame.
   Limit the cycle to the first 5 broadside frames and slow it down,
   then let the programmatic Y-bob below do most of the swim feel. */
const FISH_FRAMES = 5;
const FISH_FRAME_MS = 140;           // ~7 fps cycle through the broadside frames
const FISH_SPEED = 70;               // px/s, swim velocity
const HOOK_X = W / 2;
const HOOK_Y_BASE = 100;             // hook tip resting position (px from top)
const STRIKE_PERFECT_DIST = 10;      // px; mouth within this = perfect
const STRIKE_GOOD_DIST = 22;
const STRIKE_OK_DIST = 34;
const REEL_DISTANCE = 110;           // px of upward drag to complete the catch

export const FishingMinigame = ({ node, skill, onComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Phase is mirrored in both state (so the prompt text re-renders on
  // change) and ref (so the rAF loop and pointer handlers can read the
  // latest value without stale-closure).
  const [phase, setPhase] = useState('strike');     // 'strike' | 'reeling' | 'done'
  const phaseRef = useRef('strike');
  const fishX = useRef(20);
  const fishDir = useRef(1);
  const animFrame = useRef(0);
  const animAcc = useRef(0);
  const lastT = useRef(0);
  const flashUntil = useRef(0);          // miss flash timestamp
  const strikeResult = useRef(null);     // 'perfect' | 'good' | 'ok' once hooked

  // Reel state.
  const dragStartY = useRef(null);
  const reelProgress = useRef(0);

  // Load the sprite once.
  useEffect(() => {
    const img = new Image();
    img.src = FISH_SHEET_SRC;
    img.onload = () => { imgRef.current = img; setReady(true); };
    img.onerror = () => { console.warn('fish sprite failed to load:', FISH_SHEET_SRC); setReady(true); };
  }, []);

  // Animation + render loop.
  useEffect(() => {
    if (!ready) return;
    let rafId = 0;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    lastT.current = performance.now();

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastT.current) / 1000);
      lastT.current = now;

      const phase = phaseRef.current;

      // Advance fish swim only during 'strike'. During 'reeling' the fish
      // is hooked and rises with reelProgress.
      if (phase === 'strike') {
        const speedMul = now < flashUntil.current ? 2.0 : 1.0;
        fishX.current += fishDir.current * FISH_SPEED * speedMul * dt;
        if (fishX.current > W - FISH_FRAME_W - 8) {
          fishX.current = W - FISH_FRAME_W - 8;
          fishDir.current = -1;
        } else if (fishX.current < 8) {
          fishX.current = 8;
          fishDir.current = 1;
        }
        animAcc.current += (now - (lastT.current - dt * 1000)) || 0;
      }

      // Frame cycle (always advance, looks lively even when hooked).
      animAcc.current += dt * 1000;
      while (animAcc.current >= FISH_FRAME_MS) {
        animAcc.current -= FISH_FRAME_MS;
        animFrame.current = (animFrame.current + 1) % FISH_FRAMES;
      }

      // Compute fish Y based on phase: baseline during strike, lifting
      // toward the top during reeling in proportion to reelProgress.
      // A small sine bob during 'strike' fakes a swim-bob since the
      // source frames don't have a real fin-wag cycle.
      const baselineY = 40;
      const topY = 4;
      const swimBob = phase === 'strike' ? Math.sin(now / 220) * 3 : 0;
      const fy = (phase === 'reeling'
        ? baselineY + (topY - baselineY) * reelProgress.current
        : baselineY) + swimBob;

      // Slight horizontal "wiggle" tied to the same sine — adds a hint of
      // body undulation when the fish is swimming.
      const swimWiggle = phase === 'strike' ? Math.sin(now / 160) * 1.2 : 0;

      // Hook line follows: tip stays at fish's mouth Y during reeling,
      // otherwise hangs to HOOK_Y_BASE.
      const hookTipY = phase === 'reeling' ? fy + 36 : HOOK_Y_BASE;

      // ---- DRAW ----
      ctx.clearRect(0, 0, W, H);

      // Water tint / depth gradient — overlaid on the CSS bg for ripple feel.
      ctx.fillStyle = 'rgba(70, 140, 255, 0.10)';
      ctx.fillRect(0, 0, W, H);

      // Hook line (white-ish).
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(HOOK_X, 0);
      ctx.lineTo(HOOK_X, hookTipY);
      ctx.stroke();

      // Hook (a small "J" curve at the tip).
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(HOOK_X - 3, hookTipY - 2, 4, 0, Math.PI, false);
      ctx.stroke();

      // Bait (small red dot just below the hook curve).
      ctx.fillStyle = '#ff5e6c';
      ctx.beginPath();
      ctx.arc(HOOK_X - 3, hookTipY + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Fish.
      if (imgRef.current) {
        ctx.save();
        const sx = animFrame.current * FISH_FRAME_W;
        const drawX = fishX.current + swimWiggle;
        if (fishDir.current < 0) {
          // Mirror horizontally — translate then scale(-1, 1).
          ctx.translate(drawX + FISH_FRAME_W, fy);
          ctx.scale(-1, 1);
          ctx.drawImage(imgRef.current, sx, 0, FISH_FRAME_W, FISH_FRAME_H, 0, 0, FISH_FRAME_W, FISH_FRAME_H);
        } else {
          ctx.drawImage(imgRef.current, sx, 0, FISH_FRAME_W, FISH_FRAME_H, drawX, fy, FISH_FRAME_W, FISH_FRAME_H);
        }
        ctx.restore();
      }

      // Reel progress bar (right edge), only during reeling.
      if (phase === 'reeling') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(W - 14, 12, 6, H - 24);
        const fillH = (H - 24) * reelProgress.current;
        ctx.fillStyle = '#3dd497';
        ctx.fillRect(W - 14, 12 + (H - 24 - fillH), 6, fillH);
      }

      // Miss flash.
      if (now < flashUntil.current) {
        const k = (flashUntil.current - now) / 250;
        ctx.fillStyle = 'rgba(255,80,80,' + (k * 0.4) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ready]);

  // Pointer handlers.  Single overlay element captures all pointer input
  // inside the fishing rectangle; pointer capture keeps the drag stream
  // alive even if the finger leaves the overlay during reeling.
  const onPointerDown = (e) => {
    e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    const phase = phaseRef.current;

    if (phase === 'strike') {
      // Fish "mouth" sits at the leading edge of the sprite.  When swimming
      // right, the mouth is at fishX + (FISH_FRAME_W - 10).  When swimming
      // left, the mouth is at fishX + 10 (the sprite has been mirrored, so
      // the leading edge is now on the left).
      const mouthX = fishDir.current > 0
        ? fishX.current + (FISH_FRAME_W - 10)
        : fishX.current + 10;
      const dist = Math.abs(mouthX - HOOK_X);

      let result;
      if (dist <= STRIKE_PERFECT_DIST) result = 'perfect';
      else if (dist <= STRIKE_GOOD_DIST) result = 'good';
      else if (dist <= STRIKE_OK_DIST)   result = 'ok';
      else result = 'miss';

      if (result === 'miss') {
        // Brief red flash + speed-up; stay in 'strike' phase.
        flashUntil.current = performance.now() + 250;
        return;
      }
      // Snap fish onto hook.  Center its X on HOOK_X so it visually sits
      // on the bait, then lock direction (no more swimming).
      strikeResult.current = result;
      fishX.current = HOOK_X - FISH_FRAME_W / 2;
      phaseRef.current = 'reeling';
      setPhase('reeling');
      return;
    }

    if (phase === 'reeling') {
      dragStartY.current = e.clientY;
    }
  };

  const onPointerMove = (e) => {
    if (phaseRef.current !== 'reeling') return;
    if (dragStartY.current == null) return;
    const dragged = Math.max(0, dragStartY.current - e.clientY);
    // Accumulate progress incrementally — partial drags add up between
    // pointerdown/up cycles. dragStartY resets on pointerup, so each new
    // drag starts a new delta from current Y.
    const delta = dragged / REEL_DISTANCE;
    reelProgress.current = Math.min(1, reelProgress.current + delta);
    dragStartY.current = e.clientY;     // re-base so the delta is incremental, not absolute

    if (reelProgress.current >= 1 && phaseRef.current === 'reeling') {
      phaseRef.current = 'done';
      setPhase('done');
      // Fire after a short delay so the player sees the meter top out.
      setTimeout(() => onComplete && onComplete({ accuracy: strikeResult.current || 'good' }), 160);
    }
  };

  const onPointerUp = (e) => {
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
    dragStartY.current = null;
  };

  const overlayStyle = {
    position: 'fixed',
    left: '50%',
    /* Bottom-center, sitting in the same vertical band as the two
       joysticks so it reads as "between" them. zIndex high enough to
       sit above any other in-game overlay. */
    bottom: 'calc(25vh + 50px)',
    transform: 'translateX(-50%)',
    width: W,
    height: H,
    zIndex: 100,
    background: 'linear-gradient(180deg, #5b8cff 0%, #2541b0 100%)',
    border: '2px solid rgba(0,0,0,0.55)',
    borderRadius: 8,
    overflow: 'hidden',
    touchAction: 'none',
    boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
    fontFamily: 'VT323, monospace',
    color: '#fff',
  };

  return (
    <div
      style={overlayStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Top label */}
      <div style={{
        position: 'absolute',
        top: 6, left: 8,
        fontSize: 15, fontWeight: 700,
        letterSpacing: '.06em',
        textShadow: '0 1px 2px rgba(0,0,0,.7)',
        pointerEvents: 'none',
      }}>🎣 FISHING</div>

      {/* Phase prompt */}
      <div style={{
        position: 'absolute',
        bottom: 6, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 16, fontWeight: 700,
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.7)',
        pointerEvents: 'none',
      }}>
        {phase === 'reeling' ? 'DRAG UP TO REEL!' : 'TAP WHEN FISH IS OVER THE HOOK'}
      </div>

      {/* Close × */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); onCancel && onCancel(); }}
        style={{
          position: 'absolute',
          top: 4, right: 4,
          width: 26, height: 26,
          border: 'none',
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          borderRadius: 4,
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 2,
        }}>×</button>

      {/* Render layer */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
};
