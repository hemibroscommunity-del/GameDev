/* ═══ v2.3.6680: THE PROGRESS BAR (card UI2) ═══
 * A continuous metallic fill in a recessed track.  For progress (a level's
 * experience, a craft, a skill): the game's health and its five-block energy
 * and mana keep their own bars (the spec, part 2; the audit's finding 7). */
import React from 'react';

export function Ui2Progress({ value, left, right, label }) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  return (
    <div className="u2-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      {left || right ? <span className="u2-bar-top"><span>{left}</span><b>{right}</b></span> : null}
      <span className="u2-track"><span className="u2-fill" style={{ width: (v * 100).toFixed(1) + '%' }} /></span>
    </div>
  );
}
