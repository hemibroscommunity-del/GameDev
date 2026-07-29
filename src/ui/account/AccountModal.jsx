import React from 'react';
import { BUILD_INFO } from '../BuildBadge.jsx';
import { AccountKeyCard } from './AccountKeyCard.jsx';
import { AccountLoginForm } from './AccountLoginForm.jsx';

/* v2.3.1143: standalone account overlay -- used by the welcome screen's
   "Already have a character?" link (NameModal), where the dashboard's
   Account panel isn't reachable yet.  Self-contained styling (no dash
   COL import) so it renders correctly over the character creator. */
/* v2.3.1576 (owner: login screen buttons/menus are flat and blend in).
   This menu was off-system: a blue-black rgba(13,14,22,.97) sheet with
   #E8EAF8 bluish text, while everything it opens over is Lantern Slate
   (--ui-sheet #1E2E34, warm --ui-text) -- so it read as a different
   app's dialog.  Now on the shared tokens.  The close button was
   rgba(255,255,255,.08) with NO border, the same vanishing-control
   problem as the buttons behind it, and the title used a 🔑 emoji
   although the owner's painted cc-login-key.webp already ships and is
   what the button that OPENS this modal displays (spec do-not-drift:
   no text/emoji label as primary identity where an icon exists). */
export const AccountModal = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: 380, maxHeight: '85vh', overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'var(--ui-sheet)',
        border: '1px solid var(--ui-line-strong)',
        borderRadius: 14,
        /* spec --shadow-panel: lifts the dialog off the splash art behind it */
        boxShadow: '0 14px 30px rgba(4,7,9,.38)',
        padding: '14px 16px 16px',
        color: 'var(--ui-text)',
        fontFamily: 'Source Sans 3, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, letterSpacing: '.02em' }}>
          <img
            src={'/ui/welcome/cc/cc-login-key.webp?v=' + BUILD_INFO.version}
            alt="" draggable={false}
            style={{ width: 22, height: 22, objectFit: 'contain' }}
          />
          <span>Account</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="bt-cc-btn"
          style={{
            borderRadius: 8, width: 32, height: 32,
            fontSize: 16, cursor: 'pointer', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          ✕
        </button>
      </div>
      <AccountLoginForm />
      <div style={{ height: 1, background: 'var(--ui-line)', margin: '14px 0' }} />
      <AccountKeyCard />
    </div>
  </div>
);
