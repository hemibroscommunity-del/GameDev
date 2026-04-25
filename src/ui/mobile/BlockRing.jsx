import React, { useEffect, useRef, useState } from 'react';
import { blockRingBus } from './blockRingBus.js';

// Color canon — spec §"Color and Typography Canon".
const C = {
  ringFill:    'rgba(244, 199, 117,',     // append `<opacity>)`
  ringDashed:  'rgba(244, 199, 117, 0.25)',
  litFill:     '#F4C775',
  litGlow:     '#F4C775',
  iconDimFill:    'rgba(244, 199, 117, 0.4)',
  iconDimStroke:  'rgba(244, 199, 117, 0.6)',
  iconActiveFill:    '#F4E0A8',
  iconActiveStroke:  '#5A3A10',
  parryFlash:  '#F4E0A8',
};

// Geometry — spec §Part 2: ring band 12px, inner radius = joystick outer + 6-8px.
const RING_BAND = 12;
const RING_GAP  = 7;
const SHIELD_ICON_W = 28;
const SHIELD_ICON_H = 30;
const LIT_ARC_DEG = 70;

// Activation discipline — spec §"Commitment cost — joystick release window".
const COMMITMENT_GAP_MS = 75;

const useRaf = (cb) => {
  useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      cb(now, now - last);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cb]);
};

const angleOf = (cx, cy, x, y) => Math.atan2(y - cy, x - cx);
const norm = (a) => {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a >  Math.PI) a -= Math.PI * 2;
  return a;
};
const lerpAngle = (a, b, t) => a + norm(b - a) * t;

const ShieldGlyph = ({ active }) => (
  <svg width={SHIELD_ICON_W} height={SHIELD_ICON_H} viewBox="0 0 28 30">
    <path d="M14 1 L25 5 L25 14 Q25 24 14 29 Q3 24 3 14 L3 5 Z"
      fill={active ? C.iconActiveFill : C.iconDimFill}
      stroke={active ? C.iconActiveStroke : C.iconDimStroke}
      strokeWidth={1.4} strokeLinejoin="round" />
    <line x1="14" y1="6" x2="14" y2="22" stroke={active ? C.iconActiveStroke : C.iconDimStroke} strokeWidth={1.4} />
    <line x1="6"  y1="13" x2="22" y2="13" stroke={active ? C.iconActiveStroke : C.iconDimStroke} strokeWidth={1.4} />
  </svg>
);

const LitArc = ({ ringInner, ringOuter, centerAngle, opacity = 1 }) => {
  const r = (ringInner + ringOuter) / 2;
  const w = ringOuter - ringInner;
  const half = (LIT_ARC_DEG * Math.PI) / 360;
  const a0 = centerAngle - half;
  const a1 = centerAngle + half;
  const x0 = ringOuter + Math.cos(a0) * r;
  const y0 = ringOuter + Math.sin(a0) * r;
  const x1 = ringOuter + Math.cos(a1) * r;
  const y1 = ringOuter + Math.sin(a1) * r;
  const large = LIT_ARC_DEG > 180 ? 1 : 0;
  const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  return (
    <g style={{ opacity }}>
      <path d={d} stroke={C.litFill} strokeWidth={w} fill="none" strokeLinecap="butt" />
      <path d={d} stroke={C.litGlow} strokeWidth={w + 4} fill="none" strokeLinecap="butt"
        style={{ filter: 'blur(3px)', opacity: 0.5 }} />
    </g>
  );
};

export const BlockRing = () => {
  // Geometry derived from the right-joystick element each frame.
  const [geo, setGeo] = useState(null);
  // Force re-render at frame rate so opacity transitions and parry flash redraw.
  const [, setTick] = useState(0);

  // Track right-joystick last-released time for the activation gap.
  const rJoyReleasedAt = useRef(0);
  const lastRJoyDownRef = useRef(false);
  const dragActive = useRef(false);
  const touchId = useRef(null);

  // Mirror of last applied shield angle, for smoothed aim tracking.
  const shieldAngleRef = useRef(0);

  useRaf(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) { setGeo(null); return; }
    const r = el.getBoundingClientRect();
    if (!r.width) { setGeo(null); return; }
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const joyOuter = r.width / 2;
    const ringInner = joyOuter + RING_GAP;
    const ringOuter = ringInner + RING_BAND;

    // Aim tracking when not blocking: shield icon follows aim direction.
    const S = window._gameState?.current;
    const aim = S?._aimAngle ?? 0;
    if (!blockRingBus.state.blocking) {
      // 50ms smoothing per spec.
      shieldAngleRef.current = lerpAngle(shieldAngleRef.current, aim, 0.2);
    }
    if (S) S._shieldAngle = shieldAngleRef.current;

    // Track right-joystick release time using existing _aiming flag.
    const rjoyDown = !!S?._aiming;
    if (lastRJoyDownRef.current && !rjoyDown) rJoyReleasedAt.current = performance.now();
    lastRJoyDownRef.current = rjoyDown;

    setGeo({ cx, cy, joyOuter, ringInner, ringOuter });
    setTick(t => t + 1);
  });

  if (!geo) return null;

  const { cx, cy, ringInner, ringOuter } = geo;
  const size = ringOuter * 2;
  const blocking = blockRingBus.state.blocking;
  const opacity = blocking ? 1 : blockRingBus.ringOpacity();
  const shieldAng = shieldAngleRef.current;

  const sx = ringOuter + Math.cos(shieldAng) * ((ringInner + ringOuter) / 2);
  const sy = ringOuter + Math.sin(shieldAng) * ((ringInner + ringOuter) / 2);

  // ── Input handling ────────────────────────────────────────────────────────
  const tryActivate = (clientX, clientY) => {
    const dist = Math.hypot(clientX - cx, clientY - cy);
    const onIcon = Math.hypot(clientX - (cx + Math.cos(shieldAng) * (ringInner + ringOuter) / 2),
                              clientY - (cy + Math.sin(shieldAng) * (ringInner + ringOuter) / 2))
                   <= Math.max(SHIELD_ICON_W, SHIELD_ICON_H) / 2 + 4;
    const onRing = dist >= ringInner - 4 && dist <= ringOuter + 6;
    if (!onIcon && !onRing) return false;
    // Commitment gap: must be released for at least COMMITMENT_GAP_MS.
    const sinceRelease = performance.now() - rJoyReleasedAt.current;
    if (rJoyReleasedAt.current && sinceRelease < COMMITMENT_GAP_MS) return false;

    const S = window._gameState?.current;
    if (S) {
      S._shieldUp = true;
      // Snap shield angle to the touch's angle relative to the joystick center.
      const ang = angleOf(cx, cy, clientX, clientY);
      shieldAngleRef.current = onIcon ? shieldAng : ang;
      S._shieldAngle = shieldAngleRef.current;
      if (S.channel) {
        try { S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: true } }); } catch {}
      }
    }
    blockRingBus.beginBlock();
    dragActive.current = true;
    return true;
  };

  const updateDrag = (clientX, clientY) => {
    if (!dragActive.current) return;
    const ang = angleOf(cx, cy, clientX, clientY);
    shieldAngleRef.current = ang;
    const S = window._gameState?.current;
    if (S) S._shieldAngle = ang;
  };

  const release = () => {
    if (!dragActive.current) return;
    dragActive.current = false;
    touchId.current = null;
    const S = window._gameState?.current;
    if (S) {
      S._shieldUp = false;
      if (S.channel) {
        try { S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: false } }); } catch {}
      }
    }
    blockRingBus.endBlock();
  };

  const onTouchStart = (e) => {
    for (const t of e.touches) {
      if (touchId.current == null && tryActivate(t.clientX, t.clientY)) {
        touchId.current = t.identifier;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
  };
  const onTouchMove = (e) => {
    if (!dragActive.current) return;
    for (const t of e.touches) {
      if (t.identifier === touchId.current) {
        updateDrag(t.clientX, t.clientY);
        e.preventDefault();
        return;
      }
    }
  };
  const onTouchEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId.current) { release(); return; }
    }
  };
  const onMouseDown = (e) => { if (tryActivate(e.clientX, e.clientY)) { e.preventDefault(); e.stopPropagation(); } };
  const onMouseMove = (e) => { if (dragActive.current) updateDrag(e.clientX, e.clientY); };
  const onMouseUp   = () => release();

  // Parry flash overlay
  const flashAge = performance.now() - blockRingBus.state.parryFlashAt;
  const flashing = flashAge >= 0 && flashAge < 300;
  const flashAlpha = flashing ? 1 - flashAge / 300 : 0;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        position: 'fixed',
        left: cx - ringOuter, top: cy - ringOuter,
        width: size, height: size,
        zIndex: 31,                    // just above right joystick
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {/* Ring band fill */}
        <circle cx={ringOuter} cy={ringOuter} r={(ringInner + ringOuter) / 2}
          fill="none"
          stroke={`${C.ringFill}${opacity})`}
          strokeWidth={RING_BAND}
          style={{ transition: 'stroke 400ms ease-in-out' }} />
        {/* Dashed inner edge */}
        <circle cx={ringOuter} cy={ringOuter} r={ringInner}
          fill="none" stroke={C.ringDashed} strokeWidth={1} strokeDasharray="3 3"
          style={{ opacity: blocking ? 1 : (opacity * 4) }} />
        {/* Dashed outer edge */}
        <circle cx={ringOuter} cy={ringOuter} r={ringOuter}
          fill="none" stroke={C.ringDashed} strokeWidth={1} strokeDasharray="3 3"
          style={{ opacity: blocking ? 1 : (opacity * 4) }} />
        {/* Lit segment when blocking */}
        {blocking && (
          <LitArc ringInner={ringInner} ringOuter={ringOuter} centerAngle={shieldAng} />
        )}
        {/* Parry flash burst */}
        {flashAlpha > 0 && (
          <circle cx={sx} cy={sy} r={ringOuter * (1 - flashAlpha) + 8}
            fill="none" stroke={C.parryFlash} strokeWidth={3}
            style={{ opacity: flashAlpha }} />
        )}
      </svg>
      {/* Shield icon positioned over the ring band at shieldAng */}
      <div style={{
        position: 'absolute',
        left: sx - SHIELD_ICON_W / 2,
        top:  sy - SHIELD_ICON_H / 2,
        width: SHIELD_ICON_W, height: SHIELD_ICON_H,
        pointerEvents: 'none',
        filter: blocking ? 'drop-shadow(0 0 4px rgba(244,199,117,.7))' : 'none',
      }}>
        <ShieldGlyph active={blocking} />
      </div>
    </div>
  );
};
