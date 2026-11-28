/* ═══ v2.3.6840: THE STEPPER (card UI4 PR 1, the owner's V17) ═══
 * V17:43, "Adjust/toggle/dismiss: Neutral slate, clear control state; not
 * gold merely because interactive" (its example: the quantity stepper).  The
 * model is the trade window's (TradeWindowPanel.jsx, v2.3.1752: "A STEPPER,
 * NOT A GUESSING GAME"): one fewer, the number with what you have beside it,
 * one more; each end's button off at its end, so a tap never jumps or wraps.
 * That window is NOT moved to this piece in this PR.  Today's look: the two
 * buttons are the kit's neutral dismiss face (silver, the adjust role), 44 px
 * square; the number sits in the sunk well.  The next value is
 * src/game/kitRules.js ui2Step's; the caller holds it (no state here). */
import React from 'react';
import { ui2Step, ui2StepEnds } from '@/game/kitRules.js';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

/**
 * value     the number now
 * min, max  its ends (default 0 and none); `of` is written after it ("3/40") when given
 * onChange  (next) => void
 * name      what is counted, for a screen reader ("One more Fire Goblin Remains")
 */
export function Ui2Stepper({ value, min = 0, max, of, onChange, name, className, ...rest }) {
  const ends = ui2StepEnds(value, { min, max });
  const to = (by) => { if (onChange) onChange(ui2Step(value, by, { min, max })); };
  return (
    <div className={'u2-step' + (className ? ' ' + className : '')} role="group" aria-label={name} data-u2-step="" {...rest}>
      <button type="button" className="u2-act u2-step-b" data-c="silver" data-u2-role="adjust" data-u2-step-b="less"
        aria-label={say(SAY, 'ui2Kit.oneFewer', { name: name || '' }).trim()} disabled={!ends.less || undefined} onClick={() => to(-1)}>{'−'}</button>
      <span className="u2-step-v" data-u2-role="info" aria-live="polite">
        <b>{value}</b>{of != null ? <span className="u2-step-of">{'/' + of}</span> : null}
      </span>
      <button type="button" className="u2-act u2-step-b" data-c="silver" data-u2-role="adjust" data-u2-step-b="more"
        aria-label={say(SAY, 'ui2Kit.oneMore', { name: name || '' }).trim()} disabled={!ends.more || undefined} onClick={() => to(1)}>{'+'}</button>
    </div>
  );
}
