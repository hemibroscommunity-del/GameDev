/* ═══ v2.3.6683: THE EMPTY STATE (card UI2-bro, the build's step 3) ═══
 * The specification's 1.2.1: "Keep meaningful destinations accessible even
 * when there is no owned content or the feature is locked; stable locations
 * and informative empty states explain what is absent, why, and how to
 * obtain/unlock it if applicable."  Three kinds: 'absent' (nothing here yet,
 * and how to get it), 'locked' (why it is shut, and what opens it),
 * 'loading' (the answer is on its way: the kit's placeholder rows, never a 0
 * or an empty list shown as the truth: Q84). */
import React from 'react';
import { Ui2Loading } from './Loading.jsx';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

export function Ui2Empty({ kind = 'absent', title, why, how, art, rows = 2 }) {
  if (kind === 'loading') return <Ui2Loading rows={rows} />;
  const head = title || say(SAY, kind === 'locked' ? 'ui2Kit.locked' : 'ui2Kit.none');
  return (
    <div className={'u2-empty is-' + kind} data-u2-empty={kind}>
      {art ? <img className="u2-empty-art" src={art} alt="" draggable={false} /> : null}
      <span className="u2-empty-words">
        <span className="u2-empty-title">{kind === 'locked' ? <span aria-hidden="true">{'🔒 '}</span> : null}{head}</span>
        {why ? <span className="u2-empty-why">{why}</span> : null}
        {how ? <span className="u2-empty-how">{how}</span> : null}
      </span>
    </div>
  );
}
