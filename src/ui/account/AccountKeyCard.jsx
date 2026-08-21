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
      /* v2.3.1235: batch-1 rollout — empty state sits directly on the
         sheet: 13/700 secondary message + 12 muted support line, per
         the locked Lantern Slate correction sheet (no big container). */
      <div style={{ padding: '6px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ui-text-secondary)' }}>
          Guest session — this tab has no Login Key.
        </div>
        <div style={{ fontSize: 12, color: 'var(--ui-text-muted)', marginTop: 2 }}>
          Play in a normal tab to get a character that can be continued
          on other devices.
        </div>
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

  /* v2.3.1235: batch-1 rollout — the card still wore the retired navy
     theme (#5b52ff button, #f5c542 key, #ffb84d amber note).  Now on
     the locked Lantern Slate sheet: 11/700 uppercase module header,
     key reveal = brass-highlight 16/700 mono in a well trough (the key
     is THE premium object here, so it gets the brass), Copy is a
     44px-tall secondary button (routine/reversible — never gold; the
     copied flash reuses the approved positive token as text, not a
     fill), and the loss warning drops its chrome emoji and reads as
     12px secondary copy.  Copy/select handlers byte-identical. */
  return (
    /* v2.3.1823: a QA handle.  "The login door must not show this card" is a
       claim about a specific component being absent, and querying for its
       heading text would pass the moment someone rewords the heading. */
    <div data-bt="account-keycard">
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.14em', color: 'var(--ui-text-muted)', marginBottom: 4,
      }}>
        Your Login Key
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
            fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: '#EAC675',
            background: 'var(--ui-well)',
            border: '1px solid var(--ui-line-strong)',
            borderRadius: 8,
            padding: '10px 10px',
            minHeight: 44,
          }}
        />
        <button
          onClick={copy}
          className="button-secondary"
          style={{
            flexShrink: 0, minWidth: 74, minHeight: 44,
            color: copied ? '#55B98A' : 'var(--ui-text)',
            fontSize: 15,
            padding: '0 12px',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ui-text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
        This Login Key is the <b>only</b> way to get your character back
        on a new phone or after clearing your browser. Save it somewhere
        safe. There is no email recovery.
      </div>
    </div>
  );
};
