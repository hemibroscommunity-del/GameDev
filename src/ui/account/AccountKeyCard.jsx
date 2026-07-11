import React, { useRef, useState } from 'react';
import { getBtPassphrase } from '@/networking/index.js';

/* v2.3.1143: Login Key display card (see docs/specs/account-login.md).
   The silent passphrase IS the account credential; this card is the
   player-facing "save this somewhere" surface.  Clipboard write happens
   inside the tap handler (iOS Safari requires HTTPS + a user gesture);
   the readOnly input is the long-press-copy fallback for browsers where
   navigator.clipboard is unavailable. */
export const AccountKeyCard = () => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const phrase = getBtPassphrase();

  if (!phrase) {
    return (
      <div style={{ fontSize: 15, color: '#96A2A0' /* v2.3.1233: Lantern text-2 (was navy #8890b8) */, padding: '6px 0' }}>
        Guest session — this tab has no Login Key. Play in a normal tab
        to get a character that can be continued on other devices.
      </div>
    );
  }

  const copy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phrase).then(
          () => setCopied(true),
          () => selectFallback(),
        );
      } else {
        selectFallback();
      }
    } catch (e) { selectFallback(); }
    setTimeout(() => setCopied(false), 1600);
  };
  const selectFallback = () => {
    try {
      const el = inputRef.current;
      if (el) { el.focus(); el.select(); document.execCommand && document.execCommand('copy'); setCopied(true); }
    } catch (e) {}
  };

  return (
    <div>
      <div style={{ fontSize: 13, letterSpacing: '.06em', color: '#96A2A0' /* v2.3.1233: Lantern text-2 (was navy #8890b8) */, marginBottom: 4 }}>
        YOUR LOGIN KEY
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <input
          ref={inputRef}
          readOnly
          value={phrase}
          onFocus={(e) => { try { e.target.select(); } catch (err) {} }}
          style={{
            flex: 1, minWidth: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 16, fontWeight: 700,
            color: '#f5c542',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '10px 10px',
          }}
        />
        <button
          onClick={copy}
          style={{
            flexShrink: 0, minWidth: 74,
            background: copied ? '#3ddc97' : '#5b52ff',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            padding: '0 12px',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ fontSize: 14, color: '#ffb84d', marginTop: 8, lineHeight: 1.4 }}>
        ⚠️ This Login Key is the <b>only</b> way to get your character back
        on a new phone or after clearing your browser. Save it somewhere
        safe. There is no email recovery.
      </div>
    </div>
  );
};
