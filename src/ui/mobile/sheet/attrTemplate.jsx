/* ═══ v2.3.6783: THE ONE TEMPLATE OF A WEAPON'S PAGE, AND SHARED'S (card UI3-combat) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md parts 4 and
 * 5): "Weapon attributes. Currently the messiest menu. Eliminate the
 * left-side Attributes column, consolidate the combat statistics into one
 * summary strip, and give the six attributes a full-width three-by-two
 * grid."  "This is how I'd consolidate the Sword menu specifically, with Bow
 * and Staff following the identical template ... Same information, but with
 * a much clearer progression from level -> performance -> attributes.  When
 * points become available, the attributes can receive a small gold plus
 * indicator and the available points counter can become gold."
 *
 * So ONE template, drawn by sheet/WeaponPage.jsx (Sword, Bow and Staff alike:
 * no branch on the weapon) and sheet/SharedPage.jsx:
 *   SummaryStrip  the important number as the kit's STAT (recessed, large,
 *                 its chevron when it opens something), then the supporting
 *                 numbers as FACTS in ONE kit facts container (flat rows, no
 *                 box of their own); where the room cannot hold the facts
 *                 (a phone on its side), one door, "All stats";
 *   AttrLine      the full-width line: "Attributes" at its left, the count
 *                 to spend at its right, gold while there are points, muted
 *                 at none (the game's words: "3 Sword points to spend");
 *   AttrGrid      the line, then the attributes full width (three by two; the
 *                 seven four and three), each a door to its preview, each
 *                 wearing a small gold "+" while its pool has points.
 * The pages keep what is theirs (which pool a Spend draws on, the preview's
 * `win` calls, the words of their numbers); the template takes `onOpen`.
 * The kit's three weights are tools/guards/ui3-weights.test's; the
 * template's own dodges are tools/guards/combat-hub.test's C13 to C20. */
import React from 'react';
import { Ui2Stat, Ui2Facts, Ui2Fact } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';

/** stat   { v, k, aria, onClick, data }: the number that leads (data: its data-* marks)
    facts  [{ id, k, v, data }] in order, or null (then `more` draws its door instead)
    more   { words, onClick }: the one door that opens the facts where they cannot fit
    wide   the facts in one row of four (a page wide enough); else two by two */
export function SummaryStrip({ stat, facts, more, wide, data }) {
  return (
    <div className="u2-at-strip" {...(data || {})}>
      <Ui2Stat v={stat.v} k={stat.k} className="u2-at-stat" aria-label={stat.aria} onClick={stat.onClick} {...(stat.data || {})} />
      {facts ? (
        <Ui2Facts className={'u2-at-facts' + (wide ? ' is-wide' : '')} data-at-facts="">
          {facts.map((f) => <Ui2Fact key={f.id} k={f.k} v={f.v} {...(f.data || {})} />)}
        </Ui2Facts>
      ) : more ? (
        <button type="button" className="u2-raised u2-wp-allstats" data-weapon-allstats="" onClick={more.onClick}>{more.words}</button>
      ) : null}
    </div>
  );
}

/** The full-width line: k "Attributes"; words the count to spend (null on another player's page);
    tone 'gold' | 'quiet' (combatHub.js pointsTone); data its data-* marks (the pool's count). */
export function AttrLine({ k, words, tone, data }) {
  return (
    <div className="u2-at-line" {...(data || {})}>
      <span className="u2-at-line-k">{k}</span>
      {words ? <b className={'u2-at-line-v' + (tone === 'gold' ? ' is-gold' : ' is-quiet')}>{words}</b> : null}
    </div>
  );
}

/** line   AttrLine's props, or null when the page has folded it onto its level row
    attrs  [{ key, label, art, value, aria }] in order
    mark   'weapon' | 'shared': the tiles' data-<mark>-attr marks
    plus   combatHub.js attrPlus(pool, self): the small gold "+" on every tile
    onOpen (key) => the page opens that attribute's preview
    grid   the grid's own classes ('is-seven', 'is-one', 'is-noart') */
export function AttrGrid({ line, attrs, mark, plus, onOpen, grid }) {
  return (
    <div className="u2-at-attrs">
      {line ? <AttrLine {...line} /> : null}
      <span className={'u2-at-grid' + (grid ? ' ' + grid : '')}>
        {attrs.map((a) => (
          <button key={a.key} type="button" className="u2-raised u2-wp-attr"
            {...{ ['data-' + mark + '-attr']: a.key, ['data-' + mark + '-attr-pts']: a.pts }}
            data-attr-plus={plus ? '1' : '0'}
            aria-label={plus ? say(SAY, 'combatHub.plusAria', { text: a.aria }) : a.aria} onClick={() => onOpen(a.key)}>
            <img className="u2-wp-attr-art" src={a.art} alt="" draggable={false} />
            <span className="u2-wp-attr-words"><span className="u2-wp-attr-k">{a.label}</span><span className="u2-wp-attr-v">{a.value}</span></span>
            {plus ? <span className="u2-at-plus" aria-hidden="true">+</span> : null}
          </button>
        ))}
      </span>
    </div>
  );
}
