import React from 'react';

/* === UpdateBanner — "this tab is running an old build" === */
/* v2.3.1718.  Owner, after judging: a judge did not share the same world,
   and the cause was a tab left open across one of the four client deploys
   that went out that hour.  Nothing on screen told them; the game simply
   behaved as if nobody else existed.
 *
 * Lantern Slate card, pinned under the zone-header rail so it clears both
 * the 46px header and the top-left quest reminder.  position:fixed rather
 * than absolute so it anchors to the desktop play window (#root is a
 * containing block via contain:paint, v2.3.1715) and to the viewport on a
 * phone — one rule, right on both.
 *
 * It is DISMISSIBLE and it does not block anything.  The stale tab still
 * works; it is just out of date, and interrupting a fight with a modal over
 * that would be a worse bug than the one it reports. */
export function UpdateBanner({ info, onReload, onDismiss }) {
  if (!info) return null;
  return React.createElement('div', {
    /* The tap must not reach the world underneath — the canvas takes clicks
       as attack/aim (the same guard the quest reminder and tour prompt use). */
    onPointerDown: (e) => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: 56,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 34,
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      /* v2.3.1718: WIDTH, not max-width.  A fixed + translateX(-50%) box
         shrink-to-fits its content, and with the Reload and ✕ buttons taking
         their share the text column collapsed until "New version available"
         wrapped onto three lines in the 480px desktop play window (measured:
         the card came out 240px). */
      width: 'min(92%, 340px)',
      padding: '8px 10px 8px 12px',
      borderRadius: 10,
      background: 'rgba(17,25,29,.94)',
      border: '1px solid rgba(216,169,77,.45)',
      boxShadow: '0 6px 20px rgba(0,0,0,.45)',
      fontFamily: 'Source Sans 3, sans-serif',
    },
  },
  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
    React.createElement('div', {
      style: { fontSize: 13, fontWeight: 700, color: '#D8A94D', lineHeight: 1.25 },
    }, '↻ New version available'),
    React.createElement('div', {
      style: { fontSize: 11, lineHeight: 1.3, marginTop: 1, color: 'rgba(255,255,255,.72)' },
    }, 'This tab is running an older build. Reload to join everyone else.')),
  React.createElement('button', {
    onClick: onReload,
    style: {
      flex: '0 0 auto', minHeight: 32, padding: '6px 12px', borderRadius: 8, border: 'none',
      background: '#D8A85F', color: '#20170D', fontWeight: 700, fontSize: 12, cursor: 'pointer',
    },
  }, 'Reload'),
  React.createElement('button', {
    onClick: onDismiss,
    'aria-label': 'Dismiss',
    style: {
      flex: '0 0 auto', minWidth: 28, minHeight: 32, padding: '0 6px', borderRadius: 8,
      border: 'none', background: 'transparent', color: 'rgba(255,255,255,.55)',
      fontSize: 15, cursor: 'pointer',
    },
  }, '✕'));
}
