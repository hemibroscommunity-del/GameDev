/* ═══ v2.3.6680: THE RARITY SLOT (card UI2) ═══
 * Recessed, a dark inside, outlined by the GAME's grade (Normal, Rare,
 * Elite, Godly: src/game/ui2Tokens.js UI2_RARITY, the colours of
 * dash/common.js), with the game's own non-colour cue: its stars, and the
 * grade's word to a screen reader.  Godly's prism is still (no loop). */
import React from 'react';
import { UI2_RARITY } from '@/game/ui2Tokens.js';
import { QUALITY_LABEL } from '../mobile/dash/common.js';   /* the grade's word: the game's own */
import { stateClass } from './shine.js';
import { SAY } from '@/data/say/ui2Kit.js';   /* the kit's words, in the one table */
import { say } from '@/game/say.js';
import { UnrevealedMark } from '../reveal/UnrevealedMark.jsx';   /* v2.3.6688 (the mends): a "?" piece's mark, today's */

/* v2.3.6688 (the mends, card UI2-gear): `hidden`, a "?" piece (game/revealBag.js): as today's card draws it, its
   picture dimmed (ui2.css: no filter in the kit) and the "?" mark in the rare blue (reveal/UnrevealedMark.jsx), NO stars and no grade's word
   (they would give the reveal away), the plain outline. */
export function Ui2Slot({ grade = 'normal', art, size = 52, empty, state, onClick, name, hidden }) {
  const hid = !!hidden && !empty;
  const g = hid ? 'normal' : grade;
  const R = UI2_RARITY[g] || UI2_RARITY.normal;
  const cls = 'u2-slot' + (empty ? ' is-empty' : '') + (hid ? ' is-hidden' : '') + stateClass(state);
  const words = empty ? say(SAY, 'ui2Kit.empty') : (name ? name + ', ' : '') + (hid ? say(SAY, 'ui2Kit.hidden') : (QUALITY_LABEL[g] || QUALITY_LABEL.normal));
  const inner = (
    <>
      {art && !empty ? <img className="u2-slot-art" src={art} alt="" draggable={false} /> : null}
      {empty || hid ? null : <span className="u2-stars" aria-hidden="true">{'★'.repeat(R.stars)}</span>}
      {hid ? <UnrevealedMark size={Math.max(14, Math.round(size * 0.55))} /> : null}
    </>
  );
  const box = { width: size, height: size };
  if (onClick) {
    return <button type="button" className={cls} data-grade={g} style={box} aria-label={words} onClick={onClick}>{inner}</button>;
  }
  return <span className={cls} data-grade={g} style={box} role="img" aria-label={words}>{inner}</span>;
}
