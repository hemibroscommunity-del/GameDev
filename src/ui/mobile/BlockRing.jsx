import React, { useEffect, useRef, useState } from 'react';
import { blockRingBus } from './blockRingBus.js';

// Color canon — spec §"Color and Typography Canon".
const C = {
  parryFlash:  '#F4E0A8',
};

// Ring track is invisible — only the shield icon is shown. RING_BAND still
// determines how far out the icon orbits from the joystick edge.
const RING_BAND = 36;
const RING_GAP  = 7;
const SHIELD_ICON_W = 90;
const SHIELD_ICON_H = 90;
const COMMITMENT_GAP_MS = 75;

// Wood-shield sprite URLs — match the version used by the Pixi loader so the
// browser cache is shared with the in-game shield. When equip slots exist, the
// `equippedShield` lookup should swap these out.
const SHIELD_SPRITE_VERSION = '2.1.23';
const SHIELD_SPRITES = {
  front: `/sprites/shields/wood-shield-front.png?v=${SHIELD_SPRITE_VERSION}`,
  '3q':  `/sprites/shields/wood-shield-3q.png?v=${SHIELD_SPRITE_VERSION}`,
  side:  `/sprites/shields/wood-shield-side.png?v=${SHIELD_SPRITE_VERSION}`,
};
// Same sector → (view, mirror) mapping the in-game renderer uses
// (see shieldSprites.js#getShieldFrame). Keeps the joystick icon in sync
// with how the held shield is drawn. NE (7) and NW (5) use the opposite
// mirror from their S-side counterparts so they don't read as SE/SW.
const SHIELD_VIEW   = ['side', '3q', 'front', '3q', 'side', '3q', 'front', '3q'];
const SHIELD_MIRROR = [false,   false, false,  true,  true,   false, false,  true];
const pickShieldFrame = (angle) => {
  const TAU = Math.PI * 2;
  const a = ((angle % TAU) + TAU) % TAU;
  const sector = Math.round(a / (Math.PI / 4)) % 8;
  return { src: SHIELD_SPRITES[SHIELD_VIEW[sector]], mirror: SHIELD_MIRROR[sector] };
};

const useRaf = (cb) => {
  useEffect(() => {
    let raf;
    const tick = (now) => { cb(now); raf = requestAnimationFrame(tick); };
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

// Miniaturized wood-shield icon — uses the same three sprite views as the
// in-game shield (front / 3-quarter / side) so the joystick icon previews the
// actual held shield. When `active` (blocking) it renders at full opacity; idle
// it dims so the player can still see through the icon.
const ShieldGlyph = ({ active, frame }) => (
  <img
    src={frame.src}
    alt=""
    draggable={false}
    style={{
      width: SHIELD_ICON_W,
      height: SHIELD_ICON_H,
      transform: frame.mirror ? 'scaleX(-1)' : 'none',
      opacity: active ? 1 : 0.6,
      imageRendering: 'pixelated',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  />
);

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

    // Shield icon follows the right-joystick auto-attack direction. Priority:
    //   1. Locked target — angle from player to target.
    //   2. S._aimAngle — last right-joystick aim (persists after release).
    // Movement (left joystick / S._facingAngle) is intentionally ignored:
    // the shield protects whatever direction the player is attacking.
    const S = window._gameState?.current;
    let autoAtkAng = null;
    if (S) {
      const lt = S.lockedTarget && S.lockedTarget.ref;
      if (lt && S.player) {
        autoAtkAng = Math.atan2((lt.y || 0) - S.player.y, (lt.x || 0) - S.player.x);
      } else if (typeof S._aimAngle === 'number') {
        autoAtkAng = S._aimAngle;
      }
    }
    if (!dragActive.current && autoAtkAng != null) {
      shieldAngleRef.current = lerpAngle(shieldAngleRef.current, autoAtkAng, 0.2);
    }
    if (S) {
      S._shieldAngle = shieldAngleRef.current;
      // While the player is dragging the shield, keep the auto-attack
      // pinned to the shield direction every frame — guards against the
      // right-joystick handler racing in and clearing _aiming.
      if (dragActive.current) {
        S._aimAngle = shieldAngleRef.current;
        S._aiming = true;
      }
    }

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
      // Drive auto-attack to match the shield direction so what the player
      // is blocking and what they're attacking always line up.
      const S = window._gameState?.current;
      if (S) {
        S._shieldAngle = ang;
        S._aimAngle = ang;
        S._aiming = true;
      }
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
  const size = ringOuter * 2;
  const blocking = blockRingBus.state.blocking;
  const shieldAng = shieldAngleRef.current;

  const sx = ringOuter + Math.cos(shieldAng) * ((ringInner + ringOuter) / 2);
  const sy = ringOuter + Math.sin(shieldAng) * ((ringInner + ringOuter) / 2);

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
      // Touching the ring also sets the auto-attack direction — shield and
      // attack always point the same way.
      S._aimAngle = shieldAngleRef.current;
      S._aiming = true;
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
      left: cx - ringOuter, top: cy - ringOuter,
      width: size, height: size,
      zIndex: 31,
      pointerEvents: 'none',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', pointerEvents: 'none' }}>
        {/* Ring band, dashed guides, lit arc, and 360° hit target are all
            removed — the shield icon is the only visible / touchable element.
            The track around the joystick is invisible; the player must grab
            the icon and slide it around to reposition the block. */}
        {flashAlpha > 0 && (
          <circle cx={sx} cy={sy} r={ringOuter * (1 - flashAlpha) + 8}
            fill="none" stroke={C.parryFlash} strokeWidth={3}
            style={{ opacity: flashAlpha }} />
        )}
      </svg>
      {/* Shield icon — sole visible/touchable element. The wood-shield is
          drawn upright in each view; direction is conveyed by the icon's
          position around the ring plus the view/mirror change (front for
          N/S, 3q for diagonals, side for E/W), matching the in-game shield. */}
      <div
        onTouchStart={onBandTouchStart}
        onMouseDown={onBandMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          left: sx - SHIELD_ICON_W / 2,
          top:  sy - SHIELD_ICON_H / 2,
          width: SHIELD_ICON_W, height: SHIELD_ICON_H,
          pointerEvents: 'auto',
          touchAction: 'none',
          cursor: 'pointer',
          // Suppress the iOS long-press callout / share menu and selection.
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          filter: blocking ? 'drop-shadow(0 0 4px rgba(244,199,117,.7))' : 'none',
        }}>
        <ShieldGlyph active={blocking} frame={pickShieldFrame(shieldAng)} />
      </div>
    </div>
  );
};
