/* ═══ v2.3.6840: THE COMPARISON (card UI4 PR 1, the owner's V17) ═══
 * V17:49, "Positive/negative deltas use signed text and color; never color
 * alone."  One row: what is compared, the number before, the number after,
 * and the difference SIGNED with a word ("+12 better", "−3 worse", "no
 * change"); its colour (the kit's good and bad: gearPanels.css's) only
 * repeats what the sign and the word say.  `lower` when less is better (a
 * cooldown, a price).  The arithmetic is src/game/kitRules.js ui2Delta's; the
 * caller hands in the game's REAL numbers (V17:55 "Do not fabricate").  A
 * passive fact (role 'info'): no button form.  Gear's own comparison is NOT
 * moved to it in this PR (card UI4 PR 6). */
import React from 'react';
import { ui2Delta, ui2Num } from '@/game/kitRules.js';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

export function Ui2Comparison({ k, before, after, lower, digits, unit, className, ...rest }) {
  const d = ui2Delta(before, after, { lower, digits });
  const word = d.dir === 'same' ? say(SAY, 'ui2Kit.same') : d.good === true ? say(SAY, 'ui2Kit.better') : d.good === false ? say(SAY, 'ui2Kit.worse') : '';
  const tone = d.good === true ? ' is-good' : d.good === false ? ' is-bad' : '';
  const u = unit ? (/^[/%]/.test(unit) ? '' : ' ') + unit : '';   /* '/s' and '%' sit on the number */
  return (
    <div className={'u2-cmp' + (className ? ' ' + className : '')} data-u2-role="info" data-u2-cmp={d.dir} {...rest}>
      {k ? <span className="u2-cmp-k">{k}</span> : null}
      <span className="u2-cmp-end">
        <span className="u2-cmp-was">{before == null ? '—' : ui2Num(before, digits) + u}</span>
        <span className="u2-cmp-to" aria-label={say(SAY, 'ui2Kit.becomes')}>{'→'}</span>
        <span className="u2-cmp-now">{after == null ? '—' : ui2Num(after, digits) + u}</span>
        {d.dir === 'none' ? null : (
          <span className={'u2-cmp-d' + tone} data-u2-delta={d.dir}>{d.dir === 'same' ? word : d.text + (word ? ' ' + word : '')}</span>
        )}
      </span>
    </div>
  );
}
