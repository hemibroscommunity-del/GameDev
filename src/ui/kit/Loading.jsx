/* ═══ v2.3.6680: "STILL LOADING" (card UI2) ═══
 * A list's placeholder rows while its answer is on the way: the rows the
 * list will have, a slow sweep across them (stopped by reduced motion), and
 * the words. */
import React from 'react';
import { SAY } from '@/data/say/ui2Kit.js';   /* the kit's words, in the one table */
import { say } from '@/game/say.js';

export function Ui2Loading({ rows = 3, words = say(SAY, 'ui2Kit.loading') }) {
  const list = [];
  for (let i = 0; i < rows; i++) list.push(<span key={i} className="u2-skel-row" style={{ width: (92 - i * 14) + '%' }} />);
  return (
    <div className="u2-skel" aria-busy="true" data-u2-loading="">
      <span className="u2-skel-words">{words}</span>
      {list}
    </div>
  );
}
