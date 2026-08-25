import React from 'react';
import { checkAccountLogin } from '@/networking/index.js';
import { readRoster, describeChar, forgetChar, isActive, ROSTER_MAX } from '@/networking/charRoster.js';
import { AccountLoginForm } from '../account/AccountLoginForm.jsx';

/* ═══ v2.3.1923: THE CONTINUE WINDOW ═══
 *
 * Owner: "'Continue' is a better button for launching a window that allows
 * you to enter your passkey if you have a specific character you want to play
 * on another device.  Otherwise it makes sense to just present you with a
 * list of characters you've made (in order of most recent at the top) to
 * choose from to continue playing.  It should also give you an option to
 * delete the character with an are you sure pop up."
 *
 * So this window holds BOTH roads back in, in the order the owner puts them:
 * the list of characters this device already has is the common case and sits
 * at the top, and the Login Key box — the road for a character that lives on
 * another device — sits under it.  The old door had only the second one,
 * which is why the button that opened it had to be called "Log in with your
 * Key": that was all it did.
 *
 * WHY THE ROW IS THE BUTTON.  Each row is one tap to play, with delete as a
 * separate small control at its right edge.  The alternative — select, then
 * confirm with a Play button below — costs a tap on the only thing anyone
 * comes here to do, and the destructive action is the one that gets the
 * confirm step instead (which is the owner's ask, and the right way round).
 * The delete control stops the row's click, or tapping the bin would launch
 * the character you were trying to remove.
 */

/* Compact and deliberately vague at the top end: "3d ago" is useful, an exact
   date on a character you last touched in April is noise in a 40px row. */
function ago(t) {
  if (!t || t <= 1) return 'not played on this device';
  const s = Math.max(0, Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + 'd ago';
  return 'a while ago';
}

const SHEET = {
  width: 'min(360px, 100%)',
  background: '#1E2E34',
  border: '1px solid rgba(229, 237, 233, 0.16)',
  borderRadius: 12,
  boxShadow: '0 16px 34px rgba(4,7,9,.45)',
  fontFamily: 'Source Sans 3, sans-serif',
  color: '#F4F0E7',
};

export const CharacterPicker = ({ onPlay, onClose }) => {
  const [roster, setRoster] = React.useState(function () { return readRoster(); });
  /* The row awaiting an "are you sure" answer, or null.  Holding the ENTRY
     rather than an index: the list re-sorts as lookups land, and an index
     would end up pointed at whoever moved into that slot. */
  const [pendingDelete, setPendingDelete] = React.useState(null);

  /* ═══ NAMES FOR ROWS THAT HAVE NEVER BEEN PLAYED HERE ═══
     A roster built by playing already knows every name — rememberChar stamps
     it from the live character, so the common case draws with no network at
     all.  The rows that need this are the ones the MIGRATION invented from
     the old single-key storage (charRoster.js header): real keys this device
     owns, whose owner it has never been told.

     One request per unknown row, once ever (`looked` is persisted by
     describeChar), and sequential rather than parallel — /api/account/login
     throttles 20/min per IP, and a burst of ten from a phone that then
     retries is how a legitimate player gets told to wait a minute. */
  React.useEffect(function () {
    let alive = true;
    const todo = roster.filter(function (e) { return !e.name && !e.looked; });
    if (!todo.length) return undefined;
    (async function () {
      for (const e of todo) {
        if (!alive) return;
        let res = null;
        try { res = await checkAccountLogin(e.phrase); } catch (err) { res = null; }
        if (!alive) return;
        /* An UNREACHABLE worker must not mark the row asked — that would burn
           the one lookup this row ever gets on a blip and leave it nameless
           for good.  A definitive answer (found, or genuinely not found) does
           mark it. */
        if (!res || res.reason === 'unavailable' || res.reason === 'rate') continue;
        const p = (res.exists && res.preview) || {};
        /* A PROVISIONAL row is one the migration guessed at — the old
           `bt_passphrase_prev` stash, a key this device holds whose owner it
           was never told (charRoster.js).  A definitive "there is no
           character behind this" is the answer that row was waiting for, and
           the honest thing to do with it is drop it rather than list a
           character that does not exist.  Non-provisional rows are never
           dropped here: those are keys we have positive evidence for, and a
           worker that has forgotten one is a worker problem, not a reason to
           throw the player's key away. */
        if (e.provisional && !p.hasChar) { setRoster(forgetChar(e.phrase)); continue; }
        setRoster(describeChar(e.phrase, { name: p.name || '', level: p.level || 0 }));
      }
    })();
    return function () { alive = false; };
    /* Runs when the set of unknown rows changes; describeChar flips `looked`,
       so this cannot re-enter on the same row. */
  }, [roster]);

  const doDelete = function () {
    if (!pendingDelete) return;
    setRoster(forgetChar(pendingDelete.phrase));
    setPendingDelete(null);
  };

  return (
    <div
      className="bt-login-warn-scrim"
      data-tut="char-picker"
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9600,
        background: 'rgba(5, 9, 12, 0.62)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onPointerDown={function (e) { e.stopPropagation(); }}
        style={{ ...SHEET, maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: '14px 14px 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Your characters</div>
          {/* The cap, shown always rather than only when it bites.  It is the
              reason Create Character can refuse (owner: "Up to 10 characters
              per device.  Otherwise it won't let you create new ones"), and a
              limit you only meet at the moment it stops you reads as a bug. */}
          <div style={{ fontSize: 12, color: '#B6C1BE', fontVariantNumeric: 'tabular-nums' }}>
            {roster.length} / {ROSTER_MAX}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', margin: '10px -4px 0', padding: '0 4px' }}>
          {roster.length === 0 ? (
            <div style={{ fontSize: 13, color: '#B6C1BE', lineHeight: 1.4, padding: '10px 2px 14px' }}>
              No characters on this device yet. Make one, or bring an existing
              one over with its Login Key below.
            </div>
          ) : roster.map(function (e) {
            const here = isActive(e.phrase);
            return (
              <div key={e.phrase} style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 6 }}>
                <button
                  type="button"
                  data-tut="char-row"
                  data-char-name={e.name || ''}
                  onClick={function () { onPlay(e.phrase); }}
                  className="bt-chisel bt-chisel--chip"
                  style={{
                    flex: 1, minWidth: 0, minHeight: 48,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    justifyContent: 'center', gap: 1,
                    padding: '6px 10px', textAlign: 'left', color: '#F4F0E7',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {e.name || 'Unnamed character'}
                  </span>
                  <span style={{ fontSize: 11, color: '#B6C1BE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {e.level > 0 ? 'LV ' + e.level + ' · ' : ''}{here ? 'on this device' : ago(e.at)}
                  </span>
                </button>
                {/* Its own control, and it stops the row's click — otherwise
                    the bin launches the character it is offering to remove. */}
                <button
                  type="button"
                  aria-label={'Delete ' + (e.name || 'character')}
                  data-tut="char-delete"
                  onClick={function (ev) { ev.stopPropagation(); setPendingDelete(e); }}
                  className="bt-chisel bt-chisel--chip"
                  style={{
                    flex: 'none', width: 44, minHeight: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: '#D8635D', padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: 'rgba(229,237,233,.12)', margin: '10px 0 12px', flex: 'none' }} />
        <div style={{ flex: 'none' }}>
          <AccountLoginForm immediate />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="bt-chisel bt-chisel--chip"
          style={{ marginTop: 12, minHeight: 40, fontSize: 13, fontWeight: 800, color: '#B6C1BE', flex: 'none' }}
        >
          Back
        </button>
      </div>

      {pendingDelete && (
        <div
          data-tut="char-delete-confirm"
          onPointerDown={function (e) { e.stopPropagation(); setPendingDelete(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9700,
            background: 'rgba(5, 9, 12, 0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div onPointerDown={function (e) { e.stopPropagation(); }} style={{ ...SHEET, padding: '16px 16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              Delete {pendingDelete.name || 'this character'}?
            </div>
            {/* Says what actually happens.  forgetChar removes the key from
                THIS DEVICE and frees a slot; the character's record on the
                server is untouched and its Login Key still reaches it.  The
                copy promises exactly that and no more — see the charRoster
                header for why this is not a server wipe. */}
            <div style={{ fontSize: 13, color: '#B6C1BE', marginTop: 6, lineHeight: 1.35 }}>
              They will be removed from this device and their slot freed. You
              can bring them back later with their Login Key — without it,
              they are gone for good.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                data-tut="char-delete-yes"
                className="bt-chisel bt-chisel--danger"
                style={{ minHeight: 44, fontSize: 14, fontWeight: 800 }}
                onClick={doDelete}
              >
                Delete {pendingDelete.name || 'character'}
              </button>
              <button
                type="button"
                data-tut="char-delete-no"
                className="bt-chisel bt-chisel--chip"
                style={{ minHeight: 40, fontSize: 13, fontWeight: 800, color: '#F4F0E7' }}
                onClick={function () { setPendingDelete(null); }}
              >
                Keep them
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
