import React, { useEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '@/data/gameSystems.js';

/* Helper: short-lived "reeling" sample play. The reeling clip is ~2.5 s
   so a single play covers the whole drag-up motion most of the time;
   if the player's drag drags it out longer, we cycle the sound on
   pointermove ticks. _safePlay catches errors so an unloaded sample
   can't bubble up. */
function _fishPlay(key, opts) {
  try { BT_AUDIO.play(key, opts); } catch (e) {}
}

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
/* Default fish sprite (yellow tang).  Overridable per-tier via the
   fishSheetSrc prop — e.g. Clownfish (FISHING_TIERS lvl 6) passes
   /sprites/fish/fish-02.png. All swim strips share the same shape:
   1024×72, 16 frames @ 64×72, broadside left-facing. */
const DEFAULT_FISH_SHEET_SRC = '/sprites/fish/fish-08.png';
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
/* Hook miss-bounce: when the player taps too early (no fish over the
   hook), the hook reels up and then back down over HOOK_MISS_MS as
   visual feedback. Lifts HOOK_LIFT px at the peak (sine arc). */
const HOOK_MISS_MS = 550;
const HOOK_LIFT = 70;

export const FishingMinigame = ({ node, skill, fishSheetSrc, onComplete, onCancel }) => {
  const sheetSrc = fishSheetSrc || DEFAULT_FISH_SHEET_SRC;
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Phase is mirrored in both state (so the prompt text re-renders on
  // change) and ref (so the rAF loop and pointer handlers can read the
  // latest value without stale-closure).
  const [phase, setPhase] = useState('strike');     // 'strike' | 'reeling' | 'throwing' | 'done'
  const phaseRef = useRef('strike');
  const fishX = useRef(20);
  const fishDir = useRef(1);
  const animFrame = useRef(0);
  const animAcc = useRef(0);
  const lastT = useRef(0);
  const flashUntil = useRef(0);          // miss flash timestamp
  const hookMissStart = useRef(0);       // miss-bounce start timestamp (0 = idle)
  const strikeResult = useRef(null);     // 'perfect' | 'good' | 'ok' once hooked
  const throwStart = useRef(0);          // timestamp when throw-out animation begins

  // Reel state.
  const dragStartY = useRef(null);
  const reelProgress = useRef(0);

  /* Active reeling-SFX handle so we can stop the clip early. The
     reeling sample is ~2.5 s; if a fast drag completes the catch in
     under that window we don't want the sound dragging on after the
     fish is already pulled out. _stopReel() cleans up + nulls the
     ref. Calling _startReel again replaces any in-flight handle so
     overlapping doesn't accumulate. */
  const reelSrcRef = useRef(null);
  const _stopReel = () => {
    const h = reelSrcRef.current;
    if (h) {
      try { h.src.stop(0); } catch (e) {}
      try { h.src.disconnect(); } catch (e) {}
      try { h.gain.disconnect(); } catch (e) {}
      reelSrcRef.current = null;
    }
  };
  const _startReel = (vol) => {
    _stopReel();
    const h = (() => { try { return BT_AUDIO.play('fishing-reeling', { vol: vol }); } catch (e) { return null; } })();
    if (h && h.src) {
      reelSrcRef.current = h;
      /* If the sample finishes naturally (player drag matches sample
         length), drop the ref so the next _stopReel/_startReel doesn't
         try to disconnect a node that's already gone. */
      try { h.src.onended = () => { if (reelSrcRef.current === h) reelSrcRef.current = null; }; } catch (e) {}
    }
  };

  // Lure-drop SFX fires once on mount — the splash that signals the
  // bait has hit the water. Played eagerly via useEffect with [] so it
  // doesn't re-fire on phase changes. Cleanup on unmount also kills
  // any in-flight reeling clip — covers the cancel path.
  useEffect(() => {
    _fishPlay('fishing-lure-drop', { vol: 0.7 });
    return () => { _stopReel(); };
  }, []);

  // Stop the reeling clip whenever phase moves away from 'reeling'
  // (catch complete → 'throwing' → 'done', or cancel → unmount).
  useEffect(() => {
    if (phase !== 'reeling') _stopReel();
  }, [phase]);

  // Throw-to-bag state — when the in-canvas throw finishes, flip
  // setFlying(true) and one rAF later setFlyTarget(true) so a fixed-
  // position element CSS-transitions from above the rectangle to the
  // bag icon's approximate location at the bottom-left of the dashboard.
  const [flying, setFlying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(false);

  // Load the sprite once.  After load, copy into an offscreen canvas
  // and zero the alpha on any near-white pixel — strips the residual
  // halo ffmpeg's colorkey leaves around the fish.  SKIPPED for sprites
  // whose filename contains '-v2': those were extracted with a corner
  // flood-fill bg mask that preserves stripe-whites inside the fish
  // silhouette (e.g. clownfish), so blanket-zeroing white pixels would
  // re-erase the very stripes the v2 mask was meant to keep.
  useEffect(() => {
    const skipDehalo = sheetSrc.includes('-v2');
    const img = new Image();
    img.src = sheetSrc;
    img.onload = () => {
      if (skipDehalo) {
        imgRef.current = img;
        setReady(true);
        return;
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 72;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      try {
        const id = cx.getImageData(0, 0, c.width, c.height);
        const px = id.data;
        for (let i = 0; i < px.length; i += 4) {
          // Zero alpha on any pixel where all three channels are bright.
          // Threshold 220 catches the halo while preserving the yellow
          // tang's bright body (which has yellow ~ R=240, G=210, B=40).
          if (px[i] > 220 && px[i + 1] > 220 && px[i + 2] > 220) {
            px[i + 3] = 0;
          }
        }
        cx.putImageData(id, 0, 0);
      } catch (e) {
        // Cross-origin tainting would block getImageData; sprite is
        // local so this shouldn't fire, but fall back to the raw img.
      }
      imgRef.current = c;
      setReady(true);
    };
    img.onerror = () => { console.warn('fish sprite failed to load:', sheetSrc); setReady(true); };
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
      let fy = (phase === 'reeling'
        ? baselineY + (topY - baselineY) * reelProgress.current
        : baselineY) + swimBob;

      // Slight horizontal "wiggle" tied to the same sine — adds a hint of
      // body undulation when the fish is swimming.
      const swimWiggle = phase === 'strike' ? Math.sin(now / 160) * 1.2 : 0;

      // Throw-out animation overrides Y/scale/alpha during the 250ms
      // 'throwing' phase — the fish lifts above the canvas, shrinks,
      // and fades, then we hand off to the external fly-to-bag element.
      let throwScale = 1;
      let throwAlpha = 1;
      if (phase === 'throwing') {
        const tThrow = Math.min(1, (now - throwStart.current) / 250);
        fy = topY - tThrow * 90;          // rise from top of canvas to well above
        throwScale = 1 - tThrow * 0.4;
        throwAlpha = 1 - tThrow;
        if (tThrow >= 1 && !flying) {
          setFlying(true);
        }
      }

      // Hook line follows: tip stays at fish's mouth Y during reeling
      // and throwing, otherwise hangs to HOOK_Y_BASE — except during a
      // miss-bounce where it arcs up and back down on a sine curve.
      let strikeHookY = HOOK_Y_BASE;
      if (phase === 'strike' && hookMissStart.current > 0) {
        const tMiss = (now - hookMissStart.current) / HOOK_MISS_MS;
        if (tMiss >= 1) {
          hookMissStart.current = 0;       // bounce done — back to idle
        } else {
          strikeHookY = HOOK_Y_BASE - Math.sin(tMiss * Math.PI) * HOOK_LIFT;
        }
      }
      const hookTipY = (phase === 'reeling' || phase === 'throwing')
        ? fy + 36
        : strikeHookY;

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
        ctx.globalAlpha = throwAlpha;
        const sx = animFrame.current * FISH_FRAME_W;
        const drawX = fishX.current + swimWiggle;
        // Source sprite already faces LEFT.  Mirror only when the fish
        // is swimming RIGHT (inverse of the previous condition, which
        // was backwards — fish appeared facing the wrong way).
        const mirror = phase === 'strike' && fishDir.current > 0;
        // While reeling or throwing, rotate 90° CW so the mouth (left
        // edge of the left-facing sprite) points UP — visually consistent
        // with the fish hanging from a hook in its mouth.
        const rotateMouthUp = (phase === 'reeling' || phase === 'throwing');

        ctx.translate(drawX + FISH_FRAME_W / 2, fy + FISH_FRAME_H / 2);
        if (rotateMouthUp) {
          ctx.rotate(Math.PI / 2);
        } else if (mirror) {
          ctx.scale(-1, 1);
        }
        if (throwScale !== 1) ctx.scale(throwScale, throwScale);
        ctx.drawImage(imgRef.current, sx, 0, FISH_FRAME_W, FISH_FRAME_H, -FISH_FRAME_W / 2, -FISH_FRAME_H / 2, FISH_FRAME_W, FISH_FRAME_H);
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
      // Ignore taps while the hook is mid-bounce from a previous miss —
      // the player can't strike while the hook isn't in position anyway.
      if (hookMissStart.current > 0) return;

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
        // Tapped too early — reel the hook up and back down as feedback.
        // Drop the previous red-flash + speed-up; the hook bounce alone
        // communicates "missed" without punishing the player.
        hookMissStart.current = performance.now();
        // Reeling sound for the miss-recovery (hook winds back up to
        // the surface). Volume halved vs the catch-reel so it reads as
        // less effortful. Cut it after HOOK_MISS_MS so the clip doesn't
        // outlast the visible bounce.
        _startReel(0.45);
        setTimeout(_stopReel, HOOK_MISS_MS);
        return;
      }
      // Snap fish onto hook.  Center its X on HOOK_X so it visually sits
      // on the bait, then lock direction (no more swimming).
      strikeResult.current = result;
      fishX.current = HOOK_X - FISH_FRAME_W / 2;
      phaseRef.current = 'reeling';
      setPhase('reeling');
      // Strike-success splash — fish takes the hook.
      _fishPlay('fishing-fish-on-hook', { vol: 0.75 });
      return;
    }

    if (phase === 'reeling') {
      dragStartY.current = e.clientY;
      // Reeling SFX kicks off when the player starts dragging up.
      // Replaces any in-flight handle so it doesn't double up on
      // multi-tap reels. The phase-change useEffect cuts it the
      // moment the catch transitions to 'throwing'.
      _startReel(0.7);
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
      // Hand off to the throw-out animation: fish lifts above the
      // canvas (250ms), then setFlying(true) handoff to the external
      // fixed-position element that flies to the bag icon.  onComplete
      // (inventory + XP) fires when the external transition ends.
      phaseRef.current = 'throwing';
      setPhase('throwing');
      throwStart.current = performance.now();
    }
  };

  const onPointerUp = (e) => {
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
    dragStartY.current = null;
  };

  // Once setFlying(true) trips, schedule the CSS transition by toggling
  // setFlyTarget(true) in the next frame so the transition has both
  // start and end states to animate between.
  useEffect(() => {
    if (!flying) return;
    const id = requestAnimationFrame(() => setFlyTarget(true));
    return () => cancelAnimationFrame(id);
  }, [flying]);

  // Generate a 64×72 first-frame data URL from the dehalo'd offscreen
  // canvas so the fly-to-bag <img> renders the same clean (no-halo)
  // sprite that's used inside the canvas.  Computed once after load.
  const [flyDataUrl, setFlyDataUrl] = useState(null);
  useEffect(() => {
    if (!ready || !imgRef.current) return;
    try {
      const c = document.createElement('canvas');
      c.width = FISH_FRAME_W;
      c.height = FISH_FRAME_H;
      const cx = c.getContext('2d');
      cx.drawImage(imgRef.current, 0, 0, FISH_FRAME_W, FISH_FRAME_H, 0, 0, FISH_FRAME_W, FISH_FRAME_H);
      setFlyDataUrl(c.toDataURL('image/png'));
    } catch {}
  }, [ready]);

  const overlayStyle = {
    position: 'fixed',
    left: '50%',
    /* Bottom-center, sitting in the same vertical band as the two
       joysticks so it reads as "between" them. zIndex high enough to
       sit above any other in-game overlay. */
    bottom: 'calc(var(--dash-h) + 50px)',
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
    <>
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
        {phase === 'throwing' ? 'CAUGHT!' : phase === 'reeling' ? 'DRAG UP TO REEL!' : 'TAP WHEN FISH IS OVER THE HOOK'}
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

    {/* Fly-to-bag — sibling of the overlay so it can render outside the
        overlay's overflow:hidden box. Starts above the rectangle's top
        edge (where the in-canvas throw left off) and CSS-transitions
        toward the Bag icon at the bottom-left of the dashboard.  The
        Bag icon sits in the dashboard's icon row (bottom 30% of the
        25vh dashboard); approx coords: bottom 4vh, left 100vw/12. */}
    {flying && flyDataUrl && (
      <img
        src={flyDataUrl}
        alt=""
        /* Gate to opacity — the fly element transitions 5 properties,
           and without this guard onComplete (and the inventory + XP write
           it triggers) ran 5× per catch. */
        onTransitionEnd={(e) => { if (e.propertyName === 'opacity') onComplete && onComplete({ accuracy: strikeResult.current || 'good' }); }}
        style={{
          position: 'fixed',
          left: flyTarget ? 'calc(100vw / 12)' : '50%',
          bottom: flyTarget ? '4vh' : 'calc(var(--dash-h) + 50px + 90px)',
          width: flyTarget ? 28 : 56,
          height: flyTarget ? 32 : 64,
          opacity: flyTarget ? 0 : 1,
          transform: 'translate(-50%, 0) rotate(90deg)',
          transformOrigin: 'center',
          transition: 'left 380ms cubic-bezier(.4,0,.6,1), bottom 380ms cubic-bezier(.4,0,.6,1), width 380ms ease-out, height 380ms ease-out, opacity 380ms ease-in 80ms',
          pointerEvents: 'none',
          zIndex: 200,
          imageRendering: 'auto',
        }}
      />
    )}
    </>
  );
};
