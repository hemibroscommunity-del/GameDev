import React, { useEffect, useRef, useState } from 'react';
import { blockRingBus } from './blockRingBus.js';

// Color canon — spec §"Color and Typography Canon".
const C = {
  ringFill:    'rgba(244, 199, 117,',
  ringDashed:  'rgba(244, 199, 117, 0.25)',
  litFill:     '#F4C775',
  litGlow:     '#F4C775',
  iconDimFill:    'rgba(244, 199, 117, 0.4)',
  iconDimStroke:  'rgba(244, 199, 117, 0.6)',
  iconActiveFill:    '#F4E0A8',
  iconActiveStroke:  '#5A3A10',
  parryFlash:  '#F4E0A8',
};

const RING_BAND = 12;
const RING_GAP  = 7;
const SHIELD_ICON_W = 28;
const SHIELD_ICON_H = 30;
const LIT_ARC_DEG = 70;
const COMMITMENT_GAP_MS = 75;
// Hit-target extends outward from ringInner only — never inward, so the
// joystick's mana fill stays unobstructed. Total hit-zone width:
// RING_BAND + HIT_OUTER_PAD = 12 + 36 = 48 (2× the previous 24-px target).
const HIT_OUTER_PAD = 36;

const useRaf = (cb) => {
  useEffect(() => {
    let raf;
    const tick = (now) => { cb(now); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cb]);
};

const angleOf = (cx, cy, x, y) => Math.atan2(y - cy, x - cx);

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

const LitArc = ({ ringInner, ringOuter, center, centerAngle, opacity = 1 }) => {
  const r = (ringInner + ringOuter) / 2;
  const w = ringOuter - ringInner;
  const half = (LIT_ARC_DEG * Math.PI) / 360;
  const a0 = centerAngle - half;
  const a1 = centerAngle + half;
  const x0 = center + Math.cos(a0) * r;
  const y0 = center + Math.sin(a0) * r;
  const x1 = center + Math.cos(a1) * r;
  const y1 = center + Math.sin(a1) * r;
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
  const [geo, setGeo] = useState(null);
  const [, setTick] = useState(0);

  const rJoyReleasedAt = useRef(0);
  const lastRJoyDownRef = useRef(false);
  const dragActive = useRef(false);
  const touchId = useRef(null);
  const shieldAngleRef = useRef(0);
  const geoRef = useRef(null);

  useRaf(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) { setGeo(null); geoRef.current = null; return; }
    const r = el.getBoundingClientRect();
    if (!r.width) { setGeo(null); geoRef.current = null; return; }
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const joyOuter = r.width / 2;
    const ringInner = joyOuter + RING_GAP;
    const ringOuter = ringInner + RING_BAND;
    const next = { cx, cy, joyOuter, ringInner, ringOuter };
    geoRef.current = next;

    // Shield icon persists at the last position the player set, so a rotate-
    // and-release leaves the icon where the finger left it instead of snapping
    // back to the aim direction.
    const S = window._gameState?.current;
    if (S) S._shieldAngle = shieldAngleRef.current;

    const rjoyDown = !!S?._aiming;
    if (lastRJoyDownRef.current && !rjoyDown) rJoyReleasedAt.current = performance.now();
    lastRJoyDownRef.current = rjoyDown;

    setGeo(next);
    setTick(t => t + 1);
  });

  // ── Window-level drag tracking ────────────────────────────────────────────
  // Once a block is active we listen at the window level so the finger can
  // slide off our hit-targets without losing the gesture.
  useEffect(() => {
    const onMove = (e) => {
      if (!dragActive.current || !geoRef.current) return;
      const t = e.touches
        ? Array.from(e.touches).find(t => t.identifier === touchId.current)
        : e;
      if (!t) return;
      const { cx, cy } = geoRef.current;
      const ang = angleOf(cx, cy, t.clientX, t.clientY);
      shieldAngleRef.current = ang;
      const S = window._gameState?.current;
      if (S) S._shieldAngle = ang;
      e.preventDefault?.();
    };
    const onEnd = (e) => {
      if (!dragActive.current) return;
      if (e.changedTouches) {
        const found = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (!found) return;
      }
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
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
    };
  }, []);

  if (!geo) return null;
  const { cx, cy, ringInner, ringOuter } = geo;
  const hitOuter = ringOuter + HIT_OUTER_PAD;
  const size = hitOuter * 2;
  const blocking = blockRingBus.state.blocking;
  const opacity = blocking ? 1 : blockRingBus.ringOpacity();
  const shieldAng = shieldAngleRef.current;

  const sx = hitOuter + Math.cos(shieldAng) * ((ringInner + ringOuter) / 2);
  const sy = hitOuter + Math.sin(shieldAng) * ((ringInner + ringOuter) / 2);

  // ── Activation (touchstart on hit-target circle or shield icon) ───────────
  const tryActivate = (clientX, clientY, identifier) => {
    const sinceRelease = performance.now() - rJoyReleasedAt.current;
    if (rJoyReleasedAt.current && sinceRelease < COMMITMENT_GAP_MS) return false;
    const S = window._gameState?.current;
    if (S) {
      S._shieldUp = true;
      const dx = clientX - cx, dy = clientY - cy;
      shieldAngleRef.current = Math.atan2(dy, dx);
      S._shieldAngle = shieldAngleRef.current;
      if (S.channel) {
        try { S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: true } }); } catch {}
      }
    }
    blockRingBus.beginBlock();
    dragActive.current = true;
    touchId.current = identifier ?? null;
    return true;
  };

  const onBandTouchStart = (e) => {
    // Use changedTouches[0] — the touch that just started — so we don't grab
    // the left-joystick's existing touch when the player is already moving.
    const t = e.changedTouches?.[0] ?? e.touches?.[0];
    if (!t) { tryActivate(e.clientX, e.clientY, null); e.stopPropagation(); return; }
    if (tryActivate(t.clientX, t.clientY, t.identifier)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onBandMouseDown = (e) => {
    if (tryActivate(e.clientX, e.clientY, null)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const flashAge = performance.now() - blockRingBus.state.parryFlashAt;
  const flashing = flashAge >= 0 && flashAge < 300;
  const flashAlpha = flashing ? 1 - flashAge / 300 : 0;

  // Outer wrapper: pointer-events: none — touches inside the joystick fall
  // through to the underlying joystick and continue to drive auto-attack.
  return (
    <div style={{
      position: 'fixed',
      left: cx - hitOuter, top: cy - hitOuter,
      width: size, height: size,
      zIndex: 31,
      pointerEvents: 'none',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', pointerEvents: 'none' }}>
        {/* Visible ring band */}
        <circle cx={hitOuter} cy={hitOuter} r={(ringInner + ringOuter) / 2}
          fill="none"
          stroke={`${C.ringFill}${opacity})`}
          strokeWidth={RING_BAND}
          style={{ transition: 'stroke 400ms ease-in-out' }} />
        <circle cx={hitOuter} cy={hitOuter} r={ringInner}
          fill="none" stroke={C.ringDashed} strokeWidth={1} strokeDasharray="3 3"
          style={{ opacity: blocking ? 1 : (opacity * 4) }} />
        <circle cx={hitOuter} cy={hitOuter} r={ringOuter}
          fill="none" stroke={C.ringDashed} strokeWidth={1} strokeDasharray="3 3"
          style={{ opacity: blocking ? 1 : (opacity * 4) }} />
        {blocking && (
          <LitArc ringInner={ringInner} ringOuter={ringOuter}
            center={hitOuter} centerAngle={shieldAng} />
        )}
        {flashAlpha > 0 && (
          <circle cx={sx} cy={sy} r={ringOuter * (1 - flashAlpha) + 8}
            fill="none" stroke={C.parryFlash} strokeWidth={3}
            style={{ opacity: flashAlpha }} />
        )}
        {/* Invisible hit target — extends outward from ringInner only, never
            inward, so the joystick's mana fill area stays untouched. */}
        <circle cx={hitOuter} cy={hitOuter}
          r={ringInner + (RING_BAND + HIT_OUTER_PAD) / 2}
          fill="none"
          stroke="rgba(0,0,0,0.001)"
          strokeWidth={RING_BAND + HIT_OUTER_PAD}
          pointerEvents="stroke"
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onTouchStart={onBandTouchStart}
          onMouseDown={onBandMouseDown}
        />
      </svg>
      {/* Shield icon — its own hit target, separate from the band. */}
      <div
        onTouchStart={onBandTouchStart}
        onMouseDown={onBandMouseDown}
        style={{
          position: 'absolute',
          left: sx - SHIELD_ICON_W / 2,
          top:  sy - SHIELD_ICON_H / 2,
          width: SHIELD_ICON_W, height: SHIELD_ICON_H,
          pointerEvents: 'auto',
          touchAction: 'none',
          cursor: 'pointer',
          filter: blocking ? 'drop-shadow(0 0 4px rgba(244,199,117,.7))' : 'none',
        }}>
        <ShieldGlyph active={blocking} />
      </div>
    </div>
  );
};
