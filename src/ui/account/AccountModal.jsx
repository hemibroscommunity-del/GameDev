import React from 'react';
import { AccountKeyCard } from './AccountKeyCard.jsx';
import { AccountLoginForm } from './AccountLoginForm.jsx';

/* v2.3.1143: standalone account overlay -- used by the welcome screen's
   "Already have a character?" link (NameModal), where the dashboard's
   Account panel isn't reachable yet.  Self-contained styling (no dash
   COL import) so it renders correctly over the character creator. */
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
        background: 'rgba(13,14,22,0.97)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12,
        padding: '14px 16px 16px',
        color: '#E8EAF8',
        fontFamily: 'Source Sans 3, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>🔑 Account</div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255,255,255,0.08)', color: '#E8EAF8',
            border: 'none', borderRadius: 8, width: 32, height: 32,
            fontSize: 16, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <AccountLoginForm />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />
      <AccountKeyCard />
    </div>
  </div>
);
