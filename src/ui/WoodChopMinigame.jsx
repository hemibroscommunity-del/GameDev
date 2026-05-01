import React, { useEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '../data/gameSystems.js';

/* Wood chopping minigame.  Three phases:
   - "chop":     axe oscillates UP/DOWN at the trunk's horizontal centre.
                 A horizontal red BAND is drawn across the trunk at a
                 fixed Y; player taps to commit.  Hit if the axe blade's
                 Y is inside the band's Y range — applies 1 dmg, plays
                 a wood-thwack sound, advances tree damage frame, and
                 reseeds the band's Y.  Miss does nothing (no penalty,
                 no progress).
   - "felling":  node.hp <= 0 — tree tilts/slides + dust puff (~400 ms).
   - "flying":   wood log thumbnail flies from rect centre to the Bag
                 icon (~380 ms).  onComplete fires on transitionend. */

const W = 280;
const H = 230;
/* Tree sheet is 3 explicit damage-state frames (intact, partial, felled
   stump) supplied as IMG_7781/7782/7784 — built into a 600×302 strip
   via ffmpeg crop+colorkey+hstack. */
/* Filenames suffixed -v2 to bust browser/Cloudflare cache when the
   underlying art is updated — renaming forces a fresh fetch. */
const TREE_SHEET_SRC = '/sprites/wood/tree-v2.png';   // 600×302 = 3 × 200×302
const AXE_SHEET_SRC = '/sprites/wood/axe-v2.png';     // 768×144 = 8 × 96×144
const TREE_FRAME_W = 200;
const TREE_FRAME_H = 302;
const TREE_FRAMES = 3;
const AXE_FRAME_W = 96;
const AXE_FRAME_H = 144;
const AXE_IDLE_FRAME = 0;        // axe at rest
const AXE_CHOP_FRAME = 3;        // mid-swing with chip particles
const AXE_CHOP_HOLD_MS = 180;    // how long to show the chop frame after a hit

const AXE_W_DRAW = 48;           // canvas-space draw width
const AXE_H_DRAW = 72;           // canvas-space draw height
const TREE_W_DRAW = 140;
const TREE_H_DRAW = 212;
const TREE_X = (W - TREE_W_DRAW) / 2;
const TREE_Y = H - TREE_H_DRAW;
/* Trunk x-range in canvas coords — derived from the trunk's position in
   the source frame (~x 60..140 of 200-wide source) scaled by 0.7. */
const TRUNK_LEFT = TREE_X + 42;
const TRUNK_RIGHT = TREE_X + 98;

// Axe oscillates vertically at the trunk's horizontal centre.
const AXE_X = (TRUNK_LEFT + TRUNK_RIGHT) / 2 - AXE_W_DRAW / 2;
const AXE_Y_MIN = 6;             // top extreme of the bob
const AXE_Y_MAX = 130;           // bottom extreme — keeps the blade on the trunk
const AXE_OSC_MS = 1200;         // full up-and-down cycle in ms

// Horizontal target band on the trunk.  Bumped to 40 px after user
// feedback that strikes were registering as misses despite looking
// like hits — a wider band makes timing more forgiving.
const BAND_HEIGHT = 40;
const BAND_Y_MIN = TREE_Y + 60;
const BAND_Y_MAX = TREE_Y + TREE_H_DRAW * 0.78 - BAND_HEIGHT;
/* Vertical extent of the axe HEAD inside the sprite, expressed as
   fractions of AXE_H_DRAW.  Hit-test now uses an AABB overlap between
   [headTop, headBottom] and the band — any part of the head touching
   the band counts as a hit, instead of a single-point sample. */
const AXE_HEAD_TOP_FRAC = 0.00;
const AXE_HEAD_BOT_FRAC = 0.42;

const WOOD_THUMB = '/icons/wood/wood-log.png';

export const WoodChopMinigame = ({ node, skill, onComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const treeImgRef = useRef(null);
  const axeImgRef = useRef(null);
  const [ready, setReady] = useState(false);

  const [phase, setPhase] = useState('chop');     // 'chop' | 'felling' | 'flying' | 'done'
  const phaseRef = useRef('chop');
  const axeY = useRef(AXE_Y_MIN);                 // current axe Y, set by sin
  const lastT = useRef(0);
  const lastChopAt = useRef(0);
  const particlesRef = useRef([]);                // wood-chip particles spawned on hit

  // Tree state — track local hp separate from node.hp so we can lerp
  // the damage frame smoothly even after the node is consumed.
  const startHp = useRef(node?.hp || 3);
  const curHp = useRef(node?.hp || 3);
  const bandY = useRef(BAND_Y_MIN + (BAND_Y_MAX - BAND_Y_MIN) * 0.5);

  // Felling animation state.
  const fellingStart = useRef(0);

  // Flying-log state — same pattern as fish-to-bag.
  const [flying, setFlying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(false);

  // Pick a fresh band Y within the trunk's vertical bounds.
  const reseedBand = () => {
    bandY.current = BAND_Y_MIN + Math.random() * (BAND_Y_MAX - BAND_Y_MIN);
  };
  useEffect(reseedBand, []);

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

      // Axe vertical oscillation during chop phase.  Freeze the axe at
      // its current Y while the chop-hold is active so the strike point
      // visibly stops the moment the player taps.
      if (phase === 'chop') {
        const inChopHold = now < lastChopAt.current + AXE_CHOP_HOLD_MS;
        if (!inChopHold) {
          const t = (now / AXE_OSC_MS) * Math.PI * 2;
          const u = (Math.sin(t) + 1) / 2;        // [0, 1]
          axeY.current = AXE_Y_MIN + u * (AXE_Y_MAX - AXE_Y_MIN);
        }
      }

      // Tick wood-chip particles — gravity + alpha fade.  Cull when life
      // drops to zero so the array doesn't grow unbounded.
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += 280 * dt;        // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / 0.55;     // ~550 ms lifespan
        if (p.life <= 0) ps.splice(i, 1);
      }

      // Compute current tree damage frame from hp — three explicit
      // states (intact / partial / felled stump) per the supplied
      // sprite art. Frame 0 = full hp; frame 2 = hp <= 0; frame 1 = any
      // chop progress in between.
      let treeFrame = curHp.current >= startHp.current ? 0
                    : curHp.current <= 0 ? (TREE_FRAMES - 1) : 1;

      // Felling — tree stays upright in place showing the stump frame
      // for a brief beat, then hands off to the fly-to-bag.  No tilt,
      // no slide, no fade — the tree just sits there as the player's
      // brain registers "the tree is felled".
      if (phase === 'felling') {
        treeFrame = TREE_FRAMES - 1;
        if (now - fellingStart.current >= 350 && phaseRef.current === 'felling') {
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

      // Tree — drawn upright, in place, throughout all phases.
      if (treeImgRef.current) {
        ctx.drawImage(
          treeImgRef.current,
          treeFrame * TREE_FRAME_W, 0, TREE_FRAME_W, TREE_FRAME_H,
          TREE_X, TREE_Y, TREE_W_DRAW, TREE_H_DRAW
        );
      }

      // Horizontal target band — a translucent red stripe across the
      // trunk's width with a golden border.  Pulses gently so the
      // player can read it as the active target.
      if (phase === 'chop') {
        const pulse = 0.55 + Math.sin(now / 220) * 0.18;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(255, 94, 108, 0.85)';
        ctx.fillRect(TRUNK_LEFT, bandY.current, TRUNK_RIGHT - TRUNK_LEFT, BAND_HEIGHT);
        ctx.globalAlpha = Math.min(1, pulse + 0.25);
        ctx.strokeStyle = '#ffd24a';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(TRUNK_LEFT, bandY.current, TRUNK_RIGHT - TRUNK_LEFT, BAND_HEIGHT);
        ctx.restore();
      }

      // Axe.
      if (axeImgRef.current && (phase === 'chop' || phase === 'felling')) {
        const inChopHold = now < lastChopAt.current + AXE_CHOP_HOLD_MS;
        const axeFrame = inChopHold ? AXE_CHOP_FRAME : AXE_IDLE_FRAME;
        ctx.drawImage(
          axeImgRef.current,
          axeFrame * AXE_FRAME_W, 0, AXE_FRAME_W, AXE_FRAME_H,
          AXE_X, axeY.current, AXE_W_DRAW, AXE_H_DRAW
        );
      }

      // Wood-chip particles — small dark-brown squares with quick fade.
      // Drawn after the axe so they appear in front of the head.
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        ctx.fillStyle = 'rgba(120, 70, 30, ' + Math.max(0, p.life) + ')';
        ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ready]);

  // Strike handler — tap anywhere in the overlay during 'chop'.
  const onPointerDown = (e) => {
    e.stopPropagation();
    if (phaseRef.current !== 'chop') return;

    // AABB overlap on the axe head's vertical extent vs the band.
    // Any part of the head touching the band counts as a hit — much
    // more forgiving than the previous single-point sample.
    const headTop = axeY.current + AXE_H_DRAW * AXE_HEAD_TOP_FRAC;
    const headBot = axeY.current + AXE_H_DRAW * AXE_HEAD_BOT_FRAC;
    const bandTop = bandY.current;
    const bandBot = bandY.current + BAND_HEIGHT;
    const overlap = headBot >= bandTop && headTop <= bandBot;
    if (!overlap) return;                // miss — no progress, no penalty

    // Hit — freeze the axe at its current Y for AXE_CHOP_HOLD_MS (the
    // rAF loop's chop-hold check already skips the bob during that
    // window, so axeY.current stays where the player committed),
    // apply damage, spawn chip particles, play sound.
    const now = performance.now();
    lastChopAt.current = now;
    curHp.current = Math.max(0, curHp.current - 1);

    // Spawn 10 wood-chip particles at the strike point (intersection of
    // the axe head's bottom edge and the band centre).
    const chipX = AXE_X + AXE_W_DRAW / 2;
    const chipY = Math.max(headTop, bandTop) + (Math.min(headBot, bandBot) - Math.max(headTop, bandTop)) / 2;
    const ps = particlesRef.current;
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;  // mostly upward
      const speed = 60 + Math.random() * 80;
      ps.push({
        x: chipX + (Math.random() - 0.5) * 6,
        y: chipY + (Math.random() - 0.5) * 4,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 1.0,
      });
    }

    reseedBand();
    try { BT_AUDIO.hitSound('wood'); } catch {}

    if (curHp.current <= 0) {
      phaseRef.current = 'felling';
      setPhase('felling');
      fellingStart.current = now;
    }
  };

  // Once setFlying(true), schedule the CSS transition next frame.
  useEffect(() => {
    if (!flying) return;
    const id = requestAnimationFrame(() => setFlyTarget(true));
    return () => cancelAnimationFrame(id);
  }, [flying]);

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
          {phase === 'felling' ? 'TIMBER!' : phase === 'flying' ? '' : 'TAP WHEN AXE IS IN THE RED BAND'}
        </div>

        <button
          onPointerDown={(e) => { e.stopPropagation(); onCancel && onCancel(); }}
          style={{
            position: 'absolute',
            top: 4, right: 4,
            width: 30, height: 30,
            border: 'none',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
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
          /* The fly element transitions 5 properties (left, bottom, width,
             height, opacity) — onTransitionEnd fires once per property,
             so without this guard onComplete (and the inventory + XP
             write it triggers) ran 5×.  Gate to opacity. */
          onTransitionEnd={(e) => { if (e.propertyName === 'opacity') onComplete && onComplete({ accuracy: 'good' }); }}
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
