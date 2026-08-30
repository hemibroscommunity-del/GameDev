import React, { useEffect, useState } from 'react';
import { notificationsMuted, setNotificationsMuted, onGuardChange, guardActive } from './modalGuardBus.js';

/* ═══ SILENCE THE WORLD (v2.3.2145) ═══
 *
 * Owner: "give options to silence all notifications (on bottom left above
 * dashboard of screen)."
 *
 * Placed exactly there, and deliberately in the SAME corner as the world chat
 * feed, immediately under it: the control that silences a thing belongs beside
 * the thing, and a player who wants the corner quiet is already looking at it.
 * The feed is pushed up by this button's height so the two never overlap.
 *
 * IT MUST OUTLIVE ITS OWN EFFECT. The mute lives in modalGuardBus behind
 * localStorage, not in this component's state, for two reasons: a muted feed
 * renders at opacity 0, so a toggle living inside the feed would silence
 * itself out of existence and strand the player; and the same flag is what
 * the trade guard reads, so the silence control and the trade guard cannot
 * end up disagreeing about whether the chrome may speak.
 *
 * It hides while a decision panel is open, which is not an exception to the
 * above but the same rule applied to itself: it is world chrome too, it sits
 * over the play area, and the whole point of the guard is that nothing
 * transient is in front of a confirm button.
 */
export function NotificationMute() {
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
        position: 'fixed',
        left: 8,
        bottom: 'calc(var(--dash-h, 135px) + 8px)',
        zIndex: 26,
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
