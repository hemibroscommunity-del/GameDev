import React, { useRef } from 'react';
import { COL } from './common.js';
import { actionBus } from '../actionBus.js';

/* v2.3.1636: the band's shared TILE PRIMITIVES, lifted verbatim out of
   QuickBar.jsx when the quick bar was replaced by the three-column
   dashboard (owner reference shot, 2026-08-06).  Nothing here is new —
   it is the same cell chrome and the same weapon-swap gesture the quick
   bar shipped with at v2.3.1560/1562, moved to a file that outlives it
   so the columns and any future band row share ONE implementation.

   The important survivor is WeaponCell.  v2.3.1562 put a VISIBLE swap
   button in the band because the left-joystick double-tap that used to
   be the only way to swap weapons was undiscoverable — "the game's own
   owner did not know it was there" — and had to win a 220ms race against
   the movement thumb's own taps.  Retiring the quick bar without
   carrying this into the LOADOUT column would have quietly restored that
   bug, so the cell moved instead of dying with its row. */

export const cellBase = {
  background: COL.tile,
  border: '1px solid rgba(139, 150, 149, 0.55)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  cursor: 'pointer',
  touchAction: 'manipulation',
  flex: 'none',
  overflow: 'hidden',
};

/* Hand the cell's own rect to the popup so it anchors beside the tapped
   cell (the ItemTile/Equipped convention). */
export const withAnchor = (fn) => (e) => {
  e.stopPropagation();
  let anchor = null;
  try {
    const r = e.currentTarget.getBoundingClientRect();
    anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  } catch (_e) {}
  fn(anchor);
};

const HOLD_MS = 420;

export const WeaponCell = ({ src, size, slotLabel, onHold }) => {
  const timer = useRef(null);
  const held = useRef(false);
  const anchorRef = useRef(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const rectOf = (el) => {
    try {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    } catch (_e) { return null; }
  };
  return (
    <div
      title={slotLabel ? `${slotLabel} — tap to swap, hold to change` : 'Weapon'}
      onPointerDown={(e) => {
        e.stopPropagation();
        held.current = false;
        anchorRef.current = rectOf(e.currentTarget);
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          timer.current = null;
          if (onHold) onHold(anchorRef.current);
        }, HOLD_MS);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        clear();
        /* The hold already fired — a tap must not ALSO swap behind the
           open picker. */
        if (held.current) return;
        actionBus.cycleWeapon();
      }}
      /* Cancel and leave both abort: sliding off the cell is how a player
         backs out of a press they didn't mean. */
      onPointerCancel={() => { clear(); held.current = true; }}
      onPointerLeave={() => { clear(); held.current = true; }}
      style={{ ...cellBase, width: size, height: size }}>
      {src
        ? <img src={src} alt="" draggable={false}
            style={{ width: '82%', height: '82%', objectFit: 'contain', pointerEvents: 'none' }} />
        : <span style={{ fontSize: Math.round(size * 0.42), opacity: 0.3, pointerEvents: 'none' }}>◇</span>}
      {/* The affordance marker.  Without it this reads as "the weapon you
          have" rather than "the weapon you can change" — which is the
          discoverability failure the double-tap gesture had. */}
      <span aria-hidden="true" style={{
        position: 'absolute', right: 1, bottom: 0,
        fontSize: 10, lineHeight: 1.2, fontWeight: 800,
        color: COL.accent || '#D8A94D',
        textShadow: '0 1px 2px rgba(9,14,17,.95)',
        pointerEvents: 'none',
      }}>⇄</span>
    </div>
  );
};

export const IconCell = ({ src, alt, size, onTap, badge, dim, title }) => (
  <div onPointerUp={onTap ? withAnchor(onTap) : undefined} title={title || alt}
    style={{ ...cellBase, width: size, height: size, cursor: onTap ? 'pointer' : 'default' }}>
    {src
      ? <img src={src} alt="" draggable={false}
          style={{ width: '82%', height: '82%', objectFit: 'contain', opacity: dim ? 0.3 : 1, pointerEvents: 'none' }} />
      : <span style={{ fontSize: Math.round(size * 0.42), opacity: 0.3, pointerEvents: 'none' }}>◇</span>}
    {badge != null && (
      <span aria-hidden="true" style={{
        position: 'absolute', right: 1, bottom: 0,
        fontSize: 9, fontWeight: 800, lineHeight: 1.3,
        color: COL.text2, textShadow: '0 1px 2px rgba(9,14,17,.9)',
        fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
      }}>{badge}</span>
    )}
  </div>
);
