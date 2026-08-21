import React from 'react';
import { createPortal } from 'react-dom';
import { NPC_DATA } from '@/data/gameDisplay.js';

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

/* The FULL figure, not the head crop.  `portrait` is the 40px thumbnail the
   old card used and it is cropped for that size; at the scale this window
   gives it, the whole character reads far better — and NPC_DATA already
   carries both, so this costs no new art. */
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
  const { npcName, text, onDone, onClose, ctaLabel } = props;
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
    <div className="bt-npcdlg-scrim" onClick={onClose}>
      <div className="bt-npcdlg" onClick={(e) => { e.stopPropagation(); advance(); }}>
        <div className="bt-npcdlg-art">
          {art.full && (
            <img
              src={art.full}
              alt=""
              draggable={false}
              className="bt-npcdlg-img"
              /* Fall back to the head crop rather than leaving a hole: a
                 missing figure must not take the speaker's face with it. */
              onError={(e) => {
                const el = e.currentTarget;
                if (art.head && el.src.indexOf(art.head) < 0) { el.src = art.head; return; }
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
