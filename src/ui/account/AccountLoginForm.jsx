import React, { useState } from 'react';
import { normalizeLoginKey, checkAccountLogin, applyAccountLogin, getBtPassphrase } from '@/networking/index.js';

/* v2.3.1143: Login Key entry flow (see docs/specs/account-login.md).
   State machine: idle -> checking -> confirm | error -> switching.
   The typed key is validated by POST /api/account/login BEFORE anything
   is written to localStorage -- a blind write+reload would either
   destroy this device's current key (join_rejected auto-regen) or
   silently first-join-lock a fresh character on a typo.  The switch
   only happens after the server confirms exists:true AND the player
   taps Continue on the preview. */

const ERROR_COPY = {
  notfound: 'No character found with that key — check for typos.',
  auth: "That key doesn't match. Check for typos.",
  locked: 'Too many attempts — wait a minute and try again.',
  rate: 'Too many attempts — wait a minute and try again.',
  unavailable: "Login isn't available right now — try again later.",
  bad_request: 'That doesn’t look like a Login Key.',
  same: "You're already playing as this character.",
};

export const AccountLoginForm = () => {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | checking | confirm | switching
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);   // { key, preview }

  const submit = async () => {
    if (phase === 'checking' || phase === 'switching') return;
    const key = normalizeLoginKey(input);
    if (!key) return;
    setError('');
    if (key === getBtPassphrase()) { setError(ERROR_COPY.same); return; }
    setPhase('checking');
    const res = await checkAccountLogin(key);
    if (res.ok && res.exists) {
      setFound({ key, preview: res.preview || {} });
      setPhase('confirm');
      return;
    }
    setPhase('idle');
    if (res.ok && res.exists === false) setError(ERROR_COPY.notfound);
    else setError(ERROR_COPY[res.reason] || ERROR_COPY.unavailable);
  };

  const confirm = () => {
    if (!found) return;
    setPhase('switching');
    applyAccountLogin(found.key); // stashes the old key, writes, reloads
  };

  if (phase === 'confirm' || phase === 'switching') {
    const lvl = (found && found.preview && found.preview.level) || 1;
    const created = found && found.preview && found.preview.createdAt
      ? new Date(found.preview.createdAt).toLocaleDateString() : null;
    const curKey = getBtPassphrase();
    return (
      <div>
        <div style={{ fontSize: 16, color: '#3ddc97', fontWeight: 700, marginBottom: 6 }}>
          ✓ Found it!
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.45, marginBottom: 8 }}>
          Continue as your <b>Lv {lvl}</b> character{created ? ` (created ${created})` : ''}?
        </div>
        {curKey && curKey !== (found && found.key) && (
          <div style={{ fontSize: 14, color: '#ffb84d', lineHeight: 1.4, marginBottom: 10 }}>
            The character currently on this device will be signed out.
            Its Login Key is <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 }}>{curKey}</span> —
            save it first if you ever want to come back to it.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={confirm}
            disabled={phase === 'switching'}
            style={{
              flex: 1, padding: '11px 0', fontSize: 16, fontWeight: 700,
              background: '#3ddc97', color: '#0d0e16', border: 'none',
              borderRadius: 8, cursor: 'pointer', opacity: phase === 'switching' ? 0.6 : 1,
            }}
          >
            {phase === 'switching' ? 'Switching…' : 'Continue'}
          </button>
          <button
            onClick={() => { setPhase('idle'); setFound(null); }}
            disabled={phase === 'switching'}
            style={{
              flex: 1, padding: '11px 0', fontSize: 16, fontWeight: 700,
              background: 'rgba(255,255,255,0.08)', color: '#E8EAF8',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, letterSpacing: '.06em', color: '#96A2A0' /* v2.3.1233: Lantern text-2 (was navy #8890b8) */, marginBottom: 4 }}>
        CONTINUE A CHARACTER FROM ANOTHER DEVICE
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="type your Login Key…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          style={{
            flex: 1, minWidth: 0,
            /* 16px floor: iOS Safari auto-zooms inputs with smaller fonts. */
            fontSize: 16,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#E8EAF8',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '10px 10px',
          }}
        />
        <button
          onClick={submit}
          disabled={phase === 'checking'}
          style={{
            flexShrink: 0,
            background: '#5b52ff', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '0 14px',
            opacity: phase === 'checking' ? 0.6 : 1,
          }}
        >
          {phase === 'checking' ? 'Checking…' : 'Log in'}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 14, color: '#ff5e6c', marginTop: 6, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
};
