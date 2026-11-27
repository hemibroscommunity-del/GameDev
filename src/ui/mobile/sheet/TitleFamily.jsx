/* ═══ v2.3.6695: THE TITLES PAGE'S ONE FAMILY (card UI2-feats) ═══
 * The master specification 4.5: "Standalone titles appear as concise rows
 * with their own requirements; never fabricate a progression relation."  The
 * game has ONE real family (src/game/feats.js TITLE_FAMILIES): Blooded,
 * Veteran, Centurion, a weapon to level 10, 50 and 100.  Character's ONE
 * TitlesPage (CharacterPage.jsx) draws it as three cells joined, got, next
 * and locked each by a WORD and a mark (never colour alone); every other
 * title stays a row of its own. */
import React from 'react';
import { frameTap } from '../dash/DashHeader.jsx';
import { titleFamily } from '@/game/feats.js';
import { SAY } from '@/data/say/feats.js';
import { say } from '@/game/say.js';
import './feats.css';

/* a family cell's state word */
function famWord(state) {
  return state === 'got' ? say(SAY, 'feats.famGot') : state === 'next' ? say(SAY, 'feats.famNext') : say(SAY, 'feats.famLocked');
}

/**
 * The Titles page's one family, three cells joined.  An earned cell is the page's own pick (a
 * button, as every title row is: `onPick(id)`, `picked`, `worn`); next and locked are words and a
 * mark, not pressable (nothing to wear).
 */
export function TitleFamily({ S, fam, picked, worn, onPick, wearingWord }) {
  const cells = titleFamily(S, fam);
  return (
    <div className="u2-title-fam" data-title-family={fam.id}>
      {cells.map((c) => {
        const words = (
          <span className="u2-fam-words">
            <span className="u2-fam-name">{c.name}</span>
            <span className="u2-fam-state">{c.id === worn ? wearingWord : famWord(c.state)}</span>
          </span>
        );
        if (c.state === 'got') {
          return (
            <button key={c.id} type="button" className="u2-raised u2-fam-cell is-got" aria-pressed={picked === c.id ? 'true' : 'false'}
              data-title-row={c.id} data-title-worn={c.id === worn ? 1 : 0} data-fam-state="got" {...frameTap(() => onPick(c.id))}>
              {c.art ? <img src={c.art} alt="" draggable={false} /> : null}{words}
            </button>
          );
        }
        return (
          <span key={c.id} className={'u2-fam-cell is-' + c.state} data-fam-cell={c.id} data-fam-state={c.state}
            aria-label={say(SAY, 'feats.famAria', { name: c.name, state: famWord(c.state) })}>
            {c.art ? <img src={c.art} alt="" draggable={false} /> : null}{words}
            {c.state === 'locked' ? <span aria-hidden="true">{'🔒'}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

export default TitleFamily;
