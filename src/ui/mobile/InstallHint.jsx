import React, { useEffect, useState } from 'react';
import { tapDismiss, TAP_DISMISS_STYLE } from '../tapDismiss.js'; /* v2.3.2284 */
import { installHintBus } from './installHintBus.js';

/* ═══ v2.3.2159: THE ADD-TO-HOME-SCREEN CARD ═══
 *
 * Owner: "there needs to be some kind of instruction on the game itself on
 * how to do this" — and then, proving the need in the same breath: "Where is
 * the share button?"  If the OWNER cannot find it, a player will not.
 *
 * WHO SEES IT.  iPhone/iPad Safari, in the BROWSER, only.  Launched from the
 * home screen (navigator.standalone / display-mode) there is nothing left to
 * teach; on Android the instruction would be a lie until a web manifest
 * ships (Add to Home Screen without one gives a shortcut, not fullscreen);
 * on desktop there is no share sheet at all.  The iPad test is the
 * MacIntel+touch one because modern iPadOS lies about its platform.
 *
 * WHEN.  Eight seconds after the world is in — after the welcome banner has
 * had its say (it holds ~5.2s) and the player has moved a step, not in the
 * first breath of the game.  Dismissed once, it stays dismissed
 * (localStorage), with the standing mitigation for everything cut: the way
 * back is one tap away, in Settings ("Play full screen"), through the bus.
 *
 * THE SHARE GLYPH IS DRAWN, NOT DESCRIBED.  The button the player must find
 * is an icon with no label, and it moves — bottom toolbar in portrait,
 * top-right in landscape.  Words alone sent the owner hunting; the card
 * shows the exact square-with-arrow shape instead, inline SVG, no asset to
 * preload (CLAUDE.md's law is about loadable assets; a 3-path vector is
 * not one). */
const KEY = 'bt_a2hs_hint_done';

const isIOS = () => {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch (e) { return false; }
};
const isStandalone = () => {
  try {
    if (window.navigator.standalone === true) return true;
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch (e) { return false; }
};
const dismissed = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
};

/* ═══ v2.3.2160: THE ICON IS A BUTTON, NOT A FOOTNOTE ═══
   Owner, after the first cut shipped with a 16px glyph inline in the
   sentence: "include the icon of what the share button looks like too" --
   it was there, and it read as punctuation.  A player hunting an unlabeled
   toolbar button needs a PICTURE OF THE BUTTON: the glyph now sits in its
   own Safari-toolbar-style chip, first thing in the card, at a size the
   eye lands on before the words. */
const ShareChip = () => (
  <div aria-hidden="true" style={{
    flex: '0 0 auto',
    width: 44, height: 44,
    borderRadius: 10,
    background: '#1C2A33',
    border: '1px solid rgba(229,237,233,.16)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg width="22" height="28" viewBox="0 0 16 20">
      <g stroke="#4E9CF5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8 h-1.2 v10 h12.4 v-10 H13" />
        <path d="M8 1.6 v10" />
        <path d="M4.6 4.6 L8 1.4 l3.4 3.2" />
      </g>
    </svg>
  </div>
);

export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* the Settings row reopens it regardless of the dismissal memory */
    const unsub = installHintBus.subscribe(() => setShow(true));
    if (!isIOS() || isStandalone() || dismissed()) return unsub;
    const t = setTimeout(() => setShow(true), 8000);
    return () => { clearTimeout(t); unsub(); };
  }, []);

  if (!show) return null;
  /* v2.3.2284: ONE dismissal moment for the whole file. The ✕ used to write
     the memory and hide inline on pointerup while nothing else could dismiss
     at all; with the card itself now tappable, two idioms in one file is how
     a ✕ press dismisses on pointerup and then has its synthesised click land
     on the world underneath. Both routes are onClick and both come here. */
  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch (err) { /* private window */ }
    setShow(false);
  };
  return (
    <div
      data-install-hint=""
      /* Owner: "allow the user to just tap on the messages to dismiss it".
         This is the one tutorial-era card with NO auto-expire -- it appears
         eight seconds into a first session on iPhone Safari and then sits
         until the ✕ is found -- it is pure instruction with nothing to
         decide, and its body was swallowing taps for nothing. */
      {...tapDismiss(dismiss)}
      style={{
        cursor: TAP_DISMISS_STYLE.cursor,
        touchAction: TAP_DISMISS_STYLE.touchAction,
        position: 'fixed',
        /* v2.3.2174: centred over the WORLD, not the screen — with a
           landscape panel open, screen-centre is partly underneath it.
           --world-x is 0 in portrait and at rest, so this is identical to
           the 50% it replaces everywhere else. */
        left: 'calc(var(--world-x, 0px) + var(--play-w, 100%) / 2)',
        transform: 'translateX(-50%)',
        bottom: 'calc(var(--dash-h, 145px) + 12px)',   /* zLayers rule 2: clear the band geometrically */
        zIndex: 31,
        width: 'min(92vw, 340px)',
        boxSizing: 'border-box',
        background: 'rgba(13,22,27,.94)',
        border: '1px solid rgba(229,237,233,.20)',
        borderRadius: 10,
        boxShadow: '0 14px 30px rgba(4,7,9,.38)',
        color: '#F4F0E7',
        fontFamily: 'Source Sans 3, sans-serif',
        padding: '10px 10px 12px 14px',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      <ShareChip />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#EAC675', marginBottom: 4 }}>
          PLAY FULL SCREEN
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          Tap <b>this button</b> in Safari — bottom bar upright, top-right
          sideways — then <b>Add&nbsp;to&nbsp;Home&nbsp;Screen</b>. Open Bro&nbsp;Town
          from that icon: no browser bar.
        </div>
      </div>
      <button
        data-install-hint-dismiss=""
        aria-label="Dismiss"
        /* v2.3.2284: onClick, matching the card -- see `dismiss` above. */
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          width: 44, height: 44, flex: '0 0 auto',
          margin: '-6px -6px 0 0',
          background: 'transparent', border: 'none',
          color: '#B6C1BE', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>
    </div>
  );
}
