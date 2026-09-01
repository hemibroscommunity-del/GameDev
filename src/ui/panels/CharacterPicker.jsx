import React from 'react';
import { checkAccountLogin, resetAccountCharacter } from '@/networking/index.js';
import { readRoster, describeChar, forgetChar, relookChar, needsLookup, markLookAsked, ROSTER_MAX } from '@/networking/charRoster.js';
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
/* ═══ v2.3.2194: GUNMETAL BLUE ═══
 * Owner: "Make the buttons like a gunmetal blue" / "Make the buttons a blueish
 * color."  The first pass gave the cards a lighter slate face with a gold edge;
 * gold is the sheet's own accent, so the cards were a brighter version of their
 * container rather than a different material.  Blue reads as a separate thing
 * sitting ON the slate, which is what "differentiate the buttons from the
 * background container" was asking for in the first place.
 *
 * A real gunmetal: cool, desaturated, and slightly LIGHTER at the top than the
 * bottom so it catches light like metal rather than glowing like a screen.  The
 * edge is a pale steel rather than gold, and the inset highlight along the top
 * is what sells the bevel. */
const STEEL = {
  face: 'linear-gradient(180deg, #35506A 0%, #2A4058 55%, #24374C 100%)',
  faceLit: 'linear-gradient(180deg, #3D5B78 0%, #314A64 55%, #2A4058 100%)',
  edge: 'rgba(150, 179, 209, 0.46)',
  edgeQuiet: 'rgba(150, 179, 209, 0.26)',
  lip: '0 2px 0 rgba(3,6,10,.45), inset 0 1px 0 rgba(197, 220, 244, .18)',
};

const CARD = {
  width: '100%', minHeight: 82,
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '9px 12px 9px 10px', textAlign: 'left',
  color: '#F2F6FA',
  background: STEEL.face,
  border: '1px solid ' + STEEL.edge,
  borderRadius: 10,
  boxShadow: STEEL.lip,
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
    background: '#1B2836',
    border: '1px solid rgba(150, 179, 209, .22)',
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
  /* ═══ v2.3.2194: THE OPTIONS ROAD, IN TWO STOPS ═══
     Owner: "Add an ellipses to the character for options where you can open
     another menu and choose to delete or restart the character to lvl 1 and
     another menu that asks are you sure? And need to type yes to confirm."

     `menuFor` is the character whose ... is open; `askFor` is {entry, action}
     once one of the two has been picked.  Both hold the ENTRY rather than an
     index, because the list re-sorts as lookups land and an index would end up
     pointed at whoever moved into that slot -- the same trap the old delete
     dialog recorded. */
  const [menuFor, setMenuFor] = React.useState(null);
  const [askFor, setAskFor] = React.useState(null);
  const [typed, setTyped] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState('');
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
        /* v2.3.2195: the LOOK question is spent for this page load, whatever
           came back -- so a character the worker has no look for costs one
           request per load, not one per render.  Deliberately NOT persisted:
           a worker that could not answer today can answer tomorrow, and that
           is the race that shipped a letter tile nobody could clear. */
        markLookAsked(e.phrase);
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

  /* THE WORD IS THE SAFETY CATCH, so it is compared the way a person types it:
     trimmed and case-insensitive.  Requiring an exact "yes" would fail an
     iPhone that helpfully capitalised the first letter, which teaches people to
     fight the keyboard rather than to read the sentence above it. */
  const armed = typed.trim().toLowerCase() === 'yes';

  const doConfirmed = async function () {
    if (!askFor || !armed || busy) return;
    const e = askFor.entry;
    if (askFor.action === 'delete') {
      /* Device-local, and instant: forgetChar drops the key from this device
         and frees a slot.  The character's record on the server is untouched
         and its Login Key still reaches it -- the copy below promises exactly
         that and no more. */
      setRoster(forgetChar(e.phrase));
      /* BOTH stops close.  Clearing only the confirm would drop the player back
         onto the menu behind it -- a menu headed by the character that no longer
         exists, offering to restart them. */
      setAskFor(null); setMenuFor(null); setTyped('');
      return;
    }
    /* The restart is the SERVER's, so it can fail, and a wipe that never
       reached the worker must not be reported as done.  Nothing local is
       touched until the worker says it happened. */
    setBusy(true); setFailed('');
    let res = null;
    try { res = await resetAccountCharacter(e.phrase); } catch (err) { res = null; }
    setBusy(false);
    if (!res || !res.ok || !res.reset) {
      setFailed(res && res.reason === 'unavailable'
        ? 'Could not reach the server. Nothing was changed.'
        : 'That did not work. Nothing was changed.');
      return;
    }
    /* Level is now a lie in the roster row -- the character IS level 1 and this
       device is holding the number it had a second ago.  relookChar puts the
       row back in needsLookup so the effect above re-asks the worker, rather
       than writing a level the client guessed at. */
    setRoster(relookChar(e.phrase));
    setAskFor(null); setMenuFor(null); setTyped('');
  };

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
              <div key={e.phrase} style={{ position: 'relative', marginBottom: 9 }}>
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
                  <span aria-hidden="true" style={{ flex: 'none', fontSize: 20, color: '#93A7BC', marginLeft: 2 }}>›</span>
                </button>
                {/* v2.3.2194: the options road.  Out of the card's flow so the
                    card still reads as ONE thing you press, and it stops the
                    card's click — otherwise opening the menu would launch the
                    character you were about to act on. */}
                <button
                  type="button"
                  aria-label={'Options for ' + (e.name || 'this character')}
                  title={'Options for ' + (e.name || 'this character')}
                  data-tut="char-menu"
                  onClick={function (ev) { ev.stopPropagation(); setMenuFor(e); }}
                  onPointerDown={function (ev) { ev.stopPropagation(); }}
                  style={{
                    position: 'absolute', top: 4, right: 2,
                    width: 34, height: 30, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#93A7BC', fontSize: 17, lineHeight: 1, letterSpacing: '.10em',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span aria-hidden="true">•••</span>
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
                background: 'rgba(53, 80, 106, .38)',
                border: '1px solid ' + STEEL.edgeQuiet,
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


      {/* ═══ STOP ONE: WHAT DO YOU WANT TO DO WITH THIS BRO ═══
          A menu, not an action.  Nothing here is destructive on its own — both
          rows lead to the typed confirm below, which is where the decision
          actually gets made. */}
      {menuFor && !askFor && (
        <div
          data-tut="char-menu-sheet"
          onPointerDown={function (e) { e.stopPropagation(); setMenuFor(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9700,
            background: 'rgba(5, 9, 12, 0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div onPointerDown={function (e) { e.stopPropagation(); }} style={{ ...SHEET, padding: '16px 16px 14px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, textAlign: 'center' }}>
              {menuFor.name || 'This character'}
            </div>
            <div style={{ fontSize: 13, color: '#9FB0C2', marginTop: 4, marginBottom: 14, textAlign: 'center' }}>
              {menuFor.level > 0 ? 'Level ' + menuFor.level : 'Level unknown'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button
                type="button"
                data-tut="char-menu-restart"
                onClick={function () { setAskFor({ entry: menuFor, action: 'restart' }); setTyped(''); setFailed(''); }}
                style={{ ...CARD, minHeight: 56, justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px' }}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>Restart at level 1</span>
                <span style={{ fontSize: 12, color: '#9FB0C2', fontWeight: 400 }}>
                  Keeps the name and the face. Everything earned is gone.
                </span>
              </button>
              <button
                type="button"
                data-tut="char-menu-delete"
                onClick={function () { setAskFor({ entry: menuFor, action: 'delete' }); setTyped(''); setFailed(''); }}
                style={{ ...CARD, minHeight: 56, justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px' }}
              >
                <span style={{ fontSize: 15, fontWeight: 800 }}>Remove from this device</span>
                <span style={{ fontSize: 12, color: '#9FB0C2', fontWeight: 400 }}>
                  Frees a slot. Their Login Key still brings them back.
                </span>
              </button>
              <button
                type="button"
                data-tut="char-menu-cancel"
                onClick={function () { setMenuFor(null); }}
                style={{
                  minHeight: 40, marginTop: 2, padding: 0,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, color: '#8B9895', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STOP TWO: TYPE THE WORD ═══
          Owner: "another menu that asks are you sure? And need to type yes to
          confirm."  A typed word is a different KIND of gate from a second
          button: it cannot be hit by a mis-tap, by a double-tap landing on the
          dialog that just opened, or by muscle memory — the three ways a
          confirm button gets pressed without being read.  Both actions take it,
          though only the restart is irreversible; the owner asked for the gate
          on the menu, and a delete that silently skipped it would teach people
          that the word is sometimes optional. */}
      {askFor && (
        <div
          data-tut="char-confirm"
          onPointerDown={function (e) { e.stopPropagation(); if (!busy) { setAskFor(null); setTyped(''); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9800,
            background: 'rgba(5, 9, 12, 0.80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div onPointerDown={function (e) { e.stopPropagation(); }} style={{ ...SHEET, padding: '16px 16px 14px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, textAlign: 'center' }}>Are you sure?</div>
            <div style={{ fontSize: 13.5, color: '#B6C1BE', marginTop: 8, lineHeight: 1.4 }}>
              {askFor.action === 'restart' ? (
                <span>
                  <b style={{ color: '#F4F0E7' }}>{askFor.entry.name || 'This character'}</b> goes
                  back to <b style={{ color: '#F4F0E7' }}>level 1</b>. Their levels, gear, coins
                  and quests are gone and cannot be brought back. They keep their
                  name, their look and their Login Key.
                </span>
              ) : (
                <span>
                  <b style={{ color: '#F4F0E7' }}>{askFor.entry.name || 'This character'}</b> is
                  removed from this device and their slot is freed. You can bring
                  them back with their Login Key — without it, they are gone for good.
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: '#9FB0C2', marginTop: 12, marginBottom: 6 }}>
              Type <b style={{ color: '#E7C46A', letterSpacing: '.06em' }}>yes</b> to confirm.
            </div>
            <input
              data-tut="char-confirm-input"
              value={typed}
              onChange={function (ev) { setTyped(ev.target.value); }}
              onKeyDown={function (ev) { if (ev.key === 'Enter' && armed) doConfirmed(); }}
              placeholder="yes"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              aria-label="Type yes to confirm"
              style={{
                width: '100%', minHeight: 44, boxSizing: 'border-box',
                background: '#16232E', color: '#F2F6FA',
                border: '1px solid ' + (armed ? 'rgba(231,196,106,.55)' : STEEL.edgeQuiet),
                borderRadius: 8, padding: '0 12px',
                fontSize: 16, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {failed && (
              <div data-tut="char-confirm-error" style={{ fontSize: 12.5, color: '#E89A94', marginTop: 8 }}>{failed}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                data-tut="char-confirm-go"
                disabled={!armed || busy}
                className="bt-chisel bt-chisel--danger"
                style={{ minHeight: 46, fontSize: 15, fontWeight: 800, opacity: (armed && !busy) ? 1 : 0.42 }}
                onClick={doConfirmed}
              >
                {busy ? 'Working…'
                  : askFor.action === 'restart' ? 'Restart at level 1' : 'Remove from this device'}
              </button>
              <button
                type="button"
                data-tut="char-confirm-cancel"
                onClick={function () { if (!busy) { setAskFor(null); setTyped(''); } }}
                style={{
                  minHeight: 40, padding: 0,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, color: '#8B9895', fontFamily: 'inherit',
                }}
              >
                Keep them as they are
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
