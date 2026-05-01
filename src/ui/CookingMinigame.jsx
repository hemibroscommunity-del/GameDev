import React, { useEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '../data/gameSystems.js';

/* Cooking minigame.
   - Vertical slider on the left, gradient white → gold → charcoal black.
   - An indicator (a horizontal line) starts at the top (RAW = white) and
     descends continuously toward the bottom (BURNT = black) over
     COOK_DURATION_MS.
   - Golden zone = the middle GOLDEN_FRAC band of the slider.
   - First tap inside the golden zone: the fish FLIPS (sprite mirrors
     horizontally) — visually communicates "you cooked side 1, now do
     side 2".
   - Second tap inside the golden zone: success → onComplete('cooked').
   - Indicator passes the bottom of the golden zone before the second
     tap → onComplete('burnt') and the overlay closes.
   - Taps outside the golden zone are no-ops (no progress, no penalty).

   onComplete(kind) is called exactly once per session with kind =
   'cooked' or 'burnt'.  The parent (BroTown.jsx) consumes a raw fish
   from R.inventory and writes either cooked_<fishKey> or burnt_dust. */

const W = 280;
const H = 230;
const COOK_DURATION_MS = 5500;          // total time from raw to past-burnt
const GOLDEN_TOP_FRAC = 0.40;           // golden zone starts at 40% of slider
const GOLDEN_BOT_FRAC = 0.70;           // golden zone ends at 70% of slider
const SLIDER_W = 36;
const SLIDER_X = 18;
const SLIDER_Y = 32;
const SLIDER_H = H - SLIDER_Y - 36;
/* Default pan sprite (yellow tang).  Overridable per-fish via the
   panSheetSrc prop — e.g. clownfish passes /sprites/cook/pan-clownfish.png.
   All cook strips share the same shape: 1000×200 = 5 × 200×200. */
const DEFAULT_PAN_SHEET_SRC = '/sprites/cook/pan.png';
const PAN_FRAME_W = 200;
const PAN_FRAME_H = 200;
const PAN_FRAMES = 5;
const PAN_W_DRAW = 170;
const PAN_H_DRAW = 170;
const PAN_X = W - PAN_W_DRAW - 14;
const PAN_Y = 36;

export const CookingMinigame = ({ fishKey, panSheetSrc, onComplete, onCancel }) => {
  const sheetSrc = panSheetSrc || DEFAULT_PAN_SHEET_SRC;
  const canvasRef = useRef(null);
  const panImgRef = useRef(null);
  const [ready, setReady] = useState(false);

  const startedAt = useRef(0);
  const phaseRef = useRef('cooking');           // 'cooking' | 'done'
  const flipsRef = useRef(0);                   // 0 = side 1, 1 = side 2 (flipped), 2 = cooked

  // Load pan sprite + dehalo isn't needed (bg is dark grey, not white).
  useEffect(() => {
    const img = new Image();
    img.src = sheetSrc;
    img.onload = () => { panImgRef.current = img; setReady(true); };
    img.onerror = () => { console.warn('cooking sprite failed to load:', sheetSrc); setReady(true); };
  }, []);

  // rAF render + tick loop.
  useEffect(() => {
    if (!ready) return;
    let rafId = 0;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    startedAt.current = performance.now();

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      if (phaseRef.current !== 'cooking') return;

      const elapsed = now - startedAt.current;
      const progress = Math.min(1, elapsed / COOK_DURATION_MS);

      // Pan sprite frame from progress.  Frame 0 raw → frame 4 burnt.
      const panFrame = Math.min(PAN_FRAMES - 1, Math.floor(progress * PAN_FRAMES));

      // Burnt check — if indicator passes the bottom of the golden zone
      // before the second flip lands, fish is burnt and we exit.
      if (progress > GOLDEN_BOT_FRAC && flipsRef.current < 2) {
        phaseRef.current = 'done';
        setTimeout(() => onComplete && onComplete('burnt'), 120);
      }

      // ---- DRAW ----
      ctx.clearRect(0, 0, W, H);

      // Slider track gradient: white (top) → gold (middle) → charcoal (bottom).
      const grad = ctx.createLinearGradient(0, SLIDER_Y, 0, SLIDER_Y + SLIDER_H);
      grad.addColorStop(0.00, '#f7f4e8');
      grad.addColorStop(GOLDEN_TOP_FRAC, '#f5c542');
      grad.addColorStop(GOLDEN_BOT_FRAC, '#a87a16');
      grad.addColorStop(1.00, '#1a1408');
      ctx.fillStyle = grad;
      ctx.fillRect(SLIDER_X, SLIDER_Y, SLIDER_W, SLIDER_H);

      // Slider border + golden-zone outline so the target is unambiguous.
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(SLIDER_X, SLIDER_Y, SLIDER_W, SLIDER_H);
      const gtY = SLIDER_Y + GOLDEN_TOP_FRAC * SLIDER_H;
      const gbY = SLIDER_Y + GOLDEN_BOT_FRAC * SLIDER_H;
      ctx.strokeStyle = 'rgba(255, 215, 100, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SLIDER_X - 4, gtY); ctx.lineTo(SLIDER_X + SLIDER_W + 4, gtY);
      ctx.moveTo(SLIDER_X - 4, gbY); ctx.lineTo(SLIDER_X + SLIDER_W + 4, gbY);
      ctx.stroke();

      // Indicator — horizontal line + chevron pointer on the right.
      const indY = SLIDER_Y + progress * SLIDER_H;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(SLIDER_X - 6, indY); ctx.lineTo(SLIDER_X + SLIDER_W + 6, indY);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(SLIDER_X + SLIDER_W + 6, indY - 5);
      ctx.lineTo(SLIDER_X + SLIDER_W + 14, indY);
      ctx.lineTo(SLIDER_X + SLIDER_W + 6, indY + 5);
      ctx.closePath();
      ctx.fill();

      // Pan sprite — flipped horizontally after the first golden tap.
      if (panImgRef.current) {
        ctx.save();
        const flipped = flipsRef.current >= 1;
        const sx = panFrame * PAN_FRAME_W;
        if (flipped) {
          ctx.translate(PAN_X + PAN_W_DRAW, PAN_Y);
          ctx.scale(-1, 1);
          ctx.drawImage(panImgRef.current, sx, 0, PAN_FRAME_W, PAN_FRAME_H, 0, 0, PAN_W_DRAW, PAN_H_DRAW);
        } else {
          ctx.drawImage(panImgRef.current, sx, 0, PAN_FRAME_W, PAN_FRAME_H, PAN_X, PAN_Y, PAN_W_DRAW, PAN_H_DRAW);
        }
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ready]);

  const onPointerDown = (e) => {
    e.stopPropagation();
    if (phaseRef.current !== 'cooking') return;
    const elapsed = performance.now() - startedAt.current;
    const progress = Math.min(1, elapsed / COOK_DURATION_MS);
    const inGolden = progress >= GOLDEN_TOP_FRAC && progress <= GOLDEN_BOT_FRAC;
    if (!inGolden) return;                   // no-op outside golden

    flipsRef.current++;
    try { BT_AUDIO.beep(720, 0.06, 0.08, 'sine'); } catch {}

    if (flipsRef.current >= 2) {
      phaseRef.current = 'done';
      try { BT_AUDIO.collect(); } catch {}
      setTimeout(() => onComplete && onComplete('cooked'), 160);
    }
  };

  const overlayStyle = {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(var(--dash-h) + 50px)',
    transform: 'translateX(-50%)',
    width: W,
    height: H,
    zIndex: 100,
    background: 'linear-gradient(180deg, #2b1d10 0%, #110806 100%)',
    border: '2px solid rgba(0,0,0,0.7)',
    borderRadius: 8,
    overflow: 'hidden',
    touchAction: 'none',
    boxShadow: '0 6px 16px rgba(0,0,0,0.55)',
    fontFamily: 'VT323, monospace',
    color: '#fff',
  };

  return (
    <div style={overlayStyle} onPointerDown={onPointerDown}>
      <div style={{
        position: 'absolute',
        top: 6, left: 8,
        fontSize: 15, fontWeight: 700,
        letterSpacing: '.06em',
        textShadow: '0 1px 2px rgba(0,0,0,.7)',
        pointerEvents: 'none',
      }}>🍳 COOKING</div>

      <div style={{
        position: 'absolute',
        bottom: 6, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 15, fontWeight: 700,
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.7)',
        pointerEvents: 'none',
      }}>
        {flipsRef.current === 0 ? 'TAP IN GOLDEN TO FLIP'
          : flipsRef.current === 1 ? 'TAP AGAIN TO PLATE'
          : 'COOKED!'}
      </div>

      <button
        onPointerDown={(e) => { e.stopPropagation(); onCancel && onCancel(); }}
        style={{
          position: 'absolute',
          top: 4, right: 4,
          width: 30, height: 30,
          border: 'none',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          borderRadius: 4,
          cursor: 'pointer',
          touchAction: 'manipulation',
          zIndex: 2,
        }}>×</button>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
};
