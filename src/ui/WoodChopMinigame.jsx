import React, { useEffect, useRef, useState } from 'react';

/* Wood chopping minigame.  Three phases:
   - "chop":     axe glides L↔R above the tree, weak-spot marker on the
                 trunk re-randomises after each strike.  Tap to swing —
                 distance from axe X to weak-spot X grades the strike.
                 Each successful strike decrements node.hp; tree damage
                 frame advances proportionally.
   - "felling":  node.hp <= 0 — tree tilts/slides + dust puff (~400 ms).
   - "flying":   wood log thumbnail flies from rect centre to the Bag
                 icon (~380 ms).  onComplete fires on transitionend. */

const W = 260;
const H = 170;
const TREE_SHEET_SRC = '/sprites/wood/tree.png';   // 960×256 = 5 × 192×256
const AXE_SHEET_SRC = '/sprites/wood/axe.png';     // 768×144 = 8 × 96×144
const TREE_FRAME_W = 192;
const TREE_FRAME_H = 256;
const TREE_FRAMES = 5;
const AXE_FRAME_W = 96;
const AXE_FRAME_H = 144;
const AXE_IDLE_FRAME = 0;        // axe at rest
const AXE_CHOP_FRAME = 3;        // mid-swing with chip particles
const AXE_CHOP_HOLD_MS = 180;    // how long to show the chop frame after a hit
const AXE_SPEED = 110;           // px/s
const AXE_W_DRAW = 48;           // canvas-space draw width
const AXE_H_DRAW = 72;           // canvas-space draw height
const AXE_Y = 12;                // axe baseline Y inside the canvas
const TREE_W_DRAW = 130;
const TREE_H_DRAW = 144;
const TREE_X = (W - TREE_W_DRAW) / 2;
const TREE_Y = H - TREE_H_DRAW;
const TRUNK_LEFT = TREE_X + 30;
const TRUNK_RIGHT = TREE_X + TREE_W_DRAW - 30;

const STRIKE_PERFECT_DIST = 12;
const STRIKE_GOOD_DIST = 22;
const STRIKE_OK_DIST = 32;

const WOOD_THUMB = '/icons/wood/wood-pine.png';

export const WoodChopMinigame = ({ node, skill, onComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const treeImgRef = useRef(null);
  const axeImgRef = useRef(null);
  const [ready, setReady] = useState(false);

  const [phase, setPhase] = useState('chop');     // 'chop' | 'felling' | 'flying' | 'done'
  const phaseRef = useRef('chop');
  const axeX = useRef(20);
  const axeDir = useRef(1);
  const lastT = useRef(0);
  const flashUntil = useRef(0);
  const lastChopAt = useRef(0);

  // Tree state — track local hp separate from node.hp so we can lerp
  // the damage frame smoothly even after the node is consumed.
  const startHp = useRef(node?.hp || 3);
  const curHp = useRef(node?.hp || 3);
  const weakX = useRef(0);
  const accuracyTotal = useRef({ perfect: 0, good: 0, ok: 0 });

  // Felling animation state.
  const fellingStart = useRef(0);

  // Flying-log state — same pattern as fish-to-bag.
  const [flying, setFlying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(false);

  // Pick a fresh weak-spot X within the trunk bounds.
  const reseedWeakSpot = () => {
    weakX.current = TRUNK_LEFT + Math.random() * (TRUNK_RIGHT - TRUNK_LEFT);
  };
  useEffect(reseedWeakSpot, []);

  // Asset load — both sprite sheets in parallel, then dehalo via the
  // same offscreen-canvas trick used in FishingMinigame for clean alpha.
  useEffect(() => {
    let loaded = 0;
    const need = 2;

    const dehalo = (img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1;
      c.height = img.naturalHeight || 1;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      try {
        const id = cx.getImageData(0, 0, c.width, c.height);
        const px = id.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] > 220 && px[i + 1] > 220 && px[i + 2] > 220) {
            px[i + 3] = 0;
          }
        }
        cx.putImageData(id, 0, 0);
      } catch {}
      return c;
    };

    const load = (src, ref) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        ref.current = dehalo(img);
        if (++loaded === need) setReady(true);
      };
      img.onerror = () => {
        console.warn('wood sprite failed to load:', src);
        if (++loaded === need) setReady(true);
      };
    };

    load(TREE_SHEET_SRC, treeImgRef);
    load(AXE_SHEET_SRC, axeImgRef);
  }, []);

  // rAF render loop.
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

      // Axe glide during chop phase.
      if (phase === 'chop') {
        const speedMul = now < flashUntil.current ? 2.0 : 1.0;
        axeX.current += axeDir.current * AXE_SPEED * speedMul * dt;
        const minX = TREE_X + 4;
        const maxX = TREE_X + TREE_W_DRAW - AXE_W_DRAW - 4;
        if (axeX.current > maxX) { axeX.current = maxX; axeDir.current = -1; }
        else if (axeX.current < minX) { axeX.current = minX; axeDir.current = 1; }
      }

      // Compute current tree damage frame from hp.
      const damageT = 1 - Math.max(0, Math.min(1, curHp.current / startHp.current));
      let treeFrame = Math.min(TREE_FRAMES - 1, Math.floor(damageT * (TREE_FRAMES - 0.001)));

      // Felling — lerp tree position + rotation over 400ms.
      let treeRot = 0;
      let treeOffY = 0;
      let treeAlpha = 1;
      if (phase === 'felling') {
        const tF = Math.min(1, (now - fellingStart.current) / 400);
        treeRot = tF * (Math.PI * 0.10);   // tilt 18°
        treeOffY = tF * 18;
        treeAlpha = 1 - Math.max(0, (tF - 0.7) / 0.3);
        treeFrame = TREE_FRAMES - 1;       // hold last damage frame
        if (tF >= 1 && phaseRef.current === 'felling') {
          phaseRef.current = 'flying';
          setPhase('flying');
          setFlying(true);
        }
      }

      // ---- DRAW ----
      ctx.clearRect(0, 0, W, H);

      // Soft forest-floor gradient overlay (overlays the CSS bg).
      ctx.fillStyle = 'rgba(40, 80, 30, 0.18)';
      ctx.fillRect(0, 0, W, H);

      // Tree.
      if (treeImgRef.current) {
        ctx.save();
        ctx.globalAlpha = treeAlpha;
        const tCx = TREE_X + TREE_W_DRAW / 2;
        const tCy = TREE_Y + TREE_H_DRAW / 2 + treeOffY;
        ctx.translate(tCx, tCy);
        if (treeRot) ctx.rotate(treeRot);
        ctx.drawImage(
          treeImgRef.current,
          treeFrame * TREE_FRAME_W, 0, TREE_FRAME_W, TREE_FRAME_H,
          -TREE_W_DRAW / 2, -TREE_H_DRAW / 2, TREE_W_DRAW, TREE_H_DRAW
        );
        ctx.restore();
      }

      // Weak-spot marker — pulses while in chop phase.
      if (phase === 'chop' && weakX.current > 0) {
        const pulse = 0.7 + Math.sin(now / 180) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff5e6c';
        ctx.beginPath();
        ctx.arc(weakX.current, TREE_Y + TREE_H_DRAW * 0.42, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd24a';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      // Axe.
      if (axeImgRef.current && (phase === 'chop' || phase === 'felling')) {
        const inChopHold = now < lastChopAt.current + AXE_CHOP_HOLD_MS;
        const axeFrame = inChopHold ? AXE_CHOP_FRAME : AXE_IDLE_FRAME;
        ctx.drawImage(
          axeImgRef.current,
          axeFrame * AXE_FRAME_W, 0, AXE_FRAME_W, AXE_FRAME_H,
          axeX.current, AXE_Y, AXE_W_DRAW, AXE_H_DRAW
        );
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

  // Strike handler — tap anywhere in the overlay during 'chop'.
  const onPointerDown = (e) => {
    e.stopPropagation();
    if (phaseRef.current !== 'chop') return;

    // Axe blade aligns with axeX + half-width.
    const axeCenterX = axeX.current + AXE_W_DRAW / 2;
    const dist = Math.abs(axeCenterX - weakX.current);

    let result;
    if (dist <= STRIKE_PERFECT_DIST) result = 'perfect';
    else if (dist <= STRIKE_GOOD_DIST) result = 'good';
    else if (dist <= STRIKE_OK_DIST) result = 'ok';
    else result = 'miss';

    if (result === 'miss') {
      flashUntil.current = performance.now() + 250;
      return;
    }

    // Hit — apply damage, advance counters, reseed weak spot.
    accuracyTotal.current[result]++;
    lastChopAt.current = performance.now();
    const dmg = result === 'perfect' ? 2 : 1;
    curHp.current = Math.max(0, curHp.current - dmg);
    reseedWeakSpot();

    if (curHp.current <= 0) {
      // Tree felled — hand off to felling phase.
      phaseRef.current = 'felling';
      setPhase('felling');
      fellingStart.current = performance.now();
    }
  };

  // Once setFlying(true), schedule the CSS transition next frame.
  useEffect(() => {
    if (!flying) return;
    const id = requestAnimationFrame(() => setFlyTarget(true));
    return () => cancelAnimationFrame(id);
  }, [flying]);

  // Pick the best accuracy bucket the player landed during this run —
  // routes through the same MINIGAME_REWARDS table the gather path uses.
  const reportedAccuracy = () => {
    const a = accuracyTotal.current;
    if (a.perfect > a.good && a.perfect > a.ok) return 'perfect';
    if (a.good >= a.ok) return 'good';
    return 'ok';
  };

  const overlayStyle = {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(var(--dash-h) + 50px)',
    transform: 'translateX(-50%)',
    width: W,
    height: H,
    zIndex: 100,
    background: 'linear-gradient(180deg, #6cba3f 0%, #1f5d22 100%)',
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
      >
        <div style={{
          position: 'absolute',
          top: 6, left: 8,
          fontSize: 15, fontWeight: 700,
          letterSpacing: '.06em',
          textShadow: '0 1px 2px rgba(0,0,0,.7)',
          pointerEvents: 'none',
        }}>🪓 CHOPPING</div>

        <div style={{
          position: 'absolute',
          bottom: 6, left: 0, right: 0,
          textAlign: 'center',
          fontSize: 16, fontWeight: 700,
          letterSpacing: '.04em',
          textShadow: '0 1px 2px rgba(0,0,0,.7)',
          pointerEvents: 'none',
        }}>
          {phase === 'felling' ? 'TIMBER!' : phase === 'flying' ? '' : 'TAP WHEN AXE IS OVER THE RED MARK'}
        </div>

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

        {/* HP pips along the top — one per starting HP, fade as they're consumed */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 3,
          pointerEvents: 'none',
        }}>
          {Array.from({ length: startHp.current }, (_, i) => (
            <div key={i} style={{
              width: 8, height: 4,
              borderRadius: 2,
              background: i < curHp.current ? '#ffd24a' : 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(0,0,0,0.4)',
            }} />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      </div>

      {/* Fly-to-bag — same pattern as fish.  Wood-log thumbnail
          CSS-transitions from the rectangle centre to the Bag icon. */}
      {flying && (
        <img
          src={WOOD_THUMB}
          alt=""
          onTransitionEnd={() => onComplete && onComplete({ accuracy: reportedAccuracy() })}
          style={{
            position: 'fixed',
            left: flyTarget ? 'calc(100vw / 12)' : '50%',
            bottom: flyTarget ? '4vh' : 'calc(var(--dash-h) + 50px + 80px)',
            width: flyTarget ? 28 : 56,
            height: flyTarget ? 35 : 70,
            opacity: flyTarget ? 0 : 1,
            transform: 'translate(-50%, 0)',
            transition: 'left 380ms cubic-bezier(.4,0,.6,1), bottom 380ms cubic-bezier(.4,0,.6,1), width 380ms ease-out, height 380ms ease-out, opacity 380ms ease-in 80ms',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        />
      )}
    </>
  );
};
