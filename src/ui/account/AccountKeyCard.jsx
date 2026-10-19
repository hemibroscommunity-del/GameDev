import React, { useRef, useState } from 'react';
import { getBtPassphrase, isNewKey } from '@/networking/index.js';

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
      {/* ═══ v2.3.3355: A NEW KEY, AS EIGHT WORDS ═══
          (server/src/loginkeys.js.)  Forty-odd characters do not fit one line
          on a phone, so the words are laid out two by four, numbered, the
          way they are typed; the input below still holds the whole key for
          Copy and select. */}
      {/* ═══ v2.3.3479: FOUR ACROSS WHERE THEY FIT (the 2026-10-19 UI review) ═══
          Two by four, the label and the words alone took ~155 px of the ~159
          an upright phone's page has (169 on a laptop), so Copy and "There
          is no email recovery" waited below the fold everywhere but sideways.
          Now a row holds as many words as fit, each cell at least 80 px (a
          five-letter word's: its number, the gap, 16 px mono and the padding)
          and at least a quarter of the row less its gaps, so never more than
          four: 4 + 4 on a phone 350 px wide and up, the laptop and the
          computer (a plain auto-fill would have put five on their wider
          rows, 5 + 3), 3 + 3 + 2 at 320, two by four sideways as before.  All
          eight words and Copy are then in the first view; the order is still
          1 to 8, row by row (mp-newkey reads it).  19 px is the three 6 px
          gaps and a pixel to spare, so rounding never drops the fourth. */}
      {isNewKey(phrase) && (
        <ol data-bt="account-keycard-words" style={{
          listStyle: 'none', margin: '0 0 6px', padding: 0,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(max(80px, calc((100% - 19px) / 4)), 1fr))', gap: '4px 6px',
        }}>
          {phrase.split('-').map((w, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'baseline', gap: 6, minHeight: 28,
              padding: '4px 6px', borderRadius: 6, background: 'var(--ui-well)',
              border: '1px solid var(--ui-line-strong)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--ui-text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 12 }}>{i + 1}</span>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 16, fontWeight: 700, color: '#EAC675' }}>{w}</span>
            </li>
          ))}
        </ol>
      )}
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
      {/* v2.3.3344: an old key works only on the devices it is played on
          (server/src/devicelock.js) -- a new one also needs the owner.
          v2.3.3355: a NEW key works on any device (server/src/loginkeys.js) */}
      {isNewKey(phrase) ? (
        <div data-bt="account-keycard-device" data-newkey="1" style={{ fontSize: 12, color: 'var(--ui-text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
          This key works on any phone or computer: type its eight words at the
          start screen's Login Key.
        </div>
      ) : (
        <div data-bt="account-keycard-device" style={{ fontSize: 12, color: 'var(--ui-text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
          On a new phone or computer, the game's owner also has to let it in:
          the screen there gives you a code to send them.
        </div>
      )}
    </div>
  );
};
