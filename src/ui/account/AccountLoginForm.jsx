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

/* ═══ v2.3.1823: THE LOGIN DOOR DOES NOT ASK TWICE ═══
 *
 * Owner: "make it so that when you enter your character key you just
 * immediately join the game.  Right now it's broken and does nothing after
 * you enter it."
 *
 * The confirm step below (v2.3.1143) exists to protect something real: from
 * the IN-GAME Account panel, entering another character's key signs THIS
 * device's character out, and its key is gone unless you wrote it down.  The
 * preview + Continue is what stops that being a one-tap accident.
 *
 * None of that is true on the login screen.  You are standing there
 * BECAUSE this device has no character — there is nothing to sign out and
 * nothing to lose, so the second tap is pure friction, and (the owner's
 * report) it reads as the form having done nothing at all: you type the key,
 * the button says "Checking…", and then the same modal is still sitting
 * there with a question in it rather than a game.
 *
 * So the guard follows the risk instead of the form: `immediate` skips
 * straight to the switch, and only the login door passes it.  The in-game
 * panel is untouched.
 */
export const AccountLoginForm = ({ immediate = false }) => {
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
      /* v2.3.1823: on the login door, a key that checks out IS the answer.
         setPhase before applying so the button reads "Switching…" for the
         moment before the reload — applyAccountLogin reloads the page, and
         a button still saying "Checking…" while the screen sits there is the
         exact "it does nothing" the owner reported. */
      if (immediate) {
        setFound({ key, preview: res.preview || {} });
        setPhase('switching');
        applyAccountLogin(key);
        return;
      }
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

  /* v2.3.1823: in immediate mode 'switching' must NOT render the confirm
     view — the page is already reloading, and flashing a "Continue as your
     Lv 3 character?" card on the way out is the same double-ask by another
     name.  Show the plain form with a working label instead. */
  if (phase === 'confirm' || (phase === 'switching' && !immediate)) {
    const lvl = (found && found.preview && found.preview.level) || 1;
    const created = found && found.preview && found.preview.createdAt
      ? new Date(found.preview.createdAt).toLocaleDateString() : null;
    const curKey = getBtPassphrase();
    /* v2.3.1235: batch-1 rollout — confirm view still wore the retired
       navy theme (#3ddc97 filled-green Continue, white-alpha Cancel,
       #ffb84d amber, a ✓ glyph in chrome).  Now on the locked sheet:
       Continue is THE one gold primary on this surface (it commits the
       device switch), Cancel is the standard secondary, the found line
       uses the approved positive token as text only, and the sign-out
       warning is 12px secondary copy.  All three handlers + the state
       machine are byte-identical. */
    return (
      <div>
        <div style={{ fontSize: 16, color: '#55B98A', fontWeight: 700, marginBottom: 6 }}>
          Found it!
        </div>
        <div style={{ fontSize: 13, color: 'var(--ui-text)', lineHeight: 1.45, marginBottom: 8 }}>
          Continue as your <b>Lv {lvl}</b> character{created ? ` (created ${created})` : ''}?
        </div>
        {curKey && curKey !== (found && found.key) && (
          <div style={{ fontSize: 12, color: 'var(--ui-text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
            The character currently on this device will be signed out.
            Its Login Key is <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 }}>{curKey}</span> —
            save it first if you ever want to come back to it.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={confirm}
            disabled={phase === 'switching'}
            className="button-primary"
            style={{
              flex: 1, minHeight: 44, padding: '11px 0', fontSize: 15,
              opacity: phase === 'switching' ? 0.6 : 1,
            }}
          >
            {phase === 'switching' ? 'Switching…' : 'Continue'}
          </button>
          <button
            onClick={() => { setPhase('idle'); setFound(null); }}
            disabled={phase === 'switching'}
            className="button-secondary"
            style={{
              flex: 1, minHeight: 44, padding: '11px 0', fontSize: 15,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* v2.3.1235: batch-1 rollout — idle view off the retired navy theme
     (#5b52ff Log in, #E8EAF8/#ff5e6c text): 11/700 uppercase module
     header, key input in a well trough (16px stays — iOS zoom floor),
     Log in as a 44px secondary button (the gold primary of this flow
     is Continue on the confirm step — one gold per surface), errors in
     the approved danger token as text only.  Handlers byte-identical. */
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.14em', color: 'var(--ui-text-muted)', marginBottom: 4,
      }}>
        Continue a character from another device
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
            color: 'var(--ui-text)',
            background: 'var(--ui-well)',
            border: '1px solid var(--ui-line-strong)',
            borderRadius: 8,
            padding: '10px 10px',
            minHeight: 44,
          }}
        />
        <button
          onClick={submit}
          disabled={phase === 'checking' || phase === 'switching'}
          className="button-secondary"
          style={{
            flexShrink: 0, minHeight: 44,
            fontSize: 15, padding: '0 14px',
            opacity: phase === 'checking' ? 0.6 : 1,
          }}
        >
          {phase === 'switching' ? 'Joining…' : phase === 'checking' ? 'Checking…' : 'Log in'}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#D8635D', marginTop: 6, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
};
