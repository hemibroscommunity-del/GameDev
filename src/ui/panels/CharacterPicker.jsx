import React from 'react';
import { checkAccountLogin } from '@/networking/index.js';
import { readRoster, describeChar, forgetChar, needsLookup, ROSTER_MAX } from '@/networking/charRoster.js';
import { peerCosmeticsFromWire } from '@/networking/peerCosmetics.js';
import { portraitDataUrl, portraitOptsFromPeer, portraitHasSubject } from '@/rendering/characterPortrait.js';
import { AccountLoginForm } from '../account/AccountLoginForm.jsx';

/* ═══ v2.3.1923: THE CONTINUE WINDOW ═══
 *
 * Owner: "'Continue' is a better button for launching a window that allows
 * you to enter your passkey if you have a specific character you want to play
 * on another device.  Otherwise it makes sense to just present you with a
 * list of characters you've made ... to choose from to continue playing.  It
 * should also give you an option to delete the character with an are you sure
 * pop up."
 *
 * ═══ v2.3.2111: THE ORDER, AND WHEN THIS OPENS ═══
 * Owner: "sort by highest level character on top?  People will probably have a
 * bunch of them."  The SORT lives in charRoster's _sorted (level first,
 * last-played as the tiebreak), and this window no longer waits to be asked:
 * the login screen opens it whenever the device has characters.
 *
 * ═══ v2.3.2193: IT IS A CHARACTER SELECT, NOT A PROFILE MANAGER ═══
 * Owner: "The biggest issue is that it currently feels like an
 * account-management modal, not a character-selection screen.  The mechanics
 * are fine, but the hierarchy should make the character(s) feel like the star."
 *
 * Everything below follows from that one sentence, and the shape of the fix is
 * that almost nothing here was WRONG -- the sort, the one-tap row, the
 * are-you-sure -- it was weighted as though every element mattered equally.
 * So this version is mostly a re-ranking:
 *
 *   THE PORTRAIT is the headline change, and the owner named why: "In an RPG,
 *   I should recognize my character visually before I even read the name."
 *   The roster has never held cosmetics -- a row is a KEY -- so the worker now
 *   returns the look beside the name (server/src/account.js) and charRoster
 *   keeps it.  Drawn through the SAME recipe the inspect card uses
 *   (portraitOptsFromPeer), with a letter tile when there is nothing to draw.
 *
 *   DELETE IS GONE FROM THIS WINDOW.  Owner, after seeing the redesign:
 *   "Remove the delete character button from this menu."  It had already been
 *   demoted twice this version -- red bin to grey, chip to frameless corner --
 *   and the answer to a control that keeps needing to be made quieter is that
 *   it does not belong on the screen you use to start playing.  The
 *   are-you-sure dialog went with it rather than being left unreachable.
 *
 *   THE CONSEQUENCE, STATED HERE BECAUSE IT IS NOT VISIBLE FROM THIS FILE:
 *   nothing else in the game deletes a character, so the ten-character cap has
 *   no release valve while this stands.  LoginScreen's roster-full warning used
 *   to say "Delete one under Continue to make room" and no longer can.  When
 *   delete gets a home -- an account panel, a long-press, a swipe -- that copy
 *   points at it again.
 *
 *   CREATE IS NOT HERE EITHER.  It was added as a last card this version and
 *   the owner removed it in the same breath as delete: "Remove the create bro
 *   from there."  This window answers one question -- which of my bros am I
 *   playing -- and the door behind it already carries Create Character as one
 *   of its two plates.  Two doors to the creator is one more than the screen
 *   needs.
 *
 *   THE LOGIN KEY COLLAPSES.  "Most sessions will simply be 'tap my Bro and
 *   play'.  The Login Key input is consuming almost half the panel despite
 *   being an occasional action."  It is one line now, and opens on tap.
 *
 * WHAT WAS ASKED FOR AND IS NOT HERE: the last location under the name
 * ("LEVEL 18 · Bro Town").  Nothing persists a last zone -- the rpg blob has
 * no such field and rule 1 forbids adding one to it, so this needs its own
 * storage key written on every zone change.  That is its own change, not a
 * line in a picker.  The subline keeps the last-played time, which is the
 * other half of the same job (telling two characters apart).
 */

/* Compact and deliberately vague at the top end: "3d ago" is useful, an exact
   date on a character you last touched in April is noise in a 40px row. */
function ago(t) {
  if (!t || t <= 1) return 'New here';
  const s = Math.max(0, Date.now() - t) / 1000;
  if (s < 90) return 'Played just now';
  if (s < 3600) return 'Played ' + Math.round(s / 60) + 'm ago';
  if (s < 86400) return 'Played ' + Math.round(s / 3600) + 'h ago';
  if (s < 86400 * 30) return 'Played ' + Math.round(s / 86400) + 'd ago';
  return 'Played a while ago';
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

const PORTRAIT_PX = 60;

/* ═══ v2.3.2193b: THE CARDS ARE A DIFFERENT COLOUR FROM THE SHEET ═══
 * Owner: "Add some color to differentiate the buttons from the background
 * container."  They were `bt-chisel` -- the game's frame art -- on a #1E2E34
 * sheet, and the frame's own fill is close enough to that sheet that four
 * cards read as one long list rather than as four things you can press.
 *
 * So they get a LIGHTER slate face and a gold-tinted edge, taken from the
 * palette the login plates already use: gold is what this game marks
 * "pressable" with, and it is the accent on the CONTINUE plate that opens this
 * very window.  Hand-styled rather than `bt-chisel` because the chisel frame
 * paints its own centre (border-image with `fill`), so a background set
 * underneath it never shows -- the frame would have had to be re-cut to change
 * this colour, and a colour is not worth new art. */
const CARD = {
  width: '100%', minHeight: 82,
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '9px 12px 9px 10px', textAlign: 'left',
  color: '#F4F0E7',
  background: 'linear-gradient(180deg, #2A3D46 0%, #22333B 100%)',
  border: '1px solid rgba(231, 196, 106, 0.34)',
  borderRadius: 10,
  boxShadow: '0 2px 0 rgba(4,7,9,.35), inset 0 1px 0 rgba(255,255,255,.05)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  WebkitTapHighlightColor: 'transparent',
};

/* ═══ THE FACE ═══
   Async by nature — portraitDataUrl rasterises the real figure and crops the
   head, the same call the inspect card makes.  Keyed on the LOOK rather than
   on the row, so a re-render that re-sorts the list does not redraw a face
   that has not changed.

   The fallback is a letter tile rather than a generic bro: a default body
   wearing nothing reads as the WRONG character, where an initial reads as
   "no picture yet" — which is the truth while the lookup is in flight, and on
   a worker too old to send a look at all. */
function Portrait({ entry }) {
  const [url, setUrl] = React.useState('');
  const look = entry.look;
  React.useEffect(function () {
    let alive = true;
    setUrl('');
    if (!look) return undefined;
    const cos = peerCosmeticsFromWire(look);
    if (!portraitHasSubject(cos)) return undefined;
    portraitDataUrl(portraitOptsFromPeer(cos), true)
      .then(function (u) { if (alive && u) setUrl(u); })
      .catch(function () { /* the tile below is the fallback */ });
    return function () { alive = false; };
  }, [look]);

  const box = {
    flex: 'none', width: PORTRAIT_PX, height: PORTRAIT_PX,
    borderRadius: 8, overflow: 'hidden',
    background: '#16232A',
    border: '1px solid rgba(229,237,233,.14)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  if (url) {
    return (
      <span style={box} data-tut="char-portrait" data-portrait="art">
        <img
          src={url}
          alt=""
          aria-hidden="true"
          /* Pixel art: never smoothed, and never stretched — the crop is
             square and so is the tile. */
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
        />
      </span>
    );
  }
  const letter = (entry.name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span style={box} data-tut="char-portrait" data-portrait="letter">
      <span style={{ fontSize: 22, fontWeight: 800, color: '#7F8C8A' }}>{letter}</span>
    </span>
  );
}

export const CharacterPicker = ({ onPlay, onClose }) => {
  const [roster, setRoster] = React.useState(function () { return readRoster(); });
  /* v2.3.2193: the Login Key box starts shut.  See the header — this is the
     occasional road, and it was taking half the panel from the common one. */
  const [keyOpen, setKeyOpen] = React.useState(false);

  /* ═══ ONE LOOKUP PER ROW, EVER ═══
     A roster built by playing already knows the name and level (rememberChar
     stamps them from the live character), so the common case draws with no
     network at all.  What every row DOES need from the worker is the look —
     the roster has never held cosmetics — and charRoster.needsLookup is the
     single place that decides who still owes a question, so this fetch and the
     flag that stops it cannot disagree about what "asked" means.

     Sequential rather than parallel: /api/account/login throttles 20/min per
     IP, and a burst of ten from a phone that then retries is how a legitimate
     player gets told to wait a minute. */
  React.useEffect(function () {
    let alive = true;
    const todo = roster.filter(needsLookup);
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
        /* A PROVISIONAL row is one the migration guessed at — a key this
           device holds whose owner it was never told (charRoster.js).  A
           definitive "there is no character behind this" is the answer that
           row was waiting for, and the honest thing to do with it is drop it
           rather than list a character that does not exist.  Non-provisional
           rows are never dropped here: those are keys we have positive
           evidence for, and a worker that has forgotten one is a worker
           problem, not a reason to throw the player's key away. */
        if (e.provisional && !p.hasChar) { setRoster(forgetChar(e.phrase)); continue; }
        setRoster(describeChar(e.phrase, {
          name: p.name || '', level: p.level || 0,
          /* undefined on an old worker, which charRoster reads as "leave what
             you have" rather than "this character has no face" (rule 19). */
          look: p.look,
        }));
      }
    })();
    return function () { alive = false; };
  }, [roster]);

  return (
    <div
      className="bt-login-warn-scrim"
      data-tut="char-picker"
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9600,
        /* v2.3.2193: darker, and blurred.  Owner: "The huge HEMI BROS lettering
           and underlying CREATE CHARACTER button are fighting the foreground
           panel."  They are the loudest things on the screen behind this one,
           and at .62 they read straight through it. */
        background: 'rgba(4, 7, 10, 0.82)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onPointerDown={function (e) { e.stopPropagation(); }}
        style={{ ...SHEET, maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: '14px 14px 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flex: 'none' }}>
          {/* Owner: "Change Your characters to something more game-like. I like
              CHOOSE YOUR BRO here." */}
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.06em' }}>CHOOSE YOUR BRO</div>
          {/* The cap, shown always rather than only when it bites: it is the
              reason the Create card disappears, and a limit you only meet at
              the moment it stops you reads as a bug. */}
          <div style={{ fontSize: 13, color: '#8B9895', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
            {roster.length} / {ROSTER_MAX}
          </div>
        </div>

        {/* ═══ THE CHARACTERS ═══
            Scrolls rather than growing the sheet, so ten cards fit a phone the
            same way four do (owner: "Let that character area scroll when there
            are more than ~4-5 characters, rather than growing the modal"). */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', margin: '10px -4px 0', padding: '0 4px' }}>
          {roster.length === 0 && (
            <div style={{ fontSize: 14, color: '#B6C1BE', lineHeight: 1.45, padding: '4px 2px 12px' }}>
              No bros on this device yet. Use Create Character on the screen
              behind this one, or bring an existing bro over with its Login Key.
            </div>
          )}
          {roster.map(function (e) {
            return (
              <div key={e.phrase} style={{ marginBottom: 9 }}>
                {/* THE WHOLE CARD IS THE BUTTON.  One tap to play, which is the
                    only thing anyone opens this window to do. */}
                <button
                  type="button"
                  data-tut="char-row"
                  data-char-name={e.name || ''}
                  /* v2.3.2111: the sort key, on the row, so mp-roster can
                     assert the ORDER against the numbers that produced it
                     rather than against a fixture it also wrote. */
                  data-char-level={e.level || 0}
                  onClick={function () { onPlay(e.phrase); }}
                  style={CARD}
                >
                  <Portrait entry={e} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.name || 'Unnamed bro'}
                    </span>
                    {/* The level is the sort key, so it reads as one: its own
                        line, tabular, gold.  A row with no level yet says so
                        rather than showing a zero it does not mean — the
                        lookup above is still in flight. */}
                    <span style={{
                      fontSize: 13, fontWeight: 800, letterSpacing: '.08em',
                      color: e.level > 0 ? '#E7C46A' : '#7F8C8A',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {e.level > 0 ? 'LEVEL ' + e.level : '· · ·'}
                    </span>
                    <span style={{ fontSize: 12, color: '#96A4A1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ago(e.at)}
                    </span>
                  </span>
                  {/* Says the card goes somewhere, which is what makes a second
                      Continue button unnecessary. */}
                  <span aria-hidden="true" style={{ flex: 'none', fontSize: 20, color: '#8B9895', marginLeft: 2 }}>›</span>
                </button>
              </div>
            );
          })}

        </div>

        <div style={{ height: 1, background: 'rgba(229,237,233,.12)', margin: '10px 0 10px', flex: 'none' }} />

        {/* ═══ THE OTHER ROAD IN, ONE LINE UNTIL IT IS WANTED ═══ */}
        <div style={{ flex: 'none' }}>
          {keyOpen ? (
            <AccountLoginForm immediate />
          ) : (
            <button
              type="button"
              data-tut="char-usekey"
              onClick={function () { setKeyOpen(true); }}
              style={{
                width: '100%', minHeight: 48, padding: '6px 10px',
                /* Same family as the cards, a step quieter: it is a road out of
                   this window, not one of the things in it. */
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(231, 196, 106, 0.18)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 12, color: '#8B9895' }}>Playing on another device?</span>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.08em', color: '#E7C46A' }}>
                USE LOGIN KEY
              </span>
            </button>
          )}
        </div>

        {/* A text button: the cards should carry the weight, not the way out. */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 10, minHeight: 34, padding: 0, flex: 'none',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, color: '#8B9895',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
      </div>

    </div>
  );
};
