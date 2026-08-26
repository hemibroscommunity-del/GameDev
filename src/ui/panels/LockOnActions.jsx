import React from 'react';
import { triggerContextualDodge } from '@/game/dodge.js';
import { blockRingBus } from '@/ui/mobile/blockRingBus.js';

/* ═══ v2.3.1952: WHAT LOCKING ON GETS YOU ═══
 *
 * Owner: "Tap to lock on monster now gives you shield block, dodge, and special
 * attack as buttons that appear around the right joystick.  Since angle is
 * locked on just having the right joystick held down keeps doing the default
 * basic attack.  Dodge would just move in whatever direction your character is
 * moving.  If no movement dodge button grays out or become more transparent
 * (kind of like how the virtual joystick goes more transparent when it's
 * unused)."
 *
 * ── THE THREE ACTIONS ALREADY EXIST.  THIS IS A PLACE TO PUT THEM ──
 * Nothing here invents combat.  Blocking is the same contract BlockRing uses
 * (S._shieldUp + blockRingBus + the player_shield broadcast), dodge is
 * triggerContextualDodge, and special is BroTown's own doSpecialAttack.  What
 * was missing was a way to reach any of them without a gesture: block is a
 * double-tap-and-hold on the right joystick, dodge is a swipe, and both are
 * things you have to already know about.  Locked on, you are committed to one
 * enemy and your hands are on the sticks — so the three become buttons.
 *
 * ── AND THE BASIC ATTACK NEEDS NOTHING ──
 * The owner is right that holding the right joystick keeps swinging: that has
 * been the auto-attack input since long before this (rS sets S.autoAttack on
 * touchstart and the hold sustains it), and with a target locked the angle
 * comes from the lock rather than the stick.  So there is deliberately no
 * fourth button here.  Adding one would have duplicated an input that already
 * works and split the muscle memory in two.
 *
 * ── WHY AN ARC AND NOT A COLUMN ──
 * The ability buttons (Shield Bash / Whirlwind, v2.3.1733) already own the
 * column directly above the right joystick at right:18.  A second column would
 * either collide with them or push one of the two off the top of the reachable
 * zone.  These three ride an arc around the disc on the side the ability
 * column is not on, so both clusters are thumb-reachable and neither overlaps.
 *
 * ── EVERY BUTTON STOPS THE EVENT ──
 * The entire right half of the screen is the combat joystick's touch zone
 * (rZoneRef, zIndex 6).  These sit above it at zIndex 31 and swallow their own
 * touches, exactly as the ability buttons do — without that, tapping Dodge
 * would ALSO start an auto-attack under it.
 */

/* Where each button sits, as an angle around the joystick disc and a radius
   from its centre.  0deg is due right and angles run counter-clockwise, so
   these three sweep up and to the left, away from the ability column. */
const ARC = [
  { id: 'special', deg: 104 },
  { id: 'dodge', deg: 152 },
  { id: 'block', deg: 200 },
];
const ARC_R = 78;

/* Below this the character is standing still, so there is no direction to
   dodge in.  Matches the threshold the renderer uses to decide the figure is
   moving at all (entityRenderer's isMoving). */
const MOVE_EPS = 0.01;

export function LockOnActions(props) {
  const stateRef = props.stateRef;
  const isLandscape = props.isLandscape;
  const doSpecialAttack = props.doSpecialAttack;

  /* Lock-on, velocity and the shield all live on the mutable state object
     rather than in React, so this polls — the same 200ms the ability buttons
     use, which is fast enough that greying out reads as immediate and cheap
     enough to sit beside the game loop. */
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((v) => (v + 1) % 1000000), 200);
    return () => clearInterval(id);
  }, []);

  const S = stateRef && stateRef.current;
  if (!S || !S.lockedTarget) return null;

  const P = S.player || {};
  const vx = P.vx || 0, vy = P.vy || 0;
  const moving = Math.abs(vx) > MOVE_EPS || Math.abs(vy) > MOVE_EPS;
  const blocking = !!S._shieldUp;

  const disc = isLandscape ? 98 : 83;
  const cxRight = 50 + disc / 2;          /* the disc's centre, from the right edge */
  const cyBottom = 70 + disc / 2;         /* ...and above the sheet */
  const size = isLandscape ? 54 : 50;

  /* Point the shield at whatever is locked, because that is what "locked on"
     means — the same angle the auto-attack is already using. */
  const targetAngle = () => {
    const t = S.lockedTarget && S.lockedTarget.ref;
    if (!t || !S.player) return S._aimAngle || 0;
    return Math.atan2(t.y - S.player.y, t.x - S.player.x);
  };

  const startBlock = () => {
    const st = stateRef.current;
    if (!st) return;
    const ang = targetAngle();
    st._shieldUp = true;
    st._shieldAngle = ang;
    /* BlockRing also sets _aimAngle/_aiming here, and this deliberately does
       NOT.  Measured: it does not stick — the loop clears both when no touch
       is on the right joystick, so a block raised from a button read back with
       _aimAngle null a moment later.  It costs nothing to lose, either: the
       whole point of a lock is that the game already aims at the locked
       target, so the only thing this button needs to own is the shield. */
    if (st.channel) {
      try {
        st.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: st.myId, up: true } });
      } catch (e) { /* offline or reconnecting: the local block still holds */ }
    }
    blockRingBus.beginBlock();
    setTick((v) => v + 1);
  };
  const stopBlock = () => {
    const st = stateRef.current;
    if (st) {
      st._shieldUp = false;
      if (st.channel) {
        try {
          st.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: st.myId, up: false } });
        } catch (e) { /* as above */ }
      }
    }
    blockRingBus.endBlock();
    setTick((v) => v + 1);
  };

  const doDodge = () => {
    const st = stateRef.current;
    if (!st) return;
    const p = st.player || {};
    const dx = p.vx || 0, dy = p.vy || 0;
    /* No direction, no dodge.  The button is already dimmed to say so; this is
       the guard that makes the dimming honest rather than decorative. */
    if (Math.abs(dx) <= MOVE_EPS && Math.abs(dy) <= MOVE_EPS) return;
    try { triggerContextualDodge(st, st.rpg, Math.atan2(dy, dx)); } catch (e) { /* ignore */ }
  };

  const ACT = {
    block: {
      glyph: '\u{1F6E1}', label: 'Block', live: true, on: blocking,
      hold: true, press: startBlock, release: stopBlock,
    },
    dodge: {
      glyph: '\u{1F4A8}', label: 'Dodge', live: moving, on: false,
      press: doDodge,
    },
    special: {
      glyph: '✦', label: 'Special', live: true, on: false,
      press: () => { try { doSpecialAttack && doSpecialAttack(); } catch (e) { /* ignore */ } },
    },
  };

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    style: {
      position: 'fixed',
      right: cxRight,
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + cyBottom + 'px)',
      width: 0, height: 0, zIndex: 31,
      WebkitUserSelect: 'none', userSelect: 'none',
    },
  }, ARC.map((slot) => {
    const a = ACT[slot.id];
    const rad = (slot.deg * Math.PI) / 180;
    /* `right` grows leftward, so a leftward offset is a POSITIVE right. */
    const dRight = -Math.cos(rad) * ARC_R;
    const dUp = Math.sin(rad) * ARC_R;
    return React.createElement('div', {
      key: slot.id,
      'data-lockon': slot.id,
      onTouchStart: (e) => {
        e.preventDefault(); e.stopPropagation();
        if (a.live) a.press();
      },
      onTouchEnd: (e) => {
        e.preventDefault(); e.stopPropagation();
        if (a.hold) a.release();
      },
      onTouchCancel: (e) => { e.stopPropagation(); if (a.hold) a.release(); },
      /* Mouse for the headless harness and for a desktop pointer; the keys
         remain the real desktop input. */
      onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); if (a.live) a.press(); },
      onMouseUp: (e) => { e.stopPropagation(); if (a.hold) a.release(); },
      style: {
        position: 'absolute',
        right: Math.round(dRight - size / 2),
        bottom: Math.round(dUp - size / 2),
        width: size, height: size, borderRadius: '50%',
        touchAction: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        /* Lantern Slate, matching the ability buttons exactly: a raised slate
           disc with a brass edge when it will do something. */
        background: a.on
          ? 'radial-gradient(circle, #6B5326 0%, #3A2C13 100%)'
          : 'radial-gradient(circle, #34444B 0%, #202C32 100%)',
        border: '2px solid ' + (a.live ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        boxShadow: a.live ? 'inset 0 1px 0 rgba(255,255,255,.08)' : 'none',
        /* The owner's own reference for the unavailable state: "more
           transparent (kind of like how the virtual joystick goes more
           transparent when it's unused)".  The right disc rests at 0.5. */
        opacity: a.live ? 1 : 0.45,
        transition: 'opacity 120ms linear',
      },
    },
    React.createElement('span', {
      style: { fontSize: isLandscape ? 19 : 17, pointerEvents: 'none' },
    }, a.glyph),
    React.createElement('span', {
      style: {
        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
        color: a.live ? '#F7F2E7' : '#687575', pointerEvents: 'none', marginTop: 2,
      },
    }, a.label));
  }));
}
