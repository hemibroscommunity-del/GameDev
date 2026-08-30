import React, { useEffect, useState } from 'react';
import { notificationsMuted, setNotificationsMuted, onGuardChange, guardActive } from './modalGuardBus.js';

/* ═══ SILENCE THE WORLD (v2.3.2145) ═══
 *
 * Owner: "give options to silence all notifications (on bottom left above
 * dashboard of screen)."
 *
 * IT IS NOT A FLOATING BUTTON, AND THAT IS THE WHOLE STORY OF THIS FILE.
 * The first cut was exactly what was asked for -- position:fixed, left 8, just
 * above the dashboard -- and it broke MOVEMENT. The bottom left of the play
 * area is not empty space: `data-joyzone="L"` (TouchControls) is a fixed,
 * invisible, FULL-LEFT-HALF-OF-THE-SCREEN pad at z-index 6 that receives every
 * movement drag. Anything interactive placed over it wins the touch and the
 * player cannot walk. TouchControls already records this rule one element
 * down, where the VISIBLE joystick disc is deliberately pointerEvents:'none'
 * -- "this corner box must not intercept them". A floating control there is a
 * control on top of the thumbstick.
 *
 * Caught by mp-duelfeel, which is a COMBAT test and has no idea this component
 * exists: two duellists simply stopped being able to close the distance
 * between them (233px apart, zero damage, nobody died) because the harness
 * walks with the keyboard and the pad had gone deaf. It would have shipped as
 * "I can't move in the bottom left".
 *
 * So the chip lives INSIDE the world chat feed's shell instead -- still the
 * bottom left, still above the dashboard, sitting with the feed it silences
 * and above it rather than under it, in the strip the feed's own fold header
 * has always occupied safely. It is rendered by WorldChatFeed, not mounted
 * separately, so it inherits that shell's position and can never drift back
 * down onto the stick.
 */export function NotificationMute() {
  const [, bump] = useState(0);
  useEffect(() => onGuardChange(() => bump((n) => n + 1)), []);
  const muted = notificationsMuted();
  if (guardActive()) return null;
  return (
    <button
      type="button"
      data-notif-mute={muted ? 'on' : 'off'}
      aria-pressed={muted}
      aria-label={muted ? 'Notifications silenced — tap to unmute' : 'Silence all notifications'}
      onClick={() => setNotificationsMuted(!muted)}
      style={{
        /* The feed's shell is pointerEvents:'none' so the world stays
           draggable around it; this control opts back in for its own few
           pixels, the same bargain the fold header makes. */
        pointerEvents: 'auto',
        alignSelf: 'flex-start',
        margin: '0 0 3px 0',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 9px',
        borderRadius: 999,
        border: `1px solid ${muted ? 'rgba(217,92,84,.55)' : 'rgba(255,255,255,.16)'}`,
        background: muted ? 'rgba(50,20,20,.72)' : 'rgba(12,20,24,.62)',
        color: muted ? '#E8A19B' : 'rgba(255,255,255,.62)',
        font: '700 10px/1 "Source Sans 3", sans-serif',
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        backdropFilter: 'blur(6px)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 11 }}>{muted ? '🔕' : '🔔'}</span>
      {muted ? 'Silenced' : 'Notifications'}
    </button>
  );
}
