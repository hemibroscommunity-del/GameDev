import React from 'react';
import { createPortal } from 'react-dom';
import { NPC_DATA } from '@/data/gameDisplay.js';
import { npcArtUrl } from '@/rendering/npcSprites.js'; /* v2.3.1829: same cache-bust as the world figures */

/* ═══ v2.3.1820: HE TALKS TO YOU, ONE THING AT A TIME ═══
 *
 * Owner: "Instead did the thumbnail and reading through the quest dialog menu
 * I'd rather have an NPC message window that has a larger picture of him on
 * the left side of the window and just the text of what he's saying in
 * sequential order chunks.  Then a new 'Accept quest' window pops up with the
 * items shown that will be handed over on accepting it."
 *
 * WHAT WAS WRONG WITH THE OLD ONE, and it is worth stating because the old
 * one was not ugly — it was doing two jobs in one card.  A 40px head, the
 * whole of what he says, the objective, both payout moments as item chips,
 * and the Accept button all shared a scrolling panel, so the thing you had to
 * READ competed with the thing you had to DECIDE, and on a phone the deciding
 * half was frequently below the fold.
 *
 * Splitting them means each screen has one job: this one is him talking, and
 * the offer window that follows is you choosing.  It is also why the picture
 * can finally be large — nothing else is contending for the width.
 *
 * CHUNKS ARE AUTHORED, NOT COMPUTED.  The dialogue strings already separate
 * their thoughts with blank lines (tut_1's opener is a line about the gear,
 * then a block of control instructions, then the errand), so splitting on
 * `\n\n` follows the writing rather than imposing a character count on it.
 * A wrapper that guessed at sentence boundaries would break "Mr. Bro" and cut
 * the control list — which is one thought — into three.
 */

/* ═══ v2.3.1828: THE HEAD, not the whole figure ═══
   Owner: "I wanted just the head of Mayor bro in his profile pic while
   talking for quest dialog."
   v2.3.1820 chose the full sprite on the reasoning that a window this size
   could afford it.  It can — but a talking-head panel is a portrait, and a
   whole body standing in it reads as a character select.  `portrait` is the
   head crop NPC_DATA already carries; the figure stays as the fallback so a
   missing crop shows a speaker rather than a hole. */
function npcArt(name) {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  if (!npc) return { full: null, head: null };
  return { full: npc.sprite || null, head: npc.portrait || null };
}

/** Split a dialogue string into the chunks it was written as. */
export function dialogueChunks(text) {
  if (!text || typeof text !== 'string') return [];
  return text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
}

export const NpcDialogue = (props) => {
  /* v2.3.2289: `lockScrim` makes the backdrop inert. Opt-in and default-off,
     so every existing caller behaves exactly as before -- see the note on the
     scrim below for which screen asks for it and why. */
  const { npcName, text, onDone, onClose, ctaLabel, lockScrim } = props;
  const chunks = React.useMemo(() => dialogueChunks(text), [text]);
  const [i, setI] = React.useState(0);
  /* Reset when the SPEECH changes, not when the component happens to
     re-render: walking up to a different quest must start at its first line,
     and a re-render mid-conversation must not. */
  React.useEffect(() => { setI(0); }, [text]);

  const art = npcArt(npcName);
  const last = i >= chunks.length - 1;
  const advance = () => {
    if (last) { onDone && onDone(); return; }
    setI((n) => n + 1);
  };

  /* An empty dialogue would otherwise render a window with a picture and no
     words and no way past it. */
  if (!chunks.length) { onDone && onDone(); return null; }

  /* ═══ v2.3.1827: PORTALED, OR THE DASHBOARD EATS THE BUTTON ═══
     `.brotown-wrap` is position:fixed and therefore its own stacking
     context, so anything rendered inside it paints BELOW the dashboard band
     (fixed, z 30, outside the wrap) however high its own z-index goes —
     TRAPS §20, and the same reason DuelRequestPanel portals.

     The CSS for this window already said these must be SIBLINGS of the wrap.
     They were not, and the cost was not cosmetic: the dashboard covered the
     lower two thirds of the panel, so the CENTRE of Claude Reward sat under
     it and a real tap never reached the button.  The reward was unclaimable
     — caught by a Playwright click timing out where an in-page .click()
     (which skips hit-testing) had been passing. */
  return createPortal((
    /* ═══ v2.3.2289: A BACKDROP THAT THROWS AWAY A FINISHED QUEST ═══
       This scrim is `position:fixed; inset:0` behind a card capped at 420px,
       so on a phone there is a live dismiss band a couple of centimetres tall
       directly under the button you are aiming at. Undershoot the CTA and the
       screen closes.

       That is harmless while he is OFFERING you something -- an offer you have
       not taken costs nothing to dismiss, and "Not now" is right there. It is
       not harmless once the quest is DONE: the same tap drops the claim
       screen. Nothing is forfeited (the worker holds the quest at 'active'
       until a real turn-in), but getting back to it means walking out past the
       125px clear radius and returning, hearing his lines again and re-picking
       the XP skill, because that choice is deliberately panel-local.

       So the caller decides, per screen, and only the claim face locks it. */
    <div className="bt-npcdlg-scrim" onClick={lockScrim ? undefined : onClose}>
      <div className="bt-npcdlg" style={{ position: 'relative' }} onClick={(e) => { e.stopPropagation(); advance(); }}>
        {lockScrim && (
          /* v2.3.2289: the deliberate exit that replaces the accidental one.
             Making the backdrop inert without this would leave the one screen
             you reach by finishing a quest with no way out but claiming, and a
             modal you cannot leave is a worse bug than the one being fixed. A
             44px corner control is not something a thumb aimed at the button
             below lands on by mistake, which was the whole complaint. */
          <button
            type="button"
            data-qa="dlg-close"
            aria-label="Close. Your reward stays waiting for you."
            onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
            style={{
              position: 'absolute', top: 0, right: 0, width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: '#8D9B98',
              fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: 0,
            }}
          >
            {/* v2.3.2289: an SVG cross, NOT a "✕" character.  A text glyph here
                lands inside the card's textContent, and half a dozen quest
                scenarios read that text to check what Mayor Bro is saying --
                they started matching "✕ MAYOR BRO ..." and failed on wording
                that had not changed.  An icon has no text node, so the card
                still reads as exactly the words in it. */}
            <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" focusable="false">
              <path d="M2 2 L11 11 M11 2 L2 11" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
        <div className="bt-npcdlg-art">
          {(art.head || art.full) && (
            <img
              src={npcArtUrl(art.head || art.full)}
              alt=""
              draggable={false}
              className="bt-npcdlg-img bt-npcdlg-img--head"
              /* Fall back to the full figure rather than leaving a hole: a
                 missing crop must not take the speaker's face with it. */
              onError={(e) => {
                const el = e.currentTarget;
                if (art.full && el.src.indexOf(art.full) < 0) {
                  el.src = npcArtUrl(art.full);
                  el.classList.remove('bt-npcdlg-img--head');
                  return;
                }
                el.style.display = 'none';
              }}
            />
          )}
        </div>

        <div className="bt-npcdlg-body">
          <div className="bt-npcdlg-name">{npcName}</div>
          {/* `key` on the chunk restarts the fade for each line, so advancing
              reads as him saying the next thing rather than as text swapping
              underneath a static frame. */}
          <div className="bt-npcdlg-text" key={i}>{chunks[i]}</div>

          <div className="bt-npcdlg-foot">
            {/* Dots only when there IS a sequence — a single-chunk line should
                not imply there is more to come. */}
            {chunks.length > 1 && (
              <div className="bt-npcdlg-dots" aria-hidden>
                {chunks.map((_, n) => (
                  <span key={n} className={'bt-npcdlg-dot' + (n === i ? ' on' : '')} />
                ))}
              </div>
            )}
            <button
              type="button"
              className="button-primary bt-npcdlg-next"
              data-tut="npcdlg-next"
              onClick={(e) => { e.stopPropagation(); advance(); }}
            >
              {last ? (ctaLabel || 'Continue') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
};
