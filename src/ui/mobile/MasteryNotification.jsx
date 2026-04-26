import React, { useEffect, useState, useRef } from 'react';
import { subscribeMastery } from '../../game/mastery.js';

/* §12.1 / §12.2 / CR §8.49 — surfaced mastery + skill-cert notification.
   Acknowledgment, not celebration. Upper-left, 4 seconds, dismissible.
   Silent. Queues during combat and drains when combat ends. */

const COL = {
  bg:        '#F1EFE8',
  border:    '#E2DCC8',
  text:      '#2C2C2A',
  muted:     '#888780',
  certBg:    '#FBFAF6',
};

const TIER_DURATION_MS = 4000;
const CERT_DURATION_MS = 4000;

/* Combat-flag heuristic: S.lastDamageTaken set whenever the player takes a
   hit (see BroTown.jsx); a 5-second decay matches what the game already
   uses for its mana-regen / out-of-combat timing in the same file. */
const COMBAT_DECAY_MS = 5000;
const isInCombat = () => {
  try {
    const s = window._gameState?.current;
    if (!s) return false;
    if (s.lastDamageTaken && Date.now() - s.lastDamageTaken < COMBAT_DECAY_MS) return true;
    return false;
  } catch { return false; }
};

const accessibilityDisabled = () => {
  try { return localStorage.getItem('bt_mastery_notif_off') === '1'; } catch { return false; }
};

export const MasteryNotification = () => {
  const [shown, setShown] = useState(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const drainTickRef = useRef(null);

  useEffect(() => {
    /* Pull the next event off the queue and display it, unless combat is
       active — in which case poll until combat ends. */
    const tryShowNext = () => {
      if (shown) return;
      if (queueRef.current.length === 0) return;
      if (isInCombat()) {
        if (!drainTickRef.current) {
          drainTickRef.current = setInterval(() => {
            if (!isInCombat()) {
              clearInterval(drainTickRef.current);
              drainTickRef.current = null;
              tryShowNext();
            }
          }, 250);
        }
        return;
      }
      const next = queueRef.current.shift();
      setShown(next);
      const lifetime = next.kind === 'tier' ? TIER_DURATION_MS : CERT_DURATION_MS;
      timerRef.current = setTimeout(() => {
        setShown(null);
        timerRef.current = null;
        /* Defer to next tick so React state settles. */
        setTimeout(tryShowNext, 50);
      }, lifetime);
    };

    const off = subscribeMastery((ev) => {
      if (accessibilityDisabled()) return;
      queueRef.current.push(ev);
      tryShowNext();
    });

    return () => {
      off();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (drainTickRef.current) clearInterval(drainTickRef.current);
    };
  }, [shown]);

  if (!shown) return null;

  const dismiss = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setShown(null);
  };

  /* Tier crossing — two-line, slightly larger, opt-in hint italicised. */
  if (shown.kind === 'tier') {
    return (
      <div onClick={dismiss} style={{
        position: 'fixed', top: 14, left: 14, zIndex: 9300,
        maxWidth: 320, padding: '10px 12px',
        background: COL.bg,
        border: `1px solid ${COL.border}`, borderRadius: 8,
        cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
        animation: 'mastery-fade-in 240ms ease-out',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <style>{`@keyframes mastery-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{ fontSize: 13, color: COL.text, lineHeight: 1.35 }}>
          {shown.name} reached. Mastery {shown.tier}.
        </div>
        {shown.hint ? (
          <div style={{ fontSize: 12, color: COL.muted, lineHeight: 1.4, marginTop: 4, fontStyle: 'italic' }}>
            {shown.hint}
          </div>
        ) : null}
      </div>
    );
  }

  /* Certification — single-line, smaller, no hint. */
  return (
    <div onClick={dismiss} style={{
      position: 'fixed', top: 14, left: 14, zIndex: 9300,
      maxWidth: 320, padding: '8px 11px',
      background: COL.certBg,
      border: `1px solid ${COL.border}`, borderRadius: 8,
      cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
      animation: 'mastery-fade-in 240ms ease-out',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <style>{`@keyframes mastery-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ fontSize: 12, color: COL.text, lineHeight: 1.35 }}>
        Skill Certification: {shown.name}.
      </div>
    </div>
  );
};
